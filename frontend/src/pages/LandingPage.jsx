import React, { useState, useEffect } from 'react';
import { Filter, ArrowRight, ShoppingBag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ShopCard from '../components/ShopCard';
import HeroCarousel from '../components/HeroCarousel';
import HeroAnimation from '../components/HeroAnimation';
import Seo from '../components/Seo';
import catGrocery from '../assets/category-grocery.svg';
import catDairy from '../assets/category-dairy.svg';
import catMedical from '../assets/category-medical.svg';
import catFashion from '../assets/category-fashion.svg';
import catElectronics from '../assets/category-electronics.svg';
import catAll from '../assets/category-all.svg';
import { shopAPI } from '../services/api';

const MOCK_SHOPS = [
    {
        id: 1,
        name: "Fresh Mart Grocery",
        category: "Grocery",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000",
        distance: "0.8 km",
        rating: 4.8
    },
    {
        id: 2,
        name: "Green Valley Organics",
        category: "Grocery",
        image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=1000",
        distance: "1.2 km",
        rating: 4.9
    },
    {
        id: 3,
        name: "City Pharmacy",
        category: "Medical",
        image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=1000",
        distance: "0.5 km",
        rating: 4.7
    },
    {
        id: 4,
        name: "Daily Needs Supermarket",
        category: "Grocery",
        image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=1000",
        distance: "2.1 km",
        rating: 4.5
    }
];

const LandingPage = () => {
    const navigate = useNavigate();
    const shopsRef = React.useRef(null);
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showFilter, setShowFilter] = useState(false);

    useEffect(() => {
        fetchShops();
    }, []);

    const fetchShops = async (category = 'All') => {
        setLoading(true);
        try {
            let data;
            if (category === 'All') {
                data = await shopAPI.getAllShops();
            } else {
                data = await shopAPI.getShopsByCategory(category);
            }

            if (data && data.length > 0) {
                setShops(data);
            } else {
                setShops([]); // Handle empty result
            }
        } catch (err) {
            console.warn("Backend error, using mock data fallback");
            // Simple mock filtering
            if (category === 'All') {
                setShops(MOCK_SHOPS);
            } else {
                setShops(MOCK_SHOPS.filter(s => s.category === category));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
        fetchShops(category);
    };

    return (
        <div className="space-y-16 pb-20">
            <Seo
                title="OrionCart - Shop Smarter, Delivered Faster"
                description="Discover nearby local shops, compare ratings and delivery options, and order from trusted neighborhood sellers."
            />
            {/* Hero Section */}
            <section className="relative h-[800px] flex items-center justify-center overflow-hidden">
                <HeroAnimation />

                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-0"></div>

                <div className="relative z-10 container mx-auto px-4 text-center space-y-6 animate-fade-in">
                    <div className="inline-block mb-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-sm font-medium tracking-wide uppercase">
                        Your Neighborhood Marketplace
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-tight text-white drop-shadow-lg">
                        Shop Smarter, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">Delivered Faster</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-100 max-w-2xl mx-auto font-light drop-shadow-md leading-relaxed">
                        Everything from your favorite nearby shops, brought right to your door.
                    </p>

                    <div className="pt-4">
                        <button
                            onClick={() => shopsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-8 py-4 bg-white text-gray-900 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
                        >
                            Start Shopping
                        </button>
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4 space-y-16">
                {/* Categories */}
                <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
                        <button
                            onClick={() => navigate('/discover')}
                            className="text-primary font-medium hover:underline flex items-center gap-1"
                        >
                            View All <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex overflow-x-auto pb-6 gap-4 scrollbar-hide snap-x snap-mandatory">
                        {[
                            { name: 'All', img: catAll },
                            { name: 'Grocery', img: catGrocery },
                            { name: 'Dairy', img: catDairy },
                            { name: 'Medical', img: catMedical },
                            { name: 'Fashion', img: catFashion },
                            { name: 'Electronics', img: catElectronics }
                        ].map((cat) => (
                            <button
                                key={cat.name}
                                onClick={() => handleCategoryClick(cat.name)}
                                className={`group min-w-[140px] p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-3 snap-center ${selectedCategory === cat.name ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white border-gray-100 hover:border-primary/50 hover:shadow-md'}`}
                                aria-label={`Category: ${cat.name}`}
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${selectedCategory === cat.name ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-primary/5'}`}>
                                    <img src={cat.img} alt={`${cat.name} icon`} className="w-10 h-10 object-contain" />
                                </div>
                                <span className={`font-medium ${selectedCategory === cat.name ? 'text-white' : 'text-gray-700'}`}>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Shops Grid */}
                <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <div ref={shopsRef} className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-bold text-gray-900">Nearby Shops</h2>
                        <div className="relative">
                            <button
                                onClick={() => setShowFilter(f => !f)}
                                className="flex items-center space-x-2 px-4 py-2 rounded-full border border-gray-200 hover:border-primary hover:text-primary transition-colors"
                            >
                                <Filter className="h-4 w-4" />
                                <span>Filter</span>
                            </button>
                            {showFilter && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-10 py-2 animate-fade-in">
                                    <button onClick={() => { setShowFilter(false); navigate('/discover'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium flex items-center gap-2">
                                        <X size={14} /> Clear filter
                                    </button>
                                    {['Grocery', 'Dairy', 'Medical', 'Fashion', 'Electronics'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => { handleCategoryClick(cat); setShowFilter(false); }}
                                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${selectedCategory === cat ? 'text-primary font-semibold' : ''}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[1, 2, 3, 4].map(n => (
                                <div key={n} className="h-80 bg-gray-100 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {shops.map(shop => (
                                <ShopCard key={shop.id} shop={shop} />
                            ))}
                        </div>
                    )}
                </section>


            </div>
        </div>
    );
};

export default LandingPage;
