# @texion/core

Document parsing and file state for text and attachment inputs, without React.

```sh
npm install @texion/core
```

```ts
import { processDocument } from '@texion/core';

const document = await processDocument('# Hello from Texion');

if (document.status === 'ready') {
  console.log(document.raw, document.getPreview());
}
```

Pass a `File`, `Blob`, or text source. Markdown, TXT, JSON, CSV, PDF, DOCX, and PNG/JPEG/GIF/WebP attachments use the same document shape. PDF and Word extraction load their parsers on demand. Images keep their original bytes and metadata; they do not automatically provide extracted text.

Use `createController` to manage multiple files, cancellation, duplicates, and pending/processing/ready/error states. Limits bound file sizes, document pages, extracted characters, and DOCX decompression. Safe previews escape content and apply a URL policy; Texion is not a malware scanner.

Parsing runs locally. Your app owns uploads, storage, and anything sent to an AI service. Default PDF extraction reads native text; optional OCR packages support scanned PDFs. Complex PDF reading order and table reconstruction are not guaranteed.

Experimental release. Works in the browser and Node. Node 20 or newer is required.

[Documentation](https://texion.pages.dev/docs) · [Source](https://github.com/Sirily23/texion/tree/main/packages/core) · [MIT license](LICENSE)
