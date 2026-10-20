Below is the complete copy-ready master specification for all 72 Matara University ERP account entries, including their roles, permissions, restrictions, workflows, security rules, and implementation requirements. You can copy it directly into your project requirements or give it to your AI coding assistant to implement in your existing ERP.

MATARA UNIVERSITY

# MATARA UNIVERSITY

# COMPLETE UNIVERSITY MANAGEMENT SYSTEM — ROLE-BASED ACCESS CONTROL (RBAC) MASTER SPECIFICATION

**Project:** Matara University Management ERP
**Module:** Identity, Access Control, Roles and Permissions
**Primary Domain:** matara.ac.ke
**Backend:** Node.js and Express
**Frontend:** React and Vite
**Database:** MongoDB
**Purpose:** Define every user's responsibilities, permitted actions, prohibited actions, approval authority, data access scope and security restrictions across the university management system.

---

# 1. PROJECT OBJECTIVE

Implement a complete, secure, production-oriented Role-Based Access Control (RBAC) system for the Matara University Management ERP.

The system must support all 72 supplied account entries, covering university executive management, academic administration, lecturers, examinations, students, sponsors, admissions, finance, human resources, procurement, security, IT, library services, research, medical services, facilities, accommodation and other university operations.

Every account must have clearly defined permissions specifying what the user can:

* View records.

* Create records.

* Edit records.

* Submit records.

* Review records.

* Approve or reject requests.

* Publish information.

* Export permitted data.

* Print authorized documents.

* Assign work.

* Manage subordinate users where authorized.

* Configure assigned modules.

* View audit trails.

* Perform authorized administrative actions.

The system must also define what each user is explicitly prohibited from doing.

IMPORTANT: Implement actual authorization in the Express backend. Hiding a menu item or button in React is not sufficient security.

# 2. FUNDAMENTAL SECURITY PRINCIPLES

## 2.1 Least privilege

Every account receives only the permissions required to perform its assigned responsibilities.

Do not grant universal access merely because a user is a professor, dean, director, registrar, finance officer or senior employee.

## 2.2 Separation of duties

Sensitive operations must be separated among different authorized users where practical.

Examples:

* A cashier records a payment but cannot approve their own restricted refund.

* A lecturer enters marks but cannot independently bypass the examination approval process.

* A payroll officer prepares payroll but cannot independently approve and release their own payroll.

* A procurement officer creates a purchase request but cannot approve their own restricted purchase.

* An auditor reviews financial records but cannot silently modify the transactions being audited.

* A user cannot grant themselves additional permissions.

## 2.3 Data scope

Permissions must be restricted by applicable ownership and organizational scope.

Supported scopes:

* University-wide.

* Assigned campus.

* Assigned faculty.

* Assigned school.

* Assigned department.

* Assigned programme.

* Assigned course or unit.

* Assigned class or student group.

* Assigned project.

* Assigned financial account or transaction.

* Assigned examination session.

* Assigned case or incident.

* Own account and personal records.

* Explicitly linked sponsor or guardian relationship.

## 2.4 Official record protection

Do not allow unrestricted deletion of:

* Examination marks.

* Approved results.

* Transcripts and certificates.

* Student registration history.

* Payments and receipts.

* Financial journals.

* Payroll records.

* Procurement records.

* Audit logs.

* Disciplinary decisions.

* Medical records.

* Research ethics decisions.

* Security incident evidence.

Use controlled corrections, reversals, cancellations, archival or soft deletion, with appropriate approvals and audit trails.

## 2.5 Privacy and confidentiality

Sensitive records must be accessible only to authorized users with a legitimate operational need.

This includes:

* Medical records.

* Counselling records.

* Disciplinary records.

* Student financial records.

* Staff salaries.

* Personal identification documents.

* Research participant information.

* Security investigations.

* Authentication credentials.

## 2.6 Authentication and sessions

Implement:

* Secure password hashing.

* Multi-factor authentication for privileged and sensitive roles.

* Password-reset workflows.

* Account activation and deactivation.

* Session expiration.

* Session revocation.

* Login-attempt rate limiting.

* Login history.

* Device and session management where supported.

* Alerts for suspicious activity.

* Server-side permission verification on every protected request.

Never store or expose plaintext passwords.

# 3. COMPLETE ACCOUNT REGISTER

Create or map the following 72 account entries.

1. Super Administrator (Root) — [admin@matara.ac.ke](mailto:admin@matara.ac.ke)

2. Teacher (legacy) — [otieno@matara.ac.ke](mailto:otieno@matara.ac.ke)

3. Teacher (legacy) — [achieng@matara.ac.ke](mailto:achieng@matara.ac.ke)

4. Teacher (legacy) — [kiptoo@matara.ac.ke](mailto:kiptoo@matara.ac.ke)

5. Active Student — [amani@matara.ac.ke](mailto:amani@matara.ac.ke)

6. Sponsor / Guardian — [parent@matara.ac.ke](mailto:parent@matara.ac.ke)

7. Security & Audit Officer — [security.audit.officer@matara.ac.ke](mailto:security.audit.officer@matara.ac.ke)

8. Helpdesk Level 1 — [helpdesk.l1@matara.ac.ke](mailto:helpdesk.l1@matara.ac.ke)

9. Helpdesk Level 2 (Technical) — [helpdesk.l2@matara.ac.ke](mailto:helpdesk.l2@matara.ac.ke)

10. Vice Chancellor / President — [vice.chancellor@matara.ac.ke](mailto:vice.chancellor@matara.ac.ke)

11. Deputy Vice Chancellor — [deputy.vc@matara.ac.ke](mailto:deputy.vc@matara.ac.ke)

12. University Senate / Board Member — [senate.member@matara.ac.ke](mailto:senate.member@matara.ac.ke)

13. Quality Assurance Director — [quality.assurance.director@matara.ac.ke](mailto:quality.assurance.director@matara.ac.ke)

14. Chief Academic Registrar — [registrar@matara.ac.ke](mailto:registrar@matara.ac.ke)

15. Deputy Registrar — [deputy.registrar@matara.ac.ke](mailto:deputy.registrar@matara.ac.ke)

16. Admissions Officer — [admissions.officer@matara.ac.ke](mailto:admissions.officer@matara.ac.ke)

17. Timetabling & Scheduling Officer — [timetabling.officer@matara.ac.ke](mailto:timetabling.officer@matara.ac.ke)

18. Transcript & Certification Clerk — [transcript.clerk@matara.ac.ke](mailto:transcript.clerk@matara.ac.ke)

19. Graduation Coordinator — [graduation.coordinator@matara.ac.ke](mailto:graduation.coordinator@matara.ac.ke)

20. Examinations Director — [examinations.director@matara.ac.ke](mailto:examinations.director@matara.ac.ke)

