export { processDocument } from './process';

export { createController } from './lifecycle/controller';

export type {
  ControllerOptions,
  DocumentController,
} from './lifecycle/controller';

export type {
  DocumentInput,
  TextInput,
  DocumentStatus,
  DocumentSource,
  TexionDocument,
  DocumentPreview,
  DocumentSnapshot,
} from './document/types';

export type { DocumentError, DocumentWarning, ErrorCode } from './errors/codes';

export { IngestionError } from './errors/codes';

export type { FormatAdapter } from './adapters/contract';

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

export type { TexionContent } from './content/types';

export { createContent, isTexionContent } from './content/schema';

export {
  serializeContent,
  deserializeContent,
  exportMarkdown,
} from './content/serialization';

export { inspectMarkdownSource } from './content/markdown-features';
