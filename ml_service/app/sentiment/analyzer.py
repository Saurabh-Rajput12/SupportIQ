import os
from typing import Dict, Any
from transformers import pipeline

DEFAULT_SENTIMENT_MODEL = "distilbert/distilbert-base-uncased-finetuned-sst-2-english"

class SentimentAnalyzer:
    """
    SupportIQ Sentiment Analysis Module (Syllabus Supporting Module).
    Utilizes DistilBERT SST-2 English binary classifier.
    Important: Ground-truth domain limitation is strictly binary (positive/negative).
    Uncertain predictions are flagged via confidence threshold, never fabricated
    as a fictitious 'neutral' training class.
    """
    def __init__(self, model_id: str = DEFAULT_SENTIMENT_MODEL):
        self.model_id = model_id
        self._pipeline = None

    @property
    def pipe(self):
        if self._pipeline is None:
            self._pipeline = pipeline(
                "text-classification",
                model=self.model_id,
                device="mps" if False else -1, # CPU pipeline for stability
            )
        return self._pipeline

    def predict(self, text: str) -> Dict[str, Any]:
        truncated_text = text[:4000].strip()
        if not truncated_text:
            return {
                "label": "uncertain",
                "confidence": 0.0,
                "supported_labels": ["positive", "negative"],
                "model_id": self.model_id,
                "note": "Empty text provided"
            }

        result = self.pipe(truncated_text)[0]
        raw_label = result["label"].lower()
        score = float(result["score"])

        # Flag uncertainty if model confidence is low (e.g. < 0.65)
        is_uncertain = bool(score < 0.65)

        return {
            "label": raw_label,
            "confidence": round(score, 4),
            "supported_labels": ["positive", "negative"],
            "model_id": self.model_id,
            "is_uncertain": is_uncertain,
        }
