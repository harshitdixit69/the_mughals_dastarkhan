"""
Configuration and constants
"""
import os
from dotenv import load_dotenv
from pathlib import Path


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============== JWT CONFIGURATION ==============
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# ============== MONGODB CONFIGURATION ==============
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'mughals_dastarkhan')
MONGO_TIMEOUT_MS = 3000

# ============== EMAIL CONFIGURATION ==============
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'your-email@gmail.com')
SENDER_PASSWORD = os.environ.get('SENDER_PASSWORD', 'your-app-password')
SENDER_NAME = "The Mughal's Dastarkhwan"

# ============== CORS CONFIGURATION ==============
_cors_env = os.environ.get('CORS_ORIGINS', '')
CORS_ORIGINS = _cors_env.split(',') if _cors_env else [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://192.168.29.128:3000",
    "http://192.168.29.128:8081",
]

# ============== PAYMENT GATEWAY (RAZORPAY) ==============
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')

# ============== MENU CATEGORIES ==============
MENU_CATEGORIES = [
    {"id": "kebabs", "name": "Kebabs & Starters", "description": "Traditional Awadhi kebabs prepared with authentic spices"},
    {"id": "main-nonveg", "name": "Main Course – Non-Vegetarian", "description": "Rich, slow-cooked curries with authentic Mughlai flavors"},
    {"id": "main-veg", "name": "Main Course – Vegetarian", "description": "Flavorful vegetarian delicacies for every palate"},
    {"id": "biryani", "name": "Biryani & Rice", "description": "Aromatic long-grain rice dishes cooked to perfection"},
    {"id": "breads", "name": "Indian Breads", "description": "Freshly baked breads from our tandoor"},
    {"id": "desserts", "name": "Desserts", "description": "Traditional Indian sweets to end your meal"}
]

# ============== MENU ITEMS ==============
MENU_ITEMS = [
    # Kebabs & Starters
    {"id": 1, "category_id": "kebabs", "name": "Galouti Kebab", "price": 320, "description": "Melt-in-mouth minced mutton kebabs with secret spices", "is_veg": False, "is_popular": True},
    {"id": 2, "category_id": "kebabs", "name": "Seekh Kebab (Chicken)", "price": 280, "description": "Succulent minced chicken skewers grilled to perfection", "is_veg": False, "is_popular": False},
    {"id": 3, "category_id": "kebabs", "name": "Seekh Kebab (Mutton)", "price": 340, "description": "Juicy minced mutton skewers with aromatic herbs", "is_veg": False, "is_popular": False},
    {"id": 4, "category_id": "kebabs", "name": "Chicken Kalimirch", "price": 290, "description": "Tender chicken marinated with black pepper", "is_veg": False, "is_popular": False},
    {"id": 5, "category_id": "kebabs", "name": "Chicken Afghani", "price": 310, "description": "Creamy marinated chicken grilled in tandoor", "is_veg": False, "is_popular": True},
    {"id": 6, "category_id": "kebabs", "name": "Tandoori Chicken", "price": 350, "description": "Classic tandoori chicken with traditional masala", "is_veg": False, "is_popular": False},
    # Main Course Non-Veg
    {"id": 7, "category_id": "main-nonveg", "name": "Mutton Curry", "price": 380, "description": "Traditional mutton curry with balanced spices", "is_veg": False, "is_popular": True},
    {"id": 8, "category_id": "main-nonveg", "name": "Chicken Masala", "price": 320, "description": "Aromatic chicken curry with rich gravy", "is_veg": False, "is_popular": False},
    {"id": 9, "category_id": "main-nonveg", "name": "Chicken Korma", "price": 340, "description": "Creamy chicken in cashew and almond gravy", "is_veg": False, "is_popular": False},
    {"id": 10, "category_id": "main-nonveg", "name": "Mutton Korma", "price": 420, "description": "Rich mutton in royal Mughlai style korma", "is_veg": False, "is_popular": True},
    {"id": 11, "category_id": "main-nonveg", "name": "Rogan Josh", "price": 400, "description": "Kashmiri style aromatic mutton curry", "is_veg": False, "is_popular": False},
    # Main Course Veg
    {"id": 12, "category_id": "main-veg", "name": "Paneer Kali Mirch", "price": 280, "description": "Cottage cheese with black pepper gravy", "is_veg": True, "is_popular": False},
    {"id": 13, "category_id": "main-veg", "name": "Paneer Pasanda", "price": 290, "description": "Stuffed paneer in rich cashew gravy", "is_veg": True, "is_popular": True},
    {"id": 14, "category_id": "main-veg", "name": "Paneer Do Pyaza", "price": 270, "description": "Paneer with caramelized onions", "is_veg": True, "is_popular": False},
    {"id": 15, "category_id": "main-veg", "name": "Dal Makhani", "price": 220, "description": "Slow-cooked black lentils in butter gravy", "is_veg": True, "is_popular": True},
    {"id": 16, "category_id": "main-veg", "name": "Mixed Vegetable Curry", "price": 240, "description": "Seasonal vegetables in aromatic gravy", "is_veg": True, "is_popular": False},
    # Biryani & Rice
    {"id": 17, "category_id": "biryani", "name": "Mutton Biryani", "price": 380, "description": "Lucknowi style dum biryani with tender mutton", "is_veg": False, "is_popular": True},
    {"id": 18, "category_id": "biryani", "name": "Chicken Biryani", "price": 320, "description": "Fragrant rice layered with spiced chicken", "is_veg": False, "is_popular": True},
    {"id": 19, "category_id": "biryani", "name": "Veg Biryani", "price": 260, "description": "Aromatic rice with seasonal vegetables", "is_veg": True, "is_popular": False},
    {"id": 20, "category_id": "biryani", "name": "Steamed Rice", "price": 120, "description": "Plain steamed basmati rice", "is_veg": True, "is_popular": False},
    {"id": 21, "category_id": "biryani", "name": "Jeera Rice", "price": 150, "description": "Cumin-tempered fragrant rice", "is_veg": True, "is_popular": False},
    # Breads
    {"id": 22, "category_id": "breads", "name": "Rumali Roti", "price": 40, "description": "Paper-thin handkerchief bread", "is_veg": True, "is_popular": False},
    {"id": 23, "category_id": "breads", "name": "Tandoori Roti", "price": 30, "description": "Whole wheat bread from tandoor", "is_veg": True, "is_popular": False},
    {"id": 24, "category_id": "breads", "name": "Butter Naan", "price": 50, "description": "Soft leavened bread with butter", "is_veg": True, "is_popular": True},
    {"id": 25, "category_id": "breads", "name": "Lachha Paratha", "price": 60, "description": "Layered flaky paratha", "is_veg": True, "is_popular": False},
    {"id": 26, "category_id": "breads", "name": "Mughlai Paratha", "price": 80, "description": "Stuffed paratha Mughlai style", "is_veg": False, "is_popular": False},
    # Desserts
    {"id": 27, "category_id": "desserts", "name": "Shahi Tukda", "price": 120, "description": "Royal bread pudding with rabri", "is_veg": True, "is_popular": True},
    {"id": 28, "category_id": "desserts", "name": "Gulab Jamun", "price": 80, "description": "Soft milk dumplings in sugar syrup", "is_veg": True, "is_popular": False}
]

