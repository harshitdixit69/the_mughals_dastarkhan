"""
Database connection and utilities
"""
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from typing import List
from config import MONGO_URL, DB_NAME, MONGO_TIMEOUT_MS, MENU_CATEGORIES, MENU_ITEMS, TESTIMONIALS, RESTAURANT_INFO

logger = logging.getLogger(__name__)

# Global database variables
client = None
db = None
mongo_available = False


async def connect_db():
    """Initialize MongoDB connection"""
    global client, db, mongo_available
    
    try:
        # Use certifi CA bundle to fix TLS issues with some Python/OpenSSL versions
        try:
            import certifi
            tls_kwargs = {"tlsCAFile": certifi.where()}
        except ImportError:
            tls_kwargs = {}

        client = AsyncIOMotorClient(
            MONGO_URL,
            serverSelectionTimeoutMS=MONGO_TIMEOUT_MS,
            connectTimeoutMS=MONGO_TIMEOUT_MS,
            socketTimeoutMS=MONGO_TIMEOUT_MS,
            **tls_kwargs
        )
        db = client[DB_NAME]
        
        # Test connection
        await client.admin.command("ping")
        mongo_available = True
        logger.info("MongoDB connected successfully")
        return True
    except Exception as e:
        mongo_available = False
        logger.warning(f"MongoDB connection failed, using in-memory storage: {e}")
        return False


async def close_db():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")


async def initialize_collections():
    """Initialize database collections with seed data"""
    if not mongo_available or db is None:
        return
    
    try:
        # Initialize menu categories
        categories_count = await db.menu_categories.count_documents({})
        if categories_count == 0:
            await db.menu_categories.insert_many(MENU_CATEGORIES)
            logger.info(f"Initialized {len(MENU_CATEGORIES)} menu categories")
        
        # Initialize menu items
        items_count = await db.menu_items.count_documents({})
        if items_count == 0:
            await db.menu_items.insert_many(MENU_ITEMS)
            logger.info(f"Initialized {len(MENU_ITEMS)} menu items")
        
        # Initialize testimonials
        testimonials_count = await db.testimonials.count_documents({})
        if testimonials_count == 0:
            await db.testimonials.insert_many(TESTIMONIALS)
            logger.info(f"Initialized {len(TESTIMONIALS)} testimonials")
        
        # Initialize restaurant info
        restaurant_count = await db.restaurant_info.count_documents({})
        if restaurant_count == 0:
            await db.restaurant_info.insert_one(RESTAURANT_INFO)
            logger.info("Initialized restaurant info")
        
        # Initialize sample coupons
        coupons_count = await db.coupons.count_documents({})
        if coupons_count == 0:
            import uuid
            from datetime import datetime, timezone
            sample_coupons = [
                {
                    'id': str(uuid.uuid4()), 'code': 'WELCOME20', 'discount_type': 'percentage',
                    'discount_value': 20, 'min_order_amount': 300, 'max_uses': 100,
                    'current_uses': 0, 'is_active': True, 'expiry_date': None,
                    'created_at': datetime.now(timezone.utc).isoformat()
                },
                {
                    'id': str(uuid.uuid4()), 'code': 'MUGHAL50', 'discount_type': 'fixed_amount',
                    'discount_value': 50, 'min_order_amount': 200, 'max_uses': 200,
                    'current_uses': 0, 'is_active': True, 'expiry_date': None,
                    'created_at': datetime.now(timezone.utc).isoformat()
                },
                {
                    'id': str(uuid.uuid4()), 'code': 'BIRYANI100', 'discount_type': 'fixed_amount',
                    'discount_value': 100, 'min_order_amount': 500, 'max_uses': 50,
                    'current_uses': 0, 'is_active': True, 'expiry_date': None,
                    'created_at': datetime.now(timezone.utc).isoformat()
                },
                {
                    'id': str(uuid.uuid4()), 'code': 'FEAST10', 'discount_type': 'percentage',
                    'discount_value': 10, 'min_order_amount': 0, 'max_uses': 500,
                    'current_uses': 0, 'is_active': True, 'expiry_date': None,
                    'created_at': datetime.now(timezone.utc).isoformat()
                },
            ]
            await db.coupons.insert_many(sample_coupons)
            logger.info(f"Initialized {len(sample_coupons)} sample coupons")
    
    except Exception as e:
        logger.error(f"Error initializing database collections: {e}")


def get_db():
    """Get database instance"""
    return db


def is_mongo_available():
    """Check if MongoDB is available"""
    return mongo_available
