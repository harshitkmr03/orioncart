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
* **Flyway DB Migrations:** Versioned SQL migrations (`V1` to `V19`) including dynamic Row Level Security (RLS) enforcement.

---

## 2. FUTURE ROADMAP & PRODUCTION EXTENSIONS (PHASE 2)

The following features represent post-MVP production enhancements suitable for enterprise scaling:

### 2.1 Spring Security & Filter Chain Integration
* **Goal:** Standardize security layer with Spring Security filter chain (`SecurityConfig` and `JwtFilter`).

### 2.2 Real Payment Gateway Integration (Razorpay)
* **Goal:** Replace simulated checkout with official Razorpay Java SDK.

### 2.3 3PL Hyperlocal Logistics Handoff (Shiprocket / Borzo)
* **Goal:** Direct API handoff for express delivery and real-time driver tracking.

### 2.4 WebSocket Real-Time Inventory Sync & Redis Caching
* **Goal:** Real-time stock synchronization and push alerts across connected clients.

### 2.5 PostGIS Spatial Database Indexing
* **Goal:** Upgrade double-precision lat/lon columns to PostGIS `GEOMETRY(Point, 4326)` with GIST spatial indexes.

---

## 3. SUMMARY COMPARISON

| Feature Area | Current Status (MVP v1.0) | Phase 2 Production Target |
| :--- | :--- | :--- |
| **Geo-Location** | Spherical Cosine SQL Math | PostGIS Spatial GIST Index |
| **Security Layer** | Custom Token Validation + BCrypt | Spring Security Filter Chain |
| **Stock Sync** | Synchronous REST API | WebSockets + Redis Pub/Sub |
| **Logistics** | Tiered Pricing & Simulated ETA | Shiprocket / Borzo Live API |
| **Payments** | Atomic Simulated Charge | Razorpay Payment Handoff & Webhooks |
| **Database** | H2 (Local) / PostgreSQL (Supabase) | PostgreSQL + Redis Cache Layer |
