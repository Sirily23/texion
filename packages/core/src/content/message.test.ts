import { expect, it, vi } from 'vitest';
import { createContent } from './schema';
import {
  createMessage,
  createMessageFromDocuments,
  serializeMessage,
  deserializeMessage,
} from './message';
import { processDocument } from '../process';

const attachment = {
  id: 'attachment-1',
  name: 'report.pdf',
  format: 'pdf',
  size: 42,
  reference: 'storage/report-1',
  mimeType: 'application/pdf',
};

it('round-trips canonical source and stable references without runtime objects', () => {
  const content = createContent('# Edited', {
    originalSource: '# Original\r\n',
  });
  const runtime = {
    ...attachment,
    blob: new Blob(['private']),
    getPreview: () => ({}),
  };
  const message = createMessage(content, { attachments: [runtime] });
  const restored = deserializeMessage(serializeMessage(message));
  expect(restored).toEqual(message);
  expect(restored.content.originalSource).toBe('# Original\r\n');
  expect(restored.attachments[0]).toEqual(attachment);
  expect(serializeMessage(message)).not.toContain('blob');
  expect(Object.isFrozen(restored.attachments[0])).toBe(true);
});

it.each([
  { ...attachment, reference: 'blob:temporary' },
  { ...attachment, size: -1 },
  { ...attachment, reference: '' },
])('rejects invalid or temporary attachment references', (value) => {
  expect(() =>
    createMessage(createContent('draft'), { attachments: [value] }),
  ).toThrow();
});

it('rejects duplicate IDs and unsupported message versions', () => {
  const content = createContent('draft');
  expect(() =>
    createMessage(content, { attachments: [attachment, attachment] }),
  ).toThrow();
  expect(() =>
    deserializeMessage(
      JSON.stringify({ version: 2, content, attachments: [] }),
    ),
  ).toThrow();
});

it('maps ready documents through host storage without performing uploads itself', async () => {
  const document = await processDocument(
    new File(['original'], 'note.md', { type: 'text/markdown' }),
  );
  const save = vi.fn(async () => 'host/note');
  const message = await createMessageFromDocuments(
    createContent('draft'),
    [document],
    save,
  );
  expect(save).toHaveBeenCalledWith(document);
  expect(message.attachments[0]).toMatchObject({
    reference: 'host/note',
    name: 'note.md',
    mimeType: 'text/markdown',
  });
  const failed = { ...document, status: 'error' as const };
  save.mockClear();
  await expect(
    createMessageFromDocuments(message.content, [document, failed], save),
  ).rejects.toThrow();
  expect(save).not.toHaveBeenCalled();
});
