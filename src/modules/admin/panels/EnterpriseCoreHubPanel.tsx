import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Database,
  FilePlus,
  FileText,
  Layers,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  MediaAssetItem,
  OrderRecord,
  SkillArticle,
  SkillProduct,
  ThemeConfig,
} from '../../../core/types';
import {
  formatIsoToJalali,
  jalaliStringToIsoUtc,
  toPersianDigits,
} from '../../../core/jalali';
import {
  IRAN_PROVINCES_AND_CITIES,
  getCitiesByProvince,
  isValidIranMobile,
  isValidIranNationalId,
  isValidIranPostalCode,
} from '../../../core/iran-geo';

export type EnterpriseHubMode =
  | 'dashboard'
  | 'pages_list'
  | 'pages_editor'
  | 'general_calendar'
  | 'modules_manager'
  | 'taxonomies'
  | 'inventory'
  | 'forms_chat'
  | 'booking'
  | 'menu_builder'
  | 'invoice_designer'
  | 'redirects_seo';

interface StaticCmsPageItem {
  id: string;
  title: string;
  slug: string;
  template: 'landing' | 'content' | 'contact';
  status: 'published' | 'draft';
  updatedAtIso: string;
  summary: string;
}

const INITIAL_CMS_PAGES: StaticCmsPageItem[] = [
  {
    id: 'page-home',
    title: 'برگه نخست (ویترین اصلی آموزشگاه رباتیک فاتحان)',
    slug: '/',
    template: 'landing',
    status: 'published',
    updatedAtIso: new Date().toISOString(),
    summary: 'چیدمان هیرو، ۵ دپارتمان تخصصی، دوره‌ها، کیت‌های رباتیک و مجله علمی فاتحان',
  },
  {
    id: 'page-about',
    title: 'درباره آموزشگاه تخصصی رباتیک فاتحان',
    slug: '/about',
    template: 'content',
    status: 'published',
    updatedAtIso: new Date().toISOString(),
    summary: 'معرفی کارگاه‌های ۵ دپارتمان، گواهینامه‌های معتبر و رویکرد پروژه محور',
  },
  {
    id: 'page-terms',
    title: 'قوانین آموزشی، ثبت‌نام و خرید کیت‌های رباتیک',
    slug: '/terms',
    template: 'content',
    status: 'published',
    updatedAtIso: new Date().toISOString(),
    summary: 'شرایط ثبت‌نام دوره‌ها، اقساط شهریه و گارانتی سلامت قطعات کیت‌ها',
  },
];

interface EnterpriseCoreHubPanelProps {
  mode: EnterpriseHubMode;
  products: SkillProduct[];
  articles: SkillArticle[];
  orders: OrderRecord[];
  mediaItems: MediaAssetItem[];
  themeConfig: ThemeConfig;
  accentButtonClass: string;
  onNavigateSection: (sec: string) => void;
  onNotice: (type: 'success' | 'error', text: string) => void;
}

