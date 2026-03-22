import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartApi, loyaltyApi, paymentsApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [formData, setFormData] = useState({
    table_number: '',
    phone: '',
    order_type: 'dine-in',
    notes: '',
    payment_method: 'cod',
  });

  useEffect(() => {
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem('user')); } catch { /* ignore */ }
    if (!parsed) {
      toast.error('Please login to checkout');
      navigate('/login');
      return;
    }
    setUser(parsed);
    fetchCart();
  }, [navigate]);

  const fetchCart = async () => {
    try {
      const data = await cartApi.getCart();
      setCartItems(data.items || []);
      if (!data.items || data.items.length === 0) {
        toast.info('Your cart is empty');
        navigate('/');
      }
    } catch (error) {
      toast.error('Failed to load cart');
      navigate('/');
    }
  };

  const loadRazorpayScript = (() => {
    let cached = null;
    return () => {
      if (cached) return cached;
      cached = new Promise((resolve) => {
        if (window.Razorpay) { resolve(true); return; }
        const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existing) { existing.addEventListener('load', () => resolve(true)); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => { cached = null; resolve(false); };
        document.body.appendChild(script);
      });
      return cached;
    };
  })();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.phone) {
      toast.error('Please enter your phone number');
      return;
    }

    if (formData.phone.length < 10) {
      toast.error('Phone number must be at least 10 digits');
      return;
    }

    if (formData.order_type === 'dine-in' && !formData.table_number) {
      toast.error('Please enter your table number');
      return;
    }

    const orderData = {
      items: cartItems.map((item) => ({
        item_id: item.item_id,
        quantity: item.quantity,
      })),
      table_number: formData.table_number ? parseInt(formData.table_number) : null,
      phone: formData.phone,
      order_type: formData.order_type,
      notes: formData.notes,
      coupon_code: appliedCoupon,
      discount_amount: discountAmount,
      payment_method: formData.payment_method,
    };

    if (formData.payment_method !== 'cod') {
      try {
        setLoading(true);
        const amount = calculateTotal();
        const paymentInit = await paymentsApi.createOrder({
          amount,
          currency: 'INR',
          notes: {
            user_email: user?.email || '',
            order_type: formData.order_type,
          },
        });

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error('Failed to load Razorpay. Please try again.');
          setLoading(false);
          return;
        }

        const options = {
          key: paymentInit.key_id,
          amount: paymentInit.order.amount,
          currency: paymentInit.order.currency,
          name: "The Mughal's Dastarkhwan",
          description: 'Order Payment',
          order_id: paymentInit.order.id,
          prefill: {
            name: user?.name || 'Customer',
            email: user?.email || '',
            contact: formData.phone,
          },
          theme: {
            color: '#D97706',
          },
          handler: async (response) => {
            try {
              await paymentsApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              await cartApi.checkout(orderData);
              toast.success('Payment successful! Order placed.');
              setTimeout(() => {
                navigate('/profile');
              }, 1500);
            } catch (error) {
              console.error('Payment verification error:', error);
              toast.error('Payment verification failed. Please contact support.');
            } finally {
              setLoading(false);
            }
          },
          modal: {
            ondismiss: () => setLoading(false),
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', () => {
          toast.error('Payment failed. Please try again.');
          setLoading(false);
        });
        razorpay.open();
      } catch (error) {
        console.error('Payment init error:', error);
        toast.error(error.response?.data?.detail || 'Failed to start payment');
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      await cartApi.checkout(orderData);

      toast.success('Order placed successfully!');
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateTax = (subtotal) => {
    return Math.round(subtotal * 0.05);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const total = subtotal + 50 + tax - discountAmount;
    return Math.max(0, total);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Enter a coupon code');
      return;
    }
    if (validatingCoupon) return;

    try {
      setValidatingCoupon(true);
      const subtotal = calculateSubtotal();
      const result = await loyaltyApi.validateCoupon(couponCode.trim(), subtotal);
      setDiscountAmount(result.discount_amount || 0);
      setAppliedCoupon(result.code);
      toast.success(`Coupon applied: ₹${result.discount_amount} off`);
    } catch (error) {
      setDiscountAmount(0);
      setAppliedCoupon(null);
      toast.error(error.response?.data?.detail || 'Invalid coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-slate-900">Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Order Details Form */}
          <div className="md:col-span-2">
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-slate-900">Order Details</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="order_type" className="block mb-2 font-semibold">
                    Order Type *
                  </Label>
                  <select
                    id="order_type"
                    name="order_type"
                    value={formData.order_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="dine-in">Dine-in</option>
                    <option value="takeaway">Takeaway</option>
                  </select>
                </div>

                {formData.order_type === 'dine-in' && (
                  <div>
                    <Label htmlFor="table_number" className="block mb-2 font-semibold">
                      Table Number *
                    </Label>
                    <Input
                      type="number"
                      id="table_number"
                      name="table_number"
                      value={formData.table_number}
                      onChange={handleChange}
                      placeholder="Enter your table number"
                      min="1"
                      max="100"
                      required={formData.order_type === 'dine-in'}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="phone" className="block mb-2 font-semibold">
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="block mb-2 font-semibold">
                    Special Instructions
                  </Label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Any special requests or dietary restrictions?"
                    rows="4"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <Label className="block mb-2 font-semibold">Payment Method *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${formData.payment_method === 'cod' ? 'border-amber-500 bg-amber-50' : 'border-slate-300'}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="cod"
                        checked={formData.payment_method === 'cod'}
                        onChange={handleChange}
                      />
                      <div>
                        <p className="font-semibold text-slate-900">Cash on Delivery</p>
                        <p className="text-xs text-slate-500">Pay at the counter/door</p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${formData.payment_method === 'gpay' ? 'border-amber-500 bg-amber-50' : 'border-slate-300'}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="gpay"
                        checked={formData.payment_method === 'gpay'}
                        onChange={handleChange}
                      />
                      <div>
                        <p className="font-semibold text-slate-900">Google Pay</p>
                        <p className="text-xs text-slate-500">UPI payment</p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${formData.payment_method === 'paytm' ? 'border-amber-500 bg-amber-50' : 'border-slate-300'}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="paytm"
                        checked={formData.payment_method === 'paytm'}
                        onChange={handleChange}
                      />
                      <div>
                        <p className="font-semibold text-slate-900">Paytm</p>
                        <p className="text-xs text-slate-500">UPI payment</p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${formData.payment_method === 'phonepe' ? 'border-amber-500 bg-amber-50' : 'border-slate-300'}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="phonepe"
                        checked={formData.payment_method === 'phonepe'}
                        onChange={handleChange}
                      />
                      <div>
                        <p className="font-semibold text-slate-900">PhonePe</p>
                        <p className="text-xs text-slate-500">UPI payment</p>
                      </div>
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg mt-6"
                >
                  {loading ? 'Placing Order...' : 'Place Order'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="p-6 sticky top-20">
              <h2 className="text-xl font-bold mb-4 text-slate-900">Order Summary</h2>

              {/* Items List */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.item_id} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-semibold text-slate-900">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Total */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{calculateSubtotal()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charges</span>
                  <span>₹50</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (5%)</span>
                  <span>₹{calculateTax(calculateSubtotal())}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount {appliedCoupon ? `(${appliedCoupon})` : ''}</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <Separator className="my-3" />
                <div className="flex justify-between text-lg font-bold text-amber-600">
                  <span>Total</span>
                  <span>₹{calculateTotal()}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="coupon" className="block text-sm font-semibold">Have a coupon?</Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                  />
                  <Button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {validatingCoupon ? 'Applying...' : 'Apply'}
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => navigate('/cart')}
                variant="outline"
                className="w-full mt-4"
              >
                Back to Cart
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
