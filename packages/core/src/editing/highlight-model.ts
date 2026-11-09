import {
  resolveHighlightLimits,
  tokenizeMarkdownSource,
} from './markdown-tokens';
import type {
  HighlightKind,
  HighlightLimits,
  HighlightToken,
} from './markdown-tokens';

export interface HighlightSegment {
  readonly start: number;
  readonly end: number;
  readonly kind?: HighlightKind;
}

export interface HighlightModel {
  readonly text: string;
  readonly enabled: boolean;
  readonly reason?: 'disabled' | 'too-large' | 'too-complex' | 'parse-failed';
  readonly tokens: readonly HighlightToken[];
  readonly segments: readonly HighlightSegment[];
}

export interface HighlightOptions extends HighlightLimits {
  readonly enabled?: boolean;
}

export function createHighlightModel(
  text: string,
  options: HighlightOptions = {},
): HighlightModel {
  const { enabled, ...requestedLimits } = options;
  const limits = resolveHighlightLimits(requestedLimits);

  function plain(
    reason: NonNullable<HighlightModel['reason']>,
  ): HighlightModel {
    return Object.freeze({
      text,
      enabled: false,
      reason,
      tokens: Object.freeze([]),
      segments: Object.freeze(
        text ? [Object.freeze({ start: 0, end: text.length })] : [],
      ),
    });
  }

  if (enabled === false) {
    return plain('disabled');
  }
  if (text.length > limits.maxCharacters) {
    return plain('too-large');
  }
  let result: ReturnType<typeof tokenizeMarkdownSource>;

  try {
    result = tokenizeMarkdownSource(text, limits);
  } catch {
    return plain('parse-failed');
  }

  if (result.limited) {
    return plain('too-complex');
  }
  const { tokens } = result;
  const changes = new Map<number, { add: number[]; remove: number[] }>();

  function boundary(offset: number) {
    let entry = changes.get(offset);

    if (!entry) {
      entry = { add: [], remove: [] };
      changes.set(offset, entry);
    }

    return entry;
  }

  boundary(0);
  boundary(text.length);
  tokens.forEach((token, index) => {
    boundary(token.start).add.push(index);
    boundary(token.end).remove.push(index);
  });
  const offsets = [...changes.keys()].sort((a, b) => a - b);
  const active = new Set<number>();
  const segments: { start: number; end: number; kind?: HighlightKind }[] = [];

  for (let i = 0; i < offsets.length - 1; i++) {
    const start = offsets[i]!;
    const end = offsets[i + 1]!;
    const change = changes.get(start)!;
    change.remove.forEach((index) => active.delete(index));
    change.add.forEach((index) => active.add(index));
    let winner: HighlightToken | undefined;

    for (const index of active) {
      const candidate = tokens[index]!;

      if (
        !winner ||
        candidate.end - candidate.start <= winner.end - winner.start
      ) {
        winner = candidate;
      }
    }

    const previous = segments.at(-1);

    if (previous && previous.kind === winner?.kind) {
      previous.end = end;
    } else {
      segments.push({ start, end, ...(winner ? { kind: winner.kind } : {}) });
    }
  }

  return Object.freeze({
    text,
    enabled: true,
    tokens,
    segments: Object.freeze(segments.map((segment) => Object.freeze(segment))),
  });
}
