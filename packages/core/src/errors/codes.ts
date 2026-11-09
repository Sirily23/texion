export type ErrorCode =
  'unsupported' | 'too-large' | 'too-many' | 'empty' | 'binary' | 'read-failed';

export interface DocumentError {
  readonly code: ErrorCode;
  readonly message: string;
}

export interface DocumentWarning {
  readonly code: 'invalid-utf8' | 'parse-failed' | 'truncated';
  readonly message: string;
}

export class IngestionError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'IngestionError';
  }
}
