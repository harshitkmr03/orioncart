import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, MapPin, Navigation, Search, Star, Store, X } from 'lucide-react';
import ShopCard from '../components/ShopCard';
import Seo from '../components/Seo';
import RadiusSlider from '../components/ui/RadiusSlider';
import { discoveryAPI, productAPI } from '../services/api';

const DEMO_LOCATION = {
    lat: 22.7196,
    lon: 75.8577,
    label: 'Using demo location: Indore',
};

const CATEGORY_OPTIONS = [
    'Grocery',
    'Dairy',
    'Pharmacy',
    'Fashion',
    'Electronics',
    'Bakery',
    'General',
];

const RADIUS_PRESETS = [1, 5, 10, 20];
const RATING_FILTERS = [
    { label: 'All ratings', value: '' },
    { label: '4★ & up', value: '4' },
    { label: '3★ & up', value: '3' },
];

const DiscoveryPage = () => {
    const [shops, setShops] = useState([]);
    const [showingAllShops, setShowingAllShops] = useState(false);
    const [productMatches, setProductMatches] = useState([]);
    const [radius, setRadius] = useState(5);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) setSearchQuery(q);
    }, [searchParams]);

    const [selectedCategories, setSelectedCategories] = useState([]);
    const [sortBy, setSortBy] = useState('distance');
    const [minRating, setMinRating] = useState('');
    const [location, setLocation] = useState(null);
    const [locationLabel, setLocationLabel] = useState('Locating you...');
    const [loadingShops, setLoadingShops] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [refreshingLocation, setRefreshingLocation] = useState(false);
    const [error, setError] = useState('');
    const deferredQuery = useDeferredValue(searchQuery);

    const resultCountLabel = useMemo(
        () => `${shops.length} shop${shops.length === 1 ? '' : 's'}${showingAllShops ? ' (all shops)' : ' in range'}`,
        [shops.length, showingAllShops]
    );

    const resolveLocation = async () => {
        setRefreshingLocation(true);
        setError('');

        try {
            const position = await new Promise((resolve) => {
                if (!navigator.geolocation) {
                    resolve({ coords: { latitude: DEMO_LOCATION.lat, longitude: DEMO_LOCATION.lon }, demo: true });
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve(pos),
                    () => resolve({ coords: { latitude: DEMO_LOCATION.lat, longitude: DEMO_LOCATION.lon }, demo: true }),
                    { enableHighAccuracy: true, timeout: 6000, maximumAge: 300000 }
                );
            });

            const nextLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
            };

            setLocation(nextLocation);
            setLocationLabel(position.demo ? DEMO_LOCATION.label : 'Showing shops near your current location');
        } catch {
            setLocation({ lat: DEMO_LOCATION.lat, lon: DEMO_LOCATION.lon });
            setLocationLabel(DEMO_LOCATION.label);
        } finally {
            setRefreshingLocation(false);
        }
    };

    useEffect(() => {
        resolveLocation();
    }, []);

    useEffect(() => {
        if (!location) {
            return;
        }

        let cancelled = false;
        const loadShops = async () => {
            setLoadingShops(true);
            try {
                // First try nearby shops within the radius
                const nearby = await discoveryAPI.getNearby({
                    lat: location.lat,
                    lon: location.lon,
                    radiusKm: radius,
                    categories: selectedCategories,
                    query: deferredQuery,
                    sortBy,
                    minRating: minRating === '' ? null : Number(minRating),
                });

                if (cancelled) return;

                if (nearby.length > 0) {
                    // We have nearby results — show them
                    setShops(nearby);
                    setShowingAllShops(false);
                } else {
                    // No nearby results: fall back to all shops so new shops always appear
                    const all = await discoveryAPI.getAll({
                        lat: location.lat,
                        lon: location.lon,
                        categories: selectedCategories,
                        query: deferredQuery,
                        sortBy: sortBy === 'distance' ? 'newest' : sortBy,
                        minRating: minRating === '' ? null : Number(minRating),
                    });
                    if (!cancelled) {
                        setShops(Array.isArray(all) ? all : []);
                        setShowingAllShops(true);
                    }
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError.message || 'Failed to load nearby shops');
                    setShops([]);
                    setShowingAllShops(false);
                }
            } finally {
                if (!cancelled) {
                    setLoadingShops(false);
                }
            }
        };

        loadShops();
        return () => {
            cancelled = true;
        };
    }, [location, radius, selectedCategories, deferredQuery, sortBy, minRating]);

    useEffect(() => {
        if (!location || deferredQuery.trim().length < 2) {
            setProductMatches([]);
            return;
        }

        let cancelled = false;
        const timeoutId = window.setTimeout(async () => {
            setLoadingProducts(true);
            try {
                const data = await productAPI.searchNearby({
                    query: deferredQuery.trim(),
                    lat: location.lat,
                    lon: location.lon,
                    radiusKm: radius,
                    categories: selectedCategories,
                });

                if (!cancelled) {
                    setProductMatches(Array.isArray(data) ? data : []);
                }
            } catch {
                if (!cancelled) {
                    setProductMatches([]);
                }
            } finally {
                if (!cancelled) {
                    setLoadingProducts(false);
                }
            }
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [location, radius, selectedCategories, deferredQuery]);

    const toggleCategory = (category) => {
        setSelectedCategories((current) => (
            current.includes(category)
                ? current.filter((entry) => entry !== category)
                : [...current, category]
        ));
    };

    return (
        <div className="space-y-8">
            <Seo
                title="Shops Near You - OrionCart"
                description="Browse nearby shops by distance, category, rating, and express ETA."
            />
            <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-8 text-white shadow-xl md:px-10">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-sm uppercase tracking-[0.28em] text-emerald-200">Discovery</p>
                        <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">Find nearby shops and the products you need fast.</h1>
                        <p className="mt-4 max-w-xl text-base text-slate-200">
                            Search by item, narrow by category, and compare nearby shops by distance and delivery ETA.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-white/10 p-3">
                                <Navigation className="h-5 w-5 text-emerald-200" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-300">Location</p>
                                <p className="mt-1 font-semibold">{locationLabel}</p>
                                {location && (
                                    <p className="mt-1 text-sm text-slate-300">
                                        {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={resolveLocation}
                            disabled={refreshingLocation}
                            className="mt-4 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                        >
                            {refreshingLocation ? 'Refreshing...' : 'Refresh location'}
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
                    <div className="space-y-5">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search shops or products like milk, bread, pharmacy..."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-base outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-900">Categories</p>
                                <p className="text-sm text-slate-500">{selectedCategories.length === 0 ? 'All categories' : `${selectedCategories.length} selected`}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORY_OPTIONS.map((category) => {
                                    const active = selectedCategories.includes(category);
                                    return (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => toggleCategory(category)}
                                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                                active
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            {category}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 rounded-3xl bg-slate-50 p-5">
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-900">Search radius</p>
                                <p className="text-sm text-slate-500">{radius} km</p>
                            </div>
                            <RadiusSlider value={radius} onChange={setRadius} min={1} max={20} step={1} />
                            <div className="mt-4 flex flex-wrap gap-2">
                                {RADIUS_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setRadius(preset)}
                                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                            radius === preset
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-white text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        {preset} km
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-900">Sort results</label>
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                            >
                                <option value="distance">Nearest first</option>
                                <option value="rating">Highest rated</option>
                                <option value="eta">Fastest ETA</option>
                                <option value="name">Alphabetical</option>
                                <option value="newest">Newest shops</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-900">Rating filter</label>
                            <div className="flex flex-wrap gap-2">
                                {RATING_FILTERS.map((filter) => {
                                    const active = minRating === filter.value;
                                    return (
                                        <button
                                            key={filter.label}
                                            type="button"
                                            onClick={() => setMinRating(filter.value)}
                                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                                active
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-white text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            <Star className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
                                            {filter.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Results</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{resultCountLabel}</p>
                            <p className="mt-1 text-sm text-slate-500">Express ETA is estimated from distance and can vary by area.</p>
                        </div>
                    </div>
                </div>
            </section>

            {deferredQuery.trim().length >= 2 && (
                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Matching products nearby</h2>
                            <p className="mt-1 text-sm text-slate-500">Product results within your current radius.</p>
                        </div>
                        {loadingProducts && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    </div>

                    {productMatches.length === 0 && !loadingProducts ? (
                        <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
                            No nearby product matches for "{deferredQuery}" yet.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {productMatches.map((product) => (
                                <Link
                                    key={`${product.productId}-${product.shopId}`}
                                    to={`/shop/${product.shopId}`}
                                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    <div className="flex gap-4">
                                        <img
                                            src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'}
                                            alt={product.productName}
                                            className="h-20 w-20 rounded-2xl object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 font-semibold text-slate-900">{product.productName}</p>
                                            <p className="mt-1 text-sm text-slate-500">{product.shopName}</p>
                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                                <span className="font-semibold text-primary">Rs. {Number(product.price || 0).toFixed(2)}</span>
                                                <span>{product.distanceKm?.toFixed(1)} km</span>
                                                <span>{product.etaMinutes ? `~${product.etaMinutes} min` : 'Nearby'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <section className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Nearby shops</h2>
                        <p className="text-sm text-slate-500">Browse local stores within your selected range.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 text-primary" />
                        {resultCountLabel}
                    </div>
                </div>

                {showingAllShops && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <strong>No shops found within {radius} km.</strong> Showing all available shops instead. Try increasing the radius or{' '}
                        <button
                            type="button"
                            onClick={() => setRadius(20)}
                            className="font-semibold underline"
                        >
                            expand to 20 km
                        </button>{' '}
                        to find shops near you.
                    </div>
                )}

                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {loadingShops ? (
                    <div className="flex items-center justify-center rounded-[2rem] border border-slate-200 bg-white py-16 shadow-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : shops.length === 0 ? (
                    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white py-16 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <Store className="h-6 w-6" />
                        </div>
                        <p className="mt-4 text-lg font-semibold text-slate-900">No shops found</p>
                        <p className="mt-2 text-sm text-slate-500">Try increasing the radius or clearing a filter.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {shops.map((shop) => (
                            <ShopCard key={shop.id} shop={shop} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default DiscoveryPage;
