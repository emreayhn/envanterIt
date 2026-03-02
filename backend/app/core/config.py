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

    # ── JWT Authentication ───────────────────────────────
    JWT_SECRET_KEY: str = "envanter-it-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"

    # When True, auth is bypassed and a mock user is injected (dev only)
    DEV_MODE: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
