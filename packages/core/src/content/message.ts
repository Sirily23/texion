import type { TexionDocument } from '../document/types';
import type {
  TexionAttachmentReference,
  TexionContent,
  TexionMessage,
} from './types';
import { createContent, isTexionContent } from './schema';

const nonempty = (value: unknown): value is string =>
  typeof value === 'string' && !!value.trim();

export function isAttachmentReference(
  value: unknown,
): value is TexionAttachmentReference {
  if (!value || typeof value !== 'object') return false;
  const attachment = value as Record<string, unknown>;
  return (
    nonempty(attachment.id) &&
    nonempty(attachment.name) &&
    nonempty(attachment.format) &&
    typeof attachment.size === 'number' &&
    Number.isSafeInteger(attachment.size) &&
    attachment.size >= 0 &&
    nonempty(attachment.reference) &&
    !attachment.reference.trim().toLowerCase().startsWith('blob:') &&
    (attachment.mimeType === undefined ||
      typeof attachment.mimeType === 'string')
  );
}

export function isTexionMessage(value: unknown): value is TexionMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    message.version === 1 &&
    isTexionContent(message.content) &&
    Array.isArray(message.attachments) &&
    message.attachments.every(isAttachmentReference) &&
    new Set(
      message.attachments.map(
        (attachment: TexionAttachmentReference) => attachment.id,
      ),
    ).size === message.attachments.length
  );
}

export function createMessage(
  content: TexionContent,
  options: { readonly attachments?: readonly TexionAttachmentReference[] } = {},
): TexionMessage {
  const attachments = options.attachments ?? [];
  if (!isTexionMessage({ version: 1, content, attachments }))
    throw new TypeError('Invalid Texion message.');
  return Object.freeze({
    version: 1,
    content: createContent(content.source, {
      format: content.format,
      ...(content.originalSource === undefined
        ? {}
        : { originalSource: content.originalSource }),
    }),
    attachments: Object.freeze(
      attachments.map((attachment) =>
        Object.freeze({
          id: attachment.id,
          name: attachment.name,
          format: attachment.format,
          size: attachment.size,
          reference: attachment.reference,
          ...(attachment.mimeType === undefined
            ? {}
            : { mimeType: attachment.mimeType }),
        }),
      ),
    ),
  });
}

/** The callback stores each attachment in the host's storage and returns its stable key. */
export async function createMessageFromDocuments(
  content: TexionContent,
  documents: readonly TexionDocument[],
  referenceFor: (document: TexionDocument) => string | Promise<string>,
): Promise<TexionMessage> {
  // Validate all documents before invoking storage callbacks.
  createMessage(content);
  if (
    documents.some((document) => document.status !== 'ready') ||
    new Set(documents.map((document) => document.id)).size !== documents.length
  ) {
    throw new TypeError('Only ready documents with unique IDs can be saved.');
  }
  const attachments = await Promise.all(
    documents.map(async (document): Promise<TexionAttachmentReference> => {
      const mimeType = document.file?.type || document.blob?.type;
      return {
        id: document.id,
        name: document.name,
        format: document.format,
        size: document.size,
        reference: await referenceFor(document),
        ...(mimeType ? { mimeType } : {}),
      };
    }),
  );
  return createMessage(content, { attachments });
}

export function serializeMessage(message: TexionMessage): string {
  if (!isTexionMessage(message)) throw new TypeError('Invalid Texion message.');
  // Canonical copies deliberately exclude arbitrary extra runtime properties.
  return JSON.stringify(
    createMessage(message.content, { attachments: message.attachments }),
  );
}

export function deserializeMessage(serialized: string): TexionMessage {
  const message: unknown = JSON.parse(serialized);
  if (!isTexionMessage(message)) throw new TypeError('Invalid Texion message.');
  return createMessage(message.content, { attachments: message.attachments });
}
