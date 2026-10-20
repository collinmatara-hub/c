// lib/academic.js
// Small helpers shared by the student portal, marks entry and messaging routes.

const { db } = require('../db');

// "Term 2 2026". Uses the term marked active in Terms, otherwise works it out from today's date.
function currentTerm() {
  const active = db.prepare(`
    SELECT t.name AS term, y.name AS year
    FROM terms t LEFT JOIN academic_years y ON y.id = t.academic_year_id
    WHERE t.active = 1 ORDER BY t.id DESC LIMIT 1
  `).get();
  if (active) return active.year ? `${active.term} ${active.year}` : active.term;

  const now = new Date();
  const month = now.getMonth() + 1;
  const term = month <= 4 ? 'Term 1' : month <= 8 ? 'Term 2' : 'Term 3';
  return `${term} ${now.getFullYear()}`;
}

// Scores below this need a supplementary. Admins can change it with the "pass_mark" setting.
function passMark() {
  const row = db.prepare("SELECT value FROM system_settings WHERE key = 'pass_mark'").get();
  const number = row ? Number(row.value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : 50;
}

function gradeFor(score) {
  const row = db.prepare(
    'SELECT grade, comment FROM grading_scales WHERE min_score <= ? ORDER BY min_score DESC LIMIT 1'
  ).get(score);
  return row || { grade: '', comment: '' };
}

// The student record that belongs to a login, with class details
function studentFor(userId) {
  return db.prepare(`
    SELECT s.*, c.name AS class_name, c.stream AS class_stream
    FROM students s LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.user_id = ?
  `).get(userId);
}

// Who teaches a unit to a class. Uses the timetable first, then teachers whose specialty matches the unit name.
function lecturersFor(classId, subjectId) {
  const fromTimetable = db.prepare(`
    SELECT DISTINCT te.id, te.user_id, te.name
    FROM timetables t JOIN teachers te ON te.id = t.teacher_id
    WHERE t.class_id = ? AND t.subject_id = ?
  `).all(classId, subjectId);
  if (fromTimetable.length > 0) return fromTimetable;

  const subject = db.prepare('SELECT name FROM subjects WHERE id = ?').get(subjectId);
  if (!subject) return [];
  return db.prepare(
    'SELECT id, user_id, name FROM teachers WHERE specialty IS NOT NULL AND lower(specialty) LIKE ?'
  ).all(`%${subject.name.toLowerCase()}%`);
}

function lecturerNames(classId, subjectId) {
  const names = lecturersFor(classId, subjectId).map((t) => t.name);
  return names.length > 0 ? names.join(', ') : null;
}

// "Monday", "monday", "Mon" -> "mon"
function dayKey(text) {
  return String(text || '').trim().toLowerCase().slice(0, 3);
}

module.exports = { currentTerm, passMark, gradeFor, studentFor, lecturersFor, lecturerNames, dayKey };
