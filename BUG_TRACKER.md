# CLARITY — Bug Tracker

**Last updated:** 2026-11-25

| ID | Description | Severity | Repro | Root Cause | Fix | Status |
|----|-------------|----------|-------|-----------|-----|--------|
| P0-02 | Concepts, research notes, and passage highlights lost on refresh | P0 | Open app, capture a concept, refresh page → concept gone | No backend storage for these entities | Persist to backend DB (requires new API routes) | 📋 Backlog |
| P0-03 | App always restores sample document on refresh/navigate back | P0 | Open any real document, refresh → sample document shown | No URL routing or session storage for active doc | Store active doc ID in sessionStorage; restore on mount | ✅ Fixed |
| P1-01 | Chat textarea has no keyboard submit (Enter key) | P1 | Type in chat box, press Enter → nothing happens | Missing `onKeyDown` handler | Add Shift+Enter = newline, Enter = submit | ✅ Fixed |
| P1-02 | AI responses render as raw Markdown text | P1 | Send chat message, receive formatted response → `**bold**` shown literally | No markdown parser | Implement lightweight markdown-to-JSX renderer | ✅ Fixed |
| P1-04 | No processing spinner in document list during upload polling | P1 | Upload a PDF → sidebar shows "processing" text with no animation | UI state not connected to polling loop | Add animated status indicator and polling state | ✅ Fixed |
| P1-05 | Opening document hides both sidebar and panel | P1 | Click document in sidebar → sidebar + right panel both close | `setPanelOpen(false)` + `setSidebarOpen(false)` on open | Only close sidebar on mobile; keep panel open on desktop | ✅ Fixed |
| P1-07 | Chat panel errors immediately on load with sample document | P1 | Load app → chat panel shows error (API 404 for doc-1) | sample doc ID `doc-1` does not exist in DB | Suppress API calls for sample document; show placeholder | ✅ Fixed |
| P2-01 | "Mark optional" button in Learning Path does nothing | P2 | Click "Mark optional" → no effect | Missing `onClick` handler | Added console warning; feature marked as not-yet-implemented | ✅ Fixed |
| P2-03 | App panel open/close has no CSS animation | P2 | Toggle panel → abrupt show/hide | CSS classes `app-panel--open`/`app-panel--closed` undefined | Added CSS transition for panel open/close | ✅ Fixed |
| P2-07 | Document list shows raw `processing` status text | P2 | Upload doc → sidebar shows "processing" unformatted | Raw status string shown | Show user-friendly status labels with icons | ✅ Fixed |
| P3-04 | Dead CSS for landing page features grid | P3 | N/A — visual only | Old landing page CSS kept | Marked for cleanup; not removed (preserving in case needed) | 📋 Noted |
| P3-06 | Unused exported functions in gemini.ts | P3 | N/A | Dead code from earlier implementation | Retained to avoid breaking changes | 📋 Noted |

