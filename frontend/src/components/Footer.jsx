import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Clock, Mail, Facebook, Instagram } from 'lucide-react';
import { restaurantInfo, contactInfo } from '../data/mock';
import { restaurantApi } from '../services/api';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [dynamicInfo, setDynamicInfo] = useState(null);

  useEffect(() => {
    fetchRestaurantInfo();
  }, []);

  const fetchRestaurantInfo = async () => {
    try {
      const data = await restaurantApi.getInfo();
      setDynamicInfo(data);
    } catch (error) {
      console.error('Failed to fetch restaurant info:', error);
    }
  };

  // Use dynamic info if available, fallback to mock data
  const info = dynamicInfo || contactInfo;
  const restaurant = dynamicInfo || restaurantInfo;

  const quickLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About Us', href: '#about' },
    { name: 'Menu', href: '#menu' },
    { name: 'Experience', href: '#experience' },
    { name: 'Contact', href: '#contact' },
  ];

  const scrollToSection = (href) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#0f172a] text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <span className="font-serif text-3xl font-bold">
                The Mughal's
              </span>
              <span className="block text-sm text-gray-400 tracking-widest uppercase mt-1">
                Dastarkhwan
              </span>
            </div>
            <p className="text-gray-400 leading-relaxed mb-6 max-w-md">
              Experience the rich culinary heritage of Lucknow with our authentic Mughlai 
              and Awadhi cuisine. Serving traditional flavors since {restaurant?.established || restaurantInfo.established}.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com/thedastarkhwanlko/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#ECEC75] hover:text-[#0f172a] transition-all duration-300"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/thedastarkhwanlko/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#ECEC75] hover:text-[#0f172a] transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(link.href);
                    }}
                    className="text-gray-400 hover:text-[#ECEC75] transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-lg mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#ECEC75] flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">
                  {info?.street || "Kaiserbagh Officer's Colony, Lalbagh, Lucknow - 226001"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#ECEC75] flex-shrink-0" />
                <a
                  href={`tel:${info?.phone || contactInfo.phone}`}
                  className="text-gray-400 hover:text-[#ECEC75] transition-colors text-sm"
                >
                  {info?.phone || contactInfo.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#ECEC75] flex-shrink-0" />
                <a
                  href={`mailto:${info?.email || contactInfo.email}`}
                  className="text-gray-400 hover:text-[#ECEC75] transition-colors text-sm"
                >
                  {info?.email || contactInfo.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#ECEC75] flex-shrink-0" />
                <span className="text-gray-400 text-sm">
                  {info?.hours?.weekdays || contactInfo.hours.weekdays}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} The Mughal's Dastarkhwan. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              Authentic Mughlai & Awadhi Cuisine | Lucknow, India
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;