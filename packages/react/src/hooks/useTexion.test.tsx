import { StrictMode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useTexion } from './useTexion';
import { TexionInput } from '../components/TexionInput';
import { markdownAdapter } from '@texion/core';

afterEach(cleanup);

function markdownFile(text = '# Original') {
  const file = new File([text], 'note.md', { type: 'text/markdown' });
  file.arrayBuffer = async () => new TextEncoder().encode(text).buffer;

  return file;
}

it('submits original file content and a typed document through the shared controller', async () => {
  const onSubmit = vi.fn();
  const { result } = renderHook(() => useTexion({ onSubmit }));
  act(() => {
    result.current.setText('Hello');
    result.current.addDocument(markdownFile());
  });
  await waitFor(() =>
    expect(result.current.documents[0]?.status).toBe('ready'),
  );
  await act(async () => {
    expect(await result.current.submit()).toBe(true);
  });
  expect(onSubmit.mock.calls[0]?.[0].text).toBe('Hello');
  expect(onSubmit.mock.calls[0]?.[0].textDocument.status).toBe('ready');
  expect(onSubmit.mock.calls[0]?.[0].documents[0].raw).toBe('# Original');
});

it('does not submit during IME composition, and Shift+Enter keeps native behavior', async () => {
  const onSubmit = vi.fn();
  render(<TexionInput onSubmit={onSubmit} />);
  const textarea = screen.getByRole('textbox');
  fireEvent.change(textarea, { target: { value: '日本語' } });
  fireEvent.compositionStart(textarea);
  fireEvent.keyDown(textarea, { key: 'Enter', keyCode: 229 });
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.compositionEnd(textarea);
  fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.keyDown(textarea, { key: 'Enter' });
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
});

it('keeps editing independent from ingestion and processes the final source on submission', async () => {
  const metadata = vi.fn(() => ({}));
  const { result } = renderHook(() =>
    useTexion({ adapters: [{ ...markdownAdapter, metadata }] }),
  );
  act(() => {
    result.current.setText('old');
    result.current.setText('**new**');
  });
  expect(result.current.text).toBe('**new**');
  expect(result.current.textDocument).toBeUndefined();
  expect(metadata).not.toHaveBeenCalled();
  await act(async () => {
    expect(await result.current.submit()).toBe(true);
  });
  expect(result.current.textDocument?.raw).toBe('**new**');
  expect(metadata).toHaveBeenCalledTimes(1);
  act(() => result.current.setText('edited'));
  expect(result.current.textDocument).toBeUndefined();
});

it('resets the picker so the same file can be selected after removal', async () => {
  render(<TexionInput />);
  const picker = screen.getByLabelText(
    'Choose Markdown files',
  ) as HTMLInputElement;
  const file = markdownFile();
  fireEvent.change(picker, { target: { files: [file] } });
  await screen.findByText('ready');
  expect(picker.value).toBe('');
  fireEvent.click(screen.getByRole('button', { name: 'Remove note.md' }));
  fireEvent.change(picker, { target: { files: [file] } });
  await screen.findByText('ready');
});

it('turns a large Markdown paste into an attachment without changing the typed value', async () => {
  render(<TexionInput pasteAsAttachment pasteAttachmentThreshold={10} />);
  const textarea = screen.getByRole('textbox');
  fireEvent.paste(textarea, {
    clipboardData: { files: [], getData: () => '# Large Markdown paste' },
  });
  await screen.findByText('ready');
  expect(screen.getByText('Pasted Markdown')).toBeTruthy();
  expect((textarea as HTMLTextAreaElement).value).toBe('');
});

it('keeps the drag indicator while crossing nested elements and reports folders', () => {
  const { result } = renderHook(() => useTexion());
  const event = () => ({
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    dataTransfer: { types: ['Files'], items: [], files: [] },
  });
  act(() => {
    result.current.getRootProps().onDragEnter?.(event() as never);
    result.current.getRootProps().onDragEnter?.(event() as never);
  });
  act(() => result.current.getRootProps().onDragLeave?.(event() as never));
  expect(result.current.isDragging).toBe(true);
  act(() => result.current.getRootProps().onDragLeave?.(event() as never));
  expect(result.current.isDragging).toBe(false);
  const folderEvent = event();
  Object.assign(folderEvent.dataTransfer, {
    items: [{ webkitGetAsEntry: () => ({ isDirectory: true }) }],
  });
  act(() => result.current.getRootProps().onDrop?.(folderEvent as never));
  expect(result.current.inputError).toContain('Folders');
});

