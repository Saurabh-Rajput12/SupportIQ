import os
import json
from pathlib import Path
from typing import Dict, Any, List
import torch
from transformers import AutoTokenizer, AutoConfig, AutoModelForSequenceClassification

FALLBACK_BASE_MODEL = "google-bert/bert-base-uncased"

class IntentClassifier:
    """
    BERT Intent Classifier for SupportIQ (Syllabus Experiment 2).
    Evaluates customer support ticket text and outputs intent prediction,
    softmax confidence score, and top-k candidates.
    """
    def __init__(self, model_dir: str = "models/intent_classifier"):
        self.project_root = Path(__file__).resolve().parents[3]  # SupportIQ root
        self.model_dir = str(self.project_root / "models" / "intent_classifier")
        self.device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.tokenizer = None
        self.id2label = {}
        self.label2id = {}
        self._is_loaded = False

    def _find_label_file(self) -> Path:
        candidates = [
            Path(self.model_dir) / "id2label.json",
            self.project_root / "data" / "processed" / "banking77_id2label.json",
            Path("data/processed/banking77_id2label.json"),
            Path("../data/processed/banking77_id2label.json"),
        ]
        for c in candidates:
            if c.exists():
                return c
        return None

    def load(self):
        if self._is_loaded:
            return

        label_path = self._find_label_file()
        if label_path and label_path.exists():
            try:
                with open(label_path, "r", encoding="utf-8") as f:
                    raw_map = json.load(f)
                    self.id2label = {int(k): v for k, v in raw_map.items()}
                    self.label2id = {v: int(k) for k, v in self.id2label.items()}
            except Exception as e:
                print(f"[IntentClassifier] Warning reading labels: {e}")

        num_labels = len(self.id2label) if self.id2label else 77

        # Determine path
        config_file = Path(self.model_dir) / "config.json"
        if config_file.exists():
            path = self.model_dir
            print(f"[IntentClassifier] Loading trained checkpoint from {path}...")
        else:
            path = FALLBACK_BASE_MODEL
            print(f"[IntentClassifier] Trained checkpoint not found at {self.model_dir}, loading baseline {path}...")

        self.tokenizer = AutoTokenizer.from_pretrained(path)

        # Explicitly configure num_labels via AutoConfig to prevent NoneType shape errors
        config = AutoConfig.from_pretrained(
            path,
            num_labels=num_labels,
            id2label=self.id2label if self.id2label else None,
            label2id=self.label2id if self.label2id else None,
        )

        self.model = AutoModelForSequenceClassification.from_pretrained(
            path,
            config=config,
        )

        self.model.to(self.device)
        self.model.eval()
        self._is_loaded = True
        print(f"[IntentClassifier] Loaded on {self.device} with {num_labels} intent labels.")

    def predict(self, text: str, top_k_count: int = 3) -> Dict[str, Any]:
        if not self._is_loaded:
            self.load()

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=128
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            logits = self.model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)[0]

        top_indices = torch.argsort(probs, descending=True)[:top_k_count]
        top_k = []
        for idx in top_indices:
            i = int(idx)
            lbl = self.id2label.get(i, f"intent_{i}")
            conf = float(probs[i])
            top_k.append({"label": lbl, "confidence": round(conf, 4)})

        top_pred = top_k[0]

        return {
            "label": top_pred["label"],
            "confidence": top_pred["confidence"],
            "top_k": top_k,
            "model_id": "supportiq-bert-banking77-v1",
            "is_confident": bool(top_pred["confidence"] >= 0.5),
        }
