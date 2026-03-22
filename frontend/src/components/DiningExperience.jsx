import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, ShoppingBag, Truck, Star, Quote, Loader2 } from 'lucide-react';
import { services, images } from '../data/mock';
import { Card, CardContent } from './ui/card';
import { testimonialsApi } from '../services/api';

const iconMap = {
  UtensilsCrossed: UtensilsCrossed,
  ShoppingBag: ShoppingBag,
  Truck: Truck,
};

const DiningExperience = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await testimonialsApi.getAll();
        setTestimonials(data);
      } catch (error) {
        console.error('Error fetching testimonials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  return (
    <section id="experience" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#64748b] uppercase tracking-widest text-sm font-medium">
            Dine With Us
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0f172a] mt-4 mb-6">
            The Dining Experience
          </h2>
          <p className="text-[#64748b] text-lg leading-relaxed">
            Enjoy authentic Mughlai cuisine in a comfortable, family-friendly atmosphere 
            with attentive service and traditional hospitality.
          </p>
        </div>

        {/* Experience Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Image */}
          <div className="relative order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img
                  src={images.interior}
                  alt="Restaurant interior"
                  width={600}
                  height={192}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-48 object-cover rounded-2xl shadow-md transition-opacity duration-500"
                />
                <img
                  src={images.ambiance}
                  alt="Warm ambiance"
                  width={600}
                  height={256}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-64 object-cover rounded-2xl shadow-md transition-opacity duration-500"
                />
              </div>
              <div className="pt-8">
                <img
                  src={images.hero}
                  alt="Food spread"
                  width={600}
                  height={288}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-72 object-cover rounded-2xl shadow-md transition-opacity duration-500"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0f172a] mb-6">
              A Comfortable Family Dining Destination
            </h3>
            <p className="text-[#64748b] text-lg leading-relaxed mb-6">
              Located in the heart of Lucknow at Kaiserbagh, The Mughal's Dastarkhwan 
              offers a classic North Indian dining experience. Our comfortable indoor 
              seating is perfect for family gatherings, small groups, or intimate dinners.
            </p>
            <p className="text-[#64748b] text-lg leading-relaxed mb-8">
              Our attentive staff is always ready to guide you through our menu, 
              helping you discover traditional specialties and find the perfect dishes 
              to suit your taste. Whether you're craving our signature kebabs or aromatic 
              biryanis, we ensure every visit is memorable.
            </p>

            {/* Services */}
            <div className="space-y-4">
              {services.map((service) => {
                const IconComponent = iconMap[service.icon];
                return (
                  <div
                    key={service.id}
                    className="flex items-start gap-4 p-4 bg-[#f8fafc] rounded-xl hover:bg-[#ECEC75]/30 transition-colors duration-300"
                  >
                    <div className="w-12 h-12 bg-[#0f172a] rounded-lg flex items-center justify-center flex-shrink-0">
                      {IconComponent && <IconComponent className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#0f172a] mb-1">
                        {service.name}
                      </h4>
                      <p className="text-[#64748b] text-sm">
                        {service.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-[#ECEC75] rounded-3xl p-8 md:p-12">
          <div className="text-center mb-10">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0f172a] mb-2">
              What Our Guests Say
            </h3>
            <p className="text-[#64748b]">
              Hear from our valued guests about their dining experience
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0f172a]" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <Card
                  key={testimonial.id}
                  className="bg-white border-none shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <CardContent className="p-6">
                    <Quote className="w-8 h-8 text-[#ECEC75] mb-4" />
                    <p className="text-[#64748b] mb-4 leading-relaxed">
                      "{testimonial.comment}"
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#0f172a]">
                          {testimonial.name}
                        </p>
                        <p className="text-sm text-[#64748b]">{testimonial.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 fill-[#0f172a] text-[#0f172a]"
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DiningExperience;
