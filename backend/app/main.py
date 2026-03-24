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

        # Auto-migration: Add kiosk_id, printer_id, item_id columns to assignments
        for col_sql in [
            "ALTER TABLE assignments ADD COLUMN kiosk_id   INTEGER REFERENCES kiosks(id)",
            "ALTER TABLE assignments ADD COLUMN printer_id INTEGER REFERENCES printers(id)",
            "ALTER TABLE assignments ADD COLUMN item_id    INTEGER REFERENCES inventory_items(id)",
        ]:
            try:
                db.execute(text(col_sql))
                db.commit()
            except Exception:
                db.rollback()

        # Auto-migration: Make computer_id nullable (requires table rebuild in SQLite)
        try:
            result = db.execute(text("PRAGMA table_info(assignments)")).fetchall()
            col_info = {row[1]: row[3] for row in result}  # name -> notnull
            if col_info.get("computer_id", 0) == 1:
                db.execute(text("""
                    CREATE TABLE IF NOT EXISTS assignments_new (
                        id            INTEGER PRIMARY KEY AUTOINCREMENT,
                        computer_id   INTEGER REFERENCES computers(id),
                        kiosk_id      INTEGER REFERENCES kiosks(id),
                        printer_id    INTEGER REFERENCES printers(id),
                        item_id       INTEGER REFERENCES inventory_items(id),
                        license_id    INTEGER REFERENCES licenses(id),
                        employee_id   INTEGER NOT NULL REFERENCES employees(id),
                        assigned_date DATE NOT NULL,
                        assigned_by   VARCHAR(150) NOT NULL,
                        created_at    DATETIME DEFAULT (CURRENT_TIMESTAMP),
                        returned_date DATE
                    )
                """))
                db.execute(text("""
                    INSERT INTO assignments_new
                        (id, computer_id, kiosk_id, printer_id, item_id, license_id,
                         employee_id, assigned_date, assigned_by, created_at, returned_date)
                    SELECT id, computer_id,
                           CASE WHEN typeof(kiosk_id)   = 'integer' THEN kiosk_id   ELSE NULL END,
                           CASE WHEN typeof(printer_id) = 'integer' THEN printer_id ELSE NULL END,
                           CASE WHEN typeof(item_id)    = 'integer' THEN item_id    ELSE NULL END,
                           license_id, employee_id, assigned_date, assigned_by, created_at, returned_date
                    FROM assignments
                """))
                db.execute(text("DROP TABLE assignments"))
                db.execute(text("ALTER TABLE assignments_new RENAME TO assignments"))
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
