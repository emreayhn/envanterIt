"""
Application configuration — loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "IT Envanter Takip Sistemi"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./inventory.db"

    # ── CORS ─────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── Azure AD / MSAL ──────────────────────────────────
    AZURE_AD_TENANT_ID: str = "YOUR_TENANT_ID"
    AZURE_AD_CLIENT_ID: str = "YOUR_CLIENT_ID"
    AZURE_AD_AUTHORITY: str = "https://login.microsoftonline.com/YOUR_TENANT_ID"

    # When True, auth is bypassed and a mock user is injected (dev only)
    DEV_MODE: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
