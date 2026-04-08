"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
from datetime import datetime


# ============== ORDER STATUS PIPELINE ==============

ORDER_STATUSES = [
    'placed', 'accepted', 'preparing', 'ready', 'ready_for_pickup',
    'assigned', 'accepted_by_agent', 'picked_up',
    'out_for_delivery', 'delivered', 'cancelled'
]

# Valid status transitions: current_status -> [allowed_next_statuses]
STATUS_TRANSITIONS: Dict[str, List[str]] = {
    'placed': ['accepted', 'cancelled'],
    'accepted': ['preparing', 'cancelled'],
    'preparing': ['ready', 'ready_for_pickup', 'cancelled'],
    'ready': ['assigned', 'delivered', 'cancelled'],           # delivered for dine-in, assigned for delivery
    'ready_for_pickup': ['delivered', 'cancelled'],             # pickup orders collected by customer
    'assigned': ['accepted_by_agent', 'picked_up', 'ready', 'cancelled'],  # picked_up if no agent flow, ready if agent declines
    'accepted_by_agent': ['picked_up', 'cancelled'],
    'picked_up': ['out_for_delivery'],
    'out_for_delivery': ['delivered'],
    'delivered': [],
    'cancelled': [],
}


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
    referral_code: Optional[str] = Field(None, max_length=20)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class SavedAddress(BaseModel):
    id: Optional[str] = None
    label: str = Field(..., min_length=1, max_length=50)  # e.g. "Home", "Work"
    address: str = Field(..., min_length=5, max_length=500)
    landmark: Optional[str] = Field(None, max_length=200)
    is_default: bool = False


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    addresses: Optional[List[SavedAddress]] = None
    whatsapp_notifications: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str]
    role: Optional[str] = None
    favorite_items: List[int] = Field(default_factory=list)
    addresses: List[SavedAddress] = Field(default_factory=list)
    referral_code: Optional[str] = None
    referral_count: int = 0
    whatsapp_notifications: bool = False
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
    # Delivery fields
    delivery_type: Optional[str] = Field(default=None, max_length=30)  # pickup, self_delivery, external_delivery
    delivery_partner: Optional[str] = Field(default=None, max_length=30)  # dunzo, porter, shadowfax
    delivery_charge: Optional[int] = Field(default=0, ge=0)
    delivery_address: Optional[str] = Field(None, max_length=500)
    delivery_note: Optional[str] = Field(None, max_length=300)


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
    delivery_type: Optional[str] = None
    delivery_partner: Optional[str] = None
    delivery_charge: Optional[int] = 0
    delivery_address: Optional[str] = None
    delivery_note: Optional[str] = None
    delivery_status: Optional[str] = None
    delivery_tracking_id: Optional[str] = None
    delivery_agent_id: Optional[str] = None
    delivery_agent_name: Optional[str] = None
    # Porter / manual delivery fields
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    status_history: List[dict] = Field(default_factory=list)
    accepted_at: Optional[str] = None
    picked_up_at: Optional[str] = None
    delivered_at: Optional[str] = None
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


class MenuItemCreate(BaseModel):
    category_id: str
    name: str = Field(..., min_length=2, max_length=100)
    price: int = Field(..., ge=0)
    description: str = Field(..., min_length=5, max_length=500)
    is_veg: bool = False
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
    source: Optional[str] = None  # "website" for direct orders


class LoyaltyAddPoints(BaseModel):
    user_id: str
    order_id: str
    amount: int = Field(..., ge=0)


class PromotionalEmailRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=10, max_length=2000)
    offer_code: Optional[str] = Field(None, max_length=20)


# ============== DELIVERY AGENT MODELS ==============

class DeliveryAgentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    email: EmailStr
    vehicle_type: str = Field(default="bike", max_length=30)  # bike, scooter, car


class DeliveryAgent(BaseModel):
    id: str
    name: str
    phone: str
    email: str
    vehicle_type: str = "bike"
    is_available: bool = True
    is_active: bool = True
    current_order_id: Optional[str] = None
    total_deliveries: int = 0
    created_at: datetime


class DeliveryAgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, min_length=10, max_length=15)
    vehicle_type: Optional[str] = Field(None, max_length=30)
    is_available: Optional[bool] = None
    is_active: Optional[bool] = None


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New status for the order")
    note: Optional[str] = Field(None, max_length=300)


class AgentAssignRequest(BaseModel):
    agent_id: str = Field(..., description="ID of the delivery agent to assign")


class DeliveryAssignRequest(BaseModel):
    """Manual delivery assignment (Porter etc.)"""
    delivery_partner: str = Field(default="porter", max_length=30)
    tracking_id: Optional[str] = Field(None, max_length=100)
    driver_name: str = Field(..., min_length=2, max_length=100)
    driver_phone: str = Field(..., min_length=10, max_length=15)


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
