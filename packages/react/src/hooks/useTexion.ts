import { useEffect, useRef, useState } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { createContent, isTextFormat } from '@texion/core';
import type {
  TexionContent,
  TexionDocument,
  TextFormat,
  BuiltinFormat,
} from '@texion/core';
import type { RichMarkdownEditorProps } from '../editors/rich/RichMarkdownEditor';
import { useAttachmentController } from '../controllers/attachments';
import type { AttachmentOptions } from '../controllers/attachments';
import { useSourceInput } from './useSourceInput';

export interface Submission {
  readonly content: TexionContent;
  readonly attachments: readonly TexionDocument[];
  readonly text: string;
  readonly documents: readonly TexionDocument[];
  readonly textDocument?: TexionDocument;
}

export interface UseTexionOptions extends AttachmentOptions {
  readonly defaultValue?: string;
  readonly format?: TextFormat | 'auto';
  readonly formats?: readonly BuiltinFormat[];
  readonly highlight?: boolean;
  readonly maxHighlightCharacters?: number;
  readonly submitOnEnter?: boolean;
  readonly onSubmit?: (submission: Submission) => void | Promise<void>;
}

export function useTexion(options: UseTexionOptions = {}) {
  if (
    options.formats &&
    (!options.formats.length ||
      options.formats.some(
        (format) => !['markdown', 'json', 'csv', 'image'].includes(format),
      ))
  ) {
    throw new RangeError(
      'Choose at least one supported format: markdown, json, csv, or image.',
    );
  }
  const attachments = useAttachmentController(
    options.formats && !options.acceptedFormats
      ? { ...options, acceptedFormats: options.formats }
      : options,
  );
  const { controller, snapshot } = attachments;
  const submitting = useRef(false);
  const richComposing = useRef(false);
  const originalSource = useRef(options.defaultValue);
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const allowedTextFormats = options.formats?.filter(isTextFormat);
  const input = useSourceInput({
    language: options.format ?? 'auto',
    ...(allowedTextFormats ? { allowedFormats: allowedTextFormats } : {}),
    ...(options.defaultValue === undefined
      ? {}
      : { defaultValue: options.defaultValue }),
    highlight: options.highlight ?? false,
    ...(options.maxHighlightCharacters === undefined
      ? {}
      : { maxHighlightCharacters: options.maxHighlightCharacters }),
    onChange: () => controller.remove('text'),
    submitOnEnter: options.submitOnEnter !== false,
    onSubmit: () => {
      void submit();
    },
  });
  useEffect(() => {
    const document = controller
      .getSnapshot()
      .documents.find((candidate) => candidate.id === 'text');
    if (document && document.format !== input.format) {
      controller.remove('text');
    }
  }, [controller, input.format]);
  const textDocument = snapshot.documents.find(
    (document) => document.id === 'text',
  );

  async function submit(): Promise<boolean> {
    if (input.isComposingNow() || richComposing.current || submitting.current) {
      return false;
    }
    const text = input.getValue();
    const format = input.getFormat();

    if (!text.trim() && !attachments.documents.length) {
      return false;
    }
    submitting.current = true;
    setSubmitting(true);
    setSubmitError(undefined);

    try {
      // Editing stays in its editor. Only requested processing enters the document lifecycle.
      controller.setText(text.trim() ? text : '', format);
      const captured = controller.getSnapshot().documents;
      const settled = await Promise.all(
        captured.map((document) => controller.whenSettled(document.id)),
      );
      const current = controller.getSnapshot().documents;

      const textChanged =
        input.getValue() !== text || input.getFormat() !== format;
      const hasUnreadyDocuments = settled.some(
        (document) => !document || document.status !== 'ready',
      );
      const documentsChanged =
        settled.length !== current.length ||
        settled.some((document, index) => document !== current[index]);

      if (textChanged || hasUnreadyDocuments || documentsChanged) {
        return false;
      }

      const primary = current.find((document) => document.id === 'text');
      const documents = Object.freeze(
        current.filter((document) => document.id !== 'text'),
      );
      await options.onSubmit?.({
        text,
        documents,
        attachments: documents,
        content: createContent(
          text,
          originalSource.current === undefined
            ? { format }
            : { format, originalSource: originalSource.current },
        ),
        ...(primary ? { textDocument: primary } : {}),
      });

      return true;
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Submission failed.',
      );

      return false;
    } finally {
      submitting.current = false;
      setSubmitting(false);
    }
  }

  function getTextareaProps(
    props: TextareaHTMLAttributes<HTMLTextAreaElement> = {},
  ) {
    return input.getTextareaProps({
      ...props,
      onPaste(event) {
        props.onPaste?.(event);

        if (!input.isComposingNow()) {
          attachments.handlePaste(event);
        }
      },
    });
  }

  function getRichEditorProps(
    props: Partial<RichMarkdownEditorProps> = {},
  ): RichMarkdownEditorProps {
    if (input.format !== 'markdown') {
      throw new Error('JSON and CSV use source editing, not rich conversion.');
    }
    return {
      formats:
        options.format && options.format !== 'auto'
          ? [options.format]
          : (allowedTextFormats ?? ['markdown', 'json', 'csv']),
      ...props,
      value: input.value,
      onChange(source) {
        props.onChange?.(source);
        input.setValue(source);
      },
      onImport(source) {
        originalSource.current ??= source;
        props.onImport?.(source);
      },
      onCompositionChange(composing) {
        richComposing.current = composing;
        props.onCompositionChange?.(composing);
      },
      onSubmit() {
        props.onSubmit?.();
        void submit();
      },
      submitOnEnter: options.submitOnEnter ?? false,
      ...(options.attachments === false
        ? {}
        : {
            onFiles(files: readonly File[]) {
              files.forEach(attachments.addDocument);
              props.onFiles?.(files);
            },
          }),
    };
  }

  return {
    content: createContent(
      input.value,
      originalSource.current === undefined
        ? { format: input.format }
        : { format: input.format, originalSource: originalSource.current },
    ),
    format: input.format,
    warnings: input.warnings,
    getRichEditorProps,
    text: input.value,
    textDocument,
    selection: input.selection,
    isComposing: input.isComposing,
    highlightModel: input.highlightModel,
    documents: attachments.documents,
    isDragging: attachments.isDragging,
    isSubmitting,
    inputError: attachments.inputError,
    submitError,
    setText: input.setValue,
    addDocument: attachments.addDocument,
    removeDocument: controller.remove,
    cancelDocument: controller.cancel,
    clear() {
      input.setValue('');
      originalSource.current = undefined;
      richComposing.current = false;
      controller.clear();
    },
    submit,
    openPicker: attachments.openPicker,
    getRootProps: attachments.getRootProps,
    getTextareaProps,
    getInputProps: attachments.getInputProps,
  };
}
