import React, { useState } from 'react';
import { MapPin, Phone, Clock, Mail, Send, ExternalLink } from 'lucide-react';
import { contactInfo } from '../data/mock';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { contactApi } from '../services/api';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await contactApi.submitMessage({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        message: formData.message,
      });
      
      toast.success(response.message || 'Message sent successfully!');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to send message. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 lg:py-28 bg-[#ECEC75]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#64748b] uppercase tracking-widest text-sm font-medium">
            Get In Touch
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0f172a] mt-4 mb-6">
            Visit Us Today
          </h2>
          <p className="text-[#64748b] text-lg leading-relaxed">
            We'd love to hear from you. Reach out for reservations, inquiries, 
            or just to say hello!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <div className="bg-white rounded-3xl p-8 shadow-lg mb-8">
              <h3 className="font-serif text-2xl font-bold text-[#0f172a] mb-6">
                Contact Information
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#ECEC75] rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-[#0f172a]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0f172a] mb-1">Address</h4>
                    <p className="text-[#64748b] leading-relaxed">
                      {contactInfo.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#ECEC75] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-[#0f172a]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0f172a] mb-1">Phone</h4>
                    <a
                      href={`tel:${contactInfo.phone}`}
                      className="text-[#64748b] hover:text-[#0f172a] transition-colors"
                    >
                      {contactInfo.phone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#ECEC75] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-[#0f172a]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0f172a] mb-1">Email</h4>
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="text-[#64748b] hover:text-[#0f172a] transition-colors"
                    >
                      {contactInfo.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#ECEC75] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-[#0f172a]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0f172a] mb-1">Opening Hours</h4>
                    <p className="text-[#64748b]">{contactInfo.hours.weekdays}</p>
                    <p className="text-sm text-[#64748b] mt-1">
                      {contactInfo.hours.note}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Online CTA */}
            <div className="bg-[#0f172a] rounded-3xl p-8 text-white">
              <h3 className="font-serif text-2xl font-bold mb-4">
                Order Online
              </h3>
              <p className="text-gray-300 mb-6">
                Enjoy our authentic Mughlai cuisine from the comfort of your home. 
                Available on popular delivery platforms.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  className="bg-white text-[#0f172a] hover:bg-gray-100 font-semibold"
                  onClick={() => {
                    window.open('https://zomato.onelink.me/xqzv/whs2kr6e', '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Order on Zomato
                </Button>
                <Button
                  className="bg-white text-[#0f172a] hover:bg-gray-100 font-semibold"
                  onClick={() => {
                    window.open('https://www.swiggy.com/menu/1035064?source=sharing', '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Order on Swiggy
                </Button>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-3xl p-8 shadow-lg">
            <h3 className="font-serif text-2xl font-bold text-[#0f172a] mb-6">
              Send Us a Message
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#0f172a] font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="border-gray-200 focus:border-[#0f172a] focus:ring-[#0f172a]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#0f172a] font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="border-gray-200 focus:border-[#0f172a] focus:ring-[#0f172a]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#0f172a] font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  className="border-gray-200 focus:border-[#0f172a] focus:ring-[#0f172a]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-[#0f172a] font-medium">
                  Your Message
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="How can we help you?"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  className="border-gray-200 focus:border-[#0f172a] focus:ring-[#0f172a] resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white py-6 rounded-xl font-semibold text-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Send className="w-5 h-5 mr-2" />
                    Send Message
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;