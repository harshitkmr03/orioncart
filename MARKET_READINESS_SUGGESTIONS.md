# orioncart: Market Readiness Suggestions

> **Goal**: Transform the current development project into a production-ready e-commerce application suitable for real users.

---

## 🔴 Critical (Must Fix Before Launch)

### 1. Security Hardening
| Issue | Current State | Recommendation |
|-------|---------------|----------------|
| **Hardcoded Secrets** | JWT secrets and DB credentials in `application.properties` | Move ALL secrets to environment variables or a secret manager (e.g., AWS Secrets Manager, HashiCorp Vault) |
| **JWT Secret Rotation** | Static secret, likely weak | Generate a strong 256-bit secret; implement rotation strategy |
| **CORS Configuration** | Likely permissive (`*`) | Restrict to specific frontend domains |
| **Input Validation** | Minimal validation on API endpoints | Add `@Valid` annotations and custom validators for all DTOs |
| **Rate Limiting** | Not implemented | Add rate limiting to prevent abuse (e.g., Spring Cloud Gateway, Resilience4j) |

### 2. Authentication & Authorization
| Issue | Recommendation |
|-------|----------------|
| Missing proper auth flow | Implement OAuth2/JWT with refresh tokens |
| No role-based access control | Enforce `@PreAuthorize` on all sensitive endpoints (e.g., only shopkeepers can modify products) |
| Password storage | Ensure BCrypt with high rounds (12+) |

### 3. Database (Supabase/PostgreSQL)
| Issue | Recommendation |
|-------|----------------|
| No connection pooling | Use PgBouncer or Supabase's built-in pooler for production |
| Missing indexes | Add indexes on frequently queried columns (`shop_id`, `product.name`) |
| No backup strategy | Enable Supabase Point-in-Time Recovery |
| Schema migrations | Use Flyway or Supabase migrations for version control |

---

## 🟠 High Priority (Pre-Launch)

### 4. Backend API Completeness
| Feature | Status | Action Required |
|---------|--------|-----------------|
| Product CRUD | ✅ Created | Verify all endpoints work with Supabase |
| Order Management | Partial | Add `GET /api/orders/{id}`, order status updates, cancellation |
| Delete Product | Missing handler | Wire up frontend delete button to `DELETE /api/products/{id}` |
| Shop Management | Hardcoded Shop ID | Implement proper shop-user relationship |

### 5. Frontend Functionality Fixes
| Component | Issue | Fix |
|-----------|-------|-----|
| **Seller Dashboard** | Add/Update product not saving | Debug API payload; ensure `shop.id` is correctly sent |
| **Quick Stock Control** | +/- buttons don't persist | Verify `PUT /api/products/{id}` payload matches backend expectations |
| **Delete Button** | Non-functional | Add `onClick` handler calling `api.deleteProduct(id)` |
| **Cart Persistence** | Works via localStorage | Consider syncing with backend for logged-in users |

### 6. Error Handling & UX
| Area | Improvement |
|------|-------------|
| API Errors | Show user-friendly error messages (e.g., "Network error, please try again") |
| Loading States | Add skeleton loaders for all data-fetching components |
| Empty States | Add meaningful messages when no products/shops found |
| Form Validation | Client-side validation with clear error messages |

---

## 🟡 Medium Priority (Post-Launch Iteration)

### 7. Performance Optimization
- **Lazy Loading**: Split frontend bundles; lazy-load routes
- **Image Optimization**: Use CDN for product images; implement responsive images
- **API Caching**: Add Redis/Supabase caching for frequently accessed data
- **Database Queries**: Profile slow queries; add `EXPLAIN ANALYZE`

### 8. Testing Infrastructure
| Type | Recommendation |
|------|----------------|
| Unit Tests | Add Jest tests for frontend components; JUnit for backend services |
| Integration Tests | Test API endpoints against test database |
| E2E Tests | Expand Playwright tests for complete customer/seller flows |
| Load Tests | Use k6/Gatling to simulate 1000+ concurrent users |

### 9. Monitoring & Observability
| Tool | Purpose |
|------|---------|
| **Sentry** | Error tracking and crash reporting |
| **Prometheus + Grafana** | Metrics dashboard (API latency, DB pool, JVM health) |
| **Structured Logging** | JSON logs with correlation IDs for distributed tracing |
| **Uptime Monitoring** | Use Pingdom/UptimeRobot for health checks |

---

## 🟢 Nice-to-Have (Future Enhancements)

### 10. Feature Additions
- [ ] **User Reviews & Ratings**: Allow customers to rate products/shops
- [ ] **Push Notifications**: Order status updates via Firebase Cloud Messaging
- [ ] **Multi-language Support**: i18n for Hindi, regional languages
- [ ] **AI Recommendations**: "Customers also bought..." suggestions
- [ ] **Loyalty Program**: Points/rewards system for repeat customers

### 11. Business Operations
- [ ] **Admin Dashboard**: Analytics, user management, shop approval
- [ ] **Invoice Generation**: PDF invoices for orders
- [ ] **Delivery Partner Integration**: Connect with Dunzo, Porter
- [ ] **Inventory Alerts**: Email/SMS when stock runs low

### 12. DevOps & Deployment
| Area | Recommendation |
|------|----------------|
| **Containerization** | Docker images for backend; Vercel/Netlify for frontend |
| **CI/CD Pipeline** | GitHub Actions for automated builds, tests, and deployments |
| **Environment Separation** | Separate Dev, Staging, Production environments |
| **Blue-Green Deployment** | Zero-downtime deployments |

---

## Immediate Action Items (Next 7 Days)

1. **Fix Seller Dashboard** - Debug the Add Product and Stock Update flows
2. **Secure Secrets** - Move credentials to `.env` file (not committed)
3. **Add Delete Handler** - Wire up the delete button on products
4. **Backend Validation** - Add `@Valid` and proper error responses
5. **Basic E2E Test** - Ensure customer flow (Browse → Cart → Checkout) works

---

## Architecture Recommendations

```
┌──────────────────────────────────────────────────────────────┐
│                      PRODUCTION ARCHITECTURE                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   [Vercel/Netlify]          [Railway/Render]                 │
│        │                          │                          │
│   ┌────▼────┐              ┌──────▼──────┐                   │
│   │ Frontend│ ──REST API──▶│   Backend   │                   │
│   │ (React) │              │(Spring Boot)│                   │
│   └─────────┘              └──────┬──────┘                   │
│                                   │                          │
│                            ┌──────▼──────┐                   │
│                            │  Supabase   │                   │
│                            │ (PostgreSQL)│                   │
│                            │ + PostGIS   │                   │
│                            └──────┬──────┘                   │
│                                   │                          │
│                            ┌──────▼──────┐                   │
│                            │  Supabase   │                   │
│                            │  Storage    │                   │
│                            │  (Images)   │                   │
│                            └─────────────┘                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

> **Note**: This document should be updated as issues are resolved. Use the checkbox notation (`[x]`) to track progress.

