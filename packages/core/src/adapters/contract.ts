import type { DocumentPreview } from '../document/types';
import type { Limits } from '../policy/limits';

// Adapters are trusted application code. parse must be synchronous and side-effect free.
export interface FormatAdapter {
  readonly format: string;
  readonly extensions: readonly string[];
  readonly mimeTypes: readonly string[];
  readonly detect: (text: string) => boolean;
  readonly metadata?: (text: string) => Readonly<Record<string, unknown>>;
  readonly parse: (text: string, limits: Limits) => DocumentPreview;
}
