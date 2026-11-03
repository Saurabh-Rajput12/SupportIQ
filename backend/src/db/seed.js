const bcrypt = require('bcrypt');
const { getDb, closeDb } = require('./connection');

function seedDatabase(forceReset = false) {
  const db = getDb();

  console.log('[Database Seed] Starting database seeding...');

  // 1. Seed default agent users
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

  if (forceReset) {
    console.log('[Database Seed] Force reset: clearing tickets...');
    db.prepare('DELETE FROM ticket_history').run();
    db.prepare('DELETE FROM agent_review').run();
    db.prepare('DELETE FROM generated_replies').run();
    db.prepare('DELETE FROM ticket_analysis').run();
    db.prepare('DELETE FROM tickets').run();
  }

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM tickets');
  const ticketCount = countStmt.get().count;

  if (ticketCount > 0 && !forceReset) {
    console.log(`[Database Seed] Database already contains ${ticketCount} tickets.`);
    return;
  }

  const sampleTickets = [
    {
      code: 'SUP-2026-000001',
      customer: 'Sarah Connor',
      ref: 'CUST-8801',
      subject: 'Payment deducted but order not confirmed',
      desc: 'The amount of $149.99 was deducted from my account yesterday, but I have not received an order confirmation or invoice email. Please check urgently.',
      status: 'NEEDS_REVIEW',
      intent: 'card_payment_not_recognised',
      intentConf: 0.94,
      sentiment: 'negative',
      sentConf: 0.91,
      priority: 'HIGH',
      reasons: ['EXPLICIT_URGENCY_LANGUAGE', 'HIGH_IMPACT_INTENT'],
      summary: 'Customer reports deduction of $149.99 yesterday without order confirmation or invoice.',
      reply: 'Dear Sarah, thank you for reaching out to SupportIQ. We understand your concern regarding the $149.99 deduction without confirmation. Please reply with the merchant name and transaction reference so our fraud operations team can verify this in your payment feed.',
      ms: 1240,
    },
    {
      code: 'SUP-2026-000002',
      customer: 'Marcus Vance',
      ref: 'CUST-3419',
      subject: 'My card was stolen while travelling in Paris',
      desc: 'My wallet with my debit card was stolen this afternoon near the Louvre. Someone already tried an unauthorized access attempt at an ATM. Block my card immediately!',
      status: 'NEEDS_REVIEW',
      intent: 'lost_or_stolen_card',
      intentConf: 0.98,
      sentiment: 'negative',
      sentConf: 0.97,
      priority: 'CRITICAL',
      reasons: ['SECURITY_OR_FRAUD_KEYWORD'],
      summary: 'Customer reports stolen debit card and unauthorized ATM access attempt in Paris, requesting immediate hold.',
      reply: 'Dear Marcus, we have received your emergency report regarding the stolen card. Our security team has placed a temporary protective hold on the card. An agent will contact you shortly to review unauthorized charges.',
      ms: 1110,
    },
    {
      code: 'SUP-2026-000003',
      customer: 'Elena Rostova',
      ref: 'CUST-6102',
      subject: 'International transfer not showing up after 4 business days',
      desc: 'I initiated a SEPA international transfer to my supplier last Thursday. The funds left my account, but the recipient has not received anything yet. Can you trace transaction REF-99201?',
      status: 'IN_PROGRESS',
      intent: 'transfer_not_received_by_recipient',
      intentConf: 0.93,
      sentiment: 'negative',
      sentConf: 0.88,
      priority: 'HIGH',
      reasons: ['HIGH_IMPACT_INTENT'],
      summary: 'Customer traces delayed SEPA transfer REF-99201 dispatched four days ago.',
      reply: 'Hello Elena, thank you for reaching out. International transfers may take 3 to 5 business days depending on intermediary banks. We are investigating REF-99201 with our clearing partner and will update you within 4 hours.',
      ms: 1420,
    },
    {
      code: 'SUP-2026-000004',
      customer: 'David Chen',
      ref: 'CUST-1922',
      subject: 'How do I update my registered mobile number?',
      desc: 'I changed my phone carrier and need to update the SMS 2FA phone number linked to my account. Could you please advise what documentation is required?',
      status: 'RESOLVED',
      intent: 'edit_personal_details',
      intentConf: 0.91,
      sentiment: 'positive',
      sentConf: 0.78,
      priority: 'LOW',
      reasons: ['LOW_IMPACT_INFORMATION'],
      summary: 'Customer inquiries about updating 2FA registered mobile number.',
      reply: 'Hello David, you can update your phone number securely in the SupportIQ Mobile App under Settings > Profile > Security 2FA. For your security, you will be prompted for facial or passcode verification.',
      ms: 980,
    },
    {
      code: 'SUP-2026-000005',
      customer: 'Aisha Al-Mansoor',
      ref: 'CUST-7740',
      subject: 'Locked out of mobile banking app after three PIN attempts',
      desc: 'I entered the wrong PIN three times and now my mobile banking app says account locked. I have an urgent bill to pay before 5 PM today, please help unlock it right now.',
      status: 'APPROVED',
      intent: 'passcode_forgotten',
      intentConf: 0.92,
      sentiment: 'negative',
      sentConf: 0.86,
      priority: 'HIGH',
      reasons: ['EXPLICIT_URGENCY_LANGUAGE', 'HIGH_IMPACT_INTENT'],
      summary: 'Customer locked out of mobile banking app with urgent bill payment deadline.',
      reply: 'Dear Aisha, we understand you need immediate access to pay your bill. To reset your PIN securely, please use the Forgot PIN option on the login screen or verify your identity via our 24/7 phone line.',
      ms: 1350,
    },
    {
      code: 'SUP-2026-000006',
      customer: 'Julian Sterling',
      ref: 'CUST-5519',
      subject: 'Fraud alert: 42,000 JPY charge from Tokyo merchant',
      desc: 'I just received a notification for a 42,000 JPY transaction in Tokyo. I live in London and have not travelled abroad. This is unauthorized fraud, please freeze my card immediately!',
      status: 'NEEDS_REVIEW',
      intent: 'card_payment_not_recognised',
      intentConf: 0.96,
      sentiment: 'negative',
      sentConf: 0.99,
      priority: 'CRITICAL',
      reasons: ['SECURITY_OR_FRAUD_KEYWORD'],
      summary: 'Customer flags unauthorized foreign transaction in Tokyo requesting immediate card freeze.',
      reply: 'Dear Julian, thank you for alerting us. Our automated fraud monitor has flagged the 42,000 JPY transaction. Your card is temporarily locked and a dispute ticket has been opened.',
      ms: 1090,
    },
    {
      code: 'SUP-2026-000007',
      customer: 'Chloe Zhao',
      ref: 'CUST-9021',
      subject: 'ATM swallowed my debit card outside branch on Sunday',
      desc: 'The ATM machine at the High Street branch retained my card after entering my PIN. The screen flashed an error and did not return my card. I need it for work tomorrow morning.',
      status: 'NEEDS_REVIEW',
      intent: 'card_swallowed',
      intentConf: 0.97,
      sentiment: 'negative',
      sentConf: 0.89,
      priority: 'CRITICAL',
      reasons: ['SECURITY_OR_FRAUD_KEYWORD'],
      summary: 'Customer debit card swallowed by branch ATM following machine error.',
      reply: 'Dear Chloe, we apologize for the inconvenience with the ATM machine. As a safety precaution, swallowed cards are destroyed. We can instantly issue a virtual debit card on your mobile app while an expedited replacement is dispatched.',
      ms: 1210,
    },
    {
      code: 'SUP-2026-000008',
      customer: 'Liam O’Connor',
      ref: 'CUST-4412',
      subject: 'Charged $49.99 twice for monthly cloud storage subscription',
      desc: 'Looking at my statement, I see two identical charges of $49.99 from CloudHost on November 1st. It looks like a duplicate billing glitch. Can you reverse one of them?',
      status: 'NEEDS_REVIEW',
      intent: 'transaction_charged_twice',
      intentConf: 0.95,
      sentiment: 'negative',
      sentConf: 0.76,
      priority: 'MEDIUM',
      reasons: ['STANDARD_SUPPORT_REQUEST'],
      summary: 'Customer reports duplicate subscription charge of $49.99 on November 1st.',
      reply: 'Hello Liam, thank you for providing the details. Duplicate charges often happen when a payment gateway double-submits. We have initiated a duplicate transaction review and will credit back the duplicate charge within 2-3 business days.',
      ms: 1140,
    },
    {
      code: 'SUP-2026-000009',
      customer: 'Dr. Evelyn Reed',
      ref: 'CUST-1092',
      subject: 'Suspicious 6-digit OTP SMS received without my request',
      desc: 'I just received three consecutive text messages containing one-time passwords for a wire transfer of $5,000 that I never initiated. Is someone attempting an unauthorized access into my account?',
      status: 'NEEDS_REVIEW',
      intent: 'compromised_card',
      intentConf: 0.91,
      sentiment: 'negative',
      sentConf: 0.94,
      priority: 'CRITICAL',
      reasons: ['SECURITY_OR_FRAUD_KEYWORD'],
      summary: 'Customer received unexpected OTP messages for $5,000 transfer, suspecting unauthorized access.',
      reply: 'Dear Dr. Reed, this is an urgent security notification. Do not share the OTP codes with anyone. We have placed a temporary block on outbound transfers while our security team verifies your account session.',
      ms: 1180,
    },
    {
      code: 'SUP-2026-000010',
      customer: 'Robert K. Miller',
      ref: 'CUST-7230',
      subject: 'Official tax statement and account balance certificate request',
      desc: 'I am preparing my annual tax filing and require a stamped bank account statement showing balances for all accounts as of fiscal year end. How soon can this be generated?',
      status: 'RESOLVED',
      intent: 'general_query',
      intentConf: 0.88,
      sentiment: 'positive',
      sentConf: 0.85,
      priority: 'LOW',
      reasons: ['LOW_IMPACT_INFORMATION'],
      summary: 'Customer requests stamped annual tax balance certificate for tax filing.',
      reply: 'Hello Robert, you can download your official stamped statement instantly via Documents > Tax Certificates in online banking. The PDF includes digital verification for tax authorities.',
      ms: 890,
    },
    {
      code: 'SUP-2026-000011',
      customer: 'Fatima Zahra',
      ref: 'CUST-3180',
      subject: 'Airline refund not showing up after 14 business days',
      desc: 'The airline confirmed a refund of $680 was processed to my Mastercard two weeks ago. However, my account statement still shows no credit. Please investigate where the money is.',
      status: 'NEEDS_REVIEW',
      intent: 'Refund_not_showing_up',
      intentConf: 0.96,
      sentiment: 'negative',
      sentConf: 0.89,
      priority: 'HIGH',
      reasons: ['HIGH_IMPACT_INTENT'],
      summary: 'Customer tracks missing $680 airline refund processed two weeks ago.',
      reply: 'Dear Fatima, airline refunds can take 7 to 14 business days to settle through the merchant acquirer. Please share the Acquirer Reference Number (ARN) provided by the airline so we can track the inbound funds directly.',
      ms: 1260,
    },
    {
      code: 'SUP-2026-000012',
      customer: 'Nathaniel Ward',
      ref: 'CUST-6629',
      subject: 'Contactless chip failing at grocery checkout terminals',
      desc: 'Whenever I try tapping my contactless debit card at stores, the terminal displays "Card Read Error". Chip and PIN still works, but contactless is broken. Do I need a replacement?',
      status: 'IN_PROGRESS',
      intent: 'contactless_not_working',
      intentConf: 0.94,
      sentiment: 'negative',
      sentConf: 0.72,
      priority: 'MEDIUM',
      reasons: ['STANDARD_SUPPORT_REQUEST'],
      summary: 'Customer reports contactless NFC chip failure while Chip and PIN functions.',
      reply: 'Hello Nathaniel, physical NFC antenna damage inside the card is common after regular wear. We can order you a new replacement contactless card free of charge to your registered address.',
      ms: 1050,
    },
    {
      code: 'SUP-2026-000013',
      customer: 'Mei-Ling Zhou',
      ref: 'CUST-8044',
      subject: 'Cash deposit at smart ATM counted short by $200',
      desc: 'I deposited twenty $50 bills ($1,000 total) at the Main Street smart ATM this afternoon. The receipt shows only $800 was credited. The machine kept the other $200! Please audit the machine urgently.',
      status: 'NEEDS_REVIEW',
      intent: 'balance_not_updated_after_cheque_or_cash_deposit',
      intentConf: 0.93,
      sentiment: 'negative',
      sentConf: 0.92,
      priority: 'HIGH',
      reasons: ['EXPLICIT_URGENCY_LANGUAGE', 'HIGH_IMPACT_INTENT'],
      summary: 'Customer deposited $1,000 at smart ATM but receipt only credited $800.',
      reply: 'Dear Mei-Ling, thank you for providing the ATM receipt number. We have initiated an emergency cash dispenser audit for the Main Street terminal. Discrepancies are typically reconciled and adjusted within 24 business hours.',
      ms: 1310,
    },
    {
      code: 'SUP-2026-000014',
      customer: 'Carlos Morales',
      ref: 'CUST-2231',
      subject: 'Inquiring about exchange rates and fees for EUR to USD conversion',
      desc: 'I plan to convert 5,000 EUR into USD next week. What is the current spread and are there any flat wire transfer charges for international delivery?',
      status: 'RESOLVED',
      intent: 'exchange_rate',
      intentConf: 0.95,
      sentiment: 'positive',
      sentConf: 0.91,
      priority: 'LOW',
      reasons: ['LOW_IMPACT_INFORMATION'],
      summary: 'Customer requests exchange rate spreads and international wire fees for 5,000 EUR to USD.',
      reply: 'Hello Carlos, our live interbank exchange rates can be checked on our foreign exchange portal. We charge a transparent 0.4% conversion spread with zero wire delivery fees for accounts with premier status.',
      ms: 870,
    },
    {
      code: 'SUP-2026-000015',
      customer: 'Ananya Sharma',
      ref: 'CUST-5890',
      subject: 'Virtual card limit exceeded on mobile app',
      desc: 'I attempted to generate a disposable virtual card for a one-time vendor payment, but the app displays "Virtual card limit exceeded (max 5 active)". How can I increase this limit?',
      status: 'NEEDS_REVIEW',
      intent: 'get_disposable_virtual_card',
      intentConf: 0.94,
      sentiment: 'negative',
      sentConf: 0.70,
      priority: 'MEDIUM',
      reasons: ['STANDARD_SUPPORT_REQUEST'],
      summary: 'Customer reached disposable virtual card limit and requests quota increase.',
      reply: 'Hello Ananya, the 5 active virtual card limit is set for account security. You can instantly delete any expired or unused virtual cards in Cards > Virtual Cards to free up space for a new one.',
      ms: 1040,
    },
    {
      code: 'SUP-2026-000016',
      customer: 'Timothy Evans',
      ref: 'CUST-7703',
      subject: 'Urgent: Monthly salary deposit delayed before mortgage deduction',
      desc: 'My employer dispatched my salary via BACS on Wednesday, but it is not showing up in my account today. My mortgage payment of $1,800 is scheduled for direct debit tonight and will bounce without this money! Help!',
      status: 'NEEDS_REVIEW',
      intent: 'pending_transfer',
      intentConf: 0.92,
      sentiment: 'negative',
      sentConf: 0.95,
      priority: 'HIGH',
      reasons: ['EXPLICIT_URGENCY_LANGUAGE', 'HIGH_IMPACT_INTENT'],
      summary: 'Customer reports delayed salary deposit threatening mortgage direct debit tonight.',
      reply: 'Dear Timothy, we understand the critical urgency with your mortgage tonight. Inbound BACS transfers clear between 6 AM and 9 AM. If you share the employer BACS reference, we can check incoming clearing files.',
      ms: 1390,
    },
    {
      code: 'SUP-2026-000017',
      customer: 'Grace Hopper-Smith',
      ref: 'CUST-1104',
      subject: 'Phishing email alert: Fake security notice received',
      desc: 'I received an email claiming my account was suspended and asking me to click a link to verify my password. I recognized it as phishing and did not click. Forwarding for your security team to blacklist.',
      status: 'RESOLVED',
      intent: 'general_query',
      intentConf: 0.89,
      sentiment: 'positive',
      sentConf: 0.82,
      priority: 'CRITICAL',
      reasons: ['SECURITY_OR_FRAUD_KEYWORD'],
      summary: 'Customer reported and forwarded phishing email impersonating bank security.',
      reply: 'Thank you for your vigilance Grace! Our cybersecurity team has reported the phishing domain to the registrar for takedown. Remember, SupportIQ will never ask for your password via email link.',
      ms: 990,
    },
    {
      code: 'SUP-2026-000018',
      customer: 'Oliver Bennett',
      ref: 'CUST-9920',
      subject: 'Card about to expire next month - address confirmation',
      desc: 'My debit card expires at the end of December. I moved to a new apartment in September. Can you ensure the renewal card is sent to my updated postal address?',
      status: 'APPROVED',
      intent: 'card_about_to_expire',
      intentConf: 0.96,
      sentiment: 'positive',
      sentConf: 0.89,
      priority: 'LOW',
      reasons: ['LOW_IMPACT_INFORMATION'],
      summary: 'Customer requests renewal card to be dispatched to newly updated address.',
      reply: 'Hello Oliver, cards are automatically dispatched 30 days before expiration. We have verified your address on file and confirmed your new debit card will arrive at your current residence within 5-7 business days.',
      ms: 910,
    }
  ];

  const insertTicket = db.prepare(`
    INSERT INTO tickets (ticket_code, customer_name, customer_reference, subject, description, channel, status, priority_override, assigned_to)
    VALUES (@code, @customer, @ref, @subject, @desc, 'MANUAL', @status, null, @agentId)
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
      const info = insertTicket.run({
        code: t.code,
        customer: t.customer,
        ref: t.ref,
        subject: t.subject,
        desc: t.desc,
        status: t.status,
        agentId: agentId,
      });
      const ticketId = info.lastInsertRowid;

      insertHistory.run(
        ticketId,
        agentId,
        'TICKET_CREATED',
        null,
        'NEW',
        JSON.stringify({ note: 'Seeded ticket' })
      );

      const analysisInfo = insertAnalysis.run(
        ticketId,
        1,
        t.intent,
        t.intentConf,
        'supportiq-bert-banking77-v1',
        t.sentiment,
        t.sentConf,
        'distilbert-base-uncased-finetuned-sst-2-english',
        t.priority,
        'rule_based',
        JSON.stringify(t.reasons),
        '1.0',
        t.summary,
        'google-t5/t5-small',
        t.ms
      );
      const analysisId = analysisInfo.lastInsertRowid;

      insertHistory.run(
        ticketId,
        agentId,
        'ANALYSIS_COMPLETED',
        'NEW',
        t.status,
        JSON.stringify({
          intent: t.intent,
          priority: t.priority,
          sentiment: t.sentiment,
          processing_ms: t.ms,
        })
      );

      const replyStatus = t.status === 'APPROVED' ? 'APPROVED' : (t.status === 'REJECTED' ? 'REJECTED' : 'NEEDS_REVIEW');
      insertReply.run(
        ticketId,
        analysisId,
        1,
        t.reply,
        t.reply,
        'demo_fallback',
        'supportiq-prompt-engine-v1',
        'FEW_SHOT',
        '1.0',
        replyStatus,
        1
      );

      if (t.status === 'APPROVED') {
        insertHistory.run(
          ticketId,
          agentId,
          'REPLY_APPROVED',
          'NEEDS_REVIEW',
          'APPROVED',
          JSON.stringify({ sent: false, note: 'Approved by primary agent' })
        );
      }
    }
  });

  seedTransaction();
  console.log(`[Database Seed] Successfully seeded ${sampleTickets.length} comprehensive tickets.`);
}

if (require.main === module) {
  try {
    const force = process.argv.includes('--force');
    seedDatabase(force);
    closeDb();
    process.exit(0);
  } catch (err) {
    console.error('[Database Seed Error]:', err);
    process.exit(1);
  }
}

module.exports = { seedDatabase };
