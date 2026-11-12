import { throwIfAborted } from './abort';

export interface OcrScheduler {
  run<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T>;
}
/** Share one scheduler across adapters/controllers to bound active OCR sessions. */
export function createOcrScheduler(concurrency = 1): OcrScheduler {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8)
    throw new RangeError('OCR scheduler concurrency must be 1..8.');
  let active = 0;
  const queue: (() => void)[] = [];
  return {
    async run<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
      throwIfAborted(signal);
      await new Promise<void>((resolve, reject) => {
        let started = false;
        const abort = () => {
          if (started) return;
          const index = queue.indexOf(start);
          if (index >= 0) queue.splice(index, 1);
          try {
            throwIfAborted(signal);
          } catch (error) {
            reject(error);
          }
        };
        const start = () => {
          started = true;
          signal.removeEventListener('abort', abort);
          active++;
          resolve();
        };
        signal.addEventListener('abort', abort, { once: true });
        if (active < concurrency) start();
        else queue.push(start);
      });
      try {
        throwIfAborted(signal);
        return await work();
      } finally {
        active--;
        queue.shift()?.();
      }
    },
  };
}
export const defaultOcrScheduler = createOcrScheduler();
