"""
GigShield Razorpay Integration
- Test-mode UPI payment for plan purchase
- UPI VPA (Virtual Payment Address) collection
- In production: use real Razorpay keys and webhook verification

Razorpay Test Mode:
  - Use test key from .env
  - Test UPI ID: success@razorpay (always succeeds)
  - No real money is charged
"""

import os
import time
import hashlib
import hmac

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo_key")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "demo_secret")


def create_order(amount_paise: int, rider_id: str, plan_type: str) -> dict:
    """
    Create a Razorpay order for plan payment.
    In test mode: returns a simulated order object.
    In production: call razorpay.Order.create() with SDK.
    """
    order_id = f"order_GS{int(time.time())}{rider_id[-4:]}"

    return {
        "order_id": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "plan_type": plan_type,
        "prefill": {
            "method": "upi",
        },
        "notes": {
            "platform": "GigShield",
            "rider_id": rider_id,
            "plan": plan_type,
        },
    }


def verify_payment(order_id: str, payment_id: str, signature: str) -> dict:
    """
    Verify Razorpay payment signature.
    In test mode: always returns success.
    In production: verify HMAC SHA256 signature.
    """
    # In production, verify signature:
    # expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    # if expected != signature: return {"verified": False}

    return {
        "verified": True,
        "payment_id": payment_id,
        "order_id": order_id,
    }


def validate_upi_id(upi_id: str) -> dict:
    """
    Validate UPI VPA format.
    Format: username@bankhandle (e.g., rajesh@icici, 9876543210@paytm)
    """
    if not upi_id or "@" not in upi_id:
        return {"valid": False, "message": "Invalid UPI ID format. Expected: name@bank"}

    parts = upi_id.split("@")
    if len(parts) != 2 or len(parts[0]) < 1 or len(parts[1]) < 2:
        return {"valid": False, "message": "Invalid UPI ID format."}

    known_handles = [
        "paytm", "ybl", "ibl", "axl", "sbi", "icici", "hdfcbank",
        "okaxis", "okhdfcbank", "oksbi", "apl", "freecharge",
        "upi", "kotak", "barodampay", "razorpay",
    ]

    handle = parts[1].lower()
    # In test mode, accept any handle
    return {
        "valid": True,
        "upi_id": upi_id,
        "handle": handle,
        "message": f"UPI ID {upi_id} is valid.",
    }
