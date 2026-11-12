import { IngestionError } from '@texion/core';
import type { OcrEngine, OcrPageInput, OcrPageResult } from '@texion/core';

export interface HttpOcrOptions {
  readonly id: string;
  readonly kind?: 'server' | 'hosted';
  /** Host-owned transport supplies endpoint, credentials and response mapping. It must honor signal. */
  readonly recognize: (page: OcrPageInput) => Promise<OcrPageResult>;
}
/** No endpoints or credentials are bundled. Core always gates non-local engines before calling this client. */
export function createHttpOcrEngine(options: HttpOcrOptions): OcrEngine {
  if (!options.id.trim()) throw new TypeError('An OCR engine ID is required.');
  return {
    id: options.id,
    kind: options.kind ?? 'server',
    uploadsData: true,
    createSession() {
      const session = new AbortController();
      return {
        async recognize(page) {
          if (session.signal.aborted || page.signal.aborted)
            throw new IngestionError(
              'ocr-page-failed',
              'Remote OCR was cancelled.',
            );
          const request = new AbortController();
          const abortPage = () => request.abort(page.signal.reason);
          const abortSession = () => request.abort(session.signal.reason);
          page.signal.addEventListener('abort', abortPage, { once: true });
          session.signal.addEventListener('abort', abortSession, {
            once: true,
          });
          try {
            const result = await options.recognize({
              ...page,
              signal: request.signal,
            });
            if (request.signal.aborted)
              throw new IngestionError(
                'ocr-page-failed',
                'Remote OCR was cancelled.',
              );
            return result;
          } finally {
            page.signal.removeEventListener('abort', abortPage);
            session.signal.removeEventListener('abort', abortSession);
          }
        },
        terminate: () => session.abort(),
      };
    },
  };
}
