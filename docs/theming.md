# Theming

Import `@texion/react/styles.css` for the optional default styles. Override `--texion-border`, `--texion-background`, `--texion-foreground`, `--texion-accent`, and `--texion-radius` on a wrapper. Components expose `texion-input`, `texion-attachments`, and `texion-viewer` classes. For full control, compose your own UI with `useTexion`.

Source editing uses a native textarea. Enable `highlight` on `TexionInput`, or use `HighlightedTextarea` directly. Token colors use `--texion-highlight-heading`, `--texion-highlight-bold`, `--texion-highlight-italic`, `--texion-highlight-code`, `--texion-highlight-link`, `--texion-highlight-marker`, `--texion-highlight-quote`, `--texion-highlight-frontmatter`, and `--texion-highlight-strikethrough`. Keep token glyph metrics identical to the textarea. Rich mode uses the `texion-rich-content` and `texion-rich-*` classes.

Structured source highlighting adds `--texion-highlight-property`, `--texion-highlight-string`, `--texion-highlight-number`, `--texion-highlight-boolean`, `--texion-highlight-null` and `--texion-highlight-punctuation`. JSON trees use `texion-json-viewer` / `texion-json-branch`, CSV tables use `texion-csv-viewer`, and image previews use `texion-image-viewer`.
