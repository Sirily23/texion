import { IngestionError } from '@texion/core';
import type { OcrEngine, OcrSession } from '@texion/core';

export interface TesseractOptions {
  readonly languages?: readonly string[];
  /** Explicit local path/URL; no implicit CDN language download. */
  readonly langPath: string;
  readonly corePath?: string;
  readonly workerPath?: string;
  readonly gzip?: boolean;
  readonly cacheMethod?: 'none' | 'write' | 'readOnly' | 'refresh';
  readonly cachePath?: string;
}
export interface WorkerHandle {
  post(message: unknown, transfer: ArrayBuffer[]): void;
  listen(onMessage: (data: unknown) => void, onError: () => void): void;
  terminate(): void | Promise<unknown>;
}
function stopped() {
  const error = new Error('OCR session was terminated.');
  error.name = 'AbortError';
  return error;
}

/**
 * Pinned Tesseract.js 6 worker protocol. Owning the worker from its creation makes
 * initialization cancellable too; createWorker's public promise resolves only after initialization.
 * Real engine tests guard this protocol integration when updating the pinned dependency.
 */
export function tesseractEngine(
  options: TesseractOptions,
  spawn: () => WorkerHandle,
): OcrEngine {
  const languages = [...(options.languages ?? ['eng'])];
  if (
    !languages.length ||
    languages.some((language) => !/^[A-Za-z0-9_]+$/.test(language)) ||
    !options.langPath.trim()
  )
    throw new TypeError(
      'Explicit OCR language assets and valid language IDs are required.',
    );
  return {
    id: 'tesseract-js',
    kind: 'local',
    uploadsData: false,
    createSession(): OcrSession {
      let worker: WorkerHandle | undefined;
      let initialized: Promise<void> | undefined;
      let terminated = false;
      let sequence = 0;
      let busy = false;
      const pending = new Map<
        string,
        { resolve(value: unknown): void; reject(error: unknown): void }
      >();
      const fail = (error: unknown) => {
        for (const job of pending.values()) job.reject(error);
        pending.clear();
      };
      const end = () => {
        if (terminated) return;
        terminated = true;
        fail(stopped());
        const current = worker;
        worker = undefined;
        if (current) {
          try {
            void Promise.resolve(current.terminate()).catch(() => {});
          } catch {
            /* Worker is already gone. */
          }
        }
      };
      function request(
        action: string,
        payload: unknown,
        transfer: ArrayBuffer[] = [],
      ) {
        if (terminated) return Promise.reject(stopped());
        const jobId = String(++sequence);
        return new Promise<unknown>((resolve, reject) => {
          pending.set(jobId, { resolve, reject });
          try {
            worker!.post(
              { workerId: 'texion', jobId, action, payload },
              transfer,
            );
          } catch (error) {
            pending.delete(jobId);
            reject(error);
          }
        });
      }
      async function initialize() {
        if (terminated) throw stopped();
        worker = spawn();
        worker.listen(
          (message) => {
            if (!message || typeof message !== 'object') return;
            const packet = message as {
              jobId?: string;
              status?: string;
              data?: unknown;
            };
            const job = packet.jobId ? pending.get(packet.jobId) : undefined;
            if (
              !job ||
              (packet.status !== 'resolve' && packet.status !== 'reject')
            )
              return;
            pending.delete(packet.jobId!);
            if (packet.status === 'resolve') job.resolve(packet.data);
            else
              job.reject(
                new IngestionError(
                  'ocr-unavailable',
                  'The Tesseract worker could not process its request. Check the configured assets.',
                ),
              );
          },
          () => {
            fail(
              new IngestionError(
                'ocr-unavailable',
                'The Tesseract worker could not be loaded or stopped unexpectedly.',
              ),
            );
            end();
          },
        );
        await request('load', {
          options: {
            lstmOnly: true,
            logging: false,
            ...(options.corePath ? { corePath: options.corePath } : {}),
          },
        });
        await request('loadLanguage', {
          langs: languages,
          options: {
            langPath: options.langPath,
            lstmOnly: true,
            gzip: options.gzip ?? true,
            cacheMethod: options.cacheMethod ?? 'none',
            ...(options.cachePath ? { cachePath: options.cachePath } : {}),
          },
        });
        await request('initialize', {
          langs: languages.join('+'),
          oem: 1,
          config: {},
        });
      }
      return {
        async initialize(signal) {
          if (terminated || signal.aborted) throw stopped();
          signal.addEventListener('abort', end, { once: true });
          try {
            initialized ??= initialize();
            await initialized;
            if (terminated || signal.aborted) throw stopped();
          } finally {
            signal.removeEventListener('abort', end);
          }
        },
        async recognize(input) {
          if (terminated || input.signal.aborted) throw stopped();
          if (busy)
            throw new Error('A Tesseract session accepts one page at a time.');
          busy = true;
          input.signal.addEventListener('abort', end, { once: true });
          try {
            initialized ??= initialize();
            await initialized;
            if (terminated || input.signal.aborted) throw stopped();
            await request('setParameters', {
              params: { user_defined_dpi: String(input.dpi) },
            });
            const bytes = new Uint8Array(input.bytes);
            const data = (await request(
              'recognize',
              { image: bytes, options: {}, output: { text: true } },
              [bytes.buffer],
            )) as { text?: unknown; confidence?: unknown };
            if (terminated || input.signal.aborted) throw stopped();
            if (!data || typeof data.text !== 'string')
              throw new IngestionError(
                'ocr-page-failed',
                'Tesseract returned an invalid text result.',
              );
            const confidence = data.confidence;
            return {
              text: data.text,
              ...(typeof confidence === 'number' &&
              Number.isFinite(confidence) &&
              confidence >= 0 &&
              confidence <= 100
                ? { confidence: confidence / 100 }
                : {}),
            };
          } finally {
            busy = false;
            input.signal.removeEventListener('abort', end);
          }
        },
        terminate: end,
      };
    },
  };
}
