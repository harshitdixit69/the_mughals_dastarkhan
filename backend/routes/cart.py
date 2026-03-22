"""
Shopping cart routes
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from models import CartItem
from auth import get_current_user
from utils import get_menu_item_by_id

logger = logging.getLogger(__name__)
cart_router = APIRouter(prefix="/cart", tags=["cart"])

# In-memory storage for shopping carts (user_id -> list of cart items)
carts_store: dict = {}


@cart_router.get("")
async def get_cart(current_user: dict = Depends(get_current_user)):
    """Get current user's shopping cart"""
    user_id = current_user['id']
    cart = carts_store.get(user_id, [])
    
    # Enrich cart with menu item details
    enriched_cart = []
    for item in cart:
        menu_item = get_menu_item_by_id(item["item_id"])
        if menu_item:
            enriched_cart.append({
                "item_id": item["item_id"],
                "quantity": item["quantity"],
                "name": menu_item["name"],
                "price": menu_item["price"],
                "description": menu_item.get("description", ""),
                "is_veg": menu_item.get("is_veg", False)
            })
    
    return {"items": enriched_cart}


@cart_router.post("")
async def add_to_cart(cart_item: CartItem, current_user: dict = Depends(get_current_user)):
    """Add item to cart or update quantity"""
    user_id = current_user['id']
    
    # Verify item exists
    menu_item = get_menu_item_by_id(cart_item.item_id)
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    if user_id not in carts_store:
        carts_store[user_id] = []
    
    # Check if item already in cart
    existing_item = None
    for item in carts_store[user_id]:
        if item["item_id"] == cart_item.item_id:
            existing_item = item
            break
    
    if existing_item:
        existing_item["quantity"] += cart_item.quantity
    else:
        carts_store[user_id].append(cart_item.model_dump())
    
    return {"message": "Item added to cart", "quantity": cart_item.quantity}


@cart_router.put("/{item_id}")
async def update_cart_quantity(item_id: int, quantity: int, current_user: dict = Depends(get_current_user)):
    """Update quantity of item in cart"""
    if quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    
    user_id = current_user['id']
    if user_id not in carts_store:
        raise HTTPException(status_code=404, detail="Cart is empty")
    
    for item in carts_store[user_id]:
        if item["item_id"] == item_id:
            item["quantity"] = max(1, quantity)
            return {"message": "Quantity updated"}
    
    raise HTTPException(status_code=404, detail="Item not in cart")


@cart_router.delete("/{item_id}")
async def remove_from_cart(item_id: int, current_user: dict = Depends(get_current_user)):
    """Remove item from cart"""
    user_id = current_user['id']
    if user_id not in carts_store:
        raise HTTPException(status_code=404, detail="Cart is empty")
    
    carts_store[user_id] = [item for item in carts_store[user_id] if item["item_id"] != item_id]
    return {"message": "Item removed from cart"}


@cart_router.post("/clear")
async def clear_cart(current_user: dict = Depends(get_current_user)):
    """Clear entire cart"""
    user_id = current_user['id']
    carts_store[user_id] = []
    return {"message": "Cart cleared"}


def get_carts_store() -> dict:
    """Get carts store for access from other modules"""
    return carts_store
