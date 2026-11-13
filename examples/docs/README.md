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

## Firebase Hosting

The docs deploy as static files. From the repository root, use Node 22 and a logged-in Firebase CLI:

```sh
nvm use
firebase use texion
firebase target:apply hosting docs texion
pnpm docs:deploy:firebase
```

The build exports `examples/docs/out`, and the `docs` Hosting target serves it at https://texion.web.app. The deployment command builds before uploading. It uses directory index pages for documentation routes and preserves the static search endpoint; no single-page-app rewrite is needed.

`firebase.json` is shared configuration. Firebase project bindings in `.firebaserc`, deployment caches, and debug logs stay local. To deploy a fork, select your own Firebase project and map `docs` to a Hosting site that you own.

The playground stores its saved message JSON in localStorage and original attachment bytes in IndexedDB. Reload to restore, preview a saved attachment, or choose **Edit saved message** to reopen source and files. **Reset** resets only the draft; **Clear saved message** removes the saved demo. The **Custom headless** preset uses separate source-editing and attachment hooks; **Mixed content** demonstrates fenced JSON and SQL. Storage errors are surfaced in the interface.

The Scanned PDF preset opts into local Tesseract recognition. The docs use workspace sources directly; `scripts/sync-ocr-assets.mjs` copies the installed worker, core, and local English test model into ignored public assets. Browser source aliases keep hot reload independent of package `dist` outputs. The optional engine is loaded only for the configured OCR workflow, and recognition requires an explicit approval in the demo.
