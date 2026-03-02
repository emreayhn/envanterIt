"""
Pydantic schemas for the Printer entity.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class PrinterStatusEnum(str, Enum):
    STOCK = "STOCK"
    ASSIGNED = "ASSIGNED"
    REPAIR = "REPAIR"
    SCRAP = "SCRAP"


class PrinterBase(BaseModel):
    printer_name: Optional[str] = Field(None, max_length=150, examples=["YZC-IT-001"])
    brand: str = Field(..., max_length=100, examples=["HP"])
    model: str = Field(..., max_length=100, examples=["LaserJet Pro M404n"])
    serial_no: str = Field(..., max_length=100, examples=["SN-PRN-2024-001"])
    wifi_mac: Optional[str] = Field(None, max_length=50, examples=["AA:BB:CC:DD:EE:FF"])
    ethernet_mac: Optional[str] = Field(None, max_length=50, examples=["11:22:33:44:55:66"])
    tesis: Optional[str] = Field(None, max_length=150, examples=["Merkez Bina"])
    lokasyon: Optional[str] = Field(None, max_length=150, examples=["Kat 2 - Muhasebe"])
    status: PrinterStatusEnum = PrinterStatusEnum.STOCK
    fault_description: Optional[str] = Field(None, max_length=500, examples=["Kağıt sıkışması"])


class PrinterCreate(PrinterBase):
    pass


class PrinterUpdate(BaseModel):
    printer_name: Optional[str] = Field(None, max_length=150)
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_no: Optional[str] = Field(None, max_length=100)
    wifi_mac: Optional[str] = Field(None, max_length=50)
    ethernet_mac: Optional[str] = Field(None, max_length=50)
    tesis: Optional[str] = Field(None, max_length=150)
    lokasyon: Optional[str] = Field(None, max_length=150)
    status: Optional[PrinterStatusEnum] = None
    fault_description: Optional[str] = Field(None, max_length=500)


class PrinterResponse(PrinterBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
