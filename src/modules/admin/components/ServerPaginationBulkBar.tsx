import React, { useState } from 'react';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Square,
  Trash2,
} from 'lucide-react';
import { apiJson } from '../../../core/apiClient';

export interface BulkActionOption {
  value: string;
  label: string;
}

interface ServerPaginationBulkBarProps {
  entity: 'products' | 'articles' | 'media' | 'orders';
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  selectedCategory?: string;
  selectedStatus?: string;
  categoryOptions?: { value: string; label: string }[];
  statusOptions?: { value: string; label: string }[];
  selectedIds: string[];
  allVisibleIds: string[];
  bulkActions: BulkActionOption[];
  onChangePage: (page: number) => void;
  onChangePageSize: (size: number) => void;
  onChangeSearch: (q: string) => void;
  onChangeCategory?: (cat: string) => void;
  onChangeStatus?: (st: string) => void;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkCompleted: (affectedCount: number, action: string) => void;
  onNotice: (type: 'success' | 'error', text: string) => void;
}

export const ServerPaginationBulkBar: React.FC<ServerPaginationBulkBarProps> = ({
  entity,
  totalCount,
  currentPage,
  pageSize,
  searchQuery,
  selectedCategory,
  selectedStatus,
  categoryOptions,
  statusOptions,
  selectedIds,
  allVisibleIds,
  bulkActions,
  onChangePage,
  onChangePageSize,
  onChangeSearch,
  onChangeCategory,
  onChangeStatus,
  onToggleSelectAll,
  onClearSelection,
  onBulkCompleted,
  onNotice,
}) => {
  const [bulkAction, setBulkAction] = useState<string>(bulkActions[0]?.value || 'delete');
  const [isExecutingBulk, setIsExecutingBulk] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.includes(id));

  const handleRunBulkAction = async () => {
    if (selectedIds.length === 0) {
      onNotice('error', 'ابتدا حداقل یک مورد را از لیست انتخاب کنید.');
      return;
    }
    setIsExecutingBulk(true);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        affectedCount?: number;
        error?: string;
      }>('/api/v1/catalog/bulk', {
        method: 'POST',
        body: JSON.stringify({
          entity,
          action: bulkAction,
          ids: selectedIds,
        }),
      });
      if (!ok) {
        throw new Error(data.error || 'خطا در اجرای عملیات گروهی');
      }
      onBulkCompleted(data.affectedCount || selectedIds.length, bulkAction);
      onClearSelection();
      onNotice(
        'success',
        `عملیات گروهی روی ${(data.affectedCount || selectedIds.length).toLocaleString('fa-IR')} مورد با موفقیت انجام شد.`
      );
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در اجرای عملیات گروهی'
      );
    } finally {
      setIsExecutingBulk(false);
    }
  };

  return (
    <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-3">
      {/* Row 1: Search & Multi-Attribute Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onChangeSearch(e.target.value);
                onChangePage(1);
              }}
              placeholder="جستجوی سریع در هزاران رکورد..."
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white"
            />
          </div>

          {categoryOptions && onChangeCategory && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={selectedCategory || 'all'}
                onChange={(e) => {
                  onChangeCategory(e.target.value);
                  onChangePage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {statusOptions && onChangeStatus && (
            <select
              value={selectedStatus || 'all'}
              onChange={(e) => {
                onChangeStatus(e.target.value);
                onChangePage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
            >
              <option value="all">همه وضعیت‌ها</option>
              {statusOptions.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Page Size & Total Counter */}
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="smooth-nums font-bold text-stone-700 dark:text-stone-300">
            کل: {totalCount.toLocaleString('fa-IR')} مورد
          </span>
          <span>·</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onChangePageSize(Number(e.target.value));
              onChangePage(1);
            }}
            className="px-2 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 smooth-nums"
          >
            {[6, 12, 24, 50, 100].map((sz) => (
              <option key={sz} value={sz}>
                {sz.toLocaleString('fa-IR')} در هر صفحه
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Bulk Actions & Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 flex items-center gap-1.5 cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#1D4ED8]" />
            ) : (
              <Square className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span>
              {allSelected ? 'لغو انتخاب صفحه' : 'انتخاب همه در این صفحه'}
            </span>
          </button>

          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
          >
            {bulkActions.map((ba) => (
              <option key={ba.value} value={ba.value}>
                {ba.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={selectedIds.length === 0 || isExecutingBulk}
            onClick={() => void handleRunBulkAction()}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
              selectedIds.length > 0
                ? bulkAction === 'delete'
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
            }`}
          >
            {bulkAction === 'delete' && <Trash2 className="w-3.5 h-3.5" />}
            <span>
              {isExecutingBulk
                ? 'در حال اعمال...'
                : `اعمال روی (${selectedIds.length.toLocaleString('fa-IR')}) مورد`}
            </span>
          </button>
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onChangePage(currentPage - 1)}
            className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="px-2.5 py-1 font-extrabold smooth-nums text-stone-700 dark:text-stone-300">
            صفحه {currentPage.toLocaleString('fa-IR')} از{' '}
            {totalPages.toLocaleString('fa-IR')}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onChangePage(currentPage + 1)}
            className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
