export type TextFormat = 'markdown' | 'json' | 'csv' | 'text';
export type ContentFormat = TextFormat | (string & {});
export type BuiltinFormat = TextFormat | 'image' | 'pdf' | 'docx';

/** Framework-independent, JSON-serializable content exchanged by editors and viewers. */
export interface TexionContent {
  readonly version: 1;
  readonly format: ContentFormat;
  readonly source: string;
  /** Original imported Markdown, when available. Rich edits may normalize source. */
  readonly originalSource?: string;
}

/** Persistable attachment metadata. reference is an opaque key owned by the host. */
export interface TexionAttachmentReference {
  readonly id: string;
  readonly name: string;
  readonly format: string;
  readonly size: number;
  readonly reference: string;
  readonly mimeType?: string;
}

/** A saved message contains no File/Blob objects, functions, or temporary object URLs. */
export interface TexionMessage {
  readonly version: 1;
  readonly content: TexionContent;
  readonly attachments: readonly TexionAttachmentReference[];
}
