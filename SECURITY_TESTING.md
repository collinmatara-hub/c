# Security testing

Version 3 includes CI checks, login throttling, HTTP-only sessions, CORS allow-listing, security headers, RBAC/ownership checks, audit logging, and dependency auditing.

Run locally:

```bash
npm test
npm run build
npm run test:security
```

For a production deployment, perform an authorized DAST/API assessment against a staging environment with OWASP ZAP or Burp Suite, including authentication, IDOR/BOLA, file upload, rate limits, CSRF/session handling, CORS, injection, access-control matrix, payment callback validation, and backup/object-storage access. Do not run intrusive tests against production without written authorization.
