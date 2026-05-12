const API_BASE_URL = '/api';

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const toProductPayload = (productData = {}, includeShop = false) => {
    const payload = {
        name: productData.name ?? '',
        description: productData.description ?? productData.category ?? '',
        category: productData.category ?? '',
        sku: productData.sku ?? '',
        price: toNumber(productData.price, 0),
        stockQuantity: toNumber(productData.stockQuantity ?? productData.stock ?? 0, 0),
        lowStockThreshold: toNumber(productData.lowStockThreshold, 5),
        imageUrl: productData.imageUrl ?? productData.image ?? '',
    };

    if (includeShop) {
        const shopId = toNumber(productData.shopId ?? productData.shop?.id, NaN);
        if (Number.isFinite(shopId)) {
            payload.shop = { id: shopId };
        }
    }

    return payload;
};

// Shop API
export const shopAPI = {
    getAllShops: async () => {
        const response = await fetch(`${API_BASE_URL}/shops`);
        if (!response.ok) throw new Error('Failed to fetch shops');
        return response.json();
    },

    getShopById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/shops/${id}`);
        if (!response.ok) throw new Error('Failed to fetch shop');
        return response.json();
    },

    getShopsByCategory: async (category) => {
        const response = await fetch(`${API_BASE_URL}/shops/category/${category}`);
        if (!response.ok) throw new Error('Failed to fetch shops by category');
        return response.json();
    },

    searchShops: async (query) => {
        const response = await fetch(`${API_BASE_URL}/shops/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search shops');
        return response.json();
    },

    createShop: async (shopData) => {
        const response = await fetch(`${API_BASE_URL}/shops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shopData),
        });
        if (!response.ok) throw new Error('Failed to create shop');
        return response.json();
    },

    /** Fetch ALL shops owned by this user — returns [] when none. */
    getShopByOwner: async (userId) => {
        const response = await fetch(`${API_BASE_URL}/shops/owner/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch owner shops');
        return response.json(); // always an array now
    },

    /** Alias for clarity — same as getShopByOwner but named for multi-shop semantics. */
    getShopsByOwner: async (userId) => {
        const response = await fetch(`${API_BASE_URL}/shops/owner/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch owner shops');
        return response.json(); // array of Shop objects
    },

    getAvailableSlots: async (shopId, date) => {
        const params = new URLSearchParams();
        if (date) {
            params.set('date', date);
        }

        const response = await fetch(`${API_BASE_URL}/shops/${shopId}/available-slots?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch pickup slots');
        return response.json();
    },

    getAnalyticsOverview: async (shopId, date) => {
        const params = new URLSearchParams();
        if (date) {
            params.set('date', date);
        }
        const response = await fetch(`${API_BASE_URL}/shops/${shopId}/analytics/overview?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch shop analytics');
        return response.json();
    },

    getReviews: async (shopId) => {
        const response = await fetch(`${API_BASE_URL}/shops/${shopId}/reviews`);
        if (!response.ok) throw new Error('Failed to fetch shop reviews');
        return response.json();
    },

    /** Create a shop linked to the given user. */
    createShopForOwner: async (userId, shopData) => {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['X-Auth-Token'] = token;
        let response;
        try {
            response = await fetch(`${API_BASE_URL}/shops/owner/${userId}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(shopData),
            });
        } catch (networkErr) {
            throw new Error('Cannot reach the server. Please check that the backend is running on port 7070.');
        }
        if (!response.ok) {
            let text = await response.text();
            try { text = JSON.parse(text); } catch (e) { /* keep as string */ }
            const msg = (text && text.message) ? text.message
                : (typeof text === 'string' && text.length > 0) ? text
                : `Server error ${response.status}`;
            throw new Error(msg);
        }
        return response.json();
    },

    /** Update an existing shop's details. */
    updateShop: async (shopId, updateData) => {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['X-Auth-Token'] = token;
        
        const response = await fetch(`${API_BASE_URL}/shops/${shopId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updateData),
        });
        
        if (!response.ok) {
            let text = await response.text();
            try { text = JSON.parse(text); } catch (e) { /* ignore */ }
            const msg = (text && text.message) ? text.message : 'Failed to update shop';
            throw new Error(msg);
        }
        return response.json();
    },

    /** Delete a shop. */
    deleteShop: async (shopId) => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        
        const response = await fetch(`${API_BASE_URL}/shops/${shopId}`, {
            method: 'DELETE',
            headers,
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete shop');
        }
        return true;
    },
};

// Product API
export const productAPI = {
    getProductsByShop: async (shopId) => {
        const response = await fetch(`${API_BASE_URL}/products/shop/${shopId}`);
        if (!response.ok) throw new Error('Failed to fetch products');
        return response.json();
    },

    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        return response.json();
    },

    searchNearby: async ({ query, lat, lon, radiusKm = 5, categories = [] }) => {
        const params = new URLSearchParams({
            q: query,
            lat: String(lat),
            lon: String(lon),
            radiusKm: String(radiusKm),
        });

        if (categories.length > 0) {
            params.set('categories', categories.join(','));
        }

        const response = await fetch(`${API_BASE_URL}/products/search?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to search nearby products');
        return response.json();
    },

    addProduct: async (productData) => {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['X-Auth-Token'] = token;
        const payload = toProductPayload(productData, true);
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to add product');
        return response.json();
    },

    updateProduct: async (id, productData) => {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['X-Auth-Token'] = token;
        const payload = toProductPayload(productData, false);
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to update product');
        return response.json();
    },

    deleteProduct: async (id) => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) throw new Error('Failed to delete product');
    },

    updateStock: async (id, quantity) => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/products/${id}/stock?quantity=${quantity}`, {
            method: 'PUT',
            headers,
        });
        if (!response.ok) throw new Error('Failed to update stock');
        return response.json();
    },

    quickStockUpdate: async (id, quantity) => {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/products/${id}/quick-stock-update`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ quantity }),
        });
        if (!response.ok) throw new Error('Failed to update stock');
        return response.json();
    },

    bulkUpload: async (shopId, file) => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const formData = new FormData();
        formData.append('shopId', String(shopId));
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/products/bulk-upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            let text = await response.text();
            try { text = JSON.parse(text); } catch (e) { }
            const msg = (text && text.message) ? text.message : (typeof text === 'string' ? text : 'Bulk upload failed');
            throw new Error(msg);
        }

        return response.json();
    },

    downloadCsvTemplate: async () => {
        const response = await fetch(`${API_BASE_URL}/products/csv-template`);
        if (!response.ok) throw new Error('Failed to download CSV template');
        return response.blob();
    },
};

