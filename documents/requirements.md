# REQUIREMENTS: OrionCart Hyper-Local Marketplace
**Version:** 2.0 (Verified MVP Specification & Future Roadmap)  
**Last Updated:** August 2026  
**Status:** ✅ MVP Verified & Implemented

---

## EXECUTIVE SUMMARY

**OrionCart** is a hyper-local e-commerce marketplace platform designed to digitize local neighborhood retailers in Tier 2/3 cities. It connects customers directly with stores within a configurable 0–20 km radius.

### Key Implemented Capabilities (MVP v1.0)
1. **Spherical Geo-Spatial Discovery:** Fast distance calculation and ETA estimations (`10 min + 3 min/km`) for shops within 0–20 km using spherical cosine SQL queries.
2. **Product Catalog & Bulk Upload:** Product management via UI and bulk CSV upload parser (`POST /api/products/bulk-upload`).
3. **3-Tier Fulfillment Simulation:** Self-Collect (Free), Scheduled Batched Delivery (₹15), and Express Hyperlocal Delivery (distance-tiered ₹20/₹35/₹50).
4. **Token Authentication & Password Security:** Password hashing with BCrypt (`spring-security-crypto`) and custom token validation (`X-Auth-Token`).
5. **Growth Enablers:** Coupons, Wishlists, Loyalty Points (Bronze/Silver/Gold/Platinum tiers), and Referral Program.
6. **Customer Reviews & Ratings:** Star ratings and buyer review submission.
7. **Dispute Resolution System:** Order dispute creation, shopkeeper response, and admin resolution.
8. **In-App Notifications:** Low-stock watchlist and status alerts for shopkeepers.

---

## 1. IMPLEMENTED CORE FEATURES (MVP v1.0)

### 1.1 Shopkeeper Stock & Inventory Management
* **Stock Management UI:** Add, edit, update quantity, and delete products (`ProductService.java`).
* **CSV Bulk Upload:** Upload products in bulk via CSV (`POST /api/products/bulk-upload`) using `org.apache.commons.csv` or download sample template (`GET /api/products/csv-template`).
* **Low-Stock Alerts:** Notifies shopkeeper watchlist when stock drops below threshold (default: 5 units).

### 1.2 Customer Experience & Shop Discovery
* **Spherical Radius Search:** Filter shops within a 0–20 km radius using Spherical Law of Cosines SQL queries (`ShopRepository.java`).
* **Multi-Category & Keyword Search:** Search shops and products by name, SKU, or category (`DiscoveryService.java`).
* **Interactive Map:** Leaflet location picker modal (`LocationPickerMap.jsx`) for customer address selection.
* **Shop Reviews & Ratings:** Store star ratings and customer comment snapshots (`ReviewService.java`).

### 1.3 Fulfillment Modes & Pricing Engine
* **Self-Collect (Pickup):** Free store pickup with scheduled hourly slots (`DeliveryService.java`).
* **Scheduled Delivery:** Batched local route slot selection with flat ₹15 delivery fee.
* **Express Delivery:** Fast store-to-door delivery with distance-tiered fee calculation (<= 2km: ₹20, <= 5km: ₹35, > 5km: ₹50).

### 1.4 Growth & Retention Features
* **Loyalty Points System:** Earn points on order completion, tier badges (Bronze, Silver, Gold, Platinum), point calculation preview, and referral tracking.
* **Referral Program:** Referral codes assigned to users to track customer acquisitions.
* **Coupons Engine:** Flat and percentage discount validation with minimum order value and max usage checks.
* **Order Disputes:** Dispute resolution portal between buyer, seller, and platform admin.

### 1.5 Security & Data Architecture
* **Authentication:** Password hashing via BCrypt and custom token validation interceptors.
* **Flyway DB Migrations:** Versioned SQL migrations (`V1` to `V22`) including PostGIS spatial indexes, server-side cart tables, loyalty transaction tracking, and dynamic Row Level Security (RLS) enforcement.
* **Server-Side Cart & Loyalty:** Cross-device cart synchronization with pessimistic write locks (`/api/cart/**`) and checkout loyalty point redemption up to 20% order subtotal (`/api/loyalty/**`).
* **PostGIS Proximity Search & Discovery Map:** PostGIS `GEOGRAPHY(Point,4326)` with GiST spatial indexing (`ST_DWithin`), interactive Leaflet map component (`DiscoveryMap.jsx`), and automatic Spherical Cosine math fallback for offline H2.
* **Spring Security 6 & OAuth2:** Stateless `SecurityFilterChain`, `JwtAuthenticationFilter`, Google OAuth2 login (`/api/auth/google`), and Gmail SMTP OTP password reset (`/api/auth/forgot-password`).

---

## 2. FUTURE ROADMAP & PRODUCTION EXTENSIONS (PHASE 2 GROUPS 3 & 4)

The following features represent the remaining post-MVP production enhancements:

### 2.1 Automated Low-Stock Push Notifications (Item 6)
* **Goal:** WebSocket / Spring STOMP channels sending real-time stock alerts to shopkeepers when inventory drops below threshold.

### 2.2 Real-Time Order Tracking (Item 7)
* **Goal:** Live WebSocket order status updates and delivery partner simulated GPS updates on the customer tracking screen.

### 2.3 Real Payment Gateway Integration (Razorpay) (Item 8)
* **Goal:** Replace simulated checkout with official Razorpay Java SDK, UPI deep linking, and webhook signature verification.

### 2.4 3PL Hyperlocal Logistics Handoff (Shiprocket / Borzo) (Item 9)
* **Goal:** Direct REST API dispatch for express deliveries, automated AWB generation, and courier driver tracking.

---

## 3. SUMMARY STATUS COMPARISON

| Feature Area | Implementation Status | Technical Details |
| :--- | :--- | :--- |
| **Geo-Location** | ✅ **Implemented** | PostGIS `GEOGRAPHY(Point,4326)` with GiST spatial index + Spherical Cosine fallback |
| **Interactive Map** | ✅ **Implemented** | Leaflet interactive discovery map pins (`DiscoveryMap.jsx`) with radius circle |
| **Cart Persistence** | ✅ **Implemented** | Database-backed multi-device cart with pessimistic write locks and guest merge |
| **Loyalty Redemption** | ✅ **Implemented** | Coupon-aware 20% cart total discount cap, 1 pt = ₹1, atomic debit & refund |
| **Security Layer** | ✅ **Implemented** | Spring Security 6 stateless JWT filter chain, Google OAuth2, Email OTP password reset |
| **Stock Push Alerts** | ⚪ *Queued (Item 6)* | Spring STOMP / WebSockets + low-stock watchlist broadcast |
| **Live Order Tracking** | ⚪ *Queued (Item 7)* | Live WebSocket order status + simulated GPS driver location updates |
| **Payments** | ⚪ *Queued (Item 8)* | Razorpay SDK payment handoff, UPI webhooks, automated reconciliation |
| **Logistics Handoff** | ⚪ *Queued (Item 9)* | Shiprocket Hyperlocal / Borzo REST API dispatch and AWB generation |
| **Database** | ✅ **Implemented** | PostgreSQL 16 (PostGIS) / Flyway V1–V22 / H2 offline testing |
