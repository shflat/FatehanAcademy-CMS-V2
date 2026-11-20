import React, { useEffect, useState } from 'react';
import {
  FolderTree,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
} from 'lucide-react';
import type { TaxonomyItem, TaxonomyType } from '../../../core/types';
import { apiJson } from '../../../core/apiClient';

interface TaxonomiesManagerPanelProps {
  accentButtonClass: string;
  onNotice: (type: 'success' | 'error', text: string) => void;
  onTaxonomiesChanged?: (items: TaxonomyItem[]) => void;
}

const TAXONOMY_TABS: { id: TaxonomyType; label: string; desc: string }[] = [
  {
    id: 'product_category',
    label: 'دسته‌بندی‌های درختی محصولات',
    desc: 'ساختار سلسله‌مراتبی مادر و فرزند نامحدود (بدون محدودیت به ۳ دسته ثابت)',
  },
  {
    id: 'article_category',
    label: 'دسته‌بندی‌های نوشته‌ها و مجله',
    desc: 'طبقه‌بندی موضوعی مقالات و آموزش‌های تخصصی',
  },
  {
    id: 'brand',
    label: 'برندها و پلتفرم‌ها',
    desc: 'برندهای هوش مصنوعی، فریم‌ورک‌ها و تولیدکنندگان همراه با لوگو',
  },
  {
    id: 'tag',
    label: 'برچسب‌های سئو (Tags)',
    desc: 'برچسب‌های معنایی جهت لینک‌سازی داخلی و فیلتر سریع',
  },
];

