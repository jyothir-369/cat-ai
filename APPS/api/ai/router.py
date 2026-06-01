from core.config import settings
from core.exceptions import AllProvidersFailedError
from ai.circuit_breaker import get_breaker
from ai.providers.base import BaseProvider

# Provider imports
from ai.providers.openai import OpenAIProvider
from ai.providers.anthropic import AnthropicProvider
from ai.providers.groq import GroqProvider
from ai.providers.gemini import GeminiProvider
from ai.providers.vllm import VLLMProvider

# Singleton provider instances
_providers: dict[str, BaseProvider] = {
    "openai":    OpenAIProvider(),
    "anthropic": AnthropicProvider(),
    "groq":      GroqProvider(),
    "gemini":    GeminiProvider(),      # ← Keep only if fully implemented
    "vllm":      VLLMProvider(),
}

# Failover order (production order)
FAILOVER_ORDER = ["openai", "anthropic", "groq", "gemini"]

# Models that support tool/function calling
TOOL_CAPABLE_MODELS = {
    "gpt-4o", "gpt-4o-mini", "gpt-4-turbo",
    "claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001",
    "gemini-1.5-pro", "gemini-1.5-flash",   # ← Added
}

# Cheap/fast models for background tasks
CHEAP_MODELS = {
    "groq": "llama3-70b-8192",
    "openai": "gpt-4o-mini",
    "gemini": "gemini-1.5-flash",   # ← Good cheap option
}


def get_provider(name: str) -> BaseProvider:
    """Get provider instance by name"""
    if name not in _providers:
        raise ValueError(f"Unknown provider: {name}")
    return _providers[name]


def route(
    requested_model: str | None = None,
    workspace_default: str | None = None,
    needs_tools: bool = False,
    long_context: bool = False,
    cost_optimise: bool = False,
) -> tuple[BaseProvider, str]:
    """
    Intelligent model routing with circuit breaker awareness and fallbacks.
    """
    # 1. Explicit user selection takes precedence
    if requested_model:
        provider_name, model = _resolve_model(requested_model)
        if get_breaker(provider_name).is_available():
            return _providers[provider_name], model

    # 2. Long context → Prefer Gemini 1.5 Pro
    if long_context:
        if get_breaker("gemini").is_available():
            return _providers["gemini"], "gemini-1.5-pro"

    # 3. Tool calling required
    if needs_tools:
        for provider_name in ["openai", "anthropic", "gemini"]:
            if get_breaker(provider_name).is_available():
                if provider_name == "openai":
                    model = "gpt-4o"
                elif provider_name == "anthropic":
                    model = "claude-sonnet-4-6"
                else:  # gemini
                    model = "gemini-1.5-pro"
                return _providers[provider_name], model

    # 4. Cost optimisation → Prefer Groq or Gemini Flash
    if cost_optimise:
        for provider_name in ["groq", "gemini"]:
            if get_breaker(provider_name).is_available():
                model = CHEAP_MODELS.get(provider_name)
                return _providers[provider_name], model

    # 5. Workspace or global default
    default = workspace_default or settings.DEFAULT_PROVIDER
    provider_name, model = _resolve_model(default)
    if get_breaker(provider_name).is_available():
        return _providers[provider_name], model

    # 6. Final failover sweep
    for name in FAILOVER_ORDER:
        if get_breaker(name).is_available():
            model = _default_model_for(name)
            return _providers[name], model

    raise AllProvidersFailedError("All AI providers are unavailable")


def _resolve_model(model_or_provider: str) -> tuple[str, str]:
    """Map model name or provider alias to (provider_name, model_id)"""
    mapping = {
        # OpenAI
        "gpt-4o":                ("openai", "gpt-4o"),
        "gpt-4o-mini":           ("openai", "gpt-4o-mini"),
        "gpt-4-turbo":           ("openai", "gpt-4-turbo"),
        # Anthropic
        "claude-opus-4-6":       ("anthropic", "claude-opus-4-6"),
        "claude-sonnet-4-6":     ("anthropic", "claude-sonnet-4-6"),
        "claude-haiku-4-5-20251001": ("anthropic", "claude-haiku-4-5-20251001"),
        # Groq
        "llama3-70b-8192":       ("groq", "llama3-70b-8192"),
        # Gemini
        "gemini-1.5-pro":        ("gemini", "gemini-1.5-pro"),
        "gemini-1.5-flash":      ("gemini", "gemini-1.5-flash"),
        # Provider aliases
        "openai":    ("openai", "gpt-4o"),
        "anthropic": ("anthropic", "claude-sonnet-4-6"),
        "groq":      ("groq", "llama3-70b-8192"),
        "gemini":    ("gemini", "gemini-1.5-pro"),
        "vllm":      ("vllm", "default"),   # Adjust as needed
    }
    return mapping.get(model_or_provider.lower(), ("openai", model_or_provider))


def _default_model_for(provider: str) -> str:
    """Return sensible default model per provider"""
    defaults = {
        "openai":    "gpt-4o",
        "anthropic": "claude-sonnet-4-6",
        "groq":      "llama3-70b-8192",
        "gemini":    "gemini-1.5-pro",
        "vllm":      "default",
    }
    return defaults.get(provider, "gpt-4o")