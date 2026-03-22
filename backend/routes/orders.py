"""
Order routes - create, list, update status
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from models import OrderCreate, Order, OrderResponse
from auth import get_current_user
from utils import calculate_order_total
from routes.cart import get_carts_store
from database import get_db, is_mongo_available
from email_service import send_order_confirmation_email
from routes.loyalty import get_user_tier, loyalty_store, points_transaction_store

logger = logging.getLogger(__name__)
orders_router = APIRouter(prefix="/orders", tags=["orders"])

# In-memory storage for orders (when MongoDB is not available)
orders_store: List[dict] = []


@orders_router.post("", response_model=OrderResponse)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    """Create a new dine-in or takeaway order"""
    try:
        order_id = str(uuid.uuid4())
        subtotal = calculate_order_total(order_data.items)
        discount_amount = max(0, order_data.discount_amount or 0)
        total_amount = max(0, subtotal - discount_amount)
        created_at = datetime.now(timezone.utc)

        order_doc = {
            'id': order_id,
            'user_id': current_user['id'],
            'items': [item.model_dump() for item in order_data.items],
            'table_number': order_data.table_number,
            'phone': order_data.phone,
            'order_type': order_data.order_type,
            'total_amount': total_amount,
            'status': 'pending',
            'notes': order_data.notes,
            'coupon_code': order_data.coupon_code,
            'discount_amount': discount_amount,
            'payment_method': order_data.payment_method,
            'created_at': created_at.isoformat()
        }

        if is_mongo_available():
            db = get_db()
            await db.orders.insert_one(order_doc)
        else:
            orders_store.append(order_doc)
        
        # Clear the cart after order creation
        user_id = current_user['id']
        carts_store = get_carts_store()
        if user_id in carts_store:
            carts_store[user_id] = []

        # Send order confirmation email
        if current_user.get('email'):
            send_order_confirmation_email(
                customer_name=current_user.get('name', 'Customer'),
                email=current_user.get('email'),
                order_id=order_id,
                items=[{'name': item.get('name', 'Item'), 'quantity': item.get('quantity', 1)} for item in order_doc['items']],
                total_amount=total_amount,
                order_type=order_data.order_type
            )

        # Award loyalty points
        await _award_loyalty_points(current_user['id'], order_id, total_amount)

        return OrderResponse(
            id=order_id,
            status='pending',
            total_amount=total_amount,
            created_at=created_at
        )
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@orders_router.get("", response_model=List[Order])
async def get_order_history(current_user: dict = Depends(get_current_user)):
    """Get current user's order history"""
    try:
        if is_mongo_available():
            db = get_db()
            query = {} if current_user.get('role') == 'admin' else {'user_id': current_user['id']}
            orders = await db.orders.find(query, {'_id': 0}).to_list(200)
        else:
            if current_user.get('role') == 'admin':
                orders = orders_store
            else:
                orders = [o for o in orders_store if o['user_id'] == current_user['id']]

        normalized = []
        for order in orders:
            order_copy = order.copy()
            if isinstance(order_copy.get('created_at'), str):
                order_copy['created_at'] = datetime.fromisoformat(order_copy['created_at'])
            normalized.append(order_copy)
        return normalized
    except Exception as e:
        logger.error(f"Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch orders")


@orders_router.delete("/{order_id}")
async def cancel_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel an order (only pending/confirmed orders)"""
    try:
        if is_mongo_available():
            db = get_db()
            order = await db.orders.find_one({'id': order_id, 'user_id': current_user['id']})
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            if order['status'] not in ['pending', 'confirmed']:
                raise HTTPException(status_code=400, detail="Can only cancel pending or confirmed orders")
            
            await db.orders.update_one(
                {'id': order_id},
                {'$set': {'status': 'cancelled'}}
            )
        else:
            order_found = False
            for order in orders_store:
                if order['id'] == order_id and order['user_id'] == current_user['id']:
                    if order['status'] not in ['pending', 'confirmed']:
                        raise HTTPException(status_code=400, detail="Can only cancel pending or confirmed orders")
                    order['status'] = 'cancelled'
                    order_found = True
                    break
            if not order_found:
                raise HTTPException(status_code=404, detail="Order not found")
        
        logger.info(f"Order cancelled: {order_id}")
        return {"message": "Order cancelled successfully", "status": "cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling order: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel order")


@orders_router.put("/{order_id}")
async def update_order_status(order_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Update order status"""
    valid_statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    try:
        # Allow admin to update any order, or users to update their own orders
        is_admin = current_user.get('role') == 'admin'
        
        if is_mongo_available():
            db = get_db()
            # Admin can update any order, regular users only their own
            query = {'id': order_id}
            if not is_admin:
                query['user_id'] = current_user['id']
            
            result = await db.orders.update_one(
                query,
                {'$set': {'status': status}}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Order not found")
        else:
            order_found = False
            for order in orders_store:
                if order['id'] == order_id:
                    # Check if user owns the order or is admin
                    if is_admin or order['user_id'] == current_user['id']:
                        order['status'] = status
                        order_found = True
                        break
            if not order_found:
                raise HTTPException(status_code=404, detail="Order not found")
        
        return {"message": "Order status updated", "status": status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order: {e}")
        raise HTTPException(status_code=500, detail="Failed to update order")


def get_orders_store() -> List[dict]:
    """Get orders store for access from other modules"""
    return orders_store


async def _award_loyalty_points(user_id: str, order_id: str, total_amount: int):
    """Award loyalty points for a completed order"""
    try:
        points_earned = max(1, total_amount // 10)

        if is_mongo_available():
            db = get_db()
            loyalty = await db.loyalty.find_one({'user_id': user_id})
            if not loyalty:
                loyalty = {
                    'user_id': user_id,
                    'points': 0,
                    'lifetime_spent': 0,
                    'member_tier': 'bronze',
                    'tier_points': 0,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                await db.loyalty.insert_one(loyalty)

            new_points = loyalty.get('points', 0) + points_earned
            new_lifetime = loyalty.get('lifetime_spent', 0) + total_amount
            new_tier = get_user_tier(new_lifetime)

            await db.loyalty.update_one(
                {'user_id': user_id},
                {'$set': {
                    'points': new_points,
                    'lifetime_spent': new_lifetime,
                    'member_tier': new_tier,
                    'tier_points': new_lifetime % 1000
                }}
            )

            await db.points_transactions.insert_one({
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'order_id': order_id,
                'points': points_earned,
                'transaction_type': 'earned',
                'description': f'Points earned from order {order_id}',
                'created_at': datetime.now(timezone.utc).isoformat()
            })
        else:
            loyalty = next((l for l in loyalty_store if l['user_id'] == user_id), None)
            if not loyalty:
                loyalty = {
                    'user_id': user_id,
                    'points': 0,
                    'lifetime_spent': 0,
                    'member_tier': 'bronze',
                    'tier_points': 0,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                loyalty_store.append(loyalty)

            new_points = loyalty.get('points', 0) + points_earned
            new_lifetime = loyalty.get('lifetime_spent', 0) + total_amount
            loyalty['points'] = new_points
            loyalty['lifetime_spent'] = new_lifetime
            loyalty['member_tier'] = get_user_tier(new_lifetime)
            loyalty['tier_points'] = new_lifetime % 1000

            points_transaction_store.append({
                'id': str(uuid.uuid4()),
                'user_id': user_id,
                'order_id': order_id,
                'points': points_earned,
                'transaction_type': 'earned',
                'description': f'Points earned from order {order_id}',
                'created_at': datetime.now(timezone.utc).isoformat()
            })
    except Exception as e:
        logger.error(f"Failed to award loyalty points: {e}")
