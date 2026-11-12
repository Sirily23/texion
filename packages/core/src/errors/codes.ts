export type OcrErrorCode =
  | 'ocr-unavailable'
  | 'ocr-consent-denied'
  | 'ocr-timeout'
  | 'ocr-limit-exceeded'
  | 'ocr-page-failed';

export type ErrorCode =
  | 'unsupported'
  | 'too-large'
  | 'too-many'
  | 'empty'
  | 'binary'
  | 'read-failed'
  | 'invalid-image'
  | 'invalid-document'
  | OcrErrorCode;

export interface DocumentError {
  readonly code: ErrorCode;
  readonly message: string;
}

export interface DocumentWarning {
  readonly code:
    | 'no-text'
    | 'invalid-utf8'
    | 'parse-failed'
    | 'truncated'
    | 'invalid-json'
    | 'invalid-csv'
    | 'too-complex'
    | OcrErrorCode;
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
