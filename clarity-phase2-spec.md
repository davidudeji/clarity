# Clarity — Phase 2 Implementation Specification

> Phase 1 delivered a working prototype with hardcoded data.
> Phase 2 wires everything to real services: document parsing, AI reasoning, speech synthesis, and persistent storage.

---

## 1. Scope

Phase 2 transforms the prototype into a real application. A user should be able to:

1. Upload their own PDF or DOCX file
2. Read it with clean formatting and document outline
3. Listen to it read aloud with sentence-level highlight sync
4. Select a passage and get an AI-generated explanation grounded in the document
5. Open a research thread where AI assists with investigation and cites sources
6. Have concepts, notes, and reading position saved and restored across sessions
7. Start a deep-work session with a real countdown timer and deferred thought queue

Everything in Phase 1 that was mocked must be replaced with real behavior.

---

## 2. Services Required

| Service | Purpose | Provider Options |
|---|---|---|
| **AI reasoning** | Concept explanation, research assistance, learning path generation | OpenAI GPT-4o, Google Gemini 1.5 Pro |
| **Text-to-speech** | Narration with word/sentence timestamps | ElevenLabs, Google TTS, Azure Cognitive |
| **PDF extraction** | Parse PDF text, headings, page positions | pdf-parse (Node), pdfjs-dist (client) |
| **DOCX extraction** | Parse Word documents | mammoth.js |
| **Database** | Persist documents, concepts, sessions, progress | PostgreSQL via Prisma |
| **File storage** | Store uploaded documents | AWS S3, Cloudflare R2, or Supabase Storage |
| **Auth** | User accounts and session management | Clerk, NextAuth, or Supabase Auth |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   BROWSER (React + Vite)             │
│                                                     │
│  LandingPage  │  AppShell  │  Modals  │  Panels    │
└──────────────────────┬──────────────────────────────┘
                       │ REST / WebSocket
┌──────────────────────▼──────────────────────────────┐
│               NODE.JS BACKEND (Express + TypeScript) │
│                                                     │
│  /api/documents    /api/concepts    /api/sessions   │
│  /api/ai/explain   /api/ai/research /api/tts        │
│  /api/upload       /api/auth                        │
└──────┬──────────────┬──────────────────┬────────────┘
       │              │                  │
  ┌────▼────┐   ┌─────▼─────┐   ┌──────▼──────┐
  │PostgreSQL│   │  S3 / R2  │   │ AI Provider  │
  │ (Prisma) │   │  (files)  │   │ (OpenAI /   │
  └──────────┘   └───────────┘   │  Gemini)    │
                                 └─────────────┘
```

### Why a backend?
- AI provider API keys must never be exposed to the browser
- Document files must be stored server-side, not in localStorage
- Multi-session state must persist across devices

---

## 4. Document Ingestion

### 4.1 Upload flow

```
User selects file
  → Frontend sends multipart/form-data to POST /api/upload
  → Backend validates: type (pdf|docx), size (max 50MB)
  → File stored in S3/R2 with a UUID key
  → Extraction job queued (or run inline for small files)
  → Extraction result: { outline, sections, totalPages } saved to DB
  → Frontend polls GET /api/documents/:id/status until ready
  → Reader loads with real content
```

### 4.2 PDF extraction

Use **pdfjs-dist** on the backend (Node worker).

Extract:
- Text content per page, preserving reading order
- Heading detection via font size heuristics (`fontSize > body * 1.3` = heading)
- Page number per paragraph for position tracking

Handle failures:
- Scanned PDFs (image-only) → flag `extractionQuality: 'ocr-required'`, show warning
- Encrypted PDFs → reject with user-facing error
- Complex tables → extract as plain text, note loss of structure

### 4.3 DOCX extraction

Use **mammoth.js**.

```ts
import mammoth from 'mammoth';

const { value: html } = await mammoth.convertToHtml({ path: filePath });
// Parse HTML into sections and paragraphs using cheerio
```

Mammoth preserves heading levels (h1/h2/h3) — map directly to `OutlineItem.level`.

### 4.4 Data model

```prisma
model Document {
  id              String    @id @default(cuid())
  userId          String
  name            String
  type            String    // pdf | docx
  storageKey      String    // S3 object key
  status          String    // processing | ready | failed | ocr-required
  totalPages      Int?
  outline         Json      // OutlineItem[]
  sections        Json      // Section[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  readingProgress ReadingProgress?
  concepts        Concept[]
}

