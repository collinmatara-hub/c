# Timetable Maker (v4.1.0)

Page: `/timetable-maker` (staff) and `/my-timetable` (lecturers and students). API: `/api/timetable-maker`.

## Who can do what (server-enforced, deny by default)
| Role | Access |
|---|---|
| Timetabling Officer | Units, rooms, availability, generate, edit drafts, submit |
| Registrar, Deputy Registrar | View all, approve or return, publish |
| Dean, Deputy Dean | View drafts and published timetables (read only) |
| HOD | View, limited to departments where they are the recorded HOD |
| Super Administrator | View only. Cannot build, approve or publish |
| Lecturer, Academic staff | Own published sessions; set their own unavailable periods |
| Student | Published sessions for units they registered |
| Everyone else | No access |

The person who prepared or submitted a timetable cannot approve it. Published timetables are frozen; to change one, restore it as a new draft and send it through approval again.

## How it works
1. Enter real units (sessions per week, length, class size, lecturer, optional shared-class group), rooms (capacity, type, maintenance periods) and lecturer unavailability.
2. Generate a draft. The engine (`lib/timetableEngine.js`) never double-books a lecturer, room or cohort, respects capacity, room type, maintenance, unavailability, operating hours (08:00-18:00) and a protected break (13:00-14:00), and minimises late classes and gaps. Same seed = same result.
3. Units that cannot be placed are listed with a plain reason. Nothing is invented.
4. Manual moves that create a clash are refused. Moved sessions are locked and kept on regeneration.
5. Submit, approve, publish. Every step is in the history. CSV export respects the same access rules.

## Also changed
- New permissions `timetable.*` in `lib/rbac.js`; the legacy `/api/timetable-management` routes now use them (lecturers can no longer edit timetables there).
- Timetabling Officer now lands on the Timetable Maker and is allowed to write to it.
- Tests: `test/timetable-engine.test.js`, `test/timetable-access.test.js` (46/46 pass overall).

## Not included yet
- Not a CP-SAT/OR-Tools optimiser: it is a seeded heuristic with restarts, so it can report a unit as unplaceable when a cleverer search might fit it.
- No email/SMS notification on publication; no PDF/Excel export (CSV only).
- Dean and Deputy Dean are not limited to their faculty; HOD scope uses `university_departments.hod_id`.
- Examination timetabling is not part of this module.
- The pages were built and compiled but not clicked through in a browser here; run `npm run dev` and try the flow once.
