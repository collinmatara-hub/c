# Matara University ERP v4.0.0 — Release notes and honest verification status

## Implemented in this release package

- Bumped root, frontend and backend package versions to 4.0.0.
- Updated the API health endpoint version to `4.0.0-university-erp`.
- Blocked legacy `parent` accounts at login and at authenticated API middleware, so already-issued parent JWT sessions are denied too.
- Prevented creation of new parent portal accounts through the user administration API.
- Removed automatic creation of the legacy parent demo account on database initialization.
- Added an explicit `npm run migrate:v4 --prefix backend` migration that deactivates existing parent portal accounts, increments their session version and records an audit event. It preserves emergency/guardian contact records and legacy tables rather than deleting potentially useful data.
- Kept existing role-specific workspaces, including the dedicated Timetabling & Scheduling Officer landing page and separate Examination Director workspace.

## Migration instructions

1. Stop the application and make a verified copy of `backend/data/matara.db`.
2. Configure `backend/.env` with a strong `JWT_SECRET` (32+ characters) and the correct environment settings.
3. Install dependencies using `npm run install:all` from the project root.
4. Run `npm run migrate:v4 --prefix backend` to disable legacy parent portal accounts while preserving contact data.
5. Run `npm test` and `npm run build` from the project root before use.
6. Verify account permissions with representative test accounts for each role.

## Known work not honestly claimable as complete

This release does not magically complete every ERP module. The following require additional implementation and validation before production: full endpoint-by-endpoint RBAC and record-scope enforcement; editable/persisted permission administration; full university data-model normalization; a production PostgreSQL migration; complete constraint-optimization timetable engine; complete examination board/result lifecycle testing; production-grade finance/ledger and payment reconciliation; HR/payroll statutory validation; full LMS/library/research/procurement integrations; backup restoration drills; end-to-end tests for every role; security penetration testing; and a verified clean production build. Existing legacy school-oriented tables and APIs may remain for data compatibility, but parent portal access is blocked by the v4 guards.

## Verification status

Source edits and ZIP integrity are checked during packaging. Do not call this production-ready until dependency installation, backend tests, frontend build, migration against a database copy, role-login tests and end-to-end acceptance tests pass in the target environment.
