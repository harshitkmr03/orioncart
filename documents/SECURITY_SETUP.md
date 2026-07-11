# Security Setup and Secret Rotation

This document describes recommended steps for secret management and JWT secret rotation for the orioncart project.

1) Store secrets securely
  - Use a dedicated secret store such as Azure Key Vault, AWS Secrets Manager, or GitHub Actions Secrets for CI/CD.
  - Never commit actual secrets into the repository. Use `.env` files locally only and add them to `.gitignore`.

2) Local development
  - Copy `.env.example` to `backend/.env` and `frontend/.env` (or set environment variables in your shell).
  - `backend/env.template` contains an annotated template for backend-only variables.

3) JWT secret rotation (recommended cadence: quarterly or on suspected compromise)
  - Generate a new strong secret (at least 32 random bytes, base64 encoded).
  - Update the secret in your secret store (e.g., GitHub Actions secret `JWT_SECRET` or Key Vault).
  - Deploy the backend with the new secret. If you must support old tokens during a short migration window, implement a key-id (kid) header and maintain a short-lived secondary key verification path.
  - Practical steps (example PowerShell):
   1. Generate a new 32-byte base64 secret locally without echoing it in CI logs:
     ```powershell
     $b = New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b); [Convert]::ToBase64String($b)
     ```
     Copy the output into your secret manager (do not commit it).
   2. In GitHub Actions: add a repository secret named `JWT_SECRET` with the value.
     - Settings → Secrets → Actions → New repository secret → Name: `JWT_SECRET` → Value: (paste secret)
   3. Deploy or restart the backend so the new secret is picked up from environment variables.
   4. If you need a migration window, consider adding a `kid` header and accepting both old/new secrets for a short time.

4) CI/CD
  - Add required secrets to your pipeline's secure storage (GitHub Actions secrets / Azure key vault action).
  - Do not echo or print secret values in pipeline logs.

5) Quick run (Windows PowerShell)

```powershell
# from repository root
copy .env.example backend\.env
# edit backend\.env and set real values then run:
cd backend
..\tools\apache-maven-3.9.6\bin\mvn.cmd -DskipTests spring-boot:run
```

6) Additional recommendations
  - Limit secret access by role (principle of least privilege).
  - Rotate database credentials periodically and use managed DB users for CI where possible.
  - Enable auditing and alerting when secrets are changed.
# Security Configuration Guide

## Environment Variables Setup

### 1. Create .env file
Copy `backend/env.template` to `backend/.env` and fill in your actual values:

```bash
cp backend/env.template backend/.env
```

### 2. Update application.properties
The `backend/src/main/resources/application.properties` file should reference environment variables:

```properties
# Database
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/orioncart}
spring.datasource.username=${DB_USERNAME:postgres}
spring.datasource.password=${DB_PASSWORD:password}

# JWT
jwt.secret=${JWT_SECRET:changeme}
jwt.expiration=${JWT_EXPIRATION_MS:86400000}

# Server
server.port=${SERVER_PORT:7070}

# CORS
cors.allowed.origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

### 3. Generate Strong JWT Secret
Use this command to generate a secure 256-bit secret:

```bash
openssl rand -base64 32
```

### 4. Supabase Configuration
1. Go to your Supabase project settings
2. Navigate to Database → Connection String
3. Copy the connection string and update DB_URL in .env
4. Use the database password you set during project creation

### 5. Never Commit Secrets
Ensure `.env` is in `.gitignore`:

```gitignore
# Environment variables
.env
*.env
!env.template
```

## Production Deployment

For production, use a secret management service:
- **AWS**: AWS Secrets Manager or Parameter Store
- **Railway/Render**: Built-in environment variable management
- **Docker**: Pass via docker-compose environment or secrets

## Security Checklist
- [ ] JWT secret is at least 256 bits
- [ ] Database password is strong (16+ characters)
- [ ] CORS is restricted to your frontend domain
- [ ] .env file is not committed to git
- [ ] Production secrets are rotated regularly

## Quick GitHub Actions example (deploy/tests)

Add this snippet to `.github/workflows/ci.yml` to ensure `JWT_SECRET` exists and run backend tests:

```yaml
name: CI
on: [push, pull_request]
jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Ensure secrets present
        run: |
          if [ -z "$JWT_SECRET" ]; then echo "JWT_SECRET missing" && exit 1; fi
        env:
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
      - name: Run backend tests
        run: |
          pushd backend
          ./mvnw -DskipTests=false test
          popd

``` 

## Rotate JWT secret (concise procedure)

Follow these steps to rotate `JWT_SECRET` safely without committing secrets to the repo.

- Generate a new secret locally (example: 32 bytes, base64):

```powershell
$b = New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b); [Convert]::ToBase64String($b)
```

- Store the new secret in your secrets manager (GitHub Actions / Key Vault / AWS Secrets Manager). Do NOT commit it.

- Update the runtime environment (CI secret or host env var) with the new value and deploy the backend.

- Optional migration window: if you must accept both old and new tokens during a short transition, implement a `kid` header and support a short-lived secondary verification key in the backend (rotate keys and remove the old key after clients adopt the new token).

- Example GitHub Actions step to rotate the secret (manual step you run locally then push):

```bash
# Generate secret locally
openssl rand -base64 32
# In GitHub: Settings → Secrets → Actions → New repository secret → Name: JWT_SECRET → Value: (paste)
```

Notes:
- Avoid storing `JWT_SECRET` in any committed file. Use `.env` only for local developer convenience and add it to `.gitignore`.
- After updating secrets in CI, trigger a deploy to pick up the new secret and verify application logs for successful startup.

