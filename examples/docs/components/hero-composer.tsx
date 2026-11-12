'use client';

import { lazy, Suspense, useRef, useState } from 'react';
import { ArrowUp, Check, FileText, Paperclip, X } from 'lucide-react';
import { DocumentViewer, TexionViewer, useTexion } from '@texion/react';
import type { Submission } from '@texion/react';
import { detectTextFormat } from '@texion/core';

const RichEditor = lazy(() => import('@texion/react/rich'));

const examples = {
  Markdown:
    '## A little clarity\n\nTurn these notes into something worth sharing.',
  JSON: '{\n  "idea": "One place for text and files",\n  "ready": true\n}',
  CSV: 'Project,Status,Owner\nWebsite,Ready,Alex\nMobile app,In progress,Sam\nAPI,Review,Jordan',
};

export function HeroComposer() {
  const [sent, setSent] = useState<Submission>();
  const [previewId, setPreviewId] = useState<string>();
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [exampleError, setExampleError] = useState<string>();
  const [sourceEditing, setSourceEditing] = useState(false);
  const input = useTexion({
    defaultValue: '',
    submitOnEnter: true,
    onSubmit: setSent,
  });
  const preview = input.documents.find((document) => document.id === previewId);
  const richSource = useRef(input.text);
  richSource.current = input.text;
  const structured = input.format === 'csv' || input.format === 'json';
  async function loadPdf() {
    setLoadingPdf(true);
    setExampleError(undefined);
    setSent(undefined);
    try {
      const response = await fetch('/samples/texion-sample.pdf');
      if (!response.ok)
        throw new Error('Could not load the PDF example. Try again.');
      const file = new File([await response.blob()], 'texion-sample.pdf', {
        type: 'application/pdf',
      });
      const documentId = input.addDocument(file);
      setPreviewId(documentId);
    } catch (error) {
      setExampleError(
        error instanceof Error
          ? error.message
          : 'Could not load the PDF example.',
      );
    } finally {
      setLoadingPdf(false);
    }
  }
  return (
    <div className="home-demo" {...input.getRootProps()}>
      <div className="home-demo-heading">
        <span>
          <span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://w3.org"
            >
              <rect
                x="2"
                y="8"
                width="2"
                height="4"
                rx="1"
                fill="currentColor"
                fill-opacity="0.5"
              />
              <rect
                x="6"
                y="5"
                width="2"
                height="7"
                rx="1"
                fill="currentColor"
                fill-opacity="0.75"
              />
              <rect
                x="10"
                y="2"
                width="2"
                height="10"
                rx="1"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="" /> Try it here
        </span>
        <span>Runs in your browser</span>
      </div>
      {sent && (
        <section className="home-demo-result" aria-label="Demo submission">
          <div className="home-demo-receipt">
            <Check size={14} /> Ready for your app
          </div>
          <TexionViewer content={sent.content} />
          {sent.attachments.map((file) => (
            <div className="home-demo-file" key={file.id}>
              <FileText size={15} />
              <span>{file.name}</span>
              <span>{file.format}</span>
            </div>
          ))}
          <button
            className="home-demo-dismiss"
            type="button"
            onClick={() => setSent(undefined)}
          >
            Clear result
          </button>
        </section>
      )}
      <form
        className="home-composer"
        onPasteCapture={(event) => {
          const editor =
            event.target instanceof HTMLElement
              ? event.target.closest<HTMLElement>('[contenteditable="true"]')
              : null;
          const source = event.clipboardData.getData('text/plain');
          if (!editor || !source || event.clipboardData.files.length) return;
          const replacesContent =
            !editor.textContent?.trim() ||
            window.getSelection()?.toString().trim() ===
              editor.innerText.trim();
          if (
            replacesContent &&
            ['csv', 'json'].includes(detectTextFormat(source))
          ) {
            event.preventDefault();
            event.stopPropagation();
            input.setText(source);
            setSourceEditing(false);
            setSent(undefined);
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void input.submit();
        }}
      >
        <label className="sr-only" htmlFor="home-message">
          Try the composer
        </label>
        {input.documents.length > 0 && (
          <ul className="home-attachments" aria-label="Demo attachments">
            {input.documents.map((file) => (
              <li key={file.id}>
                <FileText size={15} />
                <span>
                  {file.name}
                  <small role={file.status === 'error' ? 'alert' : 'status'}>
                    {file.error?.message ?? file.status}
                  </small>
                </span>
                {file.status === 'ready' && (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewId(previewId === file.id ? undefined : file.id)
                    }
                    aria-expanded={previewId === file.id}
                  >
                    Preview
                  </button>
                )}
                <button
                  className="home-icon-button"
                  type="button"
                  onClick={() => input.removeDocument(file.id)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {preview && <DocumentViewer document={preview} />}
        <div className="home-editor-mode">
          <button
            type="button"
            onClick={() => setSourceEditing((value) => !value)}
            aria-pressed={sourceEditing}
          >
            {sourceEditing ? 'Show formatted' : 'Edit source'}
          </button>
        </div>
        {sourceEditing ? (
          <textarea
            id="home-message"
            rows={3}
            placeholder="Drop a file, paste, or write…"
            {...input.getTextareaProps({
              onChange: () => setSent(undefined),
            })}
          />
        ) : structured ? (
          <section
            id="home-message"
            className="home-formatted-input"
            aria-label="Formatted content"
            tabIndex={0}
            onPaste={(event) => {
              const source = event.clipboardData.getData('text/plain');
              if (source && !event.clipboardData.files.length) {
                event.preventDefault();
                input.setText(source);
                setSent(undefined);
              }
            }}
          >
            <TexionViewer content={input.content} />
          </section>
        ) : input.format === 'markdown' ? (
          <Suspense fallback={<p role="status">Loading editor…</p>}>
            <RichEditor
              {...input.getRichEditorProps({
                id: 'home-message',
                label: 'Try the composer',
                placeholder: 'Drop a file, paste, or write…',
                live: true,
                onChange(source) {
                  richSource.current = source;
                  setSent(undefined);
                },
                onRequestSource() {
                  setSourceEditing(
                    detectTextFormat(richSource.current) === 'markdown',
                  );
                },
              })}
            />
          </Suspense>
        ) : (
          <textarea
            id="home-message"
            rows={3}
            {...input.getTextareaProps({ onChange: () => setSent(undefined) })}
          />
        )}
        <div className="home-composer-tools">
          <input
            aria-label="Attach a demo file"
            {...input.getInputProps()}
            hidden
          />
          <button
            className="home-attach"
            type="button"
            onClick={input.openPicker}
          >
            <Paperclip size={18} />
            <span>Attach a file</span>
          </button>
          <button
            className="home-send"
            type="submit"
            aria-label="Submit demo"
            disabled={
              input.isSubmitting ||
              (!input.text.trim() && !input.documents.length)
            }
          >
            <ArrowUp size={20} />
          </button>
        </div>
        {(input.inputError || input.submitError) && (
          <p role="alert">{input.inputError || input.submitError}</p>
        )}
        {input.isDragging && <p role="status">Drop your file here</p>}
      </form>
      <div
        className="home-demo-examples"
        role="group"
        aria-label="Try an example"
      >
        <span>Examples</span>
        {Object.entries(examples).map(([name, source]) => (
          <button
            type="button"
            key={name}
            onClick={() => {
              input.setText(source);
              setSent(undefined);
              setExampleError(undefined);
              setSourceEditing(false);
            }}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void loadPdf()}
          disabled={loadingPdf}
        >
          {loadingPdf ? 'Loading PDF…' : 'PDF'}
        </button>
      </div>
      {exampleError && <p role="alert">{exampleError}</p>}
      <p className="home-demo-note">
        A real Texion input. No AI request. Files stay here.
      </p>
    </div>
  );
}
