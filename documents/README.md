# OrionCart — Quickstart Guide

This document gives quick steps to run OrionCart (frontend + backend) locally.

## Prerequisites
- Java 21 JDK
- Node.js (v18+) & npm
- PostgreSQL 16 with PostGIS extension (or use in-memory H2 mode for offline testing)

## 1. Backend (Spring Boot)

Navigate to the `backend` directory:
```powershell
cd backend
```

### Running with PostgreSQL / Supabase
Run using the included Maven Wrapper (`mvnw`):
```powershell
# Windows PowerShell:
.\mvnw spring-boot:run

# Linux / macOS / Git Bash:
./mvnw spring-boot:run
```

### Running Offline (H2 Mode)
If PostgreSQL is not running locally, start with the automated H2 script:
```powershell
.\run_backend_h2.ps1
```
The backend starts at `http://localhost:7070`.

---

## 2. Frontend (React 19 + Vite)

Navigate to the `frontend` directory:
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 3. Environment Variables

Create a `backend/.env` file (copied from `backend/env.template`) with the following keys:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `SPRING_DATASOURCE_URL` | JDBC connection string | `jdbc:postgresql://localhost:5432/postgres` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | *(your DB password)* |
| `JWT_SECRET` | 32+ byte secret key for signing JWTs | *(Base64 or secure string)* |
| `GOOGLE_CLIENT_ID` | Google OAuth Web Client ID | `*.apps.googleusercontent.com` |
| `MAIL_USERNAME` | Gmail / SMTP sender address | `your-email@gmail.com` |
| `MAIL_PASSWORD` | Gmail App Password (16 chars) | `xxxx xxxx xxxx xxxx` |
| `FLYWAY_ENABLED` | Enable automated database migrations | `true` |

---

## 4. Key API Endpoints

### Authentication & Profile (`/api/auth`)
- `POST /api/auth/register` — Standard email/password registration
- `POST /api/auth/login` — Standard login returning JWT token
- `POST /api/auth/google` — Google OAuth2 credential verification
- `POST /api/auth/forgot-password` — Send 6-digit email OTP
- `POST /api/auth/reset-password` — Verify OTP and set new password

### Discovery & Navigation (`/api/discovery`, `/api/shops`)
- `GET /api/discovery/shops?lat={lat}&lon={lon}&radiusKm=10` — PostGIS proximity search
- `GET /api/shops` — List all shops with distance & delivery tiers
- `GET /api/shops/{id}/available-slots?date={YYYY-MM-DD}` — 24/7 delivery slot generation

### Server-Side Cart (`/api/cart`)
- `GET /api/cart` — Fetch user's server-persisted cart
- `POST /api/cart/sync` — Merge guest cart items into user's server cart
- `POST /api/cart/item` — Add / update item in cart
- `DELETE /api/cart/item/{productId}` — Remove item from cart

### Loyalty & Coupons (`/api/loyalty`, `/api/coupons`)
- `GET /api/loyalty/points` — User loyalty points & tier badge
- `POST /api/loyalty/preview-redemption` — Calculate coupon-aware 20% discount cap
- `POST /api/coupons/validate` — Validate promo code and cart conditions
