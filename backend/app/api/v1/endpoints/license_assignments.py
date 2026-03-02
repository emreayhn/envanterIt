"""
License Assignments API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.crud import license_assignment as la_crud
from app.crud.audit_log import create_audit_log

router = APIRouter(prefix="/license-assignments", tags=["License Assignments"])


class LicenseAssignmentCreate(BaseModel):
    license_ids: list[int]
    employee_ids: list[int]


class LicenseAssignmentResponse(BaseModel):
    id: int
    license_id: int
    employee_id: int
    assigned_date: date
    assigned_by: str
    created_at: Optional[datetime] = None
    software_name: Optional[str] = None
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True


def _to_response(row) -> LicenseAssignmentResponse:
    return LicenseAssignmentResponse(
        id=row.id,
        license_id=row.license_id,
        employee_id=row.employee_id,
        assigned_date=row.assigned_date,
        assigned_by=row.assigned_by,
        created_at=row.created_at,
        software_name=row.license.software_name if row.license else None,
        employee_name=row.employee.full_name if row.employee else None,
    )


@router.get("/", response_model=list[LicenseAssignmentResponse])
def list_all(db: Session = Depends(get_db)):
    rows = la_crud.get_all_assignments(db)
    return [_to_response(r) for r in rows]


@router.get("/{license_id}", response_model=list[LicenseAssignmentResponse])
def list_for_license(license_id: int, db: Session = Depends(get_db)):
    rows = la_crud.get_assignments_for_license(db, license_id)
    return [_to_response(r) for r in rows]


@router.post("/", response_model=list[LicenseAssignmentResponse], status_code=201)
def assign_licenses(
    data: LicenseAssignmentCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    from app.models.license import License as LicenseModel

    # Pre-check seat capacity for each license
    errors = []
    for lid in data.license_ids:
        lic = db.query(LicenseModel).filter(LicenseModel.id == lid).first()
        if not lic:
            errors.append(f"Lisans #{lid} bulunamadı")
            continue
        new_assignments = len(data.employee_ids)
        available = lic.total_seats - (lic.used_seats or 0)
        if new_assignments > available:
            errors.append(f"{lic.software_name}: Boş koltuk {available}, atanmak istenen {new_assignments}")
    if errors:
        raise HTTPException(status_code=409, detail=" | ".join(errors))

    results = []
    for lid in data.license_ids:
        for eid in data.employee_ids:
            obj = la_crud.create_assignment(db, lid, eid, assigned_by=user.email)
            create_audit_log(
                db,
                action="ASSIGN_LICENSE",
                user_email=user.email,
                details=f"Assigned license_id={lid} to employee_id={eid}",
            )
            results.append(_to_response(obj))
    return results


@router.delete("/{assignment_id}", status_code=204)
def unassign_license(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    success = la_crud.delete_assignment(db, assignment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Assignment not found")
    create_audit_log(
        db,
        action="UNASSIGN_LICENSE",
        user_email=user.email,
        details=f"Removed license assignment #{assignment_id}",
    )
