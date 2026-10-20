# PostgreSQL production migration

Version 3.1 keeps SQLite for local compatibility. Do not expose the SQLite file to an internet-facing multi-user production deployment.

The next production database phase should migrate all tables to PostgreSQL and replace synchronous `db.prepare()` calls with a repository/data-access layer. The API contract should remain unchanged so the React frontend does not need to be rewritten.

Recommended production stack:
- PostgreSQL 16+
- managed backups / point-in-time recovery
- private database network
- object storage for uploads/backups
- application server with HTTPS
- separate staging and production databases

Migration acceptance criteria:
1. schema migration is repeatable from an empty database;
2. seed data is development-only;
3. every foreign key and unique constraint is preserved;
4. transactions are real database transactions;
5. pagination is mandatory for large list endpoints;
6. backup restore is tested on a disposable database;
7. no student/staff personal data is used in CI fixtures.
