import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Globe,
  Image as ImageIcon,
  Images,
  Plus,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AiEngineConfig,
  ComposerRow,
  MediaAssetItem,
  SkillArticle,
  SkillProduct,
} from '../../../core/types';
import { apiJson } from '../../../core/apiClient';
import { IMAGES } from '../../../data/skill98Data';
import { resolveResponsiveMediaUrl } from '../../../data/mediaAssets';
import { computeSeoScore } from './CatalogEditorPanel';
import { ServerPaginationBulkBar } from '../components/ServerPaginationBulkBar';
import { VisualComposerCanvas } from '../components/VisualComposerCanvas';
import { RichTextEditorToolbar } from '../components/RichTextEditorToolbar';
import { MediaPickerModal } from '../components/MediaPickerModal';
import { AiImageStudioWidget } from '../../../../modules/mod_ai_hub_agent/AiImageStudioWidget';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface ArticlesSeoPanelProps {
  mode: 'articles' | 'seo_center';
  subView?: 'list' | 'editor';
  onChangeSubView?: (sub: 'list' | 'editor') => void;
  articles: SkillArticle[];
  products: SkillProduct[];
  mediaItems: MediaAssetItem[];
  aiConfig: AiEngineConfig;
  canCurrentUserUseAiSeo: boolean;
  accentButtonClass: string;
  selectedFeaturedMedia?: { url: string; altText: string } | null;
  onClearSelectedFeaturedMedia?: () => void;
  onSaveArticle: (article: SkillArticle) => void;
  onDeleteArticle: (articleId: string) => void;
  onOpenMediaLibrary: () => void;
  onOptimizeProductSeo: (prod: SkillProduct) => void;
  onRefreshFromServer?: () => void;
  onNotice: NoticeFn;
}

