import { Suspense, useMemo } from 'react';
import type { ComponentType } from 'react';
import type {
  ControllerOptions,
  DocumentInput,
  TexionDocument,
  TextFormat,
} from '@texion/core';
import { useDocument } from '../hooks/useDocument';
import { defaultRenderer } from '../renderers/registry';
import type { PreviewRendererProps } from '../renderers/types';

export interface DocumentViewerProps {
  readonly document?: TexionDocument;
  readonly input?: DocumentInput;
  readonly content?: string;
  readonly format?: TextFormat;
  readonly options?: ControllerOptions;
  readonly className?: string;
  readonly renderer?: ComponentType<PreviewRendererProps>;
}

export function DocumentViewer({
  document: supplied,
  input,
  content,
  format,
  options,
  className,
  renderer,
}: DocumentViewerProps) {
  const documentInput = useMemo(() => {
    const value = input ?? content;
    if (typeof value === 'string' && format) {
      return { text: value, format };
    }
    if (value && typeof value === 'object' && 'text' in value && format) {
      return { ...value, format };
    }
    return value;
  }, [input, content, format]);
  const processed = useDocument(supplied ? undefined : documentInput, options);
  const document = supplied ?? processed;
  const Renderer = renderer ?? defaultRenderer(document?.format);
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
      {preview?.warnings
        .filter(
          (warning) =>
            !document.warnings.some(
              (existing) =>
                existing.code === warning.code &&
                existing.message === warning.message,
            ),
        )
        .map((warning, i) => (
          <p role="status" key={i}>
            {warning.message}
          </p>
        ))}
      {preview && (
        <Suspense fallback={<p role="status">Loading preview…</p>}>
          <Renderer preview={preview} document={document} />
        </Suspense>
      )}
    </section>
  );
}
