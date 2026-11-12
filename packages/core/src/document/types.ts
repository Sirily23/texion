import type {
  DocumentPage,
  DocumentProgress,
  OcrSummary,
} from '../ocr/contract';
import type { DocumentError, DocumentWarning } from '../errors/codes';
import type { PreviewNode } from '../policy/output';

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error';

export type DocumentSource = 'file' | 'paste' | 'text';

export interface TextInput {
  readonly text: string;
  readonly name?: string;
  readonly source?: 'paste' | 'text';
  readonly format?: string;
}

export type DocumentInput = string | Blob | TextInput;

export interface ImageInfo {
  readonly mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  readonly width: number;
  readonly height: number;
}

export interface DocumentPreview {
  readonly image?: ImageInfo;
  readonly nodes: readonly PreviewNode[];
  readonly truncated: boolean;
  readonly warnings: readonly DocumentWarning[];
}

export interface TexionDocument {
  readonly id: string;
  readonly name: string;
  readonly format: string;
  readonly source: DocumentSource;
  readonly status: DocumentStatus;
  readonly size: number;
  /** Decoded text source, or extracted PDF/DOCX text. Absent for image attachments. */
  readonly raw?: string;
  readonly pages?: readonly DocumentPage[];
  readonly ocr?: OcrSummary;
  readonly progress?: DocumentProgress;
  readonly file?: File;
  readonly blob?: Blob;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly warnings: readonly DocumentWarning[];
  readonly error?: DocumentError;
  readonly getPreview?: () => DocumentPreview;
}

export interface DocumentSnapshot {
  readonly documents: readonly TexionDocument[];
}
