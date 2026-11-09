import { describe, expect, it } from 'vitest';
import { createController } from './controller';
import { processDocument } from '../process';

function delayedFile() {
  let finish!: (value: ArrayBuffer) => void;
  const file = new Blob(['old'], { type: 'text/markdown' });
  file.arrayBuffer = () =>
    new Promise((resolve) => {
      finish = resolve;
    });

  return { file, finish: () => finish(new TextEncoder().encode('old').buffer) };
}

describe('shared document lifecycle', () => {
  it.each(['remove', 'cancel', 'clear'] as const)(
    '%s invalidates late results and settles immediately',
    async (action) => {
      const c = createController();
      const delayed = delayedFile();
      const id = c.add(delayed.file);
      const settled = c.whenSettled(id);
      await Promise.resolve();
      expect(c.getSnapshot().documents[0]?.status).toBe('processing');

      if (action === 'clear') {
        c.clear();
      } else {
        c[action](id);
      }
      expect(await settled).toBeUndefined();
      const snapshot = c.getSnapshot();
      delayed.finish();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(c.getSnapshot()).toBe(snapshot);
      expect(snapshot.documents).toEqual([]);
    },
  );

  it('keeps snapshot and unchanged document identities stable', async () => {
    const c = createController();
    const id = c.add('# First');
    const first = await c.whenSettled(id);
    const snapshot = c.getSnapshot();
    expect(c.getSnapshot()).toBe(snapshot);
    expect(Object.isFrozen(snapshot.documents)).toBe(true);
    const second = c.add('# Second');
    await c.whenSettled(second);
    expect(c.getSnapshot().documents[0]).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    c.clear();
    expect(first?.raw).toBe('# First');
  });

  it('allows the same file after removal and reports count violations', async () => {
    const c = createController({ maxFiles: 1 });
    const file = new Blob(['# A'], { type: 'text/markdown' });
    const id = c.add(file);
    expect(c.add(file)).toBe(id);
    await c.whenSettled(id);
    const rejected = await c.whenSettled(c.add('# B'));
    expect(rejected?.error?.code).toBe('too-many');
    c.remove(id);
    const next = c.add(file);
    expect(next).not.toBe(id);
    expect((await c.whenSettled(next))?.status).toBe('ready');
  });

  it('uses the same engine for one-shot processing and preserves source', async () => {
    const source = '---\ntitle: hello\n---\n# Hi\r\n';
    const doc = await processDocument(source);
    expect(doc.status).toBe('ready');
    expect(doc.raw).toBe(source);
    expect(doc.getPreview?.()).toBe(doc.getPreview?.());
    expect(doc.metadata.frontMatter).toBe('title: hello');
  });

  it('aborts one-shot work even when the underlying read ignores cancellation', async () => {
    const delayed = delayedFile();
    const abort = new AbortController();
    const result = processDocument(delayed.file, { signal: abort.signal });
    await Promise.resolve();
    abort.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    delayed.finish();
  });
});

it('does not merge distinct anonymous blobs with the same size and MIME type', async () => {
  const controller = createController();
  const first = controller.add(new Blob(['# A'], { type: 'text/markdown' }));
  const second = controller.add(new Blob(['# B'], { type: 'text/markdown' }));
  expect(first).not.toBe(second);
  await controller.waitForIdle();
  expect(
    controller.getSnapshot().documents.map((document) => document.raw),
  ).toEqual(['# A', '# B']);
});