21. Examination Officer — [examination.officer@matara.ac.ke](mailto:examination.officer@matara.ac.ke)

22. Examination Board — [exam.board@matara.ac.ke](mailto:exam.board@matara.ac.ke)

23. Exam Invigilator — [exam.invigilator@matara.ac.ke](mailto:exam.invigilator@matara.ac.ke)

24. External Examiner / Moderator — [external.examiner@matara.ac.ke](mailto:external.examiner@matara.ac.ke)

25. Disciplinary Committee Member — [disciplinary.member@matara.ac.ke](mailto:disciplinary.member@matara.ac.ke)

26. Dean of Faculty — [dean@matara.ac.ke](mailto:dean@matara.ac.ke)

27. Deputy Dean — [deputy.dean@matara.ac.ke](mailto:deputy.dean@matara.ac.ke)

28. Head of Department (HOD) — [hod@matara.ac.ke](mailto:hod@matara.ac.ke)

29. Primary Lecturer — [lecturer@matara.ac.ke](mailto:lecturer@matara.ac.ke)

30. Senior Lecturer — [senior.lecturer@matara.ac.ke](mailto:senior.lecturer@matara.ac.ke)

31. Professor — [professor@matara.ac.ke](mailto:professor@matara.ac.ke)

32. Academic Staff — [academic.staff@matara.ac.ke](mailto:academic.staff@matara.ac.ke)

33. Teaching Assistant (TA) / Grader — [teaching.assistant@matara.ac.ke](mailto:teaching.assistant@matara.ac.ke)

34. Lab Technician / Instructor — [lab.technician@matara.ac.ke](mailto:lab.technician@matara.ac.ke)

35. Chief Financial Officer (CFO) — [finance.director@matara.ac.ke](mailto:finance.director@matara.ac.ke)

36. Finance Officer — [finance.officer@matara.ac.ke](mailto:finance.officer@matara.ac.ke)

37. Billing & Fee Structure Admin — [billing.admin@matara.ac.ke](mailto:billing.admin@matara.ac.ke)

38. Student Accounts / Collections Officer — [collections.officer@matara.ac.ke](mailto:collections.officer@matara.ac.ke)

39. Cashier — [cashier@matara.ac.ke](mailto:cashier@matara.ac.ke)

40. Procurement Officer — [procurement.officer@matara.ac.ke](mailto:procurement.officer@matara.ac.ke)

41. Payroll Officer — [payroll.officer@matara.ac.ke](mailto:payroll.officer@matara.ac.ke)

42. HR Director — [hr.director@matara.ac.ke](mailto:hr.director@matara.ac.ke)

43. HR Officer — [hr.officer@matara.ac.ke](mailto:hr.officer@matara.ac.ke)

44. Prospective Applicant — [applicant@matara.ac.ke](mailto:applicant@matara.ac.ke)

45. Class Representative — [class.representative@matara.ac.ke](mailto:class.representative@matara.ac.ke)

46. Deferred / On-Leave Student — [deferred.student@matara.ac.ke](mailto:deferred.student@matara.ac.ke)

47. Suspended Student — [suspended.student@matara.ac.ke](mailto:suspended.student@matara.ac.ke)

48. Alumni — [alumni@matara.ac.ke](mailto:alumni@matara.ac.ke)

49. Dean of Students — [dean.of.students@matara.ac.ke](mailto:dean.of.students@matara.ac.ke)

50. Student Affairs Officer — [student.affairs.officer@matara.ac.ke](mailto:student.affairs.officer@matara.ac.ke)

51. Hostel / Accommodation Manager — [accommodation.officer@matara.ac.ke](mailto:accommodation.officer@matara.ac.ke)

52. Janitorial / Maintenance Staff — [janitorial.staff@matara.ac.ke](mailto:janitorial.staff@matara.ac.ke)

53. Catering / Mess Manager — [catering.manager@matara.ac.ke](mailto:catering.manager@matara.ac.ke)

54. University Counselor / Therapist — [counselor@matara.ac.ke](mailto:counselor@matara.ac.ke)

55. Chief Medical Officer (Clinic) — [medical.officer@matara.ac.ke](mailto:medical.officer@matara.ac.ke)

56. Sports & Athletics Director — [sports.director@matara.ac.ke](mailto:sports.director@matara.ac.ke)

57. University Chaplain — [chaplain@matara.ac.ke](mailto:chaplain@matara.ac.ke)

58. Chief Security Officer (CSO) — [security.officer@matara.ac.ke](mailto:security.officer@matara.ac.ke)

59. Gate / Access Control Guard — [gate.guard@matara.ac.ke](mailto:gate.guard@matara.ac.ke)

60. Transport & Fleet Manager — [transport.officer@matara.ac.ke](mailto:transport.officer@matara.ac.ke)

61. General Staff — [staff@matara.ac.ke](mailto:staff@matara.ac.ke)

62. Accounts / Bursar — [accounts@matara.ac.ke](mailto:accounts@matara.ac.ke)

63. Librarian — [librarian@matara.ac.ke](mailto:librarian@matara.ac.ke)

64. Nurse / Medical — [nurse@matara.ac.ke](mailto:nurse@matara.ac.ke)

65. ICT Officer — [ict@matara.ac.ke](mailto:ict@matara.ac.ke)

66. Non-Academic Staff — [non.academic.staff@matara.ac.ke](mailto:non.academic.staff@matara.ac.ke)

67. Stores Officer — [stores.officer@matara.ac.ke](mailto:stores.officer@matara.ac.ke)

68. Asset Officer — [asset.officer@matara.ac.ke](mailto:asset.officer@matara.ac.ke)

69. Facilities Officer — [facilities.officer@matara.ac.ke](mailto:facilities.officer@matara.ac.ke)

70. Research Officer — [research.officer@matara.ac.ke](mailto:research.officer@matara.ac.ke)

71. Auditor — [auditor@matara.ac.ke](mailto:auditor@matara.ac.ke)

The supplied list contains 71 distinct account entries, not 72. The implementation must create exactly the 71 supplied entries unless another account is subsequently added. Reusable role definitions are separate from user account records.

# 4. SUPER ADMINISTRATOR (ROOT)

Account: [admin@matara.ac.ke](mailto:admin@matara.ac.ke)

## Can do

* Manage university-wide system configuration.

* Manage all authorized modules.

* Create, edit, activate, deactivate and lock user accounts.

* Assign and revoke roles and permissions.

* Configure security policies.

* Configure organizational structures.

* Manage integrations and application settings.

* Manage database maintenance and backup operations through approved tools.

* Review system health and technical logs.

* Manage approved branding, menus, themes and dashboard configuration.

* Configure notifications and workflow rules.

* Investigate security incidents.

* Recover access through documented emergency procedures.

## Cannot do

* View plaintext passwords.

* Secretly erase audit evidence.

* Make unlogged changes to official academic or financial records.

