import { isTexionContent } from '@texion/core';
import type { TexionContent } from '@texion/core';
import { DocumentViewer } from './DocumentViewer';
import type { DocumentViewerProps } from './DocumentViewer';

export interface TexionViewerProps extends Omit<
  DocumentViewerProps,
  'content' | 'input' | 'document' | 'format'
> {
  readonly content: TexionContent;
}

export function TexionViewer({ content, ...props }: TexionViewerProps) {
  if (!isTexionContent(content)) {
    return <p role="alert">Unsupported Texion content.</p>;
  }
  return (
    <DocumentViewer
      {...props}
      content={content.source}
      format={content.format}
    />
  );
}
