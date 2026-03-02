"""
Assignments (zimmet) API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.crud import assignment as assignment_crud
from app.crud.audit_log import create_audit_log

router = APIRouter(prefix="/assignments", tags=["Assignments"])


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
        computer_brand=row.computer.brand if row.computer else None,
        computer_model=row.computer.model if row.computer else None,
        computer_serial=row.computer.serial_no if row.computer else None,
        employee_name=row.employee.full_name if row.employee else None,
    )


@router.get("/", response_model=list[AssignmentResponse])
def list_assignments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rows = assignment_crud.get_assignments(db, skip=skip, limit=limit)
    return [_to_response(r) for r in rows]


@router.get("/history/{computer_id}", response_model=list[AssignmentResponse])
def assignment_history(computer_id: int, db: Session = Depends(get_db)):
    """Return full assignment history for a specific computer."""
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
