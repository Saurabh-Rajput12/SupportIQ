# SupportIQ — Architectural & Engineering Decision Log

This log records non-negotiable architectural decisions, research evaluations, and technical tradeoffs for the SupportIQ project.

---

## ADR-001: Mandatory Technology Stack & Service Boundaries
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** MCA Data Science project requires implementing 4 syllabus experiments (preprocessing/tokenization, BERT classification, T5 summarization, prompt engineering) within a production-like human-in-the-loop support triage application.
- **Decision:**
  - **Frontend:** Vanilla HTML5, CSS3, modern Vanilla JavaScript (ES modules/fetch), Bootstrap 5 (responsive layout), and Chart.js for analytics. No heavy JS frameworks (React, Angular, Vue prohibited).
  - **Backend:** Node.js + Express.js API gateway. Owns authentication, input validation, SQLite persistence, ticket lifecycle, and audit logs.
  - **ML Service:** Python FastAPI service. Owns NLP preprocessing, BERT intent classification, DistilBERT sentiment polarity, rule-based priority engine, T5 summarization, and prompt template reply drafting.
  - **Service Communication:** HTTP + JSON on `localhost` (Express calls FastAPI).
  - **Persistence:** Local SQLite accessed exclusively by Express with `PRAGMA foreign_keys = ON;`. Python service does not connect to SQLite.
  - **Prohibitions:** Vector databases, RAG, deepfakes, autonomous auto-sending of replies, frontend ML libraries.

---

## ADR-002: Intent Classification Dataset & Model Choice
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** Syllabus Experiment 2 requires BERT sequence classification.
- **Decision:**
  - **Dataset:** PolyAI BANKING77 (13,083 queries, 77 intent classes, CC-BY-4.0). Official train (10,003) and test (3,080) splits. Validation split (10% stratified from train) derived with fixed seed (42).
  - **Model:** `google-bert/bert-base-uncased` (12-layer Transformer encoder, ~110M params).
  - **Label Handling:** Stable `label2id.json` and `id2label.json` saved with checkpoint.
  - **Confidence:** Softmax score reported with cautious interpretation; confidence threshold warnings surfaced to agents.

---

## ADR-003: Sentiment Polarity Baseline & Scope Limitation
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** Customer tickets require emotional tone signals, but benchmark datasets do not provide 3-class sentiment labels.
- **Decision:**
  - Use pretrained `distilbert/distilbert-base-uncased-finetuned-sst-2-english`.
  - Disclose limitation honestly: model is strictly **binary** (`positive` / `negative`).
  - Do NOT synthesize or relabel low confidence as a third "neutral" class. Unconfident predictions surface a separate UI confidence badge (`uncertain`), not a pseudo-class.

---

## ADR-004: Priority Recommendation Design (Explainable Rule-Based Engine)
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** Triage urgency requires explainability and business governance.
- **Decision:**
  - Priority is explicitly **rule-based** (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), NOT an opaque black-box neural classifier.
  - Reason codes (e.g. `SECURITY_OR_FRAUD_KEYWORD`, `EXPLICIT_URGENCY_LANGUAGE`, `HIGH_IMPACT_INTENT`) are emitted with rule versioning (`1.0`).
  - Provenance is explicitly labeled in UI as `RULE-BASED`. Human manual override is preserved with audit logging.

---

## ADR-005: Ticket Summarization (Syllabus Experiment 3)
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** Syllabus Experiment 3 requires Transformer-based summarization.
- **Decision:**
  - Use `google-t5/t5-small` with `summarize:` task prefix.
  - Generation constraints: `max_new_tokens=64`, `num_beams=4`, `no_repeat_ngram_size=3`, `early_stopping=True`.
  - Safeguard: Original ticket remains visible side-by-side. Factual hallucination checks mandated before agent approval.

---

## ADR-006: Prompt Engineering for Reply Drafting & Human-in-the-Loop Approval
- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** Syllabus Experiment 4 requires prompt engineering comparisons (Zero-Shot, Few-Shot, Structured).
- **Decision:**
  - Reply generation uses controlled prompt templates isolating untrusted ticket text as data to prevent prompt injection.
  - Pluggable `ReplyProvider` architecture with deterministic, labeled `demo_fallback=true` when external LLM credentials are absent.
  - **Human-in-the-Loop Non-Negotiable Rule:** The system produces **drafts only**. Every reply must be reviewed, edited, approved, or rejected by an authenticated agent. Approval sets `sent=false`. Automatic email/message sending is prohibited.

