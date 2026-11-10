# Custom adapters

A `FormatAdapter` declares a format identifier, extensions, MIME types, content detection, optional metadata extraction, and a synchronous `parse(text, limits)` function returning a `DocumentPreview`. Pass `adapters` to `createController`, `processDocument`, or a hook. Providing this list replaces the defaults; include the built-in `markdownAdapter`, `jsonAdapter`, `csvAdapter` and `imageAdapter` as needed to retain those formats. `acceptedFormats` restricts the registered formats.

Adapters receive decoded source. Core owns validation, cancellation, immutable snapshots, and lazy preview caching. Custom parsers should honor the supplied preview limits. A parse exception falls back to a plain-text preview with a warning. Metadata extraction should be bounded and must not throw for damaged input. A dummy adapter test in `packages/core/src/adapters/registry.test.ts` demonstrates this contract without changing the input API.

Adapters and custom renderers are trusted code. The default renderer understands the Markdown preview node types; supply a custom renderer to `DocumentViewer` for other representations.

Text adapters may add `inspect(text, limits)` for metadata and warnings. Binary adapters use `kind: 'binary'`, `detectBytes`, byte inspection and byte-based parsing. Core routes them without text decoding. See the dummy binary adapter test and [format support](formats.md).
