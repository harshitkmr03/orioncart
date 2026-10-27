import React, { useEffect, useCallback, useRef } from 'react';
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
import { cartAPI } from './services/api';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const isLoggedIn = () => Boolean(localStorage.getItem('authToken'));

const readLocalCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
};

const writeLocalCart = (items) => {
  try {
    localStorage.setItem('cart', JSON.stringify(items));
  } catch (error) {
    console.warn('[Cart] Unable to cache cart locally:', error);
  }
};

/**
 * Map server CartItemDTO → client-side cart item shape.
 * The server DTO uses 'name', the localStorage shape also uses 'name',
 * but localStorage items may have either 'id' (product id) or 'productId'.
 * We normalise everything to use 'id' as the cart key.
 */
const serverItemToLocal = (dto) => ({
  id: dto.productId,        // use productId as the canonical cart key
  cartItemId: dto.id,       // cart_item.id for direct mutations
  name: dto.name,
  description: dto.description,
  imageUrl: dto.imageUrl,
  shopId: dto.shopId,
  shopName: dto.shopName,
  price: dto.price,
  quantity: dto.quantity,
  availableStock: dto.availableStock,
  priceChanged: dto.priceChanged,
});

function App() {
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [cartItems, setCartItems] = React.useState(readLocalCart);
  const [cartError, setCartError] = React.useState('');
  const [serverCartReady, setServerCartReady] = React.useState(!isLoggedIn());
  // Track whether we are in server-cart mode (user is logged in)
  const [serverCartMode, setServerCartMode] = React.useState(isLoggedIn());
  const cartReady = !serverCartMode || !isLoggedIn() || serverCartReady;
  // Prevent race conditions on rapid add clicks
  const pendingRef = useRef(false);

  // ---------------------------------------------------------------
  // Broadcast helpers
  // ---------------------------------------------------------------
  const broadcast = useCallback((items) => {
    writeLocalCart(items);
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cart: items } }));
  }, []);

  // ---------------------------------------------------------------
  // Load cart from server (for logged-in users)
  // ---------------------------------------------------------------
  const loadServerCart = useCallback(async () => {
    try {
      const response = await cartAPI.getCart();
      if (response && Array.isArray(response.items)) {
        const localised = response.items.map(serverItemToLocal);
        setCartItems(localised);
        broadcast(localised);
        setCartError('');
        setServerCartReady(true);
        return true;
      }
      throw new Error('The server returned an invalid cart.');
    } catch (err) {
      console.warn('[Cart] Server cart load failed:', err);
      setCartError(err.message || 'Could not sync your cart. Please try again.');
      setServerCartReady(false);
      return false;
    }
  }, [broadcast]);

  const syncServerCart = useCallback(async () => {
    setServerCartReady(false);
    setCartError('');
    const guestItems = readLocalCart();
    if (guestItems.length === 0) {
      return loadServerCart();
    }

    const requests = guestItems.map((item) => ({
      productId: item.id ?? item.productId,
      shopId: item.shopId ?? null,
      quantity: item.quantity ?? 1,
      price: item.price ?? 0,
    }));
    try {
      const merged = await cartAPI.mergeGuestCart(requests);
      if (!merged || !Array.isArray(merged.items)) {
        throw new Error('The server returned an invalid cart after merging.');
      }
      const localised = merged.items.map(serverItemToLocal);
      setCartItems(localised);
      broadcast(localised);
      setServerCartReady(true);
      return true;
    } catch (err) {
      console.warn('[Cart] Merge failed:', err);
      setCartError(err.message || 'Could not merge your cart. Your guest cart is still saved.');
      setServerCartReady(false);
      return false;
    }
  }, [loadServerCart, broadcast]);

  // ---------------------------------------------------------------
  // On mount: hydrate cart from correct source
  // ---------------------------------------------------------------
  useEffect(() => {
    if (isLoggedIn()) {
      setServerCartMode(true);
      loadServerCart();
    } else {
      setCartItems(readLocalCart());
    }

    // Sync when another tab changes localStorage
    const onStorage = () => {
      if (!isLoggedIn()) setCartItems(readLocalCart());
    };
    // Sync when CartPage/CartDrawer fires the internal event
    const onCartUpdated = (e) => {
      const incoming = e?.detail?.cart;
      if (Array.isArray(incoming)) setCartItems(incoming);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('cartUpdated', onCartUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cartUpdated', onCartUpdated);
    };
  }, [loadServerCart]);

  // ---------------------------------------------------------------
  // Listen for login / logout events (fired by AuthModal & Navbar)
  // ---------------------------------------------------------------
  useEffect(() => {
    const onAuthChanged = async (e) => {
      const { token } = e?.detail || {};

      if (token) {
        // User just logged IN — merge guest cart then switch to server mode
        setServerCartMode(true);
        await syncServerCart();
      } else {
        // User logged OUT — switch back to guest/localStorage mode
        setServerCartMode(false);
        setServerCartReady(true);
        setCartItems([]);
        setCartError('');
        writeLocalCart([]);
        broadcast([]);
      }
    };

    window.addEventListener('authChanged', onAuthChanged);
    return () => window.removeEventListener('authChanged', onAuthChanged);
  }, [syncServerCart, broadcast]);

  // ---------------------------------------------------------------
  // Cart mutations
  // ---------------------------------------------------------------

  /**
   * Guest (localStorage) mutation helper.
   */
  const mutateLocalCart = useCallback((updater) => {
    setCartItems((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      broadcast(next);
      return next;
    });
  }, [broadcast]);

  /**
   * Add product to cart.
   * Logged-in → POST /api/cart/items, then refresh state from response.
   * Guest      → localStorage only.
   */
  const addToCart = useCallback(async (product) => {
    setIsCartOpen(true);

    if (serverCartMode && isLoggedIn() && serverCartReady) {
      if (pendingRef.current) return;
      pendingRef.current = true;
      try {
        const response = await cartAPI.addItem({
          productId: product.id,
          quantity: 1,
        });
        if (response && Array.isArray(response.items)) {
          const localised = response.items.map(serverItemToLocal);
          setCartItems(localised);
          broadcast(localised);
          setCartError('');
        }
      } catch (err) {
        console.warn('[Cart] Server addItem failed:', err);
        setCartError(err.message || 'Could not update your cart. Please try again.');
      } finally {
        pendingRef.current = false;
      }
    } else {
      mutateLocalCart((prev) => {
        const ex = prev.find(i => i.id === product.id);
        if (ex) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        return [...prev, { ...product, quantity: 1 }];
      });
    }
  }, [serverCartMode, serverCartReady, mutateLocalCart, broadcast]);

  /**
   * Update quantity by delta (±1). qty reaching 0 removes the item.
   */
  const updateQuantity = useCallback(async (productId, delta) => {
    if (serverCartMode && isLoggedIn() && serverCartReady) {
      const current = cartItems.find(i => i.id === productId);
      const newQty = Math.max(0, (current?.quantity ?? 1) + delta);
      try {
        const response = await cartAPI.updateQuantity(productId, newQty);
        if (response && Array.isArray(response.items)) {
          const localised = response.items.map(serverItemToLocal);
          setCartItems(localised);
          broadcast(localised);
          setCartError('');
        }
      } catch (err) {
        console.warn('[Cart] Server updateQuantity failed:', err);
        setCartError(err.message || 'Could not update your cart. Please try again.');
      }
    } else {
      mutateLocalCart((prev) =>
        prev.map(i => i.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
            .filter(i => i.quantity > 0)
      );
    }
  }, [serverCartMode, serverCartReady, cartItems, mutateLocalCart, broadcast]);

  /**
   * Remove a specific item by productId.
   */
  const removeFromCart = useCallback(async (productId) => {
    if (serverCartMode && isLoggedIn() && serverCartReady) {
      try {
        const response = await cartAPI.removeItem(productId);
        if (response && Array.isArray(response.items)) {
          const localised = response.items.map(serverItemToLocal);
          setCartItems(localised);
          broadcast(localised);
          setCartError('');
        }
      } catch (err) {
        console.warn('[Cart] Server removeItem failed:', err);
        setCartError(err.message || 'Could not remove that item. Please try again.');
      }
    } else {
      mutateLocalCart((prev) => prev.filter(i => i.id !== productId));
    }
  }, [serverCartMode, serverCartReady, mutateLocalCart, broadcast]);

  /**
   * Clear all cart items.
   */
  const clearCart = useCallback(async () => {
    if (serverCartMode && isLoggedIn() && serverCartReady) {
      try {
        await cartAPI.clearCart();
        setCartItems([]);
        broadcast([]);
        setCartError('');
      } catch (err) {
        console.warn('[Cart] Server clearCart failed:', err);
        setCartError(err.message || 'Could not clear your cart. Please try again.');
      }
      return;
    }
    setCartItems([]);
    broadcast([]);
  }, [serverCartMode, serverCartReady, broadcast]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar onCartClick={() => setIsCartOpen(true)} cartCount={cartItems.reduce((a, b) => a + b.quantity, 0)} />
        <main className="container mx-auto px-4 py-8">
          {cartError && (
            <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>{cartError}</span>
              <div className="flex shrink-0 items-center gap-3">
                {serverCartMode && !serverCartReady && (
                  <button type="button" onClick={syncServerCart} className="font-semibold underline">Retry sync</button>
                )}
                <button type="button" onClick={() => setCartError('')} className="font-semibold underline">Dismiss</button>
              </div>
            </div>
          )}
          <Routes>
            <Route path="/" element={<LandingPage />} />
              <Route path="/discover" element={<DiscoveryPage />} />
            <Route path="/products" element={<ProductListPage onAddToCart={addToCart} />} />
            <Route path="/shop/:id" element={<ShopDetails onAddToCart={addToCart} />} />
            <Route path="/cart" element={<CartPage items={cartItems} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} onClear={clearCart} onProceed={() => { window.location.href = '/checkout'; }} serverSynced={serverCartMode && isLoggedIn() && serverCartReady} cartReady={cartReady} />} />
            <Route path="/payment" element={<PaymentPage items={cartItems} clearCart={clearCart} cartReady={cartReady} />} />
            <Route path="/checkout" element={<CheckoutPage items={cartItems} cartReady={cartReady} />} />
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
