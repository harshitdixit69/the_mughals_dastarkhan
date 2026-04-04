"""
Delivery routes - estimate, book, track deliveries via partners (Dunzo, Porter, Shadowfax)
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user
from database import get_db, is_mongo_available

logger = logging.getLogger(__name__)
delivery_router = APIRouter(prefix="/delivery", tags=["delivery"])

# Delivery partner rate configuration
DELIVERY_PARTNERS = {
    'dunzo': {
        'name': 'Dunzo',
        'base_charge': 40,
        'per_km': 10,
        'avg_speed_kmh': 22,
        'pickup_min': 8,
        'max_distance_km': 15,
        'logo': '🟡',
    },
    'porter': {
        'name': 'Porter',
        'base_charge': 35,
        'per_km': 8,
        'avg_speed_kmh': 18,
        'pickup_min': 12,
        'max_distance_km': 20,
        'logo': '🔵',
    },
    'shadowfax': {
        'name': 'Shadowfax',
        'base_charge': 45,
        'per_km': 7,
        'avg_speed_kmh': 25,
        'pickup_min': 6,
        'max_distance_km': 25,
        'logo': '🟣',
    },
}

FOOD_PREP_MIN = 18  # Average food preparation time
SELF_DELIVERY_CHARGE = 30
SELF_DELIVERY_MAX_KM = 3
SELF_DELIVERY_SPEED_KMH = 20

# In-memory delivery tracking store
delivery_store: list = []


class DeliveryEstimateRequest(BaseModel):
    distance_km: float = Field(default=2.0, ge=0.1, le=30)


class DeliveryBookRequest(BaseModel):
    order_id: str
    partner: str
    delivery_address: str = Field(..., min_length=5, max_length=500)
    delivery_note: Optional[str] = Field(None, max_length=300)


@delivery_router.post("/estimate")
async def estimate_delivery(payload: DeliveryEstimateRequest, current_user: dict = Depends(get_current_user)):
    """Get delivery cost estimates from all partners"""
    distance = payload.distance_km
    estimates = []

    # Self delivery option
    if distance <= SELF_DELIVERY_MAX_KM:
        travel_min = max(5, int((distance / SELF_DELIVERY_SPEED_KMH) * 60))
        total_eta = FOOD_PREP_MIN + travel_min
        estimates.append({
            'type': 'self_delivery',
            'partner': None,
            'name': 'Restaurant Delivery',
            'charge': SELF_DELIVERY_CHARGE,
            'eta_minutes': total_eta,
            'eta_breakdown': f'Prep ~{FOOD_PREP_MIN} min + Travel ~{travel_min} min',
            'description': f'Within {SELF_DELIVERY_MAX_KM}km — delivered by our staff',
            'logo': '🏍️',
        })

    # External partners
    for key, config in DELIVERY_PARTNERS.items():
        if distance <= config['max_distance_km']:
            charge = config['base_charge'] + int(distance * config['per_km'])
            travel_min = max(5, int((distance / config['avg_speed_kmh']) * 60))
            pickup_min = config['pickup_min']
            total_eta = FOOD_PREP_MIN + pickup_min + travel_min
            estimates.append({
                'type': 'external_delivery',
                'partner': key,
                'name': config['name'],
                'charge': charge,
                'eta_minutes': total_eta,
                'eta_breakdown': f'Prep ~{FOOD_PREP_MIN} min + Pickup ~{pickup_min} min + Travel ~{travel_min} min',
                'description': f'Delivered by {config["name"]}',
                'logo': config['logo'],
            })

    # Pickup is always available
    estimates.insert(0, {
        'type': 'pickup',
        'partner': None,
        'name': 'Pickup',
        'charge': 0,
        'eta_minutes': 0,
        'description': 'Pick up from restaurant — no delivery charge',
        'logo': '🏪',
    })

    return {'estimates': estimates, 'distance_km': distance}


@delivery_router.post("/book")
async def book_delivery(payload: DeliveryBookRequest, current_user: dict = Depends(get_current_user)):
    """Book a delivery with an external partner (simulated)"""
    partner_key = payload.partner.lower()
    if partner_key not in DELIVERY_PARTNERS:
        raise HTTPException(status_code=400, detail=f"Invalid delivery partner. Choose from: {', '.join(DELIVERY_PARTNERS.keys())}")

    tracking_id = f"TRK-{uuid.uuid4().hex[:8].upper()}"

    delivery_doc = {
        'id': str(uuid.uuid4()),
        'order_id': payload.order_id,
        'user_id': current_user['id'],
        'partner': partner_key,
        'partner_name': DELIVERY_PARTNERS[partner_key]['name'],
        'tracking_id': tracking_id,
        'delivery_address': payload.delivery_address,
        'delivery_note': payload.delivery_note,
        'status': 'booked',  # booked → picked_up → in_transit → delivered
        'created_at': datetime.now(timezone.utc).isoformat(),
    }

    if is_mongo_available():
        db = get_db()
        await db.deliveries.insert_one(delivery_doc)
        # Update order with delivery tracking
        await db.orders.update_one(
            {'id': payload.order_id},
            {'$set': {
                'delivery_tracking_id': tracking_id,
                'delivery_status': 'booked',
                'delivery_partner': partner_key,
            }}
        )
    else:
        delivery_store.append(delivery_doc)

    return {
        'tracking_id': tracking_id,
        'partner': partner_key,
        'partner_name': DELIVERY_PARTNERS[partner_key]['name'],
        'status': 'booked',
        'message': f'Delivery booked with {DELIVERY_PARTNERS[partner_key]["name"]}',
    }


@delivery_router.get("/track/{tracking_id}")
async def track_delivery(tracking_id: str, current_user: dict = Depends(get_current_user)):
    """Get delivery tracking status"""
    delivery = None
    if is_mongo_available():
        db = get_db()
        delivery = await db.deliveries.find_one({'tracking_id': tracking_id}, {'_id': 0})
    else:
        delivery = next((d for d in delivery_store if d['tracking_id'] == tracking_id), None)

    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")

    return delivery


@delivery_router.put("/status/{tracking_id}")
async def update_delivery_status(tracking_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Update delivery status (admin only)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    valid_statuses = ['booked', 'picked_up', 'in_transit', 'delivered', 'cancelled']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {', '.join(valid_statuses)}")

    if is_mongo_available():
        db = get_db()
        result = await db.deliveries.update_one(
            {'tracking_id': tracking_id},
            {'$set': {'status': status}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Delivery not found")
        # Also update the order's delivery_status
        await db.orders.update_one(
            {'delivery_tracking_id': tracking_id},
            {'$set': {'delivery_status': status}}
        )
    else:
        found = False
        for d in delivery_store:
            if d['tracking_id'] == tracking_id:
                d['status'] = status
                found = True
                break
        if not found:
            raise HTTPException(status_code=404, detail="Delivery not found")

    return {'tracking_id': tracking_id, 'status': status, 'message': f'Delivery status updated to {status}'}


@delivery_router.get("/partners")
async def get_delivery_partners(current_user: dict = Depends(get_current_user)):
    """Get list of available delivery partners with rates"""
    return {
        'partners': [
            {
                'key': key,
                'name': config['name'],
                'base_charge': config['base_charge'],
                'per_km': config['per_km'],
                'max_distance_km': config['max_distance_km'],
                'logo': config['logo'],
            }
            for key, config in DELIVERY_PARTNERS.items()
        ],
        'self_delivery': {
            'charge': SELF_DELIVERY_CHARGE,
            'max_km': SELF_DELIVERY_MAX_KM,
        }
    }
