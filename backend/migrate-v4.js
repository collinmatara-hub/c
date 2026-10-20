'use strict';
// Explicit, reversible-by-admin data-preserving v4 migration.
// It disables legacy parent portal logins but does not delete contact records or parent tables.
require('dotenv').config();
const { db, init } = require('./db');
init();
const rows = db.prepare("SELECT id, email FROM users WHERE lower(role)='parent' AND active<>0").all();
const apply = db.transaction(() => {
  const update = db.prepare("UPDATE users SET active=0, session_version=COALESCE(session_version,1)+1 WHERE id=?");
  const audit = db.prepare("INSERT INTO audit_logs(user_id, action, entity, entity_id, details) VALUES(NULL, 'v4_parent_portal_disabled', 'user', ?, ?)");
  for (const row of rows) {
    update.run(row.id);
    audit.run(row.id, `Legacy parent portal account disabled during v4 migration: ${row.email}`);
  }
});
apply();
console.log(`Matara University ERP v4 migration complete. Disabled ${rows.length} legacy parent portal account(s); preserved student contact records.`);
