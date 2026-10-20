# Matara University ERP — v4.2.3 Audit and Repair Report

## Scope and honest status

This release is a targeted repair of the supplied v4.2.2 source archive. The source was unpacked and inspected before changes. It is **not** a claim that every business module in the master development prompt is production-complete. Dependency installation was not available to completion in this environment, so the full automated suite and Vite production build could not be verified.

## Repository inventory (initial source)

| Module | Frontend | Backend | Database | Initial status | Action/status |
|---|---|---|---|---|---|
| Application foundation | React/Vite routes and shared API client | Express server, middleware, route mounts | SQLite opened through `node:sqlite` | Present; clean install unverified | Added LMS route mount and version metadata; install/build still blocked |
| Authentication | `AuthContext`, `ProtectedRoute`, login pages | `routes/auth.js`, `middleware/auth.js` | `users`, session version and security tables | Present; broad audit still required | Reused; no second login/account store added |
| RBAC | `config/roles.js`, route guards | `lib/roles.js`, authorization middleware | Role/permission tables in existing schema | Present; endpoint-by-endpoint verification incomplete | New LMS endpoints fail closed by role and record ownership |
| Student LMS | `pages/student/LMSDashboard.jsx` | `routes/portal.js`, new `routes/lms.js` | `students`, `unit_registrations`, `assignments`, submissions, results | Previously partial; some dashboard stats not connected to coursework | Student dashboard now uses ERP-backed LMS API; assignment list/submission workflow added |
| Lecturer LMS | `pages/teacher/LMSDashboard.jsx` | legacy teacher dashboard route and new `routes/lms.js` | `teachers`, `classes`, `timetables`, `assignments` | Previously class-teacher-centric | Dashboard now uses scoped LMS API; assignment creation, submission review, marking and feedback release added |
| Academic assessment | Marks, exams and grading pages | `routes/assessments.js`, `routes/onlineExams.js` | `exams`, `grades`, `online_exams`, related tables | Present, but lecturer scoping and workflow audit incomplete | Not represented as fully verified by this release |
| Timetabling/calendar | Timetable/calendar pages | `routes/timetableMaker.js`, `routes/timetableManagement.js`, `routes/calendar.js` | Legacy and university timetable/calendar tables | Present with existing tests | Preserved; not fully re-audited in this pass |
| Finance/accounting | Finance and reports pages | `routes/fees.js`, ERP routes | Fees, payments, invoices/accounting tables | Partial/needs reconciliation audit | No payment-provider production integration claimed |
| Admissions, HR, procurement, library, student services | Existing role pages and generic management screens | ERP and role-operation routes | Existing legacy and university tables | Varying maturity; requires workflow-by-workflow audit | Not declared complete |
| Documents/ID cards/Creative Studio | Student cards, documents and creative pages | `routes/studentCards.js`, `routes/creatives.js`, document/ERP routes | Student profiles, assets and document tables | Present; generator linkage needs further validation | Preserved; not declared complete |
| Help desk/security/privacy | Help desk and security/privacy pages | `routes/security.js`, `routes/privacy.js`, role operations | Ticket/security/privacy/audit tables | Present; full record-scope tests needed | Preserved; not declared complete |
| Backup/deployment | Scripts and runbooks | Scheduled local SQLite copy in server | SQLite file and backup history | Present, but scheduled copy uses fixed backend data path | Production backup/restore test remains required |

## Changes in v4.2.3

