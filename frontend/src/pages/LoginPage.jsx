import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Gift } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import apiClient from '../services/api';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    referral_code: '',
  });

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', loginForm);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Login successful!');
      navigate(response.data.user?.role === 'admin' ? '/admin' : '/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/register', signupForm);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-white mb-2">
            Dastarkhwan
          </h1>
          <p className="text-[#64748b]">Authentic Mughlai & Awadhi Cuisine</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {isLogin ? (
            <>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6">Welcome Back</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="text-[#0f172a]">Email Address</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-[#64748b]" />
                    <Input
                      type="email"
                      name="email"
                      placeholder="your@email.com"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#0f172a]">Password</Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-[#64748b]" />
                    <Input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      required
                      minLength={8}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white py-2 rounded-lg font-semibold transition-all"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-[#64748b]">
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setSignupForm({ name: '', email: '', password: '', phone: '' });
                    }}
                    className="text-[#0f172a] font-semibold hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#0f172a] mb-6">Create Account</h2>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label className="text-[#0f172a]">Full Name</Label>
                  <div className="relative mt-2">
                    <User className="absolute left-3 top-3 w-5 h-5 text-[#64748b]" />
                    <Input
                      type="text"
                      name="name"
                      placeholder="Your name"
                      value={signupForm.name}
                      onChange={handleSignupChange}
                      required
                      minLength={2}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#0f172a]">Email Address</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-[#64748b]" />
                    <Input
                      type="email"
                      name="email"
                      placeholder="your@email.com"
                      value={signupForm.email}
                      onChange={handleSignupChange}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#0f172a]">Password</Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-[#64748b]" />
                    <Input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={handleSignupChange}
                      required
                      minLength={8}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#0f172a]">Phone (Optional)</Label>
                  <div className="relative mt-2">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-[#64748b]" />
                    <Input
                      type="tel"
                      name="phone"
                      placeholder="+91 XXXXX XXXXX"
                      value={signupForm.phone}
                      onChange={handleSignupChange}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#0f172a]">Referral Code (Optional)</Label>
                  <div className="relative mt-2">
                    <Gift className="absolute left-3 top-3 w-5 h-5 text-[#64748b]" />
                    <Input
                      type="text"
                      name="referral_code"
                      placeholder="e.g. MUGHAL-RAHUL-A3X7"
                      value={signupForm.referral_code}
                      onChange={handleSignupChange}
                      className="pl-10 uppercase"
                    />
                  </div>
                  <p className="text-xs text-[#64748b] mt-1">Have a friend's code? Both of you get ₹100 off!</p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white py-2 rounded-lg font-semibold transition-all"
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-[#64748b]">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setLoginForm({ email: '', password: '' });
                    }}
                    className="text-[#0f172a] font-semibold hover:underline"
                  >
                    Login
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[#64748b] mt-6">
          <Link to="/" className="hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
