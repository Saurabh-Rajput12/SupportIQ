import re
import unicodedata
from typing import Optional

MAX_TEXT_LENGTH = 10000

class TextCleaner:
    """
    SupportIQ Text Normalizer for Transformer-based Models (Experiment 1).
    Preserves semantic punctuation, negation words, contractions, and casing.
    Does NOT aggressively stem, lemmatize, or drop stopwords, which destroys
    Transformer self-attention context.
    """

    @staticmethod
    def clean(text: Optional[str], max_length: int = MAX_TEXT_LENGTH) -> str:
        if text is None:
            return ""

        # Normalize Unicode characters (e.g., curly quotes, accents)
        normalized = unicodedata.normalize("NFKC", text)

        # Normalize Windows/Mac line breaks to \n
        normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")

        # Replace excessive whitespace / tab characters within lines with single space
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in normalized.split("\n")]

        # Collapse more than two consecutive newlines into double newlines
        cleaned = "\n".join(lines)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

        # Enforce maximum text length truncation safely
        if len(cleaned) > max_length:
            cleaned = cleaned[:max_length].rstrip()

        return cleaned
