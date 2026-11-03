const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, loginSchema } = require('../middleware/validator');
const { authMiddleware } = require('../middleware/auth');

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);

module.exports = router;

