export function isFileDrag(transfer: DataTransfer): boolean {
  return Array.from(transfer.types).includes('Files');
}

export function filesFromDrop(transfer: DataTransfer): {
  files: File[];
  hasFolders: boolean;
} {
  const items = Array.from(transfer.items ?? []);
  const hasFolders = items.some(
    (item) => item.webkitGetAsEntry?.()?.isDirectory,
  );
  const files = items.length
    ? items.flatMap((item) => {
        if (item.webkitGetAsEntry?.()?.isDirectory) {
          return [];
        }
        const file = item.getAsFile();

        return file ? [file] : [];
      })
    : Array.from(transfer.files);

  return { files, hasFolders };
}
