const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', requireAuth, (req, res) => {
  const totalStudents = db.prepare(`SELECT COUNT(*) c FROM students WHERE status='active'`).get().c;
  const totalTeachers = db.prepare(`SELECT COUNT(*) c FROM teachers`).get().c;
  const totalClasses = db.prepare(`SELECT COUNT(*) c FROM classes`).get().c;

  const today = new Date().toISOString().slice(0, 10);
  const presentToday = db.prepare(
    `SELECT COUNT(*) c FROM attendance WHERE date = ? AND status = 'present'`
  ).get(today).c;
  const absentToday = db.prepare(
    `SELECT COUNT(*) c FROM attendance WHERE date = ? AND status = 'absent'`
  ).get(today).c;

  const feesRow = db.prepare(`SELECT SUM(amount_due) due, SUM(amount_paid) paid FROM fees`).get();

  const attendanceTrend = db.prepare(`
    SELECT date,
      SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late
    FROM attendance GROUP BY date ORDER BY date ASC
  `).all();

  const classSizes = db.prepare(`
    SELECT c.name || ' ' || c.stream as label, COUNT(s.id) as count
    FROM classes c LEFT JOIN students s ON s.class_id = c.id AND s.status='active'
    GROUP BY c.id ORDER BY c.name
  `).all();

  const recentAnnouncements = db.prepare(
    `SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5`
  ).all();

  res.json({
    totalStudents,
    totalTeachers,
    totalClasses,
    presentToday,
    absentToday,
    feesDue: feesRow.due || 0,
    feesPaid: feesRow.paid || 0,
    attendanceTrend,
    classSizes,
    recentAnnouncements,
  });
});

// ---------- Admin dashboard ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function percent(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

// Cumulative active students at the end of each of the last 6 months.
// Students with no enrolment date were there before tracking started, so they count in every month.
function enrolmentTrend() {
  const now = new Date();
  const trend = [];
  for (let back = 5; back >= 0; back--) {
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back + 1, 0));
    const count = db.prepare(
      `SELECT COUNT(*) c FROM students WHERE status = 'active' AND (enrolled_on IS NULL OR enrolled_on <= ?)`
    ).get(monthEnd.toISOString().slice(0, 10)).c;
    trend.push({ month: MONTHS[monthEnd.getUTCMonth()], students: count });
  }
  return trend;
}

const AUDIT_TITLES = {
  create_user: 'New account created',
  update_user: 'Account updated',
  reset_password: 'Password reset',
  deactivate_user: 'Account deactivated',
  activate_user: 'Account activated',
  delete_user: 'Login deleted',
};

function recentActivities() {
  const items = [];

  db.prepare(`
    SELECT r.amount, r.created_at, s.name AS student
    FROM receipts r LEFT JOIN students s ON s.id = r.student_id
    ORDER BY r.created_at DESC LIMIT 6
  `).all().forEach((r) => items.push({
    type: 'payment',
    title: 'Payment received',
    detail: `KES ${Number(r.amount).toLocaleString('en-KE')}${r.student ? ' – ' + r.student : ''}`,
    at: r.created_at,
  }));

  db.prepare('SELECT title, created_at FROM announcements ORDER BY created_at DESC LIMIT 6').all()
    .forEach((a) => items.push({ type: 'announcement', title: 'New announcement', detail: a.title, at: a.created_at }));

  db.prepare(`
    SELECT a.title, a.created_at, c.name || ' ' || c.stream AS class_name
    FROM assignments a LEFT JOIN classes c ON c.id = a.class_id
    ORDER BY a.created_at DESC LIMIT 6
  `).all().forEach((a) => items.push({
    type: 'assignment',
    title: 'New assignment',
    detail: a.class_name ? `${a.title} – ${a.class_name}` : a.title,
    at: a.created_at,
  }));

  db.prepare(`
    SELECT m.subject, m.created_at, u.name AS sender
    FROM messages m LEFT JOIN users u ON u.id = m.sender_id
    ORDER BY m.created_at DESC LIMIT 6
  `).all().forEach((m) => items.push({
    type: 'message',
    title: 'New message',
    detail: m.sender ? `From: ${m.sender}` : (m.subject || ''),
    at: m.created_at,
  }));

  db.prepare('SELECT action, details, created_at FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 6').all()
    .forEach((l) => items.push({
      type: 'account',
      title: AUDIT_TITLES[l.action] || String(l.action || 'Activity').replace(/_/g, ' '),
      detail: l.details || '',
      at: l.created_at,
    }));

  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);
}

