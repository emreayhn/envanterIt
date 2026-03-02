"""
Pydantic schemas for the Employee entity.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class EmployeeBase(BaseModel):
    full_name: str = Field(..., max_length=150, examples=["Emre Ayhan"])
    email: str = Field(..., max_length=150, examples=["emre.ayhan@company.com"])
    department: Optional[str] = Field(None, max_length=100, examples=["IT"])
    location: Optional[str] = Field(None, max_length=150, examples=["İstanbul"])
    phone: Optional[str] = Field(None, max_length=50, examples=["+90 555 123 4567"])
    company: Optional[str] = Field(None, max_length=150, examples=["ABC Teknoloji"])


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None


class EmployeeResponse(EmployeeBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
