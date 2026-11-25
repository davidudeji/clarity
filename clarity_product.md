# CLARITY — COMPLETE PRODUCT UI/UX REDESIGN & RESPONSIVE IMPLEMENTATION SPECIFICATION

## 1. Project Overview

Redesign and fully implement Clarity, an AI-powered document reading, deep-work, research, and knowledge-management application.

Clarity allows users to:
- Upload and manage PDF and DOCX documents.
- Read documents in a distraction-free environment.
- Highlight and capture important passages.
- Extract concepts and insights using AI.
- Generate explanations and research questions.
- Organize knowledge into structured collections.
- Build a personal knowledge base from documents.
- Track reading and deep-work sessions.

The objective is to transform the current interface into a polished, modern, premium SaaS product with a consistent design system and excellent usability across desktop, tablet, and mobile.

**Core product philosophy:**

Reading should feel effortless. Research should feel organized. Knowledge should remain accessible.

Do not simply reskin the existing application. Audit the current implementation, understand its existing functionality, and redesign the complete experience while preserving and improving working features.

---

## 2. Design Direction

### Visual identity

Create a premium, editorial-inspired productivity interface.

Design references:
- Linear: precise spacing, clean navigation, restrained visual hierarchy.
- Notion: document organization and knowledge management.
- Readwise Reader: reading experience and highlights.
- Arc Browser: sophisticated dark interface and minimal controls.
- Raycast: compact, efficient interactions.

These are references for design principles, not templates to copy.

### Design characteristics

- Minimalist, professional, distraction-free.
- Deep charcoal background with subtle tonal variations.
- Clear typography and excellent readability.
- Restrained blue accent for primary interactions.
- Subtle borders instead of excessive shadows.
- Consistent iconography.
- Generous whitespace in reading areas.
- Compact but usable navigation.
- Smooth, purposeful micro-interactions.

Avoid:
- Excessive glassmorphism.
- Unnecessary gradients.
- Decorative icons without functional meaning.
- Too many badges and labels.
- Excessive card containers.
- Oversized navigation elements.
- Inconsistent border radiuses.
- Visually crowded sidebars.

---

## 3. Design System

Establish reusable design tokens before redesigning individual pages.

### Color palette

| Token | Color | Purpose |
|---|---|---|
| Background | #0B0D10 | Main application background |
| Sidebar | #101318 | Navigation surfaces |
| Surface | #151A21 | Panels and cards |
| Elevated | #1B222C | Modals and floating panels |
| Border | #252D38 | Subtle dividers |
| Primary | #6B9CFF | Primary actions and active states |
| Primary Hover | #83ACFF | Hover state |
| Text Primary | #F0F2F5 | Main content |
| Text Secondary | #9AA4B2 | Supporting text |
| Muted | #687384 | Metadata |
| Success | #46B987 | Successful actions |
| Warning | #E5AD55 | Warnings |
| Danger | #E36D75 | Destructive actions |

Use accessible contrast ratios, particularly for small text and secondary controls.

### Typography

Use Inter or Geist Sans for the application interface.

Use a highly readable editorial font for document content where appropriate.

Typography hierarchy:
- Page titles: 24–28px.
- Section headings: 17–20px.
- Body text: 14–16px.
- Supporting text: 12–13px.
- Document reading text: 16–19px.
- Metadata: 11–12px.

### Spacing and geometry

Use a consistent 4px spacing system.

- Small controls: 6–8px radius.
- Inputs: 8px radius.
- Cards and panels: 10–12px radius.
- Dialogs: 14–16px radius.
- Sidebar widths should be consistent across the application.

All components must share common design tokens.

---

## 4. Application Architecture and Navigation

Organize Clarity into the following primary areas:

1. Library
2. Reading Workspace
3. Highlights and Notes
4. Concepts
5. Research
6. Collections
7. Deep Work
8. Settings

### Global application shell

Create a reusable application shell consisting of:

- Primary navigation.
- Main content region.
- Contextual workspace panels.
- Global search.
- User profile and settings.
- Responsive navigation behavior.

The application shell should remain consistent across all pages.

### Navigation behavior

Desktop:
- Persistent left sidebar.
- Main workspace uses available horizontal space.
- Contextual panels appear on the right where appropriate.

Tablet:
- Collapsible navigation.
- Main content receives priority.
- Contextual panels become drawers.

Mobile:
- Replace desktop navigation with a compact top navigation and bottom navigation.
- Use full-screen reading and research experiences.
- Avoid squeezing three desktop columns into a mobile viewport.

