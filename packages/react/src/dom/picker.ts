export const markdownAccept =
  '.md,.markdown,.mdown,.mkd,text/markdown,text/x-markdown';

export function takeFiles(input: HTMLInputElement): File[] {
  const files = Array.from(input.files ?? []);
  input.value = '';
  // Selecting the same file after removal must trigger change again.
  return files;
}
