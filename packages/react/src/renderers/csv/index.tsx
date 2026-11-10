import type { PreviewRendererProps } from '../types';

export function CsvRenderer({ preview }: PreviewRendererProps) {
  const table = preview.nodes.find((node) => node.type === 'csv-table');
  if (!table) {
    return <pre>{preview.nodes.map((node) => node.value ?? '').join('')}</pre>;
  }
  const rows = table.children ?? [];
  const columns = rows.reduce(
    (maximum, row) => Math.max(maximum, row.children?.length ?? 0),
    0,
  );
  return (
    <div
      className="texion-csv-viewer"
      tabIndex={0}
      role="region"
      aria-label="Scrollable CSV table"
    >
      <table>
        <caption>CSV data</caption>
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th scope="col" key={index}>
                Column {index + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.children?.map((cell, column) => (
                <td key={column}>
                  {cell.children?.map((child) => child.value ?? '').join('') ??
                    cell.value ??
                    ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default CsvRenderer;
