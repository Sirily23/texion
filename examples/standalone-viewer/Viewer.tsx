import { DocumentViewer } from '@texion/react';

export function Viewer({ file }: { file: File }) {
  return <DocumentViewer input={file} />;
}