# ============== TESTIMONIALS ==============
TESTIMONIALS = [
    {"id": 1, "name": "Rahul Sharma", "rating": 5, "comment": "Authentic Lucknowi flavors! The Galouti Kebab and Mutton Biryani are absolutely divine. Feels like home.", "date": "2 weeks ago"},
    {"id": 2, "name": "Priya Verma", "rating": 5, "comment": "Best Awadhi food in Lucknow. The slow-cooked mutton korma is something else. Will definitely come back!", "date": "1 month ago"},
    {"id": 3, "name": "Amir Khan", "rating": 4, "comment": "Great family dining experience. Service is prompt and staff is very helpful with recommendations.", "date": "3 weeks ago"}
]

# ============== RESTAURANT INFO ==============
RESTAURANT_INFO = {
    "name": "The Mughal's Dastarkhwan",
    "tagline": "Authentic Mughlai & Awadhi Cuisine",
    "description": "Experience the rich culinary heritage of Lucknow with our traditional slow-cooked gravies, aromatic spices, and time-honored recipes passed down through generations.",
    "cuisine": ["Mughlai", "Awadhi", "North Indian"],
    "price_range": "₹700 - ₹900 for two",
    "rating": 4.5,
    "total_reviews": 2847,
    "established": 1985,
    "contact": {
        "address": "First Floor, Novelty Cinema Building, Kaiserbagh Officer's Colony, Lalbagh, Lucknow, Uttar Pradesh – 226001, India",
        "phone": "+91 522 404 4777",
        "email": "info@mughalsdastrkhwan.com",
        "hours": {
            "weekdays": "12:30 PM - 10:30 PM",
            "weekends": "12:30 PM - 10:30 PM",
            "note": "Timings may vary on public holidays"
        }
    }
}

# ============== DEMO USER CREDENTIALS ==============
DEMO_USER = {
    "email": "demo@mughals.com",
    "password": "demo123",
    "name": "Demo User",
    "phone": "+91 98765 43210"
}
