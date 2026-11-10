import { forwardRef } from 'react';
import type { CSSProperties } from 'react';
import type { HighlightKind, HighlightModel } from '@texion/core';

const colors: Record<HighlightKind, string> = {
  property: 'var(--texion-highlight-property, #7e22ce)',
  string: 'var(--texion-highlight-string, #047857)',
  number: 'var(--texion-highlight-number, #b45309)',
  boolean: 'var(--texion-highlight-boolean, #1d4ed8)',
  null: 'var(--texion-highlight-null, #a21caf)',
  punctuation: 'var(--texion-highlight-punctuation, #64748b)',
  heading: 'var(--texion-highlight-heading, #1d4ed8)',
  bold: 'var(--texion-highlight-bold, #7e22ce)',
  italic: 'var(--texion-highlight-italic, #a21caf)',
  code: 'var(--texion-highlight-code, #047857)',
  link: 'var(--texion-highlight-link, #0369a1)',
  strikethrough: 'var(--texion-highlight-strikethrough, #64748b)',
  'list-marker': 'var(--texion-highlight-marker, #b45309)',
  blockquote: 'var(--texion-highlight-quote, #64748b)',
  frontmatter: 'var(--texion-highlight-frontmatter, #64748b)',
  'thematic-break': 'var(--texion-highlight-marker, #b45309)',
};

export const HighlightOverlay = forwardRef<
  HTMLDivElement,
  { readonly model: HighlightModel; readonly style: CSSProperties }
>(function HighlightOverlay({ model, style }, ref) {
  return (
    <div
      ref={ref}
      className="texion-highlight-overlay"
      data-texion-highlight-overlay=""
      style={style}
    >
      {model.segments.map((segment) => (
        <span
          key={segment.start}
          data-highlight-kind={segment.kind}
          style={segment.kind ? { color: colors[segment.kind] } : undefined}
        >
          {model.text.slice(segment.start, segment.end)}
        </span>
      ))}
      {/* A zero-width sentinel gives a trailing newline the same final line as the textarea. */}
      <span data-texion-highlight-sentinel="">{'\u200b'}</span>
    </div>
  );
});
