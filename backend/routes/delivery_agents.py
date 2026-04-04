"""
Delivery Agent routes - CRUD, order accept/reject, status updates
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from models import (
    DeliveryAgentCreate, DeliveryAgent, DeliveryAgentUpdate,
    StatusUpdateRequest, ORDER_STATUSES, STATUS_TRANSITIONS
)
from auth import get_current_user
from database import get_db, is_mongo_available

logger = logging.getLogger(__name__)
delivery_agents_router = APIRouter(prefix="/delivery-agents", tags=["delivery-agents"])

# In-memory storage fallback
agents_store: List[dict] = []


# ============== ADMIN: Manage Agents ==============

@delivery_agents_router.post("")
async def create_agent(agent_data: DeliveryAgentCreate, current_user: dict = Depends(get_current_user)):
    """Create a new delivery agent (admin only)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    agent_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    agent_doc = {
        'id': agent_id,
        'name': agent_data.name,
        'phone': agent_data.phone,
        'email': agent_data.email,
        'vehicle_type': agent_data.vehicle_type,
        'is_available': True,
        'is_active': True,
        'current_order_id': None,
        'total_deliveries': 0,
        'created_at': now.isoformat()
    }
    
    try:
        if is_mongo_available():
            db = get_db()
            # Check for duplicate email/phone
            existing = await db.delivery_agents.find_one({
                '$or': [{'email': agent_data.email}, {'phone': agent_data.phone}]
            })
            if existing:
                raise HTTPException(status_code=400, detail="Agent with this email or phone already exists")
            await db.delivery_agents.insert_one(agent_doc)
        else:
            if any(a['email'] == agent_data.email or a['phone'] == agent_data.phone for a in agents_store):
                raise HTTPException(status_code=400, detail="Agent with this email or phone already exists")
            agents_store.append(agent_doc)
        
        return {"message": "Delivery agent created", "id": agent_id, "agent": agent_doc}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail="Failed to create agent")


@delivery_agents_router.get("")
async def list_agents(current_user: dict = Depends(get_current_user)):
    """List all delivery agents (admin only)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        if is_mongo_available():
            db = get_db()
            agents = await db.delivery_agents.find({'is_active': True}, {'_id': 0}).to_list(100)
        else:
            agents = [a for a in agents_store if a.get('is_active', True)]
        return agents
    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list agents")


@delivery_agents_router.get("/available")
async def list_available_agents(current_user: dict = Depends(get_current_user)):
    """List available delivery agents (admin only)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        if is_mongo_available():
            db = get_db()
            agents = await db.delivery_agents.find(
                {'is_active': True, 'is_available': True}, {'_id': 0}
            ).to_list(100)
        else:
            agents = [a for a in agents_store if a.get('is_active', True) and a.get('is_available', True)]
        return agents
    except Exception as e:
        logger.error(f"Error listing available agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list available agents")


