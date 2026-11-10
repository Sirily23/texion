import { useEffect, useState } from 'react';

export function useObjectUrl(
  blob?: Blob,
  mimeType?: string,
): string | undefined {
  const [current, setCurrent] = useState<{ blob: Blob; url: string }>();
  useEffect(() => {
    if (!blob || typeof URL.createObjectURL !== 'function') {
      return;
    }
    const typed =
      mimeType && blob.type !== mimeType
        ? blob.slice(0, blob.size, mimeType)
        : blob;
    const url = URL.createObjectURL(typed);
    setCurrent({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob, mimeType]);
  return current?.blob === blob ? current?.url : undefined;
}
