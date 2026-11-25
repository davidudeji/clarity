# 19. DOCUMENT EXTRACTION, TYPOGRAPHY & READING EXPERIENCE

## 19.1 Objective

Transform extracted PDF and DOCX content into a clean, readable, professionally structured digital reading experience.

Clarity must not display extracted document text as unformatted paragraphs or raw Markdown.

The extracted content must preserve the original document's meaning and logical structure while improving readability through:

- Professional typography.
- Consistent spacing.
- Clear content hierarchy.
- Proper paragraph separation.
- Structured headings.
- Readable lists.
- Styled quotations.
- Well-formatted tables.
- Code block formatting.
- Mathematical notation.
- Page and section navigation.

The result should feel like reading a professionally typeset digital book.

**Core principle:** Preserve the source content and structure. Improve its presentation without rewriting, summarizing, omitting or changing the author's meaning.

---

## 19.2 Document Processing Pipeline

Implement a structured extraction-to-rendering pipeline.

```text
Original PDF / DOCX
        |
        v
Document extraction
        |
        v
Structure recognition
        |
        v
Content normalization
        |
        v
Layout and typography mapping
        |
        v
Structured document representation
        |
        v
Frontend rendering
        |
        v
Professional reading experience
```

Separate document extraction from document presentation.

The parser should produce structured content. The frontend should decide how that content is displayed.

Do not couple the PDF extraction engine directly to the visual presentation layer.

---

## 19.3 Structured Content Recognition

Recognize and preserve the following document elements:

| Element             | Rendering requirement                      |
| ------------------- | ------------------------------------------ |
| Document title      | Prominent title typography                 |
| Chapter headings    | Clear section hierarchy                    |
| Subheadings         | Consistent heading levels                  |
| Body paragraphs     | Comfortable line height and spacing        |
| Numbered lists      | Proper indentation and numbering           |
| Bullet lists        | Consistent bullet spacing                  |
| Blockquotes         | Visually differentiated quotation blocks   |
| Tables              | Structured, responsive table layout        |
| Images              | Preserved dimensions and captions          |
| Footnotes           | Smaller but readable typography            |
| Code blocks         | Monospaced font and syntax styling         |
| Equations           | Proper mathematical rendering              |
| Page breaks         | Clear section separation where appropriate |
| Headers and footers | Recognized and handled separately          |

Do not flatten all extracted content into a single text string.

Preserve the relationship between headings, paragraphs, lists, tables and their source pages.

---

## 19.4 Professional Typography System

Establish a consistent reading typography system.

### Recommended defaults

| Property          | Desktop   | Mobile    |
| ----------------- | --------- | --------- |
| Body font size    | 17–18px   | 16–17px   |
| Body line height  | 1.75–1.85 | 1.65–1.75 |
| Paragraph spacing | 1.2–1.5em | 1.1–1.3em |
| H1                | 32–38px   | 27–32px   |
| H2                | 25–30px   | 23–27px   |
| H3                | 20–23px   | 19–22px   |
| Content width     | 680–760px | 100%      |
| Side padding      | 48–64px   | 20–24px   |

Use a professional, highly readable font stack.

Suggested:

- Primary reading font: Georgia or a modern editorial serif.
- Interface font: Inter or the existing Clarity UI font.
- Code font: JetBrains Mono or system monospace.

Allow users to switch between serif and sans-serif reading modes.

Typography must maintain sufficient contrast in light and dark themes.

---

## 19.5 Paragraph Formatting

This is one of the highest-priority improvements.

Extracted paragraphs must have:

- Clear separation.
- Consistent vertical rhythm.
- Comfortable line length.
- Appropriate line height.
- No unnecessary indentation.
- No excessive empty space.
- No paragraphs merged together.

Detect paragraph boundaries intelligently.

Do not treat every line break in a PDF as a new paragraph.

Conversely, do not merge separate paragraphs simply because the PDF extraction engine returned continuous text.

Remove extraction artifacts such as:

- Repeated spaces.
- Broken words caused by line wrapping.
- Unnecessary line breaks.
- Repeated headers and footers.
- Duplicate page text.
- Invalid encoding characters.

Do not remove meaningful punctuation, paragraph breaks, hyphenation or intentional formatting.

---

## 19.6 Heading Hierarchy

Detect document headings and map them to semantic HTML elements.

```text
H1 — Document or chapter title
  H2 — Major section
    H3 — Subsection
      H4 — Supporting subsection
```

Requirements:

- Preserve original heading text.
- Maintain correct heading order.
- Use consistent spacing above and below headings.
- Avoid headings appearing alone at the bottom of a page.
- Support automatic table-of-contents generation.
- Make headings navigable.
- Preserve chapter and section numbering.

Do not infer headings solely from text length or capitalization.

Use parser-provided structural information, font metadata and contextual signals.

---

## 19.7 Lists and Blockquotes

### Lists

- Preserve ordered and unordered list types.
- Preserve nesting.
- Maintain consistent indentation.
- Separate list items with appropriate spacing.
- Avoid merging multiple list items.

### Blockquotes

Display quotations with:

- Subtle background.
- Left accent border.
- Comfortable internal padding.
- Slightly differentiated typography.
- Proper quotation spacing.

Preserve the exact source wording.

---

## 19.8 Tables

Tables must remain readable and structured.

Requirements:

- Preserve row and column relationships.
- Preserve header cells.
- Support horizontal scrolling on small screens.
- Maintain cell padding.
- Use subtle row separators.
- Prevent text from overlapping.
- Preserve meaningful merged cells where extraction supports them.

