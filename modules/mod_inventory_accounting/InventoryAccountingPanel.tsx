import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, Calculator, Lock, Package, Plus, RefreshCw, ShieldCheck, TrendingUp,
} from 'lucide-react';
import { apiFetch, apiJson } from '../../src/core/apiClient';
import { formatToman } from '../../src/core/jalali';

interface StockItem {
  productId: string;
  sku: string;
  productTitle: string;
  stockQty: number;
  reservedQty: number;
  availableQty: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isUnlimitedDigital: boolean;
}

interface LedgerEntry {
  id: string;
  orderId: string;
  buyerName: string;
  gatewayId: string;
  paymentMode: string;
  grossAmount: number;
  discountAmount: number;
  gatewayFee: number;
  shippingCost: number;
  vatTaxAmount: number;
  netProfit: number;
  invoiceSerial: string;
  buyerEconomicCode: string;
  createdAt: string;
}

interface InventoryAccountingPanelProps {
  onNotice: (type: 'success' | 'error', text: string) => void;
}

export const InventoryAccountingPanel: React.FC<InventoryAccountingPanelProps> = ({ onNotice }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [activeReservationsCount, setActiveReservationsCount] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState({
    totalGross: 0,
    totalGatewayFees: 0,
    totalShipping: 0,
    totalVatTax: 0,
    totalNetProfit: 0,
  });

  // New Stock / Ledger Form State
  const [newSku, setNewSku] = useState('SK98-HW-09');
  const [newTitle, setNewTitle] = useState('پکیج سازمانی اسکیل‌های امنیت + دانگل فیزیکی');
  const [newQty, setNewQty] = useState(25);

  const loadAll = async () => {
    try {
      const [stkRes, ledRes] = await Promise.all([
        apiFetch('/api/v1/modules/inventory/stock'),
        apiFetch('/api/v1/modules/accounting/ledger'),
      ]);
      if (stkRes.ok) {
        const stkData = await stkRes.json();
        if (Array.isArray(stkData.items)) setStockItems(stkData.items);
        setActiveReservationsCount(Number(stkData.activeReservationsCount || 0));
      }
      if (ledRes.ok) {
        const ledData = await ledRes.json();
        if (Array.isArray(ledData.entries)) setLedgerEntries(ledData.entries);
        if (ledData.summary) setSummary(ledData.summary);
      }
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleAddOrUpdateStock = async () => {
    try {
      const { ok } = await apiJson('/api/v1/modules/inventory/stock', {
        method: 'POST',
        body: JSON.stringify({
          productId: newSku.toLowerCase(),
          sku: newSku,
          productTitle: newTitle,
          stockQty: newQty,
          lowStockThreshold: 5,
          isUnlimitedDigital: false,
        }),
      });
      if (ok) {
        onNotice('success', 'موجودی کالا در جدول mod_inventory_stock به‌روزرسانی شد.');
        void loadAll();
      }
    } catch {
      onNotice('error', 'خطا در ثبت موجودی انبار');
    }
  };

  const handleSimulateBlackFridayLock = async (item: StockItem) => {
    try {
      const { ok, data } = await apiJson<{ error?: string; ttlSeconds?: number }>(
        '/api/v1/modules/inventory/reserve',
        {
          method: 'POST',
          body: JSON.stringify({
            sessionKey: `bf_lock_${Date.now()}`,
            items: [{ productId: item.productId, qty: 1 }],
          }),
        }
      );
      if (ok) {
        onNotice('success', `۱ عدد از «${item.productTitle}» برای ۱۰ دقیقه در مودال تسویه‌حساب رزرو موقت شد.`);
        void loadAll();
      } else {
        onNotice('error', data.error || 'موجودی کافی نیست.');
      }
    } catch {
      onNotice('error', 'خطا در رزرو موقت موجودی');
    }
  };

  const handleRecordSampleLedgerOrder = async () => {
    try {
      const { ok, data } = await apiJson<{ invoiceSerial?: string; netProfit?: number }>(
        '/api/v1/modules/accounting/ledger',
        {
          method: 'POST',
          body: JSON.stringify({
            buyerName: 'هلدینگ فناوری اطلاعات سپهر',
            gatewayId: 'irankish',
            paymentMode: 'cash_shaparak',
            grossAmount: 3600000,
            discountAmount: 180000,
            shippingCost: 75000,
            buyerEconomicCode: '411987456321',
          }),
        }
      );
      if (ok) {
        onNotice('success', `سند حسابداری ${data.invoiceSerial} با سود خالص ${formatToman(data.netProfit || 0)} ثبت شد.`);
        void loadAll();
      }
    } catch {
      onNotice('error', 'خطا در ثبت سند حسابداری');
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'فروش ناخالص کل', val: formatToman(summary.totalGross), color: 'text-stone-900 dark:text-white' },
          { label: 'کارمزد درگاه‌ها (۱٪)', val: formatToman(summary.totalGatewayFees), color: 'text-rose-600' },
          { label: 'هزینه حمل‌ونقل', val: formatToman(summary.totalShipping), color: 'text-amber-600' },
          { label: 'مالیات ارزش افزوده (۱۰٪)', val: formatToman(summary.totalVatTax), color: 'text-[#1D4ED8] dark:text-sky-400' },
          { label: 'سود خالص فروشگاهی', val: formatToman(summary.totalNetProfit), color: 'text-emerald-600' },
        ].map((kpi, idx) => (
          <div key={idx} className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-1">
            <div className="text-[11px] font-bold text-stone-500">{kpi.label}</div>
            <div className={`text-xs sm:text-sm font-black smooth-nums ${kpi.color}`}>{kpi.val}</div>
          </div>
        ))}
      </div>

      {/* Real-Time Stock & Black Friday Reservation Lock Table */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-[#1D4ED8]" />
              <span>مدیریت موجودی لحظه‌ای و قفل رزرو موقت بلک‌فرایدی (mod_inventory_stock)</span>
            </h3>
            <p className="text-xs text-stone-500">
              رزروهای فعال در مودال تسویه‌حساب: <strong>{activeReservationsCount.toLocaleString('fa-IR')} قفل فعال (TTL ۱۰ دقیقه)</strong>
            </p>
          </div>
          <button type="button" onClick={() => void loadAll()} className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بروزرسانی</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input type="text" dir="ltr" value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="SKU" className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono" />
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="عنوان کالا / پکیج" className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold" />
          <div className="flex gap-2">
            <input type="number" value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} className="w-20 px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold text-center" />
            <button type="button" onClick={() => void handleAddOrUpdateStock()} className="flex-1 px-3 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer">
              + ثبت کالا
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-extrabold">
              <tr>
                <th className="p-2.5">کد کالا (SKU)</th>
                <th className="p-2.5">عنوان محصول</th>
                <th className="p-2.5">موجودی کل</th>
                <th className="p-2.5">رزرو در سبد</th>
                <th className="p-2.5">موجودی قابل فروش</th>
                <th className="p-2.5">عملیات تست بلک‌فرایدی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {stockItems.map((item) => (
                <tr key={item.productId}>
                  <td className="p-2.5 font-mono font-bold" dir="ltr">{item.sku}</td>
                  <td className="p-2.5 font-extrabold text-stone-900 dark:text-white">{item.productTitle}</td>
                  <td className="p-2.5 font-bold smooth-nums">{item.isUnlimitedDigital ? '∞ دیجیتال' : item.stockQty.toLocaleString('fa-IR')}</td>
                  <td className="p-2.5 font-bold text-amber-600 smooth-nums">{item.reservedQty.toLocaleString('fa-IR')}</td>
                  <td className="p-2.5 font-black smooth-nums">
                    {item.isUnlimitedDigital ? (
                      <span className="text-emerald-600">نامحدود</span>
                    ) : (
                      <span className={item.isLowStock ? 'text-rose-600 inline-flex items-center gap-1' : 'text-emerald-600'}>
                        {item.isLowStock && <AlertTriangle className="w-3.5 h-3.5" />}
                        {item.availableQty.toLocaleString('fa-IR')} عدد
                      </span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <button
                      type="button"
                      onClick={() => void handleSimulateBlackFridayLock(item)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 font-extrabold hover:bg-amber-500/25 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>قفل رزرو موقت</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Store Accounting Ledger */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span>دفتر کل حسابداری خودکار و اسناد مالیاتی (mod_accounting_ledger)</span>
            </h3>
            <p className="text-xs text-stone-500">محاسبه خودکار درآمد ناخالص، کارمزد درگاه، هزینه ارسال، ۱۰٪ ارزش افزوده و سود خالص</p>
          </div>
          <button
            type="button"
            onClick={() => void handleRecordSampleLedgerOrder()}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت سند مالی جدید</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-extrabold">
              <tr>
                <th className="p-2.5">شماره فاکتور رسمی</th>
                <th className="p-2.5">خریدار / کد اقتصادی</th>
                <th className="p-2.5">درگاه</th>
                <th className="p-2.5">مبلغ ناخالص</th>
                <th className="p-2.5">ارزش افزوده (۱۰٪)</th>
                <th className="p-2.5">کارمزد + ارسال</th>
                <th className="p-2.5">سود خالص</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {ledgerEntries.map((e) => (
                <tr key={e.id}>
                  <td className="p-2.5 font-mono font-extrabold text-[#1D4ED8]" dir="ltr">{e.invoiceSerial}</td>
                  <td className="p-2.5 font-bold">{e.buyerName} <span className="text-[10px] text-stone-400">({e.buyerEconomicCode})</span></td>
                  <td className="p-2.5 font-bold">{e.gatewayId}</td>
                  <td className="p-2.5 font-bold smooth-nums">{formatToman(e.grossAmount)}</td>
                  <td className="p-2.5 font-bold text-[#1D4ED8] smooth-nums">{formatToman(e.vatTaxAmount)}</td>
                  <td className="p-2.5 text-rose-600 smooth-nums">{formatToman(e.gatewayFee + e.shippingCost)}</td>
                  <td className="p-2.5 font-black text-emerald-600 smooth-nums">{formatToman(e.netProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
