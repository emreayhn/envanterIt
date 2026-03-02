"""
Pydantic schemas for InventoryCategory.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=150, examples=["Monitörler"])
    slug: str = Field(..., max_length=150, examples=["monitorler"])
    columns: list[str] = Field(..., examples=[["name", "brand", "model", "serial_no"]])
    color: Optional[str] = Field("#6366f1", max_length=30)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    columns: Optional[list[str]] = None
    color: Optional[str] = Field(None, max_length=30)


class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    columns: list[str]
    color: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
