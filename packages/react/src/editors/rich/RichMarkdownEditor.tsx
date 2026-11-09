import { useEffect, useMemo, useRef, useState } from 'react';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import {
  DEFAULT_TRANSFORMERS,
  MarkdownShortcutPlugin,
} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { safeUrl } from '@texion/core';
import { richImportIssue } from './compatibility';
import { createRichExtension } from './extension';
import { RichEditorBridge } from './RichEditorBridge';
import type { RichMarkdownEditorProps } from './types';

export type { RichMarkdownEditorProps } from './types';

const validateUrl = (url: string) => safeUrl(url) !== undefined;

export function RichMarkdownEditor(props: RichMarkdownEditorProps) {
  const [error, setError] = useState('');
  const [importIssue, setImportIssue] = useState(() =>
    richImportIssue(props.value, props.maxCharacters ?? 50_000),
  );
  useEffect(() => {
    if (importIssue) {
      setImportIssue(
        richImportIssue(props.value, props.maxCharacters ?? 50_000),
      );
    }
  }, [props.value, props.maxCharacters, importIssue]);
  const initialValue = useRef(props.value);
  initialValue.current = props.value;
  const currentLimit = useRef(props.maxCharacters ?? 50_000);
  currentLimit.current = props.maxCharacters ?? 50_000;
  const maxCharacters = props.maxCharacters ?? 50_000;

  if (!Number.isSafeInteger(maxCharacters) || maxCharacters < 1) {
    throw new RangeError('maxCharacters must be a positive safe integer');
  }
  const extension = useMemo(
    () =>
      createRichExtension({
        getSource: () => initialValue.current,
        getLimit: () => currentLimit.current,
        onError: (error) => setError(error.message),
      }),
    [],
  );

  if (props.value.length > maxCharacters || importIssue) {
    return (
      <div>
        <p role="status">
          {importIssue ??
            'This content exceeds the rich editor limit. Use source mode to edit the complete source.'}
        </p>
        {props.onRequestSource && (
          <button type="button" onClick={props.onRequestSource}>
            Edit source
          </button>
        )}
      </div>
    );
  }
  const placeholder = props.placeholder ?? 'Write something…';

  return (
    <div className="texion-rich-editor">
      <LexicalExtensionComposer extension={extension} contentEditable={null}>
        <ContentEditable
          id={props.id}
          role="textbox"
          aria-label={props.label ?? 'Message'}
          aria-multiline="true"
          aria-placeholder={placeholder}
          placeholder={
            <span className="texion-rich-placeholder">{placeholder}</span>
          }
          className="texion-rich-content"
          onCompositionStart={() => props.onCompositionChange?.(true)}
          onCompositionEnd={() => props.onCompositionChange?.(false)}
        />
        <RichEditorBridge
          options={props}
          reportError={setError}
          reportImportIssue={setImportIssue}
        />
        <ListPlugin />
        <LinkPlugin validateUrl={validateUrl} />
        {props.live !== false && (
          <MarkdownShortcutPlugin transformers={DEFAULT_TRANSFORMERS} />
        )}
      </LexicalExtensionComposer>
      {error && <p role="alert">{error}</p>}
      {error && props.onRequestSource && (
        <button type="button" onClick={props.onRequestSource}>
          Edit source
        </button>
      )}
    </div>
  );
}

export default RichMarkdownEditor;