---

## 5. Library Experience

Redesign the document library as a professional document-management interface.

### Features

- Upload PDF documents.
- Upload DOCX documents.
- Drag-and-drop upload.
- Document search.
- Sort by recently opened, date added, title.
- Organize documents into collections.
- Display document title, file type, size and reading progress.
- Resume reading from the last saved position.
- Rename documents.
- Remove documents with confirmation.
- Empty library state with a clear upload action.

### Upload experience

Implement a functional upload workflow.

Supported formats:
- PDF
- DOCX

Required states:
- Drag-over state.
- File selection state.
- Upload progress.
- Processing state.
- Successful upload.
- Invalid file type.
- File too large.
- Upload failure.
- Document processing failure.

Do not use browser alert() or placeholder upload messages.

Implement a custom accessible upload dialog and connect it to the actual file-processing workflow.

Display meaningful progress and error feedback.

---

## 6. Reading Workspace — Highest Priority

The reading workspace is the central product experience.

Redesign the current three-column interface into a flexible, responsive reading environment.

### Desktop layout

Create three functional regions:

**A. Left panel — Library navigation**

Contains:
- Clarity logo and application navigation.
- Current collection.
- Uploaded document list.
- Active document indicator.
- Upload button.
- Collapse/expand control.

Allow the sidebar to be resized or collapsed.

**B. Center panel — Document reader**

Contains:
- Document title and breadcrumb.
- Focus mode toggle.
- Original/document view toggle where supported.
- Page navigation.
- Current page and total pages.
- Zoom controls.
- Search within document.
- Reading progress.
- Document content.

The document should be the visual center of attention.

Set a comfortable reading width with sufficient whitespace around the content.

Document content must be readable without excessive horizontal stretching.

Implement:
- Page navigation.
- Previous and next page.
- Zoom in/out.
- Text selection.
- Highlighting.
- Passage capture.
- Copy passage.
- Add note.
- Restore last reading position.

**C. Right panel — Knowledge assistant**

Create a contextual panel with four primary tabs:

1. Outline
2. Concepts
3. Research
4. Notes

Each tab must have a clear purpose.

Outline:
- Document heading hierarchy.
- Clickable section navigation.
- Current section indicator.

Concepts:
- AI-extracted concepts.
- Original passage.
- Concept title.
- Explanation.
- Related concepts.
- Tags.
- Confidence or processing status where supported.

Research:
- Research questions generated from selected passages.
- Follow-up questions.
- Research notes.
- Source references.
- Ability to expand a question into a research item.

Notes:
- Saved highlights.
- User annotations.
- Personal observations.
- Linked document passages.

Allow the right panel to collapse independently.

### Selected passage experience

When a user selects document text, show a contextual toolbar.

Actions:
- Highlight.
- Save passage.
- Explain with AI.
- Ask a question.
- Create a note.
- Copy.

The toolbar should appear near the selection without covering the selected text.

Preserve the selected passage when switching between contextual actions.

### Focus mode

Implement a genuinely distraction-free reading mode.

When enabled:
- Hide the left navigation.
- Hide the right knowledge panel.
- Expand the document reading area.
- Reduce visual noise.
- Keep essential reading controls accessible.
- Provide a clear exit action.

Do not make Focus Mode simply change the color of a button.

---

## 7. AI Knowledge and Concept Management

Redesign the concept cards currently displayed on the right side of the screenshot.

Each concept should have a consistent information hierarchy.

### Concept card structure

- Original extracted passage.
- Concept title.
- Short explanation.
- Related research question.
- Relevant tags.
- Processing status.
- Expand/collapse interaction.

Provide a detailed concept view when a user opens a concept.

### Concept actions

- Explain.
- Expand explanation.
- Generate examples.
- Find related concepts.
- Create research question.
- Save to knowledge base.
- Link to original document.

AI-generated content must be clearly distinguished from user-created notes.

Do not fabricate AI results when the backend has not returned them.

Include loading, empty, failed and retry states.

---

## 8. Research Workspace

Create a dedicated research experience rather than treating research as another list of cards.

Users should be able to:

- Create research questions from document passages.
- Organize questions by topic.
- Record observations.
- Connect research to original source material.
- Save generated explanations.
- Track unanswered questions.
- Link related concepts and notes.

Each research item should retain its source-document reference and original passage.

The interface should support a continuous research workflow without requiring users to repeatedly navigate between unrelated pages.

