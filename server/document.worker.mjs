import { parentPort, workerData } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import mammoth from 'mammoth';

/**
 * Group pdfjs text items into paragraphs using spatial heuristics.
 * Items with a large vertical gap between them are treated as paragraph breaks.
 * This preserves structure far better than the flat join approach.
 */
function groupItemsIntoParagraphs(items) {
  if (items.length === 0) return [];

  const paragraphs = [];
  let currentLines = [];
  let prevY = null;
  let prevHeight = 12; // fallback font height

  for (const item of items) {
    if (!('str' in item) || typeof item.str !== 'string') continue;
    const str = item.str;
    const height = item.height || prevHeight;
    const y = Array.isArray(item.transform) ? item.transform[5] : null;

    if (prevY !== null && y !== null) {
      const gap = prevY - y; // positive = moving down the page
      const isNewParagraph = gap > prevHeight * 1.4; // gap > 1.4× line height = paragraph break
      if (isNewParagraph && currentLines.length > 0) {
        const paraText = currentLines.join(' ').replace(/\s+/g, ' ').trim();
        if (paraText) paragraphs.push(paraText);
        currentLines = [];
      }
    }

    if (str.trim()) currentLines.push(str);
    if (y !== null) prevY = y;
    if (height > 0) prevHeight = height;
  }

  if (currentLines.length > 0) {
    const paraText = currentLines.join(' ').replace(/\s+/g, ' ').trim();
    if (paraText) paragraphs.push(paraText);
  }

  return paragraphs;
}

async function extractPdf(filePath) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = await readFile(filePath);
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true }).promise;
  const sections = [];
  const outline = [];
  const markdownParts = [];
  let lowTextPages = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const paragraphs = groupItemsIntoParagraphs(content.items);
    const hasText = paragraphs.some((p) => p.length >= 10);
    if (!hasText) lowTextPages += 1;

    const sectionId = `page-${pageNumber}`;
    sections.push({
      id: sectionId,
      title: `Page ${pageNumber}`,
      level: 2,
      page: pageNumber,
      paragraphs: hasText
        ? paragraphs.map((text, index) => ({ id: `page-${pageNumber}-p${index}`, text, page: pageNumber }))
        : [{ id: `page-${pageNumber}-p0`, text: '[No extractable text found on this page.]', page: pageNumber }],
    });

    const pageMarkdown = hasText
      ? paragraphs.join('\n\n')
      : '_No extractable text found on this page._';
    markdownParts.push(`# Page ${pageNumber}\n\n${pageMarkdown}`);
  }

  if (pdf.numPages > 0) {
    outline.push({ id: 'outline-pages', level: 1, title: 'Pages', sectionId: 'page-1' });
  }

  return {
    type: 'pdf',
    totalPages: pdf.numPages,
    outline,
    sections,
    markdown: markdownParts.join('\n\n'),
    metadata: {
      extractionEngine: 'pdfjs-dist',
      lowTextPages,
      ocrRequired: lowTextPages > 0,
      limitations: lowTextPages > 0
        ? ['Some pages contain little or no extractable text and may require OCR.']
        : ['Basic paragraph structure preserved. Tables, multi-column layouts and figures may not render correctly.'],
    },
  };
}

async function extractDocx(filePath) {
  const result = await mammoth.convertToHtml({ path: filePath });
  const html = result.value;
  const cleanText = (value) => value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  const sections = [];
  const outline = [];
  let currentSection = null;
  let paragraphIndex = 0;

  const ensureDocumentSection = () => {
    if (!currentSection) {
      currentSection = { id: 'section-1', title: 'Document', level: 1, paragraphs: [] };
      sections.push(currentSection);
    }
  };

  const blocks = html.match(/<(h[1-3]|p|blockquote|ul|ol|table|pre)\b[^>]*>[\s\S]*?<\/\1>/gi) || [];
  for (const block of blocks) {
    const headingMatch = block.match(/^<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
    if (headingMatch) {
      const title = cleanText(headingMatch[2]);
      if (!title) continue;
      const level = Number(headingMatch[1]);
      const sectionId = `section-${sections.length + 1}`;
      currentSection = { id: sectionId, title, level, paragraphs: [] };
      sections.push(currentSection);
      outline.push({ id: `outline-${outline.length + 1}`, level, title, sectionId });
      continue;
    }

    ensureDocumentSection();
    paragraphIndex += 1;

    if (/^<blockquote/i.test(block)) {
      currentSection.paragraphs.push({ id: `paragraph-${paragraphIndex}`, kind: 'blockquote', text: cleanText(block) });
    } else if (/^<(ul|ol)/i.test(block)) {
      const kind = /^<ol/i.test(block) ? 'numbered-list' : 'bulleted-list';
      const items = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => cleanText(match[1])).filter(Boolean);
      if (items.length > 0) {
        currentSection.paragraphs.push({ id: `paragraph-${paragraphIndex}`, kind, text: '', items });
      }
    } else if (/^<table/i.test(block)) {
      const rows = [...block.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
        [...row[1].matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi)].map((cell) => cleanText(cell[2])));
      const hasHeaders = /<th/i.test(block);
      currentSection.paragraphs.push({
        id: `paragraph-${paragraphIndex}`,
        kind: 'table',
        text: '',
        headers: hasHeaders ? rows[0] : undefined,
        rows: hasHeaders ? rows.slice(1) : rows,
      });
    } else if (/^<pre/i.test(block)) {
      currentSection.paragraphs.push({ id: `paragraph-${paragraphIndex}`, kind: 'code', text: cleanText(block) });
    } else {
      const text = cleanText(block);
      if (text) currentSection.paragraphs.push({ id: `paragraph-${paragraphIndex}`, text });
    }
  }

  if (sections.length === 0) {
    sections.push({ id: 'section-1', title: 'Document', level: 1, paragraphs: [] });
  }
  const markdown = sections.map((section) => {
    const heading = `${'#'.repeat(section.level || 1)} ${section.title || ''}`;
    const body = section.paragraphs.map((paragraph) => paragraph.items?.join('\n') || paragraph.text).filter(Boolean).join('\n\n');
    return `${heading}\n\n${body}`;
  }).join('\n\n');

  return {
    type: 'docx',
    totalPages: undefined,
    outline,
    sections,
    markdown,
    metadata: {
      extractionEngine: 'mammoth',
      ocrRequired: false,
      mammothMessages: result.messages.map((message) => message.message),
      limitations: ['Complex tables, floating figures and advanced Word layout may not preserve their visual structure.'],
    },
  };
}

try {
  const extracted = workerData.type === 'pdf'
    ? await extractPdf(workerData.filePath)
    : await extractDocx(workerData.filePath);
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });
  const textChunks = await splitter.splitText(extracted.markdown);
  const chunks = textChunks.map((text, index) => ({
    id: `${workerData.documentId}-chunk-${index + 1}`,
    documentId: workerData.documentId,
    chunkIndex: index,
    text,
    pageStart: extracted.type === 'pdf' ? 1 : null,
    pageEnd: extracted.type === 'pdf' ? extracted.totalPages : null,
    heading: null,
    section: null,
  }));
  parentPort.postMessage({ ok: true, extracted, chunks });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: error instanceof Error ? error.message : 'Document processing failed.',
  });
}
