import { useMemo, useRef, useState } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { createHighlightModel, defaultHighlightLimits } from '@texion/core';
import { shouldSubmit } from '../controllers/text';

export interface UseMarkdownInputOptions {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (value: string) => void;
  readonly language?: 'markdown';
  readonly highlight?: boolean;
  readonly maxHighlightCharacters?: number;
  readonly submitOnEnter?: boolean;
  readonly onSubmit?: () => void;
}

export interface TextSelection {
  readonly start: number;
  readonly end: number;
  readonly direction: 'forward' | 'backward' | 'none';
}

// HTML textarea values normalize line endings; token offsets must use that same string.
const nativeValue = (value: string) => value.replace(/\r\n?/g, '\n');

export function useMarkdownInput(options: UseMarkdownInputOptions = {}) {
  const [internalValue, setInternalValue] = useState(
    nativeValue(options.defaultValue ?? ''),
  );
  const value = nativeValue(options.value ?? internalValue);
  const valueRef = useRef(value);
  valueRef.current = value;
  const composing = useRef(false);
  const [isComposing, setComposing] = useState(false);
  const [selection, setSelection] = useState<TextSelection>({
    start: 0,
    end: 0,
    direction: 'none',
  });
  const maxCharacters =
    options.maxHighlightCharacters ?? defaultHighlightLimits.maxCharacters;
  const highlight = options.highlight !== false && !isComposing;
  const highlightModel = useMemo(
    () => createHighlightModel(value, { enabled: highlight, maxCharacters }),
    [value, highlight, maxCharacters],
  );

  function setValue(next: string) {
    next = nativeValue(next);

    if (next === valueRef.current) {
      return;
    }
    valueRef.current = next;

    if (options.value === undefined) {
      setInternalValue(next);
    }
    options.onChange?.(next);
  }

  function readSelection(element: HTMLTextAreaElement) {
    const next = {
      start: element.selectionStart,
      end: element.selectionEnd,
      direction: element.selectionDirection,
    };
    setSelection((previous) =>
      previous.start === next.start &&
      previous.end === next.end &&
      previous.direction === next.direction
        ? previous
        : next,
    );
  }

  function getTextareaProps(
    props: TextareaHTMLAttributes<HTMLTextAreaElement> = {},
  ): TextareaHTMLAttributes<HTMLTextAreaElement> {
    return {
      ...props,
      value,
      onChange(event) {
        props.onChange?.(event);

        if (!event.defaultPrevented) {
          setValue(event.currentTarget.value);
        }
        readSelection(event.currentTarget);
      },
      onSelect(event) {
        props.onSelect?.(event);
        readSelection(event.currentTarget);
      },
      onCompositionStart(event) {
        composing.current = true;
        setComposing(true);
        props.onCompositionStart?.(event);
      },
      onCompositionEnd(event) {
        composing.current = false;
        setComposing(false);

        if (event.currentTarget.value !== valueRef.current) {
          setValue(event.currentTarget.value);
        }
        props.onCompositionEnd?.(event);
      },
      onKeyDown(event) {
        props.onKeyDown?.(event);

        if (
          !event.defaultPrevented &&
          options.onSubmit &&
          options.submitOnEnter &&
          shouldSubmit(event, composing.current)
        ) {
          event.preventDefault();
          options.onSubmit();
        }
      },
    };
  }

  return {
    value,
    setValue,
    selection,
    isComposing,
    isComposingNow: () => composing.current,
    getValue: () => valueRef.current,
    highlightModel,
    getTextareaProps,
  };
}
