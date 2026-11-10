import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const fixture = (extension: string) =>
  readFileSync(new URL(`../fixtures/raster.${extension}`, import.meta.url));

test('edits JSON, highlights syntax, warns on errors and submits exact source', async ({
  page,
}) => {
  await page.goto('/');
  const field = page.getByRole('textbox', {
    name: 'Structured draft',
    exact: true,
  });
  const composer = page.getByRole('region', {
    name: 'Structured content composer',
    exact: true,
  });
  await field.fill('{"unfinished":}');
  await expect(composer.getByRole('status')).toContainText('Invalid JSON');
  const source =
    '{ "amount": 9007199254740993, "html": "<img src=x onerror=alert(1)>" }';
  await field.fill(source);
  await expect(
    composer.locator('[data-highlight-kind="property"]'),
  ).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Submit structured content', exact: true })
    .click();
  const submitted = page.getByRole('region', {
    name: 'Structured submitted content',
    exact: true,
  });
  await expect(
    submitted.getByText('9007199254740993', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Structured source')).toHaveText(source);
  await expect(submitted.locator('img, script')).toHaveCount(0);
});

test('keeps CSV cells, escaped quotes and formulas as source data', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Content format', { exact: true }).selectOption('csv');
  const source =
    'name,note,value\nAda,"hello, world",001\nGrace,"a ""quote""\nand a newline",=1+1';
  await page
    .getByRole('textbox', { name: 'Structured draft', exact: true })
    .fill(source);
  await page
    .getByRole('button', { name: 'Submit structured content', exact: true })
    .click();
  const submitted = page.getByRole('region', {
    name: 'Structured submitted content',
    exact: true,
  });
  await expect(submitted.getByRole('table')).toBeVisible();
  await expect(
    submitted.getByRole('cell', { name: 'hello, world', exact: true }),
  ).toBeVisible();
  await expect(
    submitted.getByRole('cell', { name: '001', exact: true }),
  ).toBeVisible();
  await expect(
    submitted.getByRole('cell', { name: '=1+1', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Structured source')).toHaveText(source);
});

test('previews uploaded JSON and CSV through the same attachment lifecycle', async ({
  page,
}) => {
  await page.goto('/');
  const picker = page.getByLabel('Choose files', { exact: true });
  await picker.setInputFiles([
    {
      name: 'data.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"ready":true}'),
    },
    { name: 'data.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2') },
  ]);
  await page
    .getByRole('button', { name: 'Preview data.json', exact: true })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'Preview of data.json', exact: true })
      .getByText('true', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Preview data.csv', exact: true })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'Preview of data.csv', exact: true })
      .getByRole('table'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByLabel('Submitted content')).toContainText('data.json');
  await expect(page.getByLabel('Submitted content')).toContainText('data.csv');
});

for (const [extension, mime] of [
  ['png', 'image/png'],
  ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
]) {
  test(`decodes a local ${extension} image without remote requests`, async ({
    page,
  }) => {
    const remote: string[] = [];
    page.on('request', (request) => {
      if (
        /^https?:/.test(request.url()) &&
        !request.url().startsWith('http://127.0.0.1:4173')
      )
        remote.push(request.url());
    });
    await page.goto('/');
    await page.getByLabel('Choose files', { exact: true }).setInputFiles({
      name: `raster.${extension}`,
      mimeType: mime!,
      buffer: fixture(extension!),
    });
    await page
      .getByRole('button', { name: `Preview raster.${extension}`, exact: true })
      .click();
    const image = page.getByRole('img', {
      name: `raster.${extension}`,
      exact: true,
    });
    await expect(image).toBeVisible();
    expect(
      await image.evaluate((element: HTMLImageElement) => ({
        width: element.naturalWidth,
        height: element.naturalHeight,
      })),
    ).toEqual({ width: 2, height: 3 });
    expect(await image.getAttribute('src')).toMatch(/^blob:/);
    expect(remote).toEqual([]);
  });
}

test('revokes image preview URLs on removal and allows re-selection', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const records = { created: [] as string[], revoked: [] as string[] };
    (window as unknown as { imageUrls: typeof records }).imageUrls = records;
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      records.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      records.revoked.push(url);
      revoke(url);
    };
  });
  await page.goto('/');
  const file = {
    name: 'raster.png',
    mimeType: 'image/png',
    buffer: fixture('png'),
  };
  const picker = page.getByLabel('Choose files', { exact: true });
  await picker.setInputFiles(file);
  await page
    .getByRole('button', { name: 'Preview raster.png', exact: true })
    .click();
  const url = await page
    .getByRole('img', { name: 'raster.png', exact: true })
    .getAttribute('src');
  await page
    .getByRole('button', { name: 'Remove raster.png', exact: true })
    .click();
  await expect(
    page.getByRole('img', { name: 'raster.png', exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { imageUrls: { revoked: string[] } }).imageUrls
          .revoked,
    ),
  ).toContain(url);
  await picker.setInputFiles(file);
  await expect(
    page.getByRole('button', { name: 'Preview raster.png', exact: true }),
  ).toBeVisible();
});

test('rejects SVG content disguised as a PNG before making a preview URL', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Choose files', { exact: true }).setInputFiles({
    name: 'fake.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<svg onload="alert(1)"></svg>'),
  });
  await expect(page.getByRole('alert')).toContainText(
    'not a supported raster image',
  );
  await expect(
    page.getByRole('button', { name: 'Preview fake.png', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('img')).toHaveCount(0);
});

test('switches a standalone JSON paste from rich editing into source mode', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const draft = page.getByRole('textbox', { name: 'Rich draft', exact: true });
  const source = '{"n":9007199254740993,"message":"original"}';
  await draft.click();
  await page.evaluate((text) => navigator.clipboard.writeText(text), source);
  await draft.press('Control+V');
  await expect(draft).toHaveValue(source);
  await page
    .getByRole('button', { name: 'Send rich content', exact: true })
    .click();
  const submitted = page.getByRole('region', {
    name: 'Submitted rich content',
    exact: true,
  });
  await expect(
    submitted.getByText('9007199254740993', { exact: true }),
  ).toBeVisible();
  const content = JSON.parse(
    (await page.getByTestId('rich-export').textContent())!,
  );
  expect(content.format).toBe('json');
  expect(content.source).toBe(source);
});

test('inserts structured data into an existing rich draft as a literal code block', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const draft = page.getByRole('textbox', { name: 'Rich draft', exact: true });
  await draft.click();
  await draft.pressSequentially('Notes');
  await draft.press('Enter');
  const source = '{\n  "n": 9007199254740993\n}';
  await page.evaluate((text) => navigator.clipboard.writeText(text), source);
  await draft.press('Control+V');
  await expect(draft.locator('.texion-rich-code')).toHaveText(source);
  await page
    .getByRole('button', { name: 'Send rich content', exact: true })
    .click();
  const submitted = page.getByRole('region', {
    name: 'Submitted rich content',
    exact: true,
  });
  await expect(submitted.locator('pre code')).toHaveText(source);
});
