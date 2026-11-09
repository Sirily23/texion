import { expect, test } from '@playwright/test';

test('upload, preview safely, remove, reselect, and submit original content', async ({
  page,
}) => {
  const source =
    '# Uploaded heading\n\n[unsafe](javascript:alert%281%29) ![remote](https://example.com/image.png)\n\n<script>alert(1)</script>';
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://example.com')) {
      remoteRequests.push(request.url());
    }
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Shared core engine' }),
  ).toBeVisible();
  const picker = page.getByLabel('Choose Markdown files');
  const file = {
    name: 'note.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(source),
  };
  await picker.setInputFiles(file);
  await page.getByRole('button', { name: 'Preview note.md' }).click();
  const preview = page.getByRole('region', { name: 'Preview of note.md' });
  await expect(
    preview.getByRole('heading', { name: 'Uploaded heading' }),
  ).toBeVisible();
  await expect(preview.locator('script, img, a')).toHaveCount(0);
  expect(remoteRequests).toEqual([]);
  await page.getByRole('button', { name: 'Remove note.md' }).click();
  await expect(preview).toHaveCount(0);
  await picker.setInputFiles(file);
  await expect(page.getByText('ready', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Message' }).fill('Original message');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByLabel('Submitted content')).toContainText(
    'Original message',
  );
  await expect(page.getByLabel('Submitted content')).toContainText(
    'Uploaded heading',
  );
  const submitted = JSON.parse(
    await page.getByLabel('Submitted content').innerText(),
  );
  expect(submitted.documents[0].raw).toBe(source);
});

test('keeps native composition and keyboard access', async ({ page }) => {
  await page.goto('/');
  const textarea = page.getByRole('textbox', { name: 'Message' });
  await textarea.fill('日本語');
  await textarea.dispatchEvent('compositionstart');
  await textarea.press('Enter');
  await expect(page.getByLabel('Submitted content')).toHaveCount(0);
  await textarea.dispatchEvent('compositionend');
  await textarea.press('Shift+Enter');
  await expect(page.getByLabel('Submitted content')).toHaveCount(0);
  await textarea.press('Enter');
  await expect(page.getByLabel('Submitted content')).toContainText('日本語');
  await textarea.focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Preview message', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Attach Markdown' }),
  ).toBeFocused();
});

test('keeps nested drag feedback steady and leaves large text paste native', async ({
  page,
}) => {
  await page.goto('/');
  const root = page.locator('.texion-input').filter({
    has: page.getByRole('textbox', { name: 'Message', exact: true }),
  });
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(
      new File(['# Dropped'], 'drop.md', { type: 'text/markdown' }),
    );

    return data;
  });
  await root.dispatchEvent('dragenter', { dataTransfer: transfer });
  const textarea = page.getByRole('textbox', { name: 'Message' });
  await textarea.dispatchEvent('dragenter', { dataTransfer: transfer });
  await root.dispatchEvent('dragleave', { dataTransfer: transfer });
  await expect(page.getByText('Drop Markdown files here')).toBeVisible();
  await textarea.dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.getByText('Drop Markdown files here')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Remove drop.md' }),
  ).toBeVisible();
  const prevented = await textarea.evaluate((element) => {
    const clipboard = new DataTransfer();
    clipboard.setData(
      'text/plain',
      '# Large paste\n' + 'content '.repeat(25000),
    );

    return !element.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: clipboard,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  expect(prevented).toBe(false);
  await expect(page.getByText('Pasted Markdown', { exact: true })).toHaveCount(
    0,
  );
  await expect(textarea).toHaveValue('');
  await textarea.fill('Still editable');
  await expect(textarea).toHaveValue('Still editable');
});
