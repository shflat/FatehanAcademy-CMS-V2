import React, { useMemo, useState } from 'react';
import {
  ArrowRight, Bookmark, Check, ChevronLeft, ChevronRight, CreditCard,
  FileCode2, Layers, Maximize2, Package, Play, ShieldCheck, ShoppingBag,
  Sparkles, TrendingUp, Truck, X, Zap,
} from 'lucide-react';
import type { ActiveTab, SkillProduct } from '../../core/types';
import type { AccentStyleTokens } from '../accentStyles';
import { formatToman } from '../../core/jalali';
import { resolveStaticImageUrl } from '../../data/mediaAssets';
import { IMAGES } from '../../data/skill98Data';
import { getPosterPalette, PosterGeometricSymbol } from './SkillPosterCard';
import { VisualComposerRenderer } from '../../modules/admin/components/VisualComposerRenderer';
import { ProgressiveImage } from './ProgressiveImage';
import { ProductReviewsQaWidget } from '../../../modules/mod_reviews_qa/ProductReviewsQaWidget';

interface SingleProductViewProps {
  product: SkillProduct;
  allProducts: SkillProduct[];
  brandNameFa: string;
  bookmarkedIds: string[];
  claimedSkillIds: string[];
  accentStyles: AccentStyleTokens;
  onBackToStore: () => void;
  onSelectProduct: (prod: SkillProduct) => void;
  onToggleBookmark: (id: string) => void;
  onAddToCart: (prod: SkillProduct) => void;
  onQuickSkillAction: (prod: SkillProduct) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onFilterByCategory?: (cat: string) => void;
}

type LicenseTierId = 'individual' | 'team' | 'enterprise_physical';

