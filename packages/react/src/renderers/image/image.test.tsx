import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TexionDocument } from '@texion/core';
import { ImageRenderer } from './index';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const preview = {
  nodes: [],
  truncated: false,
  warnings: [],
  image: { mimeType: 'image/png' as const, width: 2, height: 3 },
};
function document(blob: Blob, name = 'image.png'): TexionDocument {
  return {
    id: name,
    name,
    source: 'file',
    format: 'image',
    status: 'ready',
    size: blob.size,
    blob,
    metadata: {},
    warnings: [],
  };
}
it('creates only local typed URLs and revokes every URL on replacement or unmount in StrictMode', () => {
  let counter = 0;
  const create = vi.fn((_blob: Blob) => `blob:local-${++counter}`);
  const revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
  const first = new Blob(['data'], { type: 'application/octet-stream' });
  const second = new Blob(['new'], { type: 'image/png' });
  const { rerender, unmount } = render(
    <StrictMode>
      <ImageRenderer preview={preview} document={document(first)} />
    </StrictMode>,
  );
  const oldUrl = screen.getByRole('img').getAttribute('src');
  expect(create.mock.calls[0]?.[0]?.type).toBe('image/png');
  rerender(
    <StrictMode>
      <ImageRenderer
        preview={preview}
        document={document(second, 'second.png')}
      />
    </StrictMode>,
  );
  expect(revoke).toHaveBeenCalledWith(oldUrl);
  expect(screen.getByRole('img').getAttribute('src')).not.toBe(oldUrl);
  unmount();
  expect(new Set(revoke.mock.calls.map((call) => call[0]))).toEqual(
    new Set(create.mock.results.map((result) => result.value)),
  );
});
it('reports image decoding errors and recovers when the document changes', () => {
  let counter = 0;
  vi.stubGlobal('URL', {
    createObjectURL: () => `blob:${++counter}`,
    revokeObjectURL: vi.fn(),
  });
  const { rerender } = render(
    <ImageRenderer preview={preview} document={document(new Blob(['bad']))} />,
  );
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('alert').textContent).toContain(
    'original attachment is retained',
  );
  rerender(
    <ImageRenderer
      preview={preview}
      document={document(new Blob(['new']), 'new.png')}
    />,
  );
  expect(screen.getByRole('img', { name: 'new.png' })).toBeTruthy();
});
