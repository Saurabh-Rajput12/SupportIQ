# SupportIQ — Development & Engineering Log

## Environment Baseline
- **Date:** 2026-11-03
- **Operating System:** macOS (Darwin arm64 / Apple Silicon)
- **Node.js Version:** v24.14.1
- **npm Version:** 11.11.0
- **Python Version:** 3.14.6
- **Workspace:** `/Users/saurabhkumarsingh/Sem 3 projects/SupportIQ`

---

## Log Entries

### Entry 001 — 2026-11-03 | Repository Initialization & Stage 0 Verification
- Reviewed comprehensive blueprint `PROJECT_DOCUMENTATION.md` detailing MCA Data Science syllabus mapping and mandatory tech stack.
- Initialized clean Git repository.
- Created directory structure conforming to Section 11 of the specification:
  - `frontend/` (HTML/CSS/Vanilla JS/Chart.js)
  - `backend/` (Node.js/Express/better-sqlite3/auth/middleware)
  - `ml_service/` (FastAPI/PyTorch/Transformers/Scikit-learn/Pandas)
  - `data/` (`raw`, `processed`, `sample`)
  - `models/` (`intent_classifier`)
  - `notebooks/` (01 through 06)
  - `reports/`, `docs/`
- Configured `.gitignore` to prevent committing secrets, `.env`, virtualenvs, SQLite databases, and large artifacts.
- Created `DECISION_LOG.md` (ADR-001 through ADR-006).
- Created `TASK_CHECKLIST.md` tracking all stages 0 to 12.

### Entry 002 — 2026-11-04 | Stage 1: Dataset Acquisition & EDA
- Created `data/DATASET_CARD.md` specifying PolyAI BANKING77 (13,083 samples, 77 classes, CC-BY-4.0) and Bitext (CDLA-Sharing-1.0).
- Downloaded official BANKING77 dataset using Hugging Face datasets into `data/raw/banking77`.
- Exported stable `banking77_label2id.json` and `banking77_id2label.json` to `data/processed/`.
- Computed EDA statistics in `ml_service/scripts/eda_analysis.py` and saved `reports/eda_summary.json`:
  - 10,003 train rows, 3,080 test rows. Zero nulls, zero exact duplicates.
  - Mean char length: 59.47, mean word count: 11.95.
- Created Jupyter exploration notebook `notebooks/01_data_exploration.ipynb`.

### Entry 003 — 2026-11-04 | Stage 2: Preprocessing and Tokenization (Syllabus Experiment 1)
- Implemented `ml_service/app/preprocessing/cleaner.py`:
  - Normalizes whitespace and Unicode without dropping negation tokens ('not', 'never') or aggressive stemming.
  - Safe truncation at 10,000 characters.
- Implemented `ml_service/app/preprocessing/tokenizer.py` wrapping `google-bert/bert-base-uncased` tokenizer with max length 128 and attention masks.
- Created unit tests in `ml_service/tests/test_preprocessing.py`: 5 passed out of 5.
- Created Jupyter notebook `notebooks/02_preprocessing.ipynb`.

### Entry 004 — 2026-11-04 | Stage 3: BERT Intent Classifier (Syllabus Experiment 2)
- Implemented BERT training and evaluation script `ml_service/scripts/train_intent.py` supporting held-out evaluation on test split, macro-F1, and confusion matrix tracking.
- Implemented runtime inference module `ml_service/app/intent/classifier.py`:
  - Returns predicted label, softmax confidence score, top-k candidates, and confidence threshold warnings.
- Created Jupyter notebook `notebooks/03_bert_training.ipynb`.

### Entry 005 — 2026-11-04 | Stage 4: Sentiment & Priority Engine
- Implemented `ml_service/app/sentiment/analyzer.py` using `distilbert/distilbert-base-uncased-finetuned-sst-2-english`.
  - Disclosed binary limitation (`positive`/`negative`); flagged low confidence as `is_uncertain: true` instead of inventing a 3rd class.
