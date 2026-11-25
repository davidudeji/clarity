# CLARITY — PERSISTENT WORKSPACE & ADVANCED AI CHATBOT SPECIFICATION

**Project:** Clarity  
**Module:** Application Persistence, AI Chat & Context Management  
**Priority:** Critical  
**Runtime:** Node.js 20+  
**Language:** JavaScript ES Modules  
**Backend:** Express.js  
**Database:** SQLite  
**Vector Database:** ChromaDB  
**AI Provider:** Google Gemini through `@google/genai`

---

# 1. PROJECT OBJECTIVE

Transform Clarity into a persistent, context-aware AI-powered reading and study workspace.

The application currently loses chat history and potentially other application state when users navigate away from a tab or return to the application.

This must be resolved at the architectural level.

The application must preserve:

- Conversations.
- Individual messages.
- AI-generated responses.
- Document associations.
- Reading positions.
- Highlights.
- Notes.
- Extracted concepts.
- Research discussions.
- Flashcards.
- Quizzes.
- Study progress.
- User preferences.

The AI chatbot must also support:

- Real-time streaming.
- Conversation context.
- Document-grounded responses.
- Long-term conversation continuity.
- Semantic document retrieval.
- Page-level citations.
- Message regeneration.
- Stop generation.
- Retry failed responses.
- Context summarization.

## Core principle

The backend database is the source of truth.

Frontend state is a representation of persisted backend data, not the permanent storage mechanism.

Never rely exclusively on React state, Angular state, component state, or browser memory to preserve user data.

---

# 2. INITIAL CODEBASE AUDIT

Before implementing anything, inspect the existing application.

Identify:

1. Existing frontend framework and routing architecture.
2. Existing chat component.
3. Existing conversation state management.
4. Existing Gemini service.
5. Existing Express backend.
6. Existing SQLite configuration.
7. Existing ChromaDB integration.
8. Existing document processing pipeline.
9. Existing upload and document metadata structure.
10. Existing localStorage or sessionStorage usage.

Determine why messages disappear when the user navigates away.

Investigate:

- Whether messages exist only in component state.
- Whether changing tabs destroys the chat component.
- Whether conversation IDs are generated but never persisted.
- Whether messages are saved only after receiving a completed response.
- Whether requests are cancelled during component unmount.
- Whether conversation history is loaded when a component mounts.
- Whether application state is reset during route changes.

Do not implement a second persistence system if one already exists.

Extend the existing architecture.

---

# 3. PERSISTENT DATABASE ARCHITECTURE

Use SQLite as the authoritative storage layer.

Use `better-sqlite3` if the existing backend already uses it.

Create a relational schema that supports multiple users and multiple conversations.

## 3.1 Users table

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

If authentication is not implemented, introduce a stable anonymous workspace identity.

Do not use a newly generated random ID every time the application loads.

When authentication is added, associate existing anonymous data with the authenticated user through an explicit migration process.

## 3.2 Conversations table

