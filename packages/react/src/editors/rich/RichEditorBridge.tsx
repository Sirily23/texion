import { useEffect, useRef } from 'react';
import {
  $addUpdateTag,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  HISTORY_PUSH_TAG,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  mergeRegister,
} from 'lexical';
import type { UpdateListener, PasteCommandType } from 'lexical';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  $generateNodesFromMarkdownString,
} from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { DEFAULT_TRANSFORMERS } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { richImportIssue } from './compatibility';
import type { RichMarkdownEditorProps } from './types';

const externalUpdateTag = 'texion:external';

export function RichEditorBridge({
  options,
  reportError,
  reportImportIssue,
}: {
  readonly options: RichMarkdownEditorProps;
  readonly reportError: (message: string) => void;
  readonly reportImportIssue: (message: string | undefined) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const current = useRef(options);
  current.current = options;
  const lastValue = useRef(options.value);
  useEffect(() => {
    const handleUpdate: UpdateListener = ({
      editorState,
      dirtyElements,
      dirtyLeaves,
      tags,
    }) => {
      if (
        tags.has(externalUpdateTag) ||
        (!dirtyElements.size && !dirtyLeaves.size)
      ) {
        return;
      }
      const source = editorState.read(() =>
        $convertToMarkdownString(DEFAULT_TRANSFORMERS),
      );

      if (source === lastValue.current) {
        return;
      }
      lastValue.current = source;
      current.current.onChange(source);
    };
    const handlePaste = (event: PasteCommandType) => {
      if (editor.isComposing()) {
        return false;
      }
      const clipboard = 'clipboardData' in event ? event.clipboardData : null;

      if (!clipboard) {
        return false;
      }
      event.preventDefault();

      if (clipboard.files.length) {
        if (current.current.onFiles) {
          current.current.onFiles(Array.from(clipboard.files));
        } else {
          reportError('Use source mode or the attachment picker for files.');
        }
        return true;
      }

      const text = clipboard.getData('text/plain');

      if (!text) {
        return true;
      }
      if (
        $getRoot().getTextContentSize() + text.length >
        (current.current.maxCharacters ?? 50_000)
      ) {
        reportError(
          'This paste exceeds the rich editor limit. Use source mode to edit it.',
        );

        return true;
      }

      const wasEmpty = $getRoot().getTextContentSize() === 0;
      const issue = richImportIssue(
        text,
        current.current.maxCharacters ?? 50_000,
      );

      if (issue) {
        if (wasEmpty && current.current.onRequestSource) {
          current.current.onImport?.(text);
          current.current.onChange(text);
          current.current.onRequestSource();
        } else {
          reportError(issue + ' Paste it in source mode.');
        }
        return true;
      }

      if (!$isRangeSelection($getSelection())) {
        $getRoot().selectEnd();
      }
      $addUpdateTag(HISTORY_PUSH_TAG);

      if (current.current.live === false) {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          selection.insertRawText(text);
        }
      } else {
        $insertNodes(
          $generateNodesFromMarkdownString(text, DEFAULT_TRANSFORMERS),
        );
      }
      if (wasEmpty) {
        current.current.onImport?.(text);
      }
      reportError('');

      return true;
    };
    const handleEnter = (event: KeyboardEvent | null) => {
      if (
        !event ||
        editor.isComposing() ||
        event.isComposing ||
        event.keyCode === 229 ||
        event.shiftKey ||
        !current.current.onSubmit
      ) {
        return false;
      }
      const submit = current.current.submitOnEnter
        ? !event.altKey && !event.ctrlKey && !event.metaKey
        : (event.ctrlKey || event.metaKey) && !event.altKey;

      if (!submit) {
        return false;
      }
      event.preventDefault();
      current.current.onSubmit();

      return true;
    };

    return mergeRegister(
      editor.registerUpdateListener(handleUpdate),
      editor.registerCommand(PASTE_COMMAND, handlePaste, COMMAND_PRIORITY_HIGH),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        handleEnter,
        COMMAND_PRIORITY_HIGH,
      ),
      () => current.current.onCompositionChange?.(false),
    );
  }, [editor, reportError]);

  useEffect(() => {
    if (options.value === lastValue.current) {
      return;
    }
    const issue = richImportIssue(
      options.value,
      options.maxCharacters ?? 50_000,
    );

    if (issue) {
      reportImportIssue(issue);

      return;
    }

    lastValue.current = options.value;
    editor.update(
      () => $convertFromMarkdownString(options.value, DEFAULT_TRANSFORMERS),
      {
        tag: externalUpdateTag,
      },
    );
  }, [editor, options.value, options.maxCharacters, reportImportIssue]);
  useEffect(() => {
    editor.setEditable(!options.readOnly);
  }, [editor, options.readOnly]);

  return null;
}
