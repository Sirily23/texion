import { isTextFormat } from '@texion/core';
import { Suspense, lazy, useEffect, useId, useState } from 'react';
import type { UseTexionOptions } from '../hooks/useTexion';
import { useTexion } from '../hooks/useTexion';
import { AttachmentList } from './AttachmentList';
import { DocumentViewer } from './DocumentViewer';
import { HighlightedTextareaSurface } from './HighlightedTextarea';

const RichEditor = lazy(() => import('../editors/rich/RichMarkdownEditor'));

export interface TexionInputProps extends UseTexionOptions {
  readonly placeholder?: string;
  readonly label?: string;
  readonly preview?: boolean;
  readonly className?: string;
  readonly mode?: 'source' | 'rich';
  readonly live?: boolean;
  readonly modeSwitch?: boolean;
  readonly submitLabel?: string;
  readonly maxRichCharacters?: number;
}

export function TexionInput({
  placeholder = 'Write something…',
  label = 'Message',
  preview = false,
  className = 'texion-input',
  mode = 'source',
  live = true,
  modeSwitch = mode === 'rich',
  submitLabel = 'Submit',
  maxRichCharacters = 50_000,
  ...options
}: TexionInputProps) {
  const [editorMode, setEditorMode] = useState(mode);
  useEffect(() => setEditorMode(mode), [mode]);
  const texion = useTexion({
    ...options,
    format: options.format ?? (editorMode === 'rich' ? 'markdown' : 'auto'),
    highlight: editorMode === 'source' && !!options.highlight,
  });
  const canUseRich = texion.format === 'markdown';
  const id = useId();
  const [previewId, setPreviewId] = useState<string>();
  const [showTextPreview, setShowTextPreview] = useState(false);
  const selected = texion.documents.find(
    (document) => document.id === previewId,
  );

  return (
    <div {...texion.getRootProps({ className })}>
      <label htmlFor={id}>{label}</label>
      {modeSwitch && canUseRich && (
        <button
          type="button"
          onClick={() =>
            setEditorMode((value) => (value === 'rich' ? 'source' : 'rich'))
          }
        >
          {editorMode === 'rich' ? 'Edit Markdown source' : 'Edit rich content'}
        </button>
      )}
      {editorMode === 'rich' && canUseRich ? (
        <Suspense fallback={<p role="status">Loading rich editor…</p>}>
          <RichEditor
            {...texion.getRichEditorProps({
              formats:
                options.format && options.format !== 'auto'
                  ? [options.format]
                  : (options.formats?.filter(isTextFormat) ?? [
                      'markdown',
                      'json',
                      'csv',
                    ]),
              id,
              label,
              placeholder,
              live,
              maxCharacters: maxRichCharacters,
              onRequestSource: () => setEditorMode('source'),
            })}
          />
        </Suspense>
      ) : (
        <HighlightedTextareaSurface
          textareaProps={texion.getTextareaProps({ id, placeholder })}
          model={texion.highlightModel}
        />
      )}
      {texion.warnings.map((warning, index) => (
        <p role="status" key={index}>
          {warning.message}
        </p>
      ))}
      {texion.textDocument?.error && (
        <p role="alert">{texion.textDocument.error.message}</p>
      )}
      {preview && !!texion.text.trim() && (
        <button
          type="button"
          aria-expanded={showTextPreview}
          onClick={() => setShowTextPreview((value) => !value)}
        >
          {showTextPreview ? 'Hide message preview' : 'Preview message'}
        </button>
      )}
      {preview && showTextPreview && !!texion.text.trim() && (
        <DocumentViewer format={texion.format} content={texion.text} />
      )}
      {options.attachments !== false && (
        <>
          <input
            {...texion.getInputProps({
              hidden: true,
              'aria-label': 'Choose files',
            })}
          />
          <button type="button" onClick={texion.openPicker}>
            Attach files
          </button>
        </>
      )}
      {texion.isDragging && <p role="status">Drop supported files here</p>}
      {texion.inputError && <p role="alert">{texion.inputError}</p>}
      <AttachmentList
        documents={texion.documents}
        onRemove={texion.removeDocument}
        onPreview={preview ? setPreviewId : undefined}
      />
      {preview && selected && (
        <>
          <button type="button" onClick={() => setPreviewId(undefined)}>
            Close preview
          </button>
          <DocumentViewer document={selected} />
        </>
      )}
      {texion.submitError && <p role="alert">{texion.submitError}</p>}
      <button
        type="button"
        onClick={() => {
          void texion.submit();
        }}
        disabled={texion.isSubmitting}
      >
        {texion.isSubmitting ? 'Submitting…' : submitLabel}
      </button>
    </div>
  );
}
