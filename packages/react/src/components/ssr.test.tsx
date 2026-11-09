// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { TexionInput, DocumentViewer, HighlightedTextarea } from '../index';

it('imports and renders on the server without browser globals', () => {
  expect(typeof window).toBe('undefined');
  expect(() =>
    renderToString(<TexionInput highlight defaultValue="# Server" />),
  ).not.toThrow();
  expect(() =>
    renderToString(<HighlightedTextarea value="**Server**" />),
  ).not.toThrow();
  expect(() =>
    renderToString(<DocumentViewer input="# Server" />),
  ).not.toThrow();
});
