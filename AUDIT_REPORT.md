# CLARITY — Audit Report

**Date:** 2026-11-25  
**Auditor:** Senior Full-Stack Engineer (AI-assisted)  
**Scope:** Complete technical, functional, and UX audit per audit.md specification

---

## 1. Architecture Overview

| Layer | Technology | Assessment |
|-------|-----------|------------|
| Frontend | React 18 + TypeScript + Vite | ✅ Healthy |
| Backend | Express 5 (Node ESM) | ✅ Healthy |
| Database | better-sqlite3 (WAL mode) | ✅ Healthy |
| AI | Google Gemini 2.5 Flash via REST | ✅ Working |
| PDF extraction | pdfjs-dist 6 (Worker thread) | ⚠️ Flat extraction only |
| DOCX extraction | mammoth | ✅ Healthy |
| Chunking | @langchain/textsplitters | ✅ Working |
| State management | Local React state | ⚠️ No persistence for concepts/notes |

**Data directory:** `data/clarity.db` + `data/documents/` — both exist and have data.

---

## 2. Discovered Bugs & Issues

### P0 — Critical

| ID | Location | Issue | Root Cause |
|----|----------|-------|-----------|
| P0-01 | `server/index.mjs` L. 843 | When `streamWithGemini` returns an error AND `stopRequested` is true, the status is set to `'cancelled'` even when the error was a real failure (not a user stop) — only if Gemini fails during a stop request the distinction is wrong. | Minor logic gap, low risk |
| P0-02 | `src/App.tsx` L. 2135–2159 | **Concepts, research notes, and saved passage notes are stored only in React state.** They are lost on page refresh, navigation to landing, or any re-render that resets state. | No backend persistence for these entities |
| P0-03 | `src/App.tsx` L. 2135 | App always starts with `sampleDocument` as the active doc. If a user refreshes mid-session, the sample doc replaces their actual open document. | No URL-based or session-based routing |
| P0-04 | `server/index.mjs` L. 936 | PDF signature check only searches the first 1024 bytes for `%PDF-` using `.includes()`, but `Buffer.includes()` returns a boolean — this works correctly. ✅ Not a bug. | — |
| P0-05 | `server/document.worker.mjs` | PDF chunks always set `pageStart: 1` and `pageEnd: totalPages` for every chunk — no per-chunk page attribution. This means chunk retrieval has no page granularity. | Intentional limitation, not a crash bug |

### P1 — High

