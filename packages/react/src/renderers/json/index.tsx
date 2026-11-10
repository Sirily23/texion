import type { PreviewNode } from '@texion/core';
import type { PreviewRendererProps } from '../types';

function JsonValue({
  node,
  depth = 0,
}: {
  readonly node: PreviewNode;
  readonly depth?: number;
}) {
  const children = node.children ?? [];
  if (node.type === 'code' || node.type === 'text') {
    return (
      <pre>
        <code>{node.value}</code>
      </pre>
    );
  }
  if (node.type === 'json-object') {
    return (
      <details open={depth < 2} className="texion-json-branch">
        <summary>
          Object ({children.length}{' '}
          {children.length === 1 ? 'property' : 'properties'})
        </summary>
        <dl>
          {children.map((property, index) => (
            <div key={index}>
              <dt>
                <code>{property.value}</code>
              </dt>
              <dd>
                {property.children?.[0] ? (
                  <JsonValue node={property.children[0]} depth={depth + 1} />
                ) : (
                  '…'
                )}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    );
  }
  if (node.type === 'json-array') {
    return (
      <details open={depth < 2} className="texion-json-branch">
        <summary>Array ({children.length} items)</summary>
        <ol start={0}>
          {children.map((child, index) => (
            <li key={index}>
              <JsonValue node={child} depth={depth + 1} />
            </li>
          ))}
        </ol>
      </details>
    );
  }
  return <code className={`texion-${node.type}`}>{node.value}</code>;
}
export function JsonRenderer({ preview }: PreviewRendererProps) {
  return (
    <div className="texion-json-viewer">
      {preview.nodes.map((node, index) => (
        <JsonValue node={node} key={index} />
      ))}
    </div>
  );
}
export default JsonRenderer;
