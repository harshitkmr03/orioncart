# 🛒 OrionCart — Hyper-Local E-Commerce Marketplace MVP

> **Connecting Neighborhood Shops Directly with Local Customers**

OrionCart is a hyper-local e-commerce platform designed to digitize physical neighborhood stores. It enables customers to discover nearby shops within a 0–20 km radius, search products, choose flexible fulfillment options, and earn loyalty rewards.

---

## ✨ Key Implemented Features

### 🛒 Core Commerce & Marketplace
* **📍 PostGIS Spatial Indexing & Discovery:** Ultra-fast geospatial proximity searches using PostgreSQL PostGIS `GEOGRAPHY(Point,4326)` with GiST indexes (`ST_DWithin`), paired with an automatic fallback to Spherical Law of Cosines for offline testing.
* **🗺️ Interactive Discovery Map:** Visual Leaflet map on the shop discovery page (`DiscoveryMap.jsx`) with custom shop pins, interactive detail popups, and radius coverage overlays.
* **🛒 Server-Side Cart Persistence:** Multi-device synchronized cart with database backing (`cart` and `cart_item` tables), pessimistic row locking, and seamless guest-to-authenticated cart merging on login.
* **🎁 Coupon-Aware Loyalty Point Redemption:** Direct point redemption at checkout with a 20% cart total discount cap (1 point = ₹1), atomic debit on order placement, and idempotent point refunds on cancellation.
* **🔍 Multi-Category & Keyword Search:** Real-time search across shops and products by name, SKU, or category.
* **📦 CSV Product Bulk Upload:** Enables shopkeepers to quickly upload product catalogs via CSV (`POST /api/products/bulk-upload`) or download sample templates (`GET /api/products/csv-template`).
* **🚚 3-Tier Fulfillment System:**
  * **Self-Collect (Pickup):** Pick up directly from store with configurable 24/7 time slots (Free).
  * **Scheduled Delivery:** Batched local route delivery with all-day delivery slots (Flat ₹15 fee).
  * **Express Hyperlocal Delivery:** Fast store-to-door delivery with distance-tiered pricing (₹20 / ₹35 / ₹50).

### 🔐 Security, Authentication & Accounts
* **🛡️ Spring Security 6 & Stateless JWT Filter Chain:** Enterprise-grade security architecture with `SecurityFilterChain`, `JwtAuthenticationFilter`, custom `AuthenticationEntryPoint` (401 JSON) and `AccessDeniedHandler` (403 JSON).
* **🔑 Dual-Header Token Compatibility:** Seamlessly accepts standard `Authorization: Bearer <token>` and legacy `X-Auth-Token` headers.
* **🌐 Google OAuth2 Authentication:** One-tap sign-in / sign-up via Google (`POST /api/auth/google`) with automatic user profile provisioning.
* **📧 Email OTP Password Reset:** 6-digit time-sensitive verification code dispatched via Gmail SMTP (`POST /api/auth/forgot-password` and `POST /api/auth/reset-password`).
* **🔒 Concurrency & Stock Locks:** Pessimistic write locks (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) on inventory stock, carts, and loyalty debits.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Leaflet Interactive Maps, Lucide Icons, Google OAuth API |
| **Backend** | Java 21, Spring Boot 3.2.3, Spring Security 6, Spring Data JPA, Hibernate, JavaMailSender, Apache Commons CSV |
| **Database** | PostgreSQL 16 (PostGIS extension enabled) / H2 in-memory database for offline unit tests |
| **Database Migration** | Flyway (V1 through V22) |
| **Security & Auth** | Spring Security 6, JJWT (HMAC-SHA256), BCrypt Password Hashing, Google Token Verifier |

---

## 📁 Repository Structure

