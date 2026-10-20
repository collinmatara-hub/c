'use strict';
// Pure timetable engine: no database access, so it can be tested on its own.
//
// Hard constraints (a slot is never placed, and validation fails, if any is broken):
//   - a lecturer, room or cohort cannot be in two places at once
//   - the room must fit the class size and match the required room type
//   - lecturers' blocked periods and rooms' maintenance periods are respected
//   - classes stay inside operating hours and outside the protected break
//   - two sessions of the same unit for the same cohort do not share a day
// Soft constraints (lower cost is better): avoid late classes, avoid gaps in a cohort's
// day, avoid overloading a day, spread lecturer load, avoid oversized rooms.

const DEFAULT_CONFIG = {
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  dayStart: '08:00',
  dayEnd: '18:00',
  breakStart: '13:00', // protected break; set breakStart and breakEnd to '' to disable
  breakEnd: '14:00',
  maxSessionsPerCohortDay: 4,
  attempts: 40,
};

const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const overlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
const norm = (s) => String(s || '').trim().toLowerCase();

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cleanConfig(input) {
  const c = { ...DEFAULT_CONFIG, ...(input || {}) };
  if (!Array.isArray(c.days) || !c.days.length) c.days = DEFAULT_CONFIG.days;
  c.attempts = Math.max(1, Math.min(200, Number(c.attempts) || DEFAULT_CONFIG.attempts));
  c.maxSessionsPerCohortDay = Math.max(1, Number(c.maxSessionsPerCohortDay) || 4);
  return c;
}

// Units sharing the same non-empty shared_group are taught together as one meeting.
function buildMeetings(units) {
  const meetings = [];
  const groups = new Map();
  for (const u of units) {
    const key = norm(u.shared_group);
    if (key) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(u);
    } else {
      meetings.push({ key: `u${u.id}`, units: [u] });
    }
  }
  for (const [key, list] of groups) meetings.push({ key: `g${key}`, units: list });
  return meetings.map((m) => {
    const first = m.units[0];
    const sessions = Math.max(...m.units.map((u) => Number(u.sessions_per_week) || 1));
    const minutes = Math.max(...m.units.map((u) => Number(u.session_minutes) || 120));
    return {
      key: m.key,
      units: m.units,
      cohorts: [...new Set(m.units.map((u) => String(u.cohort || '').trim()).filter(Boolean))],
      lecturerKey: first.lecturer_user_id ? `id:${first.lecturer_user_id}` : (norm(first.lecturer_name) ? `n:${norm(first.lecturer_name)}` : ''),
      lecturerUserId: first.lecturer_user_id || null,
      lecturerName: first.lecturer_name || '',
      classSize: m.units.reduce((n, u) => n + (Number(u.class_size) || 0), 0),
      roomType: first.room_type_required || '',
      sessions,
      minutes,
    };
  });
}

// Everything the checks need, built once per run or validation.
function buildContext({ rooms, roomBlocks = [], lecturerBlocks = [], config }) {
  const cfg = cleanConfig(config);
  const roomById = new Map(rooms.filter((r) => r.active !== 0).map((r) => [r.id, r]));
  const blocksByRoom = new Map();
  for (const b of roomBlocks) {
    if (!blocksByRoom.has(b.room_id)) blocksByRoom.set(b.room_id, []);
    blocksByRoom.get(b.room_id).push(b);
  }
  const blocksByLecturer = new Map();
  for (const b of lecturerBlocks) {
    const key = b.lecturer_user_id ? `id:${b.lecturer_user_id}` : `n:${norm(b.lecturer_name)}`;
    if (!blocksByLecturer.has(key)) blocksByLecturer.set(key, []);
    blocksByLecturer.get(key).push(b);
  }
  return { cfg, roomById, blocksByRoom, blocksByLecturer };
}

function blockedBy(list, day, s, e) {
  return (list || []).find((b) => b.day === day && overlap(s, e, toMin(b.start_time), toMin(b.end_time)));
}

