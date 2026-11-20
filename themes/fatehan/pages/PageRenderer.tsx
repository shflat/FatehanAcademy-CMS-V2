import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { formatToman, formatPersianNumber } from '../utils/formatters';
import { BiDiText } from '../ui/BiDiText';
import { FatehanLogo } from '../ui/FatehanLogo';
import { BuilderBlock, ViewportMode, DeviceFontSize, DeviceSpacingPreset } from '../types';
import {
  ArrowUpLeft,
  ShieldCheck,
  Server,
  Cpu,
  ChevronDown,
  Play,
  Clock,
  Star,
  Sparkles,
  Code2,
  Layers,
  Send,
  ShoppingBag,
  Eye,
  Film,
} from 'lucide-react';

export interface PageRendererProps {
  overrideBlocks?: BuilderBlock[];
  overrideViewport?: ViewportMode;
  activePageSlug?: string;
}

const HEADING_FONT_SIZE_MAP: Record<DeviceFontSize, string> = {
  sm: 'text-base sm:text-lg',
  md: 'text-lg sm:text-xl',
  lg: 'text-xl sm:text-2xl',
  xl: 'text-2xl sm:text-4xl',
};

const PADDING_PRESET_MAP: Record<DeviceSpacingPreset, string> = {
  compact: 'p-4 sm:p-5',
  normal: 'p-5 sm:p-7',
  spacious: 'p-6 sm:p-10',
};

