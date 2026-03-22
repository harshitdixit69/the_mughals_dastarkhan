// Mock data for The Mughal's Dastarkhwan Restaurant

export const restaurantInfo = {
  name: "The Mughal's Dastarkhwan",
  tagline: "Authentic Mughlai & Awadhi Cuisine",
  description: "Experience the rich culinary heritage of Lucknow with our traditional slow-cooked gravies, aromatic spices, and time-honored recipes passed down through generations.",
  cuisine: ["Mughlai", "Awadhi", "North Indian"],
  priceRange: "₹700 - ₹900 for two",
  rating: 4.5,
  totalReviews: 2847,
  established: 1985,
};

export const contactInfo = {
  address: "First Floor, Novelty Cinema Building, Kaiserbagh Officer's Colony, Lalbagh, Lucknow, Uttar Pradesh – 226001, India",
  phone: "+91 522 404 4777",
  email: "info@mughalsdastrkhwan.com",
  hours: {
    weekdays: "12:30 PM - 10:30 PM",
    weekends: "12:30 PM - 10:30 PM",
    note: "Timings may vary on public holidays"
  },
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3559.0!2d80.95!3d26.85!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDUxJzAwLjAiTiA4MMKwNTcnMDAuMCJF!5e0!3m2!1sen!2sin!4v1234567890"
};

export const services = [
  { id: 1, name: "Dine-in", icon: "UtensilsCrossed", description: "Comfortable indoor seating for families and groups" },
  { id: 2, name: "Takeaway", icon: "ShoppingBag", description: "Pack your favorites and enjoy at home" },
  { id: 3, name: "Online Delivery", icon: "Truck", description: "Available on popular delivery platforms" }
];

export const menuCategories = [
  {
    id: "kebabs",
    name: "Kebabs & Starters",
    description: "Traditional Awadhi kebabs prepared with authentic spices",
    items: [
      { id: 1, name: "Galouti Kebab", price: 320, description: "Melt-in-mouth minced mutton kebabs with secret spices", isVeg: false, isPopular: true },
      { id: 2, name: "Seekh Kebab (Chicken)", price: 280, description: "Succulent minced chicken skewers grilled to perfection", isVeg: false },
      { id: 3, name: "Seekh Kebab (Mutton)", price: 340, description: "Juicy minced mutton skewers with aromatic herbs", isVeg: false },
      { id: 4, name: "Chicken Kalimirch", price: 290, description: "Tender chicken marinated with black pepper", isVeg: false },
      { id: 5, name: "Chicken Afghani", price: 310, description: "Creamy marinated chicken grilled in tandoor", isVeg: false, isPopular: true },
      { id: 6, name: "Tandoori Chicken", price: 350, description: "Classic tandoori chicken with traditional masala", isVeg: false }
    ]
  },
  {
    id: "main-nonveg",
    name: "Main Course – Non-Vegetarian",
    description: "Rich, slow-cooked curries with authentic Mughlai flavors",
    items: [
      { id: 7, name: "Mutton Curry", price: 380, description: "Traditional mutton curry with balanced spices", isVeg: false, isPopular: true },
      { id: 8, name: "Chicken Masala", price: 320, description: "Aromatic chicken curry with rich gravy", isVeg: false },
      { id: 9, name: "Chicken Korma", price: 340, description: "Creamy chicken in cashew and almond gravy", isVeg: false },
      { id: 10, name: "Mutton Korma", price: 420, description: "Rich mutton in royal Mughlai style korma", isVeg: false, isPopular: true },
      { id: 11, name: "Rogan Josh", price: 400, description: "Kashmiri style aromatic mutton curry", isVeg: false }
    ]
  },
  {
    id: "main-veg",
    name: "Main Course – Vegetarian",
    description: "Flavorful vegetarian delicacies for every palate",
    items: [
      { id: 12, name: "Paneer Kali Mirch", price: 280, description: "Cottage cheese with black pepper gravy", isVeg: true },
      { id: 13, name: "Paneer Pasanda", price: 290, description: "Stuffed paneer in rich cashew gravy", isVeg: true, isPopular: true },
      { id: 14, name: "Paneer Do Pyaza", price: 270, description: "Paneer with caramelized onions", isVeg: true },
      { id: 15, name: "Dal Makhani", price: 220, description: "Slow-cooked black lentils in butter gravy", isVeg: true, isPopular: true },
      { id: 16, name: "Mixed Vegetable Curry", price: 240, description: "Seasonal vegetables in aromatic gravy", isVeg: true }
    ]
  },
  {
    id: "biryani",
    name: "Biryani & Rice",
    description: "Aromatic long-grain rice dishes cooked to perfection",
    items: [
      { id: 17, name: "Mutton Biryani", price: 380, description: "Lucknowi style dum biryani with tender mutton", isVeg: false, isPopular: true },
      { id: 18, name: "Chicken Biryani", price: 320, description: "Fragrant rice layered with spiced chicken", isVeg: false, isPopular: true },
      { id: 19, name: "Veg Biryani", price: 260, description: "Aromatic rice with seasonal vegetables", isVeg: true },
      { id: 20, name: "Steamed Rice", price: 120, description: "Plain steamed basmati rice", isVeg: true },
      { id: 21, name: "Jeera Rice", price: 150, description: "Cumin-tempered fragrant rice", isVeg: true }
    ]
  },
  {
    id: "breads",
    name: "Indian Breads",
    description: "Freshly baked breads from our tandoor",
    items: [
      { id: 22, name: "Rumali Roti", price: 40, description: "Paper-thin handkerchief bread", isVeg: true },
      { id: 23, name: "Tandoori Roti", price: 30, description: "Whole wheat bread from tandoor", isVeg: true },
      { id: 24, name: "Butter Naan", price: 50, description: "Soft leavened bread with butter", isVeg: true, isPopular: true },
      { id: 25, name: "Lachha Paratha", price: 60, description: "Layered flaky paratha", isVeg: true },
      { id: 26, name: "Mughlai Paratha", price: 80, description: "Stuffed paratha Mughlai style", isVeg: false }
    ]
  },
  {
    id: "desserts",
    name: "Desserts",
    description: "Traditional Indian sweets to end your meal",
    items: [
      { id: 27, name: "Shahi Tukda", price: 120, description: "Royal bread pudding with rabri", isVeg: true, isPopular: true },
      { id: 28, name: "Gulab Jamun", price: 80, description: "Soft milk dumplings in sugar syrup", isVeg: true }
    ]
  }
];

