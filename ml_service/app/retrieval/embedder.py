import os
from typing import List, Union
import numpy as np
from sentence_transformers import SentenceTransformer

class Embedder:
    def __init__(self, model_id: str = None):
        self.model_id = model_id or os.getenv("EMBED_MODEL_ID", "sentence-transformers/all-MiniLM-L6-v2")
        self._model = None

    @property
    def model(self) -> SentenceTransformer:
        if self._model is None:
            self._model = SentenceTransformer(self.model_id)
        return self._model

    def encode(self, texts: Union[str, List[str]]) -> np.ndarray:
        if isinstance(texts, str):
            texts = [texts]
        if not texts:
            return np.empty((0, 384), dtype=np.float32)
        # normalize=True => inner product == cosine similarity
        vecs = self.model.encode(
            texts,
            normalize_embeddings=True,
            convert_to_numpy=True,
            batch_size=64,
            show_progress_bar=False,
        )
        return vecs.astype("float32")

