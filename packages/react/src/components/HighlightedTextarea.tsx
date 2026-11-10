import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, TextareaHTMLAttributes } from 'react';
import type { HighlightModel, TextFormat } from '@texion/core';
import { useSourceInput } from '../hooks/useSourceInput';
import { HighlightOverlay } from '../rendering/HighlightOverlay';

const useClientLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const mirrorProperties = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'fontStretch',
  'fontKerning',
  'fontFeatureSettings',
  'fontVariationSettings',
  'fontVariantLigatures',
  'lineHeight',
  'letterSpacing',
  'wordSpacing',
  'textAlign',
  'textIndent',
  'textTransform',
  'textRendering',
  'tabSize',
  'direction',
  'unicodeBidi',
  'writingMode',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'color',
  'wordBreak',
  'overflowWrap',
  'lineBreak',
] as const;

interface Layout {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly content: CSSProperties;
}

interface SurfaceProps {
  readonly textareaProps: TextareaHTMLAttributes<HTMLTextAreaElement>;
  readonly model: HighlightModel;
  readonly wrapperClassName?: string | undefined;
}

/** Shared presentation only; both public components use the same native text controller. */
export const HighlightedTextareaSurface = forwardRef<
  HTMLTextAreaElement,
  SurfaceProps
>(function HighlightedTextareaSurface(
  { textareaProps, model, wrapperClassName },
  forwardedRef,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>();
  const [forcedColors, setForcedColors] = useState(false);
  const value = String(textareaProps.value ?? '');
  const requested =
    model.enabled && !!value && model.text === value && !forcedColors;
  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;

    if (textarea && viewportRef.current) {
      viewportRef.current.scrollTop = textarea.scrollTop;
      viewportRef.current.scrollLeft = textarea.scrollLeft;
    }
  }, []);
  const synchronize = useCallback(() => {
    const textarea = textareaRef.current;
    const view = textarea?.ownerDocument.defaultView;

    if (!textarea || !view) {
      return;
    }
    const computed = view.getComputedStyle(textarea);
    const content: CSSProperties = {
      ...Object.fromEntries(
        mirrorProperties.map((property) => [property, computed[property]]),
      ),
      boxSizing: 'border-box',
      margin: 0,
      border: 0,
      width: textarea.clientWidth,
      minHeight: textarea.clientHeight,
      whiteSpace: textarea.wrap === 'off' ? 'pre' : 'pre-wrap',
      WebkitTextFillColor: 'currentColor',
    };
    const next = {
      left: textarea.offsetLeft + textarea.clientLeft,
      top: textarea.offsetTop + textarea.clientTop,
      width: textarea.clientWidth,
      height: textarea.clientHeight,
      content,
    };
    setLayout((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );
    syncScroll();
  }, [syncScroll]);
  useClientLayoutEffect(() => {
    if (requested) {
      synchronize();
    }
  });
  useClientLayoutEffect(() => {
    if (!requested) {
      return;
    }
    const textarea = textareaRef.current;
    const view = textarea?.ownerDocument.defaultView;

    if (!textarea || !view) {
      return;
    }
    let mounted = true;
    const refresh = () => {
      if (mounted) {
        synchronize();
      }
    };
    const resize =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(refresh);
    resize?.observe(textarea);

    if (textarea.parentElement) {
      resize?.observe(textarea.parentElement);
    }
    const mutation = new MutationObserver(refresh);

    for (
      let element: HTMLElement | null = textarea;
      element;
      element = element.parentElement
    ) {
      mutation.observe(element, {
        attributes: true,
        attributeFilter: ['style', 'class', 'dir', 'wrap'],
      });
    }
    view.addEventListener('resize', refresh);
    const fonts = textarea.ownerDocument.fonts;
    void fonts?.ready.then(refresh);
    fonts?.addEventListener('loadingdone', refresh);

    return () => {
      mounted = false;
      resize?.disconnect();
      mutation.disconnect();
      view.removeEventListener('resize', refresh);
      fonts?.removeEventListener('loadingdone', refresh);
    };
  }, [requested, synchronize]);
  useEffect(() => {
    const media = textareaRef.current?.ownerDocument.defaultView?.matchMedia?.(
      '(forced-colors: active)',
    );

    if (!media) {
      return;
    }
    const update = () => setForcedColors(media.matches);
    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, []);
  const active = requested && !!layout;

  return (
    <div
      className={['texion-highlighted-textarea', wrapperClassName]
        .filter(Boolean)
        .join(' ')}
      data-highlighted={active || undefined}
      data-highlight-reason={model.reason}
      style={{ position: 'relative', display: 'grid', minWidth: 0 }}
    >
      <textarea
        {...textareaProps}
        ref={(node) => {
          textareaRef.current = node;

          if (typeof forwardedRef === 'function') {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }}
        style={{
          display: 'block',
          boxSizing: 'border-box',
          minWidth: 0,
          width: '100%',
          ...textareaProps.style,
          ...(active
            ? { WebkitTextFillColor: 'transparent', caretColor: 'currentColor' }
            : {}),
        }}
        onScroll={(event) => {
          syncScroll();
          textareaProps.onScroll?.(event);
        }}
      />
      {active && (
        <div
          ref={viewportRef}
          data-texion-overlay-viewport=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            userSelect: 'none',
            overflow: 'hidden',
            direction: layout.content.direction,
            left: layout.left,
            top: layout.top,
            width: layout.width,
            height: layout.height,
          }}
        >
          <HighlightOverlay model={model} style={layout.content} />
        </div>
      )}
    </div>
  );
});

export interface HighlightedTextareaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'defaultValue' | 'onChange' | 'children'
> {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (value: string) => void;
  readonly language?: TextFormat;
  readonly highlight?: boolean;
  readonly maxHighlightCharacters?: number;
  readonly wrapperClassName?: string;
}

export const HighlightedTextarea = forwardRef<
  HTMLTextAreaElement,
  HighlightedTextareaProps
>(function HighlightedTextarea(
  {
    value,
    defaultValue,
    onChange,
    language = 'markdown',
    highlight = true,
    maxHighlightCharacters,
    wrapperClassName,
    ...props
  },
  ref,
) {
  const input = useSourceInput({
    language,
    highlight,
    ...(value === undefined ? {} : { value }),
    ...(defaultValue === undefined ? {} : { defaultValue }),
    ...(onChange === undefined ? {} : { onChange }),
    ...(maxHighlightCharacters === undefined ? {} : { maxHighlightCharacters }),
  });

  return (
    <>
      <HighlightedTextareaSurface
        ref={ref}
        textareaProps={input.getTextareaProps(props)}
        model={input.highlightModel}
        wrapperClassName={wrapperClassName}
      />
      {input.warnings.map((warning, index) => (
        <p role="status" key={index}>
          {warning.message}
        </p>
      ))}
    </>
  );
});