Never convert a structured table into an unformatted block of text.

For complex tables, provide a scrollable container or accessible alternative.

---

## 19.9 Images, Figures and Captions

Preserve extracted document images and their relationships with surrounding text.

Requirements:

- Maintain aspect ratio.
- Avoid image distortion.
- Center figures where appropriate.
- Preserve captions.
- Preserve figure numbering.
- Support zooming for diagrams and illustrations.
- Retain source page references.

Do not insert arbitrary stock imagery into extracted documents.

---

## 19.10 Page and Section Navigation

The reading interface must maintain the connection between extracted content and the original PDF.

Every structured block should retain:

- Document ID.
- Original page number.
- Block ID.
- Section identifier.
- Reading order.
- Source bounding box where available.

When the user clicks a citation or a section reference:

1. Identify the original source page.
2. Navigate to that page in the original PDF.
3. Highlight the relevant source region when coordinates are available.

Do not invent page numbers or source locations.

---

## 19.11 Reading Layout

Create a dedicated reading container.

### Desktop

- Center the reading column.
- Use a maximum content width of approximately 740px.
- Maintain generous horizontal margins.
- Keep paragraph spacing consistent.
- Avoid stretching text across the entire viewport.
- Maintain clear separation between reading content and side panels.

### Mobile

- Use the full available reading width.
- Maintain 20–24px horizontal padding.
- Reduce heading sizes proportionally.
- Prevent horizontal overflow.
- Make tables independently scrollable.
- Keep images responsive.
- Maintain comfortable line height.
- Support portrait and landscape orientations.

The reading experience must remain usable when the AI sidebar is collapsed or opened.

---

## 19.12 Reading Preferences

Provide a reading settings panel.

Support:

- Font family: Serif / Sans-serif.
- Font size: Small / Medium / Large / Extra large.
- Line spacing: Compact / Comfortable / Relaxed.
- Content width: Narrow / Standard / Wide.
- Theme: Light / Dark / Sepia.

Persist reading preferences per user.

Changing reading preferences must update presentation only, not modify the original extracted document.

---

## 19.13 Extraction Quality and Validation

Implement extraction quality checks before rendering.

Detect:

- Missing text.
- Duplicated paragraphs.
- Incorrect reading order.
- Broken words.
- Unrecognized headings.
- Missing tables.
- Incorrect page associations.
- OCR artifacts.

Where extraction quality is uncertain, retain the original source and allow access to the PDF.

Never silently discard content to make the page look cleaner.

For scanned documents, use OCR when necessary.

Where possible, provide an indication that a document was OCR-processed.

---

## 19.14 Frontend Implementation

Build reusable rendering components.

Suggested structure:

```text
src/
├── components/
│   └── document-reader/
│       ├── DocumentReader.jsx
│       ├── DocumentHeader.jsx
│       ├── DocumentContent.jsx
│       ├── DocumentSection.jsx
│       ├── DocumentParagraph.jsx
│       ├── DocumentHeading.jsx
│       ├── DocumentList.jsx
│       ├── DocumentBlockquote.jsx
│       ├── DocumentTable.jsx
│       ├── DocumentFigure.jsx
│       ├── DocumentCodeBlock.jsx
│       ├── ReadingToolbar.jsx
│       ├── ReadingSettings.jsx
│       └── TableOfContents.jsx
│
├── services/
│   └── document/
│       ├── document-normalizer.service.js
│       ├── document-structure.service.js
│       └── document-rendering.service.js
│
└── styles/
    └── document-reader.css
```

Adapt this structure to the existing project conventions instead of duplicating existing components.

Use semantic HTML.

If rendering Markdown, use a safe Markdown renderer and sanitize untrusted content.

Do not use raw HTML injection for extracted document content.

---

## 19.15 Performance

- Render long documents efficiently.
- Use lazy loading for images.
- Avoid unnecessary component re-renders.
- Support large PDFs.
- Consider virtualized rendering for exceptionally long extracted documents.
- Preserve reading position when content is updated.
- Cache normalized document structures.
- Avoid re-running OCR when an unchanged document has already been processed.
- Keep rendering preferences separate from document data.

---

## 19.16 Definition of Done

- [x] PDF paragraphs are properly separated.
- [x] Headings have consistent hierarchy.
- [x] Lists preserve numbering and nesting.
- [ ] Quotations are visually differentiated.
- [x] Tables remain readable.
- [x] Images preserve aspect ratios.
- [x] Document content has comfortable line spacing.
- [ ] Content width is controlled.
- [ ] Page references remain accurate.
- [ ] Table of contents works.
- [ ] Original document remains accessible.
- [ ] Reading preferences persist.
- [ ] Dark and light themes work.
- [x] Mobile reading is comfortable.
- [x] Long documents remain performant.
- [x] No source content is silently removed.

---

## 19.17 Final Design Standard

Clarity must deliver a reading experience comparable to a professional digital book reader.

Use the following principles:

1. Content readability comes before decorative UI.
2. Typography must establish a clear hierarchy.
3. White space must separate ideas, not waste screen space.
4. Paragraphs must be comfortable to scan.
5. Long-form reading must not feel like reading a raw text editor.
6. The document structure must remain faithful to the original source.
7. AI-generated explanations and extracted source content must be visually distinguishable.

**Success criterion:**

A user uploading a 300-page textbook should be able to read the extracted version comfortably for extended periods, navigate chapters, understand the document hierarchy, select passages, ask AI questions and return to their previous reading position without losing progress.
