# Backend Refactoring - Project Structure

## Overview
The backend has been refactored from a monolithic `server.py` file into a modular, maintainable structure following FastAPI best practices.

## New Directory Structure

```
backend/
├── server.py                 # Main application entry point (refactored)
├── config.py                 # Configuration, constants, and environment variables
├── models.py                 # Pydantic models for request/response validation
├── database.py               # MongoDB connection and initialization utilities
├── auth.py                   # Authentication logic (password hashing, JWT, user verification)
├── utils.py                  # Utility functions (menu operations, order calculations)
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables
├── routes/                   # API route modules
│   ├── __init__.py
│   ├── auth.py              # Authentication endpoints (register, login, profile, favorites)
│   ├── menu.py              # Menu endpoints (categories, items, testimonials, restaurant info)
│   ├── cart.py              # Shopping cart endpoints (add, update, delete items)
│   ├── orders.py            # Order endpoints (create, list, update status)
│   └── contact.py           # Contact message endpoints
├── models/                   # (legacy - can be removed)
├── utils/                    # (legacy - can be removed)
└── data/                     # (legacy - can be removed)
```

## Module Descriptions

### Core Modules

**server.py** (Entry Point)
- Initializes FastAPI application
- Sets up CORS middleware
- Registers startup/shutdown events
- Includes all route routers
- Health check endpoint

**config.py** (Configuration)
- JWT and MongoDB configuration
- CORS settings
- Menu categories and items (seed data)
- Testimonials and restaurant info
- Demo user credentials

**models.py** (Data Models)
- `ContactMessage` and related models
- `User`, `UserRegister`, `UserLogin`, `UserResponse`, `TokenResponse`
- `CartItem` and cart-related models
- `Order`, `OrderCreate`, `OrderResponse`
- `MenuItem`, `MenuCategory`, `Testimonial`, `RestaurantInfo`

**database.py** (Database Utilities)
- `connect_db()` - Connect to MongoDB
- `close_db()` - Close database connection
- `initialize_collections()` - Seed database on startup
- `get_db()` - Access database instance
- `is_mongo_available()` - Check MongoDB status

**auth.py** (Authentication)
- `hash_password()` - Hash passwords with bcrypt
- `verify_password()` - Verify password against hash
- `create_access_token()` - Generate JWT tokens
- `verify_access_token()` - Validate and decode JWT
- `get_current_user()` - Dependency for protected routes
- In-memory user storage fallback

**utils.py** (Utilities)
- `get_menu_item_by_id()` - Fetch menu item by ID
- `calculate_order_total()` - Calculate order total with tax/charges

### Route Modules (in `routes/`)

**auth.py** - Authentication Routes
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/favorites/{item_id}` - Add to favorites
- `DELETE /api/auth/favorites/{item_id}` - Remove from favorites

**menu.py** - Menu & Info Routes
- `GET /api/menu/categories` - List all categories
- `GET /api/menu` - List menu items (with optional category filter)
- `GET /api/menu/{item_id}` - Get specific menu item
- `GET /api/testimonials` - List testimonials
- `GET /api/restaurant` - Get restaurant info

**cart.py** - Shopping Cart Routes
- `GET /api/auth/cart` - Get user's cart
- `POST /api/auth/cart` - Add item to cart
- `PUT /api/auth/cart/{item_id}` - Update item quantity
- `DELETE /api/auth/cart/{item_id}` - Remove item from cart
- `POST /api/auth/cart/clear` - Clear entire cart

**orders.py** - Order Routes
- `POST /api/auth/orders` - Create new order
- `GET /api/auth/orders` - Get order history
- `PUT /api/auth/orders/{order_id}` - Update order status

**contact.py** - Contact Routes
- `POST /api/contact` - Submit contact message
- `GET /api/contact` - Get all contact messages

## Key Features of Refactored Code

### 1. **Separation of Concerns**
   - Configuration separate from application logic
   - Models in dedicated module
   - Database utilities isolated
   - Authentication logic centralized
   - Routes grouped by functionality

### 2. **Improved Maintainability**
   - Each module has single responsibility
   - Easy to locate and modify specific features
   - Reduced file size (main server.py now ~150 lines vs 950 lines)
   - Clear import structure

### 3. **Better Testability**
   - Utility functions easy to unit test
   - Modular authentication for testing
   - Separated concerns reduce dependencies

### 4. **Scalability**
   - Easy to add new route modules
   - Can be expanded with middleware
   - Supports multiple environment configurations

### 5. **Code Reusability**
   - Authentication utilities used across routes
   - Database helpers centralized
   - Utility functions shared by multiple routes

## Dependency Graph

```
server.py
├── config.py (Configuration & Constants)
├── database.py (Database Connection)
│   └── config.py
├── auth.py (Authentication)
│   ├── config.py
│   └── database.py
├── routes/
│   ├── auth.py
│   │   ├── models.py
│   │   ├── auth.py
│   │   └── database.py
│   ├── menu.py
│   │   ├── models.py
│   │   ├── config.py
│   │   └── database.py
│   ├── cart.py
│   │   ├── models.py
│   │   ├── auth.py
│   │   └── utils.py
│   ├── orders.py
│   │   ├── models.py
│   │   ├── auth.py
│   │   ├── utils.py
│   │   ├── routes/cart.py
│   │   └── database.py
│   └── contact.py
│       ├── models.py
│       └── database.py
```

## Database Collections

MongoDB Collections used:
- `users` - User accounts and authentication
- `orders` - Order history
- `menu_categories` - Food categories
- `menu_items` - Menu items with prices
- `testimonials` - Customer testimonials
- `restaurant_info` - Restaurant information
- `contact_messages` - Contact form submissions

## Demo Credentials

**Email:** `demo@mughals.com`  
**Password:** `demo123`

Created automatically on startup (both MongoDB and in-memory storage)

## Migration Notes

### Old → New Location
| Old | New |
|-----|-----|
| All models in server.py | models.py |
| JWT/password functions | auth.py |
| MongoDB init | database.py |
| Configuration constants | config.py |
| Menu utilities | utils.py |
| All auth endpoints | routes/auth.py |
| All menu endpoints | routes/menu.py |
| All cart endpoints | routes/cart.py |
| All order endpoints | routes/orders.py |
| All contact endpoints | routes/contact.py |

### Backward Compatibility
✅ All API endpoints remain the same  
✅ Same request/response schemas  
✅ Same database collections  
✅ Same authentication mechanism  
✅ Same demo user creation  

## Running the Server

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

Or:
```bash
cd backend
python server.py
```

## Environment Variables (.env)

```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=mughals_dastarkhan
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Benefits Summary

✅ **Cleaner Code** - 150 lines in server.py vs 950 lines  
✅ **Better Organization** - Clear module hierarchy  
✅ **Easier Debugging** - Features isolated to specific modules  
✅ **Faster Development** - Easy to add new features  
✅ **Team Collaboration** - Multiple developers can work on different modules  
✅ **Production Ready** - Follows FastAPI best practices  
✅ **Maintainable** - Easy to understand and modify  
