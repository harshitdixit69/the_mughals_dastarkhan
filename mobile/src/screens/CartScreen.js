import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useCart } from '../context/CartContext';

export default function CartScreen({ navigation }) {
  const { items, total, count, fetchCart, updateQuantity, removeFromCart, clearCart, loading } = useCart();
  const [busy, setBusy] = useState(null);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const handleQty = async (itemId, delta, currentQty) => {
    const newQty = currentQty + delta;
    setBusy(itemId);
    try {
      if (newQty <= 0) await removeFromCart(itemId);
      else await updateQuantity(itemId, newQty);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    }
    setBusy(null);
  };

  const handleClear = () => {
    Alert.alert('Clear Cart', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={s.card}>
      <View style={s.info}>
        <View style={s.nameRow}>
          {item.is_veg !== undefined && (
            <View style={[s.vegBadge, { borderColor: item.is_veg ? COLORS.green : COLORS.red }]}>
              <View style={[s.vegDot, { backgroundColor: item.is_veg ? COLORS.green : COLORS.red }]} />
            </View>
          )}
          <Text style={s.name} numberOfLines={1}>{item.name}</Text>
        </View>
        <Text style={s.price}>₹{item.price}</Text>
      </View>
      <View style={s.qtyRow}>
        <TouchableOpacity style={s.qtyBtn} onPress={() => handleQty(item.item_id, -1, item.quantity)}>
          <Ionicons name="remove" size={18} color={COLORS.gray700} />
        </TouchableOpacity>
        {busy === item.item_id ? (
          <ActivityIndicator size="small" color={COLORS.gray500} style={{ width: 32 }} />
        ) : (
          <Text style={s.qtyText}>{item.quantity}</Text>
        )}
        <TouchableOpacity style={s.qtyBtn} onPress={() => handleQty(item.item_id, 1, item.quantity)}>
          <Ionicons name="add" size={18} color={COLORS.gray700} />
        </TouchableOpacity>
      </View>
      <Text style={s.subtotal}>₹{item.price * item.quantity}</Text>
    </View>
  );

  if (loading && items.length === 0) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={s.root}>
      {items.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="cart-outline" size={64} color={COLORS.gray300} />
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptyDesc}>Add some delicious items from our menu</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={s.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={i => String(i.item_id)}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            ListHeaderComponent={
              <View style={s.headerRow}>
                <Text style={s.headerTitle}>{count} item{count > 1 ? 's' : ''} in cart</Text>
                <TouchableOpacity onPress={handleClear}>
                  <Text style={s.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            }
          />
          <View style={s.footer}>
            <View>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalAmount}>₹{total}</Text>
            </View>
            <TouchableOpacity style={s.checkoutBtn}
              onPress={() => navigation.navigate('Checkout')} activeOpacity={0.8}>
              <Text style={s.checkoutText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.black} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.xl },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gray800, marginTop: SIZES.md },
  emptyDesc: { fontSize: 14, color: COLORS.gray500, marginTop: SIZES.xs },
  browseBtn: { marginTop: SIZES.lg, backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm, paddingHorizontal: 24, paddingVertical: 12 },
  browseBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.black },
  list: { padding: SIZES.md, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray800 },
  clearText: { fontSize: 13, color: COLORS.red, fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: SIZES.radius, padding: SIZES.md, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.gray100,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vegBadge: { width: 14, height: 14, borderWidth: 1.5, borderRadius: 2, justifyContent: 'center', alignItems: 'center' },
  vegDot: { width: 7, height: 7, borderRadius: 4 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.gray900, flex: 1 },
  price: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray50, borderRadius: SIZES.radiusSm, marginHorizontal: SIZES.sm },
  qtyBtn: { padding: 8 },
  qtyText: { fontSize: 15, fontWeight: '700', color: COLORS.gray900, width: 32, textAlign: 'center' },
  subtotal: { fontSize: 15, fontWeight: '700', color: COLORS.gray900, minWidth: 50, textAlign: 'right' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray200,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SIZES.md, paddingBottom: SIZES.lg,
  },
  totalLabel: { fontSize: 13, color: COLORS.gray500 },
  totalAmount: { fontSize: 22, fontWeight: '800', color: COLORS.gray900 },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm, paddingHorizontal: 24, paddingVertical: 14,
  },
  checkoutText: { fontSize: 16, fontWeight: '700', color: COLORS.black },
});
