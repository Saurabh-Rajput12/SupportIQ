const { getDb } = require('../db/connection');

class TicketRepository {
  generateNextTicketCode() {
    const db = getDb();
    const row = db.prepare('SELECT MAX(id) as maxId FROM tickets').get();
    const nextId = (row && row.maxId ? row.maxId : 0) + 1;
    const year = new Date().getFullYear();
    const padded = String(nextId).padStart(6, '0');
    return `SUP-${year}-${padded}`;
  }

  createTicket(data) {
    const db = getDb();
    const code = data.ticket_code || this.generateNextTicketCode();
    const stmt = db.prepare(`
      INSERT INTO tickets (
        ticket_code, customer_name, customer_reference, subject,
        description, channel, status, priority_override, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      code,
      data.customer_name || null,
      data.customer_reference || null,
      data.subject,
      data.description,
      data.channel || 'MANUAL',
      data.status || 'NEW',
      data.priority_override || null,
      data.assigned_to || null
    );

    return this.findById(info.lastInsertRowid);
  }

  findById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT t.*, u.display_name as assigned_to_name,
        ta.intent_label, ta.intent_confidence, ta.sentiment_label,
        ta.sentiment_confidence, ta.priority_label as recommended_priority,
        ta.priority_reasons_json, ta.summary
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN ticket_analysis ta ON ta.ticket_id = t.id AND ta.run_number = (
        SELECT MAX(run_number) FROM ticket_analysis WHERE ticket_id = t.id
      )
      WHERE t.id = ?
    `).get(id);
  }

  findByCode(code) {
    const db = getDb();
    return db.prepare('SELECT * FROM tickets WHERE ticket_code = ?').get(code);
  }

  findAll({ status, priority, search, limit = 50, offset = 0 } = {}) {
    const db = getDb();
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (priority) {
      conditions.push('COALESCE(t.priority_override, ta.priority_label) = ?');
      params.push(priority);
    }

    if (search) {
      conditions.push('(t.subject LIKE ? OR t.ticket_code LIKE ? OR t.customer_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT t.id, t.ticket_code, t.customer_name, t.customer_reference,
             t.subject, t.channel, t.status, t.priority_override,
             t.assigned_to, t.created_at, t.updated_at,
             u.display_name as assigned_to_name,
             ta.intent_label, ta.intent_confidence, ta.sentiment_label,
             ta.priority_label as recommended_priority,
             COALESCE(t.priority_override, ta.priority_label, 'LOW') as effective_priority
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN ticket_analysis ta ON ta.ticket_id = t.id AND ta.run_number = (
        SELECT MAX(run_number) FROM ticket_analysis WHERE ticket_id = t.id
      )
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM tickets t
      LEFT JOIN ticket_analysis ta ON ta.ticket_id = t.id AND ta.run_number = (
        SELECT MAX(run_number) FROM ticket_analysis WHERE ticket_id = t.id
      )
      ${whereClause}
    `;

    const tickets = db.prepare(query).all(...params, limit, offset);
    const totalRow = db.prepare(countQuery).get(...params);

    return {
      tickets,
      total: totalRow ? totalRow.total : 0,
    };
  }

  updateStatus(id, newStatus, resolvedAt = null) {
    const db = getDb();
    const now = new Date().toISOString();
    return db.prepare(`
      UPDATE tickets
      SET status = ?, updated_at = ?, resolved_at = COALESCE(?, resolved_at)
      WHERE id = ?
    `).run(newStatus, now, resolvedAt, id);
  }

  updatePriorityOverride(id, priority) {
    const db = getDb();
    const now = new Date().toISOString();
    return db.prepare(`
      UPDATE tickets
      SET priority_override = ?, updated_at = ?
      WHERE id = ?
    `).run(priority, now, id);
  }
}

module.exports = new TicketRepository();
