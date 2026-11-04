"""Evaluation Script for Experiment 5: Vector Search and Semantic Retrieval Metrics."""
import json
import os
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "ml_service"))

from datasets import load_from_disk
from app.retrieval.store import VectorStore
from app.retrieval.embedder import Embedder

def main():
    print("[EvalRetrieval] Running Retrieval Evaluation (Experiment 5)...")
    
    # 1. Load FAISS Store
    embedder = Embedder()
    store = VectorStore(embedder=embedder)
    if not store.load(PROJECT_ROOT / "models" / "rag_index"):
        raise FileNotFoundError("FAISS index not found. Run scripts/build_kb.py first.")

    # 2. Load test queries
    raw_data_dir = PROJECT_ROOT / "data" / "raw" / "banking77"
    ds = load_from_disk(str(raw_data_dir))
    test_ds = ds["test"]

    label_map_path = PROJECT_ROOT / "data" / "processed" / "banking77_id2label.json"
    id2label = {}
    if label_map_path.exists():
        raw_map = json.loads(label_map_path.read_text(encoding="utf-8"))
        id2label = {int(k): v for k, v in raw_map.items()}

    # Evaluate on a representative sample of 300 test queries
    eval_sample_size = min(300, len(test_ds))
    step = max(1, len(test_ds) // eval_sample_size)
    samples = [test_ds[i] for i in range(0, len(test_ds), step)][:eval_sample_size]

    print(f"[EvalRetrieval] Evaluating {len(samples)} test inquiries against FAQ/Policy index...")
    
    hit_1 = 0
    hit_3 = 0
    hit_5 = 0
    reciprocal_ranks = []
    latencies = []

    for item in samples:
        query = item["text"]
        true_intent = id2label.get(item["label"], "")

        t0 = time.time()
        results = store.search(query, k=5, doc_types=["FAQ", "POLICY"])
        latencies.append((time.time() - t0) * 1000)

        found_rank = None
        for rank, res in enumerate(results, start=1):
            if res.get("intent") == true_intent:
                found_rank = rank
                break

        if found_rank == 1:
            hit_1 += 1
        if found_rank is not None and found_rank <= 3:
            hit_3 += 1
        if found_rank is not None and found_rank <= 5:
            hit_5 += 1

        reciprocal_ranks.append(1.0 / found_rank if found_rank else 0.0)

    total = len(samples)
    metrics = {
        "dataset": "PolyAI/banking77 (Test Split)",
        "sample_size": total,
        "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
        "vector_dim": 384,
        "index_type": "IndexFlatIP (Cosine Normalized)",
        "total_indexed_documents": store.index.ntotal if store.index else 0,
        "metrics": {
            "hit_at_1": round(hit_1 / total, 4),
            "hit_at_3": round(hit_3 / total, 4),
            "hit_at_5": round(hit_5 / total, 4),
            "mrr": round(sum(reciprocal_ranks) / total, 4),
            "avg_latency_ms": round(sum(latencies) / total, 2),
        },
        "evaluated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    report_dir = PROJECT_ROOT / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    out_file = report_dir / "retrieval_eval.json"
    out_file.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("[EvalRetrieval] Evaluation Results:")
    print(f"  Hit@1: {metrics['metrics']['hit_at_1'] * 100:.1f}%")
    print(f"  Hit@3: {metrics['metrics']['hit_at_3'] * 100:.1f}%")
    print(f"  Hit@5: {metrics['metrics']['hit_at_5'] * 100:.1f}%")
    print(f"  MRR:   {metrics['metrics']['mrr']:.4f}")
    print(f"  Avg Latency: {metrics['metrics']['avg_latency_ms']:.2f} ms")
    print(f"[EvalRetrieval] Report written to {out_file}")

if __name__ == "__main__":
    main()

