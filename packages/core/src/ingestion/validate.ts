import { IngestionError } from '../errors/codes';
import type { Limits } from '../policy/limits';

export function validateSize(size: number, limits: Limits): void {
  if (size > limits.maxFileSize) {
    throw new IngestionError(
      'too-large',
      `Maximum document size is ${limits.maxFileSize} bytes.`,
    );
  }
  if (size === 0) {
    throw new IngestionError('empty', 'The document is empty.');
  }
}

export function validateText(text: string): void {
  if (!text.trim()) {
    throw new IngestionError('empty', 'The document is empty.');
  }
  // UTF-16 is decoded before this check, so its zero bytes are not mistaken for binary.
  let controls = 0;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    if (code === 0) {
      throw new IngestionError('binary', 'Binary documents are not supported.');
    }
    if (code < 32 && code !== 9 && code !== 10 && code !== 13 && code !== 12) {
      controls++;
    }
  }

  if (controls / text.length > 0.01) {
    throw new IngestionError('binary', 'Binary documents are not supported.');
  }
}
