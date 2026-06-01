from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncIterator, Optional

from pydantic import BaseModel


class ProviderStatus(str, Enum):
    healthy = "healthy"
    degraded = "degraded"
    unavailable = "unavailable"


@dataclass
class ProviderHealth:
    provider: str
    status: ProviderStatus
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    checked_at: float = field(default_factory=time.time)


class MessageRole(str, Enum):
    system = "system"
    user = "user"
    assistant = "assistant"
    tool = "tool"


# === MAIN CLASSES USED ACROSS THE PROJECT ===

class ProviderMessage(BaseModel):
    """Internal message format used by providers."""
    role: MessageRole
    content: str | None = None
    tool_call_id: Optional[str] = None
    name: Optional[str] = None


class ChatMessage(BaseModel):
    """Standardized chat message (OpenAI-compatible) - Added for orchestrator compatibility."""
    role: str  # "system", "user", "assistant", "tool"
    content: str | None = None
    name: Optional[str] = None
    tool_calls: list[dict[str, Any]] | None = None
    tool_call_id: Optional[str] = None


class ToolParameterSchema(BaseModel):
    type: str
    properties: dict[str, Any] = {}
    required: list[str] = []


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: ToolParameterSchema


class ToolCall(BaseModel):
    id: str
    name: str
    arguments: dict[str, Any]


class ChatRequest(BaseModel):
    messages: list[ProviderMessage]
    model: str
    max_tokens: int = 1024
    temperature: float = 0.7
    tools: list[ToolDefinition] = []
    tool_choice: Optional[str] = None
    stream: bool = False
    user_id: Optional[str] = None
    org_id: Optional[str] = None


class TokenChunk(BaseModel):
    text: str
    finish_reason: Optional[str] = None
    tool_calls: list[ToolCall] = []
    model: Optional[str] = None


class ChatResponse(BaseModel):
    content: str
    model: str
    tokens_in: int
    tokens_out: int
    tool_calls: list[ToolCall] = []
    finish_reason: Optional[str] = None
    latency_ms: Optional[float] = None


class EmbeddingResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    tokens_used: int


class ToolCallResponse(BaseModel):
    content: str
    model: str
    tokens_in: int
    tokens_out: int
    tool_calls: list[ToolCall]
    finish_reason: str = "tool_calls"


class ProviderError(Exception):
    def __init__(
        self,
        message: str,
        provider: str,
        status_code: Optional[int] = None,
        retryable: bool = False,
    ):
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code
        self.retryable = retryable


class BaseProvider(ABC):
    """Abstract base class for all AI model providers."""

    name: str = "base"

    @abstractmethod
    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """Perform a non-streaming chat completion."""
        ...

    @abstractmethod
    async def stream_completion(
        self, request: ChatRequest
    ) -> AsyncIterator[TokenChunk]:
        """Stream chat completion tokens."""
        ...

    @abstractmethod
    async def embed(
        self, texts: list[str], model: str
    ) -> EmbeddingResponse:
        """Generate embeddings for a list of texts."""
        ...

    @abstractmethod
    async def tool_call(
        self, request: ChatRequest, tools: list[ToolDefinition]
    ) -> ToolCallResponse:
        """Perform a chat completion with tool calling enabled."""
        ...

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        """Check provider health and return status."""
        ...

    @abstractmethod
    def token_count(
        self, messages: list[ProviderMessage], model: str
    ) -> int:
        """Estimate token count for a list of messages."""
        ...

    def _build_provider_error(
        self,
        exc: Exception,
        status_code: Optional[int] = None,
        retryable: bool = False,
    ) -> ProviderError:
        return ProviderError(
            message=str(exc),
            provider=self.name,
            status_code=status_code,
            retryable=retryable,
        )


# Optional: Add alias for backward compatibility
ChatMessage = ProviderMessage  # This helps if orchestrator expects ChatMessage