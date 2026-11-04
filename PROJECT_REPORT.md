# UNIVERSITY INSTITUTE OF COMPUTING (UIC)
## CHANDIGARH UNIVERSITY
### NAAC GRADE A+ ACCREDITED UNIVERSITY

---

# SUPPORTIQ
## RAG-POWERED GENAI SUPPORT COPILOT AND TRIAGE ENGINE
### MAJOR / MINI PROJECT REPORT

**DEPARTMENTAL SUMMER WINNING CAMP**

---

**Submitted by:**  
**Saurabh Kumar Singh**  
**(UID: 25MCD10005)**  

*in partial fulfillment for the award of the degree of*  
**Master of Computer Applications**  
**IN**  
**Data Science**  

**Chandigarh University**  
**April 2026**

---

## ACKNOWLEDGEMENT

I, **Saurabh Kumar Singh (UID: 25MCD10005)**, a student of Master of Computer Applications (Data Science) at Chandigarh University, would like to express my sincere gratitude to all those who guided, mentored, and supported me in the successful completion of my project titled **“SupportIQ: RAG-Powered GenAI Support Copilot and Triage Engine.”**

I express my profound gratitude to **Dr. Amanpreet Kaur Sandhu**, Head of the Department, Department of Computer Applications, University Institute of Computing (UIC), Chandigarh University, for fostering an academically stimulating environment, granting access to computational infrastructure, and offering continuous encouragement.

I also extend my heartfelt appreciation to all faculty members of the Department of Computer Applications for their invaluable lessons in Natural Language Processing, Machine Learning, Generative AI, and Enterprise Web Architectures. Their guidance played an instrumental role in shaping the technical methodology of this project.

Special thanks to my project mentor for his constructive feedback, rigorous architectural reviews, and unwavering guidance throughout every stage of the software development lifecycle.

I am also thankful to my peers and classmates for their insightful discussions, collaborative code reviews, and testing assistance.

Lastly, I express deep gratitude to my family for their unconditional patience, moral support, and motivation throughout my academic journey.

---

## TABLE OF CONTENTS

| S.No. | Section | Page / Index |
|---|---|---|
| 1 | Title Page | 1 |
| 2 | Acknowledgement | 2 |
| 3 | Introduction | 3 |
| 4 | Background | 3 |
| 5 | Problem Statement | 4 |
| 6 | Existing System vs Proposed System | 4 |
| 7 | Proposed System Architecture | 5 |
| 8 | System Analysis & Requirements | 6 |
| 9 | Software & Hardware Requirements | 8 |
| 10 | Modules of the System | 9 |
| 11 | System Flow Chart | 11 |
| 12 | Implementation Procedure and Execution Steps | 12 |
| 13 | Experimental Evaluation & Benchmarks (Exp 1 to 5) | 16 |
| 14 | Output and User Interface Workflow | 19 |
| 15 | Ethical AI & Governance Safeguards | 21 |
| 16 | Conclusion & Future Scope | 22 |
| 17 | Bibliography | 23 |
| 18 | Student Profile & Coding Portfolio | 24 |

---

## 1. INTRODUCTION

In modern digital enterprises and financial technology ecosystems, customer support desks receive thousands of inquiries daily. These requests arrive as unstructured, free-form text spanning unrecognised card payments, disputed transactions, wire transfer delays, account authentication issues, and policy inquiries.

Traditional natural language processing systems classify tickets into generic buckets or rely on rigid if/else templates. While classical NLP provides basic classification, it lacks generative reasoning, cannot synthesize factual policy answers dynamically, and fails to adapt to complex customer scenarios. Conversely, deploying raw, ungrounded Large Language Models (LLMs) directly in customer service presents catastrophic risks: **hallucinations** (inventing non-existent refunds, false timelines, or security approvals), **prompt injections** (attackers overriding safety constraints), and **compliance violations**.

**SupportIQ: RAG-Powered GenAI Support Copilot** bridges this critical gap. It is an end-to-end, enterprise-grade Generative AI platform that couples fine-tuned Transformer classification with dense vector search (FAISS) and local generative LLMs (`Qwen2.5-1.5B-Instruct`). SupportIQ grounds every generated response in verified company knowledge base articles, validates claims through semantic groundedness checking, scores responses with an LLM-as-a-Judge quality auditor, and enforces strict **Human-in-the-Loop (HITL)** oversight.

---

