'use client';
import { useState } from 'react';
import { DocumentViewer, HighlightedTextarea } from '@texion/react';
import type { TextFormat } from '@texion/core';
import { ArrowDown, FileCode2, Eye } from 'lucide-react';

const samples: Record<string, { format: TextFormat; source: string }> = {
  Markdown: {
    format: 'markdown',
    source:
      '# A little more than text\n\nMake your ideas **clear**.\n\n- Write naturally\n- Keep the original source\n- Preview as you go',
  },
  JSON: {
    format: 'json',
    source:
      '{\n  "project": "Texion",\n  "files": ["notes.md", "report.pdf"],\n  "ready": true\n}',
  },
  CSV: {
    format: 'csv',
    source: 'Format,Use\nMarkdown,Writing\nPDF,Documents\nCSV,Data',
  },
};
export function QuickDemo() {
  const [active, setActive] = useState('Markdown');
  const [source, setSource] = useState(samples.Markdown.source);
  const format = samples[active].format;
  return (
    <div className="quick-demo">
      <div className="demo-toolbar">
        <span className="demo-live">
          <i /> Live example
        </span>
        <div role="group" aria-label="Example format">
          {Object.keys(samples).map((name) => (
            <button
              type="button"
              key={name}
              aria-pressed={active === name}
              onClick={() => {
                setActive(name);
                setSource(samples[name].source);
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="demo-source">
        <span className="panel-caption">
          <FileCode2 size={13} /> Your input
        </span>
        <HighlightedTextarea
          aria-label="Try the source editor"
          language={format}
          value={source}
          onChange={setSource}
          rows={7}
          spellCheck={false}
        />
      </div>
      <div className="demo-divider">
        <span>
          <ArrowDown size={12} /> Same content. Ready to render.
        </span>
      </div>
      <div className="demo-output">
        <span className="panel-caption">
          <Eye size={13} /> Preview
        </span>
        {source.trim() ? (
          <DocumentViewer format={format} content={source} />
        ) : (
          <p className="empty-state">Start typing above to see your preview.</p>
        )}
      </div>
      <div className="demo-bottom">
        <span>Powered by Texion</span>
        <span>Editable source · Safe previews</span>
      </div>
    </div>
  );
}
