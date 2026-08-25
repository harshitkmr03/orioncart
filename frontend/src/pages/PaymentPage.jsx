import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Lock, Smartphone, Store, Truck, Wallet, Zap } from 'lucide-react';
import { paymentAPI } from '../services/api';

const composeAddress = (shippingInfo) => {
    const parts = [shippingInfo.address, shippingInfo.city, shippingInfo.state, shippingInfo.zipCode]
        .map((value) => (value || '').toString().trim())
        .filter(Boolean);
    return parts.join(', ');
};

const getFulfillmentLabel = (type) => {
    if (type === 'PICKUP') return 'Self-Collect';
    if (type === 'SCHEDULED') return 'Scheduled Delivery';
    return 'Express Delivery';
};

const getFulfillmentIcon = (type) => {
    if (type === 'PICKUP') return Store;
    if (type === 'SCHEDULED') return Truck;
    return Zap;
};

export default function PaymentPage({ items = [], clearCart }) {
    const navigate = useNavigate();
    const location = useLocation();

    const checkoutState = location.state || {};
    const [cartItems, setCartItems] = useState(Array.isArray(items) && items.length > 0 ? items : []);
    const [shippingInfo] = useState(checkoutState.shippingInfo || {});
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(
        checkoutState.paymentMethod || checkoutState.shippingInfo?.paymentMethod || 'card'
    );
    const [cardData, setCardData] = useState({ cardNumber: '', expiry: '', cvv: '' });
    const [upiId, setUpiId] = useState('');

    const fulfillmentType = checkoutState.fulfillmentType || 'SCHEDULED';
    const isPickup = fulfillmentType === 'PICKUP';

    useEffect(() => {
        if (Array.isArray(items) && items.length > 0) {
            return;
        }

        try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            setCartItems(Array.isArray(cart) ? cart : []);
        } catch {
            setCartItems([]);
        }
    }, [items]);

    const subtotal = useMemo(() => (
        Number.isFinite(Number(checkoutState.subtotal))
            ? Number(checkoutState.subtotal)
            : cartItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0)
    ), [cartItems, checkoutState.subtotal]);

    const tax = useMemo(() => (
        Number.isFinite(Number(checkoutState.tax))
            ? Number(checkoutState.tax)
            : Math.round(subtotal * 0.05 * 100) / 100
    ), [checkoutState.tax, subtotal]);

    const deliveryCharge = useMemo(() => (
        Number.isFinite(Number(checkoutState.deliveryCharge))
            ? Number(checkoutState.deliveryCharge)
            : 0
    ), [checkoutState.deliveryCharge]);

    const discountAmount = useMemo(() => (
        Number.isFinite(Number(checkoutState.discountAmount))
            ? Number(checkoutState.discountAmount)
            : 0
    ), [checkoutState.discountAmount]);

    const couponDiscount = useMemo(() => (
        Number.isFinite(Number(checkoutState.couponDiscount))
            ? Number(checkoutState.couponDiscount)
            : 0
    ), [checkoutState.couponDiscount]);

    const loyaltyDiscount = useMemo(() => (
        Number.isFinite(Number(checkoutState.loyaltyDiscount))
            ? Number(checkoutState.loyaltyDiscount)
            : 0
    ), [checkoutState.loyaltyDiscount]);

    const total = useMemo(() => (
        Number.isFinite(Number(checkoutState.total))
            ? Number(checkoutState.total)
            : subtotal + tax + deliveryCharge
    ), [checkoutState.total, subtotal, tax, deliveryCharge]);

    const handleCardChange = (event) => {
        const { name, value } = event.target;
        setCardData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePayment = async (event) => {
        event.preventDefault();

        const token = localStorage.getItem('authToken');
        if (!token) {
            window.dispatchEvent(new CustomEvent('openAuthModal'));
            return;
        }

        if (paymentMethod === 'card' && (!cardData.cardNumber || !cardData.expiry || !cardData.cvv)) {
            alert('Please fill in all card details');
            return;
        }

        if (paymentMethod === 'upi' && !upiId.trim()) {
            alert('Please enter a UPI ID');
            return;
        }

        setProcessingPayment(true);
        try {
            // NOTE: In production, the backend MUST independently recalculate all monetary
            // values (subtotal, tax, delivery charge, discount, total) from the cart item IDs
            // and quantities rather than trusting these client-provided amounts.
            // This is a known MVP limitation — see Future Roadmap in README.md.
            const orderData = {
                items: cartItems.map((item) => ({
                    product: { id: item.id },
                    quantity: item.quantity,
                })),
                subtotalAmount: subtotal,
                discountAmount,
                taxAmount: tax,
                deliveryCharge,
                totalAmount: total,
                couponCode: checkoutState.couponCode || '',
                loyaltyPointsRedeemed: Number(checkoutState.loyaltyPointsRedeemed || 0),
                fulfillmentType,
                deliveryAddress: isPickup ? `${checkoutState.primaryShopName || 'Store pickup'}` : composeAddress(shippingInfo),
                deliveryLatitude: checkoutState.locationCoords?.lat ?? null,
                deliveryLongitude: checkoutState.locationCoords?.lon ?? null,
                scheduleTime: checkoutState.scheduleTime || new Date().toISOString(),
                scheduledSlot: checkoutState.scheduledSlot || '',
                contactName: shippingInfo.fullName || '',
                contactPhone: shippingInfo.phone || '',
                deliveryPartner: fulfillmentType === 'AGENT'
                    ? checkoutState.expressServiceability?.partner || 'shiprocket_hyperlocal'
                    : fulfillmentType === 'SCHEDULED'
                        ? 'orioncart_scheduled'
                        : 'self_pickup',
                note: `Payment via ${paymentMethod.toUpperCase()}`,
                status: 'PENDING',
            };

            let response;
            if (paymentMethod === 'card') {
                const [expMonth, expYear] = (cardData.expiry || '').split('/').map((value) => value && value.trim());
                response = await paymentAPI.charge({
                    cardNumber: (cardData.cardNumber || '').replace(/\s+/g, ''),
                    expiryMonth: expMonth ? parseInt(expMonth, 10) : null,
                    expiryYear: expYear ? (expYear.length === 2 ? 2000 + parseInt(expYear, 10) : parseInt(expYear, 10)) : null,
                    cvv: cardData.cvv,
                    order: orderData,
                });
            } else if (paymentMethod === 'upi') {
                response = await paymentAPI.chargeUpi({
                    upiId: upiId.trim(),
                    transactionId: `TXN-${Date.now()}`,
                    order: orderData,
                });
            } else {
                response = await paymentAPI.codOrder({
                    contactNumber: shippingInfo.phone || '',
                    order: orderData,
                });
            }

            localStorage.setItem('cart', JSON.stringify([]));
            window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: [] } }));
            if (typeof clearCart === 'function') {
                clearCart();
            }

            navigate('/order-success', {
                state: {
                    orderId: response?.id,
                    fulfillmentType,
                    scheduledSlot: checkoutState.scheduledSlot || '',
                    shopName: checkoutState.primaryShopName || '',
                },
            });
        } catch (error) {
            console.error('Payment failed', error);
            alert(`Payment failed: ${error.message || 'Please try again.'}`);
        } finally {
            setProcessingPayment(false);
        }
    };

    if (!isPickup && !shippingInfo.address) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="mb-4 text-2xl font-bold text-gray-900">No checkout information found</h2>
                    <button
                        onClick={() => navigate('/checkout')}
                        className="rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary/90"
                    >
                        Go back to checkout
                    </button>
                </div>
            </div>
        );
    }

    const FulfillmentIcon = getFulfillmentIcon(fulfillmentType);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <button
                    onClick={() => navigate('/checkout')}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft size={20} />
                    Back to Checkout
                </button>

                <h1 className="mb-8 text-3xl font-bold text-gray-900">Payment</h1>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <form onSubmit={handlePayment} className="space-y-6 lg:col-span-2">
                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900">Select Payment Method</h2>

                            <div className="space-y-3">
                                {[
                                    { value: 'card', label: 'Credit / Debit Card', Icon: CreditCard },
                                    { value: 'upi', label: 'UPI / Net Banking', Icon: Smartphone },
                                    { value: 'cod', label: 'Cash on Delivery', Icon: Wallet },
                                ].map((method) => (
                                    <label
                                        key={method.value}
                                        className="flex cursor-pointer items-center gap-4 rounded-lg border border-gray-300 p-4 transition-colors hover:bg-gray-50"
                                        style={{
                                            borderColor: paymentMethod === method.value ? '#0f62fe' : undefined,
                                            backgroundColor: paymentMethod === method.value ? '#f0f7ff' : undefined,
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value={method.value}
                                            checked={paymentMethod === method.value}
                                            onChange={(event) => setPaymentMethod(event.target.value)}
                                            className="h-4 w-4"
                                        />
                                        <method.Icon size={20} />
                                        <span className="font-medium text-gray-900">{method.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {paymentMethod === 'card' && (
                            <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
                                <h3 className="mb-4 font-semibold text-gray-900">Card Details</h3>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Card Number</label>
                                    <input
                                        type="text"
                                        name="cardNumber"
                                        placeholder="1234 5678 9012 3456"
                                        value={cardData.cardNumber}
                                        onChange={handleCardChange}
                                        maxLength="19"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Expiry (MM/YY)</label>
                                        <input
                                            type="text"
                                            name="expiry"
                                            placeholder="12/25"
                                            value={cardData.expiry}
                                            onChange={handleCardChange}
                                            maxLength="5"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">CVV</label>
                                        <input
                                            type="text"
                                            name="cvv"
                                            placeholder="123"
                                            value={cardData.cvv}
                                            onChange={handleCardChange}
                                            maxLength="4"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'upi' && (
                            <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
                                <h3 className="mb-4 font-semibold text-gray-900">UPI / Net Banking</h3>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">UPI ID</label>
                                    <input
                                        type="text"
                                        name="upiId"
                                        placeholder="yourname@upi"
                                        value={upiId}
                                        onChange={(event) => setUpiId(event.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'cod' && (
                            <div className="space-y-2 rounded-lg bg-white p-6 shadow-sm">
                                <h3 className="mb-2 font-semibold text-gray-900">Cash on Delivery</h3>
                                <p className="text-sm text-gray-600">You will pay when the order is handed over.</p>
                                <p className="text-sm text-gray-500">Contact: {shippingInfo.phone || 'Not provided'}</p>
                            </div>
                        )}

                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="mb-4 font-semibold text-gray-900">Order Contact</h3>
                            <div className="space-y-1 text-gray-700">
                                <p className="font-medium">{shippingInfo.fullName}</p>
                                <p className="text-sm">{shippingInfo.phone}</p>
                                {!isPickup && <p className="text-sm">{composeAddress(shippingInfo)}</p>}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                            <Lock size={20} className="mt-0.5 flex-shrink-0 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-green-900">Secure Payment</p>
                                <p className="text-xs text-green-800">Your payment information is encrypted and secure.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/checkout')}
                                className="flex-1 rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={processingPayment}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:bg-gray-400"
                            >
                                {processingPayment ? 'Processing...' : `Pay Rs ${total.toFixed(2)}`}
                            </button>
                        </div>
                    </form>

                    <div className="lg:col-span-1">
                        <div className="sticky top-24 rounded-lg bg-white p-6 shadow-sm">
                            <h2 className="mb-6 text-lg font-semibold text-gray-900">Order Summary</h2>

                            <div className="mb-6 max-h-72 overflow-y-auto border-b border-gray-200 pb-6">
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
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">Rs {(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-6 rounded-2xl bg-slate-50 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-white p-3 text-primary shadow-sm">
                                        <FulfillmentIcon size={20} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{getFulfillmentLabel(fulfillmentType)}</p>
                                        {checkoutState.scheduledSlot && (
                                            <p className="mt-1 text-sm text-slate-600">{checkoutState.scheduledSlot}</p>
                                        )}
                                        {checkoutState.expressServiceability?.estimatedMinutes && (
                                            <p className="mt-1 text-sm text-slate-600">
                                                ETA about {checkoutState.expressServiceability.estimatedMinutes} minutes
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

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
                                    <span>Tax</span>
                                    <span>Rs {tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Fulfillment</span>
                                    <span>{deliveryCharge === 0 ? 'Free' : `Rs ${deliveryCharge.toFixed(2)}`}</span>
                                </div>
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
