import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Crown,
  Database,
  Download,
  FileArchive,
  Link2,
  Lock,
  Package,
  Plus,
  PlusCircle,
  Edit3,
  ShieldCheck,
  Trash2,
  Sparkles,
  Square,
  Globe,
  UploadCloud,
  Image as ImageIcon,
  Images,
  Layers,
  Tag,
  X,
} from 'lucide-react';
import type {
  AiEngineConfig,
  ComposerRow,
  MediaAssetItem,
  PosterColorScheme,
  ProductDownloadFile,
  ProductTypeKind,
  SkillProduct,
  TaxonomyItem,
  ThemeConfig,
} from '../../../core/types';
import { apiJson } from '../../../core/apiClient';
import { IMAGES } from '../../../data/skill98Data';
import { resolveResponsiveMediaUrl } from '../../../data/mediaAssets';
import { ServerPaginationBulkBar } from '../components/ServerPaginationBulkBar';
import { VisualComposerCanvas } from '../components/VisualComposerCanvas';
import { RichTextEditorToolbar } from '../components/RichTextEditorToolbar';
import { MediaPickerModal } from '../components/MediaPickerModal';
import { AiImageStudioWidget } from '../../../../modules/mod_ai_hub_agent/AiImageStudioWidget';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

export interface ProductEditorDraft {
  editingId?: string;
  title: string;
  slug: string;
  category: string;
  subCategory: string;
  itemType: 'product' | 'package';
  productType: ProductTypeKind;
  downloadFiles: ProductDownloadFile[];
  downloadAccessNote: string;
  downloadLimitPerUser: number;
  price: number;
  originalPrice: number;
  shortDescription: string;
  expectedOutput: string;
  modulesCount: number;
  durationHours: number;
  level: string;
  posterColor: PosterColorScheme;
  imageUrl: string;
  galleryUrls: string[];
  featured: boolean;
  status: 'published' | 'draft';
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  composerRows: ComposerRow[];
}

export function createEmptyProductDraft(): ProductEditorDraft {
  return {
    editingId: undefined,
    title: '',
    slug: '',
    category: 'Codex',
    subCategory: 'کدنویسی و معماری',
    itemType: 'product',
    productType: 'downloadable',
    downloadFiles: [],
    downloadAccessNote: '',
    downloadLimitPerUser: 0,
    price: 0,
    originalPrice: 0,
    shortDescription: '',
    expectedOutput: '',
    modulesCount: 3,
    durationHours: 1,
    level: 'نسخه ۱.۰ · آماده اجرا',
    posterColor: 'cobalt',
    imageUrl: IMAGES.fullstackPkg,
    galleryUrls: [],
    featured: true,
    status: 'published',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    composerRows: [],
  };
}

export function productToDraft(item: SkillProduct): ProductEditorDraft {
  const inferredType: ProductTypeKind =
    item.productType ||
    (item.deliveryType === 'physical' ? 'physical' : 'downloadable');
  return {
    editingId: item.id,
    title: item.title,
    slug: item.slug,
    category: item.category,
    subCategory: item.subCategory || 'کاربردی',
    itemType: item.itemType,
    productType: inferredType,
    downloadFiles: Array.isArray(item.downloadFiles) ? item.downloadFiles : [],
    downloadAccessNote: item.downloadAccessNote || '',
    downloadLimitPerUser: item.downloadLimitPerUser || 0,
    price: item.price,
    originalPrice: item.originalPrice,
    shortDescription: item.shortDescription,
    expectedOutput: item.expectedOutput || '',
    modulesCount: item.modulesCount,
    durationHours: item.durationHours,
    level: item.level,
    posterColor: item.posterColor || 'cobalt',
    imageUrl: item.imageUrl,
    galleryUrls: item.galleryUrls || [],
    featured: item.featured,
    status: item.status,
    seoTitle: item.seoTitle || item.title,
    seoDescription: item.seoDescription || item.shortDescription,
    seoKeywords: item.seoKeywords || `${item.category}, اسکیل ۹۸, دانلود اسکیل`,
    composerRows: item.composerRows || [],
  };
}

export function computeSeoScore(t: string, d: string, k: string, s: string): number {
  let score = 20;
  if (t.trim().length >= 15) score += 25;
  if (d.trim().length >= 40) score += 25;
  if (k.trim().includes(',') || k.trim().length >= 10) score += 15;
  if (s.trim().length >= 4) score += 15;
  return Math.min(100, score);
}

