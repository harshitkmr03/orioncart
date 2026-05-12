import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import {
    AlertTriangle,
    DollarSign,
    Edit,
    FileText,
    Loader2,
    MapPin,
    Package,
    Plus,
    ShoppingBag,
    Star,
    Store,
    Trash2,
    X,
} from 'lucide-react';
import { api } from '../api';
import { orderAPI, productAPI, shopAPI } from '../services/api';
import QuickStockControl from '../components/QuickStockControl';
import BulkUpload from '../components/BulkUpload';

// Lazy-load the map so Leaflet CSS doesn't block the initial bundle
const LocationPickerMap = lazy(() => import('../components/LocationPickerMap'));

const EMPTY_PRODUCT_FORM = {
    name: '',
    sku: '',
    category: '',
    price: '',
    stock: '',
    lowStockThreshold: '5',
    imageUrl: '',
};

const normalizeProductRecord = (product = {}) => {
    const stock = Number(product.stockQuantity ?? product.stock ?? 0);
    const lowStockThreshold = Number.isFinite(Number(product.lowStockThreshold))
        ? Number(product.lowStockThreshold)
        : 5;

    return {
        id: product.id,
        name: product.name || '',
        sku: product.sku || '',
        category: product.category || product.description || '',
        price: Number(product.price || 0),
        stock,
        lowStockThreshold,
        imageUrl: product.imageUrl || '',
        lastStockUpdateAt: product.lastStockUpdateAt || null,
        raw: product,
    };
};

const getInventoryStatus = (product) => {
    if (product.stock <= 0) {
        return { label: 'Out of Stock', tone: 'bg-red-100 text-red-800' };
    }

    if (product.stock <= product.lowStockThreshold) {
        return { label: 'Low Stock', tone: 'bg-amber-100 text-amber-800' };
    }

    return { label: 'Healthy', tone: 'bg-green-100 text-green-800' };
};

const formatInventoryTimestamp = (value) => {
    if (!value) {
        return 'Not yet updated';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Recently updated';
    }

    return parsed.toLocaleString();
};

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const formatOrderDate = (value) => {
    if (!value) {
        return 'Just now';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return 'Recently';
    }

    return parsed.toLocaleString();
};

const ORDER_STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED'];

const ORDER_STATUS_TONES = {
    PENDING: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    READY: 'bg-violet-100 text-violet-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
};

