import { expect, test } from '@playwright/test';

test('preserves native Markdown paste, selection, undo and redo', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const textarea = page.getByRole('textbox', { name: 'Message', exact: true });
  const source =
    '# Meeting Notes\n\n**Important:** Review the proposal.\n\n- Check budget\n- Confirm timeline\n';
  await textarea.fill('😀 replace tail');
  await textarea.evaluate((element: HTMLTextAreaElement) => {
    element.focus();
    element.setSelectionRange(3, 10);
  });
  await page.evaluate((text) => navigator.clipboard.writeText(text), source);
  await textarea.press('Control+V');
  const expected = '😀 ' + source + ' tail';
  await expect(textarea).toHaveValue(expected);
  expect(
    await textarea.evaluate(
      (element: HTMLTextAreaElement) => element.selectionStart,
    ),
  ).toBe(3 + source.length);
  await expect(
    page.locator('.texion-input [data-highlight-kind="bold"]'),
  ).toHaveText('**Important:**');
  await expect(page.locator('.texion-attachments')).toHaveCount(0);
  await textarea.press('Control+Z');
  await expect(textarea).toHaveValue('😀 replace tail');
  await textarea.press('Control+Shift+Z');
  await expect(textarea).toHaveValue(expected);
  await page
    .getByRole('button', { name: 'Preview message', exact: true })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'Preview of Text' })
      .getByText('Important:', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  const submitted = JSON.parse(
    await page.getByLabel('Submitted content').innerText(),
  );
  expect(submitted.text).toBe(expected);
  expect(submitted.documents).toEqual([]);
});

