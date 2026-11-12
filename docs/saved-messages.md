# Saved messages

Texion separates editable source, transient documents, and portable saved messages. The host application owns storage and access control.

## Save and restore

`TexionContent` holds versioned source, a format ID, and optional original source. `TexionMessage` wraps that content with attachment references. It contains no `File`, `Blob`, preview function, or temporary object URL.

```tsx
import {
  createMessageFromDocuments,
  serializeMessage,
  deserializeMessage,
} from '@texion/core';

// Called with a TexionInput/useTexion Submission.
const message = await createMessageFromDocuments(
  submission.content,
  submission.attachments,
  async (document) => {
    // Implement this in your application. Preserve the original bytes.
    return storage.put(document.file ?? document.blob ?? document.raw);
  },
);
await database.save(serializeMessage(message));
const restored = deserializeMessage(await database.load());
```

Here `storage` and `database` are host-provided services, not Texion APIs. For text-only paste attachments, store the raw text if no original file exists. Storage callbacks can run concurrently; the host must handle partial writes and clean up orphaned objects if a save fails. Texion checks document readiness and unique IDs before invoking callbacks. It validates returned references after storage completes.

A reference includes `id`, `name`, `format`, byte `size`, opaque `reference`, and optional `mimeType`. References must be nonempty and cannot be temporary `blob:` URLs. They can be database keys or host-managed URLs; Texion never fetches them automatically. Serialization copies known fields and rejects invalid versions or duplicate attachment IDs. This is a version 1 contract; future migrations require explicit handling.

## Render a saved message

```tsx
import { TexionMessageViewer } from '@texion/react';

<TexionMessageViewer
  message={restored}
  resolveAttachment={async (attachment, signal) => {
    return storage.get(attachment.reference, { signal });
  }}
/>;
```

The resolver returns a `DocumentInput` (a file, blob, string, or named text input), or `undefined` for a missing object. It is called when a user opens an attachment preview. Closing a preview aborts its signal and late results are ignored. Blob results receive the saved filename for format detection. The resolver must implement authorization and cancellation for its own storage service. Without a resolver the viewer still renders source and attachment metadata.

## Reopen for editing

Resolve all attachment references to files or named text inputs, then mount a new editor:

```tsx
<TexionInput
  key={messageId}
  defaultContent={restored.content}
  initialAttachments={originalFiles}
  onSubmit={saveAgain}
/>
```

These are initial values, read on mount. Change the key when opening a different draft. Attachments run through validation and parsing again; a stored reference does not bypass current limits. Custom formats also need their adapters and renderers when restoring.

The documentation playground implements this complete flow using localStorage for serialized messages and IndexedDB for original files. Browser storage can be cleared or exhausted; it is a demonstration host, not durable server storage.

## Compose your own interface

`useSourceInput` manages a native textarea without requiring Texion's UI. `useTexionAttachments` independently manages picker, drop, paste, cancellation, and document lifecycle:

```tsx
const editor = useSourceInput({ language: 'markdown' });
const files = useTexionAttachments();

<div {...files.getRootProps()}>
  <textarea {...files.getTextareaProps(editor.getTextareaProps())} />
  <input {...files.getInputProps()} />
  <button type="button" onClick={files.openPicker}>
    Attach
  </button>
</div>;
```

Compose handlers through the prop getters so paste and editing behavior both run. Render `files.documents` with your own cards; call `removeDocument`, `cancelDocument`, or `whenSettled` as needed. `waitForIdle()` waits for processing and returns no value. Use `whenSettled(id)` to retrieve the latest document. The playground's custom headless preset demonstrates submission with these separate hooks. Use `useTexion` when you also want the integrated submission lifecycle.

## Mixed Markdown

Markdown remains canonical for prose containing fenced JSON, CSV, SQL, or Markdown snippets. Each fence keeps its language and exact source. Built-in previews offer copy and collapse controls, bounded syntax highlighting, and block-local JSON/CSV warnings. SQL receives lexical highlighting only; Texion does not execute SQL or validate it against a database. Unknown languages remain escaped text. Large or complex blocks fall back to plain source.
