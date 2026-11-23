import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Layers,
  Crown,
  User as UserIcon,
  LogOut,
  ShoppingBag,
  Move,
  RotateCcw,
  Home,
  Gift,
  FileText,
  Info,
  PhoneCall,
  SlidersHorizontal,
  Check,
  X,
} from 'lucide-react';
import { DEFAULT_BRAND_LOGO_URL } from '../../data/defaults';
import type {
  ActiveTab,
  CatalogFilter,
  CmsDynamicPage,
  ThemeConfig,
  UserRoleType,
} from '../../core/types';
import type { AccentStyleTokens } from '../accentStyles';

interface SiteHeaderProps {
  activeTab: ActiveTab;
  themeConfig: ThemeConfig;
  accentStyles: AccentStyleTokens;
  userRole: UserRoleType;
  isLoggedIn: boolean;
  canAccessAdmin: boolean;
  displayUserName: string | null;
  claimedCount: number;
  cartTotalItems: number;
  isMuuriDragEnabled: boolean;
  dynamicPages?: CmsDynamicPage[];
  onNavigate: (tab: ActiveTab) => void;
  onSelectToolAndScroll?: (tool: CatalogFilter) => void;
  onOpenDynamicPage?: (page: CmsDynamicPage) => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenCart: () => void;
  onToggleMuuriDrag: () => void;
  onResetDraggedElements: () => void;
  onUpdateHeaderLogoSize?: (sizePx: number, persist?: boolean) => void;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  activeTab,
  themeConfig,
  userRole,
  isLoggedIn,
  canAccessAdmin,
  displayUserName,
  claimedCount,
  cartTotalItems,
  isMuuriDragEnabled,
  dynamicPages = [],
  onNavigate,
  onSelectToolAndScroll,
  onOpenDynamicPage,
  onOpenAuthModal,
  onLogout,
  onOpenCart,
  onToggleMuuriDrag,
  onResetDraggedElements,
  onUpdateHeaderLogoSize,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoSizerOpen, setLogoSizerOpen] = useState(false);
  const headerLogoSizePx = Math.min(
    120,
    Math.max(36, Number(themeConfig.headerLogoSizePx) || 68)
  );

  useEffect(() => {
    const updateScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
      setScrollProgress(pct);
      setIsScrolled(scrollTop > 14);
    };

    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [activeTab]);

  const aboutPage = dynamicPages.find(
    (p) => p.status === 'published' && (p.slug === 'about' || p.schemaType === 'AboutPage')
  );
  const contactPage = dynamicPages.find(
    (p) => p.status === 'published' && (p.slug === 'contact' || p.schemaType === 'ContactPage')
  );

  return (
    <>
      <header
        className={`relative md:fixed md:top-0 md:inset-x-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 dark:bg-[#0F172A]/95 md:bg-white/75 md:dark:bg-[#0B132B]/78 md:backdrop-blur-2xl md:backdrop-saturate-180 border-b border-slate-200/80 dark:border-slate-700/65 md:shadow-[0_10px_32px_-12px_rgba(15,23,42,0.14)]'
            : 'bg-white/95 dark:bg-[#0F172A]/95 md:bg-white/88 md:dark:bg-[#0F172A]/88 md:backdrop-blur-xl border-b border-slate-200/75 dark:border-slate-800/80'
        }`}
      >
        {/* Top Live Reading & Scroll Progress Indicator */}
        <div
          aria-hidden="true"
          className="absolute top-0 inset-x-0 h-[2.5px] bg-slate-200/40 dark:bg-slate-800/50 overflow-hidden pointer-events-none"
        >
          <div
            className="h-full bg-gradient-to-l from-[#1D4ED8] via-sky-500 to-amber-400 transition-[width] duration-100 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2 sm:gap-3 lg:gap-6 px-3 sm:px-6 min-h-[60px] sm:min-h-[68px] py-1.5">
          {/* Zone 1 (Right in RTL): Frameless Brand Logo + Live Draggable Size Slider */}
          <div className="relative flex items-center gap-2 shrink-0 min-w-0">
            <a
              href="#store"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('store');
              }}
              className="flex items-center gap-2 sm:gap-2.5 shrink-0 group min-w-0"
            >
              <img
                src={themeConfig.logoUrl || DEFAULT_BRAND_LOGO_URL}
                alt={themeConfig.brandNameFa}
                style={{ width: `${headerLogoSizePx}px`, height: `${headerLogoSizePx}px` }}
                className="object-contain shrink-0 block bg-transparent border-0 p-0 transition-all duration-150 group-hover:scale-105"
              />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-heading text-[13px] sm:text-base font-black text-slate-900 dark:text-white whitespace-nowrap truncate">
                  {themeConfig.brandNameFa}
                </span>
                <span
                  dir="ltr"
                  className="text-[9.5px] sm:text-[11px] font-extrabold text-[#1D4ED8] dark:text-sky-400 tracking-tight whitespace-nowrap truncate text-right"
                >
                  {themeConfig.brandNameEn || 'Fatehan Robotics Academy'}
                </span>
              </div>
            </a>

            {canAccessAdmin && onUpdateHeaderLogoSize && (
              <button
                type="button"
                onClick={() => setLogoSizerOpen((prev) => !prev)}
                title="تغییر سایز لوگو در هدر با نوار ابزار کشیدنی"
                className={`p-1.5 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  logoSizerOpen
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-100/90 dark:bg-slate-800 hover:bg-blue-50 text-slate-600 dark:text-slate-300 hover:text-blue-700 border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">سایز لوگو</span>
              </button>
            )}

            {canAccessAdmin && onUpdateHeaderLogoSize && logoSizerOpen && (
              <div
                className="absolute top-full right-0 mt-2.5 z-50 w-72 sm:w-80 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-3"
                dir="rtl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    <span>تنظیم سایز لوگوی هدر</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 font-mono text-[11px] font-black" dir="ltr">
                      {headerLogoSizePx}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setLogoSizerOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onUpdateHeaderLogoSize(headerLogoSizePx - 4, true)}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer shrink-0"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min={36}
                    max={120}
                    step={2}
                    value={headerLogoSizePx}
                    onChange={(e) => onUpdateHeaderLogoSize(Number(e.target.value), false)}
                    onPointerUp={() => onUpdateHeaderLogoSize(headerLogoSizePx, true)}
                    onTouchEnd={() => onUpdateHeaderLogoSize(headerLogoSizePx, true)}
                    aria-label="تغییر اندازه لوگوی هدر"
                    className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateHeaderLogoSize(headerLogoSizePx + 4, true)}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer shrink-0"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onUpdateHeaderLogoSize(68, true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>پیش‌فرض</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateHeaderLogoSize(headerLogoSizePx, true);
                      setLogoSizerOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>ذخیره سایز</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Zone 2 (Center): Floating Segmented Pill Navigation Bar */}
          <nav
            aria-label="ناوبری اصلی سایت"
            className="hidden lg:flex items-center gap-1 p-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/75 border border-slate-200/80 dark:border-slate-700/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-none"
          >
            <button
              type="button"
              onClick={() => onNavigate('store')}
              className={`px-3.5 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                activeTab === 'store'
                  ? 'bg-white dark:bg-slate-900 text-[#1D4ED8] dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <Home className="w-3.5 h-3.5 shrink-0" />
              <span>صفحه اصلی</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onSelectToolAndScroll) {
                  onSelectToolAndScroll('all');
                } else {
                  onNavigate('store');
                }
              }}
              className="px-3 py-2 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>اسکیل‌ها و پکیج‌ها</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onSelectToolAndScroll) {
                  onSelectToolAndScroll('Claude');
                } else {
                  onNavigate('store');
                }
              }}
              className="px-3.5 py-2 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-700/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>اسکیل رایگان</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('articles')}
              className={`px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === 'articles' || activeTab === 'article_single'
                  ? 'bg-white dark:bg-slate-900 text-[#1D4ED8] dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-extrabold'
                  : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>مجله و مقالات</span>
            </button>

            {aboutPage && onOpenDynamicPage && (
              <button
                type="button"
                onClick={() => onOpenDynamicPage(aboutPage)}
                className="px-3 py-2 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>درباره ما</span>
              </button>
            )}

            {contactPage && onOpenDynamicPage && (
              <button
                type="button"
                onClick={() => onOpenDynamicPage(contactPage)}
                className="px-3 py-2 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>تماس با ما</span>
              </button>
            )}

            {canAccessAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className={`px-3 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-amber-700 dark:text-amber-300 hover:bg-amber-500/15'
                }`}
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>مدیریت</span>
              </button>
            )}
          </nav>

          {/* Zone 3 (Left in RTL): User Account Pill + Dark Cart Pill with Amber Counter */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoggedIn ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onNavigate(canAccessAdmin ? 'admin' : 'dashboard')}
                  title={
                    canAccessAdmin
                      ? `ورود به پنل مدیریت سیستم (${displayUserName || 'مدیر'})`
                      : `ورود به پنل کاربری (${displayUserName || 'کاربر'})`
                  }
                  className="px-3 sm:px-3.5 py-2 min-h-[40px] rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                >
                  {canAccessAdmin ? (
                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-sky-400 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">پنل کاربری</span>
                  {claimedCount > 0 && !canAccessAdmin && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#1D4ED8] text-white text-[10px] font-black inline-flex items-center justify-center smooth-nums">
                      {claimedCount.toLocaleString('fa-IR')}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  title="خروج از حساب کاربری"
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-3.5 sm:px-4 py-2 min-h-[40px] rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300 shrink-0" />
                <span>ورود / ثبت‌نام</span>
              </button>
            )}

            {activeTab !== 'admin' && (
              <button
                type="button"
                onClick={onOpenCart}
                aria-label="سبد خرید"
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] rounded-full bg-[#0F172A] hover:bg-slate-800 dark:bg-[#1D4ED8] dark:hover:bg-blue-700 text-white text-[11px] sm:text-xs font-extrabold shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">سبد خرید</span>
                <span className="min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-5 px-1 sm:px-1.5 rounded-full bg-amber-400 text-slate-950 text-[9.5px] sm:text-[10px] font-black inline-flex items-center justify-center smooth-nums tabular-nums">
                  {cartTotalItems.toLocaleString('fa-IR')}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Fixed Header Spacer (header is static on mobile, fixed on md+) */}
      <div className="hidden md:block h-[68px] shrink-0" aria-hidden="true" />

      {/* Admin-Only Interactive Motion & Muuri Grid Status Strip (Desktop Only) */}
      {canAccessAdmin && themeConfig.showTopAnnouncement !== false && (
        <div className="hidden md:block bg-[#131C31] text-slate-200 px-4 sm:px-6 py-2 text-[11px] border-b border-slate-800/80">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {themeConfig.topAnnouncementText || 'موتور تعاملی فعال:'}
                </span>
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] shrink-0">
                {userRole === 'super_admin' ? 'سوپر ادمین' : 'ادمین'}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] shrink-0">
                GSAP 3
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] shrink-0">
                Lenis
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] shrink-0">
                Muuri Grid
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleMuuriDrag}
                className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  isMuuriDragEnabled
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Move className="w-3 h-3" />
                <span>
                  جابه‌جایی کارت‌ها (Muuri):{' '}
                  {isMuuriDragEnabled ? 'فعال' : 'غیرفعال'}
                </span>
              </button>

              <button
                type="button"
                onClick={onResetDraggedElements}
                className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>بازنشانی چیدمان</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
