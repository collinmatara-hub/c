// routes/roleOps.js
// The powers that belong to one role only: grade lock, financial holds, gate scans,
// exam invigilation, discipline, readmission, senate, graduation, helpdesk checks,
// audit overview, API keys, impersonation and a read-only SQL console.
//
// Every route checks the account's real role (req.user.actual_role) through
// requireCap, so a role never gains these powers by inheriting an older role.

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { requireAuth, requireCap, hashKey } = require('../middleware/auth');
const { getRole, hasCap, ROLES } = require('../lib/roles');
const { PERMISSIONS, permissionsForRole } = require('../lib/rbac');
const { readLock, writeLock } = require('../lib/gradeLock');
const { activeHold } = require('../lib/holds');

const router = express.Router();
router.use(requireAuth);

const JWT_SECRET = process.env.JWT_SECRET;

// ---------- helpers ----------

function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function wrap(fn) {
  return (req, res) => {
    try { const out = fn(req, res); if (out !== undefined) res.json(out); }
    catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      console.error(err);
      res.status(500).json({ error: 'Something went wrong on the server.' });
    }
  };
}
const clean = (v) => (v === undefined || v === null ? null : (String(v).trim() || null));
const toId = (v) => { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; };
function audit(req, action, entity, entityId, details) {
  try { db.prepare('INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?,?,?,?,?)').run(req.user.id, action, entity, entityId || null, details || ''); } catch (_) {}
}
function tx(work) {
  db.exec('BEGIN');
  try { const out = work(); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
function anyCap(req, caps) { return caps.some((c) => hasCap(req.user.actual_role, c)); }

// Finds a student by id or by registration number.
function findStudent(input) {
  const id = toId(input.student_id);
  if (id) return db.prepare('SELECT * FROM students WHERE id = ?').get(id) || fail('Student not found.', 404);
  const code = clean(input.code);
  if (code) return db.prepare('SELECT * FROM students WHERE UPPER(adm_no) = UPPER(?)').get(code) || fail('No student has that registration number.', 404);
  return fail('Give a student.');
}

// Finds the user behind a scanned code: student reg no, staff/lecturer number or email.
function findPersonByCode(code) {
  const c = clean(code);
  if (!c) return null;
  const student = db.prepare('SELECT s.id, s.name, s.status, s.user_id FROM students s WHERE UPPER(s.adm_no) = UPPER(?)').get(c);
  if (student) return { kind: 'student', name: student.name, status: student.status, user_id: student.user_id, student_id: student.id };
  const staff = db.prepare('SELECT name, user_id, status FROM staff WHERE UPPER(employee_no) = UPPER(?)').get(c);
  if (staff) return { kind: 'staff', name: staff.name, status: staff.status || 'active', user_id: staff.user_id };
  const teacher = db.prepare('SELECT name, user_id FROM teachers WHERE UPPER(staff_no) = UPPER(?)').get(c);
  if (teacher) return { kind: 'staff', name: teacher.name, status: 'active', user_id: teacher.user_id };
  const user = db.prepare('SELECT id, name FROM users WHERE LOWER(email) = LOWER(?)').get(c);
  if (user) return { kind: 'staff', name: user.name, status: 'active', user_id: user.id };
  return null;
}

// ---------- my role ----------

router.get('/me', wrap((req) => {
  const role = getRole(req.user.actual_role) || {};
  const account = db.prepare('SELECT access_expires_at FROM users WHERE id = ?').get(req.user.id);
  return {
    role: req.user.actual_role, label: role.label, description: role.description, category: role.category,
    caps: role.caps || [], read_only: Boolean(role.read_only), temporary: Boolean(role.temporary),
    access_expires_at: account?.access_expires_at || null, impersonated_by: req.user.imp || null,
  };
}));

// What a student sees about their own state (suspended, deferred, holds).
router.get('/my-status', wrap((req) => {
  const student = db.prepare('SELECT id, name, adm_no, status FROM students WHERE user_id = ?').get(req.user.id);
  if (!student) return { student: null };
  const suspension = db.prepare('SELECT kind, reason, hearing_date, imposed_at FROM student_suspensions WHERE student_id = ? AND ended_at IS NULL ORDER BY id DESC LIMIT 1').get(student.id) || null;
  const hold = activeHold(student.id);
  const readmission = db.prepare('SELECT id, reason, status, requested_at, decision_note FROM readmission_requests WHERE student_id = ? ORDER BY id DESC LIMIT 1').get(student.id) || null;
  return { student, suspension, hold: hold ? { reason: hold.reason, amount: hold.amount, placed_at: hold.placed_at } : null, readmission };
}));

// ---------- grade lock ----------

router.get('/grade-lock', wrap(() => {
  const lock = readLock();
  const by = lock.locked_by ? db.prepare('SELECT name FROM users WHERE id = ?').get(lock.locked_by) : null;
  return { ...lock, locked_by_name: by?.name || null };
}));

router.put('/grade-lock', requireCap('grade.lock'), wrap((req) => {
  const locked = Boolean(req.body.locked);
  const deadline = clean(req.body.deadline);
  if (deadline && Number.isNaN(new Date(deadline).getTime())) fail('Enter a valid deadline.');
  writeLock({ locked, deadline, locked_by: req.user.id, locked_at: new Date().toISOString() });
  audit(req, locked ? 'grade_lock_on' : 'grade_lock_off', 'grade_lock', null, `Grade lock ${locked ? 'switched on' : 'switched off'}${deadline ? `, deadline ${deadline}` : ''}`);
  return readLock();
}));

// ---------- student lookup for desks ----------

router.get('/lookup/students', wrap((req) => {
  if (!anyCap(req, ['holds.manage', 'exam.invigilate', 'malpractice.view', 'discipline.act', 'graduation.clear', 'readmission.review', 'counselling.notes', 'campus.ban'])) fail('Your role does not include this action.', 403);
  const q = `%${clean(req.query.q) || ''}%`;
  return db.prepare("SELECT id, adm_no, name, status FROM students WHERE name LIKE ? OR adm_no LIKE ? ORDER BY name LIMIT 25").all(q, q);
}));

// ---------- financial holds ----------

router.get('/holds', requireCap('holds.manage'), wrap(() => db.prepare(`
  SELECT h.*, s.name student_name, s.adm_no, u.name placed_by_name FROM financial_holds h
  JOIN students s ON s.id = h.student_id LEFT JOIN users u ON u.id = h.placed_by
  ORDER BY (h.released_at IS NULL) DESC, h.id DESC LIMIT 200`).all()));

router.post('/holds', requireCap('holds.manage'), wrap((req, res) => {
  const student = findStudent(req.body);
  const reason = clean(req.body.reason) || fail('Give a reason for the hold.');
  if (activeHold(student.id)) fail('This student already has an active financial hold.');
  const amount = req.body.amount === '' || req.body.amount == null ? null : Number(req.body.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) fail('Amount must be zero or more.');
  const r = db.prepare('INSERT INTO financial_holds (student_id, reason, amount, placed_by) VALUES (?,?,?,?)').run(student.id, reason, amount, req.user.id);
  audit(req, 'place_financial_hold', 'student', student.id, `Hold placed on ${student.adm_no}: ${reason}`);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

router.post('/holds/:id/release', requireCap('holds.manage'), wrap((req) => {
  const hold = db.prepare('SELECT * FROM financial_holds WHERE id = ?').get(toId(req.params.id)) || fail('Hold not found.', 404);
  if (hold.released_at) fail('This hold was already released.');
  db.prepare("UPDATE financial_holds SET released_at = datetime('now'), released_by = ?, release_note = ? WHERE id = ?").run(req.user.id, clean(req.body.note), hold.id);
  audit(req, 'release_financial_hold', 'student', hold.student_id, `Hold ${hold.id} released`);
  return { success: true };
}));

// ---------- gate scanner and campus bans ----------

router.post('/gate/scan', requireCap('gate.scan'), wrap((req) => {
  const person = findPersonByCode(req.body.code);
  let result = 'red';
  let reason = 'Not registered';
  if (person) {
    const user = person.user_id ? db.prepare('SELECT active, role, access_expires_at FROM users WHERE id = ?').get(person.user_id) : null;
    const banned = person.user_id && db.prepare("SELECT 1 FROM campus_bans WHERE subject_type = 'user' AND subject_id = ? AND lifted_at IS NULL").get(person.user_id);
    const expired = user?.access_expires_at && new Date(String(user.access_expires_at).length <= 10 ? user.access_expires_at + 'T23:59:59' : user.access_expires_at).getTime() < Date.now();
    if (banned) reason = 'Banned from campus';
    else if (user && user.active === 0) reason = 'Account inactive';
    else if (expired) reason = 'Access ended';
    else if (person.kind === 'student' && ['suspended', 'expelled', 'deferred'].includes(String(person.status))) reason = `Student ${person.status}`;
    else if (person.kind === 'student' && user && ['suspended_student', 'deferred_student'].includes(user.role)) reason = 'Student not cleared for campus';
    else if (person.kind === 'student' && String(person.status) !== 'active') reason = 'Not registered';
    else { result = 'green'; reason = 'Cleared'; }
  }
  db.prepare('INSERT INTO gate_scans (scanned_code, result, reason, person_name, scanned_by) VALUES (?,?,?,?,?)').run(clean(req.body.code), result, reason, person?.name || null, req.user.id);
  // Guards only see the colour. Security staff also see the reason and name.
  if (req.user.actual_role === 'gate_guard') return { result };
  return { result, reason, name: person?.name || null, kind: person?.kind || null };
}));

router.get('/gate/log', requireCap('campus.ban'), wrap(() => db.prepare(`
  SELECT g.*, u.name scanned_by_name FROM gate_scans g LEFT JOIN users u ON u.id = g.scanned_by ORDER BY g.id DESC LIMIT 200`).all()));

router.get('/bans', requireCap('campus.ban'), wrap(() => db.prepare(`
  SELECT b.*, u.name person_name, u.email, bu.name banned_by_name FROM campus_bans b
  LEFT JOIN users u ON u.id = b.subject_id LEFT JOIN users bu ON bu.id = b.banned_by
  ORDER BY (b.lifted_at IS NULL) DESC, b.id DESC LIMIT 200`).all()));

router.post('/bans', requireCap('campus.ban'), wrap((req, res) => {
  const person = findPersonByCode(req.body.code) || fail('No student or staff member has that ID.', 404);
  if (!person.user_id) fail('That person has no login account to flag.');
  const reason = clean(req.body.reason) || fail('Give a reason for the ban.');
  if (db.prepare("SELECT 1 FROM campus_bans WHERE subject_type = 'user' AND subject_id = ? AND lifted_at IS NULL").get(person.user_id)) fail('This person is already banned.');
  const r = db.prepare("INSERT INTO campus_bans (subject_type, subject_id, reason, banned_by) VALUES ('user',?,?,?)").run(person.user_id, reason, req.user.id);
  audit(req, 'campus_ban', 'user', person.user_id, `Banned ${person.name}: ${reason}`);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

router.post('/bans/:id/lift', requireCap('campus.ban'), wrap((req) => {
  const ban = db.prepare('SELECT * FROM campus_bans WHERE id = ?').get(toId(req.params.id)) || fail('Ban not found.', 404);
  if (ban.lifted_at) fail('This ban was already lifted.');
  db.prepare("UPDATE campus_bans SET lifted_at = datetime('now'), lifted_by = ? WHERE id = ?").run(req.user.id, ban.id);
  audit(req, 'lift_campus_ban', 'user', ban.subject_id, `Ban ${ban.id} lifted`);
  return { success: true };
}));

// ---------- exam attendance and malpractice ----------

router.post('/exam-attendance/scan', requireCap('exam.invigilate'), wrap((req) => {
  const student = findStudent({ code: req.body.code });
  const label = clean(req.body.exam_label) || fail('Say which exam this is.');
  const hold = activeHold(student.id);
  const first = !db.prepare('SELECT 1 FROM exam_attendance WHERE student_id = ? AND exam_label = ?').get(student.id, label);
  if (first) db.prepare('INSERT INTO exam_attendance (student_id, exam_label, recorded_by) VALUES (?,?,?)').run(student.id, label, req.user.id);
  return { name: student.name, adm_no: student.adm_no, already_recorded: !first, financial_hold: Boolean(hold) };
}));

router.get('/exam-attendance', requireCap('exam.invigilate'), wrap((req) => {
  const label = clean(req.query.exam_label);
  return db.prepare(`SELECT a.*, s.name student_name, s.adm_no FROM exam_attendance a JOIN students s ON s.id = a.student_id
    WHERE (? IS NULL OR a.exam_label = ?) ORDER BY a.id DESC LIMIT 300`).all(label, label);
}));

router.post('/malpractice', requireCap('exam.invigilate'), wrap((req, res) => {
  const student = findStudent(req.body);
  const label = clean(req.body.exam_label) || fail('Say which exam this is.');
  const description = clean(req.body.description) || fail('Describe what happened.');
  const r = db.prepare('INSERT INTO malpractice_flags (student_id, exam_label, description, flagged_by) VALUES (?,?,?,?)').run(student.id, label, description, req.user.id);
  audit(req, 'flag_malpractice', 'student', student.id, `Malpractice flagged for ${student.adm_no} in ${label}`);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

router.get('/malpractice', wrap((req) => {
  if (!anyCap(req, ['malpractice.view', 'exam.invigilate'])) fail('Your role does not include this action.', 403);
  const all = hasCap(req.user.actual_role, 'malpractice.view');
  return db.prepare(`SELECT m.*, s.name student_name, s.adm_no, u.name flagged_by_name FROM malpractice_flags m
    JOIN students s ON s.id = m.student_id LEFT JOIN users u ON u.id = m.flagged_by
    WHERE (? = 1 OR m.flagged_by = ?) ORDER BY m.id DESC LIMIT 300`).all(all ? 1 : 0, req.user.id);
}));

router.put('/malpractice/:id', requireCap('discipline.act'), wrap((req) => {
  const status = ['open', 'under_review', 'upheld', 'dismissed'].includes(req.body.status) ? req.body.status : fail('Choose a valid status.');
  db.prepare('UPDATE malpractice_flags SET status = ? WHERE id = ?').run(status, toId(req.params.id));
  audit(req, 'malpractice_status', 'malpractice', toId(req.params.id), `Status set to ${status}`);
  return { success: true };
}));

// ---------- discipline: suspend, reinstate, expel ----------

router.get('/discipline/cases', requireCap('discipline.act'), wrap(() => db.prepare(`
  SELECT d.*, s.name student_name, s.adm_no, u.name imposed_by_name FROM student_suspensions d
  JOIN students s ON s.id = d.student_id LEFT JOIN users u ON u.id = d.imposed_by
  ORDER BY (d.ended_at IS NULL) DESC, d.id DESC LIMIT 200`).all()));

router.post('/discipline/suspend', requireCap('discipline.act'), wrap((req, res) => {
  const student = findStudent(req.body);
  const reason = clean(req.body.reason) || fail('Give the reason for the suspension.');
  const hearing = clean(req.body.hearing_date) || fail('Give the disciplinary hearing date.');
  if (db.prepare('SELECT 1 FROM student_suspensions WHERE student_id = ? AND ended_at IS NULL').get(student.id)) fail('This student already has an open disciplinary case.');
  const user = student.user_id ? db.prepare('SELECT id, role FROM users WHERE id = ?').get(student.user_id) : null;
  const id = tx(() => {
    const r = db.prepare("INSERT INTO student_suspensions (student_id, user_id, previous_role, kind, reason, hearing_date, imposed_by) VALUES (?,?,?, 'suspension', ?,?,?)")
      .run(student.id, user?.id || null, user?.role || null, reason, hearing, req.user.id);
    db.prepare("UPDATE students SET status = 'suspended' WHERE id = ?").run(student.id);
    if (user) db.prepare("UPDATE users SET role = 'suspended_student', session_version = session_version + 1 WHERE id = ?").run(user.id);
    return Number(r.lastInsertRowid);
  });
  audit(req, 'suspend_student', 'student', student.id, `Suspended ${student.adm_no}; hearing ${hearing}`);
  res.status(201).json({ id });
}));

router.post('/discipline/:id/reinstate', requireCap('discipline.act'), wrap((req) => {
  const c = db.prepare('SELECT * FROM student_suspensions WHERE id = ?').get(toId(req.params.id)) || fail('Case not found.', 404);
  if (c.ended_at) fail('This case is already closed.');
  if (c.kind === 'expulsion') fail('An expulsion cannot be reversed here. Ask the Registrar.');
  tx(() => {
    db.prepare("UPDATE student_suspensions SET ended_at = datetime('now'), ended_by = ? WHERE id = ?").run(req.user.id, c.id);
    db.prepare("UPDATE students SET status = 'active' WHERE id = ?").run(c.student_id);
    if (c.user_id) db.prepare('UPDATE users SET role = ?, session_version = session_version + 1 WHERE id = ?').run(c.previous_role && c.previous_role !== 'suspended_student' ? c.previous_role : 'student', c.user_id);
  });
  audit(req, 'reinstate_student', 'student', c.student_id, `Case ${c.id} closed`);
  return { success: true };
}));

router.post('/discipline/expel', requireCap('discipline.act'), wrap((req, res) => {
  const student = findStudent(req.body);
  const reason = clean(req.body.reason) || fail('Give the reason for the expulsion.');
  const user = student.user_id ? db.prepare('SELECT id, role FROM users WHERE id = ?').get(student.user_id) : null;
  const id = tx(() => {
    db.prepare("UPDATE student_suspensions SET ended_at = datetime('now'), ended_by = ? WHERE student_id = ? AND ended_at IS NULL").run(req.user.id, student.id);
    const r = db.prepare("INSERT INTO student_suspensions (student_id, user_id, previous_role, kind, reason, imposed_by) VALUES (?,?,?, 'expulsion', ?,?)").run(student.id, user?.id || null, user?.role || null, reason, req.user.id);
    db.prepare("UPDATE students SET status = 'expelled' WHERE id = ?").run(student.id);
    if (user) db.prepare('UPDATE users SET active = 0, session_version = session_version + 1 WHERE id = ?').run(user.id);
    return Number(r.lastInsertRowid);
  });
  audit(req, 'expel_student', 'student', student.id, `Expelled ${student.adm_no}`);
  res.status(201).json({ id });
}));

// ---------- readmission (deferred students) ----------

router.post('/readmission', requireCap('readmission.apply'), wrap((req, res) => {
  const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id) || fail('No student record is linked to this login.');
  const reason = clean(req.body.reason) || fail('Tell us why you want to return.');
  if (db.prepare("SELECT 1 FROM readmission_requests WHERE student_id = ? AND status = 'pending'").get(student.id)) fail('You already have a request waiting for a decision.');
  const r = db.prepare('INSERT INTO readmission_requests (student_id, reason) VALUES (?,?)').run(student.id, reason);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

router.get('/readmission', requireCap('readmission.review'), wrap(() => db.prepare(`
  SELECT r.*, s.name student_name, s.adm_no FROM readmission_requests r JOIN students s ON s.id = r.student_id
  ORDER BY (r.status = 'pending') DESC, r.id DESC LIMIT 200`).all()));

router.post('/readmission/:id/decide', requireCap('readmission.review'), wrap((req) => {
  const r = db.prepare('SELECT * FROM readmission_requests WHERE id = ?').get(toId(req.params.id)) || fail('Request not found.', 404);
  if (r.status !== 'pending') fail('This request was already decided.');
  const approve = Boolean(req.body.approve);
  tx(() => {
    db.prepare("UPDATE readmission_requests SET status = ?, decided_by = ?, decided_at = datetime('now'), decision_note = ? WHERE id = ?").run(approve ? 'approved' : 'declined', req.user.id, clean(req.body.note), r.id);
    if (approve) {
      const s = db.prepare('SELECT user_id FROM students WHERE id = ?').get(r.student_id);
      db.prepare("UPDATE students SET status = 'active' WHERE id = ?").run(r.student_id);
      if (s?.user_id) db.prepare("UPDATE users SET role = 'student', session_version = session_version + 1 WHERE id = ? AND role = 'deferred_student'").run(s.user_id);
    }
  });
  audit(req, approve ? 'approve_readmission' : 'decline_readmission', 'student', r.student_id, `Request ${r.id}`);
  return { success: true };
}));

// ---------- external examiner: curve suggestions ----------

router.post('/curve-suggestions', requireCap('curve.suggest'), wrap((req, res) => {
  const course = clean(req.body.course_code) || fail('Give the course code.');
  const adjustment = clean(req.body.adjustment) || fail('Describe the adjustment, for example "+3 marks for all scripts".');
  const rationale = clean(req.body.rationale) || fail('Explain why the adjustment is needed.');
  const r = db.prepare('INSERT INTO curve_suggestions (course_code, adjustment, rationale, suggested_by) VALUES (?,?,?,?)').run(course, adjustment, rationale, req.user.id);
  audit(req, 'suggest_curve', 'course', null, `${course}: ${adjustment}`);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

router.get('/curve-suggestions', wrap((req) => {
  if (!anyCap(req, ['curve.suggest', 'curve.review'])) fail('Your role does not include this action.', 403);
  const all = hasCap(req.user.actual_role, 'curve.review');
  return db.prepare(`SELECT c.*, u.name suggested_by_name FROM curve_suggestions c LEFT JOIN users u ON u.id = c.suggested_by
    WHERE (? = 1 OR c.suggested_by = ?) ORDER BY c.id DESC LIMIT 200`).all(all ? 1 : 0, req.user.id);
}));

router.post('/curve-suggestions/:id/decide', requireCap('curve.review'), wrap((req) => {
  const status = ['accepted', 'declined'].includes(req.body.status) ? req.body.status : fail('Choose accepted or declined.');
  db.prepare("UPDATE curve_suggestions SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?").run(status, req.user.id, toId(req.params.id));
  audit(req, 'review_curve', 'curve_suggestion', toId(req.params.id), status);
  return { success: true };
}));

// ---------- senate ----------

function motionWithTally(m, userId) {
  const votes = db.prepare('SELECT vote, COUNT(*) n FROM senate_votes WHERE motion_id = ? GROUP BY vote').all(m.id);
  const tally = { for: 0, against: 0, abstain: 0 };
  votes.forEach((v) => { tally[v.vote] = v.n; });
  const mine = db.prepare('SELECT vote FROM senate_votes WHERE motion_id = ? AND user_id = ?').get(m.id, userId);
  return { ...m, tally, my_vote: mine?.vote || null };
}

router.get('/senate/motions', wrap((req) => {
  if (!anyCap(req, ['senate.vote', 'senate.manage'])) fail('Your role does not include this action.', 403);
  return db.prepare('SELECT * FROM senate_motions ORDER BY (status = \'open\') DESC, id DESC LIMIT 100').all().map((m) => motionWithTally(m, req.user.id));
}));

router.post('/senate/motions', requireCap('senate.manage'), wrap((req, res) => {
  const title = clean(req.body.title) || fail('Give the motion a title.');
  const type = ['curriculum', 'degree_programme', 'other'].includes(req.body.motion_type) ? req.body.motion_type : 'curriculum';
  const r = db.prepare('INSERT INTO senate_motions (title, motion_type, details, created_by) VALUES (?,?,?,?)').run(title, type, clean(req.body.details), req.user.id);
  audit(req, 'senate_motion', 'senate_motion', Number(r.lastInsertRowid), title);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

router.post('/senate/motions/:id/vote', requireCap('senate.vote'), wrap((req) => {
  const m = db.prepare('SELECT * FROM senate_motions WHERE id = ?').get(toId(req.params.id)) || fail('Motion not found.', 404);
  if (m.status !== 'open') fail('Voting on this motion is closed.');
  const vote = ['for', 'against', 'abstain'].includes(req.body.vote) ? req.body.vote : fail('Vote for, against or abstain.');
  db.prepare('INSERT INTO senate_votes (motion_id, user_id, vote) VALUES (?,?,?) ON CONFLICT(motion_id, user_id) DO UPDATE SET vote = excluded.vote, voted_at = datetime(\'now\')').run(m.id, req.user.id, vote);
  audit(req, 'senate_vote', 'senate_motion', m.id, vote);
  return motionWithTally(m, req.user.id);
}));

router.post('/senate/motions/:id/close', requireCap('senate.manage'), wrap((req) => {
  const m = db.prepare('SELECT * FROM senate_motions WHERE id = ?').get(toId(req.params.id)) || fail('Motion not found.', 404);
  if (m.status !== 'open') fail('This motion is already closed.');
  const t = motionWithTally(m, req.user.id).tally;
  const status = t.for > t.against ? 'passed' : 'rejected';
  db.prepare("UPDATE senate_motions SET status = ?, closed_at = datetime('now') WHERE id = ?").run(status, m.id);
  audit(req, 'close_senate_motion', 'senate_motion', m.id, status);
  return { status, tally: t };
}));

router.get('/senate/graduation-list', wrap((req) => {
  if (!anyCap(req, ['graduation.signoff', 'graduation.clear'])) fail('Your role does not include this action.', 403);
  const year = clean(req.query.academic_year);
  return db.prepare(`SELECT g.id, g.student_id, g.academic_year, g.academic_status, g.senate_status, g.cleared_at, s.name student_name, s.adm_no,
      (SELECT status FROM gown_issuance WHERE student_id = g.student_id) gown_status
    FROM graduation_clearance g JOIN students s ON s.id = g.student_id
    WHERE (? IS NULL OR g.academic_year = ?) ORDER BY g.academic_year DESC, s.name LIMIT 500`).all(year, year);
}));

router.post('/senate/graduation-signoff', requireCap('graduation.signoff'), wrap((req) => {
  const ids = (Array.isArray(req.body.student_ids) ? req.body.student_ids : []).map(toId).filter(Boolean);
  const year = clean(req.body.academic_year) || fail('Give the academic year.');
  if (!ids.length) fail('Choose at least one student.');
  let signed = 0;
  tx(() => {
    ids.forEach((studentId) => {
      const row = db.prepare('SELECT id, academic_status FROM graduation_clearance WHERE student_id = ? AND academic_year = ?').get(studentId, year);
      if (!row || row.academic_status !== 'ready') return; // only students who finished the programme can be signed off
      db.prepare('INSERT OR IGNORE INTO senate_signoffs (academic_year, student_id, signed_by) VALUES (?,?,?)').run(year, studentId, req.user.id);
      db.prepare("UPDATE graduation_clearance SET senate_status = 'approved' WHERE id = ?").run(row.id);
      signed += 1;
    });
  });
  audit(req, 'senate_graduation_signoff', 'graduation', null, `${signed} student(s) signed off for ${year}`);
  return { signed, skipped: ids.length - signed };
}));

// ---------- graduation coordinator ----------

router.post('/graduation/clear', requireCap('graduation.clear'), wrap((req) => {
  const year = clean(req.body.academic_year) || fail('Give the academic year.');
  const student = findStudent(req.body);
  const row = db.prepare('SELECT * FROM graduation_clearance WHERE student_id = ? AND academic_year = ?').get(student.id, year) || fail('This student is not on the graduation list for that year.', 404);
  if (row.academic_status !== 'ready') fail('The student has not completed the academic requirements.');
  if (row.senate_status !== 'approved') fail('Senate has not signed off this student yet.');
  if (activeHold(student.id)) fail('The student has an active financial hold.');
  db.prepare("UPDATE graduation_clearance SET cleared_at = datetime('now'), cleared_by = ? WHERE id = ?").run(req.user.id, row.id);
  audit(req, 'clear_for_graduation', 'student', student.id, `${student.adm_no} cleared for ${year}`);
  return { success: true };
}));

router.post('/graduation/gown', requireCap('graduation.clear'), wrap((req) => {
  const student = findStudent(req.body);
  const action = req.body.action === 'return' ? 'returned' : 'issued';
  const cleared = db.prepare('SELECT 1 FROM graduation_clearance WHERE student_id = ? AND cleared_at IS NOT NULL').get(student.id);
  if (action === 'issued' && !cleared) fail('Clear the student for graduation before issuing a gown.');
  db.prepare(`INSERT INTO gown_issuance (student_id, status, issued_by) VALUES (?,?,?)
    ON CONFLICT(student_id) DO UPDATE SET status = excluded.status, issued_by = excluded.issued_by, returned_at = CASE WHEN excluded.status = 'returned' THEN datetime('now') ELSE NULL END`).run(student.id, action, req.user.id);
  audit(req, 'gown_' + action, 'student', student.id, student.adm_no);
  return { success: true, status: action };
}));

// ---------- helpdesk level 2: data integrity ----------

function integrityChecks() {
  const orphanRegs = db.prepare(`SELECT COUNT(*) n FROM course_registrations r
    WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = r.student_id) OR NOT EXISTS (SELECT 1 FROM course_offerings o WHERE o.id = r.offering_id)`).get().n;
  const orphanEnrol = db.prepare('SELECT COUNT(*) n FROM university_enrollments e WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = e.student_id)').get().n;
  const noProfile = db.prepare(`SELECT COUNT(*) n FROM users u WHERE u.role NOT IN ('admin','machine_user','parent')
    AND NOT EXISTS (SELECT 1 FROM students s WHERE s.user_id = u.id) AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.id) AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.user_id = u.id)`).get().n;
  const dupEmail = db.prepare('SELECT COUNT(*) n FROM (SELECT LOWER(email) e FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1)').get().n;
  return [
    { key: 'orphan_registrations', label: 'Unit registrations pointing at a missing student or unit', count: orphanRegs, fixable: true },
    { key: 'orphan_enrollments', label: 'Programme enrolments pointing at a missing student', count: orphanEnrol, fixable: true },
    { key: 'accounts_without_profile', label: 'Accounts with no personal record (report only)', count: noProfile, fixable: false },
    { key: 'duplicate_emails', label: 'Duplicate email addresses (report only)', count: dupEmail, fixable: false },
  ];
}

router.get('/helpdesk/integrity', requireCap('helpdesk.l2'), wrap(() => integrityChecks()));

router.post('/helpdesk/integrity/fix', requireCap('helpdesk.l2'), wrap((req) => {
  const key = req.body.check;
  let removed = 0;
  if (key === 'orphan_registrations') {
    removed = Number(db.prepare(`DELETE FROM course_registrations WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = course_registrations.student_id)
      OR NOT EXISTS (SELECT 1 FROM course_offerings o WHERE o.id = course_registrations.offering_id)`).run().changes);
  } else if (key === 'orphan_enrollments') {
    removed = Number(db.prepare('DELETE FROM university_enrollments WHERE NOT EXISTS (SELECT 1 FROM students s WHERE s.id = university_enrollments.student_id)').run().changes);
  } else fail('That check cannot be fixed automatically.');
  audit(req, 'integrity_fix', 'system', null, `${key}: removed ${removed} row(s)`);
  return { removed, checks: integrityChecks() };
}));

// ---------- audit overview (security & audit officer) ----------

router.get('/audit/overview', requireCap('audit.read'), wrap(() => ({
  logins: db.prepare('SELECT email, success, ip, user_agent, attempted_at FROM login_attempts ORDER BY id DESC LIMIT 200').all(),
  failed_by_ip: db.prepare("SELECT ip, COUNT(*) failures FROM login_attempts WHERE success = 0 AND attempted_at > datetime('now','-1 day') GROUP BY ip ORDER BY failures DESC LIMIT 10").all(),
  grade_changes: db.prepare(`SELECT a.id, a.action, a.entity, a.details, a.created_at, u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
    WHERE a.action IN ('enter_marks','grade_lock_on','grade_lock_off','review_curve') OR a.entity IN ('assessment','grades','gradebook')
    ORDER BY a.id DESC LIMIT 200`).all(),
  result_changes: db.prepare(`SELECT a.id, a.module, a.action, a.entity, a.old_value, a.new_value, a.reason, a.ip, a.created_at, u.name user_name
    FROM university_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.module IN ('academics','results') ORDER BY a.id DESC LIMIT 200`).all(),
  account_changes: db.prepare(`SELECT a.id, a.action, a.details, a.created_at, u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
    WHERE a.action IN ('change_role','create_user','delete_user','deactivate_user','activate_user','reset_password','unlock_user','impersonate_start') ORDER BY a.id DESC LIMIT 200`).all(),
})));

// ---------- API keys and machine jobs ----------

router.get('/api-keys', requireCap('apikeys.manage'), wrap(() => ({
  keys: db.prepare(`SELECT k.id, k.name, k.key_prefix, k.scopes, k.expires_at, k.last_used_at, k.revoked_at, k.created_at, u.name machine_name, u.id user_id
    FROM machine_api_keys k JOIN users u ON u.id = k.user_id ORDER BY k.id DESC`).all(),
  machine_users: db.prepare("SELECT id, name, email FROM users WHERE role = 'machine_user' AND active = 1 ORDER BY name").all(),
})));

router.post('/api-keys', requireCap('apikeys.manage'), wrap((req, res) => {
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'machine_user'").get(toId(req.body.user_id)) || fail('Choose a Machine User account.');
  const name = clean(req.body.name) || fail('Name the key, for example "Midnight penalty job".');
  const expires = clean(req.body.expires_at);
  if (expires && Number.isNaN(new Date(expires).getTime())) fail('Enter a valid expiry date.');
  const prefix = crypto.randomBytes(4).toString('hex');
  const secret = `mu_${prefix}_${crypto.randomBytes(24).toString('hex')}`;
  const scopes = (clean(req.body.scopes) || '').split(',').map((s) => s.trim()).filter(Boolean).join(',');
  const r = db.prepare('INSERT INTO machine_api_keys (user_id, name, key_prefix, key_hash, scopes, expires_at, created_by) VALUES (?,?,?,?,?,?,?)').run(user.id, name, `mu_${prefix}`, hashKey(secret), scopes, expires, req.user.id);
  audit(req, 'create_api_key', 'api_key', Number(r.lastInsertRowid), `${name} for user ${user.id}`);
  // The key is shown once. Only its hash is stored.
  res.status(201).json({ id: Number(r.lastInsertRowid), api_key: secret, note: 'Copy this key now. It cannot be shown again.' });
}));

router.post('/api-keys/:id/revoke', requireCap('apikeys.manage'), wrap((req) => {
  db.prepare("UPDATE machine_api_keys SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL").run(toId(req.params.id));
  audit(req, 'revoke_api_key', 'api_key', toId(req.params.id), '');
  return { success: true };
}));

router.get('/machine/whoami', requireCap('machine.run'), wrap((req) => ({ id: req.user.id, name: req.user.name, scopes: req.user.api_key?.scopes || [] })));

router.post('/machine/job-runs', requireCap('machine.run'), wrap((req, res) => {
  const job = clean(req.body.job) || fail('Name the job.');
  const scopes = req.user.api_key?.scopes || [];
  if (scopes.length && !scopes.includes(job) && !scopes.includes('*')) fail('This key is not allowed to report that job.', 403);
  const status = ['started', 'success', 'failed'].includes(req.body.status) ? req.body.status : fail('Status must be started, success or failed.');
  const r = db.prepare('INSERT INTO machine_job_runs (user_id, job, status, details) VALUES (?,?,?,?)').run(req.user.id, job, status, clean(req.body.details));
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

router.get('/machine/job-runs', wrap((req) => {
  if (!anyCap(req, ['apikeys.manage', 'machine.run'])) fail('Your role does not include this action.', 403);
  return db.prepare('SELECT j.*, u.name machine_name FROM machine_job_runs j JOIN users u ON u.id = j.user_id ORDER BY j.id DESC LIMIT 200').all();
}));

// ---------- counsellor: private session notes ----------

router.get('/counselling', requireCap('counselling.notes'), wrap((req) => db.prepare(`
  SELECT c.id, c.session_date, c.topic, c.notes, s.name student_name, s.adm_no FROM counselling_sessions c JOIN students s ON s.id = c.student_id
  WHERE c.counselor_id = ? ORDER BY c.session_date DESC, c.id DESC LIMIT 300`).all(req.user.id)));

router.post('/counselling', requireCap('counselling.notes'), wrap((req, res) => {
  const student = findStudent(req.body);
  const date = clean(req.body.session_date) || new Date().toISOString().slice(0, 10);
  const r = db.prepare('INSERT INTO counselling_sessions (student_id, counselor_id, session_date, topic, notes) VALUES (?,?,?,?,?)').run(student.id, req.user.id, date, clean(req.body.topic), clean(req.body.notes));
  // The audit trail records that a session happened, never what was said.
  audit(req, 'log_counselling', 'student', student.id, 'Counselling session logged');
  res.status(201).json({ id: Number(r.lastInsertRowid) });
}));

// ---------- super administrator: view as another user, read-only SQL ----------

function cookie(res, token, maxAge) {
  res.setHeader('Set-Cookie', `matara_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Secure; Partitioned; Max-Age=${maxAge}`);
}

router.post('/impersonate/exit', wrap((req, res) => {
  if (!req.user.imp) fail('You are not viewing as another user.');
  const admin = db.prepare('SELECT id, name, email, role, session_version FROM users WHERE id = ? AND active = 1').get(req.user.imp) || fail('The administrator account is no longer available.', 403);
  audit({ user: { id: admin.id } }, 'impersonate_end', 'user', req.user.id, `Stopped viewing as user ${req.user.id}`);
  const token = jwt.sign({ id: admin.id, name: admin.name, email: admin.email, role: admin.role, sessionVersion: admin.session_version || 1 }, JWT_SECRET, { expiresIn: '12h' });
  cookie(res, token, 43200);
  return { token, user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } };
}));

router.post('/impersonate/:id', requireCap('impersonate'), wrap((req, res) => {
  const target = db.prepare('SELECT id, name, email, role, active, session_version FROM users WHERE id = ?').get(toId(req.params.id)) || fail('User not found.', 404);
  if (target.role === 'admin') fail('You cannot view as another administrator.');
  if (target.role === 'machine_user') fail('Machine accounts have no screen to view.');
  if (target.active === 0) fail('That account is inactive.');
  audit(req, 'impersonate_start', 'user', target.id, `Viewing as ${target.email}`);
  // One hour, read-only (the middleware blocks changes while "imp" is set).
  const token = jwt.sign({ id: target.id, name: target.name, email: target.email, role: target.role, sessionVersion: target.session_version || 1, imp: req.user.id }, JWT_SECRET, { expiresIn: '1h' });
  cookie(res, token, 3600);
  return { token, user: { id: target.id, name: target.name, email: target.email, role: target.role }, impersonated_by: req.user.id };
}));

const SQL_BLOCKED = /(password|two_factor|key_hash|recovery_code|counselling_sessions|reset_token|backup_hashes)/i;
router.post('/sql', requireCap('sql.read'), wrap((req) => {
  if (req.user.imp) fail('Not available while viewing as another user.', 403);
  const query = String(req.body.query || '').trim().replace(/;+\s*$/, '');
  if (!/^select\b/i.test(query)) fail('Only SELECT queries are allowed.');
  if (query.includes(';')) fail('Run one query at a time.');
  if (SQL_BLOCKED.test(query)) fail('That query touches protected columns (passwords, secrets or private counselling notes).');
  audit(req, 'sql_console', 'system', null, query.slice(0, 500));
  let rows;
  try { rows = db.prepare(`SELECT * FROM (${query}) LIMIT 500`).all(); } catch (e) { fail(`Query error: ${e.message}`); }
  return { rows, truncated: rows.length === 500 };
}));

// Who can open which desk, for the admin overview.
router.get('/catalog', requireCap('apikeys.manage'), wrap(() => ROLES.map((r) => ({ key: r.key, label: r.label, category: r.category, acts_as: r.acts_as, read_only: Boolean(r.read_only), temporary: Boolean(r.temporary), caps: r.caps || [] }))));

router.get('/rbac/me', wrap((req) => ({ role: req.user.actual_role, inherited_role: req.user.role, permissions: permissionsForRole(req.user.actual_role) })));
router.get('/rbac/catalog', requireCap('apikeys.manage'), wrap(() => ({ permissions: PERMISSIONS, roles: ROLES.map((r) => ({ key: r.key, label: r.label, permissions: permissionsForRole(r.key) })) })));

module.exports = router;
