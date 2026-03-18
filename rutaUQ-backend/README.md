# Ruta Compartida UQ — Backend

Backend REST API for **Ruta Compartida UQ**, a carpooling platform connecting passengers with drivers at Universidad de Quindío (Armenia, Colombia).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.2.3 |
| Security | Spring Security + JWT (JJWT 0.12.3) |
| Database | PostgreSQL 16 |
| Migrations | Flyway |
| ORM | Spring Data JPA / Hibernate |
| Mapping | MapStruct 1.5.5 |
| Boilerplate | Lombok |
| API Docs | SpringDoc OpenAPI 2.3 (Swagger UI) |
| Payments | Mercado Pago Payments API v1 |
| Containerization | Docker / Docker Compose |

---

## Prerequisites

- Java 21
- Maven 3.9+
- Docker & Docker Compose
- ngrok (optional — required for real MP webhook testing)

---

## Project Structure

```
src/main/java/com/rutauq/backend/
├── common/
│   ├── exception/          # AppException, ErrorCode, GlobalExceptionHandler
│   └── response/           # ApiResponse<T> envelope
├── config/                 # WebConfig, OpenApiConfig
├── health/                 # GET /api/v1/health
├── modules/
│   ├── auth/               # Register, Login, JWT
│   ├── users/              # User profile management
│   ├── drivers/            # Driver profile management
│   ├── vehicles/           # Vehicle management
│   ├── trips/              # Trip publishing and search
│   ├── reservations/       # Seat reservation system
│   └── payments/           # Mercado Pago integration
│       ├── config/         # MercadoPagoProperties, RestTemplate bean
│       ├── controller/     # PaymentController, WebhookController
│       ├── domain/         # Payment, PaymentEventLog entities
│       ├── dto/            # Request/Response DTOs
│       │   └── mp/         # Internal MP API DTOs
│       ├── mapper/         # PaymentMapper (MapStruct)
│       ├── repository/     # PaymentRepository, PaymentEventLogRepository
│       ├── service/        # PaymentService, MercadoPagoService, WebhookHandlerService
│       └── webhook/        # WebhookSignatureValidator
└── shared/
    ├── security/           # SecurityConfig, JwtService, JwtAuthenticationFilter
    └── utils/              # SecurityUtils

src/main/resources/
├── application.yml         # Main configuration
├── application-dev.yml     # Dev profile (verbose SQL logging)
└── db/migration/           # Flyway migrations V1–V8
```

---

## Environment Variables

Create a `.env` file or set these variables in your environment before running:

```env
# Database (defaults work with docker-compose)
DB_URL=jdbc:postgresql://localhost:5432/rutauq_db
DB_USERNAME=rutauq_user
DB_PASSWORD=rutauq_pass

# JWT
JWT_SECRET=your-secret-key-at-least-32-characters-long

# Mercado Pago (Colombia — MCO)
MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxx   # TEST- token from MP developer portal
MERCADO_PAGO_WEBHOOK_SECRET=your-webhook-secret       # From MP dashboard → Webhooks → Secret key

# Webhook URL (use ngrok URL in development)
APP_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

> **Important:** Use the `TEST-` access token (not `APP_USR-`) for sandbox testing.
> Get your credentials at: https://www.mercadopago.com.co/developers/panel/app

---

## Quick Start

### 1. Start the database

```bash
cd rutaUQ-backend
docker compose up -d
```

Verify the database is healthy:

```bash
docker compose ps
# postgres container should show "healthy"
```

### 2. Run the application

```bash
./mvnw spring-boot:run
```

Or with explicit environment variables:

```bash
MERCADO_PAGO_ACCESS_TOKEN=TEST-xxx \
MERCADO_PAGO_WEBHOOK_SECRET=your-secret \
APP_BASE_URL=https://abc123.ngrok-free.app \
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`.

Flyway runs all migrations automatically on startup — no manual DB setup needed.

### 3. Verify it's running

```bash
curl http://localhost:8080/api/v1/health
```

---

## API Documentation

Swagger UI is available at:

```
http://localhost:8080/swagger-ui.html
```

OpenAPI JSON:

```
http://localhost:8080/api-docs
```

---

## Database Migrations

Migrations are managed by Flyway and run automatically at startup.

| Version | Description |
|---|---|
| V1 | Schema metadata table |
| V2 | Users table (auth) |
| V3 | User profiles |
| V4 | Driver profiles and vehicles |
| V5 | Trips |
| V6 | Reservations |
| V7 | Payments + PaymentEventLog, migrate PENDING → PENDING_PAYMENT |
| V8 | Rename `mercado_pago_order_id` → `mercado_pago_payment_id` |

---

## API Endpoints

All endpoints are prefixed with `/api/v1`. Protected endpoints require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login and get JWT token |

### Users
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/users/me` | Authenticated | Get own profile |
| PUT | `/users/me` | Authenticated | Update own profile |
| GET | `/users/{id}` | Authenticated | Get user by ID |

### Drivers
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/drivers/profile` | DRIVER | Create driver profile |
| GET | `/drivers/profile` | DRIVER | Get own driver profile |
| PUT | `/drivers/profile` | DRIVER | Update driver profile |

### Vehicles
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/vehicles` | DRIVER | Register a vehicle |
| GET | `/vehicles` | DRIVER | List own vehicles |
| PUT | `/vehicles/{id}` | DRIVER | Update vehicle |
| DELETE | `/vehicles/{id}` | DRIVER | Remove vehicle |

