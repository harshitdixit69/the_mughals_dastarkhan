"""
Notification and marketing email routes (admin)
"""
import logging
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, get_all_users_store
from database import get_db, is_mongo_available
from email_service import send_promotional_email
from models import PromotionalEmailRequest

logger = logging.getLogger(__name__)
notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notifications_router.post("/admin/promotions")
async def send_promotions(payload: PromotionalEmailRequest, current_user: dict = Depends(get_current_user)):
    """Send promotional email to all users (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")

        recipients: List[dict] = []
        if is_mongo_available():
            db = get_db()
            recipients = await db.users.find({}, {'_id': 0, 'email': 1, 'name': 1}).to_list(1000)
        else:
            recipients = [
                {'email': u.get('email'), 'name': u.get('name', 'Customer')}
                for u in get_all_users_store()
            ]

        sent = 0
        for user in recipients:
            email = user.get('email')
            if not email:
                continue
            if send_promotional_email(
                customer_name=user.get('name', 'Customer'),
                email=email,
                promo_title=payload.title,
                promo_content=payload.content,
                offer_code=payload.offer_code
            ):
                sent += 1

        return {
            "message": "Promotional emails processed",
            "sent": sent,
            "total": len(recipients)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending promotional emails: {e}")
        raise HTTPException(status_code=500, detail="Failed to send promotional emails")
