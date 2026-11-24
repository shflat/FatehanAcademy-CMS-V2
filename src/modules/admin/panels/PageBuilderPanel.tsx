import React, { useState } from 'react';
import { Columns, Image as ImageIcon, Check, Trash2 } from 'lucide-react';
import type {
  AccentPresetId,
  CmsPluginItem,
  CustomPageWidget,
  SkillProduct,
  ThemeConfig,
} from '../../../core/types';
import {
  BRAND_FAVICON_PRESETS,
  BRAND_LOGO_PRESETS,
} from '../../../data/skill98Data';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface PageBuilderPanelProps {
  themeConfig: ThemeConfig;
  products: SkillProduct[];
  accentButtonClass: string;
  onUpdateTheme: (next: ThemeConfig) => void;
  onQuickEditProduct: (item: SkillProduct) => void;
  onNotice: NoticeFn;
}

export const PageBuilderPanel: React.FC<PageBuilderPanelProps> = ({
  themeConfig,
  products,
  accentButtonClass,
  onUpdateTheme,
  onQuickEditProduct,
  onNotice,
}) => {
  const [heroSliderSearch, setHeroSliderSearch] = useState('');
  const [newWidgetTitle, setNewWidgetTitle] = useState('');
  const [newWidgetSubtitle, setNewWidgetSubtitle] = useState('');
  const [newWidgetColor, setNewWidgetColor] = useState<AccentPresetId>('cobalt');

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-8 shadow-sm">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
            <Columns className="w-4 h-4" />
            <span>صفحه‌ساز بصری، مدیریت هویت بصری (لوگو و فاویکون) و چیدمان ویترین</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            صفحه‌آرایی صفحه اصلی، انتخاب لوگو و فاویکون، تعداد ستون‌ها و اسلایدر هیرو
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            تنظیم مستقیم لوگو و فاویکون سایت، تعداد ستون‌های کارت‌های محصول (۲، ۳ یا ۴ ستونه)، آیتم‌های اسلایدر بالای صفحه و بخش‌های صفحه اصلی
          </p>
        </div>
      </div>

      {/* 0. Brand Logo & Favicon Selector & Uploader */}
      <div className="p-5 rounded-2xl border border-blue-500/25 bg-blue-50/30 dark:bg-[#131C31] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#1D4ED8]" />
              <span>۰. انتخاب و بارگذاری لوگو و فاویکون اختصاصی سایت</span>
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
              از بین طرح‌های اختصاصی زیر انتخاب کنید، فایل تصویری (SVG/PNG) آپلود نمایید یا آدرس مستقیم تصویر را وارد کنید.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0F172A] border border-stone-200 dark:border-slate-700 flex items-center gap-2">
              <img
                src={themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                alt="لوگوی فعال"
                className="w-7 h-7 object-contain"
              />
              <span className="text-[11px] font-bold text-stone-700 dark:text-slate-200">
                لوگوی فعلی
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0F172A] border border-stone-200 dark:border-slate-700 flex items-center gap-2">
              <img
                src={themeConfig.faviconUrl || '/assets/aistudio/logo_8c26749f.webp'}
                alt="فاویکون فعال"
                className="w-5 h-5 object-contain"
              />
              <span className="text-[11px] font-bold text-stone-700 dark:text-slate-200">
                فاویکون تب مرورگر
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logo Presets + Custom Upload/URL */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold text-stone-800 dark:text-stone-200">
              الف) انتخاب لوگوی اصلی سایت (هدر و فوتر):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {BRAND_LOGO_PRESETS.map((preset) => {
                const isSelected =
                  (themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp') === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onUpdateTheme({ ...themeConfig, logoUrl: preset.url });
                      onNotice('success', `«${preset.title}» به عنوان لوگوی سایت فعال شد.`);
                    }}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-[#1D4ED8] bg-white dark:bg-blue-950/40 ring-1 ring-[#1D4ED8]'
                        : 'border-stone-200 dark:border-slate-800 bg-white/70 dark:bg-[#0F172A] hover:border-blue-400'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.title}
                      className="w-11 h-11 object-contain"
                    />
                    <span className="text-[11px] font-bold text-stone-800 dark:text-slate-200 text-center leading-snug">
                      {preset.title}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="text"
                dir="ltr"
                value={themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                onChange={(e) =>
                  onUpdateTheme({ ...themeConfig, logoUrl: e.target.value })
                }
                placeholder="/assets/aistudio/logo_8c26749f.webp یا آدرس تصویر لوگو..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-stone-900 dark:text-white"
              />
              <label className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-stone-900 dark:bg-slate-800 text-white hover:bg-[#1D4ED8] transition-colors cursor-pointer text-center whitespace-nowrap">
                <span>آپلود فایل لوگو</span>
                <input
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        onUpdateTheme({ ...themeConfig, logoUrl: reader.result });
                        onNotice('success', 'فایل لوگوی اختصاصی شما بارگذاری و در سایت فعال شد.');
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Favicon Presets + Custom Upload/URL */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold text-stone-800 dark:text-stone-200">
              ب) انتخاب فاویکون مرورگر (Favicon):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {BRAND_FAVICON_PRESETS.map((preset) => {
                const isSelected =
                  (themeConfig.faviconUrl || '/assets/aistudio/logo_8c26749f.webp') === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onUpdateTheme({ ...themeConfig, faviconUrl: preset.url });
                      onNotice('success', `«${preset.title}» به عنوان فاویکون مرورگر فعال شد.`);
                    }}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-[#1D4ED8] bg-white dark:bg-blue-950/40 ring-1 ring-[#1D4ED8]'
                        : 'border-stone-200 dark:border-slate-800 bg-white/70 dark:bg-[#0F172A] hover:border-blue-400'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.title}
                      className="w-9 h-9 object-contain"
                    />
                    <span className="text-[11px] font-bold text-stone-800 dark:text-slate-200 text-center leading-snug">
                      {preset.title}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="text"
                dir="ltr"
                value={themeConfig.faviconUrl || '/assets/aistudio/logo_8c26749f.webp'}
                onChange={(e) =>
                  onUpdateTheme({ ...themeConfig, faviconUrl: e.target.value })
                }
                placeholder="/assets/aistudio/logo_8c26749f.webp یا آدرس فاویکون..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-stone-900 dark:text-white"
              />
              <label className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-stone-900 dark:bg-slate-800 text-white hover:bg-[#1D4ED8] transition-colors cursor-pointer text-center whitespace-nowrap">
                <span>آپلود فاویکون</span>
                <input
                  type="file"
                  accept="image/*,.svg,.ico"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        onUpdateTheme({ ...themeConfig, faviconUrl: reader.result });
                        onNotice('success', 'فاویکون جدید بارگذاری و روی تب مرورگر اعمال شد.');
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* A. Product Grid Columns Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-extrabold text-stone-800 dark:text-stone-200">
          ۱. چیدمان و تعداد ستون‌های کارت‌های محصول در صفحه اصلی:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(
            [
              {
                cols: 2,
                title: 'چیدمان ۲ ستونه (پهن و مجله‌ای)',
                desc: 'نمایش بزرگ‌تر پوسترها و جزئیات کامل‌تر در هر ردیف',
              },
              {
                cols: 3,
                title: 'چیدمان ۳ ستونه (استاندارد استودیویی)',
                desc: 'تعادل ایده‌آل بین پوسترهای اسکیل و تراکم اطلاعات',
              },
              {
                cols: 4,
                title: 'چیدمان ۴ ستونه (فشرده و فروشگاهی)',
                desc: 'نمایش تعداد بیشتری از اسکیل‌ها و پکیج‌ها در یک نگاه',
              },
            ] as { cols: 2 | 3 | 4; title: string; desc: string }[]
          ).map((opt) => {
            const active = (themeConfig.productGridColumns || 3) === opt.cols;
            return (
              <button
                key={opt.cols}
                type="button"
                onClick={() => {
                  onUpdateTheme({ ...themeConfig, productGridColumns: opt.cols });
                  onNotice(
                    'success',
                    `چیدمان کارت‌های محصول در صفحه اصلی به حالت «${opt.cols.toLocaleString('fa-IR')} ستونه» تغییر یافت.`
                  );
                }}
                className={`p-4 rounded-2xl border text-right transition-all cursor-pointer space-y-1.5 ${
                  active
                    ? 'border-[#1D4ED8] bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-[#1D4ED8]'
                    : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-stone-900 dark:text-white smooth-nums">
                    {opt.title}
                  </span>
                  {active && <Check className="w-4 h-4 text-[#1D4ED8]" />}
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* B. Hero Slider Items Configuration */}
      <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-xs font-extrabold text-stone-800 dark:text-stone-200">
              ۲. مدیریت اسلایدر بادبزنی هیرو (انتخاب کارت‌ها + ویرایش سریع هر کارت):
            </label>
            <p className="text-xs text-stone-500 mt-0.5">
              مشخص کنید کدام اسکیل‌ها در دسته کارت ۵تایی اسلایدر بالای صفحه نمایش داده شوند یا مستقیماً آن‌ها را ویرایش کنید:
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={heroSliderSearch}
              onChange={(e) => setHeroSliderSearch(e.target.value)}
              placeholder="جستجوی اسکیل برای اسلایدر..."
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
            <span className="text-[11px] font-bold text-[#1D4ED8] bg-blue-500/10 px-2.5 py-1 rounded-lg smooth-nums whitespace-nowrap">
              {(themeConfig.heroSliderSkillIds || []).length.toLocaleString('fa-IR')} کارت در اسلایدر
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
          {products
            .filter((prod) => {
              if (!heroSliderSearch.trim()) return true;
              const q = heroSliderSearch.trim().toLowerCase();
              return (
                prod.title.toLowerCase().includes(q) ||
                prod.category.toLowerCase().includes(q)
              );
            })
            .map((prod) => {
              const currentSliderIds = themeConfig.heroSliderSkillIds || [];
              const isSelected = currentSliderIds.includes(prod.id);
              return (
                <div
                  key={prod.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    isSelected
                      ? 'border-[#1D4ED8] bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const nextIds = isSelected
                          ? currentSliderIds.filter((id) => id !== prod.id)
                          : [...currentSliderIds, prod.id];
                        onUpdateTheme({ ...themeConfig, heroSliderSkillIds: nextIds });
                        onNotice('success', 'آیتم‌های اسلایدر هیرو در صفحه اصلی بروزرسانی شد.');
                      }}
                      className="mt-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                        {prod.title}
                      </div>
                      <div className="text-[11px] text-stone-500 smooth-nums truncate">
                        {prod.category} ·{' '}
                        {prod.price === 0
                          ? 'رایگان'
                          : `${prod.price.toLocaleString('fa-IR')} ت`}
                      </div>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => onQuickEditProduct(prod)}
                    className="px-2 py-1 text-[10px] font-bold rounded-lg border border-stone-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                    title="ویرایش عنوان، رنگ و جزئیات این کارت"
                  >
                    ویرایش کارت
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {/* C. Homepage Section Visibility Toggles */}
      <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-slate-800">
        <label className="block text-xs font-extrabold text-stone-800 dark:text-stone-200">
          ۳. مدیریت بخش‌های قابل نمایش در صفحه اصلی (فعال / غیرفعال کردن سکشن‌ها):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {(
            [
              {
                key: 'showTopAnnouncement',
                label: 'نوار وضعیت تعاملی بالا (GSAP / Lenis / Barba / Muuri)',
              },
              {
                key: 'showHeroSection',
                label: 'بخش اول: هیرو، تیتر اصلی و اسلایدر بادبزنی ۵ کارته',
              },
              {
                key: 'showToolsBentoSection',
                label: 'بخش دوم: باکس‌های انتخاب ابزار (Claude / ChatGPT / Codex)',
              },
              {
                key: 'showMotionShowcaseSection',
                label: 'بخش چهارم: معرفی ۴ کتابخانه حرکتی (GSAP / Lenis / Barba / Muuri)',
              },
              {
                key: 'showArticlesSection',
                label: 'بخش پنجم: تازه‌ترین مقالات و آموزش‌های مجله در صفحه اول',
              },
              {
                key: 'showFaqSection',
                label: 'بخش ششم: پرسش‌های متداول (FAQ) پیش از خرید',
              },
            ] as { key: keyof ThemeConfig; label: string }[]
          ).map((sec) => {
            const checked = themeConfig[sec.key] !== false;
            return (
              <label
                key={sec.key}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-[#0F172A] flex items-center gap-2.5 cursor-pointer font-bold"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    onUpdateTheme({ ...themeConfig, [sec.key]: e.target.checked });
                    onNotice('success', 'چیدمان بخش‌های صفحه اصلی بروزرسانی شد.');
                  }}
                />
                <span className="truncate">{sec.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* D. Full Texts, Section Titles & Editorial Footer Quote */}
      <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-slate-800">
        <label className="block text-xs font-extrabold text-stone-800 dark:text-stone-200">
          ۴. ویرایش کامل تیترهای صفحه اصلی، بخش‌ها و شعار فوتر (بدون هیچ متن هاردکد):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">
              نشان بالای هیرو (Hero Badge)
            </label>
            <input
              type="text"
              value={themeConfig.heroBadgeText || ''}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, heroBadgeText: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">
              متن نوار اعلان بالای سایت
            </label>
            <input
              type="text"
              value={themeConfig.topAnnouncementText || ''}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, topAnnouncementText: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">
              خط اول تیتر هیرو
            </label>
            <input
              type="text"
              value={themeConfig.heroTitleLine1}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, heroTitleLine1: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">
              خط دوم تیتر هیرو (رنگی هماهنگ با تم)
            </label>
            <input
              type="text"
              value={themeConfig.heroTitleAccent}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, heroTitleAccent: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-stone-500 mb-1">
              زیرعنوان توضیحات هیرو
            </label>
            <textarea
              rows={2}
              value={themeConfig.heroSubtitle}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, heroSubtitle: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">
              تیتر بخش انتخاب ابزارها (Claude / ChatGPT / Codex)
            </label>
            <input
              type="text"
              value={themeConfig.toolsSectionTitle || ''}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, toolsSectionTitle: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">
              تیتر بخش کاتالوگ فروشگاه اسکیل‌ها
            </label>
            <input
              type="text"
              value={themeConfig.catalogSectionTitle || ''}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, catalogSectionTitle: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">
              شعار اصلی فوتر (نقل‌قول برجسته فوتر)
            </label>
            <input
              type="text"
              value={themeConfig.footerQuoteTitle || ''}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, footerQuoteTitle: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-stone-500 mb-1">
              زیرنویس شعار فوتر
            </label>
            <input
              type="text"
              value={themeConfig.footerQuoteSubtitle || ''}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, footerQuoteSubtitle: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-[#0F172A]"
            />
          </div>
        </div>
      </div>

      {/* E. WordPress-Style Custom Widgets Builder */}
      <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-slate-800">
        <div>
          <label className="block text-xs font-extrabold text-stone-800 dark:text-stone-200">
            ۵. ویجت‌ساز و بلوک‌های سفارشی صفحه اصلی (مشابه المنتور و گوتنبرگ وردپرس):
          </label>
          <p className="text-xs text-stone-500 mt-0.5">
            هر تعداد بنر تبلیغاتی، نوار آمار یا فراخوان اقدام (CTA) به صفحه اصلی اضافه یا ویرایش کنید:
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-[#0F172A] grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={newWidgetTitle}
            onChange={(e) => setNewWidgetTitle(e.target.value)}
            placeholder="عنوان ویجت یا بنر جدید..."
            className="px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <input
            type="text"
            value={newWidgetSubtitle}
            onChange={(e) => setNewWidgetSubtitle(e.target.value)}
            placeholder="توضیحات زیرعنوان ویجت..."
            className="px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          <div className="flex items-center gap-2">
            <select
              value={newWidgetColor}
              onChange={(e) => setNewWidgetColor(e.target.value as AccentPresetId)}
              className="px-2.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="cobalt">آبی کبالت</option>
              <option value="emerald">سبز زمردی</option>
              <option value="rose">یاقوتی گرم</option>
              <option value="amber">طلایی</option>
              <option value="violet">بنفش</option>
            </select>
            <button
              type="button"
              onClick={() => {
                if (!newWidgetTitle.trim()) {
                  onNotice('error', 'لطفاً عنوان ویجت را وارد کنید.');
                  return;
                }
                const created: CustomPageWidget = {
                  id: `widget_${Date.now()}`,
                  type: 'promo_banner',
                  title: newWidgetTitle.trim(),
                  subtitle:
                    newWidgetSubtitle.trim() ||
                    'بلوک سفارشی اضافه‌شده توسط صفحه‌ساز آموزشگاه رباتیک فاتحان',
                  badgeText: 'ویجت اختصاصی',
                  buttonText: 'مشاهده دوره‌ها و کیت‌ها',
                  buttonTargetTab: 'store',
                  accentTone: newWidgetColor,
                  enabled: true,
                };
                onUpdateTheme({
                  ...themeConfig,
                  customWidgets: [...(themeConfig.customWidgets || []), created],
                });
                setNewWidgetTitle('');
                setNewWidgetSubtitle('');
                onNotice('success', 'ویجت سفارشی جدید به صفحه اصلی اضافه شد.');
              }}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl whitespace-nowrap cursor-pointer ${accentButtonClass}`}
            >
              + افزودن ویجت
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(themeConfig.customWidgets || []).map((w) => (
            <div
              key={w.id}
              className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900"
            >
              <label className="flex items-start gap-2.5 cursor-pointer min-w-0">
                <input
                  type="checkbox"
                  checked={w.enabled}
                  onChange={(e) => {
                    const next = (themeConfig.customWidgets || []).map((item) =>
                      item.id === w.id ? { ...item, enabled: e.target.checked } : item
                    );
                    onUpdateTheme({ ...themeConfig, customWidgets: next });
                  }}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                    {w.title}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">{w.subtitle}</div>
                </div>
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = (themeConfig.customWidgets || []).filter(
                    (item) => item.id !== w.id
                  );
                  onUpdateTheme({ ...themeConfig, customWidgets: next });
                  onNotice('success', 'ویجت سفارشی حذف شد.');
                }}
                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* F. WordPress-Style Core Plugins Manager */}
      <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-slate-800">
        <label className="block text-xs font-extrabold text-stone-800 dark:text-stone-200">
          ۶. افزونه‌های فعال هسته سیستم (DPATech Plugins — مشابه وردپرس):
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(themeConfig.activePlugins || []).map((plg: CmsPluginItem) => (
            <label
              key={plg.id}
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                plg.enabled
                  ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-stone-200 dark:border-slate-800 opacity-70'
              }`}
            >
              <input
                type="checkbox"
                checked={plg.enabled}
                onChange={(e) => {
                  const next = (themeConfig.activePlugins || []).map((item) =>
                    item.id === plg.id ? { ...item, enabled: e.target.checked } : item
                  );
                  onUpdateTheme({ ...themeConfig, activePlugins: next });
                  onNotice('success', `وضعیت افزونه «${plg.name}» بروزرسانی شد.`);
                }}
                className="mt-1 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                    {plg.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-200/70 dark:bg-slate-800">
                    v{plg.version}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">
                  {plg.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
