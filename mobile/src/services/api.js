import axios from 'axios';
import { Platform } from 'react-native';
import { API_URL } from '../constants/theme';

// SecureStore for native, localStorage for web
let storage;
if (Platform.OS === 'web') {
  storage = {
    getItemAsync: async (key) => localStorage.getItem(key),
    setItemAsync: async (key, val) => localStorage.setItem(key, val),
    deleteItemAsync: async (key) => localStorage.removeItem(key),
  };
} else {
  storage = require('expo-secure-store');
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Token helpers
export const getToken = async () => storage.getItemAsync('token');
export const setToken = async (token) => storage.setItemAsync('token', token);
export const removeToken = async () => storage.deleteItemAsync('token');
export const getUser = async () => {
  const u = await storage.getItemAsync('user');
  return u ? JSON.parse(u) : null;
};
export const setUser = async (user) => storage.setItemAsync('user', JSON.stringify(user));
export const removeUser = async () => storage.deleteItemAsync('user');

// Request interceptor — attach token
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — error handling
let onUnauthorized = null;
export const setOnUnauthorized = (cb) => { onUnauthorized = cb; };

apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.data?.detail) {
      const d = error.response.data.detail;
      if (Array.isArray(d)) {
        error.response.data.detail = d.map(e => `${e.loc?.[1] || 'Field'}: ${e.msg}`).join('; ');
      }
    }
    if (error.response?.status === 401) {
      await removeToken();
      await removeUser();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────
export const authApi = {
  register: async (data) => (await apiClient.post('/auth/register', data)).data,
  login: async (data) => (await apiClient.post('/auth/login', data)).data,
  getProfile: async () => (await apiClient.get('/auth/me')).data,
  updateProfile: async (data) => (await apiClient.put('/auth/me', data)).data,
  addFavorite: async (id) => (await apiClient.post(`/auth/favorites/${id}`)).data,
  removeFavorite: async (id) => (await apiClient.delete(`/auth/favorites/${id}`)).data,
  getOrders: async () => (await apiClient.get('/auth/orders')).data,
};

// ─── Cart ────────────────────────────────────────────
export const cartApi = {
  getCart: async () => (await apiClient.get('/auth/cart')).data,
  addToCart: async (itemId, qty = 1) => (await apiClient.post('/auth/cart', { item_id: itemId, quantity: qty })).data,
  updateQuantity: async (itemId, qty) => (await apiClient.put(`/auth/cart/${itemId}`, null, { params: { quantity: qty } })).data,
  removeFromCart: async (itemId) => (await apiClient.delete(`/auth/cart/${itemId}`)).data,
  clearCart: async () => (await apiClient.post('/auth/cart/clear')).data,
};

// ─── Menu ────────────────────────────────────────────
export const menuApi = {
  getCategories: async () => (await apiClient.get('/menu/categories')).data,
  getItems: async (catId) => (await apiClient.get(catId ? `/menu?category_id=${catId}` : '/menu')).data,
  getItem: async (id) => (await apiClient.get(`/menu/${id}`)).data,
};

// ─── Orders ──────────────────────────────────────────
export const ordersApi = {
  create: async (data) => (await apiClient.post('/auth/orders', data)).data,
  getOrders: async () => (await apiClient.get('/auth/orders')).data,
  getOrder: async (id) => (await apiClient.get(`/auth/orders/${id}`)).data,
  cancel: async (id) => (await apiClient.delete(`/auth/orders/${id}`)).data,
  getDriverLocation: async (id) => (await apiClient.get(`/auth/orders/${id}/driver-location`)).data,
};

// ─── Reservations ────────────────────────────────────
export const reservationsApi = {
  getSlots: async (date) => (await apiClient.get(`/auth/reservations/slots/${date}`)).data,
  create: async (data) => (await apiClient.post('/auth/reservations', data)).data,
  getAll: async () => (await apiClient.get('/auth/reservations')).data,
  cancel: async (id) => (await apiClient.delete(`/auth/reservations/${id}`)).data,
};

// ─── Loyalty ─────────────────────────────────────────
export const loyaltyApi = {
  getStatus: async () => (await apiClient.get('/auth/loyalty/status')).data,
  getCoupons: async () => (await apiClient.get('/auth/loyalty/coupons')).data,
  validateCoupon: async (code, amount) => (await apiClient.post('/auth/loyalty/validate-coupon', { coupon_code: code, order_amount: amount })).data,
  autoApplyDirect: async (amount) => (await apiClient.post('/auth/loyalty/auto-apply-direct', { coupon_code: 'DIRECT10', order_amount: amount, source: 'app' })).data,
};

// ─── Delivery ────────────────────────────────────────
export const deliveryApi = {
  estimate: async (km = 2.0) => (await apiClient.post('/auth/delivery/estimate', { distance_km: km })).data,
};

// ─── Payments ────────────────────────────────────────
export const paymentsApi = {
  createOrder: async (data) => (await apiClient.post('/auth/payments/create-order', data)).data,
  verifyPayment: async (data) => (await apiClient.post('/auth/payments/verify', data)).data,
};

// ─── Reviews ─────────────────────────────────────────
export const reviewsApi = {
  submitReview: async (data) => (await apiClient.post('/auth/reviews', data)).data,
  submitReviewWithPhoto: async (formData) => {
    const response = await apiClient.post('/auth/reviews', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  uploadReviewPhoto: async (reviewId, photoUri) => {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      name: 'review-photo.jpg',
      type: 'image/jpeg',
    });
    const response = await apiClient.post(`/auth/reviews/${reviewId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getItemReviews: async (itemId, approvedOnly = true) => (await apiClient.get(`/auth/reviews/item/${itemId}`, { params: { approved_only: approvedOnly } })).data,
  getUserReviews: async () => (await apiClient.get('/auth/reviews/user/my-reviews')).data,
  deleteReview: async (id) => (await apiClient.delete(`/auth/reviews/${id}`)).data,
};

// ─── Chat (AI) ───────────────────────────────────────
export const chatApi = {
  send: async (message, history = []) => (await apiClient.post('/auth/chat', { message, history })).data,
  sendQuick: async (message, history = []) => (await apiClient.post('/chat/quick', { message, history })).data,
};

// ─── Restaurant Info ─────────────────────────────────
export const restaurantApi = {
  getInfo: async () => (await apiClient.get('/restaurant')).data,
};

// ─── Contact ─────────────────────────────────────────
export const contactApi = {
  submit: async (data) => (await apiClient.post('/contact', data)).data,
};

// ─── Delivery Agents ─────────────────────────────────
export const deliveryAgentsApi = {
  // Admin endpoints
  listAgents: async () => (await apiClient.get('/auth/delivery-agents')).data,
  listAvailableAgents: async () => (await apiClient.get('/auth/delivery-agents/available')).data,
  createAgent: async (data) => (await apiClient.post('/auth/delivery-agents', data)).data,
  updateAgent: async (id, data) => (await apiClient.put(`/auth/delivery-agents/${id}`, data)).data,
  deactivateAgent: async (id) => (await apiClient.delete(`/auth/delivery-agents/${id}`)).data,
  // Delivery agent self-service endpoints
  getMyOrders: async () => (await apiClient.get('/auth/delivery-agents/my-orders')).data,
  acceptOrder: async (orderId) => (await apiClient.post(`/auth/delivery-agents/accept-order/${orderId}`)).data,
  rejectOrder: async (orderId) => (await apiClient.post(`/auth/delivery-agents/reject-order/${orderId}`)).data,
  updateDeliveryStatus: async (orderId, status, note = null) =>
    (await apiClient.post(`/auth/delivery-agents/update-delivery/${orderId}`, { status, note })).data,
  // Driver location sharing
  updateDriverLocation: async (orderId, lat, lng) =>
    (await apiClient.post(`/auth/orders/${orderId}/driver-location`, null, { params: { lat, lng } })).data,
};

// ─── Admin (role=admin only) ─────────────────────────
export const adminApi = {
  // Orders
  getAllOrders: async () => (await apiClient.get('/auth/orders')).data,
  updateOrderStatus: async (id, status) => (await apiClient.patch(`/auth/orders/${id}/status`, { status })).data,
  assignAgent: async (id, agentId) => (await apiClient.patch(`/auth/orders/${id}/assign-agent`, { agent_id: agentId })).data,
  assignDelivery: async (id, data) => (await apiClient.patch(`/auth/orders/${id}/assign-delivery`, data)).data,
  // Reservations
  getAllReservations: async () => (await apiClient.get('/auth/reservations')).data,
  updateReservationStatus: async (id, status) => (await apiClient.put(`/auth/reservations/${id}/status`, null, { params: { status } })).data,
  // Contact messages
  getMessages: async () => (await apiClient.get('/contact')).data,
  // Reviews moderation
  getPendingReviews: async () => (await apiClient.get('/auth/reviews/admin/pending')).data,
  approveReview: async (id) => (await apiClient.put(`/auth/reviews/admin/${id}/approve`)).data,
  rejectReview: async (id) => (await apiClient.put(`/auth/reviews/admin/${id}/reject`)).data,
  // Menu management
  getMenuItems: async () => (await apiClient.get('/menu')).data,
  updateMenuItem: async (id, data) => (await apiClient.put(`/menu/${id}`, data)).data,
  // Delivery agents
  listAgents: async () => (await apiClient.get('/auth/delivery-agents')).data,
  listAvailableAgents: async () => (await apiClient.get('/auth/delivery-agents/available')).data,
  createAgent: async (data) => (await apiClient.post('/auth/delivery-agents', data)).data,
  updateAgent: async (id, data) => (await apiClient.put(`/auth/delivery-agents/${id}`, data)).data,
  deactivateAgent: async (id) => (await apiClient.delete(`/auth/delivery-agents/${id}`)).data,
  // Promotions
  sendPromotion: async (data) => (await apiClient.post('/auth/notifications/admin/promotions', data)).data,
  // Loyalty admin
  createCoupon: async (data) => (await apiClient.post('/auth/loyalty/admin/create-coupon', data)).data,
  deactivateCoupon: async (code) => (await apiClient.put(`/auth/loyalty/admin/coupon/${code}/deactivate`)).data,
};

// ─── Testimonials ────────────────────────────────────
export const testimonialsApi = {
  getAll: async () => (await apiClient.get('/testimonials')).data,
};

export default apiClient;
