import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from pwdlib import PasswordHash
from app.core.config import settings

# Argon2 password hash context
pwd_context = PasswordHash.recommended()
ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def hash_token(raw_token: str) -> str:
    """Generate SHA-256 hash of opaque token to store securely in database."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_secure_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
