import React, { useEffect, useState } from 'react';
import { Check, RotateCcw, Wallet } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface WalletTx {
  id: string;
  user_phone: string;
  tx_type: string;
  amount_toman: number;
  reason: string;
  created_at_fa: string;
}

interface RmaItem {
  id: string;
  order_id: string;
  user_phone: string;
  reason: string;
  refund_amount: number;
  status: string;
  created_at_fa: string;
}

export const WalletRmaPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [rmas, setRmas] = useState<RmaItem[]>([]);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState(250000);
  const [txType, setTxType] = useState<'credit' | 'cashback' | 'debit'>('credit');
  const [reason, setReason] = useState('هدیه کش‌بک وفاداری');

  const loadOverview = async () => {
    const { ok, data } = await apiJson<{
      transactions?: WalletTx[];
      rmaRequests?: RmaItem[];
    }>('/api/v1/modules/wallet-rma/overview');
    if (ok) {
      setTxs(data.transactions || []);
      setRmas(data.rmaRequests || []);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{ error?: string }>('/api/v1/modules/wallet-rma/transaction', {
      method: 'POST',
      body: JSON.stringify({ userPhone: phone, txType, amountToman: amount, reason }),
    });
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در ثبت تراکنش کیف پول');
      return;
    }
    setPhone('');
    onNotice?.('success', 'تراکنش کیف پول مشتری با موفقیت ثبت شد.');
    void loadOverview();
  };

  const handleResolveRma = async (id: string, status: 'approved_refunded' | 'rejected') => {
    const { ok } = await apiJson(`/api/v1/modules/wallet-rma/rma/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status, creditWallet: status === 'approved_refunded' }),
    });
    if (ok) {
      onNotice?.(
        'success',
        status === 'approved_refunded'
          ? 'مرجوعی تایید و مبلغ به کیف پول مشتری واریز شد.'
          : 'درخواست مرجوعی رد شد.'
      );
      void loadOverview();
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mb-1">
          <Wallet className="w-4 h-4" />
          <span>کیف پول، کش‌بک و مدیریت مرجوعی RMA (mod_wallet_rma)</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
          شارژ و کسر اعتبار کیف پول مشتریان، کش‌بک خودکار و بازگشت وجه سفارش‌ها
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form
          onSubmit={(e) => void handleAddTx(e)}
          className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3"
        >
          <h3 className="text-xs font-extrabold text-stone-800 dark:text-stone-200">ثبت تراکنش کیف پول</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="tel"
              dir="ltr"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912..."
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
            />
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value as 'credit' | 'cashback' | 'debit')}
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
            >
              <option value="credit">افزایش اعتبار (شارژ)</option>
              <option value="cashback">کش‌بک خرید</option>
              <option value="debit">کسر از کیف پول</option>
            </select>
          </div>
          <input
            type="number"
            min={1000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="شرح تراکنش"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer"
          >
            ثبت تراکنش کیف پول
          </button>
        </form>

        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <h3 className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>درخواست‌های مرجوعی و استرداد وجه ({rmas.length.toLocaleString('fa-IR')})</span>
          </h3>
          {rmas.length === 0 ? (
            <p className="text-xs text-stone-400">درخواست مرجوعی باز وجود ندارد.</p>
          ) : (
            rmas.map((r) => (
              <div key={r.id} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-1.5">
                <div className="flex justify-between font-extrabold">
                  <span>سفارش {r.order_id}</span>
                  <span className="text-emerald-600 smooth-nums">
                    {Number(r.refund_amount).toLocaleString('fa-IR')} تومان
                  </span>
                </div>
                <p className="text-stone-500">{r.reason}</p>
                {r.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void handleResolveRma(r.id, 'approved_refunded')}
                      className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> تایید و واریز به کیف پول
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResolveRma(r.id, 'rejected')}
                      className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold cursor-pointer"
                    >
                      رد درخواست
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Wallet Ledger */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2.5">
        <h3 className="text-xs font-extrabold">دفتر کل تراکنش‌های کیف پول</h3>
        <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
          {txs.map((t) => (
            <div key={t.id} className="py-2 flex items-center justify-between gap-3">
              <div>
                <span className="font-mono font-bold" dir="ltr">{t.user_phone}</span> · {t.reason}
              </div>
              <div className="smooth-nums font-black text-emerald-600">
                {t.tx_type === 'debit' ? '-' : '+'}
                {Number(t.amount_toman).toLocaleString('fa-IR')} تومان
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
