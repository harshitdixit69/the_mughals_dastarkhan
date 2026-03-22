"""
Authentication utilities - password hashing, JWT tokens, and user verification
"""
import bcrypt
import jwt
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from fastapi import HTTPException, Depends
from starlette.requests import Request
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from database import get_db, is_mongo_available

logger = logging.getLogger(__name__)

# File path for persisting in-memory store
_STORE_FILE = Path(__file__).parent / 'data' / 'users_store.json'


def _load_users_store() -> list:
    """Load users from JSON file if it exists"""
    try:
        if _STORE_FILE.exists():
            with open(_STORE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Could not load users store from file: {e}")
    return []


def _save_users_store():
    """Persist users store to JSON file"""
    try:
        _STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(_STORE_FILE, 'w', encoding='utf-8') as f:
            json.dump(users_store, f, indent=2, default=str)
    except Exception as e:
        logger.warning(f"Could not save users store to file: {e}")


# In-memory user storage fallback – pre-loaded from disk
users_store: list = _load_users_store()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    """Create a JWT access token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_access_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request) -> dict:
    """Dependency to get current authenticated user"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    payload = verify_access_token(token)
    user_id = payload.get('user_id')
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Find user in database or store
    if is_mongo_available():
        db = get_db()
        user = await db.users.find_one({'id': user_id}, {"password_hash": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    else:
        for user in users_store:
            if user['id'] == user_id:
                user_copy = user.copy()
                del user_copy['password_hash']
                return user_copy
        raise HTTPException(status_code=404, detail="User not found")


def add_to_users_store(user: dict):
    """Add user to in-memory storage and persist to disk"""
    users_store.append(user)
    _save_users_store()


def get_user_from_store(email: str):
    """Get user from in-memory storage by email"""
    return next((u for u in users_store if u['email'] == email), None)


def user_exists_in_store(email: str) -> bool:
    """Check if user exists in in-memory storage"""
    return any(u['email'] == email for u in users_store)


def get_all_users_store() -> list:
    """Get all users from in-memory storage"""
    return users_store