model ReadingProgress {
  id          String   @id @default(cuid())
  documentId  String   @unique
  currentPage Int      @default(1)
  sectionId   String?
  percentage  Int      @default(0)
  updatedAt   DateTime @updatedAt
}
```

---

## 5. AI — Concept Explanation

### 5.1 Endpoint

```
POST /api/ai/explain
Body:    { documentId, quote, sectionContext, userQuestion? }
Returns: { explanation, relatedConcepts, suggestedQuestion }
```

### 5.2 Prompt design

```
SYSTEM:
You are a learning assistant embedded in a document reader.
Your job is to explain passages from the document clearly and accurately.

Rules:
- Ground every claim in the source passage provided.
- Do not add information not present in the document or the user's question.
- Write for a reader who has just encountered this passage for the first time.
- If the user has asked a specific question, answer that directly first.
- Keep the explanation under 150 words unless complexity requires more.
- End with one open question the user might want to investigate further.

Source passage:
"""
{quote}
"""

Section context (surrounding paragraphs):
"""
{sectionContext}
"""

USER:
{userQuestion or "Explain this passage."}
```

### 5.3 Structured output

Use OpenAI structured outputs or Gemini response schema:

```ts
const ExplanationSchema = z.object({
  explanation:      z.string(),
  suggestedQuestion: z.string(),
  relatedConcepts:  z.array(z.string()).max(3),
  confidenceNote:   z.string().optional(),
});
```

### 5.4 Cost control

- Cache explanations by `sha256(quote + documentId)` — same passage never re-queried
- Trim `sectionContext` to max 1000 tokens before sending
- Rate limit: 60 AI requests per user per hour

---

## 6. AI — Research Assistance

### 6.1 Endpoint

```
POST /api/ai/research
Body:    { question, sourceQuote, documentId, priorFindings? }
Returns: { summary, suggestedSources, followUpQuestions, caveats }
```

### 6.2 Prompt design

The research prompt must clearly separate:
- What the **document author claims**
- What **external sources say**
- What the **AI is synthesizing**
- What remains **uncertain**

```
SYSTEM:
You are a research assistant. The user is investigating a question
that arose while reading a document.

Your response must:
1. Directly answer the question based on general knowledge.
2. Distinguish your synthesis from the author's claim.
3. Suggest 2-3 real sources the user could consult
   (name, author, year — do not fabricate URLs).
4. Identify what remains unresolved or contested.
5. Never present your synthesis as the document author's position.

The question arose from this passage:
"""
{sourceQuote}
"""
```

### 6.3 Source integrity

- AI must not fabricate URLs — only suggest source types (book title, paper name, author)
- Label AI synthesis clearly in the UI with an "AI synthesis" badge
- User's own notes are stored separately and never co-mingled with AI output

---

## 7. AI — Learning Path Generation

### 7.1 Endpoint

```
POST /api/ai/learning-path
Body:    { documentId, userGoal?, existingConceptIds }
Returns: { nodes: PathNode[] }
```

### 7.2 Logic

1. Load document outline from DB
2. Send outline + user's captured concepts to AI
3. AI returns ordered list: `{ title, type: 'core'|'prerequisite'|'optional', reason }`
4. Store as `LearningPath` in DB, linked to document
5. Update as user marks concepts learned

### 7.3 Override rules

- User can drag-reorder path nodes at any time
- Any reordering is saved and overrides AI suggestion
- AI never forcibly re-orders a user's customized path

---

## 8. Text-to-Speech Narration

### 8.1 Provider comparison

| Provider | Word timestamps | Voice quality | Cost | Offline |
|---|---|---|---|---|
| **ElevenLabs** | Yes (alignment API) | Excellent | ~$0.30/1k chars | No |
| **Google TTS** | Yes (SSML timepoints) | Good | ~$0.016/1k chars | No |
| **Azure Cognitive** | Yes (word boundary events) | Good | ~$0.016/1k chars | No |
| **Browser SpeechSynthesis** | Unreliable | Varies | Free | Yes |

**Recommendation:** Use **ElevenLabs** for quality, **Google TTS** as cost fallback.

### 8.2 Endpoint

```
POST /api/tts
Body:    { text, sectionId, documentId, speed? }
Returns: { audioUrl, timestamps: SentenceTimestamp[] }

