# The Mughal's Dastarkhwan — Project Context

## Tech Stack
- **Backend:** FastAPI + Uvicorn (port 8000), Python 3.11, MongoDB Atlas (Motor async), JWT auth (HS256, 24hr), Razorpay SDK, Bcrypt
- **Frontend:** React 18.2 (CRA + craco), React Router v7, Axios, TailwindCSS, Radix UI, lucide-react icons, sonner toasts
- **DB:** `mongodb+srv://...@sample.9rnludv.mongodb.net/mughals_dastarkhan` (URI in `backend/.env`)
- **Deploy:** Docker Compose (backend:8000, frontend:nginx:80) + Render.com
- **GitHub:** `harshitdixit69/the_mughals_dastarkhan`
- **Venv:** `.venv` at workspace root

## Project Structure
```
backend/
  server.py          — FastAPI app, CORS, router registration
  config.py          — 28 menu items, 6 categories, 5 coupons, restaurant info, demo user
  database.py        — MongoDB connection + seed data (menu, coupons, demo user)
  models.py          — All Pydantic models (User, Order, Menu, Cart, Delivery, etc.)
  auth.py            — JWT create/verify, get_current_user dependency
  email_service.py   — Email templates (order confirm, reservation, promotions)
  utils.py           — Helpers
  routes/
    auth.py          — /register, /login, /me, /favorites/{id}
    menu.py          — /menu/categories, /menu, /menu/{id}, /restaurant/info, /testimonials
    cart.py          — /cart GET/POST, /cart/{id} PUT/DELETE, /cart/clear
    orders.py        — /orders POST/GET, /orders/{id} DELETE/PUT (status update + loyalty points)
    reservations.py  — /reservations CRUD + /admin/send-reminders
    reviews.py       — /reviews POST/GET + /upload photo + /admin/{id}/approve|reject
    loyalty.py       — /loyalty/status, /coupons, /validate-coupon, /auto-apply-direct, /admin/create-coupon
    delivery.py      — /delivery/estimate, /book, /track/{id}, /status/{id}, /partners
    payments.py      — /payments/create-order, /verify (Razorpay)
    notifications.py — /notifications/admin/promotions
    contact.py       — /contact POST/GET

frontend/src/
  App.js             — BrowserRouter, 7 routes inside Layout + /login outside
  components/
    Layout.jsx       — Header + Outlet, hides header on /login, hides nav on /admin
    Header.jsx       — Two-section header (dark top bar + white nav), cart badge, auth links
    Hero.jsx         — Landing hero section
    About.jsx        — Restaurant story
    Menu.jsx         — Category tabs, veg filter, add-to-cart with quantity
    Cart.jsx         — Cart items, quantity controls, order summary, checkout button
    Contact.jsx      — Contact form
    DiningExperience.jsx — Testimonials carousel
    DirectOrderBanner.jsx — Green "Order direct & save 10%" promo banner
    ReviewsComponent.jsx — Display approved reviews with photos
    Footer.jsx       — Restaurant info, links
    ErrorBoundary.jsx
    ui/              — Radix-based: button, card, input, label, separator, badge, dialog, etc.
  pages/
    HomePage.jsx     — Assembles Hero + About + Menu + DiningExperience + Contact + Footer
    LoginPage.jsx    — Login/signup toggle form
    CheckoutPage.jsx — Order type (dine-in/takeaway/delivery), delivery geolocation, coupons, Razorpay
    ProfilePage.jsx  — User info, order history with delivery details
    ReservationPage.jsx — Table booking form
    LoyaltyPage.jsx  — Points, tier, coupon list
    AdminDashboard.jsx — 7 tabs: analytics, orders, reservations, reviews, menu edit, coupons, promotions
  services/api.js    — Axios instance + all API objects (authApi, cartApi, ordersApi, menuApi, paymentsApi, loyaltyApi, reservationsApi, reviewsApi, deliveryApi, contactApi, notificationsApi, restaurantApi)
  data/mock.js       — Fallback data for menu, restaurant info

Routes: / | /login | /cart | /checkout | /profile | /reservations | /loyalty | /admin
```

## Router Prefixes (server.py)
- `/api` — auth, menu, testimonials, restaurant, contact
- `/api/auth` — cart, orders, reservations, reviews, loyalty, notifications, payments, delivery

## Key Features

### Auth
- Email/password register + login, JWT in localStorage, role-based (admin dashboard)
- Demo: `demo@mughals.com` / `demo123`

### Menu & Cart
- 28 items, 6 categories, veg/non-veg filter, favorites
- In-memory cart per user, quantity controls, cart badge in header

### Checkout & Orders
- 3 order types: dine-in (table#), takeaway, delivery
- Payment: COD or Razorpay (lazy-loaded script)
- Auto-apply DIRECT10 coupon (10% off, `coupon_type: direct_only`)
- Manual coupons: WELCOME20, MUGHAL50, BIRYANI100, FEAST10
- Loyalty points: 1 pt per ₹10 spent, auto-awarded on order

### Delivery System
- User clicks "Use My Location" → browser geolocation → Haversine distance from restaurant (26.8467°N, 80.9462°E Kaiserbagh, Lucknow)
- Partners: Dunzo (₹40+₹10/km, 22km/h), Porter (₹35+₹8/km, 18km/h), Shadowfax (₹45+₹7/km, 25km/h)
- Self-delivery: ₹30, max 3km, 20km/h
- ETA = food prep (18min) + partner pickup time + travel (distance/speed)
- Pickup option always free
- Tracking: booked → picked_up → in_transit → delivered

### Loyalty Program
- Tiers: Bronze → Silver (1000pts) → Gold (3000pts) → Platinum (5000pts)
- Multipliers: 1x → 1.5x → 2x → 3x
- 5 coupons seeded in DB (DIRECT10 has safety check in database.py seed)

### Reservations
- Date/time (future only), party 1-20, 10 tables/slot
- Statuses: pending → confirmed → seated → completed | cancelled | no-show
- Admin: assign tables, send email reminders

### Reviews
- 1-5 stars, text, optional photo upload (stored in /backend/uploads/reviews/)
- Admin moderation: approve/reject, only approved shown publicly

### Admin Dashboard (7 tabs)
- Analytics, orders management, reservations, review moderation, menu price editing, coupon management, email promotions

### Contact
- Name/email/message form → stored in DB → admin can view

## DB Collections
users, menu_categories, menu_items, orders, reservations, reviews, loyalty, coupons, deliveries, contact_messages

## Known Notes
- Header nav links (Home, About, Menu, etc.) use `scrollToElement('#section')` — only works on HomePage. From other pages like /cart, clicking "Home" tries to scroll instead of navigating to `/`.
- Cart is in-memory (backend), not persisted in DB — lost on server restart
- DIRECT10 coupon seeded into MongoDB with safety check in database.py
- Menu items are hardcoded in config.py, seeded to DB on startup
