import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"

def test_ready_endpoint(client):
    res = client.get("/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["ready"] is True
    assert "intent" in data["models"]

def test_intent_predict_endpoint(client):
    payload = {"text": "I lost my credit card while at the restaurant."}
    res = client.post("/api/v1/intent/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "label" in data
    assert "confidence" in data
    assert isinstance(data["confidence"], float)

def test_sentiment_predict_endpoint(client):
    payload = {"text": "I am furious that you charged my account without permission!"}
    res = client.post("/api/v1/sentiment/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["label"] in ["positive", "negative"]
    assert "supported_labels" in data

def test_summarize_endpoint(client):
    payload = {
        "text": "The customer was charged twice for a wire transfer of 200 dollars on Tuesday morning and demands a refund.",
        "max_new_tokens": 40
    }
    res = client.post("/api/v1/summarize", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "text" in data
    assert len(data["text"]) > 0

def test_reply_generate_endpoint(client):
    payload = {
        "ticket_text": "I forgot my pin number and cannot withdraw funds.",
        "intent": "pin_blocked",
        "sentiment": "negative",
        "priority": "HIGH",
        "summary": "Customer forgot PIN and cannot access funds.",
        "prompt_type": "FEW_SHOT"
    }
    res = client.post("/api/v1/reply/generate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "text" in data
    assert data["prompt_type"] == "FEW_SHOT"

def test_full_analyze_endpoint(client):
    payload = {
        "ticket_id": "SUP-TEST-001",
        "subject": "Unauthorized charge of 50 dollars",
        "description": "I did not make this purchase. Please cancel it immediately and protect my card.",
        "prompt_type": "FEW_SHOT"
    }
    res = client.post("/api/v1/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["ticket_id"] == "SUP-TEST-001"
    assert "intent" in data
    assert "sentiment" in data
    assert "priority" in data
    assert "summary" in data
    assert "reply" in data
    assert data["priority"]["source"] == "rule_based"
    assert data["processing_ms"] >= 0