### Trips
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/trips` | DRIVER | Publish a trip |
| GET | `/trips` | Authenticated | Search available trips |
| GET | `/trips/my` | DRIVER | List own trips |
| GET | `/trips/{id}` | Authenticated | Get trip details |
| PUT | `/trips/{id}` | DRIVER | Update trip |
| DELETE | `/trips/{id}` | DRIVER | Cancel trip |
| GET | `/trips/{id}/reservations` | DRIVER / ADMIN | List trip reservations |

### Reservations
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/reservations` | CLIENT | Create reservation → status: `PENDING_PAYMENT` |
| GET | `/reservations` | Authenticated | List own reservations |
| GET | `/reservations/{id}` | Authenticated | Get reservation by ID |
| DELETE | `/reservations/{id}` | Authenticated | Cancel reservation |

### Payments
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/payments/create` | CLIENT | Create MP payment → triggers `POST /v1/payments` |
| GET | `/payments/{id}` | Authenticated | Get payment by ID |
| GET | `/payments/reservation/{id}` | Authenticated | Get payment by reservation ID |
| POST | `/payments/webhook` | Public | Mercado Pago webhook receiver |

---

## Payment Flow

```
CLIENT                    BACKEND                    MERCADO PAGO
  |                          |                            |
  |-- POST /reservations --> |                            |
  |<-- status: PENDING_PAYMENT                            |
  |                          |                            |
  | (tokenize card via MP.js)|                            |
  |-- POST /payments/create →|                            |
  |                          |-- POST /v1/payments -----> |
  |                          |<-- paymentId, status ---- |
  |<-- PaymentResponse ------                             |
  |                          |                            |
  |                          |<-- POST /webhook --------- |
  |                          |   (payment.updated)        |
  |                          |-- GET /v1/payments/{id} -> |
  |                          |<-- status: approved ------ |
  |                          |                            |
  |                          | reservation → CONFIRMED    |
```

### Reservation status transitions

```
PENDING_PAYMENT  →  CONFIRMED      (payment approved)
PENDING_PAYMENT  →  PAYMENT_FAILED (payment rejected/cancelled)
PENDING_PAYMENT  →  CANCELLED      (user cancels)
CONFIRMED        →  CANCELLED      (user cancels — Phase 7: may require refund)
CONFIRMED        →  COMPLETED      (trip finished — Phase 7)
```

---

## Mercado Pago Setup (Development)

### 1. Get test credentials

Go to your MP developer portal and get **Test credentials** (prefix `TEST-`):

```
https://www.mercadopago.com.co/developers/panel/app/{APP_ID}/credentials
```

### 2. Configure webhook in MP dashboard

```
https://www.mercadopago.com.co/developers/panel/app/{APP_ID}/webhooks
```

Add URL: `https://your-ngrok-url.ngrok-free.app/api/v1/payments/webhook`
Select events: **Payments**
Copy the **Secret key** → set as `MERCADO_PAGO_WEBHOOK_SECRET`

### 3. Start ngrok

```bash
ngrok http 8080
# Copy the https:// URL → set as APP_BASE_URL
```

### 4. Test card (Colombia)

| Field | Value |
|---|---|
| Card number | `5254 1336 7440 3564` |
| Security code | `123` |
| Expiry | `11/2030` |
| Cardholder name | `APRO` (approved) / `FUND` (rejected) / `OTHE` (other rejection) |

Get a card token (use your **TEST public key**):

```bash
curl -X POST "https://api.mercadopago.com/v1/card_tokens?public_key=TEST-YOUR-PUBLIC-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "card_number": "5254133674403564",
    "security_code": "123",
    "expiration_month": 11,
    "expiration_year": 2030,
    "cardholder": {
      "name": "APRO",
      "identification": { "type": "CC", "number": "12345678" }
    }
  }'
```

---

## Running Tests

```bash
./mvnw test
```
## Deploy s3
mvn clean install
aws ecr get-login-password --region us-east-1 --profile dev | docker login --username AWS --password-stdin 883886327106.dkr.ecr.us-east-1.amazonaws.com
docker buildx build        --platform linux/amd64         --no-cache     -t 883886327106.dkr.ecr.us-east-1.amazonaws.com/rutauq-backend-dev:latest     --load     ./rutaUQ-backend
docker push 883886327106.dkr.ecr.us-east-1.amazonaws.com/rutauq-backend-dev:latest
aws ecs update-service     --cluster rutauq-dev     --service rutauq-dev-backend     --force-new-deployment     --region us-east-1
---

## Roles

| Role | Description |./de
|---|---|
| `CLIENT` | Passenger — can search trips, create reservations, make payments |
| `DRIVER` | Driver — can publish trips, manage vehicles |
| `ADMIN` | Full access |

Specify role at registration:

```json
{ "role": "CLIENT" }
```

---

## Development Notes

- Active profile: `dev` (set in `application.yml`) — enables verbose SQL logging
- `ddl-auto: validate` — Hibernate never modifies the schema; all changes go through Flyway
- Webhook signature validation is **skipped** when `MERCADO_PAGO_WEBHOOK_SECRET` is blank (useful for local simulation without ngrok)
- CORS allows `localhost:3000` (Next.js) and `localhost:19006` (Expo)
