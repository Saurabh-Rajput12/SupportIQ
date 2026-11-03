const analyticsService = require('../services/analyticsService');
const mlClient = require('../services/mlClient');

class AnalyticsController {
  async getOverview(req, res, next) {
    try {
      const overview = analyticsService.getOverview();
      res.json({
        success: true,
        data: overview,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDistributions(req, res, next) {
    try {
      const dists = analyticsService.getDistributions();
      res.json({
        success: true,
        data: dists,
      });
    } catch (err) {
      next(err);
    }
  }

  async getModelStatus(req, res, next) {
    try {
      const isOnline = await mlClient.checkHealth();
      const readyDetails = isOnline ? await mlClient.checkReady() : { ready: false };
      res.json({
        success: true,
        data: {
          mlServiceOnline: isOnline,
          details: readyDetails,
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();