| ID | Location | Issue | Root Cause |
|----|----------|-------|-----------|
| P1-01 | `src/App.tsx` ChatPanel L. 740 | **Textarea does not auto-grow**: `rows={3}` is fixed. User cannot press Enter to submit; only the Send button works. Chat UX is awkward on mobile. | Missing `onKeyDown` Enter handler |
| P1-02 | `src/App.tsx` L. 723 | **AI message content renders as plain text** — no Markdown parsing. Code blocks, bold, lists, tables from Gemini are shown as raw `**` and `` ` `` characters. | Missing markdown renderer (no library added) |
| P1-03 | `src/App.tsx` L. 596–681 | **Race condition on rapid conversation switching**: `conversationIdRef` is updated synchronously but the async `getChatMessages` call could resolve after another switch has already updated the ref. The check at L. 657 prevents writing, but the loading state (`setSending(false)`) could desynchronise. | Minor race; guarded by ref check |
| P1-04 | `src/App.tsx` L. 2550–2630 | **Upload polling loop runs up to 60× but never shows a progress indicator in the sidebar during polling**. The sidebar status stays "processing" text but the upload zone shows "Processing…" text — these are disconnected. No spinner or visual cue in the doc list. | UI state not wired to polling loop |
| P1-05 | `src/App.tsx` L. 2244 | **Opening a document from the sidebar closes both sidebar and panel** (`setPanelOpen(false)` + `setSidebarOpen(false)`) — this makes the chat panel disappear and the user has to re-open it. Poor UX. | Intentional but incorrect UX decision |
| P1-06 | `server/document.worker.mjs` L. 18–22 | **PDF text extraction joins all items with a space and strips newlines**, producing a single-paragraph wall of text per page. Paragraph breaks, columns, and headings from the PDF are completely lost. | pdfjs-dist item joining algorithm too aggressive |
| P1-07 | `src/App.tsx` L. 2163 | **Default panel tab is 'chat'** but the chat panel requires a document from the backend to work. With the sample document, the chat panel immediately tries to call `/api/v1/conversations?documentId=doc-1` which will 404 since `doc-1` is not in the DB. This generates an error on first load. | Sample document ID doesn't exist in backend |
| P1-08 | `src/App.tsx` L. 2160–2162 | **Concepts, research, and notes are filtered by `activeDoc.id`** — switching to `sampleDocument` shows sampleConcepts which belong to `doc-1`, but switching to any real document shows an empty concepts panel (they were only in memory and keyed to the sample). | No backend for concepts |

### P2 — Medium

| ID | Location | Issue | Root Cause |
|----|----------|-------|-----------|
| P2-01 | `src/App.tsx` L. 1111 | **"Mark optional" button in LearningPathPanel does nothing** — `onClick` is missing. | Stub/incomplete feature |
| P2-02 | `src/App.tsx` L. 2797 | **Settings modal hardcodes model name** as "Google Gemini 2.5 Flash" regardless of `GENERATION_MODEL` env variable. | Hardcoded string |
| P2-03 | `src/index.css` | **`.app-panel` has no open/closed CSS transition** — `app-panel--open` and `app-panel--closed` classes are referenced in JSX but not defined in CSS. The panel either shows or hides abruptly via display:none. | Missing CSS classes |
| P2-04 | `src/App.tsx` L. 1587 | **Selection tooltip `x` position calculation** (`left: x - 165`) can place tooltip off-screen on narrow viewports. The clamp is applied to `x` but the final `left` can still be negative. | Edge case positioning |
| P2-05 | `src/App.tsx` L. 519–521 | **Auto-scroll threshold of 72px** may be too tight on small panels — users might miss messages silently if they've scrolled slightly. | Preference/UX concern |
| P2-06 | `server/index.mjs` L. 764–766 | **Conversation title generation** uses the first user message verbatim, truncated to 60 chars with no sanitization of multi-line or whitespace-heavy inputs. | Minor; produces ugly titles |
| P2-07 | `src/App.tsx` L. 2512–2515 | **Document list status text** shows raw `item.status` value (e.g., `"processing"`) when status is not ready. Should be user-friendly. | Minor UX |
| P2-08 | `src/index.css` L. 1567 | **On mobile, `app-panel` is `display: none`** — the chat panel is completely inaccessible on mobile without a dedicated route/drawer. | Mobile UX gap |
| P2-09 | `server/document.worker.mjs` L. 165 | **All PDF chunks have incorrect page attribution** — `pageStart: 1, pageEnd: totalPages` for every chunk regardless of which page the text came from. | Chunk splitter doesn't track pages |

### P3 — Low

| ID | Location | Issue | Root Cause |
|----|----------|-------|-----------|
| P3-01 | `src/App.tsx` L. 1111 | "Mark optional" button renders as a secondary btn but has no handler | Incomplete |
| P3-02 | `src/App.tsx` L. 194 | `stateLabels` and `KnowledgeBadge` defined at module level, before first use — works but is style-inconsistent | Code organisation |
| P3-03 | `src/App.tsx` L. 2298 | `page: activeDoc.currentPage ?? 1` — `currentPage` is always 1 for all real docs since it is never updated | Missing progress tracking |
| P3-04 | `src/index.css` | CSS contains styles for `.hero__badge`, `.features`, `.feature-card`, etc. which are referenced nowhere in the current `LandingPage` component | Dead CSS |
| P3-05 | `server/index.mjs` L. 887 | The legacy `/api/ai/chat/stream` endpoint (non-persistent) is still live and functional but unused by the current frontend | Dead endpoint |
| P3-06 | `src/utils/gemini.ts` L. 183 | `chatWithGemini` and `streamChatWithGemini` are exported but never used by the current App | Dead code |
| P3-07 | `src/App.tsx` L. 2298 | `progress` field on `Document` is always 0 for real documents | Feature not implemented |

---

## 3. Architecture Observations

### What Works Well
- **Conversation persistence**: Backend DB + SSE streaming pipeline is solid. Messages survive refresh.
- **API key rotation**: Multi-key fallback with cooldown is correctly implemented.
- **Document security**: Magic-byte validation, 50MB limit, file-type filtering on both ends.
- **Streaming SSE protocol**: Frontend parser correctly handles start/delta/done/error/cancelled events.
- **Worker thread isolation**: Document processing doesn't block the API server.
- **Interruption handling**: Server-restart message recovery (`interrupted` status) is in place.

### Structural Concerns
- **No persistence for concepts, research notes, or highlights** — these are core features stored only in RAM.
- **No URL routing** — back/forward navigation is simulated with `useState`, refreshing resets state.
- **Sample document is a crutch** — `doc-1` doesn't exist in the DB; any API call with this ID will fail.
- **Markdown not rendered** in chat — Gemini's structured responses appear as raw text.
- **PDF extraction is page-flat** — all text from a page becomes one paragraph with no structure.
- **Mobile chat inaccessible** — the right panel is `display: none` on mobile.

---

## 4. Security Assessment

| Check | Status | Notes |
|-------|--------|-------|
| API keys exposed to frontend | ✅ Safe | Keys in `.env`, never sent to browser |
| File upload validation | ✅ Good | MIME + magic bytes + size limit |
| Cross-user data isolation | ✅ Present | `workspaceUserId` enforced on all queries |
| XSS via AI markdown | ⚠️ Potential | Messages rendered via `<p>` with `white-space: pre-wrap` — raw text only, no dangerouslySetInnerHTML. Safe for now but no markdown parser means no sanitization needed. |
| SQL injection | ✅ Safe | Prepared statements throughout |
| Sensitive data in logs | ✅ Safe | `describeGeminiError` redacts API key values |

---

## 5. Performance Assessment

| Check | Status |
|-------|--------|
| Unnecessary re-renders | ⚠️ `NarrationBar` regenerates sentence array on every render |
| Memory leaks | ✅ All streams, timers, and listeners cleaned up |
| Duplicate API requests | ✅ `cancelled` flag pattern used correctly |
| DB query efficiency | ✅ Indexes present for all hot paths |
| Large PDF processing | ⚠️ Entire file read into worker memory — OK for ≤50MB |

