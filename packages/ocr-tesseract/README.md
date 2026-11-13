# @texion/ocr-tesseract

Optional local OCR for scanned PDF pages in Texion. Recognition runs in a worker that can be terminated during initialization or processing.

```sh
npm install @texion/ocr-tesseract
```

```ts
import { createPdfAdapter, createRegistry } from '@texion/core';
import { createTesseractEngine } from '@texion/ocr-tesseract/browser';

const pdf = createPdfAdapter({
  ocr: {
    engine: createTesseractEngine({
      workerPath: '/texion-ocr/worker.min.js',
      corePath: '/texion-ocr/core',
      langPath: '/texion-ocr/lang',
      languages: ['eng'],
    }),
  },
});

const adapters = createRegistry().map((adapter) =>
  adapter.format === 'pdf' ? pdf : adapter,
);
```

Pass `adapters` to your Texion input or document controller. Native PDF text is kept; only candidate pages go through OCR.

You must serve the worker, core, and language files at the configured paths. Texion does not choose a CDN or download a language model implicitly. At build time, copy the installed worker/core assets and a language directory you provide:

```js
import { copyTesseractAssets } from '@texion/ocr-tesseract/assets';

await copyTesseractAssets('public/texion-ocr', '/path/to/language-files');
```

The language directory must contain matching `.traineddata` or `.traineddata.gz` files. Browser asset requests still use the network unless your app caches them for offline use.

For Node, import `@texion/ocr-tesseract/node`, supply a filesystem `langPath`, and configure the PDF adapter with a canvas implementation. See the OCR guide for the full setup.

Recognition uses pinned Tesseract.js 6.0.1. Native PDF decoding and page rendering remain cooperative; they do not yet have worker isolation. OCR quality varies, and the test fixtures are not a representative accuracy benchmark.

Experimental release.

[OCR guide](https://texion.web.app/docs/guides/ocr) · [Source](https://github.com/Sirily23/texion/tree/main/packages/ocr-tesseract) · [MIT license](LICENSE)
