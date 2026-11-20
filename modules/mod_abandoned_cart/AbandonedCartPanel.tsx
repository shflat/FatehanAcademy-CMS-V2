import React, { useEffect, useState } from 'react';
import { RefreshCw, Send, ShoppingCart } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface AbandonedCartRow {
  id: string;
  user_phone?: string;
  user_name?: string;
  items_json: string;
  total_amount: number;
  status: string;
  recovery_coupon?: string;
  reminders_sent: number;
  updated_at_fa: string;
}

export const AbandonedCartPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [carts, setCarts] = useState<AbandonedCartRow[]>([]);
  const [couponCode, setCouponCode] = useState('BACK10');
  const [loading, setLoading] = useState(false);

  const loadCarts = async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{ carts?: AbandonedCartRow[] }>(
        '/api/v1/modules/abandoned-cart/list'
      );
      if (ok) setCarts(data.carts || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCarts();
  }, []);

  const handleRecover = async (id: string) => {
    const { ok, data } = await apiJson<{ error?: string }>(
      `/api/v1/modules/abandoned-cart/${encodeURIComponent(id)}/recover`,
      { method: 'POST', body: JSON.stringify({ couponCode }) }
    );
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در ارسال پیام بازیابی سبد');
      return;
    }
    onNotice?.('success', 'پیامک/اعلان بازیابی سبد خرید ارسال و در لاگ یکپارچه ثبت شد.');
    void loadCarts();
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5 mb-1">
            <ShoppingCart className="w-4 h-4" />
            <span>بازیابی سبد خرید رهاشده (mod_abandoned_cart)</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
            رصد سبدهای ناتمام مشتریان و ارسال کوپن تخفیف بازیابی با ۱ کلیک
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            dir="ltr"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="کد کوپن"
            className="w-28 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono text-center"
          />
          <button
            type="button"
            onClick={() => void loadCarts()}
            className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            <tr>
              <th className="p-3">مشتری / تماس</th>
              <th className="p-3">اقلام سبد</th>
              <th className="p-3">مبلغ سبد</th>
              <th className="p-3">وضعیت / یادآوری</th>
              <th className="p-3">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {carts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-400">
                  در حال حاضر سبد خرید رهاشده‌ای ثبت نشده است.
                </td>
              </tr>
            ) : (
              carts.map((cart) => {
                let items: { title?: string; qty?: number }[] = [];
                try {
                  items = JSON.parse(cart.items_json || '[]');
                } catch {
                  items = [];
                }
                return (
                  <tr key={cart.id}>
                    <td className="p-3">
                      <div className="font-extrabold text-stone-900 dark:text-white">
                        {cart.user_name || 'کاربر مهمان'}
                      </div>
                      <div className="text-[11px] font-mono text-stone-500" dir="ltr">
                        {cart.user_phone || 'بدون شماره'}
                      </div>
                    </td>
                    <td className="p-3 text-stone-600 dark:text-stone-300">
                      {items.map((i) => `${i.title || 'محصول'} (×${i.qty || 1})`).join('، ') || '—'}
                    </td>
                    <td className="p-3 font-black text-emerald-600 smooth-nums">
                      {Number(cart.total_amount).toLocaleString('fa-IR')} تومان
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold">
                        {cart.status === 'reminded' ? 'یادآوری ارسال شد' : cart.status === 'converted' ? 'تکمیل‌شده' : 'رهاشده'}
                      </span>
                      <div className="text-[10px] text-stone-400 mt-1 smooth-nums">
                        {cart.reminders_sent.toLocaleString('fa-IR')} بار ارسال · {cart.updated_at_fa}
                      </div>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => void handleRecover(cart.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#1D4ED8] text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>ارسال کوپن</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
