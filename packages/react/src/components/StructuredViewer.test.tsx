import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createContent } from '@texion/core';
import { TexionViewer } from './TexionViewer';
afterEach(cleanup);

it('renders JSON as an inspectable tree with exact numeric source and escaped text', async () => {
  const content = createContent(
    '{"amount":9007199254740993,"html":"<img src=x onerror=alert(1)>"}',
    { format: 'json' },
  );
  const { container } = render(<TexionViewer content={content} />);
  await screen.findByText('9007199254740993');
  expect(screen.getByText('"<img src=x onerror=alert(1)>"')).toBeTruthy();
  expect(container.querySelector('img, script')).toBeNull();
  expect(container.querySelector('details summary')).toBeTruthy();
});
it('renders every CSV row as text without evaluating formulas or HTML', async () => {
  const content = createContent(
    'name,value\nAda,=1+1\nGrace,<script>alert(1)</script>',
    { format: 'csv' },
  );
  const { container } = render(<TexionViewer content={content} />);
  await screen.findByRole('table');
  expect(screen.getByRole('cell', { name: '=1+1' })).toBeTruthy();
  expect(
    screen.getByRole('cell', { name: '<script>alert(1)</script>' }),
  ).toBeTruthy();
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getAllByRole('row')).toHaveLength(4);
});
it('retains malformed JSON in a source preview and exposes a warning', async () => {
  render(
    <TexionViewer content={createContent('{"a":}', { format: 'json' })} />,
  );
  await screen.findByText(/Invalid JSON:/);
  expect(screen.getByText('{"a":}')).toBeTruthy();
});