- Implemented `ml_service/app/priority/engine.py` rule engine:
  - `CRITICAL` on security/fraud keywords (`SECURITY_OR_FRAUD_KEYWORD`).
  - `HIGH` on urgency language + high-impact intent (`EXPLICIT_URGENCY_LANGUAGE`, `HIGH_IMPACT_INTENT`).
  - `MEDIUM` for standard inquiries.
  - `LOW` for general/information inquiries.
  - Returns versioned reasons (`rule_version: '1.0'`).
- Created unit tests in `ml_service/tests/test_priority.py`: 4 passed out of 4.
- Created Jupyter notebook `notebooks/04_sentiment_analysis.ipynb`.

### Entry 006 — 2026-11-04 | Stage 5: T5 Summarizer (Syllabus Experiment 3)
- Implemented `ml_service/app/summarization/summarizer.py` utilizing `google-t5/t5-small` with `summarize:` prefix, beam search (`num_beams=4`), `no_repeat_ngram_size=3`, and `max_new_tokens=64`.
- Added length safeguards and empty string guards.
- Created Jupyter notebook `notebooks/05_t5_summarization.ipynb`.

### Entry 007 — 2026-11-04 | Stage 6: Prompt Engineering for Reply Drafting (Syllabus Experiment 4)
- Implemented prompt templates in `ml_service/app/reply_generation/prompts.py`:
  - `ZERO_SHOT`, `FEW_SHOT`, and `STRUCTURED`.
  - Delimited untrusted ticket text to protect against prompt injection.
- Implemented `ml_service/app/reply_generation/generator.py` with deterministic fallback generator (`demo_fallback=true`).
- Created Jupyter notebook `notebooks/06_prompt_experiments.ipynb`.

### Entry 008 — 2026-11-04 | Stage 7: Python FastAPI ML Service
- Implemented FastAPI service `ml_service/app/main.py`:
  - `/health`, `/ready`, `/api/v1/analyze`, `/api/v1/intent/predict`, `/api/v1/sentiment/predict`, `/api/v1/summarize`, `/api/v1/reply/generate`.
- Orchestrator `ml_service/app/pipeline.py` executes full analysis pipeline with processing timing.
- Ran test suite `ml_service/tests/test_api.py`: 7 passed out of 7.

### Entry 009 — 2026-11-04 | Stage 8: SQLite Database & Express Backend
- Defined schema in `backend/src/db/schema.sql` with foreign keys, checks, and indices.
- Built migrations (`migrate.js`) and seed script (`seed.js`) with initial agent and sample tickets.
- Implemented repositories: `userRepository`, `ticketRepository`, `analysisRepository`, `replyRepository`, `reviewRepository`, `historyRepository`, `analyticsRepository`.
- Built middleware: `authMiddleware`, `validator` (Zod), `errorHandler`.
- Built controllers & routes: `/auth`, `/tickets`, `/replies`, `/analytics`.
- Ran Jest & Supertest integration suite `backend/tests/api.test.js`: 11 passed out of 11.

### Entry 010 — 2026-11-04 | Stage 9: Express ↔ Python Service Integration
- Verified end-to-end integration: Express calls Python ML service on port 8000, receives structured analysis, persists in SQLite, and updates status to `NEEDS_REVIEW`.
- Validated review actions: approve (`sent: false`), edit (revokes approval if previously approved), reject (requires reason). Full audit history captured.

### Entry 011 — 2026-11-04 | Stage 10-12: Frontend, Review UI, Analytics & Packaging
- Built responsive agent dashboard using HTML5, CSS3, Vanilla JS, Bootstrap 5 utilities, and Chart.js.
- Integrated views: Overview Dashboard, All Tickets, Create Ticket Modal, Ticket Detail with AI signals, AI Reply Review Workspace, Analytics, Model Evaluation.
- Authored comprehensive `README.md` and updated all project tracking artifacts.
