import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { processDocument } from '../../process';

function bytes(extension: string) {
  return new Uint8Array(
    readFileSync(
      new URL(
        `../../../../../tests/fixtures/raster.${extension}`,
        import.meta.url,
      ),
    ),
  );
}
it.each([
  ['png', 'image/png'],
  ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
])(
  'reads %s as binary and retains the original file',
  async (extension, mime) => {
    const file = new File([bytes(extension!)], `photo.${extension}`, {
      type: mime!,
    });
    const document = await processDocument(file);
    expect(document.status).toBe('ready');
    expect(document.format).toBe('image');
    expect(document.raw).toBeUndefined();
    expect(document.file).toBe(file);
    expect(document.getPreview!().image).toEqual({
      mimeType: mime,
      width: 2,
      height: 3,
    });
    expect(document.getPreview!()).toBe(document.getPreview!());
  },
);
it('sniffs an unnamed image blob and enforces byte and pixel limits', async () => {
  const blob = new Blob([bytes('png')]);
  expect((await processDocument(blob)).format).toBe('image');
  expect((await processDocument(blob, { maxImagePixels: 5 })).error?.code).toBe(
    'too-large',
  );
  expect((await processDocument(blob, { maxFileSize: 1 })).error?.code).toBe(
    'too-large',
  );
});
it('rejects spoofed, truncated and unsupported images', async () => {
  expect(
    (await processDocument(new File([bytes('png')], 'wrong.jpeg'))).error?.code,
  ).toBe('invalid-image');
  expect(
    (
      await processDocument(
        new File(['<svg onload="alert(1)"></svg>'], 'image.png', {
          type: 'image/png',
        }),
      )
    ).error?.code,
  ).toBe('invalid-image');
  expect(
    (await processDocument(new File([bytes('png').slice(0, 30)], 'cut.png')))
      .error?.code,
  ).toBe('invalid-image');
  expect(
    (
      await processDocument(
        new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' }),
      )
    ).error?.code,
  ).toBe('unsupported');
});
it('still blocks images when the controller only accepts Markdown', async () => {
  const file = new File([bytes('png')], 'photo.png');
  expect(
    (await processDocument(file, { acceptedFormats: ['markdown'] })).status,
  ).toBe('error');
});
