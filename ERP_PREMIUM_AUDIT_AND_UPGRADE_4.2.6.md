# Matara University ERP — Premium Audit & Upgrade 4.2.6

## Release status

**Status: partial hardening release; NOT certified production-ready.** This work preserves the existing React/Vite + Express + SQLite architecture and existing data. It does not claim that every university workflow in the full master specification is complete.

## Baseline inspected

- Backend: `backend/server.js`, `backend/db.js`, authentication middleware, role/permission registry, LMS and university route groups.
- Frontend: React/Vite application routes, role dashboards and LMS entry points.
- Database: additive university extension schema on top of legacy school-era tables.
- Tests: existing Node test suite, RBAC tests, timetable engine tests and the new backup tests.
- Runtime: Node.js 22.16.0 in the audit environment.

## Prioritized defect register

| Severity | Finding | Action in 4.2.6 | Verification / remaining work |
|---|---|---|---|
| Critical | Student document endpoint relied on an optional `req.user.student_id`; if absent, student ownership was not enforced. | Resolve the official student record by authenticated `user_id`, deny unlinked student accounts, and compare requested record ID server-side. | Source syntax check passed. Full HTTP integration test still required after dependency installation. |
| Critical | Student M-Pesa request could prefer caller-supplied `student_id` over the authenticated student's linked record. | Student requests now bind to their own linked student ID and reject mismatches. Finance roles can still specify an account under their route permissions. | Source syntax check passed. Provider sandbox test requires credentials. |
| High | `Permissions-Policy` explicitly disabled camera and microphone, conflicting with browser-based online classes. | Permit camera, microphone and display capture for same-origin application use; continue denying geolocation. | Header source check; verify browser behavior on HTTPS in target deployment. |
| High | Backup code copied only `matara.db` while SQLite WAL mode was enabled, then marked the backup verified without integrity verification. | Added SQLite online backup API snapshots, `PRAGMA integrity_check`, SHA-256 output, and only records a verified backup after checks pass. Backup restore validates the file before replacement. | Two new backup unit tests pass. Full restore rehearsal on a copied deployment is still required. |
| High | Backup routes ignored `MATARA_DATA_DIR`, potentially backing up or restoring a different file from the active database. | Exported the configured database directory and updated backup/restore paths to use it. | Source syntax check passed; test with custom `MATARA_DATA_DIR` before production. |
| High | Legacy and extension `backup_history` table definitions drifted; later backup code expects `storage` and `remote_key` columns that may not exist on upgraded databases. | Added idempotent additive column migration for `storage`, `remote_key`, and `created_by`. | Must be exercised against copies of real prior-version databases before release. |
| Medium | The LMS is a separate SQLite store but depends on the ERP for identities, student linkage and teaching authorization. | Kept that split explicit; added LiveKit environment variables to `.env.example`. | LiveKit credentials and a configured server are still external deployment prerequisites. |
| High | Baseline dependency install was incomplete in the execution environment; some packages were empty directories after an interrupted install. | No dependency binaries are included in the delivery. Lockfiles are preserved. | `npm ci`/frontend build could not be confirmed in this environment; run on a networked machine. |
| High | The legacy core schema still contains school-oriented `teachers`, `classes`, `adm_no` and parent tables alongside university extensions. | No destructive schema rewrite was attempted. | Requires a separately planned, reviewed, reversible migration to a canonical university model. |
| High | Granular RBAC catalogue exists, but legacy routes still use route-specific role guards and are not all proven to use centralized permissions plus record scopes. | No blanket authorization rewrite was attempted because it could lock out legitimate roles or grant unintended access. | Full endpoint-by-endpoint authorization matrix and integration tests remain mandatory. |

## Changes made

- `backend/lib/backup.js`: consistent SQLite online backups, integrity verification, SHA-256 digest, and backup file verification.
- `backend/test/backup.test.js`: verifies committed data survives backup and malformed files are rejected.
- `backend/server.js`: allows same-origin camera/microphone/display capture, and scheduled backups use the online backup API and configured data directory.
- `backend/db.js`: additive migration for backup metadata columns; exports `dataDir` for shared path correctness.
- `backend/routes/v3.js`: verified manual backups; student M-Pesa requests are tied to the authenticated student's record; transcript/document list ownership enforced against the database.
- `backend/routes/adminControl.js`: verified admin backup creation and pre-restore integrity check; uses configured data directory.
- `backend/.env.example`: documents `MATARA_DATA_DIR`, `MATARA_LMS_DATA_DIR`, and LiveKit configuration variables.

## Tests actually run

- `node --check` across all backend JavaScript files: **passed**.
- `node --test backend/test/backup.test.js backend/test/rbac.test.js backend/test/timetable-engine.test.js`: **13 passed, 0 failed**.
- Full suite `node --test backend/test/*.test.js`: **not passing in this environment**. Five test files failed to load because the interrupted dependency installation left `dotenv` as an empty directory. The remaining tests in that run passed. This is an environment/dependency blocker, not evidence those five workflows pass.
- Frontend production build: **not run successfully**; frontend dependencies are not installed in this environment.
- LiveKit/video conference: **not end-to-end verified**; valid LiveKit URL and API credentials plus HTTPS are required for real multi-user media.
- Full restore drill, payment provider sandbox, and full role/API matrix: **not run**.

## Migration and recovery notes

The migration only adds missing columns to `backup_history`; it does not delete records or rebuild user/student tables. Back up the existing `backend/data` directory before deploying. To use a custom data directory, set `MATARA_DATA_DIR` before startup. Keep `MATARA_LMS_DATA_DIR` separate if the LMS store should live on a different persistent volume.

For a restore, use a verified backup and rehearse on a copy of the deployment first. The API tells the operator to restart after restoration; do not restore against the only production copy without a maintenance window and a second recovery copy.

## Still required before production

1. Complete a clean `npm ci` for backend and frontend and pass the full suite plus `npm run build`.
2. Run HTTP integration tests for student-vs-student IDOR, lecturer course ownership, finance permissions and export/download authorization.
3. Inventory all route guards and enforce explicit backend record scope for every sensitive endpoint.
4. Reconcile legacy school-era tables with the university domain through reversible migrations, after profiling existing real data.
5. Test financial reconciliation and academic GPA/grade policy against approved university rules; no policy was invented here.
6. Test document generation, secure upload/download, backup restore, and LiveKit conferencing in a staging deployment.
7. Review CORS, CSRF/session strategy, upload isolation, secrets and operational logging in the actual deployment environment.
8. Complete role-by-role end-to-end tests for admissions, enrolment, examinations, fees, procurement, HR, support, ID cards and reports.

This release improves specific, observed integrity and security defects. It is not a declaration that the full master specification has been completed.
