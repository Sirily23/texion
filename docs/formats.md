# Supported formats

Texion has built-in adapters for Markdown, plain text (TXT), JSON, CSV, PDF, DOCX and local raster images. They all use the core controller for validation, lifecycle state, cancellation, immutable snapshots and lazy preview caching. File extensions take precedence over MIME types and content detection.

## JSON and CSV source editing

```tsx
import { TexionInput, TexionViewer, HighlightedTextarea } from '@texion/react';
import '@texion/react/styles.css';

<TexionInput
  format="json"
  highlight
  preview
  onSubmit={({ content, attachments }) => {
    // content.format is 'json'; content.source is the current source string.
    save(content, attachments);
  }}
/>;

<TexionViewer content={message.content} />;

<HighlightedTextarea
  language="csv"
  value={csv}
  onChange={setCsv}
  aria-label="CSV source"
/>;
```

`format` accepts `markdown`, `text`, `json`, `csv`, or `auto`. Source inputs and `useTexion` default to automatic recognition. Set `format="markdown"` to retain Markdown behavior explicitly. `formats` restricts accepted built-in formats, including attachments; `acceptedFormats` remains available for custom adapter identifiers. Limits, adapters and accepted formats are fixed when the controller mounts.

Automatic recognition prefers object/array JSON candidates, then Markdown syntax, then consistent multirow CSV. It does not classify ordinary chat such as `true`, `123`, or a single comma-containing sentence as JSON or CSV. Choose JSON explicitly to edit scalar values or CSV explicitly for ambiguous single-row data.

`useSourceInput` provides the existing native textarea behavior for all four text formats. It returns `format`, `warnings`, `highlightModel`, selection information, and `getTextareaProps`. `useMarkdownInput` remains a Markdown-specific wrapper. Highlighting and live diagnostics pause above the configured size limit and during composition. Full validation runs when processing or submitting.

JSON is strict: comments, trailing commas, NaN and incomplete syntax produce warnings. Malformed JSON stays editable and attachable. The structured viewer uses source offsets for literals, so large integers are displayed without numeric rounding. The library does not merge parsed JSON into application objects or evaluate its contents. Nesting, preview characters and output node counts are bounded.