// SentenceTimestamp shape
{ sentenceIndex: number, startMs: number, endMs: number, text: string }
```

### 8.3 Audio delivery

- Generate audio server-side, store in S3 with 24h TTL
- Return pre-signed URL to the frontend
- Frontend plays via `<audio>` element, syncs highlights using `ontimeupdate`

### 8.4 Highlighting sync

```ts
audio.ontimeupdate = () => {
  const currentMs = audio.currentTime * 1000;
  const active = timestamps.find(
    t => currentMs >= t.startMs && currentMs < t.endMs
  );
  if (active) highlightSentence(active.sentenceIndex);
};
```

### 8.5 Fallback

If the TTS API fails or is unavailable:
- Fall back to `window.speechSynthesis`
- Show warning: "Using browser narration — word sync may be less accurate"
- Use `speechSynthesis.onboundary` for approximate sentence detection

---

## 9. Data Persistence

### 9.1 What gets saved

| Data | Persistence | Notes |
|---|---|---|
| Uploaded documents | S3 + DB | Indefinite unless user deletes |
| Reading position | DB | Updated on scroll/page change, debounced 2s |
| Concepts | DB | Never auto-deleted |
| Research notes | DB | Linked to concept + document |
| Session intentions | DB | Kept for 90 days |
| Deferred thoughts | DB | Until dismissed by user |
| Learning path | DB | Overridable by user |
| TTS audio | S3 | 24h TTL, regenerated on demand |

### 9.2 Full database schema

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  name      String?
  documents Document[]
  sessions  Session[]
  createdAt DateTime   @default(now())
}

model Document {
  id            String           @id @default(cuid())
  userId        String
  user          User             @relation(fields: [userId], references: [id])
  name          String
  type          String
  storageKey    String
  status        String           @default("processing")
  totalPages    Int?
  outline       Json
  sections      Json
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  progress      ReadingProgress?
  concepts      Concept[]
  researchNotes ResearchNote[]
  learningPath  LearningPath?
}

model ReadingProgress {
  id         String   @id @default(cuid())
  documentId String   @unique
  document   Document @relation(fields: [documentId], references: [id])
  currentPage Int     @default(1)
  sectionId  String?
  percentage Int      @default(0)
  updatedAt  DateTime @updatedAt
}

model Concept {
  id             String         @id @default(cuid())
  documentId     String
  document       Document       @relation(fields: [documentId], references: [id])
  quote          String
  title          String
  explanation    String?
  aiExplanation  String?
  knowledgeState String         @default("encountered")
  tags           String[]
  question       String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  researchNotes  ResearchNote[]
  reviews        ReviewAttempt[]
}

model ResearchNote {
  id          String   @id @default(cuid())
  conceptId   String?
  concept     Concept? @relation(fields: [conceptId], references: [id])
  documentId  String
  document    Document @relation(fields: [documentId], references: [id])
  question    String
  source      String?
  notes       String
  aiSynthesis String?
  isAi        Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model LearningPath {
  id         String   @id @default(cuid())
  documentId String   @unique
  document   Document @relation(fields: [documentId], references: [id])
  nodes      Json
  userSorted Boolean  @default(false)
  updatedAt  DateTime @updatedAt
}

model Session {
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id])
  documentId       String?
  intention        String
  durationMinutes  Int
  startedAt        DateTime  @default(now())
  endedAt          DateTime?
  deferredThoughts String[]
}

model ReviewAttempt {
  id          String   @id @default(cuid())
  conceptId   String
  concept     Concept  @relation(fields: [conceptId], references: [id])
  result      String   // 'knew' | 'missed'
  stateBefore String
  stateAfter  String
  reviewedAt  DateTime @default(now())
}
```

---

## 10. Authentication

Use **Clerk** (simplest integration with React + Node) or **Supabase Auth**.

### Routes requiring auth

- All `/api/*` routes except `/api/health`
- App shell — redirect to login if unauthenticated

### Implementation

```ts
import { requireAuth } from '@clerk/express';

app.use('/api', requireAuth());

app.get('/api/documents', async (req, res) => {
  const userId = req.auth.userId;
  const docs = await prisma.document.findMany({ where: { userId } });
  res.json(docs);
});
```

---

## 11. API Reference

