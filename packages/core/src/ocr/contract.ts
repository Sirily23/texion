import type { OcrScheduler } from './scheduler';
import type { DocumentError, DocumentWarning } from '../errors/codes';

export interface DocumentBlock {
  readonly text: string;
  readonly bbox?: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
  readonly confidence?: number;
  readonly kind?: 'paragraph' | 'line' | 'word' | 'table';
}
export interface DocumentPage {
  readonly pageNumber: number;
  readonly text: string;
  readonly source: string;
  readonly classification: 'native' | 'ocr-candidate';
  readonly confidence?: number;
  readonly nativeText?: string;
  readonly image?: {
    readonly width: number;
    readonly height: number;
    readonly dpi: number;
    readonly rotation?: number;
  };
  readonly blocks?: readonly DocumentBlock[];
  readonly error?: DocumentError;
}
export interface OcrSummary {
  readonly engineId: string;
  readonly state: 'off' | 'denied' | 'done' | 'partial' | 'failed';
  readonly pagesAttempted: number;
  readonly pagesProcessed: number;
  readonly pagesSkipped: number;
  readonly pagesFailed: number;
}
export interface DocumentProgress {
  readonly phase: 'extracting' | 'pending-consent' | 'initializing-ocr' | 'ocr';
  readonly done: number;
  readonly total: number;
  readonly pageNumber?: number;
}
export interface OcrImage {
  readonly rotation?: number;
  readonly encoding: 'png';
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly dpi: number;
}
export interface OcrPageInput extends OcrImage {
  readonly pageNumber: number;
  readonly signal: AbortSignal;
}
export interface OcrPageResult {
  readonly text: string;
  /** Normalized 0..1, only when provided by the engine. */
  readonly confidence?: number;
  readonly blocks?: readonly DocumentBlock[];
}
/** A session belongs to exactly one recognition operation. terminate must release owned work. */
export interface OcrSession {
  initialize?(signal: AbortSignal): Promise<void>;
  recognize(input: OcrPageInput): Promise<OcrPageResult>;
  terminate(): void | Promise<void>;
}
export interface OcrEngine {
  readonly id: string;
  readonly kind: 'local' | 'server' | 'hosted';
  /** Trusted application declaration, not a network sandbox. Non-local engines always require approval. */
  readonly uploadsData: boolean;
  /** Create a cancellable session synchronously; defer model initialization to recognize. */
  createSession(): OcrSession;
}
export interface OcrRenderRequest {
  readonly pageNumber: number;
  readonly dpi: number;
  readonly maxPixels: number;
  readonly maxBytes: number;
  readonly signal: AbortSignal;
}
export type OcrRenderer = (request: OcrRenderRequest) => Promise<OcrImage>;
export interface OcrApproval {
  readonly document?: { readonly id: string; readonly name: string };
  readonly engineId: string;
  readonly uploadsData: boolean;
  readonly pageNumbers: readonly number[];
  readonly signal: AbortSignal;
}
export interface OcrOptions {
  readonly engine: OcrEngine;
  readonly scheduler?: OcrScheduler;
  readonly trigger?: 'auto' | 'ask' | 'off';
  readonly requestApproval?: (
    request: OcrApproval,
  ) => boolean | Promise<boolean>;
  readonly maxPages?: number;
  readonly pageTimeoutMs?: number;
  readonly totalTimeoutMs?: number;
  readonly approvalTimeoutMs?: number;
  readonly concurrency?: number;
  readonly dpi?: number;
  readonly minCharsPerPage?: number;
  readonly maxImagePixels?: number;
  readonly maxImageBytes?: number;
  readonly maxBlocksPerPage?: number;
  readonly onPageError?: 'skip' | 'fail';
}
export interface OcrOutput {
  readonly raw: string;
  readonly pages: readonly DocumentPage[];
  readonly ocr: OcrSummary;
  readonly warnings: readonly DocumentWarning[];
}
