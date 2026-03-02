"""
Kiosks API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.schemas.kiosk import KioskCreate, KioskUpdate, KioskResponse, KioskStatusEnum
from app.crud import kiosk as kiosk_crud
from app.crud.audit_log import create_audit_log
from app.models.kiosk import Kiosk

router = APIRouter(prefix="/kiosks", tags=["Kiosks"])


@router.post("/bulk", status_code=201)
def bulk_create_kiosks(
    items: list[KioskCreate],
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Bulk create kiosks – skips rows whose serial_no already exists."""
    created = []
    skipped = []
    for data in items:
        existing = db.query(Kiosk).filter(Kiosk.serial_no == data.serial_no).first()
        if existing:
            skipped.append(data.serial_no)
            continue
        obj = kiosk_crud.create_kiosk(db, data)
        create_audit_log(
            db,
            action="CREATE_KIOSK",
            user_email=user.email,
            details=f"CSV import: {obj.hostname} (SN: {obj.serial_no})",
        )
        created.append(obj)
    return {
        "created_count": len(created),
        "skipped_count": len(skipped),
        "skipped_serials": skipped,
    }


@router.get("/", response_model=list[KioskResponse])
def list_kiosks(
    skip: int = 0,
    limit: int = 100,
    status: KioskStatusEnum | None = None,
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return kiosk_crud.get_kiosks(db, skip=skip, limit=limit, status=status, search=search)


@router.get("/{kiosk_id}", response_model=KioskResponse)
def get_kiosk(kiosk_id: int, db: Session = Depends(get_db)):
    obj = kiosk_crud.get_kiosk(db, kiosk_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    return obj


@router.post("/", response_model=KioskResponse, status_code=201)
def create_kiosk(
    data: KioskCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    existing = db.query(Kiosk).filter(Kiosk.serial_no == data.serial_no).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Bu seri numarası zaten kayıtlı: {data.serial_no}")
    obj = kiosk_crud.create_kiosk(db, data)
    create_audit_log(
        db,
        action="CREATE_KIOSK",
        user_email=user.email,
        details=f"Created kiosk {obj.hostname} (SN: {obj.serial_no})",
    )
    return obj


@router.put("/{kiosk_id}", response_model=KioskResponse)
def update_kiosk(
    kiosk_id: int,
    data: KioskUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = kiosk_crud.update_kiosk(db, kiosk_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    create_audit_log(
        db,
        action="UPDATE_KIOSK",
        user_email=user.email,
        details=f"Updated kiosk id={kiosk_id}",
    )
    return obj


@router.delete("/{kiosk_id}")
def delete_kiosk(
    kiosk_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = db.query(Kiosk).filter(Kiosk.id == kiosk_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    create_audit_log(
        db,
        action="DELETE_KIOSK",
        user_email=user.email,
        details=f"Deleted kiosk {obj.hostname} (SN: {obj.serial_no})",
    )
    db.delete(obj)
    db.commit()
    return {"detail": "Deleted"}
