# PharmaFlow Frontend (Zadatak 8.2)

React + Vite + TypeScript SPA that talks to the PharmaFlow backend **through the API Gateway** (default `http://localhost:8080`).

## Stack

| Concern | Library |
|---|---|
| Build / dev server | Vite |
| Language | TypeScript (strict, ES2023) |
| UI library | React 19 |
| Routing | React Router v6 (route-level guards) |
| Server state | TanStack Query |
| HTTP | Axios with `Authorization` interceptor + auto-refresh on 401 |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v4 (CSS-first config) |
| Components | Local shadcn-style primitives in `src/components/ui/` |

## Run it

```bash
cp .env.example .env.local            # only needed if your gateway lives elsewhere
npm install
npm run dev                           # http://localhost:3000
```

Vite is locked to port 3000 so that the gateway's CORS allow-list
(`http://localhost:3000,http://localhost:4200,https://pharmaflow.ba`) just
works without backend tweaks.

## What's wired up

| Route | Purpose | Backend it hits |
|---|---|---|
| `/login` | Email + password, captures JWT + refresh token, supports seeded test accounts | `POST /api/auth/login` |
| `/register` | Self-registration with role picker (demo) | `POST /api/auth/register` |
| `/` | Role-aware landing page with shortcut tiles | — |
| `/products` | Paginated, filterable product catalog | `GET /api/products/page` |
| `/products/:id/availability` | Stock at each pharmacy for one product | `GET /api/inventory/product/{id}` + `GET /api/pharmacies` |
| `/orders` | List orders, filter by user id | `GET /api/orders` |
| `/profile` | JWT identity + role badge + user lookup | `GET /api/users/{id}` |
| (logout button) | Blacklists token at the gateway, revokes refresh token | `POST /api/auth/logout` |

Every protected route is gated by `<ProtectedRoute />` — without a JWT you're
redirected to `/login`, and if the Axios interceptor sees a 401 it auto-tries
a refresh once before bouncing you out.

## Auth wiring

- Tokens live in `localStorage` (`pharmaflow.accessToken`, `pharmaflow.refreshToken`).
- The Axios request interceptor attaches `Authorization: Bearer <jwt>` on every call.
- The Axios response interceptor catches a single 401, calls `POST /api/auth/refresh`,
  swaps the access token, and retries the failed request. If refresh itself
  fails, tokens are wiped and `AuthProvider` redirects to `/login`.
- `useAuth()` is the React hook for components that need user info or role checks.

## Adding more screens

Two files per page:

1. `src/api/<resource>.ts` — typed Axios calls (or extend an existing one).
2. `src/pages/<Page>.tsx` — TanStack Query hook + Tailwind UI.

Then register the route in `src/App.tsx`. The layout, navigation, and auth
guard are inherited automatically.
