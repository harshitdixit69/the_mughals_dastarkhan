"""
Table Reservation routes
"""
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from models import ReservationCreate, Reservation, ReservationResponse
from auth import get_current_user
from database import get_db, is_mongo_available
from email_service import send_reservation_confirmation_email, send_cancellation_email, send_reservation_reminder_email

logger = logging.getLogger(__name__)
reservations_router = APIRouter(prefix="/reservations", tags=["reservations"])

# In-memory storage for reservations (when MongoDB is not available)
reservations_store: List[dict] = []

# Restaurant operating hours for reservations
RESERVATION_SLOTS = [
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"
]
MAX_TABLES_PER_SLOT = 10


@reservations_router.get("/slots/{date}")
async def get_available_slots(date: str):
    """Get time slot availability for a given date (public endpoint)"""
    try:
        # Validate date format
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        today = datetime.now().date()
        if target_date < today:
            raise HTTPException(status_code=400, detail="Cannot check slots for past dates")

        # Count reservations per slot
        slot_counts = {}
        if is_mongo_available():
            db = get_db()
            pipeline = [
                {"$match": {"date": date, "status": {"$ne": "cancelled"}}},
                {"$group": {"_id": "$time", "count": {"$sum": 1}}}
            ]
            async for doc in db.reservations.aggregate(pipeline):
                slot_counts[doc["_id"]] = doc["count"]
        else:
            for r in reservations_store:
                if r["date"] == date and r["status"] != "cancelled":
                    slot_counts[r["time"]] = slot_counts.get(r["time"], 0) + 1

        now = datetime.now()
        slots = []
        for slot_time in RESERVATION_SLOTS:
            booked = slot_counts.get(slot_time, 0)
            available = MAX_TABLES_PER_SLOT - booked

            # Mark past slots as unavailable for today
            is_past = False
            if target_date == today:
                slot_dt = datetime.strptime(f"{date} {slot_time}", "%Y-%m-%d %H:%M")
                if slot_dt <= now:
                    is_past = True

            slots.append({
                "time": slot_time,
                "available": max(0, available) if not is_past else 0,
                "total": MAX_TABLES_PER_SLOT,
                "status": "past" if is_past else ("full" if available <= 0 else ("few_left" if available <= 3 else "available"))
            })

        return {"date": date, "slots": slots}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching slot availability: {e}")
        raise HTTPException(status_code=500, detail="Failed to check slot availability")


