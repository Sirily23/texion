# @texion/react

One input for text and files, for React.

```sh
npm install @texion/react
```

```tsx
import { TexionInput } from '@texion/react';
import '@texion/react/styles.css';

export default function App() {
  return (
    <TexionInput
      preview
      onSubmit={({ content, attachments }) => {
        console.log(content.source, attachments);
      }}
    />
  );
}
```

Users can type, paste, or attach documents. Submission waits for processing and stops if a file fails or the draft changes. Previews appear above the input by default, with an option to move them below.

Use `mode="rich" live` for editable Markdown, or `highlight` for source editing. JSON and CSV have structured previews. PDF and Word attachments provide extracted text; image attachments retain their original files and metadata.

For your own interface, use `useTexion`, or combine `useSourceInput` and `useTexionAttachments`. Render saved content with `TexionViewer` and restore host-owned attachment references with `TexionMessageViewer`.

Built-in parsing runs locally. Your submit handler decides what gets stored or sent. OCR is optional, and PDF layout reconstruction is not guaranteed.

Experimental release. React 18 or 19 is required.

[Try the demo](https://texion.pages.dev) · [Documentation](https://texion.pages.dev/docs) · [Source](https://github.com/Sirily23/texion/tree/main/packages/react) · [MIT license](LICENSE)
