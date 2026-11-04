import pytest
from app.retrieval.embedder import Embedder
from app.retrieval.store import VectorStore

def test_embedder_shapes():
    embedder = Embedder()
    vecs = embedder.encode(["Card was stolen", "How to top up"])
    assert vecs.shape[0] == 2
    assert vecs.shape[1] == 384
    # Check normalized
    norms = (vecs ** 2).sum(axis=1) ** 0.5
    for norm in norms:
        assert abs(norm - 1.0) < 1e-4

def test_vector_store_build_and_search(tmp_path):
    embedder = Embedder()
    store = VectorStore(embedder=embedder)
    
    docs = [
        {"id": "FAQ-stolen", "type": "FAQ", "title": "Stolen Card", "text": "Freeze your card immediately if lost or stolen."},
        {"id": "FAQ-topup", "type": "FAQ", "title": "Card Top Up", "text": "Top up instantly using a linked debit card."},
        {"id": "PT-01", "type": "PAST_TICKET", "title": "Past Ticket", "text": "I think someone took my wallet and card."},
    ]
    store.build(docs)
    assert store.index.ntotal == 3

    # Query matching stolen card
    results = store.search("my card was stolen", k=2, doc_types=["FAQ"])
    assert len(results) > 0
    assert results[0]["id"] == "FAQ-stolen"
    assert results[0]["score"] > 0.4

    # Persistence test
    store.save(tmp_path)
    new_store = VectorStore(embedder=embedder)
    assert new_store.load(tmp_path) is True
    assert new_store.index.ntotal == 3

    # Min score filter
    high_threshold_results = store.search("completely unrelated quantum physics", k=2, min_score=0.99)
    assert len(high_threshold_results) == 0

    # Empty store test
    empty_store = VectorStore(embedder=embedder)
    assert empty_store.search("hello") == []

