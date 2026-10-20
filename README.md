# Matara University ERP v2.4.0

A university-focused ERP/SIS foundation for Matara University.

## Run locally

Requirements: Node.js 22.5+

```bash
npm run install:all
npm run dev
```

Open `http://127.0.0.1:5173`.

The development launcher creates `backend/.env` with a random JWT secret when it is missing. A demo password is generated on first database seed unless `DEMO_PASSWORD` is set.

## University terminology

The interface uses Faculty, Department, Programme, University Unit, Semester, Reg. No., Lecturer, Enrolment and academic results rather than lower-school terminology.

## Academic core

- University programmes, faculties, departments and units
- Unit offerings with capacity
- Prerequisite checking
- Registration and waitlists
- GPA/CGPA calculation from approved university results
- Lecturer submission → HOD → Examination Board → Senate/publication result workflow
- University audit trail for result changes and approvals
- Student academic record and results portal

## Security and privacy

- Role-based access and ownership checks
- HTTP-only session cookie authentication
- Login throttling and account lockout
- TOTP two-factor authentication and backup codes
- Security Centre and incident workflows
- Security/audit logging without passwords or authentication secrets
- Privacy notice endpoint, consent records and personal-data export requests
- Data-breach register and retention-policy register
- CORS allow-list and security response headers

## Editors and profiles

Administrators can edit institution branding and dashboard imagery. Every authenticated user can change their own profile photo after confirming photo consent.

## Important production work still required

This release still uses the existing Node built-in SQLite database for compatibility. For a high-volume production university deployment, migrate to PostgreSQL, configure real backups/object storage, connect the approved payment provider (such as M-Pesa), configure university email, and perform a full security/integration test before going live.

## Matara University ERP 3.0

Version 3 adds production-oriented foundations for M-Pesa Daraja STK Push, admissions/KUCCPS imports, configurable payroll statutory rules, transcript/certificate verification, Moodle-compatible LMS integration, scheduled/local and optional S3-compatible backups, CI tests, and security checks.

### Payment setup
Set `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `PUBLIC_API_URL`, and `MPESA_CALLBACK_URL`. Use Safaricom sandbox credentials for development and production credentials only in production secrets.

### Object storage setup
Set `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and optionally `S3_ENDPOINT` for S3-compatible providers.

### Payroll
Statutory rules are configurable records with effective dates. Verify Kenyan rates and thresholds with the current official authorities before enabling payroll for production.

### Security testing
Run `npm test`, `npm run build`, and `npm run test:security`. CI runs backend tests, frontend build, and high-severity dependency audit.


## University portal role model (v3.3.17)
The standard university role catalogue no longer includes a Parent/Guardian portal or parent login. Students use their own independent Student Portal. Emergency contacts and next-of-kin can remain administrative contact records without granting portal access. Role-specific dashboards remain subject to server-side authorization.
