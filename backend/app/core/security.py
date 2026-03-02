"""
Authentication helpers — Azure AD JWT verification + dev-mode mock.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx

from app.core.config import settings

security_scheme = HTTPBearer(auto_error=False)

# Cached JWKS
_jwks_cache: dict | None = None


async def _get_azure_jwks() -> dict:
    """Fetch Microsoft's public signing keys (cached after first call)."""
    global _jwks_cache
    if _jwks_cache is None:
        jwks_url = (
            f"https://login.microsoftonline.com/{settings.AZURE_AD_TENANT_ID}"
            "/discovery/v2.0/keys"
        )
        async with httpx.AsyncClient() as client:
            resp = await client.get(jwks_url)
            _jwks_cache = resp.json()
    return _jwks_cache


class CurrentUser:
    """Lightweight DTO representing the logged-in user."""

    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

    def __repr__(self) -> str:
        return f"CurrentUser(name={self.name!r}, email={self.email!r})"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> CurrentUser:
    """
    FastAPI dependency that resolves the current user.

    * DEV_MODE=True  → returns a mock IT admin user (no token required).
    * DEV_MODE=False → validates the Azure AD Bearer token.
    """
    # ── Dev / mock user ──────────────────────────────────
    if settings.DEV_MODE:
        return CurrentUser(name="IT Admin (Dev)", email="admin@dev.local")

    # ── Production: validate Bearer token ────────────────
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )

    token = credentials.credentials
    try:
        jwks = await _get_azure_jwks()
        unverified_header = jwt.get_unverified_header(token)

        # Find the matching key
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key["kid"] == unverified_header.get("kid"):
                rsa_key = key
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find appropriate signing key",
            )

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.AZURE_AD_CLIENT_ID,
            issuer=f"https://login.microsoftonline.com/{settings.AZURE_AD_TENANT_ID}/v2.0",
        )

        return CurrentUser(
            name=payload.get("name", "Unknown"),
            email=payload.get("preferred_username", payload.get("email", "unknown")),
        )

    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {exc}",
        )
