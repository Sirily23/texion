# @texion/ocr-http

Connect your own server or hosted OCR service to Texion. You supply the endpoint, authentication, request format, and response mapping.

```sh
npm install @texion/ocr-http
```

```ts
import { createPdfAdapter } from '@texion/core';
import { createHttpOcrEngine } from '@texion/ocr-http';

const engine = createHttpOcrEngine({
  id: 'my-ocr-service',
  kind: 'server',
  async recognize(page) {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: new Blob([new Uint8Array(page.bytes)], { type: 'image/png' }),
      signal: page.signal,
    });
    if (!response.ok) throw new Error('OCR request failed');
    const result = await response.json();
    return { text: result.text };
  },
});

const pdf = createPdfAdapter({
  ocr: {
    engine,
    trigger: 'ask',
    requestApproval: async () => {
      // Replace with your application's approval flow.
      return false;
    },
  },
});
```

Replace the PDF adapter in your registry with `pdf`. Remote recognition does not start until your application approves it. In React, `useOcrApproval` can manage the pending choices while you provide the UI.

The transport must honor the supplied abort signal. Aborting a browser request does not guarantee that a remote service has stopped processing. No vendor URL, credentials, OCR service, or automatic local-to-remote fallback is included.

Experimental release.

[OCR guide](https://texion.pages.dev/docs/guides/ocr) · [Source](https://github.com/Sirily23/texion/tree/main/packages/ocr-http) · [MIT license](LICENSE)
