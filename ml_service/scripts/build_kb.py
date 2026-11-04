"""Build Knowledge Base and FAISS Vector Index for RAG and Similarity Search."""
import json
import os
import sys
from pathlib import Path

# Set project root in path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "ml_service"))

from datasets import load_from_disk
from app.retrieval.store import VectorStore
from app.retrieval.embedder import Embedder

def main():
    print("[BuildKB] Starting knowledge base build...")
    
    # 1. Load FAQ / Policy articles
    kb_path = PROJECT_ROOT / "knowledge_base" / "faq_policy.json"
    if not kb_path.exists():
        raise FileNotFoundError(f"Knowledge base file not found at {kb_path}")
    
    faq_docs = json.loads(kb_path.read_text(encoding="utf-8"))
    print(f"[BuildKB] Loaded {len(faq_docs)} FAQ/Policy documents from {kb_path}")
    
    # 2. Load label map
    label_map_path = PROJECT_ROOT / "data" / "processed" / "banking77_id2label.json"
    id2label = {}
    if label_map_path.exists():
        raw_map = json.loads(label_map_path.read_text(encoding="utf-8"))
        id2label = {int(k): v for k, v in raw_map.items()}

    # 3. Load past tickets from BANKING77 train set (1000 diverse samples for fast duplicate search)
    raw_data_dir = PROJECT_ROOT / "data" / "raw" / "banking77"
    past_ticket_docs = []
    if raw_data_dir.exists():
        ds = load_from_disk(str(raw_data_dir))
        train_ds = ds["train"]
        print(f"[BuildKB] Loading past tickets from BANKING77 train set ({len(train_ds)} total rows)...")
        # Subsample up to 1500 tickets across all intents for fast runtime indexing
        step = max(1, len(train_ds) // 1500)
        for i in range(0, len(train_ds), step):
            item = train_ds[i]
            label_id = item["label"]
            intent_name = id2label.get(label_id, f"intent_{label_id}")
            past_ticket_docs.append({
                "id": f"PT-{i:05d}",
                "type": "PAST_TICKET",
                "intent": intent_name,
                "title": f"Past Support Inquiry ({intent_name})",
                "text": item["text"].strip(),
            })
    print(f"[BuildKB] Prepared {len(past_ticket_docs)} past ticket reference records.")

    all_docs = faq_docs + past_ticket_docs
    print(f"[BuildKB] Total corpus size: {len(all_docs)} documents.")

    # 4. Build FAISS index
    embedder = Embedder()
    store = VectorStore(embedder=embedder)
    print("[BuildKB] Encoding documents and building FAISS flat index...")
    store.build(all_docs)
    
    # 5. Save index and metadata
    target_dir = PROJECT_ROOT / "models" / "rag_index"
    store.save(target_dir)
    print(f"[BuildKB] Saved FAISS index and metadata successfully to {target_dir}")
    print("[BuildKB] Index verification: total vectors =", store.index.ntotal if store.index else 0)

if __name__ == "__main__":
    main()

