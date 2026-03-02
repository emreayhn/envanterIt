"""
CRUD operations for the Printer entity.
"""

from sqlalchemy.orm import Session
from app.models.printer import Printer, PrinterStatus
from app.schemas.printer import PrinterCreate, PrinterUpdate


def get_printers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: PrinterStatus | None = None,
    search: str | None = None,
):
    query = db.query(Printer)
    if status:
        query = query.filter(Printer.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Printer.printer_name.ilike(pattern))
            | (Printer.brand.ilike(pattern))
            | (Printer.model.ilike(pattern))
            | (Printer.serial_no.ilike(pattern))
        )
    return query.order_by(Printer.id.desc()).offset(skip).limit(limit).all()


def get_printer(db: Session, printer_id: int) -> Printer | None:
    return db.query(Printer).filter(Printer.id == printer_id).first()


def create_printer(db: Session, data: PrinterCreate) -> Printer:
    obj = Printer(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_printer(db: Session, printer_id: int, data: PrinterUpdate) -> Printer | None:
    obj = db.query(Printer).filter(Printer.id == printer_id).first()
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_printer(db: Session, printer_id: int) -> bool:
    obj = db.query(Printer).filter(Printer.id == printer_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True
