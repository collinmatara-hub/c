# Deployment and Recovery Notes — v4.2.3

## Local setup

- Use Node.js `>=22.5.0` (verified runtime for this pass: Node.js v22.16.0).
- Configure `backend/.env` from `backend/.env.example`.
- Set `JWT_SECRET` to a unique random value at least 32 characters long. Do not commit `.env` files or use the example secret in production.
- Install dependencies with `npm ci --prefix backend` and `npm ci --prefix frontend`.
- Run `npm test`, `npm run build`, then `npm run dev`.

The build and full test suite could not be completed in the environment used to prepare this archive because dependencies (`dotenv` and `vite`) were not available and installation did not complete. Re-run these commands in a network-enabled environment before accepting the release.

## Backup before upgrade

1. Stop the backend to avoid copying a database during active writes.
2. Copy `backend/data/matara.db` to a timestamped backup outside the project folder.
3. Back up `backend/uploads/` and any configured external storage.
4. Verify the backup file exists and is non-empty before changing the original database.
5. Keep the original project folder intact until the new project has passed migration, login, LMS workflow and restore checks.

Example PowerShell backup command (run from the project root):

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force -Path "backup-$stamp" | Out-Null
Copy-Item "backend/data/matara.db" "backup-$stamp/matara.db"
Copy-Item "backend/uploads" "backup-$stamp/uploads" -Recurse
Get-Item "backup-$stamp/matara.db" | Select-Object FullName, Length
```

## Restore

1. Stop the backend.
2. Preserve the current database and uploads as a separate forensic/recovery copy.
3. Restore the verified backup to `backend/data/matara.db` and the corresponding uploads directory.
4. Start the backend and verify `/api/health`, login, core dashboard access and LMS reads.
5. Do not test restoration over the only copy of live data.

## Production deployment gates

- Use HTTPS and production secure cookies.
- Restrict CORS to approved origins.
- Keep secrets in environment variables or a secret manager.
- Use private persistent storage for student work and documents.
- Test database backup/restore and migration rollback.
- Configure and test external payment integrations in provider sandbox first.
- PostgreSQL migration is not included in v4.2.3; do not point this SQLite schema at PostgreSQL without a separately tested migration.
