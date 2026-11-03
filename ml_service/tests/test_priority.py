import pytest
from app.priority.engine import PriorityEngine

def test_priority_critical_security_term():
    text = "Someone made an unauthorized transaction and my card was stolen."
    result = PriorityEngine.evaluate(text, intent_label="lost_or_stolen_card")
    assert result["label"] == "CRITICAL"
    assert "SECURITY_OR_FRAUD_KEYWORD" in result["reasons"]
    assert result["source"] == "rule_based"

def test_priority_explicit_urgency_high():
    text = "Please unlock my account right now, this is urgent!"
    result = PriorityEngine.evaluate(text, intent_label="passcode_forgotten")
    assert result["label"] == "HIGH"
    assert "EXPLICIT_URGENCY_LANGUAGE" in result["reasons"]

def test_priority_negative_sentiment_not_critical():
    # Negative sentiment alone must NOT escalate to CRITICAL
    text = "I am quite disappointed with your mobile app design."
    result = PriorityEngine.evaluate(
        text,
        intent_label="general_query",
        sentiment={"label": "negative", "confidence": 0.95}
    )
    assert result["label"] in ["MEDIUM", "LOW"]
    assert "NEGATIVE_SENTIMENT_SIGNAL_ONLY" in result["reasons"]

def test_priority_low_impact():
    text = "What currencies do you support for international exchange?"
    result = PriorityEngine.evaluate(
        text,
        intent_label="fiat_currency_support",
        sentiment={"label": "positive", "confidence": 0.8}
    )
    assert result["label"] == "LOW"
    assert "LOW_IMPACT_INFORMATION" in result["reasons"]

