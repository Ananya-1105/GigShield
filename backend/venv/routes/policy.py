import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.policy import Policy
from models.user import User
from schemas import PolicyPurchase
from utils.jwt_handler import get_current_user_id
from services.ai_pricing import get_plan_details

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_policy_number() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"GS-{suffix}"


@router.get("/policy")
def get_policy(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    policy = (
        db.query(Policy)
        .filter(Policy.user_id == user_id, Policy.status == "active")
        .order_by(Policy.start_date.desc())
        .first()
    )
    if not policy:
        return None

    return {
        "id": policy.id,
        "policy_number": policy.policy_number,
        "plan_type": policy.plan_type,
        "coverage_amount": policy.coverage_amount,
        "premium_amount": policy.premium_amount,
        "status": policy.status,
        "start_date": policy.start_date.isoformat() if policy.start_date else None,
        "end_date": policy.end_date.isoformat() if policy.end_date else None,
    }


@router.post("/policy/purchase")
def purchase_policy(
    data: PolicyPurchase,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(Policy)
        .filter(Policy.user_id == user_id, Policy.status == "active")
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active policy. Cancel it first.")

    plan = get_plan_details(data.plan_type)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan type")

    now = datetime.now(timezone.utc)
    policy = Policy(
        policy_number=generate_policy_number(),
        user_id=user_id,
        plan_type=plan["name"],
        coverage_amount=plan["coverage"],
        premium_amount=plan["premium"],
        status="active",
        start_date=now,
        end_date=now + timedelta(days=365),
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)

    return {
        "id": policy.id,
        "policy_number": policy.policy_number,
        "plan_type": policy.plan_type,
        "coverage_amount": policy.coverage_amount,
        "premium_amount": policy.premium_amount,
        "status": policy.status,
        "start_date": policy.start_date.isoformat(),
        "end_date": policy.end_date.isoformat(),
    }
