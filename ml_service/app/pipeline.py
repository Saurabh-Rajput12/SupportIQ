import time
import uuid
from typing import Dict, Any, List
from .preprocessing.cleaner import TextCleaner
from .intent.classifier import IntentClassifier
from .sentiment.analyzer import SentimentAnalyzer
from .priority.engine import PriorityEngine
from .summarization.summarizer import T5Summarizer
from .reply_generation.generator import ReplyGenerator

class AnalysisPipeline:
    def __init__(self):
        self.cleaner = TextCleaner()
        self.intent_classifier = IntentClassifier()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.priority_engine = PriorityEngine()
        self.t5_summarizer = T5Summarizer()
        self.reply_generator = ReplyGenerator()
        self._warmed_up = False

    def warm_up(self):
        if self._warmed_up:
            return
        print("[Pipeline] Warming up models...")
        self.intent_classifier.load()
        # Sentiment and T5 lazy-load or can preload
        self._warmed_up = True
        print("[Pipeline] Warm-up complete.")

    def analyze(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()
        ticket_id = payload.get("ticket_id", "SUP-UNKNOWN")
        subject = payload.get("subject", "")
        description = payload.get("description", "")
        prompt_type = payload.get("prompt_type", "FEW_SHOT")

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

        # 6. Reply Draft Generation
        reply_res = self.reply_generator.generate(
            ticket_text=combined_text,
            intent=intent_res["label"],
            sentiment=sent_res["label"],
            priority=priority_res["label"],
            summary=summary_res["text"],
            prompt_type=prompt_type,
        )

        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "request_id": f"req-{uuid.uuid4().hex[:8]}",
            "ticket_id": ticket_id,
            "intent": intent_res,
            "sentiment": sent_res,
            "priority": priority_res,
            "summary": summary_res,
            "reply": reply_res,
            "processing_ms": duration_ms,
            "warnings": warnings,
        }

_pipeline_instance = None

def get_pipeline() -> AnalysisPipeline:
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = AnalysisPipeline()
    return _pipeline_instance
