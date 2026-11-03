const express = require('express');
const router = express.Router();
const replyController = require('../controllers/replyController');
const { authMiddleware } = require('../middleware/auth');
const { validate, editReplySchema, approveReplySchema, rejectReplySchema } = require('../middleware/validator');

router.use(authMiddleware);

router.patch('/:replyId', validate(editReplySchema), replyController.editReply);
router.post('/:replyId/approve', validate(approveReplySchema), replyController.approveReply);
router.post('/:replyId/reject', validate(rejectReplySchema), replyController.rejectReply);

module.exports = router;
