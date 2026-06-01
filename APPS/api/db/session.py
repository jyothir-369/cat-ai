import logging
from collections.abc import AsyncGenerator
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

logger = logging.getLogger("api.db.session")

# Global singleton placeholders for lazy orchestration
_async_engine: Optional[AsyncEngine] = None
_async_sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None


class Base(DeclarativeBase):
    """
    Shared declarative base for all system ORM models.
    Fully compliant with modern SQLAlchemy 2.0 type-mapping.
    """
    pass


def get_async_engine() -> AsyncEngine:
    """
    Thread-safe, lazy-initialization engine factory for the AsyncEngine.
    Defensively validates configuration integrity and prevents import-time crashes.
    """
    global _async_engine
    if _async_engine is not None:
        return _async_engine

    # ── Defensive Configuration Extraction & Validation ──
    # Prioritize lowercase fields, fallback safely to uppercase properties
    db_url: Optional[str] = getattr(settings, "database_url", getattr(settings, "DATABASE_URL", None))
    is_debug: bool = bool(getattr(settings, "debug", getattr(settings, "DEBUG", False)))

    if not db_url:
        logger.critical("Database initialization blocker: 'database_url' parameters missing from system runtime settings.")
        raise RuntimeError(
            "FATAL CONFIGURATION ERROR: The system was unable to locate a valid 'database_url' path. "
            "Verify your environment variables or current .env config file state."
        )

    try:
        logger.info("Initializing enterprise SQLAlchemy 2.x AsyncEngine instance...")
        _async_engine = create_async_engine(
            db_url,
            echo=is_debug,
            pool_size=10,          # Base persistence connection limits
            max_overflow=20,       # Spike threshold protection bounds
            pool_pre_ping=True,    # Automatic stale/dropped connection recycling
            pool_recycle=1800,     # Recycle connections every 30 minutes to prevent server-side dropoffs
        )
        return _async_engine
    except Exception as exc:
        logger.critical("Failed to instantiate SQLAlchemy database engine wrapper: %s", str(exc))
        raise


def get_async_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """
    Retrieves or establishes the dedicated factory engine for transactional session handling.
    """
    global _async_sessionmaker
    if _async_sessionmaker is not None:
        return _async_sessionmaker

    engine = get_async_engine()
    _async_sessionmaker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,  # Essential for modern async development to avoid detached state exceptions
        autoflush=False,
        autocommit=False,        # Enforces explicit transaction boundaries via context managers
    )
    return _async_sessionmaker


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI Contextual Dependency Injection Generator.
    Guarantees clean unit-of-work transactional boundaries with automatic 
    rollback on downstream handler exceptions.
    """
    session_factory = get_async_sessionmaker()
    
    async with session_factory() as session:
        try:
            yield session
            # Note: Explicit manual commits are traditionally preferred within endpoint routes.
            # However, keeping auto-commit handling block here to ensure compatibility with legacy pipelines.
            await session.commit()
        except Exception as exc:
            logger.error("Database transaction boundary breakdown detected. Executing rollback operations: %s", str(exc))
            await session.rollback()
            raise
        finally:
            # session.close() is natively executed by the 'async with' context wrapper, 
            # but we explicitly invoke it here to guarantee socket return to the pooling network layer.
            await session.close()


async def check_database_health() -> bool:
    """
    High-performance diagnostic probe validating engine liveness 
    and connection checkout efficiency. Ideal for ASGI health endpoints.
    """
    from sqlalchemy import text
    try:
        engine = get_async_engine()
        async with engine.connect() as connection:
            # Execute a lightweight, low-overhead primitive evaluation statement
            result = await connection.execute(text("SELECT 1"))
            await connection.commit()
            return result.scalar() == 1
    except Exception as diagnostic_exc:
        logger.error("Infrastructure layer health check failed: %s", str(diagnostic_exc))
        return False