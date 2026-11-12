import type { RendererRegistry } from '../renderers/types';
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
  readonly renderers?: RendererRegistry;
  readonly label?: string;
  readonly preview?: boolean;
  /** Show local image previews automatically as attachments become ready. */
  readonly previewImages?: boolean;
  /** Initial placement of previews, attachments and input feedback. */
  readonly previewPosition?: 'above' | 'below';
  readonly className?: string;
  readonly mode?: 'source' | 'rich';
  readonly live?: boolean;
  readonly modeSwitch?: boolean;
  readonly submitLabel?: string;
  readonly maxRichCharacters?: number;
}

export function TexionInput({
  placeholder = 'Drop a file, paste, or write…',
  renderers,
  label = 'Message',
  preview = false,
  previewImages = false,
  previewPosition = 'above',
  className = 'texion-input',
  mode = 'source',
  live = true,
  modeSwitch = mode === 'rich',
  submitLabel = 'Submit',
  maxRichCharacters = 50_000,
  ...options
}: TexionInputProps) {
  const [position, setPosition] = useState(previewPosition);
  useEffect(() => setPosition(previewPosition), [previewPosition]);
  const [editorMode, setEditorMode] = useState(mode);
  useEffect(() => setEditorMode(mode), [mode]);
  const texion = useTexion({
    ...options,
    format:
      options.format ??
      options.defaultContent?.format ??
      (editorMode === 'rich' ? 'markdown' : 'auto'),
    highlight: editorMode === 'source' && !!options.highlight,
  });
  const canUseRich = texion.format === 'markdown';
  const id = useId();
  const [previewId, setPreviewId] = useState<string>();
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showImagePreviews, setShowImagePreviews] = useState(previewImages);
  useEffect(() => setShowImagePreviews(previewImages), [previewImages]);
  const images = texion.documents.filter(
    (document) => document.format === 'image' && document.status === 'ready',
  );
  const selected = texion.documents.find(
    (document) => document.id === previewId,
  );

  const previews = (
    <div className="texion-input-previews">
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
        <DocumentViewer
          format={texion.format}
          content={texion.text}
          options={
            options.formats && !options.acceptedFormats
              ? { ...options, acceptedFormats: options.formats }
              : options
          }
          {...(renderers ? { renderers } : {})}
        />
      )}
      {texion.isDragging && <p role="status">Drop supported files here</p>}
      {texion.inputError && <p role="alert">{texion.inputError}</p>}
      {images.length > 0 && (
        <label>
          <input
            type="checkbox"
            checked={showImagePreviews}
            onChange={(event) => {
              setShowImagePreviews(event.currentTarget.checked);
              setPreviewId(undefined);
            }}
          />
          Show image previews
        </label>
      )}
      <AttachmentList
        documents={texion.documents}
        onRemove={texion.removeDocument}
        onCancel={texion.cancelDocument}
        onPreview={preview ? setPreviewId : undefined}
      />
      {showImagePreviews &&
        images.map((document) => (
          <DocumentViewer
            key={document.id}
            document={document}
            {...(renderers ? { renderers } : {})}
          />
        ))}
      {preview &&
        selected &&
        !(showImagePreviews && selected.format === 'image') && (
          <>
            <button type="button" onClick={() => setPreviewId(undefined)}>
              Close preview
            </button>
            <DocumentViewer
              document={selected}
              {...(renderers ? { renderers } : {})}
            />
          </>
        )}
    </div>
  );

  return (
    <div {...texion.getRootProps({ className })}>
      <label>
        Preview position
        <select
          value={position}
          onChange={(event) =>
            setPosition(event.currentTarget.value as 'above' | 'below')
          }
        >
          <option value="above">Above input</option>
          <option value="below">Below input</option>
        </select>
      </label>
      {position === 'above' && previews}
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
                  ? [options.format].filter(isTextFormat)
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
      {position === 'below' && previews}
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
