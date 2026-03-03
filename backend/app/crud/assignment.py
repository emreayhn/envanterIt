"""
CRUD operations for Assignments.
Creating an assignment automatically sets the computer's status to ASSIGNED.
Soft-delete: sets returned_date instead of deleting, to preserve history.
"""

from datetime import date
from sqlalchemy.orm import Session
from app.models.assignment import Assignment
from app.models.computer import Computer, ComputerStatus
from app.schemas.assignment import AssignmentCreate


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
        .order_by(Assignment.assigned_date.desc())
        .all()
    )


def create_assignment(
    db: Session, data: AssignmentCreate, assigned_by: str
) -> Assignment:
    obj = Assignment(
        computer_id=data.computer_id,
        license_id=data.license_id,
        employee_id=data.employee_id,
        assigned_date=data.assigned_date or date.today(),
        assigned_by=assigned_by,
    )
    db.add(obj)

    # Auto-update the computer status to ASSIGNED
    computer = db.query(Computer).filter(Computer.id == data.computer_id).first()
    if computer:
        computer.status = ComputerStatus.ASSIGNED

    db.commit()
    db.refresh(obj)
    return obj


def soft_delete_assignment(db: Session, assignment_id: int) -> Assignment | None:
    """Soft-delete: set returned_date = today, revert computer to STOCK."""
    obj = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not obj:
        return None
    obj.returned_date = date.today()

    computer = db.query(Computer).filter(Computer.id == obj.computer_id).first()
    if computer:
        computer.status = ComputerStatus.STOCK

    db.commit()
    return obj