export const PageRenderer: React.FC<PageRendererProps> = ({
  overrideBlocks,
  overrideViewport,
  activePageSlug,
}) => {
  const {
    state,
    settings,
    viewportMode,
    notify,
    navigateStore,
    addToCart,
    cartItems,
    setIsCartDrawerOpen,
    openVideoModal,
  } = useFatehanTheme();

  const [openFaqIdx, setOpenFaqIdx] = useState<number>(0);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [heroVideoLoopEnabled, setHeroVideoLoopEnabled] = useState<boolean>(true);

  if (!state) return null;

  const currentViewport = overrideViewport || viewportMode;
  const isMobile = currentViewport === 'mobile';
  const isTablet = currentViewport === 'tablet';
  const isDesktop = currentViewport === 'desktop';

  const sourceBlocks = overrideBlocks || state.builderBlocks;

  const visibleBlocks = sourceBlocks.filter((b) => {
    if (activePageSlug && b.pageSlug && b.pageSlug !== activePageSlug) return false;
    if (isMobile && b.mobileHidden) return false;
    if (isDesktop && b.desktopHidden) return false;
    if (isTablet && b.tabletHidden) return false;
    return true;
  });

  const getBlockHeadingClass = (b: BuilderBlock) => {
    const sz: DeviceFontSize = isMobile
      ? b.mobileFontSize || 'md'
      : isTablet
      ? b.tabletFontSize || 'lg'
      : b.desktopFontSize || 'lg';
    return HEADING_FONT_SIZE_MAP[sz];
  };

  const getBlockPaddingClass = (b: BuilderBlock) => {
    const pad: DeviceSpacingPreset = isMobile
      ? b.mobilePadding || 'compact'
      : isTablet
      ? b.tabletPadding || 'normal'
      : b.desktopPadding || 'normal';
    return PADDING_PRESET_MAP[pad];
  };

  const getDeviceGridClass = (b: BuilderBlock, defaultDesktop = 3) => {
    if (isMobile) {
      return b.mobileGridCols === 2 ? 'grid-cols-2 gap-3' : 'grid-cols-1 gap-3.5';
    }
    if (isTablet) {
      const tCols = b.tabletGridCols || 2;
      return tCols === 1
        ? 'grid-cols-1 gap-4'
        : tCols === 3
        ? 'grid-cols-3 gap-4'
        : 'grid-cols-2 gap-4';
    }
    const dCols = b.desktopGridCols || defaultDesktop;
    if (dCols === 1) return 'grid-cols-1 gap-5';
    if (dCols === 2) return 'grid-cols-1 md:grid-cols-2 gap-5';
    if (dCols === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5';
    return 'grid-cols-1 md:grid-cols-3 gap-5';
  };

  return (
    <div className="space-y-7 py-5 w-full min-w-0">
      {visibleBlocks.map((block, blockIndex) => {
        const headingSizeCls = getBlockHeadingClass(block);
        const paddingCls = getBlockPaddingClass(block);

        // 1. HERO BANNER with Floating FX, Background Video Scrim & Pulse Ripple Video Teaser Button
        if (block.type === 'hero_banner') {
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.35 }}
              className={`relative bg-slate-900 text-white rounded-3xl border border-slate-800 w-full min-w-0 overflow-hidden ${paddingCls} ${
                isDesktop
                  ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'
                  : 'flex flex-col'
              }`}
            >
              {/* Animated Background Loop Scrim when enabled */}
              {heroVideoLoopEnabled && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <motion.div
                    animate={{
                      scale: [1, 1.06, 1],
                      opacity: [0.22, 0.34, 0.22],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full h-full bg-gradient-to-tr from-indigo-950 via-slate-900 to-amber-950/40"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/70" />
                </div>
              )}

              {/* Text & Primary Actions */}
              <div className={`relative z-10 ${isDesktop ? 'lg:col-span-7' : 'w-full'} space-y-4 min-w-0`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-[11px] font-mono text-indigo-400"
                  >
                    <bdi dir="ltr" className="bidi-safe">
                      DPA TECH ENTERPRISE INFRASTRUCTURE · ISO/IEC 27001
                    </bdi>
                  </motion.div>

                  <button
                    type="button"
                    onClick={() => setHeroVideoLoopEnabled((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border border-slate-700 cursor-pointer"
                  >
                    <Film className="w-3 h-3 text-amber-400" />
                    <span>{heroVideoLoopEnabled ? 'پس‌زمینه زنده: فعال' : 'پس‌زمینه زنده: غیرفعال'}</span>
                  </button>
                </div>

                <BiDiText
                  as="h1"
                  className={`${headingSizeCls} font-extrabold leading-snug text-white`}
                >
                  {block.heading}
                </BiDiText>
                <BiDiText
                  as="p"
                  className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl"
                >
                  {block.subheading}
                </BiDiText>

                <div
                  className={`pt-2 ${
                    isMobile
                      ? 'flex flex-col gap-2.5 w-full'
                      : 'flex flex-wrap items-center gap-3'
                  }`}
                >
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigateStore('/shop')}
                    className={`${
                      isMobile ? 'w-full justify-center' : ''
                    } inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-lg shadow-indigo-600/25`}
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <BiDiText>{block.ctaPrimary || 'ورود به فروشگاه و کاتالوگ'}</BiDiText>
                  </motion.button>

                  {/* Pulse Ripple Video Teaser Button */}
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      openVideoModal({
                        title: block.heading,
                        subtitle: block.subheading,
                      })
                    }
                    className={`${
                      isMobile ? 'w-full justify-center' : ''
                    } relative inline-flex items-center gap-2.5 px-5 py-2.5 bg-slate-800/90 hover:bg-slate-700 border border-amber-400/50 text-amber-300 text-xs font-extrabold rounded-xl transition-colors cursor-pointer whitespace-nowrap`}
                  >
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <Play className="relative inline-flex w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </span>
                    <BiDiText>مشاهده تیزر و ویدیوی معرفی</BiDiText>
                  </motion.button>
                </div>
              </div>

              {/* Floating Hero Cluster Card: Explicitly relative w-full mt-4 in Mobile/Tablet */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className={`relative z-10 ${
                  isDesktop
                    ? 'lg:col-span-5 min-h-[215px] p-6 flex flex-col justify-between'
                    : 'relative w-full mt-4 p-4 flex flex-col gap-3'
                } bg-gradient-to-br from-slate-800/95 via-indigo-950/90 to-slate-900/95 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-300">
                  <bdi dir="ltr" className="bidi-safe whitespace-nowrap">
                    CLUSTER: DPA-EDGE-X90
                  </bdi>
                  <bdi dir="ltr" className="bidi-safe text-emerald-400 font-bold whitespace-nowrap">
                    UPTIME: 99.99%
                  </bdi>
                </div>
                <div
                  className={`${
                    isDesktop ? 'my-4 gap-6' : 'my-2 gap-5'
                  } flex items-center justify-center`}
                >
                  <Server
                    className={`${
                      isMobile ? 'w-8 h-8' : 'w-11 h-11'
                    } text-indigo-400 stroke-[1.5] shrink-0`}
                  />
                  <ShieldCheck
                    className={`${
                      isMobile ? 'w-8 h-8' : 'w-11 h-11'
                    } text-emerald-400 stroke-[1.5] shrink-0`}
                  />
                  <Cpu
                    className={`${
                      isMobile ? 'w-8 h-8' : 'w-11 h-11'
                    } text-sky-400 stroke-[1.5] shrink-0`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/60 text-[11px] text-slate-300">
                  <span>پشتیبانی درگاه زرین‌پال و نوینوپی</span>
                  <button
                    type="button"
                    onClick={() => navigateStore('/shop')}
                    className="text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    خرید آنی ←
                  </button>
                </div>
              </motion.div>
            </motion.section>
          );
        }

        // 2. ANIMATED COUNTER / KPI STRIP
        if (block.type === 'kpi_strip') {
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.3, delay: Math.min(0.2, blockIndex * 0.04) }}
              className={`bg-white border border-slate-200 rounded-2xl ${paddingCls} space-y-5 w-full min-w-0 overflow-hidden`}
            >
              <div className="border-b border-slate-100 pb-3.5">
                <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900 leading-snug`}>
                  {block.heading}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {block.subheading}
                </BiDiText>
              </div>

              <div
                className={`grid ${
                  isDesktop && (block.desktopGridCols || 4) === 4
                    ? 'grid-cols-2 lg:grid-cols-4 gap-4'
                    : isMobile && block.mobileGridCols === 1
                    ? 'grid-cols-1 gap-3'
                    : 'grid-cols-2 gap-3'
                }`}
              >
                {[
                  { val: '+۴۸۰', lbl: 'سازمان و هلدینگ مجهز به هسته دیپاتک', color: 'text-slate-900' },
                  { val: '۹۹.۹۸٪', lbl: 'پایداری سرویس و مقاومت در برابر WAF', color: 'text-emerald-700' },
                  { val: '۳ نما', lbl: 'رندرینگ اختصاصی دسکتاپ، تبلت و موبایل', color: 'text-indigo-700' },
                  { val: '۵ فونت', lbl: 'موتور تایپوگرافی و چاپ فاکتور رسمی A4/A5', color: 'text-slate-900' },
                ].map((kpi, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: idx * 0.06 }}
                    whileHover={{ y: -2 }}
                    className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-100 min-w-0"
                  >
                    <div className={`text-xl sm:text-2xl font-extrabold ${kpi.color} font-mono tabular-nums whitespace-nowrap`}>
                      {kpi.val}
                    </div>
                    <BiDiText as="div" className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-snug">
                      {kpi.lbl}
                    </BiDiText>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          );
        }

        // 3. FEATURE GRID (باکس آیکون و ویژگی‌ها با Staggered Scroll Reveal)
        if (block.type === 'feature_grid') {
          const features = block.itemsList || [
            {
              title: 'رندرینگ سه‌حالته مستقل',
              subtitle: 'تنظیم چیدمان مجزا برای موبایل، تبلت و دسکتاپ',
              badge: 'Triple-Viewport',
            },
            {
              title: 'سپر امنیتی زنده WAF',
              subtitle: 'محافظت بلادرنگ در برابر SQLi و XSS',
              badge: 'Security',
            },
            {
              title: 'چاپ رسمی A4 / A5 / 80mm',
              subtitle: 'صدور آنی فاکتور رسمی مالیاتی و برچسب پستی',
              badge: 'Print Engine',
            },
          ];
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.3 }}
              className={`bg-white border border-slate-200 rounded-2xl ${paddingCls} space-y-5 w-full min-w-0 overflow-hidden`}
            >
              <div>
                <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900 leading-snug`}>
                  {block.heading}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {block.subheading}
                </BiDiText>
              </div>
              <div className={`grid ${getDeviceGridClass(block, 3)}`}>
                {features.map((ft, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: idx * 0.06 }}
                    whileHover={{ y: -3 }}
                    className="p-4 bg-slate-50 border border-slate-200/80 hover:border-indigo-300 rounded-xl space-y-2 min-w-0 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
                      {ft.badge && (
                        <bdi
                          dir="ltr"
                          className="bidi-safe text-[10px] font-mono text-indigo-700 font-bold"
                        >
                          {ft.badge}
                        </bdi>
                      )}
                    </div>
                    <BiDiText as="h3" className="text-sm font-bold text-slate-900">
                      {ft.title}
                    </BiDiText>
                    <BiDiText as="p" className="text-xs text-slate-600 leading-relaxed">
                      {ft.subtitle}
                    </BiDiText>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          );
        }

        // 4. ROADMAP / STEP TIMELINE (نقشه راه و تایملاین مرحله‌ای)
        if (block.type === 'roadmap_timeline') {
          const steps = block.itemsList || [
            { title: 'گام ۱: ممیزی فنی', subtitle: 'تحلیل زیرساخت و طراحی اسکیما', badge: 'مرحله اول' },
            { title: 'گام ۲: مهاجرت دیتابیس', subtitle: 'انتقال امن به PostgreSQL 16', badge: 'مرحله دوم' },
            { title: 'گام ۳: طراحی ۳ نما', subtitle: 'تنظیم موبایل، تبلت و دسکتاپ', badge: 'مرحله سوم' },
            { title: 'گام ۴: بهره‌برداری', subtitle: 'تست امنیتی WAF و تحویل نهایی', badge: 'مرحله چهارم' },
          ];
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.3 }}
              className={`bg-white border border-slate-200 rounded-2xl ${paddingCls} space-y-5 w-full min-w-0 overflow-hidden`}
            >
              <div>
                <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900 leading-snug`}>
                  {block.heading}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {block.subheading}
                </BiDiText>
              </div>
              <div className={`grid ${getDeviceGridClass(block, 4)}`}>
                {steps.map((st, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: idx * 0.06 }}
                    whileHover={{ y: -2 }}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 min-w-0"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-indigo-600 font-bold">
                      <span>0{idx + 1}.</span>
                      <span>{st.badge}</span>
                    </div>
                    <BiDiText as="h3" className="text-sm font-bold text-slate-900">
                      {st.title}
                    </BiDiText>
                    <BiDiText as="p" className="text-xs text-slate-600 leading-relaxed">
                      {st.subtitle}
                    </BiDiText>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          );
        }

        // 5. PRODUCT SHOWCASE (Interactive Variations, Quick View -> /product/:id, Slide-over Cart Add)
        if (block.type === 'product_showcase') {
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 w-full min-w-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900 leading-snug`}>
                    {block.heading}
                  </BiDiText>
                  <BiDiText as="p" className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {block.subheading}
                  </BiDiText>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigateStore('/shop')}
                    className="px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    مشاهده آرشیو کامل فروشگاه (/shop)
                  </motion.button>
                  {cartItems.length > 0 && (
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setIsCartDrawerOpen(true)}
                      className="px-3.5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl cursor-pointer whitespace-nowrap"
                    >
                      سبد خرید فعال ({formatPersianNumber(cartItems.reduce((s, i) => s + i.qty, 0))})
                    </motion.button>
                  )}
                </div>
              </div>

              <div className={`grid ${getDeviceGridClass(block, 4)}`}>
                {state.products.map((prd, pIdx) => {
                  const hasVars = prd.variations && prd.variations.length > 0;
                  const chosenVarId =
                    selectedVariations[prd.id] || (hasVars ? prd.variations![0].id : '');
                  const activeVar = hasVars
                    ? prd.variations!.find((v) => v.id === chosenVarId) || prd.variations![0]
                    : undefined;

                  const displayImg =
                    activeVar?.imageUrl ||
                    prd.featuredImageUrl ||
                    '/assets/kits/kit-01.jpg';
                  const displaySku = activeVar ? activeVar.sku : prd.sku;
                  const displayRegularPrice = activeVar ? activeVar.priceToman : prd.priceToman;
                  const displaySalePrice = activeVar ? activeVar.salePriceToman : prd.salePriceToman;
                  const displayStock = activeVar ? activeVar.stock : prd.stock;

                  return (
                    <motion.div
                      key={prd.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.25, delay: pIdx * 0.06 }}
                      whileHover={{ y: -3 }}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-indigo-300 hover:shadow-lg transition-all min-w-0"
                    >
                      <div>
                        {/* Real Product / Variation Image with Click to Product Detail */}
                        <div
                          onClick={() => navigateStore(`/product/${prd.id}`)}
                          className="relative h-44 w-full bg-slate-900 overflow-hidden cursor-pointer group"
                        >
                          <img
                            src={displayImg}
                            alt={prd.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-900/85 text-amber-400 rounded-md backdrop-blur-xs">
                              {prd.type}
                            </span>
                            {displaySalePrice && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded-md">
                                تخفیف ویژه
                              </span>
                            )}
                          </div>
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-mono bg-slate-900/80 text-white rounded">
                            <bdi dir="ltr">{displaySku}</bdi>
                          </div>
                        </div>

                        <div className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-500 truncate">{prd.category || 'سازمانی'}</span>
                            <span
                              className={`font-bold whitespace-nowrap ${
                                displayStock > 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {displayStock > 0
                                ? `موجودی: ${formatPersianNumber(displayStock)} عدد`
                                : 'ناموجود'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigateStore(`/product/${prd.id}`)}
                            className="text-right block w-full cursor-pointer group"
                          >
                            <BiDiText
                              as="h3"
                              className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug"
                            >
                              {prd.name}
                            </BiDiText>
                          </button>

                          {prd.description && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {prd.description}
                            </p>
                          )}

                          {/* Interactive Variation Selector */}
                          {hasVars && (
                            <div className="pt-1 space-y-1">
                              <label className="block text-[10px] font-bold text-indigo-900">
                                انتخاب متغیر (تغییر زنده قیمت، SKU و تصویر):
                              </label>
                              <select
                                value={activeVar?.id}
                                onChange={(e) =>
                                  setSelectedVariations((prev) => ({
                                    ...prev,
                                    [prd.id]: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 text-[11px] font-medium bg-indigo-50/60 border border-indigo-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600"
                              >
                                {prd.variations!.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.attributeSummary} ({formatToman(v.salePriceToman || v.priceToman)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-mono tabular-nums">
                            {displaySalePrice ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] line-through text-slate-400">
                                  {formatToman(displayRegularPrice)}
                                </span>
                                <span className="text-xs font-extrabold text-emerald-700 whitespace-nowrap">
                                  {formatToman(displaySalePrice)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
                                {formatToman(displayRegularPrice)}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => navigateStore(`/product/${prd.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>جزئیات</span>
                          </button>
                        </div>

                        <motion.button
                          type="button"
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => addToCart(prd, activeVar?.id, 1, true)}
                          className="w-full py-2 px-3 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>افزودن به سبد خرید</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          );
        }

        // 6. PRICING TABLE (جدول مقایسه پلن‌ها و قیمت‌گذاری)
        if (block.type === 'pricing_table') {
          const plans = block.itemsList || [
            { title: 'پلن استاندارد (Growth)', subtitle: '۵ ماژول فعال · پشتیبانی تیکتی', badge: '۲۴,۰۰۰,۰۰۰ تومان' },
            { title: 'پلن سازمانی (Enterprise Pro)', subtitle: '۱۰ ماژول کامل + هوش مصنوعی + چاپ رسمی', badge: '۴۲,۰۰۰,۰۰۰ تومان' },
            { title: 'پلن اختصاصی هلدینگ و بانک‌ها', subtitle: 'کلاستر اختصاصی PostgreSQL + سورس کامل', badge: 'توافقی / VIP' },
          ];
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.3 }}
              className={`bg-white border border-slate-200 rounded-2xl ${paddingCls} space-y-5 w-full min-w-0 overflow-hidden`}
            >
              <div>
                <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900 leading-snug`}>
                  {block.heading}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {block.subheading}
                </BiDiText>
              </div>
              <div className={`grid ${getDeviceGridClass(block, 3)}`}>
                {plans.map((pl, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -3 }}
                    className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 min-w-0 ${
                      idx === 1
                        ? 'bg-slate-900 text-white border-indigo-500'
                        : 'bg-slate-50 text-slate-900 border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <BiDiText as="h3" className="text-sm font-extrabold">
                          {pl.title}
                        </BiDiText>
                        {idx === 1 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-bold whitespace-nowrap">
                            پیشنهاد دیپاتک
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-base font-mono font-extrabold whitespace-nowrap ${
                          idx === 1 ? 'text-amber-400' : 'text-indigo-700'
                        }`}
                      >
                        {pl.badge}
                      </div>
                      <BiDiText
                        as="p"
                        className={`text-xs leading-relaxed ${
                          idx === 1 ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {pl.subtitle}
                      </BiDiText>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigateStore('/product/PRD-1003')}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        idx === 1
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {block.ctaPrimary || 'انتخاب و سفارش پلن'}
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          );
        }

        // 7. FAQ ACCORDION
        if (block.type === 'faq_accordion') {
          const faqs = block.itemsList || [
            {
              title: 'آیا اطلاعات سایت قدیمی بدون افت رتبه گوگل منتقل می‌شود؟',
              subtitle: 'بله، ماژول ریدایرکت ۳۰۱ و اسکیما JSON-LD تمام لینک‌های قبلی را بدون خطای ۴۰۴ نگاشت می‌کند.',
            },
            {
              title: 'آیا می‌توان چیدمان موبایل را کاملاً متفاوت از دسکتاپ تنظیم کرد؟',
              subtitle: 'بله، در صفحه‌ساز ۳ حالته دیپاتک تعداد ستون، سایز فونت و نمایش هر بلوک به تفکیک دستگاه تنظیم می‌شود.',
            },
          ];
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.3 }}
              className={`bg-white border border-slate-200 rounded-2xl ${paddingCls} space-y-4 w-full min-w-0 overflow-hidden`}
            >
              <div>
                <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900 leading-snug`}>
                  {block.heading}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {block.subheading}
                </BiDiText>
              </div>
              <div className="space-y-2.5">
                {faqs.map((fq, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                        className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between gap-3 text-right text-xs font-bold text-slate-900 cursor-pointer"
                      >
                        <BiDiText>{fq.title}</BiDiText>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                          <BiDiText>{fq.subtitle}</BiDiText>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.section>
          );
        }

        // 8. TESTIMONIALS
        if (block.type === 'testimonials') {
          const reviews = state.cmsComments.filter((c) => c.status === 'Approved');
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.3 }}
              className={`bg-white border border-slate-200 rounded-2xl ${paddingCls} space-y-4 w-full min-w-0 overflow-hidden`}
            >
              <div>
                <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900`}>
                  {block.heading}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-500 mt-1">
                  {block.subheading}
                </BiDiText>
              </div>
              <div className={`grid ${getDeviceGridClass(block, 2)}`}>
                {reviews.map((rv) => (
                  <div key={rv.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{rv.authorName}</span>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: rv.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <div className="text-[11px] text-indigo-600 font-medium">{rv.authorRoleOrOrg}</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rv.body}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          );
        }

        // 9. SMART FORM
        if (block.type === 'smart_form') {
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.3 }}
              className={`bg-white border border-slate-200 rounded-2xl ${paddingCls} space-y-4 w-full min-w-0 overflow-hidden`}
            >
              <div>
                <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900`}>
                  {block.heading}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-500 mt-1">
                  {block.subheading}
                </BiDiText>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  notify('درخواست مشاوره سازمانی شما در CRM دیپاتک ثبت شد.');
                  setLeadName('');
                  setLeadPhone('');
                }}
                className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}
              >
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="نام و نام خانوادگی / نام سازمان"
                  className="px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-slate-50"
                />
                <input
                  type="text"
                  dir="ltr"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="0912..."
                  className="px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl bg-slate-50"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{block.ctaPrimary || 'ارسال درخواست مشاوره'}</span>
                </button>
              </form>
            </motion.section>
          );
        }

        // 10. VIDEO LAB / INTERACTIVE DEMO (Opens Full-Screen Video Lightbox Modal)
        if (block.type === 'video_lab') {
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.3 }}
              className={`bg-slate-900 text-white border border-slate-800 rounded-2xl ${paddingCls} space-y-4 w-full min-w-0 overflow-hidden`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <BiDiText as="h2" className={`${headingSizeCls} font-bold text-white`}>
                    {block.heading}
                  </BiDiText>
                  <BiDiText as="p" className="text-xs text-slate-400 mt-1">
                    {block.subheading}
                  </BiDiText>
                </div>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() =>
                    openVideoModal({
                      title: block.heading,
                      subtitle: block.subheading,
                      videoUrl: block.videoUrl,
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{block.ctaPrimary || 'مشاهده تیزر و ویدیوی معرفی'}</span>
                </motion.button>
              </div>
              <div
                onClick={() =>
                  openVideoModal({
                    title: block.heading,
                    subtitle: block.subheading,
                    videoUrl: block.videoUrl,
                  })
                }
                className="h-44 sm:h-56 rounded-xl bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900 border border-slate-700 flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer group"
              >
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-14 w-14 rounded-full bg-indigo-500/40" />
                  <div className="relative w-14 h-14 rounded-full bg-indigo-600 group-hover:bg-amber-500 transition-colors flex items-center justify-center shadow-xl">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <span className="text-xs font-mono text-indigo-300 mt-2" dir="ltr">
                  {block.videoUrl || 'visual-builder-3view-walkthrough.mp4 · 1080p 60fps'}
                </span>
              </div>
            </motion.section>
          );
        }

        // 11. COUNTDOWN TIMER
        if (block.type === 'countdown_timer') {
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.3 }}
              className={`bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl ${paddingCls} flex flex-col ${
                isDesktop ? 'lg:flex-row lg:items-center' : ''
              } justify-between gap-4 w-full min-w-0 overflow-hidden`}
            >
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                  <Clock className="w-4 h-4" />
                  <span>جشنواره فروش سازمانی دیپاتک</span>
                </div>
                <BiDiText as="h2" className={`${headingSizeCls} font-extrabold`}>
                  {block.heading}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-300">
                  {block.subheading}
                </BiDiText>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center font-mono tabular-nums shrink-0">
                {[
                  { val: '۰۴', lbl: 'روز' },
                  { val: '۱۲', lbl: 'ساعت' },
                  { val: '۴۵', lbl: 'دقیقه' },
                  { val: '۱۸', lbl: 'ثانیه' },
                ].map((t, i) => (
                  <div key={i} className="p-2.5 bg-white/10 rounded-xl border border-white/15">
                    <div className="text-base sm:text-lg font-extrabold text-amber-400">{t.val}</div>
                    <div className="text-[10px] text-slate-300">{t.lbl}</div>
                  </div>
                ))}
              </div>
            </motion.section>
          );
        }

        // 12. CUSTOM HTML / CSS WIDGET
        if (block.type === 'custom_code') {
          return (
            <section
              key={block.id}
              className={`bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl ${paddingCls} space-y-3 w-full min-w-0 overflow-hidden`}
            >
              <div className="flex items-center justify-between text-xs text-indigo-400 font-mono">
                <span className="inline-flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" />
                  <span>CUSTOM HTML / CSS SANDBOX</span>
                </span>
                <span>{block.id}</span>
              </div>
              <BiDiText as="h3" className="text-sm font-bold text-white">
                {block.heading}
              </BiDiText>
              <pre
                dir="ltr"
                className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto"
              >
                {block.customHtml ||
                  `<div class="dpa-custom-banner">\n  <h4>${block.heading}</h4>\n  <p>${block.subheading}</p>\n</div>`}
              </pre>
            </section>
          );
        }

        // 13. BLOG GRID
        if (block.type === 'blog_grid') {
          return (
            <motion.section
              key={block.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 w-full min-w-0"
            >
              <div>
                <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900`}>
                  {block.heading}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-500 mt-1">
                  {block.subheading}
                </BiDiText>
              </div>
              <div className={`grid ${getDeviceGridClass(block, 2)}`}>
                {state.cmsPosts.slice(0, 4).map((post) => (
                  <motion.article
                    key={post.id}
                    whileHover={{ y: -2 }}
                    onClick={() => navigateStore(`/blog/${post.id}`)}
                    className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 sm:p-5 space-y-2 min-w-0 overflow-hidden cursor-pointer"
                  >
                    <div className="text-xs text-slate-500">
                      <BiDiText>
                        {`${post.type} · ${post.category} · زمان مطالعه: ${formatPersianNumber(
                          post.readingTimeMinutes || 5
                        )} دقیقه`}
                      </BiDiText>
                    </div>
                    <BiDiText as="h3" className="text-sm font-bold text-slate-900 leading-snug">
                      {post.title}
                    </BiDiText>
                    <BiDiText as="p" className="text-xs text-slate-600 leading-relaxed">
                      {post.excerpt}
                    </BiDiText>
                  </motion.article>
                ))}
              </div>
            </motion.section>
          );
        }

        // 14. DEFAULT FLEXIBLE CARD
        return (
          <motion.section
            key={block.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.3 }}
            className={`bg-white border border-slate-200 rounded-2xl ${paddingCls} flex flex-col ${
              isMobile ? 'gap-4' : 'sm:flex-row sm:items-center justify-between gap-6'
            } w-full min-w-0 overflow-hidden`}
          >
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <BiDiText>{block.title}</BiDiText>
              </div>
              <BiDiText as="h2" className={`${headingSizeCls} font-bold text-slate-900 leading-snug`}>
                {block.heading}
              </BiDiText>
              <BiDiText as="p" className="text-xs text-slate-600 leading-relaxed">
                {block.subheading}
              </BiDiText>
            </div>
            {block.ctaPrimary && (
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigateStore('/shop')}
                className={`${
                  isMobile ? 'w-full justify-center' : ''
                } inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer whitespace-nowrap`}
              >
                <BiDiText>{block.ctaPrimary}</BiDiText>
                <ArrowUpLeft className="w-4 h-4 shrink-0" />
              </motion.button>
            )}
          </motion.section>
        );
      })}

      {/* Latest Technical Articles Section (When not inside override builder preview) */}
      {!overrideBlocks && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 pt-4 border-t border-slate-200 w-full min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <BiDiText as="h2" className="text-base sm:text-lg font-bold text-slate-900">
              آخرین مقالات تخصصی و اخبار {settings.academyNameFa}
            </BiDiText>
            <button
              type="button"
              onClick={() => navigateStore('/blog')}
              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              آرشیو مقالات ←
            </button>
          </div>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {state.cmsPosts.slice(0, 4).map((post) => (
              <motion.article
                key={post.id}
                whileHover={{ y: -2 }}
                onClick={() => navigateStore(`/blog/${post.id}`)}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 sm:p-5 space-y-2 min-w-0 overflow-hidden cursor-pointer"
              >
                <div className="text-xs text-slate-500">
                  <BiDiText>
                    {`${post.type} · ${post.category} · امتیاز E-E-A-T: ${formatPersianNumber(post.seoScore)}`}
                  </BiDiText>
                </div>
                <BiDiText as="h3" className="text-sm font-bold text-slate-900 leading-snug">
                  {post.title}
                </BiDiText>
                <BiDiText as="p" className="text-xs text-slate-600 leading-relaxed">
                  {post.excerpt}
                </BiDiText>
              </motion.article>
            ))}
          </div>
        </motion.section>
      )}

      {/* Standardized Storefront Brand Summary Footer */}
      {!overrideBlocks && (
        <footer className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 min-w-0">
            <FatehanLogo size="sm" variant="mark" />
            <BiDiText className="font-bold text-slate-900 truncate">
              {settings.academyNameFa}
            </BiDiText>
          </div>
          <div className="font-mono text-[11px] text-amber-600 font-semibold whitespace-nowrap truncate" dir="ltr">
            {settings.academyNameEn} · {settings.mottoEn}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1.5 border-t border-slate-100 font-mono text-[11px] text-indigo-600" dir="ltr">
            <a href={settings.url} target="_blank" rel="noreferrer" className="hover:underline font-semibold">
              {settings.domain}
            </a>
          </div>
        </footer>
      )}
    </div>
  );
};
