import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  RefreshControl, TextInput, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { menuApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const HERO_IMG = 'https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=800&q=75&auto=format';


export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { addToCart, count } = useCart();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [cats, allItems] = await Promise.all([menuApi.getCategories(), menuApi.getItems()]);
      setCategories(cats);
      setItems(allItems);
    } catch { /* uses empty */ }
  }, []);

  useEffect(() => { load(); }, [load]);


  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = items.filter(i => {
    if (activeCat && i.category_id !== activeCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = async (item) => {
    if (!user) return navigation.navigate('Login');
    setAddingId(item.id || item._id);
    try {
      await addToCart(item.id || item._id, 1);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to add');
    }
    setAddingId(null);
  };

  const renderItem = ({ item }) => (
    <View style={s.menuCard}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={s.menuImg} />
      ) : (
        <View style={[s.menuImg, s.menuImgPlaceholder]}>
          <Ionicons name="restaurant-outline" size={28} color={COLORS.gray300} />
        </View>
      )}
      <View style={s.menuInfo}>
        <View style={s.menuTop}>
          <Text style={s.menuName} numberOfLines={1}>{item.name}</Text>
          {item.is_veg !== undefined && (
            <View style={[s.vegBadge, { borderColor: item.is_veg ? COLORS.green : COLORS.red }]}>
              <View style={[s.vegDot, { backgroundColor: item.is_veg ? COLORS.green : COLORS.red }]} />
            </View>
          )}
        </View>
        <Text style={s.menuDesc} numberOfLines={2}>{item.description}</Text>
        <View style={s.menuBottom}>
          <Text style={s.menuPrice}>₹{item.price}</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => handleAdd(item)} activeOpacity={0.7}>
            {addingId === (item.id || item._id) ? (
              <ActivityIndicator size="small" color={COLORS.black} />
            ) : (
              <>
                <Ionicons name="add" size={18} color={COLORS.black} />
                <Text style={s.addText}>ADD</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id || i._id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            {/* Hero */}
            <View style={s.hero}>
              <Image source={{ uri: HERO_IMG }} style={s.heroImg} />
              <View style={s.heroOverlay}>
                <Text style={s.heroTitle}>The Mughal's{'\n'}Dastarkhwan</Text>
                <Text style={s.heroSub}>Authentic Mughlai & Awadhi Cuisine</Text>
              </View>
            </View>

            {/* Search */}
            <View style={s.searchRow}>
              <Ionicons name="search-outline" size={18} color={COLORS.gray400} />
              <TextInput style={s.searchInput} placeholder="Search menu..."
                value={search} onChangeText={setSearch} placeholderTextColor={COLORS.gray400} />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.gray400} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catRow} contentContainerStyle={s.catContent}>
              <TouchableOpacity style={[s.catChip, !activeCat && s.catChipActive]}
                onPress={() => setActiveCat(null)}>
                <Text style={[s.catText, !activeCat && s.catTextActive]}>All</Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity key={c.id || c._id}
                  style={[s.catChip, activeCat === (c.id || c._id) && s.catChipActive]}
                  onPress={() => setActiveCat(c.id || c._id)}>
                  <Text style={[s.catText, activeCat === (c.id || c._id) && s.catTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.sectionTitle}>
              {activeCat ? categories.find(c => (c.id || c._id) === activeCat)?.name || 'Menu' : 'Full Menu'}
              <Text style={s.countBadge}> ({filtered.length})</Text>
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.gray300} />
            <Text style={s.emptyText}>No items found</Text>
          </View>
        }
      />

      {/* Floating cart badge */}
      {count > 0 && (
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('Cart')} activeOpacity={0.85}>
          <Ionicons name="cart" size={22} color={COLORS.black} />
          <Text style={s.fabText}>View Cart ({count})</Text>
        </TouchableOpacity>
      )}

      {/* AI Chat FAB */}
      <TouchableOpacity
        style={s.chatFab}
        onPress={() => navigation.navigate('Chat')}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.black} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  list: { paddingBottom: 100 },
  hero: { height: 220, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end', padding: SIZES.lg,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: COLORS.white, lineHeight: 34 },
  heroSub: { fontSize: 14, color: COLORS.gray200, marginTop: 4 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    margin: SIZES.md, borderRadius: SIZES.radiusSm, paddingHorizontal: SIZES.md,
    height: 44, borderWidth: 1, borderColor: COLORS.gray200,
  },
  searchInput: { flex: 1, marginLeft: SIZES.sm, fontSize: 14, color: COLORS.gray800 },
  catRow: { marginBottom: SIZES.sm },
  catContent: { paddingHorizontal: SIZES.md, gap: SIZES.sm },
  catChip: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusFull, paddingHorizontal: 14,
    paddingVertical: 8, borderWidth: 1, borderColor: COLORS.gray200, marginRight: 8,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  catText: { fontSize: 13, fontWeight: '500', color: COLORS.gray600 },
  catTextActive: { color: COLORS.black, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray900, marginHorizontal: SIZES.md, marginBottom: SIZES.sm },
  countBadge: { fontSize: 14, fontWeight: '400', color: COLORS.gray400 },
  menuCard: {
    flexDirection: 'row', backgroundColor: COLORS.white, marginHorizontal: SIZES.md,
    marginBottom: SIZES.sm, borderRadius: SIZES.radius, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.gray100,
  },
  menuImg: { width: 100, height: 100 },
  menuImgPlaceholder: { backgroundColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1, padding: SIZES.sm, justifyContent: 'space-between' },
  menuTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.gray900 },
  vegBadge: { width: 16, height: 16, borderWidth: 1.5, borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  vegDot: { width: 8, height: 8, borderRadius: 4 },
  menuDesc: { fontSize: 12, color: COLORS.gray500, marginTop: 2, lineHeight: 16 },
  menuBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  menuPrice: { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: SIZES.radiusSm, gap: 2,
  },
  addText: { fontSize: 12, fontWeight: '700', color: COLORS.black },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: COLORS.gray400, marginTop: SIZES.sm },
  fab: {
    position: 'absolute', bottom: SIZES.lg, left: SIZES.lg, right: SIZES.lg,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  fabText: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  chatFab: {
    position: 'absolute', bottom: SIZES.lg, right: SIZES.lg,
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
});
