import React from 'react';

/**
 * RichFormattedContent
 * Renders structured Persian CMS article content (## headings, ### subheadings,
 * ![alt](url) inline figures, bullet lists, blockquotes, and justified paragraphs).
 */
export const RichFormattedContent: React.FC<{ content: string }> = ({ content }) => {
  const blocks = (content || '').split('\n\n').filter(Boolean);

  return (
    <div className="space-y-4 text-slate-700 leading-8 text-xs sm:text-sm">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-base sm:text-lg font-extrabold text-slate-900 pt-3 pb-1 border-b border-slate-200 flex items-center gap-2"
            >
              <span className="w-2 h-5 rounded-full bg-indigo-600 inline-block shrink-0" />
              <span>{trimmed.replace(/^##\s+/, '')}</span>
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm sm:text-base font-extrabold text-indigo-950 pt-2">
              {trimmed.replace(/^###\s+/, '')}
            </h3>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="p-4 rounded-2xl bg-blue-50/70 border-r-4 border-blue-600 text-slate-800 font-bold text-xs sm:text-sm leading-relaxed"
            >
              {trimmed.replace(/^>\s+/, '')}
            </blockquote>
          );
        }
        const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgMatch) {
          return (
            <figure
              key={idx}
              className="my-4 rounded-2xl overflow-hidden border border-slate-200 bg-slate-950"
            >
              <img
                src={imgMatch[2]}
                alt={imgMatch[1] || 'تصویر داخل متن'}
                referrerPolicy="no-referrer"
                className="w-full max-h-96 object-cover"
              />
              {imgMatch[1] && (
                <figcaption className="px-4 py-2 text-[11px] text-slate-300 bg-slate-900 text-center">
                  {imgMatch[1]}
                </figcaption>
              )}
            </figure>
          );
        }
        if (trimmed.includes('\n- ') || trimmed.startsWith('- ')) {
          const items = trimmed
            .split('\n')
            .map((line) => line.replace(/^-\s*/, '').trim())
            .filter(Boolean);
          return (
            <ul
              key={idx}
              className="list-disc list-inside space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-slate-800 font-medium"
            >
              {items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="leading-8 text-justify">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
};
