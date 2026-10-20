# v4.0.1 stabilisation notes (step 1 of the implementation order)

## Verified in this pass
- `npm run install:all`, `npm test` (28/28 pass) and `npm run build` all succeed on Node 22.22.
- Fixed stale health test (expected 3.2.4, API reports 4.0.0).

## Security fixes
- M-Pesa callback failed OPEN when `MPESA_CALLBACK_SECRET` was unset, so anyone could post a fake "paid" callback. It now fails closed (secret must be 16+ characters, constant-time compare), ignores unknown or already-paid checkouts, and rejects an amount that differs from the stored transaction. The STK request now appends the token to the callback URL.
- `POST /api/auth/forgot-password` now has its own rate limit (10 per 15 minutes per IP, `RESET_RATE_LIMIT_MAX`).
- Rate limiter buckets were shared by every limiter instance; each limiter now has its own.
- Removed leftover `parent` role from role lists (STK payments, calendar, messaging contacts, online exams).

## New tooling
- `npm run audit:routes --prefix backend` lists endpoint guard coverage (`--list` prints unguarded write endpoints).
- `test/route-audit.test.js` proves all 496 API endpoints either sit behind `requireAuth` or are on an explicit public allow-list, and that anonymous requests get 401.

## Still open (not claimable as done)
- 128 data-changing endpoints have only a session check or an inline role check, not a named `requireRole/requireCap/requirePermission` guard. Each needs review and conversion to granular permissions plus record-scope checks.
- No per-role login/landing/permission matrix test yet, and no cross-student or cross-department isolation tests.
- Legacy school routes (`/api/modules/parents`, boarding, dormitories, houses, discipline) are still mounted; parents are blocked at login but the endpoints remain.
- PostgreSQL migration, finance ledger, timetable optimiser and exam lifecycle tests are untouched.
- `npm audit` reports vulnerabilities in dependencies; not yet triaged.
