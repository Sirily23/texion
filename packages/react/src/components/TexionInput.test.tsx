// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { TexionInput } from './TexionInput';

afterEach(cleanup);

it('places previews above the input by default and lets users move them below', () => {
  render(<TexionInput preview defaultValue="A draft" />);
  const input = screen.getByRole('textbox');
  const preview = screen.getByRole('button', { name: 'Preview message' });
  expect(
    preview.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Preview position' }), {
    target: { value: 'below' },
  });
  expect(
    input.compareDocumentPosition(
      screen.getByRole('button', { name: 'Preview message' }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect((input as HTMLTextAreaElement).value).toBe('A draft');
});

it('supports an initial position below the input', () => {
  render(
    <TexionInput preview defaultValue="A draft" previewPosition="below" />,
  );
  expect(
    screen
      .getByRole('textbox')
      .compareDocumentPosition(
        screen.getByRole('button', { name: 'Preview message' }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
