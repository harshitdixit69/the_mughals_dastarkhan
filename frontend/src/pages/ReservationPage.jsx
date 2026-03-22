import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { reservationsApi } from '../services/api';
import { Calendar, Clock, Users, AlertCircle, Check, X } from 'lucide-react';

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

  useEffect(() => {
    fetchReservations();
  }, []);

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

  const sanitize = (str) => str.replace(/[<>"'&]/g, '');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['guest_name', 'phone', 'email', 'special_requests'].includes(name) ? sanitize(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
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
      const response = await reservationsApi.createReservation(formData);

      toast.success('Reservation confirmed! A confirmation email has been sent.');
      
      // Reset form
      setFormData({
        date: '',
        time: '',
        party_size: 2,
        guest_name: '',
        phone: '',
        email: '',
        special_requests: '',
      });

      // Refresh reservations
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
                  <CardDescription>Reserve a table at our restaurant</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date" className="block mb-2 font-semibold">
                          Reservation Date *
                        </Label>
                        <Input
                          type="date"
                          id="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="time" className="block mb-2 font-semibold">
                          Reservation Time *
                        </Label>
                        <Input
                          type="time"
                          id="time"
                          name="time"
                          value={formData.time}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="party_size" className="block mb-2 font-semibold">
                        Party Size * (1-20 guests)
                      </Label>
                      <Input
                        type="number"
                        id="party_size"
                        name="party_size"
                        value={formData.party_size}
                        onChange={handleChange}
                        min="1"
                        max="20"
                        required
                      />
                    </div>

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
