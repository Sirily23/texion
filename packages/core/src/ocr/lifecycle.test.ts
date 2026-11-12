import { expect, it } from 'vitest';
import { createController } from '../lifecycle/controller';
import type {
  BinaryFormatAdapter,
  ExtractionContext,
} from '../adapters/contract';

it('publishes immutable progress and page results through the original lifecycle', async () => {
  const observed: string[] = [];
  const adapter: BinaryFormatAdapter = {
    kind: 'binary',
    format: 'test',
    extensions: ['test'],
    mimeTypes: [],
    detectBytes: () => true,
    inspect: () => ({}),
    parse: () => ({ nodes: [], truncated: false, warnings: [] }),
    async extract(_bytes, _limits, _signal, context) {
      context?.reportProgress({ phase: 'pending-consent', done: 0, total: 1 });
      context?.reportProgress({
        phase: 'ocr',
        done: 1,
        total: 1,
        pageNumber: 1,
      });
      return {
        raw: 'Recognized',
        pages: [
          {
            pageNumber: 1,
            text: 'Recognized',
            source: 'ocr:test',
            classification: 'ocr-candidate',
            blocks: [{ text: 'Recognized' }],
          },
        ],
      };
    },
  };
  const controller = createController({ adapters: [adapter] });
  controller.subscribe(() => {
    const value = controller.getSnapshot().documents[0];
    if (value?.progress) {
      expect(Object.isFrozen(value.progress)).toBe(true);
      observed.push(value.progress.phase);
    }
  });
  const result = await controller.whenSettled(
    controller.add(new File(['bytes'], 'scan.test')),
  );
  expect(observed).toContain('pending-consent');
  expect(observed).toContain('ocr');
  expect(result?.status).toBe('ready');
  expect(result?.progress).toBeUndefined();
  expect(Object.isFrozen(result?.pages?.[0]?.blocks?.[0])).toBe(true);
  controller.clear();
});
it('cancellation settles promptly and late extension progress cannot resurrect a document', async () => {
  let context!: ExtractionContext;
  let finish!: (value: { raw: string }) => void;
  let started!: () => void;
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  const adapter: BinaryFormatAdapter = {
    kind: 'binary',
    format: 'test',
    extensions: ['test'],
    mimeTypes: [],
    detectBytes: () => true,
    inspect: () => ({}),
    parse: () => ({ nodes: [], truncated: false, warnings: [] }),
    async extract(_bytes, _limits, _signal, value) {
      context = value!;
      started();
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  };
  const controller = createController({ adapters: [adapter] });
  const id = controller.add(new File(['bytes'], 'scan.test'));
  const settlement = controller.whenSettled(id);
  await entered;
  controller.cancel(id);
  expect(await settlement).toBeUndefined();
  const snapshot = controller.getSnapshot();
  context.reportProgress({ phase: 'ocr', done: 1, total: 1 });
  finish({ raw: 'Late' });
  await Promise.resolve();
  await Promise.resolve();
  expect(controller.getSnapshot()).toBe(snapshot);
});
