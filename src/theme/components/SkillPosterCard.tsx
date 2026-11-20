import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Eye,
  Move,
  Sparkles,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import type { PosterColorScheme, SkillProduct } from '../../core/types';

interface PosterThemeTokens {
  outerBg: string;
  innerBorder: string;
  accentText: string;
  symbolStroke: string;
  tagText: string;
}

export function getPosterPalette(
  scheme: PosterColorScheme = 'cobalt',
  category?: string
): PosterThemeTokens {
  if (scheme === 'terracotta' || category === 'Claude') {
    return {
      outerBg:
        'bg-gradient-to-br from-[#F2DEC9] via-[#E8CFC1] to-[#DFB9A4] dark:from-[#3D2622] dark:via-[#311F1D] dark:to-[#241718]',
      innerBorder: 'border-[#9C573B]/45 dark:border-[#E09F83]/40',
      accentText: 'text-[#6D321B] dark:text-[#F3C6B2]',
      symbolStroke: '#9C573B',
      tagText: 'text-[#7C3E24] dark:text-[#E8B29B]',
    };
  }
  if (scheme === 'sage' || category === 'ChatGPT') {
    return {
      outerBg:
        'bg-gradient-to-br from-[#DCF0E4] via-[#CFE0D6] to-[#B8D4C4] dark:from-[#18352D] dark:via-[#142B26] dark:to-[#10211F]',
      innerBorder: 'border-[#256B4E]/45 dark:border-[#68B694]/40',
      accentText: 'text-[#154A34] dark:text-[#B5E2CD]',
      symbolStroke: '#256B4E',
      tagText: 'text-[#1D5B41] dark:text-[#9CD4B9]',
    };
  }
  if (scheme === 'violet') {
    return {
      outerBg:
        'bg-gradient-to-br from-[#EAE6FA] via-[#DFDCF2] to-[#CCC6EC] dark:from-[#262248] dark:via-[#1E1B3B] dark:to-[#17152F]',
      innerBorder: 'border-[#54459B]/45 dark:border-[#9E91E8]/40',
      accentText: 'text-[#392B75] dark:text-[#D2CBF9]',
      symbolStroke: '#54459B',
      tagText: 'text-[#433582] dark:text-[#BDB3F4]',
    };
  }
  if (scheme === 'slate') {
    return {
      outerBg:
        'bg-gradient-to-br from-[#16223B] via-[#1E2F52] to-[#131D36]',
      innerBorder: 'border-blue-400/40',
      accentText: 'text-white',
      symbolStroke: '#60A5FA',
      tagText: 'text-amber-300',
    };
  }
  return {
    outerBg:
      'bg-gradient-to-br from-[#E5EEFF] via-[#DCE6F7] to-[#C7D8F4] dark:from-[#1B2B4B] dark:via-[#162440] dark:to-[#121D35]',
    innerBorder: 'border-[#1E40AF]/45 dark:border-[#60A5FA]/40',
    accentText: 'text-[#1E3A8A] dark:text-[#BFDBFE]',
    symbolStroke: '#1D4ED8',
    tagText: 'text-[#1D4ED8] dark:text-[#93C5FD]',
  };
}

