import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { ordersApi, reservationsApi, contactApi, reviewsApi, notificationsApi, menuApi } from '../services/api';
import { BarChart3, Calendar, MessageSquare, Package, TrendingUp, Check, X, Mail } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuSavingId, setMenuSavingId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [updatingReservationId, setUpdatingReservationId] = useState(null);
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
        menuItemsData
      ] = await Promise.all([
        ordersApi.getOrders(),
        reservationsApi.getReservations(),
        contactApi.getMessages(),
        reviewsApi.getPendingReviews(),
        menuApi.getItems()
      ]);

      setOrders(ordersData);
      setReservations(reservationsData);
      setMessages(messagesData.map(m => ({ ...m, read: m.is_read })));
      setPendingReviews(pendingReviewsData);
      setMenuItems(menuItemsData);

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
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-amber-700" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600">Manage orders, reservations, and restaurant operations</p>
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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
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
                    <span className="font-bold">{orders.filter(o => o.status === 'pending').length}</span>
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
                  All Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2">Order ID</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Amount</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">{order.id?.substring(0, 8)}...</td>
                          <td className="py-2 capitalize">{order.order_type}</td>
                          <td className="py-2">₹{order.total_amount}</td>
                          <td className="py-2">
                            <Badge
                              variant={order.status === 'delivered' ? 'default' : 'secondary'}
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="py-2">{new Date(order.created_at).toLocaleDateString()}</td>
                          <td className="py-2">
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              disabled={updatingOrderId === order.id}
                              className="text-xs border rounded px-2 py-1 bg-white hover:border-gray-400 focus:outline-none focus:border-amber-700"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="delivered">Delivered</option>
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
