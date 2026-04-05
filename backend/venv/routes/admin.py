import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import SessionLocal
from models.user import User
from models.claim import Claim
from models.policy import Policy
from schemas import ClaimUpdate
from utils.jwt_handler import get_current_user_role

router = APIRouter(prefix="/admin")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_admin(auth: dict = Depends(get_current_user_role)):
    if auth["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return auth


@router.get("/stats")
def get_stats(auth: dict = Depends(require_admin), db: Session = Depends(get_db)):
    total_workers = db.query(User).filter(User.role == "worker").count()
    active_policies = db.query(Policy).filter(Policy.status == "active").count()
    pending_claims = db.query(Claim).filter(Claim.status == "pending").count()
    total_paid_out = (
        db.query(func.coalesce(func.sum(Claim.amount_approved), 0))
        .filter(Claim.status == "approved")
        .scalar()
    )
    return {
        "totalWorkers": total_workers,
        "activePolicies": active_policies,
        "pendingClaims": pending_claims,
        "totalPaidOut": float(total_paid_out),
    }


@router.get("/claims")
def get_all_claims(auth: dict = Depends(require_admin), db: Session = Depends(get_db)):
    claims = (
        db.query(Claim, User.name)
        .join(User, Claim.user_id == User.id)
        .order_by(Claim.filed_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "claim_number": c.claim_number,
            "worker_name": name,
            "claim_type": c.claim_type,
            "description": c.description,
            "amount_requested": c.amount_requested,
            "amount_approved": c.amount_approved,
            "ai_confidence": c.ai_confidence,
            "status": c.status,
            "filed_at": c.filed_at.isoformat() if c.filed_at else None,
        }
        for c, name in claims
    ]


@router.get("/workers")
def get_all_workers(auth: dict = Depends(require_admin), db: Session = Depends(get_db)):
    workers = db.query(User).filter(User.role == "worker").order_by(User.created_at.desc()).all()
    result = []
    for w in workers:
        active_policy = (
            db.query(Policy).filter(Policy.user_id == w.id, Policy.status == "active").first()
        )
        total_claims = db.query(Claim).filter(Claim.user_id == w.id).count()

        zones = []
        if w.zones:
            try:
                zones = json.loads(w.zones)
            except (json.JSONDecodeError, TypeError):
                pass

        result.append({
            "id": w.id,
            "name": w.name,
            "rider_id": w.rider_id,
            "platform": w.platform,
            "zones": zones,
            "policy_status": active_policy.status if active_policy else None,
            "policy_plan": active_policy.plan_type if active_policy else None,
            "total_claims": total_claims,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        })
    return result


@router.patch("/claims/{claim_id}")
def update_claim(
    claim_id: int,
    data: ClaimUpdate,
    auth: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim.status = data.status
    claim.reviewed_at = datetime.now(timezone.utc)
    if data.status == "approved":
        claim.amount_approved = data.amount_approved or claim.amount_requested

    db.commit()
    db.refresh(claim)
    return {"message": f"Claim {data.status} successfully", "id": claim.id, "status": claim.status}
