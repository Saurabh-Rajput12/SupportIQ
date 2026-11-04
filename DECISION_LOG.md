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


---

## ADR-007: FAISS Flat Index for RAG Vector Search & Semantic Similarity
- **Date:** 2026-11-04
- **Status:** Accepted (GenAI Upgrade)
- **Context:** Syllabus Experiment 5 requires dense vector search and semantic retrieval over official banking policies and past ticket inquiries.
- **Decision:**
  - Embeddings: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors, normalized).
  - Vector Store: `faiss.IndexFlatIP` (exact inner product on unit vectors = exact cosine similarity).
  - Justification: For corpora under 100,000 documents (~1,745 in SupportIQ), `IndexFlatIP` provides exact retrieval (100% recall) in under 25 ms without the quantization loss or hyperparameter tuning required by IVF or HNSW.

---

## ADR-008: Local Small LLM (Qwen2.5-1.5B-Instruct) & Prompt Engineering Strategies
- **Date:** 2026-11-04
- **Status:** Accepted (GenAI Upgrade)
- **Context:** Syllabus Experiment 4 requires comparing real generative prompting paradigms (Instructional, Conversational, Chain-of-Thought, Self-Consistency, Few-Shot, Zero-Shot, Structured).
- **Decision:**
  - Model: Local `Qwen/Qwen2.5-1.5B-Instruct` with PyTorch Apple Silicon MPS acceleration and optional OpenAI-compatible provider abstraction.
  - Context Injection: Grounded RAG context block inserted into every prompt.
  - Safety Isolation: Untrusted customer input strictly wrapped in `<<< >>>` delimiters.
  - Chain-of-Thought: Model reasons privately step-by-step; internal reasoning is parsed out so only text after `FINAL REPLY:` is presented to the agent.
  - Self-Consistency: Samples 3 candidate replies and picks the central consensus via token overlap.

---

## ADR-009: Automated Groundedness Verification & LLM-as-a-Judge Quality Layer
- **Date:** 2026-11-04
- **Status:** Accepted (GenAI Upgrade)
- **Context:** GenAI responses must be auditable and protected against hallucinations, false promises, and credential requests.
- **Decision:**
  - Sentence-level Groundedness Check: Compares each sentence in the draft against retrieved context and ticket text using embedding cosine similarity; flags unsupported claims and numbers not in source.
  - LLM-as-a-Judge: Automated evaluation scoring relevance, tone, and safety on a 1-5 scale.
  - Deterministic Safety Guards: Keyword and regex filters catch unauthorized credential requests (PIN, password) and override safety to 1.
  - Human Oversight: Quality scores and flagged sentences are presented directly in the Agent Review Workspace to guide human editing and approval.
