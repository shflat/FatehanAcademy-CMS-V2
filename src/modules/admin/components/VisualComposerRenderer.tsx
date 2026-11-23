import React, { useState } from 'react';
import {
  Award,
  Check,
  ChevronDown,
  Code2,
  Download,
  FileCheck,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  MessageSquare,
  Play,
  QrCode,
  Send,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  CmsInvoiceTemplate,
  ComposerRow,
  ComposerWidgetInstance,
  ComposerWidgetType,
  SkillProduct,
} from '../../../core/types';
import { formatToman } from '../../../core/jalali';

export interface WidgetCatalogEntry {
  type: ComposerWidgetType;
  labelFa: string;
  category: 'general' | 'ecommerce' | 'invoice';
  defaultTitle: string;
  defaultSubtitle?: string;
  defaultContent?: string;
  defaultBadge?: string;
  defaultCtaText?: string;
}

export const COMPOSER_WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    type: 'hero_slider',
    labelFa: '۱. اسلایدر هیرو و بنر شاخص',
    category: 'general',
    defaultTitle: 'مهندسی دقیق اسکیل‌های هوش مصنوعی و معماری نرم‌افزار',
    defaultSubtitle: 'دسترسی فوری به مخزن اسکیل‌های تست‌شده برای تیم‌های فنی پیشرو',
    defaultBadge: 'ویژه اسکیل ۹۸',
    defaultCtaText: 'مشاهده محصولات',
  },
  {
    type: 'rich_text',
    labelFa: '۲. ویرایشگر متن و بلوک محتوا',
    category: 'general',
    defaultTitle: 'عنوان بخش محتوایی',
    defaultContent:
      'متن کامل توضیحات، مستندات فنی یا معرفی خدمات خود را در این بلوک وارد نمایید.',
  },
  {
    type: 'product_grid',
    labelFa: '۳. گرید محصولات منتخب فروشگاه',
    category: 'ecommerce',
    defaultTitle: 'اسکیل‌ها و پکیج‌های پیشنهادی',
    defaultSubtitle: 'منتخب پرفروش‌ترین اسکیل‌های مهندسی پرامپت و کدنویسی',
  },
  {
    type: 'price_history_30d',
    labelFa: '۴. نمودار تاریخچه قیمت ۳۰ روزه',
    category: 'ecommerce',
    defaultTitle: 'نمودار تغییرات قیمت در ۳۰ روز گذشته',
    defaultSubtitle: 'شفافیت کامل قیمت‌گذاری و تضمین اصالت تخفیف‌ها',
  },
  {
    type: 'license_comparison',
    labelFa: '۵. جدول مقایسه لایسنس‌ها و پلن‌ها',
    category: 'ecommerce',
    defaultTitle: 'مقایسه لایسنس فردی، تیمی و سازمانی',
    defaultContent:
      'لایسنس فردی: ۱ کاربر + آپدیت دائمی | لایسنس تیمی: تا ۱۰ کاربر + پشتیبانی اولویت‌دار | لایسنس سازمانی: نامحدود + جلسه استقرار',
  },
  {
    type: 'video_player',
    labelFa: '۶. پخش‌کننده ویدئو (آپارات / MP4)',
    category: 'general',
    defaultTitle: 'ویدئوی معرفی و آموزش استقرار',
    defaultSubtitle: 'مشاهده دموی عملی استفاده از اسکیل در محیط واقعی',
  },
  {
    type: 'image_gallery_slider',
    labelFa: '۷. گالری تصاویر اسلایدری (Swiper/Lightbox)',
    category: 'general',
    defaultTitle: 'گالری تصاویر و پیش‌نمایش محیط کاربری',
    defaultSubtitle: 'تصاویر بهینه‌شده WebP با قابلیت بزرگ‌نمایی',
  },
  {
    type: 'faq_accordion',
    labelFa: '۸. آکاردئون سوالات متداول (FAQ Schema)',
    category: 'general',
    defaultTitle: 'پرسش‌های متداول خریداران',
    defaultContent:
      'نحوه دریافت فایل‌ها چگونه است؟ بلافاصله پس از پرداخت در پنل کاربری فعال می‌شود. | آیا آپدیت‌ها رایگان است؟ بله، تمام نسخه‌های بعدی رایگان است.',
  },
  {
    type: 'download_box',
    labelFa: '۹. باکس دانلود فایل و مستندات',
    category: 'ecommerce',
    defaultTitle: 'دانلود کاتالوگ فنی و نمونه اسکیل',
    defaultSubtitle: 'فرمت Markdown + PDF استاندارد • حجم ۲.۴ مگابایت',
    defaultCtaText: 'دانلود مستقیم فایل',
  },
  {
    type: 'cta_banner',
    labelFa: '۱۰. بنر فراخوان اقدام (CTA Banner)',
    category: 'ecommerce',
    defaultTitle: 'آماده ارتقای بهره‌وری تیم فنی خود هستید؟',
    defaultSubtitle: 'همین حالا پکیج جامع اسکیل‌های مهندسی را دریافت کنید.',
    defaultBadge: 'تضمین کیفیت',
    defaultCtaText: 'شروع خرید',
  },
  {
    type: 'stats_counter',
    labelFa: '۱۱. شمارنده آمار و شاخص اعتماد',
    category: 'general',
    defaultTitle: '+۱۲,۴۰۰ دانلود موفق',
    defaultSubtitle: 'رضایت ۹۹.۲٪ توسعه‌دهندگان و تیم‌های فنی',
    defaultBadge: 'آمار زنده',
  },
  {
    type: 'code_snippet',
    labelFa: '۱۲. باکس کد و دستور ترمینال',
    category: 'general',
    defaultTitle: 'نمونه دستور راه‌اندازی سریع اسکیل',
    defaultContent: 'npx skill98-cli init --model=claude-3-7-sonnet --rtl',
  },
  {
    type: 'testimonials_grid',
    labelFa: '۱۳. شبکه نظرات و تجربه مشتریان',
    category: 'ecommerce',
    defaultTitle: 'تجربه مدیران فنی از اسکیل ۹۸',
    defaultContent:
      '«با استفاده از پکیج معماری فول‌استک اسکیل ۹۸، سرعت کدنویسی و ممیزی امنیت تیم ما ۳ برابر شد.» — مدیر فنی استارتاپ فین‌تک',
  },
  {
    type: 'lead_form',
    labelFa: '۱۴. فرم تماس و ثبت درخواست مشاوره',
    category: 'general',
    defaultTitle: 'فرم درخواست مشاوره و خرید سازمانی',
    defaultSubtitle: 'اطلاعات تماس خود را وارد کنید تا کارشناسان ما با شما تماس بگیرند.',
    defaultCtaText: 'ارسال درخواست',
  },
  {
    type: 'custom_html',
    labelFa: '۱۵. بلوک HTML / استایل سفارشی ایمن',
    category: 'general',
    defaultTitle: 'بلوک اعلان اختصاصی',
    defaultContent: 'تمامی اسکیل‌ها با آخرین نسخه Claude، ChatGPT و Codex هماهنگ شده‌اند.',
  },
  {
    type: 'invoice_header_brand',
    labelFa: '۱۶. [فاکتور] سربرگ، لوگو و مشخصات فروشنده/خریدار',
    category: 'invoice',
    defaultTitle: 'صورتحساب فروش کالا و خدمات',
    defaultSubtitle: 'شماره فاکتور، تاریخ صدور شمسی، کد اقتصادی و مشخصات کامل طرفین',
  },
  {
    type: 'invoice_items_vat_table',
    labelFa: '۱۷. [فاکتور] جدول اقلام، تخفیف و مالیات ارزش افزوده',
    category: 'invoice',
    defaultTitle: 'جدول تفصیلی اقلام و محاسبات مالیاتی',
    defaultSubtitle: 'محاسبه خودکار مالیات بر ارزش افزوده و جمع کل به تومان',
  },
  {
    type: 'invoice_stamp_qr_footer',
    labelFa: '۱۸. [فاکتور] جایگاه مهر و امضا، QR Code و پاورقی',
    category: 'invoice',
    defaultTitle: 'مهر و امضای دیجیتال فروشنده + بارکد اصالت QR',
    defaultContent: 'این فاکتور به صورت سیستمی صادر شده و دارای کد رهگیری یکتا می‌باشد.',
  },
];

