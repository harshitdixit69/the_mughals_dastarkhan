import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { COLORS, SIZES } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersApi, deliveryApi, loyaltyApi, authApi, paymentsApi } from '../services/api';

// Restaurant coords (Kaiserbagh, Lucknow)
const REST_LAT = 26.8467;
const REST_LNG = 80.9462;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ORDER_TYPES = [
  { key: 'dine_in', label: 'Dine In', icon: 'restaurant-outline' },
  { key: 'takeaway', label: 'Takeaway', icon: 'bag-handle-outline' },
  { key: 'delivery', label: 'Delivery', icon: 'bicycle-outline' },
];

const PAY_METHODS = [
  { key: 'cod', label: 'Cash on Delivery', icon: 'cash-outline' },
  { key: 'online', label: 'Pay Online', icon: 'card-outline' },
];

const PARTNER_ICONS = {
  pickup: 'storefront-outline',
  self_delivery: 'bicycle-outline',
  dunzo: 'flash-outline',
  porter: 'cube-outline',
  shadowfax: 'rocket-outline',
};
const PARTNER_COLORS = {
  pickup: COLORS.green,
  self_delivery: COLORS.blue,
  dunzo: '#f5a623',
  porter: '#3b82f6',
  shadowfax: '#8b5cf6',
};

