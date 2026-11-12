import { IngestionError } from '../errors/codes';
import type { DocumentWarning } from '../errors/codes';
import type { Limits } from '../policy/limits';
import type {
  DocumentPage,
  DocumentProgress,
  OcrImage,
  OcrApproval,
  OcrOptions,
  OcrOutput,
  OcrPageResult,
  OcrRenderer,
  OcrSession,
  OcrSummary,
} from './contract';
import { abortable, throwIfAborted } from './abort';
import { defaultOcrScheduler } from './scheduler';

function integer(
  value: number | undefined,
  fallback: number,
  name: string,
  max = Number.MAX_SAFE_INTEGER,
) {
  const number = value ?? fallback;
  if (!Number.isSafeInteger(number) || number < 1 || number > max)
    throw new RangeError(
      `${name} must be a positive safe integer up to ${max}.`,
    );
  return number;
}
export function resolveOcrOptions(options: OcrOptions, limits: Limits) {
  if (
    !options.engine.id.trim() ||
    typeof options.engine.createSession !== 'function' ||
    !['local', 'server', 'hosted'].includes(options.engine.kind) ||
    typeof options.engine.uploadsData !== 'boolean'
  )
    throw new TypeError('Invalid OCR engine.');
  if (
    options.trigger !== undefined &&
    !['off', 'ask', 'auto'].includes(options.trigger)
  )
    throw new TypeError('Invalid OCR trigger.');
  if (
    options.onPageError !== undefined &&
    !['skip', 'fail'].includes(options.onPageError)
  )
    throw new TypeError('Invalid OCR page error policy.');
  return {
    maxPages: integer(
      options.maxPages,
      Math.min(20, limits.maxDocumentPages),
      'maxPages',
      limits.maxDocumentPages,
    ),
    pageTimeoutMs: integer(
      options.pageTimeoutMs,
      30_000,
      'pageTimeoutMs',
      2_147_483_647,
    ),
    totalTimeoutMs: integer(
      options.totalTimeoutMs,
      120_000,
      'totalTimeoutMs',
      2_147_483_647,
    ),
    approvalTimeoutMs: integer(
      options.approvalTimeoutMs,
      60_000,
      'approvalTimeoutMs',
      2_147_483_647,
    ),
    concurrency: integer(options.concurrency, 1, 'concurrency', 4),
    dpi: integer(options.dpi, 200, 'dpi', 600),
    maxImagePixels: integer(
      options.maxImagePixels,
      Math.min(16_000_000, limits.maxImagePixels),
      'maxImagePixels',
      limits.maxImagePixels,
    ),
    maxImageBytes: integer(
      options.maxImageBytes,
      20_000_000,
      'maxImageBytes',
      100_000_000,
    ),
    maxBlocksPerPage: integer(
      options.maxBlocksPerPage,
      5_000,
      'maxBlocksPerPage',
      50_000,
    ),
  };
}
function terminate(session: OcrSession | undefined) {
  if (!session) return;
  try {
    void Promise.resolve(session.terminate()).catch(() => {});
  } catch {
    /* Preserve the operation's original outcome. */
  }
}
function childSignal(parent: AbortSignal, timeout: number, message: string) {
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  parent.addEventListener('abort', abort, { once: true });
  if (parent.aborted) abort();
  const timer = setTimeout(
    () => controller.abort(new IngestionError('ocr-timeout', message)),
    timeout,
  );
  return {
    signal: controller.signal,
    abort: (reason: unknown) => controller.abort(reason),
    close() {
      clearTimeout(timer);
      parent.removeEventListener('abort', abort);
    },
  };
}
function imageValid(
  image: OcrImage,
  options: ReturnType<typeof resolveOcrOptions>,
): boolean {
  return (
    image.encoding === 'png' &&
    (image.rotation === undefined ||
      [0, 90, 180, 270].includes(image.rotation)) &&
    image.bytes instanceof Uint8Array &&
    image.bytes.length > 8 &&
    image.bytes.length <= options.maxImageBytes &&
    image.bytes[0] === 137 &&
    image.bytes[1] === 80 &&
    image.bytes[2] === 78 &&
    image.bytes[3] === 71 &&
    Number.isSafeInteger(image.width) &&
    Number.isSafeInteger(image.height) &&
    image.width > 0 &&
    image.height > 0 &&
    image.width * image.height <= options.maxImagePixels &&
    image.dpi === options.dpi
  );
}
function validateResult(
  result: OcrPageResult,
  maxText: number,
  maxBlocks: number,
) {
  const confidence = (value: number | undefined) =>
    value === undefined || (Number.isFinite(value) && value >= 0 && value <= 1);
  if (
    !result ||
    typeof result.text !== 'string' ||
    result.text.length > maxText
  )
    throw new IngestionError(
      'ocr-limit-exceeded',
      'OCR output exceeded the text limit.',
    );
  if (
    !confidence(result.confidence) ||
    (result.blocks !== undefined &&
      (!Array.isArray(result.blocks) || result.blocks.length > maxBlocks))
  )
    throw new IngestionError(
      'ocr-page-failed',
      'OCR output contains invalid confidence or blocks.',
    );
  let length = 0;
  const blocks = result.blocks?.map((block) => {
    if (typeof block.text !== 'string' || !confidence(block.confidence))
      throw new IngestionError('ocr-page-failed', 'Invalid OCR block.');
    length += block.text.length;
    if (length > maxText)
      throw new IngestionError(
        'ocr-limit-exceeded',
        'OCR blocks exceeded the text limit.',
      );
    const box = block.bbox;
    if (
      box &&
      (![box.x, box.y, box.w, box.h].every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1,
      ) ||
        box.x + box.w > 1.000001 ||
        box.y + box.h > 1.000001)
    )
      throw new IngestionError(
        'ocr-page-failed',
        'OCR bounding boxes must be normalized to the rendered page.',
      );
    if (
      block.kind !== undefined &&
      !['paragraph', 'line', 'word', 'table'].includes(block.kind)
    )
      throw new IngestionError('ocr-page-failed', 'Invalid OCR block kind.');
    return {
      text: block.text,
      ...(box ? { bbox: { x: box.x, y: box.y, w: box.w, h: box.h } } : {}),
      ...(block.kind ? { kind: block.kind } : {}),
      ...(block.confidence === undefined
        ? {}
        : { confidence: block.confidence }),
    };
  });
  return {
    text: result.text,
    ...(result.confidence === undefined
      ? {}
      : { confidence: result.confidence }),
    ...(blocks ? { blocks } : {}),
  };
}

