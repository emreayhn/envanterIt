"""
Pydantic schemas for the Assignment (zimmet) entity.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import date, datetime


class AssignmentCreate(BaseModel):
    computer_id: Optional[int] = None
    kiosk_id:    Optional[int] = None
    printer_id:  Optional[int] = None
    item_id:     Optional[int] = None
    license_id:  Optional[int] = None
    employee_id: int
    assigned_date: date = Field(default_factory=date.today)

    @model_validator(mode="after")
    def exactly_one_item(self):
        ids = [self.computer_id, self.kiosk_id, self.printer_id, self.item_id]
        filled = [x for x in ids if x is not None]
        if len(filled) != 1:
            raise ValueError("computer_id, kiosk_id, printer_id veya item_id alanlarından tam olarak biri dolu olmalı.")
        return self


class AssignmentResponse(BaseModel):
    id: int
    computer_id:  Optional[int] = None
    kiosk_id:     Optional[int] = None
    printer_id:   Optional[int] = None
    item_id:      Optional[int] = None
    license_id:   Optional[int] = None
    employee_id:  int
    assigned_date: date
    assigned_by:  str
    created_at:   Optional[datetime] = None
    returned_date: Optional[date] = None

    item_type: Optional[str] = None  # "computer" | "kiosk" | "printer" | "category_item"

    # Computer
    computer_name:   Optional[str] = None
    computer_brand:  Optional[str] = None
    computer_model:  Optional[str] = None
    computer_serial: Optional[str] = None

    # Kiosk
    kiosk_hostname: Optional[str] = None
    kiosk_serial:   Optional[str] = None
    kiosk_tesis:    Optional[str] = None

    # Printer
    printer_name:   Optional[str] = None
    printer_brand:  Optional[str] = None
    printer_model:  Optional[str] = None
    printer_serial: Optional[str] = None

    # InventoryItem (dynamic category)
    item_name:        Optional[str] = None
    item_brand:       Optional[str] = None
    item_model:       Optional[str] = None
    item_serial:      Optional[str] = None
    item_category_id: Optional[int] = None
    item_category_name: Optional[str] = None

    employee_name: Optional[str] = None

    class Config:
        from_attributes = True
