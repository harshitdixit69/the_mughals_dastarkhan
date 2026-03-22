"""
Contact message routes
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from models import ContactMessageCreate, ContactMessage, ContactMessageResponse
from auth import get_current_user
from database import get_db, is_mongo_available

logger = logging.getLogger(__name__)
contact_router = APIRouter(prefix="/contact", tags=["contact"])

# In-memory storage for contact messages (when MongoDB is not available)
contact_messages_store: List[dict] = []


@contact_router.post("", response_model=ContactMessageResponse)
async def create_contact_message(input_data: ContactMessageCreate):
    """Submit a contact message"""
    try:
        contact_obj = ContactMessage(
            id=str(uuid.uuid4()),
            **input_data.model_dump(),
            is_read=False,
            created_at=datetime.now(timezone.utc)
        )
        doc = contact_obj.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        if is_mongo_available():
            db = get_db()
            await db.contact_messages.insert_one(doc)
        else:
            contact_messages_store.append(doc)
        
        return ContactMessageResponse(
            id=contact_obj.id,
            success=True,
            message="Thank you for contacting us! We will get back to you soon."
        )
    except Exception as e:
        logger.error(f"Error creating contact message: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit message")


@contact_router.get("", response_model=List[ContactMessage])
async def get_contact_messages(current_user: dict = Depends(get_current_user)):
    """Get all contact messages (admin)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    if is_mongo_available():
        db = get_db()
        messages = await db.contact_messages.find({}, {"_id": 0}).to_list(100)
        for msg in messages:
            if isinstance(msg.get('created_at'), str):
                msg['created_at'] = datetime.fromisoformat(msg['created_at'])
        return messages
    else:
        # Return from in-memory storage
        messages = []
        for msg in contact_messages_store:
            msg_copy = msg.copy()
            if isinstance(msg_copy.get('created_at'), str):
                msg_copy['created_at'] = datetime.fromisoformat(msg_copy['created_at'])
            messages.append(msg_copy)
        return messages
