"""
WhatsApp notification service for order updates.
Uses WhatsApp Cloud API (Meta Business API) or falls back to logging.
Configure WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in .env to enable.
"""
import os
import logging
import httpx
from config import ROOT_DIR
from dotenv import load_dotenv

load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

WHATSAPP_TOKEN = os.environ.get('WHATSAPP_TOKEN', '')
WHATSAPP_PHONE_ID = os.environ.get('WHATSAPP_PHONE_ID', '')
WHATSAPP_API_URL = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"

ORDER_STATUS_MESSAGES = {
    'placed': "🧾 Your order #{order_id} has been placed! We're preparing your Mughlai feast. Total: ₹{total}",
    'accepted': "👨‍🍳 Great news! Your order #{order_id} has been accepted and our chefs are working on it.",
    'preparing': "🔥 Your order #{order_id} is being prepared with love in our kitchen!",
    'ready': "✅ Your order #{order_id} is ready! {pickup_msg}",
    'out_for_delivery': "🛵 Your order #{order_id} is on its way! {driver_msg}",
    'delivered': "🎉 Your order #{order_id} has been delivered. Enjoy your meal! Rate us on the app.",
    'cancelled': "❌ Your order #{order_id} has been cancelled. {cancel_msg}",
}


def _format_phone(phone: str) -> str:
    """Normalize phone to international format (91XXXXXXXXXX)"""
    phone = phone.strip().replace(' ', '').replace('-', '').replace('+', '')
    if phone.startswith('0'):
        phone = '91' + phone[1:]
    if len(phone) == 10:
        phone = '91' + phone
    return phone


async def send_whatsapp_message(phone: str, message: str) -> bool:
    """Send a WhatsApp text message. Returns True if sent successfully."""
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
        logger.info(f"[WhatsApp-Log] To {phone}: {message}")
        return True  # Log-only mode when not configured

    formatted_phone = _format_phone(phone)
    payload = {
        "messaging_product": "whatsapp",
        "to": formatted_phone,
        "type": "text",
        "text": {"body": message}
    }
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(WHATSAPP_API_URL, json=payload, headers=headers)
            if resp.status_code == 200:
                logger.info(f"WhatsApp sent to {formatted_phone}")
                return True
            else:
                logger.warning(f"WhatsApp API error {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        logger.error(f"WhatsApp send failed: {e}")
        return False


async def send_order_status_notification(phone: str, order_id: str, status: str, **kwargs) -> bool:
    """Send an order status update via WhatsApp"""
    template = ORDER_STATUS_MESSAGES.get(status)
    if not template:
        return False

    short_id = order_id[:8].upper()
    total = kwargs.get('total', '')
    driver_name = kwargs.get('driver_name', '')
    driver_phone = kwargs.get('driver_phone', '')

    pickup_msg = "Pick it up at the counter!" if kwargs.get('order_type') == 'dine-in' else "Your delivery partner will arrive soon."
    driver_msg = f"Driver: {driver_name} ({driver_phone})" if driver_name else ''
    cancel_msg = kwargs.get('cancel_reason', 'Contact us for details.')

    message = template.format(
        order_id=short_id,
        total=total,
        pickup_msg=pickup_msg,
        driver_msg=driver_msg,
        cancel_msg=cancel_msg,
    )

    return await send_whatsapp_message(phone, message)
