"""
Printers API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.schemas.printer import PrinterCreate, PrinterUpdate, PrinterResponse, PrinterStatusEnum
from app.crud import printer as printer_crud
from app.crud.audit_log import create_audit_log
from app.models.printer import Printer

router = APIRouter(prefix="/printers", tags=["Printers"])


@router.post("/bulk", status_code=201)
def bulk_create_printers(
    items: list[PrinterCreate],
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Bulk create printers – skips rows whose serial_no already exists."""
    created = []
    skipped = []
    for data in items:
        existing = db.query(Printer).filter(Printer.serial_no == data.serial_no).first()
        if existing:
            skipped.append(data.serial_no)
            continue
        obj = printer_crud.create_printer(db, data)
        create_audit_log(
            db,
            action="CREATE_PRINTER",
            user_email=user.email,
            details=f"CSV import: {obj.printer_name or obj.brand} {obj.model} (SN: {obj.serial_no})",
        )
        created.append(obj)
    return {
        "created_count": len(created),
        "skipped_count": len(skipped),
        "skipped_serials": skipped,
    }


@router.get("/", response_model=list[PrinterResponse])
def list_printers(
    skip: int = 0,
    limit: int = 100,
    status: PrinterStatusEnum | None = None,
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return printer_crud.get_printers(db, skip=skip, limit=limit, status=status, search=search)


@router.get("/{printer_id}", response_model=PrinterResponse)
def get_printer(printer_id: int, db: Session = Depends(get_db)):
    obj = printer_crud.get_printer(db, printer_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Printer not found")
    return obj


@router.post("/", response_model=PrinterResponse, status_code=201)
def create_printer(
    data: PrinterCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    existing = db.query(Printer).filter(Printer.serial_no == data.serial_no).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Bu seri numarası zaten kayıtlı: {data.serial_no}")
    obj = printer_crud.create_printer(db, data)
    create_audit_log(
        db,
        action="CREATE_PRINTER",
        user_email=user.email,
        details=f"Created printer {obj.printer_name or obj.brand} {obj.model} (SN: {obj.serial_no})",
    )
    return obj


@router.put("/{printer_id}", response_model=PrinterResponse)
def update_printer(
    printer_id: int,
    data: PrinterUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = printer_crud.update_printer(db, printer_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Printer not found")
    create_audit_log(
        db,
        action="UPDATE_PRINTER",
        user_email=user.email,
        details=f"Updated printer id={printer_id}",
    )
    return obj


@router.delete("/{printer_id}")
def delete_printer(
    printer_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = db.query(Printer).filter(Printer.id == printer_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Printer not found")
    create_audit_log(
        db,
        action="DELETE_PRINTER",
        user_email=user.email,
        details=f"Deleted printer {obj.printer_name or obj.brand} {obj.model} (SN: {obj.serial_no})",
    )
    db.delete(obj)
    db.commit()
    return {"detail": "Deleted"}