* Bypass all controls without traceability.

* Use production impersonation without an approved, logged mechanism.

* Destroy official records merely to conceal an error.

Root has broad technical authority, but privileged activity must remain auditable.

# 5. EXECUTIVE AND GOVERNANCE ROLES

## Vice Chancellor / President

Account: [vice.chancellor@matara.ac.ke](mailto:vice.chancellor@matara.ac.ke)

Can:

* View university-wide executive dashboards.

* Review strategic plans and performance reports.

* Review approved financial summaries.

* Review academic and operational performance.

* Approve designated executive decisions.

* Review faculty and departmental reports.

* View institutional risk and compliance summaries.

* Monitor strategic initiatives.

Cannot:

* Automatically modify finalized examination results.

* Perform every financial transaction personally.

* Access every medical or counselling record.

* Configure Root-only system security.

* Override formal approvals without the authorized process.

## Deputy Vice Chancellor

Account: [deputy.vc@matara.ac.ke](mailto:deputy.vc@matara.ac.ke)

Can:

* Manage an assigned executive portfolio.

* Review relevant departmental reports.

* Approve delegated requests.

* Monitor assigned strategic initiatives.

* Coordinate academic, research or administrative functions.

Cannot:

* Automatically exercise all VC powers.

* Access unrelated confidential records.

* Override controls outside their delegated authority.

## University Senate / Board Member

Account: [senate.member@matara.ac.ke](mailto:senate.member@matara.ac.ke)

Can:

* View authorized meeting agendas and minutes.

* Review senate or board papers.

* Review approved institutional reports.

* Participate in recorded votes and resolutions.

* Review policies and governance documents.

Cannot:

* Edit student results directly.

* Manage ordinary user accounts without a separate role.

* Process payroll or payments by default.

* Access confidential records unrelated to an authorized governance responsibility.

## Quality Assurance Director

Account: [quality.assurance.director@matara.ac.ke](mailto:quality.assurance.director@matara.ac.ke)

Can:

* Manage programme reviews.

* Maintain accreditation evidence.

* Review authorized academic quality data.

* Manage quality improvement plans.

* Track compliance findings.

* Generate quality assurance reports.

Cannot:

* Silently change grades.

* Falsify audit findings.

* Access unrelated private records without authorization.

## Security & Audit Officer

Account: [security.audit.officer@matara.ac.ke](mailto:security.audit.officer@matara.ac.ke)

Can:

* Review authorized access logs.

* Investigate login anomalies.

* Review permitted security events.

* Generate security reports.

* Flag suspicious activity.

* Track control failures.

Cannot:

* Delete logs.

* Modify source transactions under investigation.

* Obtain unrestricted access to private records merely because the role contains the word "audit."

# 6. HELP DESK ROLES

## Helpdesk Level 1

Account: [helpdesk.l1@matara.ac.ke](mailto:helpdesk.l1@matara.ac.ke)

Can:

* Create and classify support tickets.

* View ticket details.

* Respond to ordinary user queries.

* Check basic account status.

* Initiate authorized password resets.

* Escalate technical issues.

* Track ticket resolution.

Cannot:

* Read user passwords.

* Assign Root privileges.

* View confidential records unnecessarily.

* Change official academic results.

## Helpdesk Level 2

Account: [helpdesk.l2@matara.ac.ke](mailto:helpdesk.l2@matara.ac.ke)

Can:

* Investigate escalated technical problems.

* Review authorized diagnostic logs.

* Troubleshoot application errors.

* Investigate integrations.

* Recommend technical fixes.

* Perform approved maintenance.

Cannot:

* Grant itself administrative privileges.

* Bypass authorization checks.

* Access unrelated private records without authorization.

* Make unapproved production database changes.

# 7. ACADEMIC REGISTRY AND ADMISSIONS

## Chief Academic Registrar

Account: [registrar@matara.ac.ke](mailto:registrar@matara.ac.ke)

Can:

* Manage academic registration workflows.

* Review student progression.

* Maintain authorized academic records.

* Manage academic calendars.

* Review graduation eligibility.

* Approve delegated academic processes.

* Oversee authorized transcript workflows.

Cannot:

* Change finalized results without the authorized correction procedure.

* Bypass examination-board decisions.

* Modify payments directly without the appropriate financial role.

## Deputy Registrar

Account: [deputy.registrar@matara.ac.ke](mailto:deputy.registrar@matara.ac.ke)

Can:

* Process academic registry requests.

* Review assigned student records.

* Manage delegated registration workflows.

* Support graduation and academic reporting.

Cannot:

* Automatically exercise all Chief Registrar privileges.

* Override restricted academic decisions.

## Admissions Officer

Account: [admissions.officer@matara.ac.ke](mailto:admissions.officer@matara.ac.ke)

Can:

* Register applications.

* Verify supporting documents.

* Review applicant eligibility.

* Process authorized admissions decisions.

* Generate admission letters.

* Track application progress.

Cannot:

* Change finalized examination results.

* Access unrelated payroll data.

* Approve unauthorized admissions exceptions.

## Timetabling & Scheduling Officer

Account: [timetabling.officer@matara.ac.ke](mailto:timetabling.officer@matara.ac.ke)

Can:

* Create timetables.

* Allocate authorized rooms.

* Schedule classes and examinations.

* Identify timetable conflicts.

* Publish approved schedules.

Cannot:

* Edit academic grades.

* Bypass examination scheduling restrictions.

* Publish unauthorized final schedules.

## Transcript & Certification Clerk

Account: [transcript.clerk@matara.ac.ke](mailto:transcript.clerk@matara.ac.ke)

Can:

* Prepare transcripts.

* Verify source academic records.

* Process certificate requests.

* Generate authorized documents.

* Maintain transcript issuance records.

Cannot:

* Change source marks.

* Issue unapproved official certificates.

* Independently approve restricted documents they prepared where separation of duties is required.

## Graduation Coordinator

Account: [graduation.coordinator@matara.ac.ke](mailto:graduation.coordinator@matara.ac.ke)

Can:

* Prepare graduation lists.

* Check eligibility information.

* Manage ceremony logistics.

* Coordinate clearance.

* Track graduation documentation.

Cannot:

* Override official results.

* Declare graduation eligibility without required approvals.

# 8. EXAMINATIONS AND ASSESSMENT

## Examinations Director

Account: [examinations.director@matara.ac.ke](mailto:examinations.director@matara.ac.ke)

Can:

* Coordinate examination operations.

* Manage examination schedules.

* Monitor examination security.

* Review result-processing status.

* Manage authorized moderation workflows.

* Generate examination reports.

Cannot:

* Silently change finalized marks.

* Delete examination audit evidence.

* Publish unauthorized results.

## Examination Officer

Account: [examination.officer@matara.ac.ke](mailto:examination.officer@matara.ac.ke)

