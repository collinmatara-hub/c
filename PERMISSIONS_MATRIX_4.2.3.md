# Focused Permissions Matrix — v4.2.3

This matrix describes the endpoints changed in v4.2.3, not every module in the university ERP.

| Action | Student | Lecturer / teaching staff | Examination office / board | Administrator |
|---|---|---|---|---|
| Read own LMS dashboard | Own linked record | Own linked teaching record | Not granted by LMS endpoint | Not granted by LMS endpoint |
| Read assignments | Own registered units/classes | Own assignments | Not granted by LMS endpoint | Not granted by LMS endpoint |
| Create assignment | No | Assigned class + subject only | No via LMS endpoint | No via LMS endpoint |
| Read submissions | No | Only own assignment submissions | No via LMS endpoint | No via LMS endpoint |
| Mark submissions | No | Only own assignment submissions; score capped by maximum | No via LMS endpoint | No via LMS endpoint |
| Release feedback | No | Only own marked submissions | No via LMS endpoint | No via LMS endpoint |
| Enter official assessment marks via `/api/assessments` | No | Assigned unit only; registered students or existing marks only | Broad assessment access | Broad assessment access |
| Review/decide supplementary requests via `/api/assessments` | No | No | Yes | Yes |

The ERP's broader role catalogue and module-specific scopes still require a complete route-by-route audit. Frontend route guards are not treated as a substitute for backend authorization.
