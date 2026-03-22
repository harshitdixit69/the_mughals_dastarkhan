"""
Utility functions for menu and orders
"""
from typing import Optional, List
import logging
from config import MENU_ITEMS

logger = logging.getLogger(__name__)


def get_menu_item_by_id(item_id: int) -> Optional[dict]:
    """Get menu item by ID from hardcoded list"""
    for item in MENU_ITEMS:
        if item["id"] == item_id:
            return item
    return None


def calculate_order_total(items) -> int:
    """Calculate total from cart items with quantities"""
    total = 0
    for item in items:
        # Handle both Pydantic models and dicts
        item_id = item.item_id if hasattr(item, 'item_id') else item.get('item_id')
        quantity = item.quantity if hasattr(item, 'quantity') else item.get('quantity')
        menu_item = get_menu_item_by_id(item_id)
        if menu_item:
            total += menu_item["price"] * quantity
    return total
