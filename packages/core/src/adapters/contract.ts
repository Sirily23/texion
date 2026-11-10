import type { DocumentPreview } from '../document/types';
import type { DocumentWarning } from '../errors/codes';
import type { Limits } from '../policy/limits';

export interface AdapterInspection {
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly warnings?: readonly DocumentWarning[];
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
/** Third-party adapters are trusted code. Parsing stays synchronous and lazy. */
export type FormatAdapter = TextFormatAdapter | BinaryFormatAdapter;
