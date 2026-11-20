import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Columns,
  Eye,
  GripVertical,
  Layers,
  LayoutTemplate,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import type {
  CmsInvoiceTemplate,
  ComposerColumnCount,
  ComposerRow,
  ComposerWidgetInstance,
  SkillProduct,
} from '../../../core/types';
import {
  COMPOSER_WIDGET_CATALOG,
  VisualComposerRenderer,
  type WidgetCatalogEntry,
} from './VisualComposerRenderer';

export interface ComposerContentSummaryContext {
  title?: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
}

interface VisualComposerCanvasProps {
  contextMode: 'page' | 'product' | 'article' | 'invoice';
  rows: ComposerRow[];
  onChangeRows: (next: ComposerRow[]) => void;
  products?: SkillProduct[];
  invoiceContext?: Partial<CmsInvoiceTemplate>;
  contentSummaryContext?: ComposerContentSummaryContext;
}

export const VisualComposerCanvas: React.FC<VisualComposerCanvasProps> = ({
  contextMode,
  rows,
  onChangeRows,
  products = [],
  invoiceContext,
  contentSummaryContext,
}) => {
  const [selectedRowId, setSelectedRowId] = useState<string>(rows[0]?.id || '');
  const [editingWidget, setEditingWidget] = useState<{
    rowId: string;
    widget: ComposerWidgetInstance;
  } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [draggedRowIdx, setDraggedRowIdx] = useState<number | null>(null);
  const [draggedWidgetInfo, setDraggedWidgetInfo] = useState<{
    rowId: string;
    widgetIdx: number;
  } | null>(null);
  const [paletteFilter, setPaletteFilter] = useState<
    'all' | 'general' | 'ecommerce' | 'invoice'
  >(contextMode === 'invoice' ? 'invoice' : 'all');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const elementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimerRef = useRef<number | null>(null);

  const activeRowId =
    rows.some((r) => r.id === selectedRowId) ? selectedRowId : rows[0]?.id || '';

  const focusNewlyAddedElement = (id: string) => {
    setRecentlyAddedId(id);
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = elementRefs.current[id];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
    highlightTimerRef.current = window.setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === id ? null : curr));
    }, 3600);
  };

  const handleLoadDefaultContentStructure = () => {
    const now = Date.now();
    const safeTitle =
      contentSummaryContext?.title?.trim() ||
      (contextMode === 'article'
        ? 'عنوان اصلی مقاله آموزشی'
        : contextMode === 'product'
        ? 'معرفی و مشخصات اسکیل تخصصی'
        : 'سرتیتر و معرفی اصلی برگه');
    const safeSummary =
      contentSummaryContext?.summary?.trim() ||
      (contextMode === 'article'
        ? 'چکیده کلیدی مقاله در ابتدای صفحه نمایش داده می‌شود و می‌توانید ویجت‌های دیگر را بالا یا پایین آن اضافه کنید.'
        : 'خلاصه کاربردی و مزایای کلیدی محصول برای معرفی سریع به بازدیدکنندگان.');
    const safeBody =
      contentSummaryContext?.body?.trim() ||
      (contextMode === 'article'
        ? 'متن اصلی مقاله و نکات اجرایی گام‌به‌گام در این بلوک قرار می‌گیرد. از جعبه ابزار بالا می‌توانید باکس کد، گالری، آکاردئون FAQ یا بنر CTA اضافه کنید.'
        : 'جزئیات خروجی استاندارد، نحوه نصب و سناریوهای استفاده واقعی از این اسکیل در پروژه‌های تیمی.');

    const row1Id = `row_intro_${now}`;
    const row2Id = `row_body_${now + 1}`;
    const defaultRows: ComposerRow[] =
      contextMode === 'product'
        ? [
            {
              id: row1Id,
              rowTitle: 'ردیف ۱: عنوان و معرفی محصول (پیش‌فرض)',
              columns: 1,
              backgroundStyle: 'accent',
              widgets: [
                {
                  id: `w_intro_${now}`,
                  widgetType: 'hero_slider',
                  title: safeTitle,
                  subtitle: safeSummary,
                  badgeText: 'معرفی و خلاصه محصول',
                  colSpan: 1,
                },
              ],
            },
            {
              id: row2Id,
              rowTitle: 'ردیف ۲: توضیحات کامل و خروجی استاندارد (۲ ستونه)',
              columns: 2,
              backgroundStyle: 'default',
              widgets: [
                {
                  id: `w_body_${now + 1}`,
                  widgetType: 'rich_text',
                  title: 'شرح تخصصی و خروجی مورد انتظار',
                  subtitle: 'متن اصلی و ساختار فنی محصول',
                  content: safeBody,
                  colSpan: 1,
                },
                {
                  id: `w_lic_${now + 2}`,
                  widgetType: 'license_comparison',
                  title: 'مقایسه لایسنس و سطح دسترسی',
                  subtitle: 'فردی، تیمی و سازمانی',
                  content:
                    'لایسنس فردی: تحویل آنی + آپدیت دائمی | لایسنس تیمی: دسترسی مشترک تا ۱۰ نفر | لایسنس سازمانی: پشتیبانی اختصاصی و فاکتور رسمی',
                  colSpan: 1,
                },
              ],
            },
          ]
        : [
            {
              id: row1Id,
              rowTitle: 'ردیف ۱: عنوان و چکیده مقاله (پیش‌فرض)',
              columns: 1,
              backgroundStyle: 'accent',
              widgets: [
                {
                  id: `w_art_head_${now}`,
                  widgetType: 'hero_slider',
                  title: safeTitle,
                  subtitle: safeSummary,
                  badgeText: contextMode === 'article' ? 'عنوان و چکیده مقاله' : 'سرتیتر برگه',
                  colSpan: 1,
                },
              ],
            },
            {
              id: row2Id,
              rowTitle: 'ردیف ۲: بدنه و متن کامل محتوا (پیش‌فرض)',
              columns: 1,
              backgroundStyle: 'default',
              widgets: [
                {
                  id: `w_art_body_${now + 1}`,
                  widgetType: 'rich_text',
                  title: 'متن اصلی و بخش تحریریه',
                  subtitle: 'قابل ویرایش و جابه‌جایی با Drag & Drop',
                  content: safeBody,
                  colSpan: 1,
                },
              ],
            },
          ];

    const nextRows = rows.length === 0 ? defaultRows : [...defaultRows, ...rows];
    onChangeRows(nextRows);
    setSelectedRowId(row1Id);
    focusNewlyAddedElement(row1Id);
  };

  const handleAddRow = (columns: ComposerColumnCount) => {
    const newRow: ComposerRow = {
      id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      rowTitle: `ردیف ${rows.length + 1} (${columns} ستونه)`,
      columns,
      backgroundStyle: 'default',
      widgets: [],
    };
    const next = [...rows, newRow];
    onChangeRows(next);
    setSelectedRowId(newRow.id);
    focusNewlyAddedElement(newRow.id);
  };

  const handleUpdateRow = (rowId: string, patch: Partial<ComposerRow>) => {
    onChangeRows(rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  };

  const handleDeleteRow = (rowId: string) => {
    const next = rows.filter((r) => r.id !== rowId);
    onChangeRows(next);
    if (selectedRowId === rowId) {
      setSelectedRowId(next[0]?.id || '');
    }
  };

  const handleMoveRow = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    onChangeRows(next);
  };

  const handleAddWidgetToRow = (entry: WidgetCatalogEntry) => {
    let targetRowId = activeRowId;
    let currentRows = [...rows];
    if (!targetRowId || currentRows.length === 0) {
      const firstRow: ComposerRow = {
        id: `row_${Date.now()}`,
        rowTitle: 'ردیف ۱ (تک‌ستونه)',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [],
      };
      currentRows = [firstRow];
      targetRowId = firstRow.id;
      setSelectedRowId(firstRow.id);
    }

    const newWidget: ComposerWidgetInstance = {
      id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      widgetType: entry.type,
      title: entry.defaultTitle,
      subtitle: entry.defaultSubtitle || '',
      content: entry.defaultContent || '',
      badgeText: entry.defaultBadge || '',
      ctaText: entry.defaultCtaText || '',
      colSpan: 1,
    };

    const next = currentRows.map((r) =>
      r.id === targetRowId ? { ...r, widgets: [...r.widgets, newWidget] } : r
    );
    onChangeRows(next);
    setSelectedRowId(targetRowId);
    focusNewlyAddedElement(newWidget.id);
  };

  const handleUpdateWidget = (
    rowId: string,
    widgetId: string,
    patch: Partial<ComposerWidgetInstance>
  ) => {
    onChangeRows(
      rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              widgets: r.widgets.map((w) =>
                w.id === widgetId ? { ...w, ...patch } : w
              ),
            }
          : r
      )
    );
    if (editingWidget && editingWidget.widget.id === widgetId) {
      setEditingWidget({
        rowId,
        widget: { ...editingWidget.widget, ...patch },
      });
    }
  };

  const handleDeleteWidget = (rowId: string, widgetId: string) => {
    onChangeRows(
      rows.map((r) =>
        r.id === rowId
          ? { ...r, widgets: r.widgets.filter((w) => w.id !== widgetId) }
          : r
      )
    );
    if (editingWidget?.widget.id === widgetId) {
      setEditingWidget(null);
    }
  };

  const handleDropWidget = (targetRowId: string, targetIdx: number) => {
    if (!draggedWidgetInfo) return;
    const sourceRow = rows.find((r) => r.id === draggedWidgetInfo.rowId);
    if (!sourceRow) return;
    const movingWidget = sourceRow.widgets[draggedWidgetInfo.widgetIdx];
    if (!movingWidget) return;

    const next = rows.map((r) => {
      if (r.id === draggedWidgetInfo.rowId && r.id === targetRowId) {
        const list = [...r.widgets];
        list.splice(draggedWidgetInfo.widgetIdx, 1);
        list.splice(targetIdx, 0, movingWidget);
        return { ...r, widgets: list };
      }
      if (r.id === draggedWidgetInfo.rowId) {
        return {
          ...r,
          widgets: r.widgets.filter((_, i) => i !== draggedWidgetInfo.widgetIdx),
        };
      }
      if (r.id === targetRowId) {
        const list = [...r.widgets];
        list.splice(targetIdx, 0, movingWidget);
        return { ...r, widgets: list };
      }
      return r;
    });

    onChangeRows(next);
    setDraggedWidgetInfo(null);
  };

  const filteredCatalog = COMPOSER_WIDGET_CATALOG.filter((item) =>
    paletteFilter === 'all' ? true : item.category === paletteFilter
  );

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70 p-4 sm:p-5 space-y-5">
      {/* Top Composer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center">
            <Columns className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white">
              موتور صفحه‌ساز بصری چندستونه (Muuri.js Drag & Drop Composer)
            </h3>
            <p className="text-[11px] text-stone-500">
              افزودن ردیف‌های ۱ تا ۴ ستونه، جابه‌جایی Drag & Drop ویجت‌ها، اسکرول خودکار روی المان جدید و پیش‌نمایش زنده
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {contextMode !== 'invoice' && (
            <button
              type="button"
              onClick={handleLoadDefaultContentStructure}
              className="px-3 py-1.5 rounded-xl border border-blue-500/35 bg-blue-500/10 hover:bg-blue-500/20 text-[#1D4ED8] dark:text-sky-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>
                {rows.length === 0
                  ? 'بارگذاری ساختار پیش‌فرض (عنوان، چکیده و متن)'
                  : 'درج بلوک عنوان و متن اصلی در بالا'}
              </span>
            </button>
          )}
          {([1, 2, 3, 4] as ComposerColumnCount[]).map((cols) => (
            <button
              key={cols}
              type="button"
              onClick={() => handleAddRow(cols)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-[#1D4ED8] text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>ردیف {cols} ستونه</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreviewMode((p) => !p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
              previewMode
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 dark:bg-white text-white dark:text-stone-950'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? 'بازگشت به بوم ویرایش' : 'پیش‌نمایش زنده خروجی'}</span>
          </button>
        </div>
      </div>

      {previewMode ? (
        <div className="p-4 sm:p-6 rounded-2xl border border-emerald-500/30 bg-white dark:bg-stone-900 space-y-4">
          <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
            <span>پیش‌نمایش زنده چیدمان صفحه‌ساز (RTL Production Render)</span>
            <span>{rows.length.toLocaleString('fa-IR')} ردیف فعال</span>
          </div>
          <VisualComposerRenderer
            rows={rows}
            products={products}
            invoiceContext={invoiceContext}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Compact Collapsible Top Widget Palette (Zero Horizontal Scrollbar) */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3.5 space-y-3 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#1D4ED8]" />
                  <span>جعبه ابزار ۱۸ ویجت ماژولار</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', label: 'همه (۱۸)' },
                    { id: 'general', label: 'عمومی و سئو' },
                    { id: 'ecommerce', label: 'فروشگاهی' },
                    { id: 'invoice', label: 'المان فاکتور' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setPaletteFilter(tab.id as typeof paletteFilter)
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${
                        paletteFilter === tab.id
                          ? 'bg-[#1D4ED8] text-white'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-400">
                روی هر ویجت کلیک کنید تا در ردیف انتخاب‌شده درج شود
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {filteredCatalog.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  onClick={() => handleAddWidgetToRow(entry)}
                  title={entry.labelFa}
                  className="min-w-0 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#1D4ED8] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 bg-stone-50/70 dark:bg-stone-950/60 text-right transition-all flex items-center justify-between gap-1.5 cursor-pointer"
                >
                  <span className="text-[11px] font-extrabold text-stone-800 dark:text-stone-200 truncate">
                    {entry.labelFa}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Full-Width Multi-Column Rows Canvas */}
          <div className="space-y-4">
            {rows.length === 0 ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-800 text-center space-y-3 bg-white/60 dark:bg-stone-900/40">
                <p className="text-xs font-bold text-stone-600 dark:text-stone-300 max-w-xl mx-auto leading-relaxed">
                  هنوز هیچ ردیفی در بوم صفحه‌ساز وجود ندارد. می‌توانید ابتدا ساختار پیش‌فرض (شامل عنوان، چکیده و متن اصلی) را بارگذاری کنید یا از نوار بالا یک ردیف ۱ تا ۴ ستونه بسازید.
                </p>
                {contextMode !== 'invoice' && (
                  <button
                    type="button"
                    onClick={handleLoadDefaultContentStructure}
                    className="px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold inline-flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
                  >
                    <LayoutTemplate className="w-4 h-4" />
                    <span>بارگذاری خودکار ساختار پیش‌فرض (عنوان، چکیده و متن)</span>
                  </button>
                )}
              </div>
            ) : (
              rows.map((row, rowIdx) => {
                const isSelectedRow = row.id === activeRowId;
                const isRowJustAdded = recentlyAddedId === row.id;
                const gridColsClass =
                  row.columns === 4
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    : row.columns === 3
                    ? 'grid-cols-1 lg:grid-cols-3'
                    : row.columns === 2
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1';

                return (
                  <div
                    key={row.id}
                    ref={(el) => {
                      elementRefs.current[row.id] = el;
                    }}
                    draggable
                    onDragStart={() => setDraggedRowIdx(rowIdx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedRowIdx === null || draggedRowIdx === rowIdx) return;
                      const next = [...rows];
                      const [moved] = next.splice(draggedRowIdx, 1);
                      next.splice(rowIdx, 0, moved);
                      onChangeRows(next);
                      setDraggedRowIdx(null);
                    }}
                    onClick={() => setSelectedRowId(row.id)}
                    className={`p-4 rounded-2xl border transition-all space-y-3 scroll-mt-24 ${
                      isRowJustAdded
                        ? 'border-[#1D4ED8] bg-blue-50/40 dark:bg-blue-950/25 composer-just-added'
                        : isSelectedRow
                        ? 'border-[#1D4ED8] bg-white dark:bg-stone-900 ring-1 ring-[#1D4ED8]/40'
                        : 'border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/70'
                    }`}
                  >
                    {/* Row Header Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-4 h-4 text-stone-400 cursor-grab shrink-0" />
                        <input
                          type="text"
                          value={row.rowTitle}
                          onChange={(e) =>
                            handleUpdateRow(row.id, { rowTitle: e.target.value })
                          }
                          className="px-2 py-1 text-xs font-extrabold rounded-lg border border-transparent hover:border-stone-300 dark:hover:border-stone-700 bg-transparent text-stone-900 dark:text-white min-w-0"
                        />
                        {isRowJustAdded && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold inline-flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ردیف جدید اینجا اضافه شد</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={row.columns}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              columns: Number(e.target.value) as ComposerColumnCount,
                            })
                          }
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        >
                          <option value={1}>۱ ستونه</option>
                          <option value={2}>۲ ستونه</option>
                          <option value={3}>۳ ستونه</option>
                          <option value={4}>۴ ستونه</option>
                        </select>

                        <select
                          value={row.backgroundStyle || 'default'}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              backgroundStyle: e.target
                                .value as ComposerRow['backgroundStyle'],
                            })
                          }
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        >
                          <option value="default">زمینه سفید</option>
                          <option value="muted">زمینه خاکستری</option>
                          <option value="accent">زمینه آبی</option>
                          <option value="dark">زمینه تیره</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleMoveRow(rowIdx, -1)}
                          className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
                          title="انتقال ردیف به بالا"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveRow(rowIdx, 1)}
                          className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
                          title="انتقال ردیف به پایین"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-600 cursor-pointer"
                          title="حذف ردیف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Row Widgets Grid */}
                    {row.widgets.length === 0 ? (
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropWidget(row.id, 0)}
                        className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-800 text-center text-[11px] font-bold text-stone-400"
                      >
                        این ردیف خالی است — از جعبه ابزار بالا روی یک ویجت کلیک کنید یا ویجتی را به اینجا بکشید.
                      </div>
                    ) : (
                      <div className={`grid ${gridColsClass} gap-3`}>
                        {row.widgets.map((w, wIdx) => {
                          const catEntry = COMPOSER_WIDGET_CATALOG.find(
                            (c) => c.type === w.widgetType
                          );
                          const isEditing = editingWidget?.widget.id === w.id;
                          const isWidgetJustAdded = recentlyAddedId === w.id;
                          return (
                            <div
                              key={w.id}
                              ref={(el) => {
                                elementRefs.current[w.id] = el;
                              }}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggedWidgetInfo({
                                  rowId: row.id,
                                  widgetIdx: wIdx,
                                });
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onDrop={(e) => {
                                e.stopPropagation();
                                handleDropWidget(row.id, wIdx);
                              }}
                              className={`p-3 rounded-xl border transition-all space-y-2 min-w-0 scroll-mt-24 ${
                                isWidgetJustAdded
                                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 composer-just-added'
                                  : isEditing
                                  ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/20'
                                  : 'border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/70'
                              }`}
                            >
                              {isWidgetJustAdded && (
                                <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold">
                                  <span className="inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>ویجت جدید اینجا اضافه شد ✓</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingWidget({ rowId: row.id, widget: w });
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 cursor-pointer"
                                  >
                                    بازکردن تنظیمات
                                  </button>
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-extrabold text-[#1D4ED8] flex items-center gap-1 min-w-0">
                                  <GripVertical className="w-3.5 h-3.5 text-stone-400 cursor-grab shrink-0" />
                                  <span className="truncate">{catEntry?.labelFa || w.widgetType}</span>
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingWidget({ rowId: row.id, widget: w });
                                    }}
                                    className="px-2 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-[10px] font-extrabold hover:bg-[#1D4ED8] hover:text-white cursor-pointer flex items-center gap-1"
                                  >
                                    <Settings2 className="w-3 h-3" />
                                    <span>ویرایش</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteWidget(row.id, w.id);
                                    }}
                                    className="p-1 rounded text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs font-extrabold text-stone-900 dark:text-white line-clamp-1">
                                {w.title}
                              </div>
                              {w.subtitle && (
                                <div className="text-[11px] text-stone-500 line-clamp-1">
                                  {w.subtitle}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Centered Floating Modal Inspector (پنل تنظیمات ویجت) */}
            {editingWidget && (
              <div
                data-lenis-prevent
                data-lenis-prevent-wheel
                data-lenis-prevent-touch
                className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overscroll-contain"
                onClick={() => setEditingWidget(null)}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-xl max-h-[88vh] rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50/90 dark:bg-stone-950">
                    <div className="min-w-0">
                      <div className="text-[11px] font-extrabold text-[#1D4ED8]">
                        پنل تنظیمات ویجت
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-stone-900 dark:text-white truncate">
                        {editingWidget.widget.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingWidget(null)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-xs font-extrabold text-stone-700 dark:text-stone-200 cursor-pointer shrink-0"
                    >
                      بستن ✕
                    </button>
                  </div>

                  <div
                    data-lenis-prevent
                    data-lenis-prevent-wheel
                    data-lenis-prevent-touch
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                        عنوان اصلی ویجت:
                      </label>
                      <input
                        type="text"
                        value={editingWidget.widget.title}
                        onChange={(e) =>
                          handleUpdateWidget(
                            editingWidget.rowId,
                            editingWidget.widget.id,
                            { title: e.target.value }
                          )
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                        زیرعنوان / توضیح کوتاه:
                      </label>
                      <input
                        type="text"
                        value={editingWidget.widget.subtitle || ''}
                        onChange={(e) =>
                          handleUpdateWidget(
                            editingWidget.rowId,
                            editingWidget.widget.id,
                            { subtitle: e.target.value }
                          )
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                          متن کیکر بالا:
                        </label>
                        <input
                          type="text"
                          value={editingWidget.widget.badgeText || ''}
                          onChange={(e) =>
                            handleUpdateWidget(
                              editingWidget.rowId,
                              editingWidget.widget.id,
                              { badgeText: e.target.value }
                            )
                          }
                          className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                          پهنای ستون در گرید:
                        </label>
                        <select
                          value={editingWidget.widget.colSpan || 1}
                          onChange={(e) =>
                            handleUpdateWidget(
                              editingWidget.rowId,
                              editingWidget.widget.id,
                              {
                                colSpan: Number(
                                  e.target.value
                                ) as ComposerWidgetInstance['colSpan'],
                              }
                            )
                          }
                          className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
                        >
                          <option value={1}>پهنا: ۱ ستون</option>
                          <option value={2}>پهنا: ۲ ستون</option>
                          <option value={3}>پهنا: ۳ ستون</option>
                          <option value={4}>پهنا: ۴ ستون</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                        متن دکمه اقدام (CTA):
                      </label>
                      <input
                        type="text"
                        placeholder="متن دکمه..."
                        value={editingWidget.widget.ctaText || ''}
                        onChange={(e) =>
                          handleUpdateWidget(
                            editingWidget.rowId,
                            editingWidget.widget.id,
                            { ctaText: e.target.value }
                          )
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                        متن بدنه / محتوا (آیتم‌های چندتایی را با | جدا کنید):
                      </label>
                      <textarea
                        rows={5}
                        value={editingWidget.widget.content || ''}
                        onChange={(e) =>
                          handleUpdateWidget(
                            editingWidget.rowId,
                            editingWidget.widget.id,
                            { content: e.target.value }
                          )
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteWidget(editingWidget.rowId, editingWidget.widget.id)
                      }
                      className="min-h-[42px] px-4 py-2 rounded-xl border border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 text-xs font-extrabold cursor-pointer"
                    >
                      حذف ویجت
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingWidget(null)}
                      className="min-h-[42px] flex-1 py-2 px-5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold cursor-pointer"
                    >
                      تایید و بازگشت به بوم
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