## 2. BACKGROUND & SYLLABUS ALIGNMENT

This project integrates five core syllabus experiments in Data Science, NLP, and Generative AI into a cohesive production application:

| Experiment | Curriculum Focus | SupportIQ Module Implementation |
|---|---|---|
| **Experiment 1** | NLP Preprocessing & Tokenization | Unicode normalization, whitespace cleaning, BERT WordPiece & SentencePiece tokenization (`cleaner.py`, `tokenizer.py`) |
| **Experiment 2** | BERT Intent Classification | Sequence classification on PolyAI BANKING77 across 77 fine-grained classes (`classifier.py`) |
| **Experiment 3** | Transformer Summarization | Conditional Seq2Seq summarization using `google-t5/t5-small` (`summarizer.py`) |
| **Experiment 4** | Prompt Engineering & Generative AI | 7 Prompting Paradigms (Instructional, Conversational, CoT, Self-Consistency, Few-Shot, Zero-Shot, Structured) with `Qwen2.5-1.5B-Instruct` |
| **Experiment 5** | Vector Search, Embeddings & RAG | Dense vector search via `sentence-transformers/all-MiniLM-L6-v2` and `faiss.IndexFlatIP` over 1,745 knowledge documents (`store.py`, `embedder.py`) |

---

## 3. PROBLEM STATEMENT

> *“How can we build an intelligent, explainable GenAI support copilot that accurately extracts customer intent, emotional tone, and urgency, summarizes complex complaints, retrieves factual corporate knowledge via dense vector search, and synthesizes grounded draft replies using an LLM—while enforcing strict human agent authorization, eliminating hallucinations, and preventing credential leaks?”*

### Key Challenges Addressed:
1. **Unstructured Customer Noise:** Raw inputs containing emotional rambling, typographical errors, and informal language.
2. **Hallucination Risk:** Generative models fabricating refund commitments, arbitrary settlement timelines, or policy approvals.
3. **Indirect Prompt Injection:** Adversarial text embedded within customer inquiries attempting to override AI instructions.
4. **Duplicate Inquiry Burdens:** High volumes of repeated or duplicate tickets flooding support queues without detection.
5. **Loss of Human Control:** Autonomous bots creating legally binding commitments without human authorization.

---

## 4. EXISTING SYSTEM VS. PROPOSED SYSTEM

| Feature | Existing Systems (Legacy Helpdesk / Rulebots) | SupportIQ GenAI Copilot |
|---|---|---|
| **Inference Mode** | Keyword matching / Static if-else templates | Retrieval-Augmented Generation (RAG) + Local LLM |
| **Knowledge Grounding** | None; answers are hardcoded or fabricated | Dense FAISS retrieval over 77 verified policy articles |
| **Intent Recognition** | Bag-of-words or simple regex (fragile) | 77-Class BERT sequence classification (93.2% accuracy) |
| **Triage Urgency** | Opaque black-box severity or manual tagging | Transparent, rule-based engine with auditable reason codes |
| **Quality Audit** | None; unreviewed output sent directly | Automated Groundedness checking + LLM-as-a-Judge |
| **Duplicate Detection** | Exact string match only (fails on rephrasing) | Semantic cosine similarity over past tickets (threshold >= 0.90) |
| **Outbound Dispatch** | Often autonomous and error-prone | **Draft-only (sent: false)**; mandatory agent approval barrier |

---

## 5. PROPOSED SYSTEM ARCHITECTURE

```text
               ┌────────────────────────────────────────────────────────┐
               │              CLIENT PRESENTATION LAYER                 │
               │   Vanilla HTML5 / CSS3 / ES6 JavaScript / Chart.js     │
               └──────────────────────────┬─────────────────────────────┘
                                          │ HTTP / REST (port 3000)
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │              BACKEND API GATEWAY (Node.js)             │
               │  Express.js, Zod Validation, Helmet Security, Sessions  │
               └──────────────┬───────────────────────────┬─────────────┘
                              │                           │
          Internal REST       │                           │ SQLite Transaction
          (port 8000)         ▼                           ▼
┌──────────────────────────────────────┐     ┌────────────────────────────┐
│      GENAI ML SERVICE (FastAPI)      │     │      LOCAL DATABASE        │
│                                      │     │     (supportiq.db)         │
│ 1. Text Cleaner (Unicode/whitespace) │     │ - users                    │
│ 2. BERT Intent Classifier (77 classes│     │ - tickets                  │
│ 3. DistilBERT SST-2 Sentiment        │     │ - ticket_analysis          │
│ 4. Deterministic Priority Engine     │     │ - generated_replies        │
│ 5. T5-Small Abstractive Summarizer   │     │ - reply_sources (RAG links)│
│ 6. FAISS Dense Vector Store (384-d)  │     │ - reply_quality (audits)   │
│ 7. Qwen2.5-1.5B-Instruct LLM Engine  │     │ - agent_review             │
│ 8. Groundedness Claim Verifier       │     │ - ticket_history           │
│ 9. LLM-as-a-Judge Auditor            │     └────────────────────────────┘
└──────────────────────────────────────┘
```

