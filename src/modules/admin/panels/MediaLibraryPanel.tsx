import React, { useState } from 'react';
import {
  CheckSquare,
  HardDriveDownload,
  Image as ImageIcon,
  Sparkles,
  Square,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { AiEngineConfig, MediaAssetItem } from '../../../core/types';
import { apiJson } from '../../../core/apiClient';
import { resolveStaticImageUrl } from '../../../data/mediaAssets';
import { ServerPaginationBulkBar } from '../components/ServerPaginationBulkBar';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface MediaLibraryPanelProps {
  subView?: 'list' | 'editor';
  onChangeSubView?: (sub: 'list' | 'editor') => void;
  mediaItems: MediaAssetItem[];
  aiConfig: AiEngineConfig;
  canCurrentUserUseAiSeo: boolean;
  accentButtonClass: string;
  onSaveMediaItem: (item: MediaAssetItem) => void;
  onDeleteMediaItem: (id: string) => void;
  onUseMediaInArticle: (media: MediaAssetItem) => void;
  onRefreshFromServer?: () => void;
  onNotice: NoticeFn;
}

export const MediaLibraryPanel: React.FC<MediaLibraryPanelProps> = ({
  subView = 'list',
  onChangeSubView,
  mediaItems,
  aiConfig,
  canCurrentUserUseAiSeo,
  accentButtonClass,
  onSaveMediaItem,
  onDeleteMediaItem,
  onUseMediaInArticle,
  onRefreshFromServer,
  onNotice,
}) => {
  const [internalView, setInternalView] = useState<'list' | 'editor'>(subView);
  const activeView = onChangeSubView ? subView : internalView;
  const setActiveView = (next: 'list' | 'editor') => {
    setInternalView(next);
    onChangeSubView?.(next);
  };

  // Pagination, Filtering & Bulk Selection
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectedMedia, setInspectedMedia] = useState<MediaAssetItem | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Drag & Drop Multi-File Physical Uploader
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingDisk, setIsUploadingDisk] = useState(false);
  const [isMigratingBase64, setIsMigratingBase64] = useState(false);

  // Editor state (shared with centered inspection modal)
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCategory, setMediaCategory] =
    useState<MediaAssetItem['category']>('product');
  const [mediaAltText, setMediaAltText] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaSeoTitle, setMediaSeoTitle] = useState('');
  const [mediaSeoDescription, setMediaSeoDescription] = useState('');
  const [mediaSeoKeywords, setMediaSeoKeywords] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const resetMediaForm = () => {
    setEditingMediaId(null);
    setMediaTitle('');
    setMediaUrl('');
    setMediaCategory('product');
    setMediaAltText('');
    setMediaCaption('');
    setMediaSeoTitle('');
    setMediaSeoDescription('');
    setMediaSeoKeywords('');
  };

  const populateMediaForm = (item: MediaAssetItem) => {
    setEditingMediaId(item.id);
    setMediaTitle(item.title);
    setMediaUrl(item.url);
    setMediaCategory(item.category || 'product');
    setMediaAltText(item.altText);
    setMediaCaption(item.caption);
    setMediaSeoTitle(item.seoTitle);
    setMediaSeoDescription(item.seoDescription);
    setMediaSeoKeywords(item.seoKeywords);
  };

  const handleOpenMediaModal = (item: MediaAssetItem) => {
    populateMediaForm(item);
    setInspectedMedia(item);
  };

  const handleCopyLink = async (urlToCopy: string) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedUrl(urlToCopy);
      onNotice('success', 'آدرس تصویر در کلیپ‌بورد کپی شد.');
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      // ignore
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
      reader.readAsDataURL(file);
    });

  const handlePhysicalFilesUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploadingDisk(true);
    try {
      const filesPayload = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const dataUrl = await readFileAsDataUrl(f);
        filesPayload.push({
          name: f.name,
          title: f.name.replace(/\.[a-zA-Z0-9]+$/, ''),
          dataUrl,
          category: mediaCategory || 'product',
        });
      }

      const { ok, data } = await apiJson<{
        ok?: boolean;
        count?: number;
        items?: MediaAssetItem[];
        error?: string;
      }>('/api/v1/media/upload', {
        method: 'POST',
        body: JSON.stringify({ files: filesPayload }),
      });

      if (!ok || !Array.isArray(data.items)) {
        throw new Error(data.error || 'خطا در آپلود فیزیکی و تولید WebP');
      }

      for (const item of data.items) {
        onSaveMediaItem(item);
      }
      if (data.items[0] && activeView === 'editor') {
        setMediaUrl(data.items[0].url);
        if (!mediaTitle) setMediaTitle(data.items[0].title);
      }
      onRefreshFromServer?.();
      onNotice(
        'success',
        `${data.items.length.toLocaleString('fa-IR')} پرونده در مسیر فیزیکی /public/uploads/ در ۴ سایز WebP (25, 300, 800, Orig) ذخیره شد.`
      );
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در آپلود فایل');
    } finally {
      setIsUploadingDisk(false);
    }
  };

  const handleMigrateLegacyBase64 = async () => {
    setIsMigratingBase64(true);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        migratedCount?: number;
        freedBytes?: number;
        error?: string;
      }>('/api/v1/media/migrate-base64', { method: 'POST' });
      if (!ok) throw new Error(data.error || 'خطا در پاک‌سازی Base64');
      onRefreshFromServer?.();
      onNotice(
        'success',
        `پاک‌سازی دیتابیس انجام شد: ${(data.migratedCount || 0).toLocaleString('fa-IR')} تصویر Base64 به فایل فیزیکی WebP در ۴ سایز تبدیل گردید.`
      );
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در مهاجرت Base64');
    } finally {
      setIsMigratingBase64(false);
    }
  };

  const handleRunImageAiSeo = async () => {
    if (!canCurrentUserUseAiSeo) {
      onNotice('error', 'دسترسی به هوش مصنوعی سئو برای نقش شما محدود است.');
      return;
    }
    if (!mediaTitle.trim()) {
      onNotice('error', 'ابتدا عنوان یا موضوع تصویر را وارد کنید.');
      return;
    }
    setIsAiGenerating(true);
    try {
      const { ok, data } = await apiJson<{
        altText?: string;
        caption?: string;
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
      }>('/api/cms/ai-assist', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'image_seo',
          title: mediaTitle,
          category: mediaCategory,
          currentContent: mediaCaption || mediaAltText,
          provider: aiConfig.activeProvider,
          modelName: aiConfig.modelName,
          tone: aiConfig.defaultTone,
        }),
      });
      if (!ok) throw new Error();
      if (data.altText) setMediaAltText(data.altText);
      if (data.caption) setMediaCaption(data.caption);
      if (data.seoTitle) setMediaSeoTitle(data.seoTitle);
      if (data.seoDescription) setMediaSeoDescription(data.seoDescription);
      if (data.seoKeywords) setMediaSeoKeywords(data.seoKeywords);
      onNotice('success', 'متن جایگزین (Alt Text) و متاتگ‌های سئوی تصویر تولید شد.');
    } catch {
      setMediaAltText(`${mediaTitle} در پلتفرم اسکیل ۹۸`);
      setMediaCaption(`تصویر تخصصی مربوط به ${mediaTitle} — استودیو اسکیل ۹۸`);
      setMediaSeoTitle(`${mediaTitle} | گالری رسانه اسکیل ۹۸`);
      setMediaSeoDescription(`مشاهده تصویر و دیاگرام ${mediaTitle} با کیفیت بالا.`);
      setMediaSeoKeywords(`${mediaTitle}, تصویر شاخص, اسکیل ۹۸`);
      onNotice('success', 'فیلدهای سئوی تصویر تکمیل شدند.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveMediaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim() || !mediaUrl.trim()) {
      onNotice('error', 'عنوان تصویر و آدرس فیزیکی تصویر الزامی است.');
      return;
    }
    const item: MediaAssetItem = {
      ...(inspectedMedia || {}),
      id: editingMediaId || `media_${Date.now()}`,
      title: mediaTitle.trim(),
      url: mediaUrl.trim(),
      category: mediaCategory,
      altText: mediaAltText.trim() || mediaTitle.trim(),
      caption: mediaCaption.trim() || mediaTitle.trim(),
      seoTitle: mediaSeoTitle.trim() || `${mediaTitle.trim()} | اسکیل ۹۸`,
      seoDescription:
        mediaSeoDescription.trim() || mediaCaption.trim() || mediaTitle.trim(),
      seoKeywords: mediaSeoKeywords.trim() || `${mediaTitle.trim()}, اسکیل ۹۸`,
      dimensionsLabel:
        inspectedMedia?.dimensionsLabel || 'WebP Multi-Size (25 / 300 / 800 / Orig)',
      createdAtLabel:
        inspectedMedia?.createdAtLabel || new Date().toLocaleDateString('fa-IR'),
    };
    onSaveMediaItem(item);
    onNotice('success', 'پرونده رسانه و اطلاعات سئوی آن ذخیره شد.');
    setInspectedMedia(null);
    resetMediaForm();
    if (activeView === 'editor') {
      setActiveView('list');
    }
  };

  const filteredItems = mediaItems.filter((m) => {
    if (categoryFilter !== 'all' && (m.category || 'article') !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.url.toLowerCase().includes(q) ||
        (m.altText || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const visibleIds = pagedItems.map((m) => m.id);

  if (activeView === 'list') {
    return (
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
              کتابخانه رسانه چندسایزی WebP ({mediaItems.length.toLocaleString('fa-IR')} پرونده)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              نمای فشرده و استاندارد گالری — روی هر تصویر کلیک کنید تا پنجره جزئیات، لینک‌های ۴ سایز و تنظیمات سئو باز شود.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isMigratingBase64}
              onClick={() => void handleMigrateLegacyBase64()}
              className="px-3 py-2 text-xs font-bold border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>
                {isMigratingBase64 ? 'در حال تبدیل Base64...' : 'مهاجرت Base64 به دیسک WebP'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetMediaForm();
                setActiveView('editor');
              }}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
            >
              + آپلود و افزودن پرونده جدید
            </button>
          </div>
        </div>

        {/* Multi-File Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            void handlePhysicalFilesUpload(e.dataTransfer.files);
          }}
          className={`m-4 p-3.5 rounded-2xl border-2 border-dashed transition-colors flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isDragging
              ? 'border-[#1D4ED8] bg-blue-500/10'
              : 'border-stone-300 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <UploadCloud className="w-6 h-6 text-[#1D4ED8] shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                آپلود چندتایی Drag & Drop روی دیسک (`/api/v1/media/upload`)
              </div>
              <div className="text-[11px] text-stone-500">
                چند تصویر را اینجا رها کنید تا در ۴ سایز WebP بهینه‌سازی شوند.
              </div>
            </div>
          </div>
          <label className="px-3.5 py-2 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-extrabold cursor-pointer shrink-0">
            <span>{isUploadingDisk ? 'در حال تولید ۴ سایز WebP...' : 'انتخاب فایل‌ها از سیستم'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handlePhysicalFilesUpload(e.target.files)}
            />
          </label>
        </div>

        <ServerPaginationBulkBar
          entity="media"
          totalCount={filteredItems.length}
          currentPage={page}
          pageSize={pageSize}
          searchQuery={searchQuery}
          selectedCategory={categoryFilter}
          categoryOptions={[
            { value: 'product', label: 'تصاویر محصولات' },
            { value: 'article', label: 'تصاویر نوشته‌ها' },
            { value: 'banner', label: 'بنرها و اسلایدر' },
          ]}
          selectedIds={selectedIds}
          allVisibleIds={visibleIds}
          bulkActions={[{ value: 'delete', label: 'حذف گروهی پرونده‌ها' }]}
          onChangePage={setPage}
          onChangePageSize={setPageSize}
          onChangeSearch={setSearchQuery}
          onChangeCategory={setCategoryFilter}
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
              selectedIds.forEach((id) => onDeleteMediaItem(id));
              onRefreshFromServer?.();
            }
          }}
          onNotice={onNotice}
        />

        {/* WordPress-Style Compact Square Thumbnail Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
          {pagedItems.map((media) => {
            const checked = selectedIds.includes(media.id);
            return (
              <div
                key={media.id}
                onClick={() => handleOpenMediaModal(media)}
                title={`${media.title} — کلیک برای مشاهده جزئیات و سئو`}
                className={`group relative aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border transition-all cursor-pointer ${
                  checked
                    ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/40'
                    : 'border-stone-200 dark:border-stone-800 hover:border-[#1D4ED8]'
                }`}
              >
                <img
                  src={resolveStaticImageUrl(
                    media.variants?.thumb300 ||
                      media.variants?.['thumb-300'] ||
                      media.variants?.medium800 ||
                      media.url
                  )}
                  alt={media.altText || media.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Corner Bulk Selection Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIds((prev) =>
                      prev.includes(media.id)
                        ? prev.filter((x) => x !== media.id)
                        : [...prev, media.id]
                    );
                  }}
                  aria-label="انتخاب تصویر"
                  className={`absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/90 dark:bg-stone-900/90 shadow-xs transition-opacity cursor-pointer ${
                    checked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-stone-500" />
                  )}
                </button>

                {/* Subtle Bottom Title Strip on Hover */}
                <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-[10px] font-bold text-white truncate">
                    {media.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Centered Media Details & SEO Modal */}
        {inspectedMedia && (
          <div
            className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setInspectedMedia(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold text-[#1D4ED8]">
                    جزئیات پرونده رسانه، سایزهای WebP و تنظیمات سئو
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-stone-900 dark:text-white truncate">
                    {inspectedMedia.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedMedia(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-200/80 dark:bg-stone-800 text-xs font-extrabold cursor-pointer shrink-0"
                >
                  بستن ✕
                </button>
              </div>

              <form
                onSubmit={handleSaveMediaSubmit}
                className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6"
              >
                {/* Preview & Variants Column */}
                <div className="md:col-span-5 space-y-4">
                  <div className="aspect-4/3 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                    <img
                      src={resolveStaticImageUrl(
                        inspectedMedia.variants?.medium800 || inspectedMedia.url
                      )}
                      alt={inspectedMedia.altText || inspectedMedia.title}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2 text-[11px]">
                    <div className="font-extrabold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                      <span>ابعاد و خروجی‌ها:</span>
                      <span className="font-mono text-stone-500">
                        {inspectedMedia.dimensionsLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        dir="ltr"
                        value={inspectedMedia.url}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-[10px] truncate"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCopyLink(inspectedMedia.url)}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-950 font-extrabold cursor-pointer shrink-0"
                      >
                        {copiedUrl === inspectedMedia.url ? 'کپی شد ✓' : 'کپی لینک'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {['25x25', '300x300', '800x600', 'Orig.webp'].map((sz) => (
                        <span
                          key={sz}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold"
                        >
                          {sz}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUseMediaInArticle(inspectedMedia);
                        setInspectedMedia(null);
                      }}
                      className="w-full py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-[#1D4ED8] dark:text-sky-300 text-xs font-extrabold cursor-pointer"
                    >
                      استفاده به عنوان تصویر شاخص نوشته
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteMediaItem(inspectedMedia.id);
                        setInspectedMedia(null);
                      }}
                      className="w-full py-2.5 rounded-xl border border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف دائمی این تصویر</span>
                    </button>
                  </div>
                </div>

                {/* SEO & Metadata Form Column */}
                <div className="md:col-span-7 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                      ویرایش مشخصات و سئوی تصویر
                    </span>
                    <button
                      type="button"
                      disabled={isAiGenerating || !canCurrentUserUseAiSeo}
                      onClick={() => void handleRunImageAiSeo()}
                      className="px-3 py-1.5 rounded-xl bg-[#1D4ED8] text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAiGenerating ? 'در حال تولید...' : 'تولید خودکار سئو با AI'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                        عنوان تصویر *
                      </label>
                      <input
                        type="text"
                        required
                        value={mediaTitle}
                        onChange={(e) => setMediaTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                        متن جایگزین سئو (Alt Text)
                      </label>
                      <input
                        type="text"
                        value={mediaAltText}
                        onChange={(e) => setMediaAltText(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                      کپشن (توضیح زیر تصویر)
                    </label>
                    <input
                      type="text"
                      value={mediaCaption}
                      onChange={(e) => setMediaCaption(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                      عنوان سئو (SEO Title)
                    </label>
                    <input
                      type="text"
                      value={mediaSeoTitle}
                      onChange={(e) => setMediaSeoTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                      توضیحات متا (SEO Description)
                    </label>
                    <textarea
                      rows={2}
                      value={mediaSeoDescription}
                      onChange={(e) => setMediaSeoDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                      کلیدواژه‌های تصویر
                    </label>
                    <input
                      type="text"
                      value={mediaSeoKeywords}
                      onChange={(e) => setMediaSeoKeywords(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectedMedia(null)}
                      className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className={`px-5 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${accentButtonClass}`}
                    >
                      ذخیره تغییرات و سئو
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSaveMediaSubmit}
      className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-5 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mb-1">
            <ImageIcon className="w-4 h-4" />
            <span>ویرایشگر اختصاصی پرونده رسانه و تولید ۴ سایز WebP</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            {editingMediaId ? 'ویرایش پرونده رسانه' : 'آپلود و ثبت پرونده جدید در کتابخانه'}
          </h2>
        </div>

        <button
          type="button"
          disabled={isAiGenerating || !canCurrentUserUseAiSeo}
          onClick={() => void handleRunImageAiSeo()}
          className="px-4 py-2.5 text-xs font-extrabold rounded-xl bg-[#1D4ED8] text-white flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAiGenerating ? 'در حال تولید...' : '✨ سئوی خودکار تصویر با هوش مصنوعی'}</span>
        </button>
      </div>

      <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-between">
        <span className="text-xs text-stone-600 dark:text-stone-400">
          آپلود مستقیم فایل تصویر از سیستم (تبدیل خودکار به ۴ سایز WebP در `/public/uploads/`):
        </span>
        <label className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-extrabold cursor-pointer">
          <span>{isUploadingDisk ? 'در حال آپلود...' : 'انتخاب فایل تصویر'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handlePhysicalFilesUpload(e.target.files)}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold mb-1">عنوان تصویر *</label>
          <input
            type="text"
            required
            value={mediaTitle}
            onChange={(e) => setMediaTitle(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">آدرس فیزیکی تصویر (URL) *</label>
          <input
            type="text"
            required
            dir="ltr"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">متن جایگزین سئو (Alt Text)</label>
          <input
            type="text"
            value={mediaAltText}
            onChange={(e) => setMediaAltText(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
          />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">کپشن تصویر</label>
          <input
            type="text"
            value={mediaCaption}
            onChange={(e) => setMediaCaption(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
          />
        </div>
      </div>

      <div className="flex justify-between items-center gap-2">
        <button
          type="button"
          onClick={() => {
            resetMediaForm();
            setActiveView('list');
          }}
          className="px-4 py-2 text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl cursor-pointer"
        >
          ← بازگشت به کتابخانه رسانه
        </button>
        <button
          type="submit"
          className={`px-5 py-2.5 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
        >
          ذخیره پرونده در کتابخانه رسانه
        </button>
      </div>
    </form>
  );
};
