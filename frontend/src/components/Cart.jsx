import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartApi, cartApi } from '../services/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem('user')); } catch { /* ignore */ }
    if (!parsed) {
      toast.error('Please login to view cart');
      navigate('/login');
      return;
    }
    setUser(parsed);
    fetchCart();
  }, [navigate]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const data = await cartApi.getCart();
      setCartItems(data.items || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    const previousItems = [...cartItems];
    // Optimistic update
    setCartItems((prev) =>
      prev.map((item) =>
        item.item_id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
    try {
      await cartApi.updateQuantity(itemId, newQuantity);
      toast.success('Quantity updated');
    } catch (error) {
      // Rollback on failure
      setCartItems(previousItems);
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await cartApi.removeFromCart(itemId);
      setCartItems((prev) => prev.filter((item) => item.item_id !== itemId));
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-slate-900">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-500 text-lg mb-4">Your cart is empty</p>
            <Button onClick={() => navigate('/')} className="bg-amber-600 hover:bg-amber-700">
              Continue Shopping
            </Button>
          </Card>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-4 mb-6">
              {cartItems.map((item) => (
                <Card key={item.item_id} className="p-4">
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-slate-900">{item.name}</h3>
                      <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">₹{item.price}</Badge>
                        {item.is_veg && <Badge className="bg-green-100 text-green-800">Veg</Badge>}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.item_id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="p-1 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.item_id, item.quantity + 1)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Subtotal and Remove */}
                    <div className="text-right">
                      <p className="font-bold text-lg text-slate-900">₹{item.price * item.quantity}</p>
                      <button
                        onClick={() => handleRemoveItem(item.item_id)}
                        className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Separator className="my-6" />

            {/* Order Summary */}
            <Card className="p-6 mb-6 bg-white border-2">
              <h2 className="text-xl font-bold mb-4 text-slate-900">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold">₹{calculateTotal()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Service Charges</span>
                  <span className="font-semibold">₹{Math.round(calculateTotal() * 0.05)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-bold text-amber-600">₹{calculateTotal() + Math.round(calculateTotal() * 0.05)}</span>
                </div>
              </div>
            </Card>

            {/* Checkout Button */}
            <div className="flex gap-4">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="flex-1"
              >
                Continue Shopping
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
