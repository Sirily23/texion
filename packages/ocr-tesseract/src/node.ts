import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { tesseractEngine } from './client';
import type { TesseractOptions } from './client';
export type { TesseractOptions } from './client';

export function createTesseractEngine(options: TesseractOptions) {
  const require = createRequire(import.meta.url);
  return tesseractEngine(options, () => {
    const worker = new Worker(
      options.workerPath ??
        require.resolve('tesseract.js/src/worker-script/node/index.js'),
    );
    return {
      post: (message, transfer) => worker.postMessage(message, transfer),
      listen(onMessage, onError) {
        worker.on('message', onMessage);
        worker.on('error', onError);
        worker.on('exit', onError);
      },
      terminate: () => worker.terminate(),
    };
  });
}