@delivery_agents_router.put("/{agent_id}")
async def update_agent(agent_id: str, update_data: DeliveryAgentUpdate, current_user: dict = Depends(get_current_user)):
    """Update delivery agent details (admin only)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        if is_mongo_available():
            db = get_db()
            result = await db.delivery_agents.update_one(
                {'id': agent_id, 'is_active': True},
                {'$set': updates}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Agent not found")
            agent = await db.delivery_agents.find_one({'id': agent_id}, {'_id': 0})
        else:
            agent = next((a for a in agents_store if a['id'] == agent_id and a.get('is_active', True)), None)
            if not agent:
                raise HTTPException(status_code=404, detail="Agent not found")
            agent.update(updates)
        
        return {"message": "Agent updated", "agent": agent}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent: {e}")
        raise HTTPException(status_code=500, detail="Failed to update agent")


@delivery_agents_router.delete("/{agent_id}")
async def deactivate_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Deactivate a delivery agent (admin only, soft delete)"""
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        if is_mongo_available():
            db = get_db()
            result = await db.delivery_agents.update_one(
                {'id': agent_id},
                {'$set': {'is_active': False, 'is_available': False}}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Agent not found")
        else:
            agent = next((a for a in agents_store if a['id'] == agent_id), None)
            if not agent:
                raise HTTPException(status_code=404, detail="Agent not found")
            agent['is_active'] = False
            agent['is_available'] = False
        
        return {"message": "Agent deactivated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating agent: {e}")
        raise HTTPException(status_code=500, detail="Failed to deactivate agent")


# ============== DELIVERY AGENT: My Orders ==============

@delivery_agents_router.get("/my-orders")
async def get_agent_orders(current_user: dict = Depends(get_current_user)):
    """Get orders assigned to the current delivery agent"""
    if current_user.get('role') != 'delivery_agent':
        raise HTTPException(status_code=403, detail="Delivery agent access required")
    
    try:
        if is_mongo_available():
            db = get_db()
            # Find agent by user email
            agent = await db.delivery_agents.find_one({'email': current_user.get('email')}, {'_id': 0})
            if not agent:
                raise HTTPException(status_code=404, detail="Agent profile not found")
            
            orders = await db.orders.find(
                {'delivery_agent_id': agent['id']},
                {'_id': 0}
            ).sort('created_at', -1).to_list(50)
            
            # Normalize dates
            for order in orders:
                if isinstance(order.get('created_at'), str):
                    order['created_at'] = datetime.fromisoformat(order['created_at'])
            
            return {"agent": agent, "orders": orders}
        else:
            return {"agent": {}, "orders": []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching agent orders: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch agent orders")


@delivery_agents_router.post("/accept-order/{order_id}")
async def agent_accept_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Delivery agent accepts an assigned order"""
    if current_user.get('role') != 'delivery_agent':
        raise HTTPException(status_code=403, detail="Delivery agent access required")
    
    try:
        if is_mongo_available():
            db = get_db()
            order = await db.orders.find_one({'id': order_id}, {'_id': 0})
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            if order.get('status') != 'assigned':
                raise HTTPException(status_code=400, detail="Order must be in 'assigned' status to accept")
            
            # Verify this agent is assigned
            agent = await db.delivery_agents.find_one({'email': current_user.get('email')}, {'_id': 0})
            if not agent or order.get('delivery_agent_id') != agent['id']:
                raise HTTPException(status_code=403, detail="This order is not assigned to you")
            
            now = datetime.now(timezone.utc).isoformat()
            history = order.get('status_history', [])
            history.append({
                'status': 'accepted_by_agent',
                'timestamp': now,
                'changed_by': current_user.get('name'),
                'note': f"Accepted by {agent['name']}"
            })
            
            await db.orders.update_one(
                {'id': order_id},
                {'$set': {'status': 'accepted_by_agent', 'status_history': history}}
            )
            
            return {"message": "Order accepted", "status": "accepted_by_agent"}
        else:
            raise HTTPException(status_code=503, detail="Database not available")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting order: {e}")
        raise HTTPException(status_code=500, detail="Failed to accept order")


@delivery_agents_router.post("/reject-order/{order_id}")
async def agent_reject_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Delivery agent rejects an assigned order (returns to 'ready')"""
    if current_user.get('role') != 'delivery_agent':
        raise HTTPException(status_code=403, detail="Delivery agent access required")
    
    try:
        if is_mongo_available():
            db = get_db()
            order = await db.orders.find_one({'id': order_id}, {'_id': 0})
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            if order.get('status') != 'assigned':
                raise HTTPException(status_code=400, detail="Order must be in 'assigned' status to reject")
            
            agent = await db.delivery_agents.find_one({'email': current_user.get('email')}, {'_id': 0})
            if not agent or order.get('delivery_agent_id') != agent['id']:
                raise HTTPException(status_code=403, detail="This order is not assigned to you")
            
            now = datetime.now(timezone.utc).isoformat()
            history = order.get('status_history', [])
            history.append({
                'status': 'ready',
                'timestamp': now,
                'changed_by': current_user.get('name'),
                'note': f"Rejected by {agent['name']}, returned to ready"
            })
            
            await db.orders.update_one(
                {'id': order_id},
                {'$set': {
                    'status': 'ready',
                    'delivery_agent_id': None,
                    'delivery_agent_name': None,
                    'status_history': history
                }}
            )
            
            # Free up the agent
            await db.delivery_agents.update_one(
                {'id': agent['id']},
                {'$set': {'is_available': True, 'current_order_id': None}}
            )
            
            return {"message": "Order rejected, returned to ready", "status": "ready"}
        else:
            raise HTTPException(status_code=503, detail="Database not available")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting order: {e}")
        raise HTTPException(status_code=500, detail="Failed to reject order")


@delivery_agents_router.post("/update-delivery/{order_id}")
async def agent_update_delivery_status(
    order_id: str,
    body: StatusUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Delivery agent updates order status (picked_up, out_for_delivery, delivered)"""
    if current_user.get('role') != 'delivery_agent':
        raise HTTPException(status_code=403, detail="Delivery agent access required")
    
    new_status = body.status
    allowed_agent_statuses = ['picked_up', 'out_for_delivery', 'delivered']
    if new_status not in allowed_agent_statuses:
        raise HTTPException(status_code=400, detail=f"Agents can only set: {', '.join(allowed_agent_statuses)}")
    
    try:
        if is_mongo_available():
            db = get_db()
            order = await db.orders.find_one({'id': order_id}, {'_id': 0})
            if not order:
                raise HTTPException(status_code=404, detail="Order not found")
            
            agent = await db.delivery_agents.find_one({'email': current_user.get('email')}, {'_id': 0})
            if not agent or order.get('delivery_agent_id') != agent['id']:
                raise HTTPException(status_code=403, detail="This order is not assigned to you")
            
            current_status = order.get('status')
            allowed_transitions = STATUS_TRANSITIONS.get(current_status, [])
            if new_status not in allowed_transitions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot transition from '{current_status}' to '{new_status}'. Allowed: {', '.join(allowed_transitions)}"
                )
            
            now = datetime.now(timezone.utc).isoformat()
            history = order.get('status_history', [])
            history.append({
                'status': new_status,
                'timestamp': now,
                'changed_by': current_user.get('name'),
                'note': body.note or f"Updated by {agent['name']}"
            })
            
            update_fields = {'status': new_status, 'status_history': history}
            if new_status == 'picked_up':
                update_fields['picked_up_at'] = now
            elif new_status == 'delivered':
                update_fields['delivered_at'] = now
                # Free up agent and increment delivery count
                await db.delivery_agents.update_one(
                    {'id': agent['id']},
                    {
                        '$set': {'is_available': True, 'current_order_id': None},
                        '$inc': {'total_deliveries': 1}
                    }
                )
            
            await db.orders.update_one({'id': order_id}, {'$set': update_fields})
            
            return {"message": f"Delivery status updated to {new_status}", "status": new_status}
        else:
            raise HTTPException(status_code=503, detail="Database not available")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating delivery status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update delivery status")
