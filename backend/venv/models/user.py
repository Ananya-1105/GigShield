from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    rider_id = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="worker")
    platform = Column(String, nullable=True, default="Swiggy")
    zones = Column(String, nullable=True)  # JSON: [{"name":"...","pin":"..."},...]
    upi_id = Column(String, nullable=True)  # e.g. rajesh@icici
    phone_verified = Column(Boolean, default=False)
    vehicle = Column(String, nullable=True)
    avg_monthly_income = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    policies = relationship("Policy", back_populates="user", lazy="selectin")
    claims = relationship("Claim", back_populates="user", lazy="selectin")
