export type TextFormat = 'markdown' | 'json' | 'csv';
export type BuiltinFormat = TextFormat | 'image';

/** Framework-independent, JSON-serializable content exchanged by editors and viewers. */
export interface TexionContent {
  readonly version: 1;
  readonly format: TextFormat;
  readonly source: string;
  /** Original imported Markdown, when available. Rich edits may normalize source. */
  readonly originalSource?: string;
}
