import type { DocumentSnapshot, TexionDocument } from '../document/types';

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }

  return value;
}

export function freezeDocument(document: TexionDocument): TexionDocument {
  // Native File/Blob handles stay intact. Only library-owned state is frozen.
  deepFreeze(document.metadata);
  deepFreeze(document.warnings);
  deepFreeze(document.pages);
  deepFreeze(document.ocr);
  deepFreeze(document.progress);

  if (document.error) {
    Object.freeze(document.error);
  }
  return Object.freeze(document);
}

export function createSnapshot(
  documents: readonly TexionDocument[],
): DocumentSnapshot {
  return Object.freeze({ documents: Object.freeze([...documents]) });
}
