import { afterEach, expect, it, vi } from 'vitest';
import { recognizePdfPages } from './orchestrator';
import { classifyPdfPage } from './classifier';
import { createOcrScheduler } from './scheduler';
import type {
  DocumentPage,
  OcrEngine,
  OcrRenderer,
  OcrSession,
} from './contract';
import { defaultLimits } from '../policy/limits';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const image = {
  encoding: 'png' as const,
  bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]),
  width: 10,
  height: 10,
  dpi: 200,
};
const render: OcrRenderer = async () => image;
const page = (pageNumber: number, text = ''): DocumentPage => ({
  pageNumber,
  text,
  source: 'native',
  classification: classifyPdfPage(text, 20),
});
const engine = (
  recognize: OcrSession['recognize'] = async () => ({ text: 'Recognized' }),
  terminate = vi.fn(),
): OcrEngine => ({
  id: 'test',
  kind: 'local',
  uploadsData: false,
  createSession: () => ({ recognize, terminate }),
});
afterEach(() => vi.useRealTimers());

it('classifies short text as a candidate, never as proof of a scan or an empty page', () => {
  expect(classifyPdfPage('Invoice #2', 20)).toBe('ocr-candidate');
  expect(classifyPdfPage('A sufficiently long native text layer.')).toBe(
    'native',
  );
  expect(() => classifyPdfPage('', -1)).toThrow(RangeError);
});
it('keeps native pages and merges concurrent OCR in page order with provenance', async () => {
  const native = page(1, 'A sufficiently long native text layer.');
  const result = await recognizePdfPages(
    [native, page(2, 'short'), page(3)],
    {
      engine: engine(async ({ pageNumber }) => {
        await new Promise((resolve) =>
          setTimeout(resolve, pageNumber === 2 ? 15 : 1),
        );
        return {
          text: `Page ${pageNumber}`,
          confidence: 0.9,
          blocks: [{ text: 'Word', bbox: { x: 0, y: 0, w: 0.5, h: 0.5 } }],
        };
      }),
      concurrency: 2,
      scheduler: createOcrScheduler(2),
    },
    render,
    defaultLimits,
    new AbortController().signal,
  );
  expect(result.raw).toBe(`${native.text}\n\nPage 2\n\nPage 3`);
  expect(result.pages[0]).toEqual(native);
  expect(result.pages[1]).toMatchObject({
    source: 'ocr:test',
    nativeText: 'short',
    confidence: 0.9,
  });
  expect(result.ocr).toMatchObject({
    state: 'done',
    pagesProcessed: 2,
    pagesSkipped: 0,
  });
});
it('requires affirmative approval for nonlocal engines even when they declare no uploads', async () => {
  const createSession = vi.fn();
  const renderer = vi.fn(render);
  const result = await recognizePdfPages(
    [page(1, 'short')],
    {
      engine: {
        id: 'remote',
        kind: 'server',
        uploadsData: false,
        createSession,
      },
      trigger: 'auto',
    },
    renderer,
    defaultLimits,
    new AbortController().signal,
  );
  expect(result.ocr.state).toBe('denied');
  expect(result.raw).toBe('short');
  expect(createSession).not.toHaveBeenCalled();
  expect(renderer).not.toHaveBeenCalled();
});
it('ask also gates local OCR and approval cancellation never starts an engine', async () => {
  const abort = new AbortController();
  const createSession = vi.fn();
  const waiting = recognizePdfPages(
    [page(1)],
    {
      engine: { ...engine(), createSession },
      trigger: 'ask',
      requestApproval: () => new Promise(() => {}),
    },
    render,
    defaultLimits,
    abort.signal,
  );
  abort.abort();
  await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });
  expect(createSession).not.toHaveBeenCalled();
});
it('terminates a timed-out page even when recognition ignores abort, and preserves native text', async () => {
  vi.useFakeTimers();
  const terminate = vi.fn();
  const result = recognizePdfPages(
    [page(1, 'short')],
    {
      engine: engine(() => new Promise(() => {}), terminate),
      pageTimeoutMs: 25,
    },
    render,
    defaultLimits,
    new AbortController().signal,
  );
  await vi.advanceTimersByTimeAsync(30);
  expect((await result).pages[0]).toMatchObject({
    text: 'short',
    error: { code: 'ocr-timeout' },
  });
  expect((await result).ocr).toMatchObject({ state: 'failed', pagesFailed: 1 });
  expect(terminate).toHaveBeenCalledOnce();
});
it('ignores late recognition after caller abort and releases the owned session', async () => {
  const abort = new AbortController();
  const terminate = vi.fn();
  let finish!: (value: { text: string }) => void;
  const entered = deferred();
  const result = recognizePdfPages(
    [page(1)],
    {
      engine: engine(() => {
        entered.resolve();
        return new Promise((resolve) => {
          finish = resolve;
        });
      }, terminate),
    },
    render,
    defaultLimits,
    abort.signal,
  );
  const rejection = expect(result).rejects.toMatchObject({
    name: 'AbortError',
  });
  await entered.promise;
  abort.abort();
  finish({ text: 'Late result' });
  await rejection;
  expect(terminate).toHaveBeenCalledOnce();
});
it('uses skip/fail policies and never replaces native text with empty OCR output', async () => {
  const options = { engine: engine(async () => ({ text: '' })) };
  const partial = await recognizePdfPages(
    [page(1, 'short')],
    options,
    render,
    defaultLimits,
    new AbortController().signal,
  );
  expect(partial.raw).toBe('short');
  expect(partial.pages[0]?.error?.code).toBe('ocr-page-failed');
  await expect(
    recognizePdfPages(
      [page(1)],
      { ...options, onPageError: 'fail' },
      render,
      defaultLimits,
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ code: 'ocr-page-failed' });
});
it('caps selected OCR pages without changing the native document page cap', async () => {
  const result = await recognizePdfPages(
    [page(1), page(2), page(3)],
    { engine: engine(), maxPages: 1 },
    render,
    defaultLimits,
    new AbortController().signal,
  );
  expect(result.ocr).toMatchObject({
    state: 'partial',
    pagesProcessed: 1,
    pagesSkipped: 2,
  });
  expect(result.warnings[0]?.code).toBe('ocr-limit-exceeded');
});
it('rejects oversized images before creating sessions and invalid engine output before merging', async () => {
  const createSession = vi.fn();
  const result = await recognizePdfPages(
    [page(1)],
    { engine: { ...engine(), createSession } },
    async () => ({ ...image, width: 10_000_000 }),
    defaultLimits,
    new AbortController().signal,
  );
  expect(result.pages[0]?.error?.code).toBe('ocr-limit-exceeded');
  expect(createSession).not.toHaveBeenCalled();
  const invalid = await recognizePdfPages(
    [page(1)],
    { engine: engine(async () => ({ text: 'data', confidence: 90 })) },
    render,
    defaultLimits,
    new AbortController().signal,
  );
  expect(invalid.pages[0]?.source).toBe('native');
  expect(invalid.pages[0]?.error?.code).toBe('ocr-page-failed');
});
it('counts native and OCR text together and validates normalized bounding boxes', async () => {
  const result = await recognizePdfPages(
    [page(1, 'native'), page(2)],
    { engine: engine(async () => ({ text: 'recognized' })) },
    render,
    { ...defaultLimits, maxExtractedCharacters: 10 },
    new AbortController().signal,
  );
  expect(result.raw.length).toBeLessThanOrEqual(10);
  expect(
    result.warnings.some((warning) => warning.code === 'ocr-limit-exceeded'),
  ).toBe(true);
  const invalid = await recognizePdfPages(
    [page(1)],
    {
      engine: engine(async () => ({
        text: 'recognized',
        blocks: [{ text: 'x', bbox: { x: 0.9, y: 0, w: 0.5, h: 0.1 } }],
      })),
    },
    render,
    defaultLimits,
    new AbortController().signal,
  );
  expect(invalid.pages[0]?.error?.code).toBe('ocr-page-failed');
});
it('total deadlines abort queued work before it can allocate an engine', async () => {
  vi.useFakeTimers();
  const scheduler = createOcrScheduler(1);
  const blocker = new AbortController();
  const entered = deferred();
  const release = deferred();
  const occupied = scheduler.run(async () => {
    entered.resolve();
    await release.promise;
  }, blocker.signal);
  await entered.promise;
  const createSession = vi.fn();
  const result = recognizePdfPages(
    [page(1)],
    { engine: { ...engine(), createSession }, scheduler, totalTimeoutMs: 20 },
    render,
    defaultLimits,
    new AbortController().signal,
  );
  await vi.advanceTimersByTimeAsync(25);
  expect((await result).ocr.state).toBe('failed');
  expect(createSession).not.toHaveBeenCalled();
  release.resolve();
  await occupied;
});
