const { getDb } = require('../db/connection');

class AnalysisRepository {
  createAnalysis(ticketId, data) {
    const db = getDb();
    const runNumberRow = db.prepare('SELECT COALESCE(MAX(run_number), 0) + 1 as nextRun FROM ticket_analysis WHERE ticket_id = ?').get(ticketId);
    const runNumber = runNumberRow ? runNumberRow.nextRun : 1;

    const stmt = db.prepare(`
      INSERT INTO ticket_analysis (
        ticket_id, run_number,
        intent_label, intent_confidence, intent_model_id,
        sentiment_label, sentiment_confidence, sentiment_model_id,
        priority_label, priority_source, priority_reasons_json, priority_rule_version,
        summary, summary_model_id, processing_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      ticketId,
      runNumber,
      data.intent?.label || null,
      data.intent?.confidence !== undefined ? data.intent.confidence : null,
      data.intent?.model_id || null,
      data.sentiment?.label || null,
      data.sentiment?.confidence !== undefined ? data.sentiment.confidence : null,
      data.sentiment?.model_id || null,
      data.priority?.label || null,
      data.priority?.source || 'rule_based',
      JSON.stringify(data.priority?.reasons || []),
      data.priority?.rule_version || '1.0',
      data.summary?.text || null,
      data.summary?.model_id || null,
      data.processing_ms !== undefined ? data.processing_ms : 0
    );

    return this.findById(info.lastInsertRowid);
  }

  findById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM ticket_analysis WHERE id = ?').get(id);
    if (row && row.priority_reasons_json) {
      try {
        row.priority_reasons = JSON.parse(row.priority_reasons_json);
      } catch (e) {
        row.priority_reasons = [];
      }
    }
    return row;
  }

  getLatestForTicket(ticketId) {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM ticket_analysis
      WHERE ticket_id = ?
      ORDER BY run_number DESC
      LIMIT 1
    `).get(ticketId);

    if (row && row.priority_reasons_json) {
      try {
        row.priority_reasons = JSON.parse(row.priority_reasons_json);
      } catch (e) {
        row.priority_reasons = [];
      }
    }
    return row;
  }

  getAllForTicket(ticketId) {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM ticket_analysis WHERE ticket_id = ? ORDER BY run_number ASC').all(ticketId);
    return rows.map(r => {
      try {
        r.priority_reasons = JSON.parse(r.priority_reasons_json);
      } catch (e) {
        r.priority_reasons = [];
      }
      return r;
    });
  }
}

module.exports = new AnalysisRepository();

