import { tesseractEngine } from './client';
import type { TesseractOptions } from './client';
export type { TesseractOptions } from './client';

/** Serve the pinned tesseract.js worker, core variants, and language files from explicit URLs. */
export function createTesseractEngine(
  options: TesseractOptions & {
    readonly workerPath: string;
    readonly corePath: string;
  },
) {
  if (!options.workerPath?.trim() || !options.corePath?.trim())
    throw new TypeError(
      'Explicit Tesseract workerPath and corePath are required in browsers.',
    );
  return tesseractEngine(options, () => {
    if (typeof Worker === 'undefined')
      throw new Error('Web Workers are unavailable.');
    const worker = new Worker(options.workerPath);
    return {
      post: (message, transfer) => worker.postMessage(message, transfer),
      listen(onMessage, onError) {
        worker.onmessage = (event) => onMessage(event.data);
        worker.onerror = onError;
        worker.onmessageerror = onError;
      },
      terminate: () => worker.terminate(),
    };
  });
}
