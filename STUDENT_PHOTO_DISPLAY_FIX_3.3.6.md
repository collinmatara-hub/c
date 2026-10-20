# Student photo display fix — v3.3.6

## Fixed
- Student Card Management now resolves stored `/uploads/student-photos/...` paths against the application root instead of resolving them relative to `/admin/student-cards`.
- Vite development server proxies `/uploads` to the backend, matching the existing backend static file route.
- PDF photo loading now uses the configured API base when present and otherwise uses same-origin `/uploads` paths, avoiding an unconditional `localhost:5000` dependency in same-origin deployments.
- Successful photo uploads update the preview immediately and update the selected student state as well as the stored student/profile photo URLs.

## Verification
- `node --check backend/routes/studentCards.js` passed.
- Full frontend build/browser verification requires installing frontend dependencies and running the application against the user's configured backend/database.
