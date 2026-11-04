const reviewService = require('../services/reviewService');

class ReplyController {
  async editReply(req, res, next) {
    try {
      const replyId = parseInt(req.params.replyId, 10);
      const { text } = req.body;
      const updated = await reviewService.editReply(replyId, req.user.id, text);
      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async approveReply(req, res, next) {
    try {
      const replyId = parseInt(req.params.replyId, 10);
      const { agentNote } = req.body;
      const result = await reviewService.approveReply(replyId, req.user.id, agentNote);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectReply(req, res, next) {
    try {
      const replyId = parseInt(req.params.replyId, 10);
      const { reason } = req.body;
      const result = await reviewService.rejectReply(replyId, req.user.id, reason);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async regenerateReply(req, res, next) {
    try {
      const ticketId = parseInt(req.params.id, 10);
      const { promptType = 'INSTRUCTIONAL' } = req.body;
      const result = await reviewService.regenerateReply(ticketId, req.user.id, promptType);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(503).json({
        success: false,
        error: {
          code: 'ML_SERVICE_ERROR',
          message: err.message,
        }
      });
    }
  }
}

module.exports = new ReplyController();

