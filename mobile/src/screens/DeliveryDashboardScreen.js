import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { deliveryAgentsApi } from '../services/api';
import * as Location from 'expo-location';
import LiveMap from '../components/LiveMap';

const { width } = Dimensions.get('window');

const STATUS_LABELS = {
  placed: 'Placed', pending: 'Placed', accepted: 'Accepted', preparing: 'Preparing',
  ready: 'Ready', assigned: 'Assigned', accepted_by_agent: 'Accepted by You',
  picked_up: 'Picked Up', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled',
};

const STATUS_COLORS = {
  assigned: '#6366f1', accepted_by_agent: '#06b6d4', picked_up: '#14b8a6',
  out_for_delivery: '#f97316', delivered: '#64748b', cancelled: '#ef4444',
  preparing: '#8b5cf6', ready: '#22c55e', accepted: '#3b82f6', placed: '#f59e0b',
};

export default function DeliveryDashboardScreen({ navigation }) {
  const [agent, setAgent] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const pollRef = useRef(null);
  const locationSubscription = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await deliveryAgentsApi.getMyOrders();
      setAgent(data.agent);
      setOrders(data.orders);
    } catch (error) {
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Delivery agent access required');
        navigation.navigate('Main');
      }
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchData();
    // Poll every 10 seconds
    pollRef.current = setInterval(fetchData, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [fetchData]);

  // Share GPS location while there are active delivery orders
  useEffect(() => {
    const deliveryStatuses = ['accepted_by_agent', 'picked_up', 'out_for_delivery'];
    const activeDeliveryOrders = orders.filter(o => deliveryStatuses.includes(o.status));

    const startLocationSharing = async () => {
      if (activeDeliveryOrders.length === 0) {
        if (locationSubscription.current) {
          locationSubscription.current.remove();
          locationSubscription.current = null;
          setSharingLocation(false);
        }
        return;
      }

      if (locationSubscription.current) return; // Already watching

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed for delivery tracking');
        return;
      }

      setSharingLocation(true);

      // Start location updates
      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentLocation({ latitude, longitude });
          // Send location for all active delivery orders
          activeDeliveryOrders.forEach(order => {
            deliveryAgentsApi.updateDriverLocation(order.id, latitude, longitude).catch(() => {});
          });
        }
      );
    };

    startLocationSharing();
  }, [orders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAcceptOrder = async (orderId) => {
    setActionLoading(orderId + '_accept');
    try {
      await deliveryAgentsApi.acceptOrder(orderId);
      await fetchData();
      Alert.alert('Success', 'Order accepted!');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectOrder = async (orderId) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive', onPress: async () => {
            setActionLoading(orderId + '_reject');
            try {
              await deliveryAgentsApi.rejectOrder(orderId);
              await fetchData();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to reject order');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleUpdateStatus = async (orderId, status) => {
    setActionLoading(orderId + '_' + status);
    try {
      await deliveryAgentsApi.updateDeliveryStatus(orderId, status);
      await fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const getNextActions = (order) => {
    const s = order.status;
    const actions = [];
    if (s === 'assigned') {
      actions.push({ status: 'accepted_by_agent', label: 'Accept Delivery', icon: 'checkmark-circle', color: COLORS.green });
      actions.push({ status: 'rejected', label: 'Reject', icon: 'close-circle', color: COLORS.red, isReject: true });
    } else if (s === 'accepted_by_agent') {
      actions.push({ status: 'picked_up', label: 'Mark Picked Up', icon: 'bag-check', color: COLORS.blue });
    } else if (s === 'picked_up') {
      actions.push({ status: 'out_for_delivery', label: 'Out for Delivery', icon: 'bicycle', color: COLORS.orange });
    } else if (s === 'out_for_delivery') {
      actions.push({ status: 'delivered', label: 'Mark Delivered', icon: 'checkmark-done', color: COLORS.greenDark });
    }
    return actions;
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Agent Info Card */}
      <View style={styles.agentCard}>
        <View style={styles.agentHeader}>
          <View style={styles.agentAvatar}>
            <Ionicons name="person" size={32} color={COLORS.gray600} />
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{agent?.name || 'Delivery Agent'}</Text>
            <Text style={styles.agentVehicle}>{agent?.vehicle_type?.toUpperCase() || 'BIKE'} • {agent?.vehicle_number || 'N/A'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: agent?.is_available ? '#22c55e20' : '#ef444420' }]}>
            <Text style={[styles.statusText, { color: agent?.is_available ? '#22c55e' : '#ef4444' }]}>
              {agent?.is_available ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{orders.filter(o => o.status === 'delivered').length}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{orders.filter(o => ['assigned', 'accepted_by_agent', 'picked_up', 'out_for_delivery'].includes(o.status)).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
        </View>
        {sharingLocation && (
          <View style={styles.locationBadge}>
            <Ionicons name="location" size={14} color="#22c55e" />
            <Text style={styles.locationText}>Sharing location</Text>
          </View>
        )}
      </View>

      {/* Active Orders Section */}
      <Text style={styles.sectionTitle}>Active Orders</Text>
      {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="bicycle-outline" size={48} color={COLORS.gray400} />
          <Text style={styles.emptyText}>No active orders</Text>
          <Text style={styles.emptySubtext}>Pull down to refresh</Text>
        </View>
      )}

      {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).map(order => (
        <View key={order.id} style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderId}>Order #{(order.id || '').slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] + '20' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] }]}>
                {STATUS_LABELS[order.status] || order.status}
              </Text>
            </View>
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.gray500} />
              <Text style={styles.detailText} numberOfLines={2}>{order.delivery_address?.address || 'Pickup'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={16} color={COLORS.gray500} />
              <Text style={styles.detailText}>{order.user_phone || order.user_email || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color={COLORS.gray500} />
              <Text style={styles.detailText}>₹{order.total_amount} • {order.items?.length || 0} items</Text>
            </View>
          </View>

          {/* Live Map for active deliveries */}
          {['picked_up', 'out_for_delivery'].includes(order.status) && currentLocation && (
            <View style={styles.mapContainer}>
              <LiveMap driverPos={currentLocation} style={styles.map} />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {getNextActions(order).map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.actionButton,
                  { backgroundColor: action.color },
                  actionLoading === order.id + '_' + action.status && styles.actionButtonDisabled
                ]}
                onPress={() => action.isReject ? handleRejectOrder(order.id) : handleUpdateStatus(order.id, action.status)}
                disabled={!!actionLoading}
              >
                {actionLoading === order.id + '_' + action.status ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name={action.icon} size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>{action.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
            {order.status === 'assigned' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: COLORS.red }]}
                onPress={() => handleRejectOrder(order.id)}
                disabled={!!actionLoading}
              >
                {actionLoading === order.id + '_reject' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      {/* Completed Orders Section */}
      <Text style={styles.sectionTitle}>Completed Today</Text>
      {orders.filter(o => o.status === 'delivered').length === 0 && (
        <Text style={styles.emptySubtext}>No completed deliveries yet</Text>
      )}
      {orders.filter(o => o.status === 'delivered').slice(0, 5).map(order => (
        <View key={order.id} style={[styles.orderCard, styles.completedCard]}>
          <View style={styles.orderHeader}>
            <Text style={[styles.orderId, { color: COLORS.gray500 }]}>
              Order #{(order.id || '').slice(0, 8).toUpperCase()}
            </Text>
            <Text style={styles.completedBadge}>Delivered ✓</Text>
          </View>
          <Text style={styles.orderDate}>{formatDate(order.delivered_at || order.updated_at)}</Text>
          <Text style={styles.detailText}>₹{order.total_amount} • {order.items?.length || 0} items</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  agentCard: {
    backgroundColor: COLORS.gray900,
    margin: SIZES.md,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  agentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  agentVehicle: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: SIZES.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.md,
    backgroundColor: '#22c55e10',
    paddingVertical: 6,
    borderRadius: SIZES.radiusSm,
  },
  locationText: {
    fontSize: 12,
    color: '#22c55e',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray800,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xxl,
    marginHorizontal: SIZES.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray600,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray400,
    marginTop: 4,
    marginHorizontal: SIZES.md,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.md,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  completedCard: {
    opacity: 0.8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray800,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 2,
  },
  orderDetails: {
    marginTop: SIZES.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.gray600,
    marginLeft: 8,
    flex: 1,
  },
  mapContainer: {
    marginTop: SIZES.md,
    borderRadius: SIZES.radiusSm,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 150,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: SIZES.md,
    gap: SIZES.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: SIZES.radiusSm,
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.green,
    backgroundColor: '#22c55e20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm,
  },
});
