import { parentPort, workerData } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import mammoth from 'mammoth';

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
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length < 40) lowTextPages += 1;
    const sectionId = `page-${pageNumber}`;
    sections.push({
      id: sectionId,
      title: `Page ${pageNumber}`,
      level: 2,
      paragraphs: text ? [{ id: `page-${pageNumber}-paragraph`, text }] : [{
        id: `page-${pageNumber}-paragraph`,
        text: '[No extractable text found on this page.]',
      }],
    });
    markdownParts.push(`# Page ${pageNumber}\n\n${text || '_No extractable text found on this page._'}`);
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
        : ['Tables, figures, columns and page layout may not preserve their visual structure.'],
    },
  };
}

async function extractDocx(filePath) {
  const result = await mammoth.convertToHtml({ path: filePath });
  const html = result.value;
  const text = html
    .replace(/<h([1-3])[^>]*>(.*?)<\/h\1>/gi, '\n<h>$2</h>\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const sections = text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((part, index) => ({
      id: `section-${index + 1}`,
      title: index === 0 ? 'Document' : undefined,
      level: index === 0 ? 1 : undefined,
      paragraphs: [{ id: `paragraph-${index + 1}`, text: part.replace(/<h>|<\/h>/g, '') }],
    }));
  const markdown = text.replace(/<h>(.*?)<\/h>/g, '## $1');
  const outline = [];
  const headingMatches = [...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)];
  headingMatches.forEach((match, index) => {
    outline.push({
      id: `outline-${index + 1}`,
      level: Math.min(3, (match[0].match(/^#+/)?.[0].length || 1)),
      title: match[1],
      sectionId: sections[index]?.id || sections[0]?.id,
    });
  });

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
