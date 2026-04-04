import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X, Phone, Clock, MapPin, LogOut, User, ShoppingCart, Calendar, Gift, BarChart3, Truck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { cartApi, restaurantApi } from '../services/api';
import { scrollToElement } from '../lib/smoothScroll';
import { safeGetJSON } from '../lib/safeStorage';

const Header = ({ hideNav }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartBounce, setCartBounce] = useState(false);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const abortRef = useRef(null);
  const scrollTicking = useRef(false);
  const bounceTimer = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollTicking.current) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50);
          scrollTicking.current = false;
        });
        scrollTicking.current = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Check if user is logged in
    const userData = safeGetJSON('user');
    if (userData) {
      setUser(userData);
      fetchCartCount();
    }

    // Fetch restaurant info from API
    const controller = new AbortController();
    abortRef.current = controller;
    fetchRestaurantInfo(controller.signal);

    // Listen for cart-updated events from Menu or other components
    const handleCartUpdate = (e) => {
      const newCount = e.detail?.count ?? 0;
      setCartCount(newCount);
      // Trigger bounce animation
      setCartBounce(true);
      clearTimeout(bounceTimer.current);
      bounceTimer.current = setTimeout(() => setCartBounce(false), 600);
    };
    window.addEventListener('cart-updated', handleCartUpdate);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('cart-updated', handleCartUpdate);
      controller.abort();
      clearTimeout(bounceTimer.current);
    };
  }, []);

  const fetchRestaurantInfo = async (signal) => {
    try {
      const data = await restaurantApi.getInfo();
      if (!signal?.aborted) setRestaurantInfo(data);
    } catch (error) {
      if (!signal?.aborted) console.error('Failed to fetch restaurant info:', error);
    }
  };

  const fetchCartCount = async () => {
    try {
      const data = await cartApi.getCart();
      const count = (data.items || []).reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(count);
    } catch (error) {
      console.error('Failed to fetch cart count:', error);
    }
  };

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About Us', href: '#about' },
    { name: 'Menu', href: '#menu' },
    { name: 'Experience', href: '#experience' },
    { name: 'Contact', href: '#contact' },
  ];

  const scrollToSection = useCallback((href) => {
    setIsMenuOpen(false);
    if (location.pathname !== '/') {
      // Navigate to home first, then scroll after page renders
      navigate('/');
      setTimeout(() => scrollToElement(href), 150);
    } else {
      scrollToElement(href);
    }
  }, [location.pathname, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-[#0f172a] text-white py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
          <div className="flex items-center gap-6">
            {restaurantInfo?.contact && (
              <>
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {restaurantInfo.contact.phone}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {restaurantInfo.contact.hours.weekdays}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Kaiserbagh, Lucknow
            </div>
            {user ? (
              <div className="flex items-center gap-3">
                <span>Welcome, {user.name}!</span>
                <button
                  onClick={() => navigate('/loyalty')}
                  className="flex items-center gap-1 hover:text-[#ECEC75] transition-colors text-xs"
                >
                  <Gift className="w-4 h-4" />
                  Loyalty
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-1 hover:text-[#ECEC75] transition-colors text-xs"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Admin
                  </button>
                )}
                {user?.role === 'delivery_agent' && (
                  <button
                    onClick={() => navigate('/delivery-dashboard')}
                    className="flex items-center gap-1 hover:text-[#ECEC75] transition-colors text-xs"
                  >
                    <Truck className="w-4 h-4" />
                    Deliveries
                  </button>
                )}
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-1 hover:text-[#ECEC75] transition-colors text-xs"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 hover:text-[#ECEC75] transition-colors text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1 hover:text-[#ECEC75] transition-colors text-xs"
              >
                <User className="w-4 h-4" />
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      {!hideNav && <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-md'
            : 'bg-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <a
                href="#home"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('#home');
                }}
                className="flex flex-col"
              >
                <span className="font-serif text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight">
                  The Mughal's
                </span>
                <span className="text-xs md:text-sm text-[#64748b] tracking-widest uppercase">
                  Dastarkhwan
                </span>
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.href);
                  }}
                  className="text-[#0f172a] hover:text-[#64748b] font-medium transition-colors duration-200 relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0f172a] transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Button
                onClick={() => scrollToSection('#menu-tabs')}
                className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 py-2 rounded-md font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Order Now
              </Button>
              <a
                href="https://www.zomato.com/lucknow/dastarkhwan-1-kaiserbagh/order"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white hover:bg-red-50 border border-red-200 px-3 py-2 rounded-md font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center font-bold text-white text-xs">Z</div>
                <span className="text-red-600 text-sm">Zomato</span>
              </a>
              <a
                href="https://www.swiggy.com/city/lucknow/mughlai-dastarkhwan-mulayam-nagar-gomti-nagar-rest610859"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white hover:bg-orange-50 border border-orange-200 px-3 py-2 rounded-md font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center font-bold text-white text-xs">S</div>
                <span className="text-orange-600 text-sm">Swiggy</span>
              </a>
              <button
                onClick={() => navigate('/cart')}
                className="relative flex items-center gap-1.5 bg-white hover:bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600 text-sm">Cart</span>
                {cartCount > 0 && (
                  <span
                    className={`absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center transition-transform ${
                      cartBounce ? 'animate-bounce scale-125' : ''
                    }`}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => navigate('/reservations')}
                className="flex items-center gap-1.5 bg-white hover:bg-blue-50 border border-blue-200 px-3 py-2 rounded-md font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 text-sm">Reservation</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-md text-[#0f172a] hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(link.href);
                }}
                className="block text-[#0f172a] hover:text-[#64748b] font-medium py-2 transition-colors duration-200"
              >
                {link.name}
              </a>
            ))}
            <Button
              onClick={() => scrollToSection('#menu-tabs')}
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white mt-4"
            >
              Order Now
            </Button>
            <button
              onClick={() => { navigate('/cart'); setIsMenuOpen(false); }}
              className="relative flex items-center gap-2 w-full text-[#0f172a] hover:text-[#64748b] font-medium py-2 transition-colors duration-200 mt-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Cart
              {cartCount > 0 && (
                <span
                  className={`bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center transition-transform ${
                    cartBounce ? 'animate-bounce scale-125' : ''
                  }`}
                >
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { navigate('/reservations'); setIsMenuOpen(false); }}
              className="flex items-center gap-2 w-full text-[#0f172a] hover:text-[#64748b] font-medium py-2 transition-colors duration-200"
            >
              <Calendar className="w-5 h-5" />
              Reservation
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}
                className="flex items-center gap-2 w-full text-[#0f172a] hover:text-[#64748b] font-medium py-2 transition-colors duration-200"
              >
                <BarChart3 className="w-5 h-5" />
                Admin Dashboard
              </button>
            )}
            {user?.role === 'delivery_agent' && (
              <button
                onClick={() => { navigate('/delivery-dashboard'); setIsMenuOpen(false); }}
                className="flex items-center gap-2 w-full text-[#0f172a] hover:text-[#64748b] font-medium py-2 transition-colors duration-200"
              >
                <Truck className="w-5 h-5" />
                My Deliveries
              </button>
            )}
          </nav>
        </div>
      </header>}
    </>
  );
};

export default Header;