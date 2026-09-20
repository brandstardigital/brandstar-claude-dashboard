# BrandStar Claude Dashboard

A lightweight Vercel dashboard for BrandStar's Anthropic organization usage and member reporting.

## Architecture

- `public/index.html` is the browser dashboard.
- `api/proxy.js` is a server-side Vercel function.
- `ANTHROPIC_ADMIN_KEY` must exist only in the Vercel deployment environment; it must never be committed or sent to the browser.
- The proxy permits `GET` requests only to:
  - `/v1/organizations/users`
  - `/v1/organizations/usage_report/messages`
- Unexpected Anthropic paths, query parameters, methods, and cross-site browser requests are rejected.

## Security boundary

The endpoint allowlist and same-origin browser check reduce the proxy's attack surface, but they are not user authentication. Because the repository and its Vercel deployment may be publicly reachable, the accountable owner must either:

1. protect the production deployment with an approved identity-aware access control, or
2. explicitly approve public access after confirming the returned organization data is suitable for public disclosure.

Do not place an access token in `public/index.html` or any other browser-delivered asset. Until the deployment access decision is certified, treat the dashboard's production exposure as an open architecture risk.
