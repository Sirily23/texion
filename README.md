# Texion

**One input for text and files, for React.**

Type, paste, or drop documents. Get preserved source, extracted text where available, previews, and a submission that waits for attachments to be ready.

## What you get

- **A shared document lifecycle.** Typed content is processed on submission; attachments move through pending, processing, and ready/error states.
- **One document shape** across Markdown, TXT, JSON, CSV, PDF, DOCX, and raster images. Image documents retain their original bytes and image metadata; they do not provide extracted text without OCR.
- **Correct async behavior.** Cancellation, duplicate handling, and stale-result protection are built in.
- **Guarded submit.** It waits for in-flight files and refuses stale or unready input.
- **Safe-by-default previews.** Escaped content, a URL policy for links, and size, page, and character limits. These cover previews, not file safety in general.
- **Portable saved messages.** Preserve source and host-owned attachment references; restore previews and reopen the original content and files for editing.

## Parsing and storage

Built-in parsing runs locally. `@texion/core` is independent of React and can also be used in Node; the documentation app requires Node 22 or newer. PDF and DOCX extraction use unpdf and Mammoth, loaded on demand.

Custom adapters are trusted application code. They can integrate another parser, but Texion does **not** currently provide a `mode: 'local' | 'server' | 'hosted'` setting, endpoint client, upload service, or automatic fallback. A remote parser requires application-owned transport, authentication, cancellation, and error handling. See [custom adapters](docs/custom-adapters.md) for the existing contract.

Texion does not decide what happens to files or extracted text afterward. Your `onSubmit` handler does. If it sends extracted text to an LLM, that text leaves the device. Saved-message storage is also supplied by your app; the playground demonstrates browser-local persistence.

## Use as much as you need

- `@texion/core`: decoding, validation, document state, cancellation, previews, and portable content/message contracts.
- `@texion/react`: `useTexion`, `TexionInput`, `useDocument`, `AttachmentList`, `DocumentViewer`, `TexionViewer`, and `TexionMessageViewer`.
- `useSourceInput` and `useTexionAttachments`: independent behavior for your own interface.
- Custom adapters and renderer registries: extend source formats and previews without replacing the document lifecycle.

Use `<TexionInput mode="rich" live formats={['markdown']} />` for rich Markdown editing, or `<TexionInput highlight />` for native source editing. Markdown previews support fenced code languages, copying, folding, and bounded highlighting. JSON/CSV fences also show local validation warnings; SQL is highlighted without execution.

## Status

**Works today**

- Markdown, TXT, JSON, CSV, PDF, DOCX, and raster image attachments.
- PDF/DOCX text extraction with original files retained.
- Local parsing, optional Tesseract OCR, and a generic host-owned remote OCR transport adapter.
- Source editing, rich Markdown editing, structured previews, portable saved messages, and reopening content and attachments.
- A Fumadocs playground demonstrating save → reload → preview → edit, plus separate headless hooks.

**Limits today**

- Default PDF output is native text only, with no promised table reconstruction or layout-aware reading order. Scanned PDFs can use the opt-in OCR adapter; see [OCR](docs/ocr.md).
- OCR recognition runs in a terminable worker with page and total deadlines. Native PDF decoding and canvas rendering remain cooperative.
- Custom parser and renderer code is trusted application code.
- Experimental; not yet published to npm.
- Extraction quality on a representative document corpus has not been established.

**Potential next work**

1. Validate integration needs with developers building chat and document features, including where they parse files and why.
2. Design explicit server/hosted parser integration while preserving the input and output contract.
3. Isolate PDF parsing and rendering in workers/processes; OCR recognition already has cancellation and deadlines.
4. Benchmark PDF extraction against underlying parsers before committing to layout-aware extraction, tables, or citation blocks.
5. Validate optional OCR and upload integrations against demonstrated needs.

## Quick start

```sh
nvm use
pnpm install
pnpm build
pnpm dev
```

See [getting started](docs/getting-started.md), [saved messages](docs/saved-messages.md), [security](docs/security.md), and the [composer example](examples/chat-composer/main.tsx).

Use `pnpm typecheck`, `pnpm test`, and `pnpm format:check` to validate changes. The Fumadocs site lives in `examples/docs`: run `pnpm docs:dev` for development or `pnpm docs:build` for a static export. See [the docs application](examples/docs/README.md).

## License

[MIT](LICENSE).
