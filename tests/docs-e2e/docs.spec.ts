import { expect, test } from '@playwright/test';

test('renders a live home example and navigates to the synced guides', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Write, attach, and paste.',
  );
  await page.locator('#nd-nav [data-search-full]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const themeSwitch = page.locator('#nd-nav [data-theme-toggle]').first();
  await expect(themeSwitch.locator('svg.bg-fd-accent')).toHaveCount(1);
  await themeSwitch.click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await themeSwitch.click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  const composer = await page.locator('.home-demo').boundingBox();
  expect(composer).not.toBeNull();
  expect(
    Math.abs(
      composer!.x + composer!.width / 2 - page.viewportSize()!.width / 2,
    ),
  ).toBeLessThan(1);
  await page.getByRole('button', { name: 'Edit source', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Try the composer' })
    .fill('# A real preview');
  await page.getByRole('button', { name: 'Submit demo' }).click();
  await expect(
    page
      .getByRole('region', { name: 'Demo submission' })
      .getByRole('heading', { name: 'A real preview' }),
  ).toBeVisible();
  await page.getByLabel('Attach a demo file').setInputFiles({
    name: 'idea.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('A local idea'),
  });
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Preview of idea.txt' }),
  ).toContainText('A local idea');
  await page.getByRole('button', { name: 'Submit demo' }).click();
  await expect(
    page.getByRole('region', { name: 'Demo submission' }),
  ).toContainText('idea.txt');
  await page.getByRole('link', { name: 'Get started', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Getting started' }),
  ).toBeVisible();
});

test('searches the static documentation index', async ({ page }) => {
  await page.goto('/docs/');
  await page
    .getByRole('button', { name: /search/i })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByRole('combobox', { name: 'Search', exact: true })
    .fill('PDF');
  await expect(dialog).toContainText('Supported formats');
});

test('submits a local document through the real playground', async ({
  page,
}) => {
  await page.goto('/playground/');
  await page
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('My draft');
  await page.getByLabel('Choose files').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Local attachment content'),
  });
  await page.getByRole('button', { name: 'Preview notes.txt' }).click();
  await expect(
    page.getByRole('region', { name: 'Preview of notes.txt' }),
  ).toContainText('Local attachment content');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  const result = page.getByRole('region', { name: 'Submission result' });
  await expect(result).toContainText('My draft');
  await expect(result).toContainText('notes.txt');
  const portable = JSON.parse(
    (await result.locator('.submission-json pre').textContent())!,
  );
  expect(portable.version).toBe(1);
  expect(portable.content.source).toBe('My draft');
  expect(portable.attachments[0]).toMatchObject({
    name: 'notes.txt',
    format: 'text',
  });
  expect(portable.attachments[0].reference).toMatch(/^file:/);
  expect(portable.attachments[0]).not.toHaveProperty('file');
  expect(portable.attachments[0]).not.toHaveProperty('raw');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(result).toContainText('My draft');
  await page.reload();
  await expect(result).toContainText('My draft');
  await result.getByRole('button', { name: 'Preview notes.txt' }).click();
  await expect(result).toContainText('Local attachment content');
  await result.getByRole('button', { name: 'Edit saved message' }).click();
  await expect(
    page.getByRole('textbox', { name: 'Description', exact: true }),
  ).toHaveValue('My draft');
  await expect(
    page.getByRole('region', { name: 'Interactive composer' }),
  ).toContainText('notes.txt');
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Updated draft');
  await page
    .getByRole('button', { name: 'Submit content', exact: true })
    .click();
  await expect(result).toContainText('Updated draft');
  await result.getByRole('button', { name: 'Clear saved message' }).click();
  await expect(result).toContainText('See what your app receives.');
});

