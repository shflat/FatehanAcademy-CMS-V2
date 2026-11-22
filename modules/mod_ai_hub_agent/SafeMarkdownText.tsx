import React from 'react';

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*\n]+?\*\*|`[^`\n]+?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}_b_${idx++}`} className="font-extrabold text-inherit">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}_c_${idx++}`}
          dir="ltr"
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-[11px] font-mono text-indigo-700 dark:text-sky-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

/**
 * Pure-React (XSS-safe, zero dangerouslySetInnerHTML) Markdown renderer
 * for Command Center & Floating Jarvis chat bubbles.
 * Renders headings (#/##/###), bold (**text**), inline code (`code`),
 * bullet lists, numbered lists, and fenced code blocks cleanly.
 */
export const SafeMarkdownText: React.FC<{ text: string; className?: string }> = ({
  text,
  className = '',
}) => {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];

  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push(
        <pre
          key={`md_${blockKey++}`}
          dir="ltr"
          className="my-1.5 p-2.5 rounded-xl bg-stone-900 text-stone-100 text-[11px] font-mono overflow-x-auto leading-relaxed"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Blank line
    if (!trimmed) {
      i++;
      continue;
    }

    // Headings (#, ##, ###)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const sizeClass =
        level === 1
          ? 'text-sm font-black mt-2 mb-1'
          : level === 2
          ? 'text-[13px] font-extrabold mt-2 mb-1'
          : 'text-xs font-extrabold mt-1.5 mb-0.5 text-indigo-700 dark:text-sky-300';
      blocks.push(
        <div key={`md_${blockKey++}`} className={sizeClass}>
          {renderInlineMarkdown(content, `h_${blockKey}`)}
        </div>
      );
      i++;
      continue;
    }

    // Unordered bullet list (-, *, •)
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`md_${blockKey++}`} className="my-1 pr-4 space-y-1 list-disc">
          {items.map((item, idx) => (
            <li key={`li_${idx}`} className="leading-relaxed">
              {renderInlineMarkdown(item, `ul_${blockKey}_${idx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered numbered list (1. 2. ...)
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`md_${blockKey++}`} className="my-1 pr-4 space-y-1 list-decimal">
          {items.map((item, idx) => (
            <li key={`ol_${idx}`} className="leading-relaxed">
              {renderInlineMarkdown(item, `ol_${blockKey}_${idx}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph line
    blocks.push(
      <p key={`md_${blockKey++}`} className="leading-relaxed my-0.5">
        {renderInlineMarkdown(line, `p_${blockKey}`)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-0.5 break-words ${className}`}>{blocks}</div>;
};
