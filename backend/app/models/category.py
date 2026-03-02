"""
Inventory Category model — stores dynamic category definitions.
"""

from sqlalchemy import Column, Integer, String, JSON, DateTime, func
from app.core.database import Base


class InventoryCategory(Base):
    __tablename__ = "inventory_categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, comment="Gösterim adı: Monitörler")
    slug = Column(String(150), unique=True, nullable=False, index=True, comment="URL slug: monitorler")
    columns = Column(JSON, nullable=False, comment='Seçilen kolonlar: ["name","brand","serial_no"]')
    color = Column(String(30), nullable=True, default="#6366f1")
    created_at = Column(DateTime, server_default=func.now())
