import React, { useState } from 'react';
import {
  Copy,
  Check,
  BookOpen,
  Terminal,
  ShoppingBag,
  Download,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import type { ThemeConfig } from '../../core/types';
import { TARGET_ARCHITECTURE_GUIDE } from '../../data/initialCatalog';

interface TargetGuideAndZipViewProps {
  themeConfig: ThemeConfig;
  accentButtonClass: string;
  accentTextClass: string;
  onDownloadZip?: () => Promise<void>;
}

interface ToolInstallGuide {
  id: string;
  toolName: string;
  badge: string;
  folderPath: string;
  steps: string[];
  commandSnippet: string;
}

const TOOL_INSTALL_GUIDES: ToolInstallGuide[] = [
  {
    id: 'claude',
    toolName: 'Claude Code و Claude Projects',
    badge: 'محبوب‌ترین برای برنامه‌نویسی و تولید محتوا',
    folderPath: '.claude/skills/<skill-name>/SKILL.md',
    steps: [
      'فایل دانلودشده اسکیل (SKILL.md) را از «پیشخوان من» دریافت کنید.',
      'در ریشه پروژه خود یک پوشه با مسیر .claude/skills/<نام-اسکیل>/ بسازید و فایل SKILL.md را داخل آن قرار دهید.',
      'اگر از نسخه وب Claude استفاده می‌کنید، وارد بخش Projects شوید، یک پروژه بسازید و فایل را در قسمت Project Knowledge آپلود کنید.',
      'در چت کلود، موضوع خود را بنویسید تا Claude به صورت خودکار دستورالعمل اسکیل را اجرا کند.',
    ],
    commandSnippet: `mkdir -p .claude/skills/my-skill\ncp ~/Downloads/SKILL.md .claude/skills/my-skill/SKILL.md\n# سپس در Claude Code درخواست خود را بنویسید`,
  },
  {
    id: 'codex',
    toolName: 'OpenAI Codex CLI و ChatGPT',
    badge: 'سازگار با اکستنشن، ترمینال و GPTها',
    folderPath: '.codex/skills/<skill-name>/SKILL.md',
    steps: [
      'پس از دانلود فایل اسکیل از پیشخوان کاربری، آن را در مسیر .codex/skills/<نام-اسکیل>/SKILL.md در پروژه قرار دهید.',
      'برای استفاده در ChatGPT تحت وب، می‌توانید فایل .md را مستقیماً در چت پیوست کنید یا محتوای آن را در بخش Custom Instructions / My GPT جای‌گذاری نمایید.',
      'با شروع پرامپت جدید، از مدل بخواهید دقیقاً بر اساس قوانین فایل اسکیل خروجی را تولید کند.',
    ],
    commandSnippet: `mkdir -p .codex/skills/my-skill\ncp ~/Downloads/SKILL.md .codex/skills/my-skill/SKILL.md\ncodex "طبق قوانین اسکیل نصب‌شده این تسک را انجام بده"`,
  },
  {
    id: 'cursor',
    toolName: 'Cursor، Windsurf و VS Code',
    badge: 'استفاده مستقیم داخل ادیتور کد',
    folderPath: '.cursor/rules/<skill-name>.mdc',
    steps: [
      'فایل اسکیل دانلودشده را در پوشه .cursor/rules/ در پروژه کپی کنید (یا در پوشه docs/skills نگه دارید).',
      'در محیط چت Cursor یا Composer کافی است علامت @ را تایپ کرده و فایل اسکیل را انتخاب کنید.',
      'از این پس هر تغییری در کد یا طراحی بخواهید، دستیار ادیتور دقیقاً با استانداردهای اسکیل کدنویسی می‌کند.',
    ],
    commandSnippet: `mkdir -p .cursor/rules\ncp ~/Downloads/SKILL.md .cursor/rules/skill98-rule.md\n# در چت ادیتور با @skill98-rule.md به آن ارجاع دهید`,
  },
];

export const TargetGuideAndZipView: React.FC<TargetGuideAndZipViewProps> = ({
  themeConfig,
  accentButtonClass,
  accentTextClass,
}) => {
  const [activeToolIdx, setActiveToolIdx] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeTool = TOOL_INSTALL_GUIDES[activeToolIdx] || TOOL_INSTALL_GUIDES[0];

  const handleCopySnippet = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
      <div className="border border-stone-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#131C31] p-6 sm:p-8 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-[#1D4ED8] dark:text-blue-400 text-xs font-extrabold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>آموزش گام‌به‌گام خرید، دانلود، نصب و اجرای اسکیل‌ها</span>
        </div>
        <h1 className="font-heading text-xl sm:text-2xl font-black text-stone-900 dark:text-white leading-tight">
          راهنمای دانلود، خرید و استفاده از اسکیل‌ها در {themeConfig.brandNameFa}
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          در این صفحه دقیقاً یاد می‌گیرید چگونه اسکیل‌های رایگان را به حساب کاربری خود اضافه کنید، پکیج‌های تخصصی را خریداری نمایید، فایل‌های <code className="font-mono">SKILL.md</code> را از پیشخوان دانلود کنید و در ابزارهای هوش مصنوعی خود نصب و اجرا نمایید.
        </p>
      </div>

      <div className="border border-blue-500/30 rounded-2xl bg-gradient-to-l from-[#131C31] via-[#172442] to-[#0F172A] text-white p-6 sm:p-7 space-y-5 shadow-md">
        <div className="space-y-1 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>مسیر سریع از انتخاب تا اجرای اسکیل</span>
          </div>
          <h2 className="font-heading text-base sm:text-lg font-extrabold">
            از انتخاب اسکیل تا دریافت خروجی حرفه‌ای فقط ۳ قدم فاصله دارید
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-extrabold text-amber-300">
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>۱. دریافت رایگان یا خرید پکیج</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              با شماره همراه خود وارد شوید، اسکیل‌های رایگان را با یک کلیک به حساب اضافه کنید یا پکیج دلخواه را از سبد خرید تسویه نمایید.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-extrabold text-emerald-300">
              <Download className="w-4 h-4 shrink-0" />
              <span>۲. دانلود فایل از پیشخوان من</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              در «پیشخوان من» اسکیل یا پکیج خود را انتخاب کنید تا متن کامل دستورالعمل را بخوانید یا فایل استاندارد <code className="font-mono">.md</code> را دانلود نمایید.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-extrabold text-blue-300">
              <Terminal className="w-4 h-4 shrink-0" />
              <span>۳. نصب در ابزار هوش مصنوعی</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              فایل را در پوشه اسکیل‌های Claude، Codex یا Cursor بگذارید یا به دانش پروژه اضافه کنید و بلافاصله اجرا نمایید.
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#1D4ED8] dark:text-blue-400" />
            <h2 className="font-heading text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white">
              مراحل گام‌به‌گام خرید، دانلود و فعال‌سازی اسکیل‌ها
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TARGET_ARCHITECTURE_GUIDE.map((phase) => (
            <div
              key={phase.stepNumber}
              className="border border-stone-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#131C31] p-6 flex flex-col justify-between space-y-5 shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                  <span>{phase.subtitle}</span>
                  <span className={`smooth-nums font-extrabold ${accentTextClass}`}>
                    گام {phase.stepNumber}
                  </span>
                </div>

                <h3 className="font-heading text-base sm:text-lg font-extrabold text-stone-900 dark:text-white leading-snug smooth-nums">
                  {phase.stepNumber}. {phase.title}
                </h3>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                  {phase.summary}
                </p>

                <ul className="space-y-2 pt-2 border-t border-stone-200 dark:border-slate-800 text-xs text-stone-700 dark:text-slate-300">
                  {phase.keyActions.map((act, idx) => (
                    <li key={idx} className="leading-relaxed">
                      • {act}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                <span>نتیجه این مرحله:</span>
                <span className="font-bold text-stone-800 dark:text-slate-200">
                  {phase.deliverableTag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-[#1D4ED8] dark:text-blue-400" />
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white">
                آموزش نصب و استفاده اسکیل در ابزارهای مختلف
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                ابزار مورد استفاده خود را انتخاب کنید تا مسیر پوشه و مراحل نصب را ببینید:
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TOOL_INSTALL_GUIDES.map((tool, idx) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveToolIdx(idx)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeToolIdx === idx
                  ? `${accentButtonClass} shadow-md`
                  : 'border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131C31] text-stone-700 dark:text-slate-200 hover:border-blue-500/40'
              }`}
            >
              {tool.toolName}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 border border-stone-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#131C31] p-6 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-heading text-lg font-extrabold text-stone-900 dark:text-white">
                  {activeTool.toolName}
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                  {activeTool.badge}
                </p>
              </div>
              <code
                dir="ltr"
                className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 font-mono text-[11px] font-bold text-[#1D4ED8] dark:text-blue-400"
              >
                {activeTool.folderPath}
              </code>
            </div>

            <ol className="space-y-3 text-xs sm:text-sm text-stone-700 dark:text-slate-300">
              {activeTool.steps.map((stepText, idx) => (
                <li
                  key={idx}
                  className="p-3.5 rounded-xl bg-stone-50 dark:bg-slate-950/60 border border-stone-200/70 dark:border-slate-800 flex items-start gap-3 leading-relaxed"
                >
                  <span className="w-6 h-6 rounded-full bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center shrink-0 smooth-nums">
                    {(idx + 1).toLocaleString('fa-IR')}
                  </span>
                  <span>{stepText}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-5 border border-slate-800 rounded-2xl bg-[#0F172A] text-slate-100 overflow-hidden shadow-lg flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#131C31]">
              <span className="text-xs font-bold text-amber-400">
                دستور نصب سریع در ترمینال
              </span>
              <button
                type="button"
                onClick={() => handleCopySnippet(activeTool.commandSnippet, activeTool.id)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {copiedId === activeTool.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی دستور</span>
                  </>
                )}
              </button>
            </div>

            <pre
              dir="ltr"
              className="p-5 text-xs font-mono leading-relaxed overflow-x-auto text-slate-200 flex-1"
            >
              <code>{activeTool.commandSnippet}</code>
            </pre>

            <div className="px-5 py-3.5 bg-[#131C31]/80 border-t border-slate-800 text-[11px] text-slate-300 leading-relaxed">
              نکته: اگر با محیط خط فرمان کار نمی‌کنید، کافی است فایل <code className="font-mono text-amber-300">.md</code> دانلودشده را مستقیماً در پنجره چت ابزار هوش مصنوعی خود رها کنید (Drag &amp; Drop).
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
