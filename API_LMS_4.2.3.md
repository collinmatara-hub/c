# LMS API — v4.2.3

All endpoints are mounted under `/api/lms` and use the existing ERP session (`matara_session` HTTP-only cookie or the application's existing bearer-token convention). They do not issue LMS-specific credentials.

## Lecturer endpoints

| Method | Path | Purpose | Authorization |
|---|---|---|---|
| GET | `/lecturer/dashboard` | Assigned classes, students, timetable, assignments and pending marking count | Lecturer role with linked `teachers.user_id` record |
| GET | `/lecturer/assignments` | Assignments owned by the authenticated lecturer | Lecturer role and own teacher record |
| POST | `/lecturer/assignments` | Create assignment for an assigned class/subject | Lecturer role; class/subject assignment checked server-side |
| GET | `/lecturer/assignments/:id/submissions` | List submissions for an assignment | Assignment must belong to authenticated lecturer |
| PUT | `/lecturer/submissions/:id/mark` | Save marks and feedback | Submission must belong to lecturer; marks must be within assignment maximum |
| PUT | `/lecturer/submissions/:id/release` | Release saved feedback to the student | Submission must belong to lecturer and have marks saved |

`POST /lecturer/assignments` JSON fields: `title` (required), `class_id` (required), `subject_id` (required), `description` (optional), `due_date` (optional ISO date/time), `max_marks` (optional; defaults to 100).

`PUT /lecturer/submissions/:id/mark` JSON fields: `marks` (required numeric score from 0 through the assignment maximum), `feedback` (optional string).

## Student endpoints

| Method | Path | Purpose | Authorization |
|---|---|---|---|
| GET | `/student/dashboard` | Own student identity, registered units, own assignment states, published GPA when available and deadlines | Student role and active linked student record |
| GET | `/student/assignments` | Assignments available through own class/registered units; own submission state only | Student role and active linked student record |
| POST | `/student/assignments/:id/submit` | Submit or resubmit text response | Student must be enrolled/assigned to the activity; deadline checked server-side |

`POST /student/assignments/:id/submit` JSON field: `content` (required text, max 50,000 characters). Resubmission overwrites the current submission but snapshots the previous state in `assignment_submission_history`.

## Security behavior

- Missing/invalid sessions are rejected by the shared `requireAuth` middleware.
- Role and record ownership are checked server-side.
- Students cannot query another student's submission through these endpoints.
- Lecturer submission/mark/release actions are scoped to assignments belonging to their linked lecturer record.
- Marks and feedback are returned to students only after submission status becomes `released`.
- Changes are audited in `audit_logs`.

## Current API limitations

Text-only submissions are supported by this new workflow. Attachment upload, secure private attachment delivery, extension approvals, rubric-based marking and LMS quiz attempt workflows are not yet implemented by these endpoints. Legacy routes may have separate behavior and must be reviewed before production rollout.