export default function CheckoutScreen({ navigation }) {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();

  // Form state
  const [orderType, setOrderType] = useState('delivery');
  const [payMethod, setPayMethod] = useState('cod');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [coupon, setCoupon] = useState('');
  const [loading, setLoading] = useState(false);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const pendingOrderData = useRef(null);

  // Computed values
  const [discount, setDiscount] = useState(0);
  const [discountLabel, setDiscountLabel] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryEstimates, setDeliveryEstimates] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  // Location
  const [userCoords, setUserCoords] = useState(null);
  const [locLoading, setLocLoading] = useState(false);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(-1);

  // Tax = 5% of subtotal
  const tax = Math.round(total * 0.05);
  const grandTotal = Math.max(0, total + deliveryFee + tax - discount);

  // Request location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          const km = haversineDistance(loc.coords.latitude, loc.coords.longitude, REST_LAT, REST_LNG);
          setDistanceKm(parseFloat(km.toFixed(2)));
        }
      } catch { /* permission denied or error, that's fine */ }
    })();
  }, []);

  // Load saved addresses
  useEffect(() => {
    (async () => {
      try {
        const profile = await authApi.getProfile();
        const addrs = profile.addresses || [];
        setSavedAddresses(addrs);
        // Auto-select default
        const defaultIdx = addrs.findIndex(a => a.is_default);
        if (defaultIdx >= 0) {
          setSelectedAddressIdx(defaultIdx);
          const a = addrs[defaultIdx];
          const fullAddr = typeof a === 'string' ? a : [a.address, a.landmark].filter(Boolean).join(', ');
          setAddress(fullAddr);
        }
      } catch { /* silent */ }
    })();
  }, []);

  // Auto-apply DIRECT10 discount
  useEffect(() => {
    if (total <= 0) return;
    (async () => {
      try {
        const res = await loyaltyApi.autoApplyDirect(total);
        if (res.applied) {
          setDiscount(res.discount_amount || 0);
          setDiscountLabel(`Direct Order (${res.code || 'DIRECT10'})`);
          setCoupon(res.code || 'DIRECT10');
        }
      } catch { /* not available, that's fine */ }
    })();
  }, [total]);

  // Fetch delivery estimates when order type is delivery + address exists
  const fetchEstimates = useCallback(async (km) => {
    try {
      const data = await deliveryApi.estimate(km);
      setDeliveryEstimates(data.estimates || []);
      setDistanceKm(data.distance_km || km);
      // Auto-select cheapest non-pickup
      const cheapest = (data.estimates || []).find(e => e.type !== 'pickup');
      if (cheapest) {
        setSelectedPartner(cheapest.partner || cheapest.name);
        setDeliveryFee(cheapest.charge || 0);
      }
    } catch {
      setDeliveryEstimates([]);
      setDeliveryFee(30);
    }
  }, []);

  useEffect(() => {
    if (orderType === 'delivery') {
      const km = distanceKm || 2.0;
      fetchEstimates(km);
    } else {
      setDeliveryFee(0);
      setDeliveryEstimates([]);
      setSelectedPartner(null);
    }
  }, [orderType, distanceKm, fetchEstimates]);

  const handleUseMyLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed to calculate delivery distance.');
        setLocLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserCoords(coords);
      const km = haversineDistance(coords.lat, coords.lng, REST_LAT, REST_LNG);
      setDistanceKm(parseFloat(km.toFixed(2)));

      // Reverse-geocode to fill address
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
        if (place) {
          const parts = [place.name, place.street, place.district, place.city, place.region, place.postalCode].filter(Boolean);
          setAddress(parts.join(', '));
          setSelectedAddressIdx(-1);
        }
      } catch { /* reverse geocode failed, okay */ }
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
    }
    setLocLoading(false);
  };

  const selectAddress = (idx) => {
    setSelectedAddressIdx(idx);
    const a = savedAddresses[idx];
    const fullAddr = typeof a === 'string' ? a : [a.address, a.landmark].filter(Boolean).join(', ');
    setAddress(fullAddr);
  };

  const handleSaveAddress = async () => {
    const trimmed = address.trim();
    if (!trimmed) return Alert.alert('Error', 'Enter an address first');
    // Check if already saved
    const alreadySaved = savedAddresses.some(a => {
      const existing = typeof a === 'string' ? a : (a.address || '');
      return existing.toLowerCase() === trimmed.toLowerCase();
    });
    if (alreadySaved) return Alert.alert('Already Saved', 'This address is already in your saved addresses.');

    try {
      const newAddr = {
        id: Date.now().toString(),
        label: savedAddresses.length === 0 ? 'Home' : `Address ${savedAddresses.length + 1}`,
        address: trimmed,
        landmark: '',
        is_default: savedAddresses.length === 0,
      };
      const updated = [...savedAddresses, newAddr];
      await authApi.updateProfile({ addresses: updated });
      setSavedAddresses(updated);
      setSelectedAddressIdx(updated.length - 1);
      Alert.alert('Saved!', 'Address saved to your profile.');
    } catch {
      Alert.alert('Error', 'Could not save address. Try again.');
    }
  };

  const selectPartner = (est) => {
    const key = est.partner || est.name;
    setSelectedPartner(key);
    setDeliveryFee(est.charge || 0);
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const r = await loyaltyApi.validateCoupon(coupon.trim(), total);
      setDiscount(r.discount_amount || 0);
      setDiscountLabel(coupon.trim());
      Alert.alert('Coupon Applied', `You saved ₹${r.discount_amount}`);
    } catch (e) {
      Alert.alert('Invalid Coupon', e.response?.data?.detail || 'Try another code');
      setDiscount(0);
      setDiscountLabel('');
    }
  };

  const buildOrderData = () => {
    const selEst = deliveryEstimates.find(e => (e.partner || e.name) === selectedPartner);
    return {
      items: items.map(i => ({ item_id: i.item_id, name: i.name, price: i.price, quantity: i.quantity })),
      order_type: orderType,
      payment_method: payMethod,
      delivery_address: orderType === 'delivery' ? address.trim() : undefined,
      delivery_note: deliveryNote.trim() || undefined,
      delivery_type: selEst?.type || undefined,
      delivery_partner: selEst?.partner || undefined,
      delivery_charge: deliveryFee,
      phone: phone.trim(),
      special_instructions: note.trim() || undefined,
      coupon_code: coupon.trim() || undefined,
      discount_amount: discount,
      total_amount: grandTotal,
    };
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return Alert.alert('Error', 'Cart is empty');
    if (orderType === 'delivery' && !address.trim()) return Alert.alert('Error', 'Delivery address required');
    if (!phone.trim() || phone.trim().length < 10) return Alert.alert('Error', 'Valid phone number required');

    // Online payment flow
    if (payMethod === 'online') {
      setLoading(true);
      try {
        const paymentInit = await paymentsApi.createOrder({
          amount: grandTotal,
          currency: 'INR',
          notes: { user_email: user?.email || '', order_type: orderType },
        });

        pendingOrderData.current = buildOrderData();

        const html = `
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0f172a;font-family:sans-serif;color:#fff;}
.loader{text-align:center}.spinner{width:40px;height:40px;border:3px solid #334;border-top-color:#d97706;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px}
@keyframes spin{to{transform:rotate(360deg)}}</style>
<script src="https://checkout.razorpay.com/v1/checkout.js"><\/script></head>
<body><div class="loader"><div class="spinner"></div><p>Opening payment...</p></div>
<script>
var options={
  key:"${paymentInit.key_id}",
  amount:${paymentInit.order.amount},
  currency:"${paymentInit.order.currency}",
  name:"The Mughal's Dastarkhwan",
  description:"Order Payment",
  order_id:"${paymentInit.order.id}",
  prefill:{name:"${(user?.name || 'Customer').replace(/"/g, '')}",email:"${(user?.email || '').replace(/"/g, '')}",contact:"${phone.trim()}"},
  theme:{color:"#D97706"},
  method:{upi:true,card:true,netbanking:true,wallet:true},
  config:{display:{blocks:{upi:{name:"Pay via UPI",instruments:[{method:"upi",flows:["qr","collect","intent"]}]}},sequence:["block.upi"],preferences:{show_default_blocks:true}}},
  handler:function(r){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:"success",razorpay_order_id:r.razorpay_order_id,razorpay_payment_id:r.razorpay_payment_id,razorpay_signature:r.razorpay_signature}));
  },
  modal:{ondismiss:function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:"dismissed"}));}}
};
var rzp=new Razorpay(options);
rzp.on("payment.failed",function(r){window.ReactNativeWebView.postMessage(JSON.stringify({type:"failed",error:r.error.description}));});
rzp.open();
<\/script></body></html>`;

        setPaymentHtml(html);
        setShowPayModal(true);
      } catch (e) {
        Alert.alert('Error', e.response?.data?.detail || 'Failed to initiate payment');
      }
      setLoading(false);
      return;
    }

    // COD flow
    setLoading(true);
    try {
      const order = await ordersApi.create(buildOrderData());
      await clearCart();
      Alert.alert('Order Placed!', `Order #${(order.id || '').slice(0, 8).toUpperCase()} confirmed`, [
        { text: 'View Orders', onPress: () => navigation.navigate('ProfileTab') },
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to place order');
    }
    setLoading(false);
  };

  const handlePaymentMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setShowPayModal(false);

      if (data.type === 'success') {
        setLoading(true);
        try {
          await paymentsApi.verifyPayment({
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
          });

          const order = await ordersApi.create(pendingOrderData.current);
          await clearCart();
          Alert.alert('Payment Successful!', `Order #${(order.id || '').slice(0, 8).toUpperCase()} confirmed`, [
            { text: 'View Orders', onPress: () => navigation.navigate('ProfileTab') },
          ]);
        } catch (e) {
          Alert.alert('Error', e.response?.data?.detail || 'Payment verified but order failed. Contact support.');
        }
        setLoading(false);
      } else if (data.type === 'failed') {
        Alert.alert('Payment Failed', data.error || 'Please try again.');
      }
      // 'dismissed' — user closed, do nothing
    } catch (err) { /* ignore parse errors */ }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Direct Order Discount Banner */}
        {discountLabel.includes('DIRECT10') && discount > 0 && (
          <View style={s.discountBanner}>
            <Text style={s.discountBannerEmoji}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.discountBannerTitle}>Direct Order Discount Applied!</Text>
              <Text style={s.discountBannerSub}>You're saving ₹{discount} by ordering directly from our app!</Text>
            </View>
          </View>
        )}

        {/* Order Type */}
        <Text style={s.label}>Order Type</Text>
        <View style={s.chipRow}>
          {ORDER_TYPES.map(t => (
            <TouchableOpacity key={t.key} style={[s.chip, orderType === t.key && s.chipActive]}
              onPress={() => setOrderType(t.key)}>
              <Ionicons name={t.icon} size={18} color={orderType === t.key ? COLORS.black : COLORS.gray500} />
              <Text style={[s.chipText, orderType === t.key && s.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Delivery Address */}
        {orderType === 'delivery' && (
          <>
            <Text style={s.label}>Delivery Address *</Text>

            {/* Saved addresses */}
            {savedAddresses.length > 0 && (
              <View style={s.savedAddresses}>
                {savedAddresses.map((addr, idx) => {
                  const lbl = typeof addr === 'string' ? 'Address' : (addr.label || 'Address');
                  const addrText = typeof addr === 'string' ? addr : (addr.address || '');
                  const selected = selectedAddressIdx === idx;
                  return (
                    <TouchableOpacity
                      key={addr?.id || idx}
                      style={[s.addressOption, selected && s.addressOptionActive]}
                      onPress={() => selectAddress(idx)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.radioOuter, selected && s.radioOuterActive]}>
                        {selected && <View style={s.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.addressLabel, selected && { color: COLORS.gray900 }]}>{lbl}</Text>
                        <Text style={s.addressSub} numberOfLines={2}>{addrText}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Use My Location button */}
            <TouchableOpacity style={s.locationBtn} onPress={handleUseMyLocation} disabled={locLoading} activeOpacity={0.7}>
              {locLoading ? <ActivityIndicator size="small" color={COLORS.blue} /> : (
                <Ionicons name="navigate-outline" size={18} color={COLORS.blue} />
              )}
              <Text style={s.locationBtnText}>
                {locLoading ? 'Getting location...' : 'Use My Current Location'}
              </Text>
            </TouchableOpacity>

            <TextInput style={s.textArea} placeholder="Or type full address..." value={address}
              onChangeText={setAddress} multiline numberOfLines={2}
              placeholderTextColor={COLORS.gray400} />

            {/* Save Address button */}
            {address.trim().length > 0 && selectedAddressIdx === -1 && (
              <TouchableOpacity style={s.saveAddrBtn} onPress={handleSaveAddress} activeOpacity={0.7}>
                <Ionicons name="bookmark-outline" size={16} color={COLORS.green} />
                <Text style={s.saveAddrBtnText}>Save This Address</Text>
              </TouchableOpacity>
            )}

            {/* Distance */}
            {distanceKm && (
              <Text style={s.distanceText}>
                📍 Approximately {distanceKm.toFixed(1)} km from restaurant
              </Text>
            )}

            {/* Delivery Partners */}
            {deliveryEstimates.length > 0 && (
              <>
                <Text style={s.label}>Choose Delivery Option *</Text>
                {deliveryEstimates.map((est, idx) => {
                  const key = est.partner || est.name;
                  const selected = selectedPartner === key;
                  const icon = PARTNER_ICONS[est.partner] || PARTNER_ICONS[est.type] || 'car-outline';
                  const color = PARTNER_COLORS[est.partner] || COLORS.gray500;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[s.partnerCard, selected && s.partnerCardActive]}
                      onPress={() => selectPartner(est)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.radioOuter, selected && s.radioOuterActive]}>
                        {selected && <View style={s.radioInner} />}
                      </View>
                      <View style={[s.partnerIcon, { backgroundColor: color + '20' }]}>
                        <Ionicons name={icon} size={20} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.partnerName}>{est.name}</Text>
                        {est.eta_breakdown && (
                          <Text style={s.partnerEta}>{est.eta_breakdown}</Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.partnerPrice}>
                          {est.charge === 0 ? 'FREE' : `₹${est.charge}`}
                        </Text>
                        {est.eta_minutes > 0 && (
                          <Text style={s.partnerTime}>~{est.eta_minutes} min</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Delivery Note */}
            <Text style={s.label}>Delivery Note (optional)</Text>
            <TextInput style={s.input} placeholder="e.g. Ring the bell, leave at door..."
              value={deliveryNote} onChangeText={setDeliveryNote}
              placeholderTextColor={COLORS.gray400} />
          </>
        )}

        {/* Phone */}
        <Text style={s.label}>Phone Number *</Text>
        <TextInput style={s.input} placeholder="+91 98765 43210"
          value={phone} onChangeText={setPhone}
          keyboardType="phone-pad" placeholderTextColor={COLORS.gray400} />

        {/* Special Instructions */}
        <Text style={s.label}>Special Instructions</Text>
        <TextInput style={s.textArea} placeholder="Any dietary restrictions or preferences..."
          value={note} onChangeText={setNote}
          multiline numberOfLines={2} placeholderTextColor={COLORS.gray400} />

        {/* Coupon */}
        <Text style={s.label}>Coupon Code</Text>
        <View style={s.couponRow}>
          <TextInput style={s.couponInput} placeholder="Enter code" value={coupon}
            onChangeText={setCoupon} autoCapitalize="characters" placeholderTextColor={COLORS.gray400} />
          <TouchableOpacity style={s.couponBtn} onPress={applyCoupon}>
            <Text style={s.couponBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <Text style={s.label}>Payment</Text>
        <View style={s.chipRow}>
          {PAY_METHODS.map(p => (
            <TouchableOpacity key={p.key} style={[s.chip, payMethod === p.key && s.chipActive]}
              onPress={() => setPayMethod(p.key)}>
              <Ionicons name={p.icon} size={18} color={payMethod === p.key ? COLORS.black : COLORS.gray500} />
              <Text style={[s.chipText, payMethod === p.key && s.chipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        <View style={s.summary}>
          <Text style={s.summaryTitle}>Order Summary</Text>
          {items.map(i => (
            <View key={i.item_id} style={s.summaryRow}>
              <Text style={s.summaryItem}>{i.name} × {i.quantity}</Text>
              <Text style={s.summaryVal}>₹{i.price * i.quantity}</Text>
            </View>
          ))}
          <View style={s.divider} />
          <View style={s.summaryRow}>
            <Text style={s.summaryItem}>Subtotal</Text>
            <Text style={s.summaryVal}>₹{total}</Text>
          </View>
          {deliveryFee > 0 && (
            <View style={s.summaryRow}>
              <Text style={s.summaryItem}>
                🚚 Delivery{selectedPartner ? ` (${selectedPartner})` : ''}
              </Text>
              <Text style={s.summaryVal}>₹{deliveryFee}</Text>
            </View>
          )}
          <View style={s.summaryRow}>
            <Text style={s.summaryItem}>Tax (5%)</Text>
            <Text style={s.summaryVal}>₹{tax}</Text>
          </View>
          {discount > 0 && (
            <View style={s.summaryRow}>
              <Text style={[s.summaryItem, { color: COLORS.green }]}>
                🎉 {discountLabel || 'Discount'}
              </Text>
              <Text style={[s.summaryVal, { color: COLORS.green }]}>-₹{discount}</Text>
            </View>
          )}
          <View style={s.divider} />
          <View style={s.summaryRow}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandVal}>₹{grandTotal}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order */}
      <View style={s.footer}>
        <TouchableOpacity style={s.placeBtn} onPress={handlePlaceOrder} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color={COLORS.black} /> : (
            <>
              <Text style={s.placeText}>
                {payMethod === 'online' ? 'Pay & Place Order' : 'Place Order'} • ₹{grandTotal}
              </Text>
              <Ionicons name={payMethod === 'online' ? 'card' : 'checkmark-circle'} size={22} color={COLORS.black} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Razorpay Payment Modal */}
      <Modal visible={showPayModal} animationType="slide" onRequestClose={() => setShowPayModal(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.gray900 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 54 : 16 }}>
            <TouchableOpacity onPress={() => setShowPayModal(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={{ color: COLORS.white, fontSize: 17, fontWeight: '700', marginLeft: 12 }}>Complete Payment</Text>
          </View>
          {paymentHtml ? (
            <WebView
              source={{ html: paymentHtml }}
              onMessage={handlePaymentMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray900 }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              )}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  scroll: { padding: SIZES.md, paddingBottom: 120 },

  // Discount banner
  discountBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: '#fef9c3', borderRadius: SIZES.radius, padding: SIZES.md,
    borderWidth: 1, borderColor: '#fde047', marginBottom: SIZES.sm,
  },
  discountBannerEmoji: { fontSize: 28 },
  discountBannerTitle: { fontSize: 14, fontWeight: '700', color: '#854d0e' },
  discountBannerSub: { fontSize: 12, color: '#a16207', marginTop: 2 },

  label: { fontSize: 15, fontWeight: '600', color: COLORS.gray800, marginTop: SIZES.md, marginBottom: SIZES.sm },
  chipRow: { flexDirection: 'row', gap: SIZES.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1,
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, paddingVertical: 12,
    justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.gray200,
  },
  chipActive: { borderColor: COLORS.primaryDark, backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: COLORS.gray500 },
  chipTextActive: { color: COLORS.black, fontWeight: '700' },

  // Saved addresses
  savedAddresses: { marginBottom: SIZES.sm },
  addressOption: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, padding: SIZES.sm,
    marginBottom: 6, borderWidth: 1.5, borderColor: COLORS.gray200,
  },
  addressOptionActive: { borderColor: COLORS.primaryDark, backgroundColor: '#fffef0' },
  addressLabel: { fontSize: 14, fontWeight: '700', color: COLORS.gray600 },
  addressSub: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },

  // Radio button
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.gray300,
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterActive: { borderColor: COLORS.primaryDark },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primaryDark },

  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: SIZES.radiusSm, padding: SIZES.sm,
    marginBottom: SIZES.sm, borderWidth: 1, borderColor: '#bfdbfe',
  },
  locationBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.blue },
  saveAddrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 4, marginTop: 4,
  },
  saveAddrBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.green },
  distanceText: { fontSize: 12, color: COLORS.orange, marginTop: 4, fontWeight: '500' },

  // Delivery partners
  partnerCard: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, padding: SIZES.sm,
    marginBottom: 6, borderWidth: 1.5, borderColor: COLORS.gray200,
  },
  partnerCardActive: { borderColor: COLORS.primaryDark, backgroundColor: '#fffef0' },
  partnerIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  partnerName: { fontSize: 14, fontWeight: '700', color: COLORS.gray900 },
  partnerEta: { fontSize: 11, color: COLORS.gray400, marginTop: 1 },
  partnerPrice: { fontSize: 15, fontWeight: '800', color: COLORS.gray900 },
  partnerTime: { fontSize: 11, color: COLORS.gray400, marginTop: 1 },

  input: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, paddingHorizontal: SIZES.md,
    height: 44, fontSize: 14, color: COLORS.gray800, borderWidth: 1, borderColor: COLORS.gray200,
  },
  textArea: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, padding: SIZES.md,
    fontSize: 14, color: COLORS.gray800, borderWidth: 1, borderColor: COLORS.gray200,
    textAlignVertical: 'top', minHeight: 60,
  },
  couponRow: { flexDirection: 'row', gap: SIZES.sm },
  couponInput: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, paddingHorizontal: SIZES.md,
    height: 44, fontSize: 14, color: COLORS.gray800, borderWidth: 1, borderColor: COLORS.gray200,
  },
  couponBtn: { backgroundColor: COLORS.gray900, borderRadius: SIZES.radiusSm, paddingHorizontal: 20, justifyContent: 'center' },
  couponBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  summary: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    marginTop: SIZES.lg, borderWidth: 1, borderColor: COLORS.gray200,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryItem: { fontSize: 14, color: COLORS.gray600, flex: 1 },
  summaryVal: { fontSize: 14, fontWeight: '600', color: COLORS.gray800 },
  divider: { height: 1, backgroundColor: COLORS.gray200, marginVertical: SIZES.sm },
  grandLabel: { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
  grandVal: { fontSize: 18, fontWeight: '800', color: COLORS.gray900 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.gray200,
    padding: SIZES.md, paddingBottom: SIZES.lg,
  },
  placeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm, height: 52,
  },
  placeText: { fontSize: 16, fontWeight: '700', color: COLORS.black },
});
