import type { FormatAdapter } from '../adapters/contract';

export function identifyDeclared(
  name: string,
  mime: string,
  adapters: readonly FormatAdapter[],
): FormatAdapter | undefined {
  const extension = name.includes('.')
    ? name.split('.').at(-1)!.toLowerCase()
    : '';
  if (extension) {
    return adapters.find((adapter) => adapter.extensions.includes(extension));
  }
  const normalizedMime = mime.split(';')[0]!.trim().toLowerCase();
  return adapters.find((adapter) => adapter.mimeTypes.includes(normalizedMime));
}
export function identify(
  name: string,
  mime: string,
  text: string,
  adapters: readonly FormatAdapter[],
): FormatAdapter | undefined {
  const declared = identifyDeclared(name, mime, adapters);
  if (declared || name.includes('.')) {
    return declared;
  }
  const normalizedMime = mime.split(';')[0]!.trim().toLowerCase();
  if (
    normalizedMime &&
    normalizedMime !== 'text/plain' &&
    normalizedMime !== 'application/octet-stream'
  ) {
    return undefined;
  }
  return adapters.find(
    (adapter) => adapter.kind !== 'binary' && adapter.detect(text),
  );
}
