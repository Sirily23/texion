// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createContent, createMessage } from '@texion/core';
import type { DocumentInput, TexionAttachmentReference } from '@texion/core';
import { TexionMessageViewer } from './TexionMessageViewer';

afterEach(cleanup);
const message = createMessage(createContent('# Saved draft'), {
  attachments: [
    {
      id: 'one',
      reference: 'opaque-storage-key',
      name: 'note.txt',
      format: 'text',
      size: 8,
    },
  ],
});

it('renders a saved message and resolves file references only when explicitly requested', async () => {
  const resolve = vi.fn(
    (_attachment: TexionAttachmentReference, _signal: AbortSignal) => ({
      text: 'Restored attachment',
      name: 'note.txt',
      format: 'text',
    }),
  );
  render(<TexionMessageViewer message={message} resolveAttachment={resolve} />);
  await screen.findByRole(
    'heading',
    { name: 'Saved draft' },
    { timeout: 5000 },
  );
  expect(resolve).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Preview note.txt' }));
  await screen.findByText('Restored attachment');
  expect(resolve.mock.calls[0]?.[0]).toEqual(message.attachments[0]);
});

it('aborts a closed preview and ignores a late host result', async () => {
  let finish!: (value: DocumentInput) => void;
  let signal: AbortSignal | undefined;
  const resolve = vi.fn(
    (_attachment: TexionAttachmentReference, operation: AbortSignal) => {
      signal = operation;
      return new Promise<DocumentInput>((done) => {
        finish = done;
      });
    },
  );
  render(<TexionMessageViewer message={message} resolveAttachment={resolve} />);
  fireEvent.click(screen.getByRole('button', { name: 'Preview note.txt' }));
  await screen.findByText('Restoring attachment…');
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Close note.txt' }));
  expect(signal?.aborted).toBe(true);
  await act(async () => finish({ text: 'Late result', format: 'text' }));
  expect(screen.queryByText('Late result')).toBeNull();
});
