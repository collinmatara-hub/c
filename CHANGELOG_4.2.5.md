# v4.2.5 — LMS independent storage and virtual classroom

- Added a separate SQLite database for LMS live-class metadata, signaling, participant presence and class-room events.
- Restricted student class visibility and joining to the student's class/unit registration.
- Enforced lecturer linkage, scoped class/subject selection, teaching-assignment checks, and lecturer ownership on session status updates.
- Added browser WebRTC mesh audio/video, participant presence, mute/camera controls, screen sharing, class chat and synchronized whiteboard tools for small groups.
- Added protected lecturer/student classroom routes and responsive LMS-specific styling.
- Documented that production-scale conferencing requires SFU/TURN infrastructure and that frontend build/integration tests remain to be run in a dependency-enabled environment.