### Documents

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload PDF/DOCX |
| `GET` | `/api/documents` | List user's documents |
| `GET` | `/api/documents/:id` | Get document with outline + sections |
| `GET` | `/api/documents/:id/status` | Check extraction status |
| `DELETE` | `/api/documents/:id` | Delete document and all derived data |
| `PUT` | `/api/documents/:id/progress` | Update reading position |

### Concepts

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/concepts` | Create concept from selection |
| `GET` | `/api/concepts?documentId=` | List concepts for a document |
| `PUT` | `/api/concepts/:id` | Update concept state, explanation, tags |
| `DELETE` | `/api/concepts/:id` | Delete concept |

### AI

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/explain` | Get AI explanation of a passage |
| `POST` | `/api/ai/research` | Get research assistance for a question |
| `POST` | `/api/ai/learning-path` | Generate ordered learning sequence |

### TTS

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/tts` | Generate narration audio and timestamps |

### Sessions

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Start a session |
| `PUT` | `/api/sessions/:id/end` | End session |
| `PUT` | `/api/sessions/:id/defer` | Add a deferred thought |

---

## 12. Environment Variables

```env
# AI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# TTS
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=clarity-documents
AWS_REGION=us-east-1

# Database
DATABASE_URL=postgresql://user:pass@host:5432/clarity

# Auth
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...

# Frontend (Vite)
VITE_API_BASE_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

---

## 13. Security Requirements

| Risk | Mitigation |
|---|---|
| Exposed API keys | All AI and storage keys server-side only, never in the frontend bundle |
| Malicious document content | Treat extracted text as untrusted — sanitize before rendering |
| Prompt injection via document | AI system prompt clearly separates document content from instructions |
| User data isolation | Every DB query filters by `userId` from verified auth token |
| File upload abuse | Validate MIME type server-side, enforce 50MB limit |
| AI cost runaway | Per-user rate limits, monthly spending cap via provider settings |
| Stored XSS from AI output | Render AI text as plain text or sanitized markdown, never raw HTML |

---

## 14. Implementation Phases

### Phase 2a — Backend foundation (2–3 weeks)
- [ ] Express + TypeScript API server scaffolded
- [ ] PostgreSQL + Prisma schema migrated
- [ ] Auth middleware (Clerk) integrated
- [ ] File upload endpoint + S3 storage
- [ ] PDF extraction (pdfjs) + DOCX (mammoth)
- [ ] Document CRUD API
- [ ] Reading progress persistence
- [ ] Frontend wired to real API (mock data removed)

### Phase 2b — AI features (1–2 weeks)
- [ ] `/api/ai/explain` with prompt and structured output
- [ ] AI explanation shown in Concept capture modal
- [ ] Explanation caching by passage hash
- [ ] `/api/ai/research` endpoint
- [ ] Research panel uses AI for thread assistance
- [ ] `/api/ai/learning-path` endpoint — Learning Path panel uses real data
- [ ] AI output clearly labelled in UI

### Phase 2c — Narration (1–2 weeks)
- [ ] `/api/tts` endpoint with ElevenLabs or Google TTS
- [ ] Sentence timestamp extraction
- [ ] Audio stored in S3, served via pre-signed URL
- [ ] Frontend syncs highlights using `ontimeupdate`
- [ ] Fallback to `window.speechSynthesis` with warning
- [ ] Speed control passed to TTS provider

### Phase 2d — Polish and production (1 week)
- [ ] Error states for all API failures
- [ ] Upload progress indicator
- [ ] Extraction status polling (loading → ready → error)
- [ ] Rate limit UI — show when user hits AI quota
- [ ] Mobile responsiveness for app shell
- [ ] Environment config for production deployment

---

## 15. Definition of Done

Phase 2 is complete when a user can:

1. ✅ Sign up and log in
2. ✅ Upload a real PDF and see it correctly extracted
3. ✅ Read it in focus mode with the document outline working
4. ✅ Click play and hear it read aloud with sentences highlighted
5. ✅ Select a passage and get an AI explanation grounded in the text
6. ✅ Open a research thread and get AI-assisted investigation
7. ✅ Have all of the above saved and restored on the next visit
8. ✅ Start a deep-work session with a live countdown timer
9. ✅ Capture deferred thoughts that persist until dismissed
10. ✅ All of the above working without exposing any API key to the browser
