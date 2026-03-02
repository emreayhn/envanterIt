"""
Printer (yazıcı) model.
"""

import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, func
from app.core.database import Base


class PrinterStatus(str, enum.Enum):
    STOCK = "STOCK"
    ASSIGNED = "ASSIGNED"
    REPAIR = "REPAIR"
    SCRAP = "SCRAP"


class Printer(Base):
    __tablename__ = "printers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    printer_name = Column(String(150), nullable=True, comment="Yazıcı adı")
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    serial_no = Column(String(100), unique=True, nullable=False, index=True)
    wifi_mac = Column(String(50), nullable=True, comment="Wi-Fi MAC adresi")
    ethernet_mac = Column(String(50), nullable=True, comment="Ethernet MAC adresi")
    tesis = Column(String(150), nullable=True, comment="Tesis adı")
    lokasyon = Column(String(150), nullable=True, comment="Lokasyon bilgisi")
    status = Column(
        Enum(PrinterStatus),
        nullable=False,
        default=PrinterStatus.STOCK,
        server_default="STOCK",
    )
    fault_description = Column(String(500), nullable=True, comment="Arıza açıklaması")
    created_at = Column(DateTime, server_default=func.now())
