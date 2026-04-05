"""
GigShield OTP Service — Real SMS delivery via Fast2SMS

Setup:
  1. Sign up at https://www.fast2sms.com
  2. Get your API key from Dashboard → API Keys
  3. Add to .env: FAST2SMS_API_KEY=your_key_here

If FAST2SMS_API_KEY is not set, falls back to console-only mode
with a clear warning. The OTP is NOT returned in the API response
in production mode.
"""

import os
import random
import time
import requests
import logging

logger = logging.getLogger("gigshield.otp")

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")
FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"

# In-memory OTP store: { phone: { "otp": "123456", "expires": timestamp, "attempts": 0 } }
_otp_store: dict = {}

OTP_EXPIRY_SECONDS = 300  # 5 minutes
OTP_LENGTH = 6


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _clean_phone(phone: str) -> str:
    """Extract 10-digit Indian mobile number from various formats."""
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    return digits


def _send_sms(phone_10digit: str, otp: str) -> bool:
    """Send OTP via Fast2SMS API. Returns True if sent successfully."""
    if not FAST2SMS_API_KEY:
        return False

    try:
        payload = {
            "route": "otp",
            "variables_values": otp,
            "numbers": phone_10digit,
        }
        headers = {
            "authorization": FAST2SMS_API_KEY,
            "Content-Type": "application/json",
        }
        resp = requests.post(FAST2SMS_URL, json=payload, headers=headers, timeout=10)
        data = resp.json()

        if data.get("return"):
            print(f"[OTP] SMS sent to {phone_10digit} via Fast2SMS")
            return True
        else:
            print(f"[OTP] Fast2SMS error: {data.get('message', 'Unknown error')}")
            return False

    except Exception as e:
        print(f"[OTP] SMS delivery failed: {e}")
        return False


def send_otp(phone: str) -> dict:
    """Generate and send OTP to phone number."""
    # Clean expired OTPs
    now = time.time()
    expired = [p for p, d in _otp_store.items() if d["expires"] < now]
    for p in expired:
        del _otp_store[p]

    otp = generate_otp()
    _otp_store[phone] = {
        "otp": otp,
        "expires": now + OTP_EXPIRY_SECONDS,
        "attempts": 0,
    }

    phone_10 = _clean_phone(phone)
    sms_sent = False

    if FAST2SMS_API_KEY:
        sms_sent = _send_sms(phone_10, otp)

    if sms_sent:
        return {
            "success": True,
            "message": f"OTP sent to {phone} via SMS",
            "expires_in": OTP_EXPIRY_SECONDS,
            "sms_delivered": True,
        }
    else:
        # Fallback: log to console (for development without SMS API key)
        print(f"\n{'='*50}")
        print(f"  [DEV MODE] OTP for {phone}: {otp}")
        print(f"  Set FAST2SMS_API_KEY in .env for real SMS")
        print(f"{'='*50}\n")
        return {
            "success": True,
            "message": f"OTP generated for {phone}",
            "expires_in": OTP_EXPIRY_SECONDS,
            "sms_delivered": False,
            # Only include OTP when SMS is not configured (dev mode)
            "dev_otp": otp if not FAST2SMS_API_KEY else None,
        }


def verify_otp(phone: str, otp: str) -> dict:
    """Verify OTP for a phone number."""
    now = time.time()
    stored = _otp_store.get(phone)

    if not stored:
        return {"success": False, "message": "No OTP found. Please request a new one."}

    if stored["expires"] < now:
        del _otp_store[phone]
        return {"success": False, "message": "OTP expired. Please request a new one."}

    stored["attempts"] += 1
    if stored["attempts"] > 5:
        del _otp_store[phone]
        return {"success": False, "message": "Too many attempts. Please request a new OTP."}

    if stored["otp"] != otp:
        remaining = 5 - stored["attempts"]
        return {"success": False, "message": f"Invalid OTP. {remaining} attempts remaining."}

    del _otp_store[phone]
    return {"success": True, "message": "Phone number verified successfully."}
