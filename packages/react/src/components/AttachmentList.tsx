import type { TexionDocument } from '@texion/core';

export interface AttachmentListProps {
  readonly documents: readonly TexionDocument[];
  readonly onCancel?: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onPreview?: ((id: string) => void) | undefined;
}

export function AttachmentList({
  documents,
  onRemove,
  onCancel,
  onPreview,
}: AttachmentListProps) {
  if (!documents.length) {
    return null;
  }
  return (
    <ul className="texion-attachments" aria-label="Attachments">
      {documents.map((document) => (
        <li key={document.id}>
          <span>{document.name}</span>{' '}
          <span role="status">{document.status}</span>
          {document.status === 'processing' && document.progress && (
            <span className="texion-document-progress" role="status">
              {document.progress.phase === 'pending-consent'
                ? 'Waiting for OCR approval'
                : document.progress.phase === 'initializing-ocr'
                  ? 'Loading OCR engine'
                  : document.progress.phase === 'ocr'
                    ? `Recognizing page ${document.progress.pageNumber ?? document.progress.done + 1} · ${document.progress.done}/${document.progress.total} complete`
                    : `Extracting page ${document.progress.done} of ${document.progress.total}`}
              <progress
                aria-label={`Processing ${document.name}`}
                value={document.progress.done}
                max={Math.max(1, document.progress.total)}
              />
            </span>
          )}
          {document.error && <span role="alert">{document.error.message}</span>}
          {document.warnings.map((warning, i) => (
            <span role="status" key={i}>
              {warning.message}
            </span>
          ))}
          {onPreview && document.status === 'ready' && (
            <button
              type="button"
              onClick={() => onPreview(document.id)}
              aria-label={`Preview ${document.name}`}
            >
              Preview
            </button>
          )}
          {onCancel &&
            (document.status === 'pending' ||
              document.status === 'processing') && (
              <button
                type="button"
                onClick={() => onCancel(document.id)}
                aria-label={`Cancel ${document.name}`}
              >
                Cancel
              </button>
            )}
          <button
            type="button"
            onClick={() => onRemove(document.id)}
            aria-label={`Remove ${document.name}`}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
