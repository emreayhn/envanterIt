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
from app.models.employee import Employee
from app.models.assignment import Assignment

router = APIRouter(prefix="/assignments", tags=["Assignments"])


class BulkAssignmentRow(BaseModel):
    serial_no: str
    full_name: str = ""
    email: str = ""


def _to_response(row) -> AssignmentResponse:
    return AssignmentResponse(
        id=row.id,
        computer_id=row.computer_id,
        license_id=row.license_id,
        employee_id=row.employee_id,
        assigned_date=row.assigned_date,
        assigned_by=row.assigned_by,
        created_at=row.created_at,
        returned_date=row.returned_date,
        computer_name=row.computer.computer_name if row.computer else None,
        computer_brand=row.computer.brand if row.computer else None,
        computer_model=row.computer.model if row.computer else None,
        computer_serial=row.computer.serial_no if row.computer else None,
        employee_name=row.employee.full_name if row.employee else None,
    )


@router.get("/", response_model=list[AssignmentResponse])
def list_assignments(skip: int = 0, limit: int = 2000, db: Session = Depends(get_db)):
    rows = assignment_crud.get_assignments(db, skip=skip, limit=limit)
    return [_to_response(r) for r in rows]


@router.get("/history/{computer_id}", response_model=list[AssignmentResponse])
def assignment_history(computer_id: int, db: Session = Depends(get_db)):
    rows = assignment_crud.get_assignment_history(db, computer_id)
    return [_to_response(r) for r in rows]


@router.post("/", response_model=AssignmentResponse, status_code=201)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = assignment_crud.create_assignment(db, data, assigned_by=user.email)
    create_audit_log(
        db,
        action="CREATE_ASSIGNMENT",
        user_email=user.email,
        details=f"Assigned computer_id={data.computer_id} to employee_id={data.employee_id}",
    )
    return _to_response(obj)


@router.delete("/{assignment_id}", status_code=204)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = assignment_crud.soft_delete_assignment(db, assignment_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignment not found")

    create_audit_log(
        db,
        action="DELETE_ASSIGNMENT",
        user_email=user.email,
        details=f"Returned assignment #{assignment_id} (computer_id={obj.computer_id})",
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
        # 1. Bilgisayarı seri numarasıyla bul
        computer = db.query(Computer).filter(Computer.serial_no == row.serial_no).first()
        if not computer:
            skipped.append({"serial_no": row.serial_no, "reason": "Bilgisayar bulunamadı"})
            continue

        # 2. Personeli email ile bul, yoksa isimle bul
        employee = None
        if row.email:
            employee = db.query(Employee).filter(Employee.email == row.email).first()
        if not employee and row.full_name:
            employee = db.query(Employee).filter(Employee.full_name == row.full_name).first()

        if not employee:
            skipped.append({"serial_no": row.serial_no, "reason": f"Personel bulunamadı: {row.email or row.full_name}"})
            continue

        # 3. Zaten aktif zimmet var mı kontrol et
        existing = db.query(Assignment).filter(
            Assignment.computer_id == computer.id,
            Assignment.returned_date == None,  # noqa: E711
        ).first()
        if existing:
            skipped.append({"serial_no": row.serial_no, "reason": "Zaten zimmetli"})
            continue

        # 4. Zimmet oluştur
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
    return {
        "created_count": created,
        "skipped_count": len(skipped),
        "skipped": skipped,
    }

