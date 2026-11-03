const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const replyController = require('../controllers/replyController');
const { authMiddleware } = require('../middleware/auth');
const { validate, createTicketSchema, updateStatusSchema } = require('../middleware/validator');

router.use(authMiddleware);

router.post('/', validate(createTicketSchema), ticketController.createTicket);
router.get('/', ticketController.listTickets);
router.get('/:id', ticketController.getTicket);
router.patch('/:id/status', validate(updateStatusSchema), ticketController.updateStatus);
router.post('/:id/analyze', ticketController.analyzeTicket);
router.get('/:id/history', ticketController.getHistory);
router.post('/:id/replies/regenerate', replyController.regenerateReply);

module.exports = router;
