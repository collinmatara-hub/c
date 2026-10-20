# University Calendar (v4.2.0)

Page: `/calendar` (everyone; "Manage events" tab for officers). API: `/api/calendar`. Policy: `backend/lib/calendarPolicy.js`.

## Who manages what
| Category | Creates / proposes | Approves and publishes |
|---|---|---|
| Academic calendar (semesters, registration, add/drop, graduation) | Registrar, Deputy Registrar | Deputy VC, Vice Chancellor |
| Examinations | Examinations Director, Examination Officer | Registrar, Deputy VC, Vice Chancellor |
| Public holidays and closures | Registrar, HR Director | Deputy VC, Vice Chancellor |
| Senate, Council, committees | Registrar | Vice Chancellor, Deputy VC |
| Faculty events | Dean, Deputy Dean | same (publish directly) |
| Student life | Dean of Students, Student Affairs Officer | same |
| Staff and HR events | HR Director | same |
| University-wide events | Vice Chancellor, Deputy VC | same |

Everyone else, including the Super Administrator, can only read. To change who owns a category, edit `calendarPolicy.js`.

## Rules
- Drafts and pending events are visible only to the officers of that category.
- Published events are visible by audience: everyone, students, staff, or lecturers.
- Only the publishing officer can change or cancel a published event (a reason is required). Published events are cancelled, never deleted, so history is kept.
- Publishing, changing or cancelling notifies the audience through the existing notifications.
- Two semesters in one academic year cannot overlap.
- `.ics` export of the events a person may see, for phones, Outlook and Google Calendar.
- Events from the old calendar table are carried over once as published university-wide events.

## Not included yet
- Faculty or department targeting (audiences are everyone, students, staff, lecturers).
- No email or SMS; notifications are in-app only, and `reminder_days` is stored but not yet scheduled.
- No Senate vote workflow; the VC or DVC approves academic dates.
- The old `/api/university-experience/calendar` endpoint still exists but the page no longer uses it.
