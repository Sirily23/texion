# OCR for scanned PDFs

OCR is an opt-in stage inside the PDF adapter. The default `pdfAdapter` still extracts native text without loading an OCR engine, worker, or language model. These workspace packages are experimental and unpublished; run `pnpm install` and `pnpm build` in this repository before using their built entry points.

## What works

- Native text is preserved per page, with numbered `document.pages` and joined `document.raw`.
- The PDF adapter defaults to keeping any non-whitespace native text (`minCharsPerPage: 1`). Raising that threshold marks short-text pages as OCR candidates; it does not prove that a page is scanned or blank.
- An optional local Tesseract engine recognizes rendered PNG pages in an owned worker. Initialization and recognition can both be terminated.
- A generic server/hosted engine adapter accepts your transport and response mapper. Texion supplies no endpoint, credentials, or hosted OCR service.
- Progress, approval, cancellation, deadlines, partial failures, and guarded submit use the existing document lifecycle.

## Enable local OCR

Use the optional `@texion/ocr-tesseract/browser` entry and replace the PDF adapter in the registry. Do not append a second adapter with the same `pdf` ID.

```tsx
import { useMemo } from 'react';
import { createPdfAdapter, createRegistry } from '@texion/core';
import { TexionInput, useOcrApproval } from '@texion/react';
import { createTesseractEngine } from '@texion/ocr-tesseract/browser';

function ScannedPdfInput() {
  const approval = useOcrApproval();
  const adapters = useMemo(() => {
    const pdf = createPdfAdapter({
      ocr: {
        engine: createTesseractEngine({
          workerPath: '/texion-ocr/worker.min.js',
          corePath: '/texion-ocr/core',
          langPath: '/texion-ocr/lang',
          languages: ['eng'],
        }),
        trigger: 'ask',
        requestApproval: approval.requestApproval,
      },
    });
    return createRegistry().map((adapter) =>
      adapter.format === 'pdf' ? pdf : adapter,
    );
  }, [approval.requestApproval]);

  return (
    <>
      <TexionInput adapters={adapters} preview onSubmit={save} />
      {approval.pending.map(({ id, request }) => (
        <section key={id} aria-label="OCR approval">
          <p>Recognize {request.pageNumbers.length} candidate pages locally?</p>
          <button onClick={() => approval.approve(id)}>Recognize pages</button>
          <button onClick={() => approval.deny(id)}>Use native text</button>
        </section>
      ))}
    </>
  );
}
```

`save` is your application callback. Engine identity and page selection are available in the approval request, alongside `uploadsData`, the operation signal, and document ID/name when called through the controller. The hook manages pending choices; your application owns their presentation and wording. Requests are removed on cancellation and denied when the hook unmounts.

### Serve assets explicitly

Browser worker, core, and language paths are required. Texion does not select a CDN. At build time, the optional Node helper can copy installed assets and a language directory you provide:

```js
import { copyTesseractAssets } from '@texion/ocr-tesseract/assets';
await copyTesseractAssets('public/texion-ocr', '/path/to/language-files');
```

The language directory must contain `.traineddata` or `.traineddata.gz` files matching the configured language IDs and gzip setting. The helper copies the pinned Tesseract worker and installed core variants too. It downloads nothing. The repository's docs script uses its local English model fixture to prepare the scanned-PDF playground.

Asset fetching is still network activity. Self-hosting prevents implicit third-party asset requests; offline browser use additionally needs your host's asset caching or service worker. `cacheMethod` can opt into Tesseract's language cache; its default here is `none`. It does not provision an offline application or cache every worker/core asset.

The engine package pins Tesseract.js 6.0.1 and drives its worker protocol directly so it owns the worker before model initialization finishes. Protocol upgrades must pass the real-engine tests. It returns normalized Tesseract confidence when available; that score is not a calibrated probability. Block-level boxes are accepted by core but not currently emitted by this Tesseract adapter.

## Node

Use `@texion/ocr-tesseract/node`, a filesystem language directory, and an explicit native canvas import:

```ts
import { createPdfAdapter, processDocument } from '@texion/core';
import { createTesseractEngine } from '@texion/ocr-tesseract/node';

const pdf = createPdfAdapter({
  canvasImport: () => import('@napi-rs/canvas'),
  ocr: { engine: createTesseractEngine({ langPath: '/models/eng' }) },
});
const document = await processDocument(file, { adapters: [pdf] });
```