function roomFits(room, meeting) {
  if (!room) return false;
  if (Number(room.capacity) < meeting.classSize) return false;
  if (meeting.roomType && norm(room.room_type) !== norm(meeting.roomType)) return false;
  // A room reserved for labs is not used for ordinary classes unless asked for.
  if (!meeting.roomType && norm(room.room_type) === 'laboratory') return false;
  return true;
}

// Occupancy index: who/what is busy when. Keys are `${day}|${resource}`; values are [start,end] lists.
function newOccupancy() { return { lecturer: new Map(), room: new Map(), cohort: new Map() }; }
function busy(map, key, s, e) {
  const list = map.get(key);
  return !!list && list.some(([a, b]) => overlap(s, e, a, b));
}
function mark(map, key, s, e) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push([s, e]);
}
function occupy(occ, day, s, e, { lecturerKey, roomId, cohorts }) {
  if (lecturerKey) mark(occ.lecturer, `${day}|${lecturerKey}`, s, e);
  if (roomId) mark(occ.room, `${day}|${roomId}`, s, e);
  for (const c of cohorts) mark(occ.cohort, `${day}|${norm(c)}`, s, e);
}

// First hard-constraint failure for a candidate placement, or null when it is allowed.
function whyNot(ctx, occ, meeting, day, s, e, room) {
  const { cfg } = ctx;
  if (s < toMin(cfg.dayStart) || e > toMin(cfg.dayEnd)) return 'outside operating hours';
  if (cfg.breakStart && cfg.breakEnd && overlap(s, e, toMin(cfg.breakStart), toMin(cfg.breakEnd))) return 'protected break';
  if (meeting.lecturerKey) {
    if (blockedBy(ctx.blocksByLecturer.get(meeting.lecturerKey), day, s, e)) return 'lecturer unavailable';
    if (busy(occ.lecturer, `${day}|${meeting.lecturerKey}`, s, e)) return 'lecturer busy';
  }
  for (const c of meeting.cohorts) if (busy(occ.cohort, `${day}|${norm(c)}`, s, e)) return 'cohort busy';
  if (room) {
    if (blockedBy(ctx.blocksByRoom.get(room.id), day, s, e)) return 'room under maintenance';
    if (busy(occ.room, `${day}|${room.id}`, s, e)) return 'room busy';
  }
  return null;
}

function softCost(ctx, occ, meeting, day, s, e, room, dayLoad) {
  let cost = 0;
  if (s >= 16 * 60) cost += 6; else if (s >= 15 * 60) cost += 3;
  if (s < 9 * 60) cost += 1;
  for (const c of meeting.cohorts) {
    const list = occ.cohort.get(`${day}|${norm(c)}`) || [];
    if (list.length) {
      // distance to the nearest existing class: adjacent is ideal, a long gap is penalised
      const gap = Math.min(...list.map(([a, b]) => (s >= b ? s - b : a - e)));
      cost += gap === 0 ? -2 : Math.min(8, Math.ceil(gap / 60) * 2);
    }
    cost += (dayLoad.get(`${day}|${norm(c)}`) || 0) * 2;
  }
  if (meeting.lecturerKey) cost += (dayLoad.get(`${day}|L${meeting.lecturerKey}`) || 0) * 1.5;
  if (room) cost += Math.min(6, Math.floor((Number(room.capacity) - meeting.classSize) / 40));
  return cost;
}

function candidateStarts(cfg, minutes) {
  const out = [];
  for (let s = toMin(cfg.dayStart); s + minutes <= toMin(cfg.dayEnd); s += 60) out.push(s);
  return out;
}

