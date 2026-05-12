import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DiscoveryPage from './pages/DiscoveryPage';
import ProductListPage from './pages/ProductListPage';
import ShopDetails from './pages/ShopDetails';
import SellerDashboard from './pages/SellerDashboard';
import TestConnection from './pages/TestConnection';
import CartDrawer from './components/CartDrawer';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import CartPage from './pages/CartPage';
import PaymentPage from './pages/PaymentPage';
import AccountPage from './pages/AccountPage';

function App() {
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [cartItems, setCartItems] = React.useState([]);

  const readCart = () => {
    try {
      const raw = localStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const setAndBroadcastCart = (updater) => {
    setCartItems((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('cart', JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: next } }));
      } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    setCartItems(readCart());
    const onCartUpdated = (e) => {
      const incoming = e?.detail?.cart;
      if (Array.isArray(incoming)) {
        setCartItems(incoming);
      } else {
        setCartItems(readCart());
      }
    };
    const onStorage = () => setCartItems(readCart());
    window.addEventListener('cartUpdated', onCartUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('cartUpdated', onCartUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const addToCart = (product) => {
    setAndBroadcastCart((prev) => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true); // Open cart when item added
  };

  const removeFromCart = (productId) => {
    setAndBroadcastCart((prev) => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setAndBroadcastCart((prev) => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => setAndBroadcastCart([]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar onCartClick={() => setIsCartOpen(true)} cartCount={cartItems.reduce((a, b) => a + b.quantity, 0)} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<LandingPage />} />
              <Route path="/discover" element={<DiscoveryPage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/shop/:id" element={<ShopDetails onAddToCart={addToCart} />} />
            <Route path="/cart" element={<CartPage items={cartItems} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} onClear={clearCart} onProceed={() => { window.location.href = '/checkout'; }} />} />
            <Route path="/payment" element={<PaymentPage items={cartItems} clearCart={clearCart} />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-success" element={<OrderSuccessPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/seller" element={<SellerDashboard />} />
            <Route path="/test" element={<TestConnection />} />
          </Routes>
        </main>
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onUpdateQuantity={updateQuantity}
          onClear={clearCart}
        />
        <Footer />
      </div>
    </Router>
  );
}

export default App;
