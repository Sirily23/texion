# Texion documentation

Fumadocs on Next.js, with a local playground using the workspace packages.

## Run

Use Node 22 or newer. From the repository root:

```sh
nvm use
pnpm install
pnpm docs:dev
```

Open http://localhost:3000.

## Content

Edit guides in the repository's `docs/` directory. `scripts/sync-docs.mjs` generates guide MDX pages before development, builds, and type checks; those generated files are ignored by Git. Restart the dev command after editing the original guides.

Introduction, API reference, recipes, and development pages live in `content/docs/`. Navigation is configured in `meta.json` files. Branding and layouts are in `components/`, `lib/layout.shared.tsx`, and `app/global.css`.

The landing page contains package installation commands for the public release. Package publication is managed separately from the documentation site.

## Validate and export

```sh
pnpm --filter @texion/docs typecheck
pnpm docs:build
pnpm docs:test
```

The build exports `out/`, including the static search index. Browser tests serve that output on port 4110 and require Playwright Chromium.

The demo processes files locally and does not call an AI service or upload attachments. A host application can decide what to do with its own submission handler.

The playground stores its saved message JSON in localStorage and original attachment bytes in IndexedDB. Reload to restore, preview a saved attachment, or choose **Edit saved message** to reopen source and files. **Reset** resets only the draft; **Clear saved message** removes the saved demo. The **Custom headless** preset uses separate source-editing and attachment hooks; **Mixed content** demonstrates fenced JSON and SQL. Storage errors are surfaced in the interface.

The Scanned PDF preset opts into local Tesseract recognition. The docs use workspace sources directly; `scripts/sync-ocr-assets.mjs` copies the installed worker, core, and local English test model into ignored public assets. Browser source aliases keep hot reload independent of package `dist` outputs. The optional engine is loaded only for the configured OCR workflow, and recognition requires an explicit approval in the demo.