export const SingleProductView: React.FC<SingleProductViewProps> = ({
  product, allProducts, brandNameFa, bookmarkedIds, claimedSkillIds, accentStyles,
  onBackToStore, onSelectProduct, onToggleBookmark, onAddToCart, onQuickSkillAction,
  onNavigateTab, onFilterByCategory,
}) => {
  const [activeMediaTab, setActiveMediaTab] = useState<'gallery' | 'video'>('gallery');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseTierId>(
    product.deliveryType === 'physical' ? 'enterprise_physical' : 'individual'
  );
  const [activeDetailTab, setActiveDetailTab] = useState<'specs' | 'markdown' | 'price_chart'>('specs');

  const isFree = product.price === 0;
  const isClaimed = claimedSkillIds.includes(product.id);
  const isBookmarked = bookmarkedIds.includes(product.id);
  const palette = getPosterPalette(product.posterColor, product.category);

  const gallerySlides = useMemo(() => {
    const primary = resolveStaticImageUrl(product.imageUrl || IMAGES.fullstackPkg);
    const extras = product.galleryUrls?.length
      ? product.galleryUrls.map((u) => resolveStaticImageUrl(u))
      : [IMAGES.uiuxPkg, IMAGES.securityPkg, IMAGES.aiAutomationPkg].map(resolveStaticImageUrl);
    return Array.from(new Set([primary, ...extras])).slice(0, 5);
  }, [product]);

  const licenseTiers = useMemo(() => [
    { id: 'individual' as LicenseTierId, titleFa: 'لایسنس توسعه فردی', subtitleFa: 'تحویل آنی دیجیتال • ۱ کاربر + آپدیت دائمی', multiplier: 1, deliveryType: 'digital' as const },
    { id: 'team' as LicenseTierId, titleFa: 'لایسنس تیمی و استارتاپی (تا ۱۰ نفر)', subtitleFa: 'تحویل آنی دیجیتال • مخزن مشترک تیم فنی', multiplier: 1.75, deliveryType: 'digital' as const },
    { id: 'enterprise_physical' as LicenseTierId, titleFa: 'لایسنس سازمانی + پکیج فیزیکی و دانگل امنیتی', subtitleFa: 'ارسال پستی پکیج + تحویل دیجیتال و فاکتور رسمی', multiplier: 2.4, deliveryType: 'physical' as const },
  ], []);

  const currentTier = licenseTiers.find((t) => t.id === selectedLicense) || licenseTiers[0];
  const effectivePrice = isFree ? 0 : Math.round((product.price * currentTier.multiplier) / 1000) * 1000;
  const effectiveOriginalPrice = isFree ? 0 : Math.round(((product.originalPrice || product.price * 1.25) * currentTier.multiplier) / 1000) * 1000;
  const bnplInstallment = isFree ? 0 : Math.ceil(effectivePrice / 4);

  const priceHistoryPoints = useMemo(() => {
    const base = effectivePrice || 1290000;
    return [
      { label: '۱ آبان', price: Math.round(base * 1.22), h: 'h-24' },
      { label: '۷ آبان', price: Math.round(base * 1.18), h: 'h-22' },
      { label: '۱۴ آبان', price: Math.round(base * 1.14), h: 'h-20' },
      { label: '۲۱ آبان', price: Math.round(base * 1.08), h: 'h-16' },
      { label: '۲۶ آبان', price: Math.round(base * 1.04), h: 'h-14' },
      { label: 'امروز', price: base, h: 'h-12' },
    ];
  }, [effectivePrice]);

  const technicalSpecs = useMemo(() => product.technicalSpecs?.length ? product.technicalSpecs : [
    { label: 'شناسه یکتای محصول', value: product.posterCode || product.slug },
    { label: 'خانواده هوش مصنوعی و استک', value: `${product.category} (${product.subCategory || 'Architecture'})` },
    { label: 'نسخه انتشار و سازگاری', value: product.version || product.level || 'v2.4 Enterprise' },
    { label: 'تعداد ماژول‌ها و دستورالعمل‌ها', value: `${product.modulesCount.toLocaleString('fa-IR')} ماژول استاندارد` },
    { label: 'نحوه تحویل سفارش', value: currentTier.deliveryType === 'physical' ? 'ارسال فیزیکی پکیج + دانلود آنی' : 'تحویل آنی در پیشخوان کاربری' },
    { label: 'خروجی استاندارد', value: product.expectedOutput || 'سورس‌کد تولیدی + مستندات SKILL.md' },
  ], [product, currentTier.deliveryType]);

  const relatedProducts = useMemo(() =>
    allProducts
      .filter((p) => p.id !== product.id && p.status === 'published')
      .sort((a, b) => (a.category === product.category ? -1 : b.category === product.category ? 1 : 0))
      .slice(0, 3),
  [allProducts, product]);

  const handleBuyWithSelectedTier = () => {
    if (isFree) { onQuickSkillAction(product); return; }
    onAddToCart({
      ...product,
      price: effectivePrice,
      originalPrice: effectiveOriginalPrice,
      deliveryType: currentTier.deliveryType,
      title: currentTier.id === 'individual' ? product.title : `${product.title} (${currentTier.titleFa})`,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
          <button type="button" onClick={onBackToStore} className="inline-flex items-center gap-1.5 font-extrabold text-stone-800 dark:text-white hover:text-[#1D4ED8] cursor-pointer">
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به فروشگاه</span>
          </button>
          <span>/</span>
          <button type="button" onClick={() => { onFilterByCategory?.(product.category); onBackToStore(); }} className="font-bold hover:text-[#1D4ED8] cursor-pointer">
            {product.category}
          </button>
          <span>/</span>
          <span className="font-bold text-stone-900 dark:text-slate-200 truncate max-w-xs">{product.title}</span>
        </div>
        <div className="text-[11px] font-mono text-stone-400 dark:text-slate-500" dir="ltr">/product/{product.slug}</div>
      </div>

      {/* Main 12-Col E-Commerce Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8">
          {/* Gallery & Video Box */}
          <div className="rounded-3xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-[#131C31] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-stone-50/70 dark:bg-slate-900/50">
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setActiveMediaTab('gallery')} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${activeMediaTab === 'gallery' ? accentStyles.button : 'text-stone-600 dark:text-slate-300 hover:bg-stone-200/60 dark:hover:bg-slate-800'}`}>
                  گالری تصاویر ({gallerySlides.length.toLocaleString('fa-IR')})
                </button>
                <button type="button" onClick={() => setActiveMediaTab('video')} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${activeMediaTab === 'video' ? accentStyles.button : 'text-stone-600 dark:text-slate-300 hover:bg-stone-200/60 dark:hover:bg-slate-800'}`}>
                  <Play className="w-3.5 h-3.5" />
                  <span>ویدئوی معرفی و دمو</span>
                </button>
              </div>
              {activeMediaTab === 'gallery' && (
                <button type="button" onClick={() => setIsLightboxOpen(true)} className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-slate-700 text-xs font-bold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>بزرگ‌نمایی GLightbox</span>
                </button>
              )}
            </div>

            {activeMediaTab === 'gallery' ? (
              <div className="p-4 sm:p-6 space-y-4">
                <div
                  className="relative aspect-16/10 rounded-2xl overflow-hidden bg-stone-100 dark:bg-slate-900 border border-stone-200/70 dark:border-slate-800 group cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <ProgressiveImage
                    src={gallerySlides[activeSlideIndex]}
                    alt={product.imageAlt || product.title}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${palette.outerBg} ${palette.accentText}`}>
                    {product.posterCode || '98.01'} · {product.category}
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setActiveSlideIndex((p) => (p - 1 + gallerySlides.length) % gallerySlides.length); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-stone-950/70 text-white flex items-center justify-center hover:bg-stone-950 cursor-pointer" aria-label="تصویر قبلی">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setActiveSlideIndex((p) => (p + 1) % gallerySlides.length); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-stone-950/70 text-white flex items-center justify-center hover:bg-stone-950 cursor-pointer" aria-label="تصویر بعدی">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2.5">
                  {gallerySlides.map((imgUrl, idx) => (
                    <button key={idx} type="button" onClick={() => setActiveSlideIndex(idx)} className={`aspect-16/10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${activeSlideIndex === idx ? 'border-[#1D4ED8] ring-2 ring-blue-500/20' : 'border-transparent opacity-65 hover:opacity-100'}`}>
                      <ProgressiveImage src={imgUrl} alt={`${product.title} - ${idx + 1}`} wrapperClassName="w-full h-full" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 bg-stone-950 text-white">
                <div className="aspect-16/9 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#131C31] to-blue-950 flex flex-col items-center justify-center p-6 text-center space-y-3 relative overflow-hidden">
                  <PosterGeometricSymbol type={product.posterIconType || 'braces'} strokeColor="#38BDF8" className="w-24 h-24 opacity-30 absolute" />
                  <div className="w-14 h-14 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center shadow-lg relative z-10"><Play className="w-6 h-6 fill-current" /></div>
                  <div className="space-y-1 relative z-10 max-w-md">
                    <div className="text-xs font-extrabold text-amber-300">پیش‌نمایش عملی اسکیل در محیط واقعی</div>
                    <h4 className="text-sm sm:text-base font-extrabold">{product.title}</h4>
                    <p className="text-xs text-slate-300">نحوه فراخوانی، ساختار ماژولار SKILL.md و خروجی استاندارد مهندسی در پروژه</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detail Tabs */}
          <div className="rounded-3xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-[#131C31] overflow-hidden shadow-sm">
            <div className="flex flex-wrap border-b border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-900/50 p-2 gap-1.5">
              {[
                { id: 'specs', label: 'مشخصات فنی و سرفصل‌ها', icon: Layers },
                { id: 'markdown', label: 'مستندات و ساختار SKILL.md', icon: FileCode2 },
                { id: 'price_chart', label: 'نمودار تغییرات قیمت ۳۰ روزه', icon: TrendingUp },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.id} type="button" onClick={() => setActiveDetailTab(t.id as 'specs' | 'markdown' | 'price_chart')} className={`px-4 py-2.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${activeDetailTab === t.id ? accentStyles.button : 'text-stone-600 dark:text-slate-300 hover:bg-stone-200/60 dark:hover:bg-slate-800'}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-6 space-y-6">
              {activeDetailTab === 'specs' && (
                <div className="space-y-6">
                  <div className="divide-y divide-stone-200 dark:divide-slate-800 border border-stone-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {technicalSpecs.map((spec, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3.5 text-xs bg-white dark:bg-[#131C31] odd:bg-stone-50/70 dark:odd:bg-slate-900/40">
                        <span className="font-bold text-stone-500 dark:text-slate-400">{spec.label}</span>
                        <span className="sm:col-span-2 font-extrabold text-stone-900 dark:text-white">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                  {product.syllabus && product.syllabus.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {product.syllabus.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-stone-200/80 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-900/40 flex items-start gap-2 text-xs font-bold">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'markdown' && (
                <pre dir="ltr" className="p-4 rounded-2xl bg-stone-950 text-stone-100 text-xs font-mono leading-relaxed overflow-x-auto max-h-72">
                  {product.skillMarkdownContent || `---\nname: ${product.slug}\ncategory: ${product.category}\nversion: ${product.version || '2.4.0'}\n---\n\n# ${product.title}\n${product.shortDescription}`}
                </pre>
              )}

              {activeDetailTab === 'price_chart' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">نمودار شفافیت قیمت در ۳۰ روز گذشته</h3>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold">کمترین قیمت ۳۰ روز اخیر</span>
                  </div>
                  <div className="grid grid-cols-6 gap-3 pt-4 items-end h-36 px-3 border-b border-stone-200 dark:border-slate-800">
                    {priceHistoryPoints.map((pt, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-extrabold text-stone-600 dark:text-slate-300 smooth-nums">{pt.price.toLocaleString('fa-IR')}</span>
                        <div className={`w-full rounded-t-xl transition-all ${pt.h} ${idx === priceHistoryPoints.length - 1 ? 'bg-emerald-600 shadow-md' : 'bg-[#1D4ED8]/65'}`} />
                        <span className="text-[11px] font-bold text-stone-500">{pt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {product.composerRows && product.composerRows.length > 0 && (
            <VisualComposerRenderer rows={product.composerRows} products={allProducts} onNavigateTab={(tab) => onNavigateTab(tab)} onSelectProduct={onSelectProduct} />
          )}
        </div>

        {/* Sticky Buy Box & BNPL Installment Calculator */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          <div className="p-6 rounded-3xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-[#131C31] shadow-lg space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${accentStyles.badge}`}>
                  {product.category} · {product.itemType === 'package' ? 'پکیج جامع' : 'اسکیل تخصصی'}
                </span>
                <button type="button" onClick={() => onToggleBookmark(product.id)} className={`p-2 rounded-xl border transition-colors cursor-pointer ${isBookmarked ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-stone-200 dark:border-slate-700 text-stone-500'}`} aria-label="نشان کردن محصول">
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white leading-snug">{product.title}</h1>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">{product.shortDescription}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold border border-emerald-500/20">
                  {product.productType === 'physical'
                    ? 'محصول فیزیکی · ارسال پستی سراسری'
                    : product.productType === 'subscription'
                    ? 'محصول اشتراکی VIP · دسترسی خودکار'
                    : 'محصول دانلودی · تحویل امن در پنل کاربری'}
                </span>
                {Array.isArray(product.downloadFiles) && product.downloadFiles.length > 0 && (
                  <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-[#1D4ED8] dark:text-sky-400 text-[11px] font-extrabold border border-blue-500/20 smooth-nums">
                    شامل {product.downloadFiles.length.toLocaleString('fa-IR')} فایل دانلودی محافظت‌شده
                  </span>
                )}
              </div>
            </div>

            {!isFree && (
              <div className="space-y-2">
                <div className="text-xs font-extrabold text-stone-700 dark:text-slate-300">انتخاب نوع لایسنس و نحوه تحویل:</div>
                {licenseTiers.map((tier) => {
                  const active = selectedLicense === tier.id;
                  return (
                    <button key={tier.id} type="button" onClick={() => setSelectedLicense(tier.id)} className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${active ? 'border-[#1D4ED8] bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-500/15' : 'border-stone-200 dark:border-slate-800 hover:border-stone-300'}`}>
                      <div className="space-y-0.5">
                        <div className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                          {tier.deliveryType === 'physical' ? <Truck className="w-3.5 h-3.5 text-amber-600" /> : <Zap className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{tier.titleFa}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-slate-400">{tier.subtitleFa}</div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white' : 'border-stone-400'}`}>
                        {active && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-slate-900/70 border border-stone-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-stone-500">مبلغ قابل پرداخت:</span>
                <div className="text-left">
                  {!isFree && effectiveOriginalPrice > effectivePrice && (
                    <div className="text-xs text-stone-400 line-through smooth-nums">{formatToman(effectiveOriginalPrice)}</div>
                  )}
                  <div className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white smooth-nums">
                    {isFree ? 'رایگان (متن‌باز)' : formatToman(effectivePrice)}
                  </div>
                </div>
              </div>

              {!isFree && (
                <div className="pt-3 border-t border-stone-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#1D4ED8] dark:text-sky-400">
                    <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4" /><span>خرید اقساطی ۴ قسطه (اسنپ‌پی / ترب‌پی / تارا)</span></span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[10px]">بدون سود</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    {['قسط اول (آنی)', 'قسط ماه ۲', 'قسط ماه ۳', 'قسط ماه ۴'].map((lbl, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-white dark:bg-[#131C31] border border-stone-200/80 dark:border-slate-800">
                        <div className="text-[10px] text-stone-500">{lbl}</div>
                        <div className="text-[11px] font-extrabold text-stone-900 dark:text-white smooth-nums mt-0.5">{bnplInstallment.toLocaleString('fa-IR')} ت</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button type="button" onClick={handleBuyWithSelectedTier} className={`w-full py-4 px-5 rounded-2xl text-sm font-extrabold shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all ${isFree ? (isClaimed ? 'bg-emerald-700 text-white' : 'bg-emerald-600 text-white') : accentStyles.button}`}>
              {isFree ? (
                <><Sparkles className="w-4 h-4" /><span>{isClaimed ? 'مشاهده و دانلود در پیشخوان من ←' : 'افزودن رایگان به حساب کاربری'}</span></>
              ) : (
                <><ShoppingBag className="w-4 h-4" /><span>افزودن به سبد و تسویه حساب آنی</span></>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-stone-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /><span>تضمین اصالت و آپدیت دائمی</span></div>
              <div className="flex items-center gap-1.5"><Package className="w-4 h-4 text-[#1D4ED8] shrink-0" /><span>صدور فاکتور رسمی و فروشگاهی</span></div>
            </div>
          </div>
        </aside>
      </div>

      {/* Product Reviews, Star Ratings & Q&A (mod_reviews_qa with Native Offline Captcha) */}
      <ProductReviewsQaWidget productId={product.id} />

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pt-8 border-t border-stone-200 dark:border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white">محصولات و اسکیل‌های مرتبط در {brandNameFa}</h2>
            <button type="button" onClick={onBackToStore} className="text-xs font-extrabold text-[#1D4ED8] hover:underline cursor-pointer">مشاهده کل کاتالوگ ←</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {relatedProducts.map((rel) => (
              <div key={rel.id} onClick={() => onSelectProduct(rel)} className="p-5 rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131C31] hover:border-[#1D4ED8] transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-xs">
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold text-[#1D4ED8]">{rel.category}</span>
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-white line-clamp-1">{rel.title}</h3>
                  <p className="text-xs text-stone-500 line-clamp-2">{rel.shortDescription}</p>
                </div>
                <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-xs font-extrabold">
                  <span className="text-emerald-700 dark:text-emerald-400 smooth-nums">{rel.price === 0 ? 'رایگان' : formatToman(rel.price)}</span>
                  <span className="text-[#1D4ED8]">مشاهده محصول ←</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GLightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setIsLightboxOpen(false)}>
          <div className="relative max-w-4xl w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-white">
              <span className="text-xs sm:text-sm font-extrabold">{product.title} ({(activeSlideIndex + 1).toLocaleString('fa-IR')} از {gallerySlides.length.toLocaleString('fa-IR')})</span>
              <button type="button" onClick={() => setIsLightboxOpen(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="aspect-16/10 rounded-2xl overflow-hidden bg-black border border-white/15">
              <img src={gallerySlides[activeSlideIndex]} alt={product.title} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
