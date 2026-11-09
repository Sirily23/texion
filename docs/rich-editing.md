# Rich editing and shared content

Texion supports a rich Markdown editor and a native source editor. The rich editor uses [Lexical's Markdown helpers](https://lexical.dev/docs/packages/lexical-markdown) and editing engine for selection, composition, history, import, export, and shortcuts.

```tsx
import { useState } from 'react';
import type { TexionContent } from '@texion/core';
import { TexionInput, TexionViewer } from '@texion/react';
import '@texion/react/styles.css';

function Chat() {
  const [message, setMessage] = useState<TexionContent>();
  return (
    <>
      <TexionInput
        mode="rich"
        live
        formats={['markdown']}
        onSubmit={({ content, attachments }) => {
          setMessage(content);
          // Your application owns persistence and sending attachments.
        }}
      />
      {message && <TexionViewer content={message} />}
    </>
  );
}
```

Paste Markdown to create editable headings, lists, quotes, inline formatting, links, and fenced code. Continue editing the formatted content, then submit the current content to the read-only viewer. Enter creates a paragraph in rich mode; Ctrl/Command+Enter submits. `submitOnEnter` can opt into Enter submission. Composition never submits prematurely. `live={false}` disables typing shortcuts and paste conversion. The rich engine loads only when rich mode is used; advanced integrations can import `RichMarkdownEditor` from `@texion/react/rich`.

A rich input includes a source-mode switch by default. `modeSwitch={false}` hides it; source inputs can opt in with `modeSwitch`. Mode switches retain the current Markdown. Switching modes recreates the editor surface, so each mode has its own undo history. Ordinary typing and pasting within rich mode preserve Lexical's history and selection.

## Content contract

`TexionContent` is an immutable, JSON-serializable object with `version: 1`, `format: 'markdown'`, and `source`. `originalSource`, when available, retains the initial imported Markdown. A first Markdown paste into an empty rich input is retained there. Rich edits update `source` and may normalize markers, whitespace between blocks, and equivalent formatting. Original source is provenance, not a representation of later edits. Use source mode when exact source is important.

`createContent(source)` creates this object without a framework. `serializeContent` and `deserializeContent` serialize and validate its JSON form. `exportMarkdown(content)` returns the current Markdown. `TexionViewer` validates the schema and sends the source through the existing core document lifecycle and rendering policies. It never renders arbitrary HTML from the content object.

Submission provides `{ content, attachments }`. `text`, `documents`, and `textDocument` remain available for applications using the source-input API. `attachments` and `documents` reference the same immutable array. Processing runs on submission or requested preview rather than on every source keystroke.

## Scope and limits

Only Markdown is implemented. JSON, SQL, images, and additional format adapters remain future work; code can be preserved inside Markdown fences without reformatting its contents. Clipboard HTML is ignored, remote images are not loaded, and core URL restrictions apply to editor links as well as previews.

The first rich converter handles a bounded subset of Markdown. Front matter, tables, task lists, reference links, and footnotes require source mode to avoid flattening their structure. Pasting these into an empty rich editor switches to source mode and preserves the full paste. When inserting them into an existing rich draft, Texion explains that they must be pasted in source mode. Unsupported initial content offers an Edit source action.

Rich import defaults to 50,000 UTF-16 code units (`maxRichCharacters`). Oversized pastes are rejected with an Edit source action; the current draft is retained. Source mode remains available for larger content, subject to core submission limits. External controlled values that exceed the rich limit retain their source and offer the same action.

For custom UI, use `useTexion` with `getRichEditorProps()` and the rich subpath export. It coordinates content changes, composition, and submission with the same core controller used by attachments and source inputs.
