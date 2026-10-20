# Matara University ERP — RBAC implementation notes

## What changed in this patch

- Added `backend/lib/rbac.js`, a central granular permission catalog using the permission codes in the RBAC specification.
- Added explicit role-to-permission assignments with deny-by-default behavior for unknown roles.
- Added `requirePermission(code)` middleware for converted routes and a fail-closed `scopeAllows()` helper for record-scope checks.
- Applied granular permission checks to result submission, HOD review, examination-board approval, result publication, finance summary, and HR summary endpoints, in addition to their existing role guards.
- Added `/api/role-ops/rbac/me` for the signed-in user's permission set and `/api/role-ops/rbac/catalog` for administrators to inspect the permission/role catalog.
- Updated the Root role description so it does not claim that Root bypasses controls or can make unlogged changes.
- Added focused RBAC unit tests.

## Important architecture and rollout limitations

- This project currently uses SQLite (`better-sqlite3` and SQL tables), not MongoDB. This patch intentionally does not attempt a database migration. A safe SQLite-to-MongoDB migration requires a separate data-model and migration project.
- The current permission registry is code-defined, not yet stored in editable database collections. The role catalog endpoint is read-only; permission editing UI and persisted role-permission assignments are not implemented here.
- The scope helper is available and denies when scope data is absent, but scope assignments are not yet persisted for all users and not every legacy endpoint has been converted to record-level scope enforcement.
- Existing legacy route guards remain in place. This patch is a staged RBAC foundation, not proof that every one of the 71 account entries or every ERP route meets the complete acceptance criteria.
- Do not deploy to production until the complete backend and frontend test suites pass, remaining endpoints are migrated to granular permissions and record scopes, and the account/role mapping is reviewed against real staff assignments.

## Test commands

From `backend/`:

```bash
node --test test/rbac.test.js
npm test
```

Install dependencies first using `npm ci` if `node_modules` is absent.
