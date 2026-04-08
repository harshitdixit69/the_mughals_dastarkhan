"""
Order routes - create, list, update status with strict status pipeline
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from models import (
    OrderCreate, Order, OrderResponse, StatusUpdateRequest,
    AgentAssignRequest, DeliveryAssignRequest, ORDER_STATUSES, STATUS_TRANSITIONS
)
from auth import get_current_user
from utils import calculate_order_total
from routes.cart import get_carts_store
from database import get_db, is_mongo_available
from email_service import send_order_confirmation_email
from routes.loyalty import get_user_tier, loyalty_store, points_transaction_store
from whatsapp_service import send_order_status_notification

logger = logging.getLogger(__name__)
orders_router = APIRouter(prefix="/orders", tags=["orders"])

# In-memory storage for orders (when MongoDB is not available)
orders_store: List[dict] = []


def _validate_status_transition(current_status: str, new_status: str):
    """Validate that a status transition is allowed"""
    allowed = STATUS_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_status}' to '{new_status}'. Allowed: {', '.join(allowed) if allowed else 'none (terminal state)'}"
        )


def _make_status_entry(status: str, note: str = None, changed_by: str = None):
    """Create a status history entry"""
    entry = {
        'status': status,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }
    if note:
        entry['note'] = note
    if changed_by:
        entry['changed_by'] = changed_by
    return entry


@orders_router.post("", response_model=OrderResponse)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    """Create a new order - initial status is 'placed'"""
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
            'status': 'placed',
            'notes': order_data.notes,
            'coupon_code': order_data.coupon_code,
            'discount_amount': discount_amount,
            'payment_method': order_data.payment_method,
            'delivery_type': order_data.delivery_type,
            'delivery_partner': order_data.delivery_partner,
            'delivery_charge': order_data.delivery_charge or 0,
            'delivery_address': order_data.delivery_address,
            'delivery_note': order_data.delivery_note,
            'delivery_status': 'booked' if order_data.delivery_type in ('self_delivery', 'external_delivery') else None,
            'delivery_tracking_id': None,
            'delivery_agent_id': None,
            'delivery_agent_name': None,
            'driver_name': None,
            'driver_phone': None,
            'status_history': [_make_status_entry('placed', changed_by=current_user.get('name', 'Customer'))],
            'accepted_at': None,
            'picked_up_at': None,
            'delivered_at': None,
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

        # Send WhatsApp notification on order placed
        try:
            user_phone = order_data.phone or current_user.get('phone')
            if user_phone:
                await send_order_status_notification(
                    phone=user_phone,
                    order_id=order_id,
                    status='placed',
                    total=total_amount,
                    order_type=order_data.order_type,
                )
        except Exception as wa_err:
            logger.warning(f"WhatsApp notification failed for new order {order_id}: {wa_err}")

        return OrderResponse(
            id=order_id,
            status='placed',
            total_amount=total_amount,
            created_at=created_at
        )
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@orders_router.get("", response_model=List[Order])
async def get_order_history(current_user: dict = Depends(get_current_user)):
    """Get current user's order history (admins get all orders)"""
    try:
        if is_mongo_available():
            db = get_db()
            query = {} if current_user.get('role') == 'admin' else {'user_id': current_user['id']}
            orders = await db.orders.find(query, {'_id': 0}).sort('created_at', -1).to_list(200)
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
            # Ensure new fields have defaults for old orders
            order_copy.setdefault('delivery_agent_id', None)
            order_copy.setdefault('delivery_agent_name', None)
            order_copy.setdefault('status_history', [])
            order_copy.setdefault('accepted_at', None)
            order_copy.setdefault('picked_up_at', None)
            order_copy.setdefault('delivered_at', None)
            order_copy.setdefault('driver_name', None)
            order_copy.setdefault('driver_phone', None)
            # Migrate old statuses to new pipeline
            if order_copy.get('status') == 'pending':
                order_copy['status'] = 'placed'
            elif order_copy.get('status') == 'confirmed':
                order_copy['status'] = 'accepted'
            normalized.append(order_copy)
        return normalized
    except Exception as e:
        logger.error(f"Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch orders")


