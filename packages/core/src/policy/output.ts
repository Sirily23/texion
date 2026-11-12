export interface PreviewNode {
  readonly type: string;
  readonly value?: string;
  readonly language?: string;
  readonly children?: readonly PreviewNode[];
  readonly url?: string;
  readonly depth?: number;
  readonly ordered?: boolean;
  readonly start?: number;
  readonly checked?: boolean;
}

export function safeUrl(url: string): string | undefined {
  const cleaned = url.trim().replace(/[\u0000-\u0020\u007f-\u009f]/g, '');

  if (!cleaned || cleaned.startsWith('//') || cleaned.includes('\\')) {
    return undefined;
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned)?.[1]?.toLowerCase();

  if (scheme && !['https', 'http', 'mailto', 'tel'].includes(scheme)) {
    return undefined;
  }
  return cleaned;
}
