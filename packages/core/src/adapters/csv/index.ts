import Papa from 'papaparse';
import type { TextFormatAdapter } from '../contract';
import type { DocumentWarning } from '../../errors/codes';
import type { PreviewNode } from '../../policy/output';

function readCsv(source: string, delimiter?: string, preview = 0) {
  const parsed = Papa.parse<string[]>(source, {
    ...(delimiter ? { delimiter } : {}),
    preview,
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
    download: false,
    worker: false,
  });
  if (
    /\r?\n$/.test(source) &&
    parsed.data.at(-1)?.length === 1 &&
    parsed.data.at(-1)?.[0] === ''
  ) {
    parsed.data.pop();
  }
  return parsed;
}
function csvWarnings(parsed: ReturnType<typeof readCsv>): DocumentWarning[] {
  const warnings: DocumentWarning[] = parsed.errors
    .filter((error) => error.code !== 'UndetectableDelimiter')
    .slice(0, 3)
    .map((error) => ({
      code: 'invalid-csv',
      message: `CSV row ${(error.row ?? 0) + 1}: ${error.message}`,
    }));
  const columns = parsed.data[0]?.length ?? 0;
  const mismatch = parsed.data.findIndex((row) => row.length !== columns);
  if (mismatch >= 0) {
    warnings.push({
      code: 'invalid-csv',
      message: `CSV row ${mismatch + 1} has a different field count. Cells are preserved as text.`,
    });
  }
  return warnings;
}
export const csvAdapter: TextFormatAdapter = {
  format: 'csv',
  extensions: ['csv'],
  mimeTypes: ['text/csv', 'application/csv'],
  detect(source) {
    if (!/[\n\r]/.test(source) || !/[,;\t|]/.test(source)) {
      return false;
    }
    const parsed = readCsv(source.slice(0, 8192), undefined, 4);
    const rows = parsed.data.filter((row) => row.some((cell) => cell !== ''));
    return (
      rows.length >= 2 &&
      (rows[0]?.length ?? 0) > 1 &&
      rows.every((row) => row.length === rows[0]!.length) &&
      !csvWarnings(parsed).length
    );
  },
  inspect(source) {
    const parsed = readCsv(source);
    return {
      metadata: {
        delimiter: parsed.meta.delimiter,
        rowCount: parsed.data.length,
        columnCount: parsed.data[0]?.length ?? 0,
      },
      warnings: csvWarnings(parsed),
    };
  },
  parse(source, limits, metadata) {
    if (limits.maxPreviewDepth < 3) {
      return {
        nodes: [
          { type: 'code', value: source.slice(0, limits.maxPreviewCharacters) },
        ],
        truncated: true,
        warnings: [
          {
            code: 'truncated',
            message:
              'The CSV table exceeds the configured preview depth. Showing source instead.',
          },
        ],
      };
    }
    const truncatedSource = source.length > limits.maxPreviewCharacters;
    const prefix = source.slice(0, limits.maxPreviewCharacters);
    const delimiter =
      typeof metadata?.delimiter === 'string' ? metadata.delimiter : undefined;
    const parsed = readCsv(prefix, delimiter);
    let remaining = limits.maxPreviewNodes - 1;
    let truncated = truncatedSource;
    const rows: PreviewNode[] = [];
    for (const row of parsed.data) {
      if (remaining <= 0) {
        truncated = true;
        break;
      }
      remaining--;
      const cells: PreviewNode[] = [];
      for (const value of row) {
        if (remaining < 2) {
          truncated = true;
          break;
        }
        remaining -= 2;
        cells.push({ type: 'tableCell', children: [{ type: 'text', value }] });
      }
      rows.push({ type: 'tableRow', children: cells });
      if (truncated && remaining <= 0) {
        break;
      }
    }
    const warnings = truncated
      ? ([
          {
            code: 'truncated',
            message:
              'CSV preview truncated. Original rows and source are preserved.',
          },
        ] as DocumentWarning[])
      : csvWarnings(parsed);
    return {
      nodes: [{ type: 'csv-table', children: rows }],
      truncated,
      warnings,
    };
  },
};
