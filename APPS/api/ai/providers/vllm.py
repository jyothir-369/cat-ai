import time
import json
import logging
from typing import AsyncIterator, List, Any, Optional

import httpx

from core.config import settings
from ai.providers.base import (
    BaseProvider,
    ChatRequest,
    ChatResponse,
    TokenChunk,
    EmbeddingResponse,
    ToolCallResponse,
    ToolDefinition,
    ProviderHealth,
    ProviderStatus,
    ProviderError,
    ProviderMessage,
)

logger = logging.getLogger("structlog")

VLLM_BASE_URL = "http://localhost:8001/v1"


class VLLMProvider(BaseProvider):
    """
    Self-hosted vLLM Provider — OpenAI-compatible REST API.
    Ideal for cost-optimized, private inference on GPU nodes (e.g. g4dn.xlarge).
    """

    name: str = "vllm"

    def __init__(self, base_url: Optional[str] = None):
        """
        Initializes the vLLM communication wrapper layer using an isolated connection pool.
        """
        self.base_url = base_url or getattr(settings, "VLLM_BASE_URL", VLLM_BASE_URL)
        # Configure enterprise async HTTP transport layer with strict limits
        self._http = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
        )

    def _map_exception(self, exc: Exception, retryable: bool = True) -> ProviderError:
        """
        Maps underlying httpx network layer errors into reliable ProviderError primitives.
        """
        error_msg = str(exc)
        if isinstance(exc, httpx.HTTPStatusError):
            if exc.response.status_code in (401, 403):
                return ProviderError(message=f"vLLM Auth/Security Failure: {error_msg}", provider=self.name, retryable=False)
            if exc.response.status_code == 422:
                return ProviderError(message=f"vLLM Validation Exception Payload: {error_msg}", provider=self.name, retryable=False)
        
        return ProviderError(
            message=f"vLLM Runtime Exception: {error_msg}",
            provider=self.name,
            retryable=retryable
        )

    def _convert_messages(self, messages: List[ProviderMessage]) -> List[dict[str, Any]]:
        """
        Converts internal multi-tenant platform messages to standard OpenAI structural dictionaries.
        """
        return [
            {
                "role": m.role.value if hasattr(m.role, "value") else str(m.role), 
                "content": m.content
            }
            for m in messages
        ]

    # ==================== ABSTRACT METHOD IMPLEMENTATIONS ====================

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Executes an atomic non-streaming chat completion request against the vLLM engine.
        """
        try:
            messages = self._convert_messages(request.messages)

            resp = await self._http.post(
                "/chat/completions",
                json={
                    "model": request.model,
                    "messages": messages,
                    "max_tokens": request.max_tokens,
                    "temperature": request.temperature if request.temperature is not None else 0.7,
                    "stream": False,
                }
            )
            resp.raise_for_status()
            data = resp.json()

            choice = data["choices"][0]
            usage = data.get("usage", {})

            return ChatResponse(
                content=choice["message"]["content"],
                model=data.get("model", request.model),
                tokens_in=usage.get("prompt_tokens", 0),
                tokens_out=usage.get("completion_tokens", 0),
                finish_reason=choice.get("finish_reason", "stop"),
            )
        except Exception as e:
            logger.error("vllm_chat_completion_error", error=str(e))
            raise self._map_exception(e, retryable=True)

    async def stream_completion(self, request: ChatRequest) -> AsyncIterator[TokenChunk]:
        """
        Establishes an HTTP SSE streaming connection to stream incremental tokens back to user routers.
        """
        try:
            messages = self._convert_messages(request.messages)

            async with self._http.stream(
                "POST",
                "/chat/completions",
                json={
                    "model": request.model,
                    "messages": messages,
                    "max_tokens": request.max_tokens,
                    "temperature": request.temperature if request.temperature is not None else 0.7,
                    "stream": True,
                }
            ) as response:
                response.raise_for_status()
                async_lines: AsyncIterator[str] = response.aiter_lines()
                
                async for line in async_lines:
                    line = line.strip()
                    if not line or line == "data: [DONE]":
                        continue
                    
                    if line.startswith("data: "):
                        try:
                            payload = json.loads(line[6:])
                            delta = payload["choices"][0].get("delta", {})
                            content_chunk = delta.get("content")
                            if content_chunk:
                                yield TokenChunk(
                                    text=content_chunk,
                                    model=request.model
                                )
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
        except Exception as e:
            logger.error("vllm_stream_completion_error", error=str(e))
            raise self._map_exception(e, retryable=True)

    async def embed(self, texts: List[str], model: Optional[str] = None) -> EmbeddingResponse:
        """
        Generates dense continuous vector embeddings for retrieval applications via vLLM.
        """
        try:
            target_model = model or "default"
            resp = await self._http.post(
                "/embeddings",
                json={"input": texts, "model": target_model}
            )
            resp.raise_for_status()
            data = resp.json()

            embeddings = [item["embedding"] for item in data.get("data", [])]
            total_tokens = data.get("usage", {}).get("prompt_tokens", 0)

            return EmbeddingResponse(
                embeddings=embeddings,
                model=target_model,
                tokens_used=total_tokens
            )
        except Exception as e:
            logger.error("vllm_embedding_error", error=str(e))
            raise self._map_exception(e, retryable=False)

    async def tool_call(self, request: ChatRequest, tools: List[ToolDefinition]) -> ToolCallResponse:
        """
        Executes OpenAI-spec function routing maps if supported by the under-the-hood vLLM model configuration.
        """
        try:
            messages = self._convert_messages(request.messages)
            
            # Serialize structured schemas matching OpenAI parameters
            serialized_tools = []
            for tool in tools:
                if hasattr(tool, "model_dump"):
                    serialized_tools.append(tool.model_dump())
                else:
                    serialized_tools.append(dict(tool))

            resp = await self._http.post(
                "/chat/completions",
                json={
                    "model": request.model,
                    "messages": messages,
                    "tools": serialized_tools if tools else None,
                    "tool_choice": request.tool_choice or "auto" if tools else None,
                    "max_tokens": request.max_tokens,
                    "temperature": request.temperature if request.temperature is not None else 0.7,
                    "stream": False,
                }
            )
            resp.raise_for_status()
            data = resp.json()

            choice = data["choices"][0]
            usage = data.get("usage", {})
            message_payload = choice.get("message", {})

            # Clean internal dictionary mapping prevents references to non-existent types
            extracted_tool_calls = []
            raw_tool_calls = message_payload.get("tool_calls")
            if raw_tool_calls:
                for tc in raw_tool_calls:
                    try:
                        extracted_tool_calls.append({
                            "id": tc.get("id", ""),
                            "type": "function",
                            "function": {
                                "name": tc["function"]["name"],
                                "arguments": json.loads(tc["function"]["arguments"]) if isinstance(tc["function"]["arguments"], str) else tc["function"]["arguments"]
                            }
                        })
                    except (json.JSONDecodeError, KeyError):
                        continue

            return ToolCallResponse(
                content=message_payload.get("content") or "",
                model=request.model,
                tokens_in=usage.get("prompt_tokens", 0),
                tokens_out=usage.get("completion_tokens", 0),
                tool_calls=extracted_tool_calls,
                finish_reason="tool_calls" if extracted_tool_calls else choice.get("finish_reason", "stop")
            )
        except Exception as e:
            logger.error("vllm_tool_call_error", error=str(e))
            raise self._map_exception(e, retryable=True)

    async def health_check(self) -> ProviderHealth:
        """
        Performs engine probe lookups to track circuit status records.
        """
        start_time = time.monotonic()
        try:
            # Native OpenAI-compatible routes exposed by standard vLLM instances
            resp = await self._http.get("/models")
            resp.raise_for_status()
            compute_latency = (time.monotonic() - start_time) * 1000

            return ProviderHealth(
                provider=self.name,
                status=ProviderStatus.healthy,
                latency_ms=compute_latency,
                checked_at=time.time()
            )
        except Exception as e:
            logger.warn("vllm_cluster_probe_failed", error=str(e))
            return ProviderHealth(
                provider=self.name,
                status=ProviderStatus.unavailable,
                error=str(e),
                checked_at=time.time()
            )

    def token_count(self, messages: List[ProviderMessage], model: Optional[str] = None) -> int:
        """
        Heuristic character metrics computation tracking sliding-window limits safely.
        """
        if not messages:
            return 0

        computed_character_count = sum(len(m.content) for m in messages if m.content)
        # Custom safety buffer calculation scalar matching platform primitives
        return int(computed_character_count / 4 * 1.25) + 40

    async def shutdown(self) -> None:
        """
        Gracefully tears down persistent client HTTP connections during application lifecycle context exits.
        """
        await self._http.aclose()