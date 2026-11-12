'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  createContent,
  createPdfAdapter,
  createRegistry,
  serializeMessage,
} from '@texion/core';
import type { DocumentInput, TexionContent, TexionMessage } from '@texion/core';
import {
  TexionInput,
  TexionMessageViewer,
  useSourceInput,
  useTexionAttachments,
  useOcrApproval,
} from '@texion/react';
import type { Submission } from '@texion/react';
import Link from 'next/link';
import { createTesseractEngine } from '@texion/ocr-tesseract/browser';
import {
  clearPlaygroundMessage,
  loadPlaygroundMessage,
  resolvePlaygroundAttachment,
  savePlaygroundSubmission,
} from '../lib/playground-storage';

type Preset = 'chat' | 'form' | 'rich' | 'mixed' | 'headless' | 'ocr';
const presets = {
  chat: 'Chat composer',
  form: 'Form input',
  rich: 'Rich Markdown',
  mixed: 'Mixed content',
  headless: 'Custom headless',
  ocr: 'Scanned PDF',
};
const mixed =
  '## Query results\n\nHere is the response:\n\n```json\n{"status":"success","count":12}\n```\n\nSQL used:\n\n```sql\nSELECT * FROM orders;\n```';
type Draft = { content: TexionContent; files: DocumentInput[] };

