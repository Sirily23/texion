import { describe, expect, it } from 'vitest';
import { decode } from './decode';
import { processDocument } from '../process';

describe('decode', () => {
  it('decodes UTF-8 BOM and preserves the original newlines', () => {
    expect(
      decode(new Uint8Array([239, 187, 191, 35, 32, 65, 13, 10])).text,
    ).toBe('# A\r\n');
  });
  it.each([
    [255, 254, 35, 0, 32, 0, 65, 0],
    [254, 255, 0, 35, 0, 32, 0, 65],
  ])('decodes UTF-16 BOM: %j', (...bytes) => {
    expect(decode(new Uint8Array(bytes)).text).toBe('# A');
  });
  it('warns predictably on invalid UTF-8 without rejecting the attachment', async () => {
    const result = await processDocument(
      new Blob([new Uint8Array([35, 32, 0xff])], { type: 'text/markdown' }),
    );
    expect(result.status).toBe('ready');
    expect(result.raw).toBe('# \ufffd');
    expect(result.warnings[0]?.code).toBe('invalid-utf8');
  });
});
