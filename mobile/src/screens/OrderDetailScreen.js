import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions,
  TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { ordersApi } from '../services/api';
import LiveMap from '../components/LiveMap';
import OrderTracker from '../components/OrderTracker';

// OrderTracker component handles all step definitions internally

export default function OrderDetailScreen({ route, navigation }) {
  const { order } = route.params;
  const [driverPos, setDriverPos] = useState(null);
  const [cancelled, setCancelled] = useState(order.status === 'cancelled');

  const showMap = ['picked_up', 'out_for_delivery'].includes(order.status) && order.delivery_address;

  // Update order status when cancelled
  useEffect(() => {
    if (cancelled) {
      order.status = 'cancelled';
    }
  }, [cancelled]);

  // Poll driver location
  useEffect(() => {
    if (!showMap) return;
    let active = true;
    const poll = async () => {
      try {
        const loc = await ordersApi.getDriverLocation(order.id);
        if (active && loc.lat && loc.lng) setDriverPos({ latitude: loc.lat, longitude: loc.lng });
      } catch { /* silent */ }
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => { active = false; clearInterval(iv); };
  }, [showMap, order.id]);

  const shortId = (order.id || '').slice(0, 8).toUpperCase();
  const canCancel = ['placed', 'pending', 'accepted', 'confirmed'].includes(order.status) && !cancelled;

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This cannot be undone.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order', style: 'destructive', onPress: async () => {
            try {
              await ordersApi.cancel(order.id);
              setCancelled(true);
              order.status = 'cancelled';
              Alert.alert('Cancelled', 'Your order has been cancelled.');
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Could not cancel order');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.orderId}>Order #{shortId}</Text>
        <Text style={s.date}>
          {new Date(order.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>

      {/* Order Tracker */}
      <OrderTracker order={order} />

      {/* Live Map */}
      {showMap && (
        <View style={s.mapContainer}>
          <View style={s.mapHeader}>
            <View style={s.liveDot} />
            <Text style={s.mapTitle}>Live Tracking</Text>
          </View>
          <LiveMap driverPos={driverPos} order={order} style={s.map} />
          {!driverPos && (
            <View style={s.mapOverlay}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={s.mapOverlayText}>Waiting for driver GPS...</Text>
            </View>
          )}
        </View>
      )}

      {/* Order Items */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Items</Text>
        {(order.items || []).map((item, i) => (
          <View key={i} style={s.itemRow}>
            <Text style={s.itemName}>{item.name} × {item.quantity}</Text>
            <Text style={s.itemPrice}>₹{item.price * item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Details */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Details</Text>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Type</Text>
          <Text style={s.detailVal}>{(order.order_type || '').replace('_', ' ')}</Text>
        </View>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Payment</Text>
          <Text style={s.detailVal}>{order.payment_method === 'cod' ? 'Cash' : 'Online'}</Text>
        </View>
        {order.delivery_address && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Address</Text>
            <Text style={[s.detailVal, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>{order.delivery_address}</Text>
          </View>
        )}
        {order.special_instructions && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Note</Text>
            <Text style={[s.detailVal, { flex: 1, textAlign: 'right' }]}>{order.special_instructions}</Text>
          </View>
        )}
        <View style={[s.detailRow, { borderBottomWidth: 0, paddingTop: SIZES.sm }]}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalVal}>₹{order.total_amount}</Text>
        </View>
      </View>

      {/* Cancel Order */}
      {canCancel && (
        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
          <Ionicons name="close-circle-outline" size={18} color={COLORS.red} />
          <Text style={s.cancelText}>Cancel Order</Text>
        </TouchableOpacity>
      )}
      {cancelled && (
        <View style={s.cancelledBanner}>
          <Ionicons name="close-circle" size={18} color={COLORS.red} />
          <Text style={s.cancelledText}>This order has been cancelled</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: SIZES.md, paddingBottom: 40 },
  header: { marginBottom: SIZES.md },
  orderId: { fontSize: 22, fontWeight: '800', color: COLORS.gray900 },
  date: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  timeline: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.gray100,
  },
  stepRow: { flexDirection: 'row', minHeight: 48 },
  stepLeft: { alignItems: 'center', width: 36 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.gray100,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDone: { backgroundColor: COLORS.green },
  stepActive: { backgroundColor: COLORS.amber },
  stepLine: { width: 2, flex: 1, backgroundColor: COLORS.gray200, marginVertical: 2 },
  stepLineDone: { backgroundColor: COLORS.green },
  stepInfo: { flex: 1, marginLeft: SIZES.sm, justifyContent: 'center' },
  stepLabel: { fontSize: 14, fontWeight: '500', color: COLORS.gray400 },
  stepLabelDone: { color: COLORS.gray900, fontWeight: '600' },
  stepSub: { fontSize: 12, color: COLORS.amber, marginTop: 1 },
  mapContainer: {
    borderRadius: SIZES.radius, overflow: 'hidden', marginBottom: SIZES.md,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  mapHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.gray900, paddingHorizontal: SIZES.md, paddingVertical: 10,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  mapTitle: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  map: { height: 250 },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject, top: 40,
    backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  mapOverlayText: { fontSize: 13, color: COLORS.gray600, marginTop: SIZES.sm },
  section: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.gray100,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.sm },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  itemName: { fontSize: 14, color: COLORS.gray700 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: COLORS.gray800 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  detailLabel: { fontSize: 14, color: COLORS.gray500 },
  detailVal: { fontSize: 14, fontWeight: '500', color: COLORS.gray800, textTransform: 'capitalize' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
  totalVal: { fontSize: 18, fontWeight: '800', color: COLORS.gray900 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fee2e2', borderRadius: SIZES.radius, paddingVertical: 14,
    borderWidth: 1, borderColor: '#fecaca', marginBottom: SIZES.md,
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.red },
  cancelledBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fee2e2', borderRadius: SIZES.radius, paddingVertical: 12,
  },
  cancelledText: { fontSize: 14, fontWeight: '600', color: COLORS.red },
});
