'use strict';

// Central, deny-by-default permission registry for the Matara University ERP.
// Existing endpoints still have their legacy route guards; new/converted routes
// should use requirePermission() in addition to record-scope checks.
const { getRole, hasCap } = require('./roles');

const DEFINITIONS = [
  ['users.view','users','view'], ['users.create','users','create'], ['users.update','users','update'],
  ['users.deactivate','users','deactivate'], ['users.reset_password','users','reset_password'], ['users.assign_roles','users','assign_roles'],
  ['roles.view','roles','view'], ['roles.create','roles','create'], ['roles.update','roles','update'], ['roles.assign','roles','assign'], ['roles.configure','roles','configure'],
  ['students.view','students','view'], ['students.create','students','create'], ['students.update','students','update'], ['students.register','students','register'], ['students.defer','students','defer'], ['students.suspend','students','suspend'], ['students.reactivate','students','reactivate'],
  ['admissions.view','admissions','view'], ['admissions.review','admissions','review'], ['admissions.approve','admissions','approve'], ['admissions.reject','admissions','reject'], ['admissions.publish','admissions','publish'],
  ['courses.view','courses','view'], ['courses.create','courses','create'], ['courses.update','courses','update'], ['courses.assign_lecturer','courses','assign_lecturer'], ['courses.publish','courses','publish'],
  ['lms.course.view','lms','course.view'], ['lms.course.manage','lms','course.manage'], ['lms.content.create','lms','content.create'], ['lms.content.publish','lms','content.publish'], ['lms.assignment.manage','lms','assignment.manage'], ['lms.assignment.grade','lms','assignment.grade'], ['lms.quiz.manage','lms','quiz.manage'], ['lms.submission.view','lms','submission.view'], ['lms.submission.grade','lms','submission.grade'],
  ['exams.view','exams','view'], ['exams.manage','exams','manage'], ['exams.schedule','exams','schedule'], ['exams.attendance.record','exams','attendance.record'], ['marks.enter','marks','enter'], ['marks.review','marks','review'], ['marks.correct','marks','correct'], ['results.approve','results','approve'], ['results.publish','results','publish'],
  ['transcripts.prepare','transcripts','prepare'], ['transcripts.review','transcripts','review'], ['transcripts.approve','transcripts','approve'], ['transcripts.issue','transcripts','issue'], ['certificates.issue','certificates','issue'],
  ['finance.view','finance','view'], ['finance.transactions.create','finance','transactions.create'], ['finance.transactions.review','finance','transactions.review'], ['finance.transactions.approve','finance','transactions.approve'], ['payments.record','payments','record'], ['payments.reconcile','payments','reconcile'], ['refunds.request','refunds','request'], ['refunds.approve','refunds','approve'], ['invoices.create','invoices','create'], ['fees.configure','fees','configure'], ['fees.publish','fees','publish'], ['scholarships.manage','scholarships','manage'],
  ['procurement.request','procurement','request'], ['procurement.review','procurement','review'], ['procurement.approve','procurement','approve'], ['procurement.purchase_order.create','procurement','purchase_order.create'], ['procurement.delivery.record','procurement','delivery.record'],
  ['hr.staff.view','hr','staff.view'], ['hr.staff.create','hr','staff.create'], ['hr.staff.update','hr','staff.update'], ['hr.leave.manage','hr','leave.manage'], ['hr.salary.view','hr','salary.view'], ['hr.salary.update','hr','salary.update'], ['payroll.prepare','payroll','prepare'], ['payroll.review','payroll','review'], ['payroll.approve','payroll','approve'],
  ['security.incidents.view','security','incidents.view'], ['security.incidents.create','security','incidents.create'], ['security.incidents.manage','security','incidents.manage'], ['security.access_logs.view','security','access_logs.view'],
  ['research.projects.view','research','projects.view'], ['research.projects.create','research','projects.create'], ['research.projects.manage','research','projects.manage'], ['research.ethics.track','research','ethics.track'], ['research.grants.manage','research','grants.manage'],
  ['library.catalog.manage','library','catalog.manage'], ['library.loans.manage','library','loans.manage'], ['library.members.view','library','members.view'], ['library.fines.manage','library','fines.manage'],
  ['timetable.view','timetable','view'], ['timetable.manage','timetable','manage'], ['timetable.generate','timetable','generate'], ['timetable.approve','timetable','approve'], ['timetable.publish','timetable','publish'], ['timetable.view_published','timetable','view_published'], ['timetable.availability.own','timetable','availability.own'],
  ['system.configure','system','configure'], ['system.backup','system','backup'], ['system.restore','system','restore'], ['system.audit.view','system','audit.view'], ['system.integrations.manage','system','integrations.manage'],
];
const PERMISSIONS = Object.freeze(DEFINITIONS.map(([code,module,action]) => Object.freeze({ code, module, action })));
const ALL_CODES = PERMISSIONS.map(p => p.code);
const ADMIN_CODES = ALL_CODES.filter(code => !new Set(['results.approve','results.publish','refunds.approve','payroll.approve','procurement.approve','finance.transactions.approve','transcripts.approve','certificates.issue','timetable.manage','timetable.generate','timetable.approve','timetable.publish']).has(code));
const SETS = {
  admin: ADMIN_CODES,
  executive: ['timetable.view_published','finance.view','courses.view','students.view','admissions.view','exams.view','results.approve','results.publish','system.audit.view'],
  registry: ['timetable.view','timetable.approve','timetable.publish','timetable.view_published','students.view','students.create','students.update','students.register','students.defer','students.reactivate','admissions.view','admissions.review','admissions.approve','admissions.reject','admissions.publish','courses.view','courses.create','courses.update','courses.assign_lecturer','courses.publish','exams.view','transcripts.prepare','transcripts.review','transcripts.approve','transcripts.issue','certificates.issue'],
  lecturer: ['timetable.view_published','timetable.availability.own','students.view','courses.view','lms.course.view','lms.course.manage','lms.content.create','lms.content.publish','lms.assignment.manage','lms.assignment.grade','lms.quiz.manage','lms.submission.view','lms.submission.grade','exams.view','marks.enter','marks.review'],
  student: ['timetable.view_published','students.view','courses.view','lms.course.view','lms.submission.view','exams.view','transcripts.prepare'],
  finance: ['students.view','finance.view','finance.transactions.create','finance.transactions.review','payments.record','payments.reconcile','refunds.request','invoices.create','fees.configure','scholarships.manage'],
  hr: ['hr.staff.view','hr.staff.create','hr.staff.update','hr.leave.manage','hr.salary.view','hr.salary.update','payroll.prepare','payroll.review'],
  security: ['security.incidents.view','security.incidents.create','security.incidents.manage','security.access_logs.view'],
  research: ['research.projects.view','research.projects.create','research.projects.manage','research.ethics.track','research.grants.manage'],
  library: ['library.catalog.manage','library.loans.manage','library.members.view','library.fines.manage'],
  facilities: ['courses.view'],
  staff: [],
};
const ROLE_SETS = {
  vice_chancellor: 'executive', deputy_vc: 'executive', senate_member: 'executive', quality_assurance_director: ['courses.view','exams.view','results.approve'],
  registrar: 'registry', deputy_registrar: 'registry', admissions_officer: ['students.view','students.create','students.update','admissions.view','admissions.review','admissions.approve','admissions.reject','admissions.publish'],
  timetabling_officer: ['timetable.view','timetable.manage','timetable.generate','timetable.view_published','courses.view','exams.view','exams.schedule'], transcript_clerk: ['students.view','transcripts.prepare','transcripts.issue','certificates.issue'], graduation_coordinator: ['students.view','transcripts.view','certificates.issue'],
  examinations_director: ['exams.view','exams.manage','exams.schedule','exams.attendance.record','marks.review','results.approve'], examination_officer: ['exams.view','exams.manage','exams.schedule','exams.attendance.record','marks.review','results.approve'], exam_board: ['exams.view','marks.review','results.approve','results.publish'], exam_invigilator: ['exams.view','exams.attendance.record'], external_examiner: ['exams.view','marks.review'], disciplinary_member: ['students.view','security.incidents.view'],
  dean: ['timetable.view','timetable.view_published','students.view','courses.view','marks.review'], deputy_dean: ['timetable.view','timetable.view_published','students.view','courses.view','marks.review'], hod: ['timetable.view','timetable.view_published','students.view','courses.view','courses.assign_lecturer','marks.review'],
  lecturer: 'lecturer', senior_lecturer: 'lecturer', professor: 'lecturer', academic_staff: ['timetable.view_published','timetable.availability.own','courses.view','lms.course.view'], teacher: 'lecturer', teaching_assistant: ['courses.view','lms.course.view','lms.submission.view','lms.assignment.grade','lms.submission.grade'], lab_technician: ['courses.view','lms.course.view'],
  finance_director: ['finance.view','finance.transactions.create','finance.transactions.review','finance.transactions.approve','payments.record','payments.reconcile','refunds.request','refunds.approve','invoices.create','fees.configure','fees.publish','scholarships.manage'], finance_officer: 'finance', billing_admin: ['finance.view','invoices.create','fees.configure'], collections_officer: ['finance.view','payments.record','refunds.request','scholarships.manage'], cashier: ['finance.view','payments.record'], accounts: 'finance', bursar: 'finance',
  procurement_officer: ['procurement.request','procurement.review','procurement.purchase_order.create','procurement.delivery.record'], payroll_officer: ['hr.staff.view','hr.salary.view','payroll.prepare'], hr_director: ['hr.staff.view','hr.staff.create','hr.staff.update','hr.leave.manage','hr.salary.view','hr.salary.update','payroll.review','payroll.approve'], hr_officer: ['hr.staff.view','hr.staff.create','hr.staff.update','hr.leave.manage'],
  student: 'student', class_representative: 'student', deferred_student: ['students.view'], suspended_student: [], applicant: ['admissions.view'], alumni: ['transcripts.prepare'],
  dean_of_students: ['students.view','security.incidents.view'], student_affairs_officer: ['students.view','security.incidents.view','security.incidents.create'], accommodation_officer: ['students.view'], janitorial_staff: [], catering_manager: [], counselor: [], medical_officer: [], nurse: [], sports_director: [], chaplain: [],
  security_officer: 'security', gate_guard: ['security.incidents.create'], transport_officer: [], staff: [], non_academic_staff: [], librarian: 'library', ict: ['system.audit.view','system.integrations.manage'], stores_officer: ['procurement.delivery.record'], asset_officer: ['procurement.delivery.record'], facilities_officer: [], research_officer: 'research', auditor: ['finance.view','finance.transactions.review','hr.salary.view','system.audit.view','security.access_logs.view'], security_audit_officer: ['system.audit.view','security.access_logs.view'], helpdesk_l1: ['users.view','users.reset_password'], helpdesk_l2: ['users.view','users.reset_password'], machine_user: [],
};
function normalizeSet(value) { return Array.isArray(value) ? value : (typeof value === 'string' && SETS[value] ? SETS[value] : []); }
function permissionsForRole(role) {
  if (role === 'admin') return ADMIN_CODES.slice();
  const configured = ROLE_SETS[role];
  const codes = normalizeSet(configured);
  // Legacy role inheritance must not silently widen this granular permission set.
  return [...new Set(codes)].filter(code => ALL_CODES.includes(code));
}
function hasPermission(role, code) {
  if (!ALL_CODES.includes(code)) return false;
  if (role === 'admin') return ADMIN_CODES.includes(code);
  // Existing role-specific capabilities remain authoritative for their specialist actions.
  const capMap = { 'system.audit.view':'audit.read', 'security.access_logs.view':'audit.read', 'exams.attendance.record':'exam.invigilate', 'refunds.approve':'refunds.approve', 'system.configure':'system.configure' };
  if (capMap[code] && hasCap(role, capMap[code])) return true;
  return permissionsForRole(role).includes(code);
}
function requirePermission(code) {
  const guard = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!hasPermission(req.user.actual_role || req.user.role, code)) return res.status(403).json({ error: 'Your role does not include this permission.', required_permission: code });
    next();
  };
  return Object.defineProperty(guard, 'name', { value: 'requirePermission' });
}
// Scopes must be explicitly supplied by a trusted assignment/record lookup. Missing scope denies.
function scopeAllows(userScopes, requiredScope) {
  if (!requiredScope || requiredScope.type === 'own') return Boolean(userScopes && userScopes.own === true);
  if (!userScopes || typeof userScopes !== 'object') return false;
  if (userScopes.university === true) return true;
  const values = userScopes[requiredScope.type];
  if (!Array.isArray(values)) return false;
  return values.map(String).includes(String(requiredScope.id));
}
module.exports = { PERMISSIONS, ALL_CODES, permissionsForRole, hasPermission, requirePermission, scopeAllows };
