// lib/gradeLock.js
// The Examinations Director sets a grading deadline or switches the Grade Lock on.
// While it is on, lecturers, teaching assistants and lab technicians cannot enter
// or change marks. Admins and the examinations office are not affected.
const { db } = require('../db');
const { ACADEMIC_KEYS } = require('./roles');

const KEY = 'grade_lock';

function readLock() {
  const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(KEY);
  let data = {};
  try { data = JSON.parse(row?.value || '{}'); } catch { data = {}; }
  const deadline = data.deadline || null;
  const deadlinePassed = deadline ? new Date(deadline).getTime() < Date.now() : false;
  return { manual: Boolean(data.locked), deadline, deadlinePassed, locked: Boolean(data.locked) || deadlinePassed, locked_by: data.locked_by || null, locked_at: data.locked_at || null };
}

function writeLock(data) {
  db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(KEY, JSON.stringify(data));
}

// Add to any route that lets teaching staff enter or change marks.
function gradeLockGuard(req, res, next) {
  const actual = req.user && req.user.actual_role;
  if (actual && ACADEMIC_KEYS.includes(actual)) {
    const lock = readLock();
    if (lock.locked) {
      return res.status(423).json({ error: lock.deadlinePassed && !lock.manual ? 'The grading deadline has passed. Marks are locked.' : 'Grade Lock is on. Marks can no longer be entered or changed.' });
    }
  }
  next();
}

// Teaching assistants and lab technicians may only use the assessment (CAT / practical)
// marks screen. Routes that submit final results are closed to them.
function noAssistantMarks(req, res, next) {
  const actual = req.user && req.user.actual_role;
  if (actual === 'teaching_assistant' || actual === 'lab_technician') {
    return res.status(403).json({ error: 'Teaching assistants and lab technicians cannot submit or change final exam marks.' });
  }
  next();
}

module.exports = { readLock, writeLock, gradeLockGuard, noAssistantMarks };