// Auth API
export const authAPI = {
    register: async (userData) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            let text = await response.text();
            try { text = JSON.parse(text); } catch (e) { }
            const msg = (text && text.message) ? text.message : (typeof text === 'string' ? text : 'Failed to register');
            throw new Error(msg);
        }
        return response.json();
    },

    login: async (credentials) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });
        if (!response.ok) {
            let text = await response.text();
            try { text = JSON.parse(text); } catch (e) { }
            const msg = (text && text.message) ? text.message : (typeof text === 'string' ? text : 'Invalid credentials');
            throw new Error(msg);
        }
        return response.json();
    },
};

// Order API
export const orderAPI = {
    createOrder: async (orderData) => {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) headers['X-Auth-Token'] = token;

        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(orderData),
        });
        if (!response.ok) {
            let text = await response.text();
            try { text = JSON.parse(text); } catch (e) { }
            const msg = (text && text.message) ? text.message : (typeof text === 'string' ? text : 'Failed to create order');
            throw new Error(msg);
        }
        return response.json();
    },

    getOrdersByUser: async (userId) => {
        const response = await fetch(`${API_BASE_URL}/orders/buyer/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch orders');
        return response.json();
    },

    getOrdersBySeller: async (sellerId) => {
        const response = await fetch(`${API_BASE_URL}/orders/shop/${sellerId}`);
        if (!response.ok) throw new Error('Failed to fetch seller orders');
        return response.json();
    },

    updateStatus: async (orderId, status) => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status?status=${encodeURIComponent(status)}`, {
            method: 'PUT',
            headers,
        });
        if (!response.ok) throw new Error('Failed to update order status');
        return response.json();
    },

    getOrderSlip: async (orderId) => {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/slip`);
        if (!response.ok) throw new Error('Failed to fetch order slip');
        return response.json();
    },
};

// ─── Payment API (dummy / simulation mode) ──────────────────────────────────
// Real payment gateways are not wired up yet. All methods simulate a
// short processing delay and return a synthetic success response so the
// full checkout flow can be exercised end-to-end without a live gateway.
const DUMMY_PAYMENT_DELAY_MS = 1500;

const dummyOrderResponse = (extra = {}) => ({
    id: `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    status: 'PAID',
    createdAt: new Date().toISOString(),
    ...extra,
});

