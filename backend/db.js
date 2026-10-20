// db.js
// This file creates (or opens) a local SQLite database file called matara.db
// SQLite needs NO separate server/installation - it's just a file on disk.
// That makes it perfect for learning and running everything locally.

const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// One local demo password is shared by seed/migration so later migrations never
// reference a variable that only exists inside seed(). Set DEMO_PASSWORD in
// production/local environments when a fixed demo password is not desired.
const demoPassword = process.env.DEMO_PASSWORD || 'MU-Demo-2026';

const dataDir = process.env.MATARA_DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'matara.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function tableIsEmpty(table) {
  const row = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get();
  return row.c === 0;
}

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','teacher','student')),
      created_at TEXT DEFAULT (datetime('now')),
      session_version INTEGER NOT NULL DEFAULT 1,
      password_changed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,          -- e.g. "Form 2"
      stream TEXT NOT NULL,        -- e.g. "North"
      class_teacher_id INTEGER,
      capacity INTEGER DEFAULT 40,
      FOREIGN KEY (class_teacher_id) REFERENCES teachers(id)
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      staff_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      specialty TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      adm_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      gender TEXT,
      dob TEXT,
      class_id INTEGER,
      guardian_name TEXT,
      guardian_phone TEXT,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present','absent','late')),
      UNIQUE(student_id, date),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      term TEXT NOT NULL,
      year TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      score REAL NOT NULL,
      FOREIGN KEY (exam_id) REFERENCES exams(id),
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      term TEXT NOT NULL,
      amount_due REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      due_date TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      audience TEXT NOT NULL DEFAULT 'all',
      author TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT, head_id INTEGER);
    CREATE TABLE IF NOT EXISTS parents (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS parent_students (parent_id INTEGER NOT NULL, student_id INTEGER NOT NULL, relationship TEXT DEFAULT 'Guardian', PRIMARY KEY(parent_id,student_id), FOREIGN KEY(parent_id) REFERENCES parents(id) ON DELETE CASCADE, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, employee_no TEXT UNIQUE, name TEXT NOT NULL, position TEXT, department_id INTEGER, phone TEXT, email TEXT, employment_date TEXT, status TEXT DEFAULT 'active', FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(department_id) REFERENCES departments(id));
    CREATE TABLE IF NOT EXISTS academic_years (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, start_date TEXT, end_date TEXT, active INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS terms (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, name TEXT NOT NULL, start_date TEXT, end_date TEXT, active INTEGER DEFAULT 0, FOREIGN KEY(academic_year_id) REFERENCES academic_years(id));
    CREATE TABLE IF NOT EXISTS timetables (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, subject_id INTEGER, teacher_id INTEGER, day TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, room TEXT, FOREIGN KEY(class_id) REFERENCES classes(id), FOREIGN KEY(subject_id) REFERENCES subjects(id), FOREIGN KEY(teacher_id) REFERENCES teachers(id));
    CREATE TABLE IF NOT EXISTS assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER, class_id INTEGER, subject_id INTEGER, title TEXT NOT NULL, description TEXT, due_date TEXT, max_marks REAL DEFAULT 100, created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(teacher_id) REFERENCES teachers(id), FOREIGN KEY(class_id) REFERENCES classes(id), FOREIGN KEY(subject_id) REFERENCES subjects(id));
    CREATE TABLE IF NOT EXISTS assignment_submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, assignment_id INTEGER, student_id INTEGER, content TEXT, file_path TEXT, submitted_at TEXT DEFAULT(datetime('now')), marks REAL, feedback TEXT, status TEXT DEFAULT 'submitted', UNIQUE(assignment_id,student_id), FOREIGN KEY(assignment_id) REFERENCES assignments(id) ON DELETE CASCADE, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS learning_materials (id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER, class_id INTEGER, subject_id INTEGER, title TEXT NOT NULL, description TEXT, file_path TEXT, url TEXT, created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(teacher_id) REFERENCES teachers(id), FOREIGN KEY(class_id) REFERENCES classes(id), FOREIGN KEY(subject_id) REFERENCES subjects(id));
    CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, capacity INTEGER DEFAULT 40);
    CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, author TEXT, isbn TEXT, category TEXT, copies INTEGER DEFAULT 1, available INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS borrowings (id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER, student_id INTEGER, borrowed_at TEXT DEFAULT(datetime('now')), due_date TEXT, returned_at TEXT, fine REAL DEFAULT 0, FOREIGN KEY(book_id) REFERENCES books(id), FOREIGN KEY(student_id) REFERENCES students(id));
    CREATE TABLE IF NOT EXISTS medical_profiles (student_id INTEGER PRIMARY KEY, blood_group TEXT, allergies TEXT, conditions TEXT, emergency_contact TEXT, notes TEXT, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS medical_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, visit_date TEXT DEFAULT(date('now')), complaint TEXT, treatment TEXT, officer TEXT, notes TEXT, FOREIGN KEY(student_id) REFERENCES students(id));
    CREATE TABLE IF NOT EXISTS vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, registration TEXT UNIQUE NOT NULL, model TEXT, capacity INTEGER, status TEXT DEFAULT 'active');
    CREATE TABLE IF NOT EXISTS drivers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, license_no TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS routes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, pickup_points TEXT);
    CREATE TABLE IF NOT EXISTS transport_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, route_id INTEGER, vehicle_id INTEGER, driver_id INTEGER, FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(route_id) REFERENCES routes(id), FOREIGN KEY(vehicle_id) REFERENCES vehicles(id), FOREIGN KEY(driver_id) REFERENCES drivers(id));
    CREATE TABLE IF NOT EXISTS houses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS dormitories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, capacity INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS boarding_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER UNIQUE, house_id INTEGER, dormitory_id INTEGER, room TEXT, bed TEXT, FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(house_id) REFERENCES houses(id), FOREIGN KEY(dormitory_id) REFERENCES dormitories(id));
    CREATE TABLE IF NOT EXISTS discipline_incidents (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, incident_date TEXT DEFAULT(date('now')), type TEXT, description TEXT, action_taken TEXT, reported_by TEXT, resolved INTEGER DEFAULT 0, FOREIGN KEY(student_id) REFERENCES students(id));
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, event_date TEXT NOT NULL, start_time TEXT, end_time TEXT, audience TEXT DEFAULT 'all');
    CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT NOT NULL, body TEXT, read_at TEXT, created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER, recipient_id INTEGER, subject TEXT, body TEXT NOT NULL, read_at TEXT, created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(sender_id) REFERENCES users(id), FOREIGN KEY(recipient_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, description TEXT, amount REAL NOT NULL, expense_date TEXT DEFAULT(date('now')), payment_method TEXT, reference TEXT, created_by INTEGER, FOREIGN KEY(created_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS income (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, description TEXT, amount REAL NOT NULL, income_date TEXT DEFAULT(date('now')), reference TEXT, created_by INTEGER, FOREIGN KEY(created_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS receipts (id INTEGER PRIMARY KEY AUTOINCREMENT, receipt_no TEXT UNIQUE NOT NULL, student_id INTEGER, payment_id INTEGER, amount REAL NOT NULL, method TEXT, reference TEXT, created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(payment_id) REFERENCES fees(id));
    CREATE TABLE IF NOT EXISTS fee_structures (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, term TEXT NOT NULL, category TEXT NOT NULL, amount REAL NOT NULL, academic_year TEXT, FOREIGN KEY(class_id) REFERENCES classes(id));
    CREATE TABLE IF NOT EXISTS grading_scales (id INTEGER PRIMARY KEY AUTOINCREMENT, min_score REAL NOT NULL, max_score REAL NOT NULL, grade TEXT NOT NULL, points REAL DEFAULT 0, comment TEXT);
    CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, entity TEXT, entity_id INTEGER, details TEXT, created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS password_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, action TEXT NOT NULL, changed_by INTEGER, changed_at TEXT DEFAULT(datetime('now')), reason TEXT, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(changed_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS password_reset_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS account_recovery (user_id INTEGER PRIMARY KEY, recovery_code_hash TEXT NOT NULL, updated_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS custom_roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT, created_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS role_permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, role_id INTEGER NOT NULL, module TEXT NOT NULL, permission TEXT NOT NULL, UNIQUE(role_id,module,permission), FOREIGN KEY(role_id) REFERENCES custom_roles(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS admissions (id INTEGER PRIMARY KEY AUTOINCREMENT, application_no TEXT UNIQUE, applicant_name TEXT NOT NULL, guardian_name TEXT, guardian_phone TEXT, class_applied TEXT, status TEXT DEFAULT 'pending', notes TEXT, created_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS alumni (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, graduation_year TEXT, destination TEXT, phone TEXT, email TEXT, notes TEXT, FOREIGN KEY(student_id) REFERENCES students(id));
    CREATE TABLE IF NOT EXISTS curriculum (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, subject_id INTEGER, strand TEXT, substrand TEXT, learning_outcome TEXT, FOREIGN KEY(class_id) REFERENCES classes(id), FOREIGN KEY(subject_id) REFERENCES subjects(id));
    CREATE TABLE IF NOT EXISTS lesson_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER, class_id INTEGER, subject_id INTEGER, topic TEXT, lesson_date TEXT, objectives TEXT, activities TEXT, status TEXT DEFAULT 'planned');
    CREATE TABLE IF NOT EXISTS exam_schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER, class_id INTEGER, subject_id INTEGER, exam_date TEXT, start_time TEXT, end_time TEXT, room TEXT, seat_plan TEXT);
    CREATE TABLE IF NOT EXISTS student_leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, start_date TEXT, end_date TEXT, reason TEXT, status TEXT DEFAULT 'pending', approved_by INTEGER);
    -- fee_structures is defined above; migration-safe schema is retained.
    CREATE TABLE IF NOT EXISTS scholarships (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, name TEXT, type TEXT, amount REAL, percentage REAL, start_term TEXT, end_term TEXT, status TEXT DEFAULT 'active');
    CREATE TABLE IF NOT EXISTS staff_leave (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, leave_type TEXT, start_date TEXT, end_date TEXT, reason TEXT, status TEXT DEFAULT 'pending', approved_by INTEGER);
    CREATE TABLE IF NOT EXISTS payroll (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, month TEXT, basic REAL DEFAULT 0, allowances REAL DEFAULT 0, deductions REAL DEFAULT 0, net REAL DEFAULT 0, status TEXT DEFAULT 'draft');
    CREATE TABLE IF NOT EXISTS appraisals (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, review_date TEXT, score REAL, comments TEXT, reviewer_id INTEGER);
    CREATE TABLE IF NOT EXISTS inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, quantity REAL DEFAULT 0, reorder_level REAL DEFAULT 0, unit TEXT, location TEXT, supplier TEXT);
    CREATE TABLE IF NOT EXISTS assets (id INTEGER PRIMARY KEY AUTOINCREMENT, asset_no TEXT UNIQUE, name TEXT NOT NULL, category TEXT, purchase_date TEXT, cost REAL, location TEXT, assigned_to TEXT, status TEXT DEFAULT 'active');
    CREATE TABLE IF NOT EXISTS vendors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, tax_no TEXT);
    CREATE TABLE IF NOT EXISTS procurement_requisitions (id INTEGER PRIMARY KEY AUTOINCREMENT, requested_by INTEGER, item TEXT, quantity REAL, estimated_cost REAL, vendor_id INTEGER, status TEXT DEFAULT 'pending', approved_by INTEGER, created_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS message_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, channel TEXT, subject TEXT, body TEXT, active INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, key_hash TEXT NOT NULL, last_used_at TEXT, active INTEGER DEFAULT 1, created_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS consent_records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, consent_type TEXT, granted INTEGER DEFAULT 0, granted_at TEXT, revoked_at TEXT);
    CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT, file_path TEXT, owner_id INTEGER, created_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS branches (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, code TEXT UNIQUE, address TEXT, phone TEXT, active INTEGER DEFAULT 1);

    CREATE TABLE IF NOT EXISTS online_exams (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, subject_id INTEGER, class_id INTEGER, instructions TEXT, duration_minutes INTEGER DEFAULT 30, start_at TEXT, end_at TEXT, max_marks REAL DEFAULT 100, pass_mark REAL DEFAULT 50, published INTEGER DEFAULT 0, randomize_questions INTEGER DEFAULT 0, FOREIGN KEY(subject_id) REFERENCES subjects(id), FOREIGN KEY(class_id) REFERENCES classes(id));
    CREATE TABLE IF NOT EXISTS exam_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER NOT NULL, question TEXT NOT NULL, type TEXT NOT NULL, marks REAL DEFAULT 1, position INTEGER DEFAULT 0, correct_answer TEXT, options_json TEXT, FOREIGN KEY(exam_id) REFERENCES online_exams(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS exam_submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER NOT NULL, student_id INTEGER NOT NULL, started_at TEXT DEFAULT(datetime('now')), submitted_at TEXT, score REAL DEFAULT 0, status TEXT DEFAULT 'in_progress', feedback TEXT, UNIQUE(exam_id,student_id), FOREIGN KEY(exam_id) REFERENCES online_exams(id) ON DELETE CASCADE, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS exam_answers (id INTEGER PRIMARY KEY AUTOINCREMENT, submission_id INTEGER NOT NULL, question_id INTEGER NOT NULL, answer TEXT, awarded_marks REAL DEFAULT 0, feedback TEXT, UNIQUE(submission_id,question_id), FOREIGN KEY(submission_id) REFERENCES exam_submissions(id) ON DELETE CASCADE, FOREIGN KEY(question_id) REFERENCES exam_questions(id) ON DELETE CASCADE);
  `);

  // Seed first: on a brand-new database migrate() also adds a user, which would
  // make the users table non-empty and stop the admin/teacher/student demo data
  // from ever being created.
  seed();
  migrate();
  migrateRoleModel();
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, action TEXT NOT NULL, changed_by INTEGER, changed_at TEXT DEFAULT(datetime('now')), reason TEXT, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(changed_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS password_reset_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS account_recovery (user_id INTEGER PRIMARY KEY, recovery_code_hash TEXT NOT NULL, updated_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS security_incidents (id INTEGER PRIMARY KEY AUTOINCREMENT, incident_no TEXT UNIQUE, title TEXT NOT NULL, category TEXT, severity TEXT DEFAULT 'medium', status TEXT DEFAULT 'open', location TEXT, occurred_at TEXT, reported_at TEXT DEFAULT(datetime('now')), description TEXT, reported_by INTEGER, assigned_to INTEGER, resolution TEXT, closed_at TEXT, FOREIGN KEY(reported_by) REFERENCES users(id), FOREIGN KEY(assigned_to) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS security_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, incident_id INTEGER, report_type TEXT NOT NULL, title TEXT, body TEXT, status TEXT DEFAULT 'draft', submitted_by INTEGER, submitted_at TEXT, FOREIGN KEY(incident_id) REFERENCES security_incidents(id) ON DELETE SET NULL, FOREIGN KEY(submitted_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS security_visitors (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor_no TEXT UNIQUE, full_name TEXT NOT NULL, organization TEXT, phone TEXT, id_type TEXT, id_reference TEXT, host_user_id INTEGER, purpose TEXT, vehicle_no TEXT, check_in TEXT DEFAULT(datetime('now')), check_out TEXT, status TEXT DEFAULT 'inside', notes TEXT, FOREIGN KEY(host_user_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS security_access_records (id INTEGER PRIMARY KEY AUTOINCREMENT, person_name TEXT, user_id INTEGER, access_point TEXT, direction TEXT DEFAULT 'in', access_time TEXT DEFAULT(datetime('now')), method TEXT, badge_no TEXT, authorized_by INTEGER, notes TEXT, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(authorized_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS security_lost_found (id INTEGER PRIMARY KEY AUTOINCREMENT, item_no TEXT UNIQUE, item_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, location TEXT, found_at TEXT, reported_by INTEGER, status TEXT DEFAULT 'stored', claimant_name TEXT, claimant_user_id INTEGER, released_at TEXT, released_by INTEGER, notes TEXT, FOREIGN KEY(reported_by) REFERENCES users(id), FOREIGN KEY(claimant_user_id) REFERENCES users(id), FOREIGN KEY(released_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS security_emergencies (id INTEGER PRIMARY KEY AUTOINCREMENT, event_no TEXT UNIQUE, event_type TEXT NOT NULL, title TEXT NOT NULL, severity TEXT DEFAULT 'high', status TEXT DEFAULT 'active', location TEXT, started_at TEXT DEFAULT(datetime('now')), ended_at TEXT, description TEXT, declared_by INTEGER, lead_officer INTEGER, response_plan TEXT, FOREIGN KEY(declared_by) REFERENCES users(id), FOREIGN KEY(lead_officer) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS security_alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, alert_no TEXT UNIQUE, title TEXT NOT NULL, message TEXT NOT NULL, severity TEXT DEFAULT 'medium', audience TEXT DEFAULT 'all', status TEXT DEFAULT 'active', starts_at TEXT DEFAULT(datetime('now')), ends_at TEXT, created_by INTEGER, FOREIGN KEY(created_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS security_investigations (id INTEGER PRIMARY KEY AUTOINCREMENT, investigation_no TEXT UNIQUE, incident_id INTEGER, title TEXT NOT NULL, lead_investigator INTEGER, status TEXT DEFAULT 'open', opened_at TEXT DEFAULT(datetime('now')), closed_at TEXT, findings TEXT, actions TEXT, confidential INTEGER DEFAULT 1, FOREIGN KEY(incident_id) REFERENCES security_incidents(id) ON DELETE SET NULL, FOREIGN KEY(lead_investigator) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS security_personnel (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL, badge_no TEXT UNIQUE, rank TEXT, shift TEXT, status TEXT DEFAULT 'active', assigned_zone TEXT, phone TEXT, hired_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS security_workflows (id INTEGER PRIMARY KEY AUTOINCREMENT, incident_id INTEGER, workflow_type TEXT NOT NULL, step_no INTEGER DEFAULT 1, action_required TEXT NOT NULL, assigned_to INTEGER, status TEXT DEFAULT 'pending', due_at TEXT, completed_at TEXT, completed_by INTEGER, notes TEXT, FOREIGN KEY(incident_id) REFERENCES security_incidents(id) ON DELETE CASCADE, FOREIGN KEY(assigned_to) REFERENCES users(id), FOREIGN KEY(completed_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS privacy_consents (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, consent_type TEXT NOT NULL, purpose TEXT NOT NULL, granted INTEGER NOT NULL DEFAULT 0, granted_at TEXT, revoked_at TEXT, source TEXT DEFAULT 'portal', UNIQUE(user_id,consent_type), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS privacy_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, request_type TEXT NOT NULL, status TEXT DEFAULT 'submitted', requested_at TEXT DEFAULT(datetime('now')), completed_at TEXT, notes TEXT, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS data_breaches (id INTEGER PRIMARY KEY AUTOINCREMENT, reference_no TEXT UNIQUE, detected_at TEXT DEFAULT(datetime('now')), severity TEXT DEFAULT 'medium', description TEXT NOT NULL, affected_records INTEGER DEFAULT 0, containment TEXT, regulator_notified_at TEXT, status TEXT DEFAULT 'open', reported_by INTEGER, FOREIGN KEY(reported_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS retention_policies (id INTEGER PRIMARY KEY AUTOINCREMENT, data_category TEXT UNIQUE NOT NULL, retention_days INTEGER NOT NULL, disposal_method TEXT NOT NULL, active INTEGER DEFAULT 1, updated_at TEXT DEFAULT(datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status,severity);
    CREATE INDEX IF NOT EXISTS idx_security_visitors_status ON security_visitors(status,check_in);
    CREATE INDEX IF NOT EXISTS idx_security_access_time ON security_access_records(access_time);
    CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_security_workflows_status ON security_workflows(status,assigned_to);
  `);
  const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get()?.sql || '';
  if (sql && !sql.includes("'vice_chancellor'")) {
    db.exec('PRAGMA foreign_keys=OFF');
    db.exec(`CREATE TABLE users_new (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','teacher','student','parent','staff','accounts','librarian','nurse','ict','vice_chancellor','deputy_vc','registrar','deputy_registrar','finance_director','finance_officer','hr_director','hr_officer','dean','deputy_dean','hod','lecturer','senior_lecturer','professor','academic_staff','non_academic_staff','admissions_officer','examination_officer','exam_board','procurement_officer','stores_officer','asset_officer','facilities_officer','transport_officer','security_officer','medical_officer','counselor','research_officer','student_affairs_officer','accommodation_officer','auditor','applicant','alumni')),created_at TEXT DEFAULT (datetime('now')),active INTEGER NOT NULL DEFAULT 1,session_version INTEGER NOT NULL DEFAULT 1,password_changed_at TEXT);`);
    db.exec("INSERT INTO users_new (id,name,email,password,role,created_at,active,session_version,password_changed_at) SELECT id,name,email,password,role,created_at,1,1,NULL FROM users");
    db.exec('DROP TABLE users');
    db.exec('ALTER TABLE users_new RENAME TO users');
    db.exec('PRAGMA foreign_keys=ON');
  }

  // Accounts can be switched off (e.g. when a staff member leaves) instead of deleted.
  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userColumns.includes('active')) {
    db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  }
  if (!userColumns.includes('session_version')) {
    db.exec('ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1');
  }
  if (!userColumns.includes('password_changed_at')) {
    db.exec("ALTER TABLE users ADD COLUMN password_changed_at TEXT");
  }
  if (!userColumns.includes('locked_until')) db.exec('ALTER TABLE users ADD COLUMN locked_until TEXT');
  if (!userColumns.includes('failed_login_count')) db.exec('ALTER TABLE users ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0');
  if (!userColumns.includes('two_factor_enabled')) db.exec('ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0');
  if (!userColumns.includes('two_factor_secret')) db.exec('ALTER TABLE users ADD COLUMN two_factor_secret TEXT');
  if (!userColumns.includes('two_factor_backup_hashes')) db.exec('ALTER TABLE users ADD COLUMN two_factor_backup_hashes TEXT');
  if (!userColumns.includes('activated_at')) db.exec("ALTER TABLE users ADD COLUMN activated_at TEXT");
  if (!userColumns.includes('deactivated_at')) db.exec("ALTER TABLE users ADD COLUMN deactivated_at TEXT");
  if (!userColumns.includes('email_provisioned')) db.exec('ALTER TABLE users ADD COLUMN email_provisioned INTEGER NOT NULL DEFAULT 1');
  if (!userColumns.includes('profile_image_url')) db.exec('ALTER TABLE users ADD COLUMN profile_image_url TEXT');

  // Enrolment date, used by the dashboard's enrolment trend.
  // Students added before this column existed stay NULL (treated as "already enrolled").
  const studentColumns = db.prepare('PRAGMA table_info(students)').all().map((c) => c.name);
  if (!studentColumns.includes('enrolled_on')) {
    db.exec('ALTER TABLE students ADD COLUMN enrolled_on TEXT');
  }

  // Production ERP extensions. These are additive and preserve existing data.
  const addColumn = (table, column, definition) => {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!tableExists) return;
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  };
  [
    ['students','nemis_upi','TEXT'],['students','nationality','TEXT'],['students','previous_school','TEXT'],
    ['students','admission_date','TEXT'],['students','house_name','TEXT'],['students','residence','TEXT'],
    ['students','photo_url','TEXT'],['students','religion','TEXT'],['students','birth_certificate_no','TEXT'],
    ['students','special_needs','TEXT'],['students','branch_id','INTEGER'],['students','graduation_date','TEXT'],
    ['students','withdrawal_date','TEXT'],['students','withdrawal_reason','TEXT'],['students','upi_status','TEXT'],
    ['teachers','email','TEXT'],['teachers','department_id','INTEGER'],['teachers','qualifications','TEXT'],['teachers','photo_url','TEXT'],
    ['teachers','employment_date','TEXT'],['teachers','kra_pin','TEXT'],['teachers','nssf_no','TEXT'],['teachers','shif_no','TEXT'],
    ['teachers','bank_name','TEXT'],['teachers','bank_account','TEXT'],['teachers','emergency_contact','TEXT'],
    ['staff','photo_url','TEXT'],['staff','qualifications','TEXT'],['staff','kra_pin','TEXT'],['staff','nssf_no','TEXT'],
    ['staff','shif_no','TEXT'],['staff','bank_name','TEXT'],['staff','bank_account','TEXT'],['staff','emergency_contact','TEXT'],
    ['classes','academic_year_id','INTEGER'],['classes','branch_id','INTEGER'],
    ['books','publisher','TEXT'],['books','barcode','TEXT'],['books','location','TEXT'],['books','purchase_price','REAL'],['books','shelf','TEXT'],
    ['online_exams','attempt_limit','INTEGER'],['online_exams','access_code','TEXT'],['online_exams','release_at','TEXT'],
    ['online_exams','retake_allowed','INTEGER'],['online_exams','auto_submit','INTEGER'],
    ['payroll','paye','REAL'],['payroll','nssf','REAL'],['payroll','shif','REAL'],['payroll','housing_levy','REAL'],['payroll','other_deductions','REAL'],['payroll','gross','REAL'],
    ['branches','logo_url','TEXT'],['branches','motto','TEXT'],
    ['documents','version','INTEGER'],['documents','expiry_date','TEXT'],['documents','visibility','TEXT'],
  ].forEach(([t,c,d])=>addColumn(t,c,d));

  db.exec(`
    CREATE TABLE IF NOT EXISTS student_profiles (
      student_id INTEGER PRIMARY KEY, nationality TEXT, previous_school TEXT, admission_date TEXT, nemis_upi TEXT, house_name TEXT, residence TEXT, photo_url TEXT, religion TEXT, birth_certificate_no TEXT, special_needs TEXT, created_at TEXT DEFAULT(datetime('now')), updated_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS student_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, contact_type TEXT DEFAULT 'guardian', relationship TEXT, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, is_primary INTEGER DEFAULT 0, emergency_priority INTEGER DEFAULT 0, created_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS student_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, title TEXT NOT NULL, category TEXT, file_path TEXT, document_no TEXT, issue_date TEXT, expiry_date TEXT, notes TEXT, created_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS student_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, event_date TEXT NOT NULL, event_type TEXT NOT NULL, title TEXT NOT NULL, details TEXT, actor_id INTEGER, created_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY(actor_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS student_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, transfer_date TEXT NOT NULL, from_school TEXT, to_school TEXT, from_class TEXT, to_class TEXT, reason TEXT, status TEXT DEFAULT 'completed', document_id INTEGER, created_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS student_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, status TEXT NOT NULL, effective_date TEXT NOT NULL, reason TEXT, changed_by INTEGER, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY(changed_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS student_certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, certificate_type TEXT NOT NULL, certificate_no TEXT, issue_date TEXT DEFAULT(date('now')), issued_by INTEGER, notes TEXT, FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(issued_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS student_id_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, card_no TEXT UNIQUE, issued_date TEXT DEFAULT(date('now')), expiry_date TEXT, qr_value TEXT, barcode_value TEXT, active INTEGER DEFAULT 1, FOREIGN KEY(student_id) REFERENCES students(id)
    );
    CREATE TABLE IF NOT EXISTS fee_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, fee_id INTEGER, amount REAL NOT NULL, method TEXT NOT NULL, reference TEXT, payment_date TEXT DEFAULT(date('now')), status TEXT DEFAULT 'posted', notes TEXT, received_by INTEGER, reversed_at TEXT, reversal_reason TEXT, FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(fee_id) REFERENCES fees(id), FOREIGN KEY(received_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS fee_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, payment_id INTEGER NOT NULL, fee_id INTEGER NOT NULL, amount REAL NOT NULL, FOREIGN KEY(payment_id) REFERENCES fee_payments(id) ON DELETE CASCADE, FOREIGN KEY(fee_id) REFERENCES fees(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, invoice_no TEXT UNIQUE NOT NULL, academic_year TEXT, term TEXT, issue_date TEXT DEFAULT(date('now')), due_date TEXT, status TEXT DEFAULT 'open', total REAL DEFAULT 0, FOREIGN KEY(student_id) REFERENCES students(id)
    );
    CREATE TABLE IF NOT EXISTS report_card_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, exam_id INTEGER, teacher_comment TEXT, class_teacher_comment TEXT, principal_comment TEXT, promotion_status TEXT, updated_by INTEGER, updated_at TEXT DEFAULT(datetime('now')), UNIQUE(student_id,exam_id), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE, FOREIGN KEY(updated_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS assessment_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL, weight REAL NOT NULL, term TEXT, academic_year TEXT, max_marks REAL DEFAULT 100, active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS gradebook_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, subject_id INTEGER NOT NULL, component_id INTEGER NOT NULL, exam_id INTEGER, marks REAL, comment TEXT, entered_by INTEGER, entered_at TEXT DEFAULT(datetime('now')), UNIQUE(student_id,subject_id,component_id,exam_id), FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(subject_id) REFERENCES subjects(id), FOREIGN KEY(component_id) REFERENCES assessment_components(id), FOREIGN KEY(exam_id) REFERENCES exams(id), FOREIGN KEY(entered_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS curriculum_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, subject_id INTEGER, strand TEXT, substrand TEXT, outcome TEXT, competency TEXT, value TEXT, activity TEXT, resource TEXT, assessment_method TEXT, progress REAL DEFAULT 0, FOREIGN KEY(class_id) REFERENCES classes(id), FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );
    CREATE TABLE IF NOT EXISTS admission_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, admission_id INTEGER NOT NULL, title TEXT, category TEXT, file_path TEXT, uploaded_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(admission_id) REFERENCES admissions(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS admission_interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT, admission_id INTEGER NOT NULL, interview_date TEXT, interviewer TEXT, score REAL, recommendation TEXT, notes TEXT, FOREIGN KEY(admission_id) REFERENCES admissions(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS staff_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER NOT NULL, title TEXT, category TEXT, file_path TEXT, expiry_date TEXT, created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS payroll_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, payroll_id INTEGER NOT NULL, item_type TEXT NOT NULL, name TEXT NOT NULL, amount REAL NOT NULL, FOREIGN KEY(payroll_id) REFERENCES payroll(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL, movement_type TEXT NOT NULL, quantity REAL NOT NULL, reference TEXT, movement_date TEXT DEFAULT(date('now')), performed_by INTEGER, FOREIGN KEY(item_id) REFERENCES inventory_items(id), FOREIGN KEY(performed_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, po_no TEXT UNIQUE NOT NULL, vendor_id INTEGER, requisition_id INTEGER, order_date TEXT DEFAULT(date('now')), status TEXT DEFAULT 'draft', total REAL DEFAULT 0, approved_by INTEGER, FOREIGN KEY(vendor_id) REFERENCES vendors(id), FOREIGN KEY(requisition_id) REFERENCES procurement_requisitions(id), FOREIGN KEY(approved_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_order_id INTEGER NOT NULL, item TEXT NOT NULL, quantity REAL NOT NULL, unit_cost REAL NOT NULL, total REAL NOT NULL, FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS asset_maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id INTEGER NOT NULL, maintenance_date TEXT, description TEXT, cost REAL DEFAULT 0, vendor TEXT, next_due_date TEXT, FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS library_reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, book_id INTEGER NOT NULL, student_id INTEGER NOT NULL, reserved_at TEXT DEFAULT(datetime('now')), status TEXT DEFAULT 'active', FOREIGN KEY(book_id) REFERENCES books(id), FOREIGN KEY(student_id) REFERENCES students(id)
    );
    CREATE TABLE IF NOT EXISTS medical_medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, medication TEXT, dosage TEXT, frequency TEXT, start_date TEXT, end_date TEXT, notes TEXT, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS medical_vaccinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, vaccine TEXT, dose TEXT, date_given TEXT, provider TEXT, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS medical_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, incident_date TEXT, description TEXT, action_taken TEXT, parent_notified INTEGER DEFAULT 0, referred_to TEXT, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS transport_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER NOT NULL, document_type TEXT, document_no TEXT, expiry_date TEXT, file_path TEXT, FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS transport_maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER NOT NULL, service_date TEXT, description TEXT, cost REAL DEFAULT 0, next_service_date TEXT, FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS transport_fuel_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER NOT NULL, fuel_date TEXT, litres REAL, amount REAL, odometer REAL, station TEXT, FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS boarding_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, attendance_date TEXT NOT NULL, status TEXT NOT NULL, notes TEXT, UNIQUE(student_id,attendance_date), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS discipline_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, incident_id INTEGER NOT NULL, action_type TEXT, action_date TEXT, details TEXT, duration_days INTEGER, outcome TEXT, FOREIGN KEY(incident_id) REFERENCES discipline_incidents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS discipline_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT, incident_id INTEGER NOT NULL, title TEXT, file_path TEXT, notes TEXT, FOREIGN KEY(incident_id) REFERENCES discipline_incidents(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS communication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, channel TEXT, recipient TEXT, subject TEXT, body TEXT, status TEXT, sent_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL, version INTEGER NOT NULL, file_path TEXT, uploaded_by INTEGER, uploaded_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE, FOREIGN KEY(uploaded_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS clubs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, category TEXT, coach TEXT, description TEXT);
    CREATE TABLE IF NOT EXISTS club_members (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER NOT NULL, student_id INTEGER NOT NULL, joined_at TEXT DEFAULT(date('now')), role TEXT, UNIQUE(club_id,student_id), FOREIGN KEY(club_id) REFERENCES clubs(id) ON DELETE CASCADE, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS sports_teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, sport TEXT, coach TEXT, category TEXT);
    CREATE TABLE IF NOT EXISTS sports_members (id INTEGER PRIMARY KEY AUTOINCREMENT, team_id INTEGER NOT NULL, student_id INTEGER NOT NULL, position TEXT, joined_at TEXT DEFAULT(date('now')), FOREIGN KEY(team_id) REFERENCES sports_teams(id) ON DELETE CASCADE, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, title TEXT, category TEXT, achievement_date TEXT, level TEXT, description TEXT, FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS alumni_profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER UNIQUE, graduation_year TEXT, university TEXT, course TEXT, employer TEXT, job_title TEXT, phone TEXT, email TEXT, achievements TEXT, FOREIGN KEY(student_id) REFERENCES students(id));
    CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, success INTEGER, ip TEXT, user_agent TEXT, attempted_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS user_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token_jti TEXT, device TEXT, ip TEXT, created_at TEXT DEFAULT(datetime('now')), last_seen_at TEXT, revoked_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS two_factor_settings (user_id INTEGER PRIMARY KEY, enabled INTEGER DEFAULT 0, secret TEXT, recovery_codes TEXT, updated_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS backup_history (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT, created_at TEXT DEFAULT(datetime('now')), created_by INTEGER, size_bytes INTEGER, verified INTEGER DEFAULT 0, FOREIGN KEY(created_by) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS calendar_events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, event_type TEXT, start_at TEXT, end_at TEXT, location TEXT, audience TEXT, reminder_minutes INTEGER DEFAULT 0, description TEXT);
  `);


  // UNIVERSITY ERP EXTENSION: additive schema, preserving all existing school data.
  db.exec(`
    CREATE TABLE IF NOT EXISTS campuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, code TEXT UNIQUE, location TEXT,
      phone TEXT, email TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT(datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS faculties (
      id INTEGER PRIMARY KEY AUTOINCREMENT, campus_id INTEGER, name TEXT NOT NULL, code TEXT UNIQUE,
      dean_id INTEGER, description TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(campus_id) REFERENCES campuses(id), FOREIGN KEY(dean_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS university_departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, faculty_id INTEGER, campus_id INTEGER, name TEXT NOT NULL,
      code TEXT UNIQUE, hod_id INTEGER, description TEXT, status TEXT DEFAULT 'active',
      FOREIGN KEY(faculty_id) REFERENCES faculties(id), FOREIGN KEY(campus_id) REFERENCES campuses(id), FOREIGN KEY(hod_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, department_id INTEGER NOT NULL, name TEXT NOT NULL, code TEXT UNIQUE,
      award TEXT, duration_years REAL, total_credits REAL DEFAULT 0, study_mode TEXT DEFAULT 'full_time',
      admission_requirements TEXT, status TEXT DEFAULT 'active', FOREIGN KEY(department_id) REFERENCES university_departments(id)
    );
    CREATE TABLE IF NOT EXISTS curriculum_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, program_id INTEGER NOT NULL, version TEXT NOT NULL,
      effective_from TEXT, effective_to TEXT, status TEXT DEFAULT 'active', notes TEXT,
      UNIQUE(program_id,version), FOREIGN KEY(program_id) REFERENCES programs(id)
    );
    CREATE TABLE IF NOT EXISTS university_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, department_id INTEGER, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      description TEXT, credits REAL DEFAULT 0, level INTEGER, course_type TEXT DEFAULT 'core',
      learning_outcomes TEXT, status TEXT DEFAULT 'active', FOREIGN KEY(department_id) REFERENCES university_departments(id)
    );
    CREATE TABLE IF NOT EXISTS curriculum_courses (
      curriculum_id INTEGER NOT NULL, course_id INTEGER NOT NULL, semester_no INTEGER, required INTEGER DEFAULT 1,
      prerequisite_course_id INTEGER, PRIMARY KEY(curriculum_id,course_id),
      FOREIGN KEY(curriculum_id) REFERENCES curriculum_versions(id) ON DELETE CASCADE,
      FOREIGN KEY(course_id) REFERENCES university_courses(id) ON DELETE CASCADE,
      FOREIGN KEY(prerequisite_course_id) REFERENCES university_courses(id)
    );
    CREATE TABLE IF NOT EXISTS academic_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, academic_year TEXT NOT NULL,
      period_type TEXT DEFAULT 'semester', start_date TEXT, end_date TEXT, registration_open TEXT,
      registration_close TEXT, exam_start TEXT, exam_end TEXT, status TEXT DEFAULT 'planned'
    );
    CREATE TABLE IF NOT EXISTS course_offerings (
      id INTEGER PRIMARY KEY AUTOINCREMENT, course_id INTEGER NOT NULL, period_id INTEGER NOT NULL,
      campus_id INTEGER, lecturer_id INTEGER, section TEXT DEFAULT 'A', room TEXT, capacity INTEGER DEFAULT 100,
      status TEXT DEFAULT 'open', UNIQUE(course_id,period_id,section), FOREIGN KEY(course_id) REFERENCES university_courses(id),
      FOREIGN KEY(period_id) REFERENCES academic_periods(id), FOREIGN KEY(campus_id) REFERENCES campuses(id), FOREIGN KEY(lecturer_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS university_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, program_id INTEGER, curriculum_id INTEGER,
      intake TEXT, academic_year TEXT, status TEXT DEFAULT 'active', admission_date TEXT, expected_completion TEXT,
      UNIQUE(student_id,program_id), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(program_id) REFERENCES programs(id), FOREIGN KEY(curriculum_id) REFERENCES curriculum_versions(id)
    );
    CREATE TABLE IF NOT EXISTS course_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, offering_id INTEGER NOT NULL,
      registered_at TEXT DEFAULT(datetime('now')), status TEXT DEFAULT 'registered', approved_by INTEGER,
      UNIQUE(student_id,offering_id), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(offering_id) REFERENCES course_offerings(id), FOREIGN KEY(approved_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS course_waitlist (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, offering_id INTEGER NOT NULL, position INTEGER NOT NULL, status TEXT DEFAULT 'waiting', created_at TEXT DEFAULT(datetime('now')), UNIQUE(student_id,offering_id), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY(offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS university_assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, offering_id INTEGER NOT NULL, name TEXT NOT NULL,
      assessment_type TEXT, weight REAL DEFAULT 0, max_marks REAL DEFAULT 100, due_date TEXT,
      status TEXT DEFAULT 'draft', FOREIGN KEY(offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS university_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, assessment_id INTEGER NOT NULL, student_id INTEGER NOT NULL,
      marks REAL, moderated_marks REAL, entered_by INTEGER, approved_by INTEGER, status TEXT DEFAULT 'draft',
      UNIQUE(assessment_id,student_id), FOREIGN KEY(assessment_id) REFERENCES university_assessments(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY(entered_by) REFERENCES users(id), FOREIGN KEY(approved_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS university_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT, offering_id INTEGER NOT NULL, title TEXT NOT NULL,
      exam_date TEXT, start_time TEXT, end_time TEXT, room TEXT, status TEXT DEFAULT 'scheduled',
      published INTEGER DEFAULT 0, FOREIGN KEY(offering_id) REFERENCES course_offerings(id)
    );
    CREATE TABLE IF NOT EXISTS university_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, offering_id INTEGER NOT NULL,
      total_mark REAL, grade TEXT, grade_points REAL, credits REAL, status TEXT DEFAULT 'draft',
      approved_by INTEGER, published_at TEXT, UNIQUE(student_id,offering_id),
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY(offering_id) REFERENCES course_offerings(id), FOREIGN KEY(approved_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS grading_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, min_score REAL NOT NULL, max_score REAL NOT NULL,
      grade TEXT NOT NULL, points REAL DEFAULT 0, classification TEXT, active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS fee_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT UNIQUE, amount REAL NOT NULL,
      program_id INTEGER, period_id INTEGER, mandatory INTEGER DEFAULT 1, status TEXT DEFAULT 'active',
      FOREIGN KEY(program_id) REFERENCES programs(id), FOREIGN KEY(period_id) REFERENCES academic_periods(id)
    );
    CREATE TABLE IF NOT EXISTS university_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT UNIQUE NOT NULL, student_id INTEGER NOT NULL,
      period_id INTEGER, issue_date TEXT DEFAULT(date('now')), due_date TEXT, subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0, total REAL DEFAULT 0, paid REAL DEFAULT 0, status TEXT DEFAULT 'unpaid',
      FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(period_id) REFERENCES academic_periods(id)
    );
    CREATE TABLE IF NOT EXISTS university_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, receipt_no TEXT UNIQUE NOT NULL, invoice_id INTEGER, student_id INTEGER NOT NULL,
      amount REAL NOT NULL, method TEXT, reference TEXT, paid_at TEXT DEFAULT(datetime('now')), status TEXT DEFAULT 'confirmed',
      FOREIGN KEY(invoice_id) REFERENCES university_invoices(id), FOREIGN KEY(student_id) REFERENCES students(id)
    );
    CREATE TABLE IF NOT EXISTS research_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, code TEXT UNIQUE, principal_investigator INTEGER,
      department_id INTEGER, funding_source TEXT, budget REAL DEFAULT 0, start_date TEXT, end_date TEXT,
      status TEXT DEFAULT 'proposal', FOREIGN KEY(principal_investigator) REFERENCES users(id), FOREIGN KEY(department_id) REFERENCES university_departments(id)
    );
    CREATE TABLE IF NOT EXISTS research_members (
      project_id INTEGER NOT NULL, user_id INTEGER NOT NULL, role TEXT, PRIMARY KEY(project_id,user_id),
      FOREIGN KEY(project_id) REFERENCES research_projects(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS postgraduate_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER UNIQUE NOT NULL, level TEXT NOT NULL,
      supervisor_id INTEGER, co_supervisor_id INTEGER, proposal_status TEXT DEFAULT 'pending', thesis_title TEXT,
      milestone TEXT, viva_date TEXT, final_status TEXT DEFAULT 'active', FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(supervisor_id) REFERENCES users(id), FOREIGN KEY(co_supervisor_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS hostels (
      id INTEGER PRIMARY KEY AUTOINCREMENT, campus_id INTEGER, name TEXT NOT NULL, code TEXT UNIQUE, capacity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', FOREIGN KEY(campus_id) REFERENCES campuses(id)
    );
    CREATE TABLE IF NOT EXISTS hostel_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hostel_id INTEGER NOT NULL, room_no TEXT NOT NULL, capacity INTEGER DEFAULT 1,
      status TEXT DEFAULT 'available', UNIQUE(hostel_id,room_no), FOREIGN KEY(hostel_id) REFERENCES hostels(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS accommodation_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, room_id INTEGER NOT NULL,
      bed_no TEXT, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'active', UNIQUE(student_id,room_id),
      FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(room_id) REFERENCES hostel_rooms(id)
    );
    CREATE TABLE IF NOT EXISTS workflow_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, workflow_type TEXT NOT NULL, entity TEXT, entity_id INTEGER,
      requested_by INTEGER, current_step INTEGER DEFAULT 1, status TEXT DEFAULT 'pending', comment TEXT,
      created_at TEXT DEFAULT(datetime('now')), updated_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(requested_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS workflow_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL, action TEXT NOT NULL,
      actor_id INTEGER NOT NULL, comment TEXT, created_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(request_id) REFERENCES workflow_requests(id) ON DELETE CASCADE, FOREIGN KEY(actor_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS university_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, module TEXT NOT NULL, action TEXT NOT NULL,
      entity TEXT, entity_id INTEGER, old_value TEXT, new_value TEXT, reason TEXT, ip TEXT,
      created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS role_scope_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, campus_id INTEGER, faculty_id INTEGER,
      department_id INTEGER, program_id INTEGER, UNIQUE(user_id,campus_id,faculty_id,department_id,program_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(campus_id) REFERENCES campuses(id),
      FOREIGN KEY(faculty_id) REFERENCES faculties(id), FOREIGN KEY(department_id) REFERENCES university_departments(id), FOREIGN KEY(program_id) REFERENCES programs(id)
    );
    CREATE INDEX IF NOT EXISTS idx_univ_enroll_student ON university_enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_course_reg_student ON course_registrations(student_id);
    CREATE INDEX IF NOT EXISTS idx_univ_results_student ON university_results(student_id);
    CREATE INDEX IF NOT EXISTS idx_univ_invoice_student ON university_invoices(student_id);
    CREATE INDEX IF NOT EXISTS idx_univ_audit_user_time ON university_audit_logs(user_id,created_at);
  `);

  // Upgrade existing school records into a university-compatible baseline without deleting them.
  db.prepare("INSERT OR IGNORE INTO campuses(name,code,location) VALUES(?,?,?)").run('Main Campus','MAIN','Main Campus');
  db.prepare("INSERT OR IGNORE INTO academic_periods(name,academic_year,period_type,status) VALUES(?,?,?,?)").run('Semester 1 2026','2026','semester','active');
  db.prepare("INSERT OR IGNORE INTO system_settings(key,value) VALUES(?,?)").run('Institution Type','University');
  db.prepare("INSERT OR IGNORE INTO system_settings(key,value) VALUES(?,?)").run('University Name','Matara University');

  // Backfill the richer student profile for records created by older versions.
  db.exec(`INSERT OR IGNORE INTO student_profiles(student_id,nationality,previous_school,admission_date,nemis_upi,house_name,residence,photo_url,religion,birth_certificate_no,special_needs)
    SELECT id,nationality,previous_school,COALESCE(admission_date,enrolled_on),nemis_upi,house_name,residence,photo_url,religion,birth_certificate_no,special_needs FROM students`);
  db.exec(`INSERT OR IGNORE INTO student_contacts(student_id,contact_type,relationship,name,phone,is_primary,emergency_priority)
    SELECT id,'guardian','Guardian',guardian_name,guardian_phone,1,1 FROM students WHERE guardian_name IS NOT NULL AND guardian_name<>''`);

  // Seed sensible defaults for Kenyan-school configuration; all rates remain editable in Settings.
  const defaults = [
    ['Currency','KES'],['Country','Kenya'],['Timezone','Africa/Nairobi'],['Academic Structure','Semester'],
    ['PAYE Relief','2400'],['Affordable Housing Levy Employee Rate','0.015'],['Affordable Housing Levy Employer Rate','0.015'],
    ['SHIF Rate',''],['M-Pesa Paybill',''],['School Address',''],['School Phone',''],['School Email',''],['School Website','']
  ];
  for (const [k,v] of defaults) db.prepare('INSERT OR IGNORE INTO system_settings(key,value) VALUES(?,?)').run(k,v);

  // Student portal: unit registration and supplementary exam applications
  const examColumns = db.prepare('PRAGMA table_info(exams)').all().map((c) => c.name);
  if (!examColumns.includes('kind')) {
    // "CAT" (continuous assessment test) or "Exam". Older exams count as CATs only if their name says so.
    db.exec("ALTER TABLE exams ADD COLUMN kind TEXT NOT NULL DEFAULT 'Exam'");
    db.exec("UPDATE exams SET kind = 'CAT' WHERE lower(name) LIKE '%cat%'");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS unit_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      term TEXT NOT NULL,
      registered_at TEXT DEFAULT (datetime('now')),
      UNIQUE (student_id, subject_id, term),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS supplementary_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      staff_comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      decided_at TEXT,
      decided_by INTEGER,
      UNIQUE (student_id, subject_id, exam_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (decided_by) REFERENCES users(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS degree_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, program_id INTEGER NOT NULL, course_id INTEGER,
      category TEXT DEFAULT 'core', credits_required REAL DEFAULT 0, minimum_grade_points REAL DEFAULT 0,
      required INTEGER DEFAULT 1, notes TEXT, FOREIGN KEY(program_id) REFERENCES programs(id),
      FOREIGN KEY(course_id) REFERENCES university_courses(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS academic_advisors (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, advisor_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active', assigned_at TEXT DEFAULT(datetime('now')), ended_at TEXT,
      UNIQUE(student_id,advisor_id), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(advisor_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS advising_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, advisor_id INTEGER NOT NULL,
      title TEXT NOT NULL, note TEXT NOT NULL, risk_level TEXT DEFAULT 'normal', follow_up_date TEXT,
      status TEXT DEFAULT 'open', created_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY(advisor_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS graduation_clearance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, academic_year TEXT,
      academic_status TEXT DEFAULT 'pending', finance_status TEXT DEFAULT 'pending', library_status TEXT DEFAULT 'pending',
      accommodation_status TEXT DEFAULT 'not_applicable', discipline_status TEXT DEFAULT 'pending',
      senate_status TEXT DEFAULT 'pending', cleared_at TEXT, cleared_by INTEGER,
      UNIQUE(student_id,academic_year), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY(cleared_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS helpdesk_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_no TEXT UNIQUE NOT NULL, requester_id INTEGER,
      category TEXT NOT NULL, subject TEXT NOT NULL, description TEXT NOT NULL, priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'open', assigned_to INTEGER, created_at TEXT DEFAULT(datetime('now')), updated_at TEXT DEFAULT(datetime('now')),
      resolved_at TEXT, FOREIGN KEY(requester_id) REFERENCES users(id), FOREIGN KEY(assigned_to) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS helpdesk_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, user_id INTEGER, message TEXT NOT NULL,
      internal INTEGER DEFAULT 0, created_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(ticket_id) REFERENCES helpdesk_tickets(id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_degree_requirements_program ON degree_requirements(program_id);
    CREATE INDEX IF NOT EXISTS idx_advisors_student ON academic_advisors(student_id,status);
    CREATE INDEX IF NOT EXISTS idx_advising_notes_student ON advising_notes(student_id,created_at);
    CREATE INDEX IF NOT EXISTS idx_graduation_clearance_student ON graduation_clearance(student_id);
    CREATE INDEX IF NOT EXISTS idx_helpdesk_status ON helpdesk_tickets(status,priority,updated_at);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS applicants (
      id INTEGER PRIMARY KEY AUTOINCREMENT, application_no TEXT UNIQUE NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, national_id TEXT, programme_id INTEGER, admission_source TEXT DEFAULT 'direct', status TEXT DEFAULT 'applied', eligibility_status TEXT DEFAULT 'pending', offer_status TEXT DEFAULT 'not_offered', duplicate_hash TEXT, application_data TEXT DEFAULT '{}', created_at TEXT DEFAULT(datetime('now')), updated_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(programme_id) REFERENCES programs(id)
    );
    CREATE TABLE IF NOT EXISTS kuccps_imports (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, imported_by INTEGER, rows_imported INTEGER DEFAULT 0, rows_rejected INTEGER DEFAULT 0, created_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS admissions_offers (id INTEGER PRIMARY KEY AUTOINCREMENT, applicant_id INTEGER NOT NULL, offer_no TEXT UNIQUE NOT NULL, programme_id INTEGER, offer_date TEXT DEFAULT(date('now')), expiry_date TEXT, status TEXT DEFAULT 'issued', joining_instructions TEXT, FOREIGN KEY(applicant_id) REFERENCES applicants(id), FOREIGN KEY(programme_id) REFERENCES programs(id));
    CREATE TABLE IF NOT EXISTS payroll_statutory_config (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, label TEXT NOT NULL, enabled INTEGER DEFAULT 1, rate REAL DEFAULT 0, fixed_amount REAL DEFAULT 0, ceiling REAL, effective_from TEXT, effective_to TEXT, notes TEXT);
    CREATE TABLE IF NOT EXISTS payroll_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT NOT NULL, status TEXT DEFAULT 'draft', created_by INTEGER, created_at TEXT DEFAULT(datetime('now')), UNIQUE(period));
    CREATE TABLE IF NOT EXISTS payroll_items (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id INTEGER NOT NULL, user_id INTEGER NOT NULL, gross_pay REAL DEFAULT 0, taxable_pay REAL DEFAULT 0, deductions REAL DEFAULT 0, net_pay REAL DEFAULT 0, breakdown TEXT DEFAULT '{}', FOREIGN KEY(run_id) REFERENCES payroll_runs(id), FOREIGN KEY(user_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS transcript_records (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, verification_code TEXT UNIQUE NOT NULL, document_type TEXT DEFAULT 'transcript', issued_at TEXT DEFAULT(datetime('now')), issued_by INTEGER, document_hash TEXT, metadata TEXT DEFAULT '{}', FOREIGN KEY(student_id) REFERENCES students(id));
    CREATE TABLE IF NOT EXISTS lms_integrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, provider TEXT DEFAULT 'moodle', base_url TEXT NOT NULL, service_token TEXT, enabled INTEGER DEFAULT 1, created_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS lms_sync_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, integration_id INTEGER, entity_type TEXT, entity_id TEXT, status TEXT, message TEXT, created_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS backup_history (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, size_bytes INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, storage TEXT DEFAULT 'local', remote_key TEXT, created_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS payment_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, reference TEXT UNIQUE NOT NULL, provider TEXT NOT NULL, phone TEXT, amount REAL NOT NULL, status TEXT DEFAULT 'pending', provider_receipt TEXT, checkout_request_id TEXT, merchant_request_id TEXT, raw_response TEXT, created_at TEXT DEFAULT(datetime('now')), updated_at TEXT DEFAULT(datetime('now')));
    CREATE TABLE IF NOT EXISTS data_exports (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, subject_user_id INTEGER NOT NULL, export_type TEXT, file_path TEXT, created_at TEXT DEFAULT(datetime('now')));

    CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
    CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transcript_code ON transcript_records(verification_code);
  `);

  [
    ['backup_history','storage',"TEXT DEFAULT 'local'"],['backup_history','remote_key','TEXT'],['backup_history','created_by','INTEGER'],
  ].forEach(([t,c,d])=>addColumn(t,c,d));

  const scales=db.prepare('SELECT COUNT(*) c FROM grading_scales').get().c;
  if(!scales){[['A',80,100,4],['B',70,79.99,3],['C',60,69.99,2],['D',50,59.99,1],['E',0,49.99,0]].forEach(([g,min,max,p])=>db.prepare('INSERT INTO grading_scales(grade,min_score,max_score,points) VALUES(?,?,?,?)').run(g,min,max,p));}
  [['University Name','Matara University'],['Currency','KES'],['Motto','Excellence • Integrity • Service']].forEach(([k,v])=>db.prepare('INSERT OR IGNORE INTO system_settings(key,value) VALUES(?,?)').run(k,v));
  // v4: never seed a parent portal account. Guardian/emergency contact records remain data-only.

}



// ---------------------------------------------------------------------------
// Role model (see lib/roles.js). Makes the users table accept every role and adds
// the tables used by the role desks (holds, gate scans, discipline, senate...).
// Safe to run on every start: nothing is changed once it is up to date.
// ---------------------------------------------------------------------------
function migrateRoleModel() {
  const { ALL_ROLE_KEYS } = require('./lib/roles');

  // 1. Extra user column used by temporary roles (invigilators, external examiners).
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!cols.includes('access_expires_at')) db.exec('ALTER TABLE users ADD COLUMN access_expires_at TEXT');

  // 2. Rebuild the users table if its role CHECK does not list every role yet.
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  const missing = ALL_ROLE_KEYS.some((k) => !row.sql.includes(`'${k}'`));
  if (missing) {
    const list = ALL_ROLE_KEYS.map((k) => `'${k}'`).join(',');
    const newSql = row.sql
      .replace(/^CREATE TABLE\s+("?\w+"?)/i, 'CREATE TABLE users_new')
      .replace(/CHECK\s*\(\s*role\s+IN\s*\([^)]*\)\s*\)/i, `CHECK(role IN (${list}))`);
    const indexes = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='users' AND sql IS NOT NULL").all();
    const names = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name).join(',');
    db.exec('PRAGMA foreign_keys=OFF');
    try {
      db.exec('BEGIN');
      db.exec('DROP TABLE IF EXISTS users_new');
      db.exec(newSql);
      db.exec(`INSERT INTO users_new (${names}) SELECT ${names} FROM users`);
      db.exec('DROP TABLE users');
      db.exec('ALTER TABLE users_new RENAME TO users');
      indexes.forEach((i) => db.exec(i.sql));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    } finally {
      db.exec('PRAGMA foreign_keys=ON');
    }
  }

  // 3. Tables for the role desks.
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_holds (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, reason TEXT NOT NULL, amount REAL,
      placed_by INTEGER, placed_at TEXT DEFAULT(datetime('now')), released_at TEXT, released_by INTEGER, release_note TEXT,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_financial_holds_student ON financial_holds(student_id, released_at);
    CREATE TABLE IF NOT EXISTS gate_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, scanned_code TEXT, result TEXT NOT NULL, reason TEXT, person_name TEXT,
      scanned_by INTEGER, scanned_at TEXT DEFAULT(datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS campus_bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, subject_type TEXT NOT NULL DEFAULT 'user', subject_id INTEGER NOT NULL, reason TEXT NOT NULL,
      banned_by INTEGER, banned_at TEXT DEFAULT(datetime('now')), lifted_at TEXT, lifted_by INTEGER
    );
    CREATE TABLE IF NOT EXISTS exam_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, exam_label TEXT NOT NULL, recorded_by INTEGER,
      recorded_at TEXT DEFAULT(datetime('now')), UNIQUE(student_id, exam_label),
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS malpractice_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, exam_label TEXT NOT NULL, description TEXT NOT NULL,
      flagged_by INTEGER, flagged_at TEXT DEFAULT(datetime('now')), status TEXT NOT NULL DEFAULT 'open',
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS student_suspensions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, user_id INTEGER, previous_role TEXT,
      kind TEXT NOT NULL DEFAULT 'suspension', reason TEXT NOT NULL, hearing_date TEXT, imposed_by INTEGER,
      imposed_at TEXT DEFAULT(datetime('now')), ended_at TEXT, ended_by INTEGER,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS readmission_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      requested_at TEXT DEFAULT(datetime('now')), decided_by INTEGER, decided_at TEXT, decision_note TEXT,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS curve_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, course_code TEXT NOT NULL, adjustment TEXT NOT NULL, rationale TEXT NOT NULL,
      suggested_by INTEGER, suggested_at TEXT DEFAULT(datetime('now')), status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by INTEGER, reviewed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS senate_motions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, motion_type TEXT NOT NULL DEFAULT 'curriculum', details TEXT,
      status TEXT NOT NULL DEFAULT 'open', created_by INTEGER, created_at TEXT DEFAULT(datetime('now')), closed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS senate_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, motion_id INTEGER NOT NULL, user_id INTEGER NOT NULL, vote TEXT NOT NULL,
      voted_at TEXT DEFAULT(datetime('now')), UNIQUE(motion_id, user_id),
      FOREIGN KEY(motion_id) REFERENCES senate_motions(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS senate_signoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year TEXT NOT NULL, student_id INTEGER NOT NULL, signed_by INTEGER,
      signed_at TEXT DEFAULT(datetime('now')), UNIQUE(academic_year, student_id)
    );
    CREATE TABLE IF NOT EXISTS gown_issuance (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'issued',
      issued_by INTEGER, issued_at TEXT DEFAULT(datetime('now')), returned_at TEXT,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS machine_api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, key_prefix TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE,
      scopes TEXT DEFAULT '', expires_at TEXT, last_used_at TEXT, revoked_at TEXT, created_by INTEGER, created_at TEXT DEFAULT(datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS machine_job_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, job TEXT NOT NULL, status TEXT NOT NULL, details TEXT,
      ran_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS counselling_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, counselor_id INTEGER NOT NULL, session_date TEXT, topic TEXT, notes TEXT,
      created_at TEXT DEFAULT(datetime('now')), FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);
  seedRoleDemoAccounts();
}

// One demo login for every role, so each desk can be tried straight away.
// Email: the role name with dots, for example helpdesk.l1@matara.ac.ke.
// Password: DEMO_PASSWORD from .env (default MU-Demo-2026). Not created in production or tests.
// Machine users cannot sign in with a password, so none is created here.
function seedRoleDemoAccounts() {
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') return;
  const { ROLES } = require('./lib/roles');
  const hash = bcrypt.hashSync(demoPassword, 10);
  const end = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  let n = 0;
  for (const r of ROLES) {
    if (['admin', 'teacher', 'student', 'parent', 'machine_user'].includes(r.key)) continue;
    const email = `${r.key.replaceAll('_', '.')}@matara.ac.ke`;
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) continue;
    const u = db.prepare('INSERT INTO users (name, email, password, role, access_expires_at) VALUES (?,?,?,?,?)').run(`Demo ${r.label}`.slice(0, 80), email, hash, r.key, r.temporary ? end : null);
    const id = Number(u.lastInsertRowid);
    n += 1;
    if (r.group === 'teacher') {
      db.prepare('INSERT INTO teachers (user_id, staff_no, name) VALUES (?,?,?)').run(id, `TD${String(100 + n)}`, `Demo ${r.label}`);
    } else if (r.group === 'student') {
      const status = r.key === 'deferred_student' ? 'deferred' : r.key === 'suspended_student' ? 'suspended' : 'active';
      db.prepare("INSERT INTO students (user_id, adm_no, name, status, enrolled_on) VALUES (?,?,?,?,date('now'))").run(id, `MU-D${String(100 + n)}`, `Demo ${r.label}`, status);
    } else if (r.group === 'staff') {
      db.prepare("INSERT INTO staff (user_id, employee_no, name, position, email, status) VALUES (?,?,?,?,?, 'active')").run(id, `ED${String(100 + n)}`, `Demo ${r.label}`, r.label, email);
    }
  }
}

function seed() {
  if (tableIsEmpty('users')) {
    const hash = (pw) => bcrypt.hashSync(pw, 10);
    const insertUser = db.prepare(
      `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`
    );

    // --- Admin ---
    insertUser.run('Director Wanjiru Kamau', 'admin@matara.ac.ke', hash(demoPassword), 'admin');

    // --- Teachers (with linked user logins) ---
    const teacherSeed = [
      ['Mr. Otieno Owino', 'T001', '0722 111 222', 'Mathematics', 'otieno@matara.ac.ke'],
      ['Mrs. Achieng Odhiambo', 'T002', '0733 222 333', 'English', 'achieng@matara.ac.ke'],
      ['Mr. Kiptoo Langat', 'T003', '0711 333 444', 'Biology', 'kiptoo@matara.ac.ke'],
    ];
    const insertTeacher = db.prepare(
      `INSERT INTO teachers (user_id, staff_no, name, phone, specialty) VALUES (?, ?, ?, ?, ?)`
    );
    const teacherIds = teacherSeed.map(([name, staff_no, phone, specialty, email]) => {
      const u = insertUser.run(name, email, hash(demoPassword), 'teacher');
      const t = insertTeacher.run(u.lastInsertRowid, staff_no, name, phone, specialty);
      return t.lastInsertRowid;
    });

    // --- Classes ---
    const insertClass = db.prepare(
      `INSERT INTO classes (name, stream, class_teacher_id, capacity) VALUES (?, ?, ?, ?)`
    );
    const c1 = insertClass.run('Year 1', 'BBIT', teacherIds[0], 200).lastInsertRowid;
    const c2 = insertClass.run('Year 2', 'BBIT', teacherIds[1], 200).lastInsertRowid;
    const c3 = insertClass.run('Year 3', 'BBIT', teacherIds[2], 200).lastInsertRowid;
    insertClass.run('Year 1', 'Semester 1', null, 200);

    // --- Subjects ---
    const insertSubject = db.prepare(`INSERT INTO subjects (name, code) VALUES (?, ?)`);
    const subjects = [
      ['Database Management Systems', 'BBIT 2101'], ['Data Structures and Algorithms', 'BBIT 2102'], ['Computer Networks', 'BBIT 2103'],
      ['Financial Accounting', 'BBIT 2104'], ['Systems Analysis and Design', 'BBIT 2105'], ['Communication Skills', 'BBIT 2106'],
    ];
    const subjectIds = subjects.map(([name, code]) => insertSubject.run(name, code).lastInsertRowid);

    // --- Students (a handful, some with logins) ---
    const insertStudent = db.prepare(
      `INSERT INTO students (user_id, adm_no, name, gender, dob, class_id, guardian_name, guardian_phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`
    );
    const studentSeed = [
      ['MU/BBIT/001/2026', 'Amani Njoroge', 'M', '2010-03-12', c1, 'Peter Njoroge', '0700 111 001'],
      ['MU/BBIT/002/2026', 'Wanjiku Mwangi', 'F', '2010-07-02', c1, 'Grace Mwangi', '0700 111 002'],
      ['MU/BIT/003/2026', 'Brian Kiplagat', 'M', '2009-11-20', c2, 'Samuel Kiplagat', '0700 111 003'],
      ['MU/BCS/004/2026', 'Faith Chebet', 'F', '2009-05-18', c2, 'Ruth Chebet', '0700 111 004'],
      ['MU/BIT/005/2026', 'Dennis Mutua', 'M', '2008-09-09', c3, 'John Mutua', '0700 111 005'],
      ['MU/BBIT/006/2026', 'Aisha Hassan', 'F', '2008-01-30', c3, 'Fatuma Hassan', '0700 111 006'],
    ];
    const studentIds = studentSeed.map(([adm, name, g, dob, cid, gn, gp], idx) => {
      let userId = null;
      if (idx === 0) {
        const u = insertUser.run(name, 'amani@matara.ac.ke', hash(demoPassword), 'student');
        userId = u.lastInsertRowid;
      }
      return insertStudent.run(userId, adm, name, g, dob, cid, gn, gp).lastInsertRowid;
    });

    // --- Attendance (last 5 school days) ---
    const insertAttendance = db.prepare(
      `INSERT OR IGNORE INTO attendance (student_id, date, status) VALUES (?, ?, ?)`
    );
    const statuses = ['present', 'present', 'present', 'late', 'absent'];
    for (let d = 0; d < 5; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const iso = date.toISOString().slice(0, 10);
      studentIds.forEach((sid, i) => {
        insertAttendance.run(sid, iso, statuses[(i + d) % statuses.length]);
      });
    }

    // --- Exams + Grades ---
    const insertExam = db.prepare(`INSERT INTO exams (name, term, year) VALUES (?, ?, ?)`);
    const examId = insertExam.run('Mid-Term Exam', 'Term 2', '2026').lastInsertRowid;
    const insertGrade = db.prepare(
      `INSERT INTO grades (exam_id, student_id, subject_id, score) VALUES (?, ?, ?, ?)`
    );
    studentIds.forEach((sid) => {
      subjectIds.forEach((subid) => {
        const score = Math.floor(45 + Math.random() * 50);
        insertGrade.run(examId, sid, subid, score);
      });
    });

    // --- Fees ---
    const insertFee = db.prepare(
      `INSERT INTO fees (student_id, term, amount_due, amount_paid, due_date) VALUES (?, ?, ?, ?, ?)`
    );
    studentIds.forEach((sid, i) => {
      const due = 25000;
      const paid = [25000, 15000, 25000, 0, 10000, 20000][i] ?? 0;
      insertFee.run(sid, 'Term 2 2026', due, paid, '2026-09-15');
    });

    // --- Announcements ---
    const insertAnn = db.prepare(
      `INSERT INTO announcements (title, body, audience, author) VALUES (?, ?, ?, ?)`
    );
    insertAnn.run(
      'Mid-Term Break Reminder',
      'The university academic calendar has been updated. Please review the semester dates and examination schedule.',
      'all',
      'Director Wanjiru Kamau'
    );
    insertAnn.run(
      'Staff Meeting',
      'All lecturers are required to attend the academic staff meeting on Monday at 3pm.',
      'teacher',
      'Director Wanjiru Kamau'
    );
    insertAnn.run(
      'Fee Balance Notice',
      'Students with outstanding semester balances are requested to clear their fees before the due date.',
      'student',
      'Bursar\'s Office'
    );

    console.log('✓ Database seeded with demo data for Matara University');
  }
}

// Compatibility transaction helper for routes that use db.transaction(() => work)().
// Node's built-in SQLite API does not expose the better-sqlite3 style helper.
db.transaction = function transaction(work) {
  return function runTransaction() {
    db.exec('BEGIN');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch (_) {}
      throw error;
    }
  };
};


// University timetable management tables. Kept separate from the legacy school timetable schema.
db.exec(`
  CREATE TABLE IF NOT EXISTS university_timetable_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year TEXT NOT NULL DEFAULT '2026/2027', semester TEXT NOT NULL DEFAULT 'Semester 1',
    campus TEXT NOT NULL DEFAULT 'Main Campus', school TEXT DEFAULT '', department TEXT DEFAULT '',
    programme TEXT DEFAULT '', cohort TEXT DEFAULT '', unit_code TEXT NOT NULL, unit_name TEXT NOT NULL,
    lecturer TEXT DEFAULT '', class_type TEXT NOT NULL DEFAULT 'Lecture', room TEXT DEFAULT '',
    day TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
    expected_attendance INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT DEFAULT '', created_by INTEGER, created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_uni_tt_day_time ON university_timetable_entries(day,start_time,end_time);
  CREATE INDEX IF NOT EXISTS idx_uni_tt_unit ON university_timetable_entries(unit_code);
  CREATE TABLE IF NOT EXISTS university_timetable_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT, entry_id INTEGER, action TEXT NOT NULL,
    actor_id INTEGER, actor_name TEXT DEFAULT '', details TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
  );
`);


// Immutable snapshots preserve the prior submission/marking state when a student
// resubmits or a lecturer changes marks. This additive table is safe for existing DBs.
db.exec(`
  CREATE TABLE IF NOT EXISTS assignment_submission_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    assignment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    content TEXT,
    file_path TEXT,
    submitted_at TEXT,
    marks REAL,
    feedback TEXT,
    status TEXT,
    changed_by INTEGER NOT NULL,
    change_type TEXT NOT NULL CHECK(change_type IN ('resubmitted','marked')),
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    FOREIGN KEY(assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY(changed_by) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_submission_history_submission ON assignment_submission_history(submission_id, changed_at DESC);
`);

module.exports = { db, init, dataDir };


