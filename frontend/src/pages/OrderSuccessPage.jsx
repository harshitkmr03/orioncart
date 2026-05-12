import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, MapPin, Package, ShoppingBag, Truck } from 'lucide-react';

const OrderSuccessPage = () => {
    const location = useLocation();
    const { orderId, fulfillmentType, scheduledSlot, shopName } = location.state || {};

    const isPickup = fulfillmentType === 'PICKUP';

    // Delivery-only animation step state
    const [step, setStep] = useState(1);

    useEffect(() => {
        if (isPickup) return; // no step animation needed for pickup

        const timer1 = setTimeout(() => setStep(2), 1500);
        const timer2 = setTimeout(() => setStep(3), 3500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [isPickup]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100 max-w-lg w-full text-center space-y-8">

                {/* Success Icon */}
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-green-100 p-4 rounded-full">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">Order Placed Successfully!</h1>
                    <p className="text-gray-500">{orderId ? `Order #${orderId}` : 'Order confirmed'}</p>
                </div>

                {/* ── PICKUP flow ── */}
                {isPickup ? (
                    <div className="space-y-5 text-left bg-gray-50 p-6 rounded-2xl">

                        {/* Step 1: Confirmed */}
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-green-100 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Order Confirmed</p>
                                <p className="text-xs text-gray-500">Your order has been received by the store</p>
                            </div>
                        </div>

                        {/* Step 2: Being packed */}
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                                <Package className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Preparing Your Order</p>
                                <p className="text-xs text-gray-500">
                                    {scheduledSlot
                                        ? `Will be packed and ready by ${scheduledSlot}`
                                        : 'Your order will be packed and ready for collection'}
                                </p>
                            </div>
                        </div>

                        {/* Step 3: Collect */}
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-indigo-100 text-indigo-600">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Ready for Collection</p>
                                <p className="text-xs text-gray-500">
                                    {shopName
                                        ? `Visit ${shopName} and show your Order ID to collect`
                                        : 'Visit the store and show your Order ID to collect'}
                                </p>
                            </div>
                        </div>

                        {/* Info banner */}
                        <div className="mt-2 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-800">
                            🛍️ No rider or delivery partner involved — just show up at the store at your selected time and collect your order!
                        </div>
                    </div>
                ) : (
                    /* ── DELIVERY flow (original 3-step animation) ── */
                    <div className="space-y-6 text-left bg-gray-50 p-6 rounded-2xl">

                        {/* Step 1 */}
                        <div className={`flex items-center gap-4 transition-all duration-500 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`p-2 rounded-full ${step >= 1 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Order Confirmed</p>
                                <p className="text-xs text-gray-500">Your order has been received</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className={`flex items-center gap-4 transition-all duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`p-2 rounded-full ${step >= 2 ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Locating Delivery Partner</p>
                                <p className="text-xs text-gray-500">Searching for nearby riders...</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className={`flex items-center gap-4 transition-all duration-500 ${step >= 3 ? 'opacity-100' : 'opacity-50'}`}>
                            <div className={`p-2 rounded-full ${step >= 3 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'}`}>
                                <Truck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Rider Assigned</p>
                                <p className="text-xs text-gray-500">Your order is on the way</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-3 pt-4 md:grid-cols-2">
                    <Link to="/" className="btn-primary w-full py-3 text-center shadow-lg">
                        Continue Shopping
                    </Link>
                    <Link to="/account" className="w-full rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-900 transition-colors hover:bg-gray-50">
                        View My Orders
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccessPage;
