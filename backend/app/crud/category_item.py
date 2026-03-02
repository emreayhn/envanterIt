"""
CRUD operations for InventoryItem (dynamic category items).
"""

from sqlalchemy.orm import Session
from app.models.category_item import InventoryItem, ItemStatus
from app.schemas.category_item import ItemCreate, ItemUpdate


def get_items(
    db: Session,
    category_id: int,
    skip: int = 0,
    limit: int = 200,
    search: str | None = None,
):
    query = db.query(InventoryItem).filter(InventoryItem.category_id == category_id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (InventoryItem.name.ilike(pattern))
            | (InventoryItem.brand.ilike(pattern))
            | (InventoryItem.model.ilike(pattern))
            | (InventoryItem.serial_no.ilike(pattern))
        )
    return query.order_by(InventoryItem.id.desc()).offset(skip).limit(limit).all()


def get_item(db: Session, item_id: int):
    return db.query(InventoryItem).filter(InventoryItem.id == item_id).first()


def create_item(db: Session, data: ItemCreate):
    obj = InventoryItem(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_item(db: Session, item_id: int, data: ItemUpdate):
    obj = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not obj:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_item(db: Session, item_id: int) -> bool:
    obj = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True
