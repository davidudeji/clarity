import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import './index.css';
import type { Document, Concept, ResearchNote, PanelTab, KnowledgeState, OutlineItem, Section, Paragraph } from './types';
import { sampleDocument, sampleConcepts, sampleResearch } from './utils/sampleData';
import {
  createChatConversation,
  explainWithGemini,
  getChatMessages,
  listChatConversations,
  researchWithGemini,
  stopChatGeneration,
  streamPersistentChat,
} from './utils/gemini';
import type { ChatConversation, PersistedChatMessage } from './utils/gemini';

interface SavedPassageNote {
  id: string;
  documentId: string;
  quote: string;
  note: string;
  page: number;
  createdAt: Date;
}

interface LibraryDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx';
  status: 'processing' | 'ready' | 'failed';
  total_pages: number | null;
  created_at: string;
  error?: string | null;
}

interface ProcessedDocumentResponse {
  id: string;
  name: string;
  type: 'pdf' | 'docx';
  totalPages?: number | null;
  outline: OutlineItem[];
  content: Section[];
}


// =========================================
// ICONS (inline SVG to avoid extra deps)
// =========================================
const Icon = {
  BookOpen: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Message: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>
    </svg>
  ),
  Lightbulb: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  RotateCcw: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.96"/>
    </svg>
  ),
  Play: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Pause: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  ),
  SkipBack: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
    </svg>
  ),
  SkipForward: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
  ),
  Volume2: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Menu: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Upload: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  Timer: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Brain: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Map: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  ThumbsUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>
  ),
  ThumbsDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
      <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Inbox: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
};

// =========================================
// KNOWLEDGE STATE BADGE
// =========================================
const stateLabels: Record<KnowledgeState, string> = {
  encountered: 'Encountered',
  explained: 'Explained',
  recalled: 'Recalled',
  applied: 'Applied',
};

function KnowledgeBadge({ state }: { state: KnowledgeState }) {
  return (
    <span className={`knowledge-pill knowledge-pill--${state}`}>
      {stateLabels[state]}
    </span>
  );
}

// =========================================
// SESSION TIMER HOOK
// =========================================
function useSessionTimer(isActive: boolean, durationMinutes: number, isPaused: boolean) {
  const [remaining, setRemaining] = useState(durationMinutes * 60);
  useEffect(() => {
    if (!isActive) {
      setRemaining(durationMinutes * 60);
      return;
    }
    if (isPaused) return;

    const interval = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(interval);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, durationMinutes, isPaused]);

  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function useModalEscape(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}

async function readApiJson(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Document service did not respond. Restart the app with npm run dev, then try again.');
  }
  return response.json();
}

async function fetchProcessedDocument(id: string, uploadedAt: string): Promise<Document> {
  const response = await fetch(`/api/v1/documents/${id}/content`);
  const result = await readApiJson(response) as ProcessedDocumentResponse & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Could not load the saved document.');

  return {
    id: result.id,
    name: result.name,
    type: result.type,
    uploadedAt: new Date(uploadedAt),
    progress: 0,
    totalPages: result.totalPages ?? undefined,
    currentPage: 1,
    outline: result.outline,
    content: result.content,
  };
}

// =========================================
// BACKEND API HELPERS (concepts, notes, research)
// =========================================
interface PersistedConcept {
  id: string;
  documentId: string | null;
  title: string;
  quote: string;
  explanation: string;
  question?: string | null;
  knowledgeState: KnowledgeState;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface PersistedResearchNote {
  id: string;
  documentId: string | null;
  question: string;
  source: string;
  sourceQuote: string;
  page?: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface PersistedPassageNote {
  id: string;
  documentId: string | null;
  quote: string;
  note: string;
  page?: number | null;
  createdAt: string;
  updatedAt: string;
}

function conceptFromPersisted(raw: PersistedConcept): Concept {
  return {
    id: raw.id,
    documentId: raw.documentId ?? '',
    title: raw.title,
    quote: raw.quote,
    explanation: raw.explanation,
    question: raw.question ?? undefined,
    knowledgeState: raw.knowledgeState,
    tags: raw.tags,
    createdAt: new Date(raw.createdAt),
  };
}

async function apiSaveConcept(documentId: string, partial: Omit<Concept, 'id' | 'createdAt' | 'documentId'>): Promise<Concept> {
  const response = await fetch('/api/v1/concepts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, ...partial, tags: partial.tags ?? [] }),
  });
  const result = await readApiJson(response) as PersistedConcept & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Could not save concept.');
  return conceptFromPersisted(result);
}

async function apiUpdateConceptState(id: string, knowledgeState: KnowledgeState): Promise<void> {
  await fetch(`/api/v1/concepts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ knowledgeState }),
  });
}

async function apiListConcepts(documentId: string): Promise<Concept[]> {
  const response = await fetch(`/api/v1/concepts?documentId=${encodeURIComponent(documentId)}`);
  const result = await readApiJson(response) as { concepts: PersistedConcept[] };
  return (result.concepts ?? []).map(conceptFromPersisted);
}

async function apiSaveResearch(documentId: string, question: string, source: string, sourceQuote: string, page: number | undefined, notes: string): Promise<ResearchNote> {
  const response = await fetch('/api/v1/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, question, source, sourceQuote, page: page ?? null, notes }),
  });
  const result = await readApiJson(response) as PersistedResearchNote & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Could not save research note.');
  return {
    id: result.id,
    documentId: result.documentId ?? '',
    question: result.question,
    source: result.source,
    sourceQuote: result.sourceQuote,
    page: result.page ?? undefined,
    notes: result.notes,
    createdAt: new Date(result.createdAt),
  };
}

async function apiListResearch(documentId: string): Promise<ResearchNote[]> {
  const response = await fetch(`/api/v1/research?documentId=${encodeURIComponent(documentId)}`);
  const result = await readApiJson(response) as { notes: PersistedResearchNote[] };
  return (result.notes ?? []).map((r) => ({
    id: r.id, documentId: r.documentId ?? '', question: r.question, source: r.source,
    sourceQuote: r.sourceQuote, page: r.page ?? undefined, notes: r.notes, createdAt: new Date(r.createdAt),
  }));
}

async function apiSavePassageNote(documentId: string, quote: string, note: string, page: number | undefined): Promise<SavedPassageNote> {
  const response = await fetch('/api/v1/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, quote, note, page: page ?? null }),
  });
  const result = await readApiJson(response) as PersistedPassageNote & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Could not save passage note.');
  return { id: result.id, documentId: result.documentId ?? '', quote: result.quote, note: result.note, page: result.page ?? 1, createdAt: new Date(result.createdAt) };
}

async function apiListPassageNotes(documentId: string): Promise<SavedPassageNote[]> {
  const response = await fetch(`/api/v1/notes?documentId=${encodeURIComponent(documentId)}`);
  const result = await readApiJson(response) as { notes: PersistedPassageNote[] };
  return (result.notes ?? []).map((r) => ({
    id: r.id, documentId: r.documentId ?? '', quote: r.quote, note: r.note,
    page: r.page ?? 1, createdAt: new Date(r.createdAt),
  }));
}

async function fetchAppConfig(): Promise<{ model: string }> {
  try {
    const response = await fetch('/api/v1/config');
    if (!response.ok) return { model: 'Google Gemini' };
    const data = await response.json() as { model?: string };
    return { model: data.model || 'Google Gemini' };
  } catch {
    return { model: 'Google Gemini' };
  }
}

function getDocumentChatContext(doc: Document, activeSectionId: string): string {
  const sections = doc.content;
  const foundIndex = sections.findIndex((section) => section.id === activeSectionId);
  const currentIndex = Math.max(0, foundIndex);
  const priority = sections.length > 0 ? [currentIndex] : [];
  for (let distance = 1; priority.length < sections.length; distance += 1) {
    const before = currentIndex - distance;
    const after = currentIndex + distance;
    if (before >= 0) priority.push(before);
    if (after < sections.length) priority.push(after);
    if (before < 0 && after >= sections.length) break;
  }

  const contextSections: { index: number; text: string }[] = [];
  let remaining = 20000;
  for (const index of priority) {
    const section = sections[index];
    const sectionText = `## ${section.title || `Section ${index + 1}`}\n${section.paragraphs.map((paragraph) => paragraph.text).join('\n')}`;
    if (remaining <= 0) break;
    contextSections.push({ index, text: sectionText.slice(0, remaining) });
    remaining -= sectionText.length + 2;
  }

  return contextSections
    .sort((left, right) => left.index - right.index)
    .map((section) => section.text)
    .join('\n\n');
}

// =========================================
// LANDING PAGE
// =========================================
function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav__inner">
          <button className="landing-nav__link" onClick={onEnterApp}>Library</button>
          <button className="landing-nav__link" onClick={onEnterApp}>Reading</button>
          <button className="landing-nav__link" onClick={onEnterApp}>Research</button>
          <button className="landing-nav__link landing-nav__link--brand" onClick={onEnterApp}>
            <img className="brand-logo" src="/clarity-logo.png" alt="Clarity" />
          </button>
          <button className="landing-nav__link" onClick={onEnterApp}>Concepts</button>
          <button className="landing-nav__link" onClick={onEnterApp}>Deep work</button>
          <button className="landing-nav__link" onClick={onEnterApp}>Account</button>
        </div>
      </nav>

      <main className="hero">
        <button className="hero__mark" onClick={onEnterApp} aria-label="Open Clarity">
          <img className="hero-logo" src="/clarity-logo.png" alt="" />
        </button>
        <button className="hero__statement" onClick={onEnterApp}>
          Read deeply.<br />
          Think clearly.
        </button>
      </main>

    </div>
  );
}

// =========================================
// PANEL: OUTLINE
// =========================================
function OutlinePanel({
  doc,
  activeSectionId,
  onNavigate,
}: {
  doc: Document;
  activeSectionId: string;
  onNavigate: (sectionId: string) => void;
}) {
  return (
    <div className="panel-body">
      <div className="outline-progress">
        <div style={{ flex: 1 }}>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${doc.progress}%` }} />
          </div>
        </div>
        <span className="outline-progress__label">progress</span>
        <span className="outline-progress__pct">{doc.progress}%</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {doc.outline.filter((item) => doc.content.some((section) => section.id === item.sectionId)).map((item) => (
          <button
            key={item.id}
            className={`outline-item outline-item--h${item.level} ${item.sectionId === activeSectionId ? 'active' : ''}`}
            onClick={() => onNavigate(item.sectionId)}
            aria-current={item.sectionId === activeSectionId ? 'location' : undefined}
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}

// =========================================
// PANEL: CONCEPTS
// =========================================
function ConceptsPanel({ concepts, onUpdateState }: { concepts: Concept[]; onUpdateState: (id: string, state: KnowledgeState) => void }) {
  if (concepts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">💡</div>
        <p className="empty-state__title">No concepts captured</p>
        <p className="empty-state__desc">Select a passage in the reader to capture a concept, question, or research note.</p>
      </div>
    );
  }

  return (
    <div className="panel-body">
      {concepts.map((concept) => (
        <div key={concept.id} className="concept-card">
          <blockquote className="concept-card__quote">"{concept.quote}"</blockquote>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
            <h4 className="concept-card__title">{concept.title}</h4>
            <KnowledgeBadge state={concept.knowledgeState} />
          </div>
          <p className="concept-card__body">{concept.explanation}</p>
          {concept.question && (
            <div style={{
              marginTop: '8px',
              padding: '8px 10px',
              background: 'var(--warning-dim)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: 'var(--warning)',
              display: 'flex',
              gap: '6px',
            }}>
              <span>?</span>
              <span>{concept.question}</span>
            </div>
          )}
          <div className="concept-card__meta">
            {concept.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
          <div className="concept-card__actions">
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>advance state:</span>
            {(['encountered', 'explained', 'recalled', 'applied'] as KnowledgeState[]).map(s => (
              <button
                key={s}
                className={`state-btn ${concept.knowledgeState === s ? 'active' : ''}`}
                onClick={() => onUpdateState(concept.id, s)}
                title={stateLabels[s]}
              >
                {stateLabels[s].slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =========================================
// PANEL: RESEARCH
// =========================================
function ResearchPanel({ notes, onAddFinding }: { notes: ResearchNote[]; onAddFinding: () => void }) {
  const [activeNote, setActiveNote] = useState<string | null>(notes[0]?.id ?? null);

  useEffect(() => {
    setActiveNote(notes[0]?.id ?? null);
  }, [notes.length]);

  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">🔍</div>
        <p className="empty-state__title">No research notes</p>
        <p className="empty-state__desc">Capture a concept and start a research thread from the passage context menu.</p>
      </div>
    );
  }

  const current = notes.find(n => n.id === activeNote);

  return (
    <div className="panel-body" style={{ gap: 0, padding: 0 }}>
      {/* Research thread tabs */}
      <div className="research-tabs">
        {notes.map((note) => (
          <button
            key={note.id}
            className={`research-tab ${activeNote === note.id ? 'active' : ''}`}
            onClick={() => setActiveNote(note.id)}
          >
            <div className="research-tab__q">{note.question.slice(0, 40)}{note.question.length > 40 ? '…' : ''}</div>
          </button>
        ))}
      </div>

      {current && (
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="research-item">
            <div className="research-item__header">
              <p className="research-item__question">{current.question}</p>
              <span className="tag tag--accent">Open</span>
            </div>
            {current.sourceQuote && <blockquote className="concept-card__quote">“{current.sourceQuote}”</blockquote>}
            <p className="research-item__source">src: {current.source}</p>
            {current.page && <p className="research-item__source">p. {current.page}</p>}
            <p className="research-item__notes">{current.notes}</p>
          </div>
          <button className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={onAddFinding}>
            <Icon.Plus />
            Research another passage
          </button>
        </div>
      )}
    </div>
  );
}

// =========================================
// MARKDOWN RENDERER (no external deps)
// =========================================
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  function parseInline(raw: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    // Regex matches: fenced code, bold, italic, inline code
    const pattern = /(`{3}[\s\S]*?`{3}|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = pattern.exec(raw)) !== null) {
      if (match.index > last) parts.push(raw.slice(last, match.index));
      const token = match[0];
      if (token.startsWith('**')) {
        parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*')) {
        parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith('`')) {
        parts.push(<code key={key++} className="md-code">{token.replace(/^`+|`+$/g, '')}</code>);
      }
      last = match.index + token.length;
    }
    if (last < raw.length) parts.push(raw.slice(last));
    return parts;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      nodes.push(
        <pre key={i} className="md-pre"><code className={lang ? `language-${lang}` : ''}>{codeLines.join('\n')}</code></pre>
      );
      i += 1;
      continue;
    }

    // Headings
    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
      nodes.push(<Tag key={i} className={`md-h${level}`}>{parseInline(headingMatch[2])}</Tag>);
      i += 1;
      continue;
    }

    // Unordered list items
    if (/^[\s]*[-*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[\s]*[-*]\s/.test(lines[i])) {
        const content = lines[i].replace(/^[\s]*[-*]\s/, '');
        items.push(<li key={i}>{parseInline(content)}</li>);
        i += 1;
      }
      nodes.push(<ul key={`ul-${i}`} className="md-ul">{items}</ul>);
      continue;
    }

    // Ordered list items
    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const content = lines[i].replace(/^\d+\.\s/, '');
        items.push(<li key={i}>{parseInline(content)}</li>);
        i += 1;
      }
      nodes.push(<ol key={`ol-${i}`} className="md-ol">{items}</ol>);
      continue;
    }

    // Blank line — skip
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4}|[-*]|\d+\.|```|>)/.test(lines[i])) {
      paraLines.push(lines[i]);
      i += 1;
    }
    if (paraLines.length > 0) {
      nodes.push(
        <p key={i} className="md-p">
          {paraLines.map((pl, pi) => (
            <span key={pi}>{parseInline(pl)}{pi < paraLines.length - 1 ? <br /> : null}</span>
          ))}
        </p>
      );
    } else {
      i += 1;
    }
  }

  return <>{nodes}</>;
}

function ChatPanel({ doc, activeSectionId }: { doc: Document; activeSectionId: string }) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<PersistedChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef('');
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, sending]);

  function handleMessagesScroll(event: React.UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    shouldAutoScrollRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 72;
  }

  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    setError('');

    // P1-07: Sample document has no backend conversations — skip API calls
    if (doc.id === sampleDocument.id) {
      setLoadingHistory(false);
      return;
    }

    async function restoreConversation() {
      try {
        const available = await listChatConversations(doc.id);
        const preferenceKey = `clarity-active-conversation:${doc.id}`;
        const preferredId = window.localStorage.getItem(preferenceKey);
        let selected = available.find((item) => item.id === preferredId) ?? available[0];
        if (!selected) selected = await createChatConversation(doc.id);
        if (cancelled) return;
        const nextConversations = available.some((item) => item.id === selected.id)
          ? available
          : [selected, ...available];
        setConversations(nextConversations);
        setConversationId(selected.id);
        conversationIdRef.current = selected.id;
        window.localStorage.setItem(preferenceKey, selected.id);
        const restoredMessages = await getChatMessages(selected.id);
        if (!cancelled) setMessages(restoredMessages);
      } catch (restoreError) {
        if (!cancelled) {
          setError(restoreError instanceof Error ? restoreError.message : 'Could not restore chat history.');
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    void restoreConversation();
    return () => {
      cancelled = true;
      requestControllerRef.current?.abort();
    };
  }, [doc.id]);

  async function selectConversation(nextId: string) {
    if (!nextId || nextId === conversationIdRef.current) return;
    requestControllerRef.current?.abort();
    setSending(false);
    setError('');
    shouldAutoScrollRef.current = true;
    setConversationId(nextId);
    conversationIdRef.current = nextId;
    window.localStorage.setItem(`clarity-active-conversation:${doc.id}`, nextId);
    try {
      setMessages(await getChatMessages(nextId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this conversation.');
    }
  }

  async function startNewConversation() {
    requestControllerRef.current?.abort();
    setSending(false);
    setError('');
    shouldAutoScrollRef.current = true;
    try {
      const created = await createChatConversation(doc.id);
      setConversations((previous) => [created, ...previous]);
      setConversationId(created.id);
      conversationIdRef.current = created.id;
      window.localStorage.setItem(`clarity-active-conversation:${doc.id}`, created.id);
      setMessages([]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not start a new conversation.');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userQuestion = question.trim();
    const activeConversationId = conversationIdRef.current;
    if (!userQuestion || sending || !activeConversationId) return;

    shouldAutoScrollRef.current = true;
    const timestamp = new Date().toISOString();
    setMessages((previous) => [
      ...previous,
      {
        id: `temporary-user-${Date.now()}`,
        role: 'user',
        content: userQuestion,
        status: 'complete',
        errorMessage: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: `temporary-assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        status: 'streaming',
        errorMessage: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    setQuestion('');
    setError('');
    setSending(true);
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      await streamPersistentChat(
        activeConversationId,
        doc.name,
        getDocumentChatContext(doc, activeSectionId),
        userQuestion,
        (messageId) => {
          if (conversationIdRef.current !== activeConversationId) return;
          setMessages((previous) => previous.map((message) =>
            message.id.startsWith('temporary-assistant-')
              ? { ...message, id: messageId }
              : message,
          ));
        },
        (chunk) => {
          if (conversationIdRef.current !== activeConversationId) return;
          setMessages((previous) => {
            const lastMessage = previous[previous.length - 1];
            if (lastMessage?.role !== 'assistant') return previous;
            return [
              ...previous.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + chunk, status: 'streaming' },
            ];
          });
        },
        controller.signal,
      );
      if (conversationIdRef.current === activeConversationId) {
        setMessages(await getChatMessages(activeConversationId));
        setConversations(await listChatConversations(doc.id));
      }
    } catch (requestError) {
      if (
        conversationIdRef.current === activeConversationId
        && !(requestError instanceof DOMException && requestError.name === 'AbortError')
      ) {
        setError(requestError instanceof Error ? requestError.message : 'Chat request failed.');
        try {
          setMessages(await getChatMessages(activeConversationId));
        } catch (loadError) {
          setError(loadError instanceof Error
            ? `${requestError instanceof Error ? requestError.message : 'Chat request failed.'} ${loadError.message}`
            : 'Chat request failed and saved messages could not be reloaded.');
        }
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setSending(false);
      }
    }
  }

  async function handleStop() {
    const activeConversationId = conversationIdRef.current;
    if (!activeConversationId) return;
    try {
      await stopChatGeneration(activeConversationId);
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Could not stop the response.');
    }
  }

  async function handleRenameConversation(id: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    try {
      const response = await fetch(`/api/v1/conversations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!response.ok) return;
      setConversations((prev) => prev.map((c) => c.id === id ? { ...c, title: trimmed } : c));
    } catch { /* ignore */ }
  }

  async function handleDeleteConversation(id: string) {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/v1/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) return;
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (id === conversationIdRef.current) {
        if (remaining.length > 0) {
          await selectConversation(remaining[0].id);
        } else {
          await startNewConversation();
        }
      }
    } catch { /* ignore */ }
  }

    return (
    <section className="chat-panel" aria-label="Chat about this document">
      {doc.id === sampleDocument.id ? (
        <div className="chat-sample-notice">
          <p><strong>This is a sample document.</strong></p>
          <p>Upload a PDF or DOCX file from the sidebar to start chatting with your own documents. Your conversations are saved and persist across sessions.</p>
        </div>
      ) : (
        <>
      <div className="chat-context-note">
        <div className="chat-context-note__conversation">
          <strong>Conversation</strong>
          <select
            value={conversationId}
            onChange={(event) => void selectConversation(event.target.value)}
            aria-label="Choose a conversation"
            disabled={loadingHistory || sending}
          >
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>{conversation.title}</option>
            ))}
          </select>
          <button
            type="button"
            className="chat-new-button"
            onClick={() => void startNewConversation()}
            disabled={loadingHistory}
            title="Start a new conversation"
          >
            New
          </button>
          {conversationId && (
            <button
              type="button"
              className="chat-new-button"
              disabled={loadingHistory || sending}
              title="Rename this conversation"
              onClick={() => {
                const current = conversations.find((c) => c.id === conversationId);
                const newTitle = window.prompt('Rename conversation:', current?.title ?? '');
                if (newTitle) void handleRenameConversation(conversationId, newTitle);
              }}
            >
              Rename
            </button>
          )}
          {conversationId && conversations.length > 0 && (
            <button
              type="button"
              className="chat-new-button chat-new-button--danger"
              disabled={loadingHistory || sending}
              title="Delete this conversation"
              onClick={() => void handleDeleteConversation(conversationId)}
            >
              Delete
            </button>
          )}
        </div>
        Ask anything about <strong>{doc.name}</strong>. No text selection needed.
        <span>Context uses the current section and nearby document text.</span>
      </div>
      <div className="chat-messages" ref={messagesContainerRef} onScroll={handleMessagesScroll} aria-live="polite">
        {loadingHistory && <p className="chat-thinking" role="status">Restoring conversation…</p>}
        {!loadingHistory && messages.length === 0 && (
          <p className="chat-empty">Ask a question to start a conversation about this document.</p>
        )}
        {messages.map((message) => (
          <article key={message.id} className={`chat-message chat-message--${message.role}`}>
            <span className="chat-message__author">{message.role === 'user' ? 'You' : 'Clarity'}</span>
            <div className="chat-message__body">
              {message.role === 'assistant' ? renderMarkdown(message.content) : <p>{message.content}</p>}
            </div>
            {message.status !== 'complete' && (
              <span className={`chat-message__status chat-message__status--${message.status}`}>
                {message.status === 'streaming' || message.status === 'pending'
                  ? 'Generating…'
                  : message.status === 'failed'
                    ? message.errorMessage || 'Response failed. You can ask again.'
                    : `Response ${message.status}. You can ask again.`}
              </span>
            )}
          </article>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
      {error && <p className="chat-error" role="alert">{error}</p>}
      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (!sending && !loadingHistory && conversationId && question.trim()) {
                (event.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }
          }}
          placeholder="Ask a question about this document… (Enter to send, Shift+Enter for newline)"
          aria-label="Your question"
          maxLength={2000}
          rows={3}
          disabled={sending || loadingHistory || !conversationId}
        />
        <div className="chat-composer__footer">
          <span>Answers are grounded in the extracted document text.</span>
          {sending ? (
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => void handleStop()}>Stop</button>
          ) : (
            <button className="btn btn--primary btn--sm" type="submit" disabled={loadingHistory || !conversationId || !question.trim()}>
              Send
            </button>
          )}
        </div>
      </form>
        </>
      )}
    </section>
  );
}

function NotesPanel({ notes }: { notes: SavedPassageNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon"><Icon.BookOpen /></div>
        <p className="empty-state__title">No saved passages yet</p>
        <p className="empty-state__desc">Select a passage in the reader and save it as a highlight or note.</p>
      </div>
    );
  }

  return (
    <div className="panel-body">
      {notes.map((note) => (
        <article className="saved-note" key={note.id}>
          <blockquote className="concept-card__quote">“{note.quote}”</blockquote>
          {note.note && <p className="saved-note__text">{note.note}</p>}
          <div className="saved-note__meta">
            <span>p. {note.page}</span>
            <time dateTime={note.createdAt.toISOString()}>
              {note.createdAt.toLocaleDateString()}
            </time>
          </div>
        </article>
      ))}
    </div>
  );
}

// =========================================
// PANEL: REVIEW (Flashcard Mode)
// =========================================
type ReviewPhase = 'list' | 'card' | 'done';

function ReviewPanel({ concepts, onUpdateState }: { concepts: Concept[]; onUpdateState: (id: string, state: KnowledgeState) => void }) {
  const dueCount = concepts.filter((c) => c.knowledgeState !== 'applied').length;
  const [phase, setPhase] = useState<ReviewPhase>('list');
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const reviewQueue = concepts.filter(c => c.knowledgeState !== 'applied');

  function startReview() {
    setCardIndex(0);
    setRevealed(false);
    setPhase('card');
  }

  function handleRate(knew: boolean) {
    const concept = reviewQueue[cardIndex];
    if (knew) {
      const next: KnowledgeState =
        concept.knowledgeState === 'encountered' ? 'explained'
        : concept.knowledgeState === 'explained' ? 'recalled'
        : concept.knowledgeState === 'recalled' ? 'applied'
        : 'applied';
      onUpdateState(concept.id, next);
    }
    const next = cardIndex + 1;
    if (next >= reviewQueue.length) {
      setPhase('done');
    } else {
      setCardIndex(next);
      setRevealed(false);
    }
  }

  if (phase === 'done') {
    return (
      <div className="empty-state" style={{ minHeight: '300px' }}>
        <div className="empty-state__icon">🎉</div>
        <p className="empty-state__title">Review complete</p>
        <p className="empty-state__desc">You've gone through all {reviewQueue.length} concepts in this session.</p>
        <button className="btn btn--secondary btn--sm" onClick={() => setPhase('list')}>
          <Icon.RotateCcw /> Back to overview
        </button>
      </div>
    );
  }

  if (phase === 'card') {
    const concept = reviewQueue[cardIndex];
    return (
      <div className="flashcard-pane">
        <div className="flashcard-header">
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {cardIndex + 1} / {reviewQueue.length}
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => setPhase('list')}>
            <Icon.X /> Exit
          </button>
        </div>

        <div className={`flashcard ${revealed ? 'revealed' : ''}`}>
          <div className="flashcard__front">
            <div className="flashcard__label">Recall this concept</div>
            <blockquote className="flashcard__quote">"{concept.quote}"</blockquote>
            <h3 className="flashcard__title">{concept.title}</h3>
            {!revealed && (
              <button className="btn btn--primary" onClick={() => setRevealed(true)}>
                Show my explanation
              </button>
            )}
          </div>

          {revealed && (
            <div className="flashcard__back">
              <div className="flashcard__label">Your explanation</div>
              <p className="flashcard__explanation">{concept.explanation}</p>
              {concept.question && (
                <div className="flashcard__question">
                  <span>? </span>{concept.question}
                </div>
              )}
              <div className="flashcard__actions">
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                  Did you remember this accurately?
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button className="btn btn--ghost btn--rate btn--rate-no" onClick={() => handleRate(false)}>
                    <Icon.ThumbsDown /> No
                  </button>
                  <button className="btn btn--primary btn--rate btn--rate-yes" onClick={() => handleRate(true)}>
                    <Icon.ThumbsUp /> Yes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-body">
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-3)',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
          knowledge state
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(['encountered', 'explained', 'recalled', 'applied'] as KnowledgeState[]).map((state) => {
            const count = concepts.filter((c) => c.knowledgeState === state).length;
            const pct = concepts.length > 0 ? (count / concepts.length) * 100 : 0;
            return (
              <div key={state} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '70px' }}>
                  <KnowledgeBadge state={state} />
                </div>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div
                    className="progress-bar__fill"
                    style={{
                      width: `${pct}%`,
                      background: state === 'applied' ? 'var(--success)'
                        : state === 'recalled' ? 'var(--accent)'
                        : state === 'explained' ? 'var(--warning)'
                        : 'var(--text-muted)',
                    }}
                  />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: '24px', textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {dueCount > 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
            {dueCount}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            concepts ready for review
          </p>
          <button className="btn btn--primary" style={{ width: '100%' }} onClick={startReview}>
            Start review session
          </button>
        </div>
      )}

      {dueCount === 0 && (
        <div className="empty-state" style={{ minHeight: '200px' }}>
          <div className="empty-state__icon">✅</div>
          <p className="empty-state__title">All caught up</p>
          <p className="empty-state__desc">All concepts are at the Applied state. Keep reading to capture new ones.</p>
        </div>
      )}
    </div>
  );
}

// =========================================
// PANEL: LEARNING PATH
// =========================================
type PathNode = {
  id: string;
  title: string;
  type: 'prerequisite' | 'core' | 'optional';
  description: string;
  status: 'locked' | 'available' | 'in-progress' | 'done';
  reason?: string;
  sectionId?: string;
};

const samplePath: PathNode[] = [
  { id: 'lp1', title: 'What is deep work?', type: 'core', description: 'The foundational definition Newport builds the rest of the book on.', status: 'done' },
  { id: 'lp2', title: 'Willpower as a finite resource', type: 'prerequisite', description: 'You need this before the scheduling frameworks make sense.', status: 'in-progress', reason: 'Required for lp3' },
  { id: 'lp3', title: 'Designing a deep work ritual', type: 'core', description: 'The practical implementation: when, where, how long, and what rules.', status: 'available' },
  { id: 'lp4', title: 'The 4DX framework', type: 'core', description: 'Focus → Lead measures → Scoreboard → Accountability cadence.', status: 'locked' },
  { id: 'lp5', title: 'Productive meditation', type: 'optional', description: 'Using transition periods for focused thinking. Complements but not required.', status: 'locked' },
  { id: 'lp6', title: 'Embracing boredom', type: 'core', description: 'Why distraction tolerance must be trained separately from scheduling.', status: 'locked' },
];

function buildDocumentPath(doc: Document, activeSectionId: string): PathNode[] {
  const outline = doc.outline.filter((item) => !/^(pages?|page\s+\d+)$/i.test(item.title.trim()));
  const sections = outline.length > 0
    ? outline.map((item) => ({
      id: item.id,
      title: item.title,
      sectionId: item.sectionId,
    }))
    : doc.content.map((section, index) => ({
      id: section.id,
      title: section.title || `Section ${index + 1}`,
      sectionId: section.id,
    }));

  if (sections.length === 0) {
    return [{
      id: doc.id,
      title: doc.name,
      type: 'core',
      description: 'Read this document to build your learning path.',
      status: 'in-progress',
    }];
  }

  const currentIndex = Math.max(0, doc.content.findIndex((section) => section.id === activeSectionId));
  const currentPathIndex = sections.findIndex((item) => item.sectionId === activeSectionId);
  const startIndex = currentPathIndex > 6
    ? Math.min(currentPathIndex - 6, Math.max(0, sections.length - 12))
    : 0;
  const visibleSections = sections.slice(startIndex, startIndex + 12);
  return visibleSections.map((item) => {
    const sectionId = item.sectionId;
    const section = doc.content.find((entry) => entry.id === item.sectionId);
    const excerpt = section?.paragraphs
      .map((paragraph) => paragraph.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const sectionIndex = doc.content.findIndex((entry) => entry.id === item.sectionId);

    return {
      id: item.id,
      title: item.title,
      type: 'core',
      sectionId,
      description: excerpt
        ? `${excerpt.slice(0, 240)}${excerpt.length > 240 ? '…' : ''}`
        : 'Read this section of the document.',
      status: item.sectionId === activeSectionId
        ? 'in-progress'
        : sectionIndex >= 0 && sectionIndex < currentIndex ? 'done' : 'available',
    };
  });
}

function LearningPathPanel({
  doc,
  activeSectionId,
  onNavigate,
}: {
  doc: Document;
  activeSectionId: string;
  onNavigate: (sectionId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const isSampleDocument = doc.id === sampleDocument.id;
  const path = isSampleDocument ? samplePath : buildDocumentPath(doc, activeSectionId);
  const statusIcon: Record<PathNode['status'], string> = {
    done: '✓',
    'in-progress': '◐',
    available: '○',
    locked: '–',
  };
  const typeLabel: Record<PathNode['type'], string> = {
    prerequisite: 'prereq',
    core: 'core',
    optional: 'optional',
  };

  return (
    <div className="panel-body">
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)' }}>
        {isSampleDocument ? 'suggested sequence · Deep Work' : `reading path · ${doc.name}`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {path.map((node) => (
          <div
            key={node.id}
            className={`path-node path-node--${node.status} ${selected === node.id ? 'path-node--selected' : ''}`}
            onClick={() => setSelected(selected === node.id ? null : node.id)}
          >
            <div className="path-node__row">
              <span className={`path-node__status path-node__status--${node.status}`}>
                {statusIcon[node.status]}
              </span>
              <span className="path-node__title">{node.title}</span>
              <span className={`tag path-node__type path-node__type--${node.type}`}>
                {typeLabel[node.type]}
              </span>
              <span className="path-node__chevron">
                <Icon.ChevronDown />
              </span>
            </div>
            {selected === node.id && (
              <div className="path-node__detail">
                <p>{node.description}</p>
                {node.reason && (
                  <p className="path-node__reason">📎 {node.reason}</p>
                )}
                {node.status === 'locked' && (
                  <p className="path-node__reason"><Icon.Lock /> Complete prerequisite concepts to unlock this.</p>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  {node.status !== 'locked' && node.sectionId && (
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        const sectionId = node.sectionId;
                        if (sectionId) onNavigate(sectionId);
                      }}
                    >
                      Jump to section
                    </button>
                  )}
                  {node.status !== 'locked' && (
                    <button className="btn btn--ghost btn--sm" disabled title="Coming soon">Mark optional</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
        Based on this document's structure. Sequence is suggested, not enforced.
      </div>
    </div>
  );
}

// =========================================
// CAPTURE MODAL
// =========================================
function CaptureModal({
  selectedText,
  onClose,
  onSave,
  onGenerateExplanation,
}: {
  selectedText: string;
  onClose: () => void;
  onSave: (concept: Omit<Concept, 'id' | 'createdAt' | 'documentId'>) => void;
  onGenerateExplanation: (quote: string, question: string) => Promise<string>;
}) {
  useModalEscape(onClose);
  const [title, setTitle] = useState('');
  const [explanation, setExplanation] = useState('');
  const [question, setQuestion] = useState('');
  const [knowledgeState, setKnowledgeState] = useState<KnowledgeState>('encountered');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerateExplanation() {
    setIsGenerating(true);
    setError('');
    try {
      setExplanation(await onGenerateExplanation(selectedText, question));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Gemini could not generate an explanation.');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ title, explanation, question: question || undefined, knowledgeState, quote: selectedText, tags: [] });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="capture-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="capture-title">Capture concept</h2>
          <button className="modal__close" onClick={onClose}><Icon.X /></button>
        </div>
        <blockquote style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg-elevated)',
          borderLeft: '2px solid var(--accent)',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          marginBottom: 'var(--space-5)',
          lineHeight: '1.6',
        }}>
          "{selectedText}"
        </blockquote>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Concept title</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this concept a name..."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Your explanation</label>
            <textarea
              className="form-input form-textarea"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain this in your own words — why does it matter? How does it connect to what you already know?"
            />
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleGenerateExplanation} disabled={isGenerating}>
              {isGenerating ? 'Asking Gemini…' : 'Generate with Gemini'}
            </button>
            {error && <p role="alert" style={{ color: 'var(--error)', fontSize: '12px' }}>{error}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Open question (optional)</label>
            <input
              className="form-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you still need to investigate?"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Knowledge state</label>
            <select
              className="form-select"
              value={knowledgeState}
              onChange={(e) => setKnowledgeState(e.target.value as KnowledgeState)}
            >
              <option value="encountered">Encountered — I've read it</option>
              <option value="explained">Explained — I can explain it</option>
              <option value="recalled">Recalled — I can recall it later</option>
              <option value="applied">Applied — I've used it in practice</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save concept</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NoteModal({
  quote,
  onClose,
  onSave,
}: {
  quote: string;
  onClose: () => void;
  onSave: (quote: string, note: string) => void;
}) {
  useModalEscape(onClose);
  const [note, setNote] = useState('');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--compact" role="dialog" aria-modal="true" aria-labelledby="note-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="note-title">Save passage</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close note dialog"><Icon.X /></button>
        </div>
        <blockquote className="note-modal__quote">“{quote}”</blockquote>
        <div className="form-group">
          <label className="form-label" htmlFor="passage-note">Your note <span className="form-label__optional">optional</span></label>
          <textarea
            id="passage-note"
            className="form-input form-textarea"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add your own observation..."
          />
        </div>
        <div className="form-actions">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={() => { onSave(quote, note.trim()); onClose(); }}>
            Save to notes
          </button>
        </div>
      </div>
    </div>
  );
}

function ResearchModal({
  sourceQuote,
  onClose,
  onResearch,
  onSave,
}: {
  sourceQuote: string;
  onClose: () => void;
  onResearch: (question: string, sourceQuote: string) => Promise<string>;
  onSave: (question: string, notes: string, sourceQuote: string) => void;
}) {
  useModalEscape(onClose);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState('');

  async function handleResearch() {
    setIsResearching(true);
    setError('');
    try {
      setAnswer(await onResearch(question.trim(), sourceQuote));
    } catch (researchError) {
      setError(researchError instanceof Error ? researchError.message : 'Gemini could not research this question.');
    } finally {
      setIsResearching(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="research-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="research-title">Research with Gemini</h2>
          <button className="modal__close" onClick={onClose}><Icon.X /></button>
        </div>
        <blockquote style={{
          fontSize: '13px',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--bg-elevated)',
          borderLeft: '2px solid var(--accent)',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          marginBottom: 'var(--space-5)',
          lineHeight: '1.6',
        }}>
          "{sourceQuote}"
        </blockquote>
        <div className="form-group">
          <label className="form-label">What do you want to investigate?</label>
          <textarea
            className="form-input form-textarea"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setAnswer('');
            }}
            placeholder="Ask a research question..."
            required
          />
        </div>
        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn btn--secondary btn--sm" onClick={handleResearch} disabled={!question.trim() || isResearching}>
            {isResearching ? 'Researching…' : 'Ask Gemini'}
          </button>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => { onSave(question.trim(), answer, sourceQuote); onClose(); }}
              disabled={!answer}
            >
              Save finding
            </button>
          </div>
        </div>
        {error && <p role="alert" style={{ color: 'var(--error)', fontSize: '12px', marginTop: 'var(--space-3)' }}>{error}</p>}
        {answer && (
          <div className="research-item" style={{ marginTop: 'var(--space-4)' }}>
            <div className="research-item__header">
              <p className="research-item__question">{question}</p>
              <span className="tag tag--accent">Gemini synthesis</span>
            </div>
            <p className="research-item__notes" style={{ whiteSpace: 'pre-wrap' }}>{answer}</p>
            <p className="research-item__source">AI-generated; verify suggested sources independently.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================
// SESSION MODAL
// =========================================
function SessionModal({ onClose, onStart }: { onClose: () => void; onStart: (intention: string, duration: number) => void }) {
  useModalEscape(onClose);
  const [intention, setIntention] = useState('');
  const [duration, setDuration] = useState(25);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="session-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="session-title">Start deep-work session</h2>
          <button className="modal__close" onClick={onClose}><Icon.X /></button>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.65', marginBottom: 'var(--space-5)' }}>
          Set an intention for this session. Stray thoughts and unrelated tasks will be captured to a deferred queue so you can stay focused.
        </p>
        <div className="form-group">
          <label className="form-label">Session intention</label>
          <textarea
            className="form-input form-textarea"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="What are you trying to understand or accomplish in this session?"
            style={{ minHeight: '80px' }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {[15, 25, 45, 60, 90].map(d => (
              <button
                key={d}
                type="button"
                className={`btn btn--sm ${duration === d ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => setDuration(d)}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn--primary"
            onClick={() => { onStart(intention, duration); onClose(); }}
            disabled={!intention.trim()}
          >
            <Icon.Timer />
            Start session
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================
// DEFERRED THOUGHT CAPTURE
// =========================================
function DeferredCaptureModal({ onClose, onSave }: { onClose: () => void; onSave: (thought: string) => void }) {
  useModalEscape(onClose);
  const [thought, setThought] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--compact" role="dialog" aria-modal="true" aria-labelledby="deferred-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title" id="deferred-title">
            <Icon.Inbox /> Defer thought
          </h2>
          <button className="modal__close" onClick={onClose}><Icon.X /></button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', lineHeight: '1.6' }}>
          Capture this so you can return to your session. It'll wait in the queue.
        </p>
        <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
          <input
            ref={inputRef}
            className="form-input"
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            placeholder="What's on your mind?"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && thought.trim()) {
                onSave(thought.trim());
                onClose();
              }
            }}
          />
        </div>
        <div className="form-actions">
          <button className="btn btn--secondary btn--sm" onClick={onClose}>Cancel</button>
          <button
            className="btn btn--primary btn--sm"
            disabled={!thought.trim()}
            onClick={() => { onSave(thought.trim()); onClose(); }}
          >
            Defer & refocus
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================
// SESSION BANNER (live timer)
// =========================================
function SessionBanner({
  intention,
  isActive,
  durationMinutes,
  isPaused,
  deferredCount,
  onEnd,
  onDefer,
  onTogglePause,
}: {
  intention: string;
  isActive: boolean;
  durationMinutes: number;
  isPaused: boolean;
  deferredCount: number;
  onEnd: () => void;
  onDefer: () => void;
  onTogglePause: () => void;
}) {
  const time = useSessionTimer(isActive, durationMinutes, isPaused);

  useEffect(() => {
    if (isActive && !isPaused && time === '00:00') onEnd();
  }, [time, isActive, isPaused, onEnd]);

  return (
    <div className="session-banner">
      <div className="session-timer">{time}</div>
      <div className="session-banner__info">
        <div className="session-banner__title">{intention || 'Deep work session'}</div>
        <div className="session-banner__desc">
          {time === '00:00'
            ? 'Session complete'
            : isPaused
              ? 'Session paused'
              : deferredCount > 0
            ? `${deferredCount} thought${deferredCount > 1 ? 's' : ''} deferred`
            : `${durationMinutes} minute focus session · stray thoughts go to the queue`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button className="btn btn--ghost btn--sm" onClick={onDefer} title="Defer a thought">
          <Icon.Inbox />
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onTogglePause} title={isPaused ? 'Resume session' : 'Pause session'} aria-label={isPaused ? 'Resume session' : 'Pause session'}>
          {isPaused ? <Icon.Play /> : <Icon.Pause />}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onEnd}>
          End
        </button>
      </div>
    </div>
  );
}

// =========================================
// DEFERRED THOUGHTS DRAWER
// =========================================
function DeferredDrawer({ thoughts, onDismiss }: { thoughts: string[]; onDismiss: (i: number) => void }) {
  if (thoughts.length === 0) return null;
  return (
    <div className="deferred-drawer">
      <div className="deferred-drawer__header">
        <span><Icon.Inbox /> Deferred queue ({thoughts.length})</span>
      </div>
      <div className="deferred-drawer__list">
        {thoughts.map((t, i) => (
          <div key={i} className="deferred-item">
            <span>{t}</span>
            <button className="icon-btn" onClick={() => onDismiss(i)} title="Dismiss">
              <Icon.Check />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================
// SELECTION TOOLTIP
// =========================================
function SelectionTooltip({
  x, y, onCapture, onResearch, onNote, onCopy,
}: {
  x: number; y: number;
  onCapture: () => void;
  onResearch: () => void;
  onNote: () => void;
  onCopy: () => void;
}) {
  return (
    <div
      className="selection-tooltip"
      style={{ top: y - 56, left: Math.max(4, Math.min(x - 165, window.innerWidth - 334)) }}
      role="toolbar"
      aria-label="Selected passage actions"
    >
      <button className="tooltip-action" onClick={onCapture}>
        <Icon.Lightbulb />
        Explain
      </button>
      <button className="tooltip-action" onClick={onResearch}>
        <Icon.Search />
        Research
      </button>
      <button className="tooltip-action" onClick={onNote}>
        <Icon.Plus />
        Note
      </button>
      <button className="tooltip-action" onClick={onCopy}>
        Copy
      </button>
    </div>
  );
}

function renderHighlightedText(text: string, quotes: string[]): React.ReactNode {
  const ranges = quotes
    .map((quote) => {
      const start = text.indexOf(quote);
      return start < 0 ? null : { start, end: start + quote.length };
    })
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((left, right) => left.start - right.start || right.end - left.end)
    .filter((range, index, all) =>
      all.slice(0, index).every((previous) => range.start >= previous.end || range.end <= previous.start),
    );

  if (ranges.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(<mark className="reader-saved-highlight" key={`highlight-${index}`}>{text.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

interface ReadingPreferences {
  fontFamily: 'serif' | 'sans';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  lineHeight: 'compact' | 'comfortable' | 'relaxed';
  contentWidth: 'narrow' | 'standard' | 'wide';
  theme: 'light' | 'dark' | 'sepia';
}

const defaultReadingPreferences: ReadingPreferences = {
  fontFamily: 'serif',
  fontSize: 'medium',
  lineHeight: 'comfortable',
  contentWidth: 'standard',
  theme: 'dark',
};

function paraPageNumber(section: Section): number | undefined {
  return section.paragraphs.find((paragraph) => paragraph.page)?.page;
}

function loadReadingPreferences(): ReadingPreferences {
  try {
    const stored = window.localStorage.getItem('clarity-reading-preferences');
    return stored ? { ...defaultReadingPreferences, ...JSON.parse(stored) } : defaultReadingPreferences;
  } catch {
    return defaultReadingPreferences;
  }
}

// =========================================
// READER PANE
// =========================================
function ReaderPane({
  doc,
  onCapture,
  onResearch,
  onNote,
  focusMode,
  onToggleFocus,
  currentSectionId,
  onNavigateSection,
  onActiveSectionChange,
  savedQuotes,
}: {
  doc: Document;
  onCapture: (text: string) => void;
  onResearch: (text: string) => void;
  onNote: (text: string) => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  currentSectionId: string;
  onNavigateSection: (sectionId: string) => void;
  onActiveSectionChange: (sectionId: string) => void;
  savedQuotes: string[];
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [preferences, setPreferences] = useState<ReadingPreferences>(loadReadingPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const readerRef = useRef<HTMLDivElement>(null);

  const currentSectionIndex = doc.content.findIndex((section) => section.id === currentSectionId);

  useEffect(() => {
    window.localStorage.setItem('clarity-reading-preferences', JSON.stringify(preferences));
  }, [preferences]);

  function updatePreference<K extends keyof ReadingPreferences>(key: K, value: ReadingPreferences[K]) {
    setPreferences((previous) => ({ ...previous, [key]: value }));
  }

  function renderDocumentBlock(para: Paragraph, quotes: string[]) {
    if (para.kind === 'blockquote') {
      return <blockquote className="reader-blockquote">{renderHighlightedText(para.text, quotes)}</blockquote>;
    }
    if (para.kind === 'bulleted-list' || para.kind === 'numbered-list') {
      const ListTag = para.kind === 'numbered-list' ? 'ol' : 'ul';
      return (
        <ListTag className="reader-list">
          {(para.items ?? [para.text]).map((item, index) => (
            <li key={`${para.id}-${index}`}>{renderHighlightedText(item, quotes)}</li>
          ))}
        </ListTag>
      );
    }
    if (para.kind === 'table') {
      return (
        <div className="reader-table-wrap" role="region" aria-label="Document table" tabIndex={0}>
          <table className="reader-table">
            {para.headers && (
              <thead>
                <tr>{para.headers.map((header, index) => <th key={index}>{header}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {(para.rows ?? []).map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (para.kind === 'code') {
      return <pre className="reader-code"><code>{para.text}</code></pre>;
    }
    return (
      <p className={para.isHighlight ? 'highlight' : ''}>
        {renderHighlightedText(para.text, quotes)}
      </p>
    );
  }

  function navigateSection(index: number) {
    const section = doc.content[index];
    if (!section) return;
    onNavigateSection(section.id);
    document.getElementById(`reader-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateActiveSection() {
    if (!readerRef.current) return;
    const sections = Array.from(readerRef.current.querySelectorAll<HTMLElement>('.reader-section'));
    const marker = readerRef.current.getBoundingClientRect().top + 80;
    const active = sections.find((section) => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= marker && bounds.bottom > marker;
    }) ?? sections.find((section) => section.getBoundingClientRect().top > marker) ?? sections[sections.length - 1];
    const sectionId = active?.id.replace(/^reader-/, '');
    if (sectionId && sectionId !== currentSectionId) onActiveSectionChange(sectionId);
  }

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setTooltip(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    setTooltip({
      x: Math.max(175, Math.min(x, window.innerWidth - 175)),
      y: Math.max(64, rect.top),
      text: selection.toString().trim(),
    });
  }, []);

  async function copySelection() {
    if (!tooltip) return;
    try {
      await navigator.clipboard.writeText(tooltip.text);
      setCopyStatus('Passage copied');
      setTooltip(null);
      window.getSelection()?.removeAllRanges();
    } catch {
      setCopyStatus('Clipboard access is unavailable in this browser');
    }
  }

  return (
    <div className={`reader-pane reader-theme--${preferences.theme}`}>
      {/* Toolbar */}
      <div className="reader-toolbar">
        <div className="reader-toolbar__group">
          <button
            className={`reader-mode-btn ${focusMode ? 'active' : ''}`}
            onClick={onToggleFocus}
            aria-pressed={focusMode}
            title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
          >
            <Icon.BookOpen />
            {focusMode ? 'Exit focus' : 'Focus mode'}
          </button>
        </div>
        <div className="reader-toolbar__sep" />
        <div className="reader-section-nav" aria-label="Document section navigation">
          <button
            className="icon-btn"
            onClick={() => navigateSection(currentSectionIndex - 1)}
            disabled={currentSectionIndex <= 0}
            aria-label="Previous section"
          >
            <Icon.ArrowLeft />
          </button>
          <select
            className="reader-section-select"
            value={currentSectionId}
            onChange={(event) => navigateSection(doc.content.findIndex((section) => section.id === event.target.value))}
            aria-label="Current document section"
          >
            {doc.content.map((section, index) => (
              <option key={section.id} value={section.id}>
                {index + 1} of {doc.content.length} · {section.title || 'Untitled section'}
              </option>
            ))}
          </select>
          <button
            className="icon-btn"
            onClick={() => navigateSection(currentSectionIndex + 1)}
            disabled={currentSectionIndex >= doc.content.length - 1}
            aria-label="Next section"
          >
            <Icon.ChevronRight />
          </button>
        </div>
        <div className="reader-toolbar__sep" />
        <div className="reader-zoom" aria-label="Reading text size">
          <button
            className={`icon-btn ${settingsOpen ? 'active' : ''}`}
            onClick={() => setSettingsOpen((value) => !value)}
            aria-expanded={settingsOpen}
            aria-label="Reading preferences"
          >
            Aa
          </button>
        </div>
        <a
          className="reader-original-link"
          href={`/api/v1/documents/${doc.id}/original`}
          target="_blank"
          rel="noreferrer"
          title="Open original document"
        >
          <Icon.ExternalLink />
          Original
        </a>
        <div className="reader-toolbar__hint">
          Select text to explain, research, or save
        </div>
        {settingsOpen && (
          <div className="reading-settings" role="dialog" aria-label="Reading preferences">
            <div className="reading-settings__title">
              <strong>Reading settings</strong>
              <button className="icon-btn" onClick={() => setSettingsOpen(false)} aria-label="Close reading settings">
                <Icon.X />
              </button>
            </div>
            <label>
              <span>Typeface</span>
              <select value={preferences.fontFamily} onChange={(event) => updatePreference('fontFamily', event.target.value as ReadingPreferences['fontFamily'])}>
                <option value="serif">Serif</option>
                <option value="sans">Sans-serif</option>
              </select>
            </label>
            <label>
              <span>Text size</span>
              <select value={preferences.fontSize} onChange={(event) => updatePreference('fontSize', event.target.value as ReadingPreferences['fontSize'])}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra large</option>
              </select>
            </label>
            <label>
              <span>Line spacing</span>
              <select value={preferences.lineHeight} onChange={(event) => updatePreference('lineHeight', event.target.value as ReadingPreferences['lineHeight'])}>
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </label>
            <label>
              <span>Content width</span>
              <select value={preferences.contentWidth} onChange={(event) => updatePreference('contentWidth', event.target.value as ReadingPreferences['contentWidth'])}>
                <option value="narrow">Narrow</option>
                <option value="standard">Standard</option>
                <option value="wide">Wide</option>
              </select>
            </label>
            <label>
              <span>Theme</span>
              <select value={preferences.theme} onChange={(event) => updatePreference('theme', event.target.value as ReadingPreferences['theme'])}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="sepia">Sepia</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Body */}
      <div
        className="reader-body"
        ref={readerRef}
        onMouseUp={handleMouseUp}
        onScroll={updateActiveSection}
        onClick={() => !window.getSelection()?.toString() && setTooltip(null)}
      >
        <div
          className={[
            'reader-content',
            `reader-font--${preferences.fontFamily}`,
            `reader-size--${preferences.fontSize}`,
            `reader-leading--${preferences.lineHeight}`,
            `reader-width--${preferences.contentWidth}`,
          ].join(' ')}
        >
          {doc.content.map((section) => (
            <section id={`reader-${section.id}`} key={section.id} className="reader-section">
              {section.title && (
                <div className="reader-section-heading">
                  {section.level === 1 ? <h1>{section.title}</h1> : section.level === 3 ? <h3>{section.title}</h3> : <h2>{section.title}</h2>}
                  {(section.page ?? paraPageNumber(section)) && (
                    <span className="reader-page-ref">Page {section.page ?? paraPageNumber(section)}</span>
                  )}
                </div>
              )}
              {section.paragraphs.map((para) => (
                <div key={para.id} className="reader-block">
                  {renderDocumentBlock(para, savedQuotes)}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>

      {/* Narration bar */}
      <NarrationBar text={doc.content.flatMap((section) => section.paragraphs.map((paragraph) => paragraph.text)).join(' ')} />

      {/* Selection tooltip */}
      {tooltip && (
        <SelectionTooltip
          x={tooltip.x}
          y={tooltip.y}
          onCapture={() => {
            onCapture(tooltip.text);
            setTooltip(null);
            window.getSelection()?.removeAllRanges();
          }}
          onResearch={() => {
            onResearch(tooltip.text);
            setTooltip(null);
            window.getSelection()?.removeAllRanges();
          }}
          onNote={() => {
            onNote(tooltip.text);
            setTooltip(null);
            window.getSelection()?.removeAllRanges();
          }}
          onCopy={copySelection}
        />
      )}
      {copyStatus && (
        <div className="reader-copy-status" role="status" onAnimationEnd={() => setCopyStatus('')}>
          {copyStatus}
        </div>
      )}
    </div>
  );
}

// =========================================
// NARRATION BAR
// =========================================
function NarrationBar({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [error, setError] = useState('');
  const playingRef = useRef(false);
  const speedRef = useRef(speed);
  const sentences = useMemo(
    () => text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [text],
    [text],
  );
  const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => () => {
    playingRef.current = false;
    window.speechSynthesis?.cancel();
  }, []);

  function speakSentence(index: number) {
    if (index >= sentences.length) {
      playingRef.current = false;
      setPlaying(false);
      setPaused(false);
      setSentenceIndex(0);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.rate = speedRef.current;
    utterance.onend = () => {
      if (!playingRef.current) return;
      const nextIndex = index + 1;
      if (nextIndex < sentences.length) {
        setSentenceIndex(nextIndex);
        speakSentence(nextIndex);
      } else {
        playingRef.current = false;
        setPlaying(false);
        setPaused(false);
        setSentenceIndex(0);
      }
    };
    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      playingRef.current = false;
      setPlaying(false);
      setPaused(false);
      setError('Browser narration could not play this document.');
    };
    window.speechSynthesis.speak(utterance);
  }

  function togglePlayback() {
    setError('');
    if (!('speechSynthesis' in window)) {
      setError('Browser narration is not available in this browser.');
      return;
    }

    if (playing) {
      playingRef.current = false;
      window.speechSynthesis.pause();
      setPlaying(false);
      setPaused(true);
      return;
    }

    playingRef.current = true;
    setPlaying(true);
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      return;
    }

    const startIndex = sentenceIndex >= sentences.length ? 0 : sentenceIndex;
    setSentenceIndex(startIndex);
    speakSentence(startIndex);
  }

  function skipTo(index: number) {
    const nextIndex = Math.max(0, Math.min(sentences.length - 1, index));
    const shouldResume = playing || paused;
    playingRef.current = false;
    window.speechSynthesis?.cancel();
    setSentenceIndex(nextIndex);
    setPaused(false);
    if (shouldResume && 'speechSynthesis' in window) {
      playingRef.current = true;
      setPlaying(true);
      speakSentence(nextIndex);
    } else {
      setPlaying(false);
    }
  }

  function cycleSpeed() {
    const idx = speeds.indexOf(speed);
    setSpeed(speeds[(idx + 1) % speeds.length]);
  }

  const progress = sentences.length > 0 ? ((sentenceIndex + (playing ? 0.35 : 0)) / sentences.length) * 100 : 0;

  return (
    <div className="narration-bar">
      <div className="narration-bar__controls">
        <button className="narration-btn" onClick={() => skipTo(sentenceIndex - 1)} aria-label="Previous sentence"><Icon.SkipBack /></button>
        <button
          className="narration-btn narration-btn--play"
          onClick={togglePlayback}
          aria-label={playing ? 'Pause narration' : paused ? 'Resume narration' : 'Play narration'}
        >
          {playing ? <Icon.Pause /> : <Icon.Play />}
        </button>
        <button className="narration-btn" onClick={() => skipTo(sentenceIndex + 1)} aria-label="Next sentence"><Icon.SkipForward /></button>
      </div>

      <div className="narration-bar__progress">
        <div className="narration-bar__sentence" aria-live="polite">
          {error || sentences[sentenceIndex] || 'Select play to listen'}
        </div>
        <div className="narration-bar__time">
          <span className="time-text">{Math.min(sentenceIndex + 1, sentences.length)} / {sentences.length}</span>
          <div className="progress-bar" style={{ flex: 1 }} role="progressbar" aria-label="Narration progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
            <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <button className="narration-bar__speed" onClick={cycleSpeed}>
        {speed}×
      </button>
    </div>
  );
}

// =========================================
// FULL APP SHELL
// =========================================
type ExtendedPanelTab = PanelTab | 'path' | 'notes' | 'chat';

function AppShell({ onBack }: { onBack: () => void }) {
  const [activeDoc, setActiveDoc] = useState<Document>(sampleDocument);
  const [activeSectionId, setActiveSectionId] = useState(sampleDocument.content[0]?.id ?? '');
  const [libraryDocuments, setLibraryDocuments] = useState<LibraryDocument[]>([]);
  const [documentCache, setDocumentCache] = useState<Record<string, Document>>({
    [sampleDocument.id]: sampleDocument,
  });
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(null);
  // P0-03: track restored doc ID from sessionStorage to auto-open on library load
  const pendingRestoreDocIdRef = useRef<string | null>(sessionStorage.getItem('clarity-active-doc-id'));
  const [concepts, setConcepts] = useState<Concept[]>(sampleConcepts);
  const [research, setResearch] = useState<ResearchNote[]>(sampleResearch);
  const [savedNotes, setSavedNotes] = useState<SavedPassageNote[]>(() =>
    sampleDocument.content.flatMap((section) =>
      section.paragraphs
        .filter((paragraph) => paragraph.isHighlight)
        .map((paragraph) => ({
          id: paragraph.id,
          documentId: sampleDocument.id,
          quote: paragraph.text,
          note: '',
          page: sampleDocument.currentPage ?? 1,
          createdAt: new Date(sampleDocument.uploadedAt),
        })),
    ),
  );
  const activeConcepts = concepts.filter((concept) => concept.documentId === activeDoc.id);
  const activeResearch = research.filter((note) => note.documentId === activeDoc.id);
  const activeSavedNotes = savedNotes.filter((note) => note.documentId === activeDoc.id);
  const [panelTab, setPanelTab] = useState<ExtendedPanelTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia('(min-width: 769px)').matches);
  const [panelOpen, setPanelOpen] = useState(() => window.matchMedia('(min-width: 769px)').matches);
  const [focusMode, setFocusMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [captureText, setCaptureText] = useState<string | null>(null);
  const [researchText, setResearchText] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string | null>(null);
  const [sessionModal, setSessionModal] = useState(false);
  const [session, setSession] = useState<{ intention: string; duration: number; paused: boolean } | null>(null);
  const [deferModal, setDeferModal] = useState(false);
  const [deferredThoughts, setDeferredThoughts] = useState<string[]>([]);
  const [showDeferred, setShowDeferred] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelName, setModelName] = useState('Google Gemini');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load config (model name) once on mount
  useEffect(() => {
    void fetchAppConfig().then(({ model }) => setModelName(model));
  }, []);

  // Load persisted concepts, research, notes when switching to a real document
  useEffect(() => {
    if (activeDoc.id === sampleDocument.id) return;
    let cancelled = false;
    void Promise.all([
      apiListConcepts(activeDoc.id),
      apiListResearch(activeDoc.id),
      apiListPassageNotes(activeDoc.id),
    ]).then(([loadedConcepts, loadedResearch, loadedNotes]) => {
      if (cancelled) return;
      setConcepts((prev) => {
        const sampleOnes = prev.filter((c) => c.documentId === sampleDocument.id);
        return [...sampleOnes, ...loadedConcepts];
      });
      setResearch((prev) => {
        const sampleOnes = prev.filter((r) => r.documentId === sampleDocument.id);
        return [...sampleOnes, ...loadedResearch];
      });
      setSavedNotes((prev) => {
        const sampleOnes = prev.filter((n) => n.documentId === sampleDocument.id);
        return [...sampleOnes, ...loadedNotes];
      });
    }).catch(() => { /* non-fatal — UI still works, data was just not restored */ });
    return () => { cancelled = true; };
  }, [activeDoc.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      try {
        const response = await fetch('/api/v1/documents');
        const result = await readApiJson(response) as { documents?: LibraryDocument[]; error?: string };
        if (!response.ok) throw new Error(result.error || 'Could not load the document library.');
        if (!Array.isArray(result.documents)) throw new Error('The document library response was invalid.');
        if (!cancelled) {
          setLibraryDocuments(result.documents);
          setLibraryError('');
          // P0-03: auto-open the last active document if it exists and is ready
          const restoreId = pendingRestoreDocIdRef.current;
          if (restoreId && restoreId !== sampleDocument.id) {
            const toRestore = result.documents.find((d) => d.id === restoreId && d.status === 'ready');
            if (toRestore) {
              // Fire-and-forget; errors are non-fatal (UI still shows sample doc)
              void (async () => {
                try {
                  const doc = await fetchProcessedDocument(toRestore.id, toRestore.created_at);
                  setDocumentCache((prev) => ({ ...prev, [doc.id]: doc }));
                  setActiveDoc(doc);
                  setActiveSectionId(doc.content[0]?.id ?? '');
                } catch {
                  // silently swallow — user stays on sample doc
                }
              })();
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLibraryError(error instanceof Error ? error.message : 'Could not load the document library.');
        }
      } finally {
        if (!cancelled) setLibraryLoading(false);
      }
    }

    void loadLibrary();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  useEffect(() => {
    const desktopLayout = window.matchMedia('(min-width: 769px)');
    function handleLayoutChange(event: MediaQueryListEvent) {
      setSidebarOpen(event.matches);
      setPanelOpen(event.matches);
    }

    desktopLayout.addEventListener('change', handleLayoutChange);
    return () => desktopLayout.removeEventListener('change', handleLayoutChange);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleSettingsEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSettingsOpen(false);
    }

    window.addEventListener('keydown', handleSettingsEscape);
    return () => window.removeEventListener('keydown', handleSettingsEscape);
  }, [settingsOpen]);

  function handleCapture(text: string) {
    setCaptureText(text);
  }

  async function handleOpenDocument(item: LibraryDocument) {
    if (item.status !== 'ready') {
      setLibraryError(item.status === 'failed'
        ? item.error || `${item.name} could not be processed.`
        : `${item.name} is still processing.`);
      return;
    }

    setLibraryError('');
    const cachedDocument = documentCache[item.id];
    if (cachedDocument) {
      setActiveDoc(cachedDocument);
      setActiveSectionId(cachedDocument.content[0]?.id ?? '');
      // P1-05: on desktop keep panel open; only close sidebar
      if (window.innerWidth <= 768) setPanelOpen(false);
      setSidebarOpen(false);
      sessionStorage.setItem('clarity-active-doc-id', item.id); // P0-03
      return;
    }

    setLoadingDocumentId(item.id);
    try {
      const document = await fetchProcessedDocument(item.id, item.created_at);
      setDocumentCache((previous) => ({ ...previous, [document.id]: document }));
      setActiveDoc(document);
      setActiveSectionId(document.content[0]?.id ?? '');
      // P1-05: on desktop keep panel open; only close sidebar
      if (window.innerWidth <= 768) setPanelOpen(false);
      setSidebarOpen(false);
      sessionStorage.setItem('clarity-active-doc-id', document.id); // P0-03
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Could not open the saved document.');
    } finally {
      setLoadingDocumentId(null);
    }
  }

  function handleResearch(text: string) {
    setResearchText(text);
  }

  function handleNavigateSection(sectionId: string) {
    setActiveSectionId(sectionId);
    document.getElementById(`reader-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openPanel(tab: ExtendedPanelTab) {
    setPanelTab(tab);
    setPanelOpen(true);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  }

  function handleSavePassage(quote: string, note: string) {
    const page = activeDoc.currentPage ?? 1;
    const optimisticId = `note-${Date.now()}`;
    const newNote: SavedPassageNote = {
      id: optimisticId, documentId: activeDoc.id, quote, note, page, createdAt: new Date(),
    };
    setSavedNotes((previous) => [newNote, ...previous]);
    openPanel('notes');
    // Persist to backend (non-sample docs only)
    if (activeDoc.id !== sampleDocument.id) {
      void apiSavePassageNote(activeDoc.id, quote, note, page).then((persisted) => {
        setSavedNotes((prev) => prev.map((n) => n.id === optimisticId ? persisted : n));
      }).catch(() => { /* optimistic note stays in memory */ });
    }
  }

  function handleSaveConcept(partial: Omit<Concept, 'id' | 'createdAt' | 'documentId'>) {
    const optimisticId = `c-${Date.now()}`;
    const newConcept: Concept = { ...partial, id: optimisticId, documentId: activeDoc.id, createdAt: new Date() };
    setConcepts((prev) => [newConcept, ...prev]);
    openPanel('concepts');
    // Persist to backend (non-sample docs only)
    if (activeDoc.id !== sampleDocument.id) {
      void apiSaveConcept(activeDoc.id, partial).then((persisted) => {
        setConcepts((prev) => prev.map((c) => c.id === optimisticId ? persisted : c));
      }).catch(() => { /* optimistic concept stays in memory */ });
    }
  }

  function handleUpdateConceptState(id: string, state: KnowledgeState) {
    setConcepts(prev => prev.map(c => c.id === id ? { ...c, knowledgeState: state } : c));
    // Persist to backend for non-sample docs
    if (activeDoc.id !== sampleDocument.id) {
      void apiUpdateConceptState(id, state).catch(() => { /* ignore — UI already updated */ });
    }
  }

  function handleSaveResearch(question: string, notes: string, sourceQuote: string) {
    const optimisticId = `r-${Date.now()}`;
    const newNote: ResearchNote = {
      id: optimisticId, documentId: activeDoc.id, question, source: 'Gemini AI synthesis',
      sourceQuote, page: activeDoc.currentPage, notes, createdAt: new Date(),
    };
    setResearch((prev) => [newNote, ...prev]);
    openPanel('research');
    setResearchText(null);
    // Persist to backend (non-sample docs only)
    if (activeDoc.id !== sampleDocument.id) {
      void apiSaveResearch(activeDoc.id, question, 'Gemini AI synthesis', sourceQuote, activeDoc.currentPage, notes).then((persisted) => {
        setResearch((prev) => prev.map((r) => r.id === optimisticId ? persisted : r));
      }).catch(() => { /* optimistic note stays in memory */ });
    }
  }

  function handleDeferThought(thought: string) {
    setDeferredThoughts(prev => [...prev, thought]);
    setShowDeferred(true);
  }

  function dismissDeferred(i: number) {
    setDeferredThoughts(prev => prev.filter((_, idx) => idx !== i));
  }

  const panelTabs: { id: ExtendedPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'outline', label: 'Outline', icon: <Icon.BookOpen /> },
    { id: 'concepts', label: 'Concepts', icon: <Icon.Lightbulb /> },
    { id: 'chat', label: 'Chat', icon: <Icon.Message /> },
    { id: 'research', label: 'Research', icon: <Icon.Search /> },
    { id: 'notes', label: 'Notes', icon: <Icon.Plus /> },
  ];
  const sampleLibraryItem: LibraryDocument = {
    id: sampleDocument.id,
    name: sampleDocument.name,
    type: sampleDocument.type === 'docx' ? 'docx' : 'pdf',
    status: 'ready',
    total_pages: sampleDocument.totalPages ?? null,
    created_at: sampleDocument.uploadedAt.toISOString(),
  };
  const libraryItems = [
    ...(!libraryDocuments.some((item) => item.id === sampleDocument.id) && activeDoc.id === sampleDocument.id
      ? [sampleLibraryItem]
      : []),
    ...libraryDocuments,
  ];
  const filteredLibraryItems = libraryItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className={`app-shell ${focusMode ? 'app-shell--focus' : ''}`}>
      {/* Header */}
      <header className="app-header">
        <button className="icon-btn app-back-button" onClick={onBack} title="Back to landing" aria-label="Back to landing">
          <Icon.ArrowLeft />
        </button>
        <div className="app-header__logo">
          <div className="app-header__logo-icon" aria-hidden="true">
            <img className="app-logo" src="/clarity-logo.png" alt="" />
          </div>
          Clarity
        </div>
        <div className="app-header__breadcrumb">
          <Icon.ChevronRight />
          <span>{activeDoc.name}</span>
        </div>
        <label className="app-header__search">
          <Icon.Search />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search library"
            aria-label="Search library"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="app-header__actions">
          {session && (
            <button
              className="session-chip"
              onClick={() => setShowDeferred(!showDeferred)}
              title="View deferred thoughts"
            >
              <div className="status-dot status-dot--active" />
              Session active
              {deferredThoughts.length > 0 && (
                <span className="session-chip__badge">{deferredThoughts.length}</span>
              )}
            </button>
          )}
          <button
            className={`btn btn--sm ${session ? 'btn--ghost' : 'btn--secondary'}`}
            onClick={() => !session ? setSessionModal(true) : setSession(null)}
          >
            <Icon.Timer />
            {session ? 'End session' : 'Deep work'}
          </button>
          <button
            className={`icon-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle library sidebar"
            aria-label="Toggle library sidebar"
            aria-pressed={sidebarOpen}
          >
            <Icon.Menu />
          </button>
          <button
            className={`icon-btn ${panelOpen ? 'active' : ''}`}
            onClick={() => setPanelOpen(!panelOpen)}
            title="Toggle knowledge panel"
            aria-label="Toggle knowledge panel"
            aria-pressed={panelOpen}
          >
            <Icon.BookOpen />
          </button>
        </div>
      </header>

      {/* Session Banner */}
      {session && (
        <SessionBanner
          intention={session.intention}
          isActive={!!session}
          durationMinutes={session.duration}
          isPaused={session.paused}
          deferredCount={deferredThoughts.length}
          onEnd={() => setSession(null)}
          onDefer={() => setDeferModal(true)}
          onTogglePause={() => setSession((current) => current ? { ...current, paused: !current.paused } : current)}
        />
      )}

      {/* Deferred Drawer */}
      {showDeferred && session && (
        <DeferredDrawer
          thoughts={deferredThoughts}
          onDismiss={dismissDeferred}
        />
      )}

      {/* Body */}
      <div className="app-body">
        {/* Sidebar */}
        <aside
          className={`app-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}
          aria-hidden={!sidebarOpen || focusMode}
        >
          <nav className="sidebar-primary-nav" aria-label="Primary navigation">
            <button className={`sidebar-nav-item ${panelTab === 'outline' || panelTab === 'concepts' ? 'active' : ''}`} onClick={() => openPanel('outline')}>
              <Icon.BookOpen />
              <span>Library</span>
            </button>
            <button className={`sidebar-nav-item ${panelTab === 'notes' ? 'active' : ''}`} onClick={() => openPanel('notes')}>
              <Icon.Check />
              <span>Highlights & notes</span>
              {activeSavedNotes.length > 0 && <span className="sidebar-nav-count">{activeSavedNotes.length}</span>}
            </button>
            <button className={`sidebar-nav-item ${panelTab === 'research' ? 'active' : ''}`} onClick={() => openPanel('research')}>
              <Icon.Search />
              <span>Research</span>
            </button>
            <button className={`sidebar-nav-item ${panelTab === 'chat' ? 'active' : ''}`} onClick={() => openPanel('chat')}>
              <Icon.Message />
              <span>Chat with document</span>
            </button>
            <button className="sidebar-nav-item" onClick={() => setSessionModal(true)}>
              <Icon.Timer />
              <span>Deep work</span>
            </button>
            <button className="sidebar-nav-item" onClick={() => setSettingsOpen(true)}>
              <Icon.Menu />
              <span>Settings</span>
            </button>
          </nav>
          <div className="sidebar-section">
            <p className="sidebar-section__label">Your documents</p>
          </div>
          <div className="sidebar-doc-list">
            {filteredLibraryItems.length > 0 ? (
              filteredLibraryItems.map((item) => {
                const isActive = item.id === activeDoc.id;
                const isOpening = item.id === loadingDocumentId;
                return (
                  <button
                    key={item.id}
                    className={`doc-item ${isActive ? 'active' : ''}`}
                    onClick={() => { void handleOpenDocument(item); }}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.name}
                  >
                    <span className="doc-item__icon">{item.type.toUpperCase()}</span>
                    <span className="doc-item__name">{item.name}</span>
                    <span className="doc-item__progress-text">
                      {isOpening ? 'Opening…' : item.status === 'ready'
                        ? isActive ? `${activeDoc.progress}%` : `${item.total_pages ?? '—'}p`
                        : item.status === 'processing' ? 'Processing…' : 'Error'}
                    </span>
                    {item.status === 'processing' && (
                      <span className="doc-item__spinner" aria-label="Processing" />
                    )}
                    {isActive && item.status === 'ready' && (
                      <div className="doc-item__progress">
                        <div className="doc-item__progress-bar" style={{ width: `${activeDoc.progress}%` }} />
                      </div>
                    )}
                  </button>
                );
              })
            ) : libraryLoading ? (
              <p className="sidebar-search-empty">Loading saved documents…</p>
            ) : (
              <p className="sidebar-search-empty">
                {searchQuery ? `No documents match “${searchQuery}”.` : 'No saved documents yet.'}
              </p>
            )}
            {libraryError && <p className="sidebar-search-empty" role="alert">{libraryError}</p>}
          </div>
          <div className="sidebar-learning">
            <p className="sidebar-section__label">Study</p>
            <button className="sidebar-nav-item" onClick={() => openPanel('path')}>
              <Icon.Map />
              <span>Learning path</span>
            </button>
            <button className="sidebar-nav-item" onClick={() => openPanel('review')}>
              <Icon.Brain />
              <span>Review concepts</span>
            </button>
          </div>
          <label className="upload-zone" htmlFor="document-upload">
            <input
              id="document-upload"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const validType = /\.(pdf|docx)$/i.test(file.name);
                if (!validType) {
                  setUploadMessage('Choose a PDF or DOCX file.');
                } else if (file.size > 50 * 1024 * 1024) {
                  setUploadMessage('This file is over the 50 MB limit.');
                } else {
                  setUploadMessage(`Uploading ${file.name}...`);
                  const form = new FormData();
                  form.append('file', file);
                  try {
                    const uploadResponse = await fetch('/api/v1/documents/upload', {
                      method: 'POST',
                      body: form,
                    });
                    const uploadResult = await readApiJson(uploadResponse);
                    if (!uploadResponse.ok) {
                      throw new Error(uploadResult.error || 'Document upload failed.');
                    }

                    const uploadedAt = new Date().toISOString();
                    const libraryItem: LibraryDocument = {
                      id: uploadResult.id,
                      name: uploadResult.name,
                      type: uploadResult.type,
                      status: 'processing',
                      total_pages: null,
                      created_at: uploadedAt,
                    };
                    setLibraryDocuments((previous) => [
                      libraryItem,
                      ...previous.filter((item) => item.id !== libraryItem.id),
                    ]);
                    setLibraryError('');
                    setUploadMessage(`Processing ${file.name}...`);
                    let completed = false;
                    for (let attempt = 0; attempt < 60; attempt += 1) {
                      await new Promise((resolve) => window.setTimeout(resolve, 1000));
                      const statusResponse = await fetch(`/api/v1/documents/${uploadResult.id}/status`);
                      const status = await readApiJson(statusResponse);
                      if (!statusResponse.ok) throw new Error(status.error || 'Could not check document status.');
                      if (status.status === 'ready') {
                        const contentResponse = await fetch(`/api/v1/documents/${uploadResult.id}/content`);
                        const processed = await readApiJson(contentResponse) as ProcessedDocumentResponse & { error?: string };
                        if (!contentResponse.ok) throw new Error(processed.error || 'Could not load processed document.');
                        const document: Document = {
                          id: processed.id,
                          name: processed.name,
                          type: processed.type,
                          uploadedAt: new Date(uploadedAt),
                          progress: 0,
                          totalPages: processed.totalPages ?? undefined,
                          currentPage: 1,
                          outline: processed.outline,
                          content: processed.content,
                        };
                        setDocumentCache((previous) => ({ ...previous, [document.id]: document }));
                        setLibraryDocuments((previous) => previous.map((item) => item.id === document.id
                          ? { ...item, status: 'ready', total_pages: document.totalPages ?? null }
                          : item));
                        setActiveDoc(document);
                        setActiveSectionId(processed.content[0]?.id ?? '');
                        setUploadMessage(`${file.name}: ready.`);
                        completed = true;
                        break;
                      }
                      if (status.status === 'failed') {
                        setLibraryDocuments((previous) => previous.map((item) => item.id === uploadResult.id
                          ? { ...item, status: 'failed', error: status.error }
                          : item));
                        throw new Error(status.error || 'Document processing failed.');
                      }
                    }
                    if (!completed) setUploadMessage(`Still processing ${file.name}. Check back in a moment.`);
                  } catch (error) {
                    setUploadMessage(error instanceof Error ? error.message : 'Document upload failed.');
                  }
                }
                event.target.value = '';
              }}
            />
            <div className="upload-zone__icon">
              <Icon.Upload />
            </div>
            <div className="upload-zone__text">
              Add a document<br />PDF or DOCX
            </div>
          </label>
          {uploadMessage && <p className="upload-message" role="status">{uploadMessage}</p>}
        </aside>
        {sidebarOpen && (
          <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close library sidebar" />
        )}

        {/* Main */}
        <main className="app-main">
          <ReaderPane
            doc={activeDoc}
            onCapture={handleCapture}
            onResearch={handleResearch}
            onNote={(text) => setNoteText(text)}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((value) => !value)}
            currentSectionId={activeSectionId}
            onNavigateSection={handleNavigateSection}
            onActiveSectionChange={setActiveSectionId}
            savedQuotes={activeSavedNotes.map((note) => note.quote)}
          />

          {/* Right panel */}
          <aside
            className={`app-panel ${panelOpen ? 'app-panel--open' : 'app-panel--closed'}`}
            aria-label="Knowledge assistant"
            aria-hidden={!panelOpen || focusMode}
          >
            <div className="app-panel__header">
              <div className="panel-tabs" role="tablist" aria-label="Knowledge tools">
                {panelTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`panel-tab ${panelTab === tab.id ? 'active' : ''}`}
                    onClick={() => { setPanelTab(tab.id); setPanelOpen(true); }}
                    role="tab"
                    aria-selected={panelTab === tab.id}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <button className="panel-close" onClick={() => setPanelOpen(false)} aria-label="Close knowledge panel">
                <Icon.X />
              </button>
            </div>

            {panelTab === 'outline' && (
              <OutlinePanel
                doc={activeDoc}
                activeSectionId={activeSectionId}
                onNavigate={handleNavigateSection}
              />
            )}
            {panelTab === 'concepts' && (
              <ConceptsPanel concepts={activeConcepts} onUpdateState={handleUpdateConceptState} />
            )}
            {panelTab === 'research' && (
              <ResearchPanel
                key={activeDoc.id}
                notes={activeResearch}
                onAddFinding={() => {
                  const section = activeDoc.content.find((item) => item.id === activeSectionId);
                  setResearchText(section?.paragraphs.map((paragraph) => paragraph.text).join(' ') ?? '');
                }}
              />
            )}
            {panelTab === 'chat' && (
              <ChatPanel
                key={activeDoc.id}
                doc={activeDoc}
                activeSectionId={activeSectionId}
              />
            )}
            {panelTab === 'notes' && <NotesPanel notes={activeSavedNotes} />}
            {panelTab === 'path' && (
              <LearningPathPanel
                key={activeDoc.id}
                doc={activeDoc}
                activeSectionId={activeSectionId}
                onNavigate={handleNavigateSection}
              />
            )}
            {panelTab === 'review' && (
              <ReviewPanel key={activeDoc.id} concepts={activeConcepts} onUpdateState={handleUpdateConceptState} />
            )}
          </aside>
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button className={`mobile-bottom-nav__item ${!sidebarOpen && panelTab !== 'notes' && panelTab !== 'research' && panelTab !== 'chat' ? 'active' : ''}`} onClick={() => { setSidebarOpen(true); setPanelOpen(false); }}>
          <Icon.BookOpen />
          <span>Library</span>
        </button>
        <button className={`mobile-bottom-nav__item ${panelTab === 'chat' && panelOpen ? 'active' : ''}`} onClick={() => { setPanelTab('chat'); setPanelOpen(true); setSidebarOpen(false); }}>
          <Icon.Message />
          <span>Chat</span>
        </button>
        <button className={`mobile-bottom-nav__item ${panelTab === 'notes' ? 'active' : ''}`} onClick={() => { setPanelTab('notes'); setPanelOpen(true); setSidebarOpen(false); }}>
          <Icon.Check />
          <span>Highlights</span>
        </button>
        <button className={`mobile-bottom-nav__item ${panelTab === 'research' ? 'active' : ''}`} onClick={() => { setPanelTab('research'); setPanelOpen(true); setSidebarOpen(false); }}>
          <Icon.Search />
          <span>Research</span>
        </button>
        <button className="mobile-bottom-nav__item" onClick={() => setSettingsOpen(true)}>
          <Icon.Menu />
          <span>Settings</span>
        </button>
      </nav>

      {panelOpen && (
        <button className="panel-backdrop" onClick={() => setPanelOpen(false)} aria-label="Close knowledge panel" />
      )}

      {/* Modals */}
      {captureText && (
        <CaptureModal
          selectedText={captureText}
          onClose={() => setCaptureText(null)}
          onSave={handleSaveConcept}
          onGenerateExplanation={(quote, question) => explainWithGemini(quote, question)}
        />
      )}
      {noteText && (
        <NoteModal
          quote={noteText}
          onClose={() => setNoteText(null)}
          onSave={handleSavePassage}
        />
      )}
      {researchText && (
        <ResearchModal
          sourceQuote={researchText}
          onClose={() => setResearchText(null)}
          onResearch={(question, sourceQuote) => researchWithGemini(question, sourceQuote)}
          onSave={handleSaveResearch}
        />
      )}
      {sessionModal && (
        <SessionModal
          onClose={() => setSessionModal(false)}
          onStart={(intention, duration) => setSession({ intention, duration, paused: false })}
        />
      )}
      {deferModal && (
        <DeferredCaptureModal
          onClose={() => setDeferModal(false)}
          onSave={handleDeferThought}
        />
      )}
      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section className="modal modal--compact" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title" id="settings-title">Settings</h2>
              <button className="modal__close" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><Icon.X /></button>
            </div>
            <div className="settings-provider">
              <span className="settings-provider__label">AI provider</span>
              <strong>{modelName}</strong>
              <p>Your API key stays on the local server and is never included in the browser.</p>
            </div>
            <div className="form-actions">
              <button className="btn btn--primary" onClick={() => setSettingsOpen(false)}>Done</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// =========================================
// ROOT APP
// =========================================
export default function App() {
  const [view, setView] = useState<'landing' | 'app'>('landing');

  if (view === 'app') {
    return <AppShell onBack={() => setView('landing')} />;
  }

  return <LandingPage onEnterApp={() => setView('app')} />;
}