interface CatalogEditorPanelProps {
  mode: 'catalog' | 'editor';
  products: SkillProduct[];
  mediaItems?: MediaAssetItem[];
  draft: ProductEditorDraft;
  onChangeDraft: (next: ProductEditorDraft) => void;
  onSwitchSection: (sec: 'catalog' | 'editor') => void;
  onSaveProduct: (
    product: Omit<SkillProduct, 'authorId'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSeedCatalog: () => Promise<void>;
  themeConfig: ThemeConfig;
  aiConfig: AiEngineConfig;
  canCurrentUserUseAiSeo: boolean;
  accentButtonClass: string;
  onRefreshFromServer?: () => void;
  onNotice: NoticeFn;
}

export const CatalogEditorPanel: React.FC<CatalogEditorPanelProps> = ({
  mode,
  products,
  mediaItems = [],
  draft,
  onChangeDraft,
  onSwitchSection,
  onSaveProduct,
  onDeleteProduct,
  onSeedCatalog,
  themeConfig,
  aiConfig,
  canCurrentUserUseAiSeo,
  accentButtonClass,
  onRefreshFromServer,
  onNotice,
}) => {
  const [adminCatalogSearch, setAdminCatalogSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [taxonomies, setTaxonomies] = useState<TaxonomyItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<'featured' | 'body' | 'gallery' | null>(null);
  const [localUploadedMedia, setLocalUploadedMedia] = useState<MediaAssetItem[]>([]);
  const [draggedGalleryIdx, setDraggedGalleryIdx] = useState<number | null>(null);
  const [dragOverGalleryIdx, setDragOverGalleryIdx] = useState<number | null>(null);
  const [uploadingProtectedFile, setUploadingProtectedFile] = useState(false);
  const [extFileTitle, setExtFileTitle] = useState('');
  const [extFileUrl, setExtFileUrl] = useState('');
  const [extFileVersion, setExtFileVersion] = useState('v1.0');
  const [extFileSizeLabel, setExtFileSizeLabel] = useState('');
  const combinedMediaItems = [
    ...localUploadedMedia,
    ...mediaItems.filter((m) => !localUploadedMedia.some((l) => l.id === m.id)),
  ];

  const handleUploadProtectedDownloadFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 40 * 1024 * 1024) {
      onNotice('error', 'حداکثر حجم آپلود مستقیم ۴۰ مگابایت است. برای فایل‌های حجیم‌تر از بخش «لینک هاست دانلود» استفاده کنید.');
      return;
    }
    setUploadingProtectedFile(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('خطا در خواندن فایل انتخاب‌شده'));
        reader.readAsDataURL(file);
      });
      const { ok, data } = await apiJson<{
        ok?: boolean;
        file?: ProductDownloadFile;
        error?: string;
      }>('/api/v1/downloads/upload', {
        method: 'POST',
        body: JSON.stringify({
          title: file.name.replace(/\.[^.]+$/, ''),
          fileName: file.name,
          dataUrl,
          version: extFileVersion.trim() || '1.0.0',
        }),
      });
      if (!ok || !data.file) {
        throw new Error(data.error || 'خطا در آپلود فایل محافظت‌شده');
      }
      onChangeDraft({
        ...draft,
        productType: draft.productType === 'physical' ? 'downloadable' : draft.productType,
        downloadFiles: [...(draft.downloadFiles || []), data.file],
      });
      onNotice('success', `فایل «${file.name}» در مسیر امن و غیرقابل دسترسی مستقیم ذخیره شد.`);
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در آپلود فایل دانلودی');
    } finally {
      setUploadingProtectedFile(false);
    }
  };

  const handleAddExternalDownloadHostLink = () => {
    const cleanTitle = extFileTitle.trim();
    const cleanUrl = extFileUrl.trim();
    if (!cleanTitle || !/^https?:\/\//i.test(cleanUrl)) {
      onNotice('error', 'لطفاً عنوان فایل و لینک معتبر هاست دانلود (شروع با https://) را وارد کنید.');
      return;
    }
    const newItem: ProductDownloadFile = {
      id: `dl_ext_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      title: cleanTitle,
      fileName: cleanTitle,
      storageType: 'external_host',
      sourceUrl: cleanUrl,
      version: extFileVersion.trim() || '1.0.0',
      fileSizeLabel: extFileSizeLabel.trim() || undefined,
      protectedDownload: true,
    };
    onChangeDraft({
      ...draft,
      productType: draft.productType === 'physical' ? 'downloadable' : draft.productType,
      downloadFiles: [...(draft.downloadFiles || []), newItem],
    });
    setExtFileTitle('');
    setExtFileUrl('');
    setExtFileSizeLabel('');
    onNotice('success', `لینک فایل «${cleanTitle}» با لایه پروکسی امن (بدون لو رفتن آدرس هاست) اضافه شد.`);
  };

  const handleRemoveDownloadFile = (fileId: string) => {
    onChangeDraft({
      ...draft,
      downloadFiles: (draft.downloadFiles || []).filter((f) => f.id !== fileId),
    });
  };

  const handleRenameDownloadFile = (fileId: string, nextTitle: string) => {
    onChangeDraft({
      ...draft,
      downloadFiles: (draft.downloadFiles || []).map((f) =>
        f.id === fileId ? { ...f, title: nextTitle } : f
      ),
    });
  };

  const handleReorderProductGallery = (fromIdx: number, toIdx: number) => {
    const list = [...(draft.galleryUrls || [])];
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= list.length || toIdx >= list.length) {
      return;
    }
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    onChangeDraft({ ...draft, galleryUrls: list });
  };

  const scrollToTopSmooth = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    void apiJson<{ ok?: boolean; items?: TaxonomyItem[] }>(
      '/api/v1/taxonomies?type=product_category'
    )
      .then(({ ok, data }) => {
        if (ok && Array.isArray(data.items)) {
          setTaxonomies(data.items);
        }
      })
      .catch(() => {});
  }, []);

  const productSeoScore = computeSeoScore(
    draft.seoTitle || draft.title,
    draft.seoDescription || draft.shortDescription,
    draft.seoKeywords,
    draft.slug
  );

  const handleRunProductAi = async () => {
    if (!canCurrentUserUseAiSeo) {
      onNotice(
        'error',
        'دسترسی به هوش مصنوعی سئو برای نقش شما توسط سوپر ادمین محدود شده است.'
      );
      return;
    }
    if (!draft.title.trim()) {
      onNotice(
        'error',
        'ابتدا عنوان محصول را وارد کنید تا هوش مصنوعی بر اساس آن تولید محتوا و سئو را انجام دهد.'
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
          mode: 'product_copy',
          title: draft.title,
          category: draft.category,
          currentContent: draft.shortDescription,
          provider: aiConfig.activeProvider,
          modelName: aiConfig.modelName,
          tone: aiConfig.defaultTone,
        }),
      });
      if (!ok) {
        throw new Error(data.error || 'خطا در ارتباط با موتور هوش مصنوعی');
      }
      onChangeDraft({
        ...draft,
        shortDescription: data.summary || draft.shortDescription,
        expectedOutput: data.bodyMarkdown
          ? data.bodyMarkdown.slice(0, 320)
          : draft.expectedOutput,
        seoTitle: data.seoTitle || draft.seoTitle,
        seoDescription: data.seoDescription || draft.seoDescription,
        seoKeywords: data.seoKeywords || draft.seoKeywords,
        slug: !draft.slug && data.suggestedSlug ? data.suggestedSlug : draft.slug,
      });
      onNotice(
        'success',
        `سئو و محتوای هوشمند با موتور (${aiConfig.activeProvider.toUpperCase()} · ${aiConfig.modelName}) با موفقیت تکمیل شد.`
      );
    } catch {
      onChangeDraft({
        ...draft,
        seoTitle: `${draft.title} | دانلود و راهنمای کاربردی در اسکیل ۹۸`,
        seoDescription: `دریافت و آموزش کامل «${draft.title}» ویژه ${draft.category} با خروجی استاندارد و آماده استفاده در پروژه‌های واقعی.`,
        seoKeywords: `${draft.title}, اسکیل ${draft.category}, اسکیل ۹۸, دانلود اسکیل`,
        slug: draft.slug || `skill-${Date.now().toString(36)}`,
      });
      onNotice('success', 'فیلدهای سئو به صورت هوشمند تکمیل شدند.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.shortDescription.trim()) {
      onNotice('error', 'لطفاً عنوان و توضیحات کوتاه اسکیل را وارد نمایید.');
      return;
    }
    setIsSaving(true);
    try {
      const generatedSlug =
        draft.slug.trim() ||
        `skill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      await onSaveProduct(
        {
          id: draft.editingId || generatedSlug,
          title: draft.title.trim(),
          slug: generatedSlug,
          category: draft.category.trim(),
          subCategory: draft.subCategory.trim(),
          itemType: draft.itemType,
          productType: draft.productType,
          deliveryType: draft.productType === 'physical' ? 'physical' : 'digital',
          downloadFiles: draft.productType === 'physical' ? [] : draft.downloadFiles || [],
          downloadAccessNote: draft.downloadAccessNote.trim() || undefined,
          downloadLimitPerUser: Number(draft.downloadLimitPerUser) || 0,
          price: Number(draft.price),
          originalPrice: Number(draft.originalPrice),
          shortDescription: draft.shortDescription.trim(),
          expectedOutput:
            draft.expectedOutput.trim() ||
            'خروجی استاندارد و ساختاریافته متناسب با ابزار انتخاب‌شده.',
          modulesCount: Number(draft.modulesCount),
          durationHours: Number(draft.durationHours),
          level: draft.level.trim(),
          posterColor: draft.posterColor,
          posterIconType:
            draft.category === 'Claude'
              ? 'starburst'
              : draft.category === 'ChatGPT'
              ? 'radial'
              : draft.itemType === 'package'
              ? 'shield'
              : 'braces',
          imageUrl: draft.imageUrl,
          galleryUrls: draft.galleryUrls || [],
          featured: draft.featured,
          status: draft.status,
          seoTitle: draft.seoTitle.trim() || `${draft.title.trim()} | اسکیل ۹۸`,
          seoDescription: draft.seoDescription.trim() || draft.shortDescription.trim(),
          seoKeywords: draft.seoKeywords.trim() || `${draft.category}, اسکیل ۹۸`,
          composerRows: draft.composerRows,
        },
        draft.editingId
      );

      onNotice(
        'success',
        draft.editingId
          ? 'اسکیل و تنظیمات سئوی آن با موفقیت بروزرسانی شد.'
          : 'اسکیل جدید با تنظیمات کامل سئو به کاتالوگ اسکیل ۹۸ اضافه گردید.'
      );
      onChangeDraft(createEmptyProductDraft());
      scrollToTopSmooth();
      onSwitchSection('catalog');
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در ذخیره‌سازی محصول'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const dynamicCategoryOptions =
    taxonomies.length > 0
      ? taxonomies.map((t) => ({
          value: t.slug,
          label: t.parentId ? `↳ ${t.titleFa} (${t.slug})` : `${t.titleFa} (${t.slug})`,
        }))
      : [
          { value: 'Claude', label: 'Claude (نوشتن، تحلیل و معماری)' },
          { value: 'ChatGPT', label: 'ChatGPT (ایده، محتوا و اجرا)' },
          { value: 'Codex', label: 'Codex (کدنویسی، انیمیشن و پروژه)' },
        ];

  if (mode === 'catalog') {
    const filteredProducts = products.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (!adminCatalogSearch.trim()) return true;
      const q = adminCatalogSearch.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.subCategory || '').toLowerCase().includes(q) ||
        (item.githubSourceRepo || '').toLowerCase().includes(q)
      );
    });

    const pagedProducts = filteredProducts.slice(
      (page - 1) * pageSize,
      page * pageSize
    );
    const visibleIds = pagedProducts.map((p) => p.id);

    return (
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
              کاتالوگ محصولات، اسکیل‌های گیت‌هاب و پکیج‌ها ({products.length.toLocaleString('fa-IR')})
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              مجهز به صفحه‌بندی سروری، دسته‌بندی‌های درختی پویا و عملیات گروهی (Bulk Actions)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSeedCatalog}
              className="px-3.5 py-2 min-h-[40px] text-xs font-bold border border-stone-300 dark:border-slate-700 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>بازنشانی ۶۰ اسکیل</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeDraft(createEmptyProductDraft());
                scrollToTopSmooth();
                onSwitchSection('editor');
              }}
              className={`px-4 py-2 min-h-[40px] text-xs font-extrabold rounded-xl flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${accentButtonClass}`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>افزودن محصول جدید</span>
            </button>
          </div>
        </div>

        <ServerPaginationBulkBar
          entity="products"
          totalCount={filteredProducts.length}
          currentPage={page}
          pageSize={pageSize}
          searchQuery={adminCatalogSearch}
          selectedCategory={categoryFilter}
          selectedStatus={statusFilter}
          categoryOptions={dynamicCategoryOptions}
          statusOptions={[
            { value: 'published', label: 'منتشرشده' },
            { value: 'draft', label: 'پیش‌نویس' },
          ]}
          selectedIds={selectedIds}
          allVisibleIds={visibleIds}
          bulkActions={[
            { value: 'publish', label: 'انتشار گروهی محصولات' },
            { value: 'draft', label: 'تبدیل گروهی به پیش‌نویس' },
            { value: 'feature', label: 'ویژه کردن گروهی (Featured)' },
            { value: 'unfeature', label: 'خارج کردن از ویژه' },
            { value: 'delete', label: 'حذف گروهی محصولات' },
          ]}
          onChangePage={setPage}
          onChangePageSize={setPageSize}
          onChangeSearch={setAdminCatalogSearch}
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
          onBulkCompleted={() => {
            onRefreshFromServer?.();
          }}
          onNotice={onNotice}
        />

        <div className="divide-y divide-stone-200 dark:divide-slate-800">
          {pagedProducts.map((item) => {
            const checked = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/60 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds((prev) =>
                        prev.includes(item.id)
                          ? prev.filter((x) => x !== item.id)
                          : [...prev, item.id]
                      )
                    }
                    className="mt-1 text-stone-500 cursor-pointer"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-[#1D4ED8]" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </button>
                  <img
                    src={resolveResponsiveMediaUrl(item.imageUrl, 'thumb300')}
                    alt={item.title}
                    className="w-12 h-12 rounded-xl object-cover border border-stone-200 dark:border-stone-800 shrink-0 hidden sm:block"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {item.category}
                      </span>
                      <span className="text-xs text-stone-500">
                        {item.itemType === 'package' ? 'پکیج جامع VIP' : 'اسکیل تکی'}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          item.seoTitle
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-700'
                        }`}
                      >
                        {item.seoTitle ? 'سئو بهینه‌شده ✓' : 'نیازمند سئو'}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
                      {item.title}
                    </h3>

                    <div className="text-xs text-stone-500 smooth-nums tabular-nums">
                      قیمت:{' '}
                      {item.price === 0
                        ? 'رایگان'
                        : `${item.price.toLocaleString('fa-IR')} تومان`}{' '}
                      · {item.modulesCount.toLocaleString('fa-IR')} ماژول · {item.level}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeDraft(productToDraft(item));
                      scrollToTopSmooth();
                      onSwitchSection('editor');
                    }}
                    className="px-3.5 py-2 min-h-[40px] text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>ویرایش و سئو</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteProduct(item.id)}
                    className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-rose-600 border border-rose-500/30 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="حذف محصول"
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
    <form onSubmit={handleSubmitProduct} className="space-y-6">
      {/* Top Action Header Bar */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            {draft.editingId
              ? 'ویرایش محصول و صفحه‌ساز اختصاصی (WP 12-Col Grid)'
              : 'افزودن اسکیل یا پکیج جدید به فروشگاه'}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            ستون اصلی (راست: محتوا و صفحه‌ساز بصری) · ستون کناری (چپ: انتشار، تصویر شاخص WebP، قیمت و سئو)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isAiGenerating || !canCurrentUserUseAiSeo}
            onClick={() => void handleRunProductAi()}
            className={`px-4 py-2.5 min-h-[42px] text-xs font-extrabold rounded-xl flex items-center gap-2 transition-colors cursor-pointer ${
              canCurrentUserUseAiSeo
                ? 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF] shadow-md shadow-blue-600/20'
                : 'bg-stone-200 text-stone-500 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isAiGenerating
                ? 'در حال تولید با هوش مصنوعی...'
                : '✨ تکمیل هوشمند محتوا و سئو'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              scrollToTopSmooth();
              onSwitchSection('catalog');
            }}
            className="px-4 py-2.5 min-h-[42px] text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl text-stone-600 dark:text-stone-400 cursor-pointer"
          >
            بازگشت به لیست
          </button>
        </div>
      </div>

      {/* WORDPRESS-GRADE 12-COLUMN SPLIT GRID (Right 8 Cols Main + Left 4 Cols Sticky Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* RIGHT MAIN COLUMN (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card A: Title & Canonical Permalink Bar */}
          <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
            <div>
              <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1.5">
                عنوان اسکیل یا پکیج آموزشی *
              </label>
              <input
                type="text"
                required
                value={draft.title}
                onChange={(e) => onChangeDraft({ ...draft, title: e.target.value })}
                placeholder="مثال: اسکیل معماری رابط کاربری به سبک Apple و انیمیشن‌های GSAP"
                className="w-full px-4 py-3 text-base font-extrabold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:border-[#1D4ED8] outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 text-xs">
              <span className="text-stone-500 font-bold shrink-0">
                پیوند یکتا (Permalink):
              </span>
              <div
                className="flex-1 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono text-stone-600 dark:text-stone-300"
                dir="ltr"
              >
                <span className="text-stone-400">/product/</span>
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(e) => onChangeDraft({ ...draft, slug: e.target.value })}
                  placeholder="skill-apple-ui-architecture"
                  className="flex-1 bg-transparent outline-none text-stone-900 dark:text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Card B: Full Rich Text Editor + Short Summary & Expected Output */}
          <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
            <div>
              <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-2">
                توضیحات تخصصی و معرفی کامل اسکیل (مجهز به نوار ابزار ویرایشگر متن غنی) *
              </label>
              <RichTextEditorToolbar
                value={draft.shortDescription}
                onChange={(nextText) =>
                  onChangeDraft({ ...draft, shortDescription: nextText })
                }
                onOpenMediaPicker={() => setMediaPickerMode('body')}
              />
              <textarea
                rows={5}
                required
                value={draft.shortDescription}
                onChange={(e) =>
                  onChangeDraft({ ...draft, shortDescription: e.target.value })
                }
                placeholder="کاربرد دقیق، معماری پرامپت و مزایای اجرایی این اسکیل را شرح دهید..."
                className="w-full px-4 py-3 text-sm leading-relaxed rounded-b-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1.5">
                خروجی مورد انتظار (Expected Deliverable در صفحه تک‌محصول)
              </label>
              <textarea
                rows={3}
                value={draft.expectedOutput}
                onChange={(e) =>
                  onChangeDraft({ ...draft, expectedOutput: e.target.value })
                }
                placeholder="کاربر پس از اجرای این اسکیل در Claude یا Cursor دقیقاً چه کد یا خروجی استانداردی تحویل می‌گیرد؟"
                className="w-full px-3.5 py-2.5 text-xs leading-relaxed rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white"
              />
            </div>
          </div>

          {/* Card B2: Product Type Selector & Zero-Leak Protected Download Files Manager */}
          <div className="p-6 rounded-2xl border-2 border-emerald-500/25 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3.5">
              <div className="flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                    نوع محصول و فایل‌های دانلودی محافظت‌شده (آپلود یا هاست دانلود)
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    لینک اصلی فایل‌ها هرگز در صفحه عمومی محصول یا مرورگر لو نمی‌رود؛ پس از خرید، تنها در پنل کاربری مشتری با توکن موقت امضاشده قابل دانلود خواهد بود.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold">
                <Lock className="w-3.5 h-3.5" />
                <span>تحویل امن Zero-Leak</span>
              </span>
            </div>

            {/* Product Type Segmented Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                [
                  {
                    id: 'downloadable' as ProductTypeKind,
                    title: 'محصول دانلودی (فایل / اسکیل)',
                    subtitle: 'آپلود فایل یا لینک هاست دانلود امن',
                    icon: Download,
                  },
                  {
                    id: 'physical' as ProductTypeKind,
                    title: 'محصول فیزیکی (ارسال پستی)',
                    subtitle: 'کیت، کالا یا پکیج نیازمند آدرس پستی',
                    icon: Package,
                  },
                  {
                    id: 'subscription' as ProductTypeKind,
                    title: 'محصول اشتراکی VIP',
                    subtitle: 'دسترسی خودکار با اشتراک فعال + فایل‌ها',
                    icon: Crown,
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = draft.productType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeDraft({ ...draft, productType: opt.id })}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer space-y-1 ${
                      active
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/25 shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 hover:border-stone-300 dark:hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                        <Icon className={`w-4 h-4 ${active ? 'text-emerald-600' : 'text-stone-400'}`} />
                        <span>{opt.title}</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500">{opt.subtitle}</p>
                  </button>
                );
              })}
            </div>

            {draft.productType !== 'physical' && (
              <div className="space-y-4 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Option 1: Direct Protected Upload */}
                  <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-[#1D4ED8]" />
                        <span>روش ۱: آپلود مستقیم فایل در مخزن امن سرور</span>
                      </span>
                      <span className="text-[10px] font-bold text-stone-400">تا ۴۰ مگابایت</span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      فایل‌های ZIP، PDF، MD، JSON یا ویدیو در پوشه خصوصی <code className="font-mono" dir="ltr">_protected_downloads</code> ذخیره می‌شوند و دسترسی مستقیم HTTP به آن‌ها مسدود (403) است.
                    </p>
                    <label className="w-full py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 hover:bg-[#1D4ED8] dark:hover:bg-stone-200 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                      <UploadCloud className="w-4 h-4" />
                      <span>
                        {uploadingProtectedFile
                          ? 'در حال آپلود امن فایل...'
                          : 'انتخاب و آپلود فایل محصول از سیستم'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        disabled={uploadingProtectedFile}
                        onChange={(e) => {
                          void handleUploadProtectedDownloadFile(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {/* Option 2: External Download Host Link (Proxied Zero-Leak) */}
                  <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-emerald-600" />
                        <span>روش ۲: ثبت لینک از هاست دانلود اختصاصی</span>
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-600">پروکسی مخفی</span>
                    </div>
                    <input
                      type="text"
                      value={extFileTitle}
                      onChange={(e) => setExtFileTitle(e.target.value)}
                      placeholder="عنوان فایل (مثلاً پکیج کامل اسکیل + کدهای نمونه)"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                    <input
                      type="url"
                      dir="ltr"
                      value={extFileUrl}
                      onChange={(e) => setExtFileUrl(e.target.value)}
                      placeholder="https://dl.yourhost.ir/private/skill-pack-v2.zip"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={extFileVersion}
                        onChange={(e) => setExtFileVersion(e.target.value)}
                        placeholder="نسخه (v1.0)"
                        className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                      <input
                        type="text"
                        value={extFileSizeLabel}
                        onChange={(e) => setExtFileSizeLabel(e.target.value)}
                        placeholder="حجم (مثلاً ۴۵ مگابایت)"
                        className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddExternalDownloadHostLink}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن لینک هاست دانلود به لیست امن</span>
                    </button>
                  </div>
                </div>

                {/* Attached Download Files List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-stone-800 dark:text-stone-200">
                      فایل‌های پیوست‌شده به این محصول ({(draft.downloadFiles || []).length.toLocaleString('fa-IR')} مورد):
                    </span>
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>فقط پس از خرید در پنل مشتری باز می‌شوند</span>
                    </span>
                  </div>

                  {(draft.downloadFiles || []).length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500">
                      هنوز فایلی برای این محصول دانلودی ثبت نشده است. از یکی از دو روش بالا فایل را آپلود کنید یا لینک هاست دانلود را وارد نمایید.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(draft.downloadFiles || []).map((fileItem, idx) => (
                        <div
                          key={fileItem.id}
                          className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-black text-stone-400 smooth-nums">
                                #{(idx + 1).toLocaleString('fa-IR')}
                              </span>
                              <input
                                type="text"
                                value={fileItem.title}
                                onChange={(e) =>
                                  handleRenameDownloadFile(fileItem.id, e.target.value)
                                }
                                placeholder="عنوان نمایشی فایل در پنل مشتری..."
                                className="flex-1 min-w-[180px] px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-extrabold text-stone-900 dark:text-white focus:border-[#1D4ED8] focus:outline-none"
                              />
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                  fileItem.storageType === 'uploaded'
                                    ? 'bg-blue-500/10 text-[#1D4ED8] dark:text-sky-400'
                                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {fileItem.storageType === 'uploaded'
                                  ? 'آپلود امن در سرور'
                                  : 'هاست دانلود (پروکسی مخفی)'}
                              </span>
                              {fileItem.version && (
                                <span className="text-[10px] font-mono text-stone-500">
                                  v{fileItem.version}
                                </span>
                              )}
                              {fileItem.fileSizeLabel && (
                                <span className="text-[10px] text-stone-500">
                                  · {fileItem.fileSizeLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3 shrink-0" />
                              <span>
                                لینک واقعی ۱۰۰٪ مخفی (Zero-Leak) — دانلود فقط با توکن امضاشده کوتاه‌مدت سرور
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDownloadFile(fileItem.id)}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="حذف این فایل از محصول"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Access Note for Buyer Dashboard */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    یادداشت یا راهنمای نصب فایل (نمایش فقط برای خریداران در پنل کاربری)
                  </label>
                  <input
                    type="text"
                    value={draft.downloadAccessNote}
                    onChange={(e) =>
                      onChangeDraft({ ...draft, downloadAccessNote: e.target.value })
                    }
                    placeholder="مثلاً: فایل ZIP را استخراج کرده و پوشه SKILL.md را در مسیر پروژه قرار دهید..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card C: Elementor-Style Visual Drag-and-Drop Composer Canvas */}
          <VisualComposerCanvas
            contextMode="product"
            rows={draft.composerRows || []}
            onChangeRows={(nextRows) =>
              onChangeDraft({ ...draft, composerRows: nextRows })
            }
            products={products}
            contentSummaryContext={{
              title: draft.title,
              summary: draft.shortDescription,
              body: draft.expectedOutput,
              imageUrl: draft.imageUrl,
            }}
          />

          {/* Card D (Relocated from Left Sidebar to Center Column): Live RankMath SEO Card */}
          <div className="p-6 rounded-2xl border-2 border-blue-500/25 bg-blue-50/25 dark:bg-blue-950/20 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200/60 dark:border-blue-900/50 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#1D4ED8] dark:text-blue-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#1E3A8A] dark:text-blue-300">
                    تنظیمات و سنجش زنده سئو محصول (RankMath SEO)
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    متا تگ‌ها، کلمات کلیدی کانونی و پیش‌نمایش دقیق نتیجه جستجوی محصول در گوگل
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold smooth-nums">
                امتیاز سئو: {productSeoScore.toLocaleString('fa-IR')} / ۱۰۰
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                    عنوان سئو (Meta Title)
                  </label>
                  <input
                    type="text"
                    value={draft.seoTitle}
                    onChange={(e) =>
                      onChangeDraft({ ...draft, seoTitle: e.target.value })
                    }
                    placeholder="عنوان بهینه‌شده برای گوگل..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                    کلمات کلیدی کانونی (Focus Keywords)
                  </label>
                  <input
                    type="text"
                    value={draft.seoKeywords}
                    onChange={(e) =>
                      onChangeDraft({ ...draft, seoKeywords: e.target.value })
                    }
                    placeholder="اسکیل کلود, محصول دانلودی, اسکیل ۹۸"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                    توضیحات متا (Meta Description)
                  </label>
                  <textarea
                    rows={3}
                    value={draft.seoDescription}
                    onChange={(e) =>
                      onChangeDraft({ ...draft, seoDescription: e.target.value })
                    }
                    placeholder="توضیحات متای محصول در نتایج جستجوی گوگل..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 leading-relaxed"
                  />
                </div>
              </div>

              {/* Wide Live Google SERP Preview */}
              <div className="lg:col-span-5 p-4 rounded-2xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-[10px] font-bold text-stone-400">
                  <span>پیش‌نمایش زنده در گوگل (SERP):</span>
                  <span className="text-emerald-600">ایندکس‌پذیر</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-mono truncate" dir="ltr">
                  /product/{draft.slug || 'skill-slug'}
                </div>
                <div className="text-sm font-bold text-[#1a0dab] dark:text-blue-400 line-clamp-2 leading-snug">
                  {draft.seoTitle || draft.title || 'عنوان محصول'} |{' '}
                  {themeConfig.brandNameFa}
                </div>
                <div className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                  {draft.seoDescription ||
                    draft.shortDescription ||
                    'توضیحات متای محصول در این بخش نمایش داده می‌شود.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LEFT STICKY SIDEBAR COLUMN (lg:col-span-4) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-5">
          {/* Sidebar Card 1: Publish & Status Card */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                انتشار و وضعیت نمایش
              </span>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md ${
                  draft.status === 'published'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/10 text-amber-700'
                }`}
              >
                {draft.status === 'published' ? 'منتشرشده در سایت' : 'پیش‌نویس مخفی'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  وضعیت انتشار
                </label>
                <select
                  value={draft.status}
                  onChange={(e) =>
                    onChangeDraft({
                      ...draft,
                      status: e.target.value as 'published' | 'draft',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
                >
                  <option value="published">منتشرشده (عمومی)</option>
                  <option value="draft">پیش‌نویس (مخفی)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  نمایش در برگزیده‌ها
                </label>
                <select
                  value={draft.featured ? 'yes' : 'no'}
                  onChange={(e) =>
                    onChangeDraft({
                      ...draft,
                      featured: e.target.value === 'yes',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
                >
                  <option value="yes">ویژه صفحه اصلی ★</option>
                  <option value="no">عادی در کاتالوگ</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className={`w-full py-3 min-h-[44px] text-xs font-extrabold rounded-xl transition-all shadow-sm cursor-pointer ${accentButtonClass}`}
            >
              {isSaving
                ? 'در حال ذخیره در دیتابیس...'
                : draft.editingId
                ? 'بروزرسانی محصول و سئو'
                : 'انتشار محصول در فروشگاه'}
            </button>
          </div>

          {/* Sidebar Card 2: Featured Image Card (Clean — Only Selected Featured Image, Opens Centered Modal) */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <span className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#1D4ED8]" />
                <span>تصویر شاخص محصول</span>
              </span>
              {draft.imageUrl && (
                <button
                  type="button"
                  onClick={() => onChangeDraft({ ...draft, imageUrl: '' })}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  حذف تصویر
                </button>
              )}
            </div>

            {/* Immediate Live Thumbnail Preview (Selected Product Image Only) */}
            {draft.imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 aspect-16/10 bg-stone-100 dark:bg-stone-950">
                <img
                  src={resolveResponsiveMediaUrl(draft.imageUrl, 'medium800')}
                  alt={draft.title || 'پیش‌نمایش تصویر شاخص'}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMediaPickerMode('featured')}
                className="w-full aspect-16/10 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center gap-1.5 text-stone-500 hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors cursor-pointer"
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs font-bold">برای انتخاب یا آپلود تصویر کلیک کنید</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMediaPickerMode('featured')}
              className="w-full py-2.5 min-h-[42px] px-3.5 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 transition-opacity"
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                {draft.imageUrl ? 'تغییر یا آپلود تصویر شاخص' : 'انتخاب / آپلود از کتابخانه رسانه'}
              </span>
            </button>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 mb-1">
                آدرس مستقیم تصویر (URL):
              </label>
              <input
                type="text"
                dir="ltr"
                value={draft.imageUrl}
                onChange={(e) => onChangeDraft({ ...draft, imageUrl: e.target.value })}
                className="w-full px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>

            <AiImageStudioWidget
              title={draft.title}
              category={draft.category}
              onApplyImageUrl={(url) => onChangeDraft({ ...draft, imageUrl: url })}
              onNotice={onNotice}
            />
          </div>

          {/* Sidebar Card 2B: Product Image Gallery (Shows ONLY User-Added Images) */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <span className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Images className="w-4 h-4 text-[#1D4ED8]" />
                <span>
                  گالری تصاویر محصول ({(draft.galleryUrls || []).length.toLocaleString('fa-IR')})
                </span>
              </span>
              {(draft.galleryUrls || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeDraft({ ...draft, galleryUrls: [] })}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  پاک‌سازی گالری
                </button>
              )}
            </div>

            {(draft.galleryUrls || []).length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {(draft.galleryUrls || []).map((url, idx) => (
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
                          handleReorderProductGallery(draggedGalleryIdx, idx);
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
                        alt={`گالری محصول ${idx + 1}`}
                        className="w-full h-full object-cover pointer-events-none select-none"
                      />
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-stone-900/70 text-white text-[9px] font-black smooth-nums pointer-events-none">
                        {(idx + 1).toLocaleString('fa-IR')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeDraft({
                            ...draft,
                            galleryUrls: (draft.galleryUrls || []).filter((_, i) => i !== idx),
                          })
                        }
                        title="حذف تصویر از گالری"
                        className="absolute top-1 left-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {(draft.galleryUrls || []).length > 1 && (
                        <div className="absolute bottom-1 inset-x-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              if (idx === 0) return;
                              handleReorderProductGallery(idx, idx - 1);
                            }}
                            className="w-5 h-5 rounded bg-stone-900/75 text-white flex items-center justify-center disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (draft.galleryUrls || []).length - 1}
                            onClick={() => {
                              const list = draft.galleryUrls || [];
                              if (idx === list.length - 1) return;
                              handleReorderProductGallery(idx, idx + 1);
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
                {(draft.galleryUrls || []).length > 1 && (
                  <p className="text-[10px] text-stone-400">
                    برای تغییر ترتیب نمایش تصاویر، هر تصویر را بکشید و روی جایگاه دلخواه رها کنید (Drag & Drop).
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-stone-400 leading-relaxed">
                هنوز تصویر اضافه‌ای برای گالری محصول ثبت نشده است. با دکمه زیر تصاویر گالری را از کتابخانه رسانه یا سیستم انتخاب کنید.
              </p>
            )}

            <button
              type="button"
              onClick={() => setMediaPickerMode('gallery')}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#1D4ED8]/50 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#1D4ED8] dark:text-sky-400 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن تصویر به گالری محصول</span>
            </button>
          </div>

          {/* Sidebar Card 3: Categories & Delivery Format Card */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3.5 shadow-xs">
            <div className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5 border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <Tag className="w-4 h-4 text-[#1D4ED8]" />
              <span>دسته‌بندی درختی و نوع عرضه</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                دسته‌بندی محصول (Taxonomies)
              </label>
              <select
                value={draft.category}
                onChange={(e) => onChangeDraft({ ...draft, category: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              >
                {dynamicCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                نوع عرضه در فروشگاه
              </label>
              <select
                value={draft.itemType}
                onChange={(e) =>
                  onChangeDraft({
                    ...draft,
                    itemType: e.target.value as 'product' | 'package',
                  })
                }
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              >
                <option value="product">اسکیل تکی (رایگان یا پولی)</option>
                <option value="package">پکیج جامع چند ماژولی (VIP)</option>
              </select>
            </div>
          </div>

          {/* Sidebar Card 4: Pricing, Modules & License Card */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3.5 shadow-xs">
            <div className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5 border-b border-stone-200 dark:border-stone-800 pb-2.5">
              <Layers className="w-4 h-4 text-[#1D4ED8]" />
              <span>قیمت‌گذاری، ماژول‌ها و لایسنس</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                  قیمت فروش (تومان)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={draft.price}
                  onChange={(e) =>
                    onChangeDraft({ ...draft, price: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs font-bold smooth-nums tabular-nums rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                  قیمت قبل تخفیف
                </label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={draft.originalPrice}
                  onChange={(e) =>
                    onChangeDraft({
                      ...draft,
                      originalPrice: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-bold smooth-nums tabular-nums rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                  تعداد ماژول‌ها
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.modulesCount}
                  onChange={(e) =>
                    onChangeDraft({
                      ...draft,
                      modulesCount: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-bold smooth-nums rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                  سطح و نسخه لایسنس
                </label>
                <input
                  type="text"
                  value={draft.level}
                  onChange={(e) => onChangeDraft({ ...draft, level: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <MediaPickerModal
        isOpen={mediaPickerMode !== null}
        mode={mediaPickerMode || 'featured'}
        allowVideo={mediaPickerMode === 'body'}
        mediaItems={combinedMediaItems}
        defaultCategory="product"
        onClose={() => setMediaPickerMode(null)}
        onMediaUploaded={(uploaded) => {
          setLocalUploadedMedia((prev) => [...uploaded, ...prev]);
          onRefreshFromServer?.();
        }}
        onSelect={(sel) => {
          if (mediaPickerMode === 'featured') {
            onChangeDraft({ ...draft, imageUrl: sel.url });
            onNotice('success', 'تصویر شاخص محصول بدون خروج از ویرایشگر تنظیم شد.');
          } else if (mediaPickerMode === 'gallery') {
            const existing = draft.galleryUrls || [];
            if (!existing.includes(sel.url)) {
              onChangeDraft({ ...draft, galleryUrls: [...existing, sel.url] });
            }
            onNotice('success', 'تصویر انتخاب‌شده به گالری تصاویر محصول اضافه شد.');
          } else {
            const snippet =
              sel.mediaType === 'video'
                ? `[video src="${sel.url}" title="${sel.title}"]`
                : `![${sel.altText || sel.title}](${sel.url})`;
            onChangeDraft({
              ...draft,
              shortDescription: draft.shortDescription
                ? `${draft.shortDescription}\n\n${snippet}\n`
                : `${snippet}\n`,
            });
            onNotice(
              'success',
              sel.mediaType === 'video'
                ? 'پلیر ویدیو در توضیحات محصول درج شد.'
                : 'تصویر با سایز بهینه در توضیحات محصول درج شد.'
            );
          }
        }}
        onNotice={onNotice}
      />
    </form>
  );
};
