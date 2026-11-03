const { getDb } = require('../db/connection');

class ReplyRepository {
  createReply(ticketId, analysisId, data) {
    const db = getDb();
    const versionRow = db.prepare('SELECT COALESCE(MAX(version), 0) + 1 as nextVer FROM generated_replies WHERE ticket_id = ?').get(ticketId);
    const version = versionRow ? versionRow.nextVer : 1;

    // If there was an earlier version, mark it SUPERSEDED
    if (version > 1) {
      db.prepare(`
        UPDATE generated_replies
        SET status = 'SUPERSEDED'
        WHERE ticket_id = ? AND status = 'NEEDS_REVIEW'
      `).run(ticketId);
    }

    const stmt = db.prepare(`
      INSERT INTO generated_replies (
        ticket_id, analysis_id, version,
        original_text, current_text, provider, model_id,
        prompt_type, prompt_version, status, demo_fallback
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEEDS_REVIEW', ?)
    `);

    const info = stmt.run(
      ticketId,
      analysisId || null,
      version,
      data.text,
      data.text,
      data.provider || 'demo_fallback',
      data.model_id || 'supportiq-prompt-engine-v1',
      data.prompt_type || 'FEW_SHOT',
      data.prompt_version || '1.0',
      data.demo_fallback ? 1 : 0
    );

    return this.findById(info.lastInsertRowid);
  }

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM generated_replies WHERE id = ?').get(id);
  }

  getLatestForTicket(ticketId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM generated_replies
      WHERE ticket_id = ?
      ORDER BY version DESC
      LIMIT 1
    `).get(ticketId);
  }

  getAllForTicket(ticketId) {
    const db = getDb();
    return db.prepare('SELECT * FROM generated_replies WHERE ticket_id = ? ORDER BY version ASC').all(ticketId);
  }

  updateText(replyId, newText) {
    const db = getDb();
    return db.prepare(`
      UPDATE generated_replies
      SET current_text = ?
      WHERE id = ?
    `).run(newText, replyId);
  }

  updateStatus(replyId, status) {
    const db = getDb();
    return db.prepare(`
      UPDATE generated_replies
      SET status = ?
      WHERE id = ?
    `).run(status, replyId);
  }
}

module.exports = new ReplyRepository();