---

## 9. Highlights and Notes

Create a centralized knowledge collection.

Features:
- All saved highlights.
- Notes grouped by document.
- Search highlights.
- Filter by collection, document and date.
- Edit and delete notes.
- Navigate to the original passage.
- Export notes where supported.

Each highlight must preserve its relationship with the original document and page number.

---

## 10. Deep Work Experience

Create a dedicated deep-work section.

Features:
- Start a focus session.
- Set a session duration.
- Display a distraction-free timer.
- Associate a session with a document or research task.
- Pause and resume.
- End a session.
- Track completed sessions.
- Show reading and focus history.

Keep this interface simple and functional.

Avoid adding gamification elements that distract from actual work.

---

## 11. Mobile-First Responsive Design

Mobile responsiveness is a core product requirement, not a final styling adjustment.

Design and test the complete application at the following breakpoints.

| Device | Width | Layout |
|---|---:|---|
| Small mobile | 320–374px | Compact single-column |
| Standard mobile | 375–767px | Single-column |
| Tablet | 768–1023px | Flexible two-panel |
| Small desktop | 1024–1279px | Collapsible three-panel |
| Desktop | 1280–1535px | Full workspace |
| Large desktop | 1536px+ | Expanded workspace |

### Mobile navigation

Replace the desktop sidebar with:

- Compact top bar.
- Document title.
- Back/navigation control.
- Contextual actions menu.
- Bottom navigation for Library, Highlights, Research and Settings.

Avoid persistent desktop-style sidebars on mobile.

### Mobile reading experience

The document reader should occupy the full available width.

Requirements:
- No horizontal page scrolling.
- Readable document text.
- Responsive PDF rendering.
- Touch-friendly page navigation.
- Touch-friendly selection and highlighting.
- Accessible zoom controls.
- Sticky reading toolbar where appropriate.
- Page navigation through a compact bottom sheet or toolbar.
- Save and restore reading position.

### Mobile contextual panels

The right desktop panel must become a bottom sheet or full-screen drawer.

When opening Concepts, Research, Outline or Notes:
- Preserve the current document position.
- Display the selected panel clearly.
- Provide an obvious close/back action.
- Allow users to return to reading without losing context.

### Mobile upload

Implement:
- Full-width upload button.
- Native file picker.
- Drag-and-drop only where supported.
- Upload progress.
- Clear success and failure feedback.

Never assume desktop hover interactions exist on touch devices.

### Touch targets

Interactive controls should have approximately 44–48px touch targets.

Ensure adequate spacing between adjacent actions.

---

## 12. Interaction and Animation

Implement purposeful interactions throughout the application.

Examples:
- Smooth sidebar collapse.
- Animated tab transitions.
- Subtle hover states.
- Expandable concept cards.
- Smooth bottom-sheet presentation.
- Selection toolbar appearance.
- Document navigation transitions.
- Upload progress indicators.
- Toast notifications.

Use consistent animation timing, generally 150–250ms for standard interactions.

Respect prefers-reduced-motion.

Avoid unnecessary animated backgrounds and distracting effects.

---

## 13. Component Architecture

Build reusable components rather than implementing each page independently.

Suggested component structure:

- AppShell
- DesktopSidebar
- MobileNavigation
- GlobalSearch
- LibraryView
- DocumentCard
- UploadDialog
- UploadDropzone
- ReadingWorkspace
- DocumentToolbar
- DocumentViewer
- PageNavigator
- ReadingProgress
- SelectionToolbar
- ContextPanel
- OutlinePanel
- ConceptsPanel
- ConceptCard
- ResearchPanel
- ResearchItem
- NotesPanel
- HighlightItem
- FocusMode
- DeepWorkTimer
- BottomSheet
- ConfirmationDialog
- ToastNotification
- EmptyState
- LoadingState

Separate:
- UI components.
- Business logic.
- Document processing.
- AI integration.
- Data management.
- State management.

Avoid giant components containing the entire application.

---

## 14. Functional and Technical Requirements

This is a product redesign, not a static UI exercise.

Audit the existing codebase before implementation.

Identify:
- Existing routes.
- Existing components.
- Existing state management.
- Existing document processing logic.
- Existing AI integrations.
- Existing upload functionality.
- Existing persistence mechanisms.
- Existing responsive styles.

Preserve functional integrations and avoid duplicating existing services.

### Functional requirements

