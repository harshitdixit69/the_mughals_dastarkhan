import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';

const DELIVERY_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: 'receipt-outline', description: 'Your order has been received' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline', description: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', icon: 'flame-outline', description: 'Chefs are cooking your food' },
  { key: 'ready', label: 'Ready', icon: 'bag-check-outline', description: 'Your food is ready for pickup' },
  { key: 'picked_up', label: 'Picked Up', icon: 'bicycle-outline', description: 'Driver has picked up your order' },
  { key: 'out_for_delivery', label: 'On the Way', icon: 'navigate-outline', description: 'Your order is en route' },
  { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-outline', description: 'Enjoy your meal!' },
];

const PICKUP_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: 'receipt-outline', description: 'Your order has been received' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline', description: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', icon: 'flame-outline', description: 'Chefs are cooking your food' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: 'bag-check-outline', description: 'Collect from the counter!' },
  { key: 'delivered', label: 'Collected', icon: 'checkmark-done-outline', description: 'Enjoy your meal!' },
];

const DINE_IN_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: 'receipt-outline', description: 'Your order has been received' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline', description: 'Kitchen is on it' },
  { key: 'preparing', label: 'Preparing', icon: 'flame-outline', description: 'Being freshly prepared' },
  { key: 'ready_for_pickup', label: 'Served', icon: 'checkmark-done-outline', description: 'Served to your table!' },
];

const getSteps = (order) => {
  const ot = order?.order_type || '';
  const dt = order?.delivery_type || '';
  if (ot === 'dine-in' || ot === 'dine_in') return DINE_IN_STEPS;
  if (dt === 'self_delivery' || dt === 'external_delivery' || ot === 'delivery') return DELIVERY_STEPS;
  return PICKUP_STEPS;
};

