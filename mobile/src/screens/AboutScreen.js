import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { restaurantApi } from '../services/api';

export default function AboutScreen() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await restaurantApi.getInfo();
        setInfo(data);
      } catch { /* use defaults */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const contact = info?.contact || {};
  const hours = contact.hours || {};
  const yearsActive = info?.established ? new Date().getFullYear() - info.established : 38;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Hero */}
      <View style={s.heroCard}>
        <Text style={s.heroTitle}>{info?.name || "The Mughal's Dastarkhan"}</Text>
        <Text style={s.heroSub}>Authentic Mughlai & Awadhi Cuisine</Text>
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statVal}>{yearsActive}+</Text>
            <Text style={s.statLabel}>Years</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>50+</Text>
            <Text style={s.statLabel}>Dishes</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>{info?.rating || 4.5}</Text>
            <Text style={s.statLabel}>Rating</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>{((info?.total_reviews || 2847) / 1000).toFixed(1)}K</Text>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
        </View>
      </View>

      {/* Story */}
      <Text style={s.section}>Our Story</Text>
      <Text style={s.body}>
        Since {info?.established || 1985}, we have been serving Lucknow with authentic Mughlai
        and Awadhi cuisine, preserving the culinary traditions of the Nawabs. Our chefs use
        traditional slow-cooking methods, aromatic spices, and recipes perfected over generations.
      </Text>
      <Text style={s.body}>
        From legendary Galouti Kebabs to aromatic Lucknowi Biryani cooked in the traditional
        dum style, every dish tells a story of royal kitchens and timeless traditions.
      </Text>

      {/* Contact Info */}
      <Text style={s.section}>Contact Information</Text>
      <View style={s.infoCard}>
        <InfoRow icon="location-outline" title="Address" value={contact.address || 'Novelty Cinema Building, Kaiserbagh, Lucknow 226001'} />
        <InfoRow icon="call-outline" title="Phone" value={contact.phone || '+91 522 404 4777'} onPress={() => Linking.openURL(`tel:${contact.phone || '+91 522 404 4777'}`)} />
        <InfoRow icon="mail-outline" title="Email" value={contact.email || 'info@mughalsdastrkhwan.com'} onPress={() => Linking.openURL(`mailto:${contact.email || 'info@mughalsdastrkhwan.com'}`)} />
        <InfoRow icon="time-outline" title="Hours" value={`${hours.weekdays || '12:30 PM - 10:30 PM'}\n${hours.note || ''}`} />
      </View>

      {/* Specialties */}
      <Text style={s.section}>Our Specialties</Text>
      <View style={s.specRow}>
        {[
          { icon: 'document-text-outline', title: 'Rich Heritage', desc: 'Recipes from Nawabi kitchens' },
          { icon: 'flame-outline', title: 'Dum Cooking', desc: 'Slow-cooked perfection' },
          { icon: 'sparkles-outline', title: 'Premium Spices', desc: 'Authentic Awadhi masalas' },
          { icon: 'people-outline', title: 'Family Dining', desc: 'Warm, welcoming ambiance' },
        ].map((s2, i) => (
          <View key={i} style={s.specCard}>
            <View style={s.specIcon}>
              <Ionicons name={s2.icon} size={22} color={COLORS.white} />
            </View>
            <Text style={s.specTitle}>{s2.title}</Text>
            <Text style={s.specDesc}>{s2.desc}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, title, value, onPress }) {
  const Comp = onPress ? TouchableOpacity : View;
  return (
    <Comp style={s2.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s2.iconBox}>
        <Ionicons name={icon} size={20} color={COLORS.black} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s2.title}>{title}</Text>
        <Text style={s2.value}>{value}</Text>
      </View>
    </Comp>
  );
}

const s2 = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm, marginBottom: SIZES.md },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 13, fontWeight: '600', color: COLORS.gray900 },
  value: { fontSize: 13, color: COLORS.gray500, marginTop: 2, lineHeight: 18 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: SIZES.md, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray50 },

  heroCard: {
    backgroundColor: COLORS.gray900, borderRadius: SIZES.radiusLg, padding: SIZES.lg,
    alignItems: 'center', marginBottom: SIZES.lg,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  heroSub: { fontSize: 14, color: COLORS.gray400, marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: SIZES.lg, gap: SIZES.md },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 11, color: COLORS.gray400 },

  section: { fontSize: 18, fontWeight: '700', color: COLORS.gray900, marginTop: SIZES.lg, marginBottom: SIZES.sm },
  body: { fontSize: 14, color: COLORS.gray600, lineHeight: 22, marginBottom: SIZES.sm },

  infoCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.gray100,
  },

  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  specCard: {
    width: '48%', backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    padding: SIZES.md, marginBottom: SIZES.sm,
  },
  specIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.gray900,
    justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.sm,
  },
  specTitle: { fontSize: 14, fontWeight: '700', color: COLORS.black },
  specDesc: { fontSize: 12, color: COLORS.gray700, marginTop: 2 },
});
