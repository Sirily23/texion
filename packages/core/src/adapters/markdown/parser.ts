import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';

export interface MarkdownSyntaxNode {
  type: string;
  value?: string;
  lang?: string;
  children?: MarkdownSyntaxNode[];
  url?: string;
  identifier?: string;
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  checked?: boolean | null;
  position?: { start: { offset?: number }; end: { offset?: number } };
}

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter, ['yaml', 'toml']);

export function parseMarkdown(text: string): MarkdownSyntaxNode {
  return parser.parse(text) as MarkdownSyntaxNode;
}