---

## 6. MODULES OF THE SYSTEM

### Module 1: Ticket Ingestion & Management
Accepts multi-channel inquiries (manual entry, portal, email), generates sequential audit codes (`SUP-YYYY-XXXXXX`), validates payload bounds with Zod, and maintains ticket lifecycle states (`NEW`, `ANALYZING`, `NEEDS_REVIEW`, `IN_PROGRESS`, `APPROVED`, `REJECTED`, `RESOLVED`, `FAILED`).

### Module 2: Text Preprocessing & Cleaning (Experiment 1)
Sanitizes raw text by stripping terminal control sequences and normalizing whitespace, while carefully preserving grammatical negation markers (`not`, `never`, `didn't`) and monetary currency symbols essential for financial triage.

### Module 3: BERT Intent Classification (Experiment 2)
Leverages `google-bert/bert-base-uncased` fine-tuned on the PolyAI BANKING77 benchmark. Emits probability distributions across 77 banking intent classes with softmax confidence scores and low-confidence warning flags.

### Module 4: Sentiment Analysis & Priority Recommendation
Employs `distilbert/distilbert-base-uncased-finetuned-sst-2-english` for binary sentiment polarity. A deterministic rule-based priority engine couples intent criticality with customer emotional polarity to assign `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` priority with versioned, auditable reason codes.

### Module 5: Conditional T5 Summarization (Experiment 3)
Applies `google-t5/t5-small` in Seq2Seq beam search mode (`max_new_tokens=64`, `num_beams=4`) to distill verbose customer messages into concise, factual executive summaries.

### Module 6: Dense Vector Search & FAISS Retrieval (Experiment 5)
Encodes incoming tickets into 384-dimensional unit embeddings using `sentence-transformers/all-MiniLM-L6-v2`. Searches a persistent `faiss.IndexFlatIP` index over 1,745 documents (77 verified policy/FAQ articles and historical tickets). Retrieves top-3 grounding documents and identifies duplicate inquiries (similarity score >= 0.90).

### Module 7: Generative AI Reply Drafting (Experiment 4)
Orchestrates prompt synthesis and generation with local `Qwen/Qwen2.5-1.5B-Instruct` (accelerated via Apple Silicon MPS). Supports 7 prompt engineering paradigms:
- **Instructional:** Direct task constraints conditioned strictly on retrieved context.
- **Conversational:** Empathetic, supportive, and reassuring communication style.
- **Chain-of-Thought (CoT):** Multi-step private reasoning (Issue -> Policy -> Missing Info -> `FINAL REPLY:`).
- **Self-Consistency:** Multi-sample generation with consensus token overlap selection.
- **Few-Shot:** Three curated exemplar customer support pairs.
- **Zero-Shot:** Direct instruction and ticket context.
- **Structured:** Explicit architectural sections (Opening, Guidance, Closing).

### Module 8: Quality Auditing & Groundedness Verification
A dual-layer evaluation safeguard:
1. **Semantic Groundedness Checker:** Compares each factual sentence in the generated draft against retrieved context and ticket text. Flags unsupported claims and hallucinated numbers.
2. **LLM-as-a-Judge Auditor:** Evaluates relevance, empathetic tone, and security compliance on a 1–5 rubric. Enforces deterministic safety overrides against credential requests (PIN, password).

### Module 9: Human-in-the-Loop Review Workspace
Interactive agent portal displaying side-by-side customer input, triage signals, retrieved sources, quality badges, and draft editor with keyboard shortcuts (`Cmd/Ctrl+Enter`), quick financial snippets, and approval controls.

---

## 7. SYSTEM FLOW CHART

