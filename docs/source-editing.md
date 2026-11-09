# Native Markdown source editing

Use a plain native textarea or opt into a color-only highlighting overlay. Markdown markers and the source string remain editable. This mode does not convert text into headings or other rich elements.

```tsx
import { HighlightedTextarea, TexionInput } from '@texion/react';

<TexionInput format="markdown" highlight attachments onSubmit={handleSubmit} />;

<HighlightedTextarea
  value={description}
  onChange={setDescription}
  language="markdown"
  aria-label="Description"
/>;
```

`useMarkdownInput` supplies `value`, `setValue`, `selection`, `isComposing`, `highlightModel`, and `getTextareaProps`. It works without attachments or document ingestion. Spread the textarea props onto a native textarea when building your own UI; render the highlight model separately if you want custom highlighting.

The core `tokenizeMarkdownSource` and `createHighlightModel` functions use the same established Markdown parser as previews. Ranges include Markdown markers and use JavaScript UTF-16 indices, matching textarea selection offsets. They never produce HTML. Source-editing values use the browser's LF newline normalization so ranges match native selections; file decoding and retained original imports remain separate. Nested ranges become non-overlapping display segments without changing any source characters.

Text paste follows the browser's native editing path, preserving cursor placement, selection replacement, and undo/redo. Files can still become attachments. Markdown text becomes an attachment only with `pasteAsAttachment: true`; `pasteAttachmentThreshold` defaults to 10,000 characters when this option is enabled.

The overlay is hidden from assistive technology and cannot receive pointer or keyboard input. It mirrors font metrics, padding, borders, wrapping, tabs, direction, scroll offsets, scrollbar space, resizing, and font changes. Token styles change color only. The native textarea remains mounted while highlighting pauses or resumes. Composition, forced-colors mode, inputs over `maxHighlightCharacters` (20,000 by default), and complexity limits fall back to plain editing.

Import `@texion/react/styles.css` for default styles. Standalone highlighting also has inline color fallbacks. Override the `--texion-highlight-*` CSS variables for your theme; do not apply different fonts, font weights, spacing, or padding to token spans because those change alignment.
