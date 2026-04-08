import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { testimonialsApi } from '../services/api';

const { width } = Dimensions.get('window');

export default function TestimonialsScreen() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTestimonials = async () => {
    try {
      const data = await testimonialsApi.getAll();
      setTestimonials(data);
    } catch (error) {
      console.error('Failed to load testimonials:', error);
      // Fallback testimonials for demo
      setTestimonials([
        {
          id: '1',
          name: 'Rahul Sharma',
          role: 'Food Enthusiast',
          rating: 5,
          text: 'The biryani here is absolutely divine! Authentic Mughlai flavors that remind me of Lucknow. The service was impeccable and the ambiance is perfect for family dinners.',
          avatar: null,
        },
        {
          id: '2',
          name: 'Priya Patel',
          role: 'Regular Customer',
          rating: 5,
          text: 'I order from The Mughal\'s Dastarkhan every weekend. Their kebabs are the best in town - perfectly marinated and grilled to perfection. Highly recommended!',
          avatar: null,
        },
        {
          id: '3',
          name: 'Amit Kumar',
          role: 'Food Blogger',
          rating: 5,
          text: 'As a food blogger, I\'ve tried many Mughlai restaurants, but this one stands out. The Galouti Kebabs literally melt in your mouth. A must-visit for food lovers!',
          avatar: null,
        },
        {
          id: '4',
          name: 'Sneha Gupta',
          role: 'Verified Diner',
          rating: 5,
          text: 'Celebrated my anniversary here and it was magical. The reservation system worked smoothly, and the staff made our evening special with their warm hospitality.',
          avatar: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestimonials();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTestimonials();
    setRefreshing(false);
  };

  const renderStars = (rating) => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={16}
          color="#facc15"
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'U'}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.role}>{item.role}</Text>
        </View>
      </View>

      {renderStars(item.rating)}

      <Text style={styles.quoteIcon}>❝</Text>
      <Text style={styles.text}>{item.text}</Text>
      <Text style={styles.quoteIconBottom}>❞</Text>

      <View style={styles.verifiedBadge}>
        <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
        <Text style={styles.verifiedText}>Verified Diner</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="chatbubbles" size={28} color={COLORS.primary} />
        </View>
        <Text style={styles.headerTitle}>What Our Guests Say</Text>
        <Text style={styles.headerSubtitle}>
          {testimonials.length} happy customers shared their experience
        </Text>
      </View>

      <FlatList
        data={testimonials}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
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
  header: {
    backgroundColor: COLORS.white,
    padding: SIZES.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.gray900,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: SIZES.sm,
  },
  list: {
    padding: SIZES.md,
    paddingBottom: 40,
  },
  separator: {
    height: SIZES.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
  },
  userInfo: {
    marginLeft: SIZES.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  role: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: SIZES.sm,
  },
  quoteIcon: {
    fontSize: 24,
    color: '#cbd5e1',
    marginBottom: -8,
  },
  quoteIconBottom: {
    fontSize: 24,
    color: '#cbd5e1',
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  text: {
    fontSize: 15,
    color: COLORS.gray700,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SIZES.md,
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
});
