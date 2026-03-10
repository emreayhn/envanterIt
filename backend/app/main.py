"""
FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.v1.router import router as v1_router
from sqlalchemy import text

# Import all models so they are registered with Base.metadata
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup and seed admin."""
    Base.metadata.create_all(bind=engine)
    # Seed default admin user
    from app.crud.user import seed_admin
    db = SessionLocal()
    try:
        # Auto-migration: Ensure company column exists
        try:
            db.execute(text("ALTER TABLE computers ADD COLUMN company VARCHAR(150)"))
            db.commit()
        except Exception:
            db.rollback()
            pass  # Ignore if it already exists

        # Auto-migration: Ensure ethernet_mac_2 column exists on kiosks
        try:
            db.execute(text("ALTER TABLE kiosks ADD COLUMN ethernet_mac_2 VARCHAR(50)"))
            db.commit()
        except Exception:
            db.rollback()
            pass  # Ignore if it already exists

        # Auto-migration: Drop unique constraint on kiosks.serial_no (O.E.M. duplicates allowed)
        try:
            db.execute(text("DROP INDEX IF EXISTS ix_kiosks_serial_no"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_kiosks_serial_no ON kiosks(serial_no)"))
            db.commit()
        except Exception:
            db.rollback()
            pass

        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────
app.include_router(v1_router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "version": settings.APP_VERSION}
