import React, { useEffect, useState } from 'react';
import {
  Check,
  Edit3,
  ExternalLink,
  FilePlus,
  FileText,
  Globe,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { CmsDynamicPage, SkillProduct } from '../../../core/types';
import { formatIsoToJalali } from '../../../core/jalali';
import { buildAuthHeaders } from '../../../core/apiClient';
import { VisualComposerCanvas } from '../components/VisualComposerCanvas';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface PagesManagerPanelProps {
  subView: 'list' | 'editor';
  onChangeSubView: (next: 'list' | 'editor') => void;
  products: SkillProduct[];
  accentButtonClass: string;
  onPreviewPageInStorefront?: (page: CmsDynamicPage) => void;
  onPagesChanged?: () => void;
  onNotice: NoticeFn;
}

function createEmptyPageDraft(): CmsDynamicPage {
  return {
    id: '',
    slug: '',
    title: '',
    status: 'published',
    templateType: 'standard',
    summary: '',
    seoTitle: '',
    seoDescription: '',
    canonicalUrl: '',
    ogImage: '/assets/aistudio/logo_8c26749f.webp',
    schemaType: 'WebPage',
    updatedAt: new Date().toISOString(),
    composerRows: [
      {
        id: `row_${Date.now()}`,
        rowTitle: 'ردیف ۱ (سربرگ و معرفی برگه)',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: `w_${Date.now()}_1`,
            widgetType: 'rich_text',
            title: 'عنوان بخش اصلی برگه',
            content: 'محتوای این برگه با صفحه‌ساز بصری چندستونه طراحی شده است.',
            colSpan: 1,
          },
        ],
      },
    ],
  };
}

