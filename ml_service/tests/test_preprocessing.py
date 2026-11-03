import pytest
from app.preprocessing.cleaner import TextCleaner

def test_cleaner_empty_and_none():
    assert TextCleaner.clean(None) == ""
    assert TextCleaner.clean("") == ""
    assert TextCleaner.clean("   \t  \n  ") == ""

def test_cleaner_whitespace_normalization():
    raw = "My   card    is    not   working.\n\n\n\nPlease help."
    cleaned = TextCleaner.clean(raw)
    assert cleaned == "My card is not working.\n\nPlease help."

def test_cleaner_preserves_negation_and_punctuation():
    raw = "I did NOT receive my refund! Why isn't it in my account?"
    cleaned = TextCleaner.clean(raw)
    assert "NOT" in cleaned
    assert "isn't" in cleaned
    assert "!" in cleaned
    assert "?" in cleaned

def test_cleaner_unicode_normalization():
    # Curly quotes and accents
    raw = "Customer’s café bill wasn’t refunded."
    cleaned = TextCleaner.clean(raw)
    assert "Customer's" in cleaned or "Customer’s" in cleaned
    assert "café" in cleaned

def test_cleaner_max_length_truncation():
    raw = "A" * 15000
    cleaned = TextCleaner.clean(raw, max_length=100)
    assert len(cleaned) == 100

