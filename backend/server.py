"""
The Mughal's Dastarkhwan - Main API Server
Refactored with modular structure for better maintainability
"""
import logging
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import configuration
from config import CORS_ORIGINS, DEMO_USER

# Import database utilities
from database import connect_db, close_db, initialize_collections, get_db, is_mongo_available

# Import authentication utilities
from auth import hash_password, add_to_users_store, users_store
import uuid
from datetime import datetime, timezone

# Import route modules
from routes.auth import auth_router
from routes.menu import menu_router, testimonials_router, restaurant_router
from routes.cart import cart_router
from routes.orders import orders_router
from routes.contact import contact_router
from routes.reservations import reservations_router
from routes.reviews import reviews_router
from routes.loyalty import loyalty_router
from routes.delivery import delivery_router
from routes.delivery_agents import delivery_agents_router
from routes.notifications import notifications_router
from routes.payments import payments_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="The Mughal's Dastarkhwan API",
    description="Authentic Mughlai & Awadhi Cuisine Restaurant API",
    version="1.0.0"
)

# Serve uploaded files
uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== STARTUP & SHUTDOWN EVENTS ==============

@app.on_event("startup")
async def startup_event():
    """Initialize database and collections on startup"""
    logger.info("Starting up application...")
    
    # Connect to MongoDB
    await connect_db()
    
    # Initialize database collections
    if is_mongo_available():
        await initialize_collections()
        
        # Create demo user in MongoDB if not exists
        db = get_db()
        demo_user = await db.users.find_one({'email': DEMO_USER['email']})
        if not demo_user:
            demo_user_data = {
                'id': str(uuid.uuid4()),
                'name': DEMO_USER['name'],
                'email': DEMO_USER['email'],
                'phone': DEMO_USER['phone'],
                'password_hash': hash_password(DEMO_USER['password']),
                'favorite_items': [],
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(demo_user_data)
            logger.info(f"Created demo user (email: {DEMO_USER['email']}, password: {DEMO_USER['password']})")
    else:
        # Create demo user in in-memory storage
        if not any(u['email'] == DEMO_USER['email'] for u in users_store):
            demo_user_data = {
                'id': str(uuid.uuid4()),
                'name': DEMO_USER['name'],
                'email': DEMO_USER['email'],
                'phone': DEMO_USER['phone'],
                'password_hash': hash_password(DEMO_USER['password']),
                'favorite_items': [],
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            add_to_users_store(demo_user_data)
            logger.info(f"Created demo user in memory (email: {DEMO_USER['email']}, password: {DEMO_USER['password']})")
    
    logger.info("Application startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown"""
    logger.info("Shutting down application...")
    await close_db()
    logger.info("Application shutdown complete")


# ============== ROOT ROUTE ==============

@app.get("/")
async def root():
    """Welcome endpoint"""
    return {
        "message": "Welcome to The Mughal's Dastarkhwan API",
        "description": "Authentic Mughlai & Awadhi Cuisine",
        "version": "1.0.0",
        "docs": "/docs"
    }


# ============== REGISTER ROUTERS ==============

# Authentication routes
app.include_router(auth_router, prefix="/api")

# Menu routes
app.include_router(menu_router, prefix="/api")
app.include_router(testimonials_router, prefix="/api")
app.include_router(restaurant_router, prefix="/api")

# Shopping cart routes
app.include_router(cart_router, prefix="/api/auth")

# Order routes
app.include_router(orders_router, prefix="/api/auth")

# Reservation routes
app.include_router(reservations_router, prefix="/api/auth")

# Reviews & Ratings routes
app.include_router(reviews_router, prefix="/api/auth")

# Loyalty Program routes
app.include_router(loyalty_router, prefix="/api/auth")

# Notification routes
app.include_router(notifications_router, prefix="/api/auth")

# Payment routes
app.include_router(payments_router, prefix="/api/auth")

# Delivery routes
app.include_router(delivery_router, prefix="/api/auth")

# Delivery Agent routes
app.include_router(delivery_agents_router, prefix="/api/auth")

# Contact routes
app.include_router(contact_router, prefix="/api")


# ============== HEALTH CHECK ==============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "database": "connected" if is_mongo_available() else "in-memory",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )
