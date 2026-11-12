import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type {
  ChangeEvent,
  ClipboardEvent,
  HTMLAttributes,
  InputHTMLAttributes,
} from 'react';
import { createController } from '@texion/core';
import type { ControllerOptions, DocumentInput } from '@texion/core';
import { filesFromDrop, isFileDrag } from '../dom/drop';
import { readClipboard } from '../dom/paste';
import { acceptForFormats, takeFiles } from '../dom/picker';
import { defaultPasteThreshold } from './presentation';

export interface AttachmentOptions extends ControllerOptions {
  readonly attachments?: boolean;
  /** Inputs resolved by the host when reopening a saved message. Read on mount. */
  readonly initialAttachments?: readonly DocumentInput[];
  readonly pasteAsAttachment?: boolean;
  readonly pasteAttachmentThreshold?: number;
}

export function useAttachmentController(options: AttachmentOptions) {
  const [controller] = useState(() => createController(options));
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const documents = useMemo(
    () =>
      Object.freeze(
        snapshot.documents.filter((document) => document.id !== 'text'),
      ),
    [snapshot],
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setDragging] = useState(false);
  const [inputError, setInputError] = useState<string>();
  const initialAttachments = useRef([...(options.initialAttachments ?? [])]);
  useEffect(() => {
    initialAttachments.current.forEach(addDocument);
    return () => controller.clear();
  }, [controller]);
  const enabled = options.attachments !== false;

  function addDocument(input: DocumentInput) {
    return controller.add(
      typeof input === 'string'
        ? { text: input, source: 'paste', name: 'Pasted Markdown' }
        : input,
    );
  }

  function getRootProps(
    props: HTMLAttributes<HTMLDivElement> = {},
  ): HTMLAttributes<HTMLDivElement> {
    return {
      ...props,
      'data-dragging': isDragging || undefined,
      onDragEnter(event) {
        props.onDragEnter?.(event);

        if (
          !event.defaultPrevented &&
          enabled &&
          isFileDrag(event.dataTransfer)
        ) {
          event.preventDefault();
          dragDepth.current++;
          setDragging(true);
        }
      },
      onDragOver(event) {
        props.onDragOver?.(event);

        if (
          !event.defaultPrevented &&
          enabled &&
          isFileDrag(event.dataTransfer)
        ) {
          event.preventDefault();
        }
      },
      onDragLeave(event) {
        props.onDragLeave?.(event);

        if (enabled && isFileDrag(event.dataTransfer)) {
          dragDepth.current = Math.max(0, dragDepth.current - 1);

          if (!dragDepth.current) {
            setDragging(false);
          }
        }
      },
      onDrop(event) {
        props.onDrop?.(event);
        dragDepth.current = 0;
        setDragging(false);

        if (
          event.defaultPrevented ||
          !enabled ||
          !isFileDrag(event.dataTransfer)
        ) {
          return;
        }
        event.preventDefault();
        const result = filesFromDrop(event.dataTransfer);
        setInputError(
          result.hasFolders
            ? 'Folders are not supported. Select individual supported files.'
            : undefined,
        );
        result.files.forEach(addDocument);
      },
    } as HTMLAttributes<HTMLDivElement>;
  }

  function getInputProps(props: InputHTMLAttributes<HTMLInputElement> = {}) {
    return {
      ...props,
      ref: inputRef,
      type: 'file' as const,
      multiple: true,
      accept:
        props.accept ??
        acceptForFormats(
          options.acceptedFormats ??
            options.adapters?.map((adapter) => adapter.format),
          options.adapters,
        ),
      disabled: !enabled || props.disabled,
      onChange(event: ChangeEvent<HTMLInputElement>) {
        props.onChange?.(event);
        const files = takeFiles(event.currentTarget);

        if (enabled && !event.defaultPrevented) {
          files.forEach(addDocument);
        }
      },
    };
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (event.defaultPrevented || !enabled) {
      return;
    }
    const clipboard = readClipboard(
      event.clipboardData,
      options.pasteAsAttachment
        ? (options.pasteAttachmentThreshold ?? defaultPasteThreshold)
        : undefined,
    );

    if (clipboard.files.length || clipboard.attachmentText !== undefined) {
      event.preventDefault();
      clipboard.files.forEach(addDocument);

      if (clipboard.attachmentText !== undefined) {
        addDocument(clipboard.attachmentText);
      }
    }
  }

  return {
    controller,
    snapshot,
    documents,
    isDragging,
    inputError,
    addDocument,
    getRootProps,
    getInputProps,
    handlePaste,
    openPicker: () => inputRef.current?.click(),
  };
}