- Added `backend/routes/lms.js`, mounted at `/api/lms`.
- Added lecturer LMS dashboard API data from existing lecturer, class, timetable, unit and assignment records.
- Added lecturer assignment list/create endpoints with server-side teaching-allocation checks.
- Added lecturer submission queue and marking endpoints with maximum-mark validation.
- Added an explicit feedback-release step. Student APIs hide marks and feedback until the submission status is `released`.
- Added student LMS dashboard and assignment APIs scoped to the authenticated student's linked record and registered units/classes.
- Tightened the legacy assessment API: lecturer access is scoped to taught subjects, unregistered students are no longer silently added to an empty roster, mark saves require registration or an existing mark, and supplementary decisions are restricted to examination-office roles.
- Added text submission and resubmission handling. Prior submission/marking states are snapshotted in `assignment_submission_history` before updates.
- Added dedicated student and lecturer LMS assignment pages and routes:
  - `/student/lms/assignments`
  - `/lecturer/lms/assignments`
- Connected LMS dashboard requests to the new shared ERP-backed APIs. No duplicate authentication system or separate LMS database was introduced.
- Updated package and health endpoint version metadata to 4.2.3.

## Data migration

The additive `assignment_submission_history` table is created with `CREATE TABLE IF NOT EXISTS` during database module initialization. It does not drop or rewrite existing records. Existing `assignment_submissions` rows remain authoritative for the current submission; the history table stores prior snapshots on resubmission and marking. Back up `backend/data/matara.db` before upgrading any local or production copy.

## Verification results

Environment: Node.js v22.16.0.

- `node --check backend/routes/lms.js`: passed.
- `node --check backend/server.js`: passed.
- `node --check backend/db.js`: passed.
- `node --check backend/routes/assessments.js`: passed.
- `node --check backend/routes/erp.js`: passed.
- Initial backend test run before repair: 16 tests total, 11 passed and 5 failed because `dotenv` was not installed in the unpacked environment. This is an environment/dependency failure, not evidence that those tests passed.
- `npm run build`: blocked; `vite: not found` because frontend dependencies were not installed.
- `npm ci` attempts did not complete in this environment. No successful full test suite or production build is claimed.

## Known limitations / remaining work

1. Re-run `npm ci` for backend and frontend in a network-enabled environment, then run the full tests and `npm run build`; repair any resulting failures.
2. The new assignment submission endpoint currently supports text responses. Secure attachment upload/download, malware scanning, file-size policy and private file delivery remain to be completed and tested.
3. Assignment late-submission exceptions/extensions and rubric-based marking are not implemented in this pass.
4. Quiz question banks, attempt history, server-side timers and manual essay marking require full integration verification.
5. University course offerings/results and the legacy `subjects`/`unit_registrations` model coexist. The authoritative academic source must be selected and migrated carefully before declaring all student/lecturer enrolments consistent.
6. Feedback release is explicit for new LMS submissions, but legacy grading pages may use other statuses; test compatibility before production rollout.
7. Several non-LMS modules (finance/accounting, admissions, HR/payroll, procurement, research, library, accommodation, medical/counselling and graduation) need detailed endpoint, data-integrity and business-workflow tests. This release does not certify them as complete.
8. PostgreSQL migration is not performed. Keep SQLite until a separately planned schema/data migration and recovery test pass.
9. M-Pesa and other external services remain unconfigured; do not enable real payments without provider sandbox verification and institutional credentials.
10. Production deployment, load tests, backup restoration, comprehensive IDOR/security tests and complete frontend end-to-end tests remain release gates.

## Upgrade and run

1. Back up the existing SQLite database and uploads.
2. Extract the updated project into a new folder rather than overwriting the only working copy.
3. Configure `backend/.env` from `.env.example`, including a unique `JWT_SECRET` of at least 32 characters. Never use the example secret in production.
4. From the project root run `npm ci --prefix backend` and `npm ci --prefix frontend` (or `npm run install:all` if that is the established local workflow).
5. Run `npm test`, `npm run build`, and then `npm run dev`.
6. Verify login, student/lecturer role access, assignment submission, marking, feedback release, and that students cannot see unreleased marks or other students' submissions.

## Release status

**Targeted LMS integration delivered; overall ERP release acceptance is not yet met.** Build, full automated tests, broad security review, and non-LMS module completion remain unverified or incomplete as listed above.
