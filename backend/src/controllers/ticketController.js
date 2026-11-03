const ticketService = require('../services/ticketService');
const historyRepo = require('../repositories/historyRepository');

class TicketController {
  async createTicket(req, res, next) {
    try {
      const ticket = await ticketService.createTicket(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        data: {
          id: ticket.id,
          ticketCode: ticket.ticket_code,
          status: ticket.status,
          createdAt: ticket.created_at,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async listTickets(req, res, next) {
    try {
      const { status, priority, search, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const result = await ticketService.listTickets({
        status,
        priority,
        search,
        limit: parseInt(limit, 10),
        offset,
      });

      res.json({
        success: true,
        data: result.tickets,
        pagination: {
          total: result.total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getTicket(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const ticket = await ticketService.getTicketDetail(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Ticket #${id} not found.`,
          }
        });
      }

      res.json({
        success: true,
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, note } = req.body;
      const updated = await ticketService.updateTicketStatus(id, status, req.user?.id, note);
      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async analyzeTicket(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { promptType = 'FEW_SHOT' } = req.body;
      const result = await ticketService.analyzeTicket(id, req.user?.id, promptType);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(503).json({
        success: false,
        error: {
          code: 'ML_SERVICE_ERROR',
          message: err.message || 'Ticket analysis is temporarily unavailable.',
        }
      });
    }
  }

  async getHistory(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const history = historyRepo.getHistoryForTicket(id);
      res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TicketController();
