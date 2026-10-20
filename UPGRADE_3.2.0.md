# Matara University ERP — University Experience Upgrade

This release consolidates the ERP around a university lifecycle rather than a school-management model.

## Added
- Degree Audit with curriculum progress, credits, GPA and graduation-readiness checks.
- Academic Advising notes, risk levels and follow-up dates.
- Graduation & Clearance candidate view.
- University Help & Service Desk with ticket creation and resolution workflow.
- Data Quality Centre for duplicate/incomplete/stalled records.
- Unified University Calendar view.
- New university-experience API module and database tables.
- Cleaner grouped navigation for Academic, Administration, Finance, Operations, Security and Analytics.
- Appearance & Branding naming in place of the generic Editors label.
- University terminology in visible lecturer-facing/admin labels while preserving legacy API compatibility.

## Consolidated / Removed from the user experience
- Removed the legacy Teacher role from the account-creation options; the backend still accepts existing legacy `teacher` accounts for migration compatibility.
- Replaced visible teacher terminology with Lecturer where it is safe to do so.
- Replaced generic Editors navigation with Appearance & Branding.
- Replaced school-style Classes/Boarding labels in the navigation with Cohorts/Sections and Accommodation.
- Kept old URLs/API routes where changing them would break existing installations.

## Security / governance direction
The upgrade follows a deny-by-default, audited workflow approach. Sensitive actions should remain approval-based and security events should be logged without storing passwords, tokens or unnecessary sensitive data.

## Installation
Use Node.js 22.5+.

```bash
npm run install:all
npm run build
npm run dev
```

`install:all` uses the checked-in lockfiles via `npm ci` for reproducible installs.
