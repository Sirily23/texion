import type { BinaryFormatAdapter } from '../contract';
import { IngestionError } from '../../errors/codes';
import { abortError } from '../../lifecycle/cancellation';

const isZip = (bytes: Uint8Array) =>
  bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;

export const docxAdapter: BinaryFormatAdapter = {
  kind: 'binary',
  format: 'docx',
  extensions: ['docx'],
  mimeTypes: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  // A ZIP signature alone does not identify DOCX. Require an extension or MIME declaration.
  detectBytes: () => false,
  inspect(bytes) {
    if (!isZip(bytes)) {
      throw new IngestionError(
        'invalid-document',
        'The file is not a valid DOCX document.',
      );
    }
    return {};
  },
  async extract(bytes, limits, signal) {
    try {
      const { unzipSync } = await import('fflate');
      if (signal.aborted) throw abortError();
      let expanded = 0;
      let count = 0;
      let hasDocument = false;
      // Inspect directory sizes without inflating entries, before the DOCX parser opens it.
      unzipSync(bytes, {
        filter(entry) {
          expanded += entry.originalSize;
          count++;
          if (
            expanded > limits.maxArchiveBytes ||
            count > limits.maxPreviewNodes
          ) {
            throw new IngestionError(
              'too-large',
              'The expanded DOCX archive exceeds the configured limits.',
            );
          }
          hasDocument ||= entry.name === 'word/document.xml';
          return false;
        },
      });
      if (!hasDocument) throw new Error('Missing document');
      const { default: mammoth } = await import('mammoth/mammoth.browser.js');
      if (signal.aborted) throw abortError();
      const result = await mammoth.extractRawText({
        arrayBuffer: bytes.slice().buffer,
      });
      if (signal.aborted) throw abortError();
      if (result.value.length > limits.maxExtractedCharacters) {
        throw new IngestionError(
          'too-large',
          `Extracted text exceeds ${limits.maxExtractedCharacters} characters.`,
        );
      }
      return {
        raw: result.value,
        warnings: result.value.trim()
          ? []
          : [
              {
                code: 'no-text' as const,
                message: 'No extractable text found in this DOCX document.',
              },
            ],
      };
    } catch (error) {
      if (signal.aborted) throw abortError();
      if (error instanceof IngestionError) throw error;
      throw new IngestionError(
        'invalid-document',
        'The DOCX could not be read. It may be damaged, encrypted, or an unsupported Word file.',
      );
    }
  },
  parse: () => ({ nodes: [], truncated: false, warnings: [] }),
};
