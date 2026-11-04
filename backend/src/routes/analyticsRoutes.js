const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/overview', analyticsController.getOverview);
router.get('/distributions', analyticsController.getDistributions);
router.get('/model-status', analyticsController.getModelStatus);
router.get('/prompt-eval', analyticsController.getPromptEval);
router.get('/retrieval-eval', analyticsController.getRetrievalEval);

module.exports = router;
