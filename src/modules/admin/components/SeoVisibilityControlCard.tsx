import React, { useEffect, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Globe,
  Save,
  Search,
  ShieldAlert,
} from 'lucide-react';
import type { SeoCrawlVisibilityConfig } from '../../../core/types';
import { apiJson } from '../../../core/apiClient';

interface SeoVisibilityControlCardProps {
  onNotice?: (type: 'success' | 'error', text: string) => void;
}

const DEFAULT_VISIBILITY: SeoCrawlVisibilityConfig = {
  allowSearchEngines: false,
  allowAiCrawlers: false,
  customRobotsExtra: '',
  customLlmsIntro: '',
};

export const SeoVisibilityControlCard: React.FC<SeoVisibilityControlCardProps> = ({
  onNotice,
}) => {
  const [config, setConfig] = useState<SeoCrawlVisibilityConfig>(DEFAULT_VISIBILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    let active = true;
    void apiJson<{ ok?: boolean; visibility?: SeoCrawlVisibilityConfig }>(
      '/api/v1/seo/visibility'
    )
      .then(({ ok, data }) => {
        if (active && ok && data.visibility) {
          setConfig(data.visibility);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const syncDocumentRobotsMeta = (allowSearchEngines: boolean) => {
    if (typeof document === 'undefined') return;
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute(
      'content',
      allowSearchEngines ? 'index, follow' : 'noindex, nofollow, noarchive'
    );
  };

  const handleSave = async (nextConfig: SeoCrawlVisibilityConfig) => {
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        visibility?: SeoCrawlVisibilityConfig;
        error?: string;
      }>('/api/v1/modules/seo-redirects/visibility', {
        method: 'PUT',
        body: JSON.stringify({
          allowSearchEngines: nextConfig.allowSearchEngines,
          allowAiCrawlers: nextConfig.allowAiCrawlers,
          customRobotsExtra: nextConfig.customRobotsExtra || '',
          customLlmsIntro: nextConfig.customLlmsIntro || '',
        }),
      });
      if (!ok || !data.visibility) {
        throw new Error(data.error || 'خطا در ذخیره تنظیمات دیده‌شدن سئو');
      }
      setConfig(data.visibility);
      syncDocumentRobotsMeta(data.visibility.allowSearchEngines);
      onNotice?.(
        'success',
        data.visibility.allowSearchEngines
          ? 'تنظیمات سئو ذخیره شد: سایت برای موتورهای جستجو قابل ایندکس است.'
          : 'تنظیمات سئو ذخیره شد: سایت از دید موتورهای جستجو مخفی (noindex) است.'
      );
    } catch (err) {
      onNotice?.(
        'error',
        err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات سئو'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center shrink-0">
            <Globe className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
              تنظیمات نمایش در موتورهای جستجو و هوش‌های مصنوعی (robots.txt & llms.txt)
            </h3>
            <p className="text-xs text-stone-500">
              کنترل دقیق ایندکس گوگل، بینگ، ربات‌های خزنده و دسترسی مستقل مدل‌های هوش مصنوعی (ChatGPT, Claude, Perplexity)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold">
          <a
            href="/robots.txt"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 inline-flex items-center gap-1"
          >
            <span>/robots.txt</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/llms.txt"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-[#1D4ED8] dark:text-sky-400 hover:bg-blue-500/20 inline-flex items-center gap-1"
          >
            <span>/llms.txt</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 inline-flex items-center gap-1"
          >
            <span>/sitemap.xml</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-stone-400 py-3">در حال بارگذاری وضعیت سئو و ربات‌ها...</div>
      ) : (
        <div className="space-y-4">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              config.allowSearchEngines
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300'
                : 'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-300'
            }`}
          >
            {config.allowSearchEngines ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <EyeOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            )}
            <div className="leading-relaxed">
              {config.allowSearchEngines ? (
                <>
                  <strong>ایندکس موتورهای جستجو فعال است:</strong> فایل <code className="font-mono">robots.txt</code> و متاتگ صفحه به گوگل و بینگ اجازه خزش می‌دهند.
                </>
              ) : (
                <>
                  <strong>حالت مخفی از موتورهای جستجو فعال است (پیش‌فرض امن):</strong> تا زمانی که تیک زیر را فعال نکنید، ربات‌های گوگل و بینگ از طریق <code className="font-mono">Disallow: /</code> و متاتگ <code className="font-mono">noindex, nofollow</code> از ثبت صفحات سایت منع می‌شوند.
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Toggle 1: Search Engines */}
            <label
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                config.allowSearchEngines
                  ? 'border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/50'
              }`}
            >
              <input
                type="checkbox"
                checked={config.allowSearchEngines}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    allowSearchEngines: e.target.checked,
                  }))
                }
                className="mt-1 w-4.5 h-4.5 rounded accent-emerald-600 cursor-pointer shrink-0"
              />
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-[#1D4ED8]" />
                  <span>اجازه دیده‌شدن سایت توسط موتورهای جستجو (Google / Bing)</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  در حالت غیرفعال (پیش‌فرض)، کل سایت با <span className="font-mono">Disallow: /</span> و <span className="font-mono">noindex</span> از دید ربات‌های جستجو مخفی می‌ماند. با فعال‌کردن این تیک، سایت برای گوگل و نقشه سایت باز می‌شود.
                </p>
              </div>
            </label>

            {/* Toggle 2: AI & LLM Crawlers */}
            <label
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                config.allowAiCrawlers
                  ? 'border-[#1D4ED8]/60 bg-blue-50/40 dark:bg-blue-950/20'
                  : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/50'
              }`}
            >
              <input
                type="checkbox"
                checked={config.allowAiCrawlers}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    allowAiCrawlers: e.target.checked,
                  }))
                }
                className="mt-1 w-4.5 h-4.5 rounded accent-[#1D4ED8] cursor-pointer shrink-0"
              />
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-[#1D4ED8]" />
                  <span>اجازه دیده‌شدن توسط هوش‌های مصنوعی (GEO & llms.txt)</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  تنظیم مستقل دسترسی برای <span className="font-mono">GPTBot</span>، <span className="font-mono">ClaudeBot</span>، <span className="font-mono">PerplexityBot</span> و <span className="font-mono">Google-Extended</span> به همراه انتشار خودکار نقشه محتوا در <span className="font-mono">/llms.txt</span>.
                </p>
              </div>
            </label>
          </div>

          {/* Optional Advanced Rules */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-[11px] font-extrabold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              {showAdvanced
                ? 'بستن تنظیمات پیشرفته robots.txt و معرفی llms.txt ▲'
                : 'تنظیمات پیشرفته قوانین robots.txt و متن معرفی llms.txt ▼'}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    متن معرفی برند در فایل /llms.txt (برای پاسخ‌های ChatGPT و Claude):
                  </label>
                  <textarea
                    rows={3}
                    value={config.customLlmsIntro || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, customLlmsIntro: e.target.value }))
                    }
                    placeholder="مثال: اسکیل ۹۸ مرجع تخصصی اسکیل‌های استاندارد Claude، ChatGPT و Codex..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    قوانین سفارشی اضافی در انتهای /robots.txt:
                  </label>
                  <textarea
                    rows={3}
                    dir="ltr"
                    value={config.customRobotsExtra || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, customRobotsExtra: e.target.value }))
                    }
                    placeholder="Disallow: /private-drafts/"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-stone-400" />
              <span>
                وضعیت فعلی: موتورهای جستجو{' '}
                <strong className={config.allowSearchEngines ? 'text-emerald-600' : 'text-amber-600'}>
                  {config.allowSearchEngines ? 'باز (Index)' : 'بسته (Noindex)'}
                </strong>{' '}
                · ربات‌های هوش مصنوعی{' '}
                <strong className={config.allowAiCrawlers ? 'text-[#1D4ED8]' : 'text-stone-500'}>
                  {config.allowAiCrawlers ? 'باز (llms.txt فعال)' : 'بسته (مسدود)'}
                </strong>
              </span>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave(config)}
              className="px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات موتورهای جستجو و AI'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
