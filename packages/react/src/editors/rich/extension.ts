import { defineExtension } from 'lexical';
import { $convertFromMarkdownString } from '@lexical/markdown';
import { HistoryExtension } from '@lexical/history';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode, QuoteNode, RichTextExtension } from '@lexical/rich-text';
import { DEFAULT_TRANSFORMERS } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { richImportIssue } from './compatibility';
import { registerLinkPolicy } from './link-policy';

interface RichExtensionOptions {
  readonly getSource: () => string;
  readonly getLimit: () => number;
  readonly onError: (error: Error) => void;
}

export function createRichExtension(options: RichExtensionOptions) {
  return defineExtension({
    name: '@texion/rich-markdown',
    namespace: 'Texion Markdown',
    dependencies: [RichTextExtension, HistoryExtension],
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      LinkNode,
      HorizontalRuleNode,
    ],
    theme: {
      text: {
        bold: 'texion-rich-bold',
        italic: 'texion-rich-italic',
        code: 'texion-rich-inline-code',
        strikethrough: 'texion-rich-strikethrough',
      },
      code: 'texion-rich-code',
    },
    onError: options.onError,
    $initialEditorState() {
      const source = options.getSource();
      const limit = options.getLimit();
      const exceedsLimit = source.length > limit;
      const isUnsupported = richImportIssue(source, limit);
      const initialSource = exceedsLimit || isUnsupported ? '' : source;

      $convertFromMarkdownString(initialSource, DEFAULT_TRANSFORMERS);
    },
    register: registerLinkPolicy,
  });
}
