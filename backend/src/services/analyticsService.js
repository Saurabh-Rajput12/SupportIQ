const analyticsRepo = require('../repositories/analyticsRepository');

class AnalyticsService {
  getOverview() {
    return analyticsRepo.getOverviewCounts();
  }

  getDistributions() {
    return analyticsRepo.getDistributions();
  }
}

module.exports = new AnalyticsService();

