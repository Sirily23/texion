'use client';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { installCommands as commands } from '@/lib/install-commands';

export function InstallCommand({
  highlightedCommands,
}: {
  highlightedCommands?: Readonly<Record<string, ReactNode>>;
} = {}) {
  const [manager, setManager] = useState<keyof typeof commands>('npm');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(commands[manager]);
      setCopied(true);
      setError(false);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(true);
    }
  }
  return (
    <div className="install-command">
      <div className="install-top">
        <Terminal size={14} aria-hidden="true" />
        <div role="group" aria-label="Package manager">
          {Object.keys(commands).map((key) => (
            <button
              type="button"
              key={key}
              aria-pressed={manager === key}
              onClick={() => {
                setManager(key as keyof typeof commands);
                setCopied(false);
                setError(false);
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <div className="install-line">
        {highlightedCommands?.[manager] ?? (
          <pre>
            <code>{commands[manager]}</code>
          </pre>
        )}
        <button type="button" onClick={copy} aria-label="Copy install command">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <span className="sr-only" role="status">
        {copied
          ? 'Copied install command'
          : error
            ? 'Could not copy. Select and copy the command manually.'
            : ''}
      </span>
    </div>
  );
}
