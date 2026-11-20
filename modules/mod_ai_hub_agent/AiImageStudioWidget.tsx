import React, { useState } from 'react';
import { Copy, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface StudioResponse {
  ok?: boolean;
  error?: string;
  promptEn?: string;
  promptFa?: string;
  negativePrompt?: string;
  generatedImageUrl?: string;
  providerUsed?: string;
  modelUsed?: string;
  note?: string;
}

export const AiImageStudioWidget: React.FC<{
  title: string;
  category?: string;
  onApplyImageUrl?: (url: string, altText?: string) => void;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ title, category, onApplyImageUrl, onNotice }) => {
  const [customTitle, setCustomTitle] = useState(title);
  const [style, setStyle] = useState('minimalist editorial studio product shot');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudioResponse | null>(null);

  const effectiveTitle = title.trim() || customTitle.trim();

  const runStudio = async (generateImage: boolean) => {
    if (!effectiveTitle) {
      onNotice?.('error', 'ابتدا عنوان محصول یا مقاله را وارد کنید.');
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await apiJson<StudioResponse>('/api/v1/modules/ai-hub/image-studio', {
        method: 'POST',
        body: JSON.stringify({
          title: effectiveTitle,
          category: category || 'عمومی',
          style,
          aspectRatio,
          generateImage,
        }),
      });
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در استودیو تصویر هوشمند');
        return;
      }
      setResult(data);
      if (data.generatedImageUrl && onApplyImageUrl) {
        onApplyImageUrl(data.generatedImageUrl, effectiveTitle);
        onNotice?.('success', 'تصویر هوشمند ساخته و روی تصویر شاخص اعمال شد.');
      } else {
        onNotice?.('success', data.note || 'پرامپت حرفه‌ای تصویر با موفقیت تولید شد.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onNotice?.('success', 'پرامپت تصویر در حافظه کپی شد.');
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-extrabold text-stone-900 dark:text-white">
          <Wand2 className="w-4 h-4 text-[#1D4ED8]" />
          <span>استودیو پرامپت و تولید تصویر هوشمند (AI Visual Studio)</span>
        </div>
        <span className="text-[10px] font-bold text-stone-500">اسلات image_visual</span>
      </div>

      {!title.trim() && (
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="موضوع تصویر (مثلاً: دوره جامع برنامه‌نویسی پایتون و هوش مصنوعی)"
          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
        >
          <option value="minimalist editorial studio product shot">
            عکاسی استودیویی مینیمال و مدرن (Editorial)
          </option>
          <option value="3d isometric clean glassmorphism tech illustration">
            تصویرسازی ۳بعدی ایزومتریک فناوری
          </option>
          <option value="warm luxury persian architectural editorial banner">
            بنر مجله‌ای لوکس با نورپردازی سینمایی
          </option>
        </select>
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
        >
          <option value="16:9">کاور عریض (16:9)</option>
          <option value="1:1">مربع محصول (1:1)</option>
          <option value="4:3">کارت استاندارد (4:3)</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void runStudio(false)}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:border-[#1D4ED8] font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
          <span>{loading ? 'در حال طراحی...' : 'تولید پرامپت حرفه‌ای'}</span>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runStudio(true)}
          className="px-3.5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>{loading ? 'در حال ساخت تصویر...' : 'ساخت مستقیم تصویر'}</span>
        </button>
      </div>

      {result && (
        <div className="space-y-2.5 pt-2 border-t border-indigo-200/70 dark:border-indigo-900/60">
          {result.promptFa && (
            <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              <div className="text-[10px] font-extrabold text-stone-500 mb-1">شرح فارسی:</div>
              <p className="text-stone-800 dark:text-stone-200 leading-relaxed">{result.promptFa}</p>
            </div>
          )}
          {result.promptEn && (
            <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-stone-500">
                  پرامپت انگلیسی آماده (Gemini / Flux / Midjourney):
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyPrompt(result.promptEn || '')}
                  className="text-[10px] font-extrabold text-[#1D4ED8] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  کپی
                </button>
              </div>
              <p className="font-mono text-[11px] text-left text-stone-700 dark:text-stone-300" dir="ltr">
                {result.promptEn}
              </p>
            </div>
          )}
          {result.generatedImageUrl && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <img
                src={result.generatedImageUrl}
                alt={effectiveTitle}
                className="w-20 h-14 object-cover rounded-lg border border-stone-200"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                  تصویر با موفقیت تولید شد
                </div>
                {onApplyImageUrl && (
                  <button
                    type="button"
                    onClick={() => onApplyImageUrl(result.generatedImageUrl!, effectiveTitle)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold cursor-pointer"
                  >
                    اعمال روی تصویر شاخص
                  </button>
                )}
              </div>
            </div>
          )}
          {result.note && (
            <div className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300">
              {result.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
