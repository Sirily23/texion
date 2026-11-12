import type { createIsomorphicCanvasFactory, getDocumentProxy } from 'unpdf';
import type { OcrImage, OcrRenderRequest } from '../../ocr/contract';
import { abortable, throwIfAborted } from '../../ocr/abort';
import { IngestionError } from '../../errors/codes';

type PdfDocument = Awaited<ReturnType<typeof getDocumentProxy>>;
/** A host-supplied canvas module; interpreted by the pinned unpdf runtime. */
export type PdfCanvasImport = () => Promise<unknown>;
/** Original PDF bytes plus bounded page rendering instructions. Copy before transferring bytes to a worker. */
export type PdfOcrRenderer = (
  bytes: Uint8Array,
  request: OcrRenderRequest,
) => Promise<OcrImage>;

/** Browser DOM canvas or a host-supplied Node canvas. Rendering is cooperative, not a main-thread sandbox. */
export async function renderPdfPage(
  pdf: PdfDocument,
  request: OcrRenderRequest,
  canvasImport?: PdfCanvasImport,
): Promise<OcrImage> {
  throwIfAborted(request.signal);
  const { createIsomorphicCanvasFactory } = await import('unpdf');
  const CanvasFactory = await createIsomorphicCanvasFactory(
    canvasImport as Parameters<typeof createIsomorphicCanvasFactory>[0],
  );
  throwIfAborted(request.signal);
  const factory = new CanvasFactory();
  const page = await pdf.getPage(request.pageNumber);
  let target: ReturnType<typeof factory.create> | undefined;
  let task: ReturnType<typeof page.render> | undefined;
  const cancel = () => task?.cancel();
  request.signal.addEventListener('abort', cancel, { once: true });
  try {
    throwIfAborted(request.signal);
    const viewport = page.getViewport({ scale: request.dpi / 72 });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    if (
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height > request.maxPixels
    )
      throw new IngestionError(
        'ocr-limit-exceeded',
        'The rendered PDF page exceeds the OCR pixel limit.',
      );
    target = factory.create(width, height);
    if (!target.context)
      throw new IngestionError(
        'ocr-unavailable',
        'A canvas rendering context is not available.',
      );
    // PDF.js accepts both the browser and native canvas implementations supplied by unpdf.
    type RenderOptions = Parameters<typeof page.render>[0];
    task = page.render({
      canvas: target.canvas as unknown as RenderOptions['canvas'],
      canvasContext:
        target.context as unknown as RenderOptions['canvasContext'],
      viewport,
      background: '#ffffff',
    });
    await abortable(() => task!.promise, request.signal);
    throwIfAborted(request.signal);
    const encoded = target.canvas.toDataURL('image/png');
    const prefix = 'data:image/png;base64,';
    if (
      !encoded.startsWith(prefix) ||
      encoded.length - prefix.length > Math.ceil(request.maxBytes / 3) * 4
    )
      throw new IngestionError(
        'ocr-limit-exceeded',
        'The rendered PNG exceeds the OCR byte limit.',
      );
    const binary = atob(encoded.slice(prefix.length));
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    if (bytes.length > request.maxBytes)
      throw new IngestionError(
        'ocr-limit-exceeded',
        'The rendered PNG exceeds the OCR byte limit.',
      );
    return {
      encoding: 'png',
      bytes,
      width,
      height,
      dpi: request.dpi,
      rotation: ((viewport.rotation % 360) + 360) % 360,
    };
  } finally {
    request.signal.removeEventListener('abort', cancel);
    if (request.signal.aborted) task?.cancel();
    if (target) factory.destroy({ canvas: target.canvas });
    page.cleanup();
  }
}
