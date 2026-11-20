import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileCheck,
  GripVertical,
  ListTree,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import type {
  CmsDynamicPage,
  CmsInvoiceTemplate,
  CmsMenuItem,
  CmsMenuLocation,
  SkillArticle,
  SkillProduct,
  TaxonomyItem,
} from '../../../core/types';
import { buildAuthHeaders } from '../../../core/apiClient';
import { VisualComposerCanvas } from '../components/VisualComposerCanvas';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface MenuBuilderInvoicePanelProps {
  initialMode: 'menu_builder' | 'invoice_designer';
  products: SkillProduct[];
  articles: SkillArticle[];
  accentButtonClass: string;
  onMenusChanged?: () => void;
  onNotice: NoticeFn;
}

export const MenuBuilderInvoicePanel: React.FC<MenuBuilderInvoicePanelProps> = ({
  initialMode,
  products,
  articles,
  accentButtonClass,
  onMenusChanged,
  onNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'menu_builder' | 'invoice_designer'>(
    initialMode
  );
  const [menuLocation, setMenuLocation] = useState<CmsMenuLocation>('header');
  const [menuItems, setMenuItems] = useState<CmsMenuItem[]>([]);
  const [pages, setPages] = useState<CmsDynamicPage[]>([]);
  const [taxonomies, setTaxonomies] = useState<TaxonomyItem[]>([]);
  const [newMenuTitle, setNewMenuTitle] = useState('');
  const [newMenuParentId, setNewMenuParentId] = useState<string>('');
  const [newMenuTargetType, setNewMenuTargetType] =
    useState<CmsMenuItem['targetType']>('page');
  const [newMenuTargetValue, setNewMenuTargetValue] = useState('about-us');

  const [invoiceTemplates, setInvoiceTemplates] = useState<CmsInvoiceTemplate[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<CmsInvoiceTemplate | null>(
    null
  );
  const [savingInvoice, setSavingInvoice] = useState(false);

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode]);

  const loadData = async () => {
    try {
      const [menusRes, pagesRes, taxRes, invRes] = await Promise.all([
        fetch('/api/v1/menus'),
        fetch('/api/v1/pages'),
        fetch('/api/v1/taxonomies'),
        fetch('/api/v1/invoice-templates'),
      ]);
      const [menusData, pagesData, taxData, invData] = await Promise.all([
        menusRes.json(),
        pagesRes.json(),
        taxRes.json(),
        invRes.json(),
      ]);
      if (menusData.ok && Array.isArray(menusData.items)) {
        setMenuItems(menusData.items);
      }
      if (pagesData.ok && Array.isArray(pagesData.items)) {
        setPages(pagesData.items);
      }
      if (taxData.ok && Array.isArray(taxData.items)) {
        setTaxonomies(taxData.items);
      }
      if (invData.ok && Array.isArray(invData.items)) {
        setInvoiceTemplates(invData.items);
        if (!selectedInvoice && invData.items[0]) {
          setSelectedInvoice(invData.items[0]);
        }
      }
    } catch {
      // ignore initial fetch error
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const locationMenus = menuItems
    .filter((m) => m.location === menuLocation)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const rootMenus = locationMenus.filter((m) => !m.parentId);

  const handleAddMenuItem = async (
    titleFa: string,
    targetType: CmsMenuItem['targetType'],
    targetValue: string,
    parentId: string | null = null
  ) => {
    if (!titleFa.trim()) {
      onNotice('error', 'عنوان آیتم منو را وارد کنید.');
      return;
    }
    try {
      const res = await fetch('/api/v1/menus', {
        method: 'POST',
        headers: buildAuthHeaders(true),
        body: JSON.stringify({
          location: menuLocation,
          titleFa: titleFa.trim(),
          parentId,
          targetType,
          targetValue,
          sortOrder: locationMenus.length + 1,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'خطا در افزودن منو');
      onNotice('success', `آیتم «${titleFa}» به منوی سایت اضافه شد.`);
      setNewMenuTitle('');
      await loadData();
      onMenusChanged?.();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره منو');
    }
  };

  const handleDeleteMenu = async (id: string) => {
    try {
      await fetch(`/api/v1/menus/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(false),
      });
      onNotice('success', 'آیتم منو حذف شد.');
      await loadData();
      onMenusChanged?.();
    } catch {
      onNotice('error', 'خطا در حذف آیتم منو');
    }
  };

  const handleMoveMenuOrder = async (item: CmsMenuItem, delta: -1 | 1) => {
    const idx = locationMenus.findIndex((m) => m.id === item.id);
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= locationMenus.length) return;
    const reordered = [...locationMenus];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    const payload = reordered.map((m, i) => ({
      id: m.id,
      sortOrder: i + 1,
      parentId: m.parentId,
    }));
    await fetch('/api/v1/menus/reorder', {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify({ items: payload }),
    });
    await loadData();
    onMenusChanged?.();
  };

  const handleSaveInvoiceTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSavingInvoice(true);
    try {
      const res = await fetch('/api/v1/invoice-templates', {
        method: 'POST',
        headers: buildAuthHeaders(true),
        body: JSON.stringify(selectedInvoice),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'خطا در ذخیره قالب فاکتور');
      onNotice('success', `قالب فاکتور «${selectedInvoice.titleFa}» با موفقیت ذخیره شد.`);
      await loadData();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره قالب فاکتور');
    } finally {
      setSavingInvoice(false);
    }
  };

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Mode Switcher Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
            <ListTree className="w-4 h-4" />
            <span>بخش ۸: منوساز درختی پویا (SortableJS) و طراح بصری قالب فاکتور رسمی/غیررسمی</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            {activeTab === 'menu_builder'
              ? 'منوساز پویا (هدر، فوتر و موبایل با زیرمنوهای درختی)'
              : 'طراح بصری قالب فاکتور رسمی مالیاتی (دارایی) و غیررسمی فروشگاهی'}
          </h2>
        </div>

        <div className="inline-flex rounded-xl border border-stone-200 dark:border-stone-800 p-1 bg-stone-100 dark:bg-stone-950">
          <button
            type="button"
            onClick={() => setActiveTab('menu_builder')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${
              activeTab === 'menu_builder'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-500'
            }`}
          >
            ۱. منوساز درختی سایت
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoice_designer')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${
              activeTab === 'invoice_designer'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-500'
            }`}
          >
            ۲. طراح بصری قالب فاکتور
          </button>
        </div>
      </div>

      {activeTab === 'menu_builder' ? (
        <div className="space-y-6">
          {/* Menu Location Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'header', label: 'منوی اصلی هدر (Header Navigation)' },
              { id: 'footer', label: 'ستون لینک‌های فوتر (Footer Links)' },
              { id: 'mobile_drawer', label: 'منوی کشویی موبایل (Mobile Drawer)' },
            ].map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setMenuLocation(loc.id as CmsMenuLocation)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                  menuLocation === loc.id
                    ? 'bg-[#1D4ED8] text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Right Quick Add Sources */}
            <div className="lg:col-span-5 space-y-4">
              {/* Custom / Manual Menu Item Form */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-3">
                <h3 className="text-xs font-extrabold text-stone-900 dark:text-white">
                  افزودن آیتم یا زیرمنوی جدید
                </h3>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={newMenuTitle}
                    onChange={(e) => setNewMenuTitle(e.target.value)}
                    placeholder="عنوان نمایشی در منو (مثلاً: خدمات سازمانی)..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newMenuParentId}
                      onChange={(e) => setNewMenuParentId(e.target.value)}
                      className="px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    >
                      <option value="">آیتم مادر (سطح اول)</option>
                      {rootMenus.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          زیرمنوی: {rm.titleFa}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newMenuTargetType}
                      onChange={(e) =>
                        setNewMenuTargetType(
                          e.target.value as CmsMenuItem['targetType']
                        )
                      }
                      className="px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    >
                      <option value="page">پیوند به برگه پویا</option>
                      <option value="category">دسته‌بندی محصولات</option>
                      <option value="tab">تب اصلی فروشگاه</option>
                      <option value="custom_url">لینک سفارشی</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    value={newMenuTargetValue}
                    onChange={(e) => setNewMenuTargetValue(e.target.value)}
                    placeholder="about-us یا Claude یا /page/contact-us"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleAddMenuItem(
                        newMenuTitle,
                        newMenuTargetType,
                        newMenuTargetValue,
                        newMenuParentId || null
                      )
                    }
                    className={`w-full py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${accentButtonClass}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن به ساختار منو</span>
                  </button>
                </div>
              </div>

              {/* 1-Click Add from Dynamic Pages & Categories */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
                <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-200">
                  افزودن سریع از برگه‌ها، دسته‌بندی‌ها و مقالات:
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {pages.map((pg) => (
                    <div
                      key={pg.id}
                      className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-stone-800 dark:text-stone-200">
                        برگه: {pg.title}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddMenuItem(
                            pg.title,
                            'page',
                            pg.slug,
                            newMenuParentId || null
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-extrabold cursor-pointer"
                      >
                        + افزودن
                      </button>
                    </div>
                  ))}
                  {taxonomies
                    .filter((t) => t.taxonomyType === 'product_category')
                    .slice(0, 5)
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-stone-700 dark:text-stone-300">
                          دسته: {tx.titleFa}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleAddMenuItem(
                              tx.titleFa,
                              'category',
                              tx.slug,
                              newMenuParentId || null
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-[#1D4ED8] dark:text-sky-300 font-extrabold cursor-pointer"
                        >
                          + افزودن
                        </button>
                      </div>
                    ))}
                  {articles.slice(0, 3).map((art) => (
                    <div
                      key={art.id}
                      className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-stone-700 dark:text-stone-300 line-clamp-1">
                        مقاله: {art.title}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddMenuItem(
                            art.title,
                            'article',
                            art.slug,
                            newMenuParentId || null
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-extrabold cursor-pointer shrink-0"
                      >
                        + افزودن
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Hierarchical Tree Structure */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2.5">
                <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                  ساختار درختی آیتم‌های منوی انتخاب‌شده ({locationMenus.length.toLocaleString('fa-IR')} آیتم)
                </span>
                <span className="text-[11px] text-stone-500">
                  پشتیبانی از زیرمنو و جابه‌جایی ترتیب
                </span>
              </div>

              <div className="space-y-2">
                {rootMenus.map((parentItem) => {
                  const children = locationMenus.filter(
                    (c) => c.parentId === parentItem.id
                  );
                  return (
                    <div key={parentItem.id} className="space-y-1.5">
                      <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-stone-400" />
                          <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                            {parentItem.titleFa}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] font-mono text-stone-500">
                            {parentItem.targetType}: {parentItem.targetValue}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveMenuOrder(parentItem, -1)}
                            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveMenuOrder(parentItem, 1)}
                            className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMenu(parentItem.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="mr-6 p-2.5 rounded-xl border border-dashed border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/20 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#1D4ED8] font-extrabold">
                              ↳ زیرمنو:
                            </span>
                            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                              {child.titleFa}
                            </span>
                            <span className="text-[10px] font-mono text-stone-500">
                              ({child.targetType}: {child.targetValue})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMenu(child.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Visual Invoice Template Designer */
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {invoiceTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedInvoice(tpl)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
                    selectedInvoice?.id === tpl.id
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>{tpl.titleFa}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ آزمایشی قالب فاکتور (A4/A5)</span>
            </button>
          </div>

          {selectedInvoice && (
            <form onSubmit={handleSaveInvoiceTemplate} className="space-y-5">
              <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2 lg:col-span-3 min-w-0">
                    <label className="block text-[11px] font-extrabold text-stone-600 dark:text-stone-400 mb-1.5">
                      عنوان قالب فاکتور:
                    </label>
                    <input
                      type="text"
                      value={selectedInvoice.titleFa}
                      onChange={(e) =>
                        setSelectedInvoice({
                          ...selectedInvoice,
                          titleFa: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-extrabold text-stone-600 dark:text-stone-400 mb-1.5">
                      نوع فاکتور:
                    </label>
                    <select
                      value={selectedInvoice.invoiceKind}
                      onChange={(e) =>
                        setSelectedInvoice({
                          ...selectedInvoice,
                          invoiceKind: e.target
                            .value as CmsInvoiceTemplate['invoiceKind'],
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    >
                      <option value="official_tax">رسمی مالیاتی (دارایی)</option>
                      <option value="standard_commercial">غیررسمی فروشگاهی</option>
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-extrabold text-stone-600 dark:text-stone-400 mb-1.5">
                      سایز کاغذ چاپ:
                    </label>
                    <select
                      value={selectedInvoice.paperSize}
                      onChange={(e) =>
                        setSelectedInvoice({
                          ...selectedInvoice,
                          paperSize: e.target
                            .value as CmsInvoiceTemplate['paperSize'],
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    >
                      <option value="A4">برگه استاندارد A4</option>
                      <option value="A5">برگه نیم‌صفحه A5</option>
                      <option value="Thermal80mm">فیش حرارتی ۸۰ میلی‌متر</option>
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-extrabold text-stone-600 dark:text-stone-400 mb-1.5">
                      درصد مالیات بر ارزش افزوده (VAT %):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={selectedInvoice.vatPercent}
                      onChange={(e) =>
                        setSelectedInvoice({
                          ...selectedInvoice,
                          vatPercent: Number(e.target.value || 0),
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold smooth-nums"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-extrabold text-stone-600 dark:text-stone-400 mb-1.5">
                      نام حقوقی/فروشگاهی فروشنده:
                    </label>
                    <input
                      type="text"
                      value={selectedInvoice.sellerName}
                      onChange={(e) =>
                        setSelectedInvoice({
                          ...selectedInvoice,
                          sellerName: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-extrabold text-stone-600 dark:text-stone-400 mb-1.5">
                      کد اقتصادی / شناسه ملی فروشنده:
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={selectedInvoice.sellerEconomicCode}
                      onChange={(e) =>
                        setSelectedInvoice({
                          ...selectedInvoice,
                          sellerEconomicCode: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[11px] font-extrabold text-stone-600 dark:text-stone-400 mb-1.5">
                      آدرس لوگو در سربرگ فاکتور:
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={selectedInvoice.logoUrl}
                      onChange={(e) =>
                        setSelectedInvoice({
                          ...selectedInvoice,
                          logoUrl: e.target.value,
                        })
                      }
                      placeholder="/logo-skill98.svg"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3 min-w-0">
                    <label className="block text-[11px] font-extrabold text-stone-600 dark:text-stone-400 mb-1.5">
                      آدرس تصویر مهر و امضای دیجیتال فروشنده:
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={selectedInvoice.stampSignatureUrl}
                      onChange={(e) =>
                        setSelectedInvoice({
                          ...selectedInvoice,
                          stampSignatureUrl: e.target.value,
                        })
                      }
                      placeholder="/logo-skill98-emblem.svg"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Clean Dedicated Footer Action Bar (Zero Overlap) */}
                <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-stone-500">
                    تغییرات چیدمان بصری و مشخصات فروشنده به صورت مستقیم در دیتابیس ذخیره می‌شوند.
                  </span>
                  <button
                    type="submit"
                    disabled={savingInvoice}
                    className={`min-h-[42px] px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${accentButtonClass}`}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {savingInvoice ? 'در حال ذخیره...' : 'ذخیره چیدمان و قالب فاکتور'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Visual Composer for Invoice Blocks */}
              <VisualComposerCanvas
                contextMode="invoice"
                rows={selectedInvoice.composerRows}
                onChangeRows={(nextRows) =>
                  setSelectedInvoice({
                    ...selectedInvoice,
                    composerRows: nextRows,
                  })
                }
                products={products}
                invoiceContext={selectedInvoice}
              />
            </form>
          )}
        </div>
      )}
    </div>
  );
};
