import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../constants/theme';
import { reviewsApi, menuApi } from '../services/api';

function StarRating({ rating, size = 18, interactive, onRate }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} disabled={!interactive} onPress={() => onRate?.(i)}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={size}
            color={i <= rating ? '#facc15' : COLORS.gray300}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('browse'); // browse | my
  const [formData, setFormData] = useState({ rating: 5, comment: '', photo: null });

  const loadMenu = useCallback(async () => {
    try {
      const items = await menuApi.getItems();
      setMenuItems(items);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const loadItemReviews = async (itemId) => {
    try {
      const data = await reviewsApi.getItemReviews(itemId, true);
      setReviews(data);
    } catch { setReviews([]); }
  };

  const loadMyReviews = async () => {
    try {
      const data = await reviewsApi.getUserReviews();
      setMyReviews(data);
    } catch { setMyReviews([]); }
  };

  const selectItem = async (item) => {
    setSelectedItem(item);
    await loadItemReviews(item.id || item._id);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setFormData(p => ({ ...p, photo: result.assets[0] }));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setFormData(p => ({ ...p, photo: result.assets[0] }));
    }
  };

  const removePhoto = () => {
    setFormData(p => ({ ...p, photo: null }));
  };

  const handleSubmit = async () => {
    if (!formData.comment.trim() || formData.comment.length < 10) {
      Alert.alert('Error', 'Review must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      // If photo exists, upload with multipart/form-data
      if (formData.photo) {
        const formDataObj = new FormData();
        formDataObj.append('menu_item_id', selectedItem.id || selectedItem._id);
        formDataObj.append('rating', formData.rating);
        formDataObj.append('comment', formData.comment);
        formDataObj.append('photo', {
          uri: formData.photo.uri,
          name: formData.photo.fileName || 'review-photo.jpg',
          type: formData.photo.type || 'image/jpeg',
        });

        await reviewsApi.submitReviewWithPhoto(formDataObj);
      } else {
        await reviewsApi.submitReview({
          menu_item_id: selectedItem.id || selectedItem._id,
          rating: formData.rating,
          comment: formData.comment,
        });
      }
      Alert.alert('Success', 'Review submitted! It will be approved by our team.');
      setFormData({ rating: 5, comment: '', photo: null });
      setShowForm(false);
      await loadItemReviews(selectedItem.id || selectedItem._id);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to submit');
    }
    setSubmitting(false);
  };

  const handleDelete = (reviewId) => {
    Alert.alert('Delete Review', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await reviewsApi.deleteReview(reviewId);
            loadMyReviews();
          } catch { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (tab === 'my') await loadMyReviews();
    else if (selectedItem) await loadItemReviews(selectedItem.id || selectedItem._id);
    else await loadMenu();
    setRefreshing(false);
  };

  // Tab: My Reviews
  useEffect(() => { if (tab === 'my') loadMyReviews(); }, [tab]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={s.root}>
      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'browse' && s.tabActive]} onPress={() => { setTab('browse'); setSelectedItem(null); }}>
          <Text style={[s.tabText, tab === 'browse' && s.tabTextActive]}>Browse Reviews</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'my' && s.tabActive]} onPress={() => setTab('my')}>
          <Text style={[s.tabText, tab === 'my' && s.tabTextActive]}>My Reviews</Text>
        </TouchableOpacity>
      </View>

      {tab === 'my' ? (
        /* My Reviews */
        <FlatList
          data={myReviews}
          keyExtractor={r => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={s.listContent}
          renderItem={({ item: r }) => (
            <View style={s.reviewCard}>
              <View style={s.reviewTop}>
                <StarRating rating={r.rating} size={14} />
                <View style={[s.statusPill, { backgroundColor: r.status === 'approved' ? '#dcfce7' : '#fef9c3' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: r.status === 'approved' ? '#166534' : '#92400e' }}>
                    {r.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={s.reviewComment}>{r.comment}</Text>
              <View style={s.reviewBot}>
                <Text style={s.reviewDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
                <TouchableOpacity onPress={() => handleDelete(r.id)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}><Ionicons name="chatbubble-outline" size={40} color={COLORS.gray300} /><Text style={s.emptyText}>No reviews yet</Text></View>
          }
        />
      ) : !selectedItem ? (
        /* Menu Item Selector */
        <FlatList
          data={menuItems}
          keyExtractor={i => String(i.id || i._id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={<Text style={s.hint}>Select a dish to view or write reviews</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.menuItem} onPress={() => selectItem(item)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={s.menuName}>{item.name}</Text>
                <Text style={s.menuPrice}>₹{item.price}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.gray400} />
            </TouchableOpacity>
          )}
        />
      ) : (
        /* Item Reviews */
        <ScrollView
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Header */}
          <TouchableOpacity style={s.backRow} onPress={() => setSelectedItem(null)}>
            <Ionicons name="arrow-back" size={20} color={COLORS.gray600} />
            <Text style={s.backText}>All Items</Text>
          </TouchableOpacity>

          <View style={s.itemHeader}>
            <Text style={s.itemName}>{selectedItem.name}</Text>
            {reviews.length > 0 && (
              <View style={s.ratingBox}>
                <Text style={s.avgRating}>{avgRating}</Text>
                <StarRating rating={Math.round(avgRating)} size={14} />
                <Text style={s.reviewCount}>{reviews.length} reviews</Text>
              </View>
            )}
          </View>

          {/* Write Review */}
          {!showForm ? (
            <TouchableOpacity style={s.writeBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="create-outline" size={18} color={COLORS.black} />
              <Text style={s.writeBtnText}>Write a Review</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.formCard}>
              <Text style={s.formLabel}>Rating</Text>
              <StarRating rating={formData.rating} size={28} interactive onRate={(r) => setFormData(p => ({ ...p, rating: r }))} />

              <Text style={[s.formLabel, { marginTop: SIZES.md }]}>Your Review</Text>
              <TextInput
                style={s.textArea}
                multiline
                numberOfLines={4}
                placeholder="Share your experience (min 10 chars)..."
                placeholderTextColor={COLORS.gray400}
                value={formData.comment}
                onChangeText={t => setFormData(p => ({ ...p, comment: t }))}
                maxLength={1000}
              />
              <Text style={s.charCount}>{formData.comment.length}/1000</Text>

              {/* Photo Upload */}
              <Text style={[s.formLabel, { marginTop: SIZES.md }]}>Add Photo (Optional)</Text>
              {formData.photo ? (
                <View style={s.photoPreviewContainer}>
                  <Image source={{ uri: formData.photo.uri }} style={s.photoPreview} />
                  <TouchableOpacity style={s.removePhotoBtn} onPress={removePhoto}>
                    <Ionicons name="close-circle" size={28} color={COLORS.red} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.photoButtons}>
                  <TouchableOpacity style={s.photoBtn} onPress={pickImage}>
                    <Ionicons name="image-outline" size={22} color={COLORS.gray600} />
                    <Text style={s.photoBtnText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.photoBtn} onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={22} color={COLORS.gray600} />
                    <Text style={s.photoBtnText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={s.formActions}>
                <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
                  {submitting ? <ActivityIndicator size="small" color={COLORS.black} /> : <Text style={s.submitText}>Submit Review</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowForm(false); setFormData(p => ({ ...p, photo: null })); }}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>No reviews yet. Be the first!</Text></View>
          ) : (
            reviews.map(r => (
              <View key={r.id} style={s.reviewCard}>
                <View style={s.reviewTop}>
                  <View>
                    <Text style={s.reviewUser}>{r.user_name}</Text>
                    <StarRating rating={r.rating} size={12} />
                  </View>
                  <Text style={s.reviewDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={s.reviewComment}>{r.comment}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray50 },
  listContent: { padding: SIZES.md, paddingBottom: 40 },

  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.gray400 },
  tabTextActive: { color: COLORS.gray900, fontWeight: '700' },

  hint: { fontSize: 13, color: COLORS.gray500, marginBottom: SIZES.sm },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusSm, padding: SIZES.md, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.gray100,
  },
  menuName: { fontSize: 15, fontWeight: '600', color: COLORS.gray900 },
  menuPrice: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SIZES.md },
  backText: { fontSize: 14, color: COLORS.gray600 },
  itemHeader: { marginBottom: SIZES.md },
  itemName: { fontSize: 20, fontWeight: '700', color: COLORS.gray900 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  avgRating: { fontSize: 22, fontWeight: '800', color: COLORS.gray900 },
  reviewCount: { fontSize: 12, color: COLORS.gray400 },

  writeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm, paddingVertical: 14, marginBottom: SIZES.md,
  },
  writeBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.black },

  formCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.gray200, marginBottom: SIZES.md,
  },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.gray800, marginBottom: 6 },
  textArea: {
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: SIZES.radiusSm,
    padding: SIZES.sm, fontSize: 14, color: COLORS.gray800, minHeight: 100, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: COLORS.gray400, textAlign: 'right', marginTop: 4 },
  formActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.md },
  submitBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm, paddingVertical: 12, alignItems: 'center' },
  submitText: { fontSize: 14, fontWeight: '700', color: COLORS.black },
  cancelBtn: { flex: 1, borderRadius: SIZES.radiusSm, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.gray200 },
  cancelText: { fontSize: 14, fontWeight: '500', color: COLORS.gray600 },

  photoButtons: { flexDirection: 'row', gap: SIZES.sm },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: SIZES.radiusSm,
    paddingVertical: 12, backgroundColor: COLORS.gray50,
  },
  photoBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.gray600 },
  photoPreviewContainer: {
    position: 'relative', alignSelf: 'flex-start',
  },
  photoPreview: {
    width: 150, height: 150, borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.gray100,
  },
  removePhotoBtn: {
    position: 'absolute', top: -10, right: -10,
    backgroundColor: COLORS.white, borderRadius: 14,
  },

  reviewCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm, padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.gray100, marginBottom: SIZES.sm,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  reviewUser: { fontSize: 14, fontWeight: '600', color: COLORS.gray900, marginBottom: 2 },
  reviewComment: { fontSize: 13, color: COLORS.gray600, lineHeight: 19 },
  reviewDate: { fontSize: 11, color: COLORS.gray400 },
  reviewBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SIZES.sm },
  statusPill: { borderRadius: SIZES.radiusFull, paddingHorizontal: 8, paddingVertical: 2 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, color: COLORS.gray400, marginTop: SIZES.sm },
});