```sql
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT,
    title TEXT NOT NULL DEFAULT 'New conversation',
    conversation_type TEXT DEFAULT 'document',
    summary TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

Requirements:

- Each conversation belongs to a user.
- A conversation can be associated with a document.
- Conversations must remain independent.
- Conversation titles can be generated automatically.
- Conversations must support archiving.
- Deleting a conversation must not delete its original document.
- Updating a conversation must update its timestamps.

## 3.3 Messages table

```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    status TEXT DEFAULT 'complete',
    model TEXT,
    token_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE
);
```

Supported roles:

- system
- user
- assistant

Supported message statuses:

- pending
- streaming
- complete
- failed
- interrupted
- cancelled

Requirements:

- Every message has a stable ID.
- Every message belongs to a conversation.
- Messages are persisted independently.
- Messages retain their original creation timestamps.
- Messages can be edited.
- Assistant responses can be regenerated.
- Failed messages remain identifiable.
- Streaming responses must not disappear if the user navigates away.

## 3.4 Message citations table

```sql
CREATE TABLE message_citations (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    page_number INTEGER,
    chunk_id TEXT,
    quoted_text TEXT,
    relevance_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(message_id)
        REFERENCES messages(id)
        ON DELETE CASCADE
);
```

Every citation must point to an actual stored document and valid source location.

## 3.5 Document reading progress

```sql
CREATE TABLE reading_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    current_page INTEGER DEFAULT 1,
    scroll_position REAL DEFAULT 0,
    reading_mode TEXT DEFAULT 'original',
    zoom_level REAL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, document_id)
);
```

Preserve the last reading position.

When the user reopens a document, restore:

- Last page.
- Scroll position.
- Zoom level.
- Reading mode.
- Relevant document panel state.

## 3.6 Highlights and notes

Persist highlights and annotations independently from component state.

Each record should include:

- ID.
- User ID.
- Document ID.
- Page number.
- Selected text.
- Annotation or note.
- Highlight color.
- Created timestamp.
- Updated timestamp.

## 3.7 Database indexing

Create indexes for:

- `conversations.user_id`
- `conversations.updated_at`
- `messages.conversation_id`
- `messages.created_at`
- `message_citations.message_id`
- `reading_progress.user_id`

Enable SQLite foreign keys.

Configure WAL mode and appropriate busy-timeout handling.

Use database transactions for operations that modify multiple related records.

---

# 4. CONVERSATION PERSISTENCE

Implement complete conversation lifecycle management.

## 4.1 Creating a conversation

When a user starts a new chat:

1. Generate a UUID.
2. Create a conversation record.
3. Associate it with the current user.
4. Associate it with the active document when applicable.
5. Return the conversation ID.
6. Initialize the chat interface.

Do not wait until the first AI response to create the conversation.

## 4.2 Sending a message

When a user submits a prompt:

1. Validate the input.
2. Persist the user message immediately.
3. Create an assistant message with `pending` status.
4. Begin AI generation.
5. Update the assistant message during streaming.
6. Persist the completed response.
7. Update conversation timestamps.
8. Save associated citations.

The user message must remain saved even if Gemini fails.

## 4.3 Restoring conversations

When a user returns:

1. Retrieve their conversation list.
2. Identify the selected conversation.
3. Retrieve its messages.
4. Restore message ordering.
5. Restore associated citations.
6. Restore document context.
7. Restore the latest conversation summary.
8. Continue the existing conversation.

Never automatically replace an existing conversation with an empty one.

## 4.4 Conversation navigation

Implement:

- New conversation.
- Open existing conversation.
- Rename conversation.
- Delete conversation.
- Archive conversation.
- Search conversations.
- Switch between conversations.
- Restore last active conversation.

The conversation sidebar should remain synchronized with the database.

---

# 5. STREAMING AI RESPONSES

Implement real token/chunk streaming.

The user must not wait for Gemini to finish generating an entire response before seeing it.

Use the official `@google/genai` streaming functionality.

Use Express with Server-Sent Events (SSE) or a streaming Fetch response.

Prefer SSE-compatible event formatting with a POST request using Fetch and ReadableStream on the frontend.

Do not assume native EventSource supports POST requests.

## 5.1 Streaming lifecycle

```text
User submits prompt
        |
        v
Persist user message
        |
        v
Create assistant placeholder
        |
        v
Retrieve conversation context
        |
        v
Retrieve document context
        |
        v
Construct Gemini prompt
        |
        v
Start Gemini streaming
        |
        v
Receive generated chunks
        |
        v
Send chunks to frontend
        |
        v
Render response progressively
        |
        v
Persist generated content
        |
        v
Save citations and metadata
        |
        v
