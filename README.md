# 🛒 OrionCart
> **Empowering Neighborhood Commerce, Digitally.**

OrionCart is a hyper-local marketplace platform designed to connect neighborhood shops (within a 0–20 km radius) directly with local customers. The platform aims to bridge the gap between local physical retailers and digital commerce.

---

## ✨ Key Features

* **📍 Real-Time Geo-Spatial Discovery:** PostGIS-powered backend that calculates exact distances and dynamically lists nearby shops to customers based on their coordinates.
* **📚 Common Products Library:** A crowdsourced product catalog that auto-suggests descriptions, categories, and images when shopkeepers list items, enabling rapid stock creation.
* **🚚 Flexible Fulfillment Modes:** Supports three fulfillment models:
  * *Self-Collect (Pickup)*: Pick up directly from store at a scheduled time.
  * *Scheduled Delivery*: Platform-level batched route delivery (cost-efficient).
  * *Express Delivery*: Hyper-local on-demand courier dispatch (~45 min).
* **🔒 ACID-Compliant Transactions:** Database row-level locking on inventory items during checkout to prevent overselling.
* **📊 Seller Dashboard & Quick Actions:** Simple stock adjustment buttons (+/-), CSV bulk upload engine, and store sales insights.

---

## 📁 Repository Structure

```text
orioncart/
├── backend/          # Spring Boot API (Java 21, JPA, PostgreSQL/H2)
├── frontend/         # React SPA (Vite, Tailwind CSS, Leaflet Maps)
├── documents/        # Product requirements, strategies, and guides
├── scripts/          # Helper scripts (migrations check, data seeding)
├── docker/           # PostgreSQL with PostGIS database container setups
└── tools/            # Bundled Maven build distribution (reproducible builds)
```

---

## 🚀 Quick Start (Local Development)

### 1. Run the Backend (Local H2 Database mode)
The project includes a bundled Maven version and a script to run the backend offline using an H2 database:
```powershell
# Open terminal inside the project root and run:
cd backend
./run_backend_h2.ps1
```
The API server will start on port `7070`.

### 2. Run the Frontend
Make sure you have Node.js installed:
```bash
cd frontend
npm install
npm run dev
```
The application will open at `http://localhost:5173`.

---

## 📖 Learn More
For detailed documentation on system design, database schemas, security setups, and deployment procedures, explore the [documents/](file:///c:/orioncart/documents) folder:
* [documents/README.md](file:///c:/orioncart/documents/README.md) — Backend and Database configuration guide.
* [documents/requirements.md](file:///c:/orioncart/documents/requirements.md) — Production-ready feature specs and database schema.
* [documents/PROJECT_SUMMARY.md](file:///c:/orioncart/documents/PROJECT_SUMMARY.md) — Interactive build summary and system logs.
* [documents/SECURITY_SETUP.md](file:///c:/orioncart/documents/SECURITY_SETUP.md) — OWASP hardening and credentials guidelines.
