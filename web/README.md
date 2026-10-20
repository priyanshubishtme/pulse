# LinkPulse Web

> **WORKSPACE GUIDE | REACT FRONTEND**

## Contents

- [At a glance](#at-a-glance)
- [Browser route map](#browser-route-map)
- [Implementation notes](#implementation-notes)

> **Frontend workspace** · React 19 · TypeScript · Vite

The `web` workspace contains the LinkPulse dashboard and public browser flows: authentication, link and campaign management, analytics, QR design, CSV import, administrator controls, status pages, password unlock, and the redirect interstitial.

## At a glance

| Task | Command (from repository root) |
|---|---|
| Start server and web app | `npm run dev` |
| Build this workspace | `npm run build --workspace web` |
| Lint this workspace | `npm run lint --workspace web` |

The API and browser app are developed together. See the [root README](../README.md) for setup, environment variables, architecture, and deployment; see the [API reference](../docs/final/API.md) for backend contracts.

## Browser route map

| Area | Route pattern | Access |
|---|---|---|
| Sign in / sign up | `/login`, `/signup` | Public |
| Dashboard and product tools | `/`, `/links`, `/campaigns`, `/analytics`, `/qr-codes`, `/import` | Signed in |
| Platform administration | `/admin` | Active `ADMIN` account |
| Redirect experience | `/continue/:alias`, `/unlock/:alias`, `/status/:reason` | Public |

Routes are defined in `src/routes.tsx`; `src/components/layout/ProtectedRoute.tsx` handles session and role gating. Public redirects are issued by the Express service and continue in this frontend.

## Implementation notes

- API requests use the shared Axios client and the server's HTTP-only session cookie.
- TanStack Query manages server state; Recharts renders analytics views.
- QR images are generated in the browser. Destination data is not sent to an external QR service.
- Keep public pages and generated UI behavior aligned with the root [security and redirect guide](../docs/SECURITY_AND_REDIRECTS.md).
