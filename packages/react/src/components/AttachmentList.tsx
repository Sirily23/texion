import type { TexionDocument } from '@texion/core';

export interface AttachmentListProps {
  readonly documents: readonly TexionDocument[];
  readonly onRemove: (id: string) => void;
  readonly onPreview?: ((id: string) => void) | undefined;
}

export function AttachmentList({
  documents,
  onRemove,
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