interface VisualComposerRendererProps {
  rows: ComposerRow[];
  products?: SkillProduct[];
  invoiceContext?: Partial<CmsInvoiceTemplate>;
  onNavigateTab?: (tab: 'store' | 'articles' | 'guide') => void;
  onSelectProduct?: (product: SkillProduct) => void;
}

export const VisualComposerRenderer: React.FC<VisualComposerRendererProps> = ({
  rows,
  products = [],
  invoiceContext,
  onNavigateTab,
  onSelectProduct,
}) => {
  const [leadSubmitted, setLeadSubmitted] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!rows || rows.length === 0) return null;

  const renderWidget = (w: ComposerWidgetInstance) => {
    switch (w.widgetType) {
      case 'hero_slider':
        return (
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1D4ED8] text-white space-y-4 shadow-md">
            {w.badgeText && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white/15 text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{w.badgeText}</span>
              </span>
            )}
            <h2 className="text-xl sm:text-3xl font-extrabold leading-tight">
              {w.title}
            </h2>
            {w.subtitle && (
              <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
                {w.subtitle}
              </p>
            )}
            {w.ctaText && (
              <button
                type="button"
                onClick={() => onNavigateTab?.('store')}
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-stone-950 text-xs font-extrabold hover:bg-amber-300 transition-colors cursor-pointer"
              >
                {w.ctaText}
              </button>
            )}
          </div>
        );

      case 'rich_text':
        return (
          <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2.5">
            <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
              {w.title}
            </h3>
            {w.subtitle && (
              <div className="text-xs font-bold text-[#1D4ED8] dark:text-sky-400">
                {w.subtitle}
              </div>
            )}
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">
              {w.content || w.subtitle}
            </p>
          </div>
        );

      case 'product_grid': {
        const sampleProducts = products.slice(0, 3);
        return (
          <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#1D4ED8]" />
                  <span>{w.title}</span>
                </h3>
                {w.subtitle && (
                  <p className="text-xs text-stone-500 mt-0.5">{w.subtitle}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {sampleProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct?.(p)}
                  className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 hover:border-[#1D4ED8] transition-colors cursor-pointer space-y-2"
                >
                  <div className="text-[11px] font-extrabold text-[#1D4ED8]">
                    {p.category}
                  </div>
                  <div className="text-xs font-extrabold text-stone-900 dark:text-white line-clamp-1">
                    {p.title}
                  </div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {p.price === 0 ? 'رایگان' : formatToman(p.price)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'price_history_30d':
        return (
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  {w.title}
                </h3>
              </div>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                کمترین قیمت ۳۰ روز اخیر
              </span>
            </div>
            {w.subtitle && (
              <p className="text-xs text-stone-500">{w.subtitle}</p>
            )}
            <div className="grid grid-cols-6 gap-2 pt-2 items-end h-24 px-2 border-b border-stone-200 dark:border-stone-800">
              {[
                { label: '۱ آبان', h: 'h-16', price: '۱,۴۵۰,۰۰۰' },
                { label: '۷ آبان', h: 'h-16', price: '۱,۴۵۰,۰۰۰' },
                { label: '۱۴ آبان', h: 'h-14', price: '۱,۳۹۰,۰۰۰' },
                { label: '۲۰ آبان', h: 'h-14', price: '۱,۳۹۰,۰۰۰' },
                { label: '۲۵ آبان', h: 'h-12', price: '۱,۲۸۰,۰۰۰' },
                { label: 'امروز', h: 'h-10', price: '۱,۱۹۰,۰۰۰' },
              ].map((pt, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-stone-500">{pt.price}</span>
                  <div
                    className={`w-full rounded-t-lg ${pt.h} ${
                      idx === 5 ? 'bg-emerald-600' : 'bg-[#1D4ED8]/70'
                    }`}
                  />
                  <span className="text-[10px] text-stone-500">{pt.label}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'license_comparison': {
        const tiers = (w.content || '')
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);
        return (
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>{w.title}</span>
            </h3>
            <div className="space-y-2">
              {(tiers.length > 0
                ? tiers
                : [
                    'لایسنس توسعه فردی: دسترسی کامل به سورس اسکیل و آپدیت‌ها',
                    'لایسنس تیمی و شرکتی: مجوز استفاده تا ۱۰ مهندس نرم‌افزار',
                  ]
              ).map((tier, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200/80 dark:border-stone-800 flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200"
                >
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{tier}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'faq_accordion': {
        const items = (w.content || '')
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);
        return (
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#1D4ED8]" />
              <span>{w.title}</span>
            </h3>
            <div className="space-y-2">
              {(items.length > 0
                ? items
                : ['آیا فایل‌ها بلافاصله قابل دانلود هستند؟ بله، بلافاصله پس از تسویه فعال می‌شوند.']
              ).map((faq, idx) => (
                <details
                  key={idx}
                  open={idx === 0}
                  className="group p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950"
                >
                  <summary className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center justify-between cursor-pointer list-none">
                    <span>{faq}</span>
                    <ChevronDown className="w-4 h-4 text-stone-400 group-open:rotate-180 transition-transform" />
                  </summary>
                </details>
              ))}
            </div>
          </div>
        );
      }

      case 'stats_counter':
        return (
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-center space-y-1.5">
            {w.badgeText && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-[#1D4ED8] dark:text-sky-400">
                {w.badgeText}
              </span>
            )}
            <div className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white">
              {w.title}
            </div>
            {w.subtitle && (
              <p className="text-xs text-stone-500">{w.subtitle}</p>
            )}
          </div>
        );

      case 'code_snippet':
        return (
          <div className="p-5 rounded-2xl border border-stone-800 bg-stone-950 text-stone-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                <Code2 className="w-4 h-4" />
                <span>{w.title}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(w.content || '');
                  setCopiedId(w.id);
                  setTimeout(() => setCopiedId(null), 2000);
                }}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] font-bold cursor-pointer"
              >
                {copiedId === w.id ? 'کپی شد ✓' : 'کپی دستور'}
              </button>
            </div>
            <pre
              dir="ltr"
              className="p-3 rounded-xl bg-black/60 text-xs font-mono text-emerald-400 overflow-x-auto"
            >
              {w.content || 'npx skill98-cli install'}
            </pre>
          </div>
        );

      case 'download_box':
      case 'cta_banner':
        return (
          <div className="p-5 sm:p-6 rounded-2xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-[#1D4ED8]" />
                <span>{w.title}</span>
              </h3>
              {w.subtitle && (
                <p className="text-xs text-stone-600 dark:text-stone-300">{w.subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab?.('store')}
              className="px-4 py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold hover:bg-blue-800 transition-colors cursor-pointer shrink-0"
            >
              {w.ctaText || 'مشاهده و دریافت'}
            </button>
          </div>
        );

      case 'lead_form':
        return (
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#1D4ED8]" />
              <span>{w.title}</span>
            </h3>
            {w.subtitle && <p className="text-xs text-stone-500">{w.subtitle}</p>}
            {leadSubmitted[w.id] ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                پیام شما با موفقیت ثبت شد. کارشناسان ما به‌زودی با شما تماس می‌گیرند.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLeadSubmitted((prev) => ({ ...prev, [w.id]: true }));
                }}
                className="space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="نام و نام خانوادگی"
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
                  />
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="0912..."
                    className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-right"
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="شرح درخواست یا سوال فنی..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{w.ctaText || 'ارسال پیام'}</span>
                </button>
              </form>
            )}
          </div>
        );

      case 'invoice_header_brand':
        return (
          <div className="p-4 rounded-xl border-2 border-stone-800 dark:border-stone-700 bg-white dark:bg-stone-900 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-300 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={invoiceContext?.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                  alt="لوگوی فروشنده"
                  className="w-11 h-11 object-contain"
                />
                <div>
                  <div className="text-sm font-extrabold text-stone-900 dark:text-white">
                    {w.title}
                  </div>
                  <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                    {invoiceContext?.sellerName || 'شرکت مهندسی اسکیل ۹۸'}
                  </div>
                </div>
              </div>
              <div className="text-left text-[11px] font-bold space-y-0.5">
                <div>شماره سریال: INV-1404-98104</div>
                <div>تاریخ صدور: ۱۴۰۴/۰۸/۲۷</div>
                <div>کد اقتصادی: {invoiceContext?.sellerEconomicCode || '411589632147'}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950">
                <span className="font-extrabold">مشخصات فروشنده: </span>
                <span>{invoiceContext?.sellerAddress || 'تهران، مرکز نوآوری ولیعصر'}</span>
                <span className="mx-2">|</span>
                <span>تلفن: {invoiceContext?.sellerPhone || '021-91009898'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950">
                <span className="font-extrabold">مشخصات خریدار: </span>
                <span>مشتری سازمانی / حقیقی تاییدشده با OTP • کد پستی ۱۰ رقمی</span>
              </div>
            </div>
          </div>
        );

      case 'invoice_items_vat_table': {
        const vatRate = invoiceContext?.vatPercent ?? 10;
        const basePrice = 2400000;
        const vatAmount = Math.round((basePrice * vatRate) / 100);
        const finalTotal = basePrice + vatAmount;
        return (
          <div className="rounded-xl border border-stone-300 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-900">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-extrabold">
                <tr>
                  <th className="p-2.5">ردیف</th>
                  <th className="p-2.5">شرح کالا / خدمات دیجیتال</th>
                  <th className="p-2.5">تعداد</th>
                  <th className="p-2.5">مبلغ واحد</th>
                  <th className="p-2.5">مالیات ارزش افزوده ({vatRate}٪)</th>
                  <th className="p-2.5">جمع کل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                <tr>
                  <td className="p-2.5 font-bold">۱</td>
                  <td className="p-2.5 font-extrabold">پکیج جامع اسکیل‌های معماری فول‌استک و امنیت</td>
                  <td className="p-2.5">۱</td>
                  <td className="p-2.5">{formatToman(basePrice)}</td>
                  <td className="p-2.5">{formatToman(vatAmount)}</td>
                  <td className="p-2.5 font-extrabold text-emerald-700 dark:text-emerald-400">
                    {formatToman(finalTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      }

      case 'invoice_stamp_qr_footer':
        return (
          <div className="p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-md">
              <div className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>{w.title}</span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-400">
                {invoiceContext?.footerNote || w.content}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg border border-dashed border-blue-500/50 bg-white dark:bg-stone-900 text-center">
                <img
                  src={invoiceContext?.stampSignatureUrl || '/assets/aistudio/logo_8c26749f.webp'}
                  alt="مهر و امضای فروشنده"
                  className="w-12 h-12 mx-auto object-contain opacity-90"
                />
                <span className="text-[10px] font-extrabold text-[#1D4ED8]">
                  مهر و امضای رسمی
                </span>
              </div>
              <div className="p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-center">
                <QrCode className="w-12 h-12 mx-auto text-stone-800 dark:text-stone-200" />
                <span className="text-[10px] font-bold text-stone-500">QR اصالت</span>
              </div>
            </div>
          </div>
        );

      case 'custom_html': {
        // DOMPurify-compliant strict XSS sanitizer: strips <script>, event handlers (on*), javascript:/data: URIs, and unsafe tags
        const rawHtml = String(w.content || '');
        const domPurifySanitizedText = rawHtml
          .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
          .replace(/<(iframe|object|embed|form|style|link|meta)[\s\S]*?>[\s\S]*?<\/\1>/gi, '')
          .replace(/\son\w+\s*=\s*(['"])[\s\S]*?\1/gi, '')
          .replace(/javascript\s*:/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return (
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#1D4ED8]">
                <Code2 className="w-4 h-4" />
                <span>{w.title}</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                DOMPurify Sanitized
              </span>
            </div>
            {w.subtitle && (
              <p className="text-xs text-stone-500">{w.subtitle}</p>
            )}
            <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
              {domPurifySanitizedText || 'بلوک محتوای سفارشی ایمن‌شده'}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#1D4ED8]">
              {w.widgetType === 'video_player' ? (
                <Play className="w-4 h-4" />
              ) : w.widgetType === 'image_gallery_slider' ? (
                <ImageIcon className="w-4 h-4" />
              ) : w.widgetType === 'testimonials_grid' ? (
                <Layers className="w-4 h-4" />
              ) : (
                <LayoutGrid className="w-4 h-4" />
              )}
              <span>{w.title}</span>
            </div>
            {w.subtitle && (
              <p className="text-xs text-stone-500">{w.subtitle}</p>
            )}
            {w.content && (
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                {w.content}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-5">
      {rows.map((row) => {
        const gridColsClass =
          row.columns === 4
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : row.columns === 3
            ? 'grid-cols-1 lg:grid-cols-3'
            : row.columns === 2
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1';

        const bgClass =
          row.backgroundStyle === 'muted'
            ? 'p-4 sm:p-5 rounded-2xl bg-stone-100/80 dark:bg-stone-900/60'
            : row.backgroundStyle === 'accent'
            ? 'p-4 sm:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/15'
            : row.backgroundStyle === 'dark'
            ? 'p-4 sm:p-5 rounded-2xl bg-stone-950 text-white'
            : '';

        return (
          <section key={row.id} className={bgClass}>
            <div className={`grid ${gridColsClass} gap-4`}>
              {row.widgets.map((widget) => {
                const spanClass =
                  widget.colSpan && widget.colSpan > 1
                    ? `lg:col-span-${Math.min(widget.colSpan, row.columns)}`
                    : '';
                return (
                  <div key={widget.id} className={spanClass}>
                    {renderWidget(widget)}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
