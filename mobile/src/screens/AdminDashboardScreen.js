import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { adminApi, authApi } from '../services/api';

// ─── Status helpers ──────────────────────────────────
const STATUS_LABELS = {
  placed: 'Placed', pending: 'Placed', accepted: 'Accepted', confirmed: 'Accepted',
  preparing: 'Preparing', ready: 'Ready', ready_for_pickup: 'Ready for Pickup',
  assigned: 'Assigned', accepted_by_agent: 'Agent Accepted', picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};

const STATUS_COLORS = {
  placed: '#f59e0b', pending: '#f59e0b', accepted: '#3b82f6', confirmed: '#3b82f6',
  preparing: '#8b5cf6', ready: '#22c55e', ready_for_pickup: '#10b981',
  assigned: '#6366f1', accepted_by_agent: '#06b6d4', picked_up: '#14b8a6',
  out_for_delivery: '#f97316', delivered: '#64748b', cancelled: '#ef4444',
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'bar-chart-outline' },
  { key: 'orders', label: 'Orders', icon: 'receipt-outline' },
  { key: 'reservations', label: 'Reservations', icon: 'calendar-outline' },
  { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { key: 'messages', label: 'Messages', icon: 'mail-outline' },
  { key: 'menu', label: 'Menu', icon: 'restaurant-outline' },
  { key: 'agents', label: 'Agents', icon: 'people-outline' },
  { key: 'promos', label: 'Promos', icon: 'megaphone-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
];

const getNextActions = (order) => {
  const s = order.status;
  const isDelivery = order.delivery_type && order.delivery_type !== 'pickup';
  const actions = [];
  if (s === 'placed' || s === 'pending') {
    actions.push({ status: 'accepted', label: 'Accept' });
    actions.push({ status: 'cancelled', label: 'Cancel', danger: true });
  } else if (s === 'accepted' || s === 'confirmed') {
    actions.push({ status: 'preparing', label: 'Preparing' });
    actions.push({ status: 'cancelled', label: 'Cancel', danger: true });
  } else if (s === 'preparing') {
    actions.push({ status: 'ready', label: 'Ready' });
  } else if (s === 'ready') {
    if (isDelivery) actions.push({ status: 'assigned', label: 'Assign Delivery' });
    else actions.push({ status: 'delivered', label: 'Delivered' });
    actions.push({ status: 'cancelled', label: 'Cancel', danger: true });
  } else if (s === 'ready_for_pickup') {
    actions.push({ status: 'delivered', label: 'Delivered' });
  } else if (s === 'assigned' || s === 'accepted_by_agent') {
    actions.push({ status: 'picked_up', label: 'Picked Up' });
    actions.push({ status: 'cancelled', label: 'Cancel', danger: true });
  } else if (s === 'picked_up') {
    actions.push({ status: 'out_for_delivery', label: 'Out for Delivery' });
  } else if (s === 'out_for_delivery') {
    actions.push({ status: 'delivered', label: 'Delivered' });
  }
  return actions;
};

// ─── Overview Tab ─────────────────────────────────────
function OverviewTab({ orders, reservations, messages, reviews }) {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const stats = [
    { label: 'Total Orders', value: orders.length, icon: 'receipt-outline', color: COLORS.blue },
    { label: 'Active Orders', value: activeOrders.length, icon: 'time-outline', color: COLORS.orange },
    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: 'trending-up-outline', color: COLORS.green },
    { label: 'Reservations', value: reservations.length, icon: 'calendar-outline', color: '#8b5cf6' },
    { label: 'Pending Reviews', value: reviews.length, icon: 'star-outline', color: COLORS.amber },
    { label: 'Messages', value: messages.length, icon: 'mail-outline', color: COLORS.red },
  ];

  return (
    <View>
      <View style={st.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={st.statCard}>
            <View style={[st.statIcon, { backgroundColor: s.color + '20' }]}>
              <Ionicons name={s.icon} size={20} color={s.color} />
            </View>
            <Text style={st.statValue}>{s.value}</Text>
            <Text style={st.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent orders */}
      <Text style={st.sectionTitle}>Recent Orders</Text>
      {orders.slice(0, 5).map(o => (
        <View key={o.id} style={st.miniCard}>
          <View style={{ flex: 1 }}>
            <Text style={st.miniTitle}>#{(o.id || '').slice(0, 8).toUpperCase()}</Text>
            <Text style={st.miniSub}>₹{o.total_amount} • {o.items?.length || 0} items</Text>
          </View>
          <View style={[st.badge, { backgroundColor: (STATUS_COLORS[o.status] || '#888') + '20' }]}>
            <Text style={[st.badgeText, { color: STATUS_COLORS[o.status] || '#888' }]}>
              {STATUS_LABELS[o.status] || o.status}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Orders Tab ──────────────────────────────────────
function OrdersTab({ orders, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  const FILTERS = ['all', 'placed', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'];

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (o.id || '').toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const updateStatus = async (orderId, status) => {
    // For 'assigned' status, prompt for driver details first
    if (status === 'assigned') {
      Alert.prompt
        ? Alert.prompt('Driver Name', 'Enter delivery driver name:', (name) => {
            if (!name) return;
            Alert.prompt('Driver Phone', 'Enter driver phone number:', async (phone) => {
              if (!phone) return;
              setUpdating(orderId);
              try {
                await adminApi.assignDelivery(orderId, {
                  driver_name: name.trim(),
                  driver_phone: phone.trim(),
                  delivery_partner: 'self',
                });
                Alert.alert('Success', 'Delivery assigned');
                onRefresh();
              } catch (e) {
                Alert.alert('Error', e.response?.data?.detail || 'Failed to assign delivery');
              }
              setUpdating(null);
            });
          })
        : promptAssignDelivery(orderId);
      return;
    }
    setUpdating(orderId);
    try {
      await adminApi.updateOrderStatus(orderId, status);
      Alert.alert('Success', `Order updated to ${STATUS_LABELS[status] || status}`);
      onRefresh();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to update');
    }
    setUpdating(null);
  };

  const promptAssignDelivery = (orderId) => {
    // Fallback for Android (no Alert.prompt)
    setAssignOrderId(orderId);
    setDriverName('');
    setDriverPhone('');
    setShowDriverModal(true);
  };

  const submitAssignDelivery = async () => {
    if (!driverName.trim() || !driverPhone.trim()) {
      Alert.alert('Error', 'Driver name and phone are required');
      return;
    }
    setUpdating(assignOrderId);
    setShowDriverModal(false);
    try {
      await adminApi.assignDelivery(assignOrderId, {
        driver_name: driverName.trim(),
        driver_phone: driverPhone.trim(),
        delivery_partner: 'self',
      });
      Alert.alert('Success', 'Delivery assigned');
      onRefresh();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to assign delivery');
    }
    setUpdating(null);
  };

  return (
    <View>
      <TextInput style={st.searchInput} placeholder="Search orders..." value={search}
        onChangeText={setSearch} placeholderTextColor={COLORS.gray400} />

      <View style={st.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[st.filterChip, filter === f && st.filterChipActive]}>
            <Text style={[st.filterText, filter === f && st.filterTextActive]}>
              {f === 'all' ? 'All' : (STATUS_LABELS[f] || f)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.map(order => {
        const expanded = expandedId === order.id;
        const actions = getNextActions(order);
        return (
          <TouchableOpacity key={order.id} style={st.orderCard} onPress={() => setExpandedId(expanded ? null : order.id)}
            activeOpacity={0.8}>
            <View style={st.orderHeader}>
              <View style={{ flex: 1 }}>
                <Text style={st.orderTitle}>#{(order.id || '').slice(0, 8).toUpperCase()}</Text>
                <Text style={st.orderSub}>
                  {order.customer_name || 'Customer'} • ₹{order.total_amount} • {order.order_type}
                </Text>
                {order.phone && <Text style={st.orderPhone}>📞 {order.phone}</Text>}
              </View>
              <View style={[st.badge, { backgroundColor: (STATUS_COLORS[order.status] || '#888') + '20' }]}>
                <Text style={[st.badgeText, { color: STATUS_COLORS[order.status] || '#888' }]}>
                  {STATUS_LABELS[order.status] || order.status}
                </Text>
              </View>
            </View>

            {expanded && (
              <View style={st.orderExpanded}>
                {/* Items */}
                <Text style={st.subHead}>Items</Text>
                {(order.items || []).map((item, idx) => (
                  <Text key={idx} style={st.itemLine}>• {item.name} × {item.quantity} — ₹{item.price * item.quantity}</Text>
                ))}

                {order.delivery_address && (
                  <Text style={st.detailLine}>📍 {order.delivery_address}</Text>
                )}
                {order.delivery_note && (
                  <Text style={st.detailLine}>📝 {order.delivery_note}</Text>
                )}
                {order.delivery_partner && (
                  <Text style={st.detailLine}>🚚 {order.delivery_partner} — ₹{order.delivery_charge}</Text>
                )}

                {/* Action buttons */}
                {actions.length > 0 && (
                  <View style={st.actionRow}>
                    {actions.map(a => (
                      <TouchableOpacity key={a.status}
                        style={[st.actionBtn, a.danger && st.actionBtnDanger]}
                        onPress={() => updateStatus(order.id, a.status)}
                        disabled={updating === order.id}>
                        {updating === order.id ? <ActivityIndicator size="small" color={COLORS.white} /> : (
                          <Text style={st.actionBtnText}>{a.label}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
      {filtered.length === 0 && <Text style={st.empty}>No orders found</Text>}

      {/* Driver Assignment Modal */}
      <Modal visible={showDriverModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.gray900, marginBottom: 16 }}>Assign Delivery Driver</Text>
            <TextInput
              style={st.searchInput}
              placeholder="Driver Name"
              value={driverName}
              onChangeText={setDriverName}
              placeholderTextColor={COLORS.gray400}
            />
            <TextInput
              style={st.searchInput}
              placeholder="Driver Phone"
              value={driverPhone}
              onChangeText={setDriverPhone}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.gray400}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={[st.actionBtn, { flex: 1 }]}
                onPress={submitAssignDelivery}>
                <Text style={st.actionBtnText}>Assign</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.actionBtn, st.actionBtnDanger, { flex: 1 }]}
                onPress={() => setShowDriverModal(false)}>
                <Text style={st.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Reservations Tab ─────────────────────────────────
function ReservationsTab({ reservations, onRefresh }) {
  const [updating, setUpdating] = useState(null);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await adminApi.updateReservationStatus(id, status);
      Alert.alert('Success', `Reservation ${status}`);
      onRefresh();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    }
    setUpdating(null);
  };

  return (
    <View>
      {reservations.map(r => (
        <View key={r.id} style={st.card}>
          <View style={st.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>{r.name || 'Guest'}</Text>
              <Text style={st.cardSub}>{r.date} at {r.time} • {r.guests} guests</Text>
              {r.phone && <Text style={st.cardSub}>📞 {r.phone}</Text>}
              {r.special_requests && <Text style={st.cardSub}>📝 {r.special_requests}</Text>}
            </View>
            <View style={[st.badge, { backgroundColor: r.status === 'confirmed' ? '#dcfce7' : r.status === 'cancelled' ? '#fecaca' : '#fef3c7' }]}>
              <Text style={[st.badgeText, { color: r.status === 'confirmed' ? '#166534' : r.status === 'cancelled' ? '#991b1b' : '#92400e' }]}>
                {r.status || 'pending'}
              </Text>
            </View>
          </View>
          {r.status !== 'confirmed' && r.status !== 'cancelled' && (
            <View style={st.actionRow}>
              <TouchableOpacity style={st.actionBtn} onPress={() => updateStatus(r.id, 'confirmed')}
                disabled={updating === r.id}>
                <Text style={st.actionBtnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionBtnDanger} onPress={() => updateStatus(r.id, 'cancelled')}
                disabled={updating === r.id}>
                <Text style={st.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      {reservations.length === 0 && <Text style={st.empty}>No reservations</Text>}
    </View>
  );
}

// ─── Reviews Tab ──────────────────────────────────────
function ReviewsTab({ reviews, onRefresh }) {
  const [processing, setProcessing] = useState(null);

  const handleAction = async (id, action) => {
    setProcessing(id);
    try {
      if (action === 'approve') await adminApi.approveReview(id);
      else await adminApi.rejectReview(id);
      Alert.alert('Done', `Review ${action}d`);
      onRefresh();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    }
    setProcessing(null);
  };

  return (
    <View>
      <Text style={st.tabInfo}>Pending reviews requiring moderation</Text>
      {reviews.map(r => (
        <View key={r.id} style={st.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <Ionicons key={n} name={n <= (r.rating || 0) ? 'star' : 'star-outline'} size={14} color={COLORS.amber} />
            ))}
          </View>
          <Text style={st.cardTitle}>{r.user_name || 'Anonymous'}</Text>
          <Text style={st.cardSub}>{r.comment || 'No comment'}</Text>
          <View style={st.actionRow}>
            <TouchableOpacity style={st.actionBtn} onPress={() => handleAction(r.id, 'approve')}
              disabled={processing === r.id}>
              <Text style={st.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.actionBtnDanger} onPress={() => handleAction(r.id, 'reject')}
              disabled={processing === r.id}>
              <Text style={st.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {reviews.length === 0 && <Text style={st.empty}>No pending reviews</Text>}
    </View>
  );
}

// ─── Messages Tab ─────────────────────────────────────
function MessagesTab({ messages }) {
  return (
    <View>
      {messages.map((m, i) => (
        <View key={m.id || i} style={st.card}>
          <Text style={st.cardTitle}>{m.name || 'Anonymous'}</Text>
          <Text style={st.cardSub}>{m.email}</Text>
          <Text style={[st.cardSub, { color: COLORS.gray700, marginTop: 4 }]}>{m.message}</Text>
          <Text style={[st.cardSub, { fontSize: 11, marginTop: 4 }]}>{m.created_at || ''}</Text>
        </View>
      ))}
      {messages.length === 0 && <Text style={st.empty}>No messages</Text>}
    </View>
  );
}

// ─── Menu Tab ─────────────────────────────────────────
function MenuTab({ menuItems, onRefresh }) {
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const startEdit = (item) => {
    setEditId(item.id);
    setEditData({ price: String(item.price), is_available: item.is_available !== false });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await adminApi.updateMenuItem(editId, {
        price: parseFloat(editData.price),
        is_available: editData.is_available,
      });
      Alert.alert('Saved');
      setEditId(null);
      onRefresh();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    }
    setSaving(false);
  };

  return (
    <View>
      {menuItems.map(item => (
        <View key={item.id} style={st.card}>
          <View style={st.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>{item.name}</Text>
              <Text style={st.cardSub}>₹{item.price} • {item.category_name || item.category_id}</Text>
            </View>
            <View style={[st.badge, { backgroundColor: item.is_available !== false ? '#dcfce7' : '#fecaca' }]}>
              <Text style={[st.badgeText, { color: item.is_available !== false ? '#166534' : '#991b1b' }]}>
                {item.is_available !== false ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>
          {editId === item.id ? (
            <View style={{ marginTop: SIZES.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZES.sm }}>
                <Text style={st.cardSub}>Price: ₹</Text>
                <TextInput style={[st.searchInput, { flex: 1, marginBottom: 0 }]} value={editData.price}
                  onChangeText={t => setEditData(p => ({ ...p, price: t }))} keyboardType="numeric" />
              </View>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}
                onPress={() => setEditData(p => ({ ...p, is_available: !p.is_available }))}>
                <Ionicons name={editData.is_available ? 'checkbox' : 'square-outline'} size={20} color={COLORS.green} />
                <Text style={st.cardSub}>Available</Text>
              </TouchableOpacity>
              <View style={[st.actionRow, { marginTop: 8 }]}>
                <TouchableOpacity style={st.actionBtn} onPress={saveEdit} disabled={saving}>
                  <Text style={st.actionBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.actionBtnDanger, { backgroundColor: COLORS.gray400 }]}
                  onPress={() => setEditId(null)}>
                  <Text style={st.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => startEdit(item)} style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 13, color: COLORS.blue, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {menuItems.length === 0 && <Text style={st.empty}>No menu items</Text>}
    </View>
  );
}

// ─── Agents Tab ───────────────────────────────────────
function AgentsTab({ agents, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', vehicle_type: 'bike' });
  const [creating, setCreating] = useState(false);

  const createAgent = async () => {
    if (!form.name || !form.phone) return Alert.alert('Error', 'Name and phone required');
    setCreating(true);
    try {
      await adminApi.createAgent(form);
      Alert.alert('Success', 'Agent created');
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', vehicle_type: 'bike' });
      onRefresh();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    }
    setCreating(false);
  };

  return (
    <View>
      <TouchableOpacity style={st.addBtn} onPress={() => setShowForm(!showForm)}>
        <Ionicons name={showForm ? 'close' : 'add'} size={20} color={COLORS.white} />
        <Text style={st.addBtnText}>{showForm ? 'Cancel' : 'Add Agent'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={st.card}>
          <TextInput style={st.formInput} placeholder="Agent Name" value={form.name}
            onChangeText={t => setForm(p => ({ ...p, name: t }))} placeholderTextColor={COLORS.gray400} />
          <TextInput style={st.formInput} placeholder="Phone" value={form.phone}
            onChangeText={t => setForm(p => ({ ...p, phone: t }))} keyboardType="phone-pad"
            placeholderTextColor={COLORS.gray400} />
          <TextInput style={st.formInput} placeholder="Email (optional)" value={form.email}
            onChangeText={t => setForm(p => ({ ...p, email: t }))} keyboardType="email-address"
            placeholderTextColor={COLORS.gray400} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {['bike', 'car', 'bicycle'].map(v => (
              <TouchableOpacity key={v} style={[st.filterChip, form.vehicle_type === v && st.filterChipActive]}
                onPress={() => setForm(p => ({ ...p, vehicle_type: v }))}>
                <Text style={[st.filterText, form.vehicle_type === v && st.filterTextActive]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[st.actionBtn, { marginTop: SIZES.sm }]} onPress={createAgent} disabled={creating}>
            <Text style={st.actionBtnText}>{creating ? 'Creating...' : 'Create Agent'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {agents.map(a => (
        <View key={a.id} style={st.card}>
          <View style={st.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>{a.name}</Text>
              <Text style={st.cardSub}>📞 {a.phone} • {a.vehicle_type || 'bike'}</Text>
              {a.email && <Text style={st.cardSub}>{a.email}</Text>}
            </View>
            <View style={[st.badge, { backgroundColor: a.is_active !== false ? '#dcfce7' : '#fecaca' }]}>
              <Text style={[st.badgeText, { color: a.is_active !== false ? '#166534' : '#991b1b' }]}>
                {a.is_active !== false ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      ))}
      {agents.length === 0 && !showForm && <Text style={st.empty}>No delivery agents</Text>}
    </View>
  );
}

// ─── Promos Tab ───────────────────────────────────────
function PromosTab() {
  const [form, setForm] = useState({ title: '', content: '', offer_code: '' });
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!form.title || !form.content) return Alert.alert('Error', 'Title and content required');
    setSending(true);
    try {
      await adminApi.sendPromotion(form);
      Alert.alert('Sent!', 'Promotional email sent to all customers');
      setForm({ title: '', content: '', offer_code: '' });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to send');
    }
    setSending(false);
  };

  return (
    <View>
      <Text style={st.tabInfo}>Send promotional emails to all customers</Text>
      <View style={st.card}>
        <TextInput style={st.formInput} placeholder="Email Subject / Title" value={form.title}
          onChangeText={t => setForm(p => ({ ...p, title: t }))} placeholderTextColor={COLORS.gray400} />
        <TextInput style={[st.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Email content..." value={form.content}
          onChangeText={t => setForm(p => ({ ...p, content: t }))} multiline
          placeholderTextColor={COLORS.gray400} />
        <TextInput style={st.formInput} placeholder="Offer/Coupon Code (optional)" value={form.offer_code}
          onChangeText={t => setForm(p => ({ ...p, offer_code: t }))} autoCapitalize="characters"
          placeholderTextColor={COLORS.gray400} />
        <TouchableOpacity style={[st.actionBtn, { marginTop: SIZES.sm }]} onPress={send} disabled={sending}>
          {sending ? <ActivityIndicator size="small" color={COLORS.white} /> : (
            <Text style={st.actionBtnText}>Send Promotional Email</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Profile Tab ──────────────────────────────────────
function ProfileTab({ user, onLogout, navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [showAddrModal, setShowAddrModal] = useState(false);
  const [addrForm, setAddrForm] = useState({ label: 'Home', address: '', landmark: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const p = await authApi.getProfile();
      setProfile(p);
      setForm({ name: p.name || '', phone: p.phone || '' });
      setAddresses(p.addresses || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!form.name.trim()) return Alert.alert('Error', 'Name is required');
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      setProfile(updated);
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to update');
    }
    setSaving(false);
  };

  const addAddress = async () => {
    if (!addrForm.address.trim()) return Alert.alert('Error', 'Address is required');
    try {
      const newAddr = {
        id: Date.now().toString(),
        label: addrForm.label.trim() || 'Address',
        address: addrForm.address.trim(),
        landmark: addrForm.landmark.trim(),
        is_default: addresses.length === 0,
      };
      const updated = [...addresses, newAddr];
      await authApi.updateProfile({ addresses: updated });
      setAddresses(updated);
      setShowAddrModal(false);
      setAddrForm({ label: 'Home', address: '', landmark: '' });
    } catch {
      Alert.alert('Error', 'Failed to save address');
    }
  };

  const removeAddress = async (idx) => {
    Alert.alert('Remove Address', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const updated = addresses.filter((_, i) => i !== idx);
        try {
          await authApi.updateProfile({ addresses: updated });
          setAddresses(updated);
        } catch { Alert.alert('Error', 'Failed to remove'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />;

  return (
    <View>
      {/* Profile Card */}
      <View style={st.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZES.md }}>
          <View style={st.avatar}>
            <Ionicons name="person" size={32} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.cardTitle}>{profile?.name || 'Admin'}</Text>
            <Text style={st.cardSub}>{profile?.email}</Text>
            {profile?.phone ? <Text style={st.cardSub}>📞 {profile.phone}</Text> : null}
            <View style={[st.badge, { backgroundColor: '#dcfce7', alignSelf: 'flex-start', marginTop: 4 }]}>
              <Text style={[st.badgeText, { color: '#166534' }]}>Admin</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Edit Profile */}
      <View style={st.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm }}>
          <Text style={st.subHead}>Edit Profile</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={{ fontSize: 13, color: COLORS.blue, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        {editing ? (
          <View>
            <Text style={st.fieldLabel}>Name</Text>
            <TextInput style={st.formInput} value={form.name}
              onChangeText={t => setForm(p => ({ ...p, name: t }))} placeholder="Full name"
              placeholderTextColor={COLORS.gray400} />
            <Text style={st.fieldLabel}>Phone</Text>
            <TextInput style={st.formInput} value={form.phone}
              onChangeText={t => setForm(p => ({ ...p, phone: t }))} placeholder="Phone number"
              keyboardType="phone-pad" placeholderTextColor={COLORS.gray400} />
            <View style={st.actionRow}>
              <TouchableOpacity style={st.actionBtn} onPress={saveProfile} disabled={saving}>
                <Text style={st.actionBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtnDanger, { backgroundColor: COLORS.gray400 }]}
                onPress={() => { setEditing(false); setForm({ name: profile?.name || '', phone: profile?.phone || '' }); }}>
                <Text style={st.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={st.fieldRow}>
              <Text style={st.fieldLabel}>Name</Text>
              <Text style={st.fieldValue}>{profile?.name || '—'}</Text>
            </View>
            <View style={st.fieldRow}>
              <Text style={st.fieldLabel}>Email</Text>
              <Text style={st.fieldValue}>{profile?.email || '—'}</Text>
            </View>
            <View style={st.fieldRow}>
              <Text style={st.fieldLabel}>Phone</Text>
              <Text style={st.fieldValue}>{profile?.phone || '—'}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Saved Addresses */}
      <View style={st.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm }}>
          <Text style={st.subHead}>Saved Addresses ({addresses.length})</Text>
          <TouchableOpacity onPress={() => setShowAddrModal(true)}>
            <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        {addresses.length === 0 ? (
          <Text style={st.cardSub}>No saved addresses</Text>
        ) : (
          addresses.map((addr, idx) => {
            const label = typeof addr === 'string' ? '' : (addr.label || '');
            const addrText = typeof addr === 'string' ? addr : (addr.address || '');
            return (
              <View key={addr?.id || idx} style={st.addrItem}>
                <View style={{ flex: 1 }}>
                  {!!label && <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.gray800 }}>{label}</Text>}
                  <Text style={st.cardSub}>{addrText}</Text>
                  {addr.landmark ? <Text style={[st.cardSub, { fontSize: 11 }]}>📍 {addr.landmark}</Text> : null}
                </View>
                {addr.is_default && (
                  <View style={[st.badge, { backgroundColor: '#dbeafe' }]}>
                    <Text style={[st.badgeText, { color: '#1d4ed8' }]}>Default</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => removeAddress(idx)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* Add Address Modal */}
      <Modal visible={showAddrModal} animationType="slide" transparent>
        <View style={st.modalBg}>
          <View style={st.modalContent}>
            <Text style={[st.subHead, { marginBottom: SIZES.sm }]}>Add Address</Text>
            <TextInput style={st.formInput} placeholder="Label (e.g. Home, Office)" value={addrForm.label}
              onChangeText={t => setAddrForm(p => ({ ...p, label: t }))} placeholderTextColor={COLORS.gray400} />
            <TextInput style={[st.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
              placeholder="Full address" value={addrForm.address}
              onChangeText={t => setAddrForm(p => ({ ...p, address: t }))} multiline
              placeholderTextColor={COLORS.gray400} />
            <TextInput style={st.formInput} placeholder="Landmark (optional)" value={addrForm.landmark}
              onChangeText={t => setAddrForm(p => ({ ...p, landmark: t }))} placeholderTextColor={COLORS.gray400} />
            <View style={st.actionRow}>
              <TouchableOpacity style={st.actionBtn} onPress={addAddress}>
                <Text style={st.actionBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.actionBtnDanger, { backgroundColor: COLORS.gray400 }]}
                onPress={() => setShowAddrModal(false)}>
                <Text style={st.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Actions */}
      <View style={st.card}>
        <Text style={[st.subHead, { marginBottom: SIZES.sm }]}>Quick Actions</Text>
        <TouchableOpacity style={st.profileAction} onPress={() => navigation.navigate('Main')}>
          <Ionicons name="storefront-outline" size={20} color={COLORS.blue} />
          <Text style={st.profileActionText}>Switch to Customer View</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity style={[st.profileAction, { borderBottomWidth: 0 }]} onPress={() => {
          Alert.alert('Logout', 'Are you sure you want to log out?', [
            { text: 'Cancel' },
            { text: 'Logout', style: 'destructive', onPress: onLogout },
          ]);
        }}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={[st.profileActionText, { color: COLORS.red }]}>Logout</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────
export default function AdminDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [agents, setAgents] = useState([]);

  // Role guard
  useEffect(() => {
    if (user?.role !== 'admin') {
      Alert.alert('Access Denied', 'Admin privileges required');
      navigation.goBack();
    }
  }, [user, navigation]);

  const loadData = useCallback(async () => {
    try {
      const [ordersRes, reservationsRes, messagesRes, reviewsRes, menuRes, agentsRes] = await Promise.all([
        adminApi.getAllOrders().catch(() => []),
        adminApi.getAllReservations().catch(() => []),
        adminApi.getMessages().catch(() => []),
        adminApi.getPendingReviews().catch(() => []),
        adminApi.getMenuItems().catch(() => []),
        adminApi.listAgents().catch(() => []),
      ]);
      setOrders(ordersRes);
      setReservations(reservationsRes);
      setMessages(messagesRes);
      setPendingReviews(reviewsRes);
      setMenuItems(menuRes);
      setAgents(agentsRes);
    } catch { /* partial failures handled above */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (user?.role !== 'admin') return null;

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab orders={orders} reservations={reservations} messages={messages} reviews={pendingReviews} />;
      case 'orders': return <OrdersTab orders={orders} onRefresh={onRefresh} />;
      case 'reservations': return <ReservationsTab reservations={reservations} onRefresh={onRefresh} />;
      case 'reviews': return <ReviewsTab reviews={pendingReviews} onRefresh={onRefresh} />;
      case 'messages': return <MessagesTab messages={messages} />;
      case 'menu': return <MenuTab menuItems={menuItems} onRefresh={onRefresh} />;
      case 'agents': return <AgentsTab agents={agents} onRefresh={onRefresh} />;
      case 'promos': return <PromosTab />;
      case 'profile': return <ProfileTab user={user} onLogout={logout} navigation={navigation} />;
      default: return null;
    }
  };

  return (
    <View style={st.root}>
      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={st.tabBar} contentContainerStyle={{ paddingHorizontal: SIZES.sm }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[st.tab, activeTab === t.key && st.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Ionicons name={t.icon} size={16} color={activeTab === t.key ? COLORS.black : COLORS.gray400} />
            <Text style={[st.tabLabel, activeTab === t.key && st.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.content}
          nestedScrollEnabled
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
          {renderTab()}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  tabBar: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray200, height: 50, flexGrow: 0 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 12, marginRight: 2,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primaryDark },
  tabLabel: { fontSize: 13, fontWeight: '500', color: COLORS.gray400 },
  tabLabelActive: { color: COLORS.gray900, fontWeight: '700' },
  content: { padding: SIZES.md, paddingBottom: 40 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  statCard: {
    width: '47%', backgroundColor: COLORS.white, borderRadius: SIZES.radius,
    padding: SIZES.md, borderWidth: 1, borderColor: COLORS.gray200,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.gray900 },
  statLabel: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900, marginTop: SIZES.lg, marginBottom: SIZES.sm },

  // Cards
  card: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.gray200,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray900 },
  cardSub: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },

  miniCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, padding: SIZES.sm,
    marginBottom: 6, borderWidth: 1, borderColor: COLORS.gray200,
  },
  miniTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  miniSub: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },

  // Badge
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  // Orders
  orderCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.gray200,
  },
  orderHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  orderTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  orderSub: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  orderPhone: { fontSize: 12, color: COLORS.blue, marginTop: 2 },
  orderExpanded: { marginTop: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.gray200, paddingTop: SIZES.sm },
  subHead: { fontSize: 13, fontWeight: '700', color: COLORS.gray700, marginBottom: 4 },
  itemLine: { fontSize: 13, color: COLORS.gray600, marginLeft: 4, marginBottom: 2 },
  detailLine: { fontSize: 13, color: COLORS.gray600, marginTop: 4 },

  // Actions
  actionRow: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.sm },
  actionBtn: {
    flex: 1, backgroundColor: COLORS.green, borderRadius: SIZES.radiusSm,
    paddingVertical: 10, alignItems: 'center',
  },
  actionBtnDanger: {
    flex: 1, backgroundColor: COLORS.red, borderRadius: SIZES.radiusSm,
    paddingVertical: 10, alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },

  // Search / filters
  searchInput: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, paddingHorizontal: SIZES.md,
    height: 40, fontSize: 14, color: COLORS.gray800, borderWidth: 1, borderColor: COLORS.gray200,
    marginBottom: SIZES.sm,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SIZES.sm },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: COLORS.gray100, borderWidth: 1, borderColor: COLORS.gray200,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  filterText: { fontSize: 12, fontWeight: '500', color: COLORS.gray500 },
  filterTextActive: { color: COLORS.black, fontWeight: '700' },

  // Form
  formInput: {
    backgroundColor: COLORS.gray50, borderRadius: SIZES.radiusSm, paddingHorizontal: SIZES.md,
    height: 42, fontSize: 14, color: COLORS.gray800, borderWidth: 1, borderColor: COLORS.gray200,
    marginBottom: SIZES.sm,
  },

  // Add button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.gray900, borderRadius: SIZES.radiusSm, paddingVertical: 10,
    marginBottom: SIZES.md,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  tabInfo: { fontSize: 13, color: COLORS.gray500, marginBottom: SIZES.md },
  empty: { fontSize: 14, color: COLORS.gray400, textAlign: 'center', marginTop: SIZES.xl },

  // Profile styles
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.gray900,
    justifyContent: 'center', alignItems: 'center',
  },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray500, marginBottom: 4 },
  fieldValue: { fontSize: 14, color: COLORS.gray800 },
  addrItem: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  profileAction: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  profileActionText: { fontSize: 15, fontWeight: '600', color: COLORS.gray800 },
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SIZES.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.lg, width: '100%', maxWidth: 400,
  },
});
