export const markdownAccept =
  '.md,.markdown,.mdown,.mkd,text/markdown,text/x-markdown';
const accepted: Readonly<Record<string, string>> = {
  markdown: markdownAccept,
  json: '.json,application/json,text/json',
  csv: '.csv,text/csv,application/csv',
  image: '.png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp',
};
export function acceptForFormats(
  formats: readonly string[] = Object.keys(accepted),
): string {
  return formats.flatMap((format) => accepted[format] ?? []).join(',');
}
export function takeFiles(input: HTMLInputElement): File[] {
  const files = Array.from(input.files ?? []);
  input.value = '';
  return files;
}
