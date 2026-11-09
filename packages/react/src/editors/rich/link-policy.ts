import { $getNodeByKey, mergeRegister } from 'lexical';
import type { LexicalEditor } from 'lexical';
import { LinkNode } from '@lexical/link';
import { safeUrl } from '@texion/core';

function normalizeLink(node: LinkNode): void {
  const url = safeUrl(node.getURL());

  if (!url) {
    for (const child of node.getChildren()) {
      node.insertBefore(child);
    }

    node.remove();

    return;
  }

  if (node.getURL() !== url) {
    node.setURL(url);
  }

  if (node.getRel() !== 'noopener noreferrer') {
    node.setRel('noopener noreferrer');
  }
}

export function registerLinkPolicy(editor: LexicalEditor): () => void {
  const removeTransform = editor.registerNodeTransform(LinkNode, normalizeLink);
  const removeListener = editor.registerMutationListener(
    LinkNode,
    (mutations) => {
      editor.getEditorState().read(() => {
        for (const [key, change] of mutations) {
          if (change === 'destroyed') {
            continue;
          }

          const node = $getNodeByKey(key);
          const element = editor.getElementByKey(key);

          if (!(node instanceof LinkNode) || !element) {
            continue;
          }

          // Apply core's relative-URL rules instead of Lexical's URL guessing.
          const url = safeUrl(node.getURL());

          if (url) {
            element.setAttribute('href', url);
          } else {
            element.removeAttribute('href');
          }
        }
      });
    },
  );

  return mergeRegister(removeTransform, removeListener);
}
