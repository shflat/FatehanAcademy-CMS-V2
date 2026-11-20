import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  Flame,
  Newspaper,
  PenLine,
  Search,
  X,
} from 'lucide-react';
import type { ActiveTab, SkillArticle, SkillProduct } from '../../core/types';
import { resolveResponsiveMediaUrl, resolveStaticImageUrl } from '../../data/mediaAssets';
import { VisualComposerRenderer } from '../../modules/admin/components/VisualComposerRenderer';
import { ProgressiveImage } from './ProgressiveImage';

interface ArticlesViewProps {
  mode: 'articles' | 'article_single';
  brandNameFa: string;
  publishedArticles: SkillArticle[];
  activeArticle: SkillArticle | null;
  activeCatalog: SkillProduct[];
  claimedSkillIds: string[];
  canAccessAdmin: boolean;
  onNavigate: (tab: ActiveTab) => void;
  onOpenFullArticle: (art: SkillArticle) => void;
  onQuickSkillAction: (skill: SkillProduct) => void;
  onOpenProductSingle?: (skill: SkillProduct) => void;
}

export const ArticlesView: React.FC<ArticlesViewProps> = ({
  mode,
  brandNameFa,
  publishedArticles,
  activeArticle,
  activeCatalog,
  claimedSkillIds,
  canAccessAdmin,
  onNavigate,
  onOpenFullArticle,
  onQuickSkillAction,
  onOpenProductSingle,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [articleQuery, setArticleQuery] = useState<string>('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    publishedArticles.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return ['all', ...Array.from(set)];
  }, [publishedArticles]);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = articleQuery.trim().toLowerCase();
    return publishedArticles.filter((a) => {
      const matchesCat = selectedCategory === 'all' || a.category === selectedCategory;
      if (!matchesCat) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        a.title,
        a.summary,
        a.category,
        a.authorName || '',
        a.seoKeywords || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [publishedArticles, selectedCategory, articleQuery]);

  const isSearching = Boolean(articleQuery.trim());
  const leadArticle = !isSearching ? filteredArticles[0] || null : null;
  const remainingArticles = useMemo(() => {
    if (isSearching) return filteredArticles;
    return filteredArticles.slice(1);
  }, [filteredArticles, isSearching]);

  const wireHeadlines = useMemo(
    () =>
      (filteredArticles.length > 1
        ? filteredArticles.slice(1)
        : publishedArticles
      ).slice(0, 4),
    [filteredArticles, publishedArticles]
  );

  if (mode === 'article_single' && activeArticle) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-10 space-y-6 sm:space-y-8">
        {/* Breadcrumb & Back Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-stone-500 smooth-nums min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('store')}
              className="hover:text-stone-900 dark:hover:text-white cursor-pointer shrink-0"
            >
              خانه
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => onNavigate('articles')}
              className="hover:text-stone-900 dark:hover:text-white cursor-pointer shrink-0"
            >
              مجله
            </button>
            <span>/</span>
            <span className="font-bold text-stone-800 dark:text-white truncate max-w-[180px] sm:max-w-xs">
              {activeArticle.title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('articles')}
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-[11px] sm:text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>بازگشت به مجله</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clean Editorial Single Article */}
        <article className="space-y-5 sm:space-y-7">
          <header className="space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-stone-500 dark:text-slate-400 smooth-nums">
              <span className="font-extrabold text-[#1D4ED8] dark:text-sky-400">
                {activeArticle.category}
              </span>
              <span>·</span>
              <span>{activeArticle.publishedDateLabel}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{activeArticle.readingTimeMinutes.toLocaleString('fa-IR')} دقیقه مطالعه</span>
              </span>
            </div>

            <h1 className="text-[19px] sm:text-3xl font-black text-stone-900 dark:text-white leading-[1.55] sm:leading-[1.35]">
              {activeArticle.title}
            </h1>

            <div className="flex items-center gap-2.5 pt-1 text-xs text-stone-500 dark:text-slate-400">
              <div className="w-7 h-7 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center font-extrabold text-[11px] shrink-0">
                اس
              </div>
              <span className="font-bold text-stone-800 dark:text-slate-200">
                {activeArticle.authorName || `تحریریه فنی ${brandNameFa}`}
              </span>
            </div>
          </header>

          {activeArticle.featuredImageUrl && (
            <div className="aspect-[16/9] sm:aspect-21/9 w-full rounded-2xl overflow-hidden bg-stone-200 dark:bg-stone-900">
              <ProgressiveImage
                src={resolveResponsiveMediaUrl(activeArticle.featuredImageUrl, 'medium800')}
                alt={activeArticle.featuredImageAlt || activeArticle.title}
                wrapperClassName="w-full h-full"
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
          )}

          <div className="pr-3.5 border-r-2 border-[#1D4ED8] text-[13px] sm:text-[15px] font-bold text-stone-700 dark:text-stone-200 leading-[1.95]">
            {activeArticle.summary}
          </div>

          {Array.isArray(activeArticle.galleryUrls) && activeArticle.galleryUrls.length > 0 && (
            <div className="space-y-2.5" data-reveal="blur-up">
              <div className="text-xs font-extrabold text-stone-600 dark:text-stone-400">
                گالری تصاویر مقاله ({activeArticle.galleryUrls.length.toLocaleString('fa-IR')} تصویر)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {activeArticle.galleryUrls.map((gUrl, gIdx) => (
                  <div
                    key={`${gUrl}-${gIdx}`}
                    className="aspect-4/3 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900"
                  >
                    <ProgressiveImage
                      src={resolveResponsiveMediaUrl(gUrl, 'medium800')}
                      alt={`${activeArticle.title} - تصویر ${gIdx + 1}`}
                      wrapperClassName="w-full h-full"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 text-[13.5px] sm:text-[15px] text-stone-700 dark:text-stone-300 leading-[2.05]">
            {activeArticle.bodyMarkdown.split('\n').map((rawLine, lineIdx) => {
              const line = rawLine.trim();
              if (!line) return <div key={lineIdx} className="h-1" />;

              const renderInlineTokens = (text: string): React.ReactNode[] => {
                const tokenRegex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
                const nodes: React.ReactNode[] = [];
                let lastIndex = 0;
                let match: RegExpExecArray | null;
                let keyCounter = 0;

                while ((match = tokenRegex.exec(text)) !== null) {
                  if (match.index > lastIndex) {
                    nodes.push(text.slice(lastIndex, match.index));
                  }
                  if (match[2] && match[3]) {
                    const label = match[2];
                    const href = match[3];
                    nodes.push(
                      <a
                        key={`lnk-${lineIdx}-${keyCounter++}`}
                        href={href}
                        onClick={(e) => {
                          if (href.startsWith('/product/')) {
                            e.preventDefault();
                            const targetSlug = href.slice(9).toLowerCase();
                            const found = activeCatalog.find(
                              (p) =>
                                p.slug.toLowerCase() === targetSlug ||
                                p.id.toLowerCase() === targetSlug
                            );
                            if (found) {
                              if (onOpenProductSingle) onOpenProductSingle(found);
                              else onQuickSkillAction(found);
                            }
                          } else if (href.startsWith('/article/')) {
                            e.preventDefault();
                            const targetSlug = href.slice(9).toLowerCase();
                            const foundArt = publishedArticles.find(
                              (a) =>
                                a.slug.toLowerCase() === targetSlug ||
                                a.id.toLowerCase() === targetSlug
                            );
                            if (foundArt) onOpenFullArticle(foundArt);
                          }
                        }}
                        className="font-extrabold text-[#1D4ED8] dark:text-sky-400 underline decoration-[#1D4ED8]/35 underline-offset-4 hover:decoration-[#1D4ED8] transition-colors"
                      >
                        {label}
                      </a>
                    );
                  } else if (match[4]) {
                    nodes.push(
                      <strong
                        key={`b-${lineIdx}-${keyCounter++}`}
                        className="font-extrabold text-stone-900 dark:text-white"
                      >
                        {match[4]}
                      </strong>
                    );
                  } else if (match[5]) {
                    nodes.push(
                      <code
                        key={`c-${lineIdx}-${keyCounter++}`}
                        dir="ltr"
                        className="inline-block px-1.5 py-0.5 mx-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[#1D4ED8] dark:text-sky-300 font-mono text-xs"
                      >
                        {match[5]}
                      </code>
                    );
                  }
                  lastIndex = tokenRegex.lastIndex;
                }
                if (lastIndex < text.length) {
                  nodes.push(text.slice(lastIndex));
                }
                return nodes;
              };

              const videoMatch = /^\[video\s+src="([^"]+)"(?:\s+title="([^"]*)")?\]$/i.exec(line);
              if (videoMatch) {
                return (
                  <figure
                    key={lineIdx}
                    className="my-5 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-950 shadow-sm"
                  >
                    <video
                      src={videoMatch[1]}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-[520px] bg-black"
                    />
                    {videoMatch[2] && (
                      <figcaption className="px-4 py-2.5 text-xs font-bold text-stone-300 bg-stone-900">
                        {videoMatch[2]}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
              if (imgMatch) {
                return (
                  <figure
                    key={lineIdx}
                    className="my-5 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950"
                  >
                    <img
                      src={resolveResponsiveMediaUrl(imgMatch[2], 'medium800')}
                      alt={imgMatch[1] || activeArticle.title}
                      loading="lazy"
                      className="w-full h-auto object-cover"
                    />
                    {imgMatch[1] && (
                      <figcaption className="px-4 py-2 text-xs text-stone-500 text-center bg-stone-50 dark:bg-stone-900">
                        {imgMatch[1]}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              if (line.startsWith('### ')) {
                return (
                  <h3
                    key={lineIdx}
                    className="text-base sm:text-xl font-black text-stone-900 dark:text-white pt-4 pb-1 leading-[1.5]"
                  >
                    {renderInlineTokens(line.slice(4))}
                  </h3>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h2
                    key={lineIdx}
                    className="text-[17px] sm:text-2xl font-black text-stone-900 dark:text-white pt-5 pb-1 leading-[1.5]"
                  >
                    {renderInlineTokens(line.slice(3))}
                  </h2>
                );
              }
              if (line.startsWith('- ') || /^\d+\.\s+/.test(line)) {
                const cleaned = line.replace(/^(-|\d+\.)\s+/, '');
                return (
                  <div key={lineIdx} className="flex items-start gap-2.5 pr-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] mt-3 shrink-0" />
                    <p className="flex-1">{renderInlineTokens(cleaned)}</p>
                  </div>
                );
              }
              return <p key={lineIdx}>{renderInlineTokens(line)}</p>;
            })}
          </div>

          {/* Visual Composer Blocks inside Article */}
          {activeArticle.composerRows && activeArticle.composerRows.length > 0 && (
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
              <VisualComposerRenderer
                rows={activeArticle.composerRows}
                products={activeCatalog}
                onNavigateTab={(tab) => onNavigate(tab)}
                onSelectProduct={(prod) => onOpenProductSingle?.(prod)}
              />
            </div>
          )}

          {activeArticle.seoKeywords && (
            <div className="pt-5 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500">
              <span className="font-bold text-stone-700 dark:text-stone-300">کلیدواژه‌ها:</span>
              {activeArticle.seoKeywords.split(',').map((kw, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setArticleQuery(kw.trim());
                    onNavigate('articles');
                  }}
                  className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  #{kw.trim()}
                </button>
              ))}
            </div>
          )}
        </article>

        {/* Related Skills & Articles — Clean Hairline Sections */}
        <div className="pt-6 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h3 className="text-sm font-black text-stone-900 dark:text-white">
              اسکیل‌های مرتبط با این مقاله
            </h3>
            <div className="divide-y divide-stone-200/80 dark:divide-stone-800">
              {activeCatalog.slice(0, 2).map((sk) => (
                <div key={sk.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="cursor-pointer min-w-0" onClick={() => onOpenProductSingle?.(sk)}>
                    <div className="text-[11px] font-bold text-[#1D4ED8] smooth-nums">
                      {sk.category} ·{' '}
                      {sk.price === 0 ? 'رایگان' : `${sk.price.toLocaleString('fa-IR')} تومان`}
                    </div>
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white mt-0.5 hover:text-[#1D4ED8] truncate">
                      {sk.title}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenProductSingle ? onOpenProductSingle(sk) : onQuickSkillAction(sk)
                    }
                    className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-[11px] font-extrabold shrink-0 cursor-pointer"
                  >
                    {sk.price === 0
                      ? claimedSkillIds.includes(sk.id)
                        ? 'دانلود ←'
                        : 'دریافت رایگان'
                      : 'مشاهده'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-black text-stone-900 dark:text-white">
              سایر مقالات تحریریه
            </h3>
            <div className="divide-y divide-stone-200/80 dark:divide-stone-800">
              {publishedArticles
                .filter((a) => a.id !== activeArticle.id)
                .slice(0, 2)
                .map((otherArt) => (
                  <div
                    key={otherArt.id}
                    onClick={() => onOpenFullArticle(otherArt)}
                    className="py-3 flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] text-stone-500 smooth-nums">
                        {otherArt.category} · {otherArt.readingTimeMinutes.toLocaleString('fa-IR')}{' '}
                        دقیقه
                      </div>
                      <div className="text-xs font-extrabold text-stone-900 dark:text-white group-hover:text-[#1D4ED8] truncate mt-0.5">
                        {otherArt.title}
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-stone-400 group-hover:text-[#1D4ED8] shrink-0" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Clean, Airy, Box-Free Editorial Magazine Archive Layout (mode === 'articles')
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-9 space-y-5 sm:space-y-8">
      {/* Unboxed Editorial Masthead */}
      <header className="space-y-3.5 sm:space-y-5 pb-4 sm:pb-6 border-b border-stone-200/90 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#1D4ED8] dark:text-sky-400">
              <Newspaper className="w-3.5 h-3.5 shrink-0" />
              <span>مجله تحریریه و مهندسی {brandNameFa}</span>
            </div>
            <h1 className="text-[16px] sm:text-2xl lg:text-[1.75rem] font-black text-stone-900 dark:text-white leading-[1.55] sm:leading-[1.38]">
              تازه‌ترین تحلیل‌ها، معماری‌های هوش مصنوعی و استک وب
            </h1>
          </div>

          {canAccessAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl border border-stone-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-stone-800 dark:text-slate-100 hover:border-[#1D4ED8] hover:text-[#1D4ED8] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">نگارش مقاله جدید</span>
              <span className="sm:hidden">نگارش</span>
            </button>
          )}
        </div>

        {/* Search Bar + Non-Scrolling Category Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Instant Magazine Search */}
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={articleQuery}
              onChange={(e) => setArticleQuery(e.target.value)}
              placeholder="جستجو در مقالات، موضوعات و کلیدواژه‌ها..."
              aria-label="جستجو در مجله"
              className="w-full h-10 pr-9 pl-8 rounded-xl border border-stone-200/90 dark:border-slate-700/80 bg-white dark:bg-[#131C31] text-xs text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-all"
            />
            {articleQuery && (
              <button
                type="button"
                onClick={() => setArticleQuery('')}
                aria-label="پاک کردن جستجو"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile: Clean Native Select Filter (Zero Horizontal Scroll!) */}
          <div className="sm:hidden flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="فیلتر موضوع مقالات"
                className="w-full h-10 appearance-none pr-3 pl-8 rounded-xl border border-stone-200/90 dark:border-slate-700/80 bg-white dark:bg-[#131C31] text-xs font-bold text-stone-800 dark:text-slate-100 focus:outline-none focus:border-[#1D4ED8]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all'
                      ? `همه موضوعات (${publishedArticles.length.toLocaleString('fa-IR')})`
                      : cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span className="text-[11px] font-bold text-stone-500 dark:text-slate-400 whitespace-nowrap smooth-nums px-1">
              {filteredArticles.length.toLocaleString('fa-IR')} مطلب
            </span>
          </div>

          {/* Desktop/Tablet: Clean Flex-Wrap Filter Buttons (Zero Horizontal Scrollbar) */}
          <div className="hidden sm:flex flex-wrap items-center gap-1.5 flex-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1D4ED8] text-white'
                    : 'text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800'
                }`}
              >
                {cat === 'all'
                  ? `همه موضوعات (${publishedArticles.length.toLocaleString('fa-IR')})`
                  : cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Empty Search Result State */}
      {filteredArticles.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400">
            مقاله‌ای مطابق با «{articleQuery}» پیدا نشد.
          </p>
          <button
            type="button"
            onClick={() => {
              setArticleQuery('');
              setSelectedCategory('all');
            }}
            className="text-xs font-bold text-[#1D4ED8] hover:underline cursor-pointer"
          >
            نمایش همه مقالات مجله
          </button>
        </div>
      ) : (
        <>
          {/* Editorial Lead Spread (Clean Media + Crisp Typography Below — Zero Text Clutter Over Image) */}
          {leadArticle && (
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start pb-6 sm:pb-8 border-b border-stone-200/90 dark:border-slate-800">
              {/* 7-Col Lead Article */}
              <article
                onClick={() => onOpenFullArticle(leadArticle)}
                className="lg:col-span-7 group cursor-pointer space-y-3 sm:space-y-4"
              >
                {leadArticle.featuredImageUrl && (
                  <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-200 dark:bg-slate-800">
                    <img
                      src={resolveStaticImageUrl(leadArticle.featuredImageUrl)}
                      alt={leadArticle.featuredImageAlt || leadArticle.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500 dark:text-slate-400 smooth-nums">
                    <span className="font-extrabold text-[#1D4ED8] dark:text-sky-400">
                      تیتر برگزیده
                    </span>
                    <span>·</span>
                    <span className="font-bold text-stone-700 dark:text-slate-300">
                      {leadArticle.category}
                    </span>
                    <span>·</span>
                    <span>{leadArticle.publishedDateLabel}</span>
                    <span>·</span>
                    <span>{leadArticle.readingTimeMinutes.toLocaleString('fa-IR')} دقیقه</span>
                  </div>

                  <h2 className="text-[16px] sm:text-xl lg:text-2xl font-black text-stone-900 dark:text-white leading-[1.6] sm:leading-[1.42] group-hover:text-[#1D4ED8] transition-colors">
                    {leadArticle.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-400 leading-[1.85] line-clamp-2">
                    {leadArticle.summary}
                  </p>

                  <div className="pt-1 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1D4ED8] dark:text-sky-400">
                    <span>مطالعه مقاله</span>
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                  </div>
                </div>
              </article>

              {/* 5-Col Desktop Editorial Wire (Hidden on small mobile to prevent duplicating the list below) */}
              <aside className="hidden lg:flex lg:col-span-5 flex-col justify-between lg:border-r lg:border-stone-200/90 dark:lg:border-slate-800 lg:pr-7 space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-stone-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 dark:text-white">
                    <Flame className="w-4 h-4 text-rose-500" />
                    <span>پربازدیدترین عناوین تحریریه</span>
                  </div>
                  <span className="text-[11px] font-bold text-stone-400 smooth-nums">
                    {filteredArticles.length.toLocaleString('fa-IR')} مقاله
                  </span>
                </div>

                <div className="divide-y divide-stone-200/80 dark:divide-slate-800">
                  {wireHeadlines.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => onOpenFullArticle(item)}
                      className="py-3.5 first:pt-1 last:pb-1 flex items-start gap-3 group cursor-pointer"
                    >
                      <span className="text-sm font-black text-[#1D4ED8]/70 dark:text-sky-400/80 w-5 shrink-0 smooth-nums pt-0.5">
                        {(idx + 1).toLocaleString('fa-IR')}.
                      </span>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-slate-400 smooth-nums">
                          <span className="font-bold text-stone-700 dark:text-slate-300">
                            {item.category}
                          </span>
                          <span>·</span>
                          <span>{item.readingTimeMinutes.toLocaleString('fa-IR')} دقیقه</span>
                        </div>
                        <h3 className="text-[13px] font-extrabold text-stone-900 dark:text-white leading-[1.55] group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </section>
          )}

          {/* Editorial Feed: Clean Hairline Rows on Mobile, Clean Editorial Grid on Desktop */}
          {remainingArticles.length > 0 && (
            <section className="space-y-3 sm:space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-lg font-black text-stone-900 dark:text-white">
                  {isSearching
                    ? `نتایج جستجو (${filteredArticles.length.toLocaleString('fa-IR')})`
                    : 'سایر مقالات و راهنماهای تخصصی'}
                </h2>
              </div>

              {/* Mobile: Scannable Editorial List with Hairline Dividers (NO Stacked Boxes) */}
              <div className="md:hidden divide-y divide-stone-200/85 dark:divide-slate-800">
                {remainingArticles.map((art) => (
                  <article
                    key={art.id}
                    onClick={() => onOpenFullArticle(art)}
                    className="py-3.5 first:pt-1 flex items-start gap-3 group cursor-pointer"
                  >
                    {art.featuredImageUrl && (
                      <div className="w-[82px] h-[82px] rounded-xl overflow-hidden bg-stone-200 dark:bg-slate-800 shrink-0">
                        <img
                          src={resolveStaticImageUrl(art.featuredImageUrl)}
                          alt={art.featuredImageAlt || art.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10.5px] text-stone-500 dark:text-slate-400 smooth-nums">
                        <span className="font-bold text-[#1D4ED8] dark:text-sky-400 truncate">
                          {art.category}
                        </span>
                        <span>·</span>
                        <span className="shrink-0">
                          {art.readingTimeMinutes.toLocaleString('fa-IR')} دقیقه
                        </span>
                      </div>
                      <h3 className="text-[13px] font-extrabold text-stone-900 dark:text-white leading-[1.6] line-clamp-2 group-hover:text-[#1D4ED8] transition-colors">
                        {art.title}
                      </h3>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-[1.7] line-clamp-1">
                        {art.summary}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              {/* Tablet/Desktop: Crisp Unboxed 2/3-Column Editorial Grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                {remainingArticles.map((art) => (
                  <article
                    key={art.id}
                    data-gsap="reveal"
                    onClick={() => onOpenFullArticle(art)}
                    className="group flex flex-col justify-between space-y-3 cursor-pointer pb-4 border-b border-stone-200/75 dark:border-slate-800"
                  >
                    <div className="space-y-3">
                      {art.featuredImageUrl && (
                        <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-stone-100 dark:bg-slate-800">
                          <img
                            src={resolveStaticImageUrl(art.featuredImageUrl)}
                            alt={art.featuredImageAlt || art.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-stone-500 smooth-nums">
                        <span className="font-bold text-[#1D4ED8] dark:text-sky-400">
                          {art.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{art.readingTimeMinutes.toLocaleString('fa-IR')} دقیقه</span>
                        </span>
                      </div>
                      <h3 className="text-[15px] font-extrabold text-stone-900 dark:text-white leading-[1.5] group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-slate-400 leading-[1.8] line-clamp-2">
                        {art.summary}
                      </p>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-stone-500 smooth-nums">
                      <span>{art.publishedDateLabel}</span>
                      <span className="font-extrabold text-[#1D4ED8] dark:text-sky-400 inline-flex items-center gap-1">
                        <span>مطالعه</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
