from functools import lru_cache
from typing import List, Any, Union
import re

from pydantic import Field, field_validator, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Production-grade application configuration engine.
    Utilizes Pydantic v2 syntax and modern pydantic-settings to construct
    fully-validated, environment-driven properties with case-insensitive support.
    Provides complete dual-style access compatibility for legacy modules.
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,  # Allows case-insensitive matching across environment variables
        populate_by_name=True   # Enables fallback resolution by field name or explicit alias string
    )

    # ── App & Core Environment ──────────────────────────────────
    environment: str = Field(
        default="development",
        alias="APP_ENV",
        description="Deployment target state: development, staging, or production."
    )
    
    version: str = Field(
        default="0.1.0",
        alias="APP_VERSION"
    )
    
    app_name: str = Field(
        default="CAT AI API",
        alias="APP_NAME"
    )
    
    debug: bool = Field(
        default=False,
        alias="DEBUG",
        description="Boolean master toggle enabling debug mode, trace metrics, and swagger endpoints."
    )

    # ── Security & Authentication ───────────────────────────────
    jwt_secret: str = Field(
        default="change-me-in-production-use-long-random-string",
        alias="JWT_SECRET"
    )
    
    jwt_algorithm: str = Field(
        default="HS256",
        alias="JWT_ALGORITHM"
    )
    
    access_token_expire_minutes: int = Field(
        default=15,
        alias="JWT_ACCESS_EXPIRE_MINUTES"
    )
    
    refresh_token_expire_days: int = Field(
        default=30,
        alias="JWT_REFRESH_EXPIRE_DAYS"
    )

    # ── Database Layer ──────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/catai",
        alias="DATABASE_URL"
    )

    # ── Redis Storage Layer ─────────────────────────────────────
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        alias="REDIS_URL"
    )

    # ── AWS S3 Object Storage ───────────────────────────────────
    s3_bucket_files: str = Field(
        default="cat-ai-files",
        alias="S3_BUCKET_FILES"
    )
    
    s3_bucket_assets: str = Field(
        default="cat-ai-assets",
        alias="S3_BUCKET_ASSETS"
    )
    
    aws_region: str = Field(
        default="us-east-1",
        alias="AWS_REGION"
    )
    
    aws_access_key_id: str = Field(
        default="",
        alias="AWS_ACCESS_KEY_ID"
    )
    
    aws_secret_access_key: str = Field(
        default="",
        alias="AWS_SECRET_ACCESS_KEY"
    )

    # ── AI Provider Interface Keys ──────────────────────────────
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")

    default_model: str = Field(default="gpt-4o", alias="DEFAULT_MODEL")
    default_provider: str = Field(default="openai", alias="DEFAULT_PROVIDER")

    # ── Stripe Payment Infrastructure ───────────────────────────
    stripe_secret_key: str = Field(default="", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(default="", alias="STRIPE_WEBHOOK_SECRET")
    stripe_team_price_id: str = Field(default="price_team_placeholder", alias="STRIPE_TEAM_PRICE_ID")
    stripe_pro_price_id: str = Field(default="price_pro_placeholder", alias="STRIPE_PRO_PRICE_ID")

    # ── CORS Configuration ──────────────────────────────────────
    frontend_url: str = Field(
        default="http://localhost:3000",
        alias="FRONTEND_URL"
    )
    
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000"],
        alias="ALLOWED_ORIGINS"
    )

    # ── Rate Limiting Engine ────────────────────────────────────
    rate_limit_free: int = Field(default=20, alias="RATE_LIMIT_FREE")
    rate_limit_pro: int = Field(default=100, alias="RATE_LIMIT_PRO")
    rate_limit_team: int = Field(default=500, alias="RATE_LIMIT_TEAM")


    # ── Dedicated Backward-Compatibility Section ───────────────────
    
    # Core App & Environments
    @property
    def APP_ENV(self) -> str: return self.environment
    @APP_ENV.setter
    def APP_ENV(self, value: str) -> None: self.environment = value

    @property
    def APP_VERSION(self) -> str: return self.version
    @APP_VERSION.setter
    def APP_VERSION(self, value: str) -> None: self.version = value

    @property
    def APP_NAME(self) -> str: return self.app_name
    @APP_NAME.setter
    def APP_NAME(self, value: str) -> None: self.app_name = value

    @property
    def DEBUG(self) -> bool: return self.debug
    @DEBUG.setter
    def DEBUG(self, value: bool) -> None: self.debug = value

    # Security & JWT Tokens
    @property
    def JWT_SECRET(self) -> str: return self.jwt_secret
    @JWT_SECRET.setter
    def JWT_SECRET(self, value: str) -> None: self.jwt_secret = value

    @property
    def JWT_ALGORITHM(self) -> str: return self.jwt_algorithm
    @JWT_ALGORITHM.setter
    def JWT_ALGORITHM(self, value: str) -> None: self.jwt_algorithm = value

    @property
    def JWT_ACCESS_EXPIRE_MINUTES(self) -> int: return self.access_token_expire_minutes
    @JWT_ACCESS_EXPIRE_MINUTES.setter
    def JWT_ACCESS_EXPIRE_MINUTES(self, value: int) -> None: self.access_token_expire_minutes = value

    @property
    def JWT_REFRESH_EXPIRE_DAYS(self) -> int: return self.refresh_token_expire_days
    @JWT_REFRESH_EXPIRE_DAYS.setter
    def JWT_REFRESH_EXPIRE_DAYS(self, value: int) -> None: self.refresh_token_expire_days = value

    # Database Infrastructure Layer
    @property
    def DATABASE_URL(self) -> str: return self.database_url
    @DATABASE_URL.setter
    def DATABASE_URL(self, value: str) -> None: self.database_url = value

    # Redis Cache Architecture Layer
    @property
    def REDIS_URL(self) -> str: return self.redis_url
    @REDIS_URL.setter
    def REDIS_URL(self, value: str) -> None: self.redis_url = value

    # AWS Cloud S3 Storage Layer
    @property
    def S3_BUCKET_FILES(self) -> str: return self.s3_bucket_files
    @S3_BUCKET_FILES.setter
    def S3_BUCKET_FILES(self, value: str) -> None: self.s3_bucket_files = value

    @property
    def S3_BUCKET_ASSETS(self) -> str: return self.s3_bucket_assets
    @S3_BUCKET_ASSETS.setter
    def S3_BUCKET_ASSETS(self, value: str) -> None: self.s3_bucket_assets = value

    @property
    def AWS_REGION(self) -> str: return self.aws_region
    @AWS_REGION.setter
    def AWS_REGION(self, value: str) -> None: self.aws_region = value

    @property
    def AWS_ACCESS_KEY_ID(self) -> str: return self.aws_access_key_id
    @AWS_ACCESS_KEY_ID.setter
    def AWS_ACCESS_KEY_ID(self, value: str) -> None: self.aws_access_key_id = value

    @property
    def AWS_SECRET_ACCESS_KEY(self) -> str: return self.aws_secret_access_key
    @AWS_SECRET_ACCESS_KEY.setter
    def AWS_SECRET_ACCESS_KEY(self, value: str) -> None: self.aws_secret_access_key = value

    # AI Provider Core Keys
    @property
    def OPENAI_API_KEY(self) -> str: return self.openai_api_key
    @OPENAI_API_KEY.setter
    def OPENAI_API_KEY(self, value: str) -> None: self.openai_api_key = value

    @property
    def ANTHROPIC_API_KEY(self) -> str: return self.anthropic_api_key
    @ANTHROPIC_API_KEY.setter
    def ANTHROPIC_API_KEY(self, value: str) -> None: self.anthropic_api_key = value

    @property
    def GROQ_API_KEY(self) -> str: return self.groq_api_key
    @GROQ_API_KEY.setter
    def GROQ_API_KEY(self, value: str) -> None: self.groq_api_key = value

    @property
    def GEMINI_API_KEY(self) -> str: return self.gemini_api_key
    @GEMINI_API_KEY.setter
    def GEMINI_API_KEY(self, value: str) -> None: self.gemini_api_key = value

    @property
    def DEFAULT_MODEL(self) -> str: return self.default_model
    @DEFAULT_MODEL.setter
    def DEFAULT_MODEL(self, value: str) -> None: self.default_model = value

    @property
    def DEFAULT_PROVIDER(self) -> str: return self.default_provider
    @DEFAULT_PROVIDER.setter
    def DEFAULT_PROVIDER(self, value: str) -> None: self.default_provider = value

    # Stripe Payment Layer
    @property
    def STRIPE_SECRET_KEY(self) -> str: return self.stripe_secret_key
    @STRIPE_SECRET_KEY.setter
    def STRIPE_SECRET_KEY(self, value: str) -> None: self.stripe_secret_key = value

    @property
    def STRIPE_WEBHOOK_SECRET(self) -> str: return self.stripe_webhook_secret
    @STRIPE_WEBHOOK_SECRET.setter
    def STRIPE_WEBHOOK_SECRET(self, value: str) -> None: self.stripe_webhook_secret = value

    @property
    def STRIPE_TEAM_PRICE_ID(self) -> str: return self.stripe_team_price_id
    @STRIPE_TEAM_PRICE_ID.setter
    def STRIPE_TEAM_PRICE_ID(self, value: str) -> None: self.stripe_team_price_id = value

    @property
    def STRIPE_PRO_PRICE_ID(self) -> str: return self.stripe_pro_price_id
    @STRIPE_PRO_PRICE_ID.setter
    def STRIPE_PRO_PRICE_ID(self, value: str) -> None: self.stripe_pro_price_id = value

    # Network Transport Configuration
    @property
    def FRONTEND_URL(self) -> str: return self.frontend_url
    @FRONTEND_URL.setter
    def FRONTEND_URL(self, value: str) -> None: self.frontend_url = value

    @property
    def ALLOWED_ORIGINS(self) -> List[str]: return self.allowed_origins
    @ALLOWED_ORIGINS.setter
    def ALLOWED_ORIGINS(self, value: List[str]) -> None: self.allowed_origins = value

    # Rate Limiting Engine Getters & Setters
    @property
    def RATE_LIMIT_FREE(self) -> int:
        return self.rate_limit_free

    @RATE_LIMIT_FREE.setter
    def RATE_LIMIT_FREE(self, value: int) -> None:
        if value <= 0:
            raise ValueError("RATE_LIMIT_FREE value must be greater than 0.")
        self.rate_limit_free = value

    @property
    def RATE_LIMIT_PRO(self) -> int:
        return self.rate_limit_pro

    @RATE_LIMIT_PRO.setter
    def RATE_LIMIT_PRO(self, value: int) -> None:
        if value <= 0:
            raise ValueError("RATE_LIMIT_PRO value must be greater than 0.")
        self.rate_limit_pro = value

    @property
    def RATE_LIMIT_TEAM(self) -> int:
        return self.rate_limit_team

    @RATE_LIMIT_TEAM.setter
    def RATE_LIMIT_TEAM(self, value: int) -> None:
        if value <= 0:
            raise ValueError("RATE_LIMIT_TEAM value must be greater than 0.")
        self.rate_limit_team = value

    # ── Environment Helper Predicates ───────────────────────────
    @property
    def is_dev(self) -> bool:
        return self.environment == "development"

    @property
    def is_staging(self) -> bool:
        return self.environment == "staging"

    @property
    def is_prod(self) -> bool:
        return self.environment == "production"

    # ── Input Field Validators ──────────────────────────────────
    @field_validator("rate_limit_free", "rate_limit_pro", "rate_limit_team", mode="before")
    @classmethod
    def validate_rate_limits(cls, v: Any, info: ValidationInfo) -> int:
        try:
            int_val = int(v)
        except (ValueError, TypeError):
            raise ValueError(f"Rate limiting variable configuration '{info.field_name}' must be a valid integer.")
        if int_val <= 0:
            raise ValueError(f"Rate limit restriction field '{info.field_name}' must be a positive integer greater than 0. Received: {int_val}")
        return int_val

    @field_validator("environment", mode="before")
    @classmethod
    def validate_environment(cls, v: Any) -> str:
        if isinstance(v, str):
            normalized = v.strip().lower()
            valid_targets = {"development", "staging", "production"}
            if normalized in valid_targets:
                return normalized
        raise ValueError(f"Invalid deployment target setup: '{v}'. Must choose between: development, staging, production.")

    @field_validator("debug", mode="before")
    @classmethod
    def validate_debug(cls, v: Any) -> bool:
        if isinstance(v, str):
            return v.strip().lower() in ("true", "1", "yes", "on", "t")
        return bool(v)

    @field_validator("database_url", mode="before")
    @classmethod
    def validate_database_url(cls, v: Any) -> str:
        if not isinstance(v, str) or not v:
            raise ValueError("DATABASE_URL must be an un-empty, explicit database connection path string.")
        
        # Enforce the use of an asynchronous dialect string definition
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError(f"DATABASE_URL protocol dialect validation breakdown. Expected async driver header: 'postgresql+asyncpg://', received: '{v}'")
        return v

    @field_validator("redis_url", mode="before")
    @classmethod
    def validate_redis_url(cls, v: Any) -> str:
        if not isinstance(v, str) or not (v.startswith("redis://") or v.startswith("rediss://")):
            raise ValueError(f"REDIS_URL must use a standard redis transport schema format ('redis://' or secure 'rediss://'). String received: '{v}'")
        return v

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def validate_cors_origins(cls, v: Any, info: ValidationInfo) -> List[str]:
        """
        Synthesizes configuration values across multi-origin parameters,
        handling both string lists and comma-separated environment variables.
        """
        if isinstance(v, str):
            if not v.strip():
                return []
            return [item.strip() for item in re.split(r",\s*", v) if item.strip()]
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return []


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()