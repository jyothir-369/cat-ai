from __future__ import annotations

import logging
import os
import re
import uuid
from dataclasses import dataclass, field
from typing import Optional

import boto3

from packages.rag_pipeline.embedder import Embedder

logger = logging.getLogger(__name__)

S3_BUCKET = os.getenv("S3_FILES_BUCKET", "cat-ai-files-dev")


@dataclass
class IngestedChunk:
    content: str
    chunk_index: int
    token_count: int
    metadata: dict = field(default_factory=dict)


@dataclass
class IngestResult:
    document_id: str
    kb_id: str
    file_id: str
    chunk_count: int
    char_count: int
    status: str = "ready"
    error: Optional[str] = None


class IngestPipeline:
    """
    Full ingestion pipeline:
    S3 download → parse → clean → chunk → embed → store
    """

    def __init__(
        self,
        db_session,
        embedder: Optional[Embedder] = None,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ):
        self.db = db_session
        self.embedder = embedder or Embedder()
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._s3 = boto3.client("s3")

    async def run(
        self,
        file_id: str,
        kb_id: str,
        org_id: str,
        s3_key: str,
        filename: str,
        mime_type: str,
    ) -> IngestResult:
        """Execute the full ingestion pipeline for a single file."""
        document_id = str(uuid.uuid4())

        try:
            # 1. Download from S3
            raw_bytes = await self._download_s3(s3_key)

            # 2. Parse
            text = await self._parse(raw_bytes, filename, mime_type)
            if not text.strip():
                raise ValueError("Parsed document is empty")

            char_count = len(text)

            # 3. Clean
            text = _clean_text(text)

            # 4. Chunk
            chunks = _fixed_chunk(text, self.chunk_size, self.chunk_overlap)
            if not chunks:
                raise ValueError("Document produced no chunks")

            # 5. Embed
            contents = [c.content for c in chunks]
            embeddings = await self.embedder.embed(contents)

            # 6. Store
            await self._store(
                document_id=document_id,
                kb_id=kb_id,
                file_id=file_id,
                org_id=org_id,
                title=filename,
                chunks=chunks,
                embeddings=embeddings,
                char_count=char_count,
            )

            return IngestResult(
                document_id=document_id,
                kb_id=kb_id,
                file_id=file_id,
                chunk_count=len(chunks),
                char_count=char_count,
            )

        except Exception as exc:
            logger.exception(
                "Ingestion failed for file_id=%s kb_id=%s", file_id, kb_id
            )
            return IngestResult(
                document_id=document_id,
                kb_id=kb_id,
                file_id=file_id,
                chunk_count=0,
                char_count=0,
                status="failed",
                error=str(exc),
            )

    # ── Steps ────────────────────────────────────────────────────────

    async def _download_s3(self, s3_key: str) -> bytes:
        import asyncio

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self._s3.get_object(Bucket=S3_BUCKET, Key=s3_key),
        )
        return response["Body"].read()

    async def _parse(
        self, raw_bytes: bytes, filename: str, mime_type: str
    ) -> str:
        ext = filename.rsplit(".", 1)[-1].lower()

        if mime_type == "application/pdf" or ext == "pdf":
            return _parse_pdf(raw_bytes)
        elif mime_type in (
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document",
        ) or ext == "docx":
            return _parse_docx(raw_bytes)
        elif ext in ("csv", "xlsx", "xls"):
            return _parse_tabular(raw_bytes, ext)
        else:
            # Plain text, markdown, etc.
            return raw_bytes.decode("utf-8", errors="replace")

    async def _store(
        self,
        document_id: str,
        kb_id: str,
        file_id: str,
        org_id: str,
        title: str,
        chunks: list[IngestedChunk],
        embeddings: list[list[float]],
        char_count: int,
    ) -> None:
        from sqlalchemy import text as sa_text

        # Insert document record
        await self.db.execute(
            sa_text(
                """
                INSERT INTO documents
                    (id, kb_id, file_id, title, char_count, chunk_count, status)
                VALUES
                    (:id, :kb_id, :file_id, :title, :char_count, :chunk_count, 'ready')
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {
                "id": document_id,
                "kb_id": kb_id,
                "file_id": file_id,
                "title": title,
                "char_count": char_count,
                "chunk_count": len(chunks),
            },
        )

        # Bulk insert chunks
        rows = []
        for chunk, embedding in zip(chunks, embeddings):
            rows.append(
                {
                    "id": str(uuid.uuid4()),
                    "document_id": document_id,
                    "kb_id": kb_id,
                    "content": chunk.content,
                    "embedding": str(embedding),
                    "chunk_index": chunk.chunk_index,
                    "token_count": chunk.token_count,
                    "metadata": "{}",
                }
            )

        for row in rows:
            await self.db.execute(
                sa_text(
                    """
                    INSERT INTO document_chunks
                        (id, document_id, kb_id, content, embedding,
                         chunk_index, token_count, metadata)
                    VALUES
                        (:id, :document_id, :kb_id, :content,
                         :embedding::vector, :chunk_index, :token_count,
                         :metadata::jsonb)
                    """
                ),
                row,
            )

        # Update KB doc count
        await self.db.execute(
            sa_text(
                """
                UPDATE knowledge_bases
                SET doc_count = doc_count + 1
                WHERE id = :kb_id
                """
            ),
            {"kb_id": kb_id},
        )

        await self.db.commit()


# ── Parsers ───────────────────────────────────────────────────────────

def _parse_pdf(data: bytes) -> str:
    try:
        from pdfminer.high_level import extract_text_to_fp
        from pdfminer.layout import LAParams
        import io

        output = io.StringIO()
        extract_text_to_fp(
            io.BytesIO(data), output, laparams=LAParams()
        )
        text = output.getvalue()
        if text.strip():
            return text
    except Exception as exc:
        logger.warning("pdfminer failed, trying pymupdf: %s", exc)

    try:
        import fitz  # pymupdf

        doc = fitz.open(stream=data, filetype="pdf")
        pages = [page.get_text() for page in doc]
        return "\n\n".join(pages)
    except Exception as exc:
        raise ValueError(f"PDF parsing failed: {exc}") from exc


def _parse_docx(data: bytes) -> str:
    import io
    from docx import Document

    doc = Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def _parse_tabular(data: bytes, ext: str) -> str:
    import io
    import pandas as pd

    if ext == "csv":
        df = pd.read_csv(io.BytesIO(data))
    else:
        df = pd.read_excel(io.BytesIO(data))

    return df.to_string(index=False)


# ── Cleaners ──────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    # Normalise whitespace
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    # Strip common header/footer patterns
    text = re.sub(r"^\s*Page \d+ of \d+\s*$", "", text, flags=re.MULTILINE)
    return text.strip()


# ── Chunker ───────────────────────────────────────────────────────────

def _fixed_chunk(
    text: str, size: int = 512, overlap: int = 50
) -> list[IngestedChunk]:
    """
    Fixed-size token-aware chunking with overlap.
    Uses whitespace-word tokenisation as a fast approximation.
    """
    words = text.split()
    chunks: list[IngestedChunk] = []
    step = max(1, size - overlap)

    for i, start in enumerate(range(0, len(words), step)):
        window = words[start : start + size]
        if not window:
            break
        content = " ".join(window)
        chunks.append(
            IngestedChunk(
                content=content,
                chunk_index=i,
                token_count=len(window),
            )
        )

    return chunks