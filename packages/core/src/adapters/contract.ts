import type {
  DocumentPage,
  DocumentProgress,
  OcrSummary,
} from '../ocr/contract';
import type { DocumentPreview } from '../document/types';
import type { DocumentWarning } from '../errors/codes';
import type { Limits } from '../policy/limits';

export interface AdapterInspection {
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly warnings?: readonly DocumentWarning[];
}
export interface BinaryExtractionResult extends AdapterInspection {
  readonly raw: string;
  readonly pages?: readonly DocumentPage[];
  readonly ocr?: OcrSummary;
}
export interface ExtractionContext {
  readonly document?: { readonly id: string; readonly name: string };
  readonly reportProgress: (progress: DocumentProgress) => void;
}
interface AdapterIdentity {
  readonly format: string;
  readonly extensions: readonly string[];
  readonly mimeTypes: readonly string[];
}
export interface TextFormatAdapter extends AdapterIdentity {
  readonly kind?: 'text';
  readonly detect: (text: string) => boolean;
  readonly metadata?: (text: string) => Readonly<Record<string, unknown>>;
  readonly inspect?: (text: string, limits: Limits) => AdapterInspection;
  readonly parse: (
    text: string,
    limits: Limits,
    metadata?: Readonly<Record<string, unknown>>,
  ) => DocumentPreview;
}
export interface BinaryFormatAdapter extends AdapterIdentity {
  readonly kind: 'binary';
  /** Extract document text during processing; heavy parsers can load on demand. */
  readonly extract?: (
    bytes: Uint8Array,
    limits: Limits,
    signal: AbortSignal,
    context?: ExtractionContext,
  ) => Promise<BinaryExtractionResult>;
  readonly detectBytes: (bytes: Uint8Array) => boolean;
  readonly inspect: (
    bytes: Uint8Array,
    limits: Limits,
    source: { readonly name: string; readonly mime: string },
  ) => AdapterInspection;
  readonly parse: (
    bytes: Uint8Array,
    limits: Limits,
    metadata: Readonly<Record<string, unknown>>,
  ) => DocumentPreview;
}
/** Third-party adapters are trusted code. Preview generation stays synchronous and lazy; binary text extraction can be async. */
export type FormatAdapter = TextFormatAdapter | BinaryFormatAdapter;
