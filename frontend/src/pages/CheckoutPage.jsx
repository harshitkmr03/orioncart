import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    CreditCard,
    Loader2,
    MapPin,
    ShoppingBag,
    Store,
} from 'lucide-react';
import FulfillmentSelector from '../components/FulfillmentSelector';
import { couponAPI, deliveryAPI, loyaltyAPI, shopAPI } from '../services/api';

const DEMO_LOCATION = {
    lat: 22.7196,
    lon: 75.8577,
    label: 'Using demo location: Indore',
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

export default function CheckoutPage() {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [fulfillmentType, setFulfillmentType] = useState('SCHEDULED');
    const [slotDate, setSlotDate] = useState(getTodayDate());
    const [selectedSlotId, setSelectedSlotId] = useState('');
    const [pickupSlots, setPickupSlots] = useState([]);
    const [scheduledSlots, setScheduledSlots] = useState([]);
    const [expressServiceability, setExpressServiceability] = useState(null);
    const [locationCoords, setLocationCoords] = useState(null);
    const [locationLabel, setLocationLabel] = useState('Resolving delivery location...');
    const [loadingFulfillment, setLoadingFulfillment] = useState(true);
    const [checkoutError, setCheckoutError] = useState('');
    const [loyaltyBalance, setLoyaltyBalance] = useState(null);
    const [couponCode, setCouponCode] = useState('');
    const [couponValidation, setCouponValidation] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [pointsToRedeem, setPointsToRedeem] = useState('');
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        paymentMethod: 'card',
    });

    useEffect(() => {
        try {
            const token = localStorage.getItem('authToken');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            setIsAuthed(Boolean(token));

            setFormData((prev) => ({
                ...prev,
                fullName: user.name || '',
                email: user.email || user.username || '',
            }));

            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            setCartItems(Array.isArray(cart) ? cart : []);
        } catch (error) {
            console.warn('Checkout setup failed', error);
            setIsAuthed(false);
            setCartItems([]);
        }

        const handler = () => setIsAuthed(Boolean(localStorage.getItem('authToken')));
        window.addEventListener('authChanged', handler);
        return () => window.removeEventListener('authChanged', handler);
    }, []);

    const shopIds = useMemo(
        () => [...new Set(cartItems.map((item) => item.shopId).filter(Boolean))],
        [cartItems]
    );
    const singleShopOrder = shopIds.length === 1;
    const primaryShopId = singleShopOrder ? shopIds[0] : null;
    const primaryShopName = singleShopOrder ? cartItems.find((item) => item.shopId === primaryShopId)?.shopName || 'Selected shop' : null;

    const selectedPickupSlot = pickupSlots.find((slot) => slot.id === selectedSlotId) || null;
    const selectedScheduledSlot = scheduledSlots.find((slot) => slot.id === selectedSlotId) || null;

    const selectedDeliveryCharge = fulfillmentType === 'PICKUP'
        ? 0
        : fulfillmentType === 'SCHEDULED'
            ? Number(selectedScheduledSlot?.deliveryCharge ?? 15)
            : Number(expressServiceability?.deliveryCharge ?? 0);

    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
    const couponDiscount = Number(couponValidation?.valid ? couponValidation.discountAmount : 0);
    const availablePoints = Number(loyaltyBalance?.pointsBalance || 0);
    const maxRedeemablePoints = availablePoints >= 500
        ? Math.min(availablePoints, Math.floor(Math.max(0, subtotal - couponDiscount) * 0.20 * 100))
        : 0;
    const requestedPoints = Number(pointsToRedeem || 0);
    const effectivePointsRedeemed = requestedPoints >= 500
        ? Math.min(maxRedeemablePoints, requestedPoints)
        : 0;
    const loyaltyDiscount = Math.round((effectivePointsRedeemed / 100) * 100) / 100;
    const discountedSubtotal = Math.max(0, subtotal - couponDiscount - loyaltyDiscount);
    const tax = Math.round(discountedSubtotal * 0.05 * 100) / 100;
    const totalDiscount = Math.round((couponDiscount + loyaltyDiscount) * 100) / 100;
    const total = discountedSubtotal + tax + selectedDeliveryCharge;

    useEffect(() => {
        let cancelled = false;

        const resolveLocation = async () => {
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

                if (cancelled) {
                    return;
                }

                setLocationCoords({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                });
                setLocationLabel(position.demo ? DEMO_LOCATION.label : 'Using your current location for delivery options');
            } catch {
                if (!cancelled) {
                    setLocationCoords({ lat: DEMO_LOCATION.lat, lon: DEMO_LOCATION.lon });
                    setLocationLabel(DEMO_LOCATION.label);
                }
            }
        };

        resolveLocation();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!locationCoords) {
            return;
        }

        let cancelled = false;
        const loadFulfillmentData = async () => {
            setLoadingFulfillment(true);
            setCheckoutError('');

            try {
                const requests = [
                    deliveryAPI.getScheduledSlots({
                        lat: locationCoords.lat,
                        lon: locationCoords.lon,
                        date: slotDate,
                    }),
                    deliveryAPI.getServiceability({
                        lat: locationCoords.lat,
                        lon: locationCoords.lon,
                    }),
                ];

                if (primaryShopId) {
                    requests.push(shopAPI.getAvailableSlots(primaryShopId, slotDate));
                } else {
                    requests.push(Promise.resolve([]));
                }

                const [scheduledData, serviceabilityData, pickupData] = await Promise.all(requests);

                if (cancelled) {
                    return;
                }

                const availableScheduled = (scheduledData || []).filter((slot) => slot.available);
                const availablePickup = (pickupData || []).filter((slot) => slot.available);

                setScheduledSlots(availableScheduled);
                setExpressServiceability(serviceabilityData);
                setPickupSlots(availablePickup);
            } catch (error) {
                if (!cancelled) {
                    setCheckoutError(error.message || 'Failed to load fulfillment options');
                    setScheduledSlots([]);
                    setPickupSlots([]);
                    setExpressServiceability(null);
                }
            } finally {
                if (!cancelled) {
                    setLoadingFulfillment(false);
                }
            }
        };

        loadFulfillmentData();
        return () => {
            cancelled = true;
        };
    }, [locationCoords, primaryShopId, slotDate]);

    useEffect(() => {
        if (!isAuthed) {
            setLoyaltyBalance(null);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const data = await loyaltyAPI.getBalance();
                if (!cancelled) {
                    setLoyaltyBalance(data);
                }
            } catch {
                if (!cancelled) {
                    setLoyaltyBalance(null);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isAuthed]);

    useEffect(() => {
        if (loadingFulfillment) {
            return;
        }

        const expressAvailable = singleShopOrder && expressServiceability?.serviceable;
        const nextType = fulfillmentType === 'PICKUP' && !singleShopOrder
            ? expressAvailable ? 'AGENT' : 'SCHEDULED'
            : fulfillmentType === 'AGENT' && !expressAvailable
                ? 'SCHEDULED'
                : fulfillmentType;

        if (nextType !== fulfillmentType) {
            setFulfillmentType(nextType);
            return;
        }

        const slotOptions = nextType === 'PICKUP' ? pickupSlots : nextType === 'SCHEDULED' ? scheduledSlots : [];
        if (slotOptions.length === 0) {
            setSelectedSlotId('');
            return;
        }

        const stillValid = slotOptions.some((slot) => slot.id === selectedSlotId);
        if (!stillValid) {
            setSelectedSlotId(slotOptions[0].id);
        }
    }, [loadingFulfillment, fulfillmentType, pickupSlots, scheduledSlots, selectedSlotId, singleShopOrder, expressServiceability]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponError('Enter a coupon code to apply it.');
            setCouponValidation(null);
            return;
        }

        try {
            setCouponLoading(true);
            setCouponError('');
            const validation = await couponAPI.validate({
                code: couponCode.trim(),
                subtotal,
                shopIds,
            });
            setCouponValidation(validation);
        } catch (error) {
            setCouponValidation(null);
            setCouponError(error.message || 'Coupon could not be applied');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!isAuthed) {
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }

        if (formRef.current && !formRef.current.checkValidity()) {
            formRef.current.reportValidity();
            return;
        }

        if ((fulfillmentType === 'PICKUP' || fulfillmentType === 'SCHEDULED') && !selectedSlotId) {
            alert('Please choose a slot before continuing.');
            return;
        }

        if (fulfillmentType === 'AGENT' && !expressServiceability?.serviceable) {
            alert('Express delivery is not available for this order.');
            return;
        }

        setLoading(true);

        const selectedSlot = fulfillmentType === 'PICKUP' ? selectedPickupSlot : selectedScheduledSlot;
        const scheduleTime = selectedSlot
            ? `${slotDate}T${selectedSlot.windowStart}:00`
            : new Date().toISOString();

        navigate('/payment', {
            state: {
                shippingInfo: formData,
                paymentMethod: formData.paymentMethod,
                items: cartItems,
                fulfillmentType,
                subtotal,
                discountedSubtotal,
                tax,
                deliveryCharge: selectedDeliveryCharge,
                discountAmount: totalDiscount,
                couponCode: couponValidation?.valid ? couponCode.trim().toUpperCase() : '',
                couponDiscount,
                loyaltyPointsRedeemed: effectivePointsRedeemed,
                loyaltyDiscount,
                total,
                slotDate,
                scheduleTime,
                scheduledSlot: selectedSlot?.displayWindow || '',
                selectedSlot,
                locationCoords,
                expressServiceability,
                primaryShopName,
                singleShopOrder,
            },
        });
        setLoading(false);
    };

    const isPickup = fulfillmentType === 'PICKUP';

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <button
                    onClick={() => navigate('/cart')}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft size={20} />
                    Back to Cart
                </button>

                <h1 className="mb-8 text-3xl font-bold text-gray-900">Checkout</h1>

                {!isAuthed && (
                    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-amber-600" />
                        <div>
                            <h3 className="font-semibold text-amber-900">Sign in to continue</h3>
                            <p className="mt-1 text-sm text-amber-800">Please sign in or register to complete your purchase.</p>
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('openAuthModal'))}
                                className="mt-3 font-semibold text-amber-700 underline hover:text-amber-900"
                            >
                                Sign in now
                            </button>
                        </div>
                    </div>
                )}

                {shopIds.length > 1 && (
                    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                        This cart includes items from multiple shops. Pickup and express are disabled, but scheduled delivery is still available.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                                <ShoppingBag size={20} className="text-primary" />
                                Fulfillment Method
                            </h2>

                            <div className="mb-4 grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs uppercase tracking-wide text-slate-500">Delivery area</p>
                                    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {locationLabel}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                        Slot date
                                    </label>
                                    <input
                                        type="date"
                                        value={slotDate}
                                        min={getTodayDate()}
                                        onChange={(event) => setSlotDate(event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    />
                                </div>
                            </div>

                            {loadingFulfillment ? (
                                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-5 text-slate-600">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    Loading live fulfillment options...
                                </div>
                            ) : (
                                <FulfillmentSelector
                                    selected={fulfillmentType}
                                    onChange={setFulfillmentType}
                                    selectedSlotId={selectedSlotId}
                                    onSlotChange={setSelectedSlotId}
                                    pickupSlots={pickupSlots}
                                    scheduledSlots={scheduledSlots}
                                    expressServiceability={expressServiceability}
                                    singleShopOrder={singleShopOrder}
                                />
                            )}
                        </div>

                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-3">
                                <MapPin size={24} className="text-primary" />
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {isPickup ? 'Pickup Contact Details' : 'Delivery Address'}
                                </h2>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <input
                                        type="text"
                                        name="fullName"
                                        placeholder="Full Name"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        required
                                        className="rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email Address"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Phone Number"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                />

                                {!isPickup && (
                                    <>
                                        <input
                                            type="text"
                                            name="address"
                                            placeholder="Street Address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                        />

                                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                            <input
                                                type="text"
                                                name="city"
                                                placeholder="City"
                                                value={formData.city}
                                                onChange={handleChange}
                                                required
                                                className="rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                            <input
                                                type="text"
                                                name="state"
                                                placeholder="State"
                                                value={formData.state}
                                                onChange={handleChange}
                                                required
                                                className="rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                            <input
                                                type="text"
                                                name="zipCode"
                                                placeholder="ZIP Code"
                                                value={formData.zipCode}
                                                onChange={handleChange}
                                                required
                                                className="rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-3">
                                <CreditCard size={24} className="text-primary" />
                                <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { value: 'card', label: 'Credit / Debit Card' },
                                    { value: 'upi', label: 'UPI / Net Banking' },
                                    { value: 'cod', label: 'Cash on Delivery' },
                                ].map((method) => (
                                    <label
                                        key={method.value}
                                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-300 p-4 transition-colors hover:bg-gray-50"
                                        style={{
                                            borderColor: formData.paymentMethod === method.value ? '#007AFF' : undefined,
                                            backgroundColor: formData.paymentMethod === method.value ? '#f0f7ff' : undefined,
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value={method.value}
                                            checked={formData.paymentMethod === method.value}
                                            onChange={handleChange}
                                            className="h-4 w-4 accent-primary"
                                        />
                                        <span className="font-medium text-gray-900">{method.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-3">
                                <ShoppingBag size={24} className="text-primary" />
                                <h2 className="text-lg font-semibold text-gray-900">Savings & Rewards</h2>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-900">Coupon code</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(event) => {
                                                setCouponCode(event.target.value.toUpperCase());
                                                setCouponValidation(null);
                                                setCouponError('');
                                            }}
                                            placeholder="WELCOME10"
                                            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleApplyCoupon}
                                            disabled={couponLoading}
                                            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                                        >
                                            {couponLoading ? 'Applying...' : 'Apply'}
                                        </button>
                                    </div>
                                    {couponValidation?.valid && (
                                        <p className="mt-2 text-sm text-emerald-600">
                                            {couponValidation.message}: saved Rs {couponDiscount.toFixed(2)}
                                        </p>
                                    )}
                                    {couponError && <p className="mt-2 text-sm text-red-600">{couponError}</p>}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-900">Redeem loyalty points</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={pointsToRedeem}
                                        onChange={(event) => setPointsToRedeem(event.target.value)}
                                        placeholder="Minimum 500 points"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <p className="mt-2 text-sm text-gray-500">
                                        Available: {availablePoints} points. Max redeemable on this order: {maxRedeemablePoints} points.
                                    </p>
                                    {requestedPoints > 0 && requestedPoints < 500 && (
                                        <p className="mt-2 text-sm text-amber-600">Redeem at least 500 points to unlock a discount.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/cart')}
                                className="flex-1 rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:bg-gray-400"
                            >
                                {loading ? 'Processing...' : 'Continue to Payment'}
                            </button>
                        </div>
                    </form>

                    <div className="lg:col-span-1">
                        <div className="sticky top-24 rounded-xl bg-white p-6 shadow-sm">
                            <h2 className="mb-6 text-lg font-semibold text-gray-900">Order Summary</h2>

                            <div className="mb-6 max-h-96 overflow-y-auto border-b border-gray-200 pb-6">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="mb-4 flex gap-3">
                                        <img
                                            src={item.imageUrl || item.image || 'https://via.placeholder.com/50'}
                                            alt={item.name}
                                            className="h-12 w-12 rounded object-cover"
                                        />
                                        <div className="flex-1">
                                            <p className="line-clamp-1 text-sm font-medium text-gray-900">{item.name}</p>
                                            <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                                            {item.shopName && (
                                                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                                    <Store className="h-3 w-3" />
                                                    {item.shopName}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">Rs {(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>

                            {checkoutError && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {checkoutError}
                                </div>
                            )}

                            <div className="mb-6 space-y-3">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>Rs {subtotal.toFixed(2)}</span>
                                </div>
                                {couponDiscount > 0 && (
                                    <div className="flex justify-between text-emerald-600">
                                        <span>Coupon savings</span>
                                        <span>- Rs {couponDiscount.toFixed(2)}</span>
                                    </div>
                                )}
                                {loyaltyDiscount > 0 && (
                                    <div className="flex justify-between text-emerald-600">
                                        <span>Loyalty redemption</span>
                                        <span>- Rs {loyaltyDiscount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax (5%)</span>
                                    <span>Rs {tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Fulfillment</span>
                                    <span className={selectedDeliveryCharge === 0 ? 'font-medium text-emerald-600' : ''}>
                                        {selectedDeliveryCharge === 0 ? 'Free' : `Rs ${selectedDeliveryCharge.toFixed(2)}`}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                <p className="font-semibold text-slate-900">
                                    {fulfillmentType === 'PICKUP'
                                        ? 'Self-Collect'
                                        : fulfillmentType === 'SCHEDULED'
                                            ? 'Scheduled Delivery'
                                            : 'Express Delivery'}
                                </p>
                                {fulfillmentType === 'PICKUP' && primaryShopName && (
                                    <p className="mt-2">Pickup shop: {primaryShopName}</p>
                                )}
                                {fulfillmentType === 'AGENT' && expressServiceability?.estimatedMinutes && (
                                    <p className="mt-2">Estimated arrival: about {expressServiceability.estimatedMinutes} minutes</p>
                                )}
                                {(selectedPickupSlot || selectedScheduledSlot) && (
                                    <p className="mt-2">Selected slot: {(selectedPickupSlot || selectedScheduledSlot)?.displayWindow}</p>
                                )}
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-semibold text-gray-900">Total</span>
                                    <span className="text-2xl font-bold text-primary">Rs {total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
