const ticketRepo = require('../repositories/ticketRepository');
const analysisRepo = require('../repositories/analysisRepository');
const replyRepo = require('../repositories/replyRepository');
const historyRepo = require('../repositories/historyRepository');
const mlClient = require('./mlClient');
const { getDb } = require('../db/connection');

class TicketService {
  async createTicket(data, actorId) {
    const db = getDb();
    let ticket;

    const tx = db.transaction(() => {
      ticket = ticketRepo.createTicket({
        customer_name: data.customerName,
        customer_reference: data.customerReference,
        subject: data.subject,
        description: data.description,
        channel: data.channel || 'MANUAL',
        status: 'NEW',
        assigned_to: actorId || null,
      });

      historyRepo.recordEvent({
        ticket_id: ticket.id,
        actor_id: actorId,
        event_type: 'TICKET_CREATED',
        from_status: null,
        to_status: 'NEW',
        details: { subject: ticket.subject, channel: ticket.channel },
      });
    });

    tx();
    return ticket;
  }

  async listTickets(filters) {
    return ticketRepo.findAll(filters);
  }

  async getTicketDetail(id) {
    const ticket = ticketRepo.findById(id);
    if (!ticket) return null;

    const latestAnalysis = analysisRepo.getLatestForTicket(id);
    const latestReply = replyRepo.getLatestForTicket(id);
    const history = historyRepo.getHistoryForTicket(id);
    const allReplies = replyRepo.getAllForTicket(id);

    return {
      ...ticket,
      analysis: latestAnalysis,
      currentReply: latestReply,
      replyVersions: allReplies,
      history,
    };
  }

  async updateTicketStatus(id, newStatus, actorId, note = '') {
    const ticket = ticketRepo.findById(id);
    if (!ticket) {
      throw new Error(`Ticket #${id} not found.`);
    }

    const fromStatus = ticket.status;
    const resolvedAt = newStatus === 'RESOLVED' ? new Date().toISOString() : null;

    const db = getDb();
    const tx = db.transaction(() => {
      ticketRepo.updateStatus(id, newStatus, resolvedAt);
      historyRepo.recordEvent({
        ticket_id: id,
        actor_id: actorId,
        event_type: 'STATUS_CHANGED',
        from_status: fromStatus,
        to_status: newStatus,
        details: { note },
      });
    });

    tx();
    return ticketRepo.findById(id);
  }

  async analyzeTicket(id, actorId, promptType = 'FEW_SHOT') {
    const ticket = ticketRepo.findById(id);
    if (!ticket) {
      throw new Error(`Ticket #${id} not found.`);
    }

    const prevStatus = ticket.status;

    // Transition to ANALYZING
    ticketRepo.updateStatus(id, 'ANALYZING');
    historyRepo.recordEvent({
      ticket_id: id,
      actor_id: actorId,
      event_type: 'ANALYSIS_STARTED',
      from_status: prevStatus,
      to_status: 'ANALYZING',
      details: { prompt_type: promptType },
    });

    try {
      const analysisResult = await mlClient.analyzeTicket({
        ticket_id: ticket.ticket_code,
        subject: ticket.subject,
        description: ticket.description,
        prompt_type: promptType,
      });

      const db = getDb();
      let analysisRow, replyRow;

      const tx = db.transaction(() => {
        // Persist analysis
        analysisRow = analysisRepo.createAnalysis(id, analysisResult);

        // Persist reply draft
        if (analysisResult.reply) {
          replyRow = replyRepo.createReply(id, analysisRow.id, analysisResult.reply);
        }

        // Transition ticket status to NEEDS_REVIEW
        ticketRepo.updateStatus(id, 'NEEDS_REVIEW');

        historyRepo.recordEvent({
          ticket_id: id,
          actor_id: actorId,
          event_type: 'ANALYSIS_COMPLETED',
          from_status: 'ANALYZING',
          to_status: 'NEEDS_REVIEW',
          details: {
            intent: analysisResult.intent?.label,
            sentiment: analysisResult.sentiment?.label,
            priority: analysisResult.priority?.label,
            processing_ms: analysisResult.processing_ms,
            warnings: analysisResult.warnings || [],
          },
        });
      });

      tx();

      return {
        ticket: ticketRepo.findById(id),
        analysis: analysisRow,
        reply: replyRow,
      };
    } catch (err) {
      // Set to FAILED on analysis error so it can be inspected/retried
      ticketRepo.updateStatus(id, 'FAILED');
      historyRepo.recordEvent({
        ticket_id: id,
        actor_id: actorId,
        event_type: 'ANALYSIS_FAILED',
        from_status: 'ANALYZING',
        to_status: 'FAILED',
        details: { error: err.message },
      });
      throw err;
    }
  }
}

module.exports = new TicketService();