export const paymentAPI = {
    /** Dummy card / debit / credit payment — always succeeds. */
    charge: async (paymentPayload) => {
        // Simulate network + processing latency
        await new Promise((resolve) => setTimeout(resolve, DUMMY_PAYMENT_DELAY_MS));
        console.info('[PaymentAPI] Dummy card charge processed', paymentPayload);
        return dummyOrderResponse({ method: 'CARD' });
    },

    /** Dummy UPI payment — accepts any UPI ID and always succeeds. */
    chargeUpi: async (upiPayload) => {
        await new Promise((resolve) => setTimeout(resolve, DUMMY_PAYMENT_DELAY_MS));
        console.info('[PaymentAPI] Dummy UPI charge processed', upiPayload);
        return dummyOrderResponse({
            method: 'UPI',
            upiId: upiPayload.upiId,
            transactionId: upiPayload.transactionId,
        });
    },

    /** COD order — calls real backend so seller is notified. Falls back to dummy on failure. */
    codOrder: async (codPayload) => {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['X-Auth-Token'] = token;

        try {
            const response = await fetch(`${API_BASE_URL}/payments/cod`, {
                method: 'POST',
                headers,
                body: JSON.stringify(codPayload),
            });

            if (!response.ok) {
                let text = await response.text();
                try { text = JSON.parse(text); } catch (e) { }
                const msg = (text && text.message) ? text.message : (typeof text === 'string' ? text : 'COD order failed');
                throw new Error(msg);
            }
            return response.json();
        } catch (err) {
            // Fallback: if the backend endpoint doesn't exist yet, use dummy
            console.warn('[PaymentAPI] COD backend unavailable, using dummy fallback:', err.message);
            await new Promise((resolve) => setTimeout(resolve, DUMMY_PAYMENT_DELAY_MS));
            return dummyOrderResponse({ method: 'COD' });
        }
    },
};

// Discovery API
export const discoveryAPI = {
    getNearby: async ({ lat, lon, radiusKm = 5, categories = [], query = '', sortBy = 'distance', minRating = null }) => {
        const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lon),
            radiusKm: String(radiusKm),
            sortBy,
        });

        if (categories.length > 0) {
            params.set('categories', categories.join(','));
        }

        if (query.trim()) {
            params.set('q', query.trim());
        }

        if (minRating !== null && minRating !== undefined && minRating !== '') {
            params.set('minRating', String(minRating));
        }

        const response = await fetch(`${API_BASE_URL}/discovery?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch nearby shops');
        return response.json();
    },

    /** Fallback: returns all shops regardless of location (for newly created shops). */
    getAll: async ({ lat, lon, categories = [], query = '', sortBy = 'newest', minRating = null } = {}) => {
        const params = new URLSearchParams({ sortBy });
        if (lat != null) params.set('lat', String(lat));
        if (lon != null) params.set('lon', String(lon));
        if (categories.length > 0) params.set('categories', categories.join(','));
        if (query.trim()) params.set('q', query.trim());
        if (minRating !== null && minRating !== undefined && minRating !== '') {
            params.set('minRating', String(minRating));
        }
        const response = await fetch(`${API_BASE_URL}/discovery/all?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch all shops');
        return response.json();
    },
};

