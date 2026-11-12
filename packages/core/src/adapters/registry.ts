import type { FormatAdapter } from './contract';
import { markdownAdapter } from './markdown';
import { jsonAdapter } from './json';
import { csvAdapter } from './csv';
import { imageAdapter } from './image';
import { textAdapter } from './text';
import { pdfAdapter } from './pdf';
import { docxAdapter } from './docx';

export function createRegistry(
  adapters: readonly FormatAdapter[] = [
    jsonAdapter,
    markdownAdapter,
    csvAdapter,
    imageAdapter,
    pdfAdapter,
    docxAdapter,
    textAdapter,
  ],
  acceptedFormats?: readonly string[],
): readonly FormatAdapter[] {
  const seen = new Set<string>();

  return Object.freeze(
    adapters.filter((adapter) => {
      if (seen.has(adapter.format)) {
        throw new Error(`Duplicate adapter: ${adapter.format}`);
      }
      seen.add(adapter.format);

      return !acceptedFormats || acceptedFormats.includes(adapter.format);
    }),
  );
}
