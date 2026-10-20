'use strict';
// Tables for the university timetable maker. Created idempotently on startup.
const { db } = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS tt_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, campus TEXT NOT NULL DEFAULT 'Main Campus',
    building TEXT DEFAULT '', capacity INTEGER NOT NULL CHECK(capacity > 0), room_type TEXT NOT NULL DEFAULT 'Lecture hall',
    facilities TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tt_room_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, day TEXT NOT NULL, start_time TEXT NOT NULL,
    end_time TEXT NOT NULL, reason TEXT DEFAULT '', FOREIGN KEY(room_id) REFERENCES tt_rooms(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS tt_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT NOT NULL, unit_code TEXT NOT NULL, unit_name TEXT NOT NULL,
    department TEXT DEFAULT '', programme TEXT DEFAULT '', cohort TEXT NOT NULL DEFAULT '',
    lecturer_user_id INTEGER, lecturer_name TEXT DEFAULT '', sessions_per_week INTEGER NOT NULL DEFAULT 1,
    session_minutes INTEGER NOT NULL DEFAULT 120, class_size INTEGER NOT NULL DEFAULT 0,
    room_type_required TEXT DEFAULT '', class_type TEXT NOT NULL DEFAULT 'Lecture', shared_group TEXT DEFAULT '',
    created_by INTEGER, created_at TEXT DEFAULT (datetime('now')), UNIQUE(term, unit_code, cohort)
  );
  CREATE TABLE IF NOT EXISTS tt_lecturer_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, lecturer_user_id INTEGER, lecturer_name TEXT DEFAULT '',
    day TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, reason TEXT DEFAULT '',
    created_by INTEGER, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tt_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT NOT NULL, name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','published','archived')),
    config TEXT DEFAULT '{}', unscheduled TEXT DEFAULT '[]', score REAL DEFAULT 0, seed INTEGER DEFAULT 1,
    parent_version_id INTEGER, review_note TEXT DEFAULT '',
    created_by INTEGER, created_by_name TEXT DEFAULT '', submitted_by INTEGER, approved_by INTEGER, approved_by_name TEXT DEFAULT '',
    published_by INTEGER, published_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tt_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, version_id INTEGER NOT NULL, unit_id INTEGER, unit_code TEXT NOT NULL,
    unit_name TEXT NOT NULL, cohort TEXT DEFAULT '', class_type TEXT DEFAULT 'Lecture', day TEXT NOT NULL,
    start_time TEXT NOT NULL, end_time TEXT NOT NULL, room_id INTEGER, lecturer_user_id INTEGER,
    lecturer_name TEXT DEFAULT '', locked INTEGER NOT NULL DEFAULT 0, group_key TEXT DEFAULT '',
    FOREIGN KEY(version_id) REFERENCES tt_versions(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_tt_slots_version ON tt_slots(version_id);
  CREATE INDEX IF NOT EXISTS idx_tt_slots_lecturer ON tt_slots(lecturer_user_id);
  CREATE TABLE IF NOT EXISTS tt_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT, version_id INTEGER, action TEXT NOT NULL, actor_id INTEGER,
    actor_name TEXT DEFAULT '', actor_role TEXT DEFAULT '', details TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
  );
`);
module.exports = {};
