"""
Dashboard statistics endpoint.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.computer import ComputerStatus
from app.crud.computer import count_computers, count_faulty_computers
from app.crud.license import count_expiring_licenses
from app.crud.employee import count_employees


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    total_computers: int
    stock_computers: int
    assigned_computers: int
    faulty_computers: int
    expiring_licenses: int
    total_employees: int


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    return DashboardStats(
        total_computers=count_computers(db),
        stock_computers=count_computers(db, status=ComputerStatus.STOCK),
        assigned_computers=count_computers(db, status=ComputerStatus.ASSIGNED),
        faulty_computers=count_faulty_computers(db),
        expiring_licenses=count_expiring_licenses(db),
        total_employees=count_employees(db),
    )
