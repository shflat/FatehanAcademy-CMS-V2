import React from 'react';
import {
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  Quote,
} from 'lucide-react';

interface RichTextEditorToolbarProps {
  value: string;
  onChange: (next: string) => void;
  onOpenMediaPicker?: () => void;
}

export const RichTextEditorToolbar: React.FC<RichTextEditorToolbarProps> = ({
  value,
  onChange,
  onOpenMediaPicker,
}) => {
  const wordCount = value.trim()
    ? value
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 160));

  const appendSnippet = (snippet: string) => {
    const next = value ? `${value}\n${snippet}` : snippet;
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-t-xl border border-b-0 border-stone-300 dark:border-stone-700 bg-stone-100/90 dark:bg-stone-900 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => appendSnippet('# عنوان اصلی بخش (H1)')}
          title="هدینگ H1"
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => appendSnippet('## زیرعنوان تخصصی (H2)')}
          title="هدینگ H2"
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => appendSnippet('### نکته کلیدی (H3)')}
          title="هدینگ H3"
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>
        <span className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-0.5" />
        <button
          type="button"
          onClick={() => appendSnippet('**متن برجسته و کلیدی**')}
          title="بولد (Bold)"
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => appendSnippet('*متن ایتالیک*')}
          title="ایتالیک (Italic)"
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            appendSnippet('- مورد اول استاندارد\n- مورد دوم معماری\n- مورد سوم اجرایی')
          }
          title="لیست بولت‌دار"
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            appendSnippet('> «معماری ماژولار و کد تمیز، زیربنای مقیاس‌پذیری ۱ میلیون کاربر است.»')
          }
          title="نقل‌قول (Blockquote)"
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => appendSnippet('[مشاهده مخزن اسکیل‌ها](/store)')}
          title="درج لینک داخلی سئو"
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            appendSnippet('```typescript\n// نمونه پرامپت و کد اجرایی اسکیل\nexport const skillReady = true;\n```')
          }
          title="درج بلوک کد"
          className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5" />
        </button>
        {onOpenMediaPicker && (
          <button
            type="button"
            onClick={onOpenMediaPicker}
            title="درج تصویر یا پلیر ویدیو از کتابخانه رسانه"
            className="px-2.5 py-1 rounded-lg bg-[#1D4ED8]/10 text-[#1D4ED8] font-extrabold flex items-center gap-1.5 cursor-pointer hover:bg-[#1D4ED8]/15 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>درج تصویر / ویدیو</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-[11px] font-bold text-stone-500 smooth-nums tabular-nums">
        <AlignRight className="w-3.5 h-3.5 text-stone-400" />
        <span>{wordCount.toLocaleString('fa-IR')} کلمه</span>
        <span>·</span>
        <span>~{readingMinutes.toLocaleString('fa-IR')} دقیقه مطالعه</span>
      </div>
    </div>
  );
};