export async function recognizePdfPages(
  nativePages: readonly DocumentPage[],
  options: OcrOptions,
  render: OcrRenderer,
  limits: Limits,
  signal: AbortSignal,
  report: (progress: DocumentProgress) => void = () => {},
  document?: OcrApproval['document'],
): Promise<OcrOutput> {
  throwIfAborted(signal);
  if (
    nativePages.length > limits.maxDocumentPages ||
    nativePages.some(
      (page, index) =>
        page.pageNumber !== index + 1 ||
        typeof page.text !== 'string' ||
        !['native', 'ocr-candidate'].includes(page.classification),
    )
  ) {
    throw new IngestionError(
      'invalid-document',
      'OCR requires ordered, numbered PDF page text.',
    );
  }
  const config = resolveOcrOptions(options, limits);
  const pages: DocumentPage[] = nativePages.map((page) => ({ ...page }));
  const candidates = pages
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => page.classification === 'ocr-candidate');
  const warnings: DocumentWarning[] = [];
  const summary = {
    engineId: options.engine.id,
    state: 'off' as OcrSummary['state'],
    pagesAttempted: 0,
    pagesProcessed: 0,
    pagesSkipped: candidates.length,
    pagesFailed: 0,
  };
  let length = pages.map((page) => page.text).join('\n\n').length;
  if (length > limits.maxExtractedCharacters)
    throw new IngestionError(
      'too-large',
      'Native PDF text exceeds the extraction limit.',
    );
  const output = (): OcrOutput => ({
    raw: pages.map((page) => page.text).join('\n\n'),
    pages,
    ocr: summary,
    warnings,
  });
  const uploadsData =
    options.engine.kind !== 'local' || options.engine.uploadsData;
  const trigger = options.trigger ?? (uploadsData ? 'ask' : 'auto');
  if (!candidates.length || trigger === 'off') return output();
  if (trigger === 'ask' || uploadsData) {
    report({ phase: 'pending-consent', done: 0, total: candidates.length });
    const approval = childSignal(
      signal,
      config.approvalTimeoutMs,
      'OCR approval timed out.',
    );
    let approved = false;
    try {
      approved = options.requestApproval
        ? (await abortable(
            () =>
              options.requestApproval!({
                engineId: options.engine.id,
                ...(document ? { document } : {}),
                uploadsData,
                pageNumbers: Object.freeze(
                  candidates
                    .slice(0, config.maxPages)
                    .map(({ page }) => page.pageNumber),
                ),
                signal: approval.signal,
              }),
            approval.signal,
          )) === true
        : false;
    } catch (error) {
      throwIfAborted(signal);
      if (error instanceof IngestionError && error.code === 'ocr-timeout')
        warnings.push({ code: 'ocr-timeout', message: error.message });
      else
        warnings.push({
          code: 'ocr-consent-denied',
          message: 'OCR approval could not be obtained.',
        });
    } finally {
      approval.close();
    }
    throwIfAborted(signal);
    if (!approved) {
      summary.state = 'denied';
      warnings.push({
        code: 'ocr-consent-denied',
        message: 'OCR was not approved. Available native text was preserved.',
      });
      return output();
    }
  }
  const selected = candidates.slice(0, config.maxPages);
  if (selected.length < candidates.length)
    warnings.push({
      code: 'ocr-limit-exceeded',
      message: `OCR is limited to ${config.maxPages} candidate pages. Other native page text was preserved.`,
    });
  const operation = childSignal(
    signal,
    config.totalTimeoutMs,
    'The total OCR deadline was exceeded.',
  );
  const scheduler = options.scheduler ?? defaultOcrScheduler;
  let next = 0;
  let completed = 0;
  let fatal: unknown;
  summary.state = 'done';
  const failPage = (index: number, error: unknown) => {
    const failure =
      error instanceof IngestionError
        ? error
        : new IngestionError(
            'ocr-page-failed',
            'The OCR page could not be processed.',
          );
    pages[index] = {
      ...pages[index]!,
      error: { code: failure.code, message: failure.message },
    };
    summary.pagesFailed++;
    warnings.push({
      code:
        failure.code === 'ocr-timeout' ||
        failure.code === 'ocr-limit-exceeded' ||
        failure.code === 'ocr-unavailable'
          ? failure.code
          : 'ocr-page-failed',
      message: `Page ${pages[index]!.pageNumber}: ${failure.message}`,
    });
    if (options.onPageError === 'fail') {
      fatal = failure;
      operation.abort(failure);
    }
  };
  try {
    await Promise.all(
      Array.from(
        { length: Math.min(config.concurrency, selected.length) },
        async () => {
          try {
            await scheduler.run(async () => {
              let session: OcrSession | undefined;
              try {
                while (next < selected.length && !operation.signal.aborted) {
                  const { page, index } = selected[next++]!;
                  summary.pagesAttempted++;
                  summary.pagesSkipped--;
                  const pageRun = childSignal(
                    operation.signal,
                    config.pageTimeoutMs,
                    `OCR page ${page.pageNumber} timed out.`,
                  );
                  const stop = () => {
                    terminate(session);
                    session = undefined;
                  };
                  pageRun.signal.addEventListener('abort', stop, {
                    once: true,
                  });
                  try {
                    report({
                      phase: 'ocr',
                      done: completed,
                      total: selected.length,
                      pageNumber: page.pageNumber,
                    });
                    const image = await abortable(
                      () =>
                        render({
                          pageNumber: page.pageNumber,
                          dpi: config.dpi,
                          maxPixels: config.maxImagePixels,
                          maxBytes: config.maxImageBytes,
                          signal: pageRun.signal,
                        }),
                      pageRun.signal,
                    );
                    if (!imageValid(image, config))
                      throw new IngestionError(
                        'ocr-limit-exceeded',
                        'The OCR renderer returned an invalid or oversized PNG.',
                      );
                    if (!session) {
                      report({
                        phase: 'initializing-ocr',
                        done: completed,
                        total: selected.length,
                        pageNumber: page.pageNumber,
                      });
                      try {
                        session = options.engine.createSession();
                      } catch {
                        throw new IngestionError(
                          'ocr-unavailable',
                          'The OCR session could not be created.',
                        );
                      }
                      if (session.initialize)
                        await abortable(
                          () => session!.initialize!(pageRun.signal),
                          pageRun.signal,
                        );
                    }
                    report({
                      phase: 'ocr',
                      done: completed,
                      total: selected.length,
                      pageNumber: page.pageNumber,
                    });
                    const current = session;
                    const result = validateResult(
                      await abortable(
                        () =>
                          current.recognize({
                            ...image,
                            pageNumber: page.pageNumber,
                            signal: pageRun.signal,
                          }),
                        pageRun.signal,
                      ),
                      limits.maxExtractedCharacters,
                      config.maxBlocksPerPage,
                    );
                    throwIfAborted(pageRun.signal);
                    if (!result.text.trim())
                      throw new IngestionError(
                        'ocr-page-failed',
                        'No text was recognized; the candidate may be blank. Native text was preserved.',
                      );
                    const newLength =
                      length - page.text.length + result.text.length;
                    if (newLength > limits.maxExtractedCharacters)
                      throw new IngestionError(
                        'ocr-limit-exceeded',
                        'Combined native and OCR text exceeds the extraction limit.',
                      );
                    length = newLength;
                    pages[index] = {
                      ...page,
                      ...result,
                      source: `ocr:${options.engine.id}`,
                      ...(page.text ? { nativeText: page.text } : {}),
                    };
                    summary.pagesProcessed++;
                  } catch (error) {
                    stop();
                    if (signal.aborted) throw error;
                    failPage(index, error);
                  } finally {
                    pageRun.signal.removeEventListener('abort', stop);
                    pageRun.close();
                    completed++;
                    if (!operation.signal.aborted)
                      report({
                        phase: 'ocr',
                        done: completed,
                        total: selected.length,
                        pageNumber: page.pageNumber,
                      });
                  }
                }
              } finally {
                terminate(session);
              }
            }, operation.signal);
          } catch (error) {
            if (!operation.signal.aborted) {
              fatal = error;
              operation.abort(error);
            }
          }
        },
      ),
    );
    throwIfAborted(signal);
    if (fatal) throw fatal;
    if (operation.signal.aborted) {
      if (options.onPageError === 'fail') throw operation.signal.reason;
      warnings.push({
        code: 'ocr-timeout',
        message:
          'OCR stopped at its total deadline. Available text was preserved.',
      });
    }
    summary.state =
      summary.pagesProcessed === 0
        ? 'failed'
        : summary.pagesFailed ||
            summary.pagesSkipped ||
            operation.signal.aborted
          ? 'partial'
          : 'done';
    return output();
  } finally {
    operation.close();
  }
}