// Explains why a meeting could not be fully placed, in plain words.
function explain(ctx, occ, meeting, placedCount) {
  const { cfg } = ctx;
  const rooms = [...ctx.roomById.values()];
  const fitting = rooms.filter((r) => roomFits(r, meeting));
  const label = meeting.units.map((u) => u.unit_code).join(' + ');
  const missing = meeting.sessions - placedCount;
  if (!rooms.length) return `${label}: no rooms are set up.`;
  if (!fitting.length) {
    return `${label}: no ${meeting.roomType || 'teaching'} room seats ${meeting.classSize}. The largest suitable room is ${Math.max(0, ...rooms.filter((r) => !meeting.roomType || norm(r.room_type) === norm(meeting.roomType)).map((r) => Number(r.capacity)))}.`;
  }
  const starts = candidateStarts(cfg, meeting.minutes);
  if (!starts.length) return `${label}: a ${meeting.minutes}-minute session does not fit inside operating hours ${cfg.dayStart}-${cfg.dayEnd}.`;
  if (meeting.sessions > cfg.days.length) return `${label}: needs ${meeting.sessions} sessions a week but only ${cfg.days.length} teaching days are open.`;
  const tally = {};
  for (const day of cfg.days) for (const s of starts) {
    const e = s + meeting.minutes;
    let reason = null;
    for (const room of fitting) {
      const r = whyNot(ctx, occ, meeting, day, s, e, room);
      if (!r) { reason = null; break; }
      if (!reason || r === 'lecturer unavailable' || r === 'lecturer busy' || r === 'cohort busy') reason = r;
    }
    if (reason) tally[reason] = (tally[reason] || 0) + 1;
  }
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return `${label}: ${missing} of ${meeting.sessions} weekly session(s) could not be placed. Most common blocker: ${top ? `${top[0]} (${top[1]} slots)` : 'competition for the same slots'}.`;
}

function runOnce({ meetings, ctx, locked, rand }) {
  const { cfg } = ctx;
  const occ = newOccupancy();
  const dayLoad = new Map();
  const placed = [];
  const lockedSessions = new Map(); // meeting key -> count already fixed
  for (const slot of locked) {
    const s = toMin(slot.start_time); const e = toMin(slot.end_time);
    const cohorts = slot.cohort ? [slot.cohort] : [];
    const lecturerKey = slot.lecturer_user_id ? `id:${slot.lecturer_user_id}` : (norm(slot.lecturer_name) ? `n:${norm(slot.lecturer_name)}` : '');
    occupy(occ, slot.day, s, e, { lecturerKey, roomId: slot.room_id, cohorts });
    for (const c of cohorts) dayLoad.set(`${slot.day}|${norm(c)}`, (dayLoad.get(`${slot.day}|${norm(c)}`) || 0) + 1);
    placed.push({ ...slot, locked: 1 });
    const m = meetings.find((x) => x.units.some((u) => u.id === slot.unit_id));
    if (m) lockedSessions.set(m.key, (lockedSessions.get(m.key) || 0) + 1);
  }

  // Hardest meetings first: big classes, scarce rooms, busy lecturers, long sessions.
  const roomsList = [...ctx.roomById.values()];
  const order = meetings
    .map((m) => ({ m, weight: m.classSize * 0.05 + m.minutes / 60 + m.sessions * 2 + m.cohorts.length + (roomsList.filter((r) => roomFits(r, m)).length ? 0 : 50) + rand() * 1.5 }))
    .sort((a, b) => b.weight - a.weight).map((x) => x.m);

  const unscheduled = [];
  for (const m of order) {
    const fitting = roomsList.filter((r) => roomFits(r, m));
    const starts = candidateStarts(cfg, m.minutes);
    const usedDays = new Set(placed.filter((p) => m.units.some((u) => u.id === p.unit_id)).map((p) => p.day));
    let count = lockedSessions.get(m.key) || 0;
    while (count < m.sessions) {
      let best = null;
      for (const day of cfg.days) {
        if (usedDays.has(day)) continue;
        if (m.cohorts.some((c) => (dayLoad.get(`${day}|${norm(c)}`) || 0) >= cfg.maxSessionsPerCohortDay)) continue;
        for (const s of starts) {
          const e = s + m.minutes;
          for (const room of fitting) {
            if (whyNot(ctx, occ, m, day, s, e, room)) continue;
            const cost = softCost(ctx, occ, m, day, s, e, room, dayLoad) + rand() * 0.8;
            if (!best || cost < best.cost) best = { day, s, e, room, cost };
          }
        }
      }
      if (!best) break;
      occupy(occ, best.day, best.s, best.e, { lecturerKey: m.lecturerKey, roomId: best.room.id, cohorts: m.cohorts });
      for (const c of m.cohorts) dayLoad.set(`${best.day}|${norm(c)}`, (dayLoad.get(`${best.day}|${norm(c)}`) || 0) + 1);
      if (m.lecturerKey) dayLoad.set(`${best.day}|L${m.lecturerKey}`, (dayLoad.get(`${best.day}|L${m.lecturerKey}`) || 0) + 1);
      usedDays.add(best.day);
      for (const u of m.units) {
        placed.push({
          unit_id: u.id, unit_code: u.unit_code, unit_name: u.unit_name, cohort: u.cohort || '', class_type: u.class_type || 'Lecture',
          day: best.day, start_time: toTime(best.s), end_time: toTime(best.e), room_id: best.room.id,
          lecturer_user_id: m.lecturerUserId, lecturer_name: m.lecturerName, locked: 0, group_key: m.key,
        });
      }
      count += 1;
    }
    if (count < m.sessions) unscheduled.push({ meeting: m, placedCount: count, occSnapshot: null });
  }
  const failedKeys = unscheduled.map((u) => ({ key: u.meeting.key, placedCount: u.placedCount, meeting: u.meeting }));
  return { placed, failed: failedKeys, occ };
}

