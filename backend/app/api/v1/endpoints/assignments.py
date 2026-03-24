"""
Assignments (zimmet) API endpoints.
"""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.crud import assignment as assignment_crud
from app.crud.audit_log import create_audit_log
from app.models.computer import Computer, ComputerStatus
from app.models.kiosk import Kiosk, KioskStatus
from app.models.printer import Printer, PrinterStatus
from app.models.category_item import InventoryItem, ItemStatus
from app.models.employee import Employee
from app.models.assignment import Assignment

router = APIRouter(prefix="/assignments", tags=["Assignments"])


class BulkAssignmentRow(BaseModel):
    serial_no: str
    full_name: str = ""
    email: str = ""


def _to_response(row) -> AssignmentResponse:
    d = dict(
        id=row.id,
        computer_id=row.computer_id,
        kiosk_id=row.kiosk_id,
        printer_id=row.printer_id,
        item_id=row.item_id,
        license_id=row.license_id,
        employee_id=row.employee_id,
        assigned_date=row.assigned_date,
        assigned_by=row.assigned_by,
        created_at=row.created_at,
        returned_date=row.returned_date,
        item_type=row.item_type,
        employee_name=row.employee.full_name if row.employee else None,
    )
    if row.computer:
        d.update(
            computer_name=row.computer.computer_name,
            computer_brand=row.computer.brand,
            computer_model=row.computer.model,
            computer_serial=row.computer.serial_no,
        )
    elif row.kiosk:
        d.update(
            kiosk_hostname=row.kiosk.hostname,
            kiosk_serial=row.kiosk.serial_no,
            kiosk_tesis=row.kiosk.tesis,
        )
    elif row.printer:
        d.update(
            printer_name=row.printer.printer_name,
            printer_brand=row.printer.brand,
            printer_model=row.printer.model,
            printer_serial=row.printer.serial_no,
        )
    elif row.item:
        category_name = None
        if hasattr(row.item, "category") and row.item.category:
            category_name = row.item.category.name
        d.update(
            item_name=row.item.name,
            item_brand=row.item.brand,
            item_model=row.item.model,
            item_serial=row.item.serial_no,
            item_category_id=row.item.category_id,
            item_category_name=category_name,
        )
    return AssignmentResponse(**d)


def _item_label(row) -> str:
    """Human-readable label for the assigned item (for audit logs)."""
    if row.computer:
        name = row.computer.computer_name
        return f"{name} — {row.computer.brand} {row.computer.model}" if name else f"{row.computer.brand} {row.computer.model}"
    if row.kiosk:
        return row.kiosk.hostname
    if row.printer:
        return f"{row.printer.brand} {row.printer.model}"
    if row.item:
        return row.item.name or row.item.serial_no
    return f"assignment#{row.id}"


@router.get("/available-items/{item_type}")
def get_available_items(item_type: str, db: Session = Depends(get_db)):
    """STOCK durumdaki cihazları döndür — zimmet oluşturma modalı için."""
    if item_type == "computer":
        rows = db.query(Computer).filter(Computer.status == ComputerStatus.STOCK).all()
        return [
            {"id": r.id, "label": f"{r.computer_name + ' — ' if r.computer_name else ''}{r.brand} {r.model}", "serial": r.serial_no}
            for r in rows
        ]
    elif item_type == "kiosk":
        rows = db.query(Kiosk).filter(Kiosk.status == KioskStatus.STOCK).all()
        return [{"id": r.id, "label": r.hostname, "serial": r.serial_no} for r in rows]
    elif item_type == "printer":
        rows = db.query(Printer).filter(Printer.status == PrinterStatus.STOCK).all()
        return [
            {"id": r.id, "label": f"{r.printer_name + ' — ' if r.printer_name else ''}{r.brand} {r.model}", "serial": r.serial_no}
            for r in rows
        ]
    elif item_type == "category_item":
        rows = db.query(InventoryItem).filter(InventoryItem.status == ItemStatus.STOCK).all()
        return [
            {
                "id": r.id,
                "label": " ".join(filter(None, [r.name, r.brand, r.model])) or r.serial_no,
                "serial": r.serial_no,
                "category_id": r.category_id,
            }
            for r in rows
        ]
    raise HTTPException(status_code=400, detail="Geçersiz item_type")


@router.get("/history/{item_type}/{item_id}", response_model=list[AssignmentResponse])
def assignment_history_by_type(item_type: str, item_id: int, db: Session = Depends(get_db)):
    rows = assignment_crud.get_item_assignment_history(db, item_type, item_id)
    return [_to_response(r) for r in rows]


