const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/overview', analyticsController.getOverview);
router.get('/distributions', analyticsController.getDistributions);

module.exports = router;
