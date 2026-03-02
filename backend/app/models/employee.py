"""
Employee model.
"""

from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    department = Column(String(100), nullable=True)
    location = Column(String(150), nullable=True, comment="Çalışma lokasyonu")
    phone = Column(String(50), nullable=True, comment="Telefon numarası")
    company = Column(String(150), nullable=True, comment="Firma adı")
    created_at = Column(DateTime, server_default=func.now())
