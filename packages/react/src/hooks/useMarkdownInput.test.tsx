import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createRef, useState } from 'react';
import { useMarkdownInput } from './useMarkdownInput';
import { HighlightedTextarea } from '../components/HighlightedTextarea';

afterEach(cleanup);

it('supports a controlled form field without attachments or source rewriting', () => {
  const onChange = vi.fn();

  function Form() {
    const [value, setValue] = useState('');

    return (
      <HighlightedTextarea
        aria-label="Description"
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
        language="markdown"
      />
    );
  }

  const { container } = render(<Form />);
  const textarea = screen.getByRole('textbox', {
    name: 'Description',
  }) as HTMLTextAreaElement;
  const source = '# Title\n\n😀 **Important** and `code`\n';
  fireEvent.change(textarea, { target: { value: source } });
  expect(onChange).toHaveBeenLastCalledWith(source);
  expect(textarea.value).toBe(source);
  expect(
    container.querySelector('[data-highlight-kind="heading"]')?.textContent,
  ).toBe('# Title');
  expect(
    container.querySelector('[data-highlight-kind="bold"]')?.textContent,
  ).toBe('**Important**');
  expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
});

it('keeps the same native element and exposes its ref across edits and fallback', () => {
  const ref = createRef<HTMLTextAreaElement>();
  const { rerender } = render(
    <HighlightedTextarea
      ref={ref}
      aria-label="Text"
      value="**short**"
      maxHighlightCharacters={20}
    />,
  );
  const textarea = ref.current!;
  textarea.setSelectionRange(2, 5, 'backward');
  fireEvent.select(textarea);
  expect([
    textarea.selectionStart,
    textarea.selectionEnd,
    textarea.selectionDirection,
  ]).toEqual([2, 5, 'backward']);
  rerender(
    <HighlightedTextarea
      ref={ref}
      aria-label="Text"
      value={'x'.repeat(30)}
      maxHighlightCharacters={20}
    />,
  );
  expect(ref.current).toBe(textarea);
  expect(textarea.style.webkitTextFillColor).not.toBe('transparent');
  expect(textarea.parentElement?.getAttribute('data-highlight-reason')).toBe(
    'too-large',
  );
  rerender(
    <HighlightedTextarea
      ref={ref}
      aria-label="Text"
      value="**short**"
      maxHighlightCharacters={20}
    />,
  );
  expect(ref.current).toBe(textarea);
  expect(textarea.parentElement?.getAttribute('data-highlighted')).toBe('true');
});

it('pauses highlighting during composition and restores it after completion', () => {
  const { container } = render(
    <HighlightedTextarea aria-label="Text" defaultValue="**start**" />,
  );
  const textarea = screen.getByRole('textbox');
  fireEvent.compositionStart(textarea);
  fireEvent.change(textarea, { target: { value: '**日本語**' } });
  expect(container.querySelector('[data-texion-overlay-viewport]')).toBeNull();
  fireEvent.compositionEnd(textarea);
  expect(
    container.querySelector('[data-highlight-kind="bold"]')?.textContent,
  ).toBe('**日本語**');
});

it('exposes UTF-16 selections and composes consumer event handlers', () => {
  const submit = vi.fn();
  const { result } = renderHook(() =>
    useMarkdownInput({
      defaultValue: '😀 **text**',
      onSubmit: submit,
      submitOnEnter: true,
    }),
  );
  const textarea = document.createElement('textarea');
  textarea.value = result.current.value;
  textarea.setSelectionRange(3, 5);
  act(() =>
    result.current
      .getTextareaProps()
      .onSelect?.({ currentTarget: textarea } as never),
  );
  expect(result.current.selection).toMatchObject({ start: 3, end: 5 });
  const consumer = vi.fn((event: { preventDefault: () => void }) =>
    event.preventDefault(),
  );
  const event = {
    key: 'Enter',
    defaultPrevented: false,
    nativeEvent: {},
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  act(() =>
    result.current
      .getTextareaProps({ onKeyDown: consumer })
      .onKeyDown?.(event as never),
  );
  expect(consumer).toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();
});

it('preserves malicious source as text without constructing HTML', () => {
  const source = 'before <img src=x onerror=alert(1)> **after**';
  const { container } = render(
    <HighlightedTextarea aria-label="Text" value={source} />,
  );
  expect(container.querySelector('img, script')).toBeNull();
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
    source,
  );
  expect(
    container.querySelector('[data-texion-highlight-overlay]')?.textContent,
  ).toBe(source + '\u200b');
});

it('uses native LF line endings so ranges match textarea selection offsets', () => {
  const { result } = renderHook(() =>
    useMarkdownInput({ defaultValue: '# A\r\n😀 **B**\r' }),
  );
  expect(result.current.value).toBe('# A\n😀 **B**\n');
  const bold = result.current.highlightModel.tokens.find(
    (token) => token.kind === 'bold',
  )!;
  expect(bold.start).toBe(7);
  expect(result.current.value.slice(bold.start, bold.end)).toBe('**B**');
});
