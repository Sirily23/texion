import type { ComponentType } from 'react';
import type { DocumentPreview, TexionDocument } from '@texion/core';

export interface PreviewRendererProps {
  readonly preview: DocumentPreview;
  readonly document?: TexionDocument;
}

export type RendererRegistry = Readonly<
  Record<string, ComponentType<PreviewRendererProps>>
>;
