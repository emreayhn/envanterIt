"""
Pydantic schemas for the Assignment (zimmet) entity.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class AssignmentCreate(BaseModel):
    computer_id: int
    license_id: Optional[int] = None
    employee_id: int
    assigned_date: date = Field(default_factory=date.today)


class AssignmentResponse(BaseModel):
    id: int
    computer_id: int
    license_id: Optional[int] = None
    employee_id: int
    assigned_date: date
    assigned_by: str
    created_at: Optional[datetime] = None
    returned_date: Optional[date] = None

    # Nested details
    computer_name: Optional[str] = None
    computer_brand: Optional[str] = None
    computer_model: Optional[str] = None
    computer_serial: Optional[str] = None
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True
