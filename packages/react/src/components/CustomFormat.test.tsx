import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import {
  createContent,
  createRegistry,
  serializeContent,
  deserializeContent,
  createMessage,
  serializeMessage,
  deserializeMessage,
} from '@texion/core';
import type { TextFormatAdapter } from '@texion/core';
import { useTexion } from '../hooks/useTexion';
import { TexionViewer } from './TexionViewer';
import type { PreviewRendererProps } from '../renderers/types';

afterEach(cleanup);
const adapter: TextFormatAdapter = {
  format: 'query',
  extensions: ['query'],
  mimeTypes: ['text/x-query'],
  detect: (source) => /^SELECT\b/i.test(source),
  parse: (source) => ({
    nodes: [{ type: 'code', value: source, language: 'sql' }],
    truncated: false,
    warnings: [],
  }),
};

it('submits, serializes, restores and renders a registered custom text format', async () => {
  const source = 'SELECT * FROM orders;';
  const content = createContent(source, { format: 'query' });
  let saved = content;
  const { result } = renderHook(() =>
    useTexion({
      adapters: [adapter],
      formats: ['query'],
      defaultContent: content,
      onSubmit: ({ content }) => {
        saved = content;
      },
    }),
  );
  expect(result.current.getInputProps().accept).toContain('.query');
  expect(result.current.getInputProps().accept).not.toContain('.pdf');
  await act(async () => {
    expect(await result.current.submit()).toBe(true);
  });
  expect(saved).toEqual(deserializeContent(serializeContent(content)));
  const restored = deserializeMessage(serializeMessage(createMessage(saved)));
  function Renderer({ preview }: PreviewRendererProps) {
    return (
      <output aria-label="Query renderer">{preview.nodes[0]?.value}</output>
    );
  }
  render(
    <TexionViewer
      content={restored.content}
      options={{ adapters: [adapter] }}
      renderers={{ query: Renderer }}
    />,
  );
  expect((await screen.findByLabelText('Query renderer')).textContent).toBe(
    source,
  );
});

it('does not interpret an unregistered content format as executable HTML', async () => {
  render(
    <TexionViewer
      content={createContent('<script>bad()</script>', { format: 'html' })}
    />,
  );
  await screen.findByRole('alert');
  expect(document.querySelector('script')).toBeNull();
});

it('detects registered custom source while retaining mixed Markdown as Markdown', () => {
  const { result, rerender } = renderHook(
    ({ source }) =>
      useTexion({
        adapters: [adapter, ...createRegistry()],
        defaultValue: source,
      }),
    { initialProps: { source: 'SELECT id FROM orders;' } },
  );
  expect(result.current.format).toBe('query');
  act(() =>
    result.current.setText('## Query\n\n```sql\nSELECT id FROM orders;\n```'),
  );
  rerender({ source: '' });
  expect(result.current.format).toBe('markdown');
});
