import React from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import type {
  ActiveTab,
  CatalogFilter,
  CmsDynamicPage,
  FooterTrustBadgesConfig,
  ThemeConfig,
} from '../../core/types';
import { APP_VERSION, DEFAULT_THEME_CONFIG } from '../../data/defaults';
import { resolveResponsiveMediaUrl } from '../../data/mediaAssets';
import { ProgressiveImage } from './ProgressiveImage';

interface SiteFooterProps {
  themeConfig: ThemeConfig;
  dynamicPages?: CmsDynamicPage[];
  onSelectToolAndScroll: (tool: CatalogFilter) => void;
  onNavigate: (tab: ActiveTab) => void;
  onOpenDynamicPage?: (page: CmsDynamicPage) => void;
}

const DEFAULT_BADGES: FooterTrustBadgesConfig = DEFAULT_THEME_CONFIG.footerTrustBadges || {
  enamadEnabled: true,
  enamadMode: 'image',
  enamadImageUrl: '/badges/enamad-seal.svg',
  enamadLinkUrl: 'https://trustseal.enamad.ir/',
  enamadHtmlCode: '',
  enamadLabel: 'نماد اعتماد',
  secondBadgeEnabled: true,
  secondBadgeMode: 'image',
  secondBadgeImageUrl: '/badges/samandehi-seal.svg',
  secondBadgeLinkUrl: 'https://logo.samandehi.ir/',
  secondBadgeHtmlCode: '',
  secondBadgeLabel: 'مجوز رسمی',
};

