"""
Inventory Categories + Items API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, CurrentUser
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.category_item import ItemCreate, ItemUpdate, ItemResponse
from app.crud import category as cat_crud
from app.crud import category_item as item_crud
from app.crud.audit_log import create_audit_log
from app.models.category_item import InventoryItem

router = APIRouter(prefix="/categories", tags=["Dynamic Categories"])


# ── Categories ────────────────────────────────────────────

@router.get("/", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return cat_crud.get_categories(db)


@router.get("/{slug}", response_model=CategoryResponse)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    obj = cat_crud.get_category_by_slug(db, slug)
    if not obj:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return obj


@router.post("/", response_model=CategoryResponse, status_code=201)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    existing = cat_crud.get_category_by_slug(db, data.slug)
    if existing:
        raise HTTPException(status_code=409, detail=f"Bu slug zaten kullanılıyor: {data.slug}")
    obj = cat_crud.create_category(db, data)
    create_audit_log(db, action="CREATE_CATEGORY", user_email=user.email, details=f"Created category: {obj.name}")
    return obj


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = cat_crud.update_category(db, category_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return obj


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    cat = cat_crud.get_category(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    create_audit_log(db, action="DELETE_CATEGORY", user_email=user.email, details=f"Deleted category: {cat.name}")
    cat_crud.delete_category(db, category_id)
    return {"detail": "Deleted"}


# ── Items ─────────────────────────────────────────────────

@router.get("/{slug}/items", response_model=list[ItemResponse])
def list_items(
    slug: str,
    skip: int = 0,
    limit: int = 200,
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    cat = cat_crud.get_category_by_slug(db, slug)
    if not cat:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return item_crud.get_items(db, category_id=cat.id, skip=skip, limit=limit, search=search)


@router.post("/{slug}/items", response_model=ItemResponse, status_code=201)
def create_item(
    slug: str,
    data: ItemCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    cat = cat_crud.get_category_by_slug(db, slug)
    if not cat:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    # Ensure category_id matches
    data.category_id = cat.id
    # Check unique serial within category
    existing = db.query(InventoryItem).filter(
        InventoryItem.category_id == cat.id,
        InventoryItem.serial_no == data.serial_no,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Bu seri numarası zaten kayıtlı: {data.serial_no}")
    obj = item_crud.create_item(db, data)
    create_audit_log(db, action="CREATE_ITEM", user_email=user.email, details=f"[{cat.name}] {data.serial_no}")
    return obj


@router.post("/{slug}/items/bulk", status_code=201)
def bulk_create_items(
    slug: str,
    items: list[ItemCreate],
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    cat = cat_crud.get_category_by_slug(db, slug)
    if not cat:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    created = []
    skipped = []
    for data in items:
        data.category_id = cat.id
        existing = db.query(InventoryItem).filter(
            InventoryItem.category_id == cat.id,
            InventoryItem.serial_no == data.serial_no,
        ).first()
        if existing:
            skipped.append(data.serial_no)
            continue
        obj = item_crud.create_item(db, data)
        created.append(obj)
    if created:
        create_audit_log(db, action="BULK_CREATE_ITEMS", user_email=user.email, details=f"[{cat.name}] {len(created)} items")
    return {"created_count": len(created), "skipped_count": len(skipped), "skipped_serials": skipped}


@router.put("/items/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: int,
    data: ItemUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = item_crud.update_item(db, item_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    create_audit_log(db, action="UPDATE_ITEM", user_email=user.email, details=f"Updated item id={item_id}")
    return obj


@router.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    obj = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı")
    create_audit_log(db, action="DELETE_ITEM", user_email=user.email, details=f"Deleted item {obj.serial_no}")
    item_crud.delete_item(db, item_id)
    return {"detail": "Deleted"}