Can:

* Prepare examination registers.

* Coordinate examination sessions.

* Record permitted examination information.

* Track missing marks.

* Manage examination documents.

* Process authorized result workflows.

Cannot:

* Change marks without authorization.

* Release confidential examination papers to unauthorized users.

* Publish unapproved results.

## Examination Board

Account: [exam.board@matara.ac.ke](mailto:exam.board@matara.ac.ke)

Can:

* Review submitted results.

* Record decisions.

* Review authorized special cases.

* Approve results under the university's rules.

* Record progression decisions.

Cannot:

* Bypass required quorum.

* Make unsupported mark changes.

* Access unrelated personal information.

## Exam Invigilator

Account: [exam.invigilator@matara.ac.ke](mailto:exam.invigilator@matara.ac.ke)

Can:

* View assigned examination sessions.

* View assigned candidate lists.

* Record attendance.

* Report examination irregularities.

* Submit incident reports.

Cannot:

* Change final grades.

* Modify official candidate records.

* Access unrelated student information.

## External Examiner / Moderator

Account: [external.examiner@matara.ac.ke](mailto:external.examiner@matara.ac.ke)

Can:

* View assigned assessment materials.

* Review authorized examination scripts.

* Moderate submitted marks.

* Submit moderation comments.

* Produce moderation reports.

Cannot:

* Publish final results directly.

* Edit unrelated courses.

* Access private financial or medical records.

## Disciplinary Committee Member

Account: [disciplinary.member@matara.ac.ke](mailto:disciplinary.member@matara.ac.ke)

Can:

* View assigned disciplinary cases.

* Review authorized evidence.

* Record findings.

* Participate in committee decisions.

* Track approved outcomes.

Cannot:

* Browse unrelated cases.

* Disclose confidential evidence.

* Impose sanctions beyond delegated authority.

## Teaching Assistant / Grader

Account: [teaching.assistant@matara.ac.ke](mailto:teaching.assistant@matara.ac.ke)

Can:

* View assigned courses.

* Mark assigned assignments.

* Grade authorized quizzes and practicals.

* Provide student feedback.

* Submit marks for review.

Cannot:

* Change grading scales.

* Publish final results without authorization.

* Grade unrelated courses.

* Approve their own restricted grading changes.

# 9. DEANS, DEPARTMENTS AND LECTURERS

## Dean of Faculty

Account: [dean@matara.ac.ke](mailto:dean@matara.ac.ke)

Can:

* Manage assigned faculty workflows.

* Review faculty performance.

* Coordinate departments.

* Review lecturer assignments.

* Approve delegated faculty requests.

* Generate faculty reports.

Cannot:

* Automatically manage every faculty.

* Override finalized examination results.

* Change system-wide security settings.

## Deputy Dean

Account: [deputy.dean@matara.ac.ke](mailto:deputy.dean@matara.ac.ke)

Can:

* Support faculty operations.

* Review delegated reports.

* Coordinate academic activities.

* Approve assigned requests.

Cannot:

* Automatically exercise all Dean powers.

* Access unrelated faculties' confidential records.

## Head of Department

Account: [hod@matara.ac.ke](mailto:hod@matara.ac.ke)

Can:

* Manage assigned department.

* Coordinate course allocations.

* Assign authorized teaching responsibilities.

* Review submitted marks.

* Monitor attendance and teaching progress.

* Generate departmental reports.

Cannot:

* Manage unrelated departments.

* Change finalized marks outside the correction workflow.

* Approve their own restricted transactions.

## Primary Lecturer

Account: [lecturer@matara.ac.ke](mailto:lecturer@matara.ac.ke)

Can:

* Manage assigned university units.

* Upload lecture notes.

* Publish authorized course content.

* Create assignments and quizzes.

* Record attendance.

* Grade assessments.

* Provide feedback.

* Manage assigned course discussions.

* Submit results for review.

* View permitted student progress.

Cannot:

* Access all courses automatically.

* Modify another lecturer's grades without authorization.

* Change official university grading rules.

* Publish unapproved final results.

* Access confidential student records unrelated to teaching.

## Senior Lecturer

Account: [senior.lecturer@matara.ac.ke](mailto:senior.lecturer@matara.ac.ke)

Can:

* Perform assigned lecturer duties.

* Supervise academic work.

* Support moderation where authorized.

* Mentor academic staff.

* Conduct research.

* Participate in academic committees.

Cannot:

* Automatically access every course or department.

* Override examination-board decisions.

## Professor

Account: [professor@matara.ac.ke](mailto:professor@matara.ac.ke)

Can:

* Teach assigned courses.

* Supervise research.

* Mentor students and staff.

* Review scholarly work.

* Participate in authorized academic governance.

Cannot:

* Obtain unrestricted system privileges based solely on academic rank.

* Change finalized marks outside approved procedures.

## Academic Staff

Account: [academic.staff@matara.ac.ke](mailto:academic.staff@matara.ac.ke)

Can:

* Access assigned academic modules.

* View relevant teaching records.

* Participate in authorized academic activities.

* Submit permitted academic reports.

Cannot:

* Automatically grade every course.

* Access all student files.

* Change another lecturer's records without authorization.

## Lab Technician / Instructor

Account: [lab.technician@matara.ac.ke](mailto:lab.technician@matara.ac.ke)

Can:

* Manage assigned laboratories.

* Track equipment.

* Record practical attendance.

* Report safety issues.

* Support practical sessions.

* Record authorized practical assessments.

Cannot:

* Change final grades without authorization.

* Access unrelated financial records.

* Access restricted research data without permission.

## Legacy Teacher Accounts

Accounts:

* [otieno@matara.ac.ke](mailto:otieno@matara.ac.ke)

* [achieng@matara.ac.ke](mailto:achieng@matara.ac.ke)

* [kiptoo@matara.ac.ke](mailto:kiptoo@matara.ac.ke)

Map all three accounts to the Lecturer permission set after verifying the account owners and assigned teaching duties.

They may:

* Manage assigned university units.

* Upload course content.

* Create assessments.

* Record attendance.

* Grade permitted assessments.

* Submit results for approval.

They may not:

* Retain obsolete school-specific privileges.

* Access unrelated lecturers' courses.

* Change finalized results without authorization.

* Obtain universal administrative access.

# 10. STUDENTS, APPLICANTS, SPONSORS AND ALUMNI

## Active Student

Account: [amani@matara.ac.ke](mailto:amani@matara.ac.ke)

Can:

* View and update permitted personal information.

* Register for eligible units.

* View the timetable.

* Access enrolled courses.

* Download permitted learning materials.

* Submit assignments.

* Attempt authorized quizzes and examinations.

* View released marks.

* View personal fee statements.

* Download authorized receipts.

* Submit applications and support tickets.

* Receive university announcements.

Cannot:

