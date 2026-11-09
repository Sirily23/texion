import type { DocumentError, DocumentWarning } from '../errors/codes';
import type { PreviewNode } from '../policy/output';

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error';

export type DocumentSource = 'file' | 'paste' | 'text';

export interface TextInput {
  readonly text: string;
  readonly name?: string;
  readonly source?: 'paste' | 'text';
}

export type DocumentInput = string | Blob | TextInput;

export interface DocumentPreview {
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
  readonly raw?: string;
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
