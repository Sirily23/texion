export interface RichMarkdownEditorProps {
  readonly value: string;
  readonly onChange: (source: string) => void;
  readonly onImport?: (source: string) => void;
  readonly onSubmit?: () => void;
  readonly onCompositionChange?: (composing: boolean) => void;
  readonly onFiles?: (files: readonly File[]) => void;
  readonly onRequestSource?: () => void;
  readonly id?: string;
  readonly label?: string;
  readonly placeholder?: string;
  readonly live?: boolean;
  readonly readOnly?: boolean;
  readonly submitOnEnter?: boolean;
  readonly maxCharacters?: number;
}
