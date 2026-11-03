const bcrypt = require('bcrypt');
const userRepo = require('../repositories/userRepository');
const { createSession } = require('../middleware/auth');

class AuthService {
  async login(email, password) {
    const user = userRepo.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      throw new Error('Invalid email or password.');
    }

    const token = createSession(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      }
    };
  }
}

module.exports = new AuthService();
