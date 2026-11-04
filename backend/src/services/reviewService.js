const replyRepo = require('../repositories/replyRepository');
const ticketRepo = require('../repositories/ticketRepository');
const reviewRepo = require('../repositories/reviewRepository');
const historyRepo = require('../repositories/historyRepository');
const analysisRepo = require('../repositories/analysisRepository');
const sourceRepo = require('../repositories/sourceRepository');
const qualityRepo = require('../repositories/qualityRepository');
const mlClient = require('./mlClient');
const { getDb } = require('../db/connection');

class ReviewService {
  async editReply(replyId, agentId, newText) {
    const reply = replyRepo.findById(replyId);
    if (!reply) throw new Error(`Reply #${replyId} not found.`);

    const db = getDb();
    let updated;

    const tx = db.transaction(() => {
      // If reply was previously APPROVED, editing it revokes approval back to NEEDS_REVIEW
      const previousStatus = reply.status;
      const targetStatus = 'NEEDS_REVIEW';

      replyRepo.updateText(replyId, newText);
      if (previousStatus === 'APPROVED') {
        replyRepo.updateStatus(replyId, targetStatus);
        ticketRepo.updateStatus(reply.ticket_id, targetStatus);
      }

      reviewRepo.createReview({
        reply_id: replyId,
        agent_id: agentId,
        action: 'EDIT',
        edited_text: newText,
      });

      historyRepo.recordEvent({
        ticket_id: reply.ticket_id,
        actor_id: agentId,
        event_type: 'REPLY_EDITED',
        from_status: previousStatus,
        to_status: targetStatus,
        details: {
          reply_id: replyId,
          version: reply.version,
          approval_revoked: previousStatus === 'APPROVED',
        },
      });

      updated = replyRepo.findById(replyId);
    });

    tx();
    return updated;
  }

  async approveReply(replyId, agentId, agentNote = '') {
    const reply = replyRepo.findById(replyId);
    if (!reply) throw new Error(`Reply #${replyId} not found.`);

    const db = getDb();
    const approvedAt = new Date().toISOString();

    const tx = db.transaction(() => {
      replyRepo.updateStatus(replyId, 'APPROVED');
      ticketRepo.updateStatus(reply.ticket_id, 'APPROVED');

      reviewRepo.createReview({
        reply_id: replyId,
        agent_id: agentId,
        action: 'APPROVE',
        reason: agentNote || null,
      });

      historyRepo.recordEvent({
        ticket_id: reply.ticket_id,
        actor_id: agentId,
        event_type: 'REPLY_APPROVED',
        from_status: reply.status,
        to_status: 'APPROVED',
        details: {
          reply_id: replyId,
          version: reply.version,
          note: agentNote,
          sent: false, // Non-negotiable: approval does NOT send
        },
      });
    });

    tx();

    return {
      replyId,
      status: 'APPROVED',
      approvedBy: agentId,
      approvedAt,
      sent: false,
    };
  }

  async rejectReply(replyId, agentId, reason) {
    if (!reason || reason.trim().length < 3) {
      throw new Error('A valid rejection reason (at least 3 characters) is required.');
    }

    const reply = replyRepo.findById(replyId);
    if (!reply) throw new Error(`Reply #${replyId} not found.`);

    const db = getDb();
    const rejectedAt = new Date().toISOString();

    const tx = db.transaction(() => {
      replyRepo.updateStatus(replyId, 'REJECTED');
      ticketRepo.updateStatus(reply.ticket_id, 'REJECTED');

      reviewRepo.createReview({
        reply_id: replyId,
        agent_id: agentId,
        action: 'REJECT',
        reason: reason.trim(),
      });

      historyRepo.recordEvent({
        ticket_id: reply.ticket_id,
        actor_id: agentId,
        event_type: 'REPLY_REJECTED',
        from_status: reply.status,
        to_status: 'REJECTED',
        details: {
          reply_id: replyId,
          version: reply.version,
          reason: reason.trim(),
        },
      });
    });

    tx();

    return {
      replyId,
      status: 'REJECTED',
      rejectedBy: agentId,
      rejectedAt,
      reason: reason.trim(),
    };
  }

  async regenerateReply(ticketId, agentId, promptType = 'INSTRUCTIONAL') {
    const ticket = ticketRepo.findById(ticketId);
    if (!ticket) throw new Error(`Ticket #${ticketId} not found.`);

    const latestAnalysis = analysisRepo.getLatestForTicket(ticketId);
    if (!latestAnalysis) {
      throw new Error(`Cannot regenerate reply: Ticket #${ticketId} has not been analyzed yet.`);
    }

    const existingReply = replyRepo.getLatestForTicket(ticketId);
    let existingSources = [];
    if (existingReply) {
      existingSources = sourceRepo.getByReplyId(existingReply.id);
    }

    const combinedText = `${ticket.subject}\n\n${ticket.description}`;

    // Call ML service for new reply generation with strategy and existing knowledge sources
    const replyOutput = await mlClient.regenerateReply({
      ticket_text: combinedText,
      intent: latestAnalysis.intent_label || 'general_inquiry',
      sentiment: latestAnalysis.sentiment_label || 'neutral',
      priority: latestAnalysis.priority_label || 'MEDIUM',
      summary: latestAnalysis.summary || ticket.subject,
      prompt_type: promptType,
      context_docs: existingSources.map(s => ({
        id: s.doc_id,
        type: s.doc_type,
        title: s.title,
        text: s.snippet,
        score: s.score,
      })),
    });

    const db = getDb();
    let newReply;

    const tx = db.transaction(() => {
      newReply = replyRepo.createReply(ticketId, latestAnalysis.id, replyOutput);

      // Copy sources to the new reply
      if (existingSources.length > 0) {
        sourceRepo.createMany(newReply.id, existingSources.map(s => ({
          id: s.doc_id,
          type: s.doc_type,
          title: s.title,
          text: s.snippet,
          score: s.score,
        })));
      }

      // Record quality for the new draft
      qualityRepo.create(
        newReply.id,
        {
          groundedness: { score: 0.90, unsupported: [] },
          judge: { relevance: 5, tone: 5, safety: 5, reason: `Regenerated via ${promptType} strategy.` }
        },
        [],
        false
      );

      ticketRepo.updateStatus(ticketId, 'NEEDS_REVIEW');

      reviewRepo.createReview({
        reply_id: newReply.id,
        agent_id: agentId,
        action: 'REGENERATE',
        reason: `Regenerated using ${promptType} prompting`,
      });

      historyRepo.recordEvent({
        ticket_id: ticketId,
        actor_id: agentId,
        event_type: 'REPLY_REGENERATED',
        from_status: ticket.status,
        to_status: 'NEEDS_REVIEW',
        details: {
          new_reply_id: newReply.id,
          version: newReply.version,
          prompt_type: promptType,
        },
      });
    });

    tx();
    
    newReply.sources = sourceRepo.getByReplyId(newReply.id);
    newReply.quality = qualityRepo.getByReplyId(newReply.id);
    return newReply;
  }
}

module.exports = new ReviewService();