@orders_router.get("/{order_id}")
async def get_order_detail(order_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single order's full details"""
    try:
        is_admin = current_user.get('role') == 'admin'
        if is_mongo_available():
            db = get_db()
            query = {'id': order_id}
            if not is_admin:
                query['user_id'] = current_user['id']
            order = await db.orders.find_one(query, {'_id': 0})
        else:
            order = next(
                (o for o in orders_store if o['id'] == order_id and (is_admin or o['user_id'] == current_user['id'])),
                None
            )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order.setdefault('delivery_agent_id', None)
        order.setdefault('delivery_agent_name', None)
        order.setdefault('status_history', [])
        order.setdefault('accepted_at', None)
        order.setdefault('picked_up_at', None)
        order.setdefault('delivered_at', None)
        order.setdefault('driver_name', None)
        order.setdefault('driver_phone', None)
        return order
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching order detail: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch order")


@orders_router.delete("/{order_id}")
async def cancel_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel an order (only placed/accepted orders)"""
    try:
        if is_mongo_available():
            db = get_db()
            order = await db.orders.find_one({'id': order_id, 'user_id': current_user['id']})
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            if order['status'] not in ['placed', 'accepted', 'pending', 'confirmed']:
                raise HTTPException(status_code=400, detail="Can only cancel placed or accepted orders")
            
            now = datetime.now(timezone.utc).isoformat()
            history = order.get('status_history', [])
            history.append(_make_status_entry('cancelled', note='Cancelled by customer', changed_by=current_user.get('name')))
            
            await db.orders.update_one(
                {'id': order_id},
                {'$set': {'status': 'cancelled', 'status_history': history}}
            )
        else:
            order_found = False
            for order in orders_store:
                if order['id'] == order_id and order['user_id'] == current_user['id']:
                    if order['status'] not in ['placed', 'accepted', 'pending', 'confirmed']:
                        raise HTTPException(status_code=400, detail="Can only cancel placed or accepted orders")
                    order['status'] = 'cancelled'
                    order.setdefault('status_history', []).append(
                        _make_status_entry('cancelled', note='Cancelled by customer', changed_by=current_user.get('name'))
                    )
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


@orders_router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    body: StatusUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update order status with strict transition validation (admin or delivery_agent only)"""
    new_status = body.status
    note = body.note

    if new_status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(ORDER_STATUSES)}")
    
    role = current_user.get('role', 'user')
    if role not in ('admin', 'delivery_agent'):
        raise HTTPException(status_code=403, detail="Only admin or delivery agents can update order status")
    
    try:
        if is_mongo_available():
            db = get_db()
            order = await db.orders.find_one({'id': order_id}, {'_id': 0})
        else:
            order = next((o for o in orders_store if o['id'] == order_id), None)

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        current_status = order.get('status', 'placed')
        # Migrate old statuses
        if current_status == 'pending':
            current_status = 'placed'
        elif current_status == 'confirmed':
            current_status = 'accepted'

        # Auto-switch: if admin marks "ready" and it's a pickup/dine-in order → ready_for_pickup
        if new_status == 'ready':
            dt = order.get('delivery_type') or ''
            ot = order.get('order_type', '')
            is_delivery = dt in ('self_delivery', 'external_delivery') or ot == 'delivery'
            if not is_delivery:
                new_status = 'ready_for_pickup'

        # Validation: cannot picked_up without delivery details (driver_name or delivery_agent_id)
        if new_status == 'picked_up':
            has_delivery_details = order.get('driver_name') or order.get('delivery_agent_id')
            if not has_delivery_details:
                raise HTTPException(status_code=400, detail="Cannot mark as picked up without delivery details. Assign delivery first.")

        _validate_status_transition(current_status, new_status)

        now = datetime.now(timezone.utc).isoformat()
        history = order.get('status_history', [])
        history.append(_make_status_entry(new_status, note=note, changed_by=current_user.get('name')))

        update_fields = {
            'status': new_status,
            'status_history': history
        }

        # Set timestamp fields
        if new_status == 'accepted':
            update_fields['accepted_at'] = now
        elif new_status == 'picked_up':
            update_fields['picked_up_at'] = now
        elif new_status == 'delivered':
            update_fields['delivered_at'] = now

        if is_mongo_available():
            db = get_db()
            await db.orders.update_one({'id': order_id}, {'$set': update_fields})
        else:
            order['status'] = new_status
            order.setdefault('status_history', [])
            order['status_history'] = history
            if new_status == 'accepted':
                order['accepted_at'] = now
            elif new_status == 'picked_up':
                order['picked_up_at'] = now
            elif new_status == 'delivered':
                order['delivered_at'] = now

        # Send WhatsApp notification if user has opted in
        try:
            user_phone = order.get('phone')
            if not user_phone and is_mongo_available():
                db = get_db()
                user_doc = await db.users.find_one({'id': order.get('user_id')}, {'phone': 1, 'whatsapp_notifications': 1})
                if user_doc and user_doc.get('whatsapp_notifications'):
                    user_phone = user_doc.get('phone')
            if user_phone:
                await send_order_status_notification(
                    phone=user_phone,
                    order_id=order_id,
                    status=new_status,
                    total=order.get('total_amount', ''),
                    order_type=order.get('order_type', ''),
                    driver_name=order.get('driver_name', ''),
                    driver_phone=order.get('driver_phone', ''),
                )
        except Exception as wa_err:
            logger.warning(f"WhatsApp notification failed for order {order_id}: {wa_err}")
        
        return {"message": f"Order status updated to {new_status}", "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order: {e}")
        raise HTTPException(status_code=500, detail="Failed to update order")


