import React, { useEffect, useState } from 'react';
import { Link2, Plus, Users } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface PartnerRow {
  id: string;
  full_name: string;
  phone: string;
  ref_code: string;
  commission_percent: number;
  total_clicks: number;
  total_earned: number;
  created_at_fa: string;
}

export const AffiliatePanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [refCode, setRefCode] = useState('');
  const [commission, setCommission] = useState(15);

  const loadOverview = async () => {
    const { ok, data } = await apiJson<{ partners?: PartnerRow[] }>(
      '/api/v1/modules/affiliate/overview'
    );
    if (ok) setPartners(data.partners || []);
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{ error?: string; refCode?: string }>(
      '/api/v1/modules/affiliate/partners',
      {
        method: 'POST',
        body: JSON.stringify({ fullName, phone, refCode, commissionPercent: commission }),
      }
    );
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در ثبت همکار فروش');
      return;
    }
    setFullName('');
    setPhone('');
    setRefCode('');
    onNotice?.('success', `همکار فروش با کد معرف ${data.refCode} ثبت شد.`);
    void loadOverview();
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
          <Users className="w-4 h-4" />
          <span>سیستم همکاری در فروش و بازاریابی ارجاعی (mod_affiliate)</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
          تعریف همکاران فروش، لینک‌های اختصاصی (?ref=CODE)، درصد پورسانت و تسویه
        </h2>
      </div>

      <form
        onSubmit={(e) => void handleAddPartner(e)}
        className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="نام همکار فروش"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <input
          type="tel"
          dir="ltr"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0912..."
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <input
          type="text"
          dir="ltr"
          value={refCode}
          onChange={(e) => setRefCode(e.target.value)}
          placeholder="کد معرف (اختیاری)"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
        />
        <input
          type="number"
          min={1}
          max={70}
          value={commission}
          onChange={(e) => setCommission(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-center"
          title="درصد پورسانت"
        />
        <button
          type="submit"
          className="py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن همکار</span>
        </button>
      </form>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            <tr>
              <th className="p-3">همکار فروش</th>
              <th className="p-3">لینک ارجاع اختصاصی</th>
              <th className="p-3">درصد پورسانت</th>
              <th className="p-3">کلیک‌ها</th>
              <th className="p-3">پورسانت کل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {partners.map((p) => (
              <tr key={p.id}>
                <td className="p-3">
                  <div className="font-extrabold">{p.full_name}</div>
                  <div className="text-[11px] font-mono text-stone-500" dir="ltr">{p.phone}</div>
                </td>
                <td className="p-3 font-mono text-[11px] text-[#1D4ED8]" dir="ltr">
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" />
                    /?ref={p.ref_code}
                  </span>
                </td>
                <td className="p-3 font-black smooth-nums">{p.commission_percent.toLocaleString('fa-IR')}٪</td>
                <td className="p-3 smooth-nums">{Number(p.total_clicks).toLocaleString('fa-IR')}</td>
                <td className="p-3 font-black text-emerald-600 smooth-nums">
                  {Number(p.total_earned).toLocaleString('fa-IR')} تومان
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
