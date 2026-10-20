'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync, backup } = require('node:sqlite');

/** Create a consistent SQLite snapshot (including committed WAL data) and verify it before it is advertised as verified. */
async function createVerifiedBackup(sourceDb, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  try { fs.rmSync(destination, { force: true }); } catch (_) {}
  await backup(sourceDb, destination);
  let checkDb;
  try {
    checkDb = new DatabaseSync(destination, { readOnly: true });
    const result = checkDb.prepare('PRAGMA integrity_check').get();
    if (!result || result.integrity_check !== 'ok') throw new Error('SQLite integrity_check failed.');
    const stat = fs.statSync(destination);
    if (!stat.size) throw new Error('Backup file is empty.');
    const hash = crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex');
    return { size: stat.size, sha256: hash, verified: true };
  } catch (error) {
    try { fs.rmSync(destination, { force: true }); } catch (_) {}
    throw error;
  } finally {
    if (checkDb) checkDb.close();
  }
}

function verifyBackupFile(filename) {
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) throw new Error('Backup file not found.');
  const checkDb = new DatabaseSync(filename, { readOnly: true });
  try {
    const result = checkDb.prepare('PRAGMA integrity_check').get();
    if (!result || result.integrity_check !== 'ok') throw new Error('Backup integrity check failed.');
    return true;
  } finally { checkDb.close(); }
}
module.exports = { createVerifiedBackup, verifyBackupFile };
