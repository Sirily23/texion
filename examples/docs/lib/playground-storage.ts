import {
  createMessageFromDocuments,
  deserializeMessage,
  serializeMessage,
} from '@texion/core';
import type {
  DocumentInput,
  TextInput,
  TexionAttachmentReference,
  TexionMessage,
} from '@texion/core';
import type { Submission } from '@texion/react';

const messageKey = 'texion.playground.message.v1';
// This is demo host storage, separate from Texion's portable message contract.
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('texion-playground', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function files<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('files', mode);
      const request = run(transaction.objectStore('files'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('File storage was interrupted.'));
    });
  } finally {
    db.close();
  }
}
export function loadPlaygroundMessage(): TexionMessage | undefined {
  const value = localStorage.getItem(messageKey);
  return value ? deserializeMessage(value) : undefined;
}
export async function savePlaygroundSubmission(submission: Submission) {
  const pending: { reference: string; original: Blob | TextInput }[] = [];
  const previous = loadPlaygroundMessage();
  try {
    const message = await createMessageFromDocuments(
      submission.content,
      submission.attachments,
      (document) => {
        const reference = `file:${crypto.randomUUID()}`;
        const original = document.file ??
          document.blob ?? {
            text: document.raw ?? '',
            name: document.name,
            format: document.format,
          };
        pending.push({ reference, original });
        return reference;
      },
    );
    if (pending.length) {
      await files('readwrite', (store) => {
        const requests = pending.map(({ reference, original }) =>
          store.put(original, reference),
        );
        return requests[requests.length - 1]!;
      });
    }
    localStorage.setItem(messageKey, serializeMessage(message));
    // Old files are removed only after the new message has been committed.
    await Promise.allSettled(
      (previous?.attachments ?? []).map((attachment) =>
        files('readwrite', (store) => store.delete(attachment.reference)),
      ),
    );
    return message;
  } catch (error) {
    await Promise.allSettled(
      pending.map(({ reference }) =>
        files('readwrite', (store) => store.delete(reference)),
      ),
    );
    throw error;
  }
}
export async function resolvePlaygroundAttachment(
  attachment: TexionAttachmentReference,
  signal: AbortSignal,
): Promise<DocumentInput | undefined> {
  signal.throwIfAborted();
  const value: unknown = await files('readonly', (store) =>
    store.get(attachment.reference),
  );
  signal.throwIfAborted();
  return value instanceof Blob
    ? new File([value], attachment.name, {
        type: attachment.mimeType || value.type,
      })
    : value &&
        typeof value === 'object' &&
        'text' in value &&
        typeof value.text === 'string'
      ? { text: value.text, name: attachment.name, format: attachment.format }
      : undefined;
}
export async function clearPlaygroundMessage(message: TexionMessage) {
  localStorage.removeItem(messageKey);
  await Promise.all(
    message.attachments.map((attachment) =>
      files('readwrite', (store) => store.delete(attachment.reference)),
    ),
  );
}
