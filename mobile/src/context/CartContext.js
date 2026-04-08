import React, { createContext, useContext, useState, useCallback } from 'react';
import { cartApi } from '../services/api';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cartApi.getCart();
      setItems(data.items || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const addToCart = async (itemId, qty = 1) => {
    await cartApi.addToCart(itemId, qty);
    await fetchCart();
  };

  const updateQuantity = async (itemId, qty) => {
    await cartApi.updateQuantity(itemId, qty);
    await fetchCart();
  };

  const removeFromCart = async (itemId) => {
    await cartApi.removeFromCart(itemId);
    await fetchCart();
  };

  const clearCart = async () => {
    await cartApi.clearCart();
    setItems([]);
  };

  const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
  const count = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <CartContext.Provider value={{ items, loading, total, count, fetchCart, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
