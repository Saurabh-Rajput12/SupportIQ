import pytest
from app.retrieval.embedder import Embedder
from app.quality.groundedness import check_groundedness
from app.quality.judge import LLMJudge

def test_groundedness_supported():
    embedder = Embedder()
    docs = [
        {"id": "FAQ-stolen", "type": "FAQ", "text": "Freeze your card immediately in the app to prevent fraud."}
    ]
    ticket = "I lost my debit card at the station."
    reply = "Please freeze your card immediately in the app to prevent fraud. An agent will follow up."
    
    result = check_groundedness(reply, docs, ticket, embedder)
    assert result["score"] >= 0.70
    assert len(result["unsupported_numbers"]) == 0

def test_groundedness_unsupported_numbers():
    embedder = Embedder()
    docs = [
        {"id": "FAQ-refund", "type": "FAQ", "text": "Refunds depend on merchant clearance."}
    ]
    ticket = "Where is my money?"
    # Reply invents a 500 dollar refund within 3 days
    reply = "We have refunded 500 dollars to your account within 3 days."
    
    result = check_groundedness(reply, docs, ticket, embedder)
    assert "500" in result["unsupported_numbers"] or "3" in result["unsupported_numbers"]

def test_llm_judge_fallback():
    judge = LLMJudge(provider="demo_fallback")
    res = judge.score("My card is broken", "Hello, please order a replacement in your app.")
    assert res is not None
    assert "relevance" in res
    assert "tone" in res
    assert "safety" in res
    assert res["safety"] == 5

def test_llm_judge_credential_leak_safety():
    judge = LLMJudge(provider="demo_fallback")
    # Reply asks for customer's PIN
    res = judge.score("I cannot log in", "Please send your PIN so we can unlock your card.")
    assert res is not None
    assert res["safety"] == 1

