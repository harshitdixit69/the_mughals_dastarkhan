import React, { useState, useEffect } from 'react';
import { ScrollText, Flame, Sparkles, Users, Loader2 } from 'lucide-react';
import { specialties, images } from '../data/mock';
import { restaurantApi } from '../services/api';

const iconMap = {
  ScrollText: ScrollText,
  Flame: Flame,
  Sparkles: Sparkles,
  Users: Users,
};

const About = () => {
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

  if (loading || !restaurant) {
    return (
      <section id="about" className="py-20 lg:py-28 bg-white flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f172a]" />
      </section>
    );
  }

  return (
    <section id="about" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#64748b] uppercase tracking-widest text-sm font-medium">
            Our Story
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0f172a] mt-4 mb-6">
            A Legacy of Authentic Flavors
          </h2>
          <p className="text-[#64748b] text-lg leading-relaxed">
            Since {restaurant.established}, we have been serving the people of Lucknow with authentic 
            Mughlai and Awadhi cuisine, preserving the culinary traditions of the Nawabs.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          {/* Image */}
          <div className="relative">
            <div className="bg-[#e6e67c] rounded-3xl p-3 transform -rotate-2">
              <img
                src={images.cooking}
                alt="Traditional cooking at Mughal's Dastarkhwan"
                width={800}
                height={450}
                loading="lazy"
                decoding="async"
                className="w-full h-[350px] lg:h-[450px] object-cover rounded-2xl transition-opacity duration-500"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-[#ECEC75] rounded-2xl p-6 shadow-lg">
              <p className="font-serif text-4xl font-bold text-[#0f172a]">{new Date().getFullYear() - restaurant.established}+</p>
              <p className="text-[#64748b] text-sm">Years of Excellence</p>
            </div>
          </div>

          {/* Text Content */}
          <div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0f172a] mb-6">
              The Heart of Awadhi Cuisine
            </h3>
            <p className="text-[#64748b] text-lg leading-relaxed mb-6">
              The Mughal's Dastarkhwan brings you the authentic taste of Lucknow - a city 
              renowned for its rich culinary heritage. Our chefs have mastered the art of 
              Awadhi cooking, using traditional slow-cooking methods, aromatic spices, and 
              recipes that have been perfected over generations.
            </p>
            <p className="text-[#64748b] text-lg leading-relaxed mb-8">
              From our legendary Galouti Kebabs that melt in your mouth to our aromatic 
              Lucknowi Biryanis cooked in the traditional dum style, every dish tells a 
              story of royal kitchens and timeless traditions.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-[#f8fafc] rounded-xl">
                <p className="font-serif text-3xl font-bold text-[#0f172a]">50+</p>
                <p className="text-sm text-[#64748b]">Dishes</p>
              </div>
              <div className="text-center p-4 bg-[#f8fafc] rounded-xl">
                <p className="font-serif text-3xl font-bold text-[#0f172a]">{(restaurant.total_reviews / 1000).toFixed(1)}K</p>
                <p className="text-sm text-[#64748b]">Happy Guests</p>
              </div>
              <div className="text-center p-4 bg-[#f8fafc] rounded-xl">
                <p className="font-serif text-3xl font-bold text-[#0f172a]">{restaurant.rating}</p>
                <p className="text-sm text-[#64748b]">Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Specialties Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {specialties.map((specialty) => {
            const IconComponent = iconMap[specialty.icon];
            return (
              <div
                key={specialty.id}
                className="bg-[#ECEC75] rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="w-14 h-14 bg-[#0f172a] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  {IconComponent && <IconComponent className="w-7 h-7 text-white" />}
                </div>
                <h4 className="font-semibold text-lg text-[#0f172a] mb-2">
                  {specialty.name}
                </h4>
                <p className="text-[#64748b] text-sm leading-relaxed">
                  {specialty.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default About;
