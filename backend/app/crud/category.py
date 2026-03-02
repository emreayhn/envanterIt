"""
CRUD operations for InventoryCategory.
"""

from sqlalchemy.orm import Session
from app.models.category import InventoryCategory
from app.schemas.category import CategoryCreate, CategoryUpdate


def get_categories(db: Session):
    return db.query(InventoryCategory).order_by(InventoryCategory.id).all()


def get_category(db: Session, category_id: int):
    return db.query(InventoryCategory).filter(InventoryCategory.id == category_id).first()


def get_category_by_slug(db: Session, slug: str):
    return db.query(InventoryCategory).filter(InventoryCategory.slug == slug).first()


def create_category(db: Session, data: CategoryCreate):
    obj = InventoryCategory(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_category(db: Session, category_id: int, data: CategoryUpdate):
    obj = db.query(InventoryCategory).filter(InventoryCategory.id == category_id).first()
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_category(db: Session, category_id: int) -> bool:
    obj = db.query(InventoryCategory).filter(InventoryCategory.id == category_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True
