// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { StrictMode } from 'react';
import { useTexionAttachments } from './useTexionAttachments';
import { useSourceInput } from './useSourceInput';
import { useTexion } from './useTexion';
import { createContent } from '@texion/core';

afterEach(cleanup);

function textFile(text: string, name = 'note.txt') {
  const file = new File([text], name, { type: 'text/plain' });
  file.arrayBuffer = async () => new TextEncoder().encode(text).buffer;
  return file;
}

it('composes an independent editor and attachment lifecycle in a custom interface', async () => {
  function Custom() {
    const editor = useSourceInput({
      defaultValue: 'Keep my draft',
      language: 'text',
    });
    const files = useTexionAttachments();
    return (
      <div {...files.getRootProps()}>
        <textarea
          aria-label="Custom draft"
          {...files.getTextareaProps(editor.getTextareaProps())}
        />
        <input aria-label="Custom files" {...files.getInputProps()} />
        {files.documents.map((document) => (
          <button
            key={document.id}
            onClick={() => files.removeDocument(document.id)}
          >
            {document.name}: {document.status}
          </button>
        ))}
      </div>
    );
  }
  render(<Custom />);
  fireEvent.change(screen.getByLabelText('Custom files'), {
    target: { files: [textFile('source')] },
  });
  fireEvent.click(await screen.findByText('note.txt: ready'));
  expect(screen.queryByText('note.txt: ready')).toBeNull();
  expect(
    (screen.getByLabelText('Custom draft') as HTMLTextAreaElement).value,
  ).toBe('Keep my draft');
});

it('restores source and files on mount, including StrictMode effect replay', async () => {
  const content = createContent('{"value":1}', {
    format: 'json',
    originalSource: '{ "value": 1 }',
  });
  const file = textFile('local attachment');
  let submitted: unknown;
  const { result } = renderHook(
    () =>
      useTexion({
        defaultContent: content,
        initialAttachments: [file],
        onSubmit: (value) => {
          submitted = value;
        },
      }),
    { wrapper: StrictMode },
  );
  await waitFor(() =>
    expect(result.current.documents[0]?.status).toBe('ready'),
  );
  await act(async () => {
    expect(await result.current.submit()).toBe(true);
  });
  expect(submitted).toMatchObject({
    content,
    attachments: [{ name: 'note.txt', status: 'ready' }],
  });
  expect(result.current.format).toBe('json');
});
