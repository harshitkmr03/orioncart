import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Loader2, MapPin, MessageSquarePlus, Search, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import Seo from '../components/Seo';
import { api } from '../api';
import { reviewAPI, shopAPI, wishlistAPI } from '../services/api';

const ReviewComposer = ({ products, reviewForm, setReviewForm, onSubmit, submittingReview, isSignedIn }) => (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <MessageSquarePlus className="h-5 w-5" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-900">Share Your Experience</h2>
                <p className="mt-1 text-sm text-slate-500">Tell nearby shoppers what stood out about this shop.</p>
            </div>
        </div>

        {!isSignedIn ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Sign in to leave a rating and review for this shop.
            </div>
        ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">Your rating</p>
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => {
                            const active = rating <= Number(reviewForm.rating || 0);
                            return (
                                <button
                                    key={rating}
                                    type="button"
                                    onClick={() => setReviewForm((prev) => ({ ...prev, rating: String(rating) }))}
                                    className={`rounded-full border px-3 py-2 transition ${
                                        active
                                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                    }`}
                                >
                                    <Star className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">Related product (optional)</label>
                    <select
                        value={reviewForm.productId}
                        onChange={(event) => setReviewForm((prev) => ({ ...prev, productId: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                        <option value="">Shop overall</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-900">Comment</label>
                    <textarea
                        value={reviewForm.comment}
                        onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                        rows={4}
                        maxLength={400}
                        placeholder="Fast delivery, good packaging, helpful staff..."
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submittingReview}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                >
                    {submittingReview ? 'Submitting...' : 'Submit review'}
                </button>
            </form>
        )}
    </div>
);

const ShopDetails = ({ onAddToCart }) => {
    const { id } = useParams();
    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [wishlistIds, setWishlistIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [productSearch, setProductSearch] = useState('');
    const [selectedCat, setSelectedCat] = useState('All');
    const [reviewForm, setReviewForm] = useState({
        rating: '5',
        productId: '',
        comment: '',
    });
    const [submittingReview, setSubmittingReview] = useState(false);

    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    })();
    const isSignedIn = Boolean(currentUser?.id && localStorage.getItem('authToken'));

    const loadShopContext = async () => {
        setLoading(true);
        setReviewsLoading(true);
        setError(null);

        try {
            const [shopData, productsData, reviewsData] = await Promise.all([
                shopAPI.getShopById(id),
                api.getProductsByShop(id),
                shopAPI.getReviews(id),
            ]);

            setShop(shopData);
            setProducts((productsData || []).map((product) => ({
                ...product,
                shopId: product.shopId || shopData?.id,
                shopName: product.shopName || shopData?.name,
            })));
            setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        } catch (err) {
            setError(err.message || 'Failed to load shop details');
        } finally {
            setLoading(false);
            setReviewsLoading(false);
        }
    };

    useEffect(() => {
        loadShopContext();
    }, [id]);

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

    const categories = useMemo(() => {
        const cats = [...new Set(products.map((product) => product.category).filter(Boolean))];
        return ['All', ...cats];
    }, [products]);

    const filteredProducts = useMemo(() => (
        products.filter((product) => {
            const matchesCat = selectedCat === 'All' || product.category === selectedCat;
            const matchesSearch = !productSearch || product.name?.toLowerCase().includes(productSearch.toLowerCase());
            return matchesCat && matchesSearch;
        })
    ), [products, selectedCat, productSearch]);

    const handleSubmitReview = async (event) => {
        event.preventDefault();

        try {
            setSubmittingReview(true);
            await reviewAPI.createReview({
                shopId: Number(id),
                productId: reviewForm.productId ? Number(reviewForm.productId) : null,
                rating: Number(reviewForm.rating),
                comment: reviewForm.comment.trim(),
            });
            setReviewForm({
                rating: '5',
                productId: '',
                comment: '',
            });
            await loadShopContext();
        } catch (submitError) {
            alert(submitError.message || 'Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
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

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return <div className="mt-10 text-center text-red-500">{error}</div>;
    }

    if (!shop) {
        return <div className="mt-10 text-center">Shop not found</div>;
    }

    const ratingLabel = typeof shop.rating === 'number' ? shop.rating.toFixed(1) : 'New';
    const reviewCount = shop.reviewCount ?? reviews.length;

    return (
        <div className="space-y-8">
            <Seo
                title={`${shop.name} - ${shop.category || 'Local Shop'} | OrionCart`}
                description={`Browse products, reviews, and fulfillment options for ${shop.name} on OrionCart.`}
            />
            <div className="relative overflow-hidden rounded-[2rem]">
                <img
                    src={shop.image || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=1200'}
                    alt={shop.name}
                    className="h-72 w-full object-cover md:h-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 text-white">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold">{shop.category || 'Local Shop'}</span>
                        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                            {reviewCount} reviews
                        </span>
                    </div>
                    <h1 className="mt-4 text-4xl font-bold">{shop.name}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/90">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{shop.address}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-current text-amber-400" />
                            <span>{ratingLabel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Pickup, scheduled, and express checkout enabled</span>
                        </div>
                    </div>
                </div>
            </div>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Customer Reviews</h2>
                            <p className="mt-1 text-sm text-slate-500">Recent feedback from shoppers who bought from this store.</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-right">
                            <p className="text-xs uppercase tracking-wide text-amber-700">Average rating</p>
                            <p className="mt-1 text-2xl font-bold text-amber-800">{ratingLabel}</p>
                        </div>
                    </div>

                    {reviewsLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
                            No reviews yet. The first buyer review will show up here.
                        </div>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {reviews.slice(0, 6).map((review) => (
                                <div key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-900">{review.buyerName || 'Verified buyer'}</p>
                                            <div className="mt-2 flex items-center gap-1 text-amber-500">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`h-4 w-4 ${star <= Number(review.rating || 0) ? 'fill-current' : ''}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recently'}
                                        </p>
                                    </div>
                                    {review.comment && <p className="mt-3 text-sm leading-6 text-slate-700">{review.comment}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <ReviewComposer
                    products={products}
                    reviewForm={reviewForm}
                    setReviewForm={setReviewForm}
                    onSubmit={handleSubmitReview}
                    submittingReview={submittingReview}
                    isSignedIn={isSignedIn}
                />
            </section>

            <div className="sticky top-20 z-40 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Search in this shop..."
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCat(category)}
                            className={`rounded-lg border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                                selectedCat === category
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-slate-200 bg-white hover:border-primary hover:text-primary'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                    No products found{productSearch ? ` for "${productSearch}"` : ''}.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={onAddToCart}
                            isWishlisted={wishlistIds.includes(product.id)}
                            onToggleWishlist={handleToggleWishlist}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ShopDetails;
