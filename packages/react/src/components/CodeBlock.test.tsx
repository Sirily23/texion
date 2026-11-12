import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createContent, processDocument } from '@texion/core';
import { TexionViewer } from './TexionViewer';

afterEach(cleanup);

it('keeps mixed Markdown intact, preserves fence languages, and copies exact block text', async () => {
  const json = '{"status":"success","count":12}';
  const sql = 'SELECT * FROM orders;';
  const source = `## Query results\n\nHere is the response:\n\n\`\`\`json\n${json}\n\`\`\`\n\nSQL used:\n\n\`\`\`sql\n${sql}\n\`\`\``;
  const document = await processDocument({ text: source, format: 'markdown' });
  expect(document.raw).toBe(source);
  expect(
    document.getPreview!()
      .nodes.filter((node) => node.type === 'code')
      .map((node) => node.language),
  ).toEqual(['json', 'sql']);
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  const { container } = render(
    <TexionViewer content={createContent(source)} />,
  );
  await screen.findByRole(
    'heading',
    { name: 'Query results' },
    { timeout: 5000 },
  );
  const block = await screen.findByRole('group', { name: 'json code block' });
  fireEvent.click(
    within(block).getByRole('button', { name: 'Copy json code' }),
  );
  await within(block).findByText('Copied');
  expect(writeText).toHaveBeenCalledWith(json);
  fireEvent.click(within(block).getByRole('button', { name: 'Collapse code' }));
  expect(block.querySelector('pre')?.hidden).toBe(true);
  fireEvent.click(within(block).getByRole('button', { name: 'Expand code' }));
  expect(block.querySelector('code')?.textContent).toBe(json);
  expect(
    container.querySelector('[data-highlight-kind="keyword"]')?.textContent,
  ).toBe('SELECT');
});

it('reports invalid JSON locally without interpreting surrounding Markdown as JSON', async () => {
  render(
    <TexionViewer
      content={createContent(
        '# Explanation\n\n```json\n{"broken":}\n```\n\n```sql\nSELECT \'<script>bad</script>\';\n```',
      )}
    />,
  );
  await screen.findByRole('heading', { name: 'Explanation' });
  await screen.findByText(/json block: Invalid JSON/);
  expect(document.querySelector('script')).toBeNull();
});

it('preserves code text when Markdown highlighting has overlapping spans', async () => {
  const source = '# **Nested** heading';
  render(
    <TexionViewer
      content={createContent('```markdown\n' + source + '\n```')}
    />,
  );
  const block = await screen.findByRole('group', {
    name: 'markdown code block',
  });
  expect(block.querySelector('code')?.textContent).toBe(source);
});