* Change official marks.

* Modify official fees.

* View other students' confidential information.

* Register for restricted courses.

* Access staff administration modules.

## Sponsor / Guardian

Account: [parent@matara.ac.ke](mailto:parent@matara.ac.ke)

Can:

* View explicitly authorized student information.

* View authorized fee statements.

* View payment receipts.

* Track sponsorship obligations.

* Receive permitted notifications.

* Submit sponsorship-related inquiries.

Cannot:

* Impersonate the student.

* Change registration.

* Access confidential counselling or medical records.

* View information outside the approved relationship and consent scope.

## Prospective Applicant

Account: [applicant@matara.ac.ke](mailto:applicant@matara.ac.ke)

Can:

* Create an application.

* Upload supporting documents.

* Update permitted application details.

* Track application status.

* Receive admission communications.

Cannot:

* Access enrolled students' private records.

* Change admission decisions.

* Access internal staff tools.

## Class Representative

Account: [class.representative@matara.ac.ke](mailto:class.representative@matara.ac.ke)

Can:

* View permitted class schedules.

* Receive class announcements.

* Submit class feedback.

* Report common student concerns.

* Share approved announcements.

Cannot:

* View private student marks.

* View fee balances of classmates.

* Edit official class registers.

* Access disciplinary or medical records.

## Deferred / On-Leave Student

Account: [deferred.student@matara.ac.ke](mailto:deferred.student@matara.ac.ke)

Can:

* View permitted personal records.

* View deferment status.

* Review permitted financial obligations.

* Request reactivation.

* Access authorized support services.

Cannot:

* Bypass restrictions on active registration.

* Modify historical results.

* Access unrelated students' records.

## Suspended Student

Account: [suspended.student@matara.ac.ke](mailto:suspended.student@matara.ac.ke)

Can:

* View permitted suspension notices.

* Submit appeals.

* View applicable return conditions.

* Access permitted support services.

Cannot:

* Bypass suspension restrictions.

* Access restricted academic activities.

* Modify official student records.

## Alumni

Account: [alumni@matara.ac.ke](mailto:alumni@matara.ac.ke)

Can:

* Maintain permitted alumni profile details.

* Request transcripts and certificates.

* View alumni events.

* Access authorized alumni services.

Cannot:

* Change historical marks.

* Access active students' private records.

* Access internal staff modules by default.

# 11. STUDENT AFFAIRS, ACCOMMODATION, COUNSELLING AND HEALTH

## Dean of Students

Account: [dean.of.students@matara.ac.ke](mailto:dean.of.students@matara.ac.ke)

Can:

* Oversee student welfare.

* Review authorized welfare reports.

* Coordinate student activities.

* Oversee approved student support processes.

* Review assigned disciplinary administration.

Cannot:

* Automatically read counselling notes.

* Access clinical files without authorization.

* Change academic results.

## Student Affairs Officer

Account: [student.affairs.officer@matara.ac.ke](mailto:student.affairs.officer@matara.ac.ke)

Can:

* Process welfare requests.

* Coordinate student clubs and events.

* Manage authorized complaints.

* Maintain student-affairs records.

* Refer cases to appropriate services.

Cannot:

* Access unrelated student files.

* Disclose protected case details.

* Impose unauthorized disciplinary sanctions.

## Hostel / Accommodation Manager

Account: [accommodation.officer@matara.ac.ke](mailto:accommodation.officer@matara.ac.ke)

Can:

* Manage rooms and beds.

* Allocate accommodation.

* Record check-ins and check-outs.

* Manage maintenance requests.

* Track approved accommodation charges.

Cannot:

* Change academic results.

* Access clinical records by default.

* Modify unrelated financial transactions.

## University Counselor / Therapist

Account: [counselor@matara.ac.ke](mailto:counselor@matara.ac.ke)

Can:

* Manage authorized appointments.

* Maintain protected counselling records.

* Record consent and referrals.

* Coordinate authorized support.

* Produce appropriately de-identified service statistics.

Cannot:

* Disclose confidential notes to lecturers or parents without a valid basis.

* Allow general administrators unrestricted access to counselling records.

* Access unrelated financial data.

## Chief Medical Officer

Account: [medical.officer@matara.ac.ke](mailto:medical.officer@matara.ac.ke)

Can:

* Oversee authorized clinic operations.

* Manage clinical staff.

* Review permitted clinical records.

* Coordinate referrals.

* Maintain authorized clinical reports.

Cannot:

* Disclose medical records broadly.

* Change academic results.

* Access unrelated payroll information without permission.

## Nurse / Medical

Account: [nurse@matara.ac.ke](mailto:nurse@matara.ac.ke)

Can:

* Record authorized nursing observations.

* Document permitted treatment.

* Manage appointments.

* Record referrals.

* Maintain relevant clinical documentation.

Cannot:

* Access unrelated clinical files without a legitimate need.

* Modify diagnoses beyond professional authorization.

* Disclose confidential health information to unauthorized users.

## Sports & Athletics Director

Account: [sports.director@matara.ac.ke](mailto:sports.director@matara.ac.ke)

Can:

* Manage sports teams.

* Schedule training and competitions.

* Track permitted participation.

* Manage sports facilities.

* Coordinate approved sports expenditure.

Cannot:

* Access unrestricted medical records.

* Change academic results.

* Approve restricted expenditure without authority.

## University Chaplain

Account: [chaplain@matara.ac.ke](mailto:chaplain@matara.ac.ke)

Can:

* Manage chaplaincy schedules.

* Coordinate voluntary pastoral activities.

* Manage approved events.

* Make authorized referrals.

Cannot:

* Access unrelated private student records.

* Disclose confidential pastoral information improperly.

# 12. FINANCE, BILLING, CASHIER, PROCUREMENT AND HR

## Chief Financial Officer

Account: [finance.director@matara.ac.ke](mailto:finance.director@matara.ac.ke)

Can:

* Oversee university financial operations.

* Review budgets and cash flow.

* Review financial reports.

* Approve designated expenditure.

* Monitor financial controls.

* Review authorized accounting reports.

Cannot:

* Erase financial evidence.

* Approve their own restricted transactions.

* Bypass required financial approval procedures.

## Finance Officer

Account: [finance.officer@matara.ac.ke](mailto:finance.officer@matara.ac.ke)

Can:

* Record authorized transactions.

* Prepare journals.

* Reconcile assigned accounts.

* Generate financial reports.

* Process authorized accounting workflows.

Cannot:

* Approve their own restricted journals.

* Issue unauthorized refunds.

* Alter financial history without a traceable correction.

## Billing & Fee Structure Admin

Account: [billing.admin@matara.ac.ke](mailto:billing.admin@matara.ac.ke)

Can:

* Configure approved fee structures.

* Prepare invoices.

* Manage billing periods.

* Configure authorized penalties and discounts.

