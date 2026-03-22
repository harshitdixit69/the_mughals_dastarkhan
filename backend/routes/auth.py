"""
Authentication routes - registration, login, profile
"""
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from models import UserRegister, UserLogin, TokenResponse, UserResponse
from auth import (
    hash_password, verify_password, create_access_token, get_current_user,
    add_to_users_store, user_exists_in_store, get_user_from_store
)
from database import get_db, is_mongo_available

logger = logging.getLogger(__name__)
auth_router = APIRouter(prefix="/auth", tags=["authentication"])


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
        
        new_user = {
            'id': user_id,
            'name': user_data.name,
            'email': user_data.email,
            'phone': user_data.phone,
            'password_hash': password_hash,
            'favorite_items': [],
            'created_at': created_at.isoformat()
        }
        
        if is_mongo_available():
            db = get_db()
            await db.users.insert_one(new_user)
        else:
            add_to_users_store(new_user)
        
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
        created_at=created_at
    )


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