```text
orioncart/
├── backend/          # Spring Boot REST API (Java 21, Spring Security, Flyway, PostGIS)
│   ├── src/main/java/com/orioncart/backend/
│   │   ├── config/      # MailConfig, WebConfig, SupabaseConfig
│   │   ├── controller/  # REST API Controllers (Auth, Cart, Discovery, Delivery, etc.)
│   │   ├── model/       # JPA Entities (User, Shop, Product, Cart, Order, etc.)
│   │   ├── repository/  # Spring Data JPA Repositories (with PostGIS native queries)
│   │   ├── security/    # SecurityConfig, JwtFilter, UserPrincipal, JwtUtil
│   │   └── service/     # Business logic (Auth, Cart, Discovery, Loyalty, etc.)
│   └── src/main/resources/db/migration/ # Flyway SQL migrations (V1 - V22)
├── frontend/         # React SPA (Vite, Tailwind CSS, Leaflet Maps)
│   └── src/
│       ├── components/  # DiscoveryMap, FulfillmentSelector, AuthModal, etc.
│       ├── context/     # AuthContext, CartContext, LocationContext
│       └── pages/       # Home, ShopDetailPage, CheckoutPage, ProfilePage
├── documents/        # Requirements, system design, and security guides
├── phase2_records/   # Complete Phase 2 implementation logs, plans, and architectural context
└── docker/           # Docker Compose setups for PostgreSQL + PostGIS
```

---

## 🚀 Quickstart Guide (Local Development)

### 1. Run the Backend
Using the included Maven Wrapper (`mvnw`):
```powershell
cd backend
# On Windows PowerShell:
.\mvnw spring-boot:run

# Or run offline with in-memory H2:
.\run_backend_h2.ps1
```
The API server starts at `http://localhost:7070`.

### 2. Run the Frontend
```powershell
cd frontend
npm install
npm run dev
```
The frontend application starts at `http://localhost:5173`.

---

## 🗺️ Implementation Roadmap Status

### ✅ Completed (MVP & Phase 2 Groups 1 & 2)
* [x] **Server-Side Cart Persistence (Item 1):** Multi-device cart sync, pessimistic lock guard, guest-to-user merge.
* [x] **Checkout Loyalty Point Redemption (Item 2):** 20% cart total discount cap, 1 pt = ₹1, atomic debit & cancellation refund.
* [x] **Discovery Page Map Visualization (Item 3):** Leaflet map pins, radius circle, interactive store popups.
* [x] **Spring Security & JWT Filter Chain (Item 4):** Stateless security filter chain, role-based authorization, Google OAuth, email OTP password reset.
* [x] **PostGIS Spatial Indexing (Item 5):** `GEOGRAPHY(Point,4326)` column, GiST index, ST_DWithin query with fallback.

### 🔮 Remaining Roadmap (Phase 2 Groups 3 & 4)
* [ ] **Automated Low-Stock Push Notifications (Item 6):** Spring STOMP / WebSocket alerts to shopkeepers when inventory drops below threshold.
* [ ] **Real-Time Order Tracking (Item 7):** Live WebSocket order status updates + delivery partner simulated GPS updates.
* [ ] **Real Payment Gateway Integration (Item 8):** Live Razorpay checkout integration, webhook signature verification, automated reconciliation.
* [ ] **Live 3PL Courier Dispatch (Item 9):** Courier partner API dispatch (Shiprocket / Borzo), automated AWB generation, delivery handoff tracking.

---

## 📄 Documentation

For technical specifications, implementation logs, and guides:
* [documents/requirements.md](file:///c:/orioncart/documents/requirements.md) — Comprehensive feature specifications.
* [documents/PROJECT_SUMMARY.md](file:///c:/orioncart/documents/PROJECT_SUMMARY.md) — System architecture summary.
* [documents/CHANGES_LOG.md](file:///c:/orioncart/documents/CHANGES_LOG.md) — Detailed development change log.
* [documents/SECURITY_SETUP.md](file:///c:/orioncart/documents/SECURITY_SETUP.md) — Security setup & environment credentials guide.
* [phase2_records/plans/phase2_master_roadmap.md](file:///c:/orioncart/phase2_records/plans/phase2_master_roadmap.md) — Phase 2 Master Roadmap.
