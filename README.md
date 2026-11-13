# Texion

**One input for text and files, for React.**

Let people write, paste, and attach documents in the same place. Texion handles parsing, previews, and file states so you can focus on what your app does with the content.

## What it handles

- **Text and files together.** One composer for a message and its attachments.
- **One document object across formats.** Read the status, extracted text, metadata, warnings, and errors through the same API.
- **Cancellation and duplicate handling.** Remove a file while it is processing, and late results stay out of the draft.
- **Submission that waits.** Files finish processing before your submit handler runs. Failed files and changed drafts stop the submission.
- **Previews before sending.** Show formatted Markdown, structured data, extracted document text, and image thumbnails. Raw HTML and dangerous links are blocked by default.
- **Messages you can reopen.** Save the source with references to files stored by your app, then restore them for viewing or editing.

## Supported formats

| Format                   | What you get                                                  |
| ------------------------ | ------------------------------------------------------------- |
| Markdown and TXT         | Original source and a formatted or plain text preview         |
| JSON and CSV             | Original source, validation warnings, and structured previews |
| PDF and DOCX             | Extracted text, a preview, and the original file              |
| PNG, JPEG, GIF, and WebP | Image previews, metadata, and the original file               |

Scanned PDFs can use optional OCR. Image attachments do not automatically become extracted text. See [supported formats](docs/formats.md) and [OCR setup](docs/ocr.md) for details.

## Add a composer

```tsx
import { TexionInput } from '@texion/react';
import '@texion/react/styles.css';

export default function App() {
  return (
    <TexionInput
      preview
      onSubmit={({ content, attachments }) => {
        // Store the message or send it to your app's next step.
        console.log(content.source, attachments);
      }}
    />
  );
}
```

Use `mode="rich" live` for editable Markdown or `highlight` for source editing. Previews appear above the input by default, with an option to move them below.

The packages are experimental and not yet published to npm. You can run the examples from this repository while preparing your integration.

## Use your own interface

You can use the composer or take just the parts you need:

- **`@texion/core`** processes documents and manages their state without React. It works in the browser or Node.
- **`@texion/react`** provides the composer, hooks, attachment list, and viewers.
- **`useTexion`** connects a custom interface to editing, attachments, and submission.
- **`useSourceInput` and `useTexionAttachments`** let you use editing and file handling separately.
- **Custom adapters and renderers** let you add a parser or change how content appears.

See [getting started](docs/getting-started.md), [custom adapters](docs/custom-adapters.md), and [saved messages](docs/saved-messages.md).

## Where parsing happens

Built-in parsing runs locally. PDF and Word extraction use unpdf and Mammoth, loaded only when needed.

Your app decides what gets stored or sent afterward. Texion does not upload attachments for you. If your submit handler sends extracted text to an AI service, that text leaves the device.

You can connect another parser through a custom adapter. General remote parsing needs your own transport and authentication; there is no built-in switch between local, server, and hosted parsing. OCR has separate optional packages for local Tesseract recognition and an application-supplied remote transport.

## Current limits

PDF extraction does not reconstruct tables or guarantee the reading order of complex layouts. OCR is optional, and extraction quality has not been measured across a representative collection of documents.

OCR recognition runs in a worker that can be terminated. PDF decoding and rendering do not yet have the same isolation.

File size, page, character, and DOCX decompression limits help bound processing. Safe previews do not make an uploaded file safe to open elsewhere. Custom adapters and renderers are trusted code supplied by your app. Read [security and limits](docs/security.md) before choosing your configuration.

## Run the examples

Use Node 22 and pnpm 10.

```sh
nvm use
pnpm install
pnpm build
pnpm dev
```

To run the documentation site and playground:

```sh
pnpm docs:dev
```

The playground lets you try formats, save a message locally, reload it, and reopen it for editing. It also includes an optional scanned-PDF example.

For development checks, run `pnpm typecheck` and `pnpm test`. See [the docs application](examples/docs/README.md) for building and testing the site, or start with the [chat composer example](examples/chat-composer/main.tsx).

## License

[MIT](LICENSE).
