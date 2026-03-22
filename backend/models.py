"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime


# ============== CONTACT MESSAGE MODELS ==============

class ContactMessageCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    message: str = Field(..., min_length=10, max_length=1000)


class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    message: str
    is_read: bool = False
    created_at: datetime


class ContactMessageResponse(BaseModel):
    id: str
    success: bool
    message: str


# ============== USER MODELS ==============

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str]
    role: Optional[str] = None
    favorite_items: List[int] = Field(default_factory=list)
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ============== CART MODELS ==============

class CartItem(BaseModel):
    item_id: int
    quantity: int = Field(..., ge=1, le=100)


# ============== ORDER MODELS ==============

class OrderCreate(BaseModel):
    items: List[CartItem] = Field(..., min_items=1)
    table_number: Optional[int] = Field(None, ge=1, le=100)
    phone: str = Field(..., min_length=10, max_length=15)
    order_type: str = Field(default="dine-in")  # dine-in, takeaway
    notes: Optional[str] = Field(None, max_length=500)
    coupon_code: Optional[str] = Field(None, max_length=20)
    discount_amount: Optional[int] = Field(default=0, ge=0)
    payment_method: Optional[str] = Field(default="cod", max_length=30)


class Order(BaseModel):
    id: str
    user_id: str
    items: List[CartItem]
    table_number: Optional[int] = None
    phone: str
    order_type: str
    total_amount: int
    status: str
    notes: Optional[str] = None
    coupon_code: Optional[str] = None
    discount_amount: Optional[int] = 0
    payment_method: Optional[str] = None
    created_at: datetime


class OrderResponse(BaseModel):
    id: str
    status: str
    total_amount: int
    created_at: datetime


# ============== PAYMENT MODELS ==============

class PaymentOrderCreate(BaseModel):
    amount: int = Field(..., ge=1, description="Amount in INR")
    currency: str = Field(default="INR", max_length=5)
    receipt: Optional[str] = Field(None, max_length=100)
    notes: Optional[dict] = None


class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ============== MENU MODELS ==============

class MenuCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    description: str


class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: int
    category_id: str
    name: str
    price: int
    description: str
    is_veg: bool
    is_popular: bool = False


class MenuItemUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    price: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, min_length=5, max_length=500)
    is_veg: Optional[bool] = None
    is_popular: Optional[bool] = None


# ============== TESTIMONIAL MODELS ==============

class Testimonial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: int
    name: str
    rating: int
    comment: str
    date: str


# ============== RESERVATION MODELS ==============

class ReservationCreate(BaseModel):
    date: str = Field(..., description="Reservation date (YYYY-MM-DD)")
    time: str = Field(..., description="Reservation time (HH:MM)")
    party_size: int = Field(..., ge=1, le=20, description="Number of guests")
    guest_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    email: EmailStr
    special_requests: Optional[str] = Field(None, max_length=500)


class Reservation(BaseModel):
    id: str
    user_id: str
    date: str
    time: str
    party_size: int
    guest_name: str
    phone: str
    email: str
    special_requests: Optional[str] = None
    status: str  # pending, confirmed, seated, completed, cancelled, no-show
    table_number: Optional[int] = None
    created_at: datetime
    reservation_datetime: str  # Combined date and time


class ReservationResponse(BaseModel):
    id: str
    status: str
    date: str
    time: str
    party_size: int
    created_at: datetime


# ============== REVIEW MODELS ==============

class ReviewCreate(BaseModel):
    menu_item_id: int
    rating: int = Field(..., ge=1, le=5, description="Star rating 1-5")
    comment: str = Field(..., min_length=10, max_length=1000)
    photo_url: Optional[str] = None


class Review(BaseModel):
    id: str
    menu_item_id: int
    user_id: str
    user_name: str
    rating: int
    comment: str
    photo_url: Optional[str] = None
    status: str  # pending, approved, rejected
    created_at: datetime


class ReviewResponse(BaseModel):
    id: str
    rating: int
    comment: str
    user_name: str
    user_id: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime


# ============== LOYALTY MODELS ==============

class UserLoyalty(BaseModel):
    user_id: str
    points: int = 0
    lifetime_spent: int = 0
    member_tier: str = "bronze"  # bronze, silver, gold, platinum
    tier_points: int = 0  # Points towards next tier
    created_at: datetime


class Coupon(BaseModel):
    id: str
    code: str = Field(..., min_length=3, max_length=20)
    discount_type: str  # percentage, fixed_amount
    discount_value: int  # percentage (0-100) or amount in paisa
    min_order_amount: int = 0
    max_uses: int
    current_uses: int = 0
    is_active: bool = True
    expiry_date: Optional[datetime] = None
    created_at: datetime


class PointsTransaction(BaseModel):
    id: str
    user_id: str
    order_id: Optional[str] = None
    points: int
    transaction_type: str  # earned, redeemed, bonus
    description: str
    created_at: datetime


class CouponValidation(BaseModel):
    coupon_code: str = Field(..., min_length=3, max_length=20)
    order_amount: int = Field(..., ge=0)


class LoyaltyAddPoints(BaseModel):
    user_id: str
    order_id: str
    amount: int = Field(..., ge=0)


class PromotionalEmailRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10, max_length=2000)
    offer_code: Optional[str] = Field(None, max_length=20)


# ============== RESTAURANT INFO MODELS ==============

class OperatingHours(BaseModel):
    weekdays: str
    weekends: str
    note: str


class ContactInfo(BaseModel):
    address: str
    phone: str
    email: str
    hours: OperatingHours


class RestaurantInfo(BaseModel):
    name: str
    tagline: str
    description: str
    cuisine: List[str]
    price_range: str
    rating: float
    total_reviews: int
    established: int
    contact: ContactInfo
