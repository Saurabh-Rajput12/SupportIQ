const bcrypt = require('bcrypt');
const { getDb, closeDb } = require('./connection');

function seedDatabase() {
  const db = getDb();

  console.log('[Database Seed] Starting database seeding...');

  // 1. Seed default agent user
  const adminPasswordHash = bcrypt.hashSync('AgentSecurePass2026!', 10);
  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, display_name, role, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(email) DO UPDATE SET
      password_hash = excluded.password_hash,
      display_name = excluded.display_name
  `);

  insertUser.run('agent@supportiq.local', adminPasswordHash, 'Primary Support Agent', 'AGENT');
  insertUser.run('admin@supportiq.local', adminPasswordHash, 'System Administrator', 'ADMIN');

  const agentUser = db.prepare('SELECT id FROM users WHERE email = ?').get('agent@supportiq.local');
  const agentId = agentUser ? agentUser.id : 1;

  // 2. Check if tickets already exist
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM tickets');
  const ticketCount = countStmt.get().count;

  if (ticketCount === 0) {
    console.log('[Database Seed] Inserting demo tickets...');

    const sampleTickets = [
      {
        ticket_code: 'SUP-2026-000001',
        customer_name: 'Sarah Connor',
        customer_reference: 'CUST-8801',
        subject: 'Payment deducted but order not confirmed',
        description: 'The amount of $149.99 was deducted from my account yesterday, but I have not received an order confirmation or invoice email. Please check urgently.',
        channel: 'MANUAL',
        status: 'NEEDS_REVIEW',
        priority_override: null,
        assigned_to: agentId,
      },
      {
        ticket_code: 'SUP-2026-000002',
        customer_name: 'Marcus Vance',
        customer_reference: 'CUST-3419',
        subject: 'My card was stolen while travelling in Paris',
        description: 'My wallet with my debit card was stolen this afternoon. Someone already tried an unauthorized access attempt. Block my card immediately!',
        channel: 'MANUAL',
        status: 'NEEDS_REVIEW',
        priority_override: null,
        assigned_to: agentId,
      },
      {
        ticket_code: 'SUP-2026-000003',
        customer_name: 'Elena Rostova',
        customer_reference: 'CUST-6102',
        subject: 'International transfer not showing up after 4 business days',
        description: 'I initiated a SEPA international transfer to my supplier last Thursday. The funds left my account, but the recipient has not received anything yet. Can you trace the transaction reference REF-99201?',
        channel: 'MANUAL',
        status: 'NEW',
        priority_override: null,
        assigned_to: agentId,
      },
      {
        ticket_code: 'SUP-2026-000004',
        customer_name: 'David Chen',
        customer_reference: 'CUST-1922',
        subject: 'How do I update my registered mobile number?',
        description: 'I changed my phone carrier and need to update the SMS 2FA phone number linked to my account. Could you please advise what documentation is required?',
        channel: 'MANUAL',
        status: 'NEW',
        priority_override: null,
        assigned_to: agentId,
      },
      {
        ticket_code: 'SUP-2026-000005',
        customer_name: 'Aisha Al-Mansoor',
        customer_reference: 'CUST-7740',
        subject: 'Locked out of mobile banking app after three incorrect PIN attempts',
        description: 'I entered the wrong PIN three times and now my mobile banking app says account locked. I have an urgent bill to pay before 5 PM today, please help unlock it right now.',
        channel: 'MANUAL',
        status: 'NEEDS_REVIEW',
        priority_override: null,
        assigned_to: agentId,
      }
    ];

    const insertTicket = db.prepare(`
      INSERT INTO tickets (ticket_code, customer_name, customer_reference, subject, description, channel, status, priority_override, assigned_to)
      VALUES (@ticket_code, @customer_name, @customer_reference, @subject, @description, @channel, @status, @priority_override, @assigned_to)
    `);

    const insertHistory = db.prepare(`
      INSERT INTO ticket_history (ticket_id, actor_id, event_type, from_status, to_status, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertAnalysis = db.prepare(`
      INSERT INTO ticket_analysis (
        ticket_id, run_number, intent_label, intent_confidence, intent_model_id,
        sentiment_label, sentiment_confidence, sentiment_model_id,
        priority_label, priority_source, priority_reasons_json, priority_rule_version,
        summary, summary_model_id, processing_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertReply = db.prepare(`
      INSERT INTO generated_replies (
        ticket_id, analysis_id, version, original_text, current_text,
        provider, model_id, prompt_type, prompt_version, status, demo_fallback
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedTransaction = db.transaction(() => {
      for (const t of sampleTickets) {
        const info = insertTicket.run(t);
        const ticketId = info.lastInsertRowid;

        insertHistory.run(
          ticketId,
          agentId,
          'TICKET_CREATED',
          null,
          t.status,
          JSON.stringify({ note: 'Initial seed ticket' })
        );

        if (t.ticket_code === 'SUP-2026-000001') {
          const analysisInfo = insertAnalysis.run(
            ticketId,
            1,
            'card_payment_not_recognised',
            0.92,
            'supportiq-bert-banking77-v1',
            'negative',
            0.89,
            'distilbert-base-uncased-finetuned-sst-2-english',
            'HIGH',
            'rule_based',
            JSON.stringify(['EXPLICIT_URGENCY_LANGUAGE', 'HIGH_IMPACT_INTENT']),
            '1.0',
            'Customer reports deduction of $149.99 yesterday without order confirmation or invoice.',
            'google-t5/t5-small',
            1240
          );
          const analysisId = analysisInfo.lastInsertRowid;

          insertReply.run(
            ticketId,
            analysisId,
            1,
            'Dear Sarah, thank you for reaching out to SupportIQ. We understand your concern regarding the $149.99 charge without an order confirmation. Please reply with the last 4 digits of your card or transaction reference so our team can verify this in our payment logs and ensure your order is processed.',
            'Dear Sarah, thank you for reaching out to SupportIQ. We understand your concern regarding the $149.99 charge without an order confirmation. Please reply with the last 4 digits of your card or transaction reference so our team can verify this in our payment logs and ensure your order is processed.',
            'demo_fallback',
            'demo-rule-template-v1',
            'FEW_SHOT',
            '1.0',
            'NEEDS_REVIEW',
            1
          );
        } else if (t.ticket_code === 'SUP-2026-000002') {
          const analysisInfo = insertAnalysis.run(
            ticketId,
            1,
            'lost_or_stolen_card',
            0.98,
            'supportiq-bert-banking77-v1',
            'negative',
            0.96,
            'distilbert-base-uncased-finetuned-sst-2-english',
            'CRITICAL',
            'rule_based',
            JSON.stringify(['SECURITY_OR_FRAUD_KEYWORD']),
            '1.0',
            'Customer reports stolen debit card and unauthorized access attempt in Paris, requesting immediate block.',
            'google-t5/t5-small',
            1110
          );
          const analysisId = analysisInfo.lastInsertRowid;

          insertReply.run(
            ticketId,
            analysisId,
            1,
            'Dear Marcus, we have received your emergency report regarding the stolen debit card. Please be assured that our security team is prioritizing this case. A representative will immediately confirm the temporary hold on your card for your protection.',
            'Dear Marcus, we have received your emergency report regarding the stolen debit card. Please be assured that our security team is prioritizing this case. A representative will immediately confirm the temporary hold on your card for your protection.',
            'demo_fallback',
            'demo-rule-template-v1',
            'FEW_SHOT',
            '1.0',
            'NEEDS_REVIEW',
            1
          );
        } else if (t.ticket_code === 'SUP-2026-000005') {
          const analysisInfo = insertAnalysis.run(
            ticketId,
            1,
            'passcode_forgotten',
            0.91,
            'supportiq-bert-banking77-v1',
            'negative',
            0.87,
            'distilbert-base-uncased-finetuned-sst-2-english',
            'HIGH',
            'rule_based',
            JSON.stringify(['EXPLICIT_URGENCY_LANGUAGE']),
            '1.0',
            'Customer locked out of mobile banking app after three PIN attempts with urgent bill deadline.',
            'google-t5/t5-small',
            1350
          );
          const analysisId = analysisInfo.lastInsertRowid;

          insertReply.run(
            ticketId,
            analysisId,
            1,
            'Dear Aisha, thank you for reaching out. We understand you need urgent access to pay your bill today. To reset your PIN securely, please use the self-service reset option on our website or verify your identity with our agent on this channel so we can assist.',
            'Dear Aisha, thank you for reaching out. We understand you need urgent access to pay your bill today. To reset your PIN securely, please use the self-service reset option on our website or verify your identity with our agent on this channel so we can assist.',
            'demo_fallback',
            'demo-rule-template-v1',
            'FEW_SHOT',
            '1.0',
            'NEEDS_REVIEW',
            1
          );
        }
      }
    });

    seedTransaction();
    console.log('[Database Seed] Seeding completed.');
  } else {
    console.log(`[Database Seed] Database already contains ${ticketCount} tickets, skipping sample insertion.`);
  }
}

if (require.main === module) {
  try {
    seedDatabase();
    closeDb();
    process.exit(0);
  } catch (err) {
    console.error('[Database Seed Error]:', err);
    process.exit(1);
  }
}

module.exports = { seedDatabase };