export const testimonials = [
  {
    id: 1,
    name: "Rahul Sharma",
    rating: 5,
    comment: "Authentic Lucknowi flavors! The Galouti Kebab and Mutton Biryani are absolutely divine. Feels like home.",
    date: "2 weeks ago"
  },
  {
    id: 2,
    name: "Priya Verma",
    rating: 5,
    comment: "Best Awadhi food in Lucknow. The slow-cooked mutton korma is something else. Will definitely come back!",
    date: "1 month ago"
  },
  {
    id: 3,
    name: "Amir Khan",
    rating: 4,
    comment: "Great family dining experience. Service is prompt and staff is very helpful with recommendations.",
    date: "3 weeks ago"
  }
];

export const images = {
  hero: "https://images.unsplash.com/photo-1631515242808-497c3fbd3972?w=800&q=75&auto=format",
  biryani: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=75&auto=format",
  kebabs: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=75&auto=format",
  interior: "https://images.unsplash.com/photo-1751200503125-d8cb239f95ba?w=600&q=75&auto=format",
  cooking: "https://images.unsplash.com/photo-1697155406055-2db32d47ca07?w=800&q=75&auto=format",
  ambiance: "https://images.pexels.com/photos/10148453/pexels-photo-10148453.jpeg?w=600&auto=compress"
};

export const specialties = [
  {
    id: 1,
    name: "Heritage Recipes",
    description: "Time-honored recipes passed down through generations of master chefs",
    icon: "ScrollText"
  },
  {
    id: 2,
    name: "Slow-Cooked Perfection",
    description: "Traditional dum cooking for rich, layered flavors",
    icon: "Flame"
  },
  {
    id: 3,
    name: "Premium Ingredients",
    description: "Finest spices and freshest ingredients sourced locally",
    icon: "Sparkles"
  },
  {
    id: 4,
    name: "Family Friendly",
    description: "Comfortable ambiance perfect for family gatherings",
    icon: "Users"
  }
];