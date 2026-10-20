# Production runbook

1. Set a 32+ character `JWT_SECRET`.
2. Set `NODE_ENV=production` and HTTPS-only public URLs.
3. Configure a restricted `CORS_ORIGIN` list.
4. Configure Daraja production credentials and `MPESA_CALLBACK_SECRET`.
5. Configure SMTP and verify password-reset delivery.
6. Configure object storage with a dedicated least-privilege bucket/user.
7. Run a backup and verify it can be restored before opening the service.
8. Run the CI suite and dependency audit.
9. Run an authorized DAST scan against staging, never against an unrelated system.
10. Review audit logs and failed-login alerts.
11. Verify role/ownership checks with test accounts for every university role.
12. Only then promote the release to production.

## University ERP production checklist

13. Prefer PostgreSQL for production/high-volume deployments; keep SQLite for local/demo use until the PostgreSQL migration is completed and validated.
14. Map and test the full prospect → applicant → admission → enrolment → active student → graduation → alumni lifecycle.
15. Verify degree-audit curriculum rules, prerequisites, credit requirements and result publication workflows before opening registration.
16. Verify that grade changes, fee waivers/refunds, programme transfers, graduation clearance and privileged permission changes require authorization and create audit records.
17. Configure data-quality checks and review duplicate/incomplete records before migration or go-live.
18. Configure the Help Desk queue, service ownership and escalation targets.
19. Test backups by performing an actual restore; a successful file copy alone is not sufficient evidence of recoverability.
20. Target OWASP ASVS Level 2 controls for the application and apply stronger controls to high-value financial, health and privileged operations.
