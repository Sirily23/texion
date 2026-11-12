import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { TexionDocument } from '@texion/core';
import { AttachmentList } from './AttachmentList';
afterEach(cleanup);
it('shows an approval pause and lets the host cancel the processing file', () => {
  const cancel = vi.fn();
  const document: TexionDocument = {
    id: 'scan',
    name: 'scan.pdf',
    format: 'pdf',
    source: 'file',
    status: 'processing',
    size: 100,
    metadata: {},
    warnings: [],
    progress: { phase: 'pending-consent', done: 0, total: 2 },
  };
  const { rerender } = render(
    <AttachmentList
      documents={[document]}
      onRemove={vi.fn()}
      onCancel={cancel}
    />,
  );
  screen.getByText('Waiting for OCR approval');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel scan.pdf' }));
  expect(cancel).toHaveBeenCalledWith('scan');
  rerender(
    <AttachmentList
      documents={[
        {
          ...document,
          progress: { phase: 'ocr', done: 1, total: 2, pageNumber: 5 },
        },
      ]}
      onRemove={vi.fn()}
      onCancel={cancel}
    />,
  );
  screen.getByText('Recognizing page 5 · 1/2 complete');
  expect(
    screen
      .getByRole('progressbar', { name: 'Processing scan.pdf' })
      .getAttribute('max'),
  ).toBe('2');
});