test('restores plain editing for large content and composition without replacing the textarea', async ({
  page,
}) => {
  await page.goto('/');
  const textarea = page.getByRole('textbox', {
    name: 'Description',
    exact: true,
  });
  await textarea.evaluate((element) =>
    element.setAttribute('data-identity', 'original'),
  );
  await textarea.fill('# Long\n' + 'content '.repeat(3000));
  await expect(textarea.locator('..')).toHaveAttribute(
    'data-highlight-reason',
    'too-large',
  );
  await expect(
    textarea.locator('..').locator('[data-texion-highlight-overlay]'),
  ).toHaveCount(0);
  expect(
    await textarea.evaluate(
      (element) => getComputedStyle(element).webkitTextFillColor,
    ),
  ).not.toBe('rgba(0, 0, 0, 0)');
  await textarea.fill('**日本語**');
  await expect(textarea).toHaveAttribute('data-identity', 'original');
  await expect(textarea.locator('..')).toHaveAttribute(
    'data-highlighted',
    'true',
  );
  await textarea.dispatchEvent('compositionstart');
  await expect(
    textarea.locator('..').locator('[data-texion-highlight-overlay]'),
  ).toHaveCount(0);
  await textarea.dispatchEvent('compositionend');
  await expect(textarea.locator('..')).toHaveAttribute(
    'data-highlighted',
    'true',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(
    textarea.locator('..').locator('[data-texion-highlight-overlay]'),
  ).toHaveCount(0);
});

test('matches textarea geometry across wrapping, tabs, scrolling, resizing and font changes', async ({
  page,
}) => {
  await page.goto('/');
  const textarea = page.getByRole('textbox', {
    name: 'Description',
    exact: true,
  });
  await textarea.fill(
    '# Header 😀\n\t**bold** and *italic* with [link](https://example.com)\n' +
      'A long wrapping line with spaces and more words. '.repeat(8) +
      '\n' +
      'last line\n'.repeat(25),
  );
  await textarea.evaluate((element: HTMLTextAreaElement) => {
    Object.assign(element.style, {
      width: '327px',
      height: '180px',
      padding: '11px 17px',
      border: '3px solid black',
      letterSpacing: '0.5px',
      lineHeight: '27px',
      fontSize: '17px',
      tabSize: '6',
    });
  });
  const geometry = () =>
    textarea.evaluate((element: HTMLTextAreaElement) => {
      const overlay = element.parentElement!.querySelector<HTMLElement>(
        '[data-texion-highlight-overlay]',
      )!;
      const viewport = overlay.parentElement!;
      const a = element.getBoundingClientRect();
      const b = viewport.getBoundingClientRect();
      const sourceStyle = getComputedStyle(element);
      const mirrorStyle = getComputedStyle(overlay);

      return {
        left: b.left - a.left - element.clientLeft,
        top: b.top - a.top - element.clientTop,
        width: viewport.clientWidth - element.clientWidth,
        height: viewport.clientHeight - element.clientHeight,
        contentHeight: overlay.scrollHeight - element.scrollHeight,
        font: mirrorStyle.font,
        sourceFont: sourceStyle.font,
        spacing: mirrorStyle.letterSpacing,
        sourceSpacing: sourceStyle.letterSpacing,
        tabSize: mirrorStyle.tabSize,
        sourceTabSize: sourceStyle.tabSize,
        overlayTop: viewport.scrollTop,
        overlayLeft: viewport.scrollLeft,
        sourceTop: element.scrollTop,
        sourceLeft: element.scrollLeft,
      };
    });
  await expect
    .poll(async () => {
      const g = await geometry();

      return Math.max(
        Math.abs(g.left),
        Math.abs(g.top),
        Math.abs(g.width),
        Math.abs(g.height),
        Math.abs(g.contentHeight),
      );
    })
    .toBeLessThanOrEqual(1);
  const g = await geometry();
  expect(g.font).toBe(g.sourceFont);
  expect(g.spacing).toBe(g.sourceSpacing);
  expect(g.tabSize).toBe(g.sourceTabSize);
  await textarea.evaluate((element: HTMLTextAreaElement) => {
    element.scrollTop = 160;
  });
  await expect
    .poll(async () => {
      const g = await geometry();

      return (
        Math.abs(g.overlayTop - g.sourceTop) < 0.5 &&
        Math.abs(g.overlayLeft - g.sourceLeft) < 0.5
      );
    })
    .toBe(true);
  await textarea.evaluate((element: HTMLTextAreaElement) => {
    element.style.width = '223px';
    element.style.fontFamily = 'serif';
  });
  await expect
    .poll(async () => {
      const g = await geometry();

      return (
        Math.abs(g.contentHeight) <= 1 &&
        g.font === g.sourceFont &&
        g.width === 0
      );
    })
    .toBe(true);
  await textarea.evaluate((element: HTMLTextAreaElement) => {
    element.wrap = 'off';
  });
  await expect
    .poll(async () => Math.abs((await geometry()).contentHeight))
    .toBeLessThanOrEqual(1);
  await textarea.evaluate((element: HTMLTextAreaElement) => {
    element.scrollLeft = 180;
  });
  await expect
    .poll(async () => {
      const g = await geometry();

      return (
        Math.abs(g.overlayTop - g.sourceTop) < 0.5 &&
        Math.abs(g.overlayLeft - g.sourceLeft) < 0.5
      );
    })
    .toBe(true);
});

test('keeps highlighted text sharp and aligned during mouse-wheel scrolling at fractional zoom', async ({
  page,
}) => {
  await page.goto('/');
  const textarea = page.getByRole('textbox', { name: 'Message', exact: true });
  const source =
    '# Scroll notes\n' +
    Array.from(
      { length: 80 },
      (_, index) => `**Line ${index}** with Markdown and native scrolling.\n`,
    ).join('');
  await textarea.fill(source);
  await page.evaluate(() => {
    document.body.style.zoom = '1.25';
  });
  await textarea.evaluate((element: HTMLTextAreaElement) => {
    element.style.lineHeight = '23.5px';
    element.style.fontSize = '17px';
    element.scrollTop = 0;
  });
  await textarea.hover();
  const selection = await textarea.evaluate(
    (element: HTMLTextAreaElement) => element.selectionStart,
  );
  await page.mouse.wheel(0, 233.6);
  await expect
    .poll(() =>
      textarea.evaluate((element: HTMLTextAreaElement) => element.scrollTop),
    )
    .toBeGreaterThan(0);
  const read = () =>
    textarea.evaluate((element: HTMLTextAreaElement) => {
      const overlay = element.parentElement!.querySelector<HTMLElement>(
        '[data-texion-highlight-overlay]',
      )!;
      const viewport = overlay.parentElement!;
      return {
        difference: Math.abs(viewport.scrollTop - element.scrollTop),
        transform: getComputedStyle(overlay).transform,
        hiddenNativeText: getComputedStyle(element).webkitTextFillColor,
        selected: element.selectionStart,
      };
    });
  await expect.poll(async () => (await read()).difference).toBeLessThan(0.5);
  expect((await read()).transform).toBe('none');
  expect((await read()).hiddenNativeText).toBe('rgba(0, 0, 0, 0)');
  expect((await read()).selected).toBe(selection);
  await expect(textarea).toHaveValue(source);
  await page.mouse.wheel(0, -113.2);
  await expect.poll(async () => (await read()).difference).toBeLessThan(0.5);
});
