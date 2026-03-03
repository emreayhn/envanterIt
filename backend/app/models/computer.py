"""
Computer (asset) model.
"""

import enum
from sqlalchemy import Column, Integer, String, Enum, JSON, DateTime, func
from app.core.database import Base


class ComputerStatus(str, enum.Enum):
    STOCK = "STOCK"
    ASSIGNED = "ASSIGNED"
    REPAIR = "REPAIR"
    SCRAP = "SCRAP"


class Computer(Base):
    __tablename__ = "computers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    computer_name = Column(String(150), nullable=True, comment="Hostname / bilgisayar adı")
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    serial_no = Column(String(100), unique=True, nullable=False, index=True)
    wifi_mac = Column(String(50), nullable=True, comment="Wi-Fi MAC adresi")
    ethernet_mac = Column(String(50), nullable=True, comment="Ethernet MAC adresi")
    tesis = Column(String(150), nullable=True, comment="Tesis adı")
    lokasyon = Column(String(150), nullable=True, comment="Lokasyon bilgisi")
    company = Column(String(150), nullable=True, comment="Firma")
    specifications = Column(JSON, nullable=True, comment="e.g. {ram: '16GB', cpu: 'i7-13700'}")
    status = Column(
        Enum(ComputerStatus),
        nullable=False,
        default=ComputerStatus.STOCK,
        server_default="STOCK",
    )
    fault_description = Column(String(500), nullable=True, comment="Arıza açıklaması")
    created_at = Column(DateTime, server_default=func.now())
