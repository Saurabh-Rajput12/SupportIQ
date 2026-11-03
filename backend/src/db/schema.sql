PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'AGENT' CHECK (role IN ('ADMIN','AGENT')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_code TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_reference TEXT,
  subject TEXT NOT NULL CHECK (length(trim(subject)) BETWEEN 1 AND 200),
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 10000),
  channel TEXT NOT NULL DEFAULT 'MANUAL',
  status TEXT NOT NULL DEFAULT 'NEW'
    CHECK (status IN ('NEW','ANALYZING','NEEDS_REVIEW','IN_PROGRESS','APPROVED','REJECTED','RESOLVED','FAILED')),
  priority_override TEXT CHECK (priority_override IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  assigned_to INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL,
  intent_label TEXT,
  intent_confidence REAL CHECK (intent_confidence BETWEEN 0 AND 1),
  intent_model_id TEXT,
  sentiment_label TEXT,
  sentiment_confidence REAL CHECK (sentiment_confidence BETWEEN 0 AND 1),
  sentiment_model_id TEXT,
  priority_label TEXT CHECK (priority_label IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  priority_source TEXT NOT NULL DEFAULT 'rule_based',
  priority_reasons_json TEXT NOT NULL DEFAULT '[]',
  priority_rule_version TEXT,
  summary TEXT,
  summary_model_id TEXT,
  processing_ms INTEGER CHECK (processing_ms >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(ticket_id, run_number)
);

CREATE TABLE IF NOT EXISTS generated_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  analysis_id INTEGER REFERENCES ticket_analysis(id),
  version INTEGER NOT NULL,
  original_text TEXT NOT NULL,
  current_text TEXT NOT NULL,
  provider TEXT,
  model_id TEXT,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('ZERO_SHOT','FEW_SHOT','STRUCTURED')),
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW'
    CHECK (status IN ('NEEDS_REVIEW','APPROVED','REJECTED','SUPERSEDED')),
  demo_fallback INTEGER NOT NULL DEFAULT 0 CHECK (demo_fallback IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(ticket_id, version)
);

CREATE TABLE IF NOT EXISTS agent_review (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reply_id INTEGER NOT NULL REFERENCES generated_replies(id),
  agent_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('EDIT','APPROVE','REJECT','REGENERATE')),
  edited_text TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS ticket_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id),
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON ticket_analysis(priority_label);
CREATE INDEX IF NOT EXISTS idx_analysis_ticket ON ticket_analysis(ticket_id, run_number);
CREATE INDEX IF NOT EXISTS idx_replies_ticket ON generated_replies(ticket_id, version);
CREATE INDEX IF NOT EXISTS idx_history_ticket ON ticket_history(ticket_id, created_at);
