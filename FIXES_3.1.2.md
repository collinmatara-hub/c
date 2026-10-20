# Matara University ERP v3.1.2 — Critical Fixes

## Fixed
- Demo authentication now uses a deterministic local demo password when `DEMO_PASSWORD` is not supplied: `MU-Demo-2026`.
- Added `backend/reset-demo.js` and `npm run reset:demo` to reset the standard demo accounts without deleting university data.
- Removed duplicate demo-password logging during migration/seed.
- Fixed the Academic Cohorts / Sections page to call the existing `/api/classes` backend route instead of the nonexistent `/api/cohorts` route.
- Retained the repaired `CohortsSections` component name and valid JSX.
- Retained the repaired Student Results JSX.

## Demo accounts

Default local demo password:

`MU-Demo-2026`

Accounts:
- `admin@matara.ac.ke`
- `otieno@matara.ac.ke`
- `achieng@matara.ac.ke`
- `kiptoo@matara.ac.ke`
- `amani@matara.ac.ke`
- `parent@matara.ac.ke`

Set `DEMO_PASSWORD` in `.env` if you want a different local/demo password.

## Verification performed
- Backend JavaScript syntax checked for every backend JS file.
- Frontend JavaScript/JSX parse checked for all source JS/JSX files using the installed TypeScript parser: 0 parse errors.
- Fresh SQLite initialization/seed test completed with the database schema and demo roles, including parent migration.
- Demo password hash/verification test completed successfully using the same password value.
- `/api/classes` route was verified in source and the frontend was corrected to use it.

## Environment limitation
A full `npm install` could not complete in the build environment before the command timeout, so a full Vite production build and live HTTP integration test could not be honestly claimed here. The release therefore includes the source-level and database-level checks above rather than falsely reporting a full browser/integration test.
