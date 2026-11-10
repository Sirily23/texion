# Getting started

Texion has two packages: `@texion/core` and `@texion/react`. Markdown, JSON, CSV and local PNG/JPEG/GIF/WebP images have built-in adapters.

```tsx
import { TexionInput } from '@texion/react';
import '@texion/react/styles.css';

<TexionInput
  attachments
  preview
  onSubmit={({ text, documents }) => {
    // Your application stores or sends original content.
    console.log(
      text,
      documents.map((document) => document.raw),
    );
  }}
/>;
```

`useTexion` supplies `getRootProps`, `getTextareaProps`, `getInputProps`, `openPicker`, `setText`, `addDocument`, `removeDocument`, `cancelDocument`, `clear`, and `submit`. Spread the prop getters onto your own DOM elements. A handler passed into a prop getter runs first and can call `preventDefault()` to override its default behavior. Native textarea selection and IME behavior remain intact.

Configuration limits and adapters are fixed when a hook mounts. Remount with a different React key to change them. `onSubmit` can change between renders. Enter submits; Shift+Enter inserts a newline. Use `submitOnEnter: false` for forms. Submission waits for the captured documents and stops if an input changes or any document fails. Errors remain visible until removed. Successful submission does not clear content automatically. Async host submission errors are available as `submitError`.

Markdown text pastes stay in the textarea by default. Enable `pasteAsAttachment: true` to convert Markdown pastes above `pasteAttachmentThreshold` (10,000 characters by default) into attachments. Files from the clipboard are attachments; ordinary clipboard HTML is ignored in favor of plain text. Folders are rejected with an input message.

```ts
import { processDocument, createController } from '@texion/core';

const document = await processDocument('# Hello');
// Validation failures return an error snapshot. Aborting rejects with AbortError.
if (document.status === 'ready')
  console.log(document.raw, document.getPreview?.());

const controller = createController({ maxFiles: 5 });
const unsubscribe = controller.subscribe(() =>
  console.log(controller.getSnapshot()),
);
const id = controller.add(new File(['# Attached'], 'note.md'));
await controller.whenSettled(id);
controller.remove(id);
unsubscribe();
```

Inline editing is independent from ingestion. Text is processed when submitting or requesting a preview.

`createController` owns pending → processing → ready/error transitions. `cancel`, `remove`, and `clear` invalidate operations immediately, including reads that ignore cancellation. Cancelling removes the document. Snapshots are immutable; native File/Blob objects remain available. Duplicate attachments use name, byte size, MIME type, and modification time; removing one permits re-selection. Change a file's name or contents when distinct documents share those attributes.

`useDocument(input)` and `<DocumentViewer input={fileOrText} />` use that same controller. To reuse an existing attachment without reprocessing, pass `<DocumentViewer document={document} />`. The default renderer loads lazily. For an explicit renderer import `MarkdownRenderer` from `@texion/react/markdown` and pass it as `renderer`.

Limits default to 5 attachments, 2,000,000 bytes per document, 50,000 preview characters, 5,000 preview nodes, and depth 64. Limits must be positive safe integers. Preview truncation preserves the complete `raw` source. UTF-8 and BOM-marked UTF-16 are supported; invalid encoding bytes are replaced with a warning. Newlines and front matter remain in `raw`; `metadata.frontMatter` contains unparsed front matter. File extensions take precedence over MIME and content detection. `.txt`, SVG, PDF, DOCX and other unregistered file types are rejected. JSON, CSV and supported raster images use their own adapters.

From this repository, use Node 20.19 or newer, run `pnpm install`, then `pnpm build`, `pnpm typecheck`, and `pnpm test`. `pnpm dev` opens the composer example. Browser tests require `pnpm exec playwright install chromium --no-shell` followed by `pnpm test:browser`.

See [rich editing and shared content](rich-editing.md) for `mode="rich"`, `TexionViewer`, and `{ content, attachments }` submission. See [native source editing](source-editing.md) for `HighlightedTextarea`, `useMarkdownInput`, and live syntax ranges.

See [supported formats](formats.md) for JSON/CSV source editing, automatic recognition, image attachments, renderer selection and `maxImagePixels`.
