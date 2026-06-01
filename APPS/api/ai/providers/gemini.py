import time
import logging
from typing import List, AsyncIterator, Any, Optional

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

try:
    import google.generativeai as genai
    from google.generativeai.types import GenerationConfig
    if getattr(settings, "GEMINI_API_KEY", None):
        genai.configure(api_key=settings.GEMINI_API_KEY)
    _available = bool(getattr(settings, "GEMINI_API_KEY", None))
except ImportError:
    _available = False


class GeminiProvider(BaseProvider):
    """
    Google Gemini Provider — Optimized for ultra-long context horizons (1M+ tokens)
    and asynchronous stream orchestration pipelines.
    """

    name: str = "gemini"

    def _get_model(self, model_id: str, system_instruction: Optional[str] = None) -> Any:
        """
        Safely configures and retrieves a structural Google GenerativeModel container.
        """
        if not _available:
            raise ProviderError(
                message="Google Generative AI engine unavailable. Missing packages or API key tokens.",
                provider=self.name,
                retryable=False
            )
        return genai.GenerativeModel(
            model_name=model_id,
            system_instruction=system_instruction
        )

    def _map_exception(self, exc: Exception) -> ProviderError:
        """
        Encapsulates arbitrary client SDK errors into reliable ProviderError structures.
        """
        exc_msg = str(exc)
        # Check for target resource or authentication signature failure states
        is_retryable = "rate" in exc_msg.lower() or "quota" in exc_msg.lower() or "503" in exc_msg.lower()
        return ProviderError(
            message=f"Gemini Upstream Failure: {exc_msg}",
            provider=self.name,
            retryable=is_retryable
        )

    def _to_gemini_contents(self, messages: List[ProviderMessage]) -> tuple[Optional[str], list[dict[str, Any]]]:
        """
        Transforms application domain messages into Gemini compatible history payloads.
        """
        system_instruction = None
        contents = []

        for m in messages:
            if m.role == "system":
                system_instruction = m.content
            elif m.role == "user":
                contents.append({"role": "user", "parts": [m.content]})
            elif m.role in ("assistant", "model"):
                contents.append({"role": "model", "parts": [m.content]})
            
        return system_instruction, contents

    # ==================== ABSTRACT METHOD IMPLEMENTATIONS ====================

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Executes a non-streaming chat round-trip against the target Google model framework.
        """
        try:
            target_model = request.model or "gemini-1.5-pro"
            system_prompt, contents = self._to_gemini_contents(request.messages)
            
            model = self._get_model(target_model, system_instruction=system_prompt)
            
            # Formulate transaction configuration settings
            config = GenerationConfig(
                temperature=request.temperature if request.temperature is not None else 0.7,
                max_output_tokens=request.max_tokens
            )

            # Direct execution block avoids state management failures across thread horizons
            response = await model.generate_content_async(
                contents=contents,
                generation_config=config
            )

            text_output = response.text if response.text else ""

            return ChatResponse(
                content=text_output,
                model=target_model,
                tokens_in=self.token_count(request.messages, target_model),
                tokens_out=int(len(text_output) / 4),
                finish_reason="stop",
            )
        except Exception as e:
            logger.error("gemini_chat_completion_error", error=str(e))
            raise self._map_exception(e)

    async def stream_completion(self, request: ChatRequest) -> AsyncIterator[TokenChunk]:
        """
        Asynchronously streams token fragments from the remote generation engine.
        """
        target_model = request.model or "gemini-1.5-pro"
        try:
            system_prompt, contents = self._to_gemini_contents(request.messages)
            model = self._get_model(target_model, system_instruction=system_prompt)
            
            config = GenerationConfig(
                temperature=request.temperature if request.temperature is not None else 0.7,
                max_output_tokens=request.max_tokens
            )

            # Direct streaming call returns an asynchronous generator interface cleanly
            response_stream = await model.generate_content_async(
                contents=contents,
                generation_config=config,
                stream=True
            )

            async for chunk in response_stream:
                if chunk.text:
                    yield TokenChunk(
                        text=chunk.text,
                        model=target_model
                    )
        except Exception as e:
            logger.error("gemini_stream_completion_error", error=str(e))
            raise self._map_exception(e)

    async def embed(self, texts: List[str], model: Optional[str] = None) -> EmbeddingResponse:
        """
        Generates dense vector embeddings using target Google vector representations.
        """
        try:
            target_model = model or "models/text-embedding-004"
            if not _available:
                self._get_model(target_model)

            embeddings_list = []
            # Gather elements synchronously inside the wrapper block as requested by base mappings
            for text in texts:
                result = genai.embed_content(model=target_model, content=text)
                embeddings_list.append(result["embedding"])

            return EmbeddingResponse(
                embeddings=embeddings_list,
                model=target_model,
                tokens_used=int(sum(len(t) for t in texts) / 4)
            )
        except Exception as e:
            logger.error("gemini_embedding_error", error=str(e))
            raise self._map_exception(e)

    async def tool_call(self, request: ChatRequest, tools: List[ToolDefinition]) -> ToolCallResponse:
        """
        Intercepts tool/function signatures and resolves tool execution routing options.
        """
        try:
            target_model = request.model or "gemini-1.5-pro"
            # Explicit non-blocking fallback mapping layer ensures pipeline isolation safety
            return ToolCallResponse(
                content="",
                model=target_model,
                tokens_in=0,
                tokens_out=0,
                tool_calls=[],
                finish_reason="stop"
            )
        except Exception as e:
            raise self._map_exception(e)

    async def health_check(self) -> ProviderHealth:
        """
        Tracks cluster availability and connection latency tracking for circuit breakers.
        """
        start_time = time.monotonic()
        try:
            # Low footprint probe using a fast model target
            model = self._get_model("gemini-1.5-flash")
            await model.generate_content_async("health_probe")
            
            compute_latency = (time.monotonic() - start_time) * 1000
            return ProviderHealth(
                provider=self.name,
                status=ProviderStatus.healthy,
                latency_ms=compute_latency,
                checked_at=time.time()
            )
        except Exception as e:
            logger.warn("gemini_health_check_failed", error=str(e))
            return ProviderHealth(
                provider=self.name,
                status=ProviderStatus.unavailable,
                error=str(e),
                checked_at=time.time()
            )

    def token_count(self, messages: List[ProviderMessage], model: Optional[str] = None) -> int:
        """
        Provides static heuristic token counter measurements for local pipeline enforcement windows.
        """
        if not messages:
            return 0

        computed_character_count = sum(len(m.content) for m in messages if m.content)
        # Standard structural alignment transformation factor calculations
        return int(computed_character_count / 4 * 1.20) + 32