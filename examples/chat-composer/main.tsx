import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DocumentViewer,
  TexionInput,
  HighlightedTextarea,
  TexionViewer,
} from '@texion/react';
import type { TextFormat } from '@texion/core';
import type { Submission } from '@texion/react';
import '@texion/react/styles.css';

function App() {
  const [submission, setSubmission] = useState<Submission>();
  const [structured, setStructured] = useState<Submission>();
  const [format, setFormat] = useState<TextFormat | 'auto'>('json');
  const [richSubmission, setRichSubmission] = useState<Submission>();
  const [description, setDescription] = useState(
    '# Description\n\n**Editable** Markdown',
  );

  return (
    <main
      style={{
        maxWidth: 800,
        margin: '2rem auto',
        padding: '1rem',
        fontFamily: 'system-ui',
      }}
    >
      <h1>Texion content editing and rendering</h1>
      <h2>Rich Markdown composer</h2>
      <TexionInput
        mode="rich"
        live
        formats={['markdown', 'json', 'csv', 'image']}
        label="Rich draft"
        submitLabel="Send rich content"
        attachments={false}
        highlight
        onSubmit={setRichSubmission}
      />
      {richSubmission && (
        <section aria-label="Submitted rich content">
          <TexionViewer content={richSubmission.content} />
          <details>
            <summary>Markdown export</summary>
            <pre data-testid="rich-export">
              {JSON.stringify(richSubmission.content, null, 2)}
            </pre>
          </details>
        </section>
      )}
      <h2>Native source composer</h2>
      <TexionInput
        format="markdown"
        highlight
        attachments
        preview
        onSubmit={setSubmission}
      />
      {submission && (
        <output aria-label="Submitted content">
          <pre>
            {JSON.stringify(
              {
                text: submission.text,
                documents: submission.documents.map((document) => ({
                  name: document.name,
                  raw: document.raw,
                })),
              },
              null,
              2,
            )}
          </pre>
        </output>
      )}
      <section aria-label="Structured content composer">
        <h2>JSON and CSV source editing</h2>
        <label htmlFor="structured-format">Content format</label>
        <select
          id="structured-format"
          value={format}
          onChange={(event) =>
            setFormat(event.currentTarget.value as TextFormat | 'auto')
          }
        >
          <option value="auto">Automatic</option>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="markdown">Markdown</option>
        </select>
        <TexionInput
          format={format}
          label="Structured draft"
          highlight
          preview
          attachments={false}
          submitLabel="Submit structured content"
          onSubmit={setStructured}
        />
      </section>
      {structured && (
        <section aria-label="Structured submitted content">
          <TexionViewer content={structured.content} />
          <output aria-label="Structured source">
            {structured.content.source}
          </output>
        </section>
      )}
      <h2>Markdown form field</h2>
      <label htmlFor="description">Description</label>
      <HighlightedTextarea
        id="description"
        value={description}
        onChange={setDescription}
        language="markdown"
        rows={6}
        style={{
          fontFamily: 'monospace',
          fontSize: 16,
          lineHeight: '24px',
          padding: 12,
          tabSize: 4,
          resize: 'both',
        }}
      />
      <h2>Standalone viewer</h2>
      <DocumentViewer
        input={
          '# Shared core engine\n\nThis viewer uses the same processing controller.'
        }
      />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
