# Project Summary — OrionCart

## Overview
OrionCart is a hyper-local e-commerce platform composed of a React 19 + Vite frontend and a Java 21 Spring Boot backend. The application connects neighborhood stores directly with local customers within a configurable 0–20 km radius, offering real-time PostGIS-powered discovery, interactive map exploration, server-synchronized carts, a 3-tier fulfillment engine, checkout loyalty point redemption, robust Spring Security 6 stateless JWT protection, Google OAuth2, and email-based OTP password recovery.

## Architecture
- **Frontend:** React 19 + Vite, Tailwind CSS, Leaflet Maps (`frontend/src`). Runs on Vite dev server (`http://localhost:5173`) and proxies `/api` requests to the backend. Includes Google OAuth (`@react-oauth/google`) and responsive Leaflet discovery map components.
- **Backend:** Spring Boot 3.2.3 (Java 21), Spring Security 6, Spring Data JPA, Hibernate, JavaMailSender, Flyway Migrations (`backend/src`). REST controllers under `/api`.
- **Database:** PostgreSQL 16 with PostGIS extension (`GEOGRAPHY(Point,4326)`) for production / Supabase; local in-memory H2 database for offline unit testing with automatic Spherical Cosine fallback.

## Implemented & Verified Capabilities

### 1. Geo-Spatial Discovery & Mapping (Group 1 & Group 2)
- **PostGIS Spatial Indexing:** Proximity queries powered by `ST_DWithin` and `ST_Distance` on GiST-indexed `location` geography column (`V22__postgis_spatial_indexing.sql`).
- **Interactive Discovery Map:** Real-time Leaflet map visualization (`DiscoveryMap.jsx`) with dynamic store pins, search radius circle, user coordinate pinpointing, and store preview cards.
- **Dynamic ETA Calculation:** Calculated as `10 min base + 3 min/km`.

### 2. Multi-Device Cart & Checkout (Group 1)
- **Server-Side Cart Persistence:** Cart state persisted across devices in database (`cart` and `cart_item` tables) with pessimistic write locks.
- **Guest-to-User Merging:** Guest cart items seamlessly merge into the user's persisted server cart upon authentication.
- **Coupon-Aware Loyalty Redemption:** Customers can redeem loyalty points directly at checkout (1 pt = ₹1, up to 20% of order subtotal) with atomic debits and idempotent cancellation refunds.

### 3. Enterprise Security & Authentication (Group 2)
- **Spring Security 6 Architecture:** Complete stateless filter chain via `SecurityConfig` and `JwtAuthenticationFilter`.
- **Dual-Header Compatibility:** Extracts tokens from both `Authorization: Bearer <token>` and legacy `X-Auth-Token`.
- **Standard JSON Auth Responses:** Custom `AuthenticationEntryPoint` (401 JSON) and `AccessDeniedHandler` (403 JSON).
- **Google OAuth2 Sign-In:** Token verification via Google API Client (`POST /api/auth/google`) with automatic user profile creation.
- **Email OTP Password Reset:** Secure 6-digit OTP dispatch via Gmail SMTP (`POST /api/auth/forgot-password` and `POST /api/auth/reset-password`).

### 4. Core Marketplace & Operations
- **CSV Product Bulk Upload:** Bulk product catalog import (`POST /api/products/bulk-upload`) using `org.apache.commons.csv` and downloadable sample templates.
- **3-Tier Fulfillment System:** Pickup (Free with 24/7 slot selection), Scheduled Delivery (₹15 with all-day delivery slots), and Express Delivery (distance-tiered ₹20/₹35/₹50).
- **Growth & Trust Features:** Coupons engine, customer reviews & star ratings, dispute resolution portal, and low-stock monitoring dashboard.

## Future Roadmap (Phase 2 Groups 3 & 4)
- **Automated Low-Stock Push Notifications (Item 6):** Spring STOMP / WebSocket alerts to shopkeepers when inventory drops below threshold.
- **Real-Time Order Tracking (Item 7):** Live WebSocket order status updates + delivery partner simulated GPS updates.
- **Real Payment Gateway Integration (Item 8):** Live Razorpay checkout integration, webhook signature verification, automated payment reconciliation.
- **Live 3PL Courier Dispatch (Item 9):** Courier partner API dispatch (Shiprocket / Borzo), automated AWB generation, delivery handoff tracking.
