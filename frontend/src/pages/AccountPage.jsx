import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertCircle,
    Camera,
    CheckCircle2,
    Clock,
    Download,
    Gift,
    Heart,
    Loader2,
    MessageSquare,
    Package,
    ShieldAlert,
    ShoppingBag,
    Sparkles,
    Star,
    Truck,
    X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { disputeAPI, loyaltyAPI, orderAPI, reviewAPI, wishlistAPI } from '../services/api';

const DISPUTE_REASONS = [
    'ITEM_NOT_DELIVERED',
    'WRONG_ITEM',
    'DAMAGED',
    'QUALITY_ISSUE',
    'OTHER',
];

/** 24-hour dispute window in milliseconds */
const DISPUTE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Statuses that allow raising a dispute */
const DISPUTE_ELIGIBLE_STATUSES = ['DELIVERED', 'COLLECTED', 'COMPLETED'];

/**
 * Returns the deadline Date for raising a dispute.
 * Uses the LATEST available timestamp so the window always starts
 * from when the order was actually completed/collected:
 *   updatedAt  (most accurate — when backend last changed the status)
 *   scheduleTime / scheduledSlot  (when pickup/delivery was due)
 *   createdAt  (last resort)
 */
const getDisputeDeadline = (order) => {
    const candidates = [
        order.updatedAt,
        order.scheduleTime,
        order.scheduledSlot,
        order.createdAt,
    ].filter(Boolean);

    for (const ts of candidates) {
        const t = new Date(ts);
        if (!Number.isNaN(t.getTime())) {
            return new Date(t.getTime() + DISPUTE_WINDOW_MS);
        }
    }
    // If no timestamp at all, give a 24-hr window from now
    return new Date(Date.now() + DISPUTE_WINDOW_MS);
};

