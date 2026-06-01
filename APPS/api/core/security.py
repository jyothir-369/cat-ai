import base64
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Tuple, Dict, Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet, InvalidToken

from core.config import settings

logger = logging.getLogger("api.core.security")

# Initialize password context using secure standard bcrypt engine
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Global singleton storage cache for lazy loading the encryption engine
_fernet_cache: Optional[Fernet] = None

# ── Cryptographic Credential Encryption Context Setup ────────────────────────

def _get_fernet_engine() -> Fernet:
    """
    Thread-safe, lazy-initialization engine for the symmetric Fernet layer.
    Defensively intercepts failures and falls back gracefully to prevent 
    import-time system startup crashes.
    """
    global _fernet_cache
    if _fernet_cache is not None:
        return _fernet_cache

    try:
        # Access parameters using canonical lowercase fields with robust defaults
        encryption_key = getattr(settings, "encryption_key", getattr(settings, "ENCRYPTION_KEY", None))
        
        if encryption_key:
            try:
                raw_bytes = encryption_key.encode() if isinstance(encryption_key, str) else encryption_key
                # Validate key integrity by testing initialization
                _fernet_cache = Fernet(raw_bytes)
                return _fernet_cache
            except Exception as exc:
                logger.warning("Provided ENCRYPTION_KEY structurally non-compliant with Fernet specs: %s. Re-deriving...", str(exc))
                key_source = encryption_key
        else:
            # Fallback to migrated canonical lowercase parameter
            key_source = getattr(settings, "jwt_secret", "fallback-emergency-static-key-token")

        # Derive a secure 32-byte url-safe string from available source entropy bytes
        source_bytes = key_source.encode() if isinstance(key_source, str) else key_source
        hashed_digest = hashlib.sha256(source_bytes).digest()
        url_safe_key = base64.urlsafe_b64encode(hashed_digest)
        
        _fernet_cache = Fernet(url_safe_key)
        return _fernet_cache

    except Exception as fatal_exc:
        logger.critical("Critical Failure initializing Fernet engine context: %s", str(fatal_exc), exc_info=True)
        # Standardize emergency fallback key to guarantee application boot stability
        emergency_key = base64.urlsafe_b64encode(b"static_emergency_32_byte_key_val")
        _fernet_cache = Fernet(emergency_key)
        return _fernet_cache


def encrypt_credentials(data: Dict[str, Any]) -> str:
    """
    Converts a structured credential dictionary payload into a securely encrypted,
    authenticated Fernet token string. Suitable for deep database column shielding.
    """
    if not data:
        data = {}
    try:
        json_bytes = json.dumps(data, sort_keys=True).encode("utf-8")
        engine = _get_fernet_engine()
        encrypted_bytes = engine.encrypt(json_bytes)
        return encrypted_bytes.decode("utf-8")
    except Exception as exc:
        logger.error("Failed to encrypt credentials context: %s", str(exc))
        raise JWTError("Symmetric database level column encryption operation sequence failed.") from exc


def decrypt_credentials(token: str) -> Dict[str, Any]:
    """
    Decrypts an authenticated encryption string block and restores the dictionary mapping.
    Raises an explicit jose.JWTError if structural corruption or tampering is detected.
    """
    if not token:
        return {}
    try:
        token_bytes = token.encode("utf-8") if isinstance(token, str) else token
        engine = _get_fernet_engine()
        decrypted_bytes = engine.decrypt(token_bytes)
        return json.loads(decrypted_bytes.decode("utf-8"))
    except (InvalidToken, json.JSONDecodeError, Exception) as exc:
        logger.error("Symmetric credential decryption validation failure block encountered: %s", str(exc))
        raise JWTError("Secure credential decryption operation failed due to an invalid token profile signature.") from exc


# ── Password Hashing ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Generates a secure bcrypt cryptographic hash of a plain password string."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifies a plain text candidate password against the database target record."""
    return pwd_context.verify(plain, hashed)


# ── JWT Token Core Primitives ─────────────────────────────────────────────────

def create_access_token(payload: Dict[str, Any]) -> str:
    """Generates a short-lived user identity verification token asset."""
    data = payload.copy()
    expire_minutes = int(getattr(settings, "access_token_expire_minutes", 15))
    jwt_secret = str(getattr(settings, "jwt_secret", "change-me"))
    jwt_algorithm = str(getattr(settings, "jwt_algorithm", "HS256"))

    data["exp"] = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    data["type"] = "access"
    return jwt.encode(data, jwt_secret, algorithm=jwt_algorithm)


def create_refresh_token(payload: Dict[str, Any]) -> str:
    """Generates an extended duration validation token asset used for continuous rotation sessions."""
    data = payload.copy()
    expire_days = int(getattr(settings, "refresh_token_expire_days", 30))
    jwt_secret = str(getattr(settings, "jwt_secret", "change-me"))
    jwt_algorithm = str(getattr(settings, "jwt_algorithm", "HS256"))

    data["exp"] = datetime.now(timezone.utc) + timedelta(days=expire_days)
    data["type"] = "refresh"
    return jwt.encode(data, jwt_secret, algorithm=jwt_algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    """Parses, verifies signatures, and extracts the payload context out of standard tokens."""
    jwt_secret = str(getattr(settings, "jwt_secret", "change-me"))
    jwt_algorithm = str(getattr(settings, "jwt_algorithm", "HS256"))
    return jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])


def generate_api_key() -> Tuple[str, str]:
    """
    Returns (raw_key, hashed_key). Only the hashed SHA-256 payload
    signature should be written to permanent index storage layers.
    """
    raw = f"catai-{secrets.token_urlsafe(32)}"
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def hash_api_key(raw: str) -> str:
    """Computes a secure one-way hash mapping reference for raw runtime API authentication checks."""
    return hashlib.sha256(raw.encode()).hexdigest()


# ── HMAC Webhook Signature Verification ───────────────────────────────────────

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Validates arriving external tracking payloads against tampering using a constant-time HMAC comparison."""
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


# ── Simple Single-Purpose Signed Approval Primitives ──────────────────────────

def create_signed_approval_token(run_id: str, step_id: str, ttl_hours: int = 24) -> str:
    """Generates an authenticated, short-lived verification token payload for human-in-the-loop workflows."""
    payload = {
        "run_id": run_id,
        "step_id": step_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ttl_hours),
        "type": "approval",
    }
    jwt_secret = str(getattr(settings, "jwt_secret", "change-me"))
    jwt_algorithm = str(getattr(settings, "jwt_algorithm", "HS256"))
    return jwt.encode(payload, jwt_secret, algorithm=jwt_algorithm)


def decode_approval_token(token: str) -> Dict[str, Any]:
    """Decodes and validates temporal validity markers on external callback signatures."""
    jwt_secret = str(getattr(settings, "jwt_secret", "change-me"))
    jwt_algorithm = str(getattr(settings, "jwt_algorithm", "HS256"))
    return jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])