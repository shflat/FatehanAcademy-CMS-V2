import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileCode2,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
import { SeoVisibilityControlCard } from '../../src/modules/admin/components/SeoVisibilityControlCard';

interface RedirectRuleRow {
  id: string;
  from_path: string;
  to_path: string;
  redirect_code: number;
  hits_count: number;
  is_404_captured: number;
  note_fa: string;
}

export const Phase6EnterpriseSuitePanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [dkpOrUrl, setDkpOrUrl] = useState('https://www.digikala.com/product/dkp-1492837/');
  const [focusKeyword, setFocusKeyword] = useState('اسکیل هوش مصنوعی و معماری فول‌استک');
  const [customTitle, setCustomTitle] = useState('');
  const [importedResult, setImportedResult] = useState<{
    dkpCode: string;
    rewrittenTitle: string;
    rewrittenExcerpt: string;
    seoScore: number;
    rankMathChecks: { id: string; labelFa: string; passed: boolean; suggestionFa: string }[];
    generatedReviews: { author: string; rating: number; comment: string }[];
  } | null>(null);
  const [redirects, setRedirects] = useState<RedirectRuleRow[]>([]);
  const [fromPath, setFromPath] = useState('/legacy-product');
  const [toPath, setToPath] = useState('/store');
  const [redirectCode, setRedirectCode] = useState(301);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiJson<{ rules?: RedirectRuleRow[] }>('/api/v1/modules/seo-redirects/rules').then(
      ({ ok, data }) => {
        if (ok && data.rules) setRedirects(data.rules);
      }
    );
  }, []);

  const handleRunDigikalaImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { ok, data } = await apiJson<{ imported?: typeof importedResult }>(
        '/api/v1/modules/ai-digikala/import',
        {
          method: 'POST',
          body: JSON.stringify({ dkpOrUrl, focusKeyword, customTitle }),
        }
      );
      if (ok && data.imported) {
        setImportedResult(data.imported);
        onNotice?.(
          'success',
          `محصول ${data.imported.dkpCode} با امتیاز سئو ${data.imported.seoScore}/100 بازنویسی شد.`
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleAddRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{ rules?: RedirectRuleRow[] }>(
      '/api/v1/modules/seo-redirects/rules',
      {
        method: 'POST',
        body: JSON.stringify({ fromPath, toPath, redirectCode }),
      }
    );
    if (ok && data.rules) {
      setRedirects(data.rules);
      setFromPath('/');
      onNotice?.('success', `ریدایرکت ${redirectCode} ثبت شد.`);
    }
  };

  const handleDeleteRedirect = async (id: string) => {
    const { ok, data } = await apiJson<{ rules?: RedirectRuleRow[] }>(
      `/api/v1/modules/seo-redirects/rules/${id}`,
      { method: 'DELETE' }
    );
    if (ok && data.rules) setRedirects(data.rules);
  };

  return (
    <div className="space-y-6">
      <SeoVisibilityControlCard onNotice={onNotice} />

      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-6">
        {/* AI Digikala Importer & RankMath Live Scorer */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1D4ED8]" />
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
                  ایمپورت هوشمند دیجی‌کالا + بازنویسی AI + سئوسنج زنده RankMath (mod_ai_digikala)
                </h3>
                <p className="text-xs text-stone-500">
                  استخراج مشخصات فنی و تصاویر با کد DKP، یونیک‌سازی سئو و تولید خودکار دیدگاه مشتریان
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-[#1D4ED8] inline-flex items-center gap-1"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>/sitemap.xml</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-stone-500/10 text-stone-700 dark:text-stone-300 inline-flex items-center gap-1"
              >
                <span>/robots.txt</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1"
              >
                <span>/llms.txt</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

        <form
          onSubmit={(e) => void handleRunDigikalaImport(e)}
          className="grid grid-cols-1 sm:grid-cols-4 gap-2"
        >
          <input
            type="text"
            dir="ltr"
            value={dkpOrUrl}
            onChange={(e) => setDkpOrUrl(e.target.value)}
            placeholder="https://www.digikala.com/product/dkp-..."
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="عنوان سفارشی محصول (اختیاری)"
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <input
            type="text"
            value={focusKeyword}
            onChange={(e) => setFocusKeyword(e.target.value)}
            placeholder="کلیدواژه کانونی RankMath..."
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer"
          >
            {busy ? 'در حال استخراج و بازنویسی...' : 'استخراج و یونیک‌سازی سئو'}
          </button>
        </form>

        {importedResult && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-stone-900 dark:text-white">
                {importedResult.rewrittenTitle} ({importedResult.dkpCode})
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black">
                امتیاز RankMath: {importedResult.seoScore} / ۱۰۰
              </span>
            </div>
            <p className="text-stone-600 dark:text-stone-300">{importedResult.rewrittenExcerpt}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {importedResult.rankMathChecks.map((chk) => (
                <div key={chk.id} className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      chk.passed ? 'text-emerald-600' : 'text-amber-500'
                    }`}
                  />
                  <span>{chk.labelFa}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 301/302 Redirects & 404 Monitor */}
      <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-stone-800">
        <div className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>جدول ریدایرکت‌های 301/302 و مانیتورینگ خطاهای 404 (mod_seo_redirects)</span>
        </div>

        <form onSubmit={(e) => void handleAddRedirect(e)} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            dir="ltr"
            value={fromPath}
            onChange={(e) => setFromPath(e.target.value)}
            placeholder="/old-url"
            className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <input
            type="text"
            dir="ltr"
            value={toPath}
            onChange={(e) => setToPath(e.target.value)}
            placeholder="/new-url"
            className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <select
            value={redirectCode}
            onChange={(e) => setRedirectCode(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
          >
            <option value={301}>ریدایرکت دائمی ۳۰۱ (انتقال اعتبار سئو)</option>
            <option value={302}>ریدایرکت موقت ۳۰۲</option>
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold cursor-pointer"
          >
            + ثبت قانون ریدایرکت
          </button>
        </form>

        <div className="space-y-1.5">
          {redirects.map((r) => (
            <div
              key={r.id}
              className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2" dir="ltr">
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-[#1D4ED8] font-black">
                  {r.redirect_code}
                </span>
                <span className="font-mono font-bold">{r.from_path}</span>
                <span>→</span>
                <span className="font-mono text-emerald-600">{r.to_path}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-stone-400 smooth-nums">
                  {Number(r.hits_count).toLocaleString('fa-IR')} برخورد
                </span>
                <button
                  type="button"
                  onClick={() => void handleDeleteRedirect(r.id)}
                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
};
