"""
Kiosk (self-service kiosk device) model.
"""

import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, func
from app.core.database import Base


class KioskStatus(str, enum.Enum):
    STOCK = "STOCK"
    ASSIGNED = "ASSIGNED"
    REPAIR = "REPAIR"
    SCRAP = "SCRAP"


class Kiosk(Base):
    __tablename__ = "kiosks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hostname = Column(String(150), nullable=False, comment="Kiosk hostname")
    serial_no = Column(String(100), unique=True, nullable=False, index=True)
    wifi_mac = Column(String(50), nullable=True, comment="Wi-Fi MAC adresi")
    ethernet_mac = Column(String(50), nullable=True, comment="Ethernet MAC adresi")
    tesis = Column(String(150), nullable=True, comment="Tesis adı")
    lokasyon = Column(String(150), nullable=True, comment="Lokasyon bilgisi")
    status = Column(
        Enum(KioskStatus),
        nullable=False,
        default=KioskStatus.STOCK,
        server_default="STOCK",
    )
    fault_description = Column(String(500), nullable=True, comment="Arıza açıklaması")
    created_at = Column(DateTime, server_default=func.now())
