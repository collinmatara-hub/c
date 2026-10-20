# Matara University ERP 4.2.1 — Dedicated student LMS portal

## What changed
- Added a dedicated authenticated React route at `/student/lms` using the existing `ProtectedRoute` and existing ERP session.
- Added “Learning Management System” to the student ERP sidebar and “My LMS” to the student dashboard shortcuts.
- Added an independent LMS shell and navigation, welcome area, academic summary tiles, course cards, deadlines, announcements entry point, quick links, study tips, responsive layouts, and light/dark theme toggle.
- “Back to Student Portal” returns to `/student`; browser history remains managed by React Router.
- Reuses the existing `/api/portal/overview` API and current API client/session. No duplicate users, login, database, or schema migrations were added.

## Files
- `frontend/src/App.jsx` — lazy-loaded LMS page and protected route.
- `frontend/src/config/nav.js` — student LMS navigation item.
- `frontend/src/pages/student/Dashboard.jsx` — student dashboard shortcut.
- `frontend/src/pages/student/LMSDashboard.jsx` — dedicated LMS experience.
- `frontend/src/styles/lms.css` — isolated LMS visual system and responsive/dark styling.

## Run
From the project root, run `npm install:all`, then `npm run dev`. Student accounts can open `/student/lms` after logging into the ERP.

## Verification and limitations
- Route protection is frontend-enforced with the existing student role guard. The dashboard calls the existing `/api/portal/overview` endpoint, whose existing authorization tests cover unauthenticated and unauthorized access. Do not treat frontend guards as a substitute for backend authorization.
- No database migrations were required.
- The ZIP provided here did not contain installed frontend dependencies in the extracted working copy, and dependency installation timed out in this execution environment; therefore a successful production build or automated test run could not be confirmed here.
- The current `portal/overview` payload is the only source used for LMS summary data. Where it does not provide LMS-specific course-progress, assignment/deadline, GPA, or unread-count fields, the interface displays an em dash or a clear empty state instead of fabricating records. Several shortcuts intentionally reuse the ERP's existing units, content, exams, results, messages, announcements, calendar, profile, and help pages; a full assignment/discussion/LMS authoring backend is not claimed by this change.
- Campus banner image uses a CSS fallback if `/assets/matara-campus.jpg` is not present; place an authorized campus image at that public path to show the photographic banner/sidebar background.
