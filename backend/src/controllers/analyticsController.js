const fs = require('fs');
const path = require('path');
const analyticsService = require('../services/analyticsService');
const mlClient = require('../services/mlClient');

const PROJECT_ROOT = path.resolve(__dirname, '../../../');

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

  async getPromptEval(req, res, next) {
    try {
      const filePath = path.join(PROJECT_ROOT, 'reports', 'prompt_eval_results.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return res.json({ success: true, data });
      }
      return res.json({
        success: true,
        data: null,
        message: 'Prompt evaluation report not yet generated. Run scripts/eval_prompts.py.',
      });
    } catch (err) {
      next(err);
    }
  }

  async getRetrievalEval(req, res, next) {
    try {
      const filePath = path.join(PROJECT_ROOT, 'reports', 'retrieval_eval.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return res.json({ success: true, data });
      }
      return res.json({
        success: true,
        data: null,
        message: 'Retrieval evaluation report not yet generated. Run scripts/eval_retrieval.py.',
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();
