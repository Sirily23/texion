import type { FormatAdapter } from '../adapters/contract';

export function identify(
  name: string,
  mime: string,
  text: string,
  adapters: readonly FormatAdapter[],
): FormatAdapter | undefined {
  const extension = name.includes('.')
    ? name.split('.').at(-1)!.toLowerCase()
    : '';

  // An explicit unknown extension must not be disguised by a Markdown MIME type.
  if (extension) {
    return adapters.find((adapter) => adapter.extensions.includes(extension));
  }
  const normalizedMime = mime.split(';')[0]!.trim().toLowerCase();
  const byMime = adapters.find((adapter) =>
    adapter.mimeTypes.includes(normalizedMime),
  );

  if (byMime) {
    return byMime;
  }
  if (
    normalizedMime &&
    normalizedMime !== 'text/plain' &&
    normalizedMime !== 'application/octet-stream'
  ) {
    return undefined;
  }
  return adapters.find((adapter) => adapter.detect(text));
}
