"""
CRUD operations for the License entity.
"""

from datetime import date
from sqlalchemy.orm import Session
from app.models.license import License
from app.schemas.license import LicenseCreate, LicenseUpdate


def get_licenses(db: Session, skip: int = 0, limit: int = 2000):
    return db.query(License).order_by(License.id.desc()).offset(skip).limit(limit).all()


def get_license(db: Session, license_id: int) -> License | None:
    return db.query(License).filter(License.id == license_id).first()


def create_license(db: Session, data: LicenseCreate) -> License:
    obj = License(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_license(db: Session, license_id: int, data: LicenseUpdate) -> License | None:
    obj = db.query(License).filter(License.id == license_id).first()
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj



def delete_license(db: Session, license_id: int) -> bool:
    obj = db.query(License).filter(License.id == license_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def count_expiring_licenses(db: Session) -> int:
    """Count licenses that have already expired or expire today."""
    return (
        db.query(License)
        .filter(License.expiration_date != None)  # noqa: E711
        .filter(License.expiration_date <= date.today())
        .count()
    )
