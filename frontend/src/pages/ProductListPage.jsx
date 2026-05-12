import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Seo from '../components/Seo';
import { productAPI, wishlistAPI } from '../services/api';

const FALLBACK_PRODUCTS = [
  {
    id: 9001,
    name: 'Amul Taaza Milk 1L',
    description: 'Fresh toned milk',
    category: 'groceries',
    price: 62,
    stockQuantity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 9002,
    name: 'Whole Wheat Bread',
    description: 'Baked today',
    category: 'groceries',
    price: 45,
    stockQuantity: 15,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 9003,
    name: 'Organic Eggs (12 pcs)',
    description: 'Farm fresh eggs',
    category: 'groceries',
    price: 95,
    stockQuantity: 30,
    imageUrl: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 9004,
    name: 'Basmati Rice 1kg',
    description: 'Premium long grain rice',
    category: 'groceries',
    price: 120,
    stockQuantity: 40,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
  },
];

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [wishlistIds, setWishlistIds] = useState([]);

  // Filter & sort state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['all', 'groceries', 'electronics', 'clothing', 'home', 'beauty'];

  // Read 'q' param from URL (set by Navbar search)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  // Fetch products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await productAPI.getAll();
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          setError(null);
        } else {
          setProducts(FALLBACK_PRODUCTS);
          setError('Live catalog unavailable. Showing demo products.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load products. Showing demo catalog.');
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const loadWishlist = async () => {
      if (!localStorage.getItem('authToken')) {
        setWishlistIds([]);
        return;
      }

      try {
        const items = await wishlistAPI.getMine();
        const productIds = (items || []).map((item) => item.productId);
        setWishlistIds(productIds);
        localStorage.setItem('wishlistIds', JSON.stringify(productIds));
      } catch {
        try {
          const cached = JSON.parse(localStorage.getItem('wishlistIds') || '[]');
          setWishlistIds(Array.isArray(cached) ? cached : []);
        } catch {
          setWishlistIds([]);
        }
      }
    };

    loadWishlist();

    const syncHandler = (event) => {
      const productIds = event?.detail?.productIds;
      if (Array.isArray(productIds)) {
        setWishlistIds(productIds);
      }
    };

    window.addEventListener('wishlistUpdated', syncHandler);
    return () => window.removeEventListener('wishlistUpdated', syncHandler);
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by price range
    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered.reverse();
        break;
      default: // popular
        break;
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, sortBy, priceRange, searchTerm]);

  const handleAddToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart } }));
  };

  const handleToggleWishlist = async (product) => {
    if (!localStorage.getItem('authToken')) {
      window.dispatchEvent(new CustomEvent('openAuthModal'));
      return;
    }

    try {
      const updated = wishlistIds.includes(product.id)
        ? await wishlistAPI.remove(product.id)
        : await wishlistAPI.add(product.id);
      const productIds = (updated || []).map((item) => item.productId);
      setWishlistIds(productIds);
      localStorage.setItem('wishlistIds', JSON.stringify(productIds));
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { productIds } }));
    } catch (error) {
      alert(error.message || 'Failed to update wishlist');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo
        title="Products - OrionCart"
        description="Search and compare products from local shops near you."
      />
      {/* Search & Filter Bar */}
      <div className="sticky top-20 z-20 bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900">Products</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter size={18} />
                Filters
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="popular">Popular</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-t border-gray-200 pt-4">
              {/* Category Filter */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Category</h4>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value={cat}
                        checked={selectedCategory === cat}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="cursor-pointer"
                      />
                      <span className="capitalize text-gray-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Price Range</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Min: ₹{priceRange[0]}</label>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Max: ₹{priceRange[1]}</label>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Filters */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Filters</h4>
                <button className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-700 mb-2">
                  Free Shipping
                </button>
                <button className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-700 mb-2">
                  Top Rated
                </button>
                <button className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-700">
                  On Sale
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">No products found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                {error}
              </div>
            )}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCategory === 'all' ? 'All Products' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`}
              </h2>
              <p className="text-gray-600">Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