function sanitizeBadgeCode(rawHtml: string): string {
  return String(rawHtml || '')
    .replace(/<\s*(script|iframe|object|embed|style|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|style|form)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(
      /(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"']*\2/gi,
      '$1="#"'
    );
}

/**
 * Preserves the exact official Iranian eNamad / Samandehi HTML snippet (href, referrerpolicy="origin", code, id, target="_blank"),
 * while optionally rewriting ONLY the inner <img src="..."> to a fast local media library image.
 */
function buildTrustBadgeHtml(
  rawHtml: string,
  replaceImgWithLocal: boolean,
  localImageUrl: string
): string {
  const safe = sanitizeBadgeCode(rawHtml).trim();
  if (!safe) return '';
  if (!replaceImgWithLocal || !localImageUrl) {
    return safe.replace(
      /<img\b([^>]*?)>/gi,
      (_match, attrs: string) =>
        `<img${attrs} loading="lazy" style="max-width:74px;max-height:74px;object-fit:contain;margin:0 auto;display:block;" />`
    );
  }
  const safeImgUrl = localImageUrl.replace(/"/g, '&quot;');
  return safe.replace(/<img\b([^>]*?)>/gi, (_match, attrs: string) => {
    const withoutSrc = attrs.replace(/\s+src\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return `<img${withoutSrc} src="${safeImgUrl}" loading="lazy" style="max-width:74px;max-height:74px;object-fit:contain;margin:0 auto;display:block;" />`;
  });
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  themeConfig,
  dynamicPages = [],
  onSelectToolAndScroll,
  onNavigate,
  onOpenDynamicPage,
}) => {
  const badges: FooterTrustBadgesConfig = {
    ...DEFAULT_BADGES,
    ...(themeConfig.footerTrustBadges || {}),
  };

  const enamadResolvedImg = resolveResponsiveMediaUrl(
    badges.enamadImageUrl || '/badges/enamad-seal.svg',
    'thumb300'
  );
  const secondResolvedImg = resolveResponsiveMediaUrl(
    badges.secondBadgeImageUrl || '/badges/samandehi-seal.svg',
    'thumb300'
  );

  const enamadSnippetHtml = badges.enamadHtmlCode.trim()
    ? buildTrustBadgeHtml(
        badges.enamadHtmlCode,
        badges.enamadMode === 'image',
        enamadResolvedImg
      )
    : '';

  const secondSnippetHtml = badges.secondBadgeHtmlCode.trim()
    ? buildTrustBadgeHtml(
        badges.secondBadgeHtmlCode,
        badges.secondBadgeMode === 'image',
        secondResolvedImg
      )
    : '';

  const publishedPages = dynamicPages.filter((p) => p.status === 'published').slice(0, 3);

  return (
    <footer className="relative bg-[#F4F6FA] dark:bg-[#0B1120] text-slate-600 dark:text-slate-300 pt-10 pb-28 md:pb-8 px-4 sm:px-6 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-6xl mx-auto">
        {/* Main Elevated Rounded Card (Matches Reference Footer Architecture) */}
        <div
          data-reveal="blur-up"
          className="rounded-[28px] bg-white dark:bg-[#111827] border border-slate-200/85 dark:border-slate-800 p-6 sm:p-8 shadow-[0_10px_34px_rgba(15,23,42,0.04)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8"
        >
          {/* Right Side (RTL): Brand Lockup + Tagline Pill + Description + Quick Pill Navigation Links */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Brand + Slogan Tag */}
            <div className="flex flex-wrap items-center gap-3">
              <img
                src={themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                alt={themeConfig.brandNameFa}
                className="w-12 h-12 object-contain shrink-0 block bg-transparent border-0 p-0"
              />
              <h3 className="font-heading text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {themeConfig.brandNameFa}
              </h3>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 text-[#1D4ED8] dark:text-sky-300 text-[11px] font-extrabold">
                {themeConfig.footerQuoteTitle
                  ? themeConfig.footerQuoteTitle.replace(/[«»]/g, '').slice(0, 48)
                  : 'مخزن اسکیل‌های استاندارد هوش مصنوعی'}
              </span>
            </div>

            {/* Clean Editorial Description */}
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
              {themeConfig.footerDescription ||
                'مرجع تخصصی اسکیل‌های استاندارد هوش مصنوعی (Claude، ChatGPT و Codex)، پکیج‌های مهندسی نرم‌افزار، پرداخت امن شاپرک و تحویل آنی دیجیتال برای توسعه‌دهندگان.'}
            </p>

            {/* Interactive Quick-Link Pills (2 tidy rows max, all wired to live actions) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('store')}
                className="px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1D4ED8] dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
              >
                صفحه اصلی
              </button>
              <button
                type="button"
                onClick={() => onSelectToolAndScroll('Claude')}
                className="px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1D4ED8] dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
              >
                اسکیل‌های Claude
              </button>
              <button
                type="button"
                onClick={() => onSelectToolAndScroll('ChatGPT')}
                className="px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1D4ED8] dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
              >
                اسکیل‌های ChatGPT
              </button>
              <button
                type="button"
                onClick={() => onSelectToolAndScroll('Codex')}
                className="px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1D4ED8] dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
              >
                اسکیل‌های Codex
              </button>
              <button
                type="button"
                onClick={() => onNavigate('articles')}
                className="px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1D4ED8] dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
              >
                مجله و آموزش‌ها
              </button>
              {publishedPages.map((pg) => (
                <button
                  key={pg.id}
                  type="button"
                  onClick={() => onOpenDynamicPage?.(pg)}
                  className="px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#1D4ED8] dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
                >
                  {pg.title}
                </button>
              ))}
            </div>
          </div>

          {/* Left Side (RTL): Two Dashed-Border Official Trust Badge Cards (eNamad + Official License) */}
          <div className="flex flex-wrap sm:flex-nowrap items-stretch justify-start lg:justify-end gap-3 shrink-0">
            {/* Slot 1: eNamad */}
            {badges.enamadEnabled && (
              <div className="w-[126px] sm:w-[136px] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-900/70 hover:border-[#1D4ED8]/50 p-3 flex flex-col items-center justify-center gap-2 text-center transition-all duration-200">
                {enamadSnippetHtml ? (
                  <div
                    className="w-full min-h-[76px] flex items-center justify-center overflow-hidden rounded-xl [&_a]:flex [&_a]:items-center [&_a]:justify-center"
                    dangerouslySetInnerHTML={{ __html: enamadSnippetHtml }}
                  />
                ) : (
                  <a
                    referrerPolicy="origin"
                    href={badges.enamadLinkUrl || 'https://trustseal.enamad.ir/'}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    title={badges.enamadLabel || 'نماد اعتماد'}
                    className="flex flex-col items-center gap-2 w-full"
                  >
                    {badges.enamadImageUrl &&
                    badges.enamadImageUrl !== '/badges/enamad-seal.svg' ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white dark:bg-slate-800 p-1 border border-slate-200/70 dark:border-slate-700">
                        <ProgressiveImage
                          src={enamadResolvedImg}
                          alt={badges.enamadLabel || 'نماد اعتماد'}
                          wrapperClassName="w-full h-full"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1D4ED8] dark:text-sky-400 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    )}
                  </a>
                )}
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black text-slate-800 dark:text-slate-100 line-clamp-1">
                    {badges.enamadLabel || 'نماد اعتماد'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">
                    اینماد (eNamad)
                  </div>
                </div>
              </div>
            )}

            {/* Slot 2: Second Official License / Samandehi */}
            {badges.secondBadgeEnabled && (
              <div className="w-[126px] sm:w-[136px] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-900/70 hover:border-amber-500/50 p-3 flex flex-col items-center justify-center gap-2 text-center transition-all duration-200">
                {secondSnippetHtml ? (
                  <div
                    className="w-full min-h-[76px] flex items-center justify-center overflow-hidden rounded-xl [&_a]:flex [&_a]:items-center [&_a]:justify-center"
                    dangerouslySetInnerHTML={{ __html: secondSnippetHtml }}
                  />
                ) : (
                  <a
                    referrerPolicy="origin"
                    href={badges.secondBadgeLinkUrl || 'https://logo.samandehi.ir/'}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    title={badges.secondBadgeLabel || 'مجوز رسمی'}
                    className="flex flex-col items-center gap-2 w-full"
                  >
                    {badges.secondBadgeImageUrl &&
                    badges.secondBadgeImageUrl !== '/badges/samandehi-seal.svg' ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white dark:bg-slate-800 p-1 border border-slate-200/70 dark:border-slate-700">
                        <ProgressiveImage
                          src={secondResolvedImg}
                          alt={badges.secondBadgeLabel || 'مجوز رسمی'}
                          wrapperClassName="w-full h-full"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                    )}
                  </a>
                )}
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black text-slate-800 dark:text-slate-100 line-clamp-1">
                    {badges.secondBadgeLabel || 'مجوز رسمی'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">
                    نشان ملی ثبت
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clean Bottom Copyright Row Beneath Card */}
        <div className="mt-5 px-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 smooth-nums">
          <div className="font-extrabold text-slate-600 dark:text-slate-300 text-center sm:text-right">
            © ۱۴۰۵ تمامی حقوق مادی و معنوی این وب‌سایت متعلق به {themeConfig.brandNameFa} می‌باشد.
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            <span className="font-bold">
              طراحی و توسعه توسط داده‌پردازی فناوران تکنولوژی (dpatech)
            </span>
            <span
              dir="ltr"
              className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300"
            >
              {APP_VERSION}
            </span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#1D4ED8] text-slate-700 dark:text-slate-200 text-[10px] font-extrabold transition-colors cursor-pointer whitespace-nowrap"
            >
              بالای صفحه ↑
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
