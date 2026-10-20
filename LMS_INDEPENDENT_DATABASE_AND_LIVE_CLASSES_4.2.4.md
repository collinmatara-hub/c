# Matara University ERP v4.2.4 — LMS separation and online classes

## Architecture
- The LMS remains reachable inside the same ERP app and uses the existing ERP login/session.
- LMS-owned live-class scheduling metadata is stored in `backend/data/lms/lms.sqlite`, separate from `backend/data/matara.db`.
- The LMS database stores class session metadata and audit events only. Identity/role verification and lecturer linkage still use the ERP database; this avoids duplicate user accounts.
- Override the storage directory with `MATARA_LMS_DATA_DIR`.

## Online class features in this build
- Lecturer-only scheduling with title, description and start/end validation.
- Lecturer session listing and status changes (live/ended/cancelled).
- Student listing of scheduled/live sessions.
- Dedicated responsive LMS page, LMS-only font stack and visual tokens.
- Browser camera/microphone preview and an interactive local whiteboard.

## Important conferencing limitation
This build does **not** yet provide production multi-participant video conferencing. A real Teams-like experience requires a signaling service and a WebRTC SFU/media service (e.g. self-hosted LiveKit or mediasoup), plus authenticated room tokens, participant authorization, synchronized whiteboard events, screen sharing, chat, reconnect handling, and optional recording/storage policies. The UI explicitly discloses this limitation rather than pretending the local preview is a live group call.

## API
- `GET /api/lms/live-classes` — lecturer's sessions or sessions visible to a student.
- `POST /api/lms/live-classes` — schedule session (authorized lecturer only).
- `PATCH /api/lms/live-classes/:id/status` — update own session status (authorized lecturer only).

## Verification
- `node --check backend/routes/lmsLiveClasses.js`: passed.
- `node --check backend/server.js`: passed.
- Frontend production build and integration tests were not run in this environment because dependencies are not installed. Do not treat this as production release approval.
