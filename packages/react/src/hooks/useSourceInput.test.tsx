import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSourceInput } from './useSourceInput';
import { useTexion } from './useTexion';
import { HighlightedTextarea } from '../components/HighlightedTextarea';
afterEach(cleanup);

it('validates JSON while keeping invalid source editable', () => {
  const { result } = renderHook(() =>
    useSourceInput({ language: 'json', defaultValue: '{"a":}' }),
  );
  expect(result.current.warnings[0]?.code).toBe('invalid-json');
  act(() => result.current.setValue('{"a":1}'));
  expect(result.current.warnings).toEqual([]);
  expect(result.current.value).toBe('{"a":1}');
});
it('supports source highlighting and validation independently from attachments', () => {
  const { container } = render(
    <HighlightedTextarea language="json" aria-label="JSON" defaultValue="{}" />,
  );
  const textarea = screen.getByRole('textbox', { name: 'JSON' });
  fireEvent.change(textarea, { target: { value: '{"key":true}' } });
  expect(
    container.querySelector('[data-highlight-kind="property"]')?.textContent,
  ).toBe('"key"');
  fireEvent.change(textarea, { target: { value: '{"key":}' } });
  expect(screen.getByRole('status').textContent).toContain('Invalid JSON');
});
it.each([
  ['json', '{"n":9007199254740993}'],
  ['csv', 'name,value\nAda,001'],
])('submits original %s through the core lifecycle', async (format, source) => {
  const onSubmit = vi.fn();
  const { result } = renderHook(() =>
    useTexion({ format: format as 'json' | 'csv', onSubmit }),
  );
  act(() => result.current.setText(source!));
  expect(result.current.textDocument).toBeUndefined();
  await act(async () => {
    expect(await result.current.submit()).toBe(true);
  });
  const submission = onSubmit.mock.calls[0]?.[0];
  expect(submission.content).toMatchObject({ format, source });
  expect(submission.textDocument).toMatchObject({
    format,
    status: 'ready',
    raw: source,
  });
});
it('resolves automatic format before submitting an immediate edit', async () => {
  const onSubmit = vi.fn();
  const { result } = renderHook(() => useTexion({ format: 'auto', onSubmit }));
  let pending!: Promise<boolean>;
  act(() => {
    result.current.setText('{"a":1}');
    pending = result.current.submit();
  });
  await act(async () => {
    expect(await pending).toBe(true);
  });
  expect(result.current.text).toBe('{"a":1}');
  expect(onSubmit.mock.calls.at(-1)?.[0].content.format).toBe('json');
});
it('restricts picker choices and reports unsupported explicit source formats', async () => {
  const { result } = renderHook(() =>
    useTexion({ formats: ['json'], format: 'json' }),
  );
  expect(result.current.getInputProps().accept).toContain('.json');
  expect(result.current.getInputProps().accept).not.toContain('.png');
  expect(() => result.current.getRichEditorProps()).toThrow('source editing');
});