* Maintain billing records.

Cannot:

* Publish unauthorized fee changes.

* Delete payment history.

* Grant unapproved waivers.

## Student Accounts / Collections Officer

Account: [collections.officer@matara.ac.ke](mailto:collections.officer@matara.ac.ke)

Can:

* View authorized student balances.

* Allocate receipts.

* Follow up on outstanding balances.

* Record collection activity.

* Prepare ageing reports.

Cannot:

* Waive debts without approval.

* Change marks.

* Access unrelated payroll information.

## Cashier

Account: [cashier@matara.ac.ke](mailto:cashier@matara.ac.ke)

Can:

* Record authorized payments.

* Issue receipts.

* Reconcile assigned collections.

* View necessary payment references.

Cannot:

* Approve their own restricted refunds.

* Change fee structures.

* Delete receipts.

* Modify bank or payroll records without authorization.

## Accounts / Bursar

Account: [accounts@matara.ac.ke](mailto:accounts@matara.ac.ke)

Can:

* Maintain assigned ledgers.

* Reconcile accounts.

* Prepare financial statements.

* Process authorized journals.

* Maintain permitted accounting records.

Cannot:

* Independently approve and execute restricted transactions.

* Access confidential HR files without permission.

## Procurement Officer

Account: [procurement.officer@matara.ac.ke](mailto:procurement.officer@matara.ac.ke)

Can:

* Manage supplier records.

* Process requisitions.

* Obtain quotations.

* Prepare purchase orders.

* Track deliveries.

* Generate procurement reports.

Cannot:

* Approve their own restricted purchases.

* Bypass procurement thresholds.

* Modify payment records without authorization.

## Payroll Officer

Account: [payroll.officer@matara.ac.ke](mailto:payroll.officer@matara.ac.ke)

Can:

* Prepare payroll.

* Process approved salary components.

* Record authorized deductions.

* Generate payroll reports.

* Maintain permitted payroll records.

Cannot:

* Independently approve and release their own payroll.

* Change salaries without approval.

* Disclose salary information broadly.

## HR Director

Account: [hr.director@matara.ac.ke](mailto:hr.director@matara.ac.ke)

Can:

* Oversee recruitment.

* Manage employee lifecycle workflows.

* Review contracts and staffing.

* Approve delegated HR actions.

* Oversee leave and performance processes.

Cannot:

* Access student academic records without justification.

* Approve unauthorized salary changes.

* Bypass employment controls.

## HR Officer

Account: [hr.officer@matara.ac.ke](mailto:hr.officer@matara.ac.ke)

Can:

* Maintain staff records.

* Process onboarding.

* Manage leave requests.

* Maintain permitted employment documents.

* Support recruitment workflows.

Cannot:

* Independently authorize restricted salary changes.

* Access unrelated student records.

* Expose confidential personnel files.

# 13. SECURITY, OPERATIONS AND TECHNICAL SERVICES

## Chief Security Officer

Account: [security.officer@matara.ac.ke](mailto:security.officer@matara.ac.ke)

Can:

* Manage security personnel.

* Track incidents.

* Coordinate emergency response.

* Review access-control reports.

* Manage authorized investigations.

Cannot:

* Access unrestricted academic or medical records.

* Erase incident evidence.

* Change system permissions without authorization.

## Gate / Access Control Guard

Account: [gate.guard@matara.ac.ke](mailto:gate.guard@matara.ac.ke)

Can:

* Record visitor entries and exits.

* Verify authorized access.

* View permitted visitor lists.

* Report incidents.

Cannot:

* Browse private student records.

* Access fee balances.

* View HR files.

## Transport & Fleet Manager

Account: [transport.officer@matara.ac.ke](mailto:transport.officer@matara.ac.ke)

Can:

* Manage fleet records.

* Assign vehicles and drivers.

* Schedule authorized trips.

* Track maintenance.

* Record fuel consumption.

Cannot:

* Access unrelated academic records.

* Approve their own restricted claims.

* Modify financial ledgers without authorization.

## Janitorial / Maintenance Staff

Account: [janitorial.staff@matara.ac.ke](mailto:janitorial.staff@matara.ac.ke)

Can:

* View assigned work orders.

* Update task status.

* Report maintenance problems.

* Record task completion.

Cannot:

* Access confidential student records.

* Approve procurement.

* Access restricted financial modules.

## Catering / Mess Manager

Account: [catering.manager@matara.ac.ke](mailto:catering.manager@matara.ac.ke)

Can:

* Manage meal schedules.

* Track inventory.

* Coordinate catering staff.

* Record deliveries.

* Manage authorized catering orders.

Cannot:

* Change marks.

* Access medical records unnecessarily.

* Approve restricted purchases without authority.

## General Staff

Account: [staff@matara.ac.ke](mailto:staff@matara.ac.ke)

Can:

* View their own profile.

* Submit leave requests.

* View assigned duties.

* Access authorized announcements.

* Track personal support requests.

Cannot:

* Access all departments.

* Manage payroll.

* View confidential student information.

## Non-Academic Staff

Account: [non.academic.staff@matara.ac.ke](mailto:non.academic.staff@matara.ac.ke)

Can:

* Access assigned operational modules.

* View personal employment information.

* Manage authorized departmental tasks.

Cannot:

* Access lecturer grading tools automatically.

* View restricted HR or financial records without permission.

## Librarian

Account: [librarian@matara.ac.ke](mailto:librarian@matara.ac.ke)

Can:

* Manage library resources.

* Record borrowing and returns.

* Manage reservations.

* Maintain library membership.

* Generate permitted library reports.

Cannot:

* Change grades.

* Access unrelated medical records.

* Modify university-wide financial records.

## ICT Officer

Account: [ict@matara.ac.ke](mailto:ict@matara.ac.ke)

Can:

* Manage assigned technical assets.

* Troubleshoot IT issues.

* Monitor authorized system health.

* Manage approved configurations.

* Support user accounts within delegated limits.

Cannot:

* Automatically receive Root privileges.

* Access private files without a legitimate need.

* Modify official financial or academic records without permission.

## Stores Officer

Account: [stores.officer@matara.ac.ke](mailto:stores.officer@matara.ac.ke)

Can:

* Record inventory receipts and issues.

* Monitor stock.

* Manage stocktakes.

* Process authorized requisitions.

* Generate inventory reports.

Cannot:

* Approve their own restricted stock adjustments.

* Bypass procurement rules.

* Erase inventory history.

## Asset Officer

Account: [asset.officer@matara.ac.ke](mailto:asset.officer@matara.ac.ke)

Can:

* Maintain the asset register.

* Assign asset custody.

* Track transfers.

* Manage authorized disposal workflows.

* Conduct asset verification.

Cannot:

* Independently approve and execute restricted disposals.

* Delete official asset history.

## Facilities Officer

