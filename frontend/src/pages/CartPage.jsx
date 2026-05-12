import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function CartPage({ items: controlledItems, onUpdateQuantity, onRemove, onClear }) {
  const isControlled = Array.isArray(controlledItems);
  const [localItems, setLocalItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const items = isControlled ? controlledItems : localItems;

  const emitCartUpdated = (nextCart) => {
    try {
      localStorage.setItem('cart', JSON.stringify(nextCart));
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: nextCart } }));
    } catch (e) {}
  };

  useEffect(() => {
    if (isControlled) {
      setLoading(false);
      return;
    }
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setLocalItems(cart);
    } catch (e) {
      setLocalItems([]);
    }
    setLoading(false);
  }, [isControlled]);

  const updateQuantity = (productId, delta) => {
    if (typeof onUpdateQuantity === 'function') {
      onUpdateQuantity(productId, delta);
      return;
    }
    const updated = items.map(item =>
      item.id === productId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    );
    setLocalItems(updated);
    emitCartUpdated(updated);
  };

  const removeItem = (productId) => {
    if (typeof onRemove === 'function') {
      onRemove(productId);
      return;
    }
    const updated = items.filter(item => item.id !== productId);
    setLocalItems(updated);
    emitCartUpdated(updated);
  };

  const clearCart = () => {
    if (typeof onClear === 'function') {
      onClear();
      return;
    }
    setLocalItems([]);
    emitCartUpdated([]);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.05); // 5% tax
  const shipping = subtotal > 0 ? 50 : 0;
  const total = subtotal + tax + shipping;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Continue Shopping
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some items to get started!</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {items.length} item{items.length !== 1 ? 's' : ''} in cart
                  </h2>
                </div>

                <div className="divide-y divide-gray-200">
                  {items.map(item => (
                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={item.imageUrl || item.image || 'https://via.placeholder.com/100'}
                            alt={item.name}
                            className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">{item.name}</h3>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center border border-gray-300 rounded-lg">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="p-2 hover:bg-gray-100"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="px-4 py-2 font-medium text-gray-900">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="p-2 hover:bg-gray-100"
                              >
                                <Plus size={16} />
                              </button>
                            </div>

                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right flex flex-col justify-center">
                          <p className="text-sm text-gray-600 mb-2">₹{item.price} each</p>
                          <p className="text-lg font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Clear Cart Button */}
                <div className="p-6 border-t border-gray-200 flex justify-between">
                  <button
                    onClick={clearCart}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>

                <div className="space-y-4 border-b border-gray-200 pb-4 mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (5%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-primary">₹{total.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors mb-3"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="w-full border border-gray-300 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Continue Shopping
                </button>

                {/* Order Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-900">
                    ✓ Free returns within 14 days
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
