import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, User, CheckCircle, X, ChevronDown, ChevronUp, RefreshCw, Truck, Clock, Star, Gift, Settings, LayoutDashboard, Package, Edit3, Save, RotateCcw, Award, TrendingUp, MapPin, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { authApi, menuApi, ordersApi, loyaltyApi, cartApi } from '../services/api';
import OrderTracker from '../components/OrderTracker';

const getStatusColor = (status) => {
  switch (status) {
    case 'placed':
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'accepted':
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'preparing':
      return 'bg-purple-100 text-purple-800';
    case 'ready':
      return 'bg-green-100 text-green-800';
    case 'ready_for_pickup':
      return 'bg-emerald-100 text-emerald-800';
    case 'assigned':
      return 'bg-indigo-100 text-indigo-800';
    case 'accepted_by_agent':
      return 'bg-cyan-100 text-cyan-800';
    case 'picked_up':
      return 'bg-teal-100 text-teal-800';
    case 'out_for_delivery':
      return 'bg-orange-100 text-orange-800';
    case 'delivered':
      return 'bg-slate-100 text-slate-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status) => {
  const labels = {
    placed: 'Placed',
    pending: 'Placed',
    accepted: 'Accepted',
    confirmed: 'Accepted',
    preparing: 'Preparing',
    ready: 'Ready',
    ready_for_pickup: 'Ready for Pickup',
    assigned: 'Agent Assigned',
    accepted_by_agent: 'Agent Accepted',
    picked_up: 'Picked Up',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const ORDER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'delivered', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [visibleOrders, setVisibleOrders] = useState(10);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [orderFilter, setOrderFilter] = useState('all');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: '', address: '', landmark: '' });
  const [savingAddress, setSavingAddress] = useState(false);
  const pollRef = useRef(null);

  const hasActiveOrders = useMemo(() => {
    return orders.some(o => ['placed', 'accepted', 'preparing', 'ready', 'ready_for_pickup', 'assigned', 'accepted_by_agent', 'picked_up', 'out_for_delivery', 'pending', 'confirmed'].includes(o.status));
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    if (orderFilter === 'active') return orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    if (orderFilter === 'delivered') return orders.filter(o => o.status === 'delivered');
    if (orderFilter === 'cancelled') return orders.filter(o => o.status === 'cancelled');
    return orders;
  }, [orders, orderFilter]);

  const totalSpent = useMemo(() => {
    return orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [orders]);

  const fetchOrders = useCallback(async () => {
    try {
      const ordersData = await authApi.getOrders();
      setOrders(ordersData);
      setLastRefresh(new Date());
    } catch {
      // silent fail for polling
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, itemsData, ordersData] = await Promise.all([
          authApi.getProfile(),
          menuApi.getItems(),
          authApi.getOrders(),
        ]);
        setProfile(profileData);
        setProfileForm({ name: profileData.name || '', phone: profileData.phone || '' });
        setWhatsappEnabled(profileData.whatsapp_notifications || false);
        setMenuItems(itemsData);
        setOrders(ordersData);
        setLastRefresh(new Date());

        // Fetch loyalty silently
        try {
          const loyaltyData = await loyaltyApi.getStatus();
          setLoyalty(loyaltyData);
        } catch {
          // loyalty might not be set up for this user
        }
      } catch (error) {
        if (error.response?.status === 401) {
          toast.error('Please login to view profile');
          navigate('/login');
        } else {
          setLoadError(true);
          toast.error('Failed to load profile data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Poll for order status every 12 seconds when there are active orders
  useEffect(() => {
    if (hasActiveOrders) {
      pollRef.current = setInterval(fetchOrders, 12000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [hasActiveOrders, fetchOrders]);

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

  const handleReorder = async (order) => {
    if (!order.items || order.items.length === 0) {
      toast.error('No items to reorder');
      return;
    }
    try {
      setOrdering(true);
      for (const item of order.items) {
        await cartApi.addToCart(item.item_id, item.quantity);
      }
      toast.success('Items added to cart! Redirecting to checkout...');
      navigate('/checkout');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add items to cart');
    } finally {
      setOrdering(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      setSavingProfile(true);
      const updated = await authApi.updateProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim() || null,
      });
      setProfile(updated);
      setEditingProfile(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async () => {
    if (!addressForm.label.trim() || !addressForm.address.trim()) {
      toast.error('Label and address are required');
      return;
    }
    try {
      setSavingAddress(true);
      const currentAddresses = profile.addresses || [];
      const newAddress = {
        label: addressForm.label.trim(),
        address: addressForm.address.trim(),
        landmark: addressForm.landmark.trim() || null,
        is_default: currentAddresses.length === 0,
      };
      const updated = await authApi.updateProfile({
        addresses: [...currentAddresses, newAddress],
      });
      setProfile(updated);
      setAddressForm({ label: '', address: '', landmark: '' });
      setShowAddressForm(false);
      toast.success('Address saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Remove this address?')) return;
    try {
      const filtered = (profile.addresses || []).filter(a => a.id !== addrId);
      const updated = await authApi.updateProfile({ addresses: filtered });
      setProfile(updated);
      toast.success('Address removed');
    } catch (error) {
      toast.error('Failed to remove address');
    }
  };

  const handleSetDefaultAddress = async (addrId) => {
    try {
      const updated_addresses = (profile.addresses || []).map(a => ({
        ...a,
        is_default: a.id === addrId,
      }));
      const updated = await authApi.updateProfile({ addresses: updated_addresses });
      setProfile(updated);
      toast.success('Default address updated');
    } catch (error) {
      toast.error('Failed to update default address');
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
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#0f172a] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-[#0f172a]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#ECEC75] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#0f172a] text-lg mb-4">Failed to load dashboard</p>
          <Button onClick={() => window.location.reload()} className="bg-[#0f172a] hover:bg-[#1e293b]">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ===== RENDER ORDER CARD =====
  const renderOrderCard = (order, compact = false) => (
    <div key={order.id} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      <div className="p-5">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-[#0f172a]">Order #{order.id.slice(0, 8)}</h3>
              <Badge className={`text-xs px-2.5 py-1 ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </Badge>
              <button
                onClick={(e) => { e.stopPropagation(); fetchOrders(); }}
                className="p-1.5 rounded-full hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
                title="Refresh order status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Status Step Tracker for active orders (not in compact mode) */}
            {!compact && order.status !== 'cancelled' && order.status !== 'delivered' && (() => {
              const isDelivery = order.delivery_type && order.delivery_type !== 'pickup';
              const steps = isDelivery
                ? ['placed', 'accepted', 'preparing', 'ready', 'assigned', 'accepted_by_agent', 'picked_up', 'out_for_delivery', 'delivered']
                : ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'delivered'];
              const labels = isDelivery
                ? ['Placed', 'Accepted', 'Preparing', 'Ready', 'Assigned', 'Agent OK', 'Picked Up', 'On the Way', 'Delivered']
                : ['Placed', 'Accepted', 'Preparing', 'Ready for Pickup', 'Delivered'];

              let mappedStatus = order.status;
              if (mappedStatus === 'pending') mappedStatus = 'placed';
              if (mappedStatus === 'confirmed') mappedStatus = 'accepted';
              if (!isDelivery && mappedStatus === 'ready') mappedStatus = 'ready_for_pickup';

              const currentIdx = steps.indexOf(mappedStatus);
              return (
                <div className="flex items-center gap-1 my-3 overflow-x-auto pb-1">
                  {steps.map((step, idx) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center min-w-[48px]">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx <= currentIdx ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                        } ${idx === currentIdx ? 'ring-2 ring-green-300 ring-offset-1' : ''}`}>
                          {idx <= currentIdx ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[10px] mt-1 text-center leading-tight ${idx <= currentIdx ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
                          {labels[idx]}
                        </span>
                      </div>
                      {idx < steps.length - 1 && (
                        <div className={`flex-1 h-0.5 min-w-[12px] ${idx < currentIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              );
            })()}

            <p className="text-sm text-[#64748b] flex items-center gap-2 mb-1">
              <span>📅</span> {new Date(order.created_at).toLocaleString()}
            </p>
            {order.order_type && (
              <p className="text-sm text-[#64748b] flex items-center gap-2">
                <span>{order.order_type === 'dine-in' ? '🍽️' : order.order_type === 'delivery' ? '🚚' : '🥡'}</span>
                {order.order_type === 'dine-in' ? 'Dine-in' : order.order_type === 'delivery' ? 'Delivery' : 'Takeaway'}
                {order.table_number && ` - Table ${order.table_number}`}
              </p>
            )}
            {!compact && order.payment_method && (
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
            {!compact && order.delivery_type && order.delivery_type !== 'pickup' && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm">
                <p className="text-blue-800 font-semibold flex items-center gap-1">
                  🚚 {order.delivery_type === 'self_delivery' ? 'Restaurant Delivery' : `${(order.delivery_partner || '').charAt(0).toUpperCase() + (order.delivery_partner || '').slice(1)} Delivery`}
                </p>
                {order.delivery_charge > 0 && (
                  <p className="text-blue-600 text-xs">Delivery charge: ₹{order.delivery_charge}</p>
                )}
                {order.delivery_address && (
                  <p className="text-blue-600 text-xs">📍 {order.delivery_address}</p>
                )}
              </div>
            )}
            {order.discount_amount > 0 && (
              <p className="text-sm text-green-600 mt-1">💰 Discount: ₹{order.discount_amount}</p>
            )}
          </div>
          <div className="bg-[#ECEC75] px-5 py-2.5 rounded-xl text-right shadow-md">
            <p className="text-2xl font-bold text-[#0f172a]">₹{order.total_amount}</p>
            <p className="text-xs text-[#64748b] mt-0.5">{order.items?.length || 0} items</p>
          </div>
        </div>

        {/* Expandable Items */}
        {!compact && (
          <div className="border-t border-gray-200 pt-3 mb-3">
            <button
              onClick={() => toggleOrderDetails(order.id)}
              className="flex items-center gap-2 text-sm text-[#64748b] hover:text-[#0f172a] font-medium transition-colors"
            >
              {expandedOrder === order.id ? (
                <><ChevronUp className="w-4 h-4" /> Hide Details</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> View Details ({order.items?.length || 0} items)</>
              )}
            </button>
            {expandedOrder === order.id && order.items && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <ul className="space-y-2">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center pb-2 border-b last:border-b-0 last:pb-0">
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
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {(order.status === 'placed' || order.status === 'accepted' || order.status === 'pending' || order.status === 'confirmed') && (
            <Button
              onClick={() => handleCancelOrder(order.id)}
              disabled={updatingOrder === order.id}
              className="bg-red-600 hover:bg-red-700 text-white shadow-md"
              size="sm"
            >
              {updatingOrder === order.id ? 'Cancelling...' : <><X className="w-3.5 h-3.5 mr-1" /> Cancel</>}
            </Button>
          )}
          {order.status === 'delivered' && order.items && order.items.length > 0 && (
            <Button
              onClick={() => handleReorder(order)}
              disabled={ordering}
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white shadow-md"
              size="sm"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reorder
            </Button>
          )}
        </div>

        {/* Real-time Order Tracker */}
        {!compact && expandedOrder === order.id && (
          <div className="mt-3">
            <OrderTracker order={order} />
          </div>
        )}

        {/* Delivery Agent Info */}
        {order.delivery_agent_name && expandedOrder !== order.id && (
          <div className="mt-2 p-2.5 bg-indigo-50 rounded-lg text-sm">
            <p className="text-indigo-800 font-semibold">🛵 Delivery Agent: {order.delivery_agent_name}</p>
          </div>
        )}
        {order.driver_name && !order.delivery_agent_name && expandedOrder !== order.id && (
          <div className="mt-2 p-2.5 bg-indigo-50 rounded-lg text-sm">
            <p className="text-indigo-800 font-semibold">🛵 Driver: {order.driver_name}</p>
            {order.driver_phone && <p className="text-indigo-600 text-xs">📞 {order.driver_phone}</p>}
          </div>
        )}
      </div>
    </div>
  );

  // ===== DASHBOARD TAB =====
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-none">
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-[#0f172a]">{orders.length}</p>
            <p className="text-xs text-[#64748b] mt-1">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-none">
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-[#0f172a]">₹{totalSpent.toLocaleString()}</p>
            <p className="text-xs text-[#64748b] mt-1">Total Spent</p>
          </CardContent>
        </Card>
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-none">
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-[#0f172a]">{favoriteItems.length}</p>
            <p className="text-xs text-[#64748b] mt-1">Favorites</p>
          </CardContent>
        </Card>
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-none">
          <CardContent className="p-5 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-[#0f172a]">{loyalty?.points ?? 0}</p>
            <p className="text-xs text-[#64748b] mt-1">Loyalty Points</p>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Card */}
      {loyalty && (
        <Card className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] shadow-xl border-none text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="w-5 h-5 text-[#ECEC75]" />
                  <h3 className="text-lg font-bold">Loyalty Rewards</h3>
                </div>
                <p className="text-sm text-gray-300">
                  {loyalty.tier ? `${loyalty.tier} Member` : 'Member'} · {loyalty.points || 0} points
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-[#ECEC75]">{loyalty.points || 0}</p>
                <p className="text-xs text-gray-400">Points Balance</p>
              </div>
            </div>
            {loyalty.points_to_next_tier > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{loyalty.tier || 'Bronze'}</span>
                  <span>{loyalty.next_tier || 'Silver'}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-[#ECEC75] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((loyalty.points || 0) / ((loyalty.points || 0) + (loyalty.points_to_next_tier || 100))) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{loyalty.points_to_next_tier} points to next tier</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <h3 className="text-lg font-bold text-[#0f172a]">Active Orders ({activeOrders.length})</h3>
              </div>
              <Button onClick={fetchOrders} variant="outline" size="sm" className="border-green-200 text-green-600 hover:bg-green-50">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>
            <div className="space-y-4">
              {activeOrders.slice(0, 3).map((order) => renderOrderCard(order))}
            </div>
            {activeOrders.length > 3 && (
              <Button
                onClick={() => { setActiveTab('orders'); setOrderFilter('active'); }}
                variant="outline"
                className="w-full mt-4 border-[#0f172a] text-[#0f172a] hover:bg-gray-50"
              >
                View All Active Orders ({activeOrders.length})
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Completed Orders */}
      {orders.filter(o => o.status === 'delivered').length > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-slate-500" />
              <h3 className="text-lg font-bold text-[#0f172a]">Recent Completed</h3>
            </div>
            <div className="space-y-4">
              {orders.filter(o => o.status === 'delivered').slice(0, 3).map((order) => renderOrderCard(order, true))}
            </div>
            <Button
              onClick={() => { setActiveTab('orders'); setOrderFilter('delivered'); }}
              variant="outline"
              className="w-full mt-4 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              View All Completed Orders
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {orders.length === 0 && (
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
          <CardContent className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#0f172a] mb-2">No orders yet</h3>
            <p className="text-[#64748b] mb-6">Place your first order from our delicious menu!</p>
            <Button onClick={() => navigate('/')} className="bg-[#0f172a] hover:bg-[#1e293b]">
              Browse Menu
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ===== ORDERS TAB =====
  const renderOrders = () => (
    <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold text-[#0f172a]">My Orders</h2>
            {hasActiveOrders && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Auto-refreshing every 12s
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-[#64748b] hidden sm:block">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button onClick={fetchOrders} variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {ORDER_FILTERS.map(filter => {
            const count = filter.id === 'all' ? orders.length
              : filter.id === 'active' ? orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length
              : filter.id === 'delivered' ? orders.filter(o => o.status === 'delivered').length
              : orders.filter(o => o.status === 'cancelled').length;
            return (
              <button
                key={filter.id}
                onClick={() => { setOrderFilter(filter.id); setVisibleOrders(10); }}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  orderFilter === filter.id
                    ? 'bg-[#0f172a] text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Order List */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-[#64748b] text-lg">
              {orderFilter === 'all' ? 'No orders yet' : `No ${orderFilter} orders`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.slice(0, visibleOrders).map((order) => renderOrderCard(order))}
          </div>
        )}
        {visibleOrders < filteredOrders.length && (
          <div className="text-center pt-6">
            <Button
              onClick={() => setVisibleOrders(v => v + 10)}
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
            >
              Load More ({filteredOrders.length - visibleOrders} remaining)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ===== FAVORITES TAB =====
  const renderFavorites = () => (
    <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
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
            {ordering ? 'Placing Order...' : '🛒 Quick Order All'}
          </Button>
        </div>
        {favoriteItems.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-[#64748b] text-lg mb-2">No favorites yet</p>
            <p className="text-[#94a3b8] text-sm mb-6">Add items from the menu by tapping the heart icon</p>
            <Button onClick={() => navigate('/')} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              Browse Menu
            </Button>
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
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ===== SETTINGS TAB =====
  const renderSettings = () => (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#0f172a]">Profile Settings</h2>
            </div>
            {!editingProfile && (
              <Button
                onClick={() => setEditingProfile(true)}
                variant="outline"
                size="sm"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1">Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f172a] focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-[#94a3b8] mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f172a] focus:border-transparent"
                  placeholder="Your phone number"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-[#0f172a] hover:bg-[#1e293b]"
                >
                  {savingProfile ? 'Saving...' : <><Save className="w-4 h-4 mr-1" /> Save Changes</>}
                </Button>
                <Button
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileForm({ name: profile.name || '', phone: profile.phone || '' });
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-8 h-8 text-[#ECEC75]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0f172a]">{profile.name}</h3>
                  <p className="text-sm text-[#64748b]">{profile.email}</p>
                  {profile.phone && <p className="text-sm text-[#64748b]">{profile.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-[#94a3b8] mb-0.5">Member Since</p>
                  <p className="text-sm font-medium text-[#0f172a]">
                    {new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-[#94a3b8] mb-0.5">Role</p>
                  <p className="text-sm font-medium text-[#0f172a] capitalize">{profile.role || 'Customer'}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#0f172a]">Saved Addresses</h2>
            </div>
            <Button
              onClick={() => setShowAddressForm(!showAddressForm)}
              size="sm"
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>

          {/* Add Address Form */}
          {showAddressForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1">Label *</label>
                <input
                  type="text"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm(f => ({ ...f, label: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f172a] focus:border-transparent"
                  placeholder="e.g. Home, Work, Mom's place"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1">Full Address *</label>
                <textarea
                  value={addressForm.address}
                  onChange={(e) => setAddressForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f172a] focus:border-transparent"
                  rows="2"
                  placeholder="House/flat no., street, area, city, pincode"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-1">Landmark (optional)</label>
                <input
                  type="text"
                  value={addressForm.landmark}
                  onChange={(e) => setAddressForm(f => ({ ...f, landmark: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f172a] focus:border-transparent"
                  placeholder="Near park, opposite mall, etc."
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleAddAddress} disabled={savingAddress} className="bg-[#0f172a] hover:bg-[#1e293b]" size="sm">
                  {savingAddress ? 'Saving...' : <><Save className="w-3.5 h-3.5 mr-1" /> Save Address</>}
                </Button>
                <Button onClick={() => { setShowAddressForm(false); setAddressForm({ label: '', address: '', landmark: '' }); }} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Address List */}
          {(!profile.addresses || profile.addresses.length === 0) && !showAddressForm ? (
            <p className="text-center text-[#94a3b8] py-6">No saved addresses. Add one for faster checkout!</p>
          ) : (
            <div className="space-y-3">
              {(profile.addresses || []).map((addr) => (
                <div key={addr.id} className={`p-4 rounded-lg border ${addr.is_default ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#0f172a]">{addr.label}</span>
                        {addr.is_default && (
                          <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#64748b]">{addr.address}</p>
                      {addr.landmark && <p className="text-xs text-[#94a3b8] mt-0.5">📍 {addr.landmark}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!addr.is_default && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Notifications */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0f172a]">WhatsApp Notifications</h2>
                <p className="text-sm text-[#64748b]">Get order updates on WhatsApp</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const newVal = !whatsappEnabled;
                setWhatsappEnabled(newVal);
                try {
                  await authApi.updateProfile({ whatsapp_notifications: newVal });
                  toast.success(newVal ? 'WhatsApp notifications enabled!' : 'WhatsApp notifications disabled');
                } catch {
                  setWhatsappEnabled(!newVal);
                  toast.error('Failed to update preference');
                }
              }}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${whatsappEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${whatsappEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {whatsappEnabled && !profile.phone && (
            <p className="text-xs text-amber-600 mt-3 bg-amber-50 px-3 py-2 rounded-lg">
              ⚠️ Please add your phone number above to receive WhatsApp notifications.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl border-none">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-[#0f172a] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => navigate('/loyalty')} variant="outline" className="justify-start h-auto py-3 border-amber-200 hover:bg-amber-50">
              <Gift className="w-5 h-5 mr-3 text-amber-600" />
              <div className="text-left">
                <p className="font-medium text-[#0f172a]">Loyalty Program</p>
                <p className="text-xs text-[#94a3b8]">View rewards & coupons</p>
              </div>
            </Button>
            <Button onClick={() => navigate('/reservations')} variant="outline" className="justify-start h-auto py-3 border-blue-200 hover:bg-blue-50">
              <Clock className="w-5 h-5 mr-3 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-[#0f172a]">Reservations</p>
                <p className="text-xs text-[#94a3b8]">Book a table</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ECEC75] via-[#f5f5c9] to-[#ECEC75] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-full flex items-center justify-center shadow-lg">
              <User className="w-7 h-7 text-[#ECEC75]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#0f172a]">
                Welcome back, {profile.name?.split(' ')[0]}!
              </h1>
              <p className="text-sm text-[#64748b]">{profile.email}</p>
            </div>
          </div>
          {hasActiveOrders && (
            <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-800">{activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-white/60 backdrop-blur-sm rounded-xl p-1.5 shadow-lg overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#0f172a] text-white shadow-md'
                    : 'text-[#64748b] hover:text-[#0f172a] hover:bg-white/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'favorites' && renderFavorites()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  );
};

export default ProfilePage;
