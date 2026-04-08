import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartApi, loyaltyApi, paymentsApi, deliveryApi, authApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { Truck, MapPin, Clock, LocateFixed } from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isDirectDiscount, setIsDirectDiscount] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [deliveryPartner, setDeliveryPartner] = useState(null);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [deliveryEstimates, setDeliveryEstimates] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [loadingEstimates, setLoadingEstimates] = useState(false);
  const [estimatesFetched, setEstimatesFetched] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [showSaveAddressPrompt, setShowSaveAddressPrompt] = useState(false);
  const [saveAddressLabel, setSaveAddressLabel] = useState('Home');
  const [savingDetectedAddress, setSavingDetectedAddress] = useState(false);
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
    // Load saved addresses
    authApi.getProfile().then(profile => {
      const addrs = profile.addresses || [];
      setSavedAddresses(addrs);
      const defaultAddr = addrs.find(a => a.is_default);
      if (defaultAddr) setDeliveryAddress(defaultAddr.address + (defaultAddr.landmark ? `, ${defaultAddr.landmark}` : ''));
    }).catch(() => {});
  }, [navigate]);

  const fetchCart = async () => {
    try {
      const data = await cartApi.getCart();
      const items = data.items || [];
      setCartItems(items);
      if (!items || items.length === 0) {
        toast.info('Your cart is empty');
        navigate('/');
        return;
      }
      // Auto-apply direct order discount
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      try {
        const result = await loyaltyApi.autoApplyDirect(subtotal);
        if (result.applied) {
          setDiscountAmount(result.discount_amount);
          setAppliedCoupon(result.code);
          setIsDirectDiscount(true);
          toast.success(`Direct order discount applied: ₹${result.discount_amount} off!`);
        }
      } catch (err) {
        console.error('Auto-apply direct discount failed:', err);
      }
    } catch (error) {
      toast.error('Failed to load cart');
      navigate('/');
    }
  };

  // Restaurant location: Kaiserbagh, Lucknow
  const RESTAURANT_COORDS = { lat: 26.8467, lng: 80.9462 };

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Fetch delivery estimates using GPS location (without changing address)
  const fetchEstimatesForLocation = (showLoading = true) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        reject();
        return;
      }
      if (showLoading) setLoadingEstimates(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const dist = haversineDistance(latitude, longitude, RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng);
            const rounded = Math.round(dist * 10) / 10;
            setDeliveryDistance(rounded);

            const result = await deliveryApi.estimate(rounded);
            const estimates = result.estimates || [];
            setDeliveryEstimates(estimates);
            setEstimatesFetched(true);
            if (estimates.length > 0) {
              setDeliveryType(estimates[0].type);
              setDeliveryPartner(estimates[0].partner);
              setDeliveryCharge(estimates[0].charge);
            }
            resolve(estimates);
          } catch (err) {
            console.error('Failed to fetch delivery estimates:', err);
            toast.error('Failed to get delivery estimates');
            reject(err);
          } finally {
            setLoadingEstimates(false);
          }
        },
        (error) => {
          setLoadingEstimates(false);
          if (error.code === error.PERMISSION_DENIED) {
            toast.error('Location access denied. Please enable location permission.');
          } else {
            toast.error('Unable to detect your location. Please try again.');
          }
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const dist = haversineDistance(latitude, longitude, RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng);
        const rounded = Math.round(dist * 10) / 10; // 1 decimal
        setDeliveryDistance(rounded);

        // Reverse geocode to get a readable address
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
          });
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.display_name) {
              setDeliveryAddress(geoData.display_name);
              // Show save prompt if this address isn't already saved
              const alreadySaved = savedAddresses.some(a => a.address === geoData.display_name);
              if (!alreadySaved) {
                setShowSaveAddressPrompt(true);
              }
            }
          }
        } catch (geoErr) {
          console.error('Reverse geocoding failed:', geoErr);
          // Not critical — user can still type the address manually
        }

        // Auto-fetch estimates
        try {
          setLoadingEstimates(true);
          const result = await deliveryApi.estimate(rounded);
          const estimates = result.estimates || [];
          setDeliveryEstimates(estimates);
          setEstimatesFetched(true);
          if (estimates.length > 0) {
            setDeliveryType(estimates[0].type);
            setDeliveryPartner(estimates[0].partner);
            setDeliveryCharge(estimates[0].charge);
          }
        } catch (err) {
          console.error('Failed to fetch delivery estimates:', err);
          toast.error('Failed to get delivery estimates');
        } finally {
          setLoadingEstimates(false);
          setLocatingUser(false);
        }
      },
      (error) => {
        setLocatingUser(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location access denied. Please enable location permission and try again.');
        } else {
          toast.error('Unable to detect your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveDetectedAddress = async () => {
    if (!deliveryAddress.trim()) return;
    try {
      setSavingDetectedAddress(true);
      const currentAddresses = savedAddresses;
      const newAddress = {
        label: saveAddressLabel.trim() || 'Home',
        address: deliveryAddress.trim(),
        landmark: '',
        is_default: currentAddresses.length === 0,
      };
      const updated = await authApi.updateProfile({
        addresses: [...currentAddresses, newAddress],
      });
      setSavedAddresses(updated.addresses || []);
      setShowSaveAddressPrompt(false);
      toast.success('Address saved to your profile!');
    } catch (error) {
      toast.error('Failed to save address');
    } finally {
      setSavingDetectedAddress(false);
    }
  };

  // Reset delivery state when switching away from delivery
  useEffect(() => {
    if (formData.order_type !== 'delivery') {
      setDeliveryEstimates([]);
      setEstimatesFetched(false);
      setDeliveryType('pickup');
      setDeliveryPartner(null);
      setDeliveryCharge(0);
      setDeliveryAddress('');
      setDeliveryDistance(null);
      setDeliveryNote('');
    }
  }, [formData.order_type]);

  const handleDeliverySelect = (estimate) => {
    setDeliveryType(estimate.type);
    setDeliveryPartner(estimate.partner);
    setDeliveryCharge(estimate.charge);
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

    if (formData.order_type === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }

    if (formData.order_type === 'delivery') {
      if (!estimatesFetched) {
        toast.error('Please get delivery options before placing order');
        return;
      }
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
      delivery_type: formData.order_type === 'delivery' ? deliveryType : null,
      delivery_partner: formData.order_type === 'delivery' ? deliveryPartner : null,
      delivery_charge: formData.order_type === 'delivery' ? deliveryCharge : 0,
      delivery_address: formData.order_type === 'delivery' ? deliveryAddress : null,
      delivery_note: formData.order_type === 'delivery' ? deliveryNote : null,
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

  const getDeliveryCharge = () => {
    if (formData.order_type === 'dine-in') return 0;
    if (formData.order_type === 'takeaway') return 0;
    // delivery
    return deliveryCharge;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const total = subtotal + getDeliveryCharge() + tax - discountAmount;
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
      const result = await loyaltyApi.validateCoupon(couponCode.trim(), subtotal, 'website');
      setDiscountAmount(result.discount_amount || 0);
      setAppliedCoupon(result.code);
      setIsDirectDiscount(false);
      toast.success(`Coupon applied: ₹${result.discount_amount} off`);
    } catch (error) {
      // Don't clear auto-applied direct discount on manual coupon failure
      if (!isDirectDiscount) {
        setDiscountAmount(0);
        setAppliedCoupon(null);
      }
      toast.error(error.response?.data?.detail || 'Invalid coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-slate-900">Checkout</h1>

        {isDirectDiscount && discountAmount > 0 && (
          <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-emerald-800">Direct Order Discount Applied!</p>
              <p className="text-sm text-emerald-600">
                You're saving <span className="font-bold">₹{discountAmount}</span> by ordering directly from our website instead of Swiggy/Zomato.
              </p>
            </div>
          </div>
        )}

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
                    onChange={(e) => {
                      handleChange(e);
                      if (e.target.value !== 'delivery') {
                        setDeliveryType('pickup');
                        setDeliveryPartner(null);
                        setDeliveryCharge(0);
                      } else if (e.target.value === 'delivery' && !estimatesFetched) {
                        // Auto-fetch delivery estimates when switching to delivery
                        fetchEstimatesForLocation();
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="dine-in">🍽️ Dine-in</option>
                    <option value="takeaway">🥡 Takeaway</option>
                    <option value="delivery">🚚 Delivery</option>
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

                {/* Delivery Options */}
                {formData.order_type === 'delivery' && (
                  <div className="space-y-4">
                    {/* Step 1: Delivery Address */}
                    <div>
                      <Label className="block mb-2 font-semibold">Delivery Address *</Label>
                      {savedAddresses.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {savedAddresses.map((addr) => (
                            <label
                              key={addr.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                                deliveryAddress === (addr.address + (addr.landmark ? `, ${addr.landmark}` : ''))
                                  ? 'border-amber-500 bg-amber-50'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="saved_address"
                                checked={deliveryAddress === (addr.address + (addr.landmark ? `, ${addr.landmark}` : ''))}
                                onChange={() => {
                                  setDeliveryAddress(addr.address + (addr.landmark ? `, ${addr.landmark}` : ''));
                                  // Auto-fetch delivery estimates when a saved address is selected
                                  if (!estimatesFetched) {
                                    fetchEstimatesForLocation();
                                  }
                                }}
                                className="accent-amber-600 mt-1"
                              />
                              <div>
                                <p className="font-medium text-sm text-slate-900">{addr.label}</p>
                                <p className="text-xs text-slate-600">{addr.address}</p>
                                {addr.landmark && <p className="text-xs text-slate-400">📍 {addr.landmark}</p>}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                      <textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        rows="2"
                        placeholder="Enter full delivery address or select a saved address above"
                      />
                    </div>

                    {/* Step 2: Detect location to calculate distance */}
                    <Button
                      type="button"
                      onClick={detectLocation}
                      disabled={locatingUser || loadingEstimates}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2"
                    >
                      {locatingUser || loadingEstimates ? (
                        <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Detecting location & fetching prices...</>
                      ) : estimatesFetched ? (
                        <><LocateFixed className="w-4 h-4" /> Re-detect My Location</>
                      ) : (
                        <><LocateFixed className="w-4 h-4" /> Use My Location for Delivery Pricing</>
                      )}
                    </Button>

                    {/* Distance indicator */}
                    {deliveryDistance !== null && (
                      <p className="text-sm text-slate-600 text-center">
                        📍 You are approximately <span className="font-bold text-amber-700">{deliveryDistance} km</span> from the restaurant
                      </p>
                    )}

                    {/* Save detected address prompt */}
                    {showSaveAddressPrompt && deliveryAddress && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800 mb-2">💾 Save this address for future orders?</p>
                        <div className="flex items-center gap-2">
                          <select
                            value={saveAddressLabel}
                            onChange={(e) => setSaveAddressLabel(e.target.value)}
                            className="text-sm border border-green-300 rounded px-2 py-1.5 bg-white"
                          >
                            <option value="Home">🏠 Home</option>
                            <option value="Work">🏢 Work</option>
                            <option value="Other">📍 Other</option>
                          </select>
                          <Button
                            type="button"
                            onClick={handleSaveDetectedAddress}
                            disabled={savingDetectedAddress}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm"
                            size="sm"
                          >
                            {savingDetectedAddress ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setShowSaveAddressPrompt(false)}
                            variant="outline"
                            size="sm"
                            className="text-sm"
                          >
                            Skip
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Delivery partner selection (shown after location detected) */}
                    {estimatesFetched && deliveryEstimates.length > 0 && (
                      <>
                        <Label className="block font-semibold">Choose Delivery Option *</Label>
                        <div className="space-y-2">
                          {deliveryEstimates.map((est) => (
                            <label
                              key={`${est.type}-${est.partner || 'self'}`}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                                deliveryType === est.type && deliveryPartner === est.partner
                                  ? 'border-amber-500 bg-amber-50 shadow-sm'
                                  : 'border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="delivery_option"
                                checked={deliveryType === est.type && deliveryPartner === est.partner}
                                onChange={() => handleDeliverySelect(est)}
                                className="accent-amber-600"
                              />
                              <span className="text-xl">{est.logo}</span>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">{est.name}</p>
                                <p className="text-xs text-slate-500">{est.description}</p>
                                {est.eta_breakdown && (
                                  <p className="text-xs text-slate-400 mt-0.5">{est.eta_breakdown}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-900">
                                  {est.charge === 0 ? 'FREE' : `₹${est.charge}`}
                                </p>
                                {est.eta_minutes > 0 && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                                    <Clock className="w-3 h-3" /> ~{est.eta_minutes} min
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </>
                    )}

                    {estimatesFetched && deliveryEstimates.length === 0 && (
                      <div className="text-center py-3 text-red-500 text-sm">
                        No delivery partners available for this distance ({deliveryDistance} km). Please choose Takeaway instead.
                      </div>
                    )}

                    {/* Delivery Note */}
                    {estimatesFetched && (
                      <div>
                        <Label htmlFor="delivery_note" className="block mb-2 font-semibold">
                          Delivery Note (optional)
                        </Label>
                        <Input
                          id="delivery_note"
                          value={deliveryNote}
                          onChange={(e) => setDeliveryNote(e.target.value)}
                          placeholder="e.g. Ring the bell, leave at door..."
                        />
                      </div>
                    )}
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
                {getDeliveryCharge() > 0 ? (
                  <div className="flex justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Delivery
                      {deliveryPartner && ` (${deliveryPartner.charAt(0).toUpperCase() + deliveryPartner.slice(1)})`}
                    </span>
                    <span>₹{getDeliveryCharge()}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery</span>
                    <span className="text-green-600 font-medium">
                      {formData.order_type === 'delivery' && deliveryType === 'pickup' ? 'Pickup - FREE' : formData.order_type === 'dine-in' ? 'Dine-in' : 'FREE'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Tax (5%)</span>
                  <span>₹{calculateTax(calculateSubtotal())}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span className="flex items-center gap-1">
                      {isDirectDiscount ? '🎉 Direct Order Discount' : `Discount`}
                      {appliedCoupon ? ` (${appliedCoupon})` : ''}
                    </span>
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