export const TaxonomiesManagerPanel: React.FC<TaxonomiesManagerPanelProps> = ({
  accentButtonClass,
  onNotice,
  onTaxonomiesChanged,
}) => {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [activeType, setActiveType] = useState<TaxonomyType>('product_category');
  const [isLoading, setIsLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleFa, setTitleFa] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [iconName, setIconName] = useState('Sparkles');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);

  const fetchTaxonomies = async () => {
    setIsLoading(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; items?: TaxonomyItem[] }>(
        '/api/v1/taxonomies'
      );
      if (ok && Array.isArray(data.items)) {
        setItems(data.items);
        onTaxonomiesChanged?.(data.items);
      }
    } catch {
      // ignore fetch error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchTaxonomies();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitleFa('');
    setSlug('');
    setParentId('');
    setIconName('Sparkles');
    setImageUrl('');
    setDescription('');
    setSortOrder(1);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFa.trim()) {
      onNotice('error', 'عنوان فارسی دسته‌بندی یا برچسب الزامی است.');
      return;
    }
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        items?: TaxonomyItem[];
        error?: string;
      }>('/api/v1/taxonomies', {
        method: 'POST',
        body: JSON.stringify({
          id: editingId || undefined,
          taxonomyType: activeType,
          titleFa: titleFa.trim(),
          slug: slug.trim() || titleFa.trim().replace(/\s+/g, '-'),
          parentId: parentId || null,
          iconName: iconName.trim() || 'FolderTree',
          imageUrl: imageUrl.trim(),
          description: description.trim() || titleFa.trim(),
          sortOrder,
        }),
      });
      if (!ok) {
        throw new Error(data.error || 'خطا در ذخیره طبقه‌بندی');
      }
      if (Array.isArray(data.items)) {
        setItems(data.items);
        onTaxonomiesChanged?.(data.items);
      }
      resetForm();
      onNotice('success', 'دسته‌بندی / برچسب در جدول دیتابیس ذخیره شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        items?: TaxonomyItem[];
        error?: string;
      }>(`/api/v1/taxonomies/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!ok) throw new Error(data.error || 'خطا در حذف');
      if (Array.isArray(data.items)) {
        setItems(data.items);
        onTaxonomiesChanged?.(data.items);
      }
      onNotice('success', 'آیتم حذف شد و زیرشاخه‌های آن به سطح مادر منتقل گردید.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در حذف');
    }
  };

  const filteredItems = items.filter((t) => t.taxonomyType === activeType);
  const rootNodes = filteredItems.filter((t) => !t.parentId);
  const getChildren = (pid: string) =>
    filteredItems.filter((t) => t.parentId === pid);

  return (
    <div className="space-y-6">
      {/* Header & Type Switcher */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5">
              <FolderTree className="w-4 h-4" />
              <span>سیستم طبقه‌بندی درختی پویا (Dynamic Hierarchical Taxonomies — فاز ۲)</span>
            </div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white mt-0.5">
              مدیریت دسته‌بندی‌های مادر و فرزند، برندها و برچسب‌های نامحدود
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void fetchTaxonomies()}
            className="px-3 py-1.5 text-xs font-bold border border-stone-300 dark:border-stone-700 rounded-xl flex items-center gap-1.5 self-start cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی از دیتابیس</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TAXONOMY_TABS.map((tab) => {
            const active = activeType === tab.id;
            const count = items.filter((i) => i.taxonomyType === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveType(tab.id);
                  resetForm();
                }}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  active
                    ? 'border-[#1D4ED8] bg-blue-500/10 text-stone-900 dark:text-white'
                    : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-950'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span>{tab.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-stone-900/10 dark:bg-white/10 text-[10px] smooth-nums">
                    {count.toLocaleString('fa-IR')}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                  {tab.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split Workspace: Form + Hierarchical Tree Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSave}
          className="lg:col-span-5 border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-5 space-y-4 shadow-sm"
        >
          <div className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5 border-b border-stone-200 dark:border-stone-800 pb-3">
            <Plus className="w-4 h-4 text-[#1D4ED8]" />
            <span>
              {editingId ? 'ویرایش گره طبقه‌بندی' : 'افزودن شاخه مادر یا فرزند جدید'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">عنوان فارسی *</label>
            <input
              type="text"
              required
              value={titleFa}
              onChange={(e) => setTitleFa(e.target.value)}
              placeholder="مثال: اسکیل‌های ایجنت و اتوماسیون"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">نامک (Slug)</label>
            <input
              type="text"
              dir="ltr"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ai-agent-skills"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          {(activeType === 'product_category' || activeType === 'article_category') && (
            <div>
              <label className="block text-xs font-bold mb-1">
                دسته‌بندی مادر (برای ساخت زیرشاخه درختی)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              >
                <option value="">— بدون مادر (شاخه اصلی / سطح اول) —</option>
                {filteredItems
                  .filter((x) => x.id !== editingId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.parentId ? `↳ ${p.titleFa}` : p.titleFa}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">آیکون (SVG Icon)</label>
              <input
                type="text"
                dir="ltr"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                placeholder="Sparkles"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">ترتیب نمایش</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs smooth-nums rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصویر یا کاور دسته‌بندی (WebP URL)</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/uploads/2026/11/category-cover.webp"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">توضیح سئوی دسته‌بندی</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 text-xs font-bold border border-stone-300 rounded-xl cursor-pointer"
              >
                انصراف
              </button>
            )}
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
            >
              {editingId ? 'بروزرسانی شاخه' : 'ثبت شاخه جدید در دیتابیس'}
            </button>
          </div>
        </form>

        {/* Hierarchical Tree View */}
        <div className="lg:col-span-7 border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <span className="text-sm font-extrabold text-stone-900 dark:text-white">
              ساختار درختی ثبت‌شده ({filteredItems.length.toLocaleString('fa-IR')} گره)
            </span>
            <span className="text-[11px] text-stone-500">
              پشتیبانی از زیرشاخه‌های چندسطحی
            </span>
          </div>

          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {rootNodes.map((node) => {
              const children = getChildren(node.id);
              return (
                <React.Fragment key={node.id}>
                  <div className="p-4 flex items-center justify-between gap-3 hover:bg-stone-50/70 dark:hover:bg-stone-950/40">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                          {node.titleFa}
                        </span>
                        <span
                          dir="ltr"
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                        >
                          {node.slug}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {node.description} · تعداد آیتم مرتبط:{' '}
                        {(node.itemsCount || 0).toLocaleString('fa-IR')}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(node.id);
                          setTitleFa(node.titleFa);
                          setSlug(node.slug);
                          setParentId(node.parentId || '');
                          setIconName(node.iconName || 'Sparkles');
                          setImageUrl(node.imageUrl || '');
                          setDescription(node.description || '');
                          setSortOrder(node.sortOrder || 1);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold border border-stone-300 dark:border-stone-700 rounded-lg cursor-pointer"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(node.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="pr-10 pl-4 py-3 bg-stone-50/50 dark:bg-stone-950/40 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-600">↳</span>
                          <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                            {child.titleFa}
                          </span>
                          <span
                            dir="ltr"
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800"
                          >
                            {child.slug}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500">
                          زیرشاخه «{node.titleFa}»
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(child.id);
                            setTitleFa(child.titleFa);
                            setSlug(child.slug);
                            setParentId(child.parentId || '');
                            setIconName(child.iconName || 'Layers');
                            setImageUrl(child.imageUrl || '');
                            setDescription(child.description || '');
                            setSortOrder(child.sortOrder || 2);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold border border-stone-300 dark:border-stone-700 rounded-lg cursor-pointer"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(child.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
