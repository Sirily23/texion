import type { TextFormatAdapter } from '../contract';
import type { DocumentPreview } from '../../document/types';
import type { Limits } from '../../policy/limits';

export function plainTextPreview(
  text: string,
  limits: Limits,
): DocumentPreview {
  const truncated = text.length > limits.maxPreviewCharacters;
  return {
    nodes: [
      { type: 'code', value: text.slice(0, limits.maxPreviewCharacters) },
    ],
    truncated,
    warnings: truncated
      ? [
          {
            code: 'truncated',
            message:
              'Preview truncated; full extracted text remains available.',
          },
        ]
      : [],
  };
}

export const textAdapter: TextFormatAdapter = {
  format: 'text',
  extensions: ['txt'],
  mimeTypes: ['text/plain'],
  detect: () => false,
  parse: plainTextPreview,
};
