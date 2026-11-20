import React, { useState } from 'react';
import { CheckSquare, Square, Tag, Trash2 } from 'lucide-react';
import type { CouponRule, OrderRecord } from '../../../core/types';
import { ServerPaginationBulkBar } from '../components/ServerPaginationBulkBar';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface OrdersCouponsPanelProps {
  orders: OrderRecord[];
  coupons: CouponRule[];
  accentButtonClass: string;
  onSaveCoupon: (coupon: CouponRule) => void;
  onDeleteCoupon: (code: string) => void;
  onUpdateOrderStatus: (
    orderId: string,
    status: OrderRecord['status']
  ) => Promise<void>;
  onRefreshFromServer?: () => void;
  onNotice: NoticeFn;
}

export const OrdersCouponsPanel: React.FC<OrdersCouponsPanelProps> = ({
  orders,
  coupons,
  accentButtonClass,
  onSaveCoupon,
  onDeleteCoupon,
  onUpdateOrderStatus,
  onRefreshFromServer,
  onNotice,
}) => {
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPercent, setNewCouponPercent] = useState<number>(15);
  const [newCouponDesc, setNewCouponDesc] = useState('');

  // Server-backed Pagination, Filtering & Bulk Selection for Orders
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleAddCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCouponCode.trim().toUpperCase();
    if (!cleanCode) return;
    onSaveCoupon({
      code: cleanCode,
      discountPercent: Math.max(1, Math.min(100, Number(newCouponPercent))),
      description:
        newCouponDesc.trim() || `${newCouponPercent}٪ تخفیف ویژه اسکیل ۹۸`,
      active: true,
    });
    setNewCouponCode('');
    setNewCouponDesc('');
    onNotice('success', `کد تخفیف ${cleanCode} ثبت و فعال شد.`);
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.buyerId.toLowerCase().includes(q) ||
        o.itemsSummary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pagedOrders = filteredOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const visibleIds = pagedOrders.map((o) => o.id);

  return (
    <div className="space-y-6">
      {/* Coupon Manager */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#1D4ED8]" />
          <h2 className="text-base font-extrabold text-stone-900 dark:text-white">
            مدیریت کدهای تخفیف (قابل استفاده در مودال سبد خرید)
          </h2>
        </div>

        <form
          onSubmit={handleAddCouponSubmit}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3"
        >
          <input
            type="text"
            placeholder="کد تخفیف (مثلاً BAHAR98)"
            value={newCouponCode}
            onChange={(e) => setNewCouponCode(e.target.value)}
            dir="ltr"
            className="px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
          />
          <input
            type="number"
            min={1}
            max={100}
            placeholder="درصد تخفیف"
            value={newCouponPercent}
            onChange={(e) => setNewCouponPercent(Number(e.target.value))}
            className="px-3 py-2 text-xs smooth-nums rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
          />
          <input
            type="text"
            placeholder="توضیح کد تخفیف"
            value={newCouponDesc}
            onChange={(e) => setNewCouponDesc(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
          />
          <button
            type="submit"
            className={`px-4 py-2 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
          >
            افزودن کد تخفیف
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {coupons.map((cp) => (
            <div
              key={cp.code}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between"
            >
              <div>
                <div className="font-mono text-xs font-extrabold text-[#1D4ED8]" dir="ltr">
                  {cp.code} ({cp.discountPercent}٪)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  {cp.description}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteCoupon(cp.code)}
                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Orders Table with Server Pagination & Bulk Actions */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            سفارشات ثبت‌شده مشتریان ({orders.length.toLocaleString('fa-IR')})
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            مجهز به صفحه‌بندی سروری، فیلتر وضعیت و عملیات گروهی تغییر وضعیت سفارش
          </p>
        </div>

        <ServerPaginationBulkBar
          entity="orders"
          totalCount={filteredOrders.length}
          currentPage={page}
          pageSize={pageSize}
          searchQuery={searchQuery}
          selectedStatus={statusFilter}
          statusOptions={[
            { value: 'paid', label: 'پرداخت موفق' },
            { value: 'completed', label: 'تکمیل‌شده' },
            { value: 'pending', label: 'در انتظار پرداخت' },
            { value: 'cancelled', label: 'لغوشده' },
          ]}
          selectedIds={selectedIds}
          allVisibleIds={visibleIds}
          bulkActions={[
            { value: 'completed', label: 'تغییر وضعیت گروهی به تکمیل‌شده' },
            { value: 'paid', label: 'تغییر وضعیت گروهی به پرداخت موفق' },
            { value: 'cancelled', label: 'لغو گروهی سفارش‌ها' },
            { value: 'delete', label: 'حذف گروهی سفارش‌ها' },
          ]}
          onChangePage={setPage}
          onChangePageSize={setPageSize}
          onChangeSearch={setSearchQuery}
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

        <div className="divide-y divide-stone-200 dark:divide-stone-800">
          {pagedOrders.map((order) => {
            const checked = selectedIds.includes(order.id);
            return (
              <div
                key={order.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 dark:hover:bg-stone-950/40"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds((prev) =>
                        prev.includes(order.id)
                          ? prev.filter((x) => x !== order.id)
                          : [...prev, order.id]
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
                  <div className="space-y-1">
                    <div className="text-xs text-stone-500 smooth-nums">
                      #{order.id.slice(-8)} · خریدار: {order.buyerName} ·{' '}
                      {order.createdAtLabel}
                    </div>
                    <div className="text-sm font-extrabold text-stone-900 dark:text-white">
                      {order.itemsSummary}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="smooth-nums tabular-nums text-sm font-extrabold text-stone-900 dark:text-white">
                    {order.totalAmount.toLocaleString('fa-IR')} تومان
                  </span>
                  <select
                    value={order.status}
                    onChange={(e) =>
                      void onUpdateOrderStatus(
                        order.id,
                        e.target.value as OrderRecord['status']
                      )
                    }
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                  >
                    <option value="paid">پرداخت موفق</option>
                    <option value="completed">تکمیل‌شده</option>
                    <option value="pending">در انتظار پرداخت</option>
                    <option value="cancelled">لغوشده</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
