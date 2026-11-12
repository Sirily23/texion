/** A routing heuristic; short text does not prove that a page is scanned or empty. */
export function classifyPdfPage(
  text: string,
  minCharsPerPage = 1,
): 'native' | 'ocr-candidate' {
  if (!Number.isSafeInteger(minCharsPerPage) || minCharsPerPage < 0)
    throw new RangeError('minCharsPerPage must be a nonnegative safe integer.');
  return text.replace(/\s/g, '').length >= minCharsPerPage
    ? 'native'
    : 'ocr-candidate';
}
