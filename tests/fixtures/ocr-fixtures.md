# OCR smoke fixtures

`ocr-page.png` and `ocr-scanned.pdf` contain the authored text `HELLO WORLD 123`. The PDF embeds a raster image with no native text layer. Generate both with `node scripts/create-ocr-fixture.mjs`; set `TEXION_TEST_FONT` to a readable font file when the default DejaVu Sans Bold path is unavailable. The font is used to draw the fixture; a font file is not embedded or redistributed here.

These are deterministic integration examples, not a representative OCR quality corpus. `scanned.pdf` predates them and is actually a blank no-text PDF; keep it to test native extraction's no-text behavior, not as an OCR accuracy sample.
