'use strict';
// Who may put what on the university calendar. One table, read by the API and the tests.
//   author  = may create and edit drafts in the category
//   publish = may publish, change and cancel events in the category
// When a role is in both lists it publishes its own events directly. When the lists differ the
// author proposes and a different, more senior person approves, so nobody approves their own.
const POLICY = {
  academic: {
    label: 'Academic calendar (semesters, registration, add/drop, graduation)',
    author: ['registrar', 'deputy_registrar'],
    publish: ['deputy_vc', 'vice_chancellor'],
  },
  examination: {
    label: 'Examinations',
    author: ['examinations_director', 'examination_officer'],
    publish: ['registrar', 'deputy_vc', 'vice_chancellor'],
  },
  holiday: {
    label: 'Public holidays and closures',
    author: ['registrar', 'hr_director'],
    publish: ['deputy_vc', 'vice_chancellor'],
  },
  governance: {
    label: 'Senate, Council and committee meetings',
    author: ['registrar'],
    publish: ['vice_chancellor', 'deputy_vc'],
  },
  faculty: {
    label: 'Faculty events',
    author: ['dean', 'deputy_dean'],
    publish: ['dean', 'deputy_dean'],
  },
  student: {
    label: 'Student life and welfare',
    author: ['dean_of_students', 'student_affairs_officer'],
    publish: ['dean_of_students', 'student_affairs_officer'],
  },
  staff: {
    label: 'Staff and HR events',
    author: ['hr_director'],
    publish: ['hr_director'],
  },
  general: {
    label: 'University-wide events',
    author: ['vice_chancellor', 'deputy_vc'],
    publish: ['vice_chancellor', 'deputy_vc'],
  },
};

const AUDIENCES = ['all', 'students', 'staff', 'lecturers'];
const LECTURER_ROLES = ['teacher', 'lecturer', 'senior_lecturer', 'professor', 'academic_staff', 'teaching_assistant'];
const EVENT_TYPES = ['Semester', 'Registration', 'Add/drop', 'Teaching', 'Examinations', 'Break', 'Deadline', 'Graduation', 'Holiday', 'Meeting', 'Event'];

const canAuthor = (role, category) => !!POLICY[category] && POLICY[category].author.includes(role);
const canPublish = (role, category) => !!POLICY[category] && POLICY[category].publish.includes(role);
const needsApproval = (category) => POLICY[category].author.some((r) => !POLICY[category].publish.includes(r));
const categoriesFor = (role, fn) => Object.keys(POLICY).filter((c) => fn(role, c));

// Which audiences can this role read?
function audiencesFor(role) {
  if (role === 'student') return ['all', 'students'];
  if (LECTURER_ROLES.includes(role)) return ['all', 'staff', 'lecturers'];
  return ['all', 'staff'];
}

module.exports = { POLICY, AUDIENCES, EVENT_TYPES, LECTURER_ROLES, canAuthor, canPublish, needsApproval, categoriesFor, audiencesFor };
