import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { authApi, menuApi, cartApi } from '../services/api';

export default function FavoritesScreen({ navigation }) {
  const { user } = useAuth();
  const { addToCart, refreshCart } = useCart();
  const [favorites, setFavorites] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickOrdering, setQuickOrdering] = useState(false);

  const load = useCallback(async () => {
    try {
      // Fetch user profile to get favorites
      const profile = await authApi.getProfile();
      const userFavorites = profile.favorites || [];
      setFavorites(userFavorites);

      // Fetch all menu items to match with favorites
      const items = await menuApi.getItems();
      setMenuItems(items);

      // Filter menu items that are in favorites
      const favItems = items.filter(item => userFavorites.includes(item.id));
      setFavoriteItems(favItems);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRemoveFavorite = async (itemId) => {
    try {
      await authApi.removeFavorite(itemId);
      setFavorites(prev => prev.filter(id => id !== itemId));
      setFavoriteItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      Alert.alert('Error', 'Failed to remove from favorites');
    }
  };

  const handleAddToCart = async (item) => {
    try {
      await addToCart(item.id, 1);
      Alert.alert('Added!', `${item.name} added to cart`, [
        { text: 'Continue', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  const handleQuickOrderAll = async () => {
    if (favoriteItems.length === 0) return;

    setQuickOrdering(true);
    try {
      let addedCount = 0;
      for (const item of favoriteItems) {
        try {
          await cartApi.addToCart(item.id, 1);
          addedCount++;
        } catch (e) {
          // Skip items that fail to add
        }
      }
      await refreshCart();
      Alert.alert(
        'Added to Cart!',
        `${addedCount} item${addedCount > 1 ? 's' : ''} added to your cart`,
        [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'Checkout', onPress: () => navigation.navigate('Checkout') },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to quick order');
    } finally {
      setQuickOrdering(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description || 'Delicious dish'}
          </Text>
          <View style={styles.tagsRow}>
            <View style={[styles.tag, item.is_veg ? styles.vegTag : styles.nonVegTag]}>
              <Ionicons
                name={item.is_veg ? 'leaf' : 'restaurant'}
                size={12}
                color={item.is_veg ? '#16a34a' : '#dc2626'}
              />
              <Text style={[styles.tagText, item.is_veg ? styles.vegText : styles.nonVegText]}>
                {item.is_veg ? 'Veg' : 'Non-Veg'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemoveFavorite(item.id)}
        >
          <Ionicons name="heart-dislike" size={20} color={COLORS.red} />
        </TouchableOpacity>
      </View>

      <View style={styles.itemFooter}>
        <Text style={styles.itemPrice}>₹{item.price}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => handleAddToCart(item)}
        >
          <Ionicons name="add" size={18} color={COLORS.black} />
          <Text style={styles.addBtnText}>Add to Cart</Text>
        </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={24} color={COLORS.red} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Favorite Items</Text>
            <Text style={styles.headerSubtitle}>{favoriteItems.length} item{favoriteItems.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        {favoriteItems.length > 0 && (
          <TouchableOpacity
            style={[styles.quickOrderBtn, quickOrdering && styles.quickOrderBtnDisabled]}
            onPress={handleQuickOrderAll}
            disabled={quickOrdering}
          >
            {quickOrdering ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="cart" size={18} color={COLORS.white} />
                <Text style={styles.quickOrderText}>Quick Order All</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {favoriteItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySubtitle}>
            Add items from the menu by tapping the heart icon
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favoriteItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 2,
  },
  quickOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.gray900,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radiusFull,
  },
  quickOrderBtnDisabled: {
    opacity: 0.7,
  },
  quickOrderText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  list: {
    padding: SIZES.md,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray800,
    marginTop: SIZES.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  browseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
  },
  browseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
  },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 13,
    color: COLORS.gray500,
    lineHeight: 18,
    marginBottom: SIZES.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  vegTag: {
    backgroundColor: '#dcfce7',
  },
  nonVegTag: {
    backgroundColor: '#fee2e2',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vegText: {
    color: '#16a34a',
  },
  nonVegText: {
    color: '#dc2626',
  },
  removeBtn: {
    padding: SIZES.sm,
    backgroundColor: '#fee2e2',
    borderRadius: SIZES.radiusFull,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.md,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  itemPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gray900,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radiusFull,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.black,
  },
});
