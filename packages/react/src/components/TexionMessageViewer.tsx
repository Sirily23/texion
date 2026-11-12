import { useEffect, useState } from 'react';
import { isTexionMessage } from '@texion/core';
import type {
  ControllerOptions,
  DocumentInput,
  TexionAttachmentReference,
  TexionMessage,
} from '@texion/core';
import type { RendererRegistry } from '../renderers/types';
import { TexionViewer } from './TexionViewer';
import { DocumentViewer } from './DocumentViewer';

export type AttachmentResolver = (
  attachment: TexionAttachmentReference,
  signal: AbortSignal,
) => DocumentInput | undefined | Promise<DocumentInput | undefined>;
export interface TexionMessageViewerProps {
  readonly message: TexionMessage;
  readonly resolveAttachment?: AttachmentResolver;
  readonly options?: ControllerOptions;
  readonly renderers?: RendererRegistry;
  readonly className?: string;
}

function SavedAttachment({
  attachment,
  resolve,
  options,
  renderers,
}: {
  attachment: TexionAttachmentReference;
  resolve: AttachmentResolver | undefined;
  options: ControllerOptions | undefined;
  renderers: RendererRegistry | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{
    attachment: TexionAttachmentReference;
    input?: DocumentInput;
    error?: string;
  }>();
  useEffect(() => {
    if (!open || !resolve) return;
    const operation = new AbortController();
    setResult(undefined);
    void Promise.resolve()
      .then(() => resolve(attachment, operation.signal))
      .then((input) => {
        if (operation.signal.aborted) return;
        // Storage often returns a Blob; retain the saved filename for format detection.
        const value =
          input && typeof input === 'object' && 'arrayBuffer' in input
            ? new File([input as Blob], attachment.name, {
                type: attachment.mimeType || (input as Blob).type,
              })
            : input;
        setResult({
          attachment,
          ...(value === undefined ? {} : { input: value }),
        });
      })
      .catch((error: unknown) => {
        if (!operation.signal.aborted)
          setResult({
            attachment,
            error:
              error instanceof Error
                ? error.message
                : 'The attachment could not be restored.',
          });
      });
    return () => operation.abort();
  }, [open, resolve, attachment]);
  const current = result?.attachment === attachment ? result : undefined;
  return (
    <li className="texion-saved-attachment">
      <div>
        <strong>{attachment.name}</strong>
        <span>
          {attachment.format} · {attachment.size.toLocaleString()} bytes
        </span>
      </div>
      {resolve ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? `Close ${attachment.name}` : `Preview ${attachment.name}`}
        </button>
      ) : (
        <p>Original attachment requires a host resolver.</p>
      )}
      {open && resolve && (
        <div className="texion-saved-attachment-preview">
          {!current ? (
            <p role="status">Restoring attachment…</p>
          ) : current.error ? (
            <p role="alert">{current.error}</p>
          ) : current.input === undefined ? (
            <p role="status">The original attachment is not available.</p>
          ) : (
            <DocumentViewer
              input={current.input}
              format={attachment.format}
              {...(options ? { options } : {})}
              {...(renderers ? { renderers } : {})}
            />
          )}
        </div>
      )}
    </li>
  );
}

/** Renders portable content; attachment keys are never fetched or opened automatically. */
export function TexionMessageViewer({
  message,
  resolveAttachment,
  options,
  renderers,
  className = 'texion-message',
}: TexionMessageViewerProps) {
  if (!isTexionMessage(message))
    return <p role="alert">Invalid Texion message.</p>;
  return (
    <section className={className} aria-label="Saved message">
      {message.content.source.trim() && (
        <TexionViewer
          content={message.content}
          {...(options ? { options } : {})}
          {...(renderers ? { renderers } : {})}
        />
      )}
      {message.attachments.length > 0 && (
        <ul aria-label="Saved attachments">
          {message.attachments.map((attachment) => (
            <SavedAttachment
              key={attachment.id}
              attachment={attachment}
              resolve={resolveAttachment}
              options={options}
              renderers={renderers}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
