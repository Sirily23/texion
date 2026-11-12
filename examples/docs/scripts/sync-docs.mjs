import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Repository Markdown remains the source of truth. Build generated pages locally.
const appRoot = fileURLToPath(new URL('../', import.meta.url));
const source = path.resolve(appRoot, '../../docs');
const target = path.join(appRoot, 'content/docs/guides');
const pages = [
  [
    'ocr',
    'Scanned PDFs and OCR',
    'Opt-in recognition, approval, limits and engine adapters.',
  ],
  [
    'saved-messages',
    'Saved messages',
    'Save, restore, render and reopen portable content.',
  ],
  [
    'getting-started',
    'Getting started',
    'Install Texion and connect your first composer.',
  ],
  [
    'formats',
    'Supported formats',
    'Text, structured data, images, PDF and DOCX.',
  ],
  [
    'source-editing',
    'Source editing',
    'Native text inputs with syntax highlighting.',
  ],
  ['rich-editing', 'Rich editing', 'Editable Markdown and shared content.'],
  ['theming', 'Styling', 'Make Texion fit your interface.'],
  [
    'custom-adapters',
    'Custom adapters',
    'Extend the document pipeline with your own formats.',
  ],
  [
    'security',
    'Security and limits',
    'Understand extraction boundaries and safe previews.',
  ],
];
await mkdir(target, { recursive: true });
for (const [slug, title, description] of pages) {
  let body = await readFile(path.join(source, `${slug}.md`), 'utf8');
  body = body
    .replace(/^# .+\n+/, '')
    .replace(/\]\(([^)\s]+)\.md(#[^)]*)?\)/g, ']($1$2)');
  await writeFile(
    path.join(target, `${slug}.mdx`),
    `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n${body}`,
  );
}
await writeFile(
  path.join(target, 'meta.json'),
  JSON.stringify(
    { title: 'Guides', pages: pages.map(([slug]) => slug) },
    null,
    2,
  ),
);
console.log(`Synced ${pages.length} documentation pages.`);