@reservations_router.post("", response_model=ReservationResponse)
async def create_reservation(reservation_data: ReservationCreate, current_user: dict = Depends(get_current_user)):
    """Create a new table reservation"""
    try:
        # Validate date and time are in future
        reservation_datetime_str = f"{reservation_data.date} {reservation_data.time}"
        reservation_datetime = datetime.fromisoformat(reservation_datetime_str).replace(tzinfo=timezone.utc)
        
        if reservation_datetime <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Reservation date/time must be in the future")
        
        # Check if table is available (simplified - just check if less than 10 reservations at that time)
        if is_mongo_available():
            db = get_db()
            existing_reservations = await db.reservations.count_documents({
                'date': reservation_data.date,
                'time': reservation_data.time,
                'status': {'$ne': 'cancelled'}
            })
            if existing_reservations >= 10:
                raise HTTPException(status_code=400, detail="No tables available for this time slot")
        else:
            existing_count = sum(1 for r in reservations_store 
                               if r['date'] == reservation_data.date 
                               and r['time'] == reservation_data.time 
                               and r['status'] != 'cancelled')
            if existing_count >= 10:
                raise HTTPException(status_code=400, detail="No tables available for this time slot")
        
        reservation_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc)
        
        reservation_doc = {
            'id': reservation_id,
            'user_id': current_user['id'],
            'date': reservation_data.date,
            'time': reservation_data.time,
            'party_size': reservation_data.party_size,
            'guest_name': reservation_data.guest_name,
            'phone': reservation_data.phone,
            'email': reservation_data.email,
            'special_requests': reservation_data.special_requests,
            'status': 'confirmed',
            'reservation_datetime': f"{reservation_data.date} {reservation_data.time}",
            'created_at': created_at.isoformat()
        }
        
        if is_mongo_available():
            db = get_db()
            await db.reservations.insert_one(reservation_doc)
        else:
            reservations_store.append(reservation_doc)
        
        # Send confirmation email
        send_reservation_confirmation_email(
            reservation_data.guest_name,
            reservation_data.email,
            reservation_data.date,
            reservation_data.time,
            reservation_data.party_size
        )
        
        logger.info(f"Reservation created: {reservation_id} for {reservation_data.guest_name}")
        
        return ReservationResponse(
            id=reservation_id,
            status='confirmed',
            date=reservation_data.date,
            time=reservation_data.time,
            party_size=reservation_data.party_size,
            created_at=created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating reservation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reservations_router.get("", response_model=List[Reservation])
async def get_reservations(current_user: dict = Depends(get_current_user)):
    """Get user's reservations (or all for admin)"""
    try:
        if is_mongo_available():
            db = get_db()
            query = {} if current_user.get('role') == 'admin' else {'user_id': current_user['id']}
            reservations = await db.reservations.find(query, {'_id': 0}).to_list(200)
        else:
            if current_user.get('role') == 'admin':
                reservations = reservations_store
            else:
                reservations = [r for r in reservations_store if r['user_id'] == current_user['id']]
        
        normalized = []
        for reservation in reservations:
            res_copy = reservation.copy()
            if isinstance(res_copy.get('created_at'), str):
                res_copy['created_at'] = datetime.fromisoformat(res_copy['created_at'])
            normalized.append(res_copy)
        
        return normalized
    except Exception as e:
        logger.error(f"Error fetching reservations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch reservations")


@reservations_router.post("/admin/send-reminders")
async def send_reservation_reminders(current_user: dict = Depends(get_current_user)):
    """Send reminder emails for tomorrow's reservations (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")

        target_date = (datetime.now(timezone.utc) + timedelta(days=1)).date().isoformat()

        if is_mongo_available():
            db = get_db()
            reservations = await db.reservations.find({
                'date': target_date,
                'status': 'confirmed'
            }, {'_id': 0}).to_list(200)
        else:
            reservations = [
                r for r in reservations_store
                if r['date'] == target_date and r['status'] == 'confirmed'
            ]

        sent_count = 0
        for reservation in reservations:
            if reservation.get('email'):
                if send_reservation_reminder_email(
                    reservation.get('guest_name', 'Guest'),
                    reservation['email'],
                    reservation['date'],
                    reservation['time']
                ):
                    sent_count += 1

        return {
            "message": "Reminder emails processed",
            "date": target_date,
            "sent": sent_count,
            "total": len(reservations)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending reminder emails: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reminders")


@reservations_router.put("/{reservation_id}")
async def update_reservation(
    reservation_id: str,
    date: str = None,
    time: str = None,
    party_size: int = None,
    special_requests: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Update a reservation"""
    try:
        if is_mongo_available():
            db = get_db()
            update_data = {}
            if date:
                update_data['date'] = date
            if time:
                update_data['time'] = time
            if party_size:
                update_data['party_size'] = party_size
            if special_requests:
                update_data['special_requests'] = special_requests
            
            result = await db.reservations.update_one(
                {'id': reservation_id, 'user_id': current_user['id']},
                {'$set': update_data}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Reservation not found")
        else:
            reservation_found = False
            for reservation in reservations_store:
                if reservation['id'] == reservation_id and reservation['user_id'] == current_user['id']:
                    if date:
                        reservation['date'] = date
                    if time:
                        reservation['time'] = time
                    if party_size:
                        reservation['party_size'] = party_size
                    if special_requests:
                        reservation['special_requests'] = special_requests
                    reservation_found = True
                    break
            if not reservation_found:
                raise HTTPException(status_code=404, detail="Reservation not found")
        
        return {"message": "Reservation updated successfully"}
    except Exception as e:
        logger.error(f"Error updating reservation: {e}")
        raise HTTPException(status_code=500, detail="Failed to update reservation")


@reservations_router.put("/{reservation_id}/status")
async def update_reservation_status(
    reservation_id: str,
    status: str,
    table_number: int = None,
    current_user: dict = Depends(get_current_user)
):
    """Update reservation status (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        valid_statuses = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show']
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        update_data = {'status': status}
        if table_number is not None:
            update_data['table_number'] = table_number
        
        if is_mongo_available():
            db = get_db()
            result = await db.reservations.update_one(
                {'id': reservation_id},
                {'$set': update_data}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Reservation not found")
        else:
            reservation_found = False
            for reservation in reservations_store:
                if reservation['id'] == reservation_id:
                    reservation['status'] = status
                    if table_number is not None:
                        reservation['table_number'] = table_number
                    reservation_found = True
                    break
            if not reservation_found:
                raise HTTPException(status_code=404, detail="Reservation not found")
        
        logger.info(f"Reservation {reservation_id} status updated to {status}")
        return {"message": "Reservation status updated", "status": status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating reservation status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update reservation status")


@reservations_router.delete("/{reservation_id}")
async def cancel_reservation(reservation_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel a reservation"""
    try:
        reservation_email = None
        reservation_date = None
        reservation_time = None
        
        if is_mongo_available():
            db = get_db()
            # Get reservation details before cancelling
            reservation = await db.reservations.find_one({'id': reservation_id, 'user_id': current_user['id']})
            if reservation:
                reservation_email = reservation.get('email')
                reservation_date = reservation.get('date')
                reservation_time = reservation.get('time')
            
            result = await db.reservations.update_one(
                {'id': reservation_id, 'user_id': current_user['id']},
                {'$set': {'status': 'cancelled'}}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Reservation not found")
        else:
            reservation_found = False
            for reservation in reservations_store:
                if reservation['id'] == reservation_id and reservation['user_id'] == current_user['id']:
                    reservation_email = reservation.get('email')
                    reservation_date = reservation.get('date')
                    reservation_time = reservation.get('time')
                    reservation['status'] = 'cancelled'
                    reservation_found = True
                    break
            if not reservation_found:
                raise HTTPException(status_code=404, detail="Reservation not found")
        
        # Send cancellation email
        if reservation_email and reservation_date and reservation_time:
            send_cancellation_email(current_user['name'], reservation_email, reservation_date, reservation_time)
        
        logger.info(f"Reservation cancelled: {reservation_id}")
        return {"message": "Reservation cancelled successfully"}
    except Exception as e:
        logger.error(f"Error cancelling reservation: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel reservation")
