from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional

from packages.rag_pipeline.embedder import Embedder

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.3


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    kb_id: str
    content: str
    score: float
    source: str
    chunk_index: int
    metadata: dict


class Retriever:
    """
    Vector + optional hybrid retrieval with reranking hooks.
    Uses pgvector cosine similarity as the primary search method.
    """

    def __init__(
        self,
        db_session,
        embedder: Optional[Embedder] = None,
    ):
        self.db = db_session
        self.embedder = embedder or Embedder()

    async def retrieve(
        self,
        query: str,
        knowledge_base_ids: list[str],
        org_id: str,
        top_k: int = 5,
        min_score: float = SIMILARITY_THRESHOLD,
        hybrid: bool = False,
    ) -> list[dict[str, Any]]:
        """
        Retrieve relevant chunks for a query across one or more knowledge bases.
        Optionally enables hybrid retrieval (vector + BM25).
        """
        if not knowledge_base_ids or not query.strip():
            return []

        # Embed query
        query_embedding = await self.embedder.embed_single(query)

        if hybrid:
            results = await self._hybrid_retrieve(
                query=query,
                query_embedding=query_embedding,
                kb_ids=knowledge_base_ids,
                org_id=org_id,
                top_k=top_k * 2,  # over-fetch for reranking
            )
        else:
            results = await self._vector_retrieve(
                query_embedding=query_embedding,
                kb_ids=knowledge_base_ids,
                org_id=org_id,
                top_k=top_k * 2,
            )

        # Filter by minimum score
        results = [r for r in results if r.score >= min_score]

        # Rerank (no-op by default; plug in Cohere or cross-encoder here)
        results = await self._rerank(query, results, top_k)

        return [_chunk_to_dict(c) for c in results]

    # ── Vector retrieval ─────────────────────────────────────────────

    async def _vector_retrieve(
        self,
        query_embedding: list[float],
        kb_ids: list[str],
        org_id: str,
        top_k: int,
    ) -> list[RetrievedChunk]:
        from sqlalchemy import text as sa_text

        embedding_str = f"[{','.join(str(v) for v in query_embedding)}]"
        kb_ids_str = ",".join(f"'{k}'" for k in kb_ids)

        rows = await self.db.execute(
            sa_text(
                f"""
                SELECT
                    dc.id,
                    dc.document_id,
                    dc.kb_id,
                    dc.content,
                    dc.chunk_index,
                    dc.metadata,
                    d.title AS source,
                    1 - (dc.embedding <=> :embedding::vector) AS score
                FROM document_chunks dc
                JOIN documents d ON d.id = dc.document_id
                JOIN knowledge_bases kb ON kb.id = dc.kb_id
                WHERE dc.kb_id IN ({kb_ids_str})
                  AND kb.org_id = :org_id
                ORDER BY dc.embedding <=> :embedding::vector
                LIMIT :top_k
                """
            ),
            {"embedding": embedding_str, "org_id": org_id, "top_k": top_k},
        )

        return [
            RetrievedChunk(
                chunk_id=str(row.id),
                document_id=str(row.document_id),
                kb_id=str(row.kb_id),
                content=row.content,
                score=float(row.score),
                source=row.source,
                chunk_index=row.chunk_index,
                metadata=row.metadata or {},
            )
            for row in rows.fetchall()
        ]

    # ── Hybrid retrieval ─────────────────────────────────────────────

    async def _hybrid_retrieve(
        self,
        query: str,
        query_embedding: list[float],
        kb_ids: list[str],
        org_id: str,
        top_k: int,
    ) -> list[RetrievedChunk]:
        """
        Combine vector similarity and BM25 (PostgreSQL full-text search).
        Results are merged with RRF (Reciprocal Rank Fusion).
        """
        vector_results = await self._vector_retrieve(
            query_embedding=query_embedding,
            kb_ids=kb_ids,
            org_id=org_id,
            top_k=top_k,
        )

        bm25_results = await self._bm25_retrieve(
            query=query,
            kb_ids=kb_ids,
            org_id=org_id,
            top_k=top_k,
        )

        # RRF merge
        return _reciprocal_rank_fusion(vector_results, bm25_results, top_k)

    async def _bm25_retrieve(
        self,
        query: str,
        kb_ids: list[str],
        org_id: str,
        top_k: int,
    ) -> list[RetrievedChunk]:
        from sqlalchemy import text as sa_text

        kb_ids_str = ",".join(f"'{k}'" for k in kb_ids)
        tsquery = " & ".join(query.split())

        rows = await self.db.execute(
            sa_text(
                f"""
                SELECT
                    dc.id,
                    dc.document_id,
                    dc.kb_id,
                    dc.content,
                    dc.chunk_index,
                    dc.metadata,
                    d.title AS source,
                    ts_rank(
                        to_tsvector('english', dc.content),
                        to_tsquery('english', :tsquery)
                    ) AS score
                FROM document_chunks dc
                JOIN documents d ON d.id = dc.document_id
                JOIN knowledge_bases kb ON kb.id = dc.kb_id
                WHERE dc.kb_id IN ({kb_ids_str})
                  AND kb.org_id = :org_id
                  AND to_tsvector('english', dc.content)
                      @@ to_tsquery('english', :tsquery)
                ORDER BY score DESC
                LIMIT :top_k
                """
            ),
            {"tsquery": tsquery, "org_id": org_id, "top_k": top_k},
        )

        return [
            RetrievedChunk(
                chunk_id=str(row.id),
                document_id=str(row.document_id),
                kb_id=str(row.kb_id),
                content=row.content,
                score=float(row.score),
                source=row.source,
                chunk_index=row.chunk_index,
                metadata=row.metadata or {},
            )
            for row in rows.fetchall()
        ]

    # ── Reranking hook ───────────────────────────────────────────────

    async def _rerank(
        self,
        query: str,
        chunks: list[RetrievedChunk],
        top_k: int,
    ) -> list[RetrievedChunk]:
        """
        No-op by default. To enable Cohere reranking:
        1. pip install cohere
        2. Call co.rerank(query, [c.content for c in chunks]) here
        3. Re-sort chunks by rerank score
        """
        # Sort by score descending and truncate
        chunks.sort(key=lambda c: c.score, reverse=True)
        return chunks[:top_k]


# ── Helpers ───────────────────────────────────────────────────────────

def _chunk_to_dict(chunk: RetrievedChunk) -> dict[str, Any]:
    return {
        "chunk_id": chunk.chunk_id,
        "document_id": chunk.document_id,
        "kb_id": chunk.kb_id,
        "content": chunk.content,
        "score": chunk.score,
        "source": chunk.source,
        "chunk_index": chunk.chunk_index,
        "metadata": chunk.metadata,
    }


def _reciprocal_rank_fusion(
    list_a: list[RetrievedChunk],
    list_b: list[RetrievedChunk],
    top_k: int,
    k: int = 60,
) -> list[RetrievedChunk]:
    """Merge two ranked lists using Reciprocal Rank Fusion."""
    scores: dict[str, float] = {}
    chunks_by_id: dict[str, RetrievedChunk] = {}

    for rank, chunk in enumerate(list_a):
        scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0) + 1 / (k + rank + 1)
        chunks_by_id[chunk.chunk_id] = chunk

    for rank, chunk in enumerate(list_b):
        scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0) + 1 / (k + rank + 1)
        chunks_by_id[chunk.chunk_id] = chunk

    sorted_ids = sorted(scores, key=lambda cid: scores[cid], reverse=True)
    results = []
    for cid in sorted_ids[:top_k]:
        chunk = chunks_by_id[cid]
        chunk.score = scores[cid]
        results.append(chunk)

    return results