router.get('/overview', requireAuth, requireRole('admin'), (req, res) => {
  try {
  const count = (sql) => db.prepare(sql).get().c;

  const fees = db.prepare('SELECT SUM(amount_due) due, SUM(amount_paid) paid FROM fees').get();
  const totalDue = fees.due || 0;
  const collected = fees.paid || 0;

  const feesByTerm = db.prepare(`
    SELECT term, SUM(amount_due) due, SUM(amount_paid) paid, MAX(due_date) last_due
    FROM fees GROUP BY term ORDER BY last_due DESC, term DESC LIMIT 4
  `).all().reverse().map((t) => ({ term: t.term, percent: percent(t.paid, t.due) }));

  // The latest 6 days that have attendance records (weekday labels are added by the page)
  const attendance = db.prepare(`
    SELECT date,
      SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) AS attended,
      COUNT(*) AS total
    FROM attendance GROUP BY date ORDER BY date DESC LIMIT 6
  `).all().reverse().map((d) => ({ date: d.date, percent: percent(d.attended, d.total) }));

  const academicRoles = `('lecturer','senior_lecturer','professor','academic_staff','teacher')`;
  const activeUsers = count(`SELECT COUNT(*) c FROM users WHERE active = 1`);
  const programCount = count(`SELECT COUNT(*) c FROM programs WHERE status = 'active'`);
  const lecturerCount = count(`SELECT COUNT(*) c FROM users WHERE active = 1 AND role IN ${academicRoles}`);
  const staffCount = count(`SELECT COUNT(*) c FROM staff WHERE status = 'active'`) + count(`SELECT COUNT(*) c FROM users WHERE active = 1 AND role IN ('vice_chancellor','deputy_vc','registrar','deputy_registrar','finance_director','finance_officer','hr_director','hr_officer','dean','deputy_dean','hod','non_academic_staff','admissions_officer','examination_officer','exam_board','procurement_officer','stores_officer','asset_officer','facilities_officer','transport_officer','security_officer','medical_officer','counselor','research_officer','student_affairs_officer','accommodation_officer','auditor')`);

  let distribution = db.prepare(`
    SELECT COALESCE(f.name, 'Unassigned') name, COUNT(DISTINCT ue.student_id) value
    FROM university_enrollments ue
    LEFT JOIN programs p ON p.id = ue.program_id
    LEFT JOIN university_departments d ON d.id = p.department_id
    LEFT JOIN faculties f ON f.id = d.faculty_id
    WHERE ue.status = 'active'
    GROUP BY f.id, f.name ORDER BY value DESC LIMIT 8
  `).all();

  let performance = db.prepare(`
    SELECT COALESCE(f.name,'Academic Unit') name, ROUND(AVG(ur.grade_points),2) gpa
    FROM university_results ur
    LEFT JOIN course_offerings co ON co.id=ur.offering_id
    LEFT JOIN university_courses uc ON uc.id=co.course_id
    LEFT JOIN university_departments d ON d.id=uc.department_id
    LEFT JOIN faculties f ON f.id=d.faculty_id
    WHERE ur.grade_points IS NOT NULL
    GROUP BY f.id,f.name ORDER BY name LIMIT 8
  `).all();

  const quickStats = [
    { label: 'Graduation Rate', value: `${percent(count(`SELECT COUNT(*) c FROM alumni WHERE graduation_year IS NOT NULL`), Math.max(count(`SELECT COUNT(*) c FROM students`), 1))}%`, hint: 'tracked alumni', icon: 'graduation' },
    { label: 'Active Users', value: activeUsers.toLocaleString(), hint: 'accounts active', icon: 'users' },
    { label: 'Library Usage', value: count(`SELECT COUNT(*) c FROM borrowings`).toLocaleString(), hint: 'book transactions', icon: 'library' },
    { label: 'Total Revenue', value: `KES ${Math.round(collected).toLocaleString('en-KE')}`, hint: 'fees collected', icon: 'revenue' },
  ];

  const systemStatus = [
    { label: 'Student Portal', ok: true },
    { label: 'Staff Portal', ok: true },
    { label: 'Payment Gateway', ok: Boolean(process.env.MPESA_CONSUMER_KEY || process.env.PAYMENT_GATEWAY_URL) },
    { label: 'Library System', ok: true },
    { label: 'Database', ok: true },
    { label: 'Email Service', ok: Boolean(process.env.SMTP_HOST) },
  ];

  res.json({
    totals: {
      students: count(`SELECT COUNT(*) c FROM students WHERE status = 'active'`),
      newStudentsThisMonth: count(`SELECT COUNT(*) c FROM students WHERE status = 'active' AND enrolled_on >= date('now', 'start of month')`),
      teachers: lecturerCount,
      staff: staffCount,
      classes: count("SELECT COUNT(*) c FROM university_enrollments WHERE status = 'active'"),
      programs: programCount,
      activeUsers,
    },
    fees: { collected, outstanding: Math.max(totalDue - collected, 0), totalDue, percent: percent(collected, totalDue) },
    feesByTerm, attendance, enrolment: enrolmentTrend(), distribution, performance, quickStats, systemStatus,
    branding: {
      dashboardImage: db.prepare("SELECT value FROM system_settings WHERE key='dashboard_image_url'").get()?.value || '',
      universityName: db.prepare("SELECT value FROM system_settings WHERE key='University Name'").get()?.value || 'Matara University',
    },
    events: db.prepare('SELECT id, title, description, event_date, start_time, end_time FROM events ORDER BY event_date, start_time LIMIT 400').all(),
    activities: recentActivities(),
  });
  } catch(err) {
    console.error('[dashboard/overview error]:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ---------- Executive dashboard (Vice Chancellor / Deputy VC) ----------
// Read-only university-wide figures: revenue, enrolment and graduation. Every block is
// computed on its own, so one missing table never blanks the whole page.

function safeValue(fn, fallback) { try { return fn(); } catch (_) { return fallback; } }
const num = (v) => Number(v || 0);

router.get('/executive', requireAuth, requireRole('admin', 'vice_chancellor', 'deputy_vc'), (req, res) => {
  const revenue = safeValue(() => {
    const feesRow = db.prepare('SELECT COALESCE(SUM(amount_due),0) due, COALESCE(SUM(amount_paid),0) paid FROM fees').get();
    const inv = db.prepare('SELECT COALESCE(SUM(total),0) due, COALESCE(SUM(paid),0) paid FROM university_invoices').get();
    const other = db.prepare('SELECT COALESCE(SUM(amount),0) total FROM income').get().total;
    const spent = db.prepare('SELECT COALESCE(SUM(amount),0) total FROM expenses').get().total;
    const billed = num(feesRow.due) + num(inv.due);
    const collected = num(feesRow.paid) + num(inv.paid);
    return {
      billed, collected, other_income: num(other), total_revenue: collected + num(other), expenses: num(spent),
      outstanding: Math.max(0, billed - collected), collection_rate: percent(collected, billed),
    };
  }, { billed: 0, collected: 0, other_income: 0, total_revenue: 0, expenses: 0, outstanding: 0, collection_rate: 0 });

  // Money received in each of the last 6 months (receipts, university payments and other income).
  const revenueTrend = safeValue(() => {
    const now = new Date();
    const out = [];
    for (let back = 5; back >= 0; back--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
      const key = d.toISOString().slice(0, 7);
      const receipts = db.prepare("SELECT COALESCE(SUM(amount),0) t FROM receipts WHERE substr(created_at,1,7) = ?").get(key).t;
      const payments = db.prepare("SELECT COALESCE(SUM(amount),0) t FROM university_payments WHERE status='confirmed' AND substr(paid_at,1,7) = ?").get(key).t;
      const other = db.prepare('SELECT COALESCE(SUM(amount),0) t FROM income WHERE substr(income_date,1,7) = ?').get(key).t;
      out.push({ month: MONTHS[d.getUTCMonth()], revenue: num(receipts) + num(payments) + num(other) });
    }
    return out;
  }, []);

  const enrolment = safeValue(() => {
    const byStatus = db.prepare('SELECT COALESCE(status, \'active\') status, COUNT(*) count FROM students GROUP BY COALESCE(status, \'active\') ORDER BY count DESC').all();
    const total = byStatus.reduce((a, r) => a + r.count, 0);
    const active = byStatus.find((r) => r.status === 'active')?.count || 0;
    const byProgramme = safeValue(() => db.prepare(`SELECT p.name, COUNT(*) count FROM university_enrollments e JOIN programs p ON p.id = e.program_id
      WHERE e.status = 'active' GROUP BY p.id ORDER BY count DESC LIMIT 8`).all(), []);
    const byFaculty = safeValue(() => db.prepare(`SELECT f.name, COUNT(*) count FROM university_enrollments e JOIN programs p ON p.id = e.program_id
      JOIN university_departments d ON d.id = p.department_id JOIN faculties f ON f.id = d.faculty_id
      WHERE e.status = 'active' GROUP BY f.id ORDER BY count DESC`).all(), []);
    return { total, active, by_status: byStatus, by_programme: byProgramme, by_faculty: byFaculty, trend: enrolmentTrend() };
  }, { total: 0, active: 0, by_status: [], by_programme: [], by_faculty: [], trend: [] });

  const graduation = safeValue(() => {
    const years = db.prepare('SELECT academic_year, COUNT(*) candidates, SUM(CASE WHEN academic_status = \'ready\' THEN 1 ELSE 0 END) ready, SUM(CASE WHEN senate_status = \'approved\' THEN 1 ELSE 0 END) senate, SUM(CASE WHEN cleared_at IS NOT NULL THEN 1 ELSE 0 END) cleared FROM graduation_clearance GROUP BY academic_year ORDER BY academic_year DESC LIMIT 5').all()
      .map((y) => ({ ...y, rate: percent(y.cleared, y.candidates) }));
    const all = years.reduce((a, y) => ({ candidates: a.candidates + y.candidates, cleared: a.cleared + y.cleared, ready: a.ready + y.ready, senate: a.senate + y.senate }), { candidates: 0, cleared: 0, ready: 0, senate: 0 });
    const graduated = db.prepare("SELECT COUNT(*) c FROM students WHERE status = 'graduated'").get().c;
    return { ...all, graduated, rate: percent(all.cleared, all.candidates), years };
  }, { candidates: 0, cleared: 0, ready: 0, senate: 0, graduated: 0, rate: 0, years: [] });

  const people = safeValue(() => ({
    staff: db.prepare('SELECT COUNT(*) c FROM staff').get().c + db.prepare('SELECT COUNT(*) c FROM teachers').get().c,
    programmes: db.prepare("SELECT COUNT(*) c FROM programs WHERE COALESCE(status,'active') = 'active'").get().c,
    faculties: db.prepare('SELECT COUNT(*) c FROM faculties').get().c,
  }), { staff: 0, programmes: 0, faculties: 0 });

  const attention = safeValue(() => ({
    open_motions: db.prepare("SELECT COUNT(*) c FROM senate_motions WHERE status = 'open'").get().c,
    pending_workflows: db.prepare("SELECT COUNT(*) c FROM workflow_requests WHERE status = 'pending'").get().c,
    open_suspensions: db.prepare('SELECT COUNT(*) c FROM student_suspensions WHERE ended_at IS NULL').get().c,
    active_holds: db.prepare('SELECT COUNT(*) c FROM financial_holds WHERE released_at IS NULL').get().c,
  }), { open_motions: 0, pending_workflows: 0, open_suspensions: 0, active_holds: 0 });

  res.json({
    institution: safeValue(() => db.prepare("SELECT value FROM system_settings WHERE key='University Name'").get()?.value, null) || 'Matara University',
    generated_at: new Date().toISOString(),
    revenue, revenue_trend: revenueTrend, enrolment, graduation, people, attention,
  });
});

module.exports = router;
