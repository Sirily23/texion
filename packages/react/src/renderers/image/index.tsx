import { useState } from 'react';
import type { PreviewRendererProps } from '../types';
import { useObjectUrl } from './useObjectUrl';

export function ImageRenderer({ document, preview }: PreviewRendererProps) {
  const image = preview.image;
  const url = useObjectUrl(image ? document?.blob : undefined, image?.mimeType);
  const [failedUrl, setFailedUrl] = useState<string>();
  if (!image) {
    return <p role="status">Image preview is unavailable.</p>;
  }
  if (!url) {
    return <p role="status">Preparing local image preview…</p>;
  }
  if (failedUrl === url) {
    return (
      <p role="alert">
        This image could not be decoded. The original attachment is retained.
      </p>
    );
  }
  return (
    <figure className="texion-image-viewer">
      <img
        src={url}
        alt={document?.name ?? 'Uploaded image'}
        width={image.width}
        height={image.height}
        decoding="async"
        onError={() => setFailedUrl(url)}
      />
      <figcaption>
        {image.width} × {image.height} · {image.mimeType}
      </figcaption>
    </figure>
  );
}
export default ImageRenderer;
