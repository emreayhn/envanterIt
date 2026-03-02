"""
CRUD operations for LicenseAssignment.
"""

from datetime import date
from sqlalchemy.orm import Session
from app.models.license_assignment import LicenseAssignment
from app.models.license import License


def get_assignments_for_license(db: Session, license_id: int):
    return (
        db.query(LicenseAssignment)
        .filter(LicenseAssignment.license_id == license_id)
        .order_by(LicenseAssignment.assigned_date.desc())
        .all()
    )


def get_all_assignments(db: Session):
    return (
        db.query(LicenseAssignment)
        .order_by(LicenseAssignment.id.desc())
        .all()
    )


def create_assignment(
    db: Session,
    license_id: int,
    employee_id: int,
    assigned_by: str,
) -> LicenseAssignment:
    obj = LicenseAssignment(
        license_id=license_id,
        employee_id=employee_id,
        assigned_date=date.today(),
        assigned_by=assigned_by,
    )
    db.add(obj)

    # Increment used_seats
    lic = db.query(License).filter(License.id == license_id).first()
    if lic:
        lic.used_seats = (lic.used_seats or 0) + 1

    db.commit()
    db.refresh(obj)
    return obj


def delete_assignment(db: Session, assignment_id: int) -> bool:
    obj = db.query(LicenseAssignment).filter(LicenseAssignment.id == assignment_id).first()
    if not obj:
        return False

    # Decrement used_seats
    lic = db.query(License).filter(License.id == obj.license_id).first()
    if lic and lic.used_seats > 0:
        lic.used_seats -= 1

    db.delete(obj)
    db.commit()
    return True