// Generates a draft. Tries several seeded runs and keeps the one that places the most sessions
// and, on ties, has the lowest soft cost. The same seed always gives the same result.
function generate({ units, rooms, roomBlocks, lecturerBlocks, config, locked = [], seed = 1 }) {
  const ctx = buildContext({ rooms, roomBlocks, lecturerBlocks, config });
  const meetings = buildMeetings(units);
  const rand = mulberry32(Number(seed) || 1);
  let best = null;
  for (let i = 0; i < ctx.cfg.attempts; i += 1) {
    const run = runOnce({ meetings, ctx, locked, rand });
    const missing = run.failed.reduce((n, f) => n + (f.meeting.sessions - f.placedCount), 0);
    const score = scorePlaced(run.placed);
    if (!best || missing < best.missing || (missing === best.missing && score < best.score)) best = { ...run, missing, score };
    if (missing === 0 && i >= 5) break;
  }
  const unscheduled = best.failed.map((f) => ({
    unit_codes: f.meeting.units.map((u) => u.unit_code),
    cohorts: f.meeting.cohorts,
    missing_sessions: f.meeting.sessions - f.placedCount,
    reason: explain(ctx, best.occ, f.meeting, f.placedCount),
  }));
  const totalSessions = meetings.reduce((n, m) => n + m.sessions, 0);
  return { slots: best.placed, unscheduled, score: Math.round(best.score * 10) / 10, totalSessions, attempts: ctx.cfg.attempts };
}

function scorePlaced(slots) {
  let cost = 0;
  for (const s of slots) { const m = toMin(s.start_time); if (m >= 16 * 60) cost += 6; else if (m >= 15 * 60) cost += 3; }
  return cost;
}

