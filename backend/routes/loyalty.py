"""
Loyalty Program routes (Points, Coupons, Discounts)
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from models import Coupon, CouponValidation, LoyaltyAddPoints, PointsTransaction, UserLoyalty
from auth import get_current_user
from database import get_db, is_mongo_available

logger = logging.getLogger(__name__)
loyalty_router = APIRouter(prefix="/loyalty", tags=["loyalty"])

# In-memory storage (when MongoDB is not available)
loyalty_store: List[dict] = []
coupon_store: List[dict] = [
    {
        'id': str(uuid.uuid4()),
        'code': 'WELCOME20',
        'discount_type': 'percentage',
        'discount_value': 20,
        'min_order_amount': 300,
        'max_uses': 100,
        'current_uses': 0,
        'is_active': True,
        'expiry_date': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    },
    {
        'id': str(uuid.uuid4()),
        'code': 'MUGHAL50',
        'discount_type': 'fixed_amount',
        'discount_value': 50,
        'min_order_amount': 200,
        'max_uses': 200,
        'current_uses': 0,
        'is_active': True,
        'expiry_date': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    },
    {
        'id': str(uuid.uuid4()),
        'code': 'BIRYANI100',
        'discount_type': 'fixed_amount',
        'discount_value': 100,
        'min_order_amount': 500,
        'max_uses': 50,
        'current_uses': 0,
        'is_active': True,
        'expiry_date': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    },
    {
        'id': str(uuid.uuid4()),
        'code': 'FEAST10',
        'discount_type': 'percentage',
        'discount_value': 10,
        'min_order_amount': 0,
        'max_uses': 500,
        'current_uses': 0,
        'is_active': True,
        'expiry_date': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    },
]
points_transaction_store: List[dict] = []


def get_user_tier(points: int) -> str:
    """Determine tier based on total points"""
    if points >= 5000:
        return "platinum"
    elif points >= 3000:
        return "gold"
    elif points >= 1000:
        return "silver"
    return "bronze"


@loyalty_router.get("/status", response_model=dict)
async def get_loyalty_status(current_user: dict = Depends(get_current_user)):
    """Get user's loyalty points and tier"""
    try:
        if is_mongo_available():
            db = get_db()
            loyalty = await db.loyalty.find_one({'user_id': current_user['id']})
            
            if not loyalty:
                # Create new loyalty record
                loyalty_doc = {
                    'user_id': current_user['id'],
                    'points': 0,
                    'lifetime_spent': 0,
                    'member_tier': 'bronze',
                    'tier_points': 0,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                await db.loyalty.insert_one(loyalty_doc)
                loyalty = loyalty_doc
        else:
            loyalty = next((l for l in loyalty_store if l['user_id'] == current_user['id']), None)
            if not loyalty:
                loyalty = {
                    'user_id': current_user['id'],
                    'points': 0,
                    'lifetime_spent': 0,
                    'member_tier': 'bronze',
                    'tier_points': 0,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                loyalty_store.append(loyalty)
        
        return {
            'points': loyalty.get('points', 0),
            'lifetime_spent': loyalty.get('lifetime_spent', 0),
            'member_tier': loyalty.get('member_tier', 'bronze'),
            'tier_points': loyalty.get('tier_points', 0),
            'tier_benefits': get_tier_benefits(loyalty.get('member_tier', 'bronze'))
        }
    except Exception as e:
        logger.error(f"Error fetching loyalty status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def get_tier_benefits(tier: str) -> dict:
    """Get benefits for a membership tier"""
    benefits = {
        'bronze': {
            'name': 'Bronze',
            'points_multiplier': 1.0,
            'birthday_bonus': 50,
            'referral_bonus': 100,
            'description': 'Basic member'
        },
        'silver': {
            'name': 'Silver',
            'points_multiplier': 1.5,
            'birthday_bonus': 100,
            'referral_bonus': 150,
            'description': '1000+ lifetime points',
            'special_perks': ['5% discount on orders', 'Early access to promotions']
        },
        'gold': {
            'name': 'Gold',
            'points_multiplier': 2.0,
            'birthday_bonus': 200,
            'referral_bonus': 250,
            'description': '3000+ lifetime points',
            'special_perks': ['10% discount on orders', 'Free item on birthday', 'Priority reservations']
        },
        'platinum': {
            'name': 'Platinum',
            'points_multiplier': 3.0,
            'birthday_bonus': 500,
            'referral_bonus': 500,
            'description': '5000+ lifetime points',
            'special_perks': ['15% discount on all orders', 'Monthly special gifts', 'VIP reservations', 'Exclusive events']
        }
    }
    return benefits.get(tier, benefits['bronze'])


@loyalty_router.post("/add-points")
async def add_points(payload: LoyaltyAddPoints, current_user: dict = Depends(get_current_user)):
    """Add points to user account (called after order completion) - Admin/System only"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")

        # 1 point per 10 rupees spent (10 points per 100 rupees)
        user_id = payload.user_id
        order_id = payload.order_id
        amount = payload.amount
        points_earned = max(1, amount // 10)
        
        if is_mongo_available():
            db = get_db()
            
            # Get or create loyalty record
            loyalty = await db.loyalty.find_one({'user_id': user_id})
            if not loyalty:
                loyalty = {
                    'user_id': user_id,
                    'points': 0,
                    'lifetime_spent': 0,
                    'member_tier': 'bronze',
                    'tier_points': 0,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                await db.loyalty.insert_one(loyalty)
            
            # Update points
            new_points = loyalty.get('points', 0) + points_earned
            new_lifetime = loyalty.get('lifetime_spent', 0) + amount
            new_tier = get_user_tier(new_lifetime)
            
            await db.loyalty.update_one(
                {'user_id': user_id},
                {'$set': {
                    'points': new_points,
                    'lifetime_spent': new_lifetime,
                    'member_tier': new_tier,
                    'tier_points': new_lifetime % 1000
                }}
            )
            
            # Record transaction
            transaction_id = str(uuid.uuid4())
            await db.points_transactions.insert_one({
                'id': transaction_id,
                'user_id': user_id,
                'order_id': order_id,
                'points': points_earned,
                'transaction_type': 'earned',
                'description': f'Points earned from order {order_id}',
                'created_at': datetime.now(timezone.utc).isoformat()
            })
        else:
            loyalty = next((l for l in loyalty_store if l['user_id'] == user_id), None)
            if not loyalty:
                loyalty = {
                    'user_id': user_id,
                    'points': 0,
                    'lifetime_spent': 0,
                    'member_tier': 'bronze',
                    'tier_points': 0,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                loyalty_store.append(loyalty)
            
            new_points = loyalty.get('points', 0) + points_earned
            new_lifetime = loyalty.get('lifetime_spent', 0) + amount
            loyalty['points'] = new_points
            loyalty['lifetime_spent'] = new_lifetime
            loyalty['member_tier'] = get_user_tier(new_lifetime)
            loyalty['tier_points'] = new_lifetime % 1000
            
            points_transaction_store.append({
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'order_id': order_id,
                'points': points_earned,
                'transaction_type': 'earned',
                'description': f'Points earned from order {order_id}',
                'created_at': datetime.now(timezone.utc).isoformat()
            })
        
        logger.info(f"Added {points_earned} points to user {user_id}")
        return {'points_earned': points_earned, 'total_points': new_points}
    except Exception as e:
        logger.error(f"Error adding points: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@loyalty_router.get("/coupons", response_model=List[dict])
async def get_available_coupons(current_user: dict = Depends(get_current_user)):
    """Get available coupon codes"""
    try:
        if is_mongo_available():
            db = get_db()
            coupons = await db.coupons.find({
                'is_active': True,
                '$or': [
                    {'expiry_date': None},
                    {'expiry_date': {'$exists': False}},
                    {'expiry_date': {'$gt': datetime.now(timezone.utc).isoformat()}}
                ]
            }).to_list(length=50)
        else:
            now = datetime.now(timezone.utc).isoformat()
            coupons = [
                c for c in coupon_store
                if c['is_active'] and (not c.get('expiry_date') or c['expiry_date'] > now)
            ]
        
        return [
            {
                'code': c['code'],
                'discount_type': c['discount_type'],
                'discount_value': c['discount_value'],
                'min_order_amount': c.get('min_order_amount', 0),
                'description': f"{'%' if c['discount_type'] == 'percentage' else '₹'} off on orders above ₹{c.get('min_order_amount', 0)}"
            }
            for c in coupons if c.get('current_uses', 0) < c.get('max_uses', float('inf'))
        ]
    except Exception as e:
        logger.error(f"Error fetching coupons: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@loyalty_router.post("/validate-coupon")
async def validate_coupon(payload: CouponValidation, current_user: dict = Depends(get_current_user)):
    """Validate a coupon and return discount"""
    try:
        coupon_code = payload.coupon_code
        order_amount = payload.order_amount

        if is_mongo_available():
            db = get_db()
            coupon = await db.coupons.find_one({'code': coupon_code.upper()})
        else:
            coupon = next((c for c in coupon_store if c['code'].upper() == coupon_code.upper()), None)
        
        if not coupon:
            raise HTTPException(status_code=404, detail="Coupon not found")
        
        if not coupon.get('is_active'):
            raise HTTPException(status_code=400, detail="Coupon is inactive")
        
        if order_amount < coupon.get('min_order_amount', 0):
            raise HTTPException(status_code=400, detail=f"Minimum order amount ₹{coupon['min_order_amount']} required")
        
        if coupon.get('current_uses', 0) >= coupon.get('max_uses', float('inf')):
            raise HTTPException(status_code=400, detail="Coupon usage limit exceeded")
        
        if coupon.get('expiry_date') and coupon['expiry_date'] < datetime.now(timezone.utc).isoformat():
            raise HTTPException(status_code=400, detail="Coupon has expired")
        
        # Calculate discount
        if coupon['discount_type'] == 'percentage':
            discount = int((order_amount * coupon['discount_value']) / 100)
        else:
            discount = coupon['discount_value']
        
        return {
            'valid': True,
            'code': coupon_code,
            'discount_amount': discount,
            'final_amount': max(0, order_amount - discount),
            'discount_type': coupon['discount_type']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating coupon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ ADMIN ENDPOINTS ============

@loyalty_router.post("/admin/create-coupon")
async def create_coupon(coupon: Coupon, current_user: dict = Depends(get_current_user)):
    """Create a new coupon (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        coupon_id = str(uuid.uuid4())
        coupon_doc = {
            'id': coupon_id,
            'code': coupon.code.upper(),
            'discount_type': coupon.discount_type,
            'discount_value': coupon.discount_value,
            'min_order_amount': coupon.min_order_amount,
            'max_uses': coupon.max_uses,
            'current_uses': 0,
            'is_active': coupon.is_active,
            'expiry_date': coupon.expiry_date.isoformat() if coupon.expiry_date else None,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        if is_mongo_available():
            db = get_db()
            await db.coupons.insert_one(coupon_doc)
        else:
            coupon_store.append(coupon_doc)
        
        logger.info(f"Coupon created: {coupon.code}")
        return {'id': coupon_id, 'message': 'Coupon created successfully'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating coupon: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@loyalty_router.put("/admin/coupon/{coupon_code}/deactivate")
async def deactivate_coupon(coupon_code: str, current_user: dict = Depends(get_current_user)):
    """Deactivate a coupon (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if is_mongo_available():
            db = get_db()
            result = await db.coupons.update_one(
                {'code': coupon_code.upper()},
                {'$set': {'is_active': False}}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Coupon not found")
        else:
            coupon = next((c for c in coupon_store if c['code'].upper() == coupon_code.upper()), None)
            if not coupon:
                raise HTTPException(status_code=404, detail="Coupon not found")
            coupon['is_active'] = False
        
        logger.info(f"Coupon deactivated: {coupon_code}")
        return {'message': 'Coupon deactivated'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating coupon: {e}")
        raise HTTPException(status_code=500, detail=str(e))
