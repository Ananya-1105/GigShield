from pydantic import BaseModel
from typing import Optional, List


class ZoneInfo(BaseModel):
    name: str
    lat: float
    lng: float
    admin1: Optional[str] = None  # State name


class SignupRequest(BaseModel):
    name: str
    phone: str
    rider_id: str
    password: str
    platform: Optional[str] = "Swiggy"
    zones: Optional[List[ZoneInfo]] = None
    upi_id: Optional[str] = None
    role: Optional[str] = "worker"


class LoginRequest(BaseModel):
    phone: str
    password: str


class OtpRequest(BaseModel):
    phone: str


class OtpVerifyRequest(BaseModel):
    phone: str
    otp: str


class ClaimCreate(BaseModel):
    claim_type: str
    amount_requested: float
    description: str
    document_url: Optional[str] = None


class ClaimUpdate(BaseModel):
    status: str
    amount_approved: Optional[float] = None


class PolicyPurchase(BaseModel):
    plan_type: str


class UpiSetup(BaseModel):
    upi_id: str


class RazorpayOrder(BaseModel):
    plan_type: str
    rider_id: str
