"""
CRUD operations for the Employee entity.
"""

from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


def get_employees(db: Session, skip: int = 0, limit: int = 100, search: str | None = None):
    query = db.query(Employee)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Employee.full_name.ilike(pattern)) | (Employee.email.ilike(pattern))
        )
    return query.order_by(Employee.full_name).offset(skip).limit(limit).all()


def get_employee(db: Session, employee_id: int) -> Employee | None:
    return db.query(Employee).filter(Employee.id == employee_id).first()


def create_employee(db: Session, data: EmployeeCreate) -> Employee:
    obj = Employee(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate) -> Employee | None:
    obj = db.query(Employee).filter(Employee.id == employee_id).first()
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def count_employees(db: Session) -> int:
    return db.query(Employee).count()
