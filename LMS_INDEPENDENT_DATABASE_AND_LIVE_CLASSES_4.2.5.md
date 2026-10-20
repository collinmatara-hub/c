# Matara University ERP v4.2.5 — Independent LMS storage and online classroom

## Architecture
- LMS screens remain part of the ERP application and reuse its authenticated session and role checks; there is no duplicate LMS login.
- LMS-owned class sessions, signaling messages, presence, and event history are stored in `backend/data/lms/lms.sqlite`, separate from the ERP database. Set `MATARA_LMS_DATA_DIR` to relocate the LMS database.
- ERP database access from the live-class route is read-only and used for account linkage, class/subject validation, lecturer teaching assignments, and student class/unit eligibility.
- Student class listings are limited to their assigned class or registered subjects. An online session must target a class or subject; lecturers must have a matching assignment in the timetable, assignments, or learning materials.

## Implemented online classroom features
- Lecturer schedules sessions and starts/ends/cancels only their own sessions.
- Students can see and join only sessions matching their class or unit registrations; the server checks authorization again for room signaling.
- Browser WebRTC audio/video between connected participants, participant presence, mute/camera controls, screen sharing, class chat, and synchronized whiteboard pen/eraser/clear events.
- Dedicated LMS layout and font stack, responsive classroom panels, and links back to the relevant LMS portal.

## Deployment and limitations
- Use HTTPS in deployed environments; browsers generally restrict camera/microphone/screen capture to secure contexts (localhost is allowed for development).
- This version uses a lightweight HTTP-polling signaling path and peer-to-peer WebRTC mesh with a public STUN server. It is intended for small tutorials and is not a claim of feature parity with Microsoft Teams. Large classes need a production SFU such as LiveKit/mediasoup, TURN relay credentials for restrictive networks, robust reconnect handling, moderation controls, accessibility testing, and a privacy/retention policy before production use.
- The optional `POST /api/lms/live-classes/:id/token` endpoint issues a short-lived LiveKit JWT when `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are configured. The current browser conference uses built-in WebRTC signaling and does not require those variables.
- WebRTC connectivity can fail on some NAT/firewall combinations without a configured TURN service. The UI reports authorization errors; operators should validate real network paths with multiple test accounts/devices.

## API additions
- `GET /api/lms/live-classes` — lecturer's sessions or sessions visible to an eligible student.
- `POST /api/lms/live-classes` — schedule a scoped session (authorized lecturer only).
- `PATCH /api/lms/live-classes/:id/status` — update own session status.
- `GET /api/lms/live-classes/:id/participants` — update own heartbeat and list active room participants.
- `GET /api/lms/live-classes/:id/signal-cursor` and `GET/POST /api/lms/live-classes/:id/signals` — authorized room signaling.
- `DELETE /api/lms/live-classes/:id/presence` — leave the room.

## Verification status
- `node --check backend/routes/lmsLiveClasses.js` and `node --check backend/server.js` are run as syntax checks.
- Frontend production build and full integration tests have not been run here because project dependencies are not installed and the attempted npm install timed out. Test with `npm run install:all`, `npm run build`, and `npm test` in a network-enabled development environment before using with real students.
