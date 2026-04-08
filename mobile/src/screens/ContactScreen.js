import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { contactApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ContactScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      Alert.alert('Error', 'Please fill in name, email, and message');
      return;
    }
    setSubmitting(true);
    try {
      const res = await contactApi.submit({
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        message: form.message,
      });
      Alert.alert('Success', res.message || 'Message sent successfully!');
      setForm(p => ({ ...p, message: '' }));
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to send message');
    }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <Ionicons name="mail-outline" size={36} color={COLORS.primary} />
          <Text style={s.title}>Get In Touch</Text>
          <Text style={s.sub}>We'd love to hear from you. Reach out for reservations, inquiries, or feedback!</Text>
        </View>

        {/* Quick Info */}
        <View style={s.infoRow}>
          <TouchableOpacity style={s.infoChip}>
            <Ionicons name="call-outline" size={18} color={COLORS.gray700} />
            <Text style={s.infoText}>+91 522 404 4777</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.infoChip}>
            <Ionicons name="time-outline" size={18} color={COLORS.gray700} />
            <Text style={s.infoText}>12:30 - 10:30 PM</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={s.formCard}>
          <Text style={s.label}>Name *</Text>
          <TextInput style={s.input} value={form.name} onChangeText={v => update('name', v)}
            placeholder="Your name" placeholderTextColor={COLORS.gray400} />

          <Text style={s.label}>Email *</Text>
          <TextInput style={s.input} value={form.email} onChangeText={v => update('email', v)}
            placeholder="Your email" placeholderTextColor={COLORS.gray400}
            keyboardType="email-address" autoCapitalize="none" />

          <Text style={s.label}>Phone</Text>
          <TextInput style={s.input} value={form.phone} onChangeText={v => update('phone', v)}
            placeholder="Your phone (optional)" placeholderTextColor={COLORS.gray400}
            keyboardType="phone-pad" />

          <Text style={s.label}>Message *</Text>
          <TextInput style={[s.input, s.textArea]} value={form.message} onChangeText={v => update('message', v)}
            placeholder="How can we help you?" placeholderTextColor={COLORS.gray400}
            multiline numberOfLines={5} textAlignVertical="top" />

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.black} />
            ) : (
              <>
                <Ionicons name="send" size={18} color={COLORS.black} />
                <Text style={s.submitText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: SIZES.md, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: SIZES.lg },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900, marginTop: SIZES.sm },
  sub: { fontSize: 13, color: COLORS.gray500, textAlign: 'center', marginTop: 4, lineHeight: 19 },

  infoRow: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.lg },
  infoChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusSm,
    paddingVertical: 12, paddingHorizontal: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.gray200, justifyContent: 'center',
  },
  infoText: { fontSize: 12, fontWeight: '500', color: COLORS.gray700 },

  formCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.gray100,
  },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray800, marginBottom: 6, marginTop: SIZES.sm },
  input: {
    borderWidth: 1, borderColor: COLORS.gray200, borderRadius: SIZES.radiusSm,
    paddingHorizontal: SIZES.sm, paddingVertical: 10, fontSize: 14, color: COLORS.gray800,
  },
  textArea: { minHeight: 110 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm,
    paddingVertical: 14, marginTop: SIZES.lg,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: COLORS.black },
});