export const EnterpriseCoreHubPanel: React.FC<EnterpriseCoreHubPanelProps> = ({
  mode,
  products,
  articles,
  orders,
  mediaItems,
  themeConfig,
  accentButtonClass,
  onNavigateSection,
  onNotice,
}) => {
  const [cmsPages, setCmsPages] = useState<StaticCmsPageItem[]>(INITIAL_CMS_PAGES);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageSummary, setPageSummary] = useState('');
  const [pageTemplate, setPageTemplate] =
    useState<StaticCmsPageItem['template']>('content');

  // Dual-Calendar & Iran Geo interactive state
  const [selectedProvinceId, setSelectedProvinceId] = useState('tehran');
  const [selectedCity, setSelectedCity] = useState('تهران');
  const [jalaliInput, setJalaliInput] = useState('1404/01/15');
  const [testNationalId, setTestNationalId] = useState('0013542419');
  const [testPostalCode, setTestPostalCode] = useState('1435894111');
  const [testMobile, setTestMobile] = useState('09123456789');

  const cities = getCitiesByProvince(selectedProvinceId);
  const totalRevenue = orders
    .filter((o) => o.status === 'paid' || o.status === 'completed')
    .reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  if (mode === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div>
              <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                <span>هسته مرکزی Enterprise CMS نسخه v2.0.0 (استودیوی مدیریت پیشرفته)</span>
              </div>
              <h2 className="text-lg font-extrabold text-stone-900 dark:text-white mt-0.5">
                پیشخوان، آمار بازدید، کش LRU و سلامت دیتابیس دوگانه
              </h2>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>تقویم امروز: {formatIsoToJalali(new Date().toISOString(), { includeTime: true })}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950 space-y-1">
              <div className="text-xs text-stone-500 flex items-center justify-between">
                <span>کل محصولات فعال</span>
                <Package className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <div className="text-2xl font-extrabold text-stone-900 dark:text-white smooth-nums">
                {products.length.toLocaleString('fa-IR')}
              </div>
              <div className="text-[11px] text-emerald-600 font-bold">
                گرید {(themeConfig.productGridColumns || 3).toLocaleString('fa-IR')} ستونه Muuri
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950 space-y-1">
              <div className="text-xs text-stone-500 flex items-center justify-between">
                <span>نوشته‌ها و برگه‌ها</span>
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-stone-900 dark:text-white smooth-nums">
                {(articles.length + cmsPages.length).toLocaleString('fa-IR')}
              </div>
              <div className="text-[11px] text-stone-500">
                {articles.length.toLocaleString('fa-IR')} نوشته · {cmsPages.length.toLocaleString('fa-IR')} برگه
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950 space-y-1">
              <div className="text-xs text-stone-500 flex items-center justify-between">
                <span>فروش تاییدشده شاپرک</span>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-stone-900 dark:text-white smooth-nums">
                {totalRevenue.toLocaleString('fa-IR')} تومان
              </div>
              <div className="text-[11px] text-stone-500">
                از {orders.length.toLocaleString('fa-IR')} سفارش ثبت‌شده
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950 space-y-1">
              <div className="text-xs text-stone-500 flex items-center justify-between">
                <span>کش LRU و ایندکس SQL</span>
                <Database className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <div className="text-xl font-extrabold text-emerald-600 smooth-nums">
                ۱۰ ایندکس فعال
              </div>
              <div className="text-[11px] text-stone-500">
                SQLite WAL + PostgreSQL Pool
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateSection('super_theme')}
              className="p-3.5 rounded-xl border border-[#1D4ED8]/35 bg-blue-50/40 dark:bg-blue-950/20 hover:border-[#1D4ED8] text-right transition-colors cursor-pointer"
            >
              <div className="text-xs font-extrabold text-[#1D4ED8] dark:text-sky-300">
                تغییر لوگوی سایت، فاوآیکون و پوسته
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                آپلود مستقیم لوگو، آیکون تب مرورگر و رنگ‌بندی برند
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('editor')}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#1D4ED8] text-right transition-colors cursor-pointer"
            >
              <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                + افزودن محصول جدید در ویرایشگر مجزا
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                بدون شلوغی جدول محصولات همراه با سئوی هوشمند
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('pages_editor')}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#1D4ED8] text-right transition-colors cursor-pointer"
            >
              <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                + ساخت برگه مستقل جدید
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                مدیریت برگه‌های ثابت و چیدمان اختصاصی
              </div>
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('general_calendar')}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#1D4ED8] text-right transition-colors cursor-pointer"
            >
              <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                تقویم دوگانه شمسی و استان/شهر ایران
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                تبدیل خودکار Jalali به ISO-8601 و اعتبارسنج کد ملی
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'pages_list') {
    return (
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
              همه برگه‌های سایت ({cmsPages.length.toLocaleString('fa-IR')})
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              نمای فهرست اختصاصی برگه‌ها؛ فرم ساخت و ویرایش برگه در صفحه مجزا قرار دارد.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateSection('page_builder')}
              className="px-3.5 py-2 text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl cursor-pointer"
            >
              صفحه‌ساز صفحه اصلی
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPageId(null);
                setPageTitle('');
                setPageSlug('');
                setPageSummary('');
                onNavigateSection('pages_editor');
              }}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
            >
              + افزودن برگه جدید
            </button>
          </div>
        </div>
        <div className="divide-y divide-stone-200 dark:divide-stone-800">
          {cmsPages.map((pg) => (
            <div
              key={pg.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                    {pg.title}
                  </span>
                  <span
                    dir="ltr"
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                  >
                    {pg.slug}
                  </span>
                </div>
                <div className="text-xs text-stone-500">{pg.summary}</div>
                <div className="text-[11px] text-stone-400">
                  آخرین بروزرسانی (شمسی): {formatIsoToJalali(pg.updatedAtIso, { includeTime: true })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPageId(pg.id);
                    setPageTitle(pg.title);
                    setPageSlug(pg.slug);
                    setPageSummary(pg.summary);
                    setPageTemplate(pg.template);
                    onNavigateSection('pages_editor');
                  }}
                  className="px-3 py-1.5 text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl cursor-pointer"
                >
                  ویرایش برگه
                </button>
                {pg.id !== 'page-home' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCmsPages((prev) => prev.filter((x) => x.id !== pg.id));
                      onNotice('success', 'برگه حذف شد.');
                    }}
                    className="p-1.5 text-rose-600 border border-rose-500/30 rounded-xl hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'pages_editor') {
    const handleSavePage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!pageTitle.trim()) {
        onNotice('error', 'عنوان برگه الزامی است.');
        return;
      }
      const nextItem: StaticCmsPageItem = {
        id: editingPageId || `page-${Date.now()}`,
        title: pageTitle.trim(),
        slug: pageSlug.trim() || `/page-${Date.now().toString(36)}`,
        template: pageTemplate,
        status: 'published',
        updatedAtIso: new Date().toISOString(),
        summary: pageSummary.trim() || pageTitle.trim(),
      };
      setCmsPages((prev) => {
        const exists = prev.some((p) => p.id === nextItem.id);
        return exists
          ? prev.map((p) => (p.id === nextItem.id ? nextItem : p))
          : [nextItem, ...prev];
      });
      onNotice('success', 'برگه با تاریخ استاندارد UTC و نمایش شمسی ذخیره شد.');
      onNavigateSection('pages_list');
    };

    return (
      <form
        onSubmit={handleSavePage}
        className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-5 shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-[#1D4ED8]" />
              <span>{editingPageId ? 'ویرایش برگه' : 'ساخت برگه جدید در صفحه مجزا'}</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              ساختار استاندارد برگه‌ها با ذخیره تاریخ ISO-8601 (UTC) و رندر شمسی
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('pages_list')}
            className="px-3.5 py-2 text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl cursor-pointer"
          >
            ← بازگشت به همه برگه‌ها
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">عنوان برگه *</label>
            <input
              type="text"
              required
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="مثال: خدمات مشاوره و پیاده‌سازی سازمانی"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">نامک آدرس (Slug)</label>
            <input
              type="text"
              dir="ltr"
              value={pageSlug}
              onChange={(e) => setPageSlug(e.target.value)}
              placeholder="/enterprise-consulting"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold mb-1">توضیح و محتوای برگه</label>
            <textarea
              rows={4}
              value={pageSummary}
              onChange={(e) => setPageSummary(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-5 py-2.5 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
          >
            انتشار و ذخیره برگه
          </button>
        </div>
      </form>
    );
  }

  if (mode === 'general_calendar') {
    const convertedIso = jalaliStringToIsoUtc(jalaliInput);
    const validNat = isValidIranNationalId(testNationalId);
    const validPost = isValidIranPostalCode(testPostalCode);
    const validMob = isValidIranMobile(testMobile);

    return (
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1D4ED8]" />
            <span>هسته تقویم دوگانه (شمسی / UTC) و بومی‌سازی استان و شهر ایران</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            تمامی تاریخ‌ها در دیتابیس با فرمت استاندارد ISO-8601 (Gregorian UTC) ذخیره شده و در رابط کاربری به شمسی نمایش داده می‌شوند.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950 space-y-3">
            <div className="text-xs font-extrabold text-stone-900 dark:text-white">
              ۱. انتخابگر تاریخ شمسی (Jalali DatePicker ← ISO UTC)
            </div>
            <input
              type="text"
              dir="ltr"
              value={jalaliInput}
              onChange={(e) => setJalaliInput(e.target.value)}
              placeholder="1404/01/15"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
            />
            <div className="text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
              <div>خروجی ذخیره در دیتابیس (UTC ISO-8601):</div>
              <div dir="ltr" className="font-mono text-xs text-[#1D4ED8] font-bold">
                {convertedIso || 'فرمت تاریخ شمسی نامعتبر است'}
              </div>
              {convertedIso && (
                <div className="text-emerald-600 font-bold">
                  بازخوانی شمسی: {formatIsoToJalali(convertedIso, { includeTime: false })}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950 space-y-3">
            <div className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>۲. دیتاست بومی ۳۱ استان و شهرهای ایران (`/core/iran-geo.js`)</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={selectedProvinceId}
                onChange={(e) => {
                  const nextProv = e.target.value;
                  setSelectedProvinceId(nextProv);
                  const nextCities = getCitiesByProvince(nextProv);
                  setSelectedCity(nextCities[0] || '');
                }}
                className="px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              >
                {IRAN_PROVINCES_AND_CITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameFa}
                  </option>
                ))}
              </select>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-stone-500">
              تعداد استان‌های ثبت‌شده: {toPersianDigits(IRAN_PROVINCES_AND_CITIES.length)} استان به همراه شهرهای تابعه
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#1D4ED8]" />
            <span>۳. اعتبارسنج الگوریتمی کد ملی ۱۰ رقمی، کد پستی و موبایل ایران</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">کد ملی (الگوریتم Modulo-11)</label>
              <input
                type="text"
                dir="ltr"
                value={testNationalId}
                onChange={(e) => setTestNationalId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-stone-300 dark:border-stone-700"
              />
              <span className={`text-[11px] font-bold ${validNat ? 'text-emerald-600' : 'text-rose-600'}`}>
                {validNat ? '✓ کد ملی معتبر است' : '✗ کد ملی نامعتبر'}
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">کد پستی ۱۰ رقمی ایران</label>
              <input
                type="text"
                dir="ltr"
                value={testPostalCode}
                onChange={(e) => setTestPostalCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-stone-300 dark:border-stone-700"
              />
              <span className={`text-[11px] font-bold ${validPost ? 'text-emerald-600' : 'text-rose-600'}`}>
                {validPost ? '✓ کد پستی معتبر است' : '✗ کد پستی نامعتبر'}
              </span>
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">شماره موبایل ایران</label>
              <input
                type="text"
                dir="ltr"
                value={testMobile}
                onChange={(e) => setTestMobile(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-stone-300 dark:border-stone-700"
              />
              <span className={`text-[11px] font-bold ${validMob ? 'text-emerald-600' : 'text-rose-600'}`}>
                {validMob ? '✓ شماره موبایل معتبر' : '✗ شماره نامعتبر'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#1D4ED8]" />
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            مدیریت ماژول‌های هسته (`/modules/registry.json`) و زیرساخت فازهای ۲ تا ۶
          </h2>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-[#1D4ED8] text-xs font-extrabold">
          CMS Core v1.1.0
        </span>
      </div>
      <p className="text-xs text-stone-500 leading-relaxed">
        جایگاه این زیرمنو در معماری ۱۰ بخشی پنل مدیریت ثبت و آماده شده است. مطابق پروتکل فازبندی، منطق کامل این ماژول در فازهای ۲ تا ۶ پس از تایید گزارش ممیزی فاز ۱ توسط شما فعال‌سازی می‌شود.
      </p>
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
        <CheckCircle2 className="w-4 h-4" />
        <span>دارای جداسازی کامل هسته (`/core`)، قالب (`/themes/default`) و ماژول‌ها (`/modules`)</span>
      </div>
    </div>
  );
};
