# LocalConnect — Quickstart

This document gives quick steps to run the LocalConnect MVP (frontend + backend) locally.

## Prerequisites
- Java 21 (or use the bundled Maven/JDK tooling if available)
- Node.js & npm (for frontend)
- A Supabase/Postgres instance (optional; H2 fallback available)

## Backend (development)
From the repository root:

```powershell
cd e:\Project\backend
# Use the bundled Maven for consistent builds
..\tools\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```

If you want to run using an in-memory H2 DB (useful when Supabase is unavailable):

```powershell
cd e:\Project\backend
$env:SPRING_DATASOURCE_URL='jdbc:h2:mem:testdb'
$env:SPRING_DATASOURCE_USERNAME='sa'
$env:SPRING_DATASOURCE_PASSWORD=''
$env:FLYWAY_ENABLED='false'
..\tools\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```

## Frontend (development)

```powershell
cd e:\Project\frontend
npm install
npm run dev
# Open http://localhost:5173
```

## Environment variables
The backend reads these environment variables (they override `application.properties`):
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET` (if you want to override defaults)
- `FLYWAY_ENABLED`

## API endpoints (examples)
- `GET /api/shops`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/payments/charge` (simulate a payment and create order)

## Notes
- The `frontend` uses a Vite proxy for `/api` to the backend. If the backend port differs, update `frontend/vite.config.js` or the `server.port` in `backend/src/main/resources/application.properties`.
- Rotate and remove any real credentials from `application.properties` before publishing this repository.

