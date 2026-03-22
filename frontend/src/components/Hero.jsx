import React, { useState, useEffect } from 'react';
import { Star, Clock, MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { images } from '../data/mock';
import { restaurantApi } from '../services/api';
import { scrollToElement } from '../lib/smoothScroll';

const Hero = () => {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      try {
        const data = await restaurantApi.getInfo();
        setRestaurant(data);
      } catch (error) {
        console.error('Error fetching restaurant info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantInfo();
  }, []);

  const scrollToMenu = () => scrollToElement('#menu-tabs');
  const scrollToAbout = () => scrollToElement('#about');

  if (loading || !restaurant) {
    return (
      <section id="home" className="relative min-h-[90vh] bg-[#ECEC75] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#0f172a]" />
      </section>
    );
  }

  return (
    <section id="home" className="relative min-h-[90vh] bg-[#ECEC75] overflow-hidden">
      {/* Decorative Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 border-2 border-[#0f172a] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 border-2 border-[#0f172a] rounded-full translate-x-1/3 translate-y-1/3"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 border border-[#0f172a] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(restaurant.rating)
                        ? 'fill-[#0f172a] text-[#0f172a]'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-[#0f172a]">
                {restaurant.rating} ({restaurant.total_reviews.toLocaleString()} reviews)
              </span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-[#0f172a] leading-tight mb-6">
              {restaurant.name}
            </h1>

            <p className="text-lg sm:text-xl text-[#1e293b] mb-4 font-medium">
              {restaurant.tagline}
            </p>

            <p className="text-base sm:text-lg text-[#64748b] mb-8 max-w-xl leading-relaxed">
              {restaurant.description}
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              {restaurant.cuisine.map((type) => (
                <span
                  key={type}
                  className="bg-[#0f172a] text-white px-4 py-1.5 rounded-full text-sm font-medium"
                >
                  {type}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Button
                onClick={scrollToMenu}
                className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-8 py-6 rounded-md font-semibold text-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                Explore Our Menu
              </Button>
              <Button
                onClick={scrollToAbout}
                variant="outline"
                className="border-2 border-[#0f172a] text-[#0f172a] hover:bg-[#0f172a] hover:text-white px-8 py-6 rounded-md font-semibold text-lg transition-all duration-200"
              >
                Our Story
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-[#64748b]">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#0f172a]" />
                12:30 PM - 10:30 PM
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#0f172a]" />
                Kaiserbagh, Lucknow
              </span>
            </div>
          </div>

          {/* Image Section */}
          <div className="relative">
            <div className="relative z-10">
              <div className="bg-[#e6e67c] rounded-3xl p-4 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <img
                  src={images.hero}
                  alt="Authentic Mughlai cuisine spread"
                  width={800}
                  height={500}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="w-full h-[400px] lg:h-[500px] object-cover rounded-2xl"
                />
              </div>
            </div>

            {/* Floating Card */}
            <div className="absolute -bottom-4 -left-4 lg:-left-8 bg-white rounded-xl p-4 shadow-xl z-20">
              <p className="text-xs text-[#64748b] uppercase tracking-wide mb-1">Average Cost</p>
              <p className="font-serif text-2xl font-bold text-[#0f172a]">{restaurant.price_range}</p>
              <p className="text-sm text-[#64748b]">for two people</p>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#0f172a] rounded-full opacity-10"></div>
            <div className="absolute -bottom-12 right-12 w-16 h-16 bg-[#0f172a] rounded-full opacity-10"></div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-8 h-8 text-[#0f172a] opacity-60" />
      </div>
    </section>
  );
};

export default Hero;