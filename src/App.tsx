import { useState, useRef, useCallback, useEffect } from 'react';
import './index.css';
import type { Document, Concept, ResearchNote, PanelTab, KnowledgeState } from './types';
import { sampleDocument, sampleConcepts, sampleResearch } from './utils/sampleData';


// =========================================
// ICONS (inline SVG to avoid extra deps)
// =========================================
const Icon = {
  BookOpen: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
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
function useSessionTimer(isActive: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// =========================================
// LANDING PAGE
// =========================================
function LandingPage({ onEnterApp }: { onEnterApp: () => void }) {
  const features = [
    {
      icon: '📄',
      title: 'Document Ingestion',
      desc: 'Upload PDFs and Word docs. Read in clean reflowable mode or view the original. Navigate by outline. Track reading position.',
    },
    {
      icon: '🔊',
      title: 'Synchronized Narration',
      desc: 'Listen while you read with sentence-level highlighting, adjustable speed, section navigation, and persistent position.',
    },
    {
      icon: '💡',
      title: 'Concept Capture',
      desc: 'Select any passage to explain, question, research, or connect it to existing knowledge — without losing your place.',
    },
    {
      icon: '🔍',
      title: 'Research Workspace',
      desc: 'Investigate concepts in a persistent workspace linked to the source passage. Every finding stays connected to what triggered it.',
    },
    {
      icon: '🗺️',
      title: 'Prerequisite-Aware Learning',
      desc: 'Clarity proposes a learning sequence based on the document structure and your knowledge state. Override any recommendation.',
    },
    {
      icon: '🧠',
      title: 'Understanding Model',
      desc: 'Tracks concepts from Encountered → Explained → Recalled → Applied. Reviews are driven by evidence, not reading completion.',
    },
    {
      icon: '⏱️',
      title: 'Deep-Work Sessions',
      desc: 'Start with an intention. Defer stray thoughts to a queue. Stay focused without losing anything that matters.',
    },
  ];

  const steps = [
    { num: '01', title: 'Upload a document', desc: 'PDF or Word doc — Clarity extracts text, structure, and outline automatically.' },
    { num: '02', title: 'Read & listen', desc: 'Use the focused reader. Play synchronized narration while you follow along.' },
    { num: '03', title: 'Capture concepts', desc: 'Highlight any passage. Tag it, explain it in your own words, log open questions.' },
    { num: '04', title: 'Research without leaving', desc: 'Open a research thread from any concept. Notes stay linked to the source passage.' },
    { num: '05', title: 'Review what matters', desc: 'Clarity surfaces concepts for retrieval practice — rated by your own understanding, not page count.' },
    { num: '06', title: 'Apply what you learned', desc: 'Mark concepts as applied when you use them in practice. That\'s the finish line.' },
  ];

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav__inner">
          <div className="landing-logo">
            <div className="landing-logo__icon">C</div>
            Clarity
          </div>
          <div className="landing-nav__links">
            <a
              href="http://localhost:3000/product/clarity"
              className="nav-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              ← Back to portfolio
            </a>
            <button onClick={onEnterApp} className="btn btn--primary">
              Open App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero__badge">
          <div className="hero__badge-dot" />
          In Design · Phase 1 Active
        </div>
        <h1 className="hero__title">
          Understand what you <span>read.</span>
        </h1>
        <p className="hero__subtitle">
          Clarity turns documents into structured understanding.
          Investigate what you don't know, learn in the right order,
          and apply what matters — without losing concentration.
        </p>
        <div className="hero__actions">
          <button onClick={onEnterApp} className="btn btn--primary btn--lg">
            Try the prototype
          </button>
          <a
            href="http://localhost:3000/product/clarity"
            className="btn btn--secondary btn--lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon.ExternalLink />
            View product spec
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <p className="section-label">The workflow</p>
        <h2 className="section-title">From reading to applied understanding</h2>
        <p className="section-desc">
          Six stages, designed around how learning actually works — not how note-taking apps assume it does.
        </p>
        <div className="steps-list">
          {steps.map((step, i) => (
            <div key={i} className="step-item">
              <div className="step-item__num">{step.num}</div>
              <div className="step-item__body">
                <h3 className="step-item__title">{step.title}</h3>
                <p className="step-item__desc">{step.desc}</p>
              </div>
              {i < steps.length - 1 && <div className="step-item__connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <p className="section-label">Core capabilities</p>
        <h2 className="section-title">What Clarity does</h2>
        <p className="section-desc">
          Seven interconnected workflows designed around the real friction of studying —
          not the absence of content, but the absence of a trustworthy system.
        </p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-card__icon">{f.icon}</div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: 'var(--space-9) var(--space-6)',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <h2 className="section-title">Ready to try it?</h2>
        <p className="section-desc" style={{ margin: '0 auto var(--space-6)' }}>
          The prototype uses a sample document so you can explore every part of the interface right now.
        </p>
        <button onClick={onEnterApp} className="btn btn--primary btn--lg">
          Open Clarity prototype →
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: 'var(--space-5) var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '13px', color: 'var(--text-muted)' }}>
          <div className="landing-logo__icon" style={{ width: '20px', height: '20px', fontSize: '10px' }}>C</div>
          Clarity by David Udeji · 2024
        </div>
        <a
          href="http://localhost:3000/product/clarity"
          style={{ fontSize: '13px', color: 'var(--text-muted)' }}
          className="nav-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Product specification →
        </a>
      </footer>
    </div>
  );
}

// =========================================
// PANEL: OUTLINE
// =========================================
function OutlinePanel({ doc }: { doc: Document }) {
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
        {doc.outline.map((item) => (
          <div
            key={item.id}
            className={`outline-item outline-item--h${item.level} ${item.id === 'o7' ? 'active' : ''}`}
          >
            {item.title}
          </div>
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
function ResearchPanel({ notes }: { notes: ResearchNote[] }) {
  const [activeNote, setActiveNote] = useState<string | null>(notes[0]?.id ?? null);

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
            <p className="research-item__source">src: {current.source}</p>
            <p className="research-item__notes">{current.notes}</p>
          </div>
          <button className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>
            <Icon.Plus />
            Add finding
          </button>
        </div>
      )}
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
};

const samplePath: PathNode[] = [
  { id: 'lp1', title: 'What is deep work?', type: 'core', description: 'The foundational definition Newport builds the rest of the book on.', status: 'done' },
  { id: 'lp2', title: 'Willpower as a finite resource', type: 'prerequisite', description: 'You need this before the scheduling frameworks make sense.', status: 'in-progress', reason: 'Required for lp3' },
  { id: 'lp3', title: 'Designing a deep work ritual', type: 'core', description: 'The practical implementation: when, where, how long, and what rules.', status: 'available' },
  { id: 'lp4', title: 'The 4DX framework', type: 'core', description: 'Focus → Lead measures → Scoreboard → Accountability cadence.', status: 'locked' },
  { id: 'lp5', title: 'Productive meditation', type: 'optional', description: 'Using transition periods for focused thinking. Complements but not required.', status: 'locked' },
  { id: 'lp6', title: 'Embracing boredom', type: 'core', description: 'Why distraction tolerance must be trained separately from scheduling.', status: 'locked' },
];

function LearningPathPanel() {
  const [selected, setSelected] = useState<string | null>(null);
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
        suggested sequence · Deep Work
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {samplePath.map((node) => (
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
                  {node.status !== 'locked' && (
                    <button className="btn btn--secondary btn--sm">Jump to section</button>
                  )}
                  {node.status !== 'locked' && (
                    <button className="btn btn--ghost btn--sm">Mark optional</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
        Sequence is suggested, not enforced. Drag to reorder.
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
}: {
  selectedText: string;
  onClose: () => void;
  onSave: (concept: Omit<Concept, 'id' | 'createdAt' | 'documentId'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [explanation, setExplanation] = useState('');
  const [question, setQuestion] = useState('');
  const [knowledgeState, setKnowledgeState] = useState<KnowledgeState>('encountered');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ title, explanation, question: question || undefined, knowledgeState, quote: selectedText, tags: [] });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Capture concept</h2>
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

// =========================================
// SESSION MODAL
// =========================================
function SessionModal({ onClose, onStart }: { onClose: () => void; onStart: (intention: string, duration: number) => void }) {
  const [intention, setIntention] = useState('');
  const [duration, setDuration] = useState(25);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Start deep-work session</h2>
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
  const [thought, setThought] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">
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
  deferredCount,
  onEnd,
  onDefer,
}: {
  intention: string;
  isActive: boolean;
  deferredCount: number;
  onEnd: () => void;
  onDefer: () => void;
}) {
  const time = useSessionTimer(isActive);

  return (
    <div className="session-banner">
      <div className="session-timer">{time}</div>
      <div className="session-banner__info">
        <div className="session-banner__title">{intention || 'Deep work session'}</div>
        <div className="session-banner__desc">
          {deferredCount > 0
            ? `${deferredCount} thought${deferredCount > 1 ? 's' : ''} deferred`
            : 'Stay focused · stray thoughts go to the queue'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button className="btn btn--ghost btn--sm" onClick={onDefer} title="Defer a thought">
          <Icon.Inbox />
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
  x, y, onCapture, onResearch,
}: {
  x: number; y: number;
  onCapture: () => void;
  onResearch: () => void;
}) {
  return (
    <div
      className="selection-tooltip"
      style={{ top: y - 56, left: x - 140 }}
    >
      <button className="tooltip-action" onClick={onCapture}>
        <Icon.Lightbulb />
        Capture
      </button>
      <button className="tooltip-action" onClick={onResearch}>
        <Icon.Search />
        Research
      </button>
      <button className="tooltip-action" onClick={() => {}}>
        <Icon.Plus />
        Question
      </button>
    </div>
  );
}

// =========================================
// READER PANE
// =========================================
function ReaderPane({
  doc,
  onCapture,
}: {
  doc: Document;
  onCapture: (text: string) => void;
}) {
  const [readerMode, setReaderMode] = useState<'focus' | 'original'>('focus');
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setTooltip(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      text: selection.toString().trim(),
    });
  }, []);

  return (
    <div className="reader-pane">
      {/* Toolbar */}
      <div className="reader-toolbar">
        <div className="reader-toolbar__group">
          <button
            className={`reader-mode-btn ${readerMode === 'focus' ? 'active' : ''}`}
            onClick={() => setReaderMode('focus')}
          >
            <Icon.BookOpen />
            Focus
          </button>
          <button
            className={`reader-mode-btn ${readerMode === 'original' ? 'active' : ''}`}
            onClick={() => setReaderMode('original')}
          >
            Original
          </button>
        </div>
        <div className="reader-toolbar__sep" />
        <div className="reader-toolbar__group" style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          p. {doc.currentPage} / {doc.totalPages}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Select a passage to capture or research</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="reader-body"
        ref={readerRef}
        onMouseUp={handleMouseUp}
        onClick={() => !window.getSelection()?.toString() && setTooltip(null)}
      >
        <div className="reader-content">
          {doc.content.map((section) => (
            <div key={section.id}>
              {section.title && <h2>{section.title}</h2>}
              {section.paragraphs.map((para) => (
                <p key={para.id} className={para.isHighlight ? 'highlight' : ''}>
                  {para.text}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Narration bar */}
      <NarrationBar />

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
            setTooltip(null);
          }}
        />
      )}
    </div>
  );
}

// =========================================
// NARRATION BAR
// =========================================
function NarrationBar() {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  function cycleSpeed() {
    const idx = speeds.indexOf(speed);
    setSpeed(speeds[(idx + 1) % speeds.length]);
  }

  return (
    <div className="narration-bar">
      <div className="narration-bar__controls">
        <button className="narration-btn"><Icon.SkipBack /></button>
        <button
          className="narration-btn narration-btn--play"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause narration' : 'Play narration'}
        >
          {playing ? <Icon.Pause /> : <Icon.Play />}
        </button>
        <button className="narration-btn"><Icon.SkipForward /></button>
      </div>

      <div className="narration-bar__progress">
        <div className="narration-bar__sentence">
          {playing
            ? 'You have a finite amount of willpower that becomes depleted as you use it…'
            : 'Synchronized narration · sentence-level highlighting'}
        </div>
        <div className="narration-bar__time">
          <span className="time-text">4:12</span>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div className="progress-bar__fill" style={{ width: '34%' }} />
          </div>
          <span className="time-text">12:21</span>
        </div>
      </div>

      <button className="narration-bar__speed" onClick={cycleSpeed}>
        {speed}×
      </button>
      <button className="icon-btn">
        <Icon.Volume2 />
      </button>
    </div>
  );
}

// =========================================
// FULL APP SHELL
// =========================================
type ExtendedPanelTab = PanelTab | 'path';

function AppShell({ onBack }: { onBack: () => void }) {
  const [activeDoc] = useState<Document>(sampleDocument);
  const [concepts, setConcepts] = useState<Concept[]>(sampleConcepts);
  const [research] = useState<ResearchNote[]>(sampleResearch);
  const [panelTab, setPanelTab] = useState<ExtendedPanelTab>('concepts');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [captureText, setCaptureText] = useState<string | null>(null);
  const [sessionModal, setSessionModal] = useState(false);
  const [session, setSession] = useState<{ intention: string; duration: number } | null>(null);
  const [deferModal, setDeferModal] = useState(false);
  const [deferredThoughts, setDeferredThoughts] = useState<string[]>([]);
  const [showDeferred, setShowDeferred] = useState(false);

  function handleCapture(text: string) {
    setCaptureText(text);
  }

  function handleSaveConcept(partial: Omit<Concept, 'id' | 'createdAt' | 'documentId'>) {
    const newConcept: Concept = {
      ...partial,
      id: `c-${Date.now()}`,
      documentId: activeDoc.id,
      createdAt: new Date(),
    };
    setConcepts((prev) => [newConcept, ...prev]);
    setPanelTab('concepts');
  }

  function handleUpdateConceptState(id: string, state: KnowledgeState) {
    setConcepts(prev => prev.map(c => c.id === id ? { ...c, knowledgeState: state } : c));
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
    { id: 'concepts', label: `Concepts (${concepts.length})`, icon: <Icon.Lightbulb /> },
    { id: 'research', label: 'Research', icon: <Icon.Search /> },
    { id: 'path', label: 'Path', icon: <Icon.Map /> },
    { id: 'review', label: 'Review', icon: <Icon.Brain /> },
  ];

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <button className="icon-btn" onClick={onBack} title="Back to landing">
          <Icon.ArrowLeft />
        </button>
        <div className="app-header__logo">
          <div className="app-header__logo-icon">C</div>
          Clarity
        </div>
        <div className="app-header__breadcrumb">
          <Icon.ChevronRight />
          <span>{activeDoc.name}</span>
        </div>
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
          <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle sidebar">
            <Icon.Menu />
          </button>
        </div>
      </header>

      {/* Session Banner */}
      {session && (
        <SessionBanner
          intention={session.intention}
          isActive={!!session}
          deferredCount={deferredThoughts.length}
          onEnd={() => setSession(null)}
          onDefer={() => setDeferModal(true)}
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
        <aside className={`app-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-section">
            <p className="sidebar-section__label">Library</p>
          </div>
          <div className="sidebar-doc-list">
            <div className="doc-item active">
              <span className="doc-item__icon">📄</span>
              <span className="doc-item__name">{activeDoc.name}</span>
              <div className="doc-item__progress">
                <div className="doc-item__progress-bar" style={{ width: `${activeDoc.progress}%` }} />
              </div>
            </div>
          </div>
          <div
            className="upload-zone"
            onClick={() => alert('Upload: In a full implementation, this would open a file picker for PDF/DOCX files.')}
          >
            <div className="upload-zone__icon">
              <Icon.Upload />
            </div>
            <div className="upload-zone__text">
              Drop a PDF or Word doc here<br />or click to browse
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="app-main">
          {/* Reader */}
          <ReaderPane doc={activeDoc} onCapture={handleCapture} />

          {/* Right panel */}
          <aside className="app-panel">
            <div className="panel-tabs">
              {panelTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`panel-tab ${panelTab === tab.id ? 'active' : ''}`}
                  onClick={() => setPanelTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {panelTab === 'outline' && <OutlinePanel doc={activeDoc} />}
            {panelTab === 'concepts' && (
              <ConceptsPanel concepts={concepts} onUpdateState={handleUpdateConceptState} />
            )}
            {panelTab === 'research' && <ResearchPanel notes={research} />}
            {panelTab === 'path' && <LearningPathPanel />}
            {panelTab === 'review' && (
              <ReviewPanel concepts={concepts} onUpdateState={handleUpdateConceptState} />
            )}
          </aside>
        </main>
      </div>

      {/* Modals */}
      {captureText && (
        <CaptureModal
          selectedText={captureText}
          onClose={() => setCaptureText(null)}
          onSave={handleSaveConcept}
        />
      )}
      {sessionModal && (
        <SessionModal
          onClose={() => setSessionModal(false)}
          onStart={(intention, duration) => setSession({ intention, duration })}
        />
      )}
      {deferModal && (
        <DeferredCaptureModal
          onClose={() => setDeferModal(false)}
          onSave={handleDeferThought}
        />
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