export const PosterGeometricSymbol: React.FC<{
  type?: SkillProduct['posterIconType'];
  strokeColor: string;
  className?: string;
}> = ({ type = 'braces', strokeColor, className = 'w-28 h-28' }) => {
  switch (type) {
    case 'grid':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          <rect
            x="20"
            y="20"
            width="80"
            height="80"
            rx="8"
            stroke={strokeColor}
            strokeWidth="4.5"
          />
          <line x1="60" y1="20" x2="60" y2="100" stroke={strokeColor} strokeWidth="4.5" />
          <line x1="20" y1="60" x2="100" y2="60" stroke={strokeColor} strokeWidth="4.5" />
        </svg>
      );
    case 'radial':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          <circle cx="60" cy="60" r="40" stroke={strokeColor} strokeWidth="5" />
          <line x1="60" y1="20" x2="60" y2="100" stroke={strokeColor} strokeWidth="4.5" />
          <line x1="25" y1="40" x2="95" y2="80" stroke={strokeColor} strokeWidth="4.5" />
          <line x1="95" y1="40" x2="25" y2="80" stroke={strokeColor} strokeWidth="4.5" />
        </svg>
      );
    case 'starburst':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          <line x1="60" y1="16" x2="60" y2="104" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
          <line x1="16" y1="60" x2="104" y2="60" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
          <line x1="29" y1="29" x2="91" y2="91" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
          <line x1="91" y1="29" x2="29" y2="91" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          <path
            d="M60 18L94 32V58C94 81 79 97 60 104C41 97 26 81 26 58V32L60 18Z"
            stroke={strokeColor}
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
          <circle cx="60" cy="58" r="12" stroke={strokeColor} strokeWidth="4" />
        </svg>
      );
    case 'layers':
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          <path
            d="M60 24L98 44L60 64L22 44L60 24Z"
            stroke={strokeColor}
            strokeWidth="4.5"
            strokeLinejoin="round"
          />
          <path
            d="M22 60L60 80L98 60"
            stroke={strokeColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M22 76L60 96L98 76"
            stroke={strokeColor}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'braces':
    default:
      return (
        <svg viewBox="0 0 120 120" fill="none" className={className}>
          <rect
            x="18"
            y="18"
            width="84"
            height="84"
            rx="18"
            stroke={strokeColor}
            strokeWidth="4"
          />
          <path
            d="M48 40C42 40 40 43 40 48V54C40 58 36 60 34 60C36 60 40 62 40 66V72C40 77 42 80 48 80"
            stroke={strokeColor}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M72 40C78 40 80 43 80 48V54C80 58 84 60 86 60C84 60 80 62 80 66V72C80 77 78 80 72 80"
            stroke={strokeColor}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

interface SkillPosterCardProps {
  item: SkillProduct;
  brandNameFa: string;
  isBookmarked: boolean;
  isClaimed?: boolean;
  onToggleBookmark: (id: string) => void;
  onOpenDetails: (item: SkillProduct) => void;
  onQuickAction: (item: SkillProduct) => void;
}

export const SkillPosterCard: React.FC<SkillPosterCardProps> = ({
  item,
  brandNameFa,
  isBookmarked,
  isClaimed = false,
  onToggleBookmark,
  onOpenDetails,
  onQuickAction,
}) => {
  const palette = getPosterPalette(item.posterColor, item.category);
  const isFree = item.price === 0;

  return (
    <article
      data-gsap="reveal"
      data-muuri-draggable="true"
      className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-[#243252] bg-white dark:bg-[#162038] p-3.5 sm:p-4 shadow-sm theme-card-hover transition-all duration-300 select-none overflow-hidden"
    >
      <div>
        <div
          onClick={(e) => {
            if (e.currentTarget.closest('[data-just-dragged="true"]')) return;
            onOpenDetails(item);
          }}
          className={`relative aspect-4/3 w-full rounded-xl overflow-hidden cursor-pointer ${palette.outerBg} p-4 sm:p-5 flex flex-col justify-between transition-transform duration-300`}
        >
          <div className="flex items-center justify-between gap-2 text-[11px] smooth-nums tracking-wide z-10 min-w-0">
            <span className={`font-semibold truncate ${palette.tagText}`}>
              {item.subCategory || item.category}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`font-bold whitespace-nowrap ${palette.tagText}`} dir="ltr">
                {item.posterCode || `${item.category.toUpperCase()} / ۰۱`}
              </span>
              <span
                title="قابل جابه‌جایی با ماوس (Muuri Grid)"
                className="p-1 rounded bg-white/40 dark:bg-[#0F172A]/40 text-slate-700 dark:text-slate-200 opacity-75 group-hover:opacity-100"
              >
                <Move className="w-3 h-3" />
              </span>
            </div>
          </div>

          <div className="my-auto flex items-center justify-center transform -rotate-6 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-110">
            <PosterGeometricSymbol
              type={item.posterIconType}
              strokeColor={palette.symbolStroke}
              className="w-24 h-24 sm:w-28 sm:h-28"
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] z-10 min-w-0">
            <span className={`font-heading font-black whitespace-nowrap shrink-0 ${palette.accentText}`}>
              {brandNameFa}.
            </span>
            <span
              className={`tracking-widest uppercase text-[10px] font-bold truncate ${palette.tagText}`}
              dir="ltr"
            >
              {item.posterTagEn || 'SKILL WORKFLOW'}
            </span>
          </div>

          <div className="absolute inset-0 bg-[#11192E]/92 backdrop-blur-md text-slate-100 p-4 sm:p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between z-20">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between text-[11px] text-slate-300 smooth-nums">
                <span className="truncate">پیش‌نمایش · {item.version || 'نسخه ۲.۰'}</span>
                <span className="text-amber-300 font-bold shrink-0">{item.category}</span>
              </div>
              <div className="text-xs font-bold text-sky-300 truncate">
                خروجی استاندارد این اسکیل:
              </div>
              <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
                {item.expectedOutput || item.shortDescription}
              </p>
              {item.githubSourceRepo && (
                <div
                  className="text-[10px] text-emerald-300 font-mono truncate pt-1"
                  dir="ltr"
                >
                  Repo: {item.githubSourceRepo}
                </div>
              )}
            </div>

            <div className="pt-2.5 border-t border-slate-700/70 flex items-center justify-between text-[11px] smooth-nums">
              <span className="text-slate-300 truncate">{item.level}</span>
              <span className="font-bold text-amber-300 flex items-center gap-1 whitespace-nowrap shrink-0">
                <span>مطالعه اسکیل</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3.5 space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[#243252] pb-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0">
                {item.category}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {item.itemType === 'package'
                  ? 'پکیج جامع VIP'
                  : item.subCategory || 'اسکیل تخصصی'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {item.originalPrice > item.price && item.price > 0 && (
                <span className="hidden sm:inline text-[11px] text-slate-400 line-through smooth-nums tabular-nums whitespace-nowrap">
                  {item.originalPrice.toLocaleString('fa-IR')}
                </span>
              )}
              <span
                className={`font-extrabold smooth-nums tabular-nums text-xs sm:text-sm whitespace-nowrap ${
                  isFree
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-[#1D4ED8] dark:text-sky-300'
                }`}
              >
                {isFree
                  ? isClaimed
                    ? 'در پیشخوان ✓'
                    : 'رایگان'
                  : `${item.price.toLocaleString('fa-IR')} ت`}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(item.id);
                }}
                aria-label="ذخیره اسکیل"
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'border-blue-500/40 bg-blue-500/10 text-[#1D4ED8] dark:text-sky-300'
                    : 'border-slate-200 dark:border-[#243252] text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Bookmark
                  className="w-3.5 h-3.5"
                  fill={isBookmarked ? 'currentColor' : 'none'}
                />
              </button>
            </div>
          </div>

          <div className="min-w-0">
            <h3
              onClick={(e) => {
                if (e.currentTarget.closest('[data-just-dragged="true"]')) return;
                onOpenDetails(item);
              }}
              title={item.title}
              className="font-heading text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-[#1D4ED8] dark:hover:text-sky-300 transition-colors truncate"
            >
              {item.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300/85 leading-relaxed mt-1 truncate">
              {item.shortDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-[#243252] flex items-center gap-2 min-w-0">
        {isFree ? (
          isClaimed ? (
            <button
              type="button"
              onClick={() => onQuickAction(item)}
              className="flex-1 min-w-0 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">دانلود از پیشخوان ←</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onQuickAction(item)}
              className="flex-1 min-w-0 py-2.5 px-3 rounded-xl bg-[#1E293B] hover:bg-[#334155] dark:bg-[#243456] dark:hover:bg-[#2E426B] text-white text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span className="truncate">افزودن رایگان به حساب</span>
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => onQuickAction(item)}
            style={{ backgroundColor: 'var(--accent-primary)' }}
            className="flex-1 min-w-0 py-2.5 px-3 rounded-xl hover:opacity-95 text-white text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">افزودن به سبد خرید</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenDetails(item)}
          className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#293B5F] bg-slate-50 hover:bg-slate-100 dark:bg-[#1E2B48] dark:hover:bg-[#26375B] text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
          title="مشاهده جزئیات و پیش‌نمایش کد"
        >
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span>جزئیات</span>
        </button>
      </div>
    </article>
  );
};

interface HeroSkillDeckSliderProps {
  skills: SkillProduct[];
  heroSliderSkillIds?: string[];
  claimedSkillIds?: string[];
  brandNameFa: string;
  onSelectSkill: (skill: SkillProduct) => void;
  onQuickAddOrDownload?: (skill: SkillProduct) => void;
}

export const HeroSkillDeckSlider: React.FC<HeroSkillDeckSliderProps> = ({
  skills,
  heroSliderSkillIds,
  claimedSkillIds = [],
  brandNameFa,
  onSelectSkill,
  onQuickAddOrDownload,
}) => {
  const deckItems = useMemo(() => {
    if (heroSliderSkillIds && heroSliderSkillIds.length > 0) {
      const selected = heroSliderSkillIds
        .map((id) => skills.find((s) => s.id === id))
        .filter((s): s is SkillProduct => Boolean(s));
      if (selected.length >= 4) return selected.slice(0, 6);
      const usedIds = new Set(selected.map((s) => s.id));
      const extras = skills.filter((s) => !usedIds.has(s.id));
      return [...selected, ...extras].slice(0, 5);
    }
    return skills.slice(0, 5);
  }, [skills, heroSliderSkillIds]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [dragState, setDragState] = useState<{
    active: boolean;
    startX: number;
    deltaX: number;
    hasMoved: boolean;
  }>({
    active: false,
    startX: 0,
    deltaX: 0,
    hasMoved: false,
  });

  if (deckItems.length === 0) return null;
  const total = deckItems.length;
  const safeActiveIdx = ((activeIndex % total) + total) % total;
  const activeItem = deckItems[safeActiveIdx];
  const isActiveClaimed = claimedSkillIds.includes(activeItem.id);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleDeckPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    const startX = e.clientX;
    let moved = false;
    let currentDeltaX = 0;

    setDragState({
      active: true,
      startX,
      deltaX: 0,
      hasMoved: false,
    });

    const onPointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - startX;
      currentDeltaX = dx;
      if (Math.abs(dx) > 6) {
        moved = true;
      }
      setDragState({
        active: true,
        startX,
        deltaX: Math.max(-110, Math.min(110, dx)),
        hasMoved: moved,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (moved) {
        if (currentDeltaX > 34) {
          handlePrev();
        } else if (currentDeltaX < -34) {
          handleNext();
        }
      }

      setTimeout(() => {
        setDragState({
          active: false,
          startX: 0,
          deltaX: 0,
          hasMoved: false,
        });
      }, 45);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  return (
    <div
      className="flex flex-col items-center select-none w-full max-w-full overflow-hidden"
      data-gsap="reveal"
      data-no-muuri-drag="true"
    >
      <div
        onPointerDown={handleDeckPointerDown}
        className="relative w-full max-w-[330px] sm:max-w-[460px] aspect-square flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y mx-auto overflow-hidden"
        title="برای ورق زدن کارت‌ها، با ماوس یا لمس به چپ یا راست بکشید"
      >
        <div className="absolute inset-2 sm:inset-3 rounded-full bg-gradient-to-tr from-[#E6E2D8] via-[#F1EFEA] to-[#DCE6F7] dark:from-[#162038] dark:via-[#1B2846] dark:to-[#121A2E] border border-slate-300/70 dark:border-[#28395C] shadow-inner" />
        <div className="absolute inset-7 sm:inset-10 rounded-full border border-dashed border-slate-400/35 dark:border-sky-400/20 pointer-events-none" />

        <div className="relative w-full h-full flex items-center justify-center scale-[0.82] sm:scale-100">
          {deckItems.map((card, idx) => {
            const rel = (idx - safeActiveIdx + total) % total;
            const palette = getPosterPalette(card.posterColor, card.category);
            const isFront = rel === 0;

            let fanStyle: React.CSSProperties = {};
            let zIndexClass = 'z-10';

            if (rel === 0) {
              const dragX = dragState.active ? dragState.deltaX : 0;
              const dragRot = dragState.active ? dragState.deltaX * 0.06 - 1.5 : -1.5;
              zIndexClass = 'z-30';
              fanStyle = {
                transform: `translate3d(${dragX}px, -4px, 0) rotate(${dragRot}deg) scale(1)`,
                opacity: 1,
                transition: dragState.active
                  ? 'none'
                  : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
              };
            } else if (rel === 1) {
              zIndexClass = 'z-20';
              fanStyle = {
                transform: 'translate3d(-58px, 10px, 0) rotate(-10deg) scale(0.91)',
                opacity: 0.96,
                transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
              };
            } else if (rel === total - 1) {
              zIndexClass = 'z-20';
              fanStyle = {
                transform: 'translate3d(58px, 10px, 0) rotate(10deg) scale(0.91)',
                opacity: 0.96,
                transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
              };
            } else if (rel === 2) {
              zIndexClass = 'z-10';
              fanStyle = {
                transform: 'translate3d(-96px, 24px, 0) rotate(-18deg) scale(0.82)',
                opacity: 0.88,
                transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
              };
            } else if (rel === total - 2) {
              zIndexClass = 'z-10';
              fanStyle = {
                transform: 'translate3d(96px, 24px, 0) rotate(18deg) scale(0.82)',
                opacity: 0.88,
                transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
              };
            } else {
              zIndexClass = 'z-0 pointer-events-none';
              fanStyle = {
                transform: 'translate3d(0px, 32px, 0) scale(0.74)',
                opacity: 0,
                transition: 'transform 380ms ease, opacity 250ms ease',
              };
            }

            return (
              <div
                key={card.id}
                style={fanStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragState.hasMoved) return;
                  if (!isFront) {
                    setActiveIndex(idx);
                  }
                }}
                className={`absolute w-52 sm:w-60 aspect-3/4 rounded-2xl ${palette.outerBg} p-3.5 shadow-2xl border border-white/50 dark:border-slate-600/50 ${zIndexClass}`}
              >
                <div
                  className={`w-full h-full rounded-xl border ${palette.innerBorder} p-3.5 sm:p-4 flex flex-col justify-between min-w-0`}
                >
                  <div className="flex items-center justify-between text-[10px] smooth-nums">
                    <span className={`font-extrabold whitespace-nowrap ${palette.accentText}`}>
                      {brandNameFa}.
                    </span>
                    <span className={`font-bold whitespace-nowrap ${palette.tagText}`} dir="ltr">
                      {card.posterCode || `SKILL / ۰${idx + 1}`}
                    </span>
                  </div>

                  <div className="my-auto flex items-center justify-center">
                    <PosterGeometricSymbol
                      type={card.posterIconType}
                      strokeColor={palette.symbolStroke}
                      className="w-18 h-18 sm:w-22 sm:h-22"
                    />
                  </div>

                  <div className="space-y-2 text-right min-w-0">
                    <div
                      title={card.title}
                      className={`font-heading text-xs sm:text-sm font-black truncate ${palette.accentText}`}
                    >
                      {card.title}
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-1 min-w-0">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white/80 dark:bg-[#0F172A]/65 text-slate-900 dark:text-white smooth-nums whitespace-nowrap shrink-0">
                        {card.price === 0
                          ? claimedSkillIds.includes(card.id)
                            ? 'در پیشخوان ✓'
                            : 'رایگان'
                          : `${card.price.toLocaleString('fa-IR')} ت`}
                      </span>

                      {isFront ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dragState.hasMoved) return;
                            onSelectSkill(card);
                          }}
                          className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-[#0F172A] text-white inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                        >
                          <Eye className="w-3 h-3 shrink-0" />
                          <span>مشاهده جزئیات</span>
                        </button>
                      ) : (
                        <span
                          className={`text-[9px] font-bold tracking-wider uppercase truncate ${palette.tagText}`}
                          dir="ltr"
                        >
                          {card.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-3 sm:bottom-5 inset-x-2 flex justify-center z-40 pointer-events-none">
          <span className="px-3 py-1 rounded-full ios-glass border border-slate-300/80 dark:border-[#2B3D63] text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-xs truncate max-w-full">
            کارت‌ها را به چپ یا راست بکشید · کلیک روی کارت عقبی برای انتخاب
          </span>
        </div>
      </div>

      <div className="w-full max-w-[460px] pt-3 border-t border-slate-300/80 dark:border-[#243252] space-y-2.5 px-1">
        <div className="flex flex-wrap items-center justify-center gap-1.5 py-0.5">
          {deckItems.map((item, idx) => {
            const isCurrent = idx === safeActiveIdx;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                style={
                  isCurrent
                    ? { backgroundColor: 'var(--accent-primary)', color: '#fff' }
                    : undefined
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold smooth-nums transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isCurrent
                    ? 'shadow-xs scale-105'
                    : 'bg-slate-200/75 dark:bg-[#1A2642] text-slate-700 dark:text-slate-300 hover:bg-slate-300/80'
                }`}
                title={item.title}
              >
                ۰{(idx + 1).toLocaleString('fa-IR')} · {item.category}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="اسکیل قبلی"
              className="w-8 h-8 rounded-lg border border-slate-300 dark:border-[#2A3B60] bg-white dark:bg-[#162038] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="smooth-nums tabular-nums font-bold px-1.5 text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
              ۰{(safeActiveIdx + 1).toLocaleString('fa-IR')} / ۰
              {total.toLocaleString('fa-IR')}
            </span>
            <button
              type="button"
              onClick={handleNext}
              aria-label="اسکیل بعدی"
              className="w-8 h-8 rounded-lg border border-slate-300 dark:border-[#2A3B60] bg-white dark:bg-[#162038] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            {onQuickAddOrDownload && (
              <button
                type="button"
                onClick={() => onQuickAddOrDownload(activeItem)}
                style={
                  !(activeItem.price === 0 && isActiveClaimed)
                    ? { backgroundColor: 'var(--accent-primary)' }
                    : undefined
                }
                className={`px-3 py-1.5 rounded-lg text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap truncate ${
                  activeItem.price === 0 && isActiveClaimed
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'hover:opacity-95'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {activeItem.price === 0
                    ? isActiveClaimed
                      ? 'دانلود از پیشخوان ←'
                      : 'افزودن به حساب'
                    : 'خرید سریع پکیج'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelectSkill(activeItem)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#2A3B60] bg-white dark:bg-[#162038] font-bold text-slate-900 dark:text-white hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>جزئیات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
