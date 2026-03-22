// API Service for The Mughal's Dastarkhwan
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (Array.isArray(detail)) {
        // Convert Pydantic validation errors to a readable string
        error.response.data.detail = detail.map(err => 
          `${err.loc?.[1] || err.loc?.[0] || 'Field'}: ${err.msg}`
        ).join('; ');
      }
    }
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  register: async (data) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },
  
  login: async (data) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  
  addFavorite: async (itemId) => {
    const response = await apiClient.post(`/auth/favorites/${itemId}`);
    return response.data;
  },
  
  removeFavorite: async (itemId) => {
    const response = await apiClient.delete(`/auth/favorites/${itemId}`);
    return response.data;
  },

  createOrder: async (data) => {
    const response = await apiClient.post('/auth/orders', data);
    return response.data;
  },

  getOrders: async () => {
    const response = await apiClient.get('/auth/orders');
    return response.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await apiClient.put(`/auth/orders/${orderId}`, null, {
      params: { status }
    });
    return response.data;
  },
};

// Shopping Cart API
export const cartApi = {
  getCart: async () => {
    const response = await apiClient.get('/auth/cart');
    return response.data;
  },

  addToCart: async (itemId, quantity = 1) => {
    const response = await apiClient.post('/auth/cart', {
      item_id: itemId,
      quantity,
    });
    return response.data;
  },

  updateQuantity: async (itemId, quantity) => {
    const response = await apiClient.put(`/auth/cart/${itemId}`, null, {
      params: { quantity }
    });
    return response.data;
  },

  removeFromCart: async (itemId) => {
    const response = await apiClient.delete(`/auth/cart/${itemId}`);
    return response.data;
  },

  clearCart: async () => {
    const response = await apiClient.post('/auth/cart/clear');
    return response.data;
  },

  checkout: async (orderData) => {
    const response = await apiClient.post('/auth/orders', orderData);
    return response.data;
  },
};

// Payments API
export const paymentsApi = {
  createOrder: async (data) => {
    const response = await apiClient.post('/auth/payments/create-order', data);
    return response.data;
  },

  verifyPayment: async (data) => {
    const response = await apiClient.post('/auth/payments/verify', data);
    return response.data;
  },
};

// Contact API
export const contactApi = {
  submitMessage: async (data) => {
    const response = await apiClient.post('/contact', data);
    return response.data;
  },
  
  getMessages: async () => {
    const response = await apiClient.get('/contact');
    return response.data;
  },

};

// Menu API
export const menuApi = {
  getCategories: async () => {
    const response = await apiClient.get('/menu/categories');
    return response.data;
  },
  
  getItems: async (categoryId = null) => {
    const url = categoryId ? `/menu?category_id=${categoryId}` : '/menu';
    const response = await apiClient.get(url);
    return response.data;
  },
  
  getItem: async (itemId) => {
    const response = await apiClient.get(`/menu/${itemId}`);
    return response.data;
  },

  updateItem: async (itemId, updateData) => {
    const response = await apiClient.put(`/menu/${itemId}`, updateData);
    return response.data;
  },
};

// Testimonials API
export const testimonialsApi = {
  getAll: async () => {
    const response = await apiClient.get('/testimonials');
    return response.data;
  },
};

// Restaurant Info API
export const restaurantApi = {
  getInfo: async () => {
    const response = await apiClient.get('/restaurant');
    return response.data;
  },
};

// Reservations API
export const reservationsApi = {
  createReservation: async (reservationData) => {
    const response = await apiClient.post('/auth/reservations', reservationData);
    return response.data;
  },

  getReservations: async () => {
    const response = await apiClient.get('/auth/reservations');
    return response.data;
  },

  updateReservation: async (reservationId, updateData) => {
    const response = await apiClient.put(`/auth/reservations/${reservationId}`, updateData);
    return response.data;
  },

  cancelReservation: async (reservationId) => {
    const response = await apiClient.delete(`/auth/reservations/${reservationId}`);
    return response.data;
  },

  sendReminders: async () => {
    const response = await apiClient.post('/auth/reservations/admin/send-reminders');
    return response.data;
  },

  updateReservationStatus: async (reservationId, status, tableNumber = null) => {
    const params = { status };
    if (tableNumber) params.table_number = tableNumber;
    const response = await apiClient.put(`/auth/reservations/${reservationId}/status`, null, { params });
    return response.data;
  },
};

// Reviews API
export const reviewsApi = {
  submitReview: async (reviewData) => {
    const response = await apiClient.post('/auth/reviews', reviewData);
    return response.data;
  },

  getItemReviews: async (menuItemId, approvedOnly = true) => {
    const response = await apiClient.get(`/auth/reviews/item/${menuItemId}`, {
      params: { approved_only: approvedOnly }
    });
    return response.data;
  },

  getUserReviews: async () => {
    const response = await apiClient.get('/auth/reviews/user/my-reviews');
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await apiClient.delete(`/auth/reviews/${reviewId}`);
    return response.data;
  },

  getPendingReviews: async () => {
    const response = await apiClient.get('/auth/reviews/admin/pending');
    return response.data;
  },

  approveReview: async (reviewId) => {
    const response = await apiClient.put(`/auth/reviews/admin/${reviewId}/approve`);
    return response.data;
  },

  rejectReview: async (reviewId) => {
    const response = await apiClient.put(`/auth/reviews/admin/${reviewId}/reject`);
    return response.data;
  },

  uploadReviewPhoto: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/auth/reviews/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
};

// Loyalty Program API
export const loyaltyApi = {
  getStatus: async () => {
    const response = await apiClient.get('/auth/loyalty/status');
    return response.data;
  },

  getAvailableCoupons: async () => {
    const response = await apiClient.get('/auth/loyalty/coupons');
    return response.data;
  },

  validateCoupon: async (couponCode, orderAmount) => {
    const response = await apiClient.post('/auth/loyalty/validate-coupon', {
      coupon_code: couponCode,
      order_amount: orderAmount
    });
    return response.data;
  },

  addPoints: async (userId, orderId, amount) => {
    const response = await apiClient.post('/auth/loyalty/add-points', {
      user_id: userId,
      order_id: orderId,
      amount
    });
    return response.data;
  },

  createCoupon: async (couponData) => {
    const response = await apiClient.post('/auth/loyalty/admin/create-coupon', couponData);
    return response.data;
  },

  deactivateCoupon: async (couponCode) => {
    const response = await apiClient.put(`/auth/loyalty/admin/coupon/${couponCode}/deactivate`);
    return response.data;
  },
};

// Notifications API
export const notificationsApi = {
  sendPromotions: async (payload) => {
    const response = await apiClient.post('/auth/notifications/admin/promotions', payload);
    return response.data;
  },
};

// Orders API (for admin)
export const ordersApi = {
  getOrders: async () => {
    const response = await apiClient.get('/auth/orders');
    return response.data;
  },

  getOrder: async (orderId) => {
    const response = await apiClient.get(`/auth/orders/${orderId}`);
    return response.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await apiClient.put(`/auth/orders/${orderId}`, null, {
      params: { status }
    });
    return response.data;
  },

  createOrder: async (orderData) => {
    const response = await apiClient.post('/auth/orders', orderData);
    return response.data;
  },

  cancelOrder: async (orderId) => {
    const response = await apiClient.delete(`/auth/orders/${orderId}`);
    return response.data;
  },
};

export default apiClient;