export const reviewAPI = {
    createReview: async (payload) => {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/reviews`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            let text = await response.text();
            try { text = JSON.parse(text); } catch (e) { }
            const msg = (text && text.message) ? text.message : (typeof text === 'string' ? text : 'Failed to submit review');
            throw new Error(msg);
        }
        return response.json();
    },
};

export const couponAPI = {
    validate: async ({ code, subtotal, shopIds = [] }) => {
        const params = new URLSearchParams({
            code,
            subtotal: String(subtotal),
        });

        if (shopIds.length > 0) {
            params.set('shopIds', shopIds.join(','));
        }

        const response = await fetch(`${API_BASE_URL}/coupons/validate?${params.toString()}`);
        if (!response.ok) {
            let text = await response.text();
            try { text = JSON.parse(text); } catch (e) { }
            const msg = (text && text.message) ? text.message : (typeof text === 'string' ? text : 'Coupon validation failed');
            throw new Error(msg);
        }
        return response.json();
    },
};

export const wishlistAPI = {
    getMine: async () => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/wishlist`, { headers });
        if (!response.ok) throw new Error('Failed to fetch wishlist');
        return response.json();
    },

    add: async (productId) => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/wishlist/${productId}`, {
            method: 'POST',
            headers,
        });
        if (!response.ok) throw new Error('Failed to add to wishlist');
        return response.json();
    },

    remove: async (productId) => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/wishlist/${productId}`, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) throw new Error('Failed to remove from wishlist');
        return response.json();
    },
};

export const loyaltyAPI = {
    getBalance: async () => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/loyalty/balance`, { headers });
        if (!response.ok) throw new Error('Failed to fetch loyalty balance');
        return response.json();
    },

    getTransactions: async () => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/loyalty/transactions`, { headers });
        if (!response.ok) throw new Error('Failed to fetch loyalty transactions');
        return response.json();
    },

    getReferralCode: async () => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/referrals/my-code`, { headers });
        if (!response.ok) throw new Error('Failed to fetch referral code');
        return response.json();
    },

    getReferralHistory: async () => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/referrals/history`, { headers });
        if (!response.ok) throw new Error('Failed to fetch referral history');
        return response.json();
    },
};

export const disputeAPI = {
    create: async (payload) => {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/disputes`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            let text = await response.text();
            try { text = JSON.parse(text); } catch (e) { }
            const msg = (text && text.message) ? text.message : (typeof text === 'string' ? text : 'Failed to raise dispute');
            throw new Error(msg);
        }
        return response.json();
    },

    getMine: async (orderId) => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const params = new URLSearchParams();
        if (orderId) {
            params.set('orderId', String(orderId));
        }
        const suffix = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(`${API_BASE_URL}/disputes${suffix}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch disputes');
        return response.json();
    },
};

export const notificationAPI = {
    getMine: async () => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/notifications`, { headers });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        return response.json();
    },

    markAsRead: async (notificationId) => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers,
        });
        if (!response.ok) throw new Error('Failed to mark notification as read');
        return response.json();
    },

    markAllAsRead: async () => {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['X-Auth-Token'] = token;
        const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
            method: 'PUT',
            headers,
        });
        if (!response.ok) throw new Error('Failed to mark all notifications as read');
        return response.json();
    },
};

export const deliveryAPI = {
    getScheduledSlots: async ({ lat, lon, date }) => {
        const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lon),
        });

        if (date) {
            params.set('date', date);
        }

        const response = await fetch(`${API_BASE_URL}/delivery/slots?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch scheduled delivery slots');
        return response.json();
    },

    getServiceability: async ({ lat, lon }) => {
        const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lon),
        });

        const response = await fetch(`${API_BASE_URL}/delivery/serviceability?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to check express delivery availability');
        return response.json();
    },
};
