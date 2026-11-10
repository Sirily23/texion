import { lazy } from 'react';

export const DefaultMarkdownRenderer = lazy(() => import('./markdown'));
const JsonRenderer = lazy(() => import('./json'));
const CsvRenderer = lazy(() => import('./csv'));
const ImageRenderer = lazy(() => import('./image'));
export function defaultRenderer(format?: string) {
  switch (format) {
    case 'json':
      return JsonRenderer;
    case 'csv':
      return CsvRenderer;
    case 'image':
      return ImageRenderer;
    default:
      return DefaultMarkdownRenderer;
  }
}
