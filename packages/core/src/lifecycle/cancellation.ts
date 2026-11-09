export interface Operation {
  readonly generation: number;
  readonly abort: AbortController;
}

let generation = 0;

export function createOperation(): Operation {
  return { generation: ++generation, abort: new AbortController() };
}

export function isCurrent(
  current: Operation | undefined,
  candidate: Operation,
): boolean {
  return (
    current?.generation === candidate.generation &&
    !candidate.abort.signal.aborted
  );
}

export function abortError(): Error {
  const error = new Error('Document processing was cancelled.');
  error.name = 'AbortError';

  return error;
}
