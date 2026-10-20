// lib/roles.js
// Single list of every account type in the ERP, based on the Matara role model.
//
// How roles work:
//  - "role" is the real account type stored in users.role (for example helpdesk_l1).
//  - "acts_as" is the older, built-in role whose permissions the account inherits, so
//    every existing page and API route keeps working without being rewritten.
//  - "read_only" accounts can look but not change anything (except their own desk).
//  - "write_allow" lets a read-only style account change only the listed API paths.
//  - "caps" are extra powers that belong to one role only (grade lock, financial holds...).
//
// Keep frontend/src/config/roles.js in step with this file (a test checks it).

const CATEGORIES = [
  ['system', '1. System & IT Operations'],
  ['executive', '2. Executive & Governance'],
  ['registry', '3. Academic Administration (Registrar)'],
  ['exams', '4. Examination & Assessment'],
  ['faculty', '5. Faculty & Instruction'],
  ['finance', '6. Financial Operations (Bursary)'],
  ['students', '7. Student States'],
  ['welfare', '8. Student Welfare & Campus Life'],
  ['security', '9. Security & Logistics'],
  ['other', 'Other staff roles'],
];

// [key, label, category, group, acts_as, options, description]
// group decides which profile record is created: teacher, staff, student or null.
const R = (key, label, category, group, acts_as, options, description) => ({
  key, label, category, group, acts_as: acts_as || key, ...(options || {}), description,
});

