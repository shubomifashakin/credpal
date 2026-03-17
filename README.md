# CredPal FX Trading API

## Description

A backend API for an FX trading application that allows users to register, fund wallets, and trade currencies in real-time. Built with NestJS, PostgreSQL, and Redis.

## Architecture

The system is a modular NestJS monolith with the following high-level components:

- **Auth** — user registration, OTP-based email verification, JWT authentication via HTTP-only cookies
- **Wallet** — multi-currency wallet management, funding, currency conversion and trading
- **FX** — real-time exchange rate fetching with Redis caching and stale fallback
- **Transactions** — immutable ledger of all balance-changing events with cursor-based pagination

All mutating operations (fund, convert, trade) run inside PostgreSQL transactions with `SELECT FOR UPDATE` row-level locking to prevent race conditions and double-spending.

## Project Structure

```
credpal/
├── src/
│   ├── modules/             # Feature modules (auth, wallet, fx, transactions)
│   ├── core/                # Infrastructure (database, redis, mailer, hasher, app-config)
│   ├── common/              # Guards, interceptors, decorators, filters, constants
│   └── types/               # Shared TypeScript types
├── docs/                    # Architecture diagrams and ADRs
├── docker-compose.yml       # Docker Compose configuration
└── README.md
```

## Key Assumptions

**Authentication**

- Authentication uses HTTP-only cookies for token storage rather than `Authorization` headers, to mitigate XSS-based token theft
- JWTs are only issued after successful OTP verification, not on registration
- Access tokens expire in 15 minutes, refresh tokens in 7 days.
- JWT signing uses RS256 with a private/public key pair
- Logout and token blacklisting are not implemented in this version but the guard is designed to support it, blacklist checks are in place and would activate once a logout endpoint is added

**Wallet**

- Each user has exactly one wallet, created automatically upon account verification
- A wallet can hold balances in multiple currencies, with one row per currency in `wallet_balances`
- A balance row for a given currency is created on first fund or trade into that currency
- Users start with a NGN balance row seeded at `0` on verification

**FX Rates**

