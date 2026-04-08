import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ordersApi, authApi } from '../services/api';
import { useCart } from '../context/CartContext';

const STATUS_CONFIG = {
  placed: { color: '#eab308', bg: '#fef9c3', label: 'Placed', icon: 'receipt-outline' },
  pending: { color: '#eab308', bg: '#fef9c3', label: 'Pending', icon: 'receipt-outline' },
  accepted: { color: '#3b82f6', bg: '#dbeafe', label: 'Accepted', icon: 'checkmark-circle-outline' },
  confirmed: { color: '#3b82f6', bg: '#dbeafe', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  preparing: { color: '#a855f7', bg: '#f3e8ff', label: 'Preparing', icon: 'flame-outline' },
  ready: { color: '#22c55e', bg: '#dcfce7', label: 'Ready', icon: 'checkmark-done-outline' },
  ready_for_pickup: { color: '#22c55e', bg: '#dcfce7', label: 'Ready', icon: 'bag-check-outline' },
  picked_up: { color: '#06b6d4', bg: '#cffafe', label: 'Picked Up', icon: 'bicycle-outline' },
  out_for_delivery: { color: '#f97316', bg: '#ffedd5', label: 'On the Way', icon: 'navigate-outline' },
  delivered: { color: '#16a34a', bg: '#bbf7d0', label: 'Delivered', icon: 'checkmark-circle' },
  completed: { color: '#16a34a', bg: '#bbf7d0', label: 'Completed', icon: 'checkmark-circle' },
  cancelled: { color: '#ef4444', bg: '#fee2e2', label: 'Cancelled', icon: 'close-circle-outline' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['placed', 'pending', 'accepted', 'confirmed', 'preparing', 'ready', 'ready_for_pickup', 'picked_up', 'out_for_delivery'];
const COMPLETED_STATUSES = ['delivered', 'completed'];
const CANCELLED_STATUSES = ['cancelled'];

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshProfile } = useAuth();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [favorites, setFavorites] = useState(user?.favorites || []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: '', address: '', landmark: '' });
  const [addresses, setAddresses] = useState(user?.addresses || []);

  const filterOrders = useCallback((ordersList, filter) => {
    if (filter === 'all') return ordersList;
    if (filter === 'active') return ordersList.filter(o => ACTIVE_STATUSES.includes(o.status));
    if (filter === 'completed') return ordersList.filter(o => COMPLETED_STATUSES.includes(o.status));
    if (filter === 'cancelled') return ordersList.filter(o => CANCELLED_STATUSES.includes(o.status));
    return ordersList;
  }, []);

  const load = useCallback(async () => {
    try {
      const [data, profile] = await Promise.all([ordersApi.getOrders(), authApi.getProfile()]);
      const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(sorted);
      setFilteredOrders(filterOrders(sorted, activeFilter));
      setFavorites(profile.favorites || []);
      setAddresses(profile.addresses || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [activeFilter, filterOrders]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setFilteredOrders(filterOrders(orders, activeFilter));
  }, [activeFilter, orders, filterOrders]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleReorder = async (order) => {
    try {
      for (const item of (order.items || [])) {
        await addToCart(item.menu_item_id || item.id, item.quantity || 1);
      }
      Alert.alert('Added!', 'Items added to cart', [
        { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
        { text: 'OK' },
      ]);
    } catch {
      Alert.alert('Error', 'Could not reorder some items');
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.address.trim()) {
      Alert.alert('Error', 'Please enter an address');
      return;
    }
    try {
      const addrObj = {
        id: Date.now().toString(),
        label: newAddress.label.trim() || 'Home',
        address: newAddress.address.trim(),
        landmark: newAddress.landmark.trim() || '',
        is_default: addresses.length === 0,
      };
      const updatedAddresses = [...addresses, addrObj];
      await authApi.updateProfile({ addresses: updatedAddresses });
      setAddresses(updatedAddresses);
      setNewAddress({ label: '', address: '', landmark: '' });
      setShowAddressModal(false);
    } catch {
      Alert.alert('Error', 'Failed to save address');
    }
  };

  const handleRemoveAddress = (index) => {
    Alert.alert('Remove Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const updated = addresses.filter((_, i) => i !== index);
          try {
            await authApi.updateProfile({ addresses: updated });
            setAddresses(updated);
          } catch { /* silent */ }
        },
      },
    ]);
  };

  const renderOrder = ({ item: order }) => {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
    const shortId = (order.id || '').slice(0, 8).toUpperCase();
    const date = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const itemCount = order.items?.length || 0;

    return (
      <TouchableOpacity style={s.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { order })} activeOpacity={0.7}>
        <View style={s.orderTop}>
          <View>
            <Text style={s.orderId}>#{shortId}</Text>
            <Text style={s.orderDate}>{date}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
            <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={s.orderMid}>
          <Text style={s.orderItems}>{itemCount} item{itemCount > 1 ? 's' : ''}</Text>
          <Text style={s.orderType}>{(order.order_type || '').replace('_', ' ')}</Text>
        </View>
        <View style={s.orderBot}>
          <Text style={s.orderTotal}>₹{order.total_amount}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {(order.status === 'delivered' || order.status === 'completed') && (
              <TouchableOpacity style={s.reorderBtn} onPress={() => handleReorder(order)}>
                <Ionicons name="refresh" size={14} color={COLORS.green} />
                <Text style={s.reorderText}>Reorder</Text>
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <FlatList
        data={filteredOrders}
        keyExtractor={i => i.id || i._id}
        renderItem={renderOrder}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            {/* Profile Card */}
            <View style={s.profileCard}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(user?.name || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={s.profileInfo}>
                <Text style={s.profileName}>{user?.name}</Text>
                <Text style={s.profileEmail}>{user?.email}</Text>
                {user?.phone && <Text style={s.profilePhone}>{user.phone}</Text>}
              </View>
              <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
                <Ionicons name="log-out-outline" size={22} color={COLORS.red} />
              </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            {user?.role === 'admin' && (
              <TouchableOpacity style={s.adminBtn} onPress={() => navigation.navigate('AdminDashboard')}
                activeOpacity={0.7}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
                <Text style={s.adminBtnText}>Admin Dashboard</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.white} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}
            <View style={s.actions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Reservations')}>
                <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
                <Text style={s.actionText}>Reservations</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Loyalty')}>
                <Ionicons name="gift-outline" size={22} color={COLORS.primary} />
                <Text style={s.actionText}>Loyalty</Text>
              </TouchableOpacity>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Favorites')}>
                <Ionicons name="heart-outline" size={22} color={COLORS.primary} />
                <Text style={s.actionText}>Favorites</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Reviews')}>
                <Ionicons name="star-outline" size={22} color={COLORS.primary} />
                <Text style={s.actionText}>Reviews</Text>
              </TouchableOpacity>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Chat')}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.primary} />
                <Text style={s.actionText}>AI Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('About')}>
                <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
                <Text style={s.actionText}>About Us</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => navigation.navigate('Contact')}>
                <Ionicons name="mail-outline" size={22} color={COLORS.primary} />
                <Text style={s.actionText}>Contact</Text>
              </TouchableOpacity>
            </View>

            {/* Saved Addresses */}
            <View style={s.addressSection}>
              <View style={s.addressHeader}>
                <Text style={s.sectionTitle}>Saved Addresses</Text>
                <TouchableOpacity onPress={() => setShowAddressModal(true)}>
                  <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              {addresses.length === 0 ? (
                <Text style={s.noAddress}>No saved addresses</Text>
              ) : (
                addresses.map((addr, i) => {
                  const label = typeof addr === 'string' ? '' : (addr.label || '');
                  const addrText = typeof addr === 'string' ? addr : (addr.address || '');
                  const landmark = typeof addr === 'string' ? '' : (addr.landmark || '');
                  return (
                    <View key={addr?.id || i} style={s.addressCard}>
                      <Ionicons name="location-outline" size={18} color={COLORS.gray500} />
                      <View style={{ flex: 1 }}>
                        {label ? <Text style={s.addressLabel}>{label}{addr?.is_default ? ' (Default)' : ''}</Text> : null}
                        <Text style={s.addressText}>{addrText}</Text>
                        {landmark ? <Text style={s.addressLandmark}>{landmark}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveAddress(i)}>
                        <Ionicons name="close-circle-outline" size={18} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>

            {/* Order Filters */}
            <View style={s.filterContainer}>
              {FILTER_TABS.map(tab => {
                const isActive = activeFilter === tab.key;
                const count = tab.key === 'all' ? orders.length :
                  tab.key === 'active' ? orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length :
                  tab.key === 'completed' ? orders.filter(o => COMPLETED_STATUSES.includes(o.status)).length :
                  orders.filter(o => CANCELLED_STATUSES.includes(o.status)).length;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[s.filterTab, isActive && s.filterTabActive]}
                    onPress={() => setActiveFilter(tab.key)}
                  >
                    <Text style={[s.filterTabText, isActive && s.filterTabTextActive]}>{tab.label}</Text>
                    {count > 0 && (
                      <View style={[s.filterBadge, isActive && s.filterBadgeActive]}>
                        <Text style={[s.filterBadgeText, isActive && s.filterBadgeTextActive]}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.sectionTitle}>My Orders</Text>
          </>
        }
        ListEmptyComponent={
          loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /> : (
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.gray300} />
              <Text style={s.emptyText}>No orders yet</Text>
            </View>
          )
        }
      />

      {/* Address Modal */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Address</Text>
            <Text style={s.modalLabel}>Label</Text>
            <TextInput
              style={s.modalInputSingle}
              placeholder="e.g. Home, Office, Other"
              placeholderTextColor={COLORS.gray400}
              value={newAddress.label}
              onChangeText={v => setNewAddress(p => ({ ...p, label: v }))}
            />
            <Text style={s.modalLabel}>Address *</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Enter full address..."
              placeholderTextColor={COLORS.gray400}
              value={newAddress.address}
              onChangeText={v => setNewAddress(p => ({ ...p, address: v }))}
              multiline
            />
            <Text style={s.modalLabel}>Landmark</Text>
            <TextInput
              style={s.modalInputSingle}
              placeholder="Nearby landmark (optional)"
              placeholderTextColor={COLORS.gray400}
              value={newAddress.landmark}
              onChangeText={v => setNewAddress(p => ({ ...p, landmark: v }))}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowAddressModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={handleAddAddress}>
                <Text style={s.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  filterTabTextActive: {
    color: COLORS.black,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray600,
  },
  filterBadgeTextActive: {
    color: COLORS.black,
  },
  list: { padding: SIZES.md, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray900,
    borderRadius: SIZES.radius, padding: SIZES.md, marginBottom: SIZES.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: COLORS.black },
  profileInfo: { flex: 1, marginLeft: SIZES.md },
  profileName: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  profileEmail: { fontSize: 13, color: COLORS.gray400, marginTop: 2 },
  profilePhone: { fontSize: 13, color: COLORS.gray400 },
  logoutBtn: { padding: SIZES.sm },
  adminBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.gray900, borderRadius: SIZES.radiusSm, padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  adminBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  actions: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  actionText: { fontSize: 14, fontWeight: '600', color: COLORS.gray800 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.sm },
  orderCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.gray100,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 15, fontWeight: '700', color: COLORS.gray900 },
  orderDate: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: SIZES.radiusFull, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderMid: { flexDirection: 'row', gap: 12, marginTop: SIZES.sm },
  orderItems: { fontSize: 13, color: COLORS.gray600 },
  orderType: { fontSize: 13, color: COLORS.gray500, textTransform: 'capitalize' },
  orderBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SIZES.sm, paddingTop: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  orderTotal: { fontSize: 17, fontWeight: '800', color: COLORS.gray900 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: COLORS.gray400, marginTop: SIZES.sm },
  reorderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7',
    borderRadius: SIZES.radiusFull, paddingHorizontal: 10, paddingVertical: 4,
  },
  reorderText: { fontSize: 12, fontWeight: '600', color: COLORS.green },
  addressSection: { marginBottom: SIZES.lg, marginTop: SIZES.sm },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  noAddress: { fontSize: 13, color: COLORS.gray400 },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusSm, padding: SIZES.sm, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.gray100,
  },
  addressLabel: { fontSize: 13, fontWeight: '700', color: COLORS.gray900 },
  addressText: { fontSize: 13, color: COLORS.gray700, marginTop: 1 },
  addressLandmark: { fontSize: 11, color: COLORS.gray400, marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SIZES.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.md },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray800, marginTop: SIZES.sm, marginBottom: 4 },
  modalInputSingle: {
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: SIZES.radiusSm,
    paddingHorizontal: SIZES.sm, paddingVertical: 10, fontSize: 14, color: COLORS.gray800,
  },
  modalInput: {
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: SIZES.radiusSm,
    padding: SIZES.sm, fontSize: 14, color: COLORS.gray800, minHeight: 80, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.md },
  modalCancel: { flex: 1, borderRadius: SIZES.radiusSm, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray200 },
  modalCancelText: { fontSize: 14, fontWeight: '500', color: COLORS.gray600 },
  modalSave: { flex: 1, backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm, paddingVertical: 12, alignItems: 'center' },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: COLORS.black },
});