test('fits the home and playground on a mobile viewport', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ['/', '/playground/']) {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (url === '/') {
      await page
        .getByRole('button', { name: 'Toggle Menu', exact: true })
        .click();
      await expect(
        page
          .locator('#nd-nav')
          .getByRole('link', { name: 'Documentation', exact: true }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Toggle Menu', exact: true })
        .click();
    }
    if (url === '/')
      await page.screenshot({
        path: testInfo.outputPath('home-mobile.png'),
        fullPage: true,
      });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test('submits through separate headless hooks', async ({ page }) => {
  await page.goto('/playground/');
  await page
    .getByRole('button', { name: 'Custom headless', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Custom draft' })
    .fill('Headless saved source');
  await page.getByRole('button', { name: 'Save custom draft' }).click();
  await expect(
    page.getByRole('region', { name: 'Submission result' }),
  ).toContainText('Headless saved source');
});

test('keeps dark documentation, links, controls and editor tokens readable', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');
  });
  for (const url of ['/', '/docs/guides/getting-started/', '/playground/']) {
    await page.goto(url);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(0, 0, 0)',
    );
    if (url === '/') {
      await page.screenshot({
        path: testInfo.outputPath('home-hero-dark.png'),
      });
      await page.screenshot({
        path: testInfo.outputPath('home-dark.png'),
        fullPage: true,
      });
      await page.getByRole('button', { name: 'JSON', exact: true }).click();
    }
    const samples = await page
      .locator(
        'body, .prose p, .prose a, pre code span[style], .home-principles h3, .home-principles a, .home-demo-heading, .home-attach, .home-demo-examples button, .home-demo-note, .home-text-link, .playground-controls button, .playground-help, .playground-footnote a',
      )
      .evaluateAll((elements) => {
        function luminance(rgb: Uint8ClampedArray) {
          const values = Array.from(rgb.slice(0, 3), (value) => {
            const channel = value / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
        }
        return elements
          .filter(
            (element) =>
              element.getClientRects().length && element.textContent?.trim(),
          )
          .map((element) => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const context = canvas.getContext('2d')!;
            const ancestors: Element[] = [];
            let ancestor: Element | null = element;
            while (ancestor) {
              ancestors.unshift(ancestor);
              ancestor = ancestor.parentElement;
            }
            context.fillStyle = '#000';
            context.fillRect(0, 0, 1, 1);
            for (const parent of ancestors) {
              context.fillStyle = getComputedStyle(parent).backgroundColor;
              context.fillRect(0, 0, 1, 1);
            }
            const background = luminance(context.getImageData(0, 0, 1, 1).data);
            context.fillStyle = getComputedStyle(element).color;
            context.fillRect(0, 0, 1, 1);
            const foreground = luminance(context.getImageData(0, 0, 1, 1).data);
            return {
              text:
                element === document.body
                  ? 'body'
                  : element.textContent!.trim().slice(0, 45),
              ratio:
                (Math.max(background, foreground) + 0.05) /
                (Math.min(background, foreground) + 0.05),
            };
          });
      });
    expect(samples.length).toBeGreaterThan(1);
    for (const sample of samples)
      expect(sample.ratio, `${url}: ${sample.text}`).toBeGreaterThanOrEqual(
        4.5,
      );
  }
  await page.evaluate(() => localStorage.setItem('theme', 'light'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(236, 238, 241)',
  );
  await page.goto('/');
  await expect(
    page.getByRole('textbox', { name: 'Try the composer' }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('home-light.png'),
    fullPage: true,
  });
});

test('recognizes a scanned PDF locally after explicit approval', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const requests: string[] = [];
  context.on('request', (request) => requests.push(request.url()));
  await page.goto('/playground/');
  await page.getByRole('button', { name: 'Scanned PDF', exact: true }).click();
  await page
    .getByLabel('Choose files')
    .setInputFiles('tests/fixtures/ocr-scanned.pdf');
  const approval = page.getByRole('region', { name: 'OCR approval' });
  await expect(approval).toBeVisible({ timeout: 60_000 });
  expect(requests.filter((url) => url.includes('/texion-ocr/'))).toHaveLength(
    0,
  );
  await approval.getByRole('button', { name: 'Recognize pages' }).click();
  await page
    .getByRole('button', { name: 'Preview ocr-scanned.pdf', exact: true })
    .click({ timeout: 60_000 });
  await expect(
    page.getByRole('region', { name: 'Preview of ocr-scanned.pdf' }),
  ).toContainText('HELLO WORLD 123');
  const origin = new URL(page.url()).origin;
  expect(
    requests.filter(
      (url) => /^https?:/.test(url) && new URL(url).origin !== origin,
    ),
  ).toEqual([]);
  expect(
    requests.some((url) => url.includes('/texion-ocr/worker.min.js')),
  ).toBe(true);
});
