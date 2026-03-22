import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { reviewsApi } from '../services/api';
import { Star, Trash2 } from 'lucide-react';

const ReviewsComponent = ({ menuItemId, itemName }) => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
    photo_url: ''
  });

  useEffect(() => {
    loadReviews();
  }, [menuItemId]);

  const loadReviews = async () => {
    try {
      const data = await reviewsApi.getItemReviews(menuItemId, true);
      setReviews(data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!formData.comment.trim() || formData.comment.length < 10) {
      toast.error('Review must be at least 10 characters long');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = formData.photo_url || null;

      if (photoFile) {
        setUploading(true);
        const uploadResult = await reviewsApi.uploadReviewPhoto(photoFile);
        photoUrl = uploadResult.url?.startsWith('http')
          ? uploadResult.url
          : `${backendUrl}${uploadResult.url}`;
      }

      await reviewsApi.submitReview({
        menu_item_id: menuItemId,
        rating: formData.rating,
        comment: formData.comment,
        photo_url: photoUrl
      });

      toast.success('Review submitted! It will be approved by our team.');
      setFormData({ rating: 5, comment: '', photo_url: '' });
      setPhotoFile(null);
      setPhotoPreview('');
      setShowForm(false);
      loadReviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      await reviewsApi.deleteReview(reviewId);

      toast.success('Review deleted');
      loadReviews();
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={16}
            className={i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const resolvePhotoUrl = (url) => {
    if (!url) return '';
    // Only allow http(s) and relative paths starting with /
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return '';
        return parsed.href;
      } catch { return ''; }
    }
    if (url.startsWith('/')) return `${backendUrl}${url}`;
    return '';
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Reviews & Ratings</CardTitle>
            <CardDescription>{itemName}</CardDescription>
          </div>
          {reviews.length > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold">{avgRating}</div>
              <div className="flex gap-1 justify-end">
                {renderStars(Math.round(avgRating))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{reviews.length} reviews</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Review Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            Write a Review
          </Button>
        )}

        {/* Review Form */}
        {showForm && (
          <form onSubmit={handleSubmitReview} className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: i })}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      size={24}
                      className={i <= formData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="comment">Your Review</Label>
              <textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Share your experience with this dish (minimum 10 characters)..."
                className="w-full mt-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows="4"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.comment.length}/1000 characters
              </p>
            </div>

            <div>
              <Label htmlFor="photo">Photo URL (optional)</Label>
              <Input
                id="photo"
                type="url"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                placeholder="https://example.com/photo.jpg"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="photoUpload">Upload Photo (optional)</Label>
              <Input
                id="photoUpload"
                type="file"
                accept="image/*"
                className="mt-2"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  } else {
                    setPhotoFile(null);
                    setPhotoPreview('');
                  }
                }}
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-20 h-20 rounded-lg object-cover mt-2"
                />
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={loading || uploading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {loading || uploading ? 'Submitting...' : 'Submit Review'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        <div className="space-y-3 mt-4">
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {showForm ? '' : 'No reviews yet. Be the first to review!'}
            </p>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{review.user_name}</span>
                      <Badge variant="outline" className="text-xs">Verified</Badge>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>

                {review.photo_url && (
                  <img
                    src={resolvePhotoUrl(review.photo_url)}
                    alt="Review"
                    className="w-20 h-20 rounded-lg object-cover mb-2"
                  />
                )}

                <p className="text-sm text-gray-700 mb-2">{review.comment}</p>

                {/* Delete button if user's own review */}
                {(() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return null; } })() === review.user_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteReview(review.id)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewsComponent;