it('survives StrictMode effect replay', async () => {
  const { result } = renderHook(() => useTexion({ defaultValue: 'Initial' }), {
    wrapper: StrictMode,
  });
  expect(result.current.text).toBe('Initial');
  expect(result.current.textDocument).toBeUndefined();
});

it('blocks errors and discards a submission if an attachment is removed while reading', async () => {
  const onSubmit = vi.fn();
  const { result } = renderHook(() => useTexion({ onSubmit }));
  let id = '';
  const file = markdownFile();
  file.arrayBuffer = () => new Promise(() => {});
  act(() => {
    id = result.current.addDocument(file);
  });
  let submit!: Promise<boolean>;
  act(() => {
    submit = result.current.submit();
    result.current.removeDocument(id);
  });
  await act(async () => {
    expect(await submit).toBe(false);
  });
  expect(onSubmit).not.toHaveBeenCalled();
  act(() => result.current.addDocument({ text: ' ', source: 'paste' }));
  await act(async () => {
    expect(await result.current.submit()).toBe(false);
  });
});

it('leaves Markdown paste to the native textarea unless conversion is explicitly enabled', () => {
  const { result } = renderHook(() => useTexion({ highlight: true }));
  const preventDefault = vi.fn();
  const getData = vi.fn(() => '# Native paste\n' + '**text**'.repeat(2000));
  act(() =>
    result.current.getTextareaProps().onPaste?.({
      defaultPrevented: false,
      preventDefault,
      clipboardData: { files: [], getData },
    } as never),
  );
  expect(preventDefault).not.toHaveBeenCalled();
  expect(getData).not.toHaveBeenCalled();
  expect(result.current.documents).toEqual([]);
});

it('clears both native editing state and attachments', async () => {
  const { result } = renderHook(() => useTexion({ defaultValue: '# Text' }));
  act(() => {
    result.current.addDocument(markdownFile());
    result.current.clear();
  });
  expect(result.current.text).toBe('');
  expect(result.current.documents).toEqual([]);
});

it('submits shared rich content and retains the original Markdown import', async () => {
  const onSubmit = vi.fn();
  const { result } = renderHook(() => useTexion({ onSubmit }));
  act(() => {
    const rich = result.current.getRichEditorProps();
    rich.onImport?.('__Original__\r\n');
    rich.onChange('**Edited**');
  });
  expect(result.current.content).toMatchObject({
    format: 'markdown',
    source: '**Edited**',
    originalSource: '__Original__\r\n',
  });
  act(() => result.current.getRichEditorProps().onCompositionChange?.(true));
  await act(async () => {
    expect(await result.current.submit()).toBe(false);
  });
  expect(onSubmit).not.toHaveBeenCalled();
  act(() => result.current.getRichEditorProps().onCompositionChange?.(false));
  await act(async () => {
    expect(await result.current.submit()).toBe(true);
  });
  const submission = onSubmit.mock.calls[0]?.[0];
  expect(submission.content.source).toBe('**Edited**');
  expect(submission.content.originalSource).toBe('__Original__\r\n');
  expect(submission.attachments).toBe(submission.documents);
  expect(submission.textDocument?.status).toBe('ready');
});

it('does not cancel a pending submission for a rich update with unchanged Markdown', async () => {
  const onSubmit = vi.fn();
  const { result } = renderHook(() => useTexion({ onSubmit }));
  const source = '[link](https://example.com)';
  let finish!: (buffer: ArrayBuffer) => void;
  const file = markdownFile();
  file.arrayBuffer = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  act(() => {
    result.current.setText(source);
    result.current.addDocument(file);
  });
  await act(async () => {
    await Promise.resolve();
  });
  let pending!: Promise<boolean>;
  act(() => {
    pending = result.current.submit();
  });
  act(() => result.current.getRichEditorProps().onChange(source));
  await act(async () => {
    finish(new TextEncoder().encode('# File').buffer);
    expect(await pending).toBe(true);
  });
  expect(onSubmit).toHaveBeenCalledTimes(1);
});
