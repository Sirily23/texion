import { describe, expect, it } from 'vitest';
import { processDocument } from '../process';

describe('validation', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['a\0b', 'binary'],
  ])('rejects %j with %s', async (text, code) => {
    expect((await processDocument(text)).error?.code).toBe(code);
  });
  it('checks bytes rather than string length', async () => {
    expect((await processDocument('éé', { maxFileSize: 3 })).error?.code).toBe(
      'too-large',
    );
  });
  it('keeps file handles on rejected and ready snapshots', async () => {
    const file = new File(['# Hi'], 'hi.md');
    expect((await processDocument(file)).file).toBe(file);
    expect((await processDocument(file, { maxFileSize: 1 })).file).toBe(file);
  });
  it('does not read oversized files', async () => {
    const blob = new Blob(['123']);
    blob.arrayBuffer = () => {
      throw new Error('must not read');
    };
    expect((await processDocument(blob, { maxFileSize: 2 })).error?.code).toBe(
      'too-large',
    );
  });
});