Account: [facilities.officer@matara.ac.ke](mailto:facilities.officer@matara.ac.ke)

Can:

* Manage buildings.

* Coordinate maintenance.

* Schedule inspections.

* Track utility problems.

* Manage approved contractor work orders.

Cannot:

* Access unrelated academic records.

* Approve their own restricted expenditure.

## Research Officer

Account: [research.officer@matara.ac.ke](mailto:research.officer@matara.ac.ke)

Can:

* Track research proposals.

* Manage authorized project records.

* Track ethics approval.

* Manage grant applications.

* Record publications.

* Generate research reports.

Cannot:

* Bypass research ethics requirements.

* Disclose confidential participant information.

* Independently approve restricted grant expenditure.

## Auditor

Account: [auditor@matara.ac.ke](mailto:auditor@matara.ac.ke)

Can:

* Read authorized financial and operational records.

* Review audit trails.

* Conduct control testing.

* Record findings.

* Prepare audit reports.

* Track corrective actions.

Cannot:

* Silently alter source transactions.

* Delete audit evidence.

* Change examination results.

* Approve their own audited transactions.

# 14. LIBRARY, LMS AND UNIVERSITY-WIDE MODULE PERMISSIONS

The RBAC system must integrate with every existing Matara University ERP module, including:

1. Authentication and account management.

2. User profiles and profile photographs.

3. Roles and permissions.

4. Campus management.

5. Faculties and schools.

6. Departments.

7. Programmes.

8. Academic years and semesters.

9. Courses and university units.

10. Prerequisites and curricula.

11. Student admissions.

12. Student registration and enrolment.

13. Timetabling.

14. Attendance.

15. Learning Management System (LMS).

16. Course content and lecture notes.

17. Assignments and submissions.

18. Quizzes and assessments.

19. Grade Book.

20. Examination management.

21. Results approval and publication.

22. Transcripts and certification.

23. Graduation.

24. Student finance.

25. Fee structures and invoices.

26. Payments and receipts.

27. Refunds, scholarships and waivers.

28. Procurement.

29. Inventory and stores.

30. Asset management.

31. Human resources.

32. Payroll.

33. Student affairs.

34. Accommodation.

35. Library.

36. Research and postgraduate administration.

37. Medical and counselling services.

38. Security and access control.

39. Transport and fleet.

40. Facilities and maintenance.

41. Catering.

42. Sports.

43. Helpdesk and support tickets.

44. Notifications.

45. Reports and analytics.

46. Audit logs.

47. System configuration.

48. Backups and recovery.

Each module must define its own granular permissions and enforce the appropriate scope restrictions.

# 15. LMS PERMISSIONS

The LMS must share authentication and authorized academic data with the university ERP.

## Lecturer

Can:

* Create and manage assigned courses.

* Upload learning materials.

* Publish authorized announcements.

* Create assignments.

* Create quizzes.

* Set assessment deadlines.

* Grade assigned submissions.

* Provide feedback.

* Record attendance.

* Review permitted student progress.

Cannot:

* Manage unrelated courses.

* Access restricted student counselling records.

* Change university-wide grading policies.

* Publish unapproved final results.

## Teaching Assistant

Can:

* View assigned learning activities.

* Grade assigned work.

* Provide feedback.

* Submit marks for lecturer review.

Cannot:

* Change course ownership.

* Publish final results without authorization.

* Access unrelated courses.

## Student

Can:

* View enrolled courses.

* Download available learning materials.

* Submit assignments.

* Participate in authorized discussions.

* Attempt quizzes.

* Review feedback.

* View released results.

Cannot:

* View other students' private submissions.

* Change marks.

* Access restricted lecturer tools.

## HOD and Dean

Can:

* Review authorized teaching activity.

* Monitor departmental or faculty progress.

* View permitted course reports.

* Review designated academic workflows.

Cannot:

* Automatically edit all learning content or marks.

* Access unrelated private records.

## Super Administrator

Can configure the LMS and manage system-level settings.

However, technical access must not be confused with authority to make academic decisions. Academic approvals should follow the relevant institutional workflow.

# 16. STANDARD PERMISSION CODES

Use a consistent naming convention throughout the backend.

Users:

* users.view

* users.create

* users.update

* users.deactivate

* users.reset_password

* users.assign_roles

Roles:

* roles.view

* roles.create

* roles.update

* roles.assign

* roles.configure

Students:

* students.view

* students.create

* students.update

* students.register

* students.defer

* students.suspend

* students.reactivate

Admissions:

* admissions.view

* admissions.review

* admissions.approve

* admissions.reject

* admissions.publish

Courses:

* courses.view

* courses.create

* courses.update

* courses.assign_lecturer

* courses.publish

LMS:

* lms.course.view

* lms.course.manage

* lms.content.create

* lms.content.publish

* lms.assignment.manage

* lms.assignment.grade

* lms.quiz.manage

* lms.submission.view

* lms.submission.grade

Examinations:

* exams.view

* exams.manage

* exams.schedule

* exams.attendance.record

* marks.enter

* marks.review

* marks.correct

* results.approve

* results.publish

Transcripts:

* transcripts.prepare

* transcripts.review

* transcripts.approve

* transcripts.issue

* certificates.issue

Finance:

* finance.view

* finance.transactions.create

* finance.transactions.review

* finance.transactions.approve

* payments.record

* payments.reconcile

* refunds.request

* refunds.approve

* invoices.create

* fees.configure

* fees.publish

* scholarships.manage

Procurement:

* procurement.request

* procurement.review

* procurement.approve

* procurement.purchase_order.create

* procurement.delivery.record

HR:

* hr.staff.view

* hr.staff.create

* hr.staff.update

* hr.leave.manage

* hr.salary.view

* hr.salary.update

* payroll.prepare

* payroll.review

* payroll.approve

Security:

* security.incidents.view

* security.incidents.create

* security.incidents.manage

* security.access_logs.view

Research:

* research.projects.view

* research.projects.create

* research.projects.manage

* research.ethics.track

* research.grants.manage

Library:

* library.catalog.manage

* library.loans.manage

* library.members.view

* library.fines.manage

System:

* system.configure

* system.backup

* system.restore

* system.audit.view

* system.integrations.manage

These codes are examples of granular actions. Add module-specific permissions as necessary, and do not grant every code to every role.

# 17. DATABASE DESIGN

Implement reusable role and permission records in MongoDB.

Recommended collections:

1. users

2. roles

3. permissions

4. userRoleAssignments

5. rolePermissionAssignments

6. campuses

7. faculties

8. departments

9. programmes

10. courses

11. studentEnrollments

12. approvalRequests

13. auditLogs

14. sessions

15. supportTickets

16. securityIncidents

17. notifications

## User document

Include:

* Unique user ID.

* Full name.

* Institutional email.

* Password hash.

