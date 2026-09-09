---
trigger: always_on
---

**When asked to create any modal, dialog, bottom sheet, or popup UI, always use the shared `AppModal` component** (`src/shared/components/AppModal`). Never build custom backdrop/surface/animation markup.

Usage:
- `variant="dialog"` for centered dialogs (default)
- `variant="sheet"` for bottom sheets
- `variant="fullscreen"` for full-screen overlays
- Pass content via `children`; use `contentClassName` for custom sizing/layout
- It handles: portal, scroll lock, backdrop click, Escape key, open/close animations, and the `close-all-app-modals` event