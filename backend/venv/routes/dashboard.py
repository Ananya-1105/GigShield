import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import SessionLocal
from models.user import User
from models.claim import Claim
from models.policy import Policy
from utils.jwt_handler import get_current_user_id
from services.ai_pricing import compute_risk_score
from services.trigger_engine import check_user_zones

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/dashboard")
def get_dashboard(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    active_policy = (
        db.query(Policy)
        .filter(Policy.user_id == user_id, Policy.status == "active")
        .first()
    )

    total_claims = db.query(Claim).filter(Claim.user_id == user_id).count()
    approved_claims = (
        db.query(Claim)
        .filter(Claim.user_id == user_id, Claim.status == "approved")
        .count()
    )
    amount_received = (
        db.query(func.coalesce(func.sum(Claim.amount_approved), 0))
        .filter(Claim.user_id == user_id, Claim.status == "approved")
        .scalar()
    )

    recent_claims = (
        db.query(Claim)
        .filter(Claim.user_id == user_id)
        .order_by(Claim.filed_at.desc())
        .limit(5)
        .all()
    )

    risk_score, risk_message = compute_risk_score(user, active_policy, total_claims, approved_claims)

    # Live weather + trigger data for user's zones (real API calls)
    zone_data = check_user_zones(user.zones if user else None)

    result = {
        "name": user.name if user else "Rider",
        "rider_id": user.rider_id if user else "",
        "platform": user.platform if user else "",
        "activePolicy": active_policy.plan_type if active_policy else None,
        "totalClaims": total_claims,
        "approvedClaims": approved_claims,
        "amountReceived": float(amount_received),
        "riskScore": risk_score,
        "riskMessage": risk_message,
        "recentClaims": [
            {
                "id": c.id,
                "claim_number": c.claim_number,
                "claim_type": c.claim_type,
                "amount_requested": c.amount_requested,
                "filed_at": c.filed_at.isoformat() if c.filed_at else None,
                "status": c.status,
            }
            for c in recent_claims
        ],
        "zones": zone_data,
    }

    if active_policy:
        result["policy"] = {
            "plan_type": active_policy.plan_type,
            "coverage_amount": active_policy.coverage_amount,
            "premium_amount": active_policy.premium_amount,
            "start_date": active_policy.start_date.isoformat() if active_policy.start_date else None,
            "end_date": active_policy.end_date.isoformat() if active_policy.end_date else None,
            "status": active_policy.status,
        }

    return result