/** Formats remaining milliseconds as "Xh Ym" or "Zm" */
const formatCountdown = (ms) => {
    if (ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
    if (!value) {
        return 'Recently';
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Recently' : parsed.toLocaleString();
};

const formatStatusLabel = (value) => (value || 'UNKNOWN')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

// ─── Order status helpers ────────────────────────────────────────────────────

/**
 * Returns the "effective" status of an order.
 * If the order is still PENDING / CONFIRMED but the scheduled slot time has
 * already passed, we optimistically treat it as DELIVERED / COLLECTED.
 */
const getEffectiveStatus = (order) => {
    const raw = (order.status || '').toUpperCase();
    if (['DELIVERED', 'COLLECTED', 'COMPLETED'].includes(raw)) return raw;

    // Parse scheduled time — try scheduleTime or scheduledSlot fields
    const timeStr = order.scheduleTime || order.scheduledSlot || '';
    if (timeStr) {
        const scheduled = new Date(timeStr);
        if (!Number.isNaN(scheduled.getTime()) && scheduled < new Date()) {
            const isPickup =
                (order.fulfillmentType || '').toUpperCase() === 'PICKUP' ||
                (order.deliveryPartner || '').toLowerCase().includes('pickup');
            return isPickup ? 'COLLECTED' : 'DELIVERED';
        }
    }
    return raw;
};

/**
 * Returns the 4-step pipeline for an order, adapted to pickup vs delivery.
 */
const getOrderSteps = (order) => {
    const isPickup =
        (order.fulfillmentType || '').toUpperCase() === 'PICKUP' ||
        (order.deliveryPartner || '').toLowerCase().includes('pickup');

    const effective = getEffectiveStatus(order);

    const statusRank = {
        PENDING: 0,
        CONFIRMED: 1,
        PACKED: 2,
        READY: 2,
        OUT_FOR_DELIVERY: 2,
        SHIPPED: 2,
        DELIVERED: 3,
        COLLECTED: 3,
        COMPLETED: 3,
    };
    const rank = statusRank[effective] ?? 0;

    if (isPickup) {
        return [
            { label: 'Order Placed', icon: ShoppingBag, done: rank >= 0 },
            { label: 'Confirmed', icon: CheckCircle2, done: rank >= 1 },
            { label: 'Being Packed', icon: Package, done: rank >= 2 },
            { label: 'Collected', icon: CheckCircle2, done: rank >= 3 },
        ];
    }
    return [
        { label: 'Order Placed', icon: ShoppingBag, done: rank >= 0 },
        { label: 'Confirmed', icon: CheckCircle2, done: rank >= 1 },
        { label: 'Out for Delivery', icon: Truck, done: rank >= 2 },
        { label: 'Delivered', icon: CheckCircle2, done: rank >= 3 },
    ];
};

// ─── Status badge colour ──────────────────────────────────────────────────────
const statusBadgeClass = (status) => {
    const s = (status || '').toUpperCase();
    if (['DELIVERED', 'COLLECTED', 'COMPLETED'].includes(s))
        return 'bg-emerald-100 text-emerald-800';
    if (s === 'PENDING') return 'bg-amber-100 text-amber-800';
    if (s === 'CONFIRMED') return 'bg-blue-100 text-blue-800';
    if (['OUT_FOR_DELIVERY', 'SHIPPED'].includes(s))
        return 'bg-indigo-100 text-indigo-800';
    return 'bg-slate-100 text-slate-800';
};

// ─── PDF Invoice generator ────────────────────────────────────────────────────
const downloadInvoice = (order, userName) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 18;
    let y = 22;

    // Header
    doc.setFillColor(15, 98, 254);
    doc.rect(0, 0, W, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('OrionCart', margin, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Shop Smarter, Delivered Faster', margin, 23);
    doc.setFontSize(12);
    doc.text('INVOICE', W - margin, 16, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`Order #${order.id}`, W - margin, 23, { align: 'right' });
    doc.text(`Date: ${formatDateTime(order.createdAt)}`, W - margin, 29, { align: 'right' });

    y = 50;

    // Billed To
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(userName || 'Customer', margin, y + 6);
    if (order.deliveryAddress) {
        const lines = doc.splitTextToSize(order.deliveryAddress, 80);
        doc.text(lines, margin, y + 12);
    }

    // Status
    doc.setFont('helvetica', 'bold');
    doc.text('STATUS', W - margin - 50, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatStatusLabel(getEffectiveStatus(order)), W - margin - 50, y + 6);
    if (order.fulfillmentType) {
        doc.text(`Fulfillment: ${formatStatusLabel(order.fulfillmentType)}`, W - margin - 50, y + 12);
    }

    y += 30;

    // Items table header
    doc.setFillColor(240, 244, 255);
    doc.rect(margin, y, W - margin * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Item', margin + 2, y + 5.5);
    doc.text('Qty', W - margin - 44, y + 5.5, { align: 'right' });
    doc.text('Unit Price', W - margin - 22, y + 5.5, { align: 'right' });
    doc.text('Total', W - margin, y + 5.5, { align: 'right' });
    y += 10;

    // Items rows
    doc.setFont('helvetica', 'normal');
    (order.items || []).forEach((item, idx) => {
        if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 252);
            doc.rect(margin, y - 1.5, W - margin * 2, 8, 'F');
        }
        const name = item.productName || item.name || `Item #${item.id}`;
        const qty = item.quantity || 1;
        const price = Number(item.unitPrice || item.price || 0);
        const lineTotal = price * qty;
        const truncated = doc.splitTextToSize(name, 100)[0];
        doc.text(truncated, margin + 2, y + 4);
        doc.text(String(qty), W - margin - 44, y + 4, { align: 'right' });
        doc.text(`Rs. ${price.toFixed(2)}`, W - margin - 22, y + 4, { align: 'right' });
        doc.text(`Rs. ${lineTotal.toFixed(2)}`, W - margin, y + 4, { align: 'right' });
        y += 8;
    });

    y += 4;

    // Totals
    const totals = [
        ['Subtotal', order.subtotalAmount],
        ['Tax', order.taxAmount],
        ['Delivery', order.deliveryCharge],
        ['Discount', order.discountAmount ? -order.discountAmount : null],
    ].filter(([, v]) => v != null && Number(v) !== 0);

    totals.forEach(([label, val]) => {
        doc.setFont('helvetica', 'normal');
        doc.text(label, W - margin - 40, y);
        doc.text(`Rs. ${Number(val).toFixed(2)}`, W - margin, y, { align: 'right' });
        y += 6;
    });

    // Grand total
    doc.setDrawColor(15, 98, 254);
    doc.line(W - margin - 60, y, W - margin, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL', W - margin - 40, y);
    doc.text(`Rs. ${Number(order.totalAmount || 0).toFixed(2)}`, W - margin, y, { align: 'right' });

    // Footer
    y = 275;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for shopping with OrionCart!', W / 2, y, { align: 'center' });
    doc.text('For support, contact support@orioncart.in', W / 2, y + 5, { align: 'center' });

    doc.save(`OrionCart-Invoice-${order.id}.pdf`);
};

const buildCartProduct = (wishlistItem) => ({
    id: wishlistItem.productId,
    name: wishlistItem.productName,
    category: wishlistItem.category,
    price: wishlistItem.price,
    stockQuantity: wishlistItem.stockQuantity,
    imageUrl: wishlistItem.imageUrl,
    shopId: wishlistItem.shopId,
    shopName: wishlistItem.shopName,
    quantity: 1,
});

// ─── Real-time dispute window countdown ──────────────────────────────────────
const DisputeCountdown = ({ order }) => {
    const deadline = getDisputeDeadline(order);
    const [remaining, setRemaining] = useState(
        deadline ? deadline.getTime() - Date.now() : -1
    );

    useEffect(() => {
        if (!deadline || remaining <= 0) return;
        const id = setInterval(() => {
            const diff = deadline.getTime() - Date.now();
            setRemaining(diff);
            if (diff <= 0) clearInterval(id);
        }, 30_000); // update every 30 s
        return () => clearInterval(id);
    }, [deadline]);

    if (!deadline || remaining <= 0) return null;
    const label = formatCountdown(remaining);
    if (!label) return null;

    return (
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="h-3 w-3" />
            {label} left to dispute
        </span>
    );
};

// ─── Review Modal ─────────────────────────────────────────────────────────────
const ReviewModal = ({ order, onClose, onSubmit, submitting }) => {
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState('');

    if (!order) return null;

    // Collect unique shop IDs from items
    const shopId = (order.items?.[0]?.shopId) || null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Leave a Review</h3>
                        <p className="mt-1 text-sm text-slate-500">Order #{order.id}</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Star picker */}
                <div className="mb-5 flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHovered(star)}
                            onMouseLeave={() => setHovered(0)}
                            onClick={() => setRating(star)}
                            className="transition-transform hover:scale-110"
                        >
                            <Star
                                className={`h-9 w-9 ${
                                    star <= (hovered || rating)
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-300'
                                }`}
                            />
                        </button>
                    ))}
                </div>
                {rating > 0 && (
                    <p className="mb-4 text-center text-sm font-medium text-slate-600">
                        {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
                    </p>
                )}

                <textarea
                    rows={3}
                    maxLength={300}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience (optional)"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />

                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={rating === 0 || submitting}
                        onClick={() => onSubmit({ orderId: order.id, shopId, rating, comment })}
                        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DisputeModal = ({ order, onClose, onSubmit, submitting }) => {
    const [form, setForm] = useState({
        shopId: '',
        reason: DISPUTE_REASONS[0],
        description: '',
    });
    const [evidenceImages, setEvidenceImages] = useState([]);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        if (evidenceImages.length + files.length > 3) {
            alert('You can only upload up to 3 images.');
            return;
        }

        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setEvidenceImages((prev) => [...prev, event.target.result]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = null; // reset input
    };

    const removeImage = (index) => {
        setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        const uniqueShopIds = [...new Set((order?.items || []).map((item) => item.shopId).filter(Boolean))];
        setForm((prev) => ({
            ...prev,
            shopId: uniqueShopIds.length === 1 ? String(uniqueShopIds[0]) : '',
        }));
    }, [order]);

    if (!order) {
        return null;
    }

    const shopIds = [...new Set((order.items || []).map((item) => item.shopId).filter(Boolean))];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Raise a Dispute</h3>
                        <p className="mt-1 text-sm text-slate-500">Order #{order.id}</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit({
                            orderId: order.id,
                            shopId: form.shopId ? Number(form.shopId) : null,
                            reason: form.reason,
                            description: form.description,
                            evidenceImageUrls: evidenceImages,
                        });
                    }}
                    className="space-y-4"
                >
                    {shopIds.length > 1 && (
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-900">Shop</label>
                            <select
                                value={form.shopId}
                                onChange={(event) => setForm((prev) => ({ ...prev, shopId: event.target.value }))}
                                required
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                            >
                                <option value="">Select shop</option>
                                {shopIds.map((shopId) => (
                                    <option key={shopId} value={shopId}>
                                        Shop #{shopId}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-900">Reason</label>
                        <select
                            value={form.reason}
                            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        >
                            {DISPUTE_REASONS.map((reason) => (
                                <option key={reason} value={reason}>
                                    {formatStatusLabel(reason)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-900">Description</label>
                        <textarea
                            rows={4}
                            maxLength={500}
                            value={form.description}
                            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                            placeholder="Tell us what went wrong."
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-900">Evidence (Optional)</label>
                        <div className="flex flex-wrap gap-4">
                            {evidenceImages.map((src, index) => (
                                <div key={index} className="relative h-20 w-20 shrink-0 rounded-xl border border-slate-200">
                                    <img src={src} alt="Evidence" className="h-full w-full rounded-xl object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm hover:bg-slate-700"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {evidenceImages.length < 3 && (
                                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-primary hover:text-primary">
                                    <Camera className="h-6 w-6" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider">Upload</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </label>
                            )}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Attach up to 3 photos (e.g., damaged item, wrong product).</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                        >
                            {submitting ? 'Submitting...' : 'Submit Dispute'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function AccountPage() {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            return null;
        }
    });
    const [orders, setOrders] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [loyaltyBalance, setLoyaltyBalance] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [referrals, setReferrals] = useState([]);
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDisputeOrder, setActiveDisputeOrder] = useState(null);
    const [submittingDispute, setSubmittingDispute] = useState(false);
    const [activeReviewOrder, setActiveReviewOrder] = useState(null);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewedOrderIds, setReviewedOrderIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('reviewedOrderIds') || '[]'); }
        catch { return []; }
    });
    // Tick every minute to re-evaluate dispute window visibility
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 60_000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const handler = (event) => {
            if (event?.detail?.user !== undefined) {
                setCurrentUser(event.detail.user || null);
                return;
            }

            try {
                setCurrentUser(JSON.parse(localStorage.getItem('user') || 'null'));
            } catch {
                setCurrentUser(null);
            }
        };

        window.addEventListener('authChanged', handler);
        return () => window.removeEventListener('authChanged', handler);
    }, []);

    const loadData = async () => {
        if (!currentUser?.id || !localStorage.getItem('authToken')) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const [ordersData, wishlistData, loyaltyData, txData, referralData, disputeData] = await Promise.all([
                orderAPI.getOrdersByUser(currentUser.id),
                wishlistAPI.getMine(),
                loyaltyAPI.getBalance(),
                loyaltyAPI.getTransactions(),
                loyaltyAPI.getReferralHistory(),
                disputeAPI.getMine(),
            ]);

            setOrders(Array.isArray(ordersData) ? ordersData : []);
            setWishlist(Array.isArray(wishlistData) ? wishlistData : []);
            setLoyaltyBalance(loyaltyData);
            setTransactions(Array.isArray(txData) ? txData : []);
            setReferrals(Array.isArray(referralData) ? referralData : []);
            setDisputes(Array.isArray(disputeData) ? disputeData : []);
        } catch (error) {
            console.error('Failed to load account data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentUser?.id]);

    const disputesByOrder = useMemo(() => {
        const map = new Map();
        disputes.forEach((dispute) => {
            if (!map.has(dispute.orderId)) {
                map.set(dispute.orderId, dispute);
            }
        });
        return map;
    }, [disputes]);

    const handleWishlistRemove = async (productId) => {
        try {
            const updated = await wishlistAPI.remove(productId);
            setWishlist(Array.isArray(updated) ? updated : []);
            localStorage.setItem('wishlistIds', JSON.stringify((updated || []).map((item) => item.productId)));
            window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { productIds: (updated || []).map((item) => item.productId) } }));
        } catch (error) {
            alert(error.message || 'Failed to remove item from wishlist');
        }
    };

    const handleAddWishlistItemToCart = (item) => {
        const nextItem = buildCartProduct(item);
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existing = cart.find((entry) => entry.id === nextItem.id);
        const nextCart = existing
            ? cart.map((entry) => entry.id === nextItem.id ? { ...entry, quantity: entry.quantity + 1 } : entry)
            : [...cart, nextItem];
        localStorage.setItem('cart', JSON.stringify(nextCart));
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: nextCart } }));
    };

    const handleSubmitDispute = async (payload) => {
        try {
            setSubmittingDispute(true);
            const created = await disputeAPI.create(payload);
            setDisputes((prev) => [created, ...prev]);
            setActiveDisputeOrder(null);
        } catch (error) {
            alert(error.message || 'Failed to create dispute');
        } finally {
            setSubmittingDispute(false);
        }
    };

    const handleSubmitReview = async ({ orderId, shopId, rating, comment }) => {
        try {
            setSubmittingReview(true);
            await reviewAPI.createReview({ orderId, shopId, rating, comment });
            const next = [...reviewedOrderIds, orderId];
            setReviewedOrderIds(next);
            localStorage.setItem('reviewedOrderIds', JSON.stringify(next));
            setActiveReviewOrder(null);
        } catch (error) {
            // If backend returns error we still mark as reviewed locally to avoid duplicate tries
            console.warn('Review submit error:', error.message);
            const next = [...reviewedOrderIds, orderId];
            setReviewedOrderIds(next);
            localStorage.setItem('reviewedOrderIds', JSON.stringify(next));
            setActiveReviewOrder(null);
        } finally {
            setSubmittingReview(false);
        }
    };

    if (!currentUser?.id || !localStorage.getItem('authToken')) {
        return (
            <div className="mx-auto mt-24 max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm">
                <Sparkles className="mx-auto h-10 w-10 text-primary" />
                <h1 className="mt-4 text-3xl font-bold text-slate-900">Sign in to manage your account</h1>
                <p className="mt-2 text-slate-500">Track orders, save products, view loyalty rewards, and raise disputes from one place.</p>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal'))}
                    className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90"
                >
                    Open Sign In
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 px-6 py-8 text-white shadow-xl md:px-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.28em] text-sky-200">My Account</p>
                        <h1 className="mt-3 text-4xl font-bold">{currentUser.name || currentUser.username}</h1>
                        <p className="mt-3 max-w-2xl text-slate-200">
                            Orders, saved products, disputes, rewards, and referrals are all connected here now.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                        <p className="text-xs uppercase tracking-wide text-slate-300">Referral code</p>
                        <p className="mt-2 text-2xl font-bold">{loyaltyBalance?.referralCode || currentUser.referralCode || 'Generating...'}</p>
                        <p className="mt-2 text-sm text-slate-300">Invite a friend and earn loyalty points after their first completed order.</p>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="flex items-center justify-center rounded-[2rem] border border-slate-200 bg-white py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                                    <ShoppingBag className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Orders</p>
                                    <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-rose-50 p-3 text-rose-600">
                                    <Heart className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Wishlist</p>
                                    <p className="text-2xl font-bold text-slate-900">{wishlist.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                                    <Star className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Loyalty Points</p>
                                    <p className="text-2xl font-bold text-slate-900">{loyaltyBalance?.pointsBalance ?? 0}</p>
                                    <p className="text-xs text-slate-500">{loyaltyBalance?.tier || currentUser.loyaltyTier || 'BRONZE'} tier</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                                    <ShieldAlert className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Disputes</p>
                                    <p className="text-2xl font-bold text-slate-900">{disputes.length}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
                        <div className="space-y-8">
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-5 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">Recent Orders</h2>
                                        <p className="mt-1 text-sm text-slate-500">Track status, download invoices, and raise issues.</p>
                                    </div>
                                </div>

                                {orders.length === 0 ? (
                                    <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">No orders yet.</div>
                                ) : (
                                    <div className="space-y-5">
                                        {orders.map((order) => {
                                            const dispute = disputesByOrder.get(order.id);
                                            const effectiveStatus = getEffectiveStatus(order);
                                            const steps = getOrderSteps(order);
                                            const isDone = DISPUTE_ELIGIBLE_STATUSES.includes(effectiveStatus);

                                            return (
                                                <div key={order.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                                    {/* Top row: order info + status badge + amount */}
                                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-lg font-bold text-slate-900">Order #{order.id}</p>
                                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(effectiveStatus)}`}>
                                                                    {formatStatusLabel(effectiveStatus)}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
                                                            <p className="mt-2 text-sm text-slate-700 line-clamp-2">
                                                                {(order.items || []).map((item) => `${item.productName} x${item.quantity}`).join(', ') || 'No items'}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-lg font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                                                            {order.fulfillmentType && (
                                                                <p className="mt-0.5 text-xs text-slate-500">{formatStatusLabel(order.fulfillmentType)}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* ── 4-step status tracker ── */}
                                                    <div className="mt-5 flex items-center gap-0">
                                                        {steps.map((step, idx) => {
                                                            const Icon = step.icon;
                                                            const isLast = idx === steps.length - 1;
                                                            return (
                                                                <React.Fragment key={step.label}>
                                                                    <div className="flex flex-col items-center">
                                                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 ${
                                                                            step.done
                                                                                ? isDone && isLast
                                                                                    ? 'bg-emerald-500 text-white'
                                                                                    : 'bg-primary text-white'
                                                                                : 'bg-slate-200 text-slate-400'
                                                                        }`}>
                                                                            <Icon className="h-4 w-4" />
                                                                        </div>
                                                                        <p className={`mt-1.5 max-w-[60px] text-center text-[10px] leading-tight font-medium ${
                                                                            step.done ? 'text-slate-700' : 'text-slate-400'
                                                                        }`}>
                                                                            {step.label}
                                                                        </p>
                                                                    </div>
                                                                    {!isLast && (
                                                                        <div className={`mb-5 h-0.5 flex-1 transition-colors duration-300 ${
                                                                            steps[idx + 1]?.done ? 'bg-primary' : 'bg-slate-200'
                                                                        }`} />
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Scheduled slot info */}
                                                    {(order.scheduledSlot || order.scheduleTime) && (
                                                        <p className="mt-3 text-xs text-slate-500">
                                                            📅 {order.fulfillmentType === 'PICKUP' ? 'Collect by' : 'Estimated delivery'}:{' '}
                                                            {order.scheduledSlot || formatDateTime(order.scheduleTime)}
                                                        </p>
                                                    )}

                                                    {/* Action buttons */}
                                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                                        {/* Download Invoice */}
                                                        <button
                                                            type="button"
                                                            onClick={() => downloadInvoice(order, currentUser?.name || currentUser?.username)}
                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            Invoice
                                                        </button>

                                                        {/* Write Review — only after delivery/collection, once per order */}
                                                        {isDone && !reviewedOrderIds.includes(order.id) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveReviewOrder(order)}
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                                                            >
                                                                <MessageSquare className="h-4 w-4" />
                                                                Review
                                                            </button>
                                                        )}
                                                        {isDone && reviewedOrderIds.includes(order.id) && (
                                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                                <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                                                                Reviewed
                                                            </span>
                                                        )}

                                                        {/* Raise Dispute — within 24 hrs of delivery */}
                                                        {(() => {
                                                            if (!isDone || dispute) return null;
                                                            const deadline = getDisputeDeadline(order);
                                                            const withinWindow = deadline && deadline.getTime() > Date.now();
                                                            if (withinWindow) {
                                                                return (
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveDisputeOrder(order)}
                                                                            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
                                                                        >
                                                                            Raise Dispute
                                                                        </button>
                                                                        <DisputeCountdown order={order} />
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    Dispute window closed
                                                                </span>
                                                            );
                                                        })()}

                                                        {dispute && (
                                                            <div className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                                                                <AlertCircle className="h-4 w-4" />
                                                                Dispute {formatStatusLabel(dispute.status)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="mb-5 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">Saved Products</h2>
                                        <p className="mt-1 text-sm text-slate-500">Keep favorites close for your next order.</p>
                                    </div>
                                    <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                                        {wishlist.length} saved
                                    </div>
                                </div>

                                {wishlist.length === 0 ? (
                                    <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Your wishlist is still empty.</div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {wishlist.map((item) => (
                                            <div key={item.productId} className="rounded-3xl border border-slate-200 p-4">
                                                <div className="flex gap-4">
                                                    <img
                                                        src={item.imageUrl || 'https://via.placeholder.com/120'}
                                                        alt={item.productName}
                                                        className="h-24 w-24 rounded-2xl object-cover"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <Link to={`/shop/${item.shopId}`} className="line-clamp-2 font-semibold text-slate-900 hover:text-primary">
                                                            {item.productName}
                                                        </Link>
                                                        <p className="mt-1 text-sm text-slate-500">{item.shopName}</p>
                                                        <p className="mt-3 font-semibold text-primary">{formatCurrency(item.price)}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddWishlistItemToCart(item)}
                                                        className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                                                    >
                                                        Add to Cart
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleWishlistRemove(item.productId)}
                                                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                                        <Gift className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Loyalty Rewards</h2>
                                        <p className="text-sm text-slate-500">Redeem points at checkout and track your growth.</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Points balance</p>
                                        <p className="mt-2 text-3xl font-bold text-slate-900">{loyaltyBalance?.pointsBalance ?? 0}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Lifetime points</p>
                                        <p className="mt-2 text-3xl font-bold text-slate-900">{loyaltyBalance?.lifetimePoints ?? 0}</p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl bg-primary/10 p-4">
                                    <p className="text-xs uppercase tracking-wide text-primary">Current tier</p>
                                    <p className="mt-2 text-2xl font-bold text-primary">{loyaltyBalance?.tier || currentUser.loyaltyTier || 'BRONZE'}</p>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {transactions.slice(0, 6).map((tx) => (
                                        <div key={tx.id} className="flex items-start justify-between rounded-2xl border border-slate-200 px-4 py-3">
                                            <div>
                                                <p className="font-medium text-slate-900">{tx.description || formatStatusLabel(tx.transactionType)}</p>
                                                <p className="mt-1 text-xs text-slate-500">{formatDateTime(tx.createdAt)}</p>
                                            </div>
                                            <p className={`font-semibold ${tx.pointsChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {tx.pointsChange >= 0 ? '+' : ''}{tx.pointsChange}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-xl font-bold text-slate-900">Referral Activity</h2>
                                <p className="mt-1 text-sm text-slate-500">Share your code and track invited shoppers.</p>

                                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Your code</p>
                                    <p className="mt-2 text-2xl font-bold text-slate-900">{loyaltyBalance?.referralCode || currentUser.referralCode}</p>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {referrals.length === 0 ? (
                                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No referral activity yet.</div>
                                    ) : referrals.map((referral) => (
                                        <div key={referral.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                                            <p className="font-medium text-slate-900">{referral.refereeName || `User #${referral.refereeId}`}</p>
                                            <p className="mt-1 text-sm text-slate-500">{formatStatusLabel(referral.status)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )}

            <DisputeModal
                order={activeDisputeOrder}
                onClose={() => setActiveDisputeOrder(null)}
                onSubmit={handleSubmitDispute}
                submitting={submittingDispute}
            />

            <ReviewModal
                order={activeReviewOrder}
                onClose={() => setActiveReviewOrder(null)}
                onSubmit={handleSubmitReview}
                submitting={submittingReview}
            />
        </div>
    );
}