const ROLES = [
  // ---- 1. System & IT ----
  R('admin', 'Super Administrator (Root)', 'system', null, 'admin', { caps: ['apikeys.manage', 'impersonate', 'sql.read', 'audit.read', 'helpdesk.l1', 'helpdesk.l2', 'grade.lock', 'holds.manage', 'gate.scan', 'campus.ban', 'exam.invigilate', 'malpractice.view', 'discipline.act', 'curve.review', 'senate.manage', 'graduation.clear', 'readmission.review'] },
    'Broad technical administration. Privileged actions remain logged; official academic and financial decisions must follow their approval workflows, and credentials are never readable in plaintext.'),
  R('security_audit_officer', 'Security & Audit Officer', 'system', 'staff', 'auditor', { read_only: true, caps: ['audit.read'] },
    'Read-only access to all audit logs. Tracks IP addresses, login times and changes to grade tables to detect internal fraud.'),
  R('helpdesk_l1', 'Helpdesk Level 1', 'system', 'staff', 'staff', { caps: ['helpdesk.l1'] },
    'Resets passwords, unlocks accounts and updates basic contact details. Cannot view grades or financial ledgers.'),
  R('helpdesk_l2', 'Helpdesk Level 2 (Technical)', 'system', 'staff', 'ict', { caps: ['helpdesk.l1', 'helpdesk.l2'] },
    'Everything Level 1 can do, plus changing user roles, fixing broken enrolments and running data-integrity checks.'),
  R('machine_user', 'Machine User / API Agent', 'system', null, 'staff', { read_only: true, api_only: true, caps: ['machine.run'] },
    'Non-human account with a dedicated API key. Runs automated jobs (for example midnight penalty fees) and integrations such as Moodle, payment gateways and loan boards. Cannot sign in with a password.'),

  // ---- 2. Executive & Governance ----
  R('vice_chancellor', 'Vice Chancellor / President', 'executive', 'staff', null, { read_only: true, write_allow: ['/api/messages', '/api/auth/', '/api/calendar/'] },
    'Global analytics (revenue, enrolment, graduation rates). View-only: does not handle day-to-day data entry. Can still send messages and manage their own account security.'),
  R('deputy_vc', 'Deputy Vice Chancellor', 'executive', 'staff', null, null, 'Deputy to the Vice Chancellor.'),
  R('senate_member', 'University Senate / Board Member', 'executive', 'staff', 'exam_board', { read_only: true, caps: ['senate.vote', 'senate.manage', 'graduation.signoff'] },
    'Votes on curriculum changes, approves new degree programmes and digitally signs off the final graduation list.'),
  R('quality_assurance_director', 'Quality Assurance Director', 'executive', 'staff', 'exam_board', { read_only: true },
    'Reads course structures to confirm syllabi and exam formats meet national accreditation standards.'),

  // ---- 3. Academic Administration ----
  R('registrar', 'Chief Academic Registrar', 'registry', 'staff', null, { caps: ['curve.review', 'graduation.clear', 'senate.manage', 'readmission.review'] },
    'Final authority on the student lifecycle: mass graduation, inter-faculty transfers and degree revocation.'),
  R('deputy_registrar', 'Deputy Registrar', 'registry', 'staff', null, null, 'Deputy to the Chief Academic Registrar.'),
  R('admissions_officer', 'Admissions Officer', 'registry', 'staff', null, null,
    'Processes applications, verifies index numbers, triggers acceptance letters and converts applicants to students.'),
  R('timetabling_officer', 'Timetabling & Scheduling Officer', 'registry', 'staff', 'facilities_officer', { read_only: true, write_allow: ['/api/timetable-maker/'] },
    'Books lecture halls, manages capacity, allocates time slots and resolves clashes.'),
  R('transcript_clerk', 'Transcript & Certification Clerk', 'registry', 'staff', 'examination_officer', { write_allow: ['/api/v3/documents/'] },
    'Generates, signs and prints official transcripts and degree certificates. Cannot approve or change results.'),
  R('graduation_coordinator', 'Graduation Coordinator', 'registry', 'staff', 'deputy_registrar', { read_only: true, caps: ['graduation.clear'] },
    'Runs the graduation module, clears students for the ceremony and manages gown issuance.'),

  // ---- 4. Examination & Assessment ----
  R('examinations_director', 'Examinations Director', 'exams', 'staff', 'examination_officer', { caps: ['grade.lock', 'exam.invigilate', 'malpractice.view', 'curve.review'] },
    'Sets the grading timeline and triggers the Grade Lock that removes lecturer editing once the deadline passes.'),
  R('examination_officer', 'Examination Officer', 'exams', 'staff', null, { caps: ['exam.invigilate', 'malpractice.view', 'curve.review'] },
    'Supports the Examinations Director with exam administration.'),
  R('exam_board', 'Examination Board', 'exams', 'staff', null, { caps: ['curve.review'] }, 'Approves results before publication.'),
  R('exam_invigilator', 'Exam Invigilator', 'exams', 'staff', 'staff', { temporary: true, caps: ['exam.invigilate'] },
    'Temporary access in exam weeks. Scans student IDs to mark real-time attendance and flags malpractice.'),
  R('external_examiner', 'External Examiner / Moderator', 'exams', 'staff', 'exam_board', { temporary: true, read_only: true, caps: ['curve.suggest'] },
    'Temporary read-only access to graded scripts and score distributions. Can suggest grade-curve adjustments.'),
  R('disciplinary_member', 'Disciplinary Committee Member', 'exams', 'staff', 'student_affairs_officer', { read_only: true, caps: ['discipline.act', 'malpractice.view'] },
    'Reads conduct records and malpractice logs, and can suspend, reinstate or expel a student.'),

  // ---- 5. Faculty & Instruction ----
  R('dean', 'Dean of Faculty', 'faculty', 'staff', null, null, 'Evaluates lecturers and approves faculty grade sheets before Senate.'),
  R('deputy_dean', 'Deputy Dean', 'faculty', 'staff', null, null, 'Deputy to the Dean of Faculty.'),
  R('hod', 'Head of Department (HOD)', 'faculty', 'staff', null, null, 'Assigns units to lecturers, views departmental analytics and approves course structures.'),
  R('lecturer', 'Primary Lecturer', 'faculty', 'teacher', null, null, 'Uploads materials, enters CAT marks, submits final exam marks and logs attendance.'),
  R('senior_lecturer', 'Senior Lecturer', 'faculty', 'teacher', null, null, 'Senior teaching staff.'),
  R('professor', 'Professor', 'faculty', 'teacher', null, null, 'Professorial teaching staff.'),
  R('academic_staff', 'Academic Staff', 'faculty', 'teacher', null, null, 'General academic staff.'),
  R('teaching_assistant', 'Teaching Assistant (TA) / Grader', 'faculty', 'teacher', 'academic_staff', { caps: ['marks.cat_only'] },
    'Enters raw CAT marks and grades assignments. Cannot submit or alter final exam marks.'),
  R('lab_technician', 'Lab Technician / Instructor', 'faculty', 'teacher', 'academic_staff', { caps: ['marks.practical_only'] },
    'Books lab equipment, manages lab safety clearances and enters practical assessment marks only.'),

  // ---- 6. Financial Operations ----
  R('finance_director', 'Chief Financial Officer (CFO)', 'finance', 'staff', null, { caps: ['holds.manage'] },
    'All revenue streams, expense ledgers and financial forecasting dashboards.'),
  R('finance_officer', 'Finance Officer', 'finance', 'staff', null, null, 'Finance operations.'),
  R('billing_admin', 'Billing & Fee Structure Admin', 'finance', 'staff', 'finance_officer', null,
    'Defines what each course costs per semester and configures late-fee penalties and billing cycles.'),
  R('collections_officer', 'Student Accounts / Collections Officer', 'finance', 'staff', 'accounts', { caps: ['holds.manage'] },
    'Applies fee waivers, processes scholarships and bursaries, and places or releases Financial Holds.'),
  R('cashier', 'Cashier', 'finance', 'staff', 'accounts', null, 'Operates the finance window: cash and cheque deposits and printed receipts.'),
  R('procurement_officer', 'Procurement Officer', 'finance', 'staff', null, null, 'Supply chain module and vendor bids.'),
  R('payroll_officer', 'Payroll Officer', 'finance', 'staff', 'hr_officer', null, 'Runs the HR ledger, staff salaries and statutory deductions.'),
  R('hr_director', 'HR Director', 'finance', 'staff', null, null, 'Human resources leadership.'),
  R('hr_officer', 'HR Officer', 'finance', 'staff', null, null, 'Human resources operations.'),

  // ---- 7. Student States ----
  R('applicant', 'Prospective Applicant', 'students', 'staff', null, null, 'Application portal only: uploads IDs, writes essays, pays the application fee.'),
  R('student', 'Active Student', 'students', 'student', null, null, 'Registers for units, views timetable, downloads exam cards, pays fees and views transcripts.'),
  R('class_representative', 'Class Representative', 'students', 'student', 'student', { caps: ['grievance.submit'] },
    'Standard student access plus class-wide grievances and direct messages to the HOD.'),
  R('deferred_student', 'Deferred / On-Leave Student', 'students', 'student', 'student', { read_only: true, caps: ['readmission.apply'], limited_nav: true },
    'Can sign in and view past records and apply for readmission. Unit registration and campus access are disabled.'),
  R('suspended_student', 'Suspended Student', 'students', 'student', 'suspended', { limited_nav: true, caps: ['status.view'] },
    'Locked to a single page explaining the suspension and the disciplinary hearing date.'),
  R('alumni', 'Alumni', 'students', 'staff', null, null, 'Alumni directory, replacement transcripts and the job board.'),

  // ---- 8. Student Welfare & Campus Life ----
  R('dean_of_students', 'Dean of Students', 'welfare', 'staff', 'student_affairs_officer', null, 'Student clubs, student union elections and welfare programmes.'),
  R('student_affairs_officer', 'Student Affairs Officer', 'welfare', 'staff', null, null, 'Student welfare support.'),
  R('accommodation_officer', 'Hostel / Accommodation Manager', 'welfare', 'staff', null, null, 'Dormitory capacity, bed allocation, room changes and damage fines.'),
  R('janitorial_staff', 'Janitorial / Maintenance Staff', 'welfare', 'staff', 'non_academic_staff', null, 'Views and closes repair requests in the ticketing system.'),
  R('catering_manager', 'Catering / Mess Manager', 'welfare', 'staff', 'staff', null, 'Validates meal-plan subscriptions at the cafeteria.'),
  R('counselor', 'University Counselor / Therapist', 'welfare', 'staff', null, { caps: ['counselling.notes'] },
    'Logs therapy appointments. Session notes are private to the counsellor who wrote them.'),
  R('medical_officer', 'Chief Medical Officer (Clinic)', 'welfare', 'staff', null, null, 'Student medical histories, prescriptions and official medical exemptions.'),
  R('sports_director', 'Sports & Athletics Director', 'welfare', 'staff', 'staff', null, 'Athletic scholarships, team rosters and sports facilities.'),
  R('chaplain', 'University Chaplain', 'welfare', 'staff', 'staff', null, 'Religious service spaces and religious societies.'),

  // ---- 9. Security & Logistics ----
  R('security_officer', 'Chief Security Officer (CSO)', 'security', 'staff', null, { caps: ['gate.scan', 'campus.ban'] },
    'Reads physical access-control logs and can flag a student or staff ID as Banned from Campus.'),
  R('gate_guard', 'Gate / Access Control Guard', 'security', 'staff', 'staff', { caps: ['gate.scan'] },
    'Scans IDs on a mobile screen. The result is simply Green (cleared) or Red (suspended / not registered).'),
  R('transport_officer', 'Transport & Fleet Manager', 'security', 'staff', null, null, 'Assigns buses, schedules trips and validates transport passes.'),

].filter((r) => r.label);