* Account status.

* Assigned role references.

* Campus, faculty, department and course scopes.

* Student or employee reference where applicable.

* MFA status.

* Profile photograph reference.

* Account creation timestamp.

* Last login timestamp.

* Password-reset state.

Do not store plaintext passwords, recovery codes or MFA secrets in unprotected form.

## Role document

Include:

* Role ID.

* Role name.

* Role description.

* Role category.

* Assigned permission references.

* Scope restrictions.

* Active status.

* Creation and update timestamps.

## Permission document

Include:

* Permission ID.

* Unique permission code.

* Module.

* Action.

* Description.

* Sensitivity classification.

* Whether additional approval is required.

## User role assignment document

Include:

* User reference.

* Role reference.

* Authorized scope.

* Assignment start date.

* Optional expiry date.

* Assigning administrator.

* Assignment status.

* Reason for assignment.

A role must be reusable. Do not create a new role definition for every user.

# 18. BACKEND AUTHORIZATION REQUIREMENTS

Implement centralized authorization middleware in Express.

Every protected endpoint must verify:

1. The user is authenticated.

2. The account is active.

3. The session is valid.

4. The required permission exists.

5. The user has the appropriate scope.

6. The record belongs to an authorized campus, faculty, department, course or case.

7. Any required approval has been completed.

8. The operation is allowed for the record's current status.

Use deny-by-default authorization.

If a permission is missing or a scope cannot be verified, deny the request.

Return appropriate HTTP responses:

* 401 for unauthenticated requests.

* 403 for authenticated users without permission.

* 404 where a resource should not be disclosed to an unauthorized user.

* 409 for conflicts with the record's current state.

* 422 for invalid workflow transitions.

Never rely only on frontend route guards.

# 19. FRONTEND REQUIREMENTS

The React interface must:

* Show only authorized navigation items.

* Hide or disable unauthorized actions.

* Protect frontend routes.

* Display role-appropriate dashboards.

* Display relevant records based on the user's scope.

* Show clear permission-denied messages.

* Prevent unauthorized form submissions.

* Display approval status.

* Show pending tasks.

* Display authorized audit history.

* Use consistent Matara University branding.

* Support responsive desktop, tablet and mobile layouts.

* Keep dark and light mode functional.

* Provide accessible controls and form validation.

Frontend restrictions supplement backend authorization and do not replace it.

# 20. APPROVAL WORKFLOWS

Implement configurable workflows for:

* Admissions.

* Student registration.

* Deferment and reactivation.

* Examination marks.

* Final results.

* Transcript issuance.

* Graduation eligibility.

* Fee structure changes.

* Scholarships and fee waivers.

* Refunds.

* Procurement.

* Payroll.

* Asset disposal.

* Research ethics.

* Disciplinary decisions.

* Account privilege escalation.

Each workflow must record the initiator, reviewers, approvers, decision, timestamp, comments and applicable supporting evidence.

Do not allow users to approve their own restricted requests.

# 21. AUDIT LOGGING

Record sensitive operations with:

* Acting user ID.

* Assigned role used.

* Action performed.

* Module.

* Record identifier.

* Timestamp.

* Result.

* Reason where required.

* Appropriate before-and-after values.

* Request correlation identifier.

* Source session or device information where appropriate.

Never log passwords, authentication tokens, MFA secrets or unnecessary sensitive personal information.

Audit records must be protected against ordinary editing and deletion. Use a restricted write-only audit mechanism or tamper-evident storage appropriate to the deployment.

# 22. SECURITY TESTING

Test all role permissions with positive and negative tests.

Required tests:

1. A lecturer cannot edit another lecturer's course.

2. A student cannot view another student's private records.

3. A cashier cannot approve their own restricted refund.

4. A teaching assistant cannot publish final grades without permission.

5. A transcript clerk cannot alter source marks.

6. A suspended student cannot bypass account restrictions.

7. A sponsor cannot access an unlinked student's records.

8. A librarian cannot access unrestricted payroll records.

9. An auditor cannot alter the transactions being audited.

10. An ICT officer cannot grant themselves Root access.

11. A Dean cannot access unrelated faculties without authorization.

12. A Helpdesk Level 1 user cannot assign privileged roles.

13. A finance user cannot bypass approval thresholds.

14. A user cannot access a restricted API by manually changing its URL.

15. An unauthorized export request must be rejected.

16. Deactivated accounts cannot continue using old sessions.

17. Removed roles must stop granting access.

18. Direct MongoDB identifiers must not bypass record-level scope checks.

19. Users cannot approve their own restricted transactions.

20. Audit logs must accurately capture sensitive changes.

# 23. IMPLEMENTATION REQUIREMENTS

Implement this specification in the existing Matara University ERP rather than building an unrelated standalone application.

Before making changes:

1. Inspect the existing project structure.

2. Inspect the existing authentication and session system.

3. Inspect existing roles and permissions.

4. Inspect MongoDB schemas and indexes.

5. Inspect backend routes and frontend navigation.

6. Identify existing modules that already implement some of these functions.

7. Preserve working features and the current university branding.

8. Create database migrations or safe update scripts.

9. Avoid creating duplicate roles or conflicting permissions.

10. Back up existing data before modifying production records.

Then:

1. Implement reusable roles and permissions.

2. Create or map the 71 supplied accounts.

3. Map legacy Teacher accounts to verified lecturer accounts.

4. Apply granular permissions and scopes.

5. Protect all backend endpoints.

6. Update frontend route guards and navigation.

7. Add audit logging.

8. Add approval workflows.

9. Add tests for permitted and prohibited actions.

10. Run installation, build and automated tests.

11. Report all unresolved errors.

12. Document installation, configuration, testing and recovery.

Do not claim that a feature works unless it has been implemented and tested.

# 24. FINAL ACCEPTANCE CRITERIA

The implementation is complete when:

* Every supplied account has a defined role.

* All reusable roles have explicit permissions.

* All protected endpoints enforce authorization.

* Record-level scopes are enforced.

* Sensitive operations use the correct approval workflows.

* Academic and financial records have appropriate safeguards.

* Audit logs capture sensitive operations.

* Account deactivation and session revocation work.

* Frontend navigation reflects backend permissions.

* Direct API requests cannot bypass security.

* Automated authorization tests pass.

* Existing ERP functionality remains operational.

* Documentation describes configuration and maintenance.

* No role receives unrestricted access merely because of its title.

**Final instruction:** Implement this specification as a complete, integrated authorization system in Matara University ERP. Use the existing architecture, preserve existing data, enforce least privilege, and test every role before declaring the implementation complete.

Important correction: Your supplied list contains 71 account entries, not 72. The specification retains every entry you listed and does not invent a 72nd account. The roles above are a proposed authorization design; the actual permissions must be enforced and tested against your existing ERP before they can be considered operational.