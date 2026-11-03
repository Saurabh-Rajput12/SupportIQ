const { getDb } = require('../db/connection');

class HistoryRepository {
  recordEvent({ ticket_id, actor_id = null, event_type, from_status = null, to_status = null, details = {} }) {
    const db = getDb();
    const detailsJson = typeof details === 'string' ? details : JSON.stringify(details);
    const stmt = db.prepare(`
      INSERT INTO ticket_history (ticket_id, actor_id, event_type, from_status, to_status, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(ticket_id, actor_id, event_type, from_status, to_status, detailsJson);
    return db.prepare('SELECT * FROM ticket_history WHERE id = ?').get(info.lastInsertRowid);
  }

  getHistoryForTicket(ticketId) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT th.*, u.display_name as actor_name, u.email as actor_email
      FROM ticket_history th
      LEFT JOIN users u ON th.actor_id = u.id
      WHERE th.ticket_id = ?
      ORDER BY th.created_at ASC
    `).all(ticketId);

    return rows.map(r => {
      try {
        r.details = JSON.parse(r.details_json);
      } catch (e) {
        r.details = {};
      }
      return r;
    });
  }
}

module.exports = new HistoryRepository();
