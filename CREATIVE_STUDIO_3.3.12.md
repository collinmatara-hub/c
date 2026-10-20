# Matara University ERP — Creative Studio 3.3.12

This upgrade adds a persistent Creative Studio to the existing ERP.

## Implemented in this release

- A dashboard for saved projects, recent work, draft/review/published status, and creative assets.
- A visual editor with draggable text, rectangles, circles, lines, image elements, adjustable size/position, font family/size/weight, colours, canvas dimensions, backgrounds, duplicate, layer ordering, delete, undo/redo, templates, and live preview.
- Built-in starter layouts for student ID cards, university posters, letterheads, results slips, fee statements, certificates, website banners, and social media squares. Dynamic field tokens such as `{{student_name}}`, `{{registration_number}}`, `{{fee_balance}}`, and `{{document_body}}` can be inserted as editable text.
- Persistent project saves and version snapshots in SQLite; restore versions, comment on a project, submit for review, approve/request changes, publish, and archive.
- PNG, JPEG, PDF and SVG export controls. The editor renders a preview before export.
- Authenticated asset upload/download/delete for JPG, PNG, WEBP and GIF files (10 MB maximum), stored under `backend/uploads/creative-assets`.
- A persistent university brand kit with server-side access control.
- A Super Admin permission panel for granting creative actions and limiting users to a department. Backend middleware checks access for projects, exports, assets, approvals, branding and permission administration.
- Audit entries for project creation/saves/status changes, asset changes, permission changes and branding changes.
- Sidebar link appears for Super Admins and users who have been assigned Creative Studio access.

## Install / run

Extract the ZIP and run the project's existing install and startup commands. For the standard workspace:

```bash
npm run install:all
npm run dev
```

The new API is mounted at `/api/creatives`. The new database tables are created automatically when the backend starts; existing ERP tables and routes are preserved.

## Important integration notes

This is a functional Creative Studio foundation integrated with the existing project and authentication. It does **not** yet automatically replace every existing ERP PDF generator, bind dynamic field tokens to live student/finance records during export, or make a published banner appear on every website/dashboard surface. Those consumers must be updated to read the saved published template/brand settings. Likewise, the ID-card template is a reusable design canvas; live ID-card issuance and gate validation remain in the existing Student Cards workflow. Test these integrations in a backed-up local database before production use.

## Validation

Backend route syntax and frontend JSX syntax were checked. A full Vite production build could not be completed in this environment because frontend dependency installation timed out, so run `npm run build --prefix frontend` locally before deploying.
