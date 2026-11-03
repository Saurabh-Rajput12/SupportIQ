const authService = require('../services/authService');
const { destroySession } = require('../middleware/auth');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: err.message,
        }
      });
    }
  }

  async logout(req, res, next) {
    try {
      destroySession(req.token);
      res.json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    res.json({
      success: true,
      data: req.user,
    });
  }
}

module.exports = new AuthController();