export const ArticlesSeoPanel: React.FC<ArticlesSeoPanelProps> = ({
  mode,
  subView = 'list',
  onChangeSubView,
  articles,
  products,
  mediaItems,
  aiConfig,
  canCurrentUserUseAiSeo,
  accentButtonClass,
  selectedFeaturedMedia,
  onClearSelectedFeaturedMedia,
  onSaveArticle,
  onDeleteArticle,
  onOpenMediaLibrary,
  onOptimizeProductSeo,
  onRefreshFromServer,
  onNotice,
}) => {
  const [internalView, setInternalView] = useState<'list' | 'editor'>(subView);
  const activeView = onChangeSubView ? subView : internalView;
  const scrollToTopSmooth = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const setActiveView = (next: 'list' | 'editor') => {
    scrollToTopSmooth();
    setInternalView(next);
    onChangeSubView?.(next);
  };
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [artTitle, setArtTitle] = useState('');
  const [artSlug, setArtSlug] = useState('');
  const [artCategory, setArtCategory] = useState('راهنمای والدین و استعدادیابی');
  const [artSummary, setArtSummary] = useState('');
  const [artBody, setArtBody] = useState('');
  const [artReadTime, setArtReadTime] = useState<number>(5);
  const [artStatus, setArtStatus] = useState<'published' | 'draft'>('published');
  const [artFeaturedImageUrl, setArtFeaturedImageUrl] = useState<string>(
    IMAGES.heroEditorial
  );
  const [artFeaturedImageAlt, setArtFeaturedImageAlt] = useState<string>('');
  const [artGalleryUrls, setArtGalleryUrls] = useState<string[]>([]);
  const [artSeoTitle, setArtSeoTitle] = useState('');
  const [artSeoDescription, setArtSeoDescription] = useState('');
  const [artSeoKeywords, setArtSeoKeywords] = useState('');
  const [artComposerRows, setArtComposerRows] = useState<ComposerRow[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<'featured' | 'body' | 'gallery' | null>(null);
  const [localUploadedMedia, setLocalUploadedMedia] = useState<MediaAssetItem[]>([]);
  const [draggedGalleryIdx, setDraggedGalleryIdx] = useState<number | null>(null);
  const [dragOverGalleryIdx, setDragOverGalleryIdx] = useState<number | null>(null);
  const combinedMediaItems = [...localUploadedMedia, ...mediaItems.filter((m) => !localUploadedMedia.some((l) => l.id === m.id))];

  const handleReorderArticleGallery = (fromIdx: number, toIdx: number) => {
    setArtGalleryUrls((prev) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= prev.length || toIdx >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  useEffect(() => {
    if (selectedFeaturedMedia) {
      setArtFeaturedImageUrl(selectedFeaturedMedia.url);
      setArtFeaturedImageAlt(selectedFeaturedMedia.altText);
      onClearSelectedFeaturedMedia?.();
      setActiveView('editor');
    }
  }, [selectedFeaturedMedia, onClearSelectedFeaturedMedia]);

  const articleSeoScore = computeSeoScore(
    artSeoTitle || artTitle,
    artSeoDescription || artSummary,
    artSeoKeywords,
    artSlug
  );

  const resetArticleForm = () => {
    setEditingArticleId(null);
    setArtTitle('');
    setArtSlug('');
    setArtCategory('راهنمای والدین و استعدادیابی');
    setArtSummary('');
    setArtBody('');
    setArtReadTime(5);
    setArtStatus('published');
    setArtFeaturedImageUrl(IMAGES.heroEditorial);
    setArtFeaturedImageAlt('');
    setArtGalleryUrls([]);
    setArtSeoTitle('');
    setArtSeoDescription('');
    setArtSeoKeywords('');
    setArtComposerRows([]);
  };

  const handleEditArticleClick = (art: SkillArticle) => {
    setEditingArticleId(art.id);
    setArtTitle(art.title);
    setArtSlug(art.slug);
    setArtCategory(art.category);
    setArtSummary(art.summary);
    setArtBody(art.bodyMarkdown);
    setArtReadTime(art.readingTimeMinutes);
    setArtStatus(art.status);
    setArtFeaturedImageUrl(art.featuredImageUrl || IMAGES.heroEditorial);
    setArtFeaturedImageAlt(art.featuredImageAlt || art.title);
    setArtGalleryUrls(art.galleryUrls || []);
    setArtSeoTitle(art.seoTitle);
    setArtSeoDescription(art.seoDescription);
    setArtSeoKeywords(art.seoKeywords);
    setArtComposerRows(art.composerRows || []);
    setActiveView('editor');
  };

  const handleRunArticleAi = async () => {
    if (!canCurrentUserUseAiSeo) {
      onNotice(
        'error',
        'دسترسی به هوش مصنوعی سئو برای نقش شما توسط سوپر ادمین محدود شده است.'
      );
      return;
    }
    if (!artTitle.trim()) {
      onNotice(
        'error',
        'ابتدا عنوان مقاله را وارد کنید تا هوش مصنوعی بر اساس آن تولید محتوا و سئو را انجام دهد.'
      );
      return;
    }
    setIsAiGenerating(true);
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        summary?: string;
        bodyMarkdown?: string;
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
        suggestedSlug?: string;
      }>('/api/cms/ai-assist', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'article_draft',
          title: artTitle,
          category: artCategory,
          currentContent: artSummary,
          provider: aiConfig.activeProvider,
          modelName: aiConfig.modelName,
          tone: aiConfig.defaultTone,
        }),
      });
      if (!ok) throw new Error(data.error || 'خطا در ارتباط با موتور هوش مصنوعی');
      if (data.summary) setArtSummary(data.summary);
      if (data.bodyMarkdown) setArtBody(data.bodyMarkdown);
      if (data.seoTitle) setArtSeoTitle(data.seoTitle);
      if (data.seoDescription) setArtSeoDescription(data.seoDescription);
      if (data.seoKeywords) setArtSeoKeywords(data.seoKeywords);
      if (data.suggestedSlug && !artSlug) setArtSlug(data.suggestedSlug);
      onNotice(
        'success',
        `سئو و محتوای هوشمند با موتور (${aiConfig.activeProvider.toUpperCase()} · ${aiConfig.modelName}) با موفقیت تکمیل شد.`
      );
    } catch {
      setArtSeoTitle(`${artTitle} | مجله علمی آموزشگاه رباتیک فاتحان`);
      setArtSeoDescription(
        `مطالعه مقاله تخصصی «${artTitle}» در دسته‌بندی ${artCategory} در مجله آموزشی رباتیک، کدنویسی و هوش مصنوعی فاتحان.`
      );
      setArtSeoKeywords(`${artTitle}, ${artCategory}, آموزشگاه رباتیک فاتحان`);
      if (!artSlug) setArtSlug(`article-${Date.now().toString(36)}`);
      onNotice('success', 'فیلدهای سئو به صورت هوشمند تکمیل شدند.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveArticleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artTitle.trim() || !artSummary.trim()) {
      onNotice('error', 'عنوان و خلاصه مقاله الزامی است.');
      return;
    }
    const cleanSlug = artSlug.trim() || `article-${Date.now().toString(36)}`;
    const newArticle: SkillArticle = {
      id: editingArticleId || cleanSlug,
      title: artTitle.trim(),
      slug: cleanSlug,
      category: artCategory.trim(),
      summary: artSummary.trim(),
      bodyMarkdown: artBody.trim() || artSummary.trim(),
      featuredImageUrl: artFeaturedImageUrl.trim() || IMAGES.heroEditorial,
      featuredImageAlt: artFeaturedImageAlt.trim() || artTitle.trim(),
      galleryUrls: artGalleryUrls,
      authorName: 'شورای علمی آموزشگاه رباتیک فاتحان',
      readingTimeMinutes: Number(artReadTime) || 5,
      publishedDateLabel: new Date().toLocaleDateString('fa-IR'),
      status: artStatus,
      seoTitle: artSeoTitle.trim() || `${artTitle.trim()} | مجله آموزشگاه رباتیک فاتحان`,
      seoDescription: artSeoDescription.trim() || artSummary.trim(),
      seoKeywords: artSeoKeywords.trim() || 'آموزشگاه رباتیک فاتحان, آموزش رباتیک کودکان و نوجوانان',
      featured: true,
      composerRows: artComposerRows,
    };
    onSaveArticle(newArticle);
    onNotice('success', 'مقاله به همراه تصویر شاخص و متاتگ‌های سئوی آن منتشر شد.');
    resetArticleForm();
    setActiveView('list');
  };

  if (mode === 'seo_center') {
    return (
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            میز سئو و ممیزی ساختاریافته صفحات (SEO & Schema Audit)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            بررسی وضعیت متاتگ‌ها، نامک‌ها و امتیاز سئوی کلیه محصولات و مقالات
          </p>
        </div>

        <div className="space-y-3">
          {products.map((prod) => {
            const score = computeSeoScore(
              prod.seoTitle || prod.title,
              prod.seoDescription || prod.shortDescription,
              prod.seoKeywords || '',
              prod.slug
            );
            return (
              <div
                key={prod.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 smooth-nums">
                      امتیاز سئو: {score.toLocaleString('fa-IR')}٪
                    </span>
                    <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                      {prod.title}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500">
                    عنوان متا: {prod.seoTitle || `${prod.title} | آموزشگاه رباتیک فاتحان`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOptimizeProductSeo(prod)}
                  className="px-3.5 py-2 min-h-[40px] text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl hover:bg-stone-100 shrink-0 cursor-pointer"
                >
                  بهینه‌سازی سئو با هوش مصنوعی
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeView === 'list') {
    const distinctArticleCategories = Array.from(
      new Set(articles.map((a) => a.category).filter(Boolean))
    ).map((c) => ({ value: c, label: c }));

    const filteredArticles = articles.filter((a) => {
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
    const pagedArticles = filteredArticles.slice(
      (page - 1) * pageSize,
      page * pageSize
    );
    const visibleIds = pagedArticles.map((a) => a.id);

    return (
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
              همه نوشته‌ها و مقالات مجله ({articles.length.toLocaleString('fa-IR')})
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              مجهز به صفحه‌بندی سروری، فیلتر دسته‌بندی و عملیات گروهی انتشار/حذف
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetArticleForm();
              setActiveView('editor');
            }}
            className={`px-4 py-2 min-h-[40px] text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
          >
            + افزودن نوشته جدید
          </button>
        </div>

        <ServerPaginationBulkBar
          entity="articles"
          totalCount={filteredArticles.length}
          currentPage={page}
          pageSize={pageSize}
          searchQuery={searchQuery}
          selectedCategory={categoryFilter}
          selectedStatus={statusFilter}
          categoryOptions={distinctArticleCategories}
          statusOptions={[
            { value: 'published', label: 'منتشرشده' },
            { value: 'draft', label: 'پیش‌نویس' },
          ]}
          selectedIds={selectedIds}
          allVisibleIds={visibleIds}
          bulkActions={[
            { value: 'publish', label: 'انتشار گروهی نوشته‌ها' },
            { value: 'draft', label: 'تبدیل گروهی به پیش‌نویس' },
            { value: 'delete', label: 'حذف گروهی نوشته‌ها' },
          ]}
          onChangePage={setPage}
          onChangePageSize={setPageSize}
          onChangeSearch={setSearchQuery}
          onChangeCategory={setCategoryFilter}
          onChangeStatus={setStatusFilter}
          onToggleSelectAll={() => {
            const allSel = visibleIds.every((id) => selectedIds.includes(id));
            setSelectedIds(
              allSel
                ? selectedIds.filter((id) => !visibleIds.includes(id))
                : Array.from(new Set([...selectedIds, ...visibleIds]))
            );
          }}
          onClearSelection={() => setSelectedIds([])}
          onBulkCompleted={(_cnt, act) => {
            if (act === 'delete') {
              selectedIds.forEach((id) => onDeleteArticle(id));
            }
            onRefreshFromServer?.();
          }}
          onNotice={onNotice}
        />

        <div className="divide-y divide-stone-200 dark:divide-stone-800">
          {pagedArticles.map((art) => {
            const checked = selectedIds.includes(art.id);
            return (
              <div
                key={art.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/60 dark:hover:bg-stone-950/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds((prev) =>
                        prev.includes(art.id)
                          ? prev.filter((x) => x !== art.id)
                          : [...prev, art.id]
                      )
                    }
                    className="mt-0.5 text-stone-500 cursor-pointer"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-[#1D4ED8]" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </button>
                  <img
                    src={resolveResponsiveMediaUrl(art.featuredImageUrl, 'thumb300')}
                    alt={art.title}
                    className="w-14 h-10 rounded-lg object-cover border border-stone-200 dark:border-stone-800 shrink-0 hidden sm:block"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-stone-500 smooth-nums">
                      <span className="font-bold text-[#1D4ED8]">{art.category}</span>
                      <span>·</span>
                      <span>{art.publishedDateLabel}</span>
                      <span>·</span>
                      <span>
                        {art.readingTimeMinutes.toLocaleString('fa-IR')} دقیقه مطالعه
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-stone-900 dark:text-white">
                      {art.title}
                    </div>
                    <div className="text-xs text-stone-500 line-clamp-1">
                      سئو: {art.seoTitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditArticleClick(art)}
                    className="px-3.5 py-2 min-h-[40px] text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl cursor-pointer"
                  >
                    ویرایش در صفحه اختصاصی
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteArticle(art.id)}
                    className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-rose-600 border border-rose-500/30 rounded-xl hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveArticleSubmit} className="space-y-6">
      {/* Top Action Header Bar */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            {editingArticleId
              ? 'ویرایش نوشته و صفحه‌ساز مجله (WP 12-Col Grid)'
              : 'نگارش مقاله و مطلب آموزشی جدید'}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            ستون اصلی (راست: عنوان، ویرایشگر متن غنی و صفحه‌ساز) · ستون کناری (چپ: انتشار، تصویر شاخص زنده و سئو)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isAiGenerating || !canCurrentUserUseAiSeo}
            onClick={() => void handleRunArticleAi()}
            className={`px-4 py-2.5 min-h-[42px] text-xs font-extrabold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
              canCurrentUserUseAiSeo
                ? 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF] shadow-md shadow-blue-600/20'
                : 'bg-stone-200 text-stone-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isAiGenerating
                ? 'در حال نگارش با هوش مصنوعی...'
                : '✨ نگارش خودکار مقاله و سئو'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetArticleForm();
              setActiveView('list');
            }}
            className="px-4 py-2.5 min-h-[42px] text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl cursor-pointer"
          >
            بازگشت به فهرست نوشته‌ها
          </button>
        </div>
      </div>

      {/* WORDPRESS 12-COLUMN SPLIT GRID (Right 8 Cols Main + Left 4 Cols Sticky Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT MAIN COLUMN (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Title & Slug Card */}
          <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
            <div>
              <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1.5">
                عنوان مقاله آموزشی *
              </label>
              <input
                type="text"
                required
                value={artTitle}
                onChange={(e) => setArtTitle(e.target.value)}
                placeholder="مثال: بهترین سن شروع آموزش رباتیک و کدنویسی برای کودکان و نوجوانان"
                className="w-full px-4 py-3 text-base font-extrabold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
              <span className="text-stone-500 font-bold shrink-0">
                نامک یکتا (Slug):
              </span>
              <div
                className="flex-1 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono"
                dir="ltr"
              >
                <span className="text-stone-400">/articles/</span>
                <input
                  type="text"
                  value={artSlug}
                  onChange={(e) => setArtSlug(e.target.value)}
                  placeholder="best-age-for-kids-robotics"
                  className="flex-1 bg-transparent outline-none text-xs font-mono text-stone-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Summary & Rich Text Editor Body Card */}
          <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
            <div>
              <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1.5">
                چکیده مقاله (نمایش در کارت‌های مجله یاهو استایل) *
              </label>
              <textarea
                rows={2}
                required
                value={artSummary}
                onChange={(e) => setArtSummary(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs leading-relaxed rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-2">
                متن کامل مقاله (مجهز به نوار ابزار ویرایشگر متن غنی و Markdown)
              </label>
              <RichTextEditorToolbar
                value={artBody}
                onChange={setArtBody}
                onOpenMediaPicker={() => setMediaPickerMode('body')}
              />
              <textarea
                rows={8}
                value={artBody}
                onChange={(e) => setArtBody(e.target.value)}
                className="w-full px-4 py-3 text-sm leading-relaxed rounded-b-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Visual Drag-and-Drop Composer for Article Body */}
          <VisualComposerCanvas
            contextMode="article"
            rows={artComposerRows}
            onChangeRows={setArtComposerRows}
            products={products}
            contentSummaryContext={{
              title: artTitle,
              summary: artSummary,
              body: artBody,
              imageUrl: artFeaturedImageUrl,
            }}
          />

          <AiImageStudioWidget
            title={artTitle}
            category={artCategory}
            onApplyImageUrl={(url, alt) => {
              setArtFeaturedImageUrl(url);
              if (alt) setArtFeaturedImageAlt(alt);
            }}
            onNotice={onNotice}
          />
        </div>

        {/* LEFT STICKY SIDEBAR COLUMN (lg:col-span-4) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-5">
          {/* Sidebar Card 1: Publish & Reading Time Card */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                انتشار و دسته‌بندی نوشته
              </span>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                {artStatus === 'published' ? 'منتشرشده' : 'پیش‌نویس'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  وضعیت
                </label>
                <select
                  value={artStatus}
                  onChange={(e) =>
                    setArtStatus(e.target.value as 'published' | 'draft')
                  }
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                >
                  <option value="published">منتشرشده</option>
                  <option value="draft">پیش‌نویس</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  زمان مطالعه (دقیقه)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={artReadTime}
                  onChange={(e) => setArtReadTime(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold smooth-nums rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                دسته‌بندی مجله
              </label>
              <input
                type="text"
                value={artCategory}
                onChange={(e) => setArtCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3 min-h-[44px] text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
            >
              {editingArticleId ? 'بروزرسانی مقاله و سئو' : 'انتشار مقاله در مجله'}
            </button>
          </div>

          {/* Sidebar Card 2: Featured Image Card (Clean — Only Selected Featured Image, Opens Centered Modal) */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <span className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#1D4ED8]" />
                <span>تصویر شاخص نوشته</span>
              </span>
              {artFeaturedImageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setArtFeaturedImageUrl('');
                    setArtFeaturedImageAlt('');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  حذف تصویر
                </button>
              )}
            </div>

            {/* Immediate Live Thumbnail Preview (Selected Image Only) */}
            {artFeaturedImageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 aspect-16/10 bg-stone-100 dark:bg-stone-950">
                <img
                  src={resolveResponsiveMediaUrl(artFeaturedImageUrl, 'medium800')}
                  alt={artFeaturedImageAlt || artTitle || 'تصویر شاخص'}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMediaPickerMode('featured')}
                className="w-full aspect-16/10 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-1.5 text-stone-500 hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors cursor-pointer"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs font-bold">برای انتخاب تصویر شاخص کلیک کنید</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMediaPickerMode('featured')}
              className="w-full py-2.5 px-3.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer hover:opacity-95"
            >
              <ImageIcon className="w-4 h-4" />
              <span>{artFeaturedImageUrl ? 'تغییر یا آپلود تصویر شاخص' : 'انتخاب / آپلود تصویر شاخص'}</span>
            </button>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 mb-1">
                متن جایگزین سئو (Alt Text):
              </label>
              <input
                type="text"
                value={artFeaturedImageAlt}
                onChange={(e) => setArtFeaturedImageAlt(e.target.value)}
                placeholder="توضیح تصویر شاخص برای گوگل..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
          </div>

          {/* Sidebar Card 2B: Article Image Gallery (Shows ONLY User-Added Images) */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <span className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Images className="w-4 h-4 text-[#1D4ED8]" />
                <span>گالری تصاویر مقاله ({artGalleryUrls.length.toLocaleString('fa-IR')})</span>
              </span>
              {artGalleryUrls.length > 0 && (
                <button
                  type="button"
                  onClick={() => setArtGalleryUrls([])}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  پاک‌سازی گالری
                </button>
              )}
            </div>

            {artGalleryUrls.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {artGalleryUrls.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggedGalleryIdx(idx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverGalleryIdx !== idx) setDragOverGalleryIdx(idx);
                      }}
                      onDragLeave={() => {
                        if (dragOverGalleryIdx === idx) setDragOverGalleryIdx(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedGalleryIdx !== null && draggedGalleryIdx !== idx) {
                          handleReorderArticleGallery(draggedGalleryIdx, idx);
                        }
                        setDraggedGalleryIdx(null);
                        setDragOverGalleryIdx(null);
                      }}
                      onDragEnd={() => {
                        setDraggedGalleryIdx(null);
                        setDragOverGalleryIdx(null);
                      }}
                      title="برای تغییر ترتیب بکشید و رها کنید"
                      className={`group relative aspect-square rounded-xl overflow-hidden border bg-stone-100 dark:bg-stone-950 cursor-grab active:cursor-grabbing transition-all ${
                        dragOverGalleryIdx === idx
                          ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/40 scale-[1.03]'
                          : draggedGalleryIdx === idx
                          ? 'opacity-45 border-dashed border-[#1D4ED8]'
                          : 'border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <img
                        src={resolveResponsiveMediaUrl(url, 'thumb300')}
                        alt={`گالری ${idx + 1}`}
                        className="w-full h-full object-cover pointer-events-none select-none"
                      />
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-stone-900/70 text-white text-[9px] font-black smooth-nums pointer-events-none">
                        {(idx + 1).toLocaleString('fa-IR')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setArtGalleryUrls((prev) => prev.filter((_, i) => i !== idx))
                        }
                        title="حذف از گالری"
                        className="absolute top-1 left-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {artGalleryUrls.length > 1 && (
                        <div className="absolute bottom-1 inset-x-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              if (idx === 0) return;
                              handleReorderArticleGallery(idx, idx - 1);
                            }}
                            className="w-5 h-5 rounded bg-stone-900/75 text-white flex items-center justify-center disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === artGalleryUrls.length - 1}
                            onClick={() => {
                              if (idx === artGalleryUrls.length - 1) return;
                              handleReorderArticleGallery(idx, idx + 1);
                            }}
                            className="w-5 h-5 rounded bg-stone-900/75 text-white flex items-center justify-center disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {artGalleryUrls.length > 1 && (
                  <p className="text-[10px] text-stone-400">
                    برای تغییر ترتیب نمایش تصاویر، هر تصویر را بکشید و روی جایگاه دلخواه رها کنید (Drag & Drop).
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-stone-400 leading-relaxed">
                هنوز تصویری به گالری مقاله اضافه نشده است. تصاویر اضافه‌شده در صفحه تکی مقاله به‌صورت گالری نمایش داده می‌شوند.
              </p>
            )}

            <button
              type="button"
              onClick={() => setMediaPickerMode('gallery')}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#1D4ED8]/50 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#1D4ED8] dark:text-sky-400 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن تصویر به گالری مقاله</span>
            </button>
          </div>

          {/* Sidebar Card 3: Live RankMath Article SEO Card */}
          <div className="p-5 rounded-2xl border-2 border-blue-500/25 bg-blue-50/25 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/50 pb-2.5">
              <span className="text-xs font-extrabold text-[#1E3A8A] dark:text-blue-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <span>سئوی نوشته (RankMath)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold smooth-nums">
                {articleSeoScore.toLocaleString('fa-IR')} / ۱۰۰
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                عنوان سئو (Meta Title)
              </label>
              <input
                type="text"
                value={artSeoTitle}
                onChange={(e) => setArtSeoTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                کلمات کلیدی (Focus Keywords)
              </label>
              <input
                type="text"
                value={artSeoKeywords}
                onChange={(e) => setArtSeoKeywords(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                توضیحات متا (Meta Description)
              </label>
              <textarea
                rows={2}
                value={artSeoDescription}
                onChange={(e) => setArtSeoDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>
          </div>
        </aside>
      </div>

      <MediaPickerModal
        isOpen={mediaPickerMode !== null}
        mode={mediaPickerMode || 'featured'}
        allowVideo={mediaPickerMode === 'body'}
        mediaItems={combinedMediaItems}
        defaultCategory="article"
        onClose={() => setMediaPickerMode(null)}
        onMediaUploaded={(uploaded) => {
          setLocalUploadedMedia((prev) => [...uploaded, ...prev]);
          onRefreshFromServer?.();
        }}
        onSelect={(sel) => {
          if (mediaPickerMode === 'featured') {
            setArtFeaturedImageUrl(sel.url);
            setArtFeaturedImageAlt(sel.altText);
            onNotice('success', 'تصویر شاخص نوشته بدون خروج از ویرایشگر تنظیم شد.');
          } else if (mediaPickerMode === 'gallery') {
            setArtGalleryUrls((prev) =>
              prev.includes(sel.url) ? prev : [...prev, sel.url]
            );
            onNotice('success', 'تصویر انتخاب‌شده به گالری تصاویر مقاله اضافه شد.');
          } else {
            const snippet =
              sel.mediaType === 'video'
                ? `[video src="${sel.url}" title="${sel.title}"]`
                : `![${sel.altText || sel.title}](${sel.url})`;
            setArtBody((prev) => (prev ? `${prev}\n\n${snippet}\n` : `${snippet}\n`));
            onNotice(
              'success',
              sel.mediaType === 'video'
                ? 'پلیر ویدیو با موفقیت در متن مقاله درج شد.'
                : 'تصویر با سایز بهینه خودکار در متن مقاله درج شد.'
            );
          }
        }}
        onNotice={onNotice}
      />
    </form>
  );
};