function HeadlessComposer({
  draft,
  onSubmit,
}: {
  draft?: Draft;
  onSubmit: (submission: Submission) => Promise<void>;
}) {
  const editor = useSourceInput({
    defaultValue:
      draft?.content.source ??
      'My custom interface, powered by separate hooks.',
    language: draft?.content.format ?? 'markdown',
  });
  const attachments = useTexionAttachments({
    initialAttachments: draft?.files ?? [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <div {...attachments.getRootProps()}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(undefined);
          try {
            const settled = await Promise.all(
              attachments.documents.map((document) =>
                attachments.whenSettled(document.id),
              ),
            );
            const documents = settled.filter(
              (document): document is NonNullable<typeof document> =>
                document !== undefined,
            );
            if (documents.some((document) => document.status !== 'ready'))
              throw new Error('Resolve attachment errors before saving.');
            const content = createContent(editor.value, {
              format: editor.format,
              ...(draft?.content.originalSource === undefined
                ? {}
                : { originalSource: draft.content.originalSource }),
            });
            await onSubmit({
              content,
              attachments: documents,
              text: content.source,
              documents,
            });
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : 'Could not save.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="custom-draft">Custom draft</label>
        <textarea
          id="custom-draft"
          placeholder="Drop a file, paste, or write…"
          {...attachments.getTextareaProps(editor.getTextareaProps())}
        />
        <input
          aria-label="Choose files"
          {...attachments.getInputProps()}
          hidden
        />
        <button type="button" onClick={attachments.openPicker}>
          Attach files
        </button>
        <ul>
          {attachments.documents.map((document) => (
            <li key={document.id}>
              {document.name} · {document.status}{' '}
              <button
                type="button"
                onClick={() => attachments.removeDocument(document.id)}
              >
                Remove {document.name}
              </button>
            </li>
          ))}
        </ul>
        {(error || attachments.inputError) && (
          <p role="alert">{error || attachments.inputError}</p>
        )}
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save custom draft'}
        </button>
      </form>
    </div>
  );
}

export function Playground() {
  const approval = useOcrApproval();
  const ocrAdapters = useMemo(
    () =>
      createRegistry().map((adapter) =>
        adapter.format === 'pdf'
          ? createPdfAdapter({
              ocr: {
                engine: createTesseractEngine({
                  workerPath: '/texion-ocr/worker.min.js',
                  corePath: '/texion-ocr/core',
                  langPath: '/texion-ocr/lang',
                  cacheMethod: 'write',
                }),
                trigger: 'ask',
                requestApproval: approval.requestApproval,
              },
            })
          : adapter,
      ),
    [approval.requestApproval],
  );

  const [preset, setPreset] = useState<Preset>('chat');
  const [generation, setGeneration] = useState(0);
  const [draft, setDraft] = useState<Draft>();
  const [saved, setSaved] = useState<TexionMessage>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      setSaved(loadPlaygroundMessage());
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Saved message could not be loaded.',
      );
    }
    setLoaded(true);
  }, []);
  function reset() {
    setDraft(undefined);
    setGeneration((value) => value + 1);
  }
  async function save(submission: Submission) {
    setError(undefined);
    try {
      setSaved(await savePlaygroundSubmission(submission));
    } catch (failure) {
      const problem =
        failure instanceof Error
          ? failure
          : new Error('Could not save locally.');
      setError(problem.message);
      throw problem;
    }
  }
  async function edit() {
    if (!saved || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const signal = new AbortController().signal;
      const files = await Promise.all(
        saved.attachments.map(async (attachment) => {
          const file = await resolvePlaygroundAttachment(attachment, signal);
          if (!file)
            throw new Error(`Original file unavailable: ${attachment.name}`);
          return file;
        }),
      );
      setDraft({ content: saved.content, files });
      setPreset(preset === 'ocr' ? 'ocr' : 'form');
      setGeneration((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not reopen message.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="playground">
      <div className="playground-controls">
        <div role="group" aria-label="Composer preset">
          {(Object.keys(presets) as Preset[]).map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={preset === key}
              onClick={() => {
                setPreset(key);
                reset();
              }}
            >
              {presets[key]}
            </button>
          ))}
        </div>
        <button type="button" className="reset-button" onClick={reset}>
          Reset
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {approval.pending.map(({ id, request }) => (
        <section className="ocr-approval" aria-label="OCR approval" key={id}>
          <h2>Recognize scanned pages?</h2>
          <p>
            {request.document?.name ?? 'This document'} ·{' '}
            {request.pageNumbers.length} candidate pages. Recognition runs
            locally. OCR assets load from this site; your document is not
            uploaded.
          </p>
          <div>
            <button type="button" onClick={() => approval.approve(id)}>
              Recognize pages
            </button>
            <button type="button" onClick={() => approval.deny(id)}>
              Use native text
            </button>
          </div>
        </section>
      ))}
      {preset === 'ocr' && (
        <div className="ocr-preset-note">
          <p>
            Local OCR for scanned PDF pages. You approve recognition before the
            worker or models load.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(undefined);
              try {
                const response = await fetch('/samples/ocr-scanned.pdf');
                if (!response.ok)
                  throw new Error('The sample could not be loaded.');
                const file = new File(
                  [await response.blob()],
                  'ocr-sample.pdf',
                  { type: 'application/pdf' },
                );
                setDraft({
                  content: createContent('Read this scanned page.'),
                  files: [file],
                });
                setGeneration((value) => value + 1);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : 'Could not load sample.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Try a scanned PDF
          </button>
        </div>
      )}

      <div className="playground-grid">
        <section
          className="playground-composer"
          aria-label="Interactive composer"
        >
          <div className="playground-panel-heading">
            <span className="status-dot" />
            {presets[preset]}
            <span>Input</span>
          </div>
          {!loaded ? (
            <p role="status">Loading local message…</p>
          ) : preset === 'headless' ? (
            <HeadlessComposer
              key={generation}
              {...(draft ? { draft } : {})}
              onSubmit={save}
            />
          ) : (
            <TexionInput
              key={`${preset}-${generation}`}
              {...(preset === 'ocr' ? { adapters: ocrAdapters } : {})}
              label={preset === 'form' ? 'Description' : 'Message'}
              {...(draft
                ? {
                    defaultContent: draft.content,
                    initialAttachments: draft.files,
                  }
                : {
                    defaultValue:
                      preset === 'mixed'
                        ? mixed
                        : preset === 'rich'
                          ? '# A draft worth sharing\n\nMake it **your own**.'
                          : 'Hello from Texion. Add a file or make this draft your own.',
                  })}
              mode={preset === 'rich' ? 'rich' : 'source'}
              preview
              previewImages
              highlight
              submitOnEnter={preset === 'chat'}
              submitLabel={
                preset === 'chat' ? 'Send message' : 'Submit content'
              }
              onSubmit={save}
            />
          )}
          <p className="playground-help">
            {preset === 'chat'
              ? 'Enter to submit · Shift + Enter for a new line. '
              : 'Use the button to submit. '}
            Saved messages and original files stay in this browser across
            reloads. No AI request is made.
          </p>
        </section>
        <section className="submission-panel" aria-label="Submission result">
          <div className="playground-panel-heading">
            Saved message <span>{saved ? 'Saved locally' : 'Waiting'}</span>
          </div>
          {saved ? (
            <div className="submitted-content">
              <div className="saved-message-actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void edit()}
                >
                  Edit saved message
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await clearPlaygroundMessage(saved);
                      setSaved(undefined);
                    } catch (failure) {
                      setError(String(failure));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Clear saved message
                </button>
              </div>
              <TexionMessageViewer
                key={preset}
                {...(preset === 'ocr'
                  ? { options: { adapters: ocrAdapters } }
                  : {})}
                message={saved}
                resolveAttachment={resolvePlaygroundAttachment}
              />
              <details className="submission-json">
                <summary>Inspect submission data</summary>
                <pre>
                  {JSON.stringify(JSON.parse(serializeMessage(saved)), null, 2)}
                </pre>
              </details>
              <p className="playground-help">
                Reload this page to restore the saved message. Edit reopens the
                original source and files.
              </p>
            </div>
          ) : (
            <div className="submission-empty">
              <span aria-hidden="true">{'{ }'}</span>
              <h2>See what your app receives.</h2>
              <p>
                Submit a draft to save portable content and attachment
                references, then reload and reopen it.
              </p>
              <Link href="/docs/guides/saved-messages">
                Explore saved messages →
              </Link>
            </div>
          )}
        </section>
      </div>
      <p className="playground-footnote">
        Default limits: 5 files, 2 MB per file. PDF and DOCX previews show
        extracted text. Select Scanned PDF to enable local OCR.{' '}
        <Link href="/docs/guides/formats">Format details →</Link>
      </p>
    </div>
  );
}
