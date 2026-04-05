import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import SessionLocal
from models.user import User
from schemas import SignupRequest, LoginRequest, OtpRequest, OtpVerifyRequest, UpiSetup, RazorpayOrder
from utils.jwt_handler import create_access_token, get_current_user_id
from services.otp_service import send_otp, verify_otp
from services.razorpay_service import create_order, verify_payment, validate_upi_id
from services.ai_pricing import PLANS

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── OTP Endpoints ──

@router.post("/otp/send")
def request_otp(data: OtpRequest):
    """Send OTP to phone number for signup/login verification."""
    if not data.phone or len(data.phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    result = send_otp(data.phone)
    return result


@router.post("/otp/verify")
def check_otp(data: OtpVerifyRequest):
    """Verify OTP entered by user."""
    result = verify_otp(data.phone, data.otp)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


# ── Auth Endpoints ──

@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    existing_phone = db.query(User).filter(User.phone == data.phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    existing_rider = db.query(User).filter(User.rider_id == data.rider_id).first()
    if existing_rider:
        raise HTTPException(status_code=400, detail="Rider ID already registered")

    hashed_password = pwd_context.hash(data.password)
    zones_json = None
    if data.zones:
        zones_json = json.dumps([z.model_dump() for z in data.zones])

    user = User(
        name=data.name,
        phone=data.phone,
        rider_id=data.rider_id,
        password=hashed_password,
        role=data.role or "worker",
        platform=data.platform or "Swiggy",
        zones=zones_json,
        upi_id=data.upi_id,
        phone_verified=True,  # Verified via OTP before signup
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"user_id": user.id, "role": user.role})
    return {"token": token, "role": user.role, "name": user.name}


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == data.phone).first()
    if not user or not pwd_context.verify(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid phone number or password")

    token = create_access_token({"user_id": user.id, "role": user.role})
    return {"token": token, "role": user.role, "name": user.name}


# ── UPI Endpoints ──

@router.post("/upi/validate")
def validate_upi(data: UpiSetup):
    """Validate a UPI VPA format."""
    result = validate_upi_id(data.upi_id)
    if not result["valid"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/upi/setup")
def setup_upi(data: UpiSetup, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Save UPI ID for a user (for payouts)."""
    result = validate_upi_id(data.upi_id)
    if not result["valid"]:
        raise HTTPException(status_code=400, detail=result["message"])

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.upi_id = data.upi_id
    db.commit()
    return {"success": True, "upi_id": data.upi_id, "message": "UPI ID saved for payouts."}


# ── Razorpay Endpoints ──

@router.post("/razorpay/create-order")
def razorpay_create_order(data: RazorpayOrder):
    """Create a Razorpay order for plan payment."""
    plan = PLANS.get(data.plan_type)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan type")

    amount_paise = plan["weekly"] * 100  # Convert Rs to paise
    order = create_order(amount_paise, data.rider_id, data.plan_type)
    return order
