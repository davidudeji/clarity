import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import mammoth from 'mammoth';
import { Worker } from 'node:worker_threads';
import {
  DOCUMENT_CHAT_SYSTEM_PROMPT,
  EXPLANATION_SYSTEM_PROMPT,
  RESEARCH_SYSTEM_PROMPT,
} from './prompt.mjs';

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 3001);
const configuredModel = process.env.GENERATION_MODEL?.trim();
// Accept only real Gemini model name strings (e.g. gemini-2.5-flash, learnlm-2.0-flash-experimental).
// Guard against an env-var injection that sets GENERATION_MODEL to something that
// is not a model name (e.g. an API key) — fall back to the stable default instead.
const isValidModelName = (name) =>
  typeof name === 'string' && /^(gemini|learnlm|text-embedding|aqa)[-a-zA-Z0-9.]+$/.test(name);
const rawModel = configuredModel?.replace(/^models\//, '');
const model = isValidModelName(rawModel) ? rawModel : 'gemini-2.5-flash';
if (configuredModel && !isValidModelName(rawModel)) {
  console.warn(`[config] GENERATION_MODEL value does not look like a valid Gemini model name — using default "gemini-2.5-flash".`);
}
const geminiKeyNames = ['GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3', 'GEMINI_API_KEY_4'];
const geminiKeyCooldownMs = 60_000;
const geminiKeyCooldowns = new Map();
let nextGeminiKeyIndex = 0;
const embeddingModel = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(serverDirectory);
const dataDirectory = path.join(projectDirectory, 'data');
const documentsDirectory = path.join(dataDirectory, 'documents');
const databasePath = path.join(dataDirectory, 'clarity.db');
const workspaceUserId = 'anonymous-workspace-v1';
const appVersion = '0.1.0';

await mkdir(documentsDirectory, { recursive: true });
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    original_path TEXT NOT NULL,
    status TEXT NOT NULL,
    total_pages INTEGER,
    outline TEXT,
    content TEXT,
    markdown TEXT,
    metadata TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS processing_jobs (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    status TEXT NOT NULL,
    attempt INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(document_id) REFERENCES documents(id)
  );
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    page_start INTEGER,
    page_end INTEGER,
    heading TEXT,
    section TEXT,
    embedding_model TEXT,
    FOREIGN KEY(document_id) REFERENCES documents(id)
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT,
    title TEXT NOT NULL DEFAULT 'New conversation',
    conversation_type TEXT NOT NULL DEFAULT 'document',
    summary TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_message_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant')),
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'complete'
      CHECK(status IN ('pending', 'streaming', 'complete', 'failed', 'interrupted', 'cancelled')),
    model TEXT,
    token_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS message_citations (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    page_number INTEGER,
    chunk_id TEXT,
    quoted_text TEXT,
    relevance_score REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  CREATE INDEX IF NOT EXISTS idx_message_citations_message_id ON message_citations(message_id);
  CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT,
    title TEXT NOT NULL,
    quote TEXT NOT NULL DEFAULT '',
    explanation TEXT NOT NULL DEFAULT '',
    question TEXT,
    knowledge_state TEXT NOT NULL DEFAULT 'encountered',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS research_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT,
    question TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    source_quote TEXT NOT NULL DEFAULT '',
    page INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS passage_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    document_id TEXT,
    quote TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    page INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_concepts_user_id ON concepts(user_id);
  CREATE INDEX IF NOT EXISTS idx_concepts_document_id ON concepts(document_id);
  CREATE INDEX IF NOT EXISTS idx_research_notes_user_id ON research_notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_research_notes_document_id ON research_notes(document_id);
  CREATE INDEX IF NOT EXISTS idx_passage_notes_user_id ON passage_notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_passage_notes_document_id ON passage_notes(document_id);
`);
db.prepare(`
  INSERT OR IGNORE INTO users (id, name, created_at, updated_at)
  VALUES (?, 'Local workspace', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`).run(workspaceUserId);
db.prepare(`
  UPDATE messages
  SET status = 'interrupted',
      error_message = COALESCE(error_message, 'Generation was interrupted when the server restarted.'),
      updated_at = ?
  WHERE status IN ('pending', 'streaming')
`).run(new Date().toISOString());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = /\.(pdf|docx)$/i.test(file.originalname);
    callback(allowed ? null : new Error('Only PDF and DOCX files are supported.'), allowed);
  },
});

app.use(express.json({ limit: '64kb' }));

function isTextWithinLimit(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isValidGeminiKey(value) {
  if (typeof value !== 'string' || value.length < 20) return false;
  // Accept any non-empty string of sufficient length.
  // Google AI Studio has issued keys in multiple formats (AIza…, AQ.…, etc.);
  // do not reject based on prefix — let the Gemini API itself validate them.
  return true;
}

function getConfiguredGeminiKeys() {
  const seenKeys = new Set();
  return geminiKeyNames
    .map((name) => ({ name, value: process.env[name]?.trim() }))
    .filter((key) => {
      if (!key.value || !isValidGeminiKey(key.value) || seenKeys.has(key.value)) return false;
      seenKeys.add(key.value);
      return true;
    });
}

function getAvailableGeminiKeys(keys) {
  const startIndex = nextGeminiKeyIndex % keys.length;
  return keys
    .map((_, index) => keys[(startIndex + index) % keys.length])
    .filter((key) => (geminiKeyCooldowns.get(key.name) ?? 0) <= Date.now());
}

function isGeminiQuotaLimit(status, payload) {
  if (status === 429) return true;
  if (status !== 403) return false;
  return /resource_exhausted|quota|rate.?limit/.test(JSON.stringify(payload).toLowerCase());
}

function isInvalidGeminiKey(status, payload) {
  if (status !== 400 && status !== 401 && status !== 403) return false;
  const errorText = JSON.stringify(payload).toLowerCase();
  return /api[_ ]key[_ ]invalid|api key not valid|invalid api key/.test(errorText);
}

function describeGeminiError(status, payload) {
  const providerError = payload?.error ?? {};
  let message = typeof providerError.message === 'string' ? providerError.message : '';
  for (const key of getConfiguredGeminiKeys()) {
    message = message.split(key.value).join('[redacted]');
  }
  const code = typeof providerError.status === 'string' ? ` (${providerError.status})` : '';
  return message
    ? `Gemini returned HTTP ${status}${code}: ${message.slice(0, 500)}`
    : `Gemini returned HTTP ${status}. Check the API key and model access.`;
}

function markGeminiKeyUnavailable(key, keys) {
  geminiKeyCooldowns.set(key.name, Date.now() + geminiKeyCooldownMs);
  nextGeminiKeyIndex = (keys.indexOf(key) + 1) % keys.length;
}

const insertDocument = db.prepare(`
  INSERT INTO documents (
    id, name, type, original_path, status, outline, content, markdown, metadata, created_at, updated_at
  ) VALUES (
    @id, @name, @type, @original_path, @status, @outline, @content, @markdown, @metadata, @created_at, @updated_at
  )
`);

const updateDocument = db.prepare(`
  UPDATE documents
  SET status = @status, total_pages = @total_pages, outline = @outline, content = @content,
      markdown = @markdown, metadata = @metadata, error = @error, updated_at = @updated_at
  WHERE id = @id
`);

const insertJob = db.prepare(`
  INSERT INTO processing_jobs (
    id, document_id, status, attempt, created_at, updated_at
  ) VALUES (
    @id, @document_id, @status, @attempt, @created_at, @updated_at
  )
`);

const updateJob = db.prepare(`
  UPDATE processing_jobs
  SET status = @status, attempt = @attempt, error = @error, updated_at = @updated_at
  WHERE id = @id
`);

const insertChunk = db.prepare(`
  INSERT OR REPLACE INTO chunks (
    id, document_id, chunk_index, text, page_start, page_end, heading, section, embedding_model
  ) VALUES (
    @id, @document_id, @chunk_index, @text, @page_start, @page_end, @heading, @section, @embedding_model
  )
`);

const activeWorkers = new Map();

function processDocument(documentId) {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId);
  const job = db.prepare(
    'SELECT * FROM processing_jobs WHERE document_id = ? ORDER BY created_at DESC LIMIT 1',
  ).get(documentId);
  if (!row || !job || activeWorkers.has(documentId)) return;

  const workerPath = path.join(serverDirectory, 'document.worker.mjs');
  const worker = new Worker(workerPath, {
    workerData: {
      documentId,
      filePath: row.original_path,
      type: row.type,
    },
  });
  activeWorkers.set(documentId, worker);

  updateJob.run({
    id: job.id,
    status: 'processing',
    attempt: job.attempt + 1,
    error: null,
    updated_at: new Date().toISOString(),
  });

  worker.once('message', (message) => {
    const now = new Date().toISOString();
    if (!message.ok) {
      updateDocument.run({
        id: documentId,
        status: 'failed',
        total_pages: null,
        outline: null,
        content: null,
        markdown: null,
        metadata: null,
        error: message.error,
        updated_at: now,
      });
      updateJob.run({ id: job.id, status: 'failed', attempt: job.attempt + 1, error: message.error, updated_at: now });
      return;
    }

    updateDocument.run({
      id: documentId,
      status: 'ready',
      total_pages: message.extracted.totalPages ?? null,
      outline: JSON.stringify(message.extracted.outline),
      content: JSON.stringify(message.extracted.sections),
      markdown: message.extracted.markdown,
      metadata: JSON.stringify(message.extracted.metadata),
      error: null,
      updated_at: now,
    });
    db.prepare('DELETE FROM chunks WHERE document_id = ?').run(documentId);
    message.chunks.forEach((chunk) => insertChunk.run({
      id: chunk.id,
      document_id: documentId,
      chunk_index: chunk.chunkIndex,
      text: chunk.text,
      page_start: chunk.pageStart,
      page_end: chunk.pageEnd,
      heading: chunk.heading,
      section: chunk.section,
      embedding_model: null,
    }));
    updateJob.run({ id: job.id, status: 'completed', attempt: job.attempt + 1, error: null, updated_at: now });
  });

  worker.once('error', (error) => {
    const now = new Date().toISOString();
    updateDocument.run({
      id: documentId,
      status: 'failed',
      total_pages: null,
      outline: null,
      content: null,
      markdown: null,
      metadata: null,
      error: error.message,
      updated_at: now,
    });
    updateJob.run({ id: job.id, status: 'failed', attempt: job.attempt + 1, error: error.message, updated_at: now });
  });

  worker.once('exit', () => activeWorkers.delete(documentId));
}

async function generateWithGemini(systemPrompt, userPrompt) {
  const keys = getConfiguredGeminiKeys();

  if (keys.length === 0) {
    return { error: 'Set GEMINI_API_KEY in .env to enable Gemini features.', status: 503 };
  }

  const orderedKeys = getAvailableGeminiKeys(keys);
  if (orderedKeys.length === 0) {
    return {
      error: 'All configured Gemini API keys are temporarily rate-limited. Try again shortly; keys from the same project may share quota.',
      status: 429,
    };
  }

  for (let attempt = 0; attempt < orderedKeys.length; attempt += 1) {
    const key = orderedKeys[attempt];
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key.value,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
          }),
        },
      );
    } catch {
      return { error: 'Could not connect to Gemini. Check your network and try again.', status: 502 };
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return { error: 'Gemini returned an unreadable response.', status: 502 };
    }

    if (!response.ok) {
      const quotaLimited = isGeminiQuotaLimit(response.status, payload);
      const invalidKey = isInvalidGeminiKey(response.status, payload);
      if (!quotaLimited && !invalidKey) {
        return { error: describeGeminiError(response.status, payload), status: 502 };
      }

      markGeminiKeyUnavailable(key, keys);
      const fallbackKey = orderedKeys[attempt + 1];
      if (fallbackKey) {
        console.warn(`Gemini rejected ${key.name} (${invalidKey ? 'invalid key' : 'quota limit'}); trying ${fallbackKey.name}.`);
        continue;
      }
      if (invalidKey) {
        return {
          error: 'All configured Gemini API keys were rejected. Check each key and its model access.',
          status: 502,
        };
      }
      return {
        error: 'All available Gemini API keys are at quota or rate limits. Check project quotas and try again later.',
        status: 429,
      };
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!text) {
      return { error: 'Gemini did not return any text. Please try again.', status: 502 };
    }

    nextGeminiKeyIndex = (keys.indexOf(key) + 1) % keys.length;
    return { text };
  }

  return {
    error: 'All available Gemini API keys are at quota or rate limits. Check project quotas and try again later.',
    status: 429,
  };
}

async function streamWithGemini(systemPrompt, userPrompt, onText, signal) {
  const keys = getConfiguredGeminiKeys();
  if (keys.length === 0) {
    return { error: 'Set GEMINI_API_KEY in .env to enable Gemini features.', status: 503 };
  }

  const orderedKeys = getAvailableGeminiKeys(keys);
  if (orderedKeys.length === 0) {
    return {
      error: 'All configured Gemini API keys are temporarily rate-limited. Try again shortly; keys from the same project may share quota.',
      status: 429,
    };
  }

  for (let attempt = 0; attempt < orderedKeys.length; attempt += 1) {
    const key = orderedKeys[attempt];
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key.value,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
          }),
          signal,
        },
      );
    } catch (error) {
      return signal.aborted
        ? { error: 'The Gemini request timed out or was cancelled.', status: 504 }
        : { error: 'Could not connect to Gemini. Check your network and try again.', status: 502 };
    }

    if (!response.ok) {
      let payload;
      try {
        payload = await response.json();
      } catch {
        return { error: 'Gemini returned an unreadable response.', status: 502 };
      }

      const quotaLimited = isGeminiQuotaLimit(response.status, payload);
      const invalidKey = isInvalidGeminiKey(response.status, payload);
      if (!quotaLimited && !invalidKey) {
        return { error: describeGeminiError(response.status, payload), status: 502 };
      }

      markGeminiKeyUnavailable(key, keys);
      const fallbackKey = orderedKeys[attempt + 1];
      if (fallbackKey) {
        console.warn(`Gemini rejected ${key.name} (${invalidKey ? 'invalid key' : 'quota limit'}); trying ${fallbackKey.name}.`);
        continue;
      }
      if (invalidKey) {
        return {
          error: 'All configured Gemini API keys were rejected. Check each key and its model access.',
          status: 502,
        };
      }
      return {
        error: 'All available Gemini API keys are at quota or rate limits. Check project quotas and try again later.',
        status: 429,
      };
    }

    if (!response.body) {
      return { error: 'Gemini did not provide a streaming response.', status: 502 };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedText = false;

    function consumeEvent(event) {
      const data = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!data || data === '[DONE]') return null;

      let payload;
      try {
        payload = JSON.parse(data);
      } catch {
        return { error: 'Gemini returned invalid streaming data.', status: 502 };
      }
      if (payload.error) {
        return {
          error: payload.error.message || 'Gemini streaming request failed.',
          status: 502,
        };
      }

      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('');
      if (text) {
        onText(text);
        receivedText = true;
      }
      return null;
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || '';
        for (const event of events) {
          const eventError = consumeEvent(event);
          if (eventError) {
            await reader.cancel();
            return eventError;
          }
        }
        if (done) break;
      }
      if (buffer.trim()) {
        const eventError = consumeEvent(buffer);
        if (eventError) return eventError;
      }
    } catch {
      return signal.aborted
        ? { error: 'The Gemini request timed out or was cancelled.', status: 504 }
        : { error: 'The Gemini response stream was interrupted. Please try again.', status: 502 };
    }

    if (!receivedText) {
      return { error: 'Gemini finished without returning a response.', status: 502 };
    }
    nextGeminiKeyIndex = (keys.indexOf(key) + 1) % keys.length;
    return { text: true };
  }

  return {
    error: 'All available Gemini API keys are at quota or rate limits. Check project quotas and try again later.',
    status: 429,
  };
}

// ============================================================
// CONFIG
// ============================================================
app.get('/api/v1/config', (_req, res) => {
  res.json({ model, version: appVersion });
});

// ============================================================
// CONCEPTS
// ============================================================
app.get('/api/v1/concepts', (req, res) => {
  const documentId = typeof req.query.documentId === 'string' ? req.query.documentId : null;
  const rows = documentId
    ? db.prepare(`SELECT id, document_id AS documentId, title, quote, explanation, question,
                   knowledge_state AS knowledgeState, tags, created_at AS createdAt, updated_at AS updatedAt
                 FROM concepts WHERE user_id = ? AND document_id = ? ORDER BY created_at DESC`).all(workspaceUserId, documentId)
    : db.prepare(`SELECT id, document_id AS documentId, title, quote, explanation, question,
                   knowledge_state AS knowledgeState, tags, created_at AS createdAt, updated_at AS updatedAt
                 FROM concepts WHERE user_id = ? ORDER BY created_at DESC`).all(workspaceUserId);
  res.json({ concepts: rows.map((r) => ({ ...r, tags: JSON.parse(r.tags || '[]') })) });
});

app.post('/api/v1/concepts', (req, res) => {
  const { documentId, title, quote, explanation, question, knowledgeState, tags } = req.body ?? {};
  if (!isTextWithinLimit(title, 500) || typeof quote !== 'string' || typeof explanation !== 'string') {
    return res.status(400).json({ error: 'Provide a concept title, quote, and explanation.' });
  }
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(`INSERT INTO concepts (id, user_id, document_id, title, quote, explanation, question, knowledge_state, tags, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, workspaceUserId,
    typeof documentId === 'string' ? documentId : null,
    title.trim(), (quote ?? '').trim(), (explanation ?? '').trim(),
    typeof question === 'string' && question.trim() ? question.trim() : null,
    typeof knowledgeState === 'string' ? knowledgeState : 'encountered',
    JSON.stringify(Array.isArray(tags) ? tags : []),
    now, now,
  );
  res.status(201).json({ id, documentId: documentId ?? null, title: title.trim(), quote: (quote ?? '').trim(),
    explanation: (explanation ?? '').trim(), question: question?.trim() ?? null,
    knowledgeState: knowledgeState ?? 'encountered', tags: Array.isArray(tags) ? tags : [], createdAt: now, updatedAt: now });
});

app.patch('/api/v1/concepts/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM concepts WHERE id = ? AND user_id = ?').get(req.params.id, workspaceUserId);
  if (!row) return res.status(404).json({ error: 'Concept not found.' });
  const { knowledgeState } = req.body ?? {};
  const validStates = ['encountered', 'explained', 'recalled', 'applied'];
  if (!validStates.includes(knowledgeState)) {
    return res.status(400).json({ error: 'knowledgeState must be one of: encountered, explained, recalled, applied.' });
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE concepts SET knowledge_state = ?, updated_at = ? WHERE id = ?').run(knowledgeState, now, req.params.id);
  res.json({ id: req.params.id, knowledgeState, updatedAt: now });
});

