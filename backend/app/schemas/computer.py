"""
Pydantic schemas for the Computer entity.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ComputerStatusEnum(str, Enum):
    STOCK = "STOCK"
    ASSIGNED = "ASSIGNED"
    REPAIR = "REPAIR"
    SCRAP = "SCRAP"


class ComputerBase(BaseModel):
    computer_name: Optional[str] = Field(None, max_length=150, examples=["PC-IT-001"])
    brand: str = Field(..., max_length=100, examples=["Dell"])
    model: str = Field(..., max_length=100, examples=["Latitude 5540"])
    serial_no: str = Field(..., max_length=100, examples=["SN-2024-00123"])
    wifi_mac: Optional[str] = Field(None, max_length=50, examples=["AA:BB:CC:DD:EE:FF"])
    ethernet_mac: Optional[str] = Field(None, max_length=50, examples=["11:22:33:44:55:66"])
    tesis: Optional[str] = Field(None, max_length=150, examples=["Merkez Bina"])
    lokasyon: Optional[str] = Field(None, max_length=150, examples=["Kat 3 - IT Odası"])
    specifications: Optional[dict] = Field(None, examples=[{"ram": "16GB", "cpu": "i7-13700"}])
    status: ComputerStatusEnum = ComputerStatusEnum.STOCK
    fault_description: Optional[str] = Field(None, max_length=500, examples=["Ekran arızası"])


class ComputerCreate(ComputerBase):
    pass


class ComputerUpdate(BaseModel):
    computer_name: Optional[str] = Field(None, max_length=150)
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_no: Optional[str] = Field(None, max_length=100)
    wifi_mac: Optional[str] = Field(None, max_length=50)
    ethernet_mac: Optional[str] = Field(None, max_length=50)
    tesis: Optional[str] = Field(None, max_length=150)
    lokasyon: Optional[str] = Field(None, max_length=150)
    specifications: Optional[dict] = None
    status: Optional[ComputerStatusEnum] = None
    fault_description: Optional[str] = Field(None, max_length=500)


class ComputerResponse(ComputerBase):
    id: int
    created_at: Optional[datetime] = None
    assigned_to: Optional[str] = None

    class Config:
        from_attributes = True
