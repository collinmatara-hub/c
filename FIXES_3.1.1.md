# Matara University ERP v3.1.1 — Critical startup/build fixes

This patch fixes the errors reported when running v3.1.0:

- Shared the local demo password between database seeding and migration so `migrate()` no longer references an undefined `demoPassword`.
- Repaired `frontend/src/pages/admin/Classes.jsx` JSX/JavaScript corruption (`Cohorts / Sections`, `setCohorts / Sections`, and invalid `cohortName` attributes).
- Rebuilt `frontend/src/pages/student/Results.jsx` as valid JSX while preserving the university results, GPA, report-card and supplementary workflow.
- Bumped the release version to 3.1.1.

## Validation

- Backend `db.js` syntax check: passed.
- Backend `server.js` syntax check: passed.
- Full runtime/API and Vite production build could not be executed in this build environment because the packaged source tree does not contain installed `node_modules`.

## Local run

From the extracted project root:

```bash
npm install --prefix backend
npm install --prefix frontend
npm run dev
```

If a previous failed run created `backend/data/matara.db`, keep it if you want to preserve data; the migration is additive. For a clean demo database, stop the backend and remove `backend/data/matara.db`, `backend/data/matara.db-shm`, and `backend/data/matara.db-wal`, then start again.
