import type { BinaryFormatAdapter } from '../contract';
import type { DocumentPage, OcrOptions } from '../../ocr/contract';
import { classifyPdfPage } from '../../ocr/classifier';
import { recognizePdfPages } from '../../ocr/orchestrator';
import { renderPdfPage } from './render';
import type { PdfOcrRenderer, PdfCanvasImport } from './render';

export interface PdfAdapterOptions {
  readonly ocr?: OcrOptions;
  readonly renderer?: PdfOcrRenderer;
  readonly canvasImport?: PdfCanvasImport;
}

import { IngestionError } from '../../errors/codes';
import { abortError } from '../../lifecycle/cancellation';

const isPdf = (bytes: Uint8Array) =>
  bytes[0] === 0x25 &&
  bytes[1] === 0x50 &&
  bytes[2] === 0x44 &&
  bytes[3] === 0x46 &&
  bytes[4] === 0x2d;

export function createPdfAdapter(
  options: PdfAdapterOptions = {},
): BinaryFormatAdapter {
  return {
    kind: 'binary',
    format: 'pdf',
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    detectBytes: isPdf,
    inspect(bytes) {
      if (!isPdf(bytes)) {
        throw new IngestionError(
          'invalid-document',
          'The file is not a valid PDF.',
        );
      }
      return {};
    },
    async extract(bytes, limits, signal, context) {
      // Importing the registry never loads PDF.js. Copy bytes because PDF.js owns its input.
      const { getDocumentProxy, createIsomorphicCanvasFactory } =
        await import('unpdf');
      if (signal.aborted) throw abortError();
      let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
      const cancel = () => {
        void pdf?.destroy();
      };
      try {
        // A native canvas factory must be present before PDF.js creates intermediate image canvases.
        const CanvasFactory =
          options.ocr &&
          options.ocr.trigger !== 'off' &&
          !options.renderer &&
          options.canvasImport
            ? await createIsomorphicCanvasFactory(
                options.canvasImport as Parameters<
                  typeof createIsomorphicCanvasFactory
                >[0],
              )
            : undefined;
        if (signal.aborted) throw abortError();
        pdf = await getDocumentProxy(bytes.slice(), {
          ...(CanvasFactory ? { CanvasFactory } : {}),
          isEvalSupported: false,
          useSystemFonts: true,
          maxImageSize: limits.maxImagePixels,
          disableFontFace: true,
          useWorkerFetch: false,
        });
        if (signal.aborted) throw abortError();
        signal.addEventListener('abort', cancel, { once: true });
        if (pdf.numPages > limits.maxDocumentPages) {
          throw new IngestionError(
            'too-large',
            `PDF exceeds ${limits.maxDocumentPages} pages.`,
          );
        }
        const pages: DocumentPage[] = [];
        let length = 0;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (signal.aborted) throw abortError();
          const page = await pdf.getPage(pageNumber);
          try {
            const content = await page.getTextContent();
            let text = '';
            for (const item of content.items) {
              if ('str' in item) {
                const part = item.str + (item.hasEOL ? '\n' : ' ');
                length += part.length;
                if (length > limits.maxExtractedCharacters) {
                  throw new IngestionError(
                    'too-large',
                    `Extracted text exceeds ${limits.maxExtractedCharacters} characters.`,
                  );
                }
                text += part;
              }
            }
            length += 2;
            if (length > limits.maxExtractedCharacters) {
              throw new IngestionError(
                'too-large',
                `Extracted text exceeds ${limits.maxExtractedCharacters} characters.`,
              );
            }
            const native = text.trim();
            pages.push({
              pageNumber,
              text: native,
              source: 'native',
              classification: classifyPdfPage(
                native,
                options.ocr?.minCharsPerPage,
              ),
            });
            context?.reportProgress({
              phase: 'extracting',
              done: pageNumber,
              total: pdf.numPages,
              pageNumber,
            });
          } finally {
            page.cleanup();
          }
        }
        const raw = pages.map((page) => page.text).join('\n\n');
        const extracted = options.ocr
          ? await recognizePdfPages(
              pages,
              options.ocr,
              (request) =>
                options.renderer
                  ? options.renderer(bytes, request)
                  : renderPdfPage(pdf!, request, options.canvasImport),
              limits,
              signal,
              context?.reportProgress,
              context?.document,
            )
          : { raw, pages, warnings: [] };
        return {
          ...extracted,
          metadata: { pages: pdf.numPages },
          warnings: [
            ...extracted.warnings,
            ...(extracted.raw.trim()
              ? []
              : [
                  {
                    code: 'no-text' as const,
                    message: options.ocr
                      ? 'No usable text could be extracted or recognized. The original PDF is preserved.'
                      : 'No extractable text found. Scanned PDFs require OCR, which is not enabled.',
                  },
                ]),
          ],
        };
      } catch (error) {
        if (signal.aborted) throw abortError();
        if (error instanceof IngestionError) throw error;
        throw new IngestionError(
          'invalid-document',
          'The PDF could not be read. It may be damaged or password protected.',
        );
      } finally {
        signal.removeEventListener('abort', cancel);
        await pdf?.destroy();
      }
    },
    // Extracted document previews are generated from raw text by the pipeline.
    parse: () => ({ nodes: [], truncated: false, warnings: [] }),
  };
}

export const pdfAdapter = createPdfAdapter();
