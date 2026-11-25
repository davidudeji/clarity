# CLARITY — JAVASCRIPT-ONLY DOCUMENT PROCESSING & AI STUDY ARCHITECTURE

## 1. Critical Technology Constraint

The entire application must use JavaScript.

**Strict requirements:**

- No Python.
- No FastAPI.
- No Python scripts.
- No Python microservices.
- No Python-based document processing.
- No separate Python backend.
- No unnecessary language mixing.

Use JavaScript ES Modules throughout the backend.

Do not convert the backend to TypeScript without explicit approval.

Preserve the existing frontend framework and integrate the Node.js service through REST APIs.

## 2. Technology Stack

| Component             | Technology               |
| --------------------- | ------------------------ |
| Runtime               | Node.js 20+              |
| Language              | JavaScript ES Modules    |
| Backend               | Express.js               |
| PDF parsing           | pdfjs-dist               |
| DOCX parsing          | Mammoth.js               |
| OCR                   | Tesseract.js             |
| PDF rendering         | PDF.js                   |
| Text chunking         | @langchain/textsplitters |
| AI SDK                | @google/genai            |
| Embeddings            | Gemini embedding model   |
| Generation            | Gemini Flash             |
| Vector database       | ChromaDB                 |
| Metadata database     | SQLite                   |
| Database access       | better-sqlite3           |
| Background processing | Node.js Worker Threads   |
| Validation            | Zod                      |

Use supported, compatible package versions and verify model availability before implementation.

## 3. Document Processing Pipeline

### PDF processing

Use PDF.js (`pdfjs-dist`) to:

- Extract text.
- Extract page boundaries.
- Preserve page numbers.
- Extract text items and positional information where available.
- Detect pages with little or no extractable text.
- Identify potential scanned documents.

For scanned PDFs:

- Render individual pages as images.
- Process images using Tesseract.js.
- Preserve page-level OCR results.
- Store OCR confidence metadata where available.

Do not run OCR on every PDF unnecessarily.

### DOCX processing

Use Mammoth.js to:

- Extract document text.
- Preserve headings.
- Preserve paragraphs.
- Extract tables where supported.
- Convert supported structures into HTML or Markdown.

Retain document hierarchy when converting to Markdown.

### Processing output

Each document must generate:

1. Original uploaded file.
2. Structured Markdown.
3. Document metadata.
4. Page-level content records.
5. Text chunks.
6. Processing status.

### Important limitation

PDF.js and Mammoth.js are not complete replacements for Docling's advanced layout analysis.

Implement explicit extraction limitations and test complex tables, figures, columns and scanned pages.

Never silently claim that unsupported content was successfully extracted.

## 4. JavaScript OCR Pipeline

Use Tesseract.js.

Requirements:

- CPU-compatible processing.
- English language support initially.
- Process pages individually.
- Reuse OCR workers where practical.
- Avoid loading entire large documents into memory.
- Release worker resources after processing.
- Preserve page references.
- Record OCR failures.

Use WebAssembly-based processing rather than introducing Python OCR dependencies.

## 5. Background Processing

Use Node.js Worker Threads for CPU-intensive document processing.

Do not execute large PDF parsing or OCR workloads directly inside Express request handlers.

### Processing workflow

```text
Express Upload API
       |
       v
Validate File
       |
       v
Save Original Document
       |
       v
Create Processing Job
       |
       v
Worker Thread
       |
       v
PDF.js / Mammoth
       |
       v
Tesseract.js (if required)
       |
       v
Structured Markdown
       |
       v
Markdown Chunking
       |
       v
Gemini Embeddings
       |
       v
ChromaDB
       |
       v
Mark Document Ready
```

Persist processing jobs in SQLite.

Worker Threads are execution resources, not durable queues. Implement job recovery after application restarts, retry handling, and concurrency limits.

## 6. Chunking

Use:

`@langchain/textsplitters`

Implement:

- MarkdownHeaderTextSplitter.
- RecursiveCharacterTextSplitter.

Initial configuration:

```javascript
export const chunkConfig = {
  chunkSize: 1000,
  chunkOverlap: 150,
};
```

Preserve:

- Document ID.
- Page start.
- Page end.
- Heading.
- Section.
- Chunk index.
- Original text.

Never discard page references during chunking.

## 7. Gemini Integration

Use the official JavaScript SDK:

`@google/genai`

Install:

```bash
npm install @google/genai
```

Configure:

```env
GEMINI_API_KEY=your_api_key
EMBEDDING_MODEL=gemini-embedding-001
GENERATION_MODEL=gemini-2.5-flash
```

