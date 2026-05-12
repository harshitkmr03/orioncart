## Purpose

This file gives actionable, repo-specific guidance for AI coding agents working in this project so they can be productive immediately. It focuses on architecture, developer workflows, and concrete file-level patterns discovered in the codebase.

## Quick Architecture Summary

- **Backend:** Java Spring Boot application in `backend/` (Java 21, `pom.xml`). Main code under `backend/src/main/java` (package root `com.localconnect`). Spring Boot configuration in `backend/src/main/resources/application.properties`.
- **Frontend:** React + Vite app in `frontend/` (`package.json`, `src/`). React entry is `frontend/src/main.jsx` and many API helpers live in `frontend/src/api.js` and `frontend/src/services/api.js`.
- **Build toolchain included:** a full Maven distribution at `tools/apache-maven-3.9.6/` is committed — use `mvn.cmd` from that folder on Windows if system Maven isn't available.

## Key Integration Points

- Frontend calls backend via a relative base path `'/api'` (see `frontend/src/api.js` and `frontend/src/services/api.js`).
- Vite dev server proxies `/api` to `http://localhost:8080` (see `frontend/vite.config.js`).
- Backend default port is `7070` (`backend/src/main/resources/application.properties` sets `server.port=7070`). There is a mismatch between Vite proxy (8080) and backend default (7070) — update either `vite.config.js` or `application.properties` when running locally.
- Database: default is in-memory H2 for local dev (`application.properties` uses `jdbc:h2:mem:testdb`) and Flyway migrations can be found in `backend/src/main/resources/db/migration` and are enabled by setting `FLYWAY_ENABLED=true`.

## Concrete Commands (Windows PowerShell)

- Backend: run in dev mode (from repo root):
```
cd backend
..\tools\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```
- Backend: build a fat jar:
```
cd backend
..\tools\apache-maven-3.9.6\bin\mvn.cmd clean package
java -jar target\backend-0.0.1-SNAPSHOT.jar
```
- Frontend: dev server (use `dev`, not `start` — `package.json` defines `dev`):
```
cd frontend
npm install
npm run dev
```
Note: `npm start` will fail because there is no `start` script in `package.json` (we observed an npm start failure in the workspace).

## Environment & Runtime Conventions

- Use environment variables to override DB and connection settings. Relevant env vars used in `application.properties`:
  - `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
  - `SPRING_JPA_DATABASE_PLATFORM` (dialect)
  - `FLYWAY_ENABLED` to turn on migrations
- H2 Console is enabled at `/h2-console` when H2 is used — useful for quick debugging.
- JPA `ddl-auto` defaults to `update` for local dev; production should prefer Flyway migrations (set `spring.jpa.hibernate.ddl-auto` via env to `none` or `validate`).

## Coding Patterns & Project Conventions

- Java: project uses Spring Boot conventions and Lombok (optional). Compiler plugin explicitly targets Java 21 via `<release>21</release>` in `pom.xml`.
- Migrations: Flyway is included. Place SQL migrations under `backend/src/main/resources/db/migration`.
- Frontend API layer: higher-level API helpers are in `frontend/src/services/api.js`; smaller helpers in `frontend/src/api.js`. Use `'/api'` base path.
- Error handling in frontend fetch helpers: they throw `Error('Failed to ...')` when `response.ok` is false — follow this pattern for new fetch utilities.

## Common Pitfalls & To-Do Checks for PRs

- API proxy mismatch: If frontend dev can't reach backend, check `frontend/vite.config.js` proxy `target` vs `backend` `server.port`.
- When changing Java version or `pom.xml`, ensure the Maven compiler plugin `release` property matches `java.version` and that `tools/apache-maven-3.9.6` is used for consistent builds.
- If enabling Flyway migrations during testing/deploy, set `FLYWAY_ENABLED=true` and verify `spring.flyway.locations` (default: `classpath:db/migration`).

## Files to Inspect for Context (examples)

- Backend entry & config: `backend/pom.xml`, `backend/src/main/resources/application.properties`, `backend/src/main/java` (package `com.localconnect`).
- Migrations: `backend/src/main/resources/db/migration` and `target/classes/db/migration` (built copy).
- Frontend: `frontend/package.json`, `frontend/vite.config.js`, `frontend/src/api.js`, `frontend/src/services/api.js`, `frontend/src/main.jsx`.

## When Adding Features

- Backend: add controllers under `backend/src/main/java/.../controller` (follow existing package structure), services under `service`, entities under `domain` or `model`. Keep REST endpoints rooted under `/api` to match frontend expectations.
- Frontend: put API wrappers in `frontend/src/services`, UI components in `frontend/src/components`, and pages in `frontend/src/pages`.

## What I Could Not Discover Automatically

- CI/CD specifics (no pipeline config found) — ask maintainers for deployment details (hosting, environment variables used in production, or container registry).
- Any runtime secrets or external integrations beyond Postgres (Supabase) hinted in `pom.xml` — confirm credentials and environment for staging/production.

---
If any section is unclear or you want this split into separate `AGENT.md` + `COPILOT` variants, tell me which items to expand (for example: expand database migration steps, or add sample `vite` proxy adjustment command). I can iterate quickly.
