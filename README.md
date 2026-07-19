# loan-frontend

Nuxt 3 frontend for the Loan Management System backend (`../` — the Spring Boot
microservices monorepo: discovery-server, api-gateway, auth-service,
customer-service, loan-service, payment-service).

Standalone project — not a Maven module, has its own `package.json`, not
listed in the root `pom.xml`.

## Stack

- Nuxt 3 + TypeScript
- Nuxt UI (Tailwind-based component library)
- No client-side state library — auth session lives in cookies via `useAuth()`

## Project structure

Feature-folder layout, set up to scale past the current four domains without
the flat `pages/components/composables/utils` dirs turning into a junk drawer:

```
features/<domain>/
  components/    domain-specific components (auto-imported globally)
  composables/   domain-specific composables (auto-imported)
  utils/         domain-specific helpers (auto-imported)
  types.ts       DTOs for that domain, mirroring the matching backend service

shared/
  components/    cross-domain UI (ConfirmModal, StatusBadge, ColorModeToggle)
  composables/   useApi() — the only thing every domain depends on
  utils/         format.ts (currency/date formatting)
  types.ts       Role, ApiErrorBody — the only types more than one domain needs

pages/ layouts/ middleware/   stay at the project root — Nuxt's file-based
                               routing requires these conventional locations
```

`nuxt.config.ts` extends the default component/composable scan dirs
(`components` / `imports.dirs`) to cover `features/*/components`,
`features/*/composables`, `features/*/utils`, and `shared/*` — so e.g.
`<CustomerForm>` or `useAuth()` are still globally auto-imported from inside
`features/customers/` or `features/auth/` exactly like they would be from a
top-level `components/`/`composables/` dir. Only `types.ts` imports are
explicit (`import type { CustomerResponse } from '~/features/customers/types'`),
since TypeScript types aren't part of Nuxt's auto-import scanning.

A new domain (e.g. `features/reports/`) just needs its own subfolder in that
shape — no config changes required unless it needs something other than
`components/`, `composables/`, `utils/`, and `types.ts`.

## How it talks to the backend

The browser never calls the api-gateway directly. `nuxt.config.ts` defines a
`routeRules` proxy:

```
/api/** → ${NUXT_API_BASE}/api/**   (default NUXT_API_BASE=http://localhost:8080)
```

Nitro (the Nuxt server) forwards every `/api/*` request to the gateway
server-side, so the frontend and gateway are same-origin from the browser's
point of view — no CORS configuration needed on the backend. All API calls in
the app go through the `useApi()` composable, which targets `/api` and
attaches the JWT.

## Setup

```bash
npm install
cp .env.example .env   # adjust NUXT_API_BASE if the gateway isn't on localhost:8080
npm run dev
```

Start the backend first (`discovery-server` → the other services →
`api-gateway`, all via `./mvnw -pl <module> spring-boot:run`, or
`docker compose up --build` from the repo root), then `npm run dev` here.
Frontend runs on http://localhost:3000 by default.

## Auth

- `POST /api/auth/register` and `/login` are the only unauthenticated calls,
  plus `/refresh` and `/logout` (both operate on the refresh token itself, not
  a Bearer access token).
- New accounts are always created with role `USER` (see
  `AuthServiceImpl.register` — there's no client-controlled role field).
  A seeded `admin`/`admin123` account exists for local dev
  (`AdminSeeder`, `seed.admin.*` in auth-service's `application.properties`);
  otherwise promote a user to `ADMIN` via `/users` (admin-only) or directly in
  `auth_db.users`.
- The access token is short-lived (24h); `useApi()` transparently exchanges
  the stored refresh token for a new one on a 401 and retries once before
  forcing a re-login.
- Admin-only actions in the UI (loan approve/reject/disburse, customer/payment
  delete, `/users` management) mirror the backend's
  `@PreAuthorize("hasRole('ADMIN')")` checks — hidden for non-admins, but the
  backend is the actual enforcement point.

## Pages

- `/login`, `/register`
- `/` — dashboard (stat tiles + loans pending approval)
- `/customers`, `/customers/[id]` — CRUD, shows a customer's loans
- `/loans`, `/loans/[id]` — CRUD, approve/reject/disburse (confirmation
  required), apply payment to loan balance, generate/view payment schedule
- `/payments` — all payments, filter by loan, mark as paid, ad-hoc creation
- `/users` — admin-only: change role, activate/deactivate, delete accounts
  (an admin can't touch their own account here — avoids self-lockout)

Every logged-in user can change their own password from the sidebar
(`ChangePasswordModal`, `PUT /api/auth/change-password`).

## Notes

- `loan.applyPayment` (loan-service, adjusts `outstandingBalance`) and the
  payment-service ledger (`/payments`, `/payments/schedule`) are two separate
  backend datastores with no automatic sync between them — this mirrors the
  actual service boundary, not a frontend simplification.