- Real-time rates are fetched from [ExchangeRate-API](https://www.exchangerate-api.com)
- Rates are cached in Redis with a 60-second TTL (fresh cache)
- A stale fallback cache with a 30-minute TTL is maintained alongside the fresh cache
- On a fresh cache miss, the API is called first, and the stale cache is only served if the API call fails
- If both the API and stale cache are unavailable, the operation fails with a `500`
- FX API calls use exponential backoff with 3 attempts and delays of 0ms, 500ms and 1500ms
- The rate used in a conversion is stored on the transaction record for easu auditing
- A `stale: true` flag is returned in the response when a stale rate was used

**Transactions**

- Transactions are written atomically alongside balance updates, they are never written independently.
- A transaction record is created for every balance-changing event: funding, conversion, and trade.
- For funding operations, `fromCurrency` and `fromAmount` are `null` since funds originate outside the system.
- `CONVERSION` and `TRADE` are kind of equivalent in this implementation, both represent a currency swap using real-time FX rates. The distinction is preserved at the API level in other to make it extensible in the fture

**Idempotency**

- `POST /wallets/fund`, `POST /wallets/convert`, and `POST /wallets/trade` require an `x-idempotency-key` header
- Keys are hashed with SHA-256 and scoped per user, the same key from two different users is treated as distinct
- Results are cached in Redis for 24 hours, replayed requests return the original response without re-executing.
- Redis is used instead of postgres because it provides faster lookups.
- `SET NX` ensures atomicity at the Redis level in race conditions

**Security**

- Passwords and OTPs are hashed using Argon2
- OTPs expire after 10 minutes and are invalidated after use
- All existing OTPs for a user are invalidated when a new registration is triggered
- Role-based access is implemented with a `USER` / `ADMIN` enum on the `users` table. Although, no endpoints really require separate role level access.
- Rate limiting is applied globally via Redis-backed throttling (30 requests per 15 seconds per user/IP)

**Scalability**

- FX rate fetching is isolated to a private method in `FxService`, making provider swapping straightforward without touching business logic
- The `wallet_balances` schema supports any number of currencies without schema changes
- Database connection pooling is configured with a max of 50 connections

## Project Setup

**Prerequisites**

- Node.js 20+
- Docker

**Note:** Email delivery requires a valid Resend API key.
For local testing, OTP codes are logged to the console at `debug` level.
If mail delivery fails, check application logs. This was done to simplify testing of actual logic

**Generate RSA keys for JWT signing**

```bash
openssl genrsa -out private.key 2048
openssl rsa -in private.key -pubout -out public.key
```

**Clone and install**

```bash
git clone <repo-url>
cd credpal
npm install
```

**Configure environment variables**

```bash
cp .env.example .env
```

| Variable          | Description                        |
| ----------------- | ---------------------------------- |
| `DATABASE_URL`    | PostgreSQL connection string       |
| `REDIS_URL`       | Redis connection string            |
| `JWT_PRIVATE_KEY` | RS256 private key (paste contents) |
| `JWT_PUBLIC_KEY`  | RS256 public key (paste contents)  |
| `SERVICE_NAME`    | Service name for logging           |
| `NODE_ENV`        | `development` or `production`      |
| `LOG_LEVEL`       | `info`, `debug`, `warn`, `error`   |
| `BASE_URL`        | API base URL                       |
| `FRONTEND_URL`    | Frontend URL for CORS              |
| `DOMAIN`          | Cookie domain                      |
| `FX_API_KEY`      | ExchangeRate-API key               |
| `FX_API_URL`      | ExchangeRate-API base URL          |
| `RESEND_API_KEY`  | Resend API key for email delivery  |
| `MAIL_FROM`       | Sender email address               |

**Start Database and Redis Containers**

```bash
docker compose up -d
```

**Run database migrations**

```bash
npm run migration:run
```

**Start the development server**

```bash
npm run start:dev
```

## API Documentation

Swagger UI is available at:

```
http://localhost:3000/api/docs
```

All endpoints, request/response schemas, and authentication requirements are documented inline via decorators.

## Key API Endpoints

| Method | Endpoint                  | Auth | Description                       |
| ------ | ------------------------- | ---- | --------------------------------- |
| `POST` | `/api/v1/auth/register`   | No   | Register a new user               |
| `POST` | `/api/v1/auth/verify`     | No   | Verify OTP and receive tokens     |
| `GET`  | `/api/v1/wallets`         | Yes  | Get wallet balances               |
| `POST` | `/api/v1/wallets/fund`    | Yes  | Fund wallet                       |
| `POST` | `/api/v1/wallets/convert` | Yes  | Convert between currencies        |
| `POST` | `/api/v1/wallets/trade`   | Yes  | Trade currencies                  |
| `GET`  | `/api/v1/fx/rates`        | Yes  | Get current FX rates              |
| `GET`  | `/api/v1/transactions`    | Yes  | Get paginated transaction history |

## Architectural Decisions

**Multi-currency wallet model**
Rather than a single balance column, each currency holding is a separate row in `wallet_balances` with a `UNIQUE(walletId, currency)` constraint. This allows any number of currencies without schema changes and makes balance operations on individual currencies atomic.

**Pessimistic locking over serializable isolation**
`SELECT FOR UPDATE` is used inside `READ COMMITTED` transactions rather than `SERIALIZABLE` isolation. This gives deterministic locking behaviour without the retry logic that serialization failures would require.

**Redis for idempotency over a database table**
Idempotency keys are stored in Redis rather than PostgreSQL. Since they are ephemeral by nature (24h TTL), Redis TTL handles expiry automatically without a cleanup job, and lookups are O(1) without a database round-trip.

**FX rates in Redis only**
Exchange rates are not persisted to the database. The rate used in each transaction is stored on the transaction record itself, which is sufficient for auditability. A separate rates table would add write overhead on every API call with no benefit for the current requirements.

**Repository pattern**
All database operations are encapsulated in repository classes under `src/core/database/repositories/`. Services contain only business logic and never write raw queries. This separation makes the codebase easier to test and extend.

**Numeric precision for balances and rates**
All monetary values and exchange rates are stored as `numeric(20, 8)` rather than `float` or `decimal`. Floating point types cannot represent decimal fractions exactly and accumulate rounding errors across repeated arithmetic, which is unacceptable for financial data. `numeric` is arbitrary-precision in PostgreSQL and guarantees exact storage. A precision of 20 supports balances up to 999,999,999,999.99999999, which is well beyond realistic wallet sizes. A scale of 8 decimal places accommodates FX rates like `0.00063241` without truncation, which would otherwise produce completely wrong conversion amounts at small rate values.

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

```

## Production Considerations

The following would be prioritised before production deployment:

- Add a logout endpoint with JWT blacklisting via Redis
- Add a resend OTP endpoint
- Replace direct database credentials with a secrets manager
- Add a dead-letter queue for failed email delivery retries
- Access tokens would be shortened to 5 minutes for better security
