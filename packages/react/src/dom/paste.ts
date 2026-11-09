import { detectMarkdown } from '@texion/core';

export function readClipboard(
  clipboard: DataTransfer,
  threshold?: number,
): { files: File[]; attachmentText?: string } {
  const files = Array.from(clipboard.files ?? []);

  if (files.length) {
    return { files };
  }
  if (threshold === undefined) {
    return { files };
  }
  const text = clipboard.getData('text/plain');

  return threshold !== undefined &&
    text.length >= threshold &&
    detectMarkdown(text)
    ? { files, attachmentText: text }
    : { files };
}
