# SupportIQ — Dataset Documentation Card

## 1. Primary Dataset: PolyAI BANKING77

- **Dataset Name:** PolyAI/banking77
- **Source Repository:** [Hugging Face PolyAI/banking77](https://huggingface.co/datasets/PolyAI/banking77)
- **Original Research Paper:** *Efficient Intent Detection with Dual Sentence Encoders* (Casanueva et al., 2020)
- **License:** Creative Commons Attribution 4.0 International (CC-BY-4.0)
- **Retrieval Date:** 2026-11-03
- **Total Records:** 13,083 queries
- **Domain:** Single-domain online banking and fintech customer support queries
- **Number of Classes:** 77 fine-grained intent classes

### Splits
- **Train Split:** 10,003 samples
- **Test Split:** 3,080 samples
- **Derived Validation Split:** 10% stratified from training split (1,001 samples) with seed 42 for reproducible hyperparameter tuning.

### Schema
| Column | Type | Description |
|---|---|---|
| `text` | string | Raw user query in English |
| `label` | ClassLabel (0-76) | Target intent class identifier |

### Dataset Limitations & Honest Boundary
- **Intent Only:** BANKING77 does not contain sentiment labels, priority labels, reference ticket summaries, or customer service response drafts.
- **Domain Specialization:** The vocabulary is specialized to banking queries and cannot be assumed to generalize universally to e-commerce, cloud IT infrastructure, or telecommunications without domain adaptation.
- **No Private PII:** Public benchmark dataset, free of private customer personal records.

---

## 2. Supplementary Dataset: Bitext Customer Support LLM Chatbot Dataset

- **Dataset Name:** bitext/Bitext-customer-support-llm-chatbot-training-dataset
- **Source:** [Hugging Face bitext/Bitext-customer-support-llm-chatbot-training-dataset](https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset)
- **License:** CDLA-Sharing-1.0
- **Total Records:** 26,872 question/answer pairs across 27 intents and 10 categories
- **Fields:** `flags`, `instruction`, `category`, `intent`, `response`
- **Recommended Use in SupportIQ:** Supplementary reference for few-shot prompt templates and realistic support reply tone. It is a hybrid curated/synthetic dataset, so it is not treated as ground truth for operational SLA or real-world customer outcomes.