app.delete('/api/v1/concepts/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM concepts WHERE id = ? AND user_id = ?').get(req.params.id, workspaceUserId);
  if (!row) return res.status(404).json({ error: 'Concept not found.' });
  db.prepare('DELETE FROM concepts WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ============================================================
// RESEARCH NOTES
// ============================================================
app.get('/api/v1/research', (req, res) => {
  const documentId = typeof req.query.documentId === 'string' ? req.query.documentId : null;
  const rows = documentId
    ? db.prepare(`SELECT id, document_id AS documentId, question, source, source_quote AS sourceQuote, page, notes,
                   created_at AS createdAt, updated_at AS updatedAt
                 FROM research_notes WHERE user_id = ? AND document_id = ? ORDER BY created_at DESC`).all(workspaceUserId, documentId)
    : db.prepare(`SELECT id, document_id AS documentId, question, source, source_quote AS sourceQuote, page, notes,
                   created_at AS createdAt, updated_at AS updatedAt
                 FROM research_notes WHERE user_id = ? ORDER BY created_at DESC`).all(workspaceUserId);
  res.json({ notes: rows });
});

app.post('/api/v1/research', (req, res) => {
  const { documentId, question, source, sourceQuote, page, notes } = req.body ?? {};
  if (!isTextWithinLimit(question, 2000)) return res.status(400).json({ error: 'Provide a research question.' });
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(`INSERT INTO research_notes (id, user_id, document_id, question, source, source_quote, page, notes, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, workspaceUserId,
    typeof documentId === 'string' ? documentId : null,
    question.trim(), (source ?? 'Gemini AI synthesis').trim(),
    (sourceQuote ?? '').trim(),
    typeof page === 'number' ? page : null,
    (notes ?? '').trim(),
    now, now,
  );
  res.status(201).json({ id, documentId: documentId ?? null, question: question.trim(),
    source: (source ?? 'Gemini AI synthesis').trim(), sourceQuote: (sourceQuote ?? '').trim(),
    page: typeof page === 'number' ? page : null, notes: (notes ?? '').trim(), createdAt: now, updatedAt: now });
});

app.delete('/api/v1/research/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM research_notes WHERE id = ? AND user_id = ?').get(req.params.id, workspaceUserId);
  if (!row) return res.status(404).json({ error: 'Research note not found.' });
  db.prepare('DELETE FROM research_notes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ============================================================
// PASSAGE NOTES
// ============================================================
app.get('/api/v1/notes', (req, res) => {
  const documentId = typeof req.query.documentId === 'string' ? req.query.documentId : null;
  const rows = documentId
    ? db.prepare(`SELECT id, document_id AS documentId, quote, note, page, created_at AS createdAt, updated_at AS updatedAt
                 FROM passage_notes WHERE user_id = ? AND document_id = ? ORDER BY created_at DESC`).all(workspaceUserId, documentId)
    : db.prepare(`SELECT id, document_id AS documentId, quote, note, page, created_at AS createdAt, updated_at AS updatedAt
                 FROM passage_notes WHERE user_id = ? ORDER BY created_at DESC`).all(workspaceUserId);
  res.json({ notes: rows });
});

app.post('/api/v1/notes', (req, res) => {
  const { documentId, quote, note, page } = req.body ?? {};
  if (!isTextWithinLimit(quote, 12000)) return res.status(400).json({ error: 'Provide a passage quote.' });
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(`INSERT INTO passage_notes (id, user_id, document_id, quote, note, page, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, workspaceUserId,
    typeof documentId === 'string' ? documentId : null,
    quote.trim(), (note ?? '').trim(),
    typeof page === 'number' ? page : null,
    now, now,
  );
  res.status(201).json({ id, documentId: documentId ?? null, quote: quote.trim(),
    note: (note ?? '').trim(), page: typeof page === 'number' ? page : null, createdAt: now, updatedAt: now });
});

app.delete('/api/v1/notes/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM passage_notes WHERE id = ? AND user_id = ?').get(req.params.id, workspaceUserId);
  if (!row) return res.status(404).json({ error: 'Passage note not found.' });
  db.prepare('DELETE FROM passage_notes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

app.post('/api/ai/explain', async (req, res) => {
  const { quote, userQuestion = '' } = req.body ?? {};
  if (!isTextWithinLimit(quote, 12000) || typeof userQuestion !== 'string' || userQuestion.length > 2000) {
    return res.status(400).json({ error: 'Provide a passage (up to 12,000 characters) and a question (up to 2,000 characters).' });
  }

  const result = await generateWithGemini(
    EXPLANATION_SYSTEM_PROMPT,
    `Passage:\n"""\n${quote}\n"""\n\nReader's question (if any): ${userQuestion.trim() || 'Explain this passage.'}`,
  );
  return result.error
    ? res.status(result.status).json({ error: result.error })
    : res.json({ text: result.text });
});

app.post('/api/ai/research', async (req, res) => {
  const { question, sourceQuote } = req.body ?? {};
  if (!isTextWithinLimit(question, 2000) || !isTextWithinLimit(sourceQuote, 12000)) {
    return res.status(400).json({ error: 'Provide a question (up to 2,000 characters) and a passage (up to 12,000 characters).' });
  }

  const result = await generateWithGemini(
    RESEARCH_SYSTEM_PROMPT,
    `Passage:\n"""\n${sourceQuote}\n"""\n\nResearch question: ${question}`,
  );
  return result.error
    ? res.status(result.status).json({ error: result.error })
    : res.json({ text: result.text });
});

function buildChatPrompt(body) {
  const { documentName, documentContext, messages } = body ?? {};
  const validMessages = Array.isArray(messages)
    && messages.length > 0
    && messages.length <= 8
    && messages.every((message) =>
      message
      && (message.role === 'user' || message.role === 'assistant')
      && isTextWithinLimit(message.content, message.role === 'user' ? 2000 : 4000));

  if (
    !isTextWithinLimit(documentName, 300)
    || typeof documentContext !== 'string'
    || documentContext.length > 20000
    || !validMessages
    || messages[messages.length - 1].role !== 'user'
  ) {
    return { error: 'Provide a document name, up to 20,000 characters of context, and up to 8 valid chat messages.' };
  }

  const conversation = messages
    .map((message) => `${message.role === 'user' ? 'Reader' : 'Assistant'}: """\n${message.content}\n"""`)
    .join('\n\n');
  return {
    systemPrompt: DOCUMENT_CHAT_SYSTEM_PROMPT,
    userPrompt: `Document name: ${documentName}\n\nDocument text:\n"""\n${documentContext || '[No extractable text is available for this document.]'}\n"""\n\nConversation:\n${conversation}`,
  };
}

const activeGenerations = new Map();
const findOwnedConversation = db.prepare(
  'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
);

app.get('/api/v1/conversations', (req, res) => {
  const documentId = typeof req.query.documentId === 'string' ? req.query.documentId : null;
  const rows = documentId
    ? db.prepare(`
      SELECT id, document_id AS documentId, title, status, created_at AS createdAt,
             updated_at AS updatedAt, last_message_at AS lastMessageAt
      FROM conversations
      WHERE user_id = ? AND document_id = ? AND status = 'active'
      ORDER BY COALESCE(last_message_at, updated_at) DESC
      LIMIT 100
    `).all(workspaceUserId, documentId)
    : db.prepare(`
      SELECT id, document_id AS documentId, title, status, created_at AS createdAt,
             updated_at AS updatedAt, last_message_at AS lastMessageAt
      FROM conversations
      WHERE user_id = ? AND status = 'active'
      ORDER BY COALESCE(last_message_at, updated_at) DESC
      LIMIT 100
    `).all(workspaceUserId);
  res.json({ conversations: rows });
});

app.post('/api/v1/conversations', (req, res) => {
  const documentId = typeof req.body?.documentId === 'string' && req.body.documentId.length <= 200
    ? req.body.documentId
    : null;
  const requestedTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (requestedTitle.length > 120) {
    return res.status(400).json({ error: 'Conversation titles must be 120 characters or fewer.' });
  }
  const now = new Date().toISOString();
  const conversation = {
    id: randomUUID(),
    userId: workspaceUserId,
    documentId,
    title: requestedTitle || 'New conversation',
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(`
    INSERT INTO conversations (id, user_id, document_id, title, created_at, updated_at)
    VALUES (@id, @userId, @documentId, @title, @createdAt, @updatedAt)
  `).run(conversation);
  res.status(201).json({ conversation });
});

app.get('/api/v1/conversations/:id/messages', (req, res) => {
  const conversation = findOwnedConversation.get(req.params.id, workspaceUserId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  const messages = db.prepare(`
    SELECT id, role, content, status, model, error_message AS errorMessage,
           created_at AS createdAt, updated_at AS updatedAt
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC, rowid ASC
  `).all(conversation.id);
  res.json({ messages });
});

app.patch('/api/v1/conversations/:id', (req, res) => {
  const conversation = findOwnedConversation.get(req.params.id, workspaceUserId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  const title = req.body?.title;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
    return res.status(400).json({ error: 'Provide a conversation title of 1 to 120 characters.' });
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title.trim(), now, conversation.id);
  res.json({ id: conversation.id, title: title.trim(), updatedAt: now });
});

app.post('/api/v1/conversations/:id/archive', (req, res) => {
  const conversation = findOwnedConversation.get(req.params.id, workspaceUserId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  db.prepare("UPDATE conversations SET status = 'archived', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), conversation.id);
  res.status(204).end();
});

app.delete('/api/v1/conversations/:id', (req, res) => {
  const conversation = findOwnedConversation.get(req.params.id, workspaceUserId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  const generation = activeGenerations.get(conversation.id);
  if (generation) generation.controller.abort();
  db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?')
    .run(conversation.id, workspaceUserId);
  res.status(204).end();
});

app.post('/api/v1/conversations/:id/stop', (req, res) => {
  const conversation = findOwnedConversation.get(req.params.id, workspaceUserId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  const generation = activeGenerations.get(conversation.id);
  if (!generation) return res.status(409).json({ error: 'There is no active response to stop.' });
  generation.stopRequested = true;
  generation.controller.abort();
  res.status(202).json({ status: 'cancelling' });
});

app.post('/api/v1/conversations/:id/stream', async (req, res) => {
  const conversation = findOwnedConversation.get(req.params.id, workspaceUserId);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  if (activeGenerations.has(conversation.id)) {
    return res.status(409).json({ error: 'A response is already being generated for this conversation.' });
  }

  const { question, documentName, documentContext = '' } = req.body ?? {};
  if (
    !isTextWithinLimit(question, 2000)
    || !isTextWithinLimit(documentName, 300)
    || typeof documentContext !== 'string'
    || documentContext.length > 20000
  ) {
    return res.status(400).json({ error: 'Provide a question, document name, and no more than 20,000 characters of document context.' });
  }

  const now = new Date().toISOString();
  const userMessageId = randomUUID();
  const assistantMessageId = randomUUID();
  const insertMessages = db.transaction(() => {
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, status, created_at, updated_at)
      VALUES (?, ?, 'user', ?, 'complete', ?, ?)
    `).run(userMessageId, conversation.id, question.trim(), now, now);
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, status, model, created_at, updated_at)
      VALUES (?, ?, 'assistant', '', 'streaming', ?, ?, ?)
    `).run(assistantMessageId, conversation.id, model, now, now);
    const firstUserMessage = db.prepare(`
      SELECT COUNT(*) AS count FROM messages
      WHERE conversation_id = ? AND role = 'user'
    `).get(conversation.id).count === 1;
    const title = firstUserMessage && conversation.title === 'New conversation'
      ? question.trim().replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').slice(0, 60)
      : conversation.title;
    db.prepare(`
      UPDATE conversations
      SET title = ?, updated_at = ?, last_message_at = ?
      WHERE id = ?
    `).run(title, now, now, conversation.id);
  });
  insertMessages();

  const history = db.prepare(`
    SELECT role, content FROM messages
    WHERE conversation_id = ? AND status = 'complete' AND role IN ('user', 'assistant')
    ORDER BY created_at DESC, rowid DESC
    LIMIT 8
  `).all(conversation.id).reverse().map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const prompt = buildChatPrompt({ documentName, documentContext, messages: history });
  if (prompt.error) {
    db.prepare(`
      UPDATE messages SET status = 'failed', error_message = ?, updated_at = ?
      WHERE id = ?
    `).run(prompt.error, new Date().toISOString(), assistantMessageId);
    return res.status(400).json({ error: prompt.error });
  }

  const generation = { controller: new AbortController(), stopRequested: false, disconnected: false };
  activeGenerations.set(conversation.id, generation);
  let responseText = '';
  let lastCheckpoint = Date.now();
  let generationFinished = false;
  const persistPartial = (status) => {
    const timestamp = new Date().toISOString();
    db.prepare(`
      UPDATE messages SET content = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(responseText, status, timestamp, assistantMessageId);
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
      .run(timestamp, conversation.id);
  };

  res.on('close', () => {
    if (res.writableEnded || generationFinished) return;
    generation.disconnected = true;
    generation.controller.abort();
    persistPartial('interrupted');
  });
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(`event: start\ndata: ${JSON.stringify({ type: 'start', conversationId: conversation.id, userMessageId, messageId: assistantMessageId })}\n\n`);

  try {
    const result = await streamWithGemini(
      prompt.systemPrompt,
      prompt.userPrompt,
      (content) => {
        responseText += content;
        if (Date.now() - lastCheckpoint >= 1000) {
          persistPartial('streaming');
          lastCheckpoint = Date.now();
        }
        if (!res.writableEnded && !res.destroyed) {
          res.write(`event: delta\ndata: ${JSON.stringify({ type: 'delta', content })}\n\n`);
        }
      },
      generation.controller.signal,
    );
    if (generation.disconnected) return;
    generationFinished = true;
    if (result.error) {
      const status = generation.stopRequested ? 'cancelled' : 'failed';
      db.prepare(`
        UPDATE messages SET content = ?, status = ?, error_message = ?, updated_at = ?
        WHERE id = ?
      `).run(responseText, status, result.error, new Date().toISOString(), assistantMessageId);
      if (!res.writableEnded && !res.destroyed) {
        const eventType = status === 'cancelled' ? 'cancelled' : 'error';
        res.write(`event: ${eventType}\ndata: ${JSON.stringify({ type: eventType, messageId: assistantMessageId, error: result.error })}\n\n`);
      }
    } else {
      const finishedAt = new Date().toISOString();
      db.prepare(`
        UPDATE messages SET content = ?, status = 'complete', error_message = NULL, updated_at = ?
        WHERE id = ?
      `).run(responseText, finishedAt, assistantMessageId);
      db.prepare(`
        UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?
      `).run(finishedAt, finishedAt, conversation.id);
      if (!res.writableEnded && !res.destroyed) {
        res.write(`event: done\ndata: ${JSON.stringify({ type: 'done', messageId: assistantMessageId, status: 'complete' })}\n\n`);
      }
    }
    if (!res.writableEnded && !res.destroyed) res.end();
  } finally {
    generationFinished = true;
    if (activeGenerations.get(conversation.id) === generation) activeGenerations.delete(conversation.id);
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const prompt = buildChatPrompt(req.body);
  if (prompt.error) return res.status(400).json({ error: prompt.error });

  const result = await generateWithGemini(prompt.systemPrompt, prompt.userPrompt);
  return result.error
    ? res.status(result.status).json({ error: result.error })
    : res.json({ text: result.text });
});

app.post('/api/ai/chat/stream', async (req, res) => {
  const prompt = buildChatPrompt(req.body);
  if (prompt.error) return res.status(400).json({ error: prompt.error });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  const heartbeat = setInterval(() => {
    if (!res.writableEnded && !res.destroyed) res.write(': keep-alive\n\n');
  }, 15_000);
  res.on('close', () => {
    clearTimeout(timeout);
    clearInterval(heartbeat);
    if (!res.writableEnded) controller.abort();
  });

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('event: status\ndata: {"status":"thinking"}\n\n');

  try {
    const result = await streamWithGemini(
      prompt.systemPrompt,
      prompt.userPrompt,
      (text) => {
        if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify({ text })}\n\n`);
      },
      controller.signal,
    );
    if (res.writableEnded || res.destroyed) return;
    if (result.error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: result.error })}\n\n`);
    } else {
      res.write('event: done\ndata: {"done":true}\n\n');
    }
    res.end();
  } finally {
    clearTimeout(timeout);
    clearInterval(heartbeat);
  }
});

app.post('/api/v1/documents/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Choose a PDF or DOCX file.' });
  }

  const type = /\.pdf$/i.test(req.file.originalname) ? 'pdf' : 'docx';
  const isValidSignature = type === 'pdf'
    ? req.file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))
    : req.file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (!isValidSignature) {
    return res.status(400).json({ error: `The uploaded file content does not match a valid ${type.toUpperCase()} document.` });
  }

  const id = randomUUID();
  const extension = type === 'pdf' ? '.pdf' : '.docx';
  const originalPath = path.join(documentsDirectory, `${id}${extension}`);
  try {
    await writeFile(originalPath, req.file.buffer);
  } catch {
    return res.status(500).json({ error: 'Could not save the uploaded document.' });
  }

  const now = new Date().toISOString();
  insertDocument.run({
    id,
    name: req.file.originalname,
    type,
    original_path: originalPath,
    status: 'processing',
    outline: null,
    content: null,
    markdown: null,
    metadata: null,
    created_at: now,
    updated_at: now,
  });
  const jobId = randomUUID();
  insertJob.run({
    id: jobId,
    document_id: id,
    status: 'queued',
    attempt: 0,
    created_at: now,
    updated_at: now,
  });
  processDocument(id);

  return res.status(202).json({
    id,
    name: req.file.originalname,
    type,
    status: 'processing',
  });
});

app.get('/api/v1/documents', (_req, res) => {
  const rows = db.prepare(`
    SELECT id, name, type, status, total_pages, created_at, updated_at, error
    FROM documents
    ORDER BY created_at DESC
  `).all();
  res.json({ documents: rows });
});

app.get('/api/v1/documents/:id/status', (req, res) => {
  const row = db.prepare(`
    SELECT id, name, type, status, total_pages, metadata, error, updated_at
    FROM documents
    WHERE id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  res.json({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  });
});

app.get('/api/v1/documents/:id/content', (req, res) => {
  const row = db.prepare(`
    SELECT id, name, type, status, total_pages, outline, content, markdown, metadata, error
    FROM documents
    WHERE id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  if (row.status !== 'ready') return res.status(409).json({ error: 'Document is not ready.', status: row.status });
  res.json({
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    totalPages: row.total_pages,
    outline: JSON.parse(row.outline || '[]'),
    content: JSON.parse(row.content || '[]'),
    markdown: row.markdown,
    metadata: JSON.parse(row.metadata || '{}'),
  });
});

app.get('/api/v1/documents/:id/original', (req, res) => {
  const row = db.prepare('SELECT name, type, original_path FROM documents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  if (!existsSync(row.original_path)) return res.status(404).json({ error: 'The original document is no longer available.' });
  res.setHeader('Content-Type', row.type === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.sendFile(row.original_path);
});

app.delete('/api/v1/documents/:id', async (req, res) => {
  const row = db.prepare('SELECT original_path FROM documents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  try {
    await unlink(row.original_path);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      return res.status(500).json({ error: 'Could not remove the original document. Please try again.' });
    }
  }
  const deleteDocument = db.transaction(() => {
    db.prepare('DELETE FROM chunks WHERE document_id = ?').run(req.params.id);
    db.prepare('DELETE FROM processing_jobs WHERE document_id = ?').run(req.params.id);
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  });
  deleteDocument();
  res.status(204).end();
});

// Serve built React frontend (production / Railway)
const distDirectory = path.join(projectDirectory, 'dist');
if (existsSync(distDirectory)) {
  app.use(express.static(distDirectory));
  app.get('*', (_req, res, next) => {
    if (_req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDirectory, 'index.html'));
  });
}

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'The uploaded file exceeds the 50 MB limit.'
      : 'The uploaded file could not be accepted.';
    return res.status(status).json({ error: message });
  }
  if (error?.message === 'Only PDF and DOCX files are supported.') {
    return res.status(400).json({ error: error.message });
  }
  console.error('Unhandled API request error:', error instanceof Error ? error.message : 'Unknown error');
  return res.status(500).json({ error: 'The server could not complete this request.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Clarity Gemini API listening on http://0.0.0.0:${port}`);
});
