# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on http://localhost:3000 (strictPort)
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run preview  # serve the built bundle
```

No test runner is configured.

The dev server is locked to port 3000 because the backend API Gateway's CORS allow-list includes only `http://localhost:3000`, `http://localhost:4200`, and `https://pharmaflow.ba`. Don't change the port without coordinating a backend change.

## Environment

`VITE_GATEWAY_URL` (default `http://localhost:8080`) points the SPA at the API Gateway — **never** at an individual microservice. All HTTP goes through that one origin.

## Architecture

This is a React 19 + Vite + TypeScript SPA. Path alias `@/*` → `src/*` (configured in `vite.config.ts` and `tsconfig.app.json`).

### HTTP layer — `src/api/`

One shared Axios instance (`src/api/client.ts`) is the only thing that should make authenticated requests:

- **Request interceptor** attaches `Authorization: Bearer <jwt>` from `localStorage` (`pharmaflow.accessToken` / `pharmaflow.refreshToken`, managed via `tokenStorage`).
- **Response interceptor** intercepts a single 401 on non-`/api/auth/*` calls, runs `POST /api/auth/refresh` (de-duped via `refreshInFlight`), swaps the access token, and retries the original request once. If refresh fails, tokens are wiped and a registered `onAuthLost` callback bounces to `/login`.
- **Auth endpoints (`login`, `register`) use bare `axios`** (not the shared `api` instance) to avoid the interceptor recursing on their own 401s. `logout` deliberately uses the authenticated `api` so the gateway can blacklist the token.

Add new resources as `src/api/<resource>.ts` modules exporting typed functions that call `api.get/post/...` and return the DTO types from `src/types/api.ts`.

### Auth — `src/auth/`

- `AuthProvider` (`AuthContext.tsx`) seeds `user` from a stored JWT by decoding it client-side (no API call), then provides `login`, `register`, `logout`, `hasRole`. It registers/unregisters the `onAuthLost` callback from `api/client.ts` via `setOnAuthLost` so the Axios interceptor can drive React Router navigation.
- `ProtectedRoute` is the route-level guard. Wrap a `<Route>` element to require auth; pass `roles={[...]}` to also require role membership (redirects to `/` if user lacks role, `/login` if unauthenticated).
- Use the `useAuth()` hook in components — don't import the context directly.

### Routing — `src/App.tsx`

Two-level layout: public routes (`/login`, `/register`, `*` → NotFound) sit outside `<ProtectedRoute>`. Everything else is nested inside `<ProtectedRoute>` → `<Layout>` so it inherits the nav header and auth gate automatically. Adding a screen is normally just: build the page in `src/pages/`, add a `<Route>` here. No layout wiring needed.

### Server state — TanStack Query

Configured in `src/main.tsx` with project-wide defaults: **4xx responses are not retried** (they won't fix themselves), 5xx retries up to 2 times, `staleTime: 30s`, `refetchOnWindowFocus: false`. Prefer `useQuery` over manual `useEffect` + `useState` for any GET from the gateway.

### UI

- Tailwind CSS v4 with **CSS-first config** in `src/index.css` (`@theme { --color-brand-... }`). There is no `tailwind.config.js`.
- Local shadcn-style primitives in `src/components/ui/` (Button, Input, Card, Badge, Modal, Select, Label). Compose these; don't pull in a UI library.
- `cn()` in `src/lib/utils.ts` is the standard `clsx + tailwind-merge` helper.
- Forms: React Hook Form + Zod resolvers.

### Types — `src/types/api.ts`

DTOs mirror the Java backend. When the backend changes, update this file in lock-step. Notable quirks:

- `JavaInstant = string | number[]` — Jackson serialises `LocalDateTime` as either an ISO string or a `[y, m, d, h, m, s, nanos]` array depending on the service's `ObjectMapper`. Type permissively and convert at the read site.
- `Page<T>` is the Spring Data shape (`content`, `totalElements`, `totalPages`, `number`, `size`, `first`, `last`) — every paginated GET returns this.
- `Role` values are `ROLE_*` strings (with the prefix) — match the backend exactly.

## Conventions

- Imports use the `@/` alias, not relative paths across directories.
- Never store tokens anywhere except via `tokenStorage` in `src/api/client.ts`.
- Don't make HTTP calls to individual microservice ports — always go through the gateway via the shared `api` instance.
