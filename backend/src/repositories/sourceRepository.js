const { getDb } = require('../db/connection');

const sourceRepository = {
  createMany(replyId, sources = []) {
    if (!sources || sources.length === 0) return [];
    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT INTO reply_sources (reply_id, rank, doc_id, doc_type, title, snippet, score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((rows) => {
      rows.forEach((s, idx) => {
        insertStmt.run(
          replyId,
          idx + 1,
          s.id || `DOC-${idx + 1}`,
          s.type || 'FAQ',
          s.title || null,
          s.text || s.snippet || null,
          s.score !== undefined ? s.score : null
        );
      });
    });

    insertMany(sources);
    return this.getByReplyId(replyId);
  },

  getByReplyId(replyId) {
    const db = getDb();
    return db.prepare(`
      SELECT id, reply_id, rank, doc_id, doc_type, title, snippet, score, created_at
      FROM reply_sources
      WHERE reply_id = ?
      ORDER BY rank ASC
    `).all(replyId);
  }
};

module.exports = sourceRepository;
