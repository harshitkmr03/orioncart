import React, { useState } from 'react';
import { X, Minus, Plus, ShoppingBag, CreditCard, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CartDrawer = ({ isOpen, onClose, items = [], onUpdateQuantity, onClear }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState('cart'); // 'cart', 'checkout', 'success'
    const [paymentMethod, setPaymentMethod] = useState('');
    // Note: Auth modal is rendered globally from Navbar; we no longer render it here.

    // Checkout fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [fulfillmentType, setFulfillmentType] = useState('PICKUP');
    const [scheduleTime, setScheduleTime] = useState('');
    const [note, setNote] = useState('');
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleProceedToCheckout = () => {
        if (items.length === 0) return;
        // Navigate to the dedicated checkout page and close drawer
        try {
            navigate('/checkout');
            onClose();
        } catch (e) {
            // fallback to in-drawer flow
            try {
                const raw = localStorage.getItem('user');
                if (raw) {
                    const u = JSON.parse(raw);
                    setFullName(u.name || u.username || '');
                }
            } catch (e) {}
            setStep('checkout');
        }
    };

    const handlePlaceOrder = async () => {
        // Redirect to checkout page (server-side order placement happens there)
        try {
            navigate('/checkout');
            onClose();
        } catch (e) {
            console.error('Could not navigate to checkout', e);
            alert('Unable to open checkout. Please try again.');
        }
    };

    const handleClose = () => {
        setStep('cart');
        setPaymentMethod('');
        onClose();
    };

    const handleSuccessClose = () => {
        onClear();
        setStep('cart');
        setPaymentMethod('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose}></div>

            <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold flex items-center">
                        {step === 'cart' && <><ShoppingBag className="mr-2 h-5 w-5" /> Your Cart ({items.length})</>}
                        {step === 'checkout' && <><CreditCard className="mr-2 h-5 w-5" /> Checkout</>}
                        {step === 'success' && <><CheckCircle className="mr-2 h-5 w-5 text-green-600" /> Order Confirmed</>}
                    </h2>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                {/* Cart Step */}
                {step === 'cart' && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {items.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">Your cart is empty</div>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className="flex gap-4">
                                        <img src={item.imageUrl || item.image} alt={item.name} className="h-20 w-20 object-cover rounded-lg bg-gray-100" />
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                                            <p className="text-primary font-bold">₹{item.price}</p>

                                            <div className="flex items-center mt-2 gap-3">
                                                <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1 rounded-md bg-gray-100 hover:bg-gray-200">
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="font-medium w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1 rounded-md bg-gray-100 hover:bg-gray-200">
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t p-4 space-y-4">
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>₹{totalAmount}</span>
                            </div>

                            <button
                                onClick={handleProceedToCheckout}
                                disabled={items.length === 0}
                                className="w-full btn-primary py-3 text-lg shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </>
                )}

                {/* Payment Step */}
                {step === 'checkout' && (
                    <>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Delivery Details</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Full name</label>
                                        <input className="w-full mt-1 p-3 rounded-lg border" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Phone</label>
                                        <input className="w-full mt-1 p-3 rounded-lg border" value={phone} onChange={(e) => setPhone(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Delivery Address</label>
                                        <textarea className="w-full mt-1 p-3 rounded-lg border" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Fulfillment</label>
                                        <div className="flex gap-3 mt-2">
                                            <button onClick={() => setFulfillmentType('PICKUP')} className={`px-3 py-2 rounded-lg border ${fulfillmentType==='PICKUP'?'border-primary bg-primary/5':''}`}>Pickup</button>
                                            <button onClick={() => setFulfillmentType('SCHEDULED')} className={`px-3 py-2 rounded-lg border ${fulfillmentType==='SCHEDULED'?'border-primary bg-primary/5':''}`}>Schedule</button>
                                            <button onClick={() => setFulfillmentType('AGENT')} className={`px-3 py-2 rounded-lg border ${fulfillmentType==='AGENT'?'border-primary bg-primary/5':''}`}>Agent Delivery</button>
                                        </div>
                                    </div>
                                    {fulfillmentType === 'SCHEDULED' && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Preferred time</label>
                                            <input type="datetime-local" className="w-full mt-1 p-3 rounded-lg border" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Order Note (optional)</label>
                                        <textarea className="w-full mt-1 p-3 rounded-lg border" value={note} onChange={(e) => setNote(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Items ({items.length})</span>
                                        <span className="font-medium">₹{totalAmount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Delivery</span>
                                        <span className="font-medium text-green-600">FREE</span>
                                    </div>
                                    <div className="border-t pt-2 flex justify-between font-bold">
                                        <span>Total</span>
                                        <span className="text-primary">₹{totalAmount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t p-4 space-y-3">
                            <button
                                onClick={() => setStep('cart')}
                                className="w-full py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Back to Cart
                            </button>
                            <div className="grid grid-cols-1 gap-3">
                                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-3 rounded-lg border">
                                    <option value="">Select payment method</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CARD">Card</option>
                                    <option value="COD">Cash on Delivery</option>
                                </select>
                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={!paymentMethod}
                                    className="w-full btn-primary py-3 text-lg shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Place Order
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Success Step */}
                {step === 'success' && (
                    <>
                        <div className="flex-1 flex items-center justify-center p-6">
                            <div className="text-center space-y-6">
                                <div className="flex justify-center">
                                    <div className="bg-green-100 rounded-full p-6">
                                        <CheckCircle className="h-20 w-20 text-green-600" />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h3>
                                    <p className="text-gray-600 text-lg">
                                        Your order has been confirmed and an agent will be assigned soon.
                                    </p>
                                </div>

                                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                                    <p className="text-sm text-gray-700">
                                        <span className="font-semibold">Order Total:</span> ₹{totalAmount}
                                    </p>
                                    <p className="text-sm text-gray-700 mt-1">
                                        <span className="font-semibold">Payment Method:</span> {paymentMethod}
                                    </p>
                                </div>

                                <div className="text-sm text-gray-500">
                                    You will receive updates about your order via notifications.
                                </div>
                            </div>
                        </div>

                        <div className="border-t p-4">
                            <button
                                onClick={handleSuccessClose}
                                className="w-full btn-primary py-3 text-lg shadow-lg shadow-primary/30"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CartDrawer;
