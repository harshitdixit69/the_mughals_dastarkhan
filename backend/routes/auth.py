"""
Authentication routes - registration, login, profile
"""
import uuid
import random
import string
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from models import UserRegister, UserLogin, UserProfileUpdate, TokenResponse, UserResponse, SavedAddress
from auth import (
    hash_password, verify_password, create_access_token, get_current_user,
    add_to_users_store, user_exists_in_store, get_user_from_store
)
from database import get_db, is_mongo_available

logger = logging.getLogger(__name__)
auth_router = APIRouter(prefix="/auth", tags=["authentication"])

REFERRAL_REWARD = 100  # ₹100 off for both referrer and referee


def generate_referral_code(name: str) -> str:
    """Generate a unique referral code like MUGHAL-RAHUL-A3X7"""
    clean = ''.join(c for c in name.upper().split()[0][:6] if c.isalpha())
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"MUGHAL-{clean}-{suffix}"


@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    try:
        # Check if user already exists
        if is_mongo_available():
            db = get_db()
            existing_user = await db.users.find_one({'email': user_data.email})
        else:
            existing_user = user_exists_in_store(user_data.email)
        
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        user_id = str(uuid.uuid4())
        password_hash = hash_password(user_data.password)
        created_at = datetime.now(timezone.utc)
        referral_code = generate_referral_code(user_data.name)
        
        new_user = {
            'id': user_id,
            'name': user_data.name,
            'email': user_data.email,
            'phone': user_data.phone,
            'password_hash': password_hash,
            'favorite_items': [],
            'addresses': [],
            'referral_code': referral_code,
            'referred_by': None,
            'referral_count': 0,
            'created_at': created_at.isoformat()
        }
        
        # Handle referral code from inviter
        referred_by_user = None
        if user_data.referral_code:
            ref_code = user_data.referral_code.strip().upper()
            if is_mongo_available():
                referred_by_user = await db.users.find_one({'referral_code': ref_code})
            else:
                from auth import users_store as _us
                referred_by_user = next((u for u in _us if u.get('referral_code') == ref_code), None)
            
            if referred_by_user:
                new_user['referred_by'] = referred_by_user['id']

        if is_mongo_available():
            db = get_db()
            await db.users.insert_one(new_user)
        else:
            add_to_users_store(new_user)
        
        # Credit referral rewards
        if referred_by_user and is_mongo_available():
            # Credit referrer — create a coupon for them
            referrer_coupon_code = f"REF-{referred_by_user['name'].split()[0].upper()[:6]}-{''.join(random.choices(string.digits, k=4))}"
            referrer_coupon = {
                'id': str(uuid.uuid4()),
                'code': referrer_coupon_code,
                'discount_type': 'fixed_amount',
                'discount_value': REFERRAL_REWARD,
                'min_order_amount': 200,
                'max_uses': 1,
                'current_uses': 0,
                'is_active': True,
                'expiry_date': None,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'note': f'Referral reward — {user_data.name} joined using your code'
            }
            await db.coupons.insert_one(referrer_coupon)
            await db.users.update_one(
                {'id': referred_by_user['id']},
                {'$inc': {'referral_count': 1}}
            )
            
            # Credit new user — create a welcome referral coupon
            new_user_coupon_code = f"WELCOME-{user_data.name.split()[0].upper()[:6]}-{''.join(random.choices(string.digits, k=4))}"
            new_user_coupon = {
                'id': str(uuid.uuid4()),
                'code': new_user_coupon_code,
                'discount_type': 'fixed_amount',
                'discount_value': REFERRAL_REWARD,
                'min_order_amount': 200,
                'max_uses': 1,
                'current_uses': 0,
                'is_active': True,
                'expiry_date': None,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'note': f'Welcome reward — joined via referral from {referred_by_user["name"]}'
            }
            await db.coupons.insert_one(new_user_coupon)
            logger.info(f"Referral reward: {referred_by_user['name']} gets {referrer_coupon_code}, {user_data.name} gets {new_user_coupon_code}")

        # Create token
        token = create_access_token(user_id, user_data.email)
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(
                id=user_id,
                name=user_data.name,
                email=user_data.email,
                phone=user_data.phone,
                role=None,
                favorite_items=[],
                addresses=[],
                referral_code=referral_code,
                referral_count=0,
                whatsapp_notifications=False,
                created_at=created_at
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")


@auth_router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """Login a user"""
    try:
        if is_mongo_available():
            db = get_db()
            user = await db.users.find_one({'email': user_data.email})
        else:
            user = get_user_from_store(user_data.email)
        
        if not user or not verify_password(user_data.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Create token
        token = create_access_token(user['id'], user['email'])
        
        created_at = user['created_at']
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(
                id=user['id'],
                name=user['name'],
                email=user['email'],
                phone=user.get('phone'),
                role=user.get('role'),
                favorite_items=user.get('favorite_items', []),
                addresses=user.get('addresses', []),
                referral_code=user.get('referral_code'),
                referral_count=user.get('referral_count', 0),
                whatsapp_notifications=user.get('whatsapp_notifications', False),
                created_at=created_at
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in user: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@auth_router.get("/me", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    created_at = current_user.get('created_at')
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return UserResponse(
        id=current_user['id'],
        name=current_user['name'],
        email=current_user['email'],
        phone=current_user.get('phone'),
        role=current_user.get('role'),
        favorite_items=current_user.get('favorite_items', []),
        addresses=current_user.get('addresses', []),
        referral_code=current_user.get('referral_code'),
        referral_count=current_user.get('referral_count', 0),
        whatsapp_notifications=current_user.get('whatsapp_notifications', False),
        created_at=created_at
    )


@auth_router.put("/me", response_model=UserResponse)
async def update_profile(update_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update current user profile (name, phone, addresses)"""
    try:
        updates = {}
        if update_data.name is not None:
            updates['name'] = update_data.name
        if update_data.phone is not None:
            updates['phone'] = update_data.phone
        if update_data.whatsapp_notifications is not None:
            updates['whatsapp_notifications'] = update_data.whatsapp_notifications
        if update_data.addresses is not None:
            import uuid as _uuid
            addresses_list = []
            for addr in update_data.addresses:
                addr_dict = addr.model_dump()
                if not addr_dict.get('id'):
                    addr_dict['id'] = str(_uuid.uuid4())[:8]
                addresses_list.append(addr_dict)
            updates['addresses'] = addresses_list

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        if is_mongo_available():
            db = get_db()
            await db.users.update_one({'id': current_user['id']}, {'$set': updates})
            updated_user = await db.users.find_one({'id': current_user['id']})
        else:
            from auth import get_all_users_store
            updated_user = None
            for user in get_all_users_store():
                if user['id'] == current_user['id']:
                    user.update(updates)
                    updated_user = user
                    break
            if not updated_user:
                raise HTTPException(status_code=404, detail="User not found")

        created_at = updated_user.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)

        return UserResponse(
            id=updated_user['id'],
            name=updated_user['name'],
            email=updated_user['email'],
            phone=updated_user.get('phone'),
            role=updated_user.get('role'),
            favorite_items=updated_user.get('favorite_items', []),
            addresses=updated_user.get('addresses', []),
            referral_code=updated_user.get('referral_code'),
            referral_count=updated_user.get('referral_count', 0),
            whatsapp_notifications=updated_user.get('whatsapp_notifications', False),
            created_at=created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@auth_router.post("/favorites/{item_id}")
async def add_favorite(item_id: int, current_user: dict = Depends(get_current_user)):
    """Add menu item to favorites"""
    try:
        if is_mongo_available():
            db = get_db()
            result = await db.users.update_one(
                {'id': current_user['id'], 'favorite_items': {'$nin': [item_id]}},
                {'$push': {'favorite_items': item_id}}
            )
            if result.modified_count == 0:
                return {"message": "Item already in favorites"}
        else:
            # Update in-memory storage
            from auth import get_all_users_store
            for user in get_all_users_store():
                if user['id'] == current_user['id']:
                    if item_id not in user.get('favorite_items', []):
                        user['favorite_items'].append(item_id)
                    break
        
        return {"message": "Added to favorites"}
    except Exception as e:
        logger.error(f"Error adding favorite: {e}")
        raise HTTPException(status_code=500, detail="Failed to add favorite")


@auth_router.delete("/favorites/{item_id}")
async def remove_favorite(item_id: int, current_user: dict = Depends(get_current_user)):
    """Remove menu item from favorites"""
    try:
        if is_mongo_available():
            db = get_db()
            await db.users.update_one(
                {'id': current_user['id']},
                {'$pull': {'favorite_items': item_id}}
            )
        else:
            # Update in-memory storage
            from auth import get_all_users_store
            for user in get_all_users_store():
                if user['id'] == current_user['id']:
                    if item_id in user.get('favorite_items', []):
                        user['favorite_items'].remove(item_id)
                    break
        
        return {"message": "Removed from favorites"}
    except Exception as e:
        logger.error(f"Error removing favorite: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove favorite")
