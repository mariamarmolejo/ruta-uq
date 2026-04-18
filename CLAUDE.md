# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Carpooling platform for Universidad de Quindío. Two sub-projects:
- `rutaUQ-backend/` — Spring Boot 3.2.3 + Java 21 REST API
- `rutauq-frontend/` — Next.js 14 App Router + TypeScript SPA (static export)

---

## Backend

### Commands
```bash
cd rutaUQ-backend

# Start database (required before running the app)
docker compose up -d

# Run application (profile: local)
./mvnw spring-boot:run

# Run all tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=ClassName

# Build fat JAR (skip tests)
./mvnw package -DskipTests
```

### Key environment variables
```
JWT_SECRET                      # HS256 signing key
MERCADOPAGO_ACCESS_TOKEN        # TEST-... prefixed for dev
MERCADOPAGO_WEBHOOK_SECRET      # blank = skip validation in dev
APP_BASE_URL                    # webhook base (use ngrok locally)
```
Database uses docker-compose defaults: `rutauq_db`, `rutauq_user`, `rutauq_pass`, port 5432.

### Architecture
- **Package structure**: `com.rutauq.backend.modules.<feature>` per feature (auth, users, drivers, vehicles, trips, reservations, payments). Each module has its own controller/service/repository/dto layers.
- **API prefix**: all endpoints at `/api/v1/`.
- **Response envelope**: `ApiResponse<T>` — fields `success`, `message`, `data`, `errorCode`, `timestamp`. All errors go through `GlobalExceptionHandler` which maps `AppException` (carrying an `ErrorCode` enum) to HTTP status codes.
- **Auth**: JWT (JJWT 0.12.3), stateless sessions, `JwtAuthenticationFilter` runs before every request. Roles: `CLIENT`, `DRIVER`, `ADMIN` stored as VARCHAR on the `users` table.
- **DTOs**: MapStruct mappers in each module; entities never leave the service layer.
- **Schema**: Flyway manages all DDL (`ddl-auto=validate`). Migrations live in `src/main/resources/db/migration/` named `V{n}__{description}.sql`. Never modify an already-applied migration.
- **Email**: `EmailSender` interface — `LogEmailSender` logs to console by default; `SmtpEmailSender` activates when `app.mail.enabled=true`.
- **Payments**: Mercado Pago Orders API v2 via plain `RestTemplate` (no SDK). Webhook endpoint is public; signature validated via HMAC-SHA256 unless secret is blank.
- **Security config**: `SecurityConfig.java` defines the filter chain. Public endpoints are explicitly listed; everything else requires authentication.
- Swagger UI: `http://localhost:8080/swagger-ui.html`

---

## Frontend

### Commands
```bash
cd rutauq-frontend

npm install
npm run dev      # dev server at http://localhost:3000
npm run build    # static export → ./out
npm lint
```

### Key environment variables (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_MP_PUBLIC_KEY=TEST-...
```

### Architecture
- **App Router groups**: `(auth)` for login/register/email flows (centered card layout); `(dashboard)` for protected pages (Navbar + Sidebar).
- **Route protection**: `middleware.ts` checks the `access_token` cookie. Unauthenticated → `/login?next=<path>`. Authenticated on auth pages → `/trips`.
- **Auth state**: Zustand store (`stores/auth.store.ts`) persisted to localStorage under key `rutauq-auth`. On login, token is also written to cookie for middleware access.
- **API client**: `lib/axios.ts` — Axios instance that attaches `Authorization: Bearer <token>` from localStorage on every request; on 401 clears auth and redirects to login.
- **Type contracts**: all API types in `types/index.ts`. Mercado Pago SDK globals declared in `types/mercadopago.d.ts` (ambient — no `export {}`).
- **Forms**: React Hook Form + Zod. Zod v4 note: use `message:` instead of `required_error:` in `.string()` / `.number()` options.
- **Static export**: `next.config.mjs` sets `output: "export"`. No SSR. `useSearchParams()` must always be inside a component wrapped with `<Suspense>`.
- **Styling**: Tailwind with custom tokens `primary` (blue), `secondary` (green), `neutral` (gray) defined in `tailwind.config.ts`.

---

## Deployment (AWS)

Scripts live in `infrastructure/cloudformation/`.

```bash
export AWS_PROFILE=dev

# Deploy individual or all CloudFormation stacks
./deploy.sh dev networking
./deploy.sh dev all

# Build backend JAR, push Docker image to ECR, force ECS redeploy
./deploy.sh dev push

# Build frontend static export, sync to S3, invalidate CloudFront
./deploy.sh dev push-frontend
```

Stack order: networking → ecr → rds → ecs → cdn. Secrets are stored in AWS SSM Parameter Store under `/rutauq/<env>/`.
