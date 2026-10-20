# New university logo

The new Matara University logo is now used everywhere the old shield was, and in every generated document.

Files
- frontend/public/matara-logo.png and frontend/src/assets/matara-logo.png: the logo (transparent background)
- frontend/src/assets/logoData.js: the same logo as a data URL, used by the PDF generators
- frontend/public/favicon.png: browser tab icon

Where it appears
- Sidebar, login page, forgot-password page (via the Crest component)
- Verification page (public document check)
- Result Book on screen and when printed
- PDFs from utils/pdf.js: student profile, fee statement, report card, bulk report cards, tabular reports (every page, including continuation pages), student ID card, certificates
- Transcript and certificate PDFs from the Documents page

To replace the logo later, overwrite the two PNG files and regenerate logoData.js from the PNG.

Install fix
- backend/package-lock.json was out of sync with backend/package.json (axios, multer 2.x and @aws-sdk/client-s3 were missing), so "npm ci" failed.
- start.bat, start.sh and "npm run install:all" now use "npm install", which also repairs the lock file.

Lecturers page fix
- The "Add lecturer" popup is now attached to the page body (components/ModalOverlay.jsx) and sits above the sidebar and top bar, so it no longer stretches over the page area.
- The same fix is applied to the Cohorts and Fees popups.
- The Lecturers page now shows an error message instead of breaking when the list cannot load or a lecturer has no name.
