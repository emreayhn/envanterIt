"""
Software license model.
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, func
from app.core.database import Base


class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    software_name = Column(String(150), nullable=False)
    license_key = Column(String(255), nullable=False)
    expiration_date = Column(Date, nullable=True)
    total_seats = Column(Integer, nullable=False, default=1)
    used_seats = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
