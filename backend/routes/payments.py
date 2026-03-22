"""
Payment routes - Razorpay order creation & signature verification
"""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from models import PaymentOrderCreate, PaymentVerify

logger = logging.getLogger(__name__)

payments_router = APIRouter(prefix="/payments", tags=["payments"])


def _get_client():
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=500, detail="Razorpay keys not configured")
    try:
        import razorpay
    except ImportError:
        raise HTTPException(status_code=500, detail="Razorpay SDK not available")
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


@payments_router.post("/create-order")
async def create_payment_order(
    payload: PaymentOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a Razorpay order"""
    try:
        client = _get_client()
        amount_paise = payload.amount * 100  # Razorpay expects amount in paise
        receipt = payload.receipt or f"rcpt_{uuid.uuid4().hex[:12]}"

        order = client.order.create({
            "amount": amount_paise,
            "currency": payload.currency,
            "receipt": receipt,
            "notes": payload.notes or {},
        })

        return {
            "key_id": RAZORPAY_KEY_ID,
            "order": order,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error creating payment order: {exc}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")


@payments_router.post("/verify")
async def verify_payment(
    payload: PaymentVerify,
    current_user: dict = Depends(get_current_user)
):
    """Verify Razorpay payment signature"""
    try:
        client = _get_client()
        client.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
        return {"verified": True}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
