import { expect, it, vi } from 'vitest';
import { recognizePdfPages, defaultLimits } from '@texion/core';
import { createHttpOcrEngine } from './index';
const image = {
  encoding: 'png' as const,
  bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]),
  width: 10,
  height: 10,
  dpi: 200,
};
it('does not call a configured transport before host approval', async () => {
  const recognize = vi.fn(async () => ({ text: 'Remote text' }));
  const options = {
    engine: createHttpOcrEngine({ id: 'my-backend', recognize }),
    trigger: 'auto' as const,
  };
  const pages = [
    {
      pageNumber: 1,
      text: '',
      source: 'native',
      classification: 'ocr-candidate' as const,
    },
  ];
  expect(
    (
      await recognizePdfPages(
        pages,
        options,
        async () => image,
        defaultLimits,
        new AbortController().signal,
      )
    ).ocr.state,
  ).toBe('denied');
  expect(recognize).not.toHaveBeenCalled();
  const result = await recognizePdfPages(
    pages,
    { ...options, requestApproval: () => true },
    async () => image,
    defaultLimits,
    new AbortController().signal,
  );
  expect(result.raw).toBe('Remote text');
  expect(recognize).toHaveBeenCalledOnce();
});
it('aborts the host transport when its session is terminated', async () => {
  let signal: AbortSignal | undefined;
  const session = createHttpOcrEngine({
    id: 'my-backend',
    recognize: async (page) => {
      signal = page.signal;
      return { text: 'data' };
    },
  }).createSession();
  await session.recognize({
    ...image,
    pageNumber: 1,
    signal: new AbortController().signal,
  });
  // A separate pending request keeps its cancellation subscription alive.
  let release!: (result: { text: string }) => void;
  const pending = createHttpOcrEngine({
    id: 'pending',
    recognize: (page) => {
      signal = page.signal;
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  }).createSession();
  const result = pending.recognize({
    ...image,
    pageNumber: 1,
    signal: new AbortController().signal,
  });
  pending.terminate();
  expect(signal?.aborted).toBe(true);
  release({ text: 'Late' });
  await expect(result).rejects.toBeDefined();
});