Mark response complete
```

## 5.2 Streaming event types

Implement structured events.

### Start

```json
{
  "type": "start",
  "messageId": "assistant-message-id",
  "conversationId": "conversation-id"
}
```

### Content

```json
{
  "type": "delta",
  "content": "The concept of deep work..."
}
```

### Citation

```json
{
  "type": "citation",
  "documentId": "document-id",
  "page": 101,
  "chunkId": "chunk-id"
}
```

### Completion

```json
{
  "type": "done",
  "messageId": "assistant-message-id",
  "status": "complete"
}
```

### Error

```json
{
  "type": "error",
  "code": "AI_GENERATION_FAILED",
  "message": "Unable to complete this response."
}
```

### Cancellation

```json
{
  "type": "cancelled",
  "messageId": "assistant-message-id"
}
```

## 5.3 Streaming requirements

- Display content progressively.
- Avoid rendering the entire conversation on every token.
- Buffer updates efficiently.
- Preserve Markdown formatting.
- Handle network interruption.
- Handle Gemini failures.
- Handle user cancellation.
- Persist partial generated content.
- Mark interrupted responses accurately.
- Never mark an incomplete response as complete.

Persist streaming output periodically and at completion.

Do not write every individual token to SQLite.

Use bounded batching or periodic checkpoints.

## 5.4 Stop generation

Implement a Stop button.

When activated:

1. Cancel the client stream.
2. Abort the backend generation request where supported.
3. Stop further processing.
4. Persist generated partial content.
5. Mark the message as cancelled.
6. Preserve the conversation.

Use AbortController for request cancellation.

A cancelled response must not be treated as a successful complete response.

---

# 6. CONVERSATION CONTEXT MANAGEMENT

A proper AI chatbot must understand the conversation beyond the latest message.

Do not send only the current user prompt to Gemini.

Implement a context assembly service.

Create:

`src/services/ai/context-manager.service.js`

## 6.1 Context sources

The context manager must combine:

1. System instructions.
2. Current document information.
3. Previous conversation messages.
4. Conversation summary.
5. Relevant retrieved document chunks.
6. Relevant saved user notes, when requested or useful.
7. Current user message.

## 6.2 Conversation history

Retrieve recent messages from the active conversation.

Preserve their original roles.

Do not mix messages from different conversations.

Do not mix different users' conversations.

Do not blindly send the entire chat history to Gemini.

Use a token-budget strategy.

## 6.3 Long conversation handling

Long conversations must not become unusable because they exceed model context limits.

Implement conversation summarization.

When the conversation grows beyond a configurable token threshold:

1. Identify older messages.
2. Generate a structured summary.
3. Persist the summary.
4. Preserve recent messages verbatim.
5. Use the summary as historical context.
6. Continue the conversation.

Do not summarize away recent user instructions or important unresolved questions.

Maintain a distinction between:

- Recent verbatim messages.
- Historical conversation summary.
- Retrieved document context.

## 6.4 Conversation summary format

Maintain a structured summary containing:

- Main discussion topic.
- Important concepts.
- User's questions.
- Established facts from the document.
- Important conclusions.
- Unresolved questions.
- Relevant references and page numbers.

The summary must be updated as the conversation progresses.

Do not treat generated summaries as original source material.

---

# 7. DOCUMENT-AWARE AI (RAG)

Clarity is primarily a document reading and study application.

Its AI chatbot must understand the uploaded document.

Implement Retrieval-Augmented Generation.

## 7.1 Retrieval workflow

```text
User asks a question
        |
        v
Generate query embedding
        |
        v
Search ChromaDB
        |
        v
Filter by document scope
        |
        v
Retrieve relevant chunks
        |
        v
Rank retrieved passages
        |
        v
Construct context
        |
        v
Send to Gemini
        |
        v
Stream grounded answer
        |
        v
