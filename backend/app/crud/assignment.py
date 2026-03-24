"""
CRUD operations for Assignments.
Creating an assignment automatically sets the item's status to ASSIGNED.
Soft-delete: sets returned_date instead of deleting, to preserve history.
"""

from datetime import date
from sqlalchemy.orm import Session
from app.models.assignment import Assignment
from app.models.computer import Computer, ComputerStatus
from app.models.kiosk import Kiosk, KioskStatus
from app.models.printer import Printer, PrinterStatus
from app.models.category_item import InventoryItem, ItemStatus
from app.schemas.assignment import AssignmentCreate


def _set_item_status(db: Session, computer_id, kiosk_id, printer_id, item_id, status_str: str):
    """Set the referenced item's status. status_str must be 'ASSIGNED' or 'STOCK'."""
    if computer_id:
        obj = db.query(Computer).filter(Computer.id == computer_id).first()
        if obj:
            obj.status = ComputerStatus[status_str]
    elif kiosk_id:
        obj = db.query(Kiosk).filter(Kiosk.id == kiosk_id).first()
        if obj:
            obj.status = KioskStatus[status_str]
    elif printer_id:
        obj = db.query(Printer).filter(Printer.id == printer_id).first()
        if obj:
            obj.status = PrinterStatus[status_str]
    elif item_id:
        obj = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
        if obj:
            obj.status = ItemStatus[status_str]


def get_assignments(db: Session, skip: int = 0, limit: int = 2000):
    """Return only active assignments (returned_date is NULL)."""
    return (
        db.query(Assignment)
        .filter(Assignment.returned_date == None)  # noqa: E711
        .order_by(Assignment.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_assignment_history(db: Session, computer_id: int):
    """Return all assignments for a computer, including returned ones."""
    return (
        db.query(Assignment)
        .filter(Assignment.computer_id == computer_id)
        .order_by(Assignment.assigned_date.desc(), Assignment.id.desc())
        .all()
    )


def get_assignments_for_employee(db: Session, employee_id: int):
    """Bir personelin aktif zimmetlerini döndür."""
    return (
        db.query(Assignment)
        .filter(Assignment.employee_id == employee_id, Assignment.returned_date == None)  # noqa: E711
        .all()
    )


def get_item_assignment_history(db: Session, item_type: str, item_id: int):
    """Return all assignments for any item type, including returned ones."""
    col_map = {
        "computer":      Assignment.computer_id,
        "kiosk":         Assignment.kiosk_id,
        "printer":       Assignment.printer_id,
        "category_item": Assignment.item_id,
    }
    col = col_map.get(item_type)
    if col is None:
        return []
    return (
        db.query(Assignment)
        .filter(col == item_id)
        .order_by(Assignment.assigned_date.desc(), Assignment.id.desc())
        .all()
    )


def create_assignment(db: Session, data: AssignmentCreate, assigned_by: str) -> Assignment:
    obj = Assignment(
        computer_id=data.computer_id,
        kiosk_id=data.kiosk_id,
        printer_id=data.printer_id,
        item_id=data.item_id,
        license_id=data.license_id,
        employee_id=data.employee_id,
        assigned_date=data.assigned_date or date.today(),
        assigned_by=assigned_by,
    )
    db.add(obj)
    _set_item_status(db, data.computer_id, data.kiosk_id, data.printer_id, data.item_id, "ASSIGNED")
    db.commit()
    db.refresh(obj)
    return obj


def soft_delete_assignment(db: Session, assignment_id: int) -> Assignment | None:
    """Soft-delete: set returned_date = today, revert item to STOCK."""
    obj = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not obj:
        return None
    obj.returned_date = date.today()
    _set_item_status(db, obj.computer_id, obj.kiosk_id, obj.printer_id, obj.item_id, "STOCK")
    db.commit()
    return obj
