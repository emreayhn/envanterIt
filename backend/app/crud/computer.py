"""
CRUD operations for the Computer entity.
"""

from sqlalchemy.orm import Session
from app.models.computer import Computer, ComputerStatus
from app.schemas.computer import ComputerCreate, ComputerUpdate


def get_computers(
    db: Session,
    skip: int = 0,
    limit: int = 2000,
    status: ComputerStatus | None = None,
    search: str | None = None,
):
    query = db.query(Computer)
    if status:
        query = query.filter(Computer.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Computer.brand.ilike(pattern))
            | (Computer.model.ilike(pattern))
            | (Computer.serial_no.ilike(pattern))
        )
    return query.order_by(Computer.id.desc()).offset(skip).limit(limit).all()


def get_computer(db: Session, computer_id: int) -> Computer | None:
    return db.query(Computer).filter(Computer.id == computer_id).first()


def create_computer(db: Session, data: ComputerCreate) -> Computer:
    obj = Computer(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_computer(db: Session, computer_id: int, data: ComputerUpdate) -> Computer | None:
    obj = db.query(Computer).filter(Computer.id == computer_id).first()
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_computer(db: Session, computer_id: int) -> bool:
    obj = db.query(Computer).filter(Computer.id == computer_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def count_computers(db: Session, status: ComputerStatus | None = None) -> int:
    query = db.query(Computer)
    if status:
        query = query.filter(Computer.status == status)
    return query.count()


def count_faulty_computers(db: Session) -> int:
    return db.query(Computer).filter(Computer.fault_description != None, Computer.fault_description != "").count()


def get_recent_computers(db: Session, limit: int = 5):
    return db.query(Computer).order_by(Computer.created_at.desc()).limit(limit).all()
