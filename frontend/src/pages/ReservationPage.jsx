import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { reservationsApi } from '../services/api';
import { Calendar, Clock, Users, AlertCircle, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';

const ReservationPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    party_size: 2,
    guest_name: '',
    phone: '',
    email: '',
    special_requests: '',
  });

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Generate 7 days starting from today + weekOffset
  const dateCards = useMemo(() => {
    const days = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + weekOffset * 7);

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      // Skip past dates
      if (d < new Date(today.toDateString())) continue;
      days.push({
        date: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-IN', { month: 'short' }),
        isToday: d.toDateString() === today.toDateString(),
      });
    }
    return days;
  }, [weekOffset]);

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    if (formData.date) {
      fetchSlots(formData.date);
    }
  }, [formData.date]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const data = await reservationsApi.getReservations();
      setReservations(data);
    } catch (error) {
      toast.error('Failed to fetch reservations');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (date) => {
    try {
      setSlotsLoading(true);
      const data = await reservationsApi.getSlots(date);
      setSlots(data.slots || []);
    } catch (error) {
      console.error('Failed to load slots:', error);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const sanitize = (str) => str.replace(/[<>"'&]/g, '');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['guest_name', 'phone', 'email', 'special_requests'].includes(name) ? sanitize(value) : value,
    }));
  };

  const selectDate = (date) => {
    setFormData((prev) => ({ ...prev, date, time: '' }));
  };

  const selectTime = (time) => {
    setFormData((prev) => ({ ...prev, time }));
  };

  const formatTime12h = (time24) => {
    const [h, m] = time24.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const getSlotStyle = (slot) => {
    if (slot.status === 'past' || slot.status === 'full') {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200';
    }
    if (slot.time === formData.time) {
      return 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300';
    }
    if (slot.status === 'few_left') {
      return 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 cursor-pointer';
    }
    return 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300 cursor-pointer';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || !formData.time || !formData.guest_name || !formData.phone || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.party_size < 1 || formData.party_size > 20) {
      toast.error('Party size must be between 1 and 20');
      return;
    }

    if (formData.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    try {
      setSubmitting(true);
      await reservationsApi.createReservation(formData);

      toast.success('Reservation confirmed! A confirmation email has been sent.');
      
      setFormData({
        date: '',
        time: '',
        party_size: 2,
        guest_name: '',
        phone: '',
        email: '',
        special_requests: '',
      });
      setSlots([]);

      await fetchReservations();
      setShowForm(false);
    } catch (error) {
      console.error('Reservation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    try {
      await reservationsApi.cancelReservation(reservationId);
      toast.success('Reservation cancelled');
      await fetchReservations();
    } catch (error) {
      toast.error('Failed to cancel reservation');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return statusColors[status] || 'bg-slate-100 text-slate-800';
  };

  const isFutureReservation = (date, time) => {
    const reservationDateTime = new Date(`${date}T${time}`);
    return reservationDateTime > new Date();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto px-4 max-width-4xl">
        <h1 className="text-4xl font-bold mb-8 text-slate-900">Table Reservations</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Booking Form */}
          {showForm && (
            <div className="lg:col-span-2">
              <Card className="p-6">
                <CardHeader>
                  <CardTitle>Book Your Table</CardTitle>
                  <CardDescription>Pick a date and time slot, then fill in your details</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Date Picker Strip */}
                    <div>
                      <Label className="block mb-3 font-semibold text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-600" /> Select Date
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="flex-shrink-0"
                          disabled={weekOffset === 0}
                          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex gap-2 overflow-x-auto flex-1 pb-1">
                          {dateCards.map((d) => (
                            <button
                              key={d.date}
                              type="button"
                              onClick={() => selectDate(d.date)}
                              className={`flex flex-col items-center min-w-[70px] px-3 py-3 rounded-xl border-2 transition-all ${
                                formData.date === d.date
                                  ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                                  : d.isToday
                                  ? 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-amber-300'
                              }`}
                            >
                              <span className="text-xs font-medium uppercase">{d.dayName}</span>
                              <span className="text-2xl font-bold">{d.dayNum}</span>
                              <span className="text-xs">{d.month}</span>
                              {d.isToday && formData.date !== d.date && (
                                <span className="text-[10px] mt-0.5 text-amber-600 font-semibold">Today</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="flex-shrink-0"
                          disabled={weekOffset >= 3}
                          onClick={() => setWeekOffset((w) => Math.min(3, w + 1))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Step 2: Time Slot Grid */}
                    {formData.date && (
                      <div>
                        <Label className="block mb-3 font-semibold text-lg flex items-center gap-2">
                          <Clock className="w-5 h-5 text-amber-600" /> Select Time
                        </Label>
                        {slotsLoading ? (
                          <div className="text-center py-6 text-slate-500">Loading available slots...</div>
                        ) : slots.length === 0 ? (
                          <div className="text-center py-6 text-slate-500">No slots available for this date</div>
                        ) : (
                          <>
                            {/* Lunch Slots */}
                            {slots.some(s => parseInt(s.time.split(':')[0]) < 16) && (
                              <div className="mb-4">
                                <p className="text-sm font-medium text-slate-500 mb-2">🌤️ Lunch</p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {slots.filter(s => parseInt(s.time.split(':')[0]) < 16).map((slot) => (
                                    <button
                                      key={slot.time}
                                      type="button"
                                      disabled={slot.status === 'past' || slot.status === 'full'}
                                      onClick={() => selectTime(slot.time)}
                                      className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${getSlotStyle(slot)}`}
                                    >
                                      <div>{formatTime12h(slot.time)}</div>
                                      {slot.status === 'few_left' && (
                                        <div className="text-[10px] mt-0.5">Only {slot.available} left</div>
                                      )}
                                      {slot.status === 'full' && (
                                        <div className="text-[10px] mt-0.5">Full</div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Dinner Slots */}
                            {slots.some(s => parseInt(s.time.split(':')[0]) >= 16) && (
                              <div>
                                <p className="text-sm font-medium text-slate-500 mb-2">🌙 Dinner</p>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {slots.filter(s => parseInt(s.time.split(':')[0]) >= 16).map((slot) => (
                                    <button
                                      key={slot.time}
                                      type="button"
                                      disabled={slot.status === 'past' || slot.status === 'full'}
                                      onClick={() => selectTime(slot.time)}
                                      className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${getSlotStyle(slot)}`}
                                    >
                                      <div>{formatTime12h(slot.time)}</div>
                                      {slot.status === 'few_left' && (
                                        <div className="text-[10px] mt-0.5">Only {slot.available} left</div>
                                      )}
                                      {slot.status === 'full' && (
                                        <div className="text-[10px] mt-0.5">Full</div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 3: Party Size */}
                    {formData.date && formData.time && (
                      <div>
                        <Label className="block mb-3 font-semibold text-lg flex items-center gap-2">
                          <Users className="w-5 h-5 text-amber-600" /> Party Size
                        </Label>
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setFormData(prev => ({ ...prev, party_size: Math.max(1, prev.party_size - 1) }))}
                            disabled={formData.party_size <= 1}
                          >
                            -
                          </Button>
                          <span className="text-3xl font-bold text-amber-600 w-12 text-center">{formData.party_size}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setFormData(prev => ({ ...prev, party_size: Math.min(20, prev.party_size + 1) }))}
                            disabled={formData.party_size >= 20}
                          >
                            +
                          </Button>
                          <span className="text-slate-500 text-sm">guest{formData.party_size !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Guest Details */}
                    {formData.date && formData.time && (
                      <div className="space-y-4 border-t pt-4">
                        <p className="font-semibold text-lg">Guest Details</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="guest_name" className="block mb-2 font-semibold">
                              Guest Name *
                            </Label>
                            <Input
                              id="guest_name"
                              name="guest_name"
                              value={formData.guest_name}
                              onChange={handleChange}
                              placeholder="Your name"
                              required
                            />
                          </div>
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
                        </div>

                        <div>
                          <Label htmlFor="email" className="block mb-2 font-semibold">
                            Email Address *
                          </Label>
                          <Input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="your.email@example.com"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="special_requests" className="block mb-2 font-semibold">
                            Special Requests (Optional)
                          </Label>
                          <textarea
                            id="special_requests"
                            name="special_requests"
                            value={formData.special_requests}
                            onChange={handleChange}
                            placeholder="Any dietary restrictions, celebrations, or special needs?"
                            rows="3"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-5 h-5 text-amber-600" />
                            <p className="font-semibold text-amber-800">Booking Summary</p>
                          </div>
                          <p className="text-sm text-amber-700">
                            📅 {new Date(formData.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            &nbsp;• ⏰ {formatTime12h(formData.time)}
                            &nbsp;• 👥 {formData.party_size} guest{formData.party_size !== 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-700">
                            A confirmation email will be sent to you. Please arrive 5-10 minutes before your reservation time.
                          </p>
                        </div>

                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg"
                        >
                          {submitting ? 'Booking...' : 'Confirm Reservation'}
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Reservations List */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <CardHeader>
                <CardTitle>Your Reservations</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-slate-500">Loading...</p>
                ) : reservations.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-slate-500 mb-4">No reservations yet</p>
                    <Button
                      onClick={() => setShowForm(true)}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      Make a Reservation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reservations.map((reservation) => (
                      <div key={reservation.id} className="border rounded-lg p-3 bg-slate-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{reservation.date}</p>
                            <p className="text-sm text-slate-600 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {reservation.time}
                            </p>
                            <p className="text-sm text-slate-600 flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {reservation.party_size} guest{reservation.party_size !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <Badge className={getStatusBadge(reservation.status)}>
                            {reservation.status}
                          </Badge>
                        </div>

                        {isFutureReservation(reservation.date, reservation.time) && reservation.status !== 'cancelled' && (
                          <Button
                            onClick={() => handleCancelReservation(reservation.id)}
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Cancel Reservation
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {!showForm && reservations.length > 0 && (
              <Button
                onClick={() => setShowForm(true)}
                className="w-full mt-4 bg-amber-600 hover:bg-amber-700"
              >
                Make Another Reservation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;
