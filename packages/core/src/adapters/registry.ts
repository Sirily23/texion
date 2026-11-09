import type { FormatAdapter } from './contract';
import { markdownAdapter } from './markdown';

export function createRegistry(
  adapters: readonly FormatAdapter[] = [markdownAdapter],
  acceptedFormats?: readonly string[],
): readonly FormatAdapter[] {
  const seen = new Set<string>();

  return Object.freeze(
    adapters.filter((adapter) => {
      if (seen.has(adapter.format)) {
        throw new Error(`Duplicate adapter: ${adapter.format}`);
      }
      seen.add(adapter.format);

      return !acceptedFormats || acceptedFormats.includes(adapter.format);
    }),
  );
}
