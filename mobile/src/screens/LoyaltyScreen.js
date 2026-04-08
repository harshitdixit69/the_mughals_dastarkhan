import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Share, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { loyaltyApi, authApi } from '../services/api';

const TIER_CONFIG = {
  bronze: { emoji: '🥉', color: '#d97706', bg: '#fef3c7' },
  silver: { emoji: '🥈', color: '#64748b', bg: '#f1f5f9' },
  gold:   { emoji: '🥇', color: '#ca8a04', bg: '#fef9c3' },
  platinum: { emoji: '👑', color: '#7c3aed', bg: '#f3e8ff' },
};

export default function LoyaltyScreen() {
  const [status, setStatus] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statusData, couponsData, profile] = await Promise.all([
        loyaltyApi.getStatus(),
        loyaltyApi.getCoupons(),
        authApi.getProfile(),
      ]);
      setStatus(statusData);
      setCoupons(couponsData);
      setReferralCode(profile.referral_code || '');
      setReferralCount(profile.referral_count || 0);
    } catch (e) {
      console.error('Error loading loyalty data:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const copyCode = async (code) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', `${code} copied to clipboard`);
  };

  const shareReferral = async () => {
    try {
      await Share.share({
        message: `🍽️ Join me at The Mughal's Dastarkhan! Use my referral code ${referralCode} when signing up and we both get ₹100 off our next order!`,
      });
    } catch { /* cancelled */ }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const tier = TIER_CONFIG[status?.member_tier] || TIER_CONFIG.bronze;
  const benefits = status?.tier_benefits || {};

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Tier Card */}
      <View style={[s.tierCard, { backgroundColor: tier.bg, borderColor: tier.color }]}>
        <Text style={s.tierEmoji}>{tier.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.tierName, { color: tier.color }]}>
            {benefits.name || status?.member_tier?.toUpperCase()} Member
          </Text>
          <Text style={s.tierDesc}>{benefits.description || ''}</Text>
        </View>
        <View style={[s.tierBadge, { backgroundColor: tier.color }]}>
          <Text style={s.tierBadgeText}>{(status?.member_tier || 'bronze').toUpperCase()}</Text>
        </View>
      </View>

      {/* Points Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Ionicons name="flash" size={20} color={COLORS.amber} />
          <Text style={s.statValue}>{status?.points || 0}</Text>
          <Text style={s.statLabel}>Points</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="trending-up" size={20} color={COLORS.green} />
          <Text style={s.statValue}>₹{status?.lifetime_spent || 0}</Text>
          <Text style={s.statLabel}>Lifetime</Text>
        </View>
        <View style={s.statCard}>
          <Ionicons name="ribbon" size={20} color={COLORS.blue} />
          <Text style={s.statValue}>{status?.tier_points || 0}%</Text>
          <Text style={s.statLabel}>Next Tier</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.min(status?.tier_points || 0, 100)}%` }]} />
          </View>
        </View>
      </View>

      {/* Benefits */}
      <Text style={s.sectionTitle}>Your Benefits</Text>
      <View style={s.benefitsCard}>
        <View style={s.benefitRow}>
          <Text style={s.benefitEmoji}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.benefitTitle}>Points Multiplier</Text>
            <Text style={s.benefitDesc}>{benefits.points_multiplier || 1}x on every purchase</Text>
          </View>
        </View>
        <View style={s.benefitRow}>
          <Text style={s.benefitEmoji}>🎂</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.benefitTitle}>Birthday Bonus</Text>
            <Text style={s.benefitDesc}>{benefits.birthday_bonus || 0} bonus points</Text>
          </View>
        </View>
        <View style={s.benefitRow}>
          <Text style={s.benefitEmoji}>👥</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.benefitTitle}>Referral Bonus</Text>
            <Text style={s.benefitDesc}>{benefits.referral_bonus || 0} points per referral</Text>
          </View>
        </View>
        {benefits.special_perks?.map((perk, i) => (
          <View key={i} style={s.perkRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.amber} />
            <Text style={s.perkText}>{perk}</Text>
          </View>
        ))}
      </View>

      {/* Coupons */}
      <Text style={s.sectionTitle}>Available Coupons</Text>
      {coupons.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="ticket-outline" size={32} color={COLORS.gray300} />
          <Text style={s.emptyText}>No coupons available right now</Text>
        </View>
      ) : (
        coupons.map((c, i) => (
          <View key={i} style={s.couponCard}>
            <View style={s.couponTop}>
              <View>
                <Text style={s.couponCode}>{c.code}</Text>
                <Text style={s.couponDesc}>{c.description}</Text>
              </View>
              <View style={s.discountBadge}>
                <Text style={s.discountText}>
                  {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                </Text>
              </View>
            </View>
            <Text style={s.couponMin}>Min. order: ₹{c.min_order_amount}</Text>
            <TouchableOpacity style={s.copyBtn} onPress={() => copyCode(c.code)}>
              <Ionicons name="copy-outline" size={16} color={COLORS.black} />
              <Text style={s.copyText}>Copy Code</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Referral */}
      {referralCode ? (
        <>
          <Text style={s.sectionTitle}>Refer a Friend</Text>
          <View style={s.referralCard}>
            <Text style={s.referralHeading}>Both get ₹100 Off!</Text>
            <Text style={s.referralDesc}>Share your code and earn rewards when friends sign up</Text>

            <View style={s.referralCodeRow}>
              <View style={s.referralCodeBox}>
                <Text style={s.referralCodeText}>{referralCode}</Text>
              </View>
              <TouchableOpacity style={s.referralBtn} onPress={() => copyCode(referralCode)}>
                <Ionicons name="copy-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.referralBtn, { backgroundColor: COLORS.green }]} onPress={shareReferral}>
                <Ionicons name="share-social-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={s.referralStat}>
              <Text style={s.referralStatNum}>{referralCount}</Text>
              <Text style={s.referralStatLabel}>Friends Referred</Text>
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: SIZES.md, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray50 },

  tierCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: SIZES.radius,
    padding: SIZES.md, borderWidth: 2, marginBottom: SIZES.md,
  },
  tierEmoji: { fontSize: 36, marginRight: SIZES.sm },
  tierName: { fontSize: 18, fontWeight: '700' },
  tierDesc: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  tierBadge: { borderRadius: SIZES.radiusSm, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.white },

  statsRow: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.lg },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.sm,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray100,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.gray900, marginTop: 4 },
  statLabel: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  progressBar: { width: '100%', height: 4, backgroundColor: COLORS.gray200, borderRadius: 2, marginTop: 6 },
  progressFill: { height: 4, backgroundColor: COLORS.amber, borderRadius: 2 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.sm },

  benefitsCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.gray100, marginBottom: SIZES.lg,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.sm },
  benefitEmoji: { fontSize: 24 },
  benefitTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },
  benefitDesc: { fontSize: 12, color: COLORS.gray500 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  perkText: { fontSize: 13, color: COLORS.gray600 },

  emptyBox: {
    alignItems: 'center', paddingVertical: 32, backgroundColor: COLORS.white,
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.gray100, marginBottom: SIZES.lg,
  },
  emptyText: { fontSize: 13, color: COLORS.gray400, marginTop: SIZES.sm },

  couponCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#d4a', marginBottom: SIZES.sm,
  },
  couponTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  couponCode: { fontSize: 16, fontWeight: '800', color: COLORS.amber },
  couponDesc: { fontSize: 12, color: COLORS.gray600, marginTop: 2 },
  discountBadge: { backgroundColor: '#fef3c7', borderRadius: SIZES.radiusSm, paddingHorizontal: 8, paddingVertical: 4 },
  discountText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  couponMin: { fontSize: 11, color: COLORS.gray400, marginTop: SIZES.sm },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm, paddingVertical: 10, marginTop: SIZES.sm,
  },
  copyText: { fontSize: 13, fontWeight: '700', color: COLORS.black },

  referralCard: {
    backgroundColor: '#f0fdf4', borderRadius: SIZES.radius, padding: SIZES.md,
    borderWidth: 2, borderColor: '#bbf7d0', marginBottom: SIZES.lg,
  },
  referralHeading: { fontSize: 17, fontWeight: '700', color: '#166534' },
  referralDesc: { fontSize: 12, color: COLORS.gray500, marginTop: 2, marginBottom: SIZES.sm },
  referralCodeRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  referralCodeBox: {
    flex: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: '#4ade80',
    borderRadius: SIZES.radiusSm, paddingHorizontal: SIZES.md, paddingVertical: 12,
  },
  referralCodeText: { fontSize: 18, fontWeight: '800', color: '#166534', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  referralBtn: {
    width: 42, height: 42, borderRadius: SIZES.radiusSm, backgroundColor: COLORS.gray700,
    justifyContent: 'center', alignItems: 'center',
  },
  referralStat: { alignItems: 'center', marginTop: SIZES.md, backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, padding: SIZES.sm },
  referralStatNum: { fontSize: 28, fontWeight: '800', color: COLORS.green },
  referralStatLabel: { fontSize: 11, color: COLORS.gray400 },
});
