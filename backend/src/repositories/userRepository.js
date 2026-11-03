const { getDb } = require('../db/connection');

class UserRepository {
  findByEmail(email) {
    const db = getDb();
    return db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
  }

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT id, email, display_name, role, is_active, created_at FROM users WHERE id = ?').get(id);
  }
}

module.exports = new UserRepository();
