# Matara University ERP 3.2.3 - role model wired in

The role list (Super Administrator through Gate Guard, 9 categories) was already defined in
`backend/lib/roles.js`, `backend/routes/roleOps.js` and `frontend/src/pages/RoleDesk.jsx`, but the
rest of the system was not connected to it. This release connects it.

## Backend
- `db.js`: users table now accepts every role (rebuilt safely on first start, data kept); new tables for
  financial holds, gate scans, campus bans, exam attendance, malpractice, suspensions, readmission,
  curve suggestions, senate, gowns, API keys, job runs and counselling notes; `MATARA_DATA_DIR` supported.
- `middleware/auth.js`: real role vs inherited role, `requireCap`, API-key sign-in for Machine Users,
  read-only roles, `write_allow` roles (Transcript Clerk), suspended students locked to their notice,
  temporary access expiry, read-only "view as user".
- `routes/auth.js`: machine accounts cannot use a password; expired temporary accounts cannot sign in; `/auth/me` returns the real role.
- `routes/users.js`: Helpdesk L1 (list, reset password, unlock, contact details) and L2 (also change roles);
  only admins touch admin accounts; temporary roles need an end date; new `POST /users/:id/unlock`.
- Grade Lock and TA/Lab Technician limits on marks, exams, grades and result submission.
- Financial holds block unit registration and document issue.
- `roleOps` mounted at `/api/role-ops`; health version 3.2.3; `RATE_LIMIT_MAX` setting.

## Frontend
- `config/roles.js` now reads the generated catalogue; menus and route access follow the inherited role.
- New "My Role Desk" page (`/desk`) with a status page for suspended / deferred students and holds.
- Grouped role pickers, access-end date for temporary roles, "viewing as" banner with a return button.

## Tests
`npm test --prefix backend` : 20 of 20 pass (was 2 of 20).

## 3.2.6
- Vice Chancellor: new Executive Dashboard (/vc) with total revenue, enrolment, graduation rate; role is now view-only.
- Fixed effects that crashed the Help Desk, Data Quality and Admin Dashboard pages.
