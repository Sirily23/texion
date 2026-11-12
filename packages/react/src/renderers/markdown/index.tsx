import type { PreviewRendererProps } from '../types';
import { Fragment, createElement } from 'react';
import { CodeBlock } from '../../components/CodeBlock';
import type { ReactNode } from 'react';
import { safeUrl } from '@texion/core';
import type { DocumentPreview, PreviewNode } from '@texion/core';

function render(node: PreviewNode, index: number): ReactNode {
  const children = node.children?.map(render);
  switch (node.type) {
    case 'text':
      return node.value ?? '';
    case 'paragraph':
      return <p key={index}>{children}</p>;
    case 'heading':
      return createElement(
        `h${Math.max(1, Math.min(6, node.depth ?? 1))}`,
        { key: index },
        children,
      );
    case 'strong':
      return <strong key={index}>{children}</strong>;
    case 'emphasis':
      return <em key={index}>{children}</em>;
    case 'delete':
      return <del key={index}>{children}</del>;
    case 'blockquote':
      return <blockquote key={index}>{children}</blockquote>;
    case 'code':
      return (
        <CodeBlock
          key={index}
          source={node.value ?? ''}
          {...(node.language ? { language: node.language } : {})}
        />
      );
    case 'inlineCode':
      return <code key={index}>{node.value}</code>;
    case 'break':
      return <br key={index} />;
    case 'thematicBreak':
      return <hr key={index} />;
    case 'list':
      return node.ordered ? (
        <ol key={index} start={node.start}>
          {children}
        </ol>
      ) : (
        <ul key={index}>{children}</ul>
      );
    case 'listItem':
      return (
        <li key={index}>
          {node.checked !== undefined && (
            <input
              aria-label={node.checked ? 'Completed task' : 'Incomplete task'}
              type="checkbox"
              checked={node.checked}
              disabled
            />
          )}
          {children}
        </li>
      );
    case 'link': {
      const url = safeUrl(node.url ?? '');

      return url ? (
        <a key={index} href={url} rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <Fragment key={index}>{children}</Fragment>
      );
    }
    case 'table':
      return (
        <table key={index}>
          <thead>
            <tr>
              {node.children?.[0]?.children?.map((cell, i) => (
                <th key={i} scope="col">
                  {cell.children?.map(render)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{node.children?.slice(1).map(render)}</tbody>
        </table>
      );
    case 'tableRow':
      return (
        <tr key={index}>
          {node.children?.map((cell, i) => (
            <td key={i}>{cell.children?.map(render)}</td>
          ))}
        </tr>
      );
    case 'html':
    case 'image':
      return null;
    default:
      return <Fragment key={index}>{children ?? node.value ?? ''}</Fragment>;
  }
}

export function MarkdownRenderer({ preview }: PreviewRendererProps) {
  return <>{preview.nodes.map(render)}</>;
}

export default MarkdownRenderer;
