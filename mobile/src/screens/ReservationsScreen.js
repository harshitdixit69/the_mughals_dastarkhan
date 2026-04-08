import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { reservationsApi } from '../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReservationsScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: date, 2: slot, 3: details
  const [selectedDate, setSelectedDate] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Generate 7 dates from weekOffset
  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + weekOffset * 7 + i);
      return d;
    });
  }, [weekOffset]);

  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    reservationsApi.getSlots(fmtDate(selectedDate))
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const lunchSlots = slots.filter(s => {
    const h = parseInt(s.time?.split(':')[0] || '0');
    return h < 16;
  });
  const dinnerSlots = slots.filter(s => {
    const h = parseInt(s.time?.split(':')[0] || '0');
    return h >= 16;
  });

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return Alert.alert('Error', 'Name & phone required');
    setSubmitting(true);
    try {
      await reservationsApi.create({
        date: fmtDate(selectedDate),
        time: selectedSlot,
        party_size: partySize,
        customer_name: name.trim(),
        phone: phone.trim(),
        special_requests: note.trim() || undefined,
      });
      Alert.alert('Reserved!', 'Your table has been booked', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to reserve');
    }
    setSubmitting(false);
  };

  const slotColor = (status) => {
    if (status === 'full' || status === 'past') return { bg: COLORS.gray100, text: COLORS.gray400, border: COLORS.gray200 };
    if (status === 'few_left') return { bg: '#fff7ed', text: COLORS.orange, border: '#fed7aa' };
    return { bg: '#f0fdf4', text: COLORS.green, border: '#bbf7d0' };
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Reserve a Table</Text>

      {/* Step 1: Date */}
      <Text style={s.label}>Select Date</Text>
      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0}>
          <Ionicons name="chevron-back" size={22} color={weekOffset === 0 ? COLORS.gray300 : COLORS.gray700} />
        </TouchableOpacity>
        <Text style={s.weekLabel}>
          {MONTHS[dates[0].getMonth()]} {dates[0].getDate()} – {MONTHS[dates[6].getMonth()]} {dates[6].getDate()}
        </Text>
        <TouchableOpacity onPress={() => setWeekOffset(Math.min(3, weekOffset + 1))} disabled={weekOffset >= 3}>
          <Ionicons name="chevron-forward" size={22} color={weekOffset >= 3 ? COLORS.gray300 : COLORS.gray700} />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dateRow}>
        {dates.map((d, i) => {
          const sel = selectedDate && fmtDate(d) === fmtDate(selectedDate);
          const isToday = fmtDate(d) === fmtDate(new Date());
          return (
            <TouchableOpacity key={i} style={[s.dateCard, sel && s.dateCardSel]}
              onPress={() => { setSelectedDate(d); setSelectedSlot(null); setStep(2); }}>
              <Text style={[s.dayName, sel && s.dayNameSel]}>{DAYS[d.getDay()]}</Text>
              <Text style={[s.dayNum, sel && s.dayNumSel]}>{d.getDate()}</Text>
              {isToday && <View style={s.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Step 2: Time Slot */}
      {step >= 2 && selectedDate && (
        <>
          <Text style={s.label}>Select Time</Text>
          {loadingSlots ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} /> : (
            <>
              {lunchSlots.length > 0 && (
                <>
                  <Text style={s.mealLabel}>🌞 Lunch</Text>
                  <View style={s.slotGrid}>
                    {lunchSlots.map(sl => {
                      const c = slotColor(sl.status);
                      const sel = selectedSlot === sl.time;
                      const disabled = sl.status === 'full' || sl.status === 'past';
                      return (
                        <TouchableOpacity key={sl.time} disabled={disabled}
                          style={[s.slotChip, { backgroundColor: sel ? COLORS.primary : c.bg, borderColor: sel ? COLORS.primaryDark : c.border }]}
                          onPress={() => { setSelectedSlot(sl.time); setStep(3); }}>
                          <Text style={[s.slotTime, { color: sel ? COLORS.black : c.text }]}>{sl.time}</Text>
                          {sl.status === 'few_left' && <Text style={s.slotWarn}>Few left</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
              {dinnerSlots.length > 0 && (
                <>
                  <Text style={s.mealLabel}>🌙 Dinner</Text>
                  <View style={s.slotGrid}>
                    {dinnerSlots.map(sl => {
                      const c = slotColor(sl.status);
                      const sel = selectedSlot === sl.time;
                      const disabled = sl.status === 'full' || sl.status === 'past';
                      return (
                        <TouchableOpacity key={sl.time} disabled={disabled}
                          style={[s.slotChip, { backgroundColor: sel ? COLORS.primary : c.bg, borderColor: sel ? COLORS.primaryDark : c.border }]}
                          onPress={() => { setSelectedSlot(sl.time); setStep(3); }}>
                          <Text style={[s.slotTime, { color: sel ? COLORS.black : c.text }]}>{sl.time}</Text>
                          {sl.status === 'few_left' && <Text style={s.slotWarn}>Few left</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
              {slots.length === 0 && <Text style={s.noSlots}>No slots available</Text>}
            </>
          )}
        </>
      )}

      {/* Step 3: Details */}
      {step >= 3 && selectedSlot && (
        <>
          <Text style={s.label}>Party Size</Text>
          <View style={s.partyRow}>
            <TouchableOpacity style={s.partyBtn} onPress={() => setPartySize(Math.max(1, partySize - 1))}>
              <Ionicons name="remove" size={20} color={COLORS.gray700} />
            </TouchableOpacity>
            <Text style={s.partyNum}>{partySize}</Text>
            <TouchableOpacity style={s.partyBtn} onPress={() => setPartySize(Math.min(20, partySize + 1))}>
              <Ionicons name="add" size={20} color={COLORS.gray700} />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Your Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName}
            placeholder="Full name" placeholderTextColor={COLORS.gray400} />

          <Text style={s.label}>Phone</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone}
            placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor={COLORS.gray400} />

          <Text style={s.label}>Special Requests</Text>
          <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} value={note}
            onChangeText={setNote} multiline placeholder="Any preferences..." placeholderTextColor={COLORS.gray400} />

          {/* Summary */}
          <View style={s.summary}>
            <Text style={s.summaryTitle}>Booking Summary</Text>
            <Text style={s.summaryRow}>📅 {selectedDate?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            <Text style={s.summaryRow}>🕐 {selectedSlot}</Text>
            <Text style={s.summaryRow}>👥 {partySize} guest{partySize > 1 ? 's' : ''}</Text>
          </View>

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
            {submitting ? <ActivityIndicator color={COLORS.black} /> :
              <Text style={s.submitText}>Confirm Reservation</Text>}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: SIZES.md, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.gray900, marginBottom: SIZES.md },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.gray800, marginTop: SIZES.lg, marginBottom: SIZES.sm },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  weekLabel: { fontSize: 14, fontWeight: '600', color: COLORS.gray700 },
  dateRow: { marginBottom: SIZES.sm },
  dateCard: {
    width: 56, height: 72, borderRadius: SIZES.radiusSm, backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center', marginRight: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  dateCardSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  dayName: { fontSize: 12, fontWeight: '500', color: COLORS.gray500 },
  dayNameSel: { color: COLORS.black },
  dayNum: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, marginTop: 2 },
  dayNumSel: { color: COLORS.black },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 3 },
  mealLabel: { fontSize: 14, fontWeight: '600', color: COLORS.gray700, marginTop: SIZES.sm, marginBottom: SIZES.xs },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  slotChip: {
    borderRadius: SIZES.radiusSm, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, alignItems: 'center', minWidth: 75,
  },
  slotTime: { fontSize: 14, fontWeight: '600' },
  slotWarn: { fontSize: 10, color: COLORS.orange, marginTop: 1 },
  noSlots: { fontSize: 14, color: COLORS.gray400, textAlign: 'center', marginVertical: 20 },
  partyRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusSm, alignSelf: 'flex-start', borderWidth: 1, borderColor: COLORS.gray200,
  },
  partyBtn: { padding: 12 },
  partyNum: { fontSize: 20, fontWeight: '700', color: COLORS.gray900, width: 48, textAlign: 'center' },
  input: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, paddingHorizontal: SIZES.md,
    height: 46, fontSize: 14, color: COLORS.gray800, borderWidth: 1, borderColor: COLORS.gray200,
  },
  summary: {
    backgroundColor: COLORS.gray900, borderRadius: SIZES.radius, padding: SIZES.md, marginTop: SIZES.lg,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: SIZES.sm },
  summaryRow: { fontSize: 14, color: COLORS.gray300, marginBottom: 4 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm, height: 52,
    justifyContent: 'center', alignItems: 'center', marginTop: SIZES.md,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: COLORS.black },
});
