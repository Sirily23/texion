import { useSourceInput } from './useSourceInput';
import type { UseSourceInputOptions } from './useSourceInput';

export type { TextSelection } from './useSourceInput';
export interface UseMarkdownInputOptions extends Omit<
  UseSourceInputOptions,
  'language'
> {
  readonly language?: 'markdown';
}
export function useMarkdownInput(options: UseMarkdownInputOptions = {}) {
  return useSourceInput({ ...options, language: 'markdown' });
}
