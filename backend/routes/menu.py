"""
Menu routes - categories, items, testimonials
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from models import MenuCategory, MenuItem, MenuItemUpdate, Testimonial, RestaurantInfo
from config import MENU_CATEGORIES, MENU_ITEMS, TESTIMONIALS, RESTAURANT_INFO
from database import get_db, is_mongo_available
from auth import get_current_user

logger = logging.getLogger(__name__)
menu_router = APIRouter(prefix="/menu", tags=["menu"])


@menu_router.get("/categories", response_model=List[MenuCategory])
async def get_menu_categories():
    """Get all menu categories from database"""
    try:
        if is_mongo_available():
            db = get_db()
            categories = await db.menu_categories.find({}, {'_id': 0}).to_list(100)
            return categories if categories else MENU_CATEGORIES
        return MENU_CATEGORIES
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        return MENU_CATEGORIES


@menu_router.get("", response_model=List[MenuItem])
async def get_menu_items(category_id: Optional[str] = None):
    """Get menu items from database, optionally filtered by category"""
    try:
        if is_mongo_available():
            db = get_db()
            query = {'category_id': category_id} if category_id else {}
            items = await db.menu_items.find(query, {'_id': 0}).to_list(200)
            return items if items else MENU_ITEMS
        
        if category_id:
            return [item for item in MENU_ITEMS if item["category_id"] == category_id]
        return MENU_ITEMS
    except Exception as e:
        logger.error(f"Error fetching menu items: {e}")
        if category_id:
            return [item for item in MENU_ITEMS if item["category_id"] == category_id]
        return MENU_ITEMS


@menu_router.get("/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: int):
    """Get a specific menu item by ID from database"""
    try:
        if is_mongo_available():
            db = get_db()
            item = await db.menu_items.find_one({'id': item_id}, {'_id': 0})
            if item:
                return item
        
        for item in MENU_ITEMS:
            if item["id"] == item_id:
                return item
        raise HTTPException(status_code=404, detail="Menu item not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching menu item: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch menu item")


@menu_router.put("/{item_id}")
async def update_menu_item(item_id: int, update_data: MenuItemUpdate, current_user: dict = Depends(get_current_user)):
    """Update a menu item (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")

        update_doc = {k: v for k, v in update_data.model_dump().items() if v is not None}
        if not update_doc:
            raise HTTPException(status_code=400, detail="No fields to update")

        if is_mongo_available():
            db = get_db()
            result = await db.menu_items.update_one({'id': item_id}, {'$set': update_doc})
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Menu item not found")
        else:
            item_found = False
            for item in MENU_ITEMS:
                if item.get('id') == item_id:
                    item.update(update_doc)
                    item_found = True
                    break
            if not item_found:
                raise HTTPException(status_code=404, detail="Menu item not found")

        return {"message": "Menu item updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating menu item: {e}")
        raise HTTPException(status_code=500, detail="Failed to update menu item")


# ============== TESTIMONIALS ==============

testimonials_router = APIRouter(prefix="/testimonials", tags=["testimonials"])


@testimonials_router.get("", response_model=List[Testimonial])
async def get_testimonials():
    """Get all testimonials from database"""
    try:
        if is_mongo_available():
            db = get_db()
            testimonials = await db.testimonials.find({}, {'_id': 0}).to_list(100)
            return testimonials if testimonials else TESTIMONIALS
        return TESTIMONIALS
    except Exception as e:
        logger.error(f"Error fetching testimonials: {e}")
        return TESTIMONIALS


# ============== RESTAURANT INFO ==============

restaurant_router = APIRouter(prefix="/restaurant", tags=["restaurant"])


@restaurant_router.get("", response_model=RestaurantInfo)
async def get_restaurant_info():
    """Get restaurant information from database"""
    try:
        if is_mongo_available():
            db = get_db()
            info = await db.restaurant_info.find_one({}, {'_id': 0})
            if info:
                return info
        return RESTAURANT_INFO
    except Exception as e:
        logger.error(f"Error fetching restaurant info: {e}")
        return RESTAURANT_INFO
