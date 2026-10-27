// =========================================
// CLARITY — Core Types
// =========================================

export type KnowledgeState = 'encountered' | 'explained' | 'recalled' | 'applied';

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt';
  uploadedAt: Date;
  progress: number; // 0-100
  totalPages?: number;
  currentPage?: number;
  outline: OutlineItem[];
  content: Section[];
}

export interface OutlineItem {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  sectionId: string;
}

export interface Section {
  id: string;
  title?: string;
  level?: 1 | 2 | 3;
  paragraphs: Paragraph[];
}

export interface Paragraph {
  id: string;
  text: string;
  isHighlight?: boolean;
}

export interface Concept {
  id: string;
  documentId: string;
  quote: string;
  title: string;
  explanation: string;
  knowledgeState: KnowledgeState;
  tags: string[];
  createdAt: Date;
  question?: string;
  linkedConceptIds?: string[];
}

export interface ResearchNote {
  id: string;
  conceptId?: string;
  documentId: string;
  question: string;
  source: string;
  notes: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  documentId: string;
  intention: string;
  startedAt: Date;
  durationMinutes: number;
  deferredTasks: string[];
}

export type PanelTab = 'outline' | 'concepts' | 'research' | 'review';
export type ReaderMode = 'original' | 'focus';
export type AppView = 'landing' | 'app';
