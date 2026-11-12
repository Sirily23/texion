// Authored synthetic fixture: no third-party document content.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';
const font =
  process.env.TEXION_TEST_FONT ??
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
if (!GlobalFonts.registerFromPath(font, 'FixtureSans'))
  throw new Error(
    'Set TEXION_TEST_FONT to a readable font file to regenerate the fixture.',
  );
const canvas = createCanvas(1200, 240);
const context = canvas.getContext('2d');
context.fillStyle = '#ffffff';
context.fillRect(0, 0, 1200, 240);
context.fillStyle = '#000000';
context.font = '72px FixtureSans';
context.fillText('HELLO WORLD 123', 70, 145);
await writeFile(
  new URL('../tests/fixtures/ocr-page.png', import.meta.url),
  canvas.toBuffer('image/png'),
);
const jpeg = canvas.toBuffer('image/jpeg');
const content = Buffer.from('q 600 0 0 120 0 0 cm /Image1 Do Q');
const objects = [
  Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
  Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
  Buffer.from(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 120] /Resources << /XObject << /Image1 4 0 R >> >> /Contents 5 0 R >>',
  ),
  Buffer.concat([
    Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width 1200 /Height 240 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    ),
    jpeg,
    Buffer.from('\nendstream'),
  ]),
  Buffer.concat([
    Buffer.from(`<< /Length ${content.length} >>\nstream\n`),
    content,
    Buffer.from('\nendstream'),
  ]),
];
const chunks = [Buffer.from('%PDF-1.4\n')];
const offsets = [0];
let length = chunks[0].length;
objects.forEach((object, index) => {
  offsets.push(length);
  const chunk = Buffer.concat([
    Buffer.from(`${index + 1} 0 obj\n`),
    object,
    Buffer.from('\nendobj\n'),
  ]);
  chunks.push(chunk);
  length += chunk.length;
});
chunks.push(
  Buffer.from(
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
      .join(
        '',
      )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`,
  ),
);
await writeFile(
  new URL('../tests/fixtures/ocr-scanned.pdf', import.meta.url),
  Buffer.concat(chunks),
);
