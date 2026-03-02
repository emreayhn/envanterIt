"""
Pydantic schemas for InventoryItem (dynamic category items).
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ItemStatusEnum(str, Enum):
    STOCK = "STOCK"
    ASSIGNED = "ASSIGNED"
    REPAIR = "REPAIR"
    SCRAP = "SCRAP"


class ItemCreate(BaseModel):
    category_id: int
    name: Optional[str] = Field(None, max_length=200)
    brand: Optional[str] = Field(None, max_length=150)
    model: Optional[str] = Field(None, max_length=150)
    serial_no: str = Field(..., max_length=150)
    ram: Optional[str] = Field(None, max_length=50)
    cpu: Optional[str] = Field(None, max_length=100)
    wifi_mac: Optional[str] = Field(None, max_length=50)
    ethernet_mac: Optional[str] = Field(None, max_length=50)
    tesis: Optional[str] = Field(None, max_length=150)
    lokasyon: Optional[str] = Field(None, max_length=150)
    status: ItemStatusEnum = ItemStatusEnum.STOCK
    fault_description: Optional[str] = Field(None, max_length=500)


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    brand: Optional[str] = Field(None, max_length=150)
    model: Optional[str] = Field(None, max_length=150)
    serial_no: Optional[str] = Field(None, max_length=150)
    ram: Optional[str] = Field(None, max_length=50)
    cpu: Optional[str] = Field(None, max_length=100)
    wifi_mac: Optional[str] = Field(None, max_length=50)
    ethernet_mac: Optional[str] = Field(None, max_length=50)
    tesis: Optional[str] = Field(None, max_length=150)
    lokasyon: Optional[str] = Field(None, max_length=150)
    status: Optional[ItemStatusEnum] = None
    fault_description: Optional[str] = Field(None, max_length=500)


class ItemResponse(BaseModel):
    id: int
    category_id: int
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_no: str
    ram: Optional[str] = None
    cpu: Optional[str] = None
    wifi_mac: Optional[str] = None
    ethernet_mac: Optional[str] = None
    tesis: Optional[str] = None
    lokasyon: Optional[str] = None
    status: ItemStatusEnum
    fault_description: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
