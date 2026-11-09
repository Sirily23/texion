# Texion

## Composable content editing and rendering for React

This is a library that makes it easier to type, attach, parse, preview, and safely render Markdown and other text-based formats

## Markdown editing and rendering

`@texion/core` owns decoding, validation, document state, cancellation and lazy safe previews. `@texion/react` provides `useTexion`, `TexionInput`, `useDocument`, `AttachmentList` and `DocumentViewer` on that same lifecycle.

See [getting started](docs/getting-started.md), [security](docs/security.md), and the [composer example](examples/chat-composer/main.tsx).

```sh
nvm use 20
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm dev
```

Use `pnpm format` to format the workspace and `pnpm format:check` to verify it.

Use `<TexionInput mode="rich" live formats={['markdown']} />` for editable Markdown conversion, or `<TexionInput highlight />` for native source editing. Submit `{ content, attachments }` and render saved content with `<TexionViewer content={content} />`.

See [rich editing](docs/rich-editing.md) and [source editing](docs/source-editing.md) for supported syntax, preservation rules, and headless APIs.