// Older roles that are still available, in addition to the ones above.
const LEGACY = [
  ['staff', 'General Staff', 'staff'], ['accounts', 'Accounts / Bursar', 'staff'], ['librarian', 'Librarian', 'staff'],
  ['nurse', 'Nurse / Medical', 'staff'], ['ict', 'ICT Officer', 'staff'], ['non_academic_staff', 'Non-Academic Staff', 'staff'],
  ['stores_officer', 'Stores Officer', 'staff'], ['asset_officer', 'Asset Officer', 'staff'], ['facilities_officer', 'Facilities Officer', 'staff'],
  ['research_officer', 'Research Officer', 'staff'], ['auditor', 'Auditor', 'staff'],
];
LEGACY.forEach(([key, label, group]) => {
  ROLES.push(R(key, label, 'other', group, key, null, label));
});
// 'teacher' is the original teaching role used in older data.
ROLES.push(R('teacher', 'Teacher (legacy)', 'other', 'teacher', 'teacher', null, 'Original teaching role from earlier versions.'));

const BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r]));

const ALL_ROLE_KEYS = ROLES.map((r) => r.key);
const ACADEMIC_KEYS = ['teacher', 'lecturer', 'senior_lecturer', 'professor', 'academic_staff', 'teaching_assistant', 'lab_technician'];

function getRole(role) { return BY_KEY[role] || null; }
function isKnownRole(role) { return Boolean(BY_KEY[role]); }
function groupOf(role) { return BY_KEY[role] ? BY_KEY[role].group : null; }
// The older role whose permissions this account inherits.
function effectiveRole(role) { return BY_KEY[role] ? BY_KEY[role].acts_as : role; }
function hasCap(role, cap) {
  const r = BY_KEY[role];
  return Boolean(r && r.caps && r.caps.includes(cap));
}
function isTemporary(role) { return Boolean(BY_KEY[role] && BY_KEY[role].temporary); }

module.exports = {
  CATEGORIES, ROLES, BY_KEY, ALL_ROLE_KEYS, ACADEMIC_KEYS,
  getRole, isKnownRole, groupOf, effectiveRole, hasCap, isTemporary,
};
