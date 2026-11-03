import os
from typing import Dict, Any
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

DEFAULT_T5_MODEL = "google-t5/t5-small"

class T5Summarizer:
    """
    T5 Summarizer for SupportIQ Customer Tickets (Syllabus Experiment 3).
    Generates a concise 1-2 sentence factual synopsis using google-t5/t5-small.
    Safeguards: strictly bounded max_new_tokens, beam search, no_repeat_ngram_size.
    """
    def __init__(self, model_id: str = DEFAULT_T5_MODEL):
        self.model_id = model_id
        self.device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = None
        self.model = None
        self._is_loaded = False

    def load(self):
        if self._is_loaded:
            return
        print(f"[T5Summarizer] Loading {self.model_id} on {self.device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_id)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_id)
        self.model.to(self.device)
        self.model.eval()
        self._is_loaded = True
        print(f"[T5Summarizer] {self.model_id} loaded successfully.")

    def summarize(self, text: str, max_new_tokens: int = 64) -> Dict[str, Any]:
        cleaned = text.strip() if text else ""
        if not cleaned:
            return {
                "text": "No content provided to summarize.",
                "model_id": self.model_id,
                "token_count": 0,
            }

        if not self._is_loaded:
            self.load()

        prompt = "summarize: " + cleaned
        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            output = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                num_beams=4,
                no_repeat_ngram_size=3,
                early_stopping=True,
            )

        summary_text = self.tokenizer.decode(output[0], skip_special_tokens=True).strip()

        return {
            "text": summary_text,
            "model_id": self.model_id,
            "token_count": len(output[0]),
        }

