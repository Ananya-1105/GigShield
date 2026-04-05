from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    claim_number = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    claim_type = Column(String, nullable=False)
    description = Column(String, nullable=True)
    document_url = Column(String, nullable=True)
    amount_requested = Column(Float, nullable=False)
    amount_approved = Column(Float, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    bcs_score = Column(Integer, nullable=True)       # Behavioural Coherence Score 0-100
    bcs_action = Column(String, nullable=True)        # auto_approve / soft_flag / hard_flag
    payout_percentage = Column(Integer, nullable=True) # 100 / 50 / 0
    ai_review_note = Column(String, nullable=True)    # AI explanation
    status = Column(String, default="pending")         # approved, soft_flagged, under_review, rejected
    filed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="claims")
