import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { deliveryAgentsApi } from '../services/api';
import { Truck, CheckCircle, XCircle, Package, MapPin, RefreshCw, Clock } from 'lucide-react';

const STATUS_LABELS = {
  placed: 'Placed', accepted: 'Accepted', preparing: 'Preparing',
  ready: 'Ready', assigned: 'Assigned', accepted_by_agent: 'Accepted by You',
  picked_up: 'Picked Up', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled',
};

const STATUS_COLORS = {
  assigned: 'bg-indigo-100 text-indigo-800',
  accepted_by_agent: 'bg-cyan-100 text-cyan-800',
  picked_up: 'bg-teal-100 text-teal-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const pollRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await deliveryAgentsApi.getMyOrders();
      setAgent(data.agent);
      setOrders(data.orders);
      setLastRefresh(new Date());
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Delivery agent access required');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Check role
    let user = {};
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { /* ignore */ }
    if (user.role !== 'delivery_agent') {
      toast.error('Delivery agent access required');
      navigate('/');
      return;
    }
    fetchData();
  }, [navigate, fetchData]);

  // Poll every 10 seconds
  useEffect(() => {
    pollRef.current = setInterval(fetchData, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchData]);

  const handleAcceptOrder = async (orderId) => {
    try {
      setActionLoading(orderId);
      await deliveryAgentsApi.acceptOrder(orderId);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'accepted_by_agent' } : o));
      toast.success('Order accepted!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectOrder = async (orderId) => {
    if (!window.confirm('Reject this delivery? It will be unassigned from you.')) return;
    try {
      setActionLoading(orderId);
      await deliveryAgentsApi.rejectOrder(orderId);
      setOrders(orders.filter(o => o.id !== orderId));
      toast.success('Order rejected, returned to restaurant');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reject order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setActionLoading(orderId);
      await deliveryAgentsApi.updateDeliveryStatus(orderId, newStatus);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'delivered');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-8 h-8 text-indigo-600" />
              Delivery Dashboard
            </h1>
            {agent && (
              <p className="text-gray-600 mt-1">
                Welcome, {agent.name} &middot; {agent.vehicle_type}
                {agent.total_deliveries > 0 && ` &middot; ${agent.total_deliveries} deliveries`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && (
              <span className="text-xs text-gray-500 hidden sm:block">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Active Orders */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Active Orders ({activeOrders.length})
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </h2>

        {activeOrders.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No active deliveries</p>
              <p className="text-gray-400 text-sm mt-1">New orders will appear here when assigned to you</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 mb-8">
            {activeOrders.map(order => (
              <Card key={order.id} className="border-l-4 border-l-indigo-500">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h3>
                        <Badge className={STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                      {order.delivery_address && (
                        <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {order.delivery_address}
                        </p>
                      )}
                      {order.delivery_note && (
                        <p className="text-sm text-gray-500 italic mt-1">Note: {order.delivery_note}</p>
                      )}
                      {order.phone && (
                        <p className="text-sm text-gray-600 mt-1">📱 Customer: {order.phone}</p>
                      )}
                    </div>
                    <div className="bg-indigo-50 px-5 py-3 rounded-xl text-right">
                      <p className="text-2xl font-bold text-gray-900">₹{order.total_amount}</p>
                      <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                    </div>
                  </div>

                  {/* Action Buttons based on current status */}
                  <div className="flex gap-3 mt-4 border-t pt-4">
                    {order.status === 'assigned' && (
                      <>
                        <Button
                          onClick={() => handleAcceptOrder(order.id)}
                          disabled={actionLoading === order.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {actionLoading === order.id ? 'Accepting...' : 'Accept Delivery'}
                        </Button>
                        <Button
                          onClick={() => handleRejectOrder(order.id)}
                          disabled={actionLoading === order.id}
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {order.status === 'accepted_by_agent' && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                        disabled={actionLoading === order.id}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        {actionLoading === order.id ? 'Updating...' : 'Mark Picked Up'}
                      </Button>
                    )}
                    {order.status === 'picked_up' && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, 'out_for_delivery')}
                        disabled={actionLoading === order.id}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        {actionLoading === order.id ? 'Updating...' : 'Out for Delivery'}
                      </Button>
                    )}
                    {order.status === 'out_for_delivery' && (
                      <Button
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        disabled={actionLoading === order.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {actionLoading === order.id ? 'Updating...' : 'Mark Delivered'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Completed Deliveries */}
        {completedOrders.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Completed ({completedOrders.length})
            </h2>
            <div className="space-y-3">
              {completedOrders.slice(0, 10).map(order => (
                <Card key={order.id} className="opacity-75">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-700">Order #{order.id.slice(0, 8)}</span>
                      <span className="text-sm text-gray-500 ml-3">{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">₹{order.total_amount}</span>
                      <Badge className="bg-green-100 text-green-800">Delivered</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