Attach citations
```

## 7.2 Document context

For document-specific conversations:

- Prioritize the currently open document.
- Retrieve relevant document sections.
- Include page numbers.
- Include section headings.
- Avoid unrelated document content.
- Use previous conversation context where relevant.

Support two retrieval modes:

**Document mode**

Answers must prioritize the selected document and cite its pages.

**General mode**

Answers can use broader model knowledge while clearly distinguishing external knowledge from document-derived information.

## 7.3 Grounding rules

The system prompt must instruct Gemini to:

- Answer from retrieved source material when document mode is active.
- Never fabricate page numbers.
- Never invent citations.
- Identify when the document does not contain sufficient information.
- Distinguish direct source claims from interpretation.
- Explain difficult concepts using accessible language.
- Preserve the author's terminology and meaning.

## 7.4 Citation format

Every document-grounded citation should contain:

- Document ID.
- Page number.
- Chunk ID.
- Relevant quoted passage.

The frontend must support clicking a citation to navigate to the referenced PDF page.

---

# 8. GEMINI PROMPT ARCHITECTURE

Create a centralized prompt management service.

`src/services/ai/prompt.service.js`

Avoid embedding long system prompts directly in individual controllers.

## 8.1 Base system prompt

Clarity's AI should behave as an intelligent reading and learning assistant.

It should:

- Explain concepts clearly.
- Use document context.
- Maintain conversation continuity.
- Ask clarifying questions when necessary.
- Provide examples when useful.
- Break down difficult concepts.
- Support active learning.
- Identify knowledge gaps.
- Provide source citations when document context is used.

## 8.2 Prompt construction order

Construct prompts in this order:

1. Base system instructions.
2. Clarity operating instructions.
3. Conversation summary.
4. Relevant recent messages.
5. Retrieved document passages.
6. Current user message.

Use the installed Gemini SDK's supported conversation and system-instruction interfaces.

Treat uploaded document text as untrusted source data, not as instructions that can override the system prompt.

## 8.3 Response quality

Support:

- Markdown headings.
- Bold text.
- Bullet lists.
- Tables.
- Code blocks.
- Mathematical notation.
- Inline citations.
- Follow-up suggestions when useful.

Do not force every answer into a rigid template.

---

# 9. CHAT USER EXPERIENCE

Build a polished, responsive chat experience.

## 9.1 Chat interface

Include:

- Conversation messages.
- User and assistant distinction.
- Streaming indicator.
- Stop generation button.
- Retry button.
- Copy response.
- Regenerate response.
- Edit user message.
- Citation links.
- Markdown rendering.
- Code syntax highlighting.
- Message timestamps.
- Loading states.
- Error states.

## 9.2 Conversation sidebar

Include:

- New chat.
- Recent conversations.
- Conversation search.
- Rename.
- Archive.
- Delete.
- Active conversation indicator.

Group conversations by:

- Today.
- Yesterday.
- Previous 7 days.
- Older.

## 9.3 Message actions

Assistant messages should support:

- Copy.
- Regenerate.
- Retry.
- Helpful feedback.
- View sources.

User messages should support:

- Edit.
- Copy.
- Delete, subject to conversation integrity rules.

Editing a historical user message must invalidate or supersede subsequent assistant responses in the affected branch.

Do not silently rewrite historical conversation records.

## 9.4 Responsive behavior

Desktop:

- Conversation sidebar.
- Main chat panel.
- Optional document context panel.

Mobile:

- Single-column layout.
- Collapsible conversation history.
- Full-width message composer.
- Touch-friendly actions.
- Proper keyboard-aware composer.
- No horizontal overflow.
- Persistent access to the active document.

---

# 10. CHAT API ARCHITECTURE

Implement REST endpoints under `/api/v1`.

## Conversations

```text
POST   /conversations
GET    /conversations
GET    /conversations/:id
PATCH  /conversations/:id
DELETE /conversations/:id
POST   /conversations/:id/archive
GET    /conversations/:id/messages
```

## Messages

```text
POST   /conversations/:id/messages
PATCH  /messages/:id
DELETE /messages/:id
POST   /messages/:id/regenerate
POST   /messages/:id/feedback
```

## Streaming

```text
POST /conversations/:id/stream
POST /conversations/:id/stop
```

The streaming endpoint must return structured streaming events.

The stop endpoint must identify the active generation and validate that the requesting user owns the conversation.

## Context

```text
GET  /conversations/:id/context
POST /conversations/:id/context/summarize
GET  /conversations/:id/sources
```

## Reading progress

```text
GET /documents/:id/progress
PUT /documents/:id/progress
```

## Notes and highlights

```text
GET    /documents/:id/notes
POST   /documents/:id/notes
PATCH  /notes/:id
DELETE /notes/:id

