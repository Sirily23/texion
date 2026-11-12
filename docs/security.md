# Security

Default Markdown previews discard raw HTML, allow only HTTP, HTTPS, mailto, tel and relative links, and replace images with their alt text. Protocol-relative URLs and backslashes are blocked. Rendering uses React text nodes, never `dangerouslySetInnerHTML`. The library performs no fetches or uploads.

Intake enforces attachment count and byte limits before file reads. Empty text and binary content sent through text adapters are rejected. Registered binary adapters inspect supported images, PDFs and DOCX files without text decoding. Damaged encoding produces a warning and replacement characters; it does not silently discard an attachment. There is no Latin-1 guessing. File extensions take precedence over MIME types and content detection.

Preview generation is synchronous and lazy. PDF/DOCX text extraction runs asynchronously during processing with lazy-loaded parsers; PDF pages, extracted character counts and declared expanded DOCX archive sizes are limited. Extracted text is rendered as escaped text, never as HTML. The source passed to the parser is capped, and output nodes and depth are bounded. Preview truncation never changes the original source. Cancelling, clearing, or removing a document invalidates outstanding results. Count and byte limits do not replace application-level resource quotas.

Third-party adapters and custom renderers are trusted application code. They can execute arbitrary code or bypass default policies. Only install adapters and renderers you trust. Front matter is exposed as text and never evaluated as YAML or executable code. Applications must validate content, permissions and destinations again at submission.

Rich mode uses Lexical's document model rather than injecting HTML. Clipboard HTML is ignored in favor of text, image nodes are not registered, unsafe link nodes are removed, and rich import has source-size and syntax-complexity guards. Unsupported structured Markdown stays in source mode. Read-only `TexionViewer` content uses the same schema validation, core processing, and output policy as standalone document previews.

JSON and CSV previews render text and safe structure without evaluating source, creating HTML, coercing CSV fields or rounding JSON number literals. JSON depth and preview budgets are enforced; CSV rows and cells share the output-node budget. Malformed text remains attached with warnings. Raster image intake permits PNG/JPEG/GIF/WebP signatures and dimensions within byte and pixel limits; SVG is rejected. Image previews use typed local object URLs and revoke them on cleanup. The original File/Blob remains available for host-side validation and storage.

## Optional OCR

Local OCR loads only explicitly configured assets. Server/hosted engines require affirmative host approval before rendering or receiving page images. Adapters remain trusted code, not a network sandbox. OCR text uses the same escaped-preview path. Recognition workers can be terminated, while native PDF parsing and canvas rendering remain cooperative. See [OCR](ocr.md) for the limits and cancellation boundaries.
