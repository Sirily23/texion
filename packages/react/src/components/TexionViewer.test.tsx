import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createContent } from '@texion/core';
import type { TexionContent } from '@texion/core';
import { TexionViewer } from './TexionViewer';

afterEach(cleanup);

it('renders shared content with the existing safe document lifecycle', async () => {
  const content = createContent('# Submitted\n\n**Edited** content');
  render(<TexionViewer content={content} />);
  await screen.findByRole('heading', { name: 'Submitted' });
  expect(screen.getByText('Edited').tagName).toBe('STRONG');
});

it('reports unsupported schemas rather than interpreting them as HTML', () => {
  render(
    <TexionViewer
      content={
        {
          version: 2,
          format: 'html',
          source: '<script>bad()</script>',
        } as unknown as TexionContent
      }
    />,
  );
  expect(screen.getByRole('alert').textContent).toBe(
    'Unsupported Texion content.',
  );
});
