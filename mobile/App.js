import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider, useCart } from './src/context/CartContext';
import { COLORS } from './src/constants/theme';
import { ordersApi } from './src/services/api';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import ReservationsScreen from './src/screens/ReservationsScreen';
import LoyaltyScreen from './src/screens/LoyaltyScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import ChatScreen from './src/screens/ChatScreen';
import AboutScreen from './src/screens/AboutScreen';
import ContactScreen from './src/screens/ContactScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import DeliveryDashboardScreen from './src/screens/DeliveryDashboardScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import TestimonialsScreen from './src/screens/TestimonialsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ACTIVE_STATUSES = ['placed', 'pending', 'accepted', 'confirmed', 'preparing', 'ready', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'assigned', 'accepted_by_agent'];

const STATUS_EMOJI = {
  placed: '📋', pending: '📋', accepted: '✅', confirmed: '✅',
  preparing: '👨‍🍳', ready: '🍽️', ready_for_pickup: '📦',
  picked_up: '🏍️', out_for_delivery: '🚚', assigned: '🔔', accepted_by_agent: '🏍️',
};

function ActiveOrderPopup() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const orders = await ordersApi.getOrders();
        const active = orders.find(o => ACTIVE_STATUSES.includes(o.status));
        setActiveOrder(active || null);
      } catch { setActiveOrder(null); }
    };
    check();
    const interval = setInterval(check, 20000);
    return () => clearInterval(interval);
  }, [user]);

  if (!activeOrder) return null;

  const emoji = STATUS_EMOJI[activeOrder.status] || '📋';
  const statusText = (activeOrder.status || '').replace(/_/g, ' ');

  return (
    <TouchableOpacity
      style={popupStyles.container}
      onPress={() => navigation.navigate('OrderDetail', { order: activeOrder })}
      activeOpacity={0.85}
    >
      <View style={popupStyles.dot} />
      <Text style={popupStyles.emoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={popupStyles.title}>
          Order #{(activeOrder.id || '').slice(0, 6).toUpperCase()}
        </Text>
        <Text style={popupStyles.status}>{statusText}</Text>
      </View>
      <Text style={popupStyles.track}>Track →</Text>
    </TouchableOpacity>
  );
}

function HomeTabs() {
  const { count } = useCart();
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.gray400,
          tabBarStyle: {
            backgroundColor: COLORS.gray900,
            borderTopWidth: 0,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ color, size }) => {
            const icons = { Home: 'restaurant', Cart: 'cart', ProfileTab: 'person' };
            return (
              <View>
                <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />
                {route.name === 'Cart' && count > 0 && (
                  <View style={{
                    position: 'absolute', top: -4, right: -8, backgroundColor: COLORS.red,
                    borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Ionicons name="ellipse" size={0} />
                    <View><Ionicons name="ellipse" size={0} /></View>
                  </View>
                )}
              </View>
            );
          },
          header: undefined,
        })}
        tabBar={(props) => (
          <View>
            <ActiveOrderPopup />
            <BottomTabBar {...props} />
          </View>
        )}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Menu' }} />
        <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarBadge: count || undefined }} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
      </Tab.Navigator>
    </View>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.gray900 }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: COLORS.gray900 },
      headerTintColor: COLORS.white,
      headerTitleStyle: { fontWeight: '700' },
      contentStyle: { backgroundColor: COLORS.gray50 },
    }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      ) : user.role === 'admin' ? (
        <>
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
          <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
          <Stack.Screen name="Reservations" component={ReservationsScreen} options={{ title: 'Reserve Table' }} />
          <Stack.Screen name="Loyalty" component={LoyaltyScreen} options={{ title: 'Loyalty & Rewards' }} />
          <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Reviews' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'AI Assistant' }} />
          <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About Us' }} />
          <Stack.Screen name="Contact" component={ContactScreen} options={{ title: 'Contact Us' }} />
          <Stack.Screen name="DeliveryDashboard" component={DeliveryDashboardScreen} options={{ title: 'Delivery Dashboard' }} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
          <Stack.Screen name="Testimonials" component={TestimonialsScreen} options={{ title: 'Testimonials' }} />
        </>
      ) : user.role === 'delivery_agent' ? (
        <>
          <Stack.Screen name="DeliveryDashboard" component={DeliveryDashboardScreen} options={{ title: 'Delivery Dashboard', headerShown: false }} />
          <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
          <Stack.Screen name="Testimonials" component={TestimonialsScreen} options={{ title: 'Testimonials' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
          <Stack.Screen name="Reservations" component={ReservationsScreen} options={{ title: 'Reserve Table' }} />
          <Stack.Screen name="Loyalty" component={LoyaltyScreen} options={{ title: 'Loyalty & Rewards' }} />
          <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ title: 'Reviews' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'AI Assistant' }} />
          <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About Us' }} />
          <Stack.Screen name="Contact" component={ContactScreen} options={{ title: 'Contact Us' }} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
          <Stack.Screen name="DeliveryDashboard" component={DeliveryDashboardScreen} options={{ title: 'Delivery Dashboard' }} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const popupStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray900,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  emoji: { fontSize: 20 },
  title: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  status: { fontSize: 12, color: '#94a3b8', textTransform: 'capitalize', marginTop: 1 },
  track: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
