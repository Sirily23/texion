import type { KeyboardEvent } from 'react';

export function shouldSubmit(
  event: KeyboardEvent<HTMLTextAreaElement>,
  composing: boolean,
): boolean {
  return (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !composing &&
    !event.nativeEvent.isComposing &&
    event.nativeEvent.keyCode !== 229
  );
}
