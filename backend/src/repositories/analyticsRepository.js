const { getDb } = require('../db/connection');

class AnalyticsRepository {
  getOverviewCounts() {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as c FROM tickets').get().c;
    const resolved = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'RESOLVED'").get().c;
    const pendingReview = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'NEEDS_REVIEW'").get().c;
    const openTickets = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status NOT IN ('RESOLVED', 'REJECTED')").get().c;

    const criticalCount = db.prepare(`
      SELECT COUNT(DISTINCT t.id) as c
      FROM tickets t
      LEFT JOIN ticket_analysis ta ON ta.ticket_id = t.id AND ta.run_number = (
        SELECT MAX(run_number) FROM ticket_analysis WHERE ticket_id = t.id
      )
      WHERE COALESCE(t.priority_override, ta.priority_label) = 'CRITICAL'
    `).get().c;

    const highCount = db.prepare(`
      SELECT COUNT(DISTINCT t.id) as c
      FROM tickets t
      LEFT JOIN ticket_analysis ta ON ta.ticket_id = t.id AND ta.run_number = (
        SELECT MAX(run_number) FROM ticket_analysis WHERE ticket_id = t.id
      )
      WHERE COALESCE(t.priority_override, ta.priority_label) = 'HIGH'
    `).get().c;

    const avgProcessingMs = db.prepare('SELECT AVG(processing_ms) as avgMs FROM ticket_analysis').get().avgMs || 0;

    return {
      total,
      open: openTickets,
      resolved,
      pendingReview,
      critical: criticalCount,
      high: highCount,
      avgProcessingMs: Math.round(avgProcessingMs),
    };
  }

  getDistributions() {
    const db = getDb();

    const statusDist = db.prepare(`
      SELECT status as label, COUNT(*) as count
      FROM tickets
      GROUP BY status
      ORDER BY count DESC
    `).all();

    const priorityDist = db.prepare(`
      SELECT COALESCE(t.priority_override, ta.priority_label, 'UNCLASSIFIED') as label, COUNT(DISTINCT t.id) as count
      FROM tickets t
      LEFT JOIN ticket_analysis ta ON ta.ticket_id = t.id AND ta.run_number = (
        SELECT MAX(run_number) FROM ticket_analysis WHERE ticket_id = t.id
      )
      GROUP BY label
      ORDER BY count DESC
    `).all();

    const intentDist = db.prepare(`
      SELECT ta.intent_label as label, COUNT(DISTINCT t.id) as count
      FROM ticket_analysis ta
      JOIN tickets t ON ta.ticket_id = t.id
      WHERE ta.intent_label IS NOT NULL
      GROUP BY ta.intent_label
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const sentimentDist = db.prepare(`
      SELECT ta.sentiment_label as label, COUNT(DISTINCT t.id) as count
      FROM ticket_analysis ta
      JOIN tickets t ON ta.ticket_id = t.id
      WHERE ta.sentiment_label IS NOT NULL
      GROUP BY ta.sentiment_label
      ORDER BY count DESC
    `).all();

    return {
      status: statusDist,
      priority: priorityDist,
      intent: intentDist,
      sentiment: sentimentDist,
    };
  }
}

module.exports = new AnalyticsRepository();

