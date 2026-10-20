# Matara University ERP 4.2.2 — Dedicated Lecturer LMS Portal

## Implemented
- Added the `My LMS` item to the academic/lecturer navigation.
- Added the protected `/lecturer/lms` route using the existing `ACADEMIC_ROLES` access policy.
- Created a standalone lecturer LMS layout with its own sidebar, theme toggle, search, welcome banner, class/student/marking/timetable summaries, teaching activities, assignments, student roster, and quick actions.
- Added a `Back to ERP Portal` link that returns to the existing `/teacher` workspace in the same tab and preserves the ERP session.
- Reuses the existing `/erp/teacher/me/dashboard` endpoint and existing lecturer modules for materials, grading, online exams, attendance, marks, announcements, messages, calendar, and profile.
- Expanded the dashboard endpoint's explicit role check to recognize lecturer, senior lecturer, professor, and academic staff roles while continuing to load non-admin data only from the teaching record linked to the signed-in user.

## Existing data-model limitation
The current endpoint is backed by the ERP's legacy `teachers`, `classes`, `students`, `timetables`, and `assignments` tables. It does not yet model every university LMS concept in the lecturer prompt (for example, course-topic progress, per-submission marking queue, question banks, and rubric workflows). The dashboard reports empty or unavailable data rather than inventing records. Existing linked modules are reused for actions; this change does not claim to implement all of those advanced workflows from scratch.

## Files changed
- `frontend/src/App.jsx`
- `frontend/src/config/nav.js`
- `frontend/src/pages/teacher/LMSDashboard.jsx` (new)
- `backend/routes/erp.js`

## Run and verify
From the project root:

```bash
npm run install:all
npm run dev
```

Sign in with an authorized academic account and select **My LMS**, or open `/lecturer/lms`. Use **Back to ERP Portal** to return to `/teacher`.

Build verification was attempted in the packaging environment, but dependency installation did not complete; therefore a successful frontend build and end-to-end tests are **not confirmed**. Run `npm run build` and `npm test` locally after dependency installation.
