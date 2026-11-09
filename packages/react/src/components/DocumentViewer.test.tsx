import { StrictMode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { processDocument } from '@texion/core';
import { DocumentViewer } from './DocumentViewer';
import { MarkdownRenderer } from '../renderers/markdown';

afterEach(cleanup);

it('renders a core snapshot and standalone input with the same engine', async () => {
  const document = await processDocument('# Shared');
  const { rerender } = render(<DocumentViewer document={document} />);
  await screen.findByRole('heading', { name: 'Shared' });
  rerender(
    <StrictMode>
      <DocumentViewer format="markdown" content="# Standalone" />
    </StrictMode>,
  );
  await screen.findByRole('heading', { name: 'Standalone' });
});

it('never renders raw HTML, unsafe links or remote images', async () => {
  const document = await processDocument(
    '<script>alert(1)</script>\n\n[bad](javascript:alert%281%29) [ok](https://example.com) ![image](https://example.com/image.png)\n\n<img src=x onerror=alert(1)>',
  );
  const { container } = render(
    <DocumentViewer document={document} renderer={MarkdownRenderer} />,
  );
  await screen.findByRole('link', { name: 'ok' });
  expect(container.querySelector('script, img, iframe')).toBeNull();
  expect(container.querySelectorAll('a')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'ok' }).getAttribute('href')).toBe(
    'https://example.com',
  );
});

it('shows warnings, errors and preview limits without losing source', async () => {
  const document = await processDocument(
    '# Heading\n' + 'content '.repeat(100),
    {
      maxPreviewCharacters: 20,
    },
  );
  const { rerender } = render(<DocumentViewer document={document} />);
  await screen.findByText(/Preview truncated/);
  expect(document.raw?.length).toBeGreaterThan(20);
  const error = await processDocument('');
  rerender(<DocumentViewer document={error} />);
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('empty'),
  );
});
