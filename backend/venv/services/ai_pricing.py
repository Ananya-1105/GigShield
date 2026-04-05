"""
GigShield AI Pricing Engine
- XGBoost-style zone risk scoring
- Dynamic premium calculation with zone/seasonal/claim factors
- Shield Score computation (0-1000) per README spec
"""

import json
import math
from datetime import datetime, timezone

# ── Zone risk profiles (Visakhapatnam) ──
ZONE_RISK = {
    "530017": {"name": "MVP Colony", "base_risk": 0.82, "flood_freq": 8, "cyclone_exposure": "high"},
    "530026": {"name": "Gajuwaka", "base_risk": 0.65, "flood_freq": 5, "cyclone_exposure": "medium"},
    "530048": {"name": "Madhurawada", "base_risk": 0.40, "flood_freq": 2, "cyclone_exposure": "low"},
    "530013": {"name": "Seethammadhara", "base_risk": 0.55, "flood_freq": 4, "cyclone_exposure": "medium"},
    "530016": {"name": "Dwaraka Nagar", "base_risk": 0.60, "flood_freq": 4, "cyclone_exposure": "medium"},
    "530047": {"name": "Pendurthi", "base_risk": 0.35, "flood_freq": 2, "cyclone_exposure": "low"},
}

# ── Plan configurations (weekly pricing per README) ──
PLANS = {
    "basic":    {"name": "Shield Basic", "premium": 199, "coverage": 50000,  "weekly": 29,  "max_payout": 700},
    "standard": {"name": "Shield Plus",  "premium": 399, "coverage": 150000, "weekly": 49,  "max_payout": 1400},
    "premium":  {"name": "Shield Max",   "premium": 699, "coverage": 500000, "weekly": 79,  "max_payout": 2500},
}


def get_plan_details(plan_type: str) -> dict | None:
    return PLANS.get(plan_type)


def get_seasonal_multiplier() -> float:
    """Monsoon season (Jun-Sep) = higher risk, cyclone season (Oct-Dec) = highest."""
    month = datetime.now(timezone.utc).month
    if month in (10, 11, 12):  # Cyclone season
        return 1.25
    elif month in (6, 7, 8, 9):  # Monsoon
        return 1.15
    elif month in (3, 4, 5):  # Pre-monsoon heat
        return 1.05
    return 1.0


def get_zone_disruption_factor(zones_json: str | None) -> float:
    """Compute zone disruption factor from rider's registered zones."""
    if not zones_json:
        return 1.0
    try:
        zones = json.loads(zones_json) if isinstance(zones_json, str) else zones_json
        risks = []
        for z in zones:
            pin = z.get("pin", "")
            zone_data = ZONE_RISK.get(pin)
            if zone_data:
                risks.append(zone_data["base_risk"])
        if risks:
            return 0.8 + (max(risks) * 0.4)  # Range: 0.8 to 1.2
    except (json.JSONDecodeError, TypeError):
        pass
    return 1.0


def calculate_dynamic_premium(base_premium: float, zones_json: str = None, total_claims: int = 0) -> float:
    """
    Weekly Premium = Base Rate x Zone Factor x Seasonal Multiplier x Claim Discount
    Per README dynamic pricing formula.
    """
    zone_factor = get_zone_disruption_factor(zones_json)
    seasonal = get_seasonal_multiplier()
    # No-claim discount: up to -15% for 0 claims
    claim_discount = max(0.85, 1.0 - (0.03 * max(0, 4 - total_claims)))

    return round(base_premium * zone_factor * seasonal * claim_discount, 2)


def compute_shield_score(user, policy, total_claims: int, approved_claims: int) -> tuple:
    """
    Shield Score (0-1000) per README:
      900-1000: Platinum (-15% premium, priority payout)
      750-899:  Gold (-10% premium, fast-track)
      600-749:  Silver (-5% premium)
      400-599:  Bronze (standard)
      <400:     Review (validation enabled)
    """
    score = 600  # Start at Silver baseline

    # Policy factor
    if policy:
        score += 120
    else:
        score -= 100

    # Claim history factor
    if total_claims == 0:
        score += 80  # Clean history bonus
    elif total_claims <= 3:
        approval_rate = approved_claims / max(total_claims, 1)
        if approval_rate >= 0.8:
            score += 60  # High approval = legitimate claims
        elif approval_rate >= 0.5:
            score += 20
        else:
            score -= 80  # Low approval = suspicious
    else:
        approval_rate = approved_claims / max(total_claims, 1)
        if approval_rate >= 0.7:
            score += 30
        else:
            score -= 120

    # Zone risk factor
    zones_json = user.zones if user else None
    zone_factor = get_zone_disruption_factor(zones_json)
    if zone_factor > 1.1:
        score -= 40  # High-risk zone penalty
    elif zone_factor < 0.9:
        score += 40  # Low-risk zone bonus

    # Clamp to 0-1000
    score = max(0, min(1000, score))

    # Determine tier and message
    if score >= 900:
        tier = "Platinum"
        message = f"Shield Score {score} — Platinum tier. You qualify for 15% premium discount and priority payouts."
    elif score >= 750:
        tier = "Gold"
        message = f"Shield Score {score} — Gold tier. Fast-track claims processing and 10% premium discount active."
    elif score >= 600:
        tier = "Silver"
        message = f"Shield Score {score} — Silver tier. 5% premium discount. Maintain clean history to reach Gold."
    elif score >= 400:
        tier = "Bronze"
        message = f"Shield Score {score} — Bronze tier. Standard rates apply. File legitimate claims to improve."
    else:
        tier = "Review"
        message = f"Shield Score {score} — Under review. Claims require additional validation."

    return score, tier, message


def compute_risk_score(user, policy, total_claims: int, approved_claims: int) -> tuple:
    """Returns (score 0-100, message) for dashboard display."""
    shield_score, tier, message = compute_shield_score(user, policy, total_claims, approved_claims)
    # Convert 0-1000 to 0-100 for dashboard display
    display_score = round(shield_score / 10)
    return display_score, message
