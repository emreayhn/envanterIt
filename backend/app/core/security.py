"""
Authentication helpers — JWT token creation & verification.
"""

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    """Lightweight DTO representing the logged-in user."""

    def __init__(self, id: int, name: str, email: str, role: str = "user"):
        self.id = id
        self.name = name
        self.email = email
        self.role = role

    def __repr__(self) -> str:
        return f"CurrentUser(name={self.name!r}, email={self.email!r}, role={self.role!r})"


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> CurrentUser:
    """
    FastAPI dependency that resolves the current user from JWT token.

    * DEV_MODE=True  → returns a mock IT admin user (no token required).
    * DEV_MODE=False → validates the JWT Bearer token.
    """
    # ── Dev / mock user ──────────────────────────────────
    if settings.DEV_MODE:
        return CurrentUser(id=0, name="IT Admin (Dev)", email="admin@dev.local", role="admin")

    # ── Production: validate Bearer token ────────────────
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "user")
        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        return CurrentUser(id=int(user_id), name="", email=email, role=role)

    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {exc}",
        )


async def require_admin(
    current: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Dependency — only allows admin users."""
    if current.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için admin yetkisi gerekli",
        )
    return current
