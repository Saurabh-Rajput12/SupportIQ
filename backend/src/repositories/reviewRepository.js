const { getDb } = require('../db/connection');

class ReviewRepository {
  createReview({ reply_id, agent_id, action, edited_text = null, reason = null }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO agent_review (reply_id, agent_id, action, edited_text, reason)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(reply_id, agent_id, action, edited_text, reason);
    return db.prepare('SELECT * FROM agent_review WHERE id = ?').get(info.lastInsertRowid);
  }

  getReviewsForReply(replyId) {
    const db = getDb();
    return db.prepare(`
      SELECT ar.*, u.display_name as agent_name, u.email as agent_email
      FROM agent_review ar
      JOIN users u ON ar.agent_id = u.id
      WHERE ar.reply_id = ?
      ORDER BY ar.created_at ASC
    `).all(replyId);
  }
}

module.exports = new ReviewRepository();
