# Matara University Timetable Management — 3.3.14

## Included
- ERP-integrated `/admin/timetable` workspace styled around the supplied reference image.
- Live dashboard values calculated from saved timetable entries; unavailable completion/unscheduled metrics are shown as unavailable instead of invented percentages/counts.
- Weekly/day/list views, search and campus/department/semester filters, create/edit/delete class flows, server-side overlap checks, draft/submission workflow, CSV export, audit history, and a constraint-aware draft placement suggestion endpoint.
- SQLite tables `university_timetable_entries` and `university_timetable_audit`, created idempotently on backend startup.
- Role-gated route and APIs. Publishing is reserved to registrar-level/admin roles; generator suggestions are never automatically saved or published.

## Run
From the extracted project root:

```bash
npm run install:all
npm run dev
```

Then sign in and open **Academic → Timetable** (or `/admin/timetable`).

## Important scope notes
- The current repository does not expose a canonical university unit-offering, lecturer availability, cohort enrollment, or room-facility API in a form this module can reliably consume. The page therefore does not fabricate those records; the generator accepts real unit records as JSON and produces draft suggestions only.
- The included generator is a constraint-aware greedy placement starter, not an OR-Tools/CP-SAT optimizer. Full university-scale optimization, room capacity/facility integration, formal approver scopes, email delivery, PDF/XLSX exports, and conflict-free publication transaction workflows need to be completed against the institution's actual academic source tables and policy rules before production deployment.
- Backend automated tests could not fully run in this environment because backend dependencies (including `dotenv`) are not installed in the extracted workspace. JSX transpilation and backend syntax checks are performed separately; run `npm run install:all`, `npm test`, and `npm run build` locally before deployment.
