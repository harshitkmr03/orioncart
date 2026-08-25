# 🛒 OrionCart — Hyper-Local E-Commerce Marketplace MVP

> **Connecting Neighborhood Shops Directly with Local Customers**

OrionCart is a hyper-local e-commerce platform designed to digitize physical neighborhood stores. It enables customers to discover nearby shops within a 0–20 km radius, search products, choose flexible fulfillment options, and earn loyalty rewards.

---

## ✨ Key Implemented Features (Working MVP)

* **📍 Distance-Based Geo-Spatial Shop Discovery:** Calculates exact distances between customer coordinates and nearby shops using the Spherical Law of Cosines formula (0–20 km configurable radius).
* **🔍 Multi-Category & Keyword Search:** Real-time search across shops and products by name, SKU, or category.
* **📦 CSV Product Bulk Upload:** Enables shopkeepers to quickly upload product catalogs via CSV (`POST /api/products/bulk-upload`) or download sample templates (`GET /api/products/csv-template`).
* **🚚 3-Tier Fulfillment Pricing System:**
  * **Self-Collect (Pickup):** Pick up directly from store (Free).
  * **Scheduled Delivery:** Batched local route delivery (Flat ₹15 fee).
  * **Express Hyperlocal Delivery:** Fast store-to-door delivery with distance-tiered pricing (₹20 / ₹35 / ₹50).
* **🔐 Password-Hardened Authentication:** BCrypt password hashing via spring-security-crypto and manual token-based session validation.
* **🎁 Loyalty & Referral System:** Automated points accumulation, tier badges (Bronze, Silver, Gold, Platinum), and referral code tracking.
* **🏷️ Coupons & Discount Engine:** Coupon validation supporting percentage/flat discounts, minimum order limits, and usage caps.
* **⭐️ Customer Reviews & Ratings:** Star ratings (1–5) and review feedback for shops and products.
* **⚖️ Dispute Resolution System:** Allows buyers to raise order disputes, shopkeepers to respond, and admins to resolve.
* **🔔 Low-Stock Monitoring Dashboard:** Shopkeepers can view low-stock products on their dashboard.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Leaflet Interactive Location Picker, Lucide Icons |
| **Backend** | Java 21, Spring Boot 3.2.3, Spring Data JPA, Hibernate, Apache Commons CSV |
| **Database** | PostgreSQL (Supabase) for production / H2 database for offline local testing |
| **Database Migration** | Flyway |
| **Security** | BCrypt Password Hashing (spring-security-crypto), Manual Token Authentication |

---

## 📁 Repository Structure

```text
orioncart/
├── backend/          # Spring Boot REST API (Java 21, JPA, Flyway, H2/Postgres)
├── frontend/         # React SPA (Vite, Tailwind CSS, Leaflet Maps)
├── documents/        # Requirements, system design, and security guides
│   ├── requirements.md
│   ├── PROJECT_SUMMARY.md
│   └── SECURITY_SETUP.md
├── scripts/          # Helper scripts
└── docker/           # Docker Compose setups for PostgreSQL
```

---

## 🚀 Quickstart Guide (Local Development)

### 1. Run the Backend (Offline H2 Mode)
```powershell
cd backend
./run_backend_h2.ps1
```
The API server will start at `http://localhost:7070`.

### 2. Run the Frontend
```powershell
cd frontend
npm install
npm run dev
```
The frontend application will open at `http://localhost:5173`.

---

## 🔮 Future Roadmap (Phase 2 / Production Scaling)

These features are designed as future architectural enhancements for post-MVP production deployment:

* [ ] **Real Payment Gateway Handoff:** Integrate Razorpay SDK & UPI webhooks for live payment processing.
* [ ] **Live 3PL Courier Dispatch:** Connect Shiprocket Hyperlocal / Borzo REST APIs for real-time driver allocation and live GPS tracking.
* [ ] **Spring Security & JWT Filter Chain:** Migrate from manual token checks to Spring Security with proper JWT authentication filter.
* [ ] **Discovery Page Map Visualization:** Add interactive Leaflet map to the shop discovery page for visual shop browsing.
* [ ] **Automated Low-Stock Push Notifications:** WebSocket-based real-time alerts when product stock drops below threshold.
* [ ] **Checkout Loyalty Point Redemption:** Enable customers to redeem accumulated loyalty points as discounts during checkout.
* [ ] **Server-Side Cart Persistence:** Migrate from client-side localStorage cart to server-managed cart with cross-device sync.
* [ ] **Real-Time Order Tracking:** Live order status tracking with delivery partner GPS integration.
* [ ] **PostGIS Spatial Database Indexing:** Upgrade spherical cosine SQL queries to PostGIS GIST indexes for ultra-high concurrency spatial searches.

---

## 📄 Documentation

For detailed technical specifications and architecture summaries, refer to the `/documents` directory:
* [documents/requirements.md](file:///c:/orioncart/documents/requirements.md) — Complete feature specifications.
* [documents/PROJECT_SUMMARY.md](file:///c:/orioncart/documents/PROJECT_SUMMARY.md) — Architecture & build summary.
