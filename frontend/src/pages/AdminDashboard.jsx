import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { ordersApi, reservationsApi, contactApi, reviewsApi, notificationsApi, menuApi, deliveryAgentsApi } from '../services/api';
import { BarChart3, Calendar, MessageSquare, Package, TrendingUp, Check, X, Mail, Truck, UserPlus, Search, ChevronDown, ChevronUp, Phone, User, RefreshCw } from 'lucide-react';

const ORDER_STATUSES = [
  'placed', 'accepted', 'preparing', 'ready', 'ready_for_pickup',
  'assigned', 'accepted_by_agent', 'picked_up',
  'out_for_delivery', 'delivered', 'cancelled'
];

const STATUS_LABELS = {
  placed: 'Placed', accepted: 'Accepted', preparing: 'Preparing',
  ready: 'Ready', ready_for_pickup: 'Ready for Pickup',
  assigned: 'Assigned', accepted_by_agent: 'Agent Accepted',
  picked_up: 'Picked Up', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled',
  pending: 'Placed', confirmed: 'Accepted',
};

const STATUS_COLORS = {
  placed: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  accepted: 'bg-blue-100 text-blue-800 border-blue-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  preparing: 'bg-purple-100 text-purple-800 border-purple-300',
  ready: 'bg-green-100 text-green-800 border-green-300',
  ready_for_pickup: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  assigned: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  accepted_by_agent: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  picked_up: 'bg-teal-100 text-teal-800 border-teal-300',
  out_for_delivery: 'bg-orange-100 text-orange-800 border-orange-300',
  delivered: 'bg-slate-100 text-slate-800 border-slate-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

// Get the next valid action buttons for a given status
const getNextActions = (order) => {
  const s = order.status;
  const isDelivery = order.delivery_type && order.delivery_type !== 'pickup';
  const actions = [];

  if (s === 'placed' || s === 'pending') {
    actions.push({ status: 'accepted', label: 'Accept Order', color: 'bg-blue-600 hover:bg-blue-700' });
    actions.push({ status: 'cancelled', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700' });
  } else if (s === 'accepted' || s === 'confirmed') {
    actions.push({ status: 'preparing', label: 'Start Preparing', color: 'bg-purple-600 hover:bg-purple-700' });
    actions.push({ status: 'cancelled', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700' });
  } else if (s === 'preparing') {
    actions.push({ status: 'ready', label: 'Mark Ready', color: 'bg-green-600 hover:bg-green-700' });
    actions.push({ status: 'cancelled', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700' });
  } else if (s === 'ready') {
    if (isDelivery) {
      actions.push({ status: 'assign_delivery', label: 'Assign Delivery', color: 'bg-indigo-600 hover:bg-indigo-700', special: true });
    }
    // For non-delivery: backend auto-converts ready → ready_for_pickup, but admin can also deliver directly
    if (!isDelivery) {
      actions.push({ status: 'delivered', label: 'Mark Delivered', color: 'bg-slate-600 hover:bg-slate-700' });
    }
    actions.push({ status: 'cancelled', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700' });
  } else if (s === 'ready_for_pickup') {
    actions.push({ status: 'delivered', label: 'Mark Delivered / Picked Up', color: 'bg-slate-600 hover:bg-slate-700' });
    actions.push({ status: 'cancelled', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700' });
  } else if (s === 'assigned') {
    actions.push({ status: 'picked_up', label: 'Mark Picked Up', color: 'bg-teal-600 hover:bg-teal-700' });
    actions.push({ status: 'cancelled', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700' });
  } else if (s === 'accepted_by_agent') {
    actions.push({ status: 'picked_up', label: 'Mark Picked Up', color: 'bg-teal-600 hover:bg-teal-700' });
  } else if (s === 'picked_up') {
    actions.push({ status: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-orange-600 hover:bg-orange-700' });
  } else if (s === 'out_for_delivery') {
    actions.push({ status: 'delivered', label: 'Mark Delivered', color: 'bg-slate-600 hover:bg-slate-700' });
  }

  return actions;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [agents, setAgents] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [menuSavingId, setMenuSavingId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [updatingReservationId, setUpdatingReservationId] = useState(null);
  const [assigningAgentOrderId, setAssigningAgentOrderId] = useState(null);
  const [newAgentForm, setNewAgentForm] = useState({ name: '', phone: '', email: '', vehicle_type: 'bike' });
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [assignDeliveryOrderId, setAssignDeliveryOrderId] = useState(null);
  const [assigningDelivery, setAssigningDelivery] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_partner: 'porter',
    tracking_id: '',
    driver_name: '',
    driver_phone: '',
  });
  const [promoForm, setPromoForm] = useState({
    title: '',
    content: '',
    offer_code: ''
  });
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalReservations: 0,
    popularItems: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is admin
    let user = {};
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { /* ignore */ }
    if (user.role !== 'admin') {
      toast.error('Admin access required');
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        ordersData,
        reservationsData,
        messagesData,
        pendingReviewsData,
        menuItemsData,
        agentsData,
        availableAgentsData
      ] = await Promise.all([
        ordersApi.getOrders(),
        reservationsApi.getReservations(),
        contactApi.getMessages(),
        reviewsApi.getPendingReviews(),
        menuApi.getItems(),
        deliveryAgentsApi.listAgents().catch(() => []),
        deliveryAgentsApi.listAvailableAgents().catch(() => [])
      ]);

      setOrders(ordersData);
      setReservations(reservationsData);
      setMessages(messagesData.map(m => ({ ...m, read: m.is_read })));
      setPendingReviews(pendingReviewsData);
      setMenuItems(menuItemsData);
      setAgents(agentsData);
      setAvailableAgents(availableAgentsData);

      // Calculate analytics
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      setAnalytics({
        totalOrders: ordersData.length,
        totalRevenue: totalRevenue,
        totalReservations: reservationsData.length,
        popularItems: [
          { name: 'Biryani', orders: 45 },
          { name: 'Butter Chicken', orders: 38 },
          { name: 'Kebab', orders: 32 }
        ]
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkMessageRead = (id) => {
    setMessages(messages.map(m => m.id === id ? { ...m, read: true } : m));
    toast.success('Message marked as read');
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await reviewsApi.approveReview(reviewId);
      setPendingReviews(pendingReviews.filter(r => r.id !== reviewId));
      toast.success('Review approved');
    } catch (error) {
      toast.error('Failed to approve review');
    }
  };

  const handleRejectReview = async (reviewId) => {
    try {
      await reviewsApi.rejectReview(reviewId);
      setPendingReviews(pendingReviews.filter(r => r.id !== reviewId));
      toast.success('Review rejected');
    } catch (error) {
      toast.error('Failed to reject review');
    }
  };

  const handleSendReminders = async () => {
    try {
      const result = await reservationsApi.sendReminders();
      toast.success(`Reminders sent: ${result.sent}/${result.total}`);
    } catch (error) {
      toast.error('Failed to send reminders');
    }
  };

  const handleSendPromotions = async () => {
    if (!promoForm.title.trim() || !promoForm.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      const result = await notificationsApi.sendPromotions({
        title: promoForm.title,
        content: promoForm.content,
        offer_code: promoForm.offer_code || undefined
      });
      toast.success(`Promotions sent: ${result.sent}/${result.total}`);
      setPromoForm({ title: '', content: '', offer_code: '' });
    } catch (error) {
      toast.error('Failed to send promotional emails');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);
      await ordersApi.updateOrderStatus(orderId, newStatus);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      toast.success(`Order status updated to ${STATUS_LABELS[newStatus] || newStatus}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleAssignAgent = async (orderId, agentId) => {
    if (!agentId) return;
    try {
      setAssigningAgentOrderId(orderId);
      await ordersApi.assignAgent(orderId, agentId);
      const agent = availableAgents.find(a => a.id === agentId);
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: 'assigned', delivery_agent_id: agentId, delivery_agent_name: agent?.name } : order
      ));
      setAvailableAgents(availableAgents.filter(a => a.id !== agentId));
      toast.success(`Agent ${agent?.name || agentId} assigned`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign agent');
    } finally {
      setAssigningAgentOrderId(null);
    }
  };

  const handleAssignDelivery = async (orderId) => {
    if (!deliveryForm.driver_name.trim() || !deliveryForm.driver_phone.trim()) {
      toast.error('Driver name and phone are required');
      return;
    }
    try {
      setAssigningDelivery(true);
      await ordersApi.assignDelivery(orderId, {
        delivery_partner: deliveryForm.delivery_partner || 'porter',
        tracking_id: deliveryForm.tracking_id.trim() || undefined,
        driver_name: deliveryForm.driver_name.trim(),
        driver_phone: deliveryForm.driver_phone.trim(),
      });
      setOrders(orders.map(order =>
        order.id === orderId
          ? {
              ...order,
              status: 'assigned',
              driver_name: deliveryForm.driver_name.trim(),
              driver_phone: deliveryForm.driver_phone.trim(),
              delivery_partner: deliveryForm.delivery_partner,
            }
          : order
      ));
      setAssignDeliveryOrderId(null);
      setDeliveryForm({ delivery_partner: 'porter', tracking_id: '', driver_name: '', driver_phone: '' });
      toast.success('Delivery assigned via Porter');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign delivery');
    } finally {
      setAssigningDelivery(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgentForm.name || !newAgentForm.phone || !newAgentForm.email) {
      toast.error('Name, phone and email are required');
      return;
    }
    try {
      setCreatingAgent(true);
      const result = await deliveryAgentsApi.createAgent(newAgentForm);
      setAgents([...agents, result.agent]);
      setAvailableAgents([...availableAgents, result.agent]);
      setNewAgentForm({ name: '', phone: '', email: '', vehicle_type: 'bike' });
      toast.success('Delivery agent created');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create agent');
    } finally {
      setCreatingAgent(false);
    }
  };

  const handleToggleAgentAvailability = async (agentId, isAvailable) => {
    try {
      await deliveryAgentsApi.updateAgent(agentId, { is_available: !isAvailable });
      setAgents(agents.map(a => a.id === agentId ? { ...a, is_available: !isAvailable } : a));
      if (!isAvailable) {
        const agent = agents.find(a => a.id === agentId);
        if (agent) setAvailableAgents([...availableAgents, { ...agent, is_available: true }]);
      } else {
        setAvailableAgents(availableAgents.filter(a => a.id !== agentId));
      }
      toast.success('Agent availability updated');
    } catch (error) {
      toast.error('Failed to update agent');
    }
  };

  const handleDeactivateAgent = async (agentId) => {
    if (!window.confirm('Deactivate this delivery agent?')) return;
    try {
      await deliveryAgentsApi.deactivateAgent(agentId);
      setAgents(agents.filter(a => a.id !== agentId));
      setAvailableAgents(availableAgents.filter(a => a.id !== agentId));
      toast.success('Agent deactivated');
    } catch (error) {
      toast.error('Failed to deactivate agent');
    }
  };

  const handleUpdateReservationStatus = async (reservationId, newStatus) => {
    try {
      setUpdatingReservationId(reservationId);
      await reservationsApi.updateReservationStatus(reservationId, newStatus);
      setReservations(reservations.map(res => 
        res.id === reservationId ? { ...res, status: newStatus } : res
      ));
      toast.success(`Reservation status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update reservation status');
    } finally {
      setUpdatingReservationId(null);
    }
  };

  const handleAssignTable = async (reservationId, tableNumber) => {
    try {
      setUpdatingReservationId(reservationId);
      await reservationsApi.updateReservationStatus(reservationId, 'confirmed', tableNumber);
      setReservations(reservations.map(res => 
        res.id === reservationId ? { ...res, table_number: tableNumber, status: 'confirmed' } : res
      ));
      toast.success(`Table ${tableNumber} assigned`);
    } catch (error) {
      toast.error('Failed to assign table');
    } finally {
      setUpdatingReservationId(null);
    }
  };

  const handleMenuChange = (itemId, field, value) => {
    setMenuItems(menuItems.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleSaveMenuItem = async (itemId) => {
    try {
      setMenuSavingId(itemId);
      const item = menuItems.find(i => i.id === itemId);
      await menuApi.updateItem(itemId, {
        name: item.name,
        price: Number(item.price),
        description: item.description,
        is_veg: item.is_veg,
        is_popular: item.is_popular
      });
      toast.success('Menu item updated');
    } catch (error) {
      toast.error('Failed to update menu item');
    } finally {
      setMenuSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-amber-700" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Manage orders, reservations, and restaurant operations</p>
          </div>
          <Button
            onClick={loadDashboardData}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalOrders}</div>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{analytics.totalRevenue}</div>
              <p className="text-xs text-gray-500 mt-1">Total sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalReservations}</div>
              <p className="text-xs text-gray-500 mt-1">Bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.filter(m => !m.read).length}</div>
              <p className="text-xs text-gray-500 mt-1">Unread</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Popular Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.popularItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span>{item.name}</span>
                        <Badge variant="secondary">{item.orders} orders</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Avg Order Value:</span>
                    <span className="font-bold">₹{analytics.totalOrders > 0 ? Math.round(analytics.totalRevenue / analytics.totalOrders) : 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Orders:</span>
                    <span className="font-bold">{orders.filter(o => o.status === 'placed' || o.status === 'pending').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Agents:</span>
                    <span className="font-bold">{agents.filter(a => !a.is_available && a.current_order_id).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confirmed Reservations:</span>
                    <span className="font-bold">{reservations.filter(r => r.status === 'confirmed').length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  All Orders ({orders.length})
                </CardTitle>
                {/* Search */}
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by order ID, customer, address..."
                    className="pl-9"
                  />
                </div>
                {/* Status Filter Pills */}
                <div className="flex gap-2 flex-wrap mt-3">
                  <button
                    onClick={() => setOrderStatusFilter('all')}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${orderStatusFilter === 'all' ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-300 hover:bg-gray-100'}`}
                  >All ({orders.length})</button>
                  {['placed', 'accepted', 'preparing', 'ready', 'ready_for_pickup', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'].map(s => {
                    const count = orders.filter(o => o.status === s || (s === 'placed' && o.status === 'pending') || (s === 'accepted' && o.status === 'confirmed')).length;
                    if (count === 0) return null;
                    return (
                      <button key={s} onClick={() => setOrderStatusFilter(s)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${orderStatusFilter === s ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-300 hover:bg-gray-100'}`}
                      >{STATUS_LABELS[s]} ({count})</button>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders
                    .filter(order => {
                      const matchesFilter = orderStatusFilter === 'all' || order.status === orderStatusFilter || (orderStatusFilter === 'placed' && order.status === 'pending') || (orderStatusFilter === 'accepted' && order.status === 'confirmed');
                      if (!matchesFilter) return false;
                      if (!orderSearch.trim()) return true;
                      const q = orderSearch.toLowerCase();
                      return (
                        (order.id || '').toLowerCase().includes(q) ||
                        (order.user_name || '').toLowerCase().includes(q) ||
                        (order.delivery_address || '').toLowerCase().includes(q) ||
                        (order.driver_name || '').toLowerCase().includes(q) ||
                        (order.delivery_agent_name || '').toLowerCase().includes(q)
                      );
                    })
                    .map(order => {
                      const isDelivery = order.delivery_type && order.delivery_type !== 'pickup';
                      const actions = getNextActions(order);
                      const isExpanded = expandedOrderId === order.id;

                      return (
                        <div key={order.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                          {/* Order Header Row */}
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-bold text-gray-900">#{order.id?.substring(0, 8)}</h3>
                                <Badge className={`text-xs px-2.5 py-0.5 border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}`}>
                                  {STATUS_LABELS[order.status] || order.status}
                                </Badge>
                                <span className="text-xs text-gray-500 capitalize">
                                  {order.order_type === 'dine-in' ? '🍽️ Dine-in' : order.order_type === 'delivery' ? '🚚 Delivery' : '🥡 Takeaway'}
                                </span>
                                {order.table_number && <span className="text-xs text-gray-500">Table {order.table_number}</span>}
                              </div>
                              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                                <span>{new Date(order.created_at).toLocaleString()}</span>
                                {order.user_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{order.user_name}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg text-right">
                                <p className="text-xl font-bold text-gray-900">₹{order.total_amount}</p>
                                <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                              </div>
                              <button
                                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>

                          {/* Delivery Info */}
                          {isDelivery && (
                            <div className="mt-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="font-semibold text-blue-800">
                                  🚚 {order.delivery_partner ? order.delivery_partner.charAt(0).toUpperCase() + order.delivery_partner.slice(1) : order.delivery_type?.replace('_', ' ')}
                                </span>
                                {order.delivery_charge > 0 && <span className="text-blue-600 text-xs">₹{order.delivery_charge}</span>}
                                {order.delivery_address && <span className="text-blue-600 text-xs">📍 {order.delivery_address}</span>}
                              </div>
                              {(order.driver_name || order.delivery_agent_name) && (
                                <div className="mt-1.5 flex items-center gap-3 text-xs text-blue-700">
                                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.driver_name || order.delivery_agent_name}</span>
                                  {order.driver_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {order.driver_phone}</span>}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              {/* Items */}
                              {order.items && order.items.length > 0 && (
                                <div className="p-3 bg-gray-50 rounded-lg border">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Items</h4>
                                  <ul className="space-y-1.5">
                                    {order.items.map((item, idx) => (
                                      <li key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-800">{item.name || `Item #${item.item_id}`} × {item.quantity}</span>
                                        <span className="font-medium">₹{item.price * item.quantity}</span>
                                      </li>
                                    ))}
                                  </ul>
                                  {order.discount_amount > 0 && (
                                    <p className="text-sm text-green-600 mt-2 pt-2 border-t">Discount: -₹{order.discount_amount}</p>
                                  )}
                                </div>
                              )}

                              {/* Payment & Notes */}
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                {order.payment_method && (
                                  <span>💳 {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method.toUpperCase()}</span>
                                )}
                                {order.notes && <span className="italic">📝 {order.notes}</span>}
                              </div>

                              {/* Status History */}
                              {order.status_history && order.status_history.length > 0 && (
                                <div className="p-3 bg-gray-50 rounded-lg border">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Status Timeline</h4>
                                  <div className="space-y-1.5">
                                    {order.status_history.map((entry, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs">
                                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                        <div>
                                          <span className="font-semibold">{STATUS_LABELS[entry.status] || entry.status}</span>
                                          {entry.changed_by && <span className="text-gray-400 ml-1">by {entry.changed_by}</span>}
                                          {entry.note && <span className="text-gray-400 italic ml-1">— {entry.note}</span>}
                                          <span className="text-gray-400 ml-2">{new Date(entry.timestamp).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Agent Assignment (for delivery orders at ready status) */}
                              {order.status === 'ready' && isDelivery && !assignDeliveryOrderId && (
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                  <h4 className="text-sm font-semibold text-indigo-800 mb-2">Assign Delivery Agent (In-house)</h4>
                                  <select
                                    defaultValue=""
                                    onChange={(e) => handleAssignAgent(order.id, e.target.value)}
                                    disabled={assigningAgentOrderId === order.id}
                                    className="text-sm border rounded px-3 py-1.5 bg-white w-full max-w-xs"
                                  >
                                    <option value="" disabled>Select an available agent...</option>
                                    {availableAgents.map(agent => (
                                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.vehicle_type})</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Assign Delivery Form (Porter) */}
                          {assignDeliveryOrderId === order.id && (
                            <div className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                              <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                <Truck className="w-4 h-4" /> Assign Manual Delivery (Porter)
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Delivery Partner</Label>
                                  <select
                                    value={deliveryForm.delivery_partner}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_partner: e.target.value })}
                                    className="mt-1 w-full border rounded px-3 py-2 text-sm bg-white"
                                  >
                                    <option value="porter">Porter</option>
                                    <option value="dunzo">Dunzo</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Tracking ID (optional)</Label>
                                  <Input
                                    value={deliveryForm.tracking_id}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, tracking_id: e.target.value })}
                                    placeholder="e.g. PTR12345"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Driver Name *</Label>
                                  <Input
                                    value={deliveryForm.driver_name}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, driver_name: e.target.value })}
                                    placeholder="Driver's full name"
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Driver Phone *</Label>
                                  <Input
                                    value={deliveryForm.driver_phone}
                                    onChange={(e) => setDeliveryForm({ ...deliveryForm, driver_phone: e.target.value })}
                                    placeholder="Driver's phone number"
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  onClick={() => handleAssignDelivery(order.id)}
                                  disabled={assigningDelivery}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                  size="sm"
                                >
                                  {assigningDelivery ? 'Assigning...' : 'Assign Delivery'}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setAssignDeliveryOrderId(null);
                                    setDeliveryForm({ delivery_partner: 'porter', tracking_id: '', driver_name: '', driver_phone: '' });
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {actions.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t">
                              {actions.map((action) =>
                                action.special ? (
                                  <Button
                                    key={action.status}
                                    onClick={() => setAssignDeliveryOrderId(assignDeliveryOrderId === order.id ? null : order.id)}
                                    disabled={updatingOrderId === order.id}
                                    className={`text-white ${action.color}`}
                                    size="sm"
                                  >
                                    <Truck className="w-3.5 h-3.5 mr-1" />
                                    {action.label}
                                  </Button>
                                ) : (
                                  <Button
                                    key={action.status}
                                    onClick={() => handleUpdateOrderStatus(order.id, action.status)}
                                    disabled={updatingOrderId === order.id}
                                    className={`text-white ${action.color}`}
                                    size="sm"
                                  >
                                    {updatingOrderId === order.id ? '...' : action.label}
                                  </Button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {orders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter).length === 0 && (
                    <p className="text-gray-500 text-center py-8">No orders found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Agents Tab */}
          <TabsContent value="agents">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Add Delivery Agent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={newAgentForm.name} onChange={e => setNewAgentForm({...newAgentForm, name: e.target.value})} placeholder="Agent name" className="mt-1" />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={newAgentForm.phone} onChange={e => setNewAgentForm({...newAgentForm, phone: e.target.value})} placeholder="Phone number" className="mt-1" />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={newAgentForm.email} onChange={e => setNewAgentForm({...newAgentForm, email: e.target.value})} placeholder="Email" type="email" className="mt-1" />
                    </div>
                    <div>
                      <Label>Vehicle</Label>
                      <select value={newAgentForm.vehicle_type} onChange={e => setNewAgentForm({...newAgentForm, vehicle_type: e.target.value})} className="mt-1 w-full border rounded px-3 py-2 text-sm">
                        <option value="bike">Bike</option>
                        <option value="scooter">Scooter</option>
                        <option value="car">Car</option>
                      </select>
                    </div>
                  </div>
                  <Button onClick={handleCreateAgent} disabled={creatingAgent} className="mt-4 bg-amber-600 hover:bg-amber-700">
                    {creatingAgent ? 'Creating...' : 'Add Agent'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Delivery Agents ({agents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {agents.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No delivery agents yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left py-2">Name</th>
                            <th className="text-left py-2">Phone</th>
                            <th className="text-left py-2">Email</th>
                            <th className="text-left py-2">Vehicle</th>
                            <th className="text-left py-2">Status</th>
                            <th className="text-left py-2">Deliveries</th>
                            <th className="text-left py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agents.map(agent => (
                            <tr key={agent.id} className="border-b hover:bg-gray-50">
                              <td className="py-2 font-medium">{agent.name}</td>
                              <td className="py-2">{agent.phone}</td>
                              <td className="py-2 text-xs">{agent.email}</td>
                              <td className="py-2 capitalize">{agent.vehicle_type}</td>
                              <td className="py-2">
                                <Badge variant={agent.is_available ? 'default' : 'secondary'}>
                                  {agent.is_available ? 'Available' : agent.current_order_id ? 'On Delivery' : 'Unavailable'}
                                </Badge>
                              </td>
                              <td className="py-2">{agent.total_deliveries || 0}</td>
                              <td className="py-2 flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleToggleAgentAvailability(agent.id, agent.is_available)}>
                                  {agent.is_available ? 'Set Unavailable' : 'Set Available'}
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeactivateAgent(agent.id)}>
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  All Reservations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2">Guest Name</th>
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Time</th>
                        <th className="text-left py-2">Party Size</th>
                        <th className="text-left py-2">Table</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map(res => (
                        <tr key={res.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">{res.guest_name}</td>
                          <td className="py-2">{res.date}</td>
                          <td className="py-2">{res.time}</td>
                          <td className="py-2">{res.party_size}</td>
                          <td className="py-2">
                            {res.table_number || (
                              <input
                                type="number"
                                placeholder="#"
                                className="w-12 text-xs border rounded px-1 py-1"
                                onBlur={(e) => {
                                  const num = parseInt(e.target.value);
                                  if (num > 0) handleAssignTable(res.id, num);
                                }}
                                disabled={updatingReservationId === res.id}
                              />
                            )}
                          </td>
                          <td className="py-2">
                            <Badge variant="outline">{res.status}</Badge>
                          </td>
                          <td className="py-2">
                            <select
                              value={res.status}
                              onChange={(e) => handleUpdateReservationStatus(res.id, e.target.value)}
                              disabled={updatingReservationId === res.id}
                              className="text-xs border rounded px-2 py-1 bg-white hover:border-gray-400 focus:outline-none focus:border-amber-700"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="seated">Seated</option>
                              <option value="completed">Completed</option>
                              <option value="no-show">No-Show</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Contact Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No messages</p>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{msg.name}</h3>
                            <p className="text-sm text-gray-600">{msg.email}</p>
                          </div>
                          {!msg.read && (
                            <Badge variant="default">Unread</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{msg.message}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkMessageRead(msg.id)}
                        >
                          Mark as Read
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Moderation Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Pending Reviews</CardTitle>
                <CardDescription>Approve or reject customer reviews</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingReviews.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No pending reviews</p>
                ) : (
                  <div className="space-y-4">
                    {pendingReviews.map(review => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-sm">{review.user_name}</p>
                            <p className="text-xs text-gray-500">Item ID: {review.menu_item_id}</p>
                          </div>
                          <Badge variant="outline">{review.rating}★</Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{review.comment}</p>
                        {review.photo_url && (
                          <img
                            src={review.photo_url}
                            alt="Review"
                            className="w-24 h-24 rounded-lg object-cover mb-3"
                          />
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveReview(review.id)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleRejectReview(review.id)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emails Tab */}
          <TabsContent value="emails">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Reservation Reminders
                  </CardTitle>
                  <CardDescription>Send reminders for tomorrow's reservations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleSendReminders} className="bg-amber-600 hover:bg-amber-700">
                    Send Reminders
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Promotional Emails</CardTitle>
                  <CardDescription>Send offers and announcements to all users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="promoTitle">Title</Label>
                    <Input
                      id="promoTitle"
                      value={promoForm.title}
                      onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                      placeholder="E.g. Weekend Special"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="promoContent">Content</Label>
                    <textarea
                      id="promoContent"
                      value={promoForm.content}
                      onChange={(e) => setPromoForm({ ...promoForm, content: e.target.value })}
                      placeholder="Write your promotion message..."
                      className="w-full mt-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      rows="4"
                    />
                  </div>
                  <div>
                    <Label htmlFor="promoCode">Offer Code (optional)</Label>
                    <Input
                      id="promoCode"
                      value={promoForm.offer_code}
                      onChange={(e) => setPromoForm({ ...promoForm, offer_code: e.target.value })}
                      placeholder="E.g. MUGHALS15"
                      className="mt-2"
                    />
                  </div>
                  <Button onClick={handleSendPromotions} className="bg-amber-600 hover:bg-amber-700">
                    Send Promotions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader>
                <CardTitle>Menu Management</CardTitle>
                <CardDescription>Edit menu items and pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {menuItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No menu items found</p>
                  ) : (
                    menuItems.map(item => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={item.name}
                              onChange={(e) => handleMenuChange(item.id, 'name', e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label>Price (₹)</Label>
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleMenuChange(item.id, 'price', e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label>Category</Label>
                            <Input
                              value={item.category_id}
                              onChange={(e) => handleMenuChange(item.id, 'category_id', e.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <Label>Description</Label>
                          <textarea
                            value={item.description}
                            onChange={(e) => handleMenuChange(item.id, 'description', e.target.value)}
                            className="w-full mt-2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            rows="2"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={item.is_veg}
                                onChange={(e) => handleMenuChange(item.id, 'is_veg', e.target.checked)}
                              />
                              Vegetarian
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={item.is_popular}
                                onChange={(e) => handleMenuChange(item.id, 'is_popular', e.target.checked)}
                              />
                              Popular
                            </label>
                          </div>
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => handleSaveMenuItem(item.id)}
                            disabled={menuSavingId === item.id}
                          >
                            {menuSavingId === item.id ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
