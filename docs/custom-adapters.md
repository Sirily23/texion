# Custom adapters

A `FormatAdapter` declares a format identifier, extensions, MIME types, content detection, optional metadata extraction, and a synchronous `parse(text, limits)` function returning a `DocumentPreview`. Pass `adapters` to `createController`, `processDocument`, or a hook. Providing this list replaces the defaults; include the built-in `markdownAdapter`, `jsonAdapter`, `csvAdapter`, `textAdapter`, `imageAdapter`, `pdfAdapter` and `docxAdapter` as needed to retain those formats. `acceptedFormats` restricts the registered formats.

Adapters receive decoded source. Core owns validation, cancellation, immutable snapshots, and lazy preview caching. Custom parsers should honor the supplied preview limits. A parse exception falls back to a plain-text preview with a warning. Metadata extraction should be bounded and must not throw for damaged input. A dummy adapter test in `packages/core/src/adapters/registry.test.ts` demonstrates this contract without changing the input API.

Adapters and custom renderers are trusted code. The default renderer understands the Markdown preview node types; supply a custom renderer to `DocumentViewer` for other representations.

Text adapters may add `inspect(text, limits)` for metadata and warnings. Binary adapters use `kind: 'binary'`, `detectBytes`, byte inspection and byte-based parsing. Core routes them without text decoding. Optional asynchronous `extract(bytes, limits, signal)` runs during processing and returns `{ raw, metadata?, warnings? }`; the core generates a lazy plain text preview from extracted `raw`. See the dummy binary adapter test and [format support](formats.md).

## Custom source formats and saved content

A registered text adapter's `format` ID can also be used by `createContent`, `useSourceInput`, `useTexion`, `TexionInput`, and saved messages. Pass the same adapters when editing and rendering. A custom format ID preserves source; it does not grant permission to render HTML.

```tsx
<TexionInput
  adapters={[queryAdapter]}
  formats={['query']}
  defaultContent={createContent('SELECT * FROM orders;', { format: 'query' })}
  renderers={{ query: QueryPreview }}
  onSubmit={save}
/>

<TexionViewer
  content={saved.content}
  options={{ adapters: [queryAdapter] }}
  renderers={{ query: QueryPreview }}
/>
```

`queryAdapter` is an application-defined `FormatAdapter`, and `QueryPreview` accepts `PreviewRendererProps`. The adapter parses and validates source into bounded preview nodes; the renderer presents it. `DocumentViewer`, `TexionViewer`, `TexionInput`, and `TexionMessageViewer` accept a `renderers` registry keyed by format ID. An explicit `renderer` on DocumentViewer overrides the registry. Without a custom renderer, valid adapter output uses the generic preview renderer. Unregistered formats report an error.

Adapters are fixed when the controller mounts. Remount when changing the registry. When using `useSourceInput` directly, pass both `adapters` and `allowedFormats`; automatic detection consults allowed text adapters after built-in detection. Custom format editing uses native source text; rich Markdown editing and built-in source highlighting remain specific to the built-in formats. Picker extensions and MIME types come from registered adapters.
