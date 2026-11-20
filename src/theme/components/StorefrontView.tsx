import React, { useState } from 'react';
import {
  Sparkles,
  ShoppingBag,
  ArrowLeft,
  ArrowUpLeft,
  Search,
  Sun,
  Moon,
  Layers,
  ChevronDown,
  X,
} from 'lucide-react';
import type {
  ActiveTab,
  CatalogFilter,
  SkillArticle,
  SkillProduct,
  ThemeConfig,
} from '../../core/types';
import type { AccentStyleTokens } from '../accentStyles';
import { resolveResponsiveMediaUrl } from '../../data/mediaAssets';
import { ProgressiveImage } from './ProgressiveImage';
import {
  HeroSkillDeckSlider,
  PosterGeometricSymbol,
  SkillPosterCard,
} from './SkillPosterCard';

const FAQ_ITEMS = [
  {
    q: 'فرآیند دریافت اسکیل‌های رایگان و دانلود آن‌ها از پیشخوان چگونه است؟',
    a: 'برای حفظ نظم حساب کاربری شما، با کلیک روی دکمه «افزودن رایگان به حساب کاربری» روی هر اسکیل رایگان، آن اسکیل بلافاصله به کتابخانه شخصی شما اضافه می‌شود. سپس با یک کلیک وارد «پیشخوان من» شده و فایل راهنمای استاندارد را مطالعه یا دانلود می‌کنید.',
  },
  {
    q: 'شرایط خرید اقساطی ۴ قسطه و صدور فاکتور رسمی مالیاتی چگونه است؟',
    a: 'شما می‌توانید تمامی پکیج‌ها و لایسنس‌های تخصصی را در ۴ قسط مساوی بدون سود و کارمزد تسویه نمایید. به محض پرداخت قسط اول، دسترسی دانلود فعال شده و امکان دریافت فاکتور فروشگاهی یا فاکتور رسمی دارایی در پیشخوان فراهم است.',
  },
  {
    q: 'فرآیند پرداخت آنلاین و تحویل آنی پکیج‌های تخصصی چگونه انجام می‌شود؟',
    a: 'تمامی پرداخت‌ها از طریق شبکه رسمی شاپرک و درگاه‌های بانکی معتبر انجام می‌شود. بلافاصله پس از تایید تراکنش، دسترسی دانلود مستقیم فایل‌های اسکیل و سورس‌کدهای اجرایی در پیشخوان کاربری شما فعال می‌گردد.',
  },
  {
    q: 'آیا اسکیل‌های خریداری‌شده دارای بروزرسانی و پشتیبانی فنی هستند؟',
    a: 'بله؛ تمامی اسکیل‌ها و معماری‌های مهندسی منتشرشده در اسکیل ۹۸ به صورت مستمر با آخرین نسخه‌های فریم‌ورک‌ها بروزرسانی می‌شوند و نسخه‌های جدید بدون هزینه اضافی در کتابخانه حساب کاربری شما قرار می‌گیرند.',
  },
];

interface StorefrontViewProps {
  themeConfig: ThemeConfig;
  accentStyles: AccentStyleTokens;
  activeCatalog: SkillProduct[];
  filteredCatalog: SkillProduct[];
  displayedCatalog: SkillProduct[];
  publishedArticles: SkillArticle[];
  catalogFilter: CatalogFilter;
  searchQuery: string;
  bookmarkedIds: string[];
  claimedSkillIds: string[];
  showAllCatalogSkills: boolean;
  onChangeFilter: (f: CatalogFilter) => void;
  onChangeSearchQuery: (q: string) => void;
  onToggleDarkMode: () => void;
  onToggleShowAllSkills: () => void;
  onSelectToolAndScroll: (tool: CatalogFilter) => void;
  onNavigate: (tab: ActiveTab) => void;
  onOpenSkillDetails: (skill: SkillProduct) => void;
  onQuickSkillAction: (skill: SkillProduct) => void;
  onToggleBookmark: (id: string) => void;
  onOpenFullArticle: (art: SkillArticle) => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  themeConfig,
  accentStyles,
  activeCatalog,
  filteredCatalog,
  displayedCatalog,
  publishedArticles,
  catalogFilter,
  searchQuery,
  bookmarkedIds,
  claimedSkillIds,
  showAllCatalogSkills,
  onChangeFilter,
  onChangeSearchQuery,
  onToggleDarkMode,
  onToggleShowAllSkills,
  onSelectToolAndScroll,
  onNavigate,
  onOpenSkillDetails,
  onQuickSkillAction,
  onToggleBookmark,
  onOpenFullArticle,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const catalogFilterOptions: { id: CatalogFilter; label: string }[] = [
    {
      id: 'all',
      label: `همه اسکیل‌ها (${activeCatalog.length.toLocaleString('fa-IR')})`,
    },
    { id: 'Claude', label: 'Claude' },
    { id: 'ChatGPT', label: 'ChatGPT' },
    { id: 'Codex', label: 'Codex & DevOps' },
    { id: 'pro', label: 'پکیج‌های VIP' },
    {
      id: 'bookmarked',
      label: `نشان‌شده‌ها (${bookmarkedIds.length.toLocaleString('fa-IR')})`,
    },
  ];

