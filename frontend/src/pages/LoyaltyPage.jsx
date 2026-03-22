import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { loyaltyApi } from '../services/api';
import { Gift, Zap, TrendingUp, Ticket, Crown } from 'lucide-react';

const LoyaltyPage = () => {
  const [loyaltyStatus, setLoyaltyStatus] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    setLoading(true);
    try {
      const [statusData, couponsData] = await Promise.all([
        loyaltyApi.getStatus(),
        loyaltyApi.getAvailableCoupons()
      ]);
      setLoyaltyStatus(statusData);
      setCoupons(couponsData);
    } catch (error) {
      console.error('Error loading loyalty data:', error);
      toast.error('Failed to load loyalty information');
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tier) => {
    const icons = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '👑'
    };
    return icons[tier] || '⭐';
  };

  const getTierColor = (tier) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800 border-amber-300',
      silver: 'bg-slate-100 text-slate-800 border-slate-300',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      platinum: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  if (!loyaltyStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading loyalty information...</p>
        </div>
      </div>
    );
  }

  const benefits = loyaltyStatus.tier_benefits;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-8 h-8 text-amber-700" />
            Loyalty Program
          </h1>
          <p className="text-gray-600">Earn points and enjoy exclusive rewards</p>
        </div>

        {/* Tier Status */}
        <Card className={`mb-8 border-2 ${getTierColor(loyaltyStatus.member_tier)}`}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-4xl">{getTierIcon(loyaltyStatus.member_tier)}</span>
                  <div>
                    <CardTitle>{benefits.name} Member</CardTitle>
                    <CardDescription>{benefits.description}</CardDescription>
                  </div>
                </div>
              </div>
              <Badge className="text-lg py-2 px-3">{loyaltyStatus.member_tier.toUpperCase()}</Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Points Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Current Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{loyaltyStatus.points}</div>
              <p className="text-xs text-gray-500 mt-1">Available to redeem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Lifetime Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{loyaltyStatus.lifetime_spent}</div>
              <p className="text-xs text-gray-500 mt-1">Total purchases</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Tier Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loyaltyStatus.tier_points}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-amber-600 h-2 rounded-full" 
                  style={{ width: `${loyaltyStatus.tier_points}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">To next tier</p>
            </CardContent>
          </Card>
        </div>

        {/* Benefits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎁</div>
                <div>
                  <p className="font-semibold text-sm">Points Multiplier</p>
                  <p className="text-sm text-gray-600">{benefits.points_multiplier}x points on every purchase</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">🎂</div>
                <div>
                  <p className="font-semibold text-sm">Birthday Bonus</p>
                  <p className="text-sm text-gray-600">{benefits.birthday_bonus} bonus points</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-2xl">👥</div>
                <div>
                  <p className="font-semibold text-sm">Referral Bonus</p>
                  <p className="text-sm text-gray-600">{benefits.referral_bonus} points per referral</p>
                </div>
              </div>

              {benefits.special_perks && (
                <div>
                  <p className="font-semibold text-sm mb-2">Exclusive Perks</p>
                  <ul className="space-y-1">
                    {benefits.special_perks.map((perk, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-amber-600">✓</span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Coupons */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Available Coupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coupons.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No coupons available right now</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coupons.map((coupon, idx) => (
                  <div key={idx} className="border-2 border-dashed border-amber-300 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-lg text-amber-600">{coupon.code}</p>
                        <p className="text-sm text-gray-600">{coupon.description}</p>
                      </div>
                      <Badge variant="outline" className="bg-amber-50">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Min. order: ₹{coupon.min_order_amount}
                    </p>
                    <Button
                      size="sm"
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      onClick={() => {
                        navigator.clipboard.writeText(coupon.code);
                        toast.success(`Coupon ${coupon.code} copied to clipboard!`);
                      }}
                    >
                      Copy Code
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="font-semibold">Earn Points</p>
                  <p className="text-sm text-gray-600">Get 1 point for every ₹10 you spend</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="font-semibold">Unlock Tiers</p>
                  <p className="text-sm text-gray-600">Reach higher tiers for better multipliers and perks</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="font-semibold">Redeem Rewards</p>
                  <p className="text-sm text-gray-600">Apply coupon codes at checkout for discounts</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoyaltyPage;
