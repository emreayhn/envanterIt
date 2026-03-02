"""
Pydantic schemas for the License entity.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class LicenseBase(BaseModel):
    software_name: str = Field(..., max_length=150, examples=["Microsoft Office 365"])
    license_key: str = Field(..., max_length=255, examples=["XXXXX-XXXXX-XXXXX"])
    expiration_date: Optional[date] = None
    total_seats: int = Field(1, ge=1)
    used_seats: int = Field(0, ge=0)


class LicenseCreate(LicenseBase):
    pass


class LicenseUpdate(BaseModel):
    software_name: Optional[str] = Field(None, max_length=150)
    license_key: Optional[str] = Field(None, max_length=255)
    expiration_date: Optional[date] = None
    total_seats: Optional[int] = Field(None, ge=1)
    used_seats: Optional[int] = Field(None, ge=0)


class LicenseResponse(LicenseBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
