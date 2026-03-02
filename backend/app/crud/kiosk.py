"""
CRUD operations for the Kiosk entity.
"""

from sqlalchemy.orm import Session
from app.models.kiosk import Kiosk, KioskStatus
from app.schemas.kiosk import KioskCreate, KioskUpdate


def get_kiosks(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: KioskStatus | None = None,
    search: str | None = None,
):
    query = db.query(Kiosk)
    if status:
        query = query.filter(Kiosk.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Kiosk.hostname.ilike(pattern))
            | (Kiosk.serial_no.ilike(pattern))
        )
    return query.order_by(Kiosk.id.desc()).offset(skip).limit(limit).all()


def get_kiosk(db: Session, kiosk_id: int) -> Kiosk | None:
    return db.query(Kiosk).filter(Kiosk.id == kiosk_id).first()


def create_kiosk(db: Session, data: KioskCreate) -> Kiosk:
    obj = Kiosk(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_kiosk(db: Session, kiosk_id: int, data: KioskUpdate) -> Kiosk | None:
    obj = db.query(Kiosk).filter(Kiosk.id == kiosk_id).first()
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_kiosk(db: Session, kiosk_id: int) -> bool:
    obj = db.query(Kiosk).filter(Kiosk.id == kiosk_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True
