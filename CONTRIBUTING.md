# Contributing

Small notes for contributors relevant to database migrations and CI.

Flyway migration checks
- Place migration SQL files in `backend/src/main/resources/db/migration` using the `V<version>__description.sql` naming scheme.
- CI will run `scripts/check_flyway_migrations.sh` (or the PowerShell equivalent) to validate there are no duplicate or malformed migration versions.

To run the check locally:

```bash
./scripts/check_flyway_migrations.sh
# or (Windows PowerShell)
./scripts/check_flyway_migrations.ps1
```

If the check fails, fix migration filenames or remove duplicate versions before opening a PR.

## Required secrets for local development and CI

The project requires a few secrets and environment variables to run locally and in CI. Do not commit these values.

- `JWT_SECRET` — Base64 32-byte secret used to sign JWTs. Add to GitHub Actions as `JWT_SECRET`.
- `SPRING_DATASOURCE_URL` — JDBC URL for the database (use H2 for quick local runs: `jdbc:h2:mem:testdb`).
- `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD` — DB credentials for runtime.
- `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB` — When using `docker-compose` local Postgres, set these in your environment or `.env`.
- `PAYMENT_PROVIDER_API_KEY` and `PAYMENT_PROVIDER_WEBHOOK_SECRET` — If running payment integration tests or webhooks.

CI note: the included `.github/workflows/ci.yml` will fail fast if `JWT_SECRET` is not present as a repository secret.
