"""
Pydantic schemas for the Kiosk entity.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class KioskStatusEnum(str, Enum):
    STOCK = "STOCK"
    ASSIGNED = "ASSIGNED"
    REPAIR = "REPAIR"
    SCRAP = "SCRAP"


class KioskBase(BaseModel):
    hostname: str = Field(..., max_length=150, examples=["KIOSK-001"])
    serial_no: str = Field(..., max_length=100, examples=["KSK-2024-00001"])
    wifi_mac: Optional[str] = Field(None, max_length=50, examples=["AA:BB:CC:DD:EE:FF"])
    ethernet_mac: Optional[str] = Field(None, max_length=50, examples=["11:22:33:44:55:66"])
    tesis: Optional[str] = Field(None, max_length=150, examples=["Merkez Bina"])
    lokasyon: Optional[str] = Field(None, max_length=150, examples=["Kat 3 - Giriş"])
    status: KioskStatusEnum = KioskStatusEnum.STOCK
    fault_description: Optional[str] = Field(None, max_length=500, examples=["Ekran arızası"])


class KioskCreate(KioskBase):
    pass


class KioskUpdate(BaseModel):
    hostname: Optional[str] = Field(None, max_length=150)
    serial_no: Optional[str] = Field(None, max_length=100)
    wifi_mac: Optional[str] = Field(None, max_length=50)
    ethernet_mac: Optional[str] = Field(None, max_length=50)
    tesis: Optional[str] = Field(None, max_length=150)
    lokasyon: Optional[str] = Field(None, max_length=150)
    status: Optional[KioskStatusEnum] = None
    fault_description: Optional[str] = Field(None, max_length=500)


class KioskResponse(KioskBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
