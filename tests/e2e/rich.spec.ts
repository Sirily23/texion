import { expect, test } from '@playwright/test';

const markdown =
  '# Project Update\n\n**Important:** Completed the API integration.\n\n- Authentication\n- Database';

test('pastes editable Markdown, preserves engine undo, continues editing, submits and renders the same content', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Rich draft', exact: true });
  await editor.click();
  await page.evaluate((text) => navigator.clipboard.writeText(text), markdown);
  await editor.press('Control+V');
  await expect(editor.locator('h1')).toHaveText('Project Update');
  await expect(editor.locator('li')).toHaveText(['Authentication', 'Database']);
  await expect(editor.locator('.texion-rich-bold')).toHaveText('Important:');
  await editor.press('Control+Z');
  await expect(editor).toHaveText('');
  await editor.press('Control+Shift+Z');
  await expect(editor.locator('h1')).toHaveText('Project Update');
  await editor.press('Control+End');
  await editor.press('End');
  await editor.pressSequentially(' integration');
  await expect(editor.locator('li').last()).toHaveText('Database integration');
  await page
    .getByRole('button', { name: 'Send rich content', exact: true })
    .click();
  const submitted = page.getByRole('region', {
    name: 'Submitted rich content',
    exact: true,
  });
  await expect(
    submitted.getByRole('heading', { name: 'Project Update' }),
  ).toBeVisible();
  await expect(submitted.locator('li')).toHaveText([
    'Authentication',
    'Database integration',
  ]);
  await expect(submitted.locator('strong')).toHaveText('Important:');
  expect(
    JSON.parse((await page.getByTestId('rich-export').textContent())!)
      .originalSource,
  ).toBe(markdown);
});

test('switches between source and rich editing while preserving intended content', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Rich draft', exact: true });
  await editor.click();
  await page.evaluate((text) => navigator.clipboard.writeText(text), markdown);
  await editor.press('Control+V');
  await expect(editor.locator('h1')).toHaveText('Project Update');
  await page
    .getByRole('button', { name: 'Edit Markdown source', exact: true })
    .click();
  const source = page.getByRole('textbox', { name: 'Rich draft', exact: true });
  expect(await source.evaluate((element) => element.tagName)).toBe('TEXTAREA');
  await source.fill((await source.inputValue()) + '\n\nAdded in source mode.');
  await page
    .getByRole('button', { name: 'Edit rich content', exact: true })
    .click();
  await expect(editor.locator('h1')).toHaveText('Project Update');
  await expect(
    editor.getByText('Added in source mode.', { exact: true }),
  ).toBeVisible();
});

test('converts typed shortcuts, keeps Enter editable, and guards composition submission', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Rich draft', exact: true });
  await editor.click();
  await editor.pressSequentially('# Heading');
  await expect(editor.locator('h1')).toHaveText('Heading');
  await editor.press('Enter');
  await editor.pressSequentially('Paragraph');
  await expect(editor.locator('p')).toContainText('Paragraph');
  await expect(
    page.getByRole('region', { name: 'Submitted rich content', exact: true }),
  ).toHaveCount(0);
  await editor.dispatchEvent('compositionstart');
  await page
    .getByRole('button', { name: 'Send rich content', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Submitted rich content', exact: true }),
  ).toHaveCount(0);
  await editor.dispatchEvent('compositionend');
  await editor.click();
  await editor.press('Control+Enter');
  await expect(
    page.getByRole('region', { name: 'Submitted rich content', exact: true }),
  ).toBeVisible();
});

test('ignores clipboard HTML, blocks unsafe links and never fetches pasted images', async ({
  page,
}) => {
  const remote: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://example.com')) {
      remote.push(request.url());
    }
  });
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Rich draft', exact: true });
  await editor.click();
  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.setData(
      'text/plain',
      '# Safe\n\n[blocked](javascript:alert%281%29) [ok](https://example.com) [relative](docs/page) [query](?q=1) ![remote](https://example.com/a.png)\n\n<img src=https://example.com/b.png onerror=alert(1)>',
    );
    data.setData(
      'text/html',
      '<img src="https://example.com/html.png" onerror="alert(1)">',
    );
    element.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(editor.locator('h1')).toHaveText('Safe');
  await expect(editor.locator('img, script, iframe')).toHaveCount(0);
  await expect(
    editor.locator('a[href^="javascript:"], a[href^="data:"]'),
  ).toHaveCount(0);
  await expect(
    editor.getByRole('link', { name: 'relative', exact: true }),
  ).toHaveAttribute('href', 'docs/page');
  await expect(
    editor.getByRole('link', { name: 'query', exact: true }),
  ).toHaveAttribute('href', '?q=1');
  await page
    .getByRole('button', { name: 'Send rich content', exact: true })
    .click();
  const submitted = page.getByRole('region', {
    name: 'Submitted rich content',
    exact: true,
  });
  await expect(submitted.getByRole('heading', { name: 'Safe' })).toBeVisible();
  await expect(submitted.locator('img, script, iframe')).toHaveCount(0);
  expect(remote).toEqual([]);
});

test('retains front matter and tables in source mode instead of flattening them', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Rich draft', exact: true });
  const source =
    '---\ntitle: Keep this\n---\n# Structured\n\n| A | B |\n| - | - |\n| one | two |';
  await editor.click();
  await page.evaluate((text) => navigator.clipboard.writeText(text), source);
  await editor.press('Control+V');
  await expect(editor).toHaveValue(source);
  await page
    .getByRole('button', { name: 'Send rich content', exact: true })
    .click();
  const submitted = page.getByRole('region', {
    name: 'Submitted rich content',
    exact: true,
  });
  await expect(
    submitted.getByRole('heading', { name: 'Structured' }),
  ).toBeVisible();
  await expect(submitted.getByRole('table')).toBeVisible();
  expect(
    JSON.parse((await page.getByTestId('rich-export').textContent())!).source,
  ).toBe(source);
});

test('offers source editing for pastes above the rich import limit', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'Rich draft', exact: true });
  const text = '# Large\n' + 'content '.repeat(7000);
  await editor.click();
  await page.evaluate((value) => navigator.clipboard.writeText(value), text);
  await editor.press('Control+V');
  await expect(page.getByRole('alert')).toContainText(
    'exceeds the rich editor limit',
  );
  await page.getByRole('button', { name: 'Edit source', exact: true }).click();
  await editor.click();
  await editor.press('Control+V');
  await expect(editor).toHaveValue(text);
  await expect(editor.locator('..')).toHaveAttribute(
    'data-highlight-reason',
    'too-large',
  );
});
