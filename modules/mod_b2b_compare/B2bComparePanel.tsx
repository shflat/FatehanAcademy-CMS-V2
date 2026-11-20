import React, { useEffect, useState } from 'react';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface B2bTier {
  id: string;
  tier_name_fa: string;
  min_qty: number;
  discount_percent: number;
  applies_category: string;
}

interface B2bQuote {
  id: string;
  company_name: string;
  contact_phone: string;
  product_summary: string;
  requested_qty: number;
  status: string;
  created_at_fa: string;
}

export const B2bComparePanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [tiers, setTiers] = useState<B2bTier[]>([]);
  const [quotes, setQuotes] = useState<B2bQuote[]>([]);
  const [tierNameFa, setTierNameFa] = useState('');
  const [minQty, setMinQty] = useState(10);
  const [discountPercent, setDiscountPercent] = useState(20);

  const loadAll = async () => {
    const { ok, data } = await apiJson<{ tiers?: B2bTier[]; quotes?: B2bQuote[] }>(
      '/api/v1/modules/b2b-compare/admin/overview'
    );
    if (ok) {
      setTiers(data.tiers || []);
      setQuotes(data.quotes || []);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{ error?: string }>('/api/v1/modules/b2b-compare/admin/tiers', {
      method: 'POST',
      body: JSON.stringify({ tierNameFa, minQty, discountPercent, appliesCategory: 'all' }),
    });
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در افزودن پلکان عمده‌فروشی');
      return;
    }
    setTierNameFa('');
    onNotice?.('success', 'پلکان قیمت‌گذاری عمده B2B ثبت شد.');
    void loadAll();
  };

  const handleDeleteTier = async (id: string) => {
    await apiJson(`/api/v1/modules/b2b-compare/admin/tiers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    void loadAll();
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
          <Building2 className="w-4 h-4" />
          <span>فروش عمده سازمانی B2B و موتور مقایسه محصولات (mod_b2b_compare)</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
          تعریف پلکان تخفیف تیراژ، استعلام پیش‌فاکتور سازمانی و جدول مقایسه فنی محصولات
        </h2>
      </div>

      <form
        onSubmit={(e) => void handleAddTier(e)}
        className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 grid grid-cols-1 sm:grid-cols-4 gap-3"
      >
        <input
          type="text"
          required
          value={tierNameFa}
          onChange={(e) => setTierNameFa(e.target.value)}
          placeholder="نام پلکان (مثلاً: تیراژ سازمانی ۱۰+ عدد)"
          className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <input
          type="number"
          min={2}
          value={minQty}
          onChange={(e) => setMinQty(Number(e.target.value))}
          placeholder="حداقل تعداد"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-center"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={80}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className="w-20 px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-center"
            title="درصد تخفیف"
          />
          <button
            type="submit"
            className="flex-1 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> ثبت
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2.5">
          <h3 className="text-xs font-extrabold">پلکان‌های قیمت‌گذاری عمده ({tiers.length.toLocaleString('fa-IR')})</h3>
          {tiers.map((t) => (
            <div key={t.id} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-extrabold">{t.tier_name_fa}</div>
                <div className="text-stone-500 smooth-nums">
                  حداقل {t.min_qty.toLocaleString('fa-IR')} عدد ·{' '}
                  <strong className="text-emerald-600">{t.discount_percent.toLocaleString('fa-IR')}٪ تخفیف</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleDeleteTier(t.id)}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2.5">
          <h3 className="text-xs font-extrabold">استعلام‌های پیش‌فاکتور سازمانی ({quotes.length.toLocaleString('fa-IR')})</h3>
          {quotes.length === 0 ? (
            <p className="text-xs text-stone-400">هنوز استعلام سازمانی ثبت نشده است.</p>
          ) : (
            quotes.map((q) => (
              <div key={q.id} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-1">
                <div className="flex justify-between font-extrabold">
                  <span>{q.company_name}</span>
                  <span className="font-mono text-stone-500" dir="ltr">{q.contact_phone}</span>
                </div>
                <p className="text-stone-500">{q.product_summary} (تعداد: {q.requested_qty.toLocaleString('fa-IR')})</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