@router.get("/history/{computer_id}", response_model=list[AssignmentResponse])
def assignment_history(computer_id: int, db: Session = Depends(get_db)):
    """Geriye dönük uyumluluk için bilgisayar tarihçesi."""
    rows = assignment_crud.get_assignment_history(db, computer_id)
    return [_to_response(r) for r in rows]


@router.get("/", response_model=list[AssignmentResponse])
def list_assignments(skip: int = 0, limit: int = 2000, db: Session = Depends(get_db)):
    rows = assignment_crud.get_assignments(db, skip=skip, limit=limit)
    return [_to_response(r) for r in rows]


@router.post("/", status_code=201)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    # Aynı cihaz zaten aktif zimmetli mi?
    already = (
        db.query(Assignment)
        .filter(
            Assignment.returned_date == None,  # noqa: E711
            (Assignment.computer_id == data.computer_id) if data.computer_id else
            (Assignment.kiosk_id    == data.kiosk_id)    if data.kiosk_id    else
            (Assignment.printer_id  == data.printer_id)  if data.printer_id  else
            (Assignment.item_id     == data.item_id),
        )
        .first()
    )
    if already:
        raise HTTPException(status_code=400, detail="Bu cihaz zaten başka bir personele zimmetli.")

    # Aynı türdeki mevcut aktif zimmeti geri al (auto-return — sadece aynı tür)
    returned_item_name = None
    active_for_emp = (
        db.query(Assignment)
        .filter(
            Assignment.employee_id == data.employee_id,
            Assignment.returned_date == None,  # noqa: E711
        )
        .all()
    )
    for existing in active_for_emp:
        same_type = False
        if data.computer_id and existing.computer_id:
            same_type = True
        elif data.kiosk_id and existing.kiosk_id:
            same_type = True
        elif data.printer_id and existing.printer_id:
            same_type = True
        elif data.item_id and existing.item_id:
            # Aynı kategori mi kontrol et
            new_item = db.query(InventoryItem).filter(InventoryItem.id == data.item_id).first()
            if new_item and existing.item and existing.item.category_id == new_item.category_id:
                same_type = True
        if not same_type:
            continue
        returned_item_name = _item_label(existing)
        existing.returned_date = date.today()
        assignment_crud._set_item_status(
            db,
            existing.computer_id, existing.kiosk_id, existing.printer_id, existing.item_id,
            "STOCK",
        )
        create_audit_log(
            db,
            action="AUTO_RETURN_ASSIGNMENT",
            user_email=user.email,
            details=f"Auto-returned {existing.item_type} (assignment#{existing.id}) from employee_id={data.employee_id} (transfer)",
        )

    obj = assignment_crud.create_assignment(db, data, assigned_by=user.email)
    create_audit_log(
        db,
        action="CREATE_ASSIGNMENT",
        user_email=user.email,
        details=f"Assigned {obj.item_type} to employee_id={data.employee_id}",
    )
    result = _to_response(obj).model_dump()
    if returned_item_name:
        result["returned_computer_name"] = returned_item_name
    return result


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = assignment_crud.soft_delete_assignment(db, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Zimmet bulunamadı")

    create_audit_log(
        db,
        action="DELETE_ASSIGNMENT",
        user_email=user.email,
        details=f"Returned assignment #{assignment_id} ({obj.item_type})",
    )


@router.post("/bulk", status_code=201)
def bulk_create_assignments(
    rows: list[BulkAssignmentRow],
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """CSV'den toplu zimmet oluştur: serial_no ile bilgisayar, email ile personel eşleştir."""
    created = 0
    skipped = []

    for row in rows:
        computer = db.query(Computer).filter(Computer.serial_no == row.serial_no).first()
        if not computer:
            skipped.append({"serial_no": row.serial_no, "reason": "Bilgisayar bulunamadı"})
            continue

        employee = None
        if row.email:
            employee = db.query(Employee).filter(Employee.email == row.email).first()
        if not employee and row.full_name:
            employee = db.query(Employee).filter(Employee.full_name == row.full_name).first()

        if not employee:
            skipped.append({"serial_no": row.serial_no, "reason": f"Personel bulunamadı: {row.email or row.full_name}"})
            continue

        existing = db.query(Assignment).filter(
            Assignment.computer_id == computer.id,
            Assignment.returned_date == None,  # noqa: E711
        ).first()
        if existing:
            skipped.append({"serial_no": row.serial_no, "reason": "Zaten zimmetli"})
            continue

        assignment = Assignment(
            computer_id=computer.id,
            employee_id=employee.id,
            assigned_date=date.today(),
            assigned_by=user.email,
        )
        db.add(assignment)
        computer.status = ComputerStatus.ASSIGNED
        created += 1

    db.commit()
    return {"created_count": created, "skipped_count": len(skipped), "skipped": skipped}