const getStepIndex = (steps, status) => {
  const mapped = status === 'pending' ? 'placed' : status === 'confirmed' ? 'accepted' : status;
  const idx = steps.findIndex(s => s.key === mapped);
  return idx >= 0 ? idx : -1;
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const getTimestamp = (order, stepKey) => {
  if (!order?.status_history) return null;
  const entry = order.status_history.find(h => h.status === stepKey);
  return entry?.timestamp || null;
};

export default function OrderTracker({ order }) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [dotAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 750, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
    ]);

    const loop = Animated.loop(pulse);
    loop.start();

    const dotSequence = Animated.sequence([
      Animated.timing(dotAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(dotAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]);
    const dotLoop = Animated.loop(dotSequence);
    dotLoop.start();

    return () => {
      loop.stop();
      dotLoop.stop();
    };
  }, []);

  if (!order) return null;

  const isCancelled = order.status === 'cancelled';
  const steps = getSteps(order);
  const currentIdx = getStepIndex(steps, order.status);
  const isComplete = currentIdx >= steps.length - 1;

  if (isCancelled) {
    return (
      <View style={styles.cancelledCard}>
        <Ionicons name="close-circle" size={48} color={COLORS.red} />
        <Text style={styles.cancelledTitle}>Order Cancelled</Text>
        <Text style={styles.cancelledText}>This order has been cancelled</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Live Header */}
      {!isComplete && (
        <View style={styles.liveHeader}>
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.liveText}>Live Tracking</Text>
          </View>
          <View style={styles.updateBadge}>
            <Ionicons name="time-outline" size={12} color={COLORS.gray400} />
            <Text style={styles.updateText}>Updates automatically</Text>
          </View>
        </View>
      )}

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const ts = getTimestamp(order, step.key);
          const isLast = idx === steps.length - 1;

          return (
            <View key={step.key} style={styles.stepRow}>
              {/* Icon Column */}
              <View style={styles.iconColumn}>
                <View style={[
                  styles.stepIcon,
                  isCompleted ? styles.stepIconCompleted : styles.stepIconPending,
                  isCurrent && !isComplete && styles.stepIconCurrent,
                ]}>
                  <Ionicons
                    name={step.icon}
                    size={18}
                    color={isCompleted ? COLORS.white : COLORS.gray400}
                  />
                  {isCurrent && !isComplete && (
                    <Animated.View style={[styles.pulseRing, { opacity: dotAnim }]} />
                  )}
                </View>
                {/* Vertical Line */}
                {!isLast && (
                  <View style={[
                    styles.verticalLine,
                    idx < currentIdx ? styles.verticalLineCompleted : styles.verticalLinePending,
                  ]} />
                )}
              </View>

              {/* Content */}
              <View style={[styles.stepContent, isLast && styles.stepContentLast]}>
                <View style={styles.stepHeader}>
                  <Text style={[
                    styles.stepLabel,
                    isCompleted ? styles.stepLabelCompleted : styles.stepLabelPending,
                  ]}>
                    {step.label}
                  </Text>
                  {ts && (
                    <Text style={styles.timestamp}>{formatTime(ts)}</Text>
                  )}
                </View>
                <Text style={[
                  styles.stepDescription,
                  isCompleted ? styles.stepDescriptionCompleted : styles.stepDescriptionPending,
                ]}>
                  {step.description}
                </Text>

                {/* Special Indicators */}
                {isCurrent && step.key === 'preparing' && (
                  <View style={styles.cookingIndicator}>
                    <View style={styles.bouncingDots}>
                      <Animated.View style={[styles.dot, { opacity: dotAnim }]} />
                      <Animated.View style={[styles.dot, { opacity: dotAnim, marginLeft: 4 }]} />
                      <Animated.View style={[styles.dot, { opacity: dotAnim, marginLeft: 4 }]} />
                    </View>
                    <Text style={styles.cookingText}>Cooking in progress...</Text>
                  </View>
                )}

                {isCurrent && (step.key === 'out_for_delivery' || step.key === 'picked_up') && (
                  <View style={styles.driverInfo}>
                    {order.driver_name && (
                      <View style={styles.driverBadge}>
                        <Ionicons name="bicycle" size={14} color="#6366f1" />
                        <Text style={styles.driverName}>{order.driver_name}</Text>
                        {order.driver_phone && (
                          <Ionicons name="call" size={14} color="#6366f1" style={{ marginLeft: 8 }} />
                        )}
                      </View>
                    )}
                    {order.delivery_agent_name && !order.driver_name && (
                      <View style={styles.driverBadge}>
                        <Ionicons name="bicycle" size={14} color="#6366f1" />
                        <Text style={styles.driverName}>{order.delivery_agent_name}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Estimated Time */}
      {!isComplete && currentIdx >= 0 && currentIdx < steps.length - 1 && (
        <View style={styles.estimateRow}>
          <View style={styles.estimateItem}>
            <Ionicons name="time-outline" size={16} color={COLORS.gray400} />
            <Text style={styles.estimateText}>
              Estimated: {currentIdx <= 2 ? '25-35 min' : currentIdx <= 4 ? '10-20 min' : '5-10 min'}
            </Text>
          </View>
        </View>
      )}

      {/* Completion */}
      {isComplete && (
        <View style={styles.completionCard}>
          <Text style={styles.completionEmoji}>🎉</Text>
          <Text style={styles.completionText}>
            {order.order_type === 'dine-in' || order.order_type === 'dine_in'
              ? 'Enjoy your meal!'
              : 'Order delivered successfully!'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cancelledCard: {
    backgroundColor: '#fee2e2',
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelledTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: SIZES.sm,
  },
  cancelledText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 4,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  liveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updateText: {
    fontSize: 11,
    color: COLORS.gray400,
  },
  stepsContainer: {
    marginTop: SIZES.sm,
  },
  stepRow: {
    flexDirection: 'row',
  },
  iconColumn: {
    width: 40,
    alignItems: 'center',
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepIconCompleted: {
    backgroundColor: '#22c55e',
  },
  stepIconPending: {
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: COLORS.gray200,
  },
  stepIconCurrent: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22c55e',
  },
  verticalLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  verticalLineCompleted: {
    backgroundColor: '#22c55e',
  },
  verticalLinePending: {
    backgroundColor: COLORS.gray200,
  },
  stepContent: {
    flex: 1,
    paddingBottom: SIZES.lg,
    paddingLeft: SIZES.sm,
  },
  stepContentLast: {
    paddingBottom: 0,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: COLORS.gray900,
  },
  stepLabelPending: {
    color: COLORS.gray400,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  stepDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  stepDescriptionCompleted: {
    color: COLORS.gray600,
  },
  stepDescriptionPending: {
    color: COLORS.gray300,
  },
  cookingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SIZES.sm,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
    alignSelf: 'flex-start',
  },
  bouncingDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
  },
  cookingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },
  driverInfo: {
    marginTop: SIZES.sm,
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
    alignSelf: 'flex-start',
  },
  driverName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  estimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  estimateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  estimateText: {
    fontSize: 13,
    color: COLORS.gray600,
  },
  completionCard: {
    alignItems: 'center',
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  completionEmoji: {
    fontSize: 24,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: SIZES.sm,
  },
});
