import { abortError } from '../lifecycle/cancellation';

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted)
    throw signal.reason instanceof Error ? signal.reason : abortError();
}
/** Reject promptly even when trusted extension code ignores AbortSignal. Late outcomes are consumed. */
export function abortable<T>(
  work: () => T | Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      throwIfAborted(signal);
    } catch (error) {
      reject(error);
      return;
    }
    const abort = () =>
      reject(signal.reason instanceof Error ? signal.reason : abortError());
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve()
      .then(() => {
        throwIfAborted(signal);
        return work();
      })
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
}
