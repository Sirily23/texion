import type { DocumentPreview, TexionDocument } from '@texion/core';

export interface PreviewRendererProps {
  readonly preview: DocumentPreview;
  readonly document?: TexionDocument;
}
