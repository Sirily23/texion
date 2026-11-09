import type { DocumentInput, DocumentPreview } from '../document/types';
import type { FormatAdapter } from '../adapters/contract';
import type { Limits } from '../policy/limits';
import { isBlob, inputName } from '../policy/duplicates';
import { IngestionError } from '../errors/codes';
import { deepFreeze } from '../lifecycle/snapshot';
import { abortError } from '../lifecycle/cancellation';
import { decode } from './decode';
import { identify } from './identify';
import { validateSize, validateText } from './validate';

export async function runPipeline(
  input: DocumentInput,
  adapters: readonly FormatAdapter[],
  limits: Limits,
  signal: AbortSignal,
) {
  const check = () => {
    if (signal.aborted) {
      throw abortError();
    }
  };
  check();
  const blob = isBlob(input);
  const originalText = blob
    ? undefined
    : typeof input === 'string'
      ? input
      : input.text;
  const size = blob
    ? input.size
    : new TextEncoder().encode(originalText).byteLength;
  validateSize(size, limits);
  const decoded = blob
    ? decode(new Uint8Array(await input.arrayBuffer()))
    : { text: originalText!, warnings: [] };
  check();
  validateText(decoded.text);
  const name = blob
    ? inputName(input)
    : typeof input === 'string'
      ? ''
      : (input.name ?? '');
  const adapter =
    identify(name, blob ? input.type : '', decoded.text, adapters) ??
    // Typed and pasted snippets are explicitly authored text; Markdown accepts ordinary paragraphs.
    (!blob && !name.includes('.')
      ? adapters.find((candidate) => candidate.format === 'markdown')
      : undefined);

  if (!adapter) {
    throw new IngestionError(
      'unsupported',
      'The document format is not supported.',
    );
  }
  let preview: DocumentPreview | undefined;

  return {
    raw: decoded.text,
    size,
    format: adapter.format,
    warnings: decoded.warnings,
    metadata: adapter.metadata?.(decoded.text) ?? {},
    getPreview(): DocumentPreview {
      if (!preview) {
        try {
          preview = deepFreeze(adapter.parse(decoded.text, limits));
        } catch {
          preview = deepFreeze({
            nodes: [
              {
                type: 'text',
                value: decoded.text.slice(0, limits.maxPreviewCharacters),
              },
            ],
            truncated: decoded.text.length > limits.maxPreviewCharacters,
            warnings: [
              {
                code: 'parse-failed',
                message:
                  'Preview parsing failed; original content is still available.',
              },
            ],
          });
        }
      }

      return preview;
    },
  };
}
