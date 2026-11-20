import React from 'react';

export interface BiDiTextProps {
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4';
}

/**
 * BiDiText (Bi-Directional / RTL Safe Text Renderer)
 * Automatically isolates parenthesized expressions and technical English/code segments
 * inside <bdi dir="ltr" className="bidi-safe"> so RTL Persian paragraphs never invert.
 */
export const BiDiText: React.FC<BiDiTextProps> = ({
  children,
  className = '',
  as: Tag = 'span',
}) => {
  if (typeof children !== 'string') {
    return <Tag className={`bidi-container ${className}`}>{children}</Tag>;
  }

  const pattern = /(\([^)]*[A-Za-z0-9_./+-]+[^)]*\)|[A-Za-z0-9_./+-]+(?:\s+[A-Za-z0-9_./+-]+)*)/g;
  const parts = children.split(pattern);

  return (
    <Tag className={`bidi-container ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;
        const isLatinOrParen =
          /^\([^)]*[A-Za-z0-9_./+-]+[^)]*\)$/.test(part) ||
          /^[A-Za-z0-9_./+-]+(?:\s+[A-Za-z0-9_./+-]+)*$/.test(part);

        if (isLatinOrParen) {
          return (
            <bdi key={index} dir="ltr" className="bidi-safe">
              {part}
            </bdi>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </Tag>
  );
};