Create a dedicated Gemini service.

Responsibilities:

- Generate embeddings.
- Generate document summaries.
- Answer document questions.
- Explain selected passages.
- Generate flashcards.
- Generate quizzes.
- Extract concepts.
- Generate research questions.

Keep API keys exclusively on the server.

Verify model availability, API support and free-tier quotas before implementation.

## 8. ChromaDB

Use the official JavaScript client:

`chromadb`

Install:

```bash
npm install chromadb
```

Configure persistent storage through the ChromaDB server.

Store:

- Chunk ID.
- Document ID.
- Original content.
- Page references.
- Section metadata.
- Embedding model information.

Support:

- Indexing.
- Semantic search.
- Document filtering.
- Vector deletion.
- Index rebuilding.

Never expose ChromaDB directly to the frontend.

## 9. Backend Structure

```text
clarity-backend/
│
├── src/
│   ├── server.js
│   ├── app.js
│   │
│   ├── config/
│   │   ├── env.js
│   │   └── database.js
│   │
│   ├── routes/
│   │   ├── document.routes.js
│   │   ├── processing.routes.js
│   │   ├── chat.routes.js
│   │   ├── study.routes.js
│   │   ├── flashcard.routes.js
│   │   └── quiz.routes.js
│   │
│   ├── controllers/
│   │
│   ├── services/
│   │   ├── document.service.js
│   │   ├── pdf.service.js
│   │   ├── docx.service.js
│   │   ├── ocr.service.js
│   │   ├── markdown.service.js
│   │   ├── chunking.service.js
│   │   ├── embedding.service.js
│   │   ├── vector.service.js
│   │   ├── gemini.service.js
│   │   ├── rag.service.js
│   │   ├── summary.service.js
│   │   ├── flashcard.service.js
│   │   ├── quiz.service.js
│   │   └── citation.service.js
│   │
│   ├── workers/
│   │   ├── document.worker.js
│   │   └── ocr.worker.js
│   │
│   ├── repositories/
│   ├── models/
│   ├── middleware/
│   ├── utils/
│   └── validators/
│
├── data/
│   ├── documents/
│   ├── temp/
│   └── clarity.db
│
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 10. API Architecture

Use Express REST endpoints under:

`/api/v1`

Implement the following:

### Documents

- POST /documents/upload
- GET /documents
- GET /documents/:id
- DELETE /documents/:id
- GET /documents/:id/content
- GET /documents/:id/status
- POST /documents/:id/reprocess

### AI

- POST /ai/chat
- POST /ai/summarize
- POST /ai/explain
- POST /ai/concepts
- POST /ai/flashcards
- POST /ai/quizzes
- POST /ai/research

### Knowledge

- GET /highlights
- POST /highlights
- PATCH /highlights/:id
- DELETE /highlights/:id
- GET /notes
- POST /notes
- PATCH /notes/:id
- DELETE /notes/:id

## 11. RAG and Citation Requirements

The RAG pipeline must:

1. Receive a question.
2. Generate a Gemini query embedding.
3. Search ChromaDB.
4. Filter by document scope.
5. Retrieve relevant chunks.
6. Construct a grounded prompt.
7. Generate an answer.
8. Validate source references.
9. Return the answer with citations.

Every citation must reference an actual stored document and page.

The frontend must allow users to click citations and navigate to the original PDF page.

## 12. Performance and Resource Management

The application should work on modest CPU hardware.

Requirements:

- Limit concurrent OCR workers.
- Process PDFs page by page.
- Limit document-processing concurrency.
- Avoid unnecessary duplicate embeddings.
- Use batching where supported.
- Implement exponential backoff for Gemini quota errors.
- Persist job status.
- Recover interrupted jobs.
- Clean up temporary files.
- Avoid blocking the Node.js event loop.

## 13. Implementation Rules

Before coding:

1. Audit the existing Clarity frontend.
2. Identify existing document functionality.
3. Verify Node.js version.
4. Verify package compatibility.
5. Test PDF.js extraction.
6. Test Mammoth DOCX extraction.
7. Test Tesseract.js OCR.
8. Test Gemini embedding generation.
9. Test ChromaDB persistence.

Implement the processing pipeline independently before integrating all study features.

Do not replace working frontend functionality unnecessarily.

Do not introduce Python dependencies under any circumstances.

**Final requirement:** Clarity must be a JavaScript-only application with a Node.js backend, real document processing, persistent vector search, grounded AI study features and a fully responsive user experience.
