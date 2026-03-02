"""
Computers API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.schemas.computer import ComputerCreate, ComputerUpdate, ComputerResponse, ComputerStatusEnum
from app.crud import computer as computer_crud
from app.crud.audit_log import create_audit_log
from app.models.computer import Computer
from app.models.assignment import Assignment
from app.models.employee import Employee

router = APIRouter(prefix="/computers", tags=["Computers"])


@router.post("/bulk", status_code=201)
def bulk_create_computers(
    items: list[ComputerCreate],
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Bulk create computers – skips rows whose serial_no already exists."""
    created = []
    skipped = []
    for data in items:
        existing = db.query(Computer).filter(Computer.serial_no == data.serial_no).first()
        if existing:
            skipped.append(data.serial_no)
            continue
        obj = computer_crud.create_computer(db, data)
        create_audit_log(
            db,
            action="CREATE_COMPUTER",
            user_email=user.email,
            details=f"CSV import: {obj.brand} {obj.model} (SN: {obj.serial_no})",
        )
        created.append(obj)
    return {
        "created_count": len(created),
        "skipped_count": len(skipped),
        "skipped_serials": skipped,
    }


@router.get("/", response_model=list[ComputerResponse])
def list_computers(
    skip: int = 0,
    limit: int = 100,
    status: ComputerStatusEnum | None = None,
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return computer_crud.get_computers(db, skip=skip, limit=limit, status=status, search=search)


@router.get("/{computer_id}", response_model=ComputerResponse)
def get_computer(computer_id: int, db: Session = Depends(get_db)):
    obj = computer_crud.get_computer(db, computer_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Computer not found")
    return obj


@router.post("/", response_model=ComputerResponse, status_code=201)
def create_computer(
    data: ComputerCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    # Duplicate serial check
    existing = db.query(Computer).filter(Computer.serial_no == data.serial_no).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Bu seri numarası zaten kayıtlı: {data.serial_no}")
    obj = computer_crud.create_computer(db, data)
    create_audit_log(
        db,
        action="CREATE_COMPUTER",
        user_email=user.email,
        details=f"Created computer {obj.brand} {obj.model} (SN: {obj.serial_no})",
    )
    return obj


@router.put("/{computer_id}", response_model=ComputerResponse)
def update_computer(
    computer_id: int,
    data: ComputerUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = computer_crud.update_computer(db, computer_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Computer not found")
    create_audit_log(
        db,
        action="UPDATE_COMPUTER",
        user_email=user.email,
        details=f"Updated computer id={computer_id}",
    )
    return obj


@router.get("/{computer_id}/assignments")
def get_computer_assignments(
    computer_id: int,
    db: Session = Depends(get_db),
):
    """Return assignment info for a computer (active + past)."""
    assignments = db.query(Assignment).filter(Assignment.computer_id == computer_id).all()
    result = []
    for a in assignments:
        emp = db.query(Employee).filter(Employee.id == a.employee_id).first()
        result.append({
            "assignment_id": a.id,
            "employee_name": emp.full_name if emp else "Bilinmiyor",
            "assigned_date": str(a.assigned_date) if a.assigned_date else None,
            "returned_date": str(a.returned_date) if a.returned_date else None,
            "is_active": a.returned_date is None,
        })
    return result


@router.delete("/{computer_id}")
def delete_computer(
    computer_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = db.query(Computer).filter(Computer.id == computer_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Computer not found")

    # Remove related assignments first to avoid FK constraint errors
    db.query(Assignment).filter(Assignment.computer_id == computer_id).delete()

    create_audit_log(
        db,
        action="DELETE_COMPUTER",
        user_email=user.email,
        details=f"Deleted computer {obj.brand} {obj.model} (SN: {obj.serial_no})",
    )
    db.delete(obj)
    db.commit()
    return {"detail": "Deleted"}
