# Project Summary — OrionCart (MVP)

## Overview
OrionCart is a hyper-local e-commerce platform MVP composed of a React + Vite frontend and a Java Spring Boot backend. The application demonstrates real-time shop discovery, multi-category search, cart persistence, a 3-tier fulfillment system, coupon/loyalty engines, customer reviews, dispute management, and CSV bulk upload capabilities.

## Architecture
- **Frontend:** React 19 + Vite, Tailwind CSS, Leaflet Maps (`frontend/src`). Runs on Vite dev server (`http://localhost:5173`) and proxies `/api` to the backend.
- **Backend:** Spring Boot 3 (Java 21), Spring Data JPA, Hibernate, Flyway Migrations (`backend/src`). REST controllers under `/api`.
- **Database:** Supabase (PostgreSQL) for persistent data; local in-memory/file-based H2 for offline development.

## Verified Implemented Features
- **Geo-Spatial Shop Discovery:** Spherical Cosine distance calculations (0–20 km radius) with dynamic ETA estimations.
- **Multi-Category & Keyword Search:** Instant search across shops and products.
- **CSV Product Bulk Upload:** Bulk product catalog import (`POST /api/products/bulk-upload`) using `org.apache.commons.csv` and CSV template download.
- **3-Tier Fulfillment System:** Pickup (Free), Scheduled Delivery (₹15), and Express Delivery (distance-tiered ₹20/₹35/₹50).
- **Growth & Engagement:** Loyalty Points & Tier Badges (Bronze/Silver/Gold/Platinum), Referral tracking, and Coupon discount verification.
- **Trust & Admin Features:** Customer Reviews & Ratings, Dispute Resolution portal, and In-app Low Stock Watchlist.
- **Security:** Password hashing with BCrypt (`spring-security-crypto`) and custom token validation interceptors (`X-Auth-Token`).

## Future Roadmap (Production Scaling)
- **Spring Security & Filter Chain:** Standardize auth with Spring Security filter chain.
- **Interactive Discovery Map:** Render interactive Leaflet map pins directly on shop discovery page.
- **Razorpay Integration:** Live payment gateway checkout and webhook verification.
- **3PL Logistics API:** Live dispatch via Shiprocket Hyperlocal / Borzo REST APIs.
- **WebSockets & Redis:** Real-time stock sync via STOMP WebSockets and Redis pub-sub.
- **PostGIS Indexing:** Upgrade spherical cosine queries to PostGIS spatial GIST indexing.

---
*(End of project summary)*