```text
       [Customer Ticket Created / Ingested]
                        │
                        ▼
            [Text Preprocessing & Cleaning]
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
[BERT Intent Classification]   [DistilBERT Sentiment Polarity]
       │                                 │
       └────────────────┬────────────────┘
                        ▼
      [Deterministic Rule-Based Priority Engine]
                        │
                        ▼
        [T5-Small Abstractive Summarization]
                        │
                        ▼
         [MiniLM-L6-v2 Embedding Generation]
                        │
                        ▼
      [FAISS IndexFlatIP Cosine Vector Search]
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
[Top-3 FAQ/Policy Docs]   [Duplicate Check (score >= 0.90)]
         │                             │
         └──────────────┬──────────────┘
                        ▼
        [Prompt Assembly with Knowledge Context]
                        │
                        ▼
       [Qwen2.5-1.5B-Instruct Generative Drafting]
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
[Sentence Groundedness Check]  [LLM-as-a-Judge Audit]
         │                             │
         └──────────────┬──────────────┘
                        ▼
         [SQLite Persistence (NEEDS_REVIEW)]
                        │
                        ▼
      [Human Agent Review & Approval Workspace]
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
     [Edit]         [Approve]       [Reject]
        │               │               │
  (Saves Draft)   (sent: false)   (Records Reason)
```

---

## 8. IMPLEMENTATION & EXECUTION PROCEDURE

### 8.1 Software Installation & Dependencies
1. **Python Environment:**
   ```bash
   cd ml_service
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Node.js Gateway:**
   ```bash
   cd backend
   npm install
   ```

### 8.2 Model Pre-Caching & Offline Preparation
To guarantee deterministic execution and avoid HuggingFace Hub network retries, models are downloaded once:
```bash
cd ml_service
.venv/bin/python scripts/download_models.py
```
This downloads `sentence-transformers/all-MiniLM-L6-v2` and `Qwen/Qwen2.5-1.5B-Instruct` into local cache.

### 8.3 Knowledge Base & Vector Index Construction
Build the 77-intent FAQ/Policy repository and construct the FAISS flat index:
```bash
cd ml_service
.venv/bin/python scripts/build_kb.py
```
*Output: Index built with 1,745 vectors in `models/rag_index/index.faiss`.*

### 8.4 Academic Benchmark Execution
Run evaluation suites to compute live empirical metrics:
```bash
cd ml_service
.venv/bin/python scripts/eval_retrieval.py   # Produces reports/retrieval_eval.json
.venv/bin/python scripts/eval_prompts.py     # Produces reports/prompt_eval_results.json
```

### 8.5 Database Initialization
Initialize database tables and seed comprehensive test records:
```bash
cd backend
node src/db/migrate.js
node src/db/seed.js
```

### 8.6 Launching Servers
- **Terminal 1 (GenAI ML Service):**
  ```bash
  cd ml_service
  .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
  ```
- **Terminal 2 (Backend Gateway & UI):**
  ```bash
  cd backend
  node src/server.js
  ```
- **Web Browser:** Access `http://localhost:3000`

---

## 9. EXPERIMENTAL EVALUATION & BENCHMARKS

### Experiment 2: BERT Intent Classification (BANKING77)
Evaluated on the official held-out test split (3,080 queries across 77 fine-grained classes):
- **Accuracy:** 93.2%
- **Macro-F1:** 92.8%
- **Weighted-F1:** 93.1%

### Experiment 4: Prompt Engineering & Generative Strategies Comparison
Conducted across 7 prompt engineering strategies using `Qwen2.5-1.5B-Instruct`:

| Strategy | Relevance (1–5) | Tone (1–5) | Groundedness | Consistency | Avg Words | Avg Latency |
|---|---|---|---|---|---|---|
| **ZERO_SHOT** | 4.4 / 5 | 4.6 / 5 | 27% | 78% | 114 | 5.90s |
| **FEW_SHOT** | 4.0 / 5 | 4.8 / 5 | 46% | 85% | 85 | 3.83s |
| **STRUCTURED** | 4.2 / 5 | 4.4 / 5 | 35% | 89% | 83 | 3.75s |
| **INSTRUCTIONAL** | 4.2 / 5 | 4.0 / 5 | 36% | 91% | 97 | 4.22s |
| **CONVERSATIONAL** | 4.0 / 5 | 4.4 / 5 | 29% | 84% | 81 | 3.37s |
| **COT (Chain-of-Thought)** | 4.2 / 5 | 4.4 / 5 | 43% | 93% | 91 | 3.75s |
| **SELF_CONSISTENCY** | 4.0 / 5 | 4.6 / 5 | 29% | 96% | 122 | 12.74s |

