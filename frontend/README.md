# 🌐 OrionCart — Frontend

Hyper-local e-commerce marketplace frontend built with React 19, Vite, and Tailwind CSS.

---

## 🛠️ Tech Stack & Libraries
* **Framework:** React 19 (SPA)
* **Build Tool:** Vite
* **Styling:** Tailwind CSS + Vanilla CSS utilities
* **Maps & Geo-location:** Leaflet & React-Leaflet (`DiscoveryMap.jsx`, `LocationPickerMap.jsx`)
* **Icons:** Lucide React
* **Authentication:** Google Identity Services (`@react-oauth/google`) + JWT Bearer token state management
* **Routing:** React Router DOM

---

## 🚀 Running Locally

```powershell
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend runs at `http://localhost:5173`.

---

## ⚙️ Development Proxy Configuration
In `vite.config.js`, requests targeting `/api` are automatically proxied to the Spring Boot backend (`http://localhost:7070`):
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:7070',
      changeOrigin: true
    }
  }
}
```

---

## 📦 Key Component Structure

```text
frontend/src/
├── components/
│   ├── AuthModal.jsx             # Login, Registration, Google OAuth, and OTP Password Reset
│   ├── DiscoveryMap.jsx          # Interactive Leaflet map with shop markers & radius overlay
│   ├── FulfillmentSelector.jsx   # Pickup / Scheduled / Express delivery radio selection
│   ├── LocationPickerModal.jsx   # Interactive customer coordinate pin drop modal
│   ├── Navbar.jsx                # Search bar, location indicator, user menu, cart counter
│   └── ProductCard.jsx           # Item cards with real-time stock and add-to-cart controls
├── context/
│   ├── AuthContext.jsx           # User state, token persistence, Google OAuth handler
│   ├── CartContext.jsx           # Local/server hybrid cart syncing & checkout items
│   └── LocationContext.jsx       # User coordinates & delivery radius management
├── pages/
│   ├── CheckoutPage.jsx          # Fulfillment slots, coupon inputs, loyalty redemption slider
│   ├── Home.jsx                  # Discovery map, nearby shops list, and category filtering
│   ├── OrderSuccessPage.jsx      # Order confirmation and tracking summary
│   ├── ProfilePage.jsx           # Loyalty points balance, tier badges, and order history
│   └── ShopDetailPage.jsx       # Shop catalog, product reviews, and shopkeeper contact
└── services/
    └── api.js                    # Axios/fetch client handling auth headers and API endpoints
```