The host installs the canvas implementation; core does not import it automatically. This repository tests `@napi-rs/canvas` 0.1.100 with pinned unpdf 1.3.2. Node recognition uses an owned worker thread and local core files. It has no implicit language download because `langPath` is required.

## Server or hosted OCR

```ts
import { createHttpOcrEngine } from '@texion/ocr-http';

const engine = createHttpOcrEngine({
  id: 'my-parser',
  kind: 'server',
  recognize: async (page) => {
    const response = await fetch('/your-ocr-endpoint', {
      method: 'POST',
      body: new Blob([new Uint8Array(page.bytes)], { type: 'image/png' }),
      signal: page.signal,
    });
    if (!response.ok) throw new Error('OCR request failed');
    const result = await response.json();
    return { text: result.text };
  },
});
```

The endpoint, authentication, response validation/mapping, billing, and server cancellation are host responsibilities. Configure this engine on `createPdfAdapter` and supply `requestApproval`. Non-local engines always require affirmative approval, even if `trigger` is `auto` or an engine falsely declares `uploadsData: false`. No renderer or engine session starts before approval. `off` never recognizes pages; `ask` also asks before local OCR. Local engines default to `auto`; non-local engines default to `ask`.

These checks govern trusted adapters, not arbitrary JavaScript. Engine declarations are not a network sandbox. Aborting a request cannot guarantee that a remote server stops work; the transport must implement any provider-specific cancellation.

## Limits and results

Defaults: 20 selected OCR pages, 30 seconds per page, 120 seconds total OCR time, 60 seconds awaiting approval, 200 DPI, 16 million rendered pixels, 20 MB per PNG, and 5,000 blocks per page. Existing document limits still apply; native PDF processing allows up to 200 pages by default. Native and OCR text share the extraction character budget. Reaching the OCR page budget preserves other pages' native text and reports partial extraction.

`concurrency` controls document lanes (1 by default, at most 4). A shared default scheduler allows one OCR session across documents. Supply a shared `createOcrScheduler(n)` when you deliberately want more simultaneous sessions. Total deadlines include scheduler waiting and initialization, but approval has its own deadline.

`onPageError: 'skip'` preserves available text and attaches page errors and document warnings. Choose `'fail'` to reject processing instead. Caller cancellation removes the document through the existing controller; it does not turn cancellation into a successful partial result. Empty OCR output never replaces existing native text.

`document.ocr` records engine ID, final state, attempted, processed, skipped, and failed counts. Pages record native or `ocr:<engine-id>` provenance and optional confidence/blocks. OCR replacements keep existing short text in `nativeText`. OCR pages also retain rendered image dimensions, DPI and rotation so normalized boxes can be interpreted. Page results and progress snapshots are immutable. A ready document can still have incomplete extraction; applications that require complete text should inspect warnings and the OCR summary before accepting submission.

## Execution boundaries

Tesseract recognition, including model initialization, runs in a terminable worker. Browser PDF decoding and canvas rendering remain cooperative; canceling the render task and checking pixel limits is not hard main-thread isolation. A custom `renderer(bytes, request)` receives original PDF bytes and bounded page instructions. Copy bytes before transferring them to an owned worker; the host owns that renderer's cancellation and cleanup. A synchronous stalled renderer cannot be preempted by a JavaScript timer. Full PDF parsing/rendering isolation requires a host-provided worker/process renderer and remains future work. Existing native extraction does not gain a hard deadline merely by enabling OCR.

Saved messages retain source and original attachment references. OCR results are transient processing output; the portable message contract does not automatically store them. Hosts can persist extracted results separately. In the playground, choose Scanned PDF again to recognize an original saved scan after reloading; approval is requested again.

## Evidence and remaining work

Tests exercise fake-engine deadlines, denial, partial failure, stale results, concurrency, output limits, and cancellation; real tests recognize an authored English image and scanned PDF. The browser test requires approval and checks that observed HTTP requests stay on the local site. `pnpm benchmark:ocr` emits a reproducible smoke report for the authored native/scanned fixtures, including initialization time and exact text matching. This is functional evidence, not a representative extraction benchmark, security audit, or proof of multilingual/layout quality.

Implementation references: [Tesseract worker API](https://github.com/naptha/tesseract.js/blob/v6.0.1/docs/api.md), [asset configuration](https://github.com/naptha/tesseract.js/blob/v6.0.1/docs/local-installation.md), and the installed unpdf 1.3.2 source. Re-evaluate both APIs before upgrading.