// Checks a full set of slots against every hard constraint. Returns a list of problems.
function validate({ slots, units = [], rooms, roomBlocks = [], lecturerBlocks = [], config }) {
  const ctx = buildContext({ rooms, roomBlocks, lecturerBlocks, config });
  const { cfg } = ctx;
  const unitById = new Map(units.map((u) => [u.id, u]));
  const issues = [];
  const lbl = (s) => `${s.unit_code} (${s.cohort || 'no cohort'}) ${s.day} ${s.start_time}-${s.end_time}`;
  const items = slots.map((s) => ({ s, a: toMin(s.start_time), b: toMin(s.end_time) }));
  for (const { s, a, b } of items) {
    if (!cfg.days.includes(s.day)) issues.push({ slot_id: s.id, type: 'day', message: `${lbl(s)}: ${s.day} is not an open teaching day.` });
    if (!(a < b)) { issues.push({ slot_id: s.id, type: 'time', message: `${lbl(s)}: end time must be after start time.` }); continue; }
    if (a < toMin(cfg.dayStart) || b > toMin(cfg.dayEnd)) issues.push({ slot_id: s.id, type: 'hours', message: `${lbl(s)}: outside operating hours ${cfg.dayStart}-${cfg.dayEnd}.` });
    if (cfg.breakStart && cfg.breakEnd && overlap(a, b, toMin(cfg.breakStart), toMin(cfg.breakEnd))) issues.push({ slot_id: s.id, type: 'break', message: `${lbl(s)}: overlaps the protected break ${cfg.breakStart}-${cfg.breakEnd}.` });
    const room = ctx.roomById.get(s.room_id);
    if (!room) issues.push({ slot_id: s.id, type: 'room', message: `${lbl(s)}: no valid room assigned.` });
    else {
      const u = unitById.get(s.unit_id);
      if (u && Number(room.capacity) < Number(u.class_size || 0)) issues.push({ slot_id: s.id, type: 'capacity', message: `${lbl(s)}: ${room.name} seats ${room.capacity} but the class has ${u.class_size}.` });
      if (blockedBy(ctx.blocksByRoom.get(room.id), s.day, a, b)) issues.push({ slot_id: s.id, type: 'room_block', message: `${lbl(s)}: ${room.name} is under maintenance then.` });
    }
    const lk = s.lecturer_user_id ? `id:${s.lecturer_user_id}` : (norm(s.lecturer_name) ? `n:${norm(s.lecturer_name)}` : '');
    if (lk && blockedBy(ctx.blocksByLecturer.get(lk), s.day, a, b)) issues.push({ slot_id: s.id, type: 'lecturer_block', message: `${lbl(s)}: ${s.lecturer_name || 'lecturer'} is unavailable then.` });
  }
  const pair = (x, y) => x.s.day === y.s.day && overlap(x.a, x.b, y.a, y.b);
  for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
    const x = items[i]; const y = items[j];
    if (!pair(x, y)) continue;
    const sameShared = x.s.group_key && x.s.group_key === y.s.group_key; // shared class: one meeting, several cohorts
    if (x.s.room_id && x.s.room_id === y.s.room_id && !sameShared) issues.push({ slot_id: x.s.id, type: 'room_clash', message: `Room clash: ${lbl(x.s)} and ${lbl(y.s)} use the same room.` });
    const lx = x.s.lecturer_user_id ? `id:${x.s.lecturer_user_id}` : norm(x.s.lecturer_name);
    const ly = y.s.lecturer_user_id ? `id:${y.s.lecturer_user_id}` : norm(y.s.lecturer_name);
    if (lx && lx === ly && !sameShared) issues.push({ slot_id: x.s.id, type: 'lecturer_clash', message: `Lecturer clash: ${x.s.lecturer_name || 'lecturer'} is in ${lbl(x.s)} and ${lbl(y.s)}.` });
    if (norm(x.s.cohort) && norm(x.s.cohort) === norm(y.s.cohort)) issues.push({ slot_id: x.s.id, type: 'cohort_clash', message: `Cohort clash: ${x.s.cohort} has ${lbl(x.s)} and ${lbl(y.s)}.` });
  }
  return issues;
}

module.exports = { DEFAULT_CONFIG, cleanConfig, generate, validate, toMin, toTime };
