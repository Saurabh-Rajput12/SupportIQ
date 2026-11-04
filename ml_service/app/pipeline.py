import os
import time
import uuid
from typing import Dict, Any, List, Optional

from .preprocessing.cleaner import TextCleaner
from .intent.classifier import IntentClassifier
from .sentiment.analyzer import SentimentAnalyzer
from .priority.engine import PriorityEngine
from .summarization.summarizer import T5Summarizer
from .reply_generation.generator import ReplyGenerator
from .retrieval.embedder import Embedder
from .retrieval.store import VectorStore
from .quality.groundedness import check_groundedness
from .quality.judge import LLMJudge
from .llm.provider import get_provider

class AnalysisPipeline:
    def __init__(self):
        self.cleaner = TextCleaner()
        self.intent_classifier = IntentClassifier()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.priority_engine = PriorityEngine()
        self.t5_summarizer = T5Summarizer()
        self.reply_generator = ReplyGenerator()
        
        # GenAI RAG components
        self.embedder = Embedder()
        self.store = VectorStore(embedder=self.embedder)
        self.judge = LLMJudge()

        self.rag_top_k = int(os.getenv("RAG_TOP_K", "3"))
        self.rag_min_score = float(os.getenv("RAG_MIN_SCORE", "0.35"))
        self.enable_judge = os.getenv("ENABLE_JUDGE", "true").lower() in ("true", "1", "yes")
        self._warmed_up = False

    def warm_up(self):
        if self._warmed_up:
            return
        print("[Pipeline] Warming up models...")
        self.intent_classifier.load()
        loaded_index = self.store.load()
        if loaded_index:
            print(f"[Pipeline] FAISS RAG index loaded ({self.store.index.ntotal} docs).")
        else:
            print("[Pipeline] Warning: RAG index not found on disk. Build index with scripts/build_kb.py.")
        
        # Preload LLM provider if configured for local inference
        provider = get_provider()
        provider.load()

        self._warmed_up = True
        print("[Pipeline] Warm-up complete.")

    def analyze(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        ticket_id = payload.get("ticket_id", "SUP-UNKNOWN")
        subject = payload.get("subject", "")
        description = payload.get("description", "")
        prompt_type = payload.get("prompt_type", "INSTRUCTIONAL")

        # 1. Preprocessing
        clean_subject = self.cleaner.clean(subject)
        clean_desc = self.cleaner.clean(description)
        combined_text = f"{clean_subject}\n\n{clean_desc}".strip()

        warnings: List[str] = []

        # 2. Intent Classification (BERT)
        intent_res = self.intent_classifier.predict(combined_text)
        if intent_res["confidence"] < 0.5:
            warnings.append(f"Low intent confidence ({intent_res['confidence']:.2f}). Agent verification recommended.")

        # 3. Sentiment Analysis (DistilBERT SST-2)
        sent_res = self.sentiment_analyzer.predict(combined_text)
        if sent_res.get("is_uncertain"):
            warnings.append(f"Low sentiment confidence ({sent_res['confidence']:.2f}). Displayed as uncertain.")

        # 4. Priority Recommendation (Rule-Based Engine)
        priority_res = self.priority_engine.evaluate(
            text=combined_text,
            intent_label=intent_res["label"],
            sentiment=sent_res,
        )

        # 5. Summarization (T5)
        summary_res = self.t5_summarizer.summarize(combined_text)

        # 6. Semantic Retrieval (RAG via FAISS)
        # Search official FAQ and Policy knowledge base
        docs = self.store.search(
            combined_text,
            k=self.rag_top_k,
            doc_types=["FAQ", "POLICY", "APPROVED_REPLY"],
            min_score=self.rag_min_score,
        )
        if not docs:
            # Fallback: query without min_score threshold to provide closest reference
            docs = self.store.search(combined_text, k=1, doc_types=["FAQ", "POLICY"])
            if not docs:
                warnings.append("No relevant company policy found. Agent must verify the draft.")

        # Search for duplicate or similar historical inquiries
        similar = self.store.search(
            combined_text,
            k=3,
            doc_types=["PAST_TICKET", "LIVE_TICKET"],
        )
        is_duplicate = bool(similar and float(similar[0].get("score", 0.0)) >= 0.90)
        if is_duplicate:
            warnings.append(f"High similarity detected with past ticket {similar[0].get('id')} ({similar[0].get('score', 0):.2f}). Potential duplicate.")

        # 7. GenAI Reply Draft Generation (RAG Prompting)
        reply_res = self.reply_generator.generate(
            ticket_text=combined_text,
            intent=intent_res["label"],
            sentiment=sent_res["label"],
            priority=priority_res["label"],
            summary=summary_res["text"],
            prompt_type=prompt_type,
            context_docs=docs,
        )

        # 8. Automated Quality Auditing
        # Groundedness Check (claims verified against retrieved context and ticket)
        grounded_res = check_groundedness(
            reply_text=reply_res["text"],
            docs=docs,
            ticket_text=combined_text,
            embedder=self.embedder,
        )

        # LLM-as-a-Judge Audit (Relevance, Tone, Safety)
        judge_res = self.judge.score(combined_text, reply_res["text"]) if self.enable_judge else None

        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "request_id": f"req-{uuid.uuid4().hex[:8]}",
            "ticket_id": ticket_id,
            "intent": intent_res,
            "sentiment": sent_res,
            "priority": priority_res,
            "summary": summary_res,
            "reply": reply_res,
            "sources": docs,
            "quality": {
                "groundedness": grounded_res,
                "judge": judge_res,
            },
            "similar_tickets": similar,
            "is_duplicate": is_duplicate,
            "processing_ms": duration_ms,
            "warnings": warnings,
        }

_pipeline_instance = None

def get_pipeline() -> AnalysisPipeline:
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = AnalysisPipeline()
    return _pipeline_instance
