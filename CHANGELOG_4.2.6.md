# Changelog — v4.2.6

- Fixed student ownership enforcement on transcript/document listings.
- Bound student M-Pesa initiation to the authenticated student's linked record.
- Allowed same-origin camera, microphone and display capture in Permissions-Policy for online classes.
- Added consistent SQLite online backups and integrity verification before recording a backup as verified.
- Added SHA-256 digest to backup creation response and audit details.
- Validated backup integrity before restore.
- Unified backup paths with `MATARA_DATA_DIR`.
- Added idempotent backup metadata column migrations.
- Added backup tests for data preservation and invalid database rejection.
- Added LMS/LiveKit environment variables to `.env.example`.
- Added the audit report and explicit release limitations.