export const PagesManagerPanel: React.FC<PagesManagerPanelProps> = ({
  subView,
  onChangeSubView,
  products,
  accentButtonClass,
  onPreviewPageInStorefront,
  onPagesChanged,
  onNotice,
}) => {
  const [pages, setPages] = useState<CmsDynamicPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [draft, setDraft] = useState<CmsDynamicPage>(() => createEmptyPageDraft());
  const [saving, setSaving] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/pages');
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        setPages(data.items);
      }
    } catch {
      onNotice('error', 'خطا در دریافت لیست برگه‌های پویا از سرور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPages();
  }, []);

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      onNotice('error', 'عنوان برگه نمی‌تواند خالی باشد.');
      return;
    }
    setSaving(true);
    try {
      const cleanSlug =
        draft.slug.trim().replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-') ||
        `page-${Date.now()}`;
      const res = await fetch('/api/v1/pages', {
        method: 'POST',
        headers: buildAuthHeaders(true),
        body: JSON.stringify({
          ...draft,
          slug: cleanSlug,
          seoTitle: draft.seoTitle || `${draft.title} | آموزشگاه رباتیک فاتحان`,
          seoDescription: draft.seoDescription || draft.summary || draft.title,
          canonicalUrl: draft.canonicalUrl || `/page/${cleanSlug}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'خطا در ذخیره برگه');
      }
      onNotice('success', `برگه «${draft.title}» با چیدمان صفحه‌ساز در دیتابیس ذخیره شد.`);
      await fetchPages();
      onPagesChanged?.();
      onChangeSubView('list');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره برگه');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (page: CmsDynamicPage) => {
    try {
      const res = await fetch(`/api/v1/pages/${encodeURIComponent(page.id)}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(false),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'خطا در حذف برگه');
      }
      onNotice('success', `برگه «${page.title}» حذف شد.`);
      await fetchPages();
      onPagesChanged?.();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در حذف برگه');
    }
  };

  const filteredPages = pages.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (subView === 'editor') {
    return (
      <form
        onSubmit={handleSavePage}
        className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mb-1">
              <FilePlus className="w-4 h-4" />
              <span>ویرایشگر تمام‌صفحه برگه پویا + موتور صفحه‌ساز بصری</span>
            </div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
              {draft.id ? `ویرایش برگه: ${draft.title}` : 'ساخت برگه جدید در سایت'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeSubView('list')}
              className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-extrabold text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              بازگشت به لیست برگه‌ها
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${accentButtonClass}`}
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'در حال ذخیره...' : 'ذخیره برگه و انتشار'}</span>
            </button>
          </div>
        </div>

        {/* Core Page Identity & Routing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1">
              عنوان برگه (فارسی):
            </label>
            <input
              type="text"
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="مثال: درباره ما، خدمات سازمانی، قوانین سایت..."
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1">
              نامک مسیر (Slug URL):
            </label>
            <input
              type="text"
              dir="ltr"
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              placeholder="about-us"
              className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1">
              وضعیت انتشار و قالب:
            </label>
            <div className="flex gap-2">
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as CmsDynamicPage['status'],
                  })
                }
                className="flex-1 px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
              >
                <option value="published">منتشر شده</option>
                <option value="draft">پیش‌نویس</option>
              </select>
              <select
                value={draft.templateType}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    templateType: e.target.value as CmsDynamicPage['templateType'],
                  })
                }
                className="flex-1 px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
              >
                <option value="standard">استاندارد</option>
                <option value="landing">فرود (Landing)</option>
                <option value="contact">تماس با ما</option>
                <option value="faq">سوالات متداول</option>
              </select>
            </div>
          </div>
        </div>

        {/* Visual Drag-and-Drop Page Composer (Muuri.js + 18 Widgets) */}
        <VisualComposerCanvas
          contextMode="page"
          rows={draft.composerRows}
          onChangeRows={(nextRows) =>
            setDraft({ ...draft, composerRows: nextRows })
          }
          products={products}
        />

        {/* Complete Technical SEO & JSON-LD Schema Box */}
        <div className="p-5 rounded-2xl border border-blue-500/25 bg-blue-50/30 dark:bg-blue-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#1D4ED8]" />
              <span>تنظیمات سئو تکنیکال، OpenGraph و داده ساختاریافته (JSON-LD Schema)</span>
            </h3>
            <span className="text-[11px] font-bold text-[#1D4ED8] dir-ltr">
               مسیر: /page/{draft.slug || 'new-page'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                عنوان سئو (Meta Title):
              </label>
              <input
                type="text"
                value={draft.seoTitle}
                onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })}
                placeholder={`${draft.title || 'عنوان برگه'} | آموزشگاه رباتیک فاتحان`}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                آدرس کانونیکال (Canonical URL):
              </label>
              <input
                type="text"
                dir="ltr"
                value={draft.canonicalUrl || `/page/${draft.slug}`}
                onChange={(e) =>
                  setDraft({ ...draft, canonicalUrl: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                نوع اسکیمای گوگل (Schema.org JSON-LD):
              </label>
              <select
                value={draft.schemaType}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    schemaType: e.target.value as CmsDynamicPage['schemaType'],
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
              >
                <option value="WebPage">WebPage (برگه استاندارد وب)</option>
                <option value="AboutPage">AboutPage (درباره ما)</option>
                <option value="ContactPage">ContactPage (تماس با ما)</option>
                <option value="FAQPage">FAQPage (پرسش‌های متداول)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
              توضیحات متا سئو (Meta Description - ۱۶۰ کاراکتر):
            </label>
            <textarea
              rows={2}
              value={draft.seoDescription}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  seoDescription: e.target.value,
                  summary: e.target.value,
                })
              }
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
            />
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mb-1">
            <FileText className="w-4 h-4" />
            <span>بخش ۳: مدیریت برگه‌های پویا (Dynamic Pages & Visual Composer)</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            همه برگه‌های سایت ({pages.length.toLocaleString('fa-IR')} برگه فعال)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            ساخت و مدیریت نامحدود برگه‌های سایت (درباره ما، تماس با ما، قوانین، صفحات فرود) با صفحه‌ساز بصری چندستونه
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDraft(createEmptyPageDraft());
            onChangeSubView('editor');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${accentButtonClass}`}
        >
          <Plus className="w-4 h-4" />
          <span>افزودن برگه جدید با صفحه‌ساز</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در عنوان، اسلاگ یا خلاصه برگه‌ها..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'published', 'draft'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                statusFilter === st
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              {st === 'all'
                ? 'همه برگه‌ها'
                : st === 'published'
                ? 'منتشر شده'
                : 'پیش‌نویس'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-stone-500">
          در حال بارگذاری لیست برگه‌ها از دیتابیس...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 font-extrabold">
              <tr>
                <th className="p-3.5">عنوان برگه</th>
                <th className="p-3.5">مسیر (Slug)</th>
                <th className="p-3.5">قالب و اسکیما</th>
                <th className="p-3.5">ردیف‌های صفحه‌ساز</th>
                <th className="p-3.5">وضعیت</th>
                <th className="p-3.5">آخرین ویرایش (شمسی)</th>
                <th className="p-3.5 text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredPages.map((pg) => (
                <tr
                  key={pg.id}
                  className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40"
                >
                  <td className="p-3.5 font-extrabold text-stone-900 dark:text-white">
                    {pg.title}
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-[#1D4ED8] dark:text-sky-400 dir-ltr text-right">
                    /page/{pg.slug}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-bold text-[11px]">
                      {pg.schemaType}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold">
                    {pg.composerRows.length.toLocaleString('fa-IR')} ردیف (
                    {pg.composerRows
                      .reduce((acc, r) => acc + r.widgets.length, 0)
                      .toLocaleString('fa-IR')}{' '}
                    ویجت)
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        pg.status === 'published'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {pg.status === 'published' ? 'منتشر شده' : 'پیش‌نویس'}
                    </span>
                  </td>
                  <td className="p-3.5 text-stone-500">
                    {formatIsoToJalali(pg.updatedAt, { includeTime: false })}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {onPreviewPageInStorefront && (
                        <button
                          type="button"
                          onClick={() => onPreviewPageInStorefront(pg)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>نمایش زنده</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(pg);
                          onChangeSubView('editor');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-[#1D4ED8] dark:text-sky-300 hover:bg-blue-500/20 font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>صفحه‌ساز</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePage(pg)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                        title="حذف برگه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