*Key Finding: Few-Shot and Chain-of-Thought achieve the highest factual groundedness, while Self-Consistency yields the highest semantic consensus (96%).*

### Experiment 5: Dense Vector Search (FAISS Retrieval)
Evaluated on 300 test queries over 1,745 indexed documents:
- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- **Index Type:** `faiss.IndexFlatIP` (Exact Cosine Inner Product)
- **Hit@1 Accuracy:** 50.3%
- **Hit@3 Accuracy:** 75.7%
- **Hit@5 Accuracy:** 84.3%
- **Mean Reciprocal Rank (MRR):** 0.6348
- **Average Query Latency:** 21.77 ms

---

## 10. ETHICAL AI & GOVERNANCE SAFEGUARDS

1. **Human-in-the-Loop Non-Negotiable Guarantee:** System strictly creates drafts. Approval records `sent: false`. No autonomous external email or messaging daemon exists.
2. **Explainable Triage Governance:** Priority levels are assigned by deterministic rules with auditable reason codes (`SECURITY_OR_FRAUD_KEYWORD`, etc.).
3. **Indirect Prompt Injection Barrier:** Untrusted customer inputs are enclosed in `<<< >>>` markers with strict system prompt boundaries prohibiting role manipulation.
4. **Credential Leak Prevention:** Hard safety heuristics catch requests for customer credentials (PINs, passwords, CVVs), immediately penalizing safety scores.
5. **Data Privacy:** Local inference ensures customer financial inquiries are never transmitted to third-party proprietary AI cloud APIs.

---

## 11. CONCLUSION & FUTURE SCOPE

### Conclusion
SupportIQ demonstrates that enterprise customer support can achieve high operational throughput without sacrificing safety, explainability, or compliance. By combining fine-tuned BERT classifiers with FAISS vector search, local Qwen2.5 LLMs, and automated groundedness auditing under a strict Human-in-the-Loop regime, SupportIQ transforms support operations from reactive firefighting into an intelligent, auditable copilot workflow.

### Future Scope
1. **Dynamic PII Masking:** Pre-inference masking of sensitive financial identifiers (IBANs, card numbers) via named entity recognition.
2. **Adaptive Knowledge Indexing:** Automatically indexing human-approved agent edits as high-confidence exemplar pairs into the FAISS index at runtime.
3. **Multi-Lingual Intent Support:** Extending vector embeddings to multilingual models (e.g., `paraphrase-multilingual-MiniLM-L12-v2`) for global cross-border banking operations.

---

## 12. BIBLIOGRAPHY

1. Lewis, P., et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.* Advances in Neural Information Processing Systems (NeurIPS 2020).
2. Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2018). *BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding.* arXiv:1810.04805.
3. Raffel, C., et al. (2020). *Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5).* Journal of Machine Learning Research (JMLR), 21(140), 1-67.
4. Johnson, J., Douze, M., & Jégou, H. (2019). *Billion-Scale Similarity Search with GPUs (FAISS).* IEEE Transactions on Big Data, 7(3), 535-547.
5. Reimers, N., & Gurevych, I. (2019). *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks.* EMNLP 2019.
6. Wei, J., et al. (2022). *Chain-of-Thought Prompting Elicits Reasoning in Large Language Models.* NeurIPS 2022.
7. Wang, X., et al. (2022). *Self-Consistency Improves Chain of Thought Reasoning in Language Models.* ICLR 2023.
8. Zheng, L., et al. (2023). *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena.* NeurIPS 2023 Datasets and Benchmarks Track.
9. Casanueva, I., et al. (2020). *Efficient Intent Detection with Dual Sentence Encoders (PolyAI BANKING77).* Data & Knowledge Engineering.

---

## 13. STUDENT PROFILE & CODING PORTFOLIO

- **Candidate Name:** Saurabh Kumar Singh  
- **University ID:** 25MCD10005  
- **Degree Program:** Master of Computer Applications (Data Science)  
- **Institution:** University Institute of Computing (UIC), Chandigarh University  
- **Project Title:** SupportIQ — RAG-Powered GenAI Support Copilot and Triage Engine  
- **Repository:** Private Academic Repository (UIC Examination Board)
