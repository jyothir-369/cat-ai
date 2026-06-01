from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import openai

logger = logging.getLogger(__name__)

DEFAULT_MODEL = os.getenv("DEFAULT_EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "100"))
EMBEDDING_DIMENSIONS = {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
}


class EmbedderError(Exception):
    pass


class Embedder:
    """
    Embedding abstraction that supports batching and a simple fallback
    strategy. Primary: OpenAI. Fallback: local sentence-transformers.
    """

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        openai_client: Optional[openai.AsyncOpenAI] = None,
        fallback_enabled: bool = True,
    ):
        self.model = model
        self._client = openai_client or openai.AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        self.fallback_enabled = fallback_enabled
        self._fallback_model = None  # lazy-loaded

    @property
    def dimension(self) -> int:
        return EMBEDDING_DIMENSIONS.get(self.model, 1536)

    # ── Core embed ───────────────────────────────────────────────────

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts, batching as needed."""
        if not texts:
            return []

        # Normalise: replace empty strings so the API doesn't reject them
        safe_texts = [t if t.strip() else " " for t in texts]

        batches = _chunk_list(safe_texts, EMBEDDING_BATCH_SIZE)
        all_embeddings: list[list[float]] = []

        for batch in batches:
            embeddings = await self._embed_batch(batch)
            all_embeddings.extend(embeddings)

        return all_embeddings

    async def embed_single(self, text: str) -> list[float]:
        results = await self.embed([text])
        return results[0]

    # ── Batch implementation ─────────────────────────────────────────

    async def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        try:
            return await self._embed_openai(texts)
        except Exception as exc:
            logger.warning("OpenAI embedding failed: %s", exc)
            if self.fallback_enabled:
                return await self._embed_fallback(texts)
            raise EmbedderError(f"Embedding failed: {exc}") from exc

    async def _embed_openai(self, texts: list[str]) -> list[list[float]]:
        response = await self._client.embeddings.create(
            model=self.model,
            input=texts,
        )
        # Sort by index to maintain order
        sorted_data = sorted(response.data, key=lambda d: d.index)
        return [item.embedding for item in sorted_data]

    async def _embed_fallback(self, texts: list[str]) -> list[list[float]]:
        """
        Local sentence-transformers fallback.
        Loaded lazily to avoid import cost when not needed.
        """
        try:
            if self._fallback_model is None:
                from sentence_transformers import SentenceTransformer

                logger.info("Loading local fallback embedding model...")
                self._fallback_model = SentenceTransformer(
                    "all-MiniLM-L6-v2"
                )

            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(
                None,
                lambda: self._fallback_model.encode(
                    texts, convert_to_numpy=True
                ).tolist(),
            )
            return embeddings
        except Exception as exc:
            raise EmbedderError(
                f"Fallback embedding also failed: {exc}"
            ) from exc

    # ── Similarity ───────────────────────────────────────────────────

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)


def _chunk_list(lst: list, size: int) -> list[list]:
    return [lst[i : i + size] for i in range(0, len(lst), size)]