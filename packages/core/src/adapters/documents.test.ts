import { readFile } from 'node:fs/promises';
import { expect, it, vi } from 'vitest';
import { createPdfAdapter } from './pdf';
import { processDocument } from '../process';
import { createContent } from '../content/schema';
import { createHighlightModel } from '../editing/highlight-model';
import { serializeContent, deserializeContent } from '../content/serialization';

async function fixture(name: string) {
  const bytes = await readFile(
    new URL(`../../../../tests/fixtures/${name}`, import.meta.url),
  );
  return new File([bytes], name);
}

it('keeps TXT literal, preserves source and limits only the preview', async () => {
  const text = '# Not a heading\n<script>literal</script>\n001';
  const document = await processDocument(new File([text], 'note.TXT'), {
    maxPreviewCharacters: 10,
  });
  expect(document.status).toBe('ready');
  expect(document.format).toBe('text');
  expect(document.raw).toBe(text);
  expect(document.getPreview!().nodes).toEqual([
    { type: 'code', value: text.slice(0, 10) },
  ]);
  expect(document.getPreview!().truncated).toBe(true);
  const content = createContent(text, { format: 'text' });
  expect(deserializeContent(serializeContent(content))).toEqual(content);
  expect(createHighlightModel(text, { format: 'text' }).tokens).toEqual([]);
});

it.each(['pdf', 'docx'])(
  'extracts %s text, keeps the file and caches a bounded preview',
  async (format) => {
    const file = await fixture(`document.${format}`);
    const document = await processDocument(file, { maxPreviewCharacters: 5 });
    expect(document.error).toBeUndefined();
    expect(document.status).toBe('ready');
    expect(document.format).toBe(format);
    expect(document.file).toBe(file);
    if (format === 'pdf') {
      expect(document.pages?.[0]).toMatchObject({
        pageNumber: 1,
        source: 'native',
      });
      expect(Object.isFrozen(document.pages?.[0])).toBe(true);
    }
    expect(document.raw).toContain(`Hello from ${format.toUpperCase()}`);
    expect(document.getPreview!().nodes[0]?.value).toBe('Hello');
    expect(document.getPreview!().truncated).toBe(true);
    expect(document.getPreview!()).toBe(document.getPreview!());
    expect(
      (await processDocument(file, { maxExtractedCharacters: 4 })).error?.code,
    ).toBe('too-large');
    expect(
      (await processDocument(file, { acceptedFormats: ['markdown'] })).error
        ?.code,
    ).toBeDefined();
  },
);

it('preserves DOCX paragraph boundaries and decoded entities', async () => {
  const document = await processDocument(await fixture('document.docx'));
  expect(document.raw).toContain('Hello from DOCX\n\nSecond paragraph & more.');
});

it('warns when PDFs contain no text instead of inventing OCR content', async () => {
  const document = await processDocument(await fixture('scanned.pdf'));
  expect(document.status).toBe('ready');
  expect(document.raw).toBe('');
  expect(document.warnings[0]?.code).toBe('no-text');
});

it('detects PDF signatures without a filename', async () => {
  const file = await fixture('document.pdf');
  const document = await processDocument(new Blob([await file.arrayBuffer()]));
  expect(document.format).toBe('pdf');
  expect(document.raw).toContain('Hello from PDF');
});

it.each(['pdf', 'docx'])(
  'rejects damaged %s files with an actionable error',
  async (format) => {
    const document = await processDocument(
      new File(['not a document'], `broken.${format}`),
    );
    expect(document.status).toBe('error');
    expect(document.error?.code).toBe('invalid-document');
  },
);

it('limits expanded DOCX size before extracting text', async () => {
  const document = await processDocument(await fixture('document.docx'), {
    maxArchiveBytes: 100,
  });
  expect(document.error?.code).toBe('too-large');
});

it('rejects truncated binary documents after their signature passes', async () => {
  const pdf = await processDocument(new File(['%PDF-1.4\ninvalid'], 'bad.pdf'));
  expect(pdf.error?.code).toBe('invalid-document');
  const docx = await processDocument(
    new File([new Uint8Array([80, 75, 3, 4, 0])], 'bad.docx'),
  );
  expect(docx.error?.code).toBe('invalid-document');
});

it('keeps even a short native PDF text layer without starting OCR by default', async () => {
  const createSession = vi.fn();
  const document = await processDocument(await fixture('document.pdf'), {
    adapters: [
      createPdfAdapter({
        ocr: {
          engine: {
            id: 'test',
            kind: 'local',
            uploadsData: false,
            createSession,
          },
        },
      }),
    ],
  });
  expect(document.raw).toContain('Hello from PDF');
  expect(document.pages?.[0]?.source).toBe('native');
  expect(createSession).not.toHaveBeenCalled();
});
