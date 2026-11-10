import type { DocumentInput } from '../document/types';

const blobIds = new WeakMap<Blob, number>();

let nextBlobId = 0;

export function isBlob(input: DocumentInput): input is Blob {
  return typeof input === 'object' && 'arrayBuffer' in input;
}

export function inputName(input: DocumentInput): string {
  if (isBlob(input)) {
    return 'name' in input && typeof input.name === 'string'
      ? input.name
      : 'attachment';
  }
  return typeof input === 'string' ? 'Text' : (input.name ?? 'Text');
}

export function duplicateKey(input: DocumentInput): string {
  if (isBlob(input) && !('name' in input)) {
    if (!blobIds.has(input)) {
      blobIds.set(input, ++nextBlobId);
    }
    return `blob:${blobIds.get(input)}`;
  }

  if (isBlob(input)) {
    return JSON.stringify([
      'file',
      inputName(input),
      input.size,
      input.type,
      'lastModified' in input ? input.lastModified : null,
    ]);
  }
  return JSON.stringify([
    typeof input === 'string' ? 'text' : (input.source ?? 'text'),
    inputName(input),
    typeof input === 'string' ? input : input.text,
    typeof input === 'string' ? null : (input.format ?? null),
  ]);
}
