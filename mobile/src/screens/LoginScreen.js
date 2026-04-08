import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, register } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', referral_code: '',
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) return Alert.alert('Error', 'Email & password required');
    if (isSignup && !form.name) return Alert.alert('Error', 'Name is required');
    setLoading(true);
    try {
      if (isSignup) {
        await register({
          name: form.name, email: form.email,
          phone: form.phone, password: form.password,
          referral_code: form.referral_code || undefined,
        });
      } else {
        await login(form.email, form.password);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <Text style={s.brand}>The Mughal's</Text>
          <Text style={s.brandSub}>DASTARKHWAN</Text>
          <Text style={s.subtitle}>Authentic Mughlai & Awadhi Cuisine</Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.title}>{isSignup ? 'Create Account' : 'Welcome Back'}</Text>

          {isSignup && (
            <View style={s.field}>
              <Ionicons name="person-outline" size={18} color={COLORS.gray400} />
              <TextInput style={s.input} placeholder="Full Name" value={form.name}
                onChangeText={v => set('name', v)} placeholderTextColor={COLORS.gray400} />
            </View>
          )}

          <View style={s.field}>
            <Ionicons name="mail-outline" size={18} color={COLORS.gray400} />
            <TextInput style={s.input} placeholder="Email" value={form.email}
              onChangeText={v => set('email', v)} keyboardType="email-address"
              autoCapitalize="none" placeholderTextColor={COLORS.gray400} />
          </View>

          {isSignup && (
            <View style={s.field}>
              <Ionicons name="call-outline" size={18} color={COLORS.gray400} />
              <TextInput style={s.input} placeholder="Phone" value={form.phone}
                onChangeText={v => set('phone', v)} keyboardType="phone-pad"
                placeholderTextColor={COLORS.gray400} />
            </View>
          )}

          <View style={s.field}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray400} />
            <TextInput style={s.input} placeholder="Password" value={form.password}
              onChangeText={v => set('password', v)} secureTextEntry
              placeholderTextColor={COLORS.gray400} />
          </View>

          {isSignup && (
            <View style={s.field}>
              <Ionicons name="gift-outline" size={18} color={COLORS.gray400} />
              <TextInput style={s.input} placeholder="Referral Code (optional)" value={form.referral_code}
                onChangeText={v => set('referral_code', v)} autoCapitalize="characters"
                placeholderTextColor={COLORS.gray400} />
            </View>
          )}

          <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color={COLORS.black} /> :
              <Text style={s.btnText}>{isSignup ? 'Sign Up' : 'Log In'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignup(!isSignup)} style={s.switchRow}>
            <Text style={s.switchText}>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={s.switchLink}>{isSignup ? 'Log In' : 'Sign Up'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray900 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SIZES.lg },
  header: { alignItems: 'center', marginBottom: SIZES.xl },
  brand: { fontSize: 32, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  brandSub: { fontSize: 14, fontWeight: '600', color: COLORS.gray400, letterSpacing: 4, marginTop: 2 },
  subtitle: { fontSize: 13, color: COLORS.gray500, marginTop: SIZES.sm },
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, padding: SIZES.lg },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray900, marginBottom: SIZES.lg, textAlign: 'center' },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.gray50,
    borderRadius: SIZES.radiusSm, paddingHorizontal: SIZES.md, marginBottom: SIZES.md, height: 50,
    borderWidth: 1, borderColor: COLORS.gray200,
  },
  input: { flex: 1, marginLeft: SIZES.sm, fontSize: 15, color: COLORS.gray800 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusSm, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: SIZES.sm,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  switchRow: { marginTop: SIZES.md, alignItems: 'center' },
  switchText: { fontSize: 14, color: COLORS.gray500 },
  switchLink: { color: COLORS.gray900, fontWeight: '600' },
});
