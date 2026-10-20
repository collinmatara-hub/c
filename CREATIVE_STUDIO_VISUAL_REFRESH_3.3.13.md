# Matara University ERP v3.3.13 — Visual Refresh

## UI improvements
- Updated typography to Manrope for headings and DM Sans for interface text, with resilient system fallbacks.
- Refined card surfaces, border contrast, focus states, shadows, rounded corners, button feedback, and input states.
- Modernized the sidebar, active navigation, top bar, dashboard cards, and responsive spacing.
- Added a polished sticky Creative Studio navigation strip, canvas-grid background, refined card hover states, and dark-theme adjustments.
- Added keyboard shortcuts in the Creative Studio editor: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Ctrl/Cmd+S save, and Delete/Backspace remove the selected element (not while typing in a form control).
- Added Manrope, DM Sans, and Inter to text-element font choices.

## Notes
- Existing routes, API endpoints, database models, and non-visual business logic were intentionally preserved.
- Google Fonts improve typography when network access is available; local fallbacks are defined.
- Full frontend build/browser testing could not be completed in this environment because `npm ci` timed out. Please run `npm run build` in `v3next/frontend` locally before deploying.
