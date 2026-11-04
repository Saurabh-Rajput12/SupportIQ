const { getDb } = require('../db/connection');

const qualityRepository = {
  create(replyId, quality = {}, similarTickets = [], isDuplicate = false) {
    const grounded = quality.groundedness || {};
    const judge = quality.judge || {};
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO reply_quality (
        reply_id,
        groundedness,
        unsupported_json,
        judge_relevance,
        judge_tone,
        judge_safety,
        judge_reason,
        similar_json,
        is_duplicate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      replyId,
      grounded.score !== undefined ? grounded.score : null,
      JSON.stringify(grounded.unsupported || []),
      judge.relevance !== undefined ? judge.relevance : null,
      judge.tone !== undefined ? judge.tone : null,
      judge.safety !== undefined ? judge.safety : null,
      judge.reason || null,
      JSON.stringify(similarTickets || []),
      isDuplicate ? 1 : 0
    );

    return this.getByReplyId(replyId);
  },

  getByReplyId(replyId) {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM reply_quality WHERE reply_id = ?
    `).get(replyId);

    if (!row) return null;

    return {
      ...row,
      unsupported: JSON.parse(row.unsupported_json || '[]'),
      similar: JSON.parse(row.similar_json || '[]'),
      is_duplicate: Boolean(row.is_duplicate)
    };
  }
};

module.exports = qualityRepository;
