import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeGetJSON } from '../lib/safeStorage';
import { Leaf, Star, Loader2, ShoppingCart } from 'lucide-react';
import { images } from '../data/mock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { menuApi, cartApi } from '../services/api';
import ReviewsComponent from './ReviewsComponent';

const Menu = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState(null);
  const [addingItemId, setAddingItemId] = useState(null);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const [categoriesData, itemsData] = await Promise.all([
          menuApi.getCategories(),
          menuApi.getItems()
        ]);
        setCategories(categoriesData);
        setMenuItems(itemsData);
        if (categoriesData.length > 0) {
          setActiveCategory(categoriesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  useEffect(() => {
    const userData = safeGetJSON('user');
    if (userData) {
      setUser(userData);
    }
  }, []);

  const handleAddToCart = useCallback(async (itemId) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    setAddingItemId(itemId);
    try {
      await cartApi.addToCart(itemId, 1);
      const cartData = await cartApi.getCart();
      const items = cartData.items || [];
      const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { count: totalCount } }));
      const itemName = menuItems.find(m => m.id === itemId)?.name || 'Item';
      toast.success(`${itemName} added — ${totalCount} ${totalCount === 1 ? 'item' : 'items'} in cart`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to cart');
    } finally {
      setAddingItemId(null);
    }
  }, [user, menuItems, navigate]);

  const itemsByCategory = useMemo(() => {
    const map = {};
    for (const item of menuItems) {
      if (!map[item.category_id]) map[item.category_id] = [];
      map[item.category_id].push(item);
    }
    return map;
  }, [menuItems]);

  if (loading) {
    return (
      <section id="menu" className="py-20 lg:py-28 bg-[#ECEC75]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0f172a]" />
        </div>
      </section>
    );
  }

  return (
    <section id="menu" className="py-20 lg:py-28 bg-[#ECEC75]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-[#64748b] uppercase tracking-widest text-sm font-medium">
            Our Offerings
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0f172a] mt-4 mb-6">
            Explore Our Menu
          </h2>
          <p className="text-[#64748b] text-lg leading-relaxed">
            Discover the authentic flavors of Lucknow with our carefully curated menu 
            featuring traditional Mughlai and Awadhi delicacies.
          </p>
        </div>

        {/* Featured Images */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="col-span-2 md:col-span-2">
            <img
              src={images.biryani}
              alt="Signature Biryani"
              width={800}
              height={256}
              loading="lazy"
              decoding="async"
              className="w-full h-48 md:h-64 object-cover rounded-2xl shadow-md transition-opacity duration-500"
            />
          </div>
          <div>
            <img
              src={images.kebabs}
              alt="Traditional Kebabs"
              width={600}
              height={256}
              loading="lazy"
              decoding="async"
              className="w-full h-48 md:h-64 object-cover rounded-2xl shadow-md transition-opacity duration-500"
            />
          </div>
          <div>
            <img
              src={images.cooking}
              alt="Fresh Cooking"
              width={600}
              height={256}
              loading="lazy"
              decoding="async"
              className="w-full h-48 md:h-64 object-cover rounded-2xl shadow-md transition-opacity duration-500"
            />
          </div>
        </div>

        {/* Menu Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList id="menu-tabs" className="flex flex-wrap justify-center gap-2 mb-8 bg-transparent h-auto p-0">
            {categories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 data-[state=active]:bg-[#0f172a] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-[#0f172a] data-[state=inactive]:hover:bg-[#0f172a]/10"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-0">
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-lg">
                <div className="mb-6">
                  <h3 className="font-serif text-2xl font-bold text-[#0f172a] mb-2">
                    {category.name}
                  </h3>
                  <p className="text-[#64748b]">{category.description}</p>
                </div>

                <div className="grid gap-4">
                  {(itemsByCategory[category.id] || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-4 rounded-xl hover:bg-[#f8fafc] transition-colors duration-200 group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-lg text-[#0f172a] group-hover:text-[#1e293b]">
                            {item.name}
                          </h4>
                          {item.is_veg && (
                            <span className="w-5 h-5 border-2 border-green-600 rounded flex items-center justify-center">
                              <Leaf className="w-3 h-3 text-green-600" />
                            </span>
                          )}
                          {!item.is_veg && (
                            <span className="w-5 h-5 border-2 border-red-600 rounded flex items-center justify-center">
                              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                            </span>
                          )}
                          {item.is_popular && (
                            <Badge className="bg-[#ECEC75] text-[#0f172a] hover:bg-[#e6e67c] text-xs">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-[#64748b] text-sm mt-1">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-right ml-4 flex flex-col items-end gap-2">
                        <span className="font-serif text-xl font-bold text-[#0f172a]">
                          ₹{item.price}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddToCart(item.id)}
                            disabled={addingItemId === item.id}
                            className={`p-2 px-3 rounded-full text-white transition-all flex items-center gap-2 text-sm font-semibold ${
                              addingItemId === item.id
                                ? 'bg-amber-400 cursor-wait scale-95'
                                : 'bg-amber-600 hover:bg-amber-700 hover:scale-105 active:scale-95'
                            }`}
                            aria-label="Add to cart"
                          >
                            <ShoppingCart className={`w-4 h-4 ${addingItemId === item.id ? 'animate-spin' : ''}`} />
                            {addingItemId === item.id ? 'Adding...' : 'Add'}
                          </button>
                          <button
                            onClick={() => setSelectedReviewItem({ id: item.id, name: item.name })}
                            className="p-2 px-3 rounded-full bg-white border border-amber-600 text-amber-700 hover:bg-amber-50 transition-colors text-sm font-semibold"
                          >
                            Reviews
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedReviewItem && (
                  <div className="mt-4">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => setSelectedReviewItem(null)}
                        className="text-sm text-amber-700 hover:text-amber-800"
                      >
                        Close reviews
                      </button>
                    </div>
                    <ReviewsComponent
                      menuItemId={selectedReviewItem.id}
                      itemName={selectedReviewItem.name}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-8 text-sm text-[#64748b]">
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-green-600 rounded flex items-center justify-center">
              <Leaf className="w-3 h-3 text-green-600" />
            </span>
            Vegetarian
          </span>
          <span className="flex items-center gap-2">
            <span className="w-5 h-5 border-2 border-red-600 rounded flex items-center justify-center">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            </span>
            Non-Vegetarian
          </span>
        </div>
      </div>
    </section>
  );
};

export default Menu;