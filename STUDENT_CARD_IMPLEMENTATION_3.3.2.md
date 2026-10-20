# Student Identity and Examination Cards — v3.3.2

## Implemented
- ICT/admin card-management screen at `/admin/student-cards`.
- Authorized staff can edit student identity and placement fields, set a photo URL, upload a JPEG/PNG/WebP photo (5 MB maximum), and issue ID or examination cards.
- Student-facing privacy notice and consent record at the Examination Centre; exam-card generation checks consent and photo availability.
- SQLite additive tables for consent history, card issue history and audit events; additive columns for university student identity, contact, qualification and placement details.
- Card issuance requires a current positive consent record and a student photograph. Exam card issuance also requires academic year and semester.
- Exam card PDF places university logo on the left and student photo on the right, includes programme, faculty/department, cohort, academic year and semester.
- Students can only read their own student-card consent/profile endpoint; authorized ICT/admin roles can manage records.

## Operational notes / limitations
- This project currently uses SQLite; these migrations are additive and do not delete existing data.
- Consent is recorded as an auditable affirmative choice for the specified uses; legal basis and privacy notices should be reviewed by the university's data-protection lead before production use. Declining consent is recorded and prevents official card issuance.
- Uploads are stored under `backend/uploads/student-photos`; production deployments should use protected storage, backups, TLS and a retention policy. Static upload serving follows the existing application convention.
- Student account-to-record linking relies on `students.user_id`; email fallback is only a compatibility fallback and should be reconciled with verified account linking before production.
- Academic qualification documents and national ID/passport numbers should be stored only when necessary, with role-specific access and retention controls. This screen does not collect document scans or sensitive disability details by default.
