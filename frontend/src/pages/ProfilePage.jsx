import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, User, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { authApi, menuApi, ordersApi } from '../services/api';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'preparing':
      return 'bg-purple-100 text-purple-800';
    case 'ready':
      return 'bg-green-100 text-green-800';
    case 'delivered':
      return 'bg-slate-100 text-slate-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [visibleOrders, setVisibleOrders] = useState(10);
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, itemsData, ordersData] = await Promise.all([
          authApi.getProfile(),
          menuApi.getItems(),
          authApi.getOrders(),
        ]);
        setProfile(profileData);
        setMenuItems(itemsData);
        setOrders(ordersData);
      } catch (error) {
        toast.error('Please login to view profile');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleCompleteOrder = async (orderId) => {
    try {
      setUpdatingOrder(orderId);
      await ordersApi.updateOrderStatus(orderId, 'delivered');
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: 'delivered' } : order
      ));
      toast.success('Order marked as completed!');
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      setUpdatingOrder(orderId);
      await ordersApi.cancelOrder(orderId);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      ));
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const getItemName = (itemId) => {
    const item = menuItems.find(i => i.id === itemId);
    return item ? item.name : `Item #${itemId}`;
  };

  const favoriteItems = useMemo(() => {
    if (!profile) return [];
    return menuItems.filter((item) => profile.favorite_items.includes(item.id));
  }, [profile, menuItems]);

  const handleQuickOrder = async () => {
    if (!favoriteItems.length) {
      toast.error('No favorite items to order');
      return;
    }

    setOrdering(true);
    try {
      const response = await authApi.createOrder({
        item_ids: favoriteItems.map((item) => item.id),
        notes: 'Quick order from favorites',
      });
      toast.success('Order placed successfully!');
      setOrders((prev) => [
        {
          ...response,
          user_id: profile.id,
          item_ids: favoriteItems.map((item) => item.id),
          notes: 'Quick order from favorites',
        },
        ...prev,
      ]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECEC75] flex items-center justify-center">
        <div className="text-[#0f172a]">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ECEC75] via-[#f5f5c9] to-[#ECEC75] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header with Stats */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-xl border-none">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-10 h-10 text-[#ECEC75]" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#0f172a] mb-1">{profile.name}</h1>
                  <p className="text-[#64748b] flex items-center gap-2">
                    <span>✉️</span> {profile.email}
                  </p>
                  {profile.phone && (
                    <p className="text-[#64748b] flex items-center gap-2 mt-1">
                      <span>📱</span> {profile.phone}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex gap-4">
                <div className="text-center bg-[#ECEC75] px-6 py-3 rounded-xl shadow-md">
                  <p className="text-2xl font-bold text-[#0f172a]">{orders.length}</p>
                  <p className="text-xs text-[#64748b]">Total Orders</p>
                </div>
                <div className="text-center bg-[#ECEC75] px-6 py-3 rounded-xl shadow-md">
                  <p className="text-2xl font-bold text-[#0f172a]">{favoriteItems.length}</p>
                  <p className="text-xs text-[#64748b]">Favorites</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Favorites */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-xl border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#0f172a]">Favorite Items</h2>
              </div>
              <Button
                onClick={handleQuickOrder}
                disabled={ordering || favoriteItems.length === 0}
                className="bg-[#0f172a] hover:bg-[#1e293b] shadow-lg"
              >
                {ordering ? 'Placing Order...' : '🛒 Quick Order'}
              </Button>
            </div>
            {favoriteItems.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[#64748b] text-lg">No favorites yet. Add items from the menu.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteItems.map((item) => (
                  <div key={item.id} className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-[#0f172a] text-lg mb-1">{item.name}</h3>
                        <p className="text-sm text-[#64748b] line-clamp-2">{item.description || 'Delicious dish'}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.is_veg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.is_veg ? '🌱 Veg' : '🍖 Non-Veg'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-[#0f172a]">₹{item.price}</p>
                      <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                    </div>
                  </div>
                ))}
                {visibleOrders < orders.length && (
                  <div className="text-center pt-4">
                    <Button
                      onClick={() => setVisibleOrders((v) => v + 10)}
                      variant="outline"
                      className="border-amber-500 text-amber-600 hover:bg-amber-50"
                    >
                      Load More Orders ({orders.length - visibleOrders} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order History */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#0f172a]">Order History</h2>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[#64748b] text-lg">No orders yet. Place your first order!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {orders.slice(0, visibleOrders).map((order) => (
                  <div key={order.id} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-[#0f172a]">Order #{order.id.slice(0, 8)}</h3>
                            <Badge className={`text-sm px-3 py-1.5 ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-[#64748b] flex items-center gap-2 mb-1">
                            <span>📅</span> {new Date(order.created_at).toLocaleString()}
                          </p>
                          {order.order_type && (
                            <p className="text-sm text-[#64748b] flex items-center gap-2">
                              <span>{order.order_type === 'dine-in' ? '🍽️' : '🥡'}</span>
                              {order.order_type === 'dine-in' ? 'Dine-in' : 'Takeaway'}
                              {order.table_number && ` - Table ${order.table_number}`}
                            </p>
                          )}
                          {order.payment_method && (
                            <p className="text-sm text-[#64748b] flex items-center gap-2">
                              <span>💳</span>
                              {order.payment_method === 'cod'
                                ? 'Cash on Delivery'
                                : order.payment_method === 'gpay'
                                  ? 'Google Pay'
                                  : order.payment_method === 'paytm'
                                    ? 'Paytm'
                                    : order.payment_method === 'phonepe'
                                      ? 'PhonePe'
                                      : order.payment_method}
                            </p>
                          )}
                          {order.discount_amount > 0 && (
                            <p className="text-sm text-green-600 mt-1">
                              💰 Discount: ₹{order.discount_amount}
                            </p>
                          )}
                        </div>
                        <div className="bg-[#ECEC75] px-6 py-3 rounded-xl text-right shadow-md">
                          <p className="text-3xl font-bold text-[#0f172a]">₹{order.total_amount}</p>
                          <p className="text-xs text-[#64748b] mt-1">{order.items?.length || 0} items</p>
                        </div>
                      </div>

                      {/* Order Items - Expandable */}
                      <div className="border-t border-gray-200 pt-4 mb-4">
                        <button
                          onClick={() => toggleOrderDetails(order.id)}
                          className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#0f172a] font-medium transition-colors"
                        >
                          {expandedOrder === order.id ? (
                            <><ChevronUp className="w-4 h-4" /> Hide Items</>
                          ) : (
                            <><ChevronDown className="w-4 h-4" /> Show Items ({order.items?.length || 0})</>
                          )}
                        </button>
                        {expandedOrder === order.id && order.items && (
                          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <ul className="space-y-3">
                              {order.items.map((item, idx) => (
                                <li key={idx} className="flex justify-between items-center pb-3 border-b last:border-b-0 last:pb-0">
                                  <div className="flex-1">
                                    <span className="text-[#0f172a] font-semibold">{getItemName(item.item_id)}</span>
                                    <span className="text-[#64748b] text-sm ml-2">× {item.quantity}</span>
                                  </div>
                                  <span className="font-bold text-[#0f172a]">₹{item.price * item.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        {/* Cancel Button for pending/confirmed orders */}
                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <Button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={updatingOrder === order.id}
                            className="bg-red-600 hover:bg-red-700 text-white shadow-md"
                            size="sm"
                          >
                            {updatingOrder === order.id ? (
                              'Cancelling...'
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-2" />
                                Cancel Order
                              </>
                            )}
                          </Button>
                        )}

                        {/* Complete Order Button for ready/preparing orders */}
                        {(order.status === 'ready' || order.status === 'preparing' || order.status === 'confirmed') && (
                          <Button
                            onClick={() => handleCompleteOrder(order.id)}
                            disabled={updatingOrder === order.id}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                            size="sm"
                          >
                            {updatingOrder === order.id ? (
                              'Updating...'
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {order.order_type === 'takeaway' ? 'Mark as Picked Up' : 'Mark as Received'}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
