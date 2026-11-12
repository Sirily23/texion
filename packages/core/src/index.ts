export { processDocument } from './process';

export { createController } from './lifecycle/controller';

export type {
  ControllerOptions,
  DocumentController,
} from './lifecycle/controller';

export type {
  DocumentInput,
  ImageInfo,
  TextInput,
  DocumentStatus,
  DocumentSource,
  TexionDocument,
  DocumentPreview,
  DocumentSnapshot,
} from './document/types';

export type { DocumentError, DocumentWarning, ErrorCode } from './errors/codes';

export { IngestionError } from './errors/codes';

export type {
  FormatAdapter,
  TextFormatAdapter,
  BinaryFormatAdapter,
  AdapterInspection,
} from './adapters/contract';

export { createRegistry } from './adapters/registry';

export { markdownAdapter, detectMarkdown } from './adapters/markdown';

export { defaultLimits } from './policy/limits';

export type { Limits } from './policy/limits';

export { safeUrl } from './policy/output';

export type { PreviewNode } from './policy/output';

export { decode } from './ingestion/decode';

export {
  tokenizeMarkdownSource,
  defaultHighlightLimits,
} from './editing/markdown-tokens';

export type {
  HighlightToken,
  HighlightKind,
  HighlightLimits,
} from './editing/markdown-tokens';

export { createHighlightModel } from './editing/highlight-model';

export type {
  HighlightModel,
  HighlightSegment,
  HighlightOptions,
} from './editing/highlight-model';

export type {
  TexionContent,
  TextFormat,
  BuiltinFormat,
  ContentFormat,
} from './content/types';

export { createContent, isTexionContent } from './content/schema';

export {
  serializeContent,
  deserializeContent,
  exportMarkdown,
  exportSource,
} from './content/serialization';

export { inspectMarkdownSource } from './content/markdown-features';

export { jsonAdapter } from './adapters/json';
export { csvAdapter } from './adapters/csv';
export { imageAdapter } from './adapters/image';
export { textAdapter } from './adapters/text';
export { pdfAdapter } from './adapters/pdf';
export { docxAdapter } from './adapters/docx';

export {
  detectTextFormat,
  isTextFormat,
  sourceWarnings,
} from './ingestion/text-format';
export { tokenizeDataSource } from './editing/data-tokens';

export type { TexionMessage, TexionAttachmentReference } from './content/types';
export {
  createMessage,
  createMessageFromDocuments,
  isTexionMessage,
  isAttachmentReference,
  serializeMessage,
  deserializeMessage,
} from './content/message';

export { createPdfAdapter } from './adapters/pdf';
export type { PdfAdapterOptions } from './adapters/pdf';
export type { PdfOcrRenderer, PdfCanvasImport } from './adapters/pdf/render';
export { classifyPdfPage } from './ocr/classifier';
export { recognizePdfPages } from './ocr/orchestrator';
export { createOcrScheduler } from './ocr/scheduler';
export type { OcrScheduler } from './ocr/scheduler';
export type {
  BinaryExtractionResult,
  ExtractionContext,
} from './adapters/contract';
export type {
  DocumentBlock,
  DocumentPage,
  DocumentProgress,
  OcrSummary,
  OcrEngine,
  OcrSession,
  OcrImage,
  OcrPageInput,
  OcrPageResult,
  OcrOptions,
  OcrApproval,
  OcrRenderRequest,
  OcrRenderer,
  OcrOutput,
} from './ocr/contract';
