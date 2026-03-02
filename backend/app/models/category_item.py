"""
Inventory Item model — generic items for dynamic categories.
All possible columns exist; category config determines which are shown.
"""

import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, func
from app.core.database import Base


class ItemStatus(str, enum.Enum):
    STOCK = "STOCK"
    ASSIGNED = "ASSIGNED"
    REPAIR = "REPAIR"
    SCRAP = "SCRAP"


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("inventory_categories.id", ondelete="CASCADE"), nullable=False, index=True)

    # All possible data columns
    name = Column(String(200), nullable=True, comment="Cihaz adı")
    brand = Column(String(150), nullable=True, comment="Marka")
    model = Column(String(150), nullable=True, comment="Model")
    serial_no = Column(String(150), nullable=False, index=True, comment="Seri numarası")
    ram = Column(String(50), nullable=True, comment="RAM")
    cpu = Column(String(100), nullable=True, comment="CPU")
    wifi_mac = Column(String(50), nullable=True, comment="Wi-Fi MAC")
    ethernet_mac = Column(String(50), nullable=True, comment="Ethernet MAC")
    tesis = Column(String(150), nullable=True, comment="Tesis")
    lokasyon = Column(String(150), nullable=True, comment="Lokasyon")

    status = Column(
        Enum(ItemStatus),
        nullable=False,
        default=ItemStatus.STOCK,
        server_default="STOCK",
    )
    fault_description = Column(String(500), nullable=True, comment="Arıza açıklaması")
    created_at = Column(DateTime, server_default=func.now())
