import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { inspectCodeBlock } from '@texion/core';
import { highlightColors } from '../rendering/HighlightOverlay';

export interface CodeBlockProps {
  readonly source: string;
  readonly language?: string;
}

export function CodeBlock({ source, language = 'text' }: CodeBlockProps) {
  const id = useId();
  const [expanded, setExpanded] = useState(true);
  const [copyStatus, setCopyStatus] = useState('');
  const inspection = useMemo(
    () => inspectCodeBlock(source, language),
    [source, language],
  );
  const segments: ReactNode[] = [];
  let offset = 0;
  for (const token of inspection.tokens) {
    if (token.start > offset) segments.push(source.slice(offset, token.start));
    segments.push(
      <span
        key={token.start}
        data-highlight-kind={token.kind}
        style={{ color: highlightColors[token.kind] }}
      >
        {source.slice(token.start, token.end)}
      </span>,
    );
    offset = token.end;
  }
  if (offset < source.length) segments.push(source.slice(offset));
  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Could not copy. Select and copy the code manually.');
    }
  }
  return (
    <div
      className="texion-code-block"
      role="group"
      aria-label={`${language} code block`}
    >
      <div className="texion-code-toolbar">
        <span>{language}</span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${language} code`}
        >
          Copy
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Collapse code' : 'Expand code'}
        </button>
      </div>
      <pre id={id} hidden={!expanded}>
        <code data-language={language}>{segments}</code>
      </pre>
      {inspection.warnings.map((warning, index) => (
        <p role="status" key={index}>
          {language} block: {warning.message}
        </p>
      ))}
      {inspection.limited && (
        <p role="status">
          Code highlighting is paused for this block; the source is preserved.
        </p>
      )}
      {copyStatus && <p role="status">{copyStatus}</p>}
    </div>
  );
}
