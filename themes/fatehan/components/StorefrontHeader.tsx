import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { formatPersianNumber } from '../utils/formatters';
import { FatehanLogo } from '../ui/FatehanLogo';
import { CmsMenuItem } from '../types';
import {
  ShoppingBag,
  User,
  UserCheck,
  Store,
  FileText,
  Home,
  CreditCard,
  Menu,
  X,
  Compass,
  Phone,
  Sparkles,
  MapPin,
  Bell,
  Gift,
  Info,
  AtSign,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
  RotateCcw,
  Check,
} from 'lucide-react';

function renderMenuIcon(icon?: CmsMenuItem['icon'], isActiveEmerald = false) {
  switch (icon) {
    case 'home':
      return <Home className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    case 'sparkles':
      return <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case 'gift':
      return <Gift className={`w-3.5 h-3.5 shrink-0 ${isActiveEmerald ? '' : 'text-emerald-600'}`} />;
    case 'store':
      return <Store className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
    case 'file-text':
      return <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    case 'info':
      return <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
    case 'map-pin':
      return <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
    case 'compass':
      return <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
    case 'phone':
      return <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    case 'credit-card':
      return <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    case 'user':
      return <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    default:
      return null;
  }
}

export const StorefrontHeader: React.FC = () => {
  const {
    state,
    settings,
    storePath,
    navigateStore,
    cartItems,
    loggedInCustomer,
    canAccessAdmin,
    openAdminPanel,
    headerLogoSizePx,
    updateHeaderLogoSize,
    notify,
    viewportMode,
  } = useFatehanTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bellModalOpen, setBellModalOpen] = useState(false);
  const [logoSizerOpen, setLogoSizerOpen] = useState(false);

  const totalCartCount = cartItems.reduce((acc, it) => acc + it.qty, 0);
  const isMobile = viewportMode === 'mobile';

  // Live contact block override if Page Builder defines custom phones/address
  const contactBlk = state.builderBlocks.find(
    (b) => b.id === 'BLK-HOME-CONTACT' || b.id === 'BLK-CONTACT-MAIN'
  );
  const topBarAddress =
    settings.location.addressFull ||
    contactBlk?.itemsList?.[3]?.title ||
    settings.location.addressShort;
  const topBarLandline =
    settings.phones.landlineFormatted ||
    contactBlk?.itemsList?.[2]?.title ||
    '';
  const topBarLandlineClean = (settings.phones.landline || topBarLandline).replace(/\s+/g, '');
  const topBarPrimary =
    settings.phones.primaryFormatted ||
    contactBlk?.itemsList?.[0]?.title ||
    '';
  const topBarPrimaryClean = (settings.phones.primary || topBarPrimary).replace(/\s+/g, '');

  const visibleAnnouncements = useMemo(() => {
    const rawList = state.announcements || [];
    const userPhone = (loggedInCustomer?.phone || '').replace(/\s+/g, '').trim();
    return rawList.filter((item) => {
      if (item.targetType === 'public') return true;
      if (item.targetType === 'user_mention') {
        if (!userPhone) return false;
        const targetPhone = (item.mentionedPhone || '').replace(/\s+/g, '').trim();
        return targetPhone === userPhone;
      }
      return true;
    });
  }, [state.announcements, loggedInCustomer?.phone]);

  const personalMentionsCount = useMemo(() => {
    const userPhone = (loggedInCustomer?.phone || '').replace(/\s+/g, '').trim();
    if (!userPhone) return 0;
    return visibleAnnouncements.filter(
      (a) => a.targetType === 'user_mention' && (a.mentionedPhone || '').trim() === userPhone
    ).length;
  }, [visibleAnnouncements, loggedInCustomer?.phone]);

  const isMenuItemActive = (item: CmsMenuItem) => {
    if (item.path === '/') return storePath === '/';
    if (item.matchPrefixes && item.matchPrefixes.length > 0) {
      return item.matchPrefixes.some((p) => (p === '/' ? storePath === '/' : storePath.startsWith(p)));
    }
    return storePath.startsWith(item.path);
  };

  return (
    <>
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm text-slate-800 transition-all">
        {/* Top Announcement Bar */}
        <div className="bg-slate-900 text-white text-[11px] py-1.5 px-4 hidden sm:block">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-200">
                {settings.announcementTopBarText || (
                  <>
                    ثبت‌نام ترم جدید <strong className="text-amber-400">رباتیک، کدنویسی و هوش مصنوعی</strong> در{' '}
                    {settings.location.city}
                  </>
                )}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-300 font-bold">«{settings.taglinePrimary}»</span>
            </div>
            <div className="flex items-center gap-3.5 text-slate-300">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{topBarAddress}</span>
              </span>
              <span className="text-slate-600">|</span>
              <a
                href={`tel:${topBarLandlineClean}`}
                className="flex items-center gap-1 font-mono text-amber-300 hover:text-white transition-colors"
                dir="ltr"
                title="تلفن ثابت آموزشگاه"
              >
                <Phone className="w-3 h-3 text-amber-400" />
                <bdi dir="ltr" className="bidi-safe tabular-nums">{topBarLandline}</bdi>
              </a>
              <span className="text-slate-600">|</span>
              <a
                href={`tel:${topBarPrimaryClean}`}
                className="flex items-center gap-1 font-mono text-cyan-300 hover:text-white transition-colors"
                dir="ltr"
                title="تلفن همراه و مشاوره ثبت‌نام"
              >
                <Phone className="w-3 h-3 text-cyan-400" />
                <bdi dir="ltr" className="bidi-safe tabular-nums">{topBarPrimary}</bdi>
              </a>
            </div>
          </div>
        </div>

        <div
          className={`max-w-7xl mx-auto ${
            isMobile ? 'px-3.5 py-2' : 'px-4 sm:px-6 py-2'
          } flex items-center justify-between gap-2`}
        >
          {/* Zone 1: Frameless Official Logo + Live Draggable Size Slider Toolbar */}
          <div className="relative flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigateStore('/')}
              className="text-right cursor-pointer focus:outline-none bg-transparent border-0 p-0"
            >
              <FatehanLogo
                customSizePx={isMobile ? Math.min(headerLogoSizePx, 84) : headerLogoSizePx}
                size={isMobile ? 'sm' : 'lg'}
                variant={isMobile ? 'compact' : 'full'}
              />
            </button>

            {canAccessAdmin && (
              <button
                type="button"
                onClick={() => setLogoSizerOpen((prev) => !prev)}
                title="تغییر سایز لوگو در هدر با نوار ابزار کشیدنی"
                className={`p-1.5 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  logoSizerOpen
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-100/90 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border-slate-200/80'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">سایز لوگو</span>
              </button>
            )}

            <AnimatePresence>
              {canAccessAdmin && logoSizerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  className="absolute top-full right-0 mt-2.5 z-50 w-72 sm:w-80 p-3.5 rounded-2xl bg-white/98 backdrop-blur-xl border border-slate-200 shadow-2xl space-y-3"
                  dir="rtl"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                      <span>تنظیم سایز لوگوی هدر</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[11px] font-black" dir="ltr">
                        {headerLogoSizePx}px
                      </span>
                      <button
                        type="button"
                        onClick={() => setLogoSizerOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => updateHeaderLogoSize(headerLogoSizePx - 4, true)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer shrink-0"
                      title="کوچک‌تر"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={36}
                      max={120}
                      step={2}
                      value={headerLogoSizePx}
                      onChange={(e) => updateHeaderLogoSize(Number(e.target.value), false)}
                      onPointerUp={() => updateHeaderLogoSize(headerLogoSizePx, true)}
                      onTouchEnd={() => updateHeaderLogoSize(headerLogoSizePx, true)}
                      aria-label="تغییر اندازه لوگوی هدر"
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => updateHeaderLogoSize(headerLogoSizePx + 4, true)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer shrink-0"
                      title="بزرگ‌تر"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1" dir="ltr">
                    <span>36px</span>
                    <span>68px</span>
                    <span>120px</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        updateHeaderLogoSize(68, true);
                        notify('سایز لوگو به حالت پیش‌فرض (۶۸ پیکسل) بازگشت.');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>پیش‌فرض</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateHeaderLogoSize(headerLogoSizePx, true);
                        setLogoSizerOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ذخیره سایز</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Zone 2: Dynamic Navigation Menu from CMS v2.0.0 Menus API */}
          {!isMobile && (
            <nav className="hidden lg:flex items-center justify-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-700 shrink-0">
              {state.headerMenu.map((item) => {
                const active = isMenuItemActive(item);
                const isEmerald = item.variant === 'highlight-emerald';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateStore(item.path)}
                    className={`inline-flex items-center gap-1.5 py-2 px-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isEmerald
                        ? active
                          ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
                        : active
                        ? 'bg-white text-blue-700 font-extrabold shadow-xs border border-blue-100'
                        : 'hover:bg-white/80 hover:text-blue-600'
                    }`}
                  >
                    {renderMenuIcon(item.icon, isEmerald && active)}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Zone 3: Unified Left Action Cluster — Account + Compact Bell + Cart */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex flex-col items-stretch gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                {canAccessAdmin && openAdminPanel && (
                  <motion.button
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openAdminPanel()}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold cursor-pointer whitespace-nowrap border bg-slate-900 hover:bg-blue-700 text-amber-300 border-slate-800 shadow-xs transition-all"
                    title="ورود به پنل مدیریت CMS و تغییر پوسته"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span className="whitespace-nowrap">
                      {loggedInCustomer?.role === 'super_admin' ? 'پنل مدیریت' : 'مدیریت CMS'}
                    </span>
                  </motion.button>
                )}

                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigateStore('/my-account')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold cursor-pointer whitespace-nowrap border transition-all ${
                    loggedInCustomer
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs'
                      : storePath.startsWith('/my-account')
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200'
                  }`}
                  title={
                    loggedInCustomer
                      ? `پنل کاربری · ${loggedInCustomer.phone}`
                      : 'ورود یا ثبت‌نام در حساب کاربری (/my-account)'
                  }
                >
                  {loggedInCustomer ? (
                    <UserCheck className="w-3.5 h-3.5 shrink-0 text-white" />
                  ) : (
                    <User className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                  )}
                  <span className="whitespace-nowrap">
                    {loggedInCustomer ? 'پنل کاربری' : 'ورود / ثبت‌نام'}
                  </span>
                </motion.button>

                <button
                  type="button"
                  onClick={() => setBellModalOpen(true)}
                  title={`اطلاعیه‌ها و پیام‌های ${settings.academyNameFa}`}
                  className={`relative w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    personalMentionsCount > 0
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                      : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200'
                  }`}
                >
                  <Bell className="w-4 h-4 text-amber-500 dpa-bell-shake shrink-0" />
                  {visibleAnnouncements.length > 0 && (
                    <span
                      className={`absolute -top-1.5 -left-1.5 min-w-[16px] h-4 px-1 text-[9px] font-mono font-black rounded-full flex items-center justify-center leading-none border border-white ${
                        personalMentionsCount > 0
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {formatPersianNumber(visibleAnnouncements.length)}
                    </span>
                  )}
                </button>
              </div>

              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigateStore('/cart')}
                className="relative inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">سبد خرید</span>
                <motion.span
                  key={totalCartCount}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-amber-400 text-slate-950 rounded-md leading-none"
                >
                  {formatPersianNumber(totalCartCount)}
                </motion.span>
              </motion.button>
            </div>

            {isMobile && (
              <button
                type="button"
                aria-label={mobileMenuOpen ? 'بستن منوی ناوبری' : 'باز کردن منوی ناوبری'}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-800 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Navigation (Driven by CMS Menus API) */}
        {isMobile && mobileMenuOpen && (
          <div className="px-3.5 pb-3 pt-1 bg-white border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-bold">
            {state.headerMenu.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigateStore(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-right flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  item.variant === 'highlight-emerald'
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900'
                    : 'bg-slate-50 hover:bg-blue-50 text-slate-900'
                }`}
              >
                {renderMenuIcon(item.icon)}
                <span>{item.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                navigateStore('/lab');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-900 text-right flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>آزمایشگاه ربات</span>
            </button>

            {canAccessAdmin && openAdminPanel && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAdminPanel();
                }}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-blue-700 text-amber-300 text-right flex items-center gap-2 whitespace-nowrap cursor-pointer col-span-2"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>ورود به پنل مدیریت CMS / تغییر پوسته</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                navigateStore('/my-account');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-right flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{loggedInCustomer ? 'پنل کاربری' : 'ورود / ثبت‌نام'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigateStore('/checkout');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-right flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تسویه حساب</span>
            </button>
          </div>
        )}
      </header>

      {/* Announcements & Personal Mentions Modal */}
      <AnimatePresence>
        {bellModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden text-right"
              dir="rtl"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center">
                    <Bell className="w-5 h-5 dpa-bell-shake" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      تابلو اطلاعیه‌ها و پیام‌های {settings.academyNameFa}
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      اطلاعیه‌های عمومی ترم‌ها + پیام‌های اختصاصی منشن‌شده برای حساب شما
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBellModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3.5">
                {!loggedInCustomer && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
                    <div className="text-xs text-blue-900 font-bold">
                      برای مشاهده پیام‌های اختصاصی که مدیریت با <bdi>@شماره‌موبایل</bdi> برای شما ارسال کرده، وارد پنل کاربری شوید.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBellModalOpen(false);
                        navigateStore('/my-account');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black shrink-0 cursor-pointer"
                    >
                      ورود به حساب
                    </button>
                  </div>
                )}

                {visibleAnnouncements.map((ann) => {
                  const isMention = ann.targetType === 'user_mention';
                  return (
                    <div
                      key={ann.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isMention
                          ? 'bg-gradient-to-l from-amber-50 via-yellow-50/70 to-white border-amber-300 shadow-xs'
                          : ann.isImportant
                          ? 'bg-blue-50/50 border-blue-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {isMention && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                              <AtSign className="w-3 h-3" />
                              <span>خطاب به شما ({ann.mentionedPhone})</span>
                            </span>
                          )}
                          {ann.badgeText && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                isMention
                                  ? 'bg-slate-900 text-amber-300'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {ann.badgeText}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{ann.createdAt}</span>
                      </div>

                      <h4 className="text-sm font-black text-slate-900 mb-1">{ann.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{ann.message}</p>

                      {ann.linkUrl && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setBellModalOpen(false);
                              navigateStore(ann.linkUrl!);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <span>مشاهده بخش مرتبط</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
