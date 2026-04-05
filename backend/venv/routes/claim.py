import random
import string
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models.claim import Claim
from models.user import User
from models.policy import Policy
from schemas import ClaimCreate
from utils.jwt_handler import get_current_user_id
from services.fraud_detection import compute_bcs, compute_ai_confidence
from services.trigger_engine import check_triggers_for_location

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_claim_number() -> str:
    suffix = "".join(random.choices(string.digits, k=6))
    return f"CLM-{suffix}"


@router.get("/claims")
def get_claims(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    claims = (
        db.query(Claim)
        .filter(Claim.user_id == user_id)
        .order_by(Claim.filed_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "claim_number": c.claim_number,
            "claim_type": c.claim_type,
            "description": c.description,
            "amount_requested": c.amount_requested,
            "amount_approved": c.amount_approved,
            "ai_confidence": c.ai_confidence,
            "bcs_score": c.bcs_score,
            "bcs_action": c.bcs_action,
            "payout_percentage": c.payout_percentage,
            "ai_review_note": c.ai_review_note,
            "status": c.status,
            "filed_at": c.filed_at.isoformat() if c.filed_at else None,
            "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
        }
        for c in claims
    ]


@router.post("/claims")
def create_claim(
    data: ClaimCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check active policy
    active_policy = (
        db.query(Policy)
        .filter(Policy.user_id == user_id, Policy.status == "active")
        .first()
    )
    if not active_policy:
        raise HTTPException(status_code=400, detail="No active policy. Purchase a plan first.")

    # ── Step 1: Run full BCS (Behavioural Coherence Engine) ──
    bcs = compute_bcs(data.claim_type, data.amount_requested, data.description)
    ai_confidence = compute_ai_confidence(data.claim_type, data.amount_requested, data.description)

    bcs_score = bcs["bcs_score"]
    bcs_action = bcs["action"]
    payout_pct = bcs["payout_percentage"]
    is_parametric = bcs["is_parametric"]

    # ── Step 2: Cross-check with live weather if parametric ──
    weather_confirmed = False
    weather_note = ""
    if is_parametric and user.zones:
        try:
            zones = json.loads(user.zones)
            for z in zones:
                lat, lng = z.get("lat", 0), z.get("lng", 0)
                if lat and lng:
                    trigger_result = check_triggers_for_location(lat, lng, z.get("name", ""))
                    if trigger_result.get("active_triggers"):
                        for t in trigger_result["active_triggers"]:
                            if _trigger_matches_claim(t["id"], data.claim_type):
                                weather_confirmed = True
                                weather_note = f"Confirmed: {t['name']} at {z.get('name', '')} — {t['details']}"
                                break
                if weather_confirmed:
                    break
        except (json.JSONDecodeError, TypeError):
            pass

    # ── Step 3: Determine final status per README thresholds ──
    now = datetime.now(timezone.utc)

    if bcs_score >= 75:
        # AUTO APPROVE — full payout in 2 minutes
        if weather_confirmed:
            status = "approved"
            amount_approved = data.amount_requested
            payout_pct = 100
            review_note = (
                f"AUTO-APPROVED by AI. BCS Score: {bcs_score}/100. "
                f"Weather cross-check: {weather_note}. "
                f"7-stream verification passed. Full payout of Rs {data.amount_requested} processed."
            )
        else:
            # BCS high but no live weather confirmation — still approve for parametric
            status = "approved"
            amount_approved = data.amount_requested
            payout_pct = 100
            review_note = (
                f"AUTO-APPROVED by AI. BCS Score: {bcs_score}/100. "
                f"AI confidence: {ai_confidence*100:.0f}%. "
                f"All 7 BCE streams within normal range. Payout processed."
            )

    elif bcs_score >= 40:
        # SOFT FLAG — 50% now, rest after 4-hour review
        status = "soft_flagged"
        amount_approved = round(data.amount_requested * 0.5, 2)
        payout_pct = 50
        review_note = (
            f"SOFT-FLAGGED by AI. BCS Score: {bcs_score}/100. "
            f"Minor inconsistencies detected in BCE streams. "
            f"Partial payout of Rs {amount_approved} (50%) released immediately. "
            f"Remaining Rs {round(data.amount_requested * 0.5, 2)} pending 4-hour review. "
            f"{'Weather confirmed: ' + weather_note if weather_confirmed else 'No live weather trigger detected at your zones.'}"
        )

    else:
        # HARD FLAG — no auto payout, manual review within 24 hours
        status = "under_review"
        amount_approved = None
        payout_pct = 0
        review_note = (
            f"FLAGGED FOR REVIEW. BCS Score: {bcs_score}/100. "
            f"Significant anomalies in BCE analysis. "
            f"Claim queued for manual review within 24 hours. "
            f"No penalty if claim is genuine. "
            f"{'Weather data: ' + weather_note if weather_confirmed else 'No matching weather event detected.'}"
        )

    # ── Step 4: Save claim with full AI evaluation ──
    claim = Claim(
        claim_number=generate_claim_number(),
        user_id=user_id,
        claim_type=data.claim_type,
        description=data.description,
        document_url=data.document_url,
        amount_requested=data.amount_requested,
        amount_approved=amount_approved,
        ai_confidence=ai_confidence,
        bcs_score=bcs_score,
        bcs_action=bcs_action,
        payout_percentage=payout_pct,
        ai_review_note=review_note,
        status=status,
        filed_at=now,
        reviewed_at=now if status == "approved" else None,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    # Build response
    response = {
        "id": claim.id,
        "claim_number": claim.claim_number,
        "status": claim.status,
        "ai_confidence": claim.ai_confidence,
        "bcs_score": claim.bcs_score,
        "bcs_action": claim.bcs_action,
        "payout_percentage": claim.payout_percentage,
        "amount_approved": claim.amount_approved,
        "ai_review_note": claim.ai_review_note,
        "streams_checked": list(bcs["streams"].keys()),
    }

    return response


def _trigger_matches_claim(trigger_id: str, claim_type: str) -> bool:
    """Check if a weather trigger ID matches the claim type."""
    mapping = {
        "heavy_rain": "Heavy Rain / Flood",
        "extreme_heat": "Extreme Heat",
        "severe_aqi": "Severe Air Quality",
        "civic_disruption": "Civic Disruption",
        "cyclone": "Cyclone / Disaster",
    }
    return mapping.get(trigger_id) == claim_type
