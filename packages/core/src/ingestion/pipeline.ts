import type { DocumentInput, DocumentPreview } from '../document/types';
import type { BinaryFormatAdapter, FormatAdapter } from '../adapters/contract';
import type { Limits } from '../policy/limits';
import { isBlob, inputName } from '../policy/duplicates';
import { IngestionError } from '../errors/codes';
import { deepFreeze } from '../lifecycle/snapshot';
import { abortError } from '../lifecycle/cancellation';
import { decode } from './decode';
import { identify, identifyDeclared } from './identify';
import { validateSize, validateText } from './validate';

function binaryResult(
  adapter: BinaryFormatAdapter,
  bytes: Uint8Array,
  limits: Limits,
  source: { name: string; mime: string },
) {
  const inspection = adapter.inspect(bytes, limits, source);
  const metadata = inspection.metadata ?? {};
  let preview: DocumentPreview | undefined;
  return {
    size: bytes.byteLength,
    format: adapter.format,
    metadata,
    warnings: inspection.warnings ?? [],
    getPreview(): DocumentPreview {
      if (!preview) {
        try {
          preview = deepFreeze(adapter.parse(bytes, limits, metadata));
        } catch {
          preview = deepFreeze({
            nodes: [],
            truncated: false,
            warnings: [
              {
                code: 'parse-failed',
                message:
                  'Binary preview failed; the original attachment is still available.',
              },
            ],
          });
        }
      }
      return preview;
    },
  };
}
export async function runPipeline(
  input: DocumentInput,
  adapters: readonly FormatAdapter[],
  limits: Limits,
  signal: AbortSignal,
) {
  const checkCancelled = () => {
    if (signal.aborted) {
      throw abortError();
    }
  };
  checkCancelled();
  let text: string;
  let size: number;
  let warnings: ReturnType<typeof decode>['warnings'] = [];
  let name = '';
  let mime = '';
  let requestedFormat: string | undefined;

  if (isBlob(input)) {
    size = input.size;
    validateSize(size, limits);
    const bytes = new Uint8Array(await input.arrayBuffer());
    checkCancelled();
    name = inputName(input);
    mime = input.type;
    let declared = identifyDeclared(name, mime, adapters);
    const genericMime =
      !mime || mime === 'application/octet-stream' || mime === 'text/plain';
    if (!declared && !name.includes('.') && genericMime) {
      declared = adapters.find(
        (adapter) => adapter.kind === 'binary' && adapter.detectBytes(bytes),
      );
    }
    if (declared?.kind === 'binary') {
      return binaryResult(declared, bytes, limits, { name, mime });
    }
    const decoded = decode(bytes);
    text = decoded.text;
    warnings = decoded.warnings;
  } else {
    text = typeof input === 'string' ? input : input.text;
    size = new TextEncoder().encode(text).byteLength;
    validateSize(size, limits);
    if (typeof input !== 'string') {
      name = input.name ?? '';
      requestedFormat = input.format;
    }
  }
  validateText(text);
  const textAdapters = adapters.filter((adapter) => adapter.kind !== 'binary');
  let adapter = requestedFormat
    ? textAdapters.find((candidate) => candidate.format === requestedFormat)
    : identify(name, mime, text, textAdapters);
  if (!adapter && !isBlob(input) && !requestedFormat && !name.includes('.')) {
    adapter = textAdapters.find((candidate) => candidate.format === 'markdown');
  }
  if (!adapter || adapter.kind === 'binary') {
    throw new IngestionError(
      'unsupported',
      'The document format is not supported.',
    );
  }
  const inspection = adapter.inspect?.(text, limits);
  const metadata = inspection?.metadata ?? adapter.metadata?.(text) ?? {};
  let preview: DocumentPreview | undefined;
  return {
    raw: text,
    size,
    format: adapter.format,
    warnings: [...warnings, ...(inspection?.warnings ?? [])],
    metadata,
    getPreview(): DocumentPreview {
      if (!preview) {
        try {
          preview = deepFreeze(adapter.parse(text, limits, metadata));
        } catch {
          preview = deepFreeze({
            nodes: [
              {
                type: 'code',
                value: text.slice(0, limits.maxPreviewCharacters),
              },
            ],
            truncated: text.length > limits.maxPreviewCharacters,
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