- Actual PDF upload and rendering.
- Actual DOCX upload and readable content extraction.
- Persistent document library.
- Persistent reading position.
- Working document navigation.
- Functional text selection.
- Functional highlight and note creation.
- Working concept and research workflows.
- Functional search.
- Proper error handling.
- Responsive layout across all application routes.

Use existing project dependencies where possible.

Do not introduce unnecessary dependencies or replace the existing technology stack without justification.

### Data integrity

A saved highlight must retain:
- Document ID.
- Original passage.
- Page number or source position.
- Highlight color where supported.
- Creation timestamp.

A concept must retain its source passage and document reference.

Research items must retain their original source context.

---

## 15. Accessibility

Meet WCAG 2.2 AA principles.

Requirements:
- Keyboard navigation.
- Visible focus states.
- Semantic HTML.
- Accessible modal dialogs.
- Accessible tab navigation.
- Appropriate ARIA attributes.
- Screen-reader-friendly labels.
- Sufficient color contrast.
- Reduced-motion support.
- Touch-friendly controls.

Do not communicate status using color alone.

---

## 16. Quality Assurance

Test the entire experience, not just the landing screen.

### Desktop tests
- Upload a PDF.
- Upload a DOCX.
- Open a document.
- Navigate between pages.
- Switch focus mode.
- Collapse and expand sidebars.
- Select and highlight passages.
- Save notes.
- Open concepts.
- Open research.
- Search documents.
- Restore reading position.

### Mobile tests
- Open library.
- Upload a document.
- Open document reader.
- Navigate between pages.
- Highlight text.
- Open the concepts drawer.
- Open the research drawer.
- Switch between navigation sections.
- Use the application in portrait and landscape.
- Verify no horizontal overflow.

### Edge cases
- Empty library.
- Unsupported file.
- Corrupted PDF.
- Large document.
- Upload interruption.
- Slow AI response.
- Failed AI response.
- No extracted concepts.
- Missing document content.
- Network failure.

---

## 17. Implementation Phases

Execute the work in the following order.

**Phase 1 — Codebase audit and design foundation**
- Inspect the complete existing project.
- Identify working features and technical limitations.
- Define design tokens.
- Establish responsive layout primitives.
- Create the application shell.

**Phase 2 — Reading workspace**
- Rebuild the three-panel interface.
- Implement the document reader.
- Build navigation and document controls.
- Implement Focus Mode.
- Implement responsive panel behavior.

**Phase 3 — Knowledge management**
- Redesign concepts.
- Build outline.
- Implement research.
- Build highlights and notes.
- Connect contextual actions to source passages.

**Phase 4 — Library and upload**
- Build library management.
- Implement PDF and DOCX uploads.
- Add upload progress and error states.
- Implement document persistence.

**Phase 5 — Deep work**
- Build timer and session controls.
- Add session history.
- Connect sessions to documents and tasks.

**Phase 6 — Mobile optimization**
- Implement mobile navigation.
- Implement bottom sheets.
- Optimize document rendering.
- Test touch interactions.
- Fix overflow and viewport issues.

**Phase 7 — Final quality assurance**
- Test every interactive element.
- Validate all routes.
- Verify persistence.
- Test desktop, tablet and mobile.
- Fix console errors.
- Remove placeholder functionality.

---

## 18. Definition of Done

The redesign is complete only when:

1. Every major application page follows the same design system.
2. The reading workspace is visually polished and functional.
3. PDF and DOCX upload workflows actually work.
4. The document reader supports the essential reading interactions.
5. Concepts, Research, Outline and Notes are fully integrated.
6. Focus Mode works as intended.
7. Mobile navigation is purpose-built.
8. No desktop-only three-column layout overflows on mobile.
9. All dialogs and menus work on touch devices.
10. Saved information persists correctly.
11. No placeholder alerts or fake interactions remain.
12. All loading, empty, success and error states are designed.
13. Accessibility and keyboard navigation are addressed.
14. No existing working feature is accidentally removed.

## FINAL IMPLEMENTATION INSTRUCTION

Work directly within the existing Clarity codebase.

First inspect the project and understand its architecture. Then implement the redesign in logical phases, maintaining working functionality throughout.

Do not stop after creating attractive mockups. Build the actual responsive application.

Prioritize the reading experience, document usability, information hierarchy and mobile interaction quality.

The final product should feel like a premium, production-ready SaaS application rather than a dashboard template.

**Product positioning: Clarity — Read deeply. Think clearly. Build knowledge.**