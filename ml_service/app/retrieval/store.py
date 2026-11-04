import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import faiss
import numpy as np
from .embedder import Embedder

INDEX_DIR = Path(__file__).resolve().parents[3] / "models" / "rag_index"

class VectorStore:
    def __init__(self, embedder: Optional[Embedder] = None):
        self.embedder = embedder or Embedder()
        self.index: Optional[faiss.IndexFlatIP] = None
        self.meta: List[Dict[str, Any]] = []

    def build(self, docs: List[Dict[str, Any]]):
        """Build FAISS index from documents."""
        if not docs:
            self.index = None
            self.meta = []
            return
        texts = [
            f"{d['title']}. {d['text']}" if d.get("title") else d["text"]
            for d in docs
        ]
        vecs = self.embedder.encode(texts)
        dim = vecs.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(vecs)
        self.meta = list(docs)

    def save(self, index_dir: Optional[Path] = None):
        target_dir = index_dir or INDEX_DIR
        target_dir.mkdir(parents=True, exist_ok=True)
        if self.index is not None:
            faiss.write_index(self.index, str(target_dir / "index.faiss"))
        (target_dir / "meta.json").write_text(
            json.dumps(self.meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def load(self, index_dir: Optional[Path] = None):
        target_dir = index_dir or INDEX_DIR
        index_file = target_dir / "index.faiss"
        meta_file = target_dir / "meta.json"
        if not index_file.exists() or not meta_file.exists():
            return False
        self.index = faiss.read_index(str(index_file))
        self.meta = json.loads(meta_file.read_text(encoding="utf-8"))
        return True

    def search(
        self,
        query: str,
        k: int = 3,
        doc_types: Optional[List[str]] = None,
        min_score: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """Search top-k matching documents using cosine similarity (IndexFlatIP with normalized vectors)."""
        if self.index is None or self.index.ntotal == 0 or not query.strip():
            return []

        q = self.embedder.encode([query])
        fetch_k = min(self.index.ntotal, max(k * 50, 300) if doc_types else k)
        scores, ids = self.index.search(q, fetch_k)

        out = []
        for s, i in zip(scores[0], ids[0]):
            if i < 0 or s < min_score:
                continue
            if i >= len(self.meta):
                continue
            d = self.meta[i]
            if doc_types and d.get("type") not in doc_types:
                continue
            out.append({**d, "score": round(float(s), 4)})
            if len(out) == k:
                break
        return out

    def add_doc(self, doc: Dict[str, Any]):
        """Dynamically add a single document (e.g. LIVE_TICKET or APPROVED_REPLY)."""
        text = f"{doc['title']}. {doc['text']}" if doc.get("title") else doc["text"]
        vec = self.embedder.encode([text])
        if self.index is None:
            self.index = faiss.IndexFlatIP(vec.shape[1])
        self.index.add(vec)
        self.meta.append(doc)
