# The Mughal's Dastarkhwan - API Contracts

## Overview
Backend API for restaurant website with contact form submissions and menu management.

## Mock Data to Replace
- `src/data/mock.js` contains: menuCategories, testimonials, contactInfo, restaurantInfo
- Contact form currently simulates submission with setTimeout

## API Endpoints

### 1. Contact Messages
```
POST /api/contact
Request: { name: string, email: string, phone?: string, message: string }
Response: { id: string, success: true, message: "Message sent successfully" }
```

```
GET /api/contact (admin)
Response: [{ id, name, email, phone, message, created_at, is_read }]
```

### 2. Menu Items
```
GET /api/menu
Response: [{ id, category_id, name, price, description, is_veg, is_popular }]
```

```
GET /api/menu/categories
Response: [{ id, name, description }]
```

### 3. Testimonials
```
GET /api/testimonials
Response: [{ id, name, rating, comment, date }]
```

### 4. Restaurant Info
```
GET /api/restaurant
Response: { name, tagline, description, cuisine, priceRange, rating, hours, contact }
```

## MongoDB Collections
- `contact_messages` - stores contact form submissions
- `menu_items` - menu items with category reference
- `menu_categories` - menu categories
- `testimonials` - customer reviews

## Frontend Integration
- Replace mock imports with API calls using axios
- Use REACT_APP_BACKEND_URL environment variable
- Add loading states and error handling