GET    /documents/:id/highlights
POST   /documents/:id/highlights
PATCH  /highlights/:id
DELETE /highlights/:id
```

All endpoints must enforce ownership checks.

---

# 11. FRONTEND STATE MANAGEMENT

Inspect the existing framework before choosing the state implementation.

Use the existing state management solution if it is already working.

Separate:

**Server state**
- Conversations.
- Messages.
- Notes.
- Highlights.
- Documents.
- Reading progress.

**Transient UI state**
- Active tab.
- Open dropdown.
- Composer text.
- Streaming buffer.
- Loading indicators.
- Temporary panel visibility.

Server state must be loaded from the backend.

The frontend may cache previously retrieved data for performance, but cached data must be reconciled with the backend.

## Persistence behavior

When the user:

- Switches tabs: preserve the active conversation.
- Navigates between routes: preserve the conversation.
- Reloads the page: restore the last active conversation.
- Closes and reopens the browser: restore conversations and messages.
- Opens a different document: keep previous document conversations available.
- Switches conversations: load the selected conversation's own history.

Persist the active conversation ID as a UI preference, but never use that ID as a replacement for actual database persistence.

Do not rely on `beforeunload` as the primary persistence mechanism.

Save important changes immediately through API requests.

---

# 12. STREAM INTERRUPTION AND RECOVERY

This is essential for reliable streaming.

If a user navigates away while the AI is generating:

- Do not lose the user message.
- Do not lose the assistant placeholder.
- Preserve generated partial content.
- Mark the response as streaming or interrupted accurately.
- Do not generate duplicate responses automatically.

When the user returns:

1. Reload the conversation.
2. Detect incomplete assistant messages.
3. Display their correct status.
4. Allow retry or continuation where supported.

For initial implementation, mark an abandoned stream as interrupted and provide a regenerate action.

Do not assume that reconnecting a frontend stream can resume the original Gemini generation.

If generation recovery is later implemented, persist generation identifiers and use a controlled background-job architecture.

---

# 13. SECURITY AND DATA INTEGRITY

Implement:

- User-level data isolation.
- Conversation ownership validation.
- Input validation.
- Rate limiting.
- Secure API error handling.
- Server-side Gemini API calls.
- Safe Markdown rendering.
- File and document access authorization.
- SQL parameterized queries.
- Request cancellation.
- Transactional persistence.

Do not trust document IDs or conversation IDs supplied by the frontend without checking ownership.

Do not expose API keys.

Do not render untrusted document HTML directly.

Use safe Markdown rendering and sanitize generated HTML.

---

# 14. PERFORMANCE REQUIREMENTS

- Paginate large conversation lists.
- Load messages in pages.
- Retrieve only relevant conversation history.
- Use token-aware context assembly.
- Batch frontend rendering during streaming.
- Avoid one database write per generated token.
- Use database indexes.
- Avoid loading entire documents into the chat prompt.
- Use semantic retrieval.
- Cache appropriate document metadata.
- Implement request cancellation.
- Limit simultaneous AI generations.
- Avoid duplicate message submissions.

---

# 15. TESTING REQUIREMENTS

## Persistence tests

1. Create a conversation and reload the browser.
2. Switch tabs and return.
3. Navigate to another route and return.
4. Close and reopen the browser.
5. Restart the backend and restore conversations.
6. Create multiple conversations and switch between them.
7. Delete a conversation and verify associated messages are deleted.
8. Verify deleting a conversation does not delete the original document.
9. Verify reading progress survives reload.
10. Verify notes and highlights survive reload.

## Streaming tests

1. Receive incremental response chunks.
2. Render Markdown progressively.
3. Stop generation.
4. Retry a failed request.
5. Navigate away during generation.
6. Return to the conversation.
7. Verify partial output is preserved.
8. Verify completed responses are persisted.
9. Verify network interruption does not corrupt message state.

## Context tests

1. Ask a follow-up question referencing an earlier message.
2. Verify conversation history is included.
3. Ask a question about a selected PDF.
4. Verify relevant chunks are retrieved.
5. Verify page citations are correct.
6. Test a long conversation.
7. Verify historical summarization.
8. Verify different conversations do not share context.
9. Verify users cannot retrieve another user's conversations.

---

# 16. IMPLEMENTATION PHASES

## Phase 1 — Persistence audit and repair

- Inspect existing database.
- Inspect frontend chat state.
- Identify the persistence failure.
- Implement or repair conversation and message storage.
- Implement conversation restoration.

Deliverable: chats survive navigation and reload.

## Phase 2 — Complete workspace persistence

- Reading progress.
- Notes.
- Highlights.
- Document associations.
- Study progress.
- User preferences.

Deliverable: Clarity retains the complete user workspace.

## Phase 3 — Streaming infrastructure

- Gemini streaming.
- Express streaming endpoint.
- Frontend incremental rendering.
- Cancellation.
- Partial response persistence.
- Recovery.

Deliverable: real-time AI responses.

## Phase 4 — Context manager

- Conversation history.
- Context construction.
- Token budgeting.
- Conversation summaries.
- Historical message management.

Deliverable: continuous and coherent conversations.

## Phase 5 — RAG integration

- Query embeddings.
- ChromaDB retrieval.
- Document filtering.
- Source ranking.
- Page citations.
- Grounded responses.

Deliverable: document-aware AI assistant.

## Phase 6 — Advanced chatbot UX

- Message editing.
- Regeneration.
- Copying.
- Search.
- Conversation management.
- Follow-up suggestions.
- Responsive layout.

Deliverable: complete AI study experience.

## Phase 7 — Quality assurance

- Persistence tests.
- Streaming tests.
- Context tests.
- Security tests.
- Performance tests.
- Browser reload and restart tests.

Deliverable: production-ready workspace.

---

# 17. DEFINITION OF DONE

### Application persistence

- [ ] Conversations are stored in SQLite.
- [ ] Messages are stored in SQLite.
- [ ] Conversations restore after page reload.
- [ ] Conversations restore after browser restart.
- [ ] Switching tabs does not erase chat.
- [ ] Switching documents does not erase previous chats.
- [ ] Reading progress is restored.
- [ ] Notes persist.
- [ ] Highlights persist.
- [ ] Document associations persist.

### AI chatbot

- [ ] Gemini responses stream incrementally.
- [ ] User can stop generation.
- [ ] User can retry failed responses.
- [ ] Partial responses are preserved.
- [ ] Conversation history is included.
- [ ] Long conversations support summarization.
- [ ] Context is isolated by conversation.
- [ ] Document RAG works.
- [ ] Citations link to actual PDF pages.
- [ ] Markdown renders correctly.

### Reliability

- [ ] No duplicate message submissions.
- [ ] No data loss on navigation.
- [ ] No data loss on backend restart.
- [ ] Failed requests are recoverable.
- [ ] User data is isolated.
- [ ] No API keys exposed.
- [ ] Mobile experience works correctly.

---

# 18. FINAL IMPLEMENTATION INSTRUCTIONS

Do not redesign or rewrite the entire Clarity application.

First identify why persistence currently fails.

Fix the underlying architecture before introducing additional chatbot features.

Prioritize the following implementation order:

1. SQLite persistence.
2. Conversation restoration.
3. Message persistence.
4. Streaming.
5. Conversation context.
6. RAG and citations.
7. Long-term context management.
8. Advanced chatbot interactions.

Use JavaScript exclusively.

Reuse the existing Gemini API key fallback infrastructure.

Keep all Gemini requests centralized.

Keep SQLite as the source of truth for application data and ChromaDB as the vector retrieval store.

**FINAL SUCCESS CRITERION:**

A user should be able to open a PDF, discuss it with Clarity for several hours, switch between tabs, close the browser, return days later, and continue exactly where they left off.

Their documents, conversations, AI responses, notes, highlights, citations and reading progress must remain available.

Clarity should feel like a persistent personal learning environment, not a temporary chat session.
