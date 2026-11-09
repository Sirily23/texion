import { Suspense, useMemo } from 'react';
import type { ComponentType } from 'react';
import type {
  ControllerOptions,
  DocumentInput,
  DocumentPreview,
  TexionDocument,
} from '@texion/core';
import { useDocument } from '../hooks/useDocument';
import { DefaultMarkdownRenderer } from '../renderers/registry';

export interface DocumentViewerProps {
  readonly document?: TexionDocument;
  readonly input?: DocumentInput;
  readonly content?: string;
  readonly format?: 'markdown';
  readonly options?: ControllerOptions;
  readonly className?: string;
  readonly renderer?: ComponentType<{ preview: DocumentPreview }>;
}

export function DocumentViewer({
  document: supplied,
  input,
  content,
  options,
  className,
  renderer: Renderer = DefaultMarkdownRenderer,
}: DocumentViewerProps) {
  const processed = useDocument(
    supplied ? undefined : (input ?? content),
    options,
  );
  const document = supplied ?? processed;
  const preview = useMemo(
    () => (document?.status === 'ready' ? document.getPreview?.() : undefined),
    [document],
  );

  if (document?.status === 'error') {
    return <p role="alert">{document.error?.message}</p>;
  }
  if (!document || document.status !== 'ready') {
    return <p role="status">Preparing document…</p>;
  }
  return (
    <section
      className={className ?? 'texion-viewer'}
      aria-label={`Preview of ${document.name}`}
    >
      {document.warnings.map((warning, i) => (
        <p role="status" key={i}>
          {warning.message}
        </p>
      ))}
      {preview?.warnings.map((warning, i) => (
        <p role="status" key={i}>
          {warning.message}
        </p>
      ))}
      {preview && (
        <Suspense fallback={<p role="status">Loading preview…</p>}>
          <Renderer preview={preview} />
        </Suspense>
      )}
    </section>
  );
}
