# Project Summary — LocalConnect (MVP)

## Overview
LocalConnect is a small e-commerce demo application (MVP) composed of a React + Vite frontend and a Spring Boot backend. The app demonstrates a product listing, cart, checkout and a simulated server-side payment flow, along with JWT-based authentication.

## Architecture
- **Frontend:** React + Vite, Tailwind CSS, `frontend/src/services` contains API helpers. The frontend runs on Vite dev server (default `http://localhost:5173`) and proxies `/api` to the backend.
- **Backend:** Spring Boot (Java 21), Spring Data JPA, HikariCP; REST controllers under `/api` and transactional services for orders and payments.
- **Database:** Supabase (Postgres) used for persisted data. Local development can use in-memory H2 as a fallback.

## Key Features Implemented
- Product list and product cards (frontend).
- Shopping cart persisted in `localStorage` across page reload and preserved on login/registration.
- JWT-based authentication with BCrypt hashed passwords (backend).
- Simulated server-side payment endpoint (`POST /api/payments/charge`) that validates payload, recomputes totals, decrements stock, and creates orders in a transaction.
- Robust enum deserialization and legacy-value mapping for backward compatibility (server-side JsonCreator mappings and RoleConverter fixes).
- Seeder updated to upsert users and avoid seeding shops/products when using Supabase as the source of truth.

## Development / Debugging Notes (what we did)
- Wired frontend API to `'/api'` base path and improved error parsing.
- Implemented `PaymentRequest` DTO, `PaymentService`, and `PaymentController` on the backend to handle checkout and order creation atomically.
- Diagnosed and fixed Jackson deserialization failures caused by legacy enum string values (e.g. `DELIVERY`, `CONSUMER`) by adding tolerant mapping on enum types.
- Fixed startup failures by aligning seeded `users.role` values with the DB `users_role_check` constraint (`CUSTOMER` and `SHOPKEEPER`).
- Resolved intermittent build failures caused by the running JAR locking `target` by stopping Java processes before `mvn package`.
- Performed network troubleshooting when the backend reported `UnknownHostException` connecting to Supabase; verified DNS and TCP connectivity on port `5432` before restarting.

## How it was built (AI / tools attribution)
This MVP was built interactively using VS Code with AI assistance and several models/tools. Attribution for the project notes:
- ChatGPT (interactive conversational assistant)
- VS Code Copilot (inline code suggestions)
- Raptor Mini (assistant used for code tasks)
- Claude (assistance in reasoning and design)
- VS Code IDE (editor and local dev environment)

> Note: Mentioning AI tools above reflects development workflow and should be included when posting this as a project showcase.

## How to run (quick)
1. Backend (PowerShell):

```powershell
cd e:\Project\backend
# If you have system Maven, use: mvn spring-boot:run
# Project includes a bundled Maven at tools/apache-maven-3.9.6
..\tools\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```

2. Frontend (PowerShell):

```powershell
cd e:\Project\frontend
npm install
npm run dev
```

3. If Supabase is unreachable, start backend using H2 fallback:

```powershell
cd e:\Project\backend
$env:SPRING_DATASOURCE_URL='jdbc:h2:mem:testdb'
$env:SPRING_DATASOURCE_USERNAME='sa'
$env:SPRING_DATASOURCE_PASSWORD=''
..\tools\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```

## Security & Secrets
- Current `backend/src/main/resources/application.properties` includes an embedded Supabase URL/credentials. Rotate and move these into environment variables before publishing. Never push real credentials to public repositories.

## Known Issues & Next Steps
- Integrate a real payment provider (Stripe/PayPal) for production-grade flows.
- Add Luhn check and expiry validation for credit-card numbers (or better, use tokenized card handling from a provider).
- Expand test coverage (unit + integration) for payment and order flows.
- Add CI to run tests and check secrets before publishing.

## Credits
- Project authored and assembled by the repository owner with AI-assisted development in VS Code.
- Tools: ChatGPT, VS Code Copilot, Raptor Mini, Claude, VS Code IDE.

---

(End of project summary)
