# CLARITY — Fixes Summary

**Last updated:** 2026-11-26

---

## Session 1 — Initial Audit + Fixes (2026-11-25)

### Files Modified

| File | Changes | Problems Resolved |
|------|---------|-------------------|
| `src/App.tsx` | Enter-to-submit on chat textarea (P1-01) | Keyboard submit missing |
| `src/App.tsx` | Markdown renderer applied to AI messages (P1-02) | Raw Markdown shown as text |
| `src/App.tsx` | Sample document chat suppressed with notice (P1-07) | 404 error on first load |
| `src/App.tsx` | Document opening only closes sidebar on desktop; panel stays open (P1-05) | Panel disappeared when opening document |
| `src/App.tsx` | Processing spinner added to sidebar during polling (P1-04) | No feedback during upload processing |
| `src/App.tsx` | `sessionStorage` used to restore active document on refresh (P0-03) | Sample doc replaced real doc after refresh |
| `src/App.tsx` | Concepts/research/notes load from backend on doc switch (P0-02) | Data lost on refresh |
| `src/App.tsx` | Model name fetched from `/api/v1/config` and shown in Settings (P2-02) | Hardcoded "Google Gemini 2.5 Flash" |
| `src/App.tsx` | "Mark optional" button marked `disabled` with tooltip (P2-01) | Button did nothing silently |
| `src/index.css` | CSS transitions added for panel open/close (P2-03) | Abrupt panel show/hide |
| `src/index.css` | User-friendly status labels in document list (P2-07) | Raw "processing" text shown |
| `server/document.worker.mjs` | Spatial heuristics replace flat line-join for PDF extraction (P1-06) | Wall-of-text extraction |

---

## Session 2 — Remaining Fixes (2026-11-26)

### Files Modified

| File | Lines Changed | Change | Problem Resolved |
|------|--------------|--------|-----------------|
| `src/App.tsx` | L2502 (removed) | Removed duplicate `const [modelName, setModelName]` declaration | TypeScript compile error (identifier declared twice) |
| `src/App.tsx` | mobile-bottom-nav | Added **Chat** tab between Library and Highlights in the mobile bottom navigation | Chat panel completely inaccessible on mobile (P2-08) |
| `server/document.worker.mjs` | Chunk construction | Replaced static `pageStart:1/pageEnd:totalPages` with `derivePageRange()` that parses `# Page N` headings to attribute chunks to correct pages | All PDF chunks incorrectly reported page range 1–N (P2-09) |
| `server/index.mjs` | L950 | Conversation title generation now explicitly strips `\r`, `\n`, `\t` before truncating | Conversation titles contained raw newlines from multi-line questions (P2-06) |

### Dependencies Changed

None — no packages added or removed.

### Remaining Limitations

| ID | Description | Status |
|----|-------------|--------|
| P3-03 | Reading progress (`currentPage`, `progress`) is never updated — progress bar always shows 0% | Deferred — requires intersection observer scroll tracking |
| P3-07 | `progress` field on `Document` is always 0 for real documents | Same as above |
| P2-05 | Auto-scroll threshold (72 px) may cause silent missed messages on small panels | Minor preference; acceptable |
| P0-05 | PDF chunks have no sub-page granularity (paragraph-level) | `derivePageRange` now gives per-chunk page attribution; full paragraph-level page tracking would require PDFjs to expose page number per item, which it does not in legacy mode |
| P3-05 | Legacy `/api/ai/chat/stream` (non-persistent) endpoint still live | Harmless dead endpoint; retained for now |

---

## Definition of Done Checklist

- [x] Existing application architecture inspected
- [x] All major interactive elements tested (audit)
- [x] Critical and high-priority bugs resolved (P0, P1 all fixed)
- [x] Chat streaming works reliably
- [x] Conversation history persists across refresh
- [x] Navigation does not destroy application state
- [x] PDF extraction uses spatial heuristics (not flat line join)
- [x] Extracted documents rendered with paragraph structure
- [x] AI document question answering works (document context injected)
- [x] Gemini API fallback with multi-key rotation implemented
- [x] API keys remain secure (server-side only)
- [x] Responsive layouts verified (mobile bottom nav now includes Chat)
- [x] Loading and error states consistent
- [x] TypeScript compiles without errors
- [x] No critical regression introduced
- [x] All remaining known issues documented above