const formatStatusLabel = (value) => {
    if (!value) {
        return 'Unknown';
    }

    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const formatFulfillmentLabel = (value) => {
    if (value === 'AGENT') {
        return 'Express Delivery';
    }
    if (value === 'SCHEDULED') {
        return 'Scheduled Delivery';
    }
    if (value === 'PICKUP') {
        return 'Self Collect';
    }
    return formatStatusLabel(value);
};

const getOrderItemSummary = (order) => {
    const items = order?.items || [];
    if (items.length === 0) {
        return 'No items';
    }

    if (items.length === 1) {
        return `${items[0]?.productName || 'Item'} x${items[0]?.quantity || 1}`;
    }

    return `${items[0]?.productName || 'Item'} +${items.length - 1} more`;
};

const OrderSlipModal = ({ slip, onClose }) => {
    if (!slip) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Order Slip</h3>
                        <p className="mt-1 text-sm text-gray-500">Order #{slip.orderId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Print
                        </button>
                        <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Customer</p>
                        <p className="mt-1 font-semibold text-slate-900">{slip.customerName || 'Customer'}</p>
                        <p className="mt-1 text-sm text-slate-600">{slip.customerPhone || 'No phone provided'}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Fulfillment</p>
                        <p className="mt-1 font-semibold text-slate-900">{slip.fulfillmentType}</p>
                        <p className="mt-1 text-sm text-slate-600">{slip.scheduledSlot || slip.scheduleTime || 'No slot selected'}</p>
                    </div>
                </div>

                <div className="mt-5">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Delivery / Pickup Notes</p>
                    <p className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                        {slip.deliveryAddress || slip.note || 'No address provided'}
                    </p>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Item', 'Qty', 'Price'].map((heading) => (
                                    <th key={heading} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {(slip.items || []).map((item, index) => (
                                <tr key={`${item.productId || index}-${index}`}>
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.productName}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{item.quantity}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(item.price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Subtotal</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatCurrency(slip.subtotalAmount)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Tax</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatCurrency(slip.taxAmount)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Delivery</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatCurrency(slip.deliveryCharge)}</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-3">
                        <p className="text-xs uppercase tracking-wide text-primary">Total</p>
                        <p className="mt-1 font-semibold text-primary">{formatCurrency(slip.totalAmount)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProductModal = ({ isOpen, onClose, onSave, shopId, initialData, isSaving }) => {
    const isEdit = Boolean(initialData);
    const [form, setForm] = useState(initialData || EMPTY_PRODUCT_FORM);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setForm(initialData || EMPTY_PRODUCT_FORM);
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setForm(initialData || EMPTY_PRODUCT_FORM);
    }, [initialData, isOpen]);

    const handleNameChange = async (event) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, name: value }));

        if (!isEdit && value.trim().length > 1) {
            try {
                const results = await api.searchLibraryProducts(value);
                setSuggestions(results);
                setShowSuggestions(true);
            } catch {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (product) => {
        setForm((prev) => ({
            ...prev,
            name: product.name || '',
            category: product.category || prev.category,
            price: product.price ? String(product.price) : prev.price,
            imageUrl: product.imageUrl || prev.imageUrl,
        }));
        setShowSuggestions(false);
    };

    if (!isOpen) {
        return null;
    }

    const submit = async (event) => {
        event.preventDefault();
        const payload = {
            name: form.name.trim(),
            sku: form.sku.trim(),
            category: form.category.trim(),
            description: form.category.trim(),
            price: Number(form.price || 0),
            stockQuantity: Number(form.stock || 0),
            lowStockThreshold: Number(form.lowStockThreshold || 5),
            imageUrl: form.imageUrl.trim(),
            shopId,
        };

        await onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Product' : 'Add Product'}</h3>
                        <p className="mt-1 text-sm text-gray-500">Keep inventory fast to update with the fields sellers use every day.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div className="relative">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Product Name</label>
                        <input
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="e.g. Parle-G"
                            value={form.name}
                            onChange={handleNameChange}
                            required
                        />

                        {showSuggestions && suggestions.length > 0 && (
                            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                                {suggestions.map((suggestion, index) => (
                                    <li
                                        key={`${suggestion.name}-${index}`}
                                        onClick={() => selectSuggestion(suggestion)}
                                        className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-blue-50"
                                    >
                                        {suggestion.imageUrl ? (
                                            <img src={suggestion.imageUrl} alt="" className="h-9 w-9 rounded-lg bg-gray-100 object-cover" />
                                        ) : (
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-primary">
                                                <Package size={16} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{suggestion.name}</p>
                                            <p className="text-xs text-gray-500">{suggestion.category || 'Catalog suggestion'}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">SKU</label>
                            <input
                                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                placeholder="e.g. GRC-1001"
                                value={form.sku}
                                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                            <input
                                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                placeholder="e.g. Grocery"
                                value={form.category}
                                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Price (Rs.)</label>
                            <input
                                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
                            <input
                                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                type="number"
                                min="0"
                                value={form.stock}
                                onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Low Stock Alert</label>
                            <input
                                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                type="number"
                                min="0"
                                value={form.lowStockThreshold}
                                onChange={(event) => setForm((prev) => ({ ...prev, lowStockThreshold: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Image URL</label>
                        <input
                            className="w-full rounded-lg border border-gray-300 px-4 py-2"
                            placeholder="https://..."
                            value={form.imageUrl}
                            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 px-5 py-2 font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-lg bg-primary px-5 py-2 font-medium text-white hover:bg-primary/90 disabled:opacity-60"
                        >
                            {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Nominatim geocoding search for CreateShopForm ───────────────────────────
const useLocationSearch = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const timerRef = useRef(null);

    const runSearch = useCallback((q) => {
        if (q.trim().length < 3) { setSearchResults([]); setSearchOpen(false); return; }
        setSearching(true);
        fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10`,
            { headers: { 'Accept-Language': 'en' } }
        )
            .then((r) => r.json())
            .then((data) => { 
                const mapped = (data.features || []).map(f => {
                    const p = f.properties;
                    const parts = [p.name, p.street, p.district, p.city, p.state, p.country].filter(Boolean);
                    const uniqueParts = [...new Set(parts)];
                    return {
                        lat: parseFloat(f.geometry.coordinates[1]),
                        lon: parseFloat(f.geometry.coordinates[0]),
                        display_name: uniqueParts.join(', ')
                    };
                });
                setSearchResults(mapped || []); setSearchOpen(true); 
            })
            .catch(() => setSearchResults([]))
            .finally(() => setSearching(false));
    }, []);

    const handleQueryChange = (value) => {
        setSearchQuery(value);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => runSearch(value), 500);
    };

    const clearSearch = () => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); };

    return { searchQuery, searchResults, searching, searchOpen, setSearchOpen, handleQueryChange, clearSearch };
};

const ShopForm = ({ userId, shop, onSaved, onClose }) => {
    const isEdit = Boolean(shop);
    const [form, setForm] = useState({
        name: shop?.name || '',
        category: shop?.category || 'Grocery',
        address: shop?.address || '',
        description: shop?.description || '',
        latitude: shop?.latitude || null,
        longitude: shop?.longitude || null,
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [locating, setLocating] = useState(false);
    const [locationMode, setLocationMode] = useState('map'); // 'map' | 'search'
    const searchWrapRef = useRef(null);
    const locationSearch = useLocationSearch();

    // Close search dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
                locationSearch.setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [locationSearch]);

    // ── GPS detection ────────────────────────────────────────────────────────
    const detectLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported. Please pick on the map or enter coordinates manually.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = parseFloat(pos.coords.latitude.toFixed(6));
                const lng = parseFloat(pos.coords.longitude.toFixed(6));
                setForm((p) => ({ ...p, latitude: lat, longitude: lng }));
                setLocating(false);
            },
            () => {
                alert('Could not detect location. Please click on the map or enter coordinates manually.');
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    // ── Map pin callback ─────────────────────────────────────────────────────
    const handleMapChange = (lat, lng) => {
        if (lat == null) {
            setForm((p) => ({ ...p, latitude: null, longitude: null }));
        } else {
            setForm((p) => ({ ...p, latitude: lat, longitude: lng }));
        }
    };

    // ── Location search result selected ─────────────────────────────────────
    const handleSearchSelect = (result) => {
        const lat = parseFloat(parseFloat(result.lat).toFixed(6));
        const lng = parseFloat(parseFloat(result.lon).toFixed(6));
        const label = result.display_name.split(', ').slice(0, 3).join(', ');
        setForm((p) => ({
            ...p,
            latitude: lat,
            longitude: lng,
            address: p.address || label,
        }));
        locationSearch.setSearchOpen(false);
        locationSearch.clearSearch();
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setSaveError('');

        const payload = {
            name: form.name.trim(),
            category: form.category,
            address: form.address.trim(),
            description: form.description.trim(),
            latitude: form.latitude,
            longitude: form.longitude,
        };

        try {
            if (isEdit) {
                const updatedShop = await shopAPI.updateShop(shop.id, payload);
                onSaved(updatedShop);
            } else {
                const newShop = await shopAPI.createShopForOwner(userId, payload);
                onSaved(newShop);
            }
        } catch (error) {
            setSaveError(error.message || `Failed to ${isEdit ? 'update' : 'create'} shop. Please try again.`);
        } finally {
            setSaving(false);
        }
    };

    const hasLocation = form.latitude != null && form.longitude != null;

    return (
        /* ── Slide-over modal overlay ── */
        <div className="fixed inset-0 z-[200] flex">
            {/* Backdrop */}
            <div
                className="flex-1 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Panel */}
            <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
                {/* Sticky header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Store size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Shop' : 'Add New Shop'}</h2>
                            <p className="text-xs text-gray-500">Fill in details and pin your location on the map</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 px-6 py-5">

            <form onSubmit={submit} className="space-y-5">
                {/* ── Name + Category ── */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Shop Name *</label>
                        <input
                            required
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="e.g. Sharma General Store"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Category *</label>
                        <select
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            value={form.category}
                            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                        >
                            {['Grocery', 'Dairy', 'Pharmacy', 'Fashion', 'Electronics', 'Bakery', 'General'].map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Address ── */}
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Address *</label>
                    <input
                        required
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="123 Market Street, City"
                        value={form.address}
                        onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    />
                </div>

                {/* ── Description ── */}
                <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Description</label>
                    <textarea
                        rows={2}
                        className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Brief description of what you sell..."
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                </div>

                {/* ── Location section ── */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    {/* Title row + GPS button */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-primary" />
                            <span className="text-sm font-semibold text-gray-800">
                                Shop Location
                                <span className="ml-1 text-xs font-normal text-gray-400">(shown on Discover page)</span>
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={detectLocation}
                            disabled={locating}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
                        >
                            {locating
                                ? <><Loader2 size={12} className="animate-spin" /> Detecting…</>
                                : <><MapPin size={12} /> Use my GPS</>}
                        </button>
                    </div>

                    {/* Mode tabs */}
                    <div className="flex rounded-xl border border-slate-200 bg-white p-1">
                        {[
                            { key: 'map', label: '🗺  Pick on map' },
                            { key: 'search', label: '🔍  Search location' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setLocationMode(tab.key)}
                                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                    locationMode === tab.key
                                        ? 'bg-primary text-white shadow'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Map mode */}
                    {locationMode === 'map' && (
                        <div>
                            <p className="mb-2 text-xs text-slate-500">
                                Click anywhere on the map to drop a pin. Drag the pin to fine-tune the position.
                            </p>
                            <Suspense fallback={
                                <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-500">
                                    Loading map…
                                </div>
                            }>
                                <LocationPickerMap
                                    lat={form.latitude}
                                    lng={form.longitude}
                                    onChange={handleMapChange}
                                />
                            </Suspense>
                        </div>
                    )}

                    {/* Search location mode */}
                    {locationMode === 'search' && (
                        <div ref={searchWrapRef} className="relative">
                            <p className="mb-2 text-xs text-slate-500">
                                Type your shop's area, street, or landmark — pick from the results to pin the location.
                            </p>
                            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    className="flex-1 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                                    placeholder="e.g. Vijay Nagar, Indore"
                                    value={locationSearch.searchQuery}
                                    onChange={(e) => locationSearch.handleQueryChange(e.target.value)}
                                    onFocus={() => locationSearch.searchResults.length > 0 && locationSearch.setSearchOpen(true)}
                                />
                                {locationSearch.searching && (
                                    <svg className="h-4 w-4 animate-spin flex-shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                    </svg>
                                )}
                                {locationSearch.searchQuery && !locationSearch.searching && (
                                    <button type="button" onClick={locationSearch.clearSearch} className="flex-shrink-0 rounded-full p-0.5 text-slate-400 hover:text-slate-600">
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Results dropdown */}
                            {locationSearch.searchOpen && locationSearch.searchResults.length > 0 && (
                                <ul className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                    {locationSearch.searchResults.map((result, idx) => {
                                        const parts = result.display_name.split(', ');
                                        const main = parts.slice(0, 2).join(', ');
                                        const sub = parts.slice(2, 5).join(', ');
                                        return (
                                            <li key={result.place_id || idx}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSearchSelect(result)}
                                                    className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-primary/5"
                                                >
                                                    <MapPin size={14} className="mt-0.5 flex-shrink-0 text-primary" />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-800">{main}</p>
                                                        {sub && <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>}
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {locationSearch.searchOpen && locationSearch.searchResults.length === 0 && !locationSearch.searching && locationSearch.searchQuery.length >= 3 && (
                                <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg">
                                    No results found. Try a different search term.
                                </div>
                            )}

                            {/* Show pinned result */}
                            {form.latitude != null && (
                                <div className="mt-2 flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
                                    <p className="text-xs font-medium text-primary">📍 Location selected: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}</p>
                                    <button type="button" onClick={() => setForm((p) => ({ ...p, latitude: null, longitude: null }))} className="ml-2 text-xs font-semibold text-red-500 hover:text-red-700">Clear</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status badge */}
                    {hasLocation ? (
                        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                            Location pinned: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
                            No location set — shop will appear in &quot;All shops&quot; but not in nearby distance searches.
                        </div>
                    )}
                </div>

                    {/* Error banner */}
                    {saveError && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <p className="text-sm text-red-700">{saveError}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-2xl bg-primary py-3.5 font-semibold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-60"
                    >
                        {saving ? (isEdit ? 'Saving changes…' : 'Creating your shop…') : (isEdit ? 'Save Changes' : 'Create My Shop →')}
                    </button>
                </form>
                </div>
            </div>
        </div>
    );
};


const SellerDashboard = () => {
    // ── All shops owned by this seller ──────────────────────────────────────
    const [allShops, setAllShops] = useState([]);
    const [shop, setShop] = useState(null);          // currently selected shop
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
    const shopDropdownRef = useRef(null);

    // Close shop dropdown on click outside
    useEffect(() => {
        const handler = (e) => {
            if (shopDropdownRef.current && !shopDropdownRef.current.contains(e.target)) {
                setShopDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [shopLoading, setShopLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [saving, setSaving] = useState(false);
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [loadingSlipId, setLoadingSlipId] = useState(null);
    const [activeSlip, setActiveSlip] = useState(null);

    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    })();
    const userId = currentUser?.id;

    // ── Data loaders for the active shop ────────────────────────────────────
    const fetchProducts = async () => {
        if (!shop?.id) return;
        try {
            setLoading(true);
            const data = await productAPI.getProductsByShop(shop.id);
            setProducts((data || []).map(normalizeProductRecord));
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        if (!shop?.id) return;
        try {
            setOrdersLoading(true);
            const data = await orderAPI.getOrdersBySeller(shop.id);
            setOrders(data || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setOrdersLoading(false);
        }
    };

    const fetchOverview = async () => {
        if (!shop?.id) return;
        try {
            setOverviewLoading(true);
            const data = await shopAPI.getAnalyticsOverview(shop.id);
            setOverview(data);
        } catch (error) {
            console.error('Failed to fetch seller overview:', error);
        } finally {
            setOverviewLoading(false);
        }
    };

    // ── Load all shops for this seller on mount ──────────────────────────────
    useEffect(() => {
        if (!userId) {
            setShopLoading(false);
            return;
        }

        (async () => {
            try {
                const shops = await shopAPI.getShopByOwner(userId); // returns array
                const list = Array.isArray(shops) ? shops : [];
                setAllShops(list);
                if (list.length > 0) {
                    setShop(list[0]); // default to first shop
                }
            } catch (error) {
                console.warn('Could not load seller shops', error);
            } finally {
                setShopLoading(false);
            }
        })();
    }, [userId]);

    // ── Reload shop data whenever the active shop changes ────────────────────
    useEffect(() => {
        if (!shop?.id) return;
        setProducts([]);
        setOrders([]);
        setOverview(null);
        fetchProducts();
        fetchOrders();
        fetchOverview();
    }, [shop?.id]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleShopSwitch = (selectedShop) => {
        setShop(selectedShop);
    };

    const handleShopSaved = (savedShop) => {
        setShop(savedShop);
        setShowCreateForm(false);
        setShowEditForm(false);
        // Re-fetch to make sure allShops is up to date
        if (userId) {
            shopAPI.getShopByOwner(userId).then((shops) => {
                const list = Array.isArray(shops) ? shops : [];
                setAllShops(list);
            }).catch(() => {});
        }
    };

    const handleShopDelete = async () => {
        if (allShops.length <= 1) {
            alert('You cannot delete your only shop.');
            return;
        }
        if (!window.confirm(`Are you sure you want to delete ${shop.name}? This action cannot be undone.`)) {
            return;
        }
        try {
            await shopAPI.deleteShop(shop.id);
            // Re-fetch all shops
            const shops = await shopAPI.getShopByOwner(userId);
            const list = Array.isArray(shops) ? shops : [];
            setAllShops(list);
            if (list.length > 0) {
                setShop(list[0]);
            } else {
                setShop(null);
            }
        } catch (error) {
            alert(error.message || 'Failed to delete shop');
        }
    };

    const handleSave = async (payload) => {
        try {
            setSaving(true);
            if (editingProduct) {
                await productAPI.updateProduct(editingProduct.id, payload);
            } else {
                await productAPI.addProduct({ ...payload, shopId: shop.id });
            }
            setModalOpen(false);
            setEditingProduct(null);
            await Promise.all([fetchProducts(), fetchOverview()]);
        } catch (error) {
            alert(error.message || 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStock = async (productId, newStock) => {
        setProducts((prev) => prev.map((product) => (
            product.id === productId
                ? { ...product, stock: newStock, lastStockUpdateAt: new Date().toISOString() }
                : product
        )));
        try {
            const updated = await productAPI.quickStockUpdate(productId, newStock);
            setProducts((prev) => prev.map((product) => (
                product.id === productId ? normalizeProductRecord(updated) : product
            )));
            await fetchOverview();
        } catch (error) {
            await fetchProducts();
            await fetchOverview();
            throw error;
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            await productAPI.deleteProduct(productId);
            setProducts((prev) => prev.filter((product) => product.id !== productId));
            await fetchOverview();
        } catch (error) {
            alert(error.message || 'Failed to delete product');
        }
    };

    const handleOrderStatusChange = async (orderId, nextStatus) => {
        try {
            setUpdatingOrderId(orderId);
            const updatedOrder = await orderAPI.updateStatus(orderId, nextStatus);
            setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));
            if (activeSlip?.orderId === orderId) {
                const refreshedSlip = await orderAPI.getOrderSlip(orderId);
                setActiveSlip(refreshedSlip);
            }
            await fetchOverview();
        } catch (error) {
            alert(error.message || 'Failed to update order status');
            await fetchOrders();
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handleOpenSlip = async (orderId) => {
        try {
            setLoadingSlipId(orderId);
            const slip = await orderAPI.getOrderSlip(orderId);
            setActiveSlip(slip);
        } catch (error) {
            alert(error.message || 'Failed to load order slip');
        } finally {
            setLoadingSlipId(null);
        }
    };

    const openAddModal = () => { setEditingProduct(null); setModalOpen(true); };
    const openEditModal = (product) => {
        setEditingProduct({
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            price: String(product.price),
            stock: String(product.stock),
            lowStockThreshold: String(product.lowStockThreshold),
            imageUrl: product.imageUrl || '',
        });
        setModalOpen(true);
    };

    // ── Guards ───────────────────────────────────────────────────────────────
    if (!userId) {
        return (
            <div className="mt-20 text-center">
                <h2 className="mb-4 text-xl font-semibold text-gray-700">Please sign in to access the Seller Dashboard</h2>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal'))}
                    className="rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90"
                >
                    Sign In
                </button>
            </div>
        );
    }

    if (shopLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    // No shops yet — show empty state; CreateShopForm opens as overlay when triggered
    if (allShops.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
                    <Store size={36} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">You have no shops yet</h2>
                <p className="mt-2 max-w-sm text-sm text-gray-500">
                    Create your first shop to start listing products and receiving orders from local customers.
                </p>
                <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 font-semibold text-white shadow-lg hover:bg-primary/90 transition"
                >
                    <Plus size={18} /> Create My First Shop
                </button>

                {/* ShopForm renders as slide-over overlay */}
                {showCreateForm && (
                    <ShopForm
                        userId={userId}
                        onSaved={handleShopSaved}
                        onClose={() => setShowCreateForm(false)}
                    />
                )}
            </div>
        );
    }

    const lowStockProducts = products.filter((product) => product.stock <= product.lowStockThreshold);
    const fallbackPendingOrders = orders.filter((order) => order.status === 'PENDING' || order.status === 'CONFIRMED').length;
    const fallbackTodaysSales = orders
        .filter((order) => {
            if (!order?.createdAt) {
                return false;
            }

            const createdAt = new Date(order.createdAt);
            if (Number.isNaN(createdAt.getTime())) {
                return false;
            }

            return createdAt.toDateString() === new Date().toDateString();
        })
        .filter((order) => ['CONFIRMED', 'READY', 'COMPLETED'].includes(order.status))
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    const overviewCards = [
        {
            label: "Today's Sales",
            value: formatCurrency(overview?.todaysSalesAmount ?? fallbackTodaysSales),
            icon: DollarSign,
            tone: 'bg-green-100 text-green-600',
        },
        {
            label: 'Pending Orders',
            value: String(overview?.pendingOrders ?? fallbackPendingOrders),
            icon: ShoppingBag,
            tone: 'bg-blue-100 text-blue-600',
        },
        {
            label: 'Low Stock Items',
            value: String(overview?.lowStockProducts ?? lowStockProducts.length),
            icon: AlertTriangle,
            tone: 'bg-amber-100 text-amber-700',
        },
        {
            label: 'Average Rating',
            value: `${Number(overview?.averageRating ?? shop.rating ?? 0).toFixed(1)} / 5`,
            subValue: `${overview?.reviewCount ?? shop.reviewCount ?? 0} reviews`,
            icon: Star,
            tone: 'bg-rose-100 text-rose-600',
        },
        {
            label: 'Total Products',
            value: String(products.length),
            icon: Package,
            tone: 'bg-violet-100 text-violet-600',
        },
    ];

    return (
        <div className="space-y-8">
            {/* ── Header: shop switcher + actions ── */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 min-w-0">
                    {/* Active shop header & actions */}
                    <div className="mb-4 flex items-center justify-between">
                        <div className="relative" ref={shopDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setShopDropdownOpen((p) => !p)}
                                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 transition shadow-sm"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Store size={20} />
                                </div>
                                <div className="text-left">
                                    <h1 className="text-lg font-bold text-gray-900 leading-tight">
                                        {shop.name}
                                    </h1>
                                    <p className="text-xs font-medium text-slate-500">
                                        {shop.category || 'Local Shop'} • {allShops.length} shop{allShops.length > 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="ml-2">
                                    <svg className={`h-5 w-5 text-slate-400 transition-transform ${shopDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {shopDropdownOpen && (
                                <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                    <div className="mb-2 px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Your Shops
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {allShops.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => { handleShopSwitch(s); setShopDropdownOpen(false); }}
                                                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                                                    shop.id === s.id ? 'bg-primary/10' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${shop.id === s.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Store size={14} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`truncate text-sm font-semibold ${shop.id === s.id ? 'text-primary' : 'text-slate-900'}`}>
                                                        {s.name}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-500">{s.address || 'No address'}</p>
                                                </div>
                                                {shop.id === s.id && (
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 border-t border-slate-100 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => { setShowCreateForm(true); setShopDropdownOpen(false); }}
                                            className="flex w-full items-center gap-2 rounded-xl p-3 text-left text-sm font-semibold text-primary hover:bg-primary/5 transition"
                                        >
                                            <Plus size={16} /> Add Another Shop
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Edit / Delete actions for the active shop */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowEditForm(true)}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary transition"
                                title="Edit Shop Details"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={handleShopDelete}
                                disabled={allShops.length <= 1}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition"
                                title={allShops.length <= 1 ? "Cannot delete your only shop" : "Delete Shop"}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Active shop location preview */}
                    <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                        <MapPin size={16} className="text-slate-400" />
                        {shop.address || 'Location not specified'}
                        {shop.latitude != null && shop.longitude != null && (
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                                {shop.latitude.toFixed(4)}, {shop.longitude.toFixed(4)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Add New Shop */}
                    <button
                        type="button"
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Add New Shop
                    </button>

                    <BulkUpload
                        shopId={shop.id}
                        onSuccess={async () => {
                            await Promise.all([fetchProducts(), fetchOverview()]);
                        }}
                    />
                    <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add Product
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
                {overviewCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="card flex items-center gap-4">
                            <div className={`rounded-full p-3 ${card.tone}`}>
                                <Icon className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">{card.label}</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {overviewLoading ? '...' : card.value}
                                </p>
                                {card.subValue && <p className="mt-1 text-xs text-gray-500">{card.subValue}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {lowStockProducts.length > 0 && (
                <div className="card">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Low Stock Watchlist</h2>
                        <p className="mt-1 text-sm text-gray-500">Products at or below their refill threshold.</p>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {lowStockProducts.slice(0, 6).map((product) => (
                            <div key={product.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-gray-900">{product.name}</p>
                                        <p className="text-sm text-gray-600">{product.category || 'Uncategorized'}</p>
                                    </div>
                                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-amber-700">
                                        {product.stock}/{product.lowStockThreshold}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm text-gray-600">Last updated: {formatInventoryTimestamp(product.lastStockUpdateAt)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Order Management</h2>
                        <p className="mt-1 text-sm text-gray-500">Review new orders, update status, and open printable order slips.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                        <ShoppingBag className="h-4 w-4" />
                        {orders.length} orders
                    </div>
                </div>

                {ordersLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b bg-gray-50">
                                <tr>
                                    {['Order', 'Customer', 'Fulfillment', 'Items', 'Total', 'Status', 'Actions'].map((heading) => (
                                        <th key={heading} className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">#{order.id}</p>
                                            <p className="text-sm text-gray-500">{formatOrderDate(order.createdAt)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{order.contactName || 'Customer'}</p>
                                            <p className="text-sm text-gray-500">{order.contactPhone || order.deliveryAddress || 'Contact details unavailable'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{formatFulfillmentLabel(order.fulfillmentType)}</p>
                                            <p className="text-sm text-gray-500">{order.scheduledSlot || order.scheduleTime || 'As soon as possible'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {getOrderItemSummary(order)}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(order.totalAmount)}</td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_TONES[order.status] || 'bg-slate-100 text-slate-700'}`}>
                                                    {formatStatusLabel(order.status)}
                                                </span>
                                                <select
                                                    value={order.status || 'PENDING'}
                                                    onChange={(event) => handleOrderStatusChange(order.id, event.target.value)}
                                                    disabled={updatingOrderId === order.id}
                                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700"
                                                >
                                                    {ORDER_STATUS_OPTIONS.map((status) => (
                                                        <option key={status} value={status}>
                                                            {formatStatusLabel(status)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenSlip(order.id)}
                                                disabled={loadingSlipId === order.id}
                                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                            >
                                                {loadingSlipId === order.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <FileText className="h-4 w-4" />
                                                )}
                                                View slip
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400">
                                            No orders yet. New customer orders will start showing up here.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card overflow-hidden">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Inventory Management</h2>
                    <p className="mt-1 text-sm text-gray-500">Quick updates, SKU tracking, and server-side CSV imports.</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b bg-gray-50">
                                <tr>
                                    {['Product', 'SKU', 'Price', 'Current Qty', 'Low Stock Alert', 'Last Updated', 'Status', 'Actions'].map((heading) => (
                                        <th key={heading} className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {products.map((product) => {
                                    const status = getInventoryStatus(product);
                                    return (
                                        <tr
                                            key={product.id}
                                            className={`hover:bg-gray-50 ${product.stock <= product.lowStockThreshold ? 'bg-amber-50/40' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {product.imageUrl ? (
                                                        <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-lg bg-gray-100 object-cover" />
                                                    ) : (
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-primary">
                                                            <Package size={18} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-gray-900">{product.name}</p>
                                                        <p className="text-sm text-gray-500">{product.category || 'Uncategorized'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{product.sku || 'Not set'}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">Rs. {product.price.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-gray-500">
                                                <QuickStockControl
                                                    productId={product.id}
                                                    initialStock={product.stock}
                                                    onUpdate={handleUpdateStock}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                Alert at {product.lowStockThreshold} units
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {formatInventoryTimestamp(product.lastStockUpdateAt)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status.tone}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(product)}
                                                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                                        title="Edit product"
                                                    >
                                                        <Edit className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                        className="rounded p-1 text-red-600 hover:bg-red-50"
                                                        title="Delete product"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-gray-400">
                                            No products yet. Add your first product or import a CSV to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <OrderSlipModal slip={activeSlip} onClose={() => setActiveSlip(null)} />

            <ProductModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingProduct(null);
                }}
                onSave={handleSave}
                shopId={shop.id}
                initialData={editingProduct}
                isSaving={saving}
            />

            {/* ── Add New Shop slide-over (rendered when seller already has shops) ── */}
            {showCreateForm && (
                <ShopForm
                    userId={userId}
                    onSaved={handleShopSaved}
                    onClose={() => setShowCreateForm(false)}
                />
            )}

            {/* ── Edit Shop slide-over ── */}
            {showEditForm && (
                <ShopForm
                    userId={userId}
                    shop={shop}
                    onSaved={handleShopSaved}
                    onClose={() => setShowEditForm(false)}
                />
            )}
        </div>
    );
};

export default SellerDashboard;
