"""
Dashboard statistics endpoint.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from app.core.database import get_db
from app.models.computer import Computer, ComputerStatus
from app.models.employee import Employee
from app.models.kiosk import Kiosk
from app.models.printer import Printer
from app.models.license import License
from app.models.category import InventoryCategory
from app.models.category_item import InventoryItem
from app.crud.computer import count_computers, count_faulty_computers
from app.crud.license import count_expiring_licenses
from app.crud.employee import count_employees


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    # Fixed stats
    stats = {
        "total_computers": count_computers(db),
        "stock_computers": count_computers(db, status=ComputerStatus.STOCK),
        "assigned_computers": count_computers(db, status=ComputerStatus.ASSIGNED),
        "faulty_computers": count_faulty_computers(db),
        "expiring_licenses": count_expiring_licenses(db),
        "total_employees": count_employees(db),
        "total_kiosks": db.query(Kiosk).count(),
        "total_printers": db.query(Printer).count(),
        "total_licenses": db.query(License).count(),
    }

    # Dynamic category stats
    categories = db.query(InventoryCategory).all()
    dynamic_categories = []
    for cat in categories:
        item_count = db.query(InventoryItem).filter(InventoryItem.category_id == cat.id).count()
        dynamic_categories.append({
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "color": cat.color or "#6366f1",
            "count": item_count,
        })

    stats["dynamic_categories"] = dynamic_categories
    return stats