CSV uses [Papa Parse](https://www.papaparse.com/docs) with dynamic typing disabled. Quoted separators, escaped quotes, multiline cells and empty fields remain data. Comma, semicolon, tab and pipe delimiters can be recognized. The table shows every row; it does not assume the first row is a header. Ragged rows and malformed quoting produce warnings. Formula-like fields and HTML are displayed as text. No spreadsheet formulas are evaluated. Original delimiters, quoting, numeric identifiers and source text remain unchanged in the document.

Warnings do not block submission automatically. Applications can inspect `textDocument.warnings` and attachment warnings in `onSubmit` when they need stricter acceptance rules. Preview truncation never truncates submitted source.

## Using the processing core or standalone viewer

```ts
import { processDocument, createContent } from '@texion/core';

const document = await processDocument({
  text: '{"amount":9007199254740993}',
  format: 'json',
});
const csvDocument = await processDocument(csvFile);
const message = createContent('name,value\nAda,001', { format: 'csv' });
```

`TexionContent` remains a JSON-serializable source representation. Its `format` can now be Markdown, plain text, JSON or CSV. `serializeContent` and `deserializeContent` preserve that format; `exportSource` returns any supported text source. `exportMarkdown` accepts Markdown content only.

`<DocumentViewer format="json" content={source} />` forces source interpretation. `<DocumentViewer input={file} />` uses extension/MIME detection. `<DocumentViewer document={document} />` reuses an already processed snapshot without a second lifecycle. Default renderers are selected by document format and loaded lazily.

## Rich editing and structured pastes

Rich formatting remains a Markdown editing model. JSON and CSV source are never converted into headings or arbitrary rich text. When enabled by `formats`, a standalone JSON/CSV paste into an empty rich input switches to source editing. Pasting structured data into an existing rich draft inserts a literal code block, preserving the data's text. Restrict `formats` to Markdown or specify `format="markdown"` to keep a Markdown-only composer.

## Local images

```tsx
<TexionInput
  formats={['markdown', 'json', 'csv', 'image']}
  attachments
  preview
  maxFileSize={10_000_000}
  maxImagePixels={20_000_000}
  onSubmit={({ attachments }) => {
    // Each image retains its original File/Blob for the host to upload or store.
    uploadFiles(attachments.map((document) => document.file ?? document.blob));
  }}
/>
```

PNG, JPEG, GIF and WebP are supported. SVG, AVIF and arbitrary binary files are not built-in formats. Image inspection runs on bytes rather than text decoding. It checks raster signatures, declared file type, header dimensions, byte limits and pixel limits. `maxImagePixels` defaults to 40,000,000 pixels per image; the existing 2,000,000-byte default still applies unless overridden.

An image document has `format: 'image'`, the original `file`/`blob`, image metadata and a lazy preview descriptor. It has no decoded `raw` text. Image attachments are separate from the text-based `TexionContent` object. Use `DocumentViewer` to preview an image attachment.

After pasting or attaching an image, the composer offers a **Show image previews** checkbox. Enabling it displays local previews immediately, including any images added afterward. Hiding previews keeps the attachments available for submission. Set `<TexionInput previewImages />` to enable these live previews initially; this works independently of the `preview` option for message and individual attachment previews.

React creates a typed local object URL only while a preview is mounted. Replacing, closing or removing the preview revokes that URL; StrictMode cleanup is supported. Header checks do not replace the browser's codec: a damaged image that passes header inspection may still show a decoding error while retaining its original attachment.

The library performs no uploads, storage calls or remote image requests. Remote images embedded in Markdown remain blocked. After storage, the host application decides how files are retrieved and supplied to Texion again; ephemeral object URLs are never persisted as content.

## Adapter contract

Text adapters can provide `inspect(text, limits)` for metadata and warnings, and `parse(text, limits, metadata)` for a lazy safe preview. Existing Markdown-style adapters without `kind` remain text adapters. Binary adapters declare `kind: 'binary'`, byte detection, header inspection and a byte-based preview function. They can optionally provide asynchronous `extract(bytes, limits, signal)` to return `raw` text, metadata and warnings during processing; extracted text gets a lazy plain text preview. Third-party adapters and custom renderers remain trusted application code.

Previews, attachment lists and input feedback appear above the editor by default in `TexionInput`. Use the **Preview position** selector to move them below the input, or set `previewPosition="below"` for that initial layout. This applies to both chat composers and form inputs.

## TXT, PDF and DOCX attachments

TXT (`.txt`, `text/plain`), PDF (`.pdf`, `application/pdf`) and DOCX (`.docx`, the standard Word OOXML MIME type) use the same upload, paste, drop, preview and submission lifecycle. The default picker includes all three. Restrict them with `formats` or `acceptedFormats` when needed.

```tsx
<TexionInput
  formats={['markdown', 'text', 'pdf', 'docx']}
  preview
  onSubmit={({ attachments }) => {
    // PDF/DOCX raw contains extracted text; file/blob retains the original bytes.
    for (const attachment of attachments) {
      console.log(attachment.name, attachment.raw);
    }
  }}
/>
```

TXT stays literal, including Markdown markers and HTML. Use `format="text"` for a plain text composer or `createContent(source, { format: 'text' })` for saved plain text. Auto detection of typed content still defaults to Markdown.

PDF and DOCX parsers load on demand during attachment processing. Once ready, `raw` holds extracted text for downstream applications or LLMs. Previews show bounded, escaped text; original page layout, embedded images and Word formatting are not reproduced. PDF metadata includes the page count. Scanned PDFs and image-only DOCX documents produce a `no-text` warning; OCR is not enabled by default. Password-protected or damaged documents produce an `invalid-document` error. Legacy `.doc`, `.xls` and generic ZIP files are not supported.

The existing 2 MB file limit still applies. Additional configurable defaults are `maxDocumentPages: 200` (PDF), `maxExtractedCharacters: 1_000_000` (PDF/DOCX), and `maxArchiveBytes: 20_000_000` (expanded DOCX). Extraction beyond a limit rejects the attachment with `too-large`; preview truncation alone preserves the full extracted text. Cancellation prevents removed documents from returning to the attachment list.

## Opt-in OCR

The default PDF adapter extracts native text only. Use `createPdfAdapter({ ocr: ... })` with an optional engine to recognize scanned candidate pages. See [Scanned PDFs and OCR](ocr.md) for local assets, consent, limits, confidence, and execution boundaries.
