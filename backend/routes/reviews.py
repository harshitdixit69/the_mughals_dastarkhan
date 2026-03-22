"""
Reviews & Ratings routes
"""
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from models import ReviewCreate, Review, ReviewResponse
from auth import get_current_user
from database import get_db, is_mongo_available

logger = logging.getLogger(__name__)
reviews_router = APIRouter(prefix="/reviews", tags=["reviews"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "reviews"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# In-memory storage for reviews (when MongoDB is not available)
reviews_store: List[dict] = []


@reviews_router.post("", response_model=dict)
async def submit_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    """Submit a new review for a menu item"""
    try:
        review_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc)
        
        review_doc = {
            'id': review_id,
            'menu_item_id': review_data.menu_item_id,
            'user_id': current_user['id'],
            'user_name': current_user.get('name', 'Anonymous'),
            'rating': review_data.rating,
            'comment': review_data.comment,
            'photo_url': review_data.photo_url,
            'status': 'pending',  # pending, approved, rejected
            'created_at': created_at.isoformat()
        }
        
        if is_mongo_available():
            db = get_db()
            await db.reviews.insert_one(review_doc)
        else:
            reviews_store.append(review_doc)
        
        logger.info(f"Review submitted: {review_id} for item {review_data.menu_item_id}")
        
        return {
            "id": review_id,
            "status": "pending",
            "message": "Review submitted successfully. It will be approved by our team."
        }
    except Exception as e:
        logger.error(f"Error submitting review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reviews_router.post("/upload")
async def upload_review_photo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a review photo and return its URL"""
    try:
        ext = Path(file.filename).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        file_id = f"{uuid.uuid4()}{ext}"
        file_path = UPLOAD_DIR / file_id

        content = await file.read()
        file_path.write_bytes(content)

        return {"url": f"/uploads/reviews/{file_id}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading review photo: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload photo")


@reviews_router.get("/item/{menu_item_id}", response_model=List[ReviewResponse])
async def get_item_reviews(menu_item_id: int, approved_only: bool = Query(True)):
    """Get reviews for a specific menu item"""
    try:
        if is_mongo_available():
            db = get_db()
            query = {
                'menu_item_id': menu_item_id,
                'status': 'approved' if approved_only else {'$ne': 'rejected'}
            }
            reviews = await db.reviews.find(query).sort('created_at', -1).to_list(length=100)
        else:
            query_status = 'approved' if approved_only else ['approved', 'pending']
            reviews = [
                r for r in reviews_store 
                if r['menu_item_id'] == menu_item_id and 
                (r['status'] == query_status if isinstance(query_status, str) else r['status'] in query_status)
            ]
            reviews.sort(key=lambda x: x['created_at'], reverse=True)
        
        return [
            ReviewResponse(
                id=r['id'],
                rating=r['rating'],
                comment=r['comment'],
                user_name=r['user_name'],
                user_id=r.get('user_id'),
                photo_url=r.get('photo_url'),
                created_at=datetime.fromisoformat(r['created_at']) if isinstance(r['created_at'], str) else r['created_at']
            )
            for r in reviews
        ]
    except Exception as e:
        logger.error(f"Error fetching reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reviews_router.get("/user/my-reviews", response_model=List[Review])
async def get_user_reviews(current_user: dict = Depends(get_current_user)):
    """Get current user's reviews"""
    try:
        if is_mongo_available():
            db = get_db()
            reviews = await db.reviews.find({'user_id': current_user['id']}).sort('created_at', -1).to_list(length=100)
        else:
            reviews = [r for r in reviews_store if r['user_id'] == current_user['id']]
            reviews.sort(key=lambda x: x['created_at'], reverse=True)
        
        return [
            Review(
                id=r['id'],
                menu_item_id=r['menu_item_id'],
                user_id=r['user_id'],
                user_name=r['user_name'],
                rating=r['rating'],
                comment=r['comment'],
                photo_url=r.get('photo_url'),
                status=r['status'],
                created_at=datetime.fromisoformat(r['created_at']) if isinstance(r['created_at'], str) else r['created_at']
            )
            for r in reviews
        ]
    except Exception as e:
        logger.error(f"Error fetching user reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reviews_router.delete("/{review_id}")
async def delete_review(review_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a review (only by the author)"""
    try:
        if is_mongo_available():
            db = get_db()
            review = await db.reviews.find_one({'id': review_id})
            
            if not review:
                raise HTTPException(status_code=404, detail="Review not found")
            
            if review['user_id'] != current_user['id']:
                raise HTTPException(status_code=403, detail="You can only delete your own reviews")
            
            await db.reviews.delete_one({'id': review_id})
        else:
            review_idx = next((i for i, r in enumerate(reviews_store) if r['id'] == review_id), None)
            if review_idx is None:
                raise HTTPException(status_code=404, detail="Review not found")
            
            if reviews_store[review_idx]['user_id'] != current_user['id']:
                raise HTTPException(status_code=403, detail="You can only delete your own reviews")
            
            reviews_store.pop(review_idx)
        
        logger.info(f"Review deleted: {review_id}")
        return {"message": "Review deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ ADMIN ENDPOINTS ============

@reviews_router.get("/admin/pending", response_model=List[Review])
async def get_pending_reviews(current_user: dict = Depends(get_current_user)):
    """Get all pending reviews for moderation (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if is_mongo_available():
            db = get_db()
            reviews = await db.reviews.find({'status': 'pending'}).sort('created_at', 1).to_list(length=100)
        else:
            reviews = [r for r in reviews_store if r['status'] == 'pending']
            reviews.sort(key=lambda x: x['created_at'])
        
        return [
            Review(
                id=r['id'],
                menu_item_id=r['menu_item_id'],
                user_id=r['user_id'],
                user_name=r['user_name'],
                rating=r['rating'],
                comment=r['comment'],
                photo_url=r.get('photo_url'),
                status=r['status'],
                created_at=datetime.fromisoformat(r['created_at']) if isinstance(r['created_at'], str) else r['created_at']
            )
            for r in reviews
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pending reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reviews_router.put("/admin/{review_id}/approve")
async def approve_review(review_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a review (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if is_mongo_available():
            db = get_db()
            result = await db.reviews.update_one(
                {'id': review_id},
                {'$set': {'status': 'approved'}}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Review not found")
        else:
            review = next((r for r in reviews_store if r['id'] == review_id), None)
            if not review:
                raise HTTPException(status_code=404, detail="Review not found")
            review['status'] = 'approved'
        
        logger.info(f"Review approved: {review_id}")
        return {"message": "Review approved"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving review: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@reviews_router.put("/admin/{review_id}/reject")
async def reject_review(review_id: str, current_user: dict = Depends(get_current_user)):
    """Reject a review (admin only)"""
    try:
        if current_user.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if is_mongo_available():
            db = get_db()
            result = await db.reviews.update_one(
                {'id': review_id},
                {'$set': {'status': 'rejected'}}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Review not found")
        else:
            review = next((r for r in reviews_store if r['id'] == review_id), None)
            if not review:
                raise HTTPException(status_code=404, detail="Review not found")
            review['status'] = 'rejected'
        
        logger.info(f"Review rejected: {review_id}")
        return {"message": "Review rejected"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting review: {e}")
        raise HTTPException(status_code=500, detail=str(e))