@orders_router.patch("/{order_id}/assign-agent")
async def assign_delivery_agent(
    order_id: str,
    body: AgentAssignRequest,
    current_user: dict = Depends(get_current_user)
):
    """Assign a delivery agent to an order (admin only). Sets status to 'assigned'."""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    agent_id = body.agent_id
    
    try:
        if is_mongo_available():
            db = get_db()
            order = await db.orders.find_one({'id': order_id}, {'_id': 0})
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            current_status = order.get('status', 'placed')
            if current_status == 'pending':
                current_status = 'placed'
            elif current_status == 'confirmed':
                current_status = 'accepted'
            
            # Must be 'ready' to assign agent
            if current_status != 'ready':
                raise HTTPException(status_code=400, detail=f"Order must be in 'ready' status to assign agent. Current: {current_status}")
            
            # Look up agent
            agent = await db.delivery_agents.find_one({'id': agent_id, 'is_active': True}, {'_id': 0})
            if not agent:
                raise HTTPException(status_code=404, detail="Delivery agent not found or inactive")
            
            if not agent.get('is_available', True):
                raise HTTPException(status_code=400, detail="Delivery agent is currently unavailable")
            
            now = datetime.now(timezone.utc).isoformat()
            history = order.get('status_history', [])
            history.append(_make_status_entry('assigned', note=f"Assigned to {agent['name']}", changed_by=current_user.get('name')))
            
            await db.orders.update_one(
                {'id': order_id},
                {'$set': {
                    'status': 'assigned',
                    'delivery_agent_id': agent_id,
                    'delivery_agent_name': agent['name'],
                    'status_history': history,
                }}
            )
            
            # Mark agent as unavailable
            await db.delivery_agents.update_one(
                {'id': agent_id},
                {'$set': {'is_available': False, 'current_order_id': order_id}}
            )
        else:
            order = next((o for o in orders_store if o['id'] == order_id), None)
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            current_status = order.get('status', 'placed')
            if current_status not in ('ready',):
                raise HTTPException(status_code=400, detail=f"Order must be in 'ready' status to assign agent. Current: {current_status}")
            
            now = datetime.now(timezone.utc).isoformat()
            order['status'] = 'assigned'
            order['delivery_agent_id'] = agent_id
            order['delivery_agent_name'] = 'Agent'
            order.setdefault('status_history', []).append(
                _make_status_entry('assigned', note=f"Assigned to agent {agent_id}", changed_by=current_user.get('name'))
            )
        
        return {"message": f"Delivery agent assigned", "status": "assigned", "agent_id": agent_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning agent: {e}")
        raise HTTPException(status_code=500, detail="Failed to assign delivery agent")


@orders_router.patch("/{order_id}/assign-delivery")
async def assign_manual_delivery(
    order_id: str,
    body: DeliveryAssignRequest,
    current_user: dict = Depends(get_current_user)
):
    """Manually assign delivery details (Porter etc.). Sets status to 'assigned'."""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        if is_mongo_available():
            db = get_db()
            order = await db.orders.find_one({'id': order_id}, {'_id': 0})
        else:
            order = next((o for o in orders_store if o['id'] == order_id), None)

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        current_status = order.get('status', 'placed')
        if current_status == 'pending':
            current_status = 'placed'
        elif current_status == 'confirmed':
            current_status = 'accepted'

        if current_status != 'ready':
            raise HTTPException(
                status_code=400,
                detail=f"Order must be in 'ready' status to assign delivery. Current: {current_status}"
            )

        now = datetime.now(timezone.utc).isoformat()
        history = order.get('status_history', [])
        history.append(_make_status_entry(
            'assigned',
            note=f"Delivery assigned to {body.driver_name} via {body.delivery_partner}",
            changed_by=current_user.get('name')
        ))

        update_fields = {
            'status': 'assigned',
            'delivery_partner': body.delivery_partner,
            'delivery_tracking_id': body.tracking_id,
            'driver_name': body.driver_name,
            'driver_phone': body.driver_phone,
            'status_history': history,
        }

        if is_mongo_available():
            db = get_db()
            await db.orders.update_one({'id': order_id}, {'$set': update_fields})
        else:
            order.update(update_fields)

        return {
            "message": f"Delivery assigned to {body.driver_name} via {body.delivery_partner}",
            "status": "assigned",
            "driver_name": body.driver_name,
            "driver_phone": body.driver_phone,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning delivery: {e}")
        raise HTTPException(status_code=500, detail="Failed to assign delivery")


# Legacy endpoint for backward compatibility
@orders_router.put("/{order_id}")
async def update_order_status_legacy(order_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Legacy: Update order status via query param (admin only)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Map old statuses to new
    status_map = {'pending': 'placed', 'confirmed': 'accepted'}
    mapped_status = status_map.get(status, status)
    
    if mapped_status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(ORDER_STATUSES)}")
    
    try:
        if is_mongo_available():
            db = get_db()
            order = await db.orders.find_one({'id': order_id}, {'_id': 0})
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            now = datetime.now(timezone.utc).isoformat()
            history = order.get('status_history', [])
            history.append(_make_status_entry(mapped_status, changed_by=current_user.get('name')))
            
            update_fields = {'status': mapped_status, 'status_history': history}
            if mapped_status == 'accepted':
                update_fields['accepted_at'] = now
            elif mapped_status == 'picked_up':
                update_fields['picked_up_at'] = now
            elif mapped_status == 'delivered':
                update_fields['delivered_at'] = now
            
            await db.orders.update_one({'id': order_id}, {'$set': update_fields})
        else:
            order = next((o for o in orders_store if o['id'] == order_id), None)
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            order['status'] = mapped_status
        
        return {"message": "Order status updated", "status": mapped_status}
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


# ========== DRIVER LIVE LOCATION ==========
# In-memory cache: { order_id: { lat, lng, updated_at } }
_driver_locations: dict = {}


@orders_router.post("/{order_id}/driver-location")
async def update_driver_location(
    order_id: str,
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user)
):
    """Driver pushes their GPS coordinates (delivery_agent or admin only)"""
    role = current_user.get('role', 'user')
    if role not in ('admin', 'delivery_agent'):
        raise HTTPException(status_code=403, detail="Only delivery agents can update location")

    now = datetime.now(timezone.utc).isoformat()

    # Store in memory for fast reads
    _driver_locations[order_id] = {'lat': lat, 'lng': lng, 'updated_at': now}

    # Also persist in MongoDB if available
    if is_mongo_available():
        db = get_db()
        await db.orders.update_one(
            {'id': order_id},
            {'$set': {'driver_location': {'lat': lat, 'lng': lng, 'updated_at': now}}}
        )

    return {"message": "Location updated"}


@orders_router.get("/{order_id}/driver-location")
async def get_driver_location(order_id: str, current_user: dict = Depends(get_current_user)):
    """Customer or admin fetches the driver's latest GPS position"""
    # Check memory cache first
    loc = _driver_locations.get(order_id)
    if loc:
        return loc

    # Fall back to MongoDB
    if is_mongo_available():
        db = get_db()
        order = await db.orders.find_one({'id': order_id}, {'driver_location': 1})
        if order and order.get('driver_location'):
            return order['driver_location']

    return {"lat": None, "lng": None, "updated_at": None}


@orders_router.post("/{order_id}/simulate-driver-location")
async def simulate_driver_location(
    order_id: str,
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user)
):
    """Test helper: simulate driver GPS without requiring delivery_agent role"""
    now = datetime.now(timezone.utc).isoformat()
    _driver_locations[order_id] = {'lat': lat, 'lng': lng, 'updated_at': now}

    if is_mongo_available():
        db = get_db()
        await db.orders.update_one(
            {'id': order_id},
            {'$set': {'driver_location': {'lat': lat, 'lng': lng, 'updated_at': now}}}
        )

    return {"message": "Simulated location updated"}
