from typing import Dict, Any, List
from transformers import AutoTokenizer

DEFAULT_MODEL_NAME = "google-bert/bert-base-uncased"

class TokenizerService:
    def __init__(self, model_name: str = DEFAULT_MODEL_NAME):
        self.model_name = model_name
        self._tokenizer = None

    @property
    def tokenizer(self):
        if self._tokenizer is None:
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        return self._tokenizer

    def tokenize(self, text: str, max_length: int = 128) -> Dict[str, Any]:
        """
        Tokenizes preprocessed text into PyTorch tensors or Python lists.
        Handles truncation and attention masking as required by Experiment 1.
        """
        encoded = self.tokenizer(
            text,
            truncation=True,
            max_length=max_length,
            padding=False,
            return_attention_mask=True,
        )

        tokens = self.tokenizer.convert_ids_to_tokens(encoded["input_ids"])

        return {
            "input_ids": encoded["input_ids"],
            "attention_mask": encoded["attention_mask"],
            "tokens": tokens,
            "token_count": len(encoded["input_ids"]),
        }
