"""
AI Chat Assistant - Smart Order Assistant for The Mughal's Dastarkhwan
Uses Groq API (OpenAI-compatible) for intelligent menu recommendations, order queries, and upselling.
"""
import os
import json
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from auth import get_current_user
from config import MENU_ITEMS, MENU_CATEGORIES, RESTAURANT_INFO
from database import get_db, is_mongo_available

logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/chat", tags=["AI Chat"])

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


# ============== MODELS ==============

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    suggested_items: List[dict] = []


# ============== MENU CONTEXT BUILDER ==============

def build_menu_context():
    """Build a compact menu summary for the AI system prompt."""
    lines = []
    for cat in MENU_CATEGORIES:
        items_in_cat = [i for i in MENU_ITEMS if i["category_id"] == cat["id"]]
        lines.append(f"\n**{cat['name']}**:")
        for item in items_in_cat:
            veg_tag = "🟢 Veg" if item["is_veg"] else "🔴 Non-Veg"
            popular = " ⭐ POPULAR" if item.get("is_popular") else ""
            lines.append(f"  - {item['name']} — ₹{item['price']} ({veg_tag}){popular}: {item['description']}")
    return "\n".join(lines)


SYSTEM_PROMPT = f"""You are the AI assistant for **{RESTAURANT_INFO['name']}**, a legendary Mughlai & Awadhi restaurant in Lucknow, established in {RESTAURANT_INFO['established']}.

Your personality: Warm, knowledgeable about Mughlai cuisine, helpful, and slightly poetic about food. You speak like a friendly restaurant host.

**RESTAURANT INFO:**
- Address: {RESTAURANT_INFO['contact']['address']}
- Phone: {RESTAURANT_INFO['contact']['phone']}
- Hours: Weekdays {RESTAURANT_INFO['contact']['hours']['weekdays']}, Weekends {RESTAURANT_INFO['contact']['hours']['weekends']}
- Rating: {RESTAURANT_INFO['rating']}/5 ({RESTAURANT_INFO['total_reviews']} reviews)
- Price for two: {RESTAURANT_INFO['price_range']}

**COMPLETE MENU:**
{build_menu_context()}

**YOUR CAPABILITIES:**
1. **Menu Recommendations**: Suggest dishes based on budget, group size, dietary preferences (veg/non-veg), taste preferences (spicy, creamy, mild).
2. **Budget Planning**: Calculate combos within a specified budget. Always include breads with curries, suggest rice with biryani-less meals.
3. **Dietary Guidance**: Know which items are veg/non-veg. Help with dietary restrictions.
4. **Upselling**: Naturally suggest complementary items — breads with curries, desserts after mains, kebabs as starters. Don't be pushy.
5. **Order Status**: If user asks about order status, tell them to check the "My Orders" section in their profile, or provide the status if order details are given to you.
6. **Restaurant Info**: Answer questions about timings, location, contact, cuisine type.

**RULES:**
- Always mention actual prices from the menu. Never make up prices.
- When suggesting combos, show a total price.
- Keep responses concise but warm. Use food emojis occasionally.
- If asked about items not on the menu, politely say it's not available and suggest alternatives.
- Format recommendations as a clear list.
- If user mentions a budget, ALWAYS respect it and show the calculated total.
- Respond in the same language the user uses (Hindi/English/Hinglish).
- Do NOT use markdown headers (##). Use bold (**text**) and bullet points for formatting.
"""


# ============== HELPERS ==============

def extract_suggested_items(reply_text: str) -> list:
    """Extract mentioned menu items from the AI reply to show as quick-add cards."""
    suggested = []
    seen_ids = set()
    for item in MENU_ITEMS:
        if item["name"].lower() in reply_text.lower() and item["id"] not in seen_ids:
            suggested.append({
                "id": item["id"],
                "name": item["name"],
                "price": item["price"],
                "is_veg": item["is_veg"],
                "category_id": item["category_id"],
                "description": item["description"],
            })
            seen_ids.add(item["id"])
    return suggested[:6]  # Max 6 suggestions


async def get_user_order_context(user_id: str) -> str:
    """Fetch recent orders for context if user asks about order status."""
    if not is_mongo_available():
        return ""
    try:
        db = get_db()
        orders = await db.orders.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(3).to_list(3)
        if not orders:
            return "\n\n**User's recent orders:** No orders found."
        lines = ["\n\n**User's recent orders:**"]
        for o in orders:
            items_str = ", ".join([f"{i.get('name', 'Item')} x{i.get('quantity', 1)}" for i in o.get("items", [])])
            lines.append(f"  - Order #{o.get('order_number', o.get('id', '?')[:8])}: {o.get('status', 'unknown')} — {items_str} — ₹{o.get('total', 0)}")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Error fetching order context: {e}")
        return ""


# ============== CHAT ENDPOINT ==============

@chat_router.post("", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """Chat with the AI assistant."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="AI assistant is not configured. Please set GROQ_API_KEY.")

    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(user_message) > 1000:
        raise HTTPException(status_code=400, detail="Message too long. Keep it under 1000 characters.")

    # Build context with order info if user seems to be asking about orders
    order_keywords = ["order", "status", "track", "where", "delivery", "kahan", "kitna time"]
    extra_context = ""
    if any(kw in user_message.lower() for kw in order_keywords):
        extra_context = await get_user_order_context(current_user["id"])

    system_with_context = SYSTEM_PROMPT + extra_context + f"\n\n**Current user name:** {current_user.get('name', 'Guest')}"

    # Build OpenAI-compatible messages
    messages = [{"role": "system", "content": system_with_context}]

    # Add conversation history (last 10 messages max)
    for msg in request.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    # Add current message
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 800,
        "top_p": 0.9,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
            )

        if response.status_code != 200:
            logger.error(f"Groq API error: {response.status_code} — {response.text}")
            raise HTTPException(status_code=502, detail="AI assistant is temporarily unavailable. Please try again.")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise HTTPException(status_code=502, detail="AI assistant returned an empty response.")

        reply_text = choices[0].get("message", {}).get("content", "")
        if not reply_text:
            reply_text = "I'm sorry, I couldn't process that. Could you rephrase your question?"

        # Extract menu items mentioned in the reply
        suggested_items = extract_suggested_items(reply_text)

        return ChatResponse(reply=reply_text, suggested_items=suggested_items)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI assistant took too long to respond. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong with the AI assistant.")


# ============== PUBLIC QUICK CHAT (no auth) ==============

@chat_router.post("/quick", response_model=ChatResponse)
async def quick_chat(request: ChatRequest):
    """Chat without authentication — limited to menu queries only."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="AI assistant is not configured.")

    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(user_message) > 500:
        raise HTTPException(status_code=400, detail="Message too long.")

    quick_system = SYSTEM_PROMPT + "\n\n**Note:** This user is not logged in. Do NOT discuss order status. If they ask about orders, suggest them to log in first. Focus on menu recommendations and restaurant info."

    messages = [{"role": "system", "content": quick_system}]
    for msg in request.history[-6:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 500,
        "top_p": 0.9,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
            )

        if response.status_code != 200:
            logger.error(f"Groq API error: {response.status_code}")
            raise HTTPException(status_code=502, detail="AI assistant is temporarily unavailable.")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise HTTPException(status_code=502, detail="Empty response from AI.")

        reply_text = choices[0].get("message", {}).get("content", "")
        if not reply_text:
            reply_text = "I'm sorry, could you rephrase that?"

        suggested_items = extract_suggested_items(reply_text)
        return ChatResponse(reply=reply_text, suggested_items=suggested_items)

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI took too long. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quick chat error: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong.")