  const scrollToCatalog = () => {
    const el = document.getElementById('skills-catalog-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeFilter('all');
    scrollToCatalog();
  };

  return (
    <div>
      {/* SECTION 1: Hero Split + Quick Search + Interactive 5-Card Fanned Deck */}
      {themeConfig.showHeroSection !== false && (
        <section className="relative overflow-hidden border-b border-stone-200/80 dark:border-slate-800/80 py-6 sm:py-14 lg:py-18 bg-gradient-to-b from-white/75 via-[#F6F5F1] to-[#EFECE6] dark:from-[#0F172A] dark:via-[#131C31] dark:to-[#0F172A]">
          <div
            className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none ${accentStyles.heroGlow}`}
          />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-10 lg:gap-12 items-center relative z-10">
            <div className="lg:col-span-6 space-y-4 sm:space-y-5 text-right" data-reveal="slide-right">
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold text-[#1D4ED8] dark:text-sky-400">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="line-clamp-1">
                  {themeConfig.heroBadgeText ||
                    'مخزن اسکیل‌های استاندارد برای Claude، ChatGPT و Codex'}
                </span>
              </div>

              <h1 className="font-heading text-[17px] sm:text-2xl lg:text-[1.85rem] font-black leading-[1.58] sm:leading-[1.4]">
                <span className="block text-stone-900 dark:text-white">
                  {themeConfig.heroTitleLine1}
                </span>
                <span className={`block mt-1 ${accentStyles.heroHighlight}`}>
                  {themeConfig.heroTitleAccent}
                </span>
              </h1>

              <p className="text-xs sm:text-[14.5px] text-stone-600 dark:text-slate-300 leading-[1.85] max-w-lg">
                {themeConfig.heroSubtitle}
              </p>

              {/* Prominent Purpose-Built Hero Search Bar */}
              <form
                onSubmit={handleHeroSearchSubmit}
                className="max-w-lg space-y-2 pt-0.5"
              >
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-stone-400 absolute right-3.5 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onChangeSearchQuery(e.target.value)}
                    placeholder="جستجوی اسکیل، پکیج یا ابزار (مثلاً MCP، کلود، Next.js)..."
                    aria-label="جستجوی سریع اسکیل‌ها"
                    className="w-full h-11 pr-10 pl-20 rounded-xl border border-stone-300/90 dark:border-slate-700 bg-white dark:bg-[#131C31] text-xs sm:text-[13px] text-stone-900 dark:text-white placeholder:text-stone-400 shadow-xs focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/12 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onChangeSearchQuery('')}
                      aria-label="پاک کردن جستجو"
                      className="absolute left-[72px] p-1 text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`absolute left-1.5 h-8 px-3.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${accentStyles.button}`}
                  >
                    جستجو
                  </button>
                </div>

                {/* Quiet inline quick-search hints */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-stone-500 dark:text-slate-400">
                  <span>پرجستجوها:</span>
                  {['MCP', 'Claude', 'Next.js', 'GSAP'].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        onChangeFilter('all');
                        onChangeSearchQuery(term);
                        scrollToCatalog();
                      }}
                      className="font-bold text-stone-700 dark:text-slate-300 hover:text-[#1D4ED8] dark:hover:text-sky-400 underline decoration-stone-300 dark:decoration-slate-700 underline-offset-4 cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectToolAndScroll('all')}
                  className={`px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-[13px] font-extrabold rounded-xl shadow-md transition-all whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer ${accentStyles.button}`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>
                    مشاهده مخزن اسکیل‌ها ({activeCatalog.length.toLocaleString('fa-IR')})
                  </span>
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6" data-reveal="slide-left">
              <HeroSkillDeckSlider
                skills={activeCatalog}
                heroSliderSkillIds={themeConfig.heroSliderSkillIds}
                claimedSkillIds={claimedSkillIds}
                brandNameFa={themeConfig.brandNameFa}
                onSelectSkill={onOpenSkillDetails}
                onQuickAddOrDownload={onQuickSkillAction}
              />
            </div>
          </div>
        </section>
      )}

      {/* Custom Page Widgets */}
      {(themeConfig.customWidgets || []).filter((w) => w.enabled).length > 0 && (
        <section className="py-5 border-b border-stone-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-[#131C31]/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 divide-y divide-stone-200/80 dark:divide-slate-800 md:divide-y-0 md:grid md:grid-cols-2 md:gap-4">
            {(themeConfig.customWidgets || [])
              .filter((w) => w.enabled)
              .map((w) => (
                <div
                  key={w.id}
                  data-gsap="reveal"
                  data-muuri-draggable="true"
                  className="interactive-widget py-3.5 md:p-4 md:rounded-2xl md:border md:border-stone-200/90 dark:md:border-slate-700/80 md:bg-white dark:md:bg-[#162038] flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-extrabold text-[#1D4ED8] dark:text-sky-400">
                      {w.badgeText}
                    </span>
                    <h3 className="text-[13px] sm:text-sm font-extrabold text-stone-900 dark:text-white truncate">
                      {w.title}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-slate-300 line-clamp-1">
                      {w.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (w.buttonTargetTab === 'store') {
                        onSelectToolAndScroll('all');
                      } else {
                        onNavigate(w.buttonTargetTab);
                      }
                    }}
                    className={`px-3 py-2 text-[11px] font-extrabold rounded-xl whitespace-nowrap shrink-0 cursor-pointer ${accentStyles.button}`}
                  >
                    {w.buttonText} ←
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* SECTION 2: AI Tools Bento (Compact 2-Col Side-by-Side on Mobile!) */}
      {themeConfig.showToolsBentoSection !== false && (
        <section className="bg-white dark:bg-[#131C31]/60 py-8 sm:py-14 border-b border-stone-200/80 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-5 sm:space-y-7">
            <div
              className="flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-4"
              data-gsap="reveal"
            >
              <div>
                <div className="text-[11px] sm:text-xs text-stone-500 dark:text-slate-400 mb-0.5">
                  بر اساس ابزار هوش مصنوعی و استک وب
                </div>
                <h2 className="text-[17px] sm:text-2xl font-black text-stone-900 dark:text-white leading-[1.45]">
                  {themeConfig.toolsSectionTitle || 'از کجا شروع می‌کنید؟'}
                </h2>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 max-w-sm leading-relaxed">
                {themeConfig.toolsSectionSubtitle ||
                  'اسکیل‌ها و پکیج‌های تخصصی را بر اساس مدل هوش مصنوعی تیم خود انتخاب کنید.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              {/* Claude */}
              <button
                type="button"
                data-reveal="slide-right"
                data-no-muuri-drag="true"
                onClick={() => onSelectToolAndScroll('Claude')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F2DEC9] via-[#E8CFC1] to-[#DFB9A4] dark:from-[#3A261E] dark:to-[#241822] p-4 sm:p-7 min-h-[126px] sm:min-h-[195px] flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-right w-full"
              >
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-[#7C3E24] dark:text-[#F3C6B2] z-10 smooth-nums w-full gap-1">
                  <span className="truncate">نوشتن و معماری</span>
                  <span className="hidden sm:inline shrink-0">CLAUDE SKILLS</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                  <PosterGeometricSymbol
                    type="starburst"
                    strokeColor="#844328"
                    className="w-24 h-24 sm:w-36 sm:h-36"
                  />
                </div>

                <div className="flex items-end justify-between z-10 pt-4 sm:pt-8">
                  <div>
                    <div className="text-[10px] sm:text-xs text-[#7C3E24] dark:text-[#E8B29B] mb-0.5">
                      اسکیل‌های ویژهٔ
                    </div>
                    <div
                      className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#582B18] dark:text-white"
                      dir="ltr"
                    >
                      Claude
                    </div>
                  </div>

                  <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-[#844328]/35 dark:border-white/30 flex items-center justify-center text-[#582B18] dark:text-white group-hover:bg-[#582B18] group-hover:text-white transition-colors shrink-0">
                    <ArrowUpLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                </div>
              </button>

              {/* ChatGPT */}
              <button
                type="button"
                data-reveal="slide-left"
                data-no-muuri-drag="true"
                onClick={() => onSelectToolAndScroll('ChatGPT')}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#DCF0E4] via-[#CFE0D6] to-[#B8D4C4] dark:from-[#193328] dark:to-[#13262F] p-4 sm:p-7 min-h-[126px] sm:min-h-[195px] flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-right w-full"
              >
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-[#1D5B41] dark:text-[#B5E2CD] z-10 smooth-nums w-full gap-1">
                  <span className="truncate">UI/UX و محتوا</span>
                  <span className="hidden sm:inline shrink-0">CHATGPT SKILLS</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                  <PosterGeometricSymbol
                    type="radial"
                    strokeColor="#1D5B41"
                    className="w-24 h-24 sm:w-36 sm:h-36"
                  />
                </div>

                <div className="flex items-end justify-between z-10 pt-4 sm:pt-8">
                  <div>
                    <div className="text-[10px] sm:text-xs text-[#1D5B41] dark:text-[#9CD4B9] mb-0.5">
                      اسکیل‌های ویژهٔ
                    </div>
                    <div
                      className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#13422E] dark:text-white"
                      dir="ltr"
                    >
                      ChatGPT
                    </div>
                  </div>

                  <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-[#1D5B41]/35 dark:border-white/30 flex items-center justify-center text-[#13422E] dark:text-white group-hover:bg-[#13422E] group-hover:text-white transition-colors shrink-0">
                    <ArrowUpLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </span>
                </div>
              </button>
            </div>

            {/* Codex Horizontal Banner */}
            <button
              type="button"
              data-reveal="blur-up"
              data-no-muuri-drag="true"
              onClick={() => onSelectToolAndScroll('Codex')}
              className="group w-full text-right rounded-2xl bg-gradient-to-r from-[#DCE6F7] via-[#E5EEFF] to-[#CFE0FA] dark:from-[#1A2947] dark:to-[#131E36] px-4 sm:px-6 py-3.5 sm:py-5 flex items-center justify-between gap-3 cursor-pointer shadow-xs hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-[#1D4ED8]/25 bg-white/75 dark:bg-[#0F172A]/60 flex items-center justify-center shrink-0">
                  <PosterGeometricSymbol
                    type="braces"
                    strokeColor="#1D4ED8"
                    className="w-6 h-6 sm:w-7 sm:h-7"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[10.5px] sm:text-xs font-bold text-[#1E40AF] dark:text-blue-300 truncate">
                    کدنویسی، انیمیشن GSAP و معماری فول‌استک
                  </div>
                  <div className="font-heading text-[13.5px] sm:text-lg font-black text-[#1E3A8A] dark:text-white truncate">
                    اسکیل‌های مهندسی Codex و فرانت‌اند
                  </div>
                </div>
              </div>

              <span className="w-8 h-8 sm:w-auto sm:h-auto sm:px-3.5 sm:py-2 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 bg-[#1D4ED8] text-white shrink-0">
                <span className="hidden sm:inline">مشاهده Codex</span>
                <ArrowLeft className="w-4 h-4" />
              </span>
            </button>
          </div>
        </section>
      )}

      {/* SECTION 3: Certified Skills Catalog */}
      <section
        id="skills-catalog-section"
        className="scroll-mt-24 py-9 sm:py-14 border-b border-stone-200/80 dark:border-slate-800"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-5 sm:space-y-7">
          <div
            className="flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-4"
            data-reveal="blur-up"
          >
            <div>
              <div className="text-[11px] sm:text-xs text-stone-500 dark:text-slate-400 mb-0.5 smooth-nums">
                فروشگاه تخصصی {themeConfig.brandNameFa}
              </div>
              <h2 className="text-[17px] sm:text-2xl font-black text-stone-900 dark:text-white leading-[1.45]">
                {themeConfig.catalogSectionTitle && !themeConfig.catalogSectionTitle.includes('۶۰')
                  ? themeConfig.catalogSectionTitle
                  : 'مخزن اسکیل‌های آماده با گواهی تخصصی'}
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-slate-400 max-w-md leading-relaxed">
              {themeConfig.catalogSectionSubtitle ||
                'اسکیل‌های رایگان را به پیشخوان اضافه کنید یا پکیج‌های تخصصی را به سبد خرید بیفزایید.'}
            </p>
          </div>

          {/* Non-Scrolling Filter + Search Bar */}
          <div className="py-3 border-t border-b border-stone-200 dark:border-slate-800 space-y-2.5 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
            {/* Mobile: Compact Search + Native Select Dropdown (ZERO Horizontal Scroll!) */}
            <div className="sm:hidden space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onChangeSearchQuery(e.target.value)}
                  placeholder="جستجو در اسکیل‌ها (MCP, Next.js, Claude...)"
                  className="w-full h-10 pr-8 pl-8 text-xs rounded-xl border border-stone-200/90 dark:border-slate-700 bg-white dark:bg-[#131C31] text-stone-900 dark:text-white focus:outline-none focus:border-[#1D4ED8]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onChangeSearchQuery('')}
                    aria-label="پاک کردن جستجو"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={catalogFilter}
                    onChange={(e) => onChangeFilter(e.target.value as CatalogFilter)}
                    aria-label="دسته‌بندی اسکیل‌ها"
                    className="w-full h-9 appearance-none pr-3 pl-8 rounded-xl border border-stone-200/90 dark:border-slate-700 bg-white dark:bg-[#131C31] text-xs font-bold text-stone-800 dark:text-slate-100 focus:outline-none focus:border-[#1D4ED8]"
                  >
                    {catalogFilterOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  aria-label="تغییر تم روشن و تیره"
                  className="h-9 px-2.5 rounded-xl border border-stone-200/90 dark:border-slate-700 bg-white dark:bg-[#131C31] text-stone-700 dark:text-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  {themeConfig.darkMode ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-700" />
                  )}
                </button>

                <span className="text-[11px] font-bold smooth-nums text-stone-500 dark:text-slate-400 whitespace-nowrap">
                  {filteredCatalog.length.toLocaleString('fa-IR')} مورد
                </span>
              </div>
            </div>

            {/* Tablet/Desktop: Clean Flex-Wrap Category Filters (Zero Horizontal Scrollbar) */}
            <div className="hidden sm:flex flex-wrap items-center gap-1.5">
              {catalogFilterOptions.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap smooth-nums cursor-pointer ${
                    catalogFilter === tab.id
                      ? `${accentStyles.button} shadow-xs`
                      : 'text-stone-600 dark:text-slate-300 hover:bg-stone-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tablet/Desktop: Search + Dark Mode + Count */}
            <div className="hidden sm:flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onChangeSearchQuery(e.target.value)}
                  placeholder="جستجو در مخزن اسکیل‌ها..."
                  className="w-56 pr-8 pl-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131C31] text-stone-900 dark:text-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131C31] text-stone-700 dark:text-slate-200 hover:bg-stone-100 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {themeConfig.darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>روشن</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-stone-700" />
                    <span>تیره</span>
                  </>
                )}
              </button>

              <span className="text-xs font-bold smooth-nums tabular-nums text-stone-500 dark:text-slate-400 whitespace-nowrap">
                {filteredCatalog.length.toLocaleString('fa-IR')} اسکیل
              </span>
            </div>
          </div>

          {displayedCatalog.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
                اسکیلی متناسب با فیلتر یا جستجوی شما پیدا نشد.
              </p>
              <button
                type="button"
                onClick={() => {
                  onChangeFilter('all');
                  onChangeSearchQuery('');
                }}
                className="text-xs font-bold underline text-[#1D4ED8] cursor-pointer"
              >
                نمایش همه اسکیل‌ها
              </button>
            </div>
          ) : (
            <>
              <div
                className={`grid grid-cols-1 gap-4 sm:gap-6 ${
                  themeConfig.productGridColumns === 2
                    ? 'md:grid-cols-2'
                    : themeConfig.productGridColumns === 4
                    ? 'sm:grid-cols-2 lg:grid-cols-4'
                    : 'md:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {displayedCatalog.map((item) => (
                  <SkillPosterCard
                    key={item.id}
                    item={item}
                    brandNameFa={themeConfig.brandNameFa}
                    isBookmarked={bookmarkedIds.includes(item.id)}
                    isClaimed={claimedSkillIds.includes(item.id)}
                    onToggleBookmark={onToggleBookmark}
                    onOpenDetails={onOpenSkillDetails}
                    onQuickAction={onQuickSkillAction}
                  />
                ))}
              </div>

              {filteredCatalog.length > 12 &&
                catalogFilter === 'all' &&
                !searchQuery.trim() && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={onToggleShowAllSkills}
                      className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                        showAllCatalogSkills
                          ? 'border border-stone-300 dark:border-slate-700 bg-white dark:bg-[#131C31] text-stone-800 dark:text-white'
                          : accentStyles.button
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>
                        {showAllCatalogSkills
                          ? 'نمایش خلاصه (۱۲ اسکیل برگزیده)'
                          : `مشاهده تمام ${filteredCatalog.length.toLocaleString(
                              'fa-IR'
                            )} اسکیل مخزن`}
                      </span>
                    </button>
                  </div>
                )}
            </>
          )}
        </div>
      </section>

      {/* SECTION 4: Enterprise Value Proposition Showcase (Hairline Rows on Mobile, Grid on Desktop) */}
      {themeConfig.showMotionShowcaseSection !== false && (
        <section className="bg-[#0B132B] text-white py-10 sm:py-16 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 space-y-6 sm:space-y-9">
            <div
              className="flex flex-col md:flex-row md:items-end justify-between gap-4"
              data-reveal="blur-up"
            >
              <div className="space-y-1.5 max-w-xl">
                <div className="text-[11px] sm:text-xs text-amber-400 font-bold">
                  زیرساخت استاندارد مهندسی هوش مصنوعی · ویژه تیم‌های فنی
                </div>
                <h2 className="text-[17px] sm:text-3xl font-extrabold leading-[1.5] sm:leading-tight">
                  تضمین کیفیت کد، تحویل آنی و شرایط پرداخت منعطف سازمانی
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onSelectToolAndScroll('pro')}
                className="px-4 py-2.5 text-xs font-extrabold bg-amber-400 text-stone-950 rounded-xl hover:bg-amber-300 transition-colors inline-flex items-center gap-2 self-start md:self-auto cursor-pointer"
              >
                <span>مشاهده پکیج‌های VIP</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-white/10 sm:divide-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
              <div
                data-reveal="slide-right"
                className="py-3.5 sm:p-5 sm:rounded-2xl sm:bg-white/10 sm:backdrop-blur sm:border sm:border-white/15 space-y-1.5"
              >
                <div className="text-[11px] font-bold text-amber-300">
                  ۰۱ / استاندارد SKILL.md
                </div>
                <div className="font-heading text-[13.5px] sm:text-base font-extrabold">
                  معماری ماژولار و تست‌شده
                </div>
                <p className="text-xs text-stone-300 leading-[1.8]">
                  دستورالعمل‌های دقیق، بدون خطای سینتکس و آماده تزریق مستقیم به پروژه‌های واقعی.
                </p>
              </div>

              <div
                data-reveal="fade-up"
                className="py-3.5 sm:p-5 sm:rounded-2xl sm:bg-white/10 sm:backdrop-blur sm:border sm:border-white/15 space-y-1.5"
              >
                <div className="text-[11px] font-bold text-emerald-300">
                  ۰۲ / اقساط ۴ قسطه BNPL
                </div>
                <div className="font-heading text-[13.5px] sm:text-base font-extrabold">
                  خرید اعتباری بدون سود و کارمزد
                </div>
                <p className="text-xs text-stone-300 leading-[1.8]">
                  امکان تسویه نقدی شاپرک یا پرداخت در ۴ قسط مساوی با فعال‌سازی آنی در قسط اول.
                </p>
              </div>

              <div
                data-reveal="fade-up"
                className="py-3.5 sm:p-5 sm:rounded-2xl sm:bg-white/10 sm:backdrop-blur sm:border sm:border-white/15 space-y-1.5"
              >
                <div className="text-[11px] font-bold text-blue-300">
                  ۰۳ / تحویل دیجیتال و فیزیکی
                </div>
                <div className="font-heading text-[13.5px] sm:text-base font-extrabold">
                  دانلود فوری یا ارسال پکیج سازمانی
                </div>
                <p className="text-xs text-stone-300 leading-[1.8]">
                  دسترسی لحظه‌ای در پیشخوان کاربری به همراه امکان سفارش پکیج فیزیکی برای شرکت‌ها.
                </p>
              </div>

              <div
                data-reveal="slide-left"
                className="py-3.5 sm:p-5 sm:rounded-2xl sm:bg-white/10 sm:backdrop-blur sm:border sm:border-white/15 space-y-1.5"
              >
                <div className="text-[11px] font-bold text-purple-300">
                  ۰۴ / فاکتور رسمی مالیاتی
                </div>
                <div className="font-heading text-[13.5px] sm:text-base font-extrabold">
                  معتبر برای شرکت‌ها و سازمان‌ها
                </div>
                <p className="text-xs text-stone-300 leading-[1.8]">
                  صدور آنی صورتحساب فروشگاهی و فاکتور رسمی مالیاتی دارایی با کد اقتصادی.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 5: Latest Editorial Articles Preview (Unboxed Hairline Rows on Mobile) */}
      {themeConfig.showArticlesSection !== false && publishedArticles.length > 0 && (
        <section className="py-9 sm:py-14 border-b border-stone-200/80 dark:border-stone-800 bg-white/60 dark:bg-stone-900/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-5 sm:space-y-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[11px] sm:text-xs text-stone-500 mb-0.5">
                  مجله و مقالات آموزشی
                </div>
                <h2 className="text-[17px] sm:text-2xl font-black text-stone-900 dark:text-white leading-[1.45]">
                  تازه‌ترین مطالب و راهنماها
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('articles')}
                className="text-xs font-bold text-[#1D4ED8] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>همه مقالات</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-stone-200/85 dark:divide-stone-800 md:divide-y-0 md:grid md:grid-cols-2 md:gap-7">
              {publishedArticles.slice(0, 2).map((art, artIdx) => (
                <article
                  key={art.id}
                  data-reveal={artIdx % 2 === 0 ? 'slide-right' : 'slide-left'}
                  onClick={() => onOpenFullArticle(art)}
                  className="group py-3.5 first:pt-0 md:py-0 flex md:flex-col items-start gap-3 md:gap-3.5 cursor-pointer"
                >
                  {art.featuredImageUrl && (
                    <div className="w-24 h-24 md:w-full md:h-auto md:aspect-16/9 rounded-xl md:rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0">
                      <ProgressiveImage
                        src={resolveResponsiveMediaUrl(art.featuredImageUrl, 'medium800')}
                        alt={art.featuredImageAlt || art.title}
                        wrapperClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] sm:text-xs text-stone-500 smooth-nums">
                      <span className="font-bold text-[#1D4ED8] dark:text-sky-400">
                        {art.category}
                      </span>
                      <span>·</span>
                      <span>
                        {art.readingTimeMinutes.toLocaleString('fa-IR')} دقیقه مطالعه
                      </span>
                    </div>
                    <h3 className="text-[13.5px] sm:text-base font-extrabold text-stone-900 dark:text-white leading-[1.55] group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                      {art.title}
                    </h3>
                    <p className="text-[11.5px] sm:text-xs text-stone-600 dark:text-stone-400 leading-[1.75] line-clamp-2">
                      {art.summary}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 6: FAQ */}
      {themeConfig.showFaqSection !== false && (
        <section className="py-9 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-5 sm:space-y-7">
            <div>
              <div className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mb-0.5">
                پیش از شروع
              </div>
              <h2 className="text-[17px] sm:text-2xl font-black text-stone-900 dark:text-white leading-[1.45]">
                پرسش‌های رایج
              </h2>
            </div>

            <div className="border-t border-stone-300/80 dark:border-stone-800 divide-y divide-stone-200 dark:divide-stone-800">
              {FAQ_ITEMS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} data-reveal="fade-up" className="py-3.5 sm:py-4">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between gap-3 text-right py-1 text-[13px] sm:text-[15px] font-extrabold text-stone-900 dark:text-white hover:text-[#1D4ED8] transition-colors leading-[1.6] cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="pt-2.5 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-[1.85] max-w-3xl">
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
