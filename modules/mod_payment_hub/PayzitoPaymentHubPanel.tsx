import React, { useEffect, useState } from 'react';
import {
  Calculator, Check, CreditCard, Percent, RefreshCw, Save, ShieldCheck, Sparkles,
} from 'lucide-react';
import { apiFetch, apiJson } from '../../src/core/apiClient';
import { formatToman } from '../../src/core/jalali';

interface PayzitoDriver {
  id: string;
  gatewayKind: 'cash_psp' | 'bnpl_installment';
  titleFa: string;
  providerCode: string;
  enabled: boolean;
  sandboxMode: boolean;
  cashDiscountPercent: number;
  bnplFeePercent: number;
  installmentsCount: number;
  credentialsJson: Record<string, string>;
  sortOrder: number;
}

interface PayzitoPaymentHubPanelProps {
  onNotice: (type: 'success' | 'error', text: string) => void;
}

export const PayzitoPaymentHubPanel: React.FC<PayzitoPaymentHubPanelProps> = ({ onNotice }) => {
  const [drivers, setDrivers] = useState<PayzitoDriver[]>([]);
  const [filterKind, setFilterKind] = useState<'all' | 'cash_psp' | 'bnpl_installment'>('all');
  const [selectedDriver, setSelectedDriver] = useState<PayzitoDriver | null>(null);
  const [loading, setLoading] = useState(false);

  // Live Pricing Rule Simulator
  const [simAmount, setSimAmount] = useState(4000000);
  const [simDriverId, setSimDriverId] = useState('snapppay');
  const [simResult, setSimResult] = useState<{
    titleFa: string;
    cashDiscountAmount: number;
    bnplFeeAmount: number;
    finalPayable: number;
    installmentsCount: number;
    perInstallmentAmount: number;
  } | null>(null);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/modules/payment-hub/drivers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setDrivers(data.items);
          if (!selectedDriver && data.items[0]) setSelectedDriver(data.items[0]);
        }
      }
    } catch {
      onNotice('error', 'خطا در دریافت درایورهای هاب پرداخت پی‌زیتو');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDrivers();
  }, []);

  const handleSaveDriver = async (drv: PayzitoDriver) => {
    try {
      const { ok, data } = await apiJson<{ items?: PayzitoDriver[]; error?: string }>(
        '/api/v1/modules/payment-hub/drivers',
        {
          method: 'POST',
          body: JSON.stringify(drv),
        }
      );
      if (ok && Array.isArray(data.items)) {
        setDrivers(data.items);
        const updated = data.items.find((d) => d.id === drv.id) || null;
        setSelectedDriver(updated);
        onNotice('success', `تنظیمات و قوانین نرخ «${drv.titleFa}» در جدول mod_payment_hub_drivers ذخیره شد.`);
      } else {
        onNotice('error', data.error || 'خطا در ذخیره درایور');
      }
    } catch {
      onNotice('error', 'خطا در ارتباط با سرور هاب پرداخت');
    }
  };

  const handleRunPricingSimulator = async () => {
    try {
      const { ok, data } = await apiJson<{
        titleFa: string;
        cashDiscountAmount: number;
        bnplFeeAmount: number;
        finalPayable: number;
        installmentsCount: number;
        perInstallmentAmount: number;
      }>('/api/v1/modules/payment-hub/calculate', {
        method: 'POST',
        body: JSON.stringify({ amountToman: simAmount, driverId: simDriverId }),
      });
      if (ok) setSimResult(data);
    } catch {
      onNotice('error', 'خطا در محاسبه نرخ پویا');
    }
  };

  const displayedDrivers = drivers.filter((d) =>
    filterKind === 'all' ? true : d.gatewayKind === filterKind
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl border border-blue-500/30 bg-gradient-to-l from-blue-950 via-[#131C31] to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>ماژول ایزوله mod_payment_hub (معماری مشابه Payzito)</span>
          </div>
          <h3 className="text-base sm:text-lg font-black">
            هاب یکپارچه ۸ درگاه نقدی شاپرک + ۹ درگاه خرید اقساطی ایران (BNPL) و قوانین نرخ پویا
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'cash_psp', 'bnpl_installment'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterKind(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                filterKind === k ? 'bg-amber-400 text-stone-950' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {k === 'all' ? `همه (${drivers.length.toLocaleString('fa-IR')})` : k === 'cash_psp' ? '۸ درگاه بانکی/واسط نقدی' : '۹ درگاه اقساطی BNPL'}
            </button>
          ))}
          <button type="button" onClick={() => void loadDrivers()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main 12-Col Grid: Drivers List (7 cols) + Driver Config & Dynamic Pricing Rules (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayedDrivers.map((drv) => {
            const isSelected = selectedDriver?.id === drv.id;
            return (
              <div
                key={drv.id}
                onClick={() => setSelectedDriver(drv)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'border-[#1D4ED8] bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    drv.gatewayKind === 'bnpl_installment'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {drv.gatewayKind === 'bnpl_installment' ? `اقساطی (${drv.installmentsCount} قسط)` : 'نقدی شاپرک'}
                  </span>
                  <span className={`text-[11px] font-extrabold ${drv.enabled ? 'text-emerald-600' : 'text-stone-400'}`}>
                    {drv.enabled ? '● فعال' : '○ غیرفعال'}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white">{drv.titleFa}</div>
                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100 dark:border-stone-800">
                  <span dir="ltr" className="font-mono">{drv.providerCode}</span>
                  <span>
                    {drv.gatewayKind === 'cash_psp'
                      ? `تخفیف نقدی: ${drv.cashDiscountPercent}٪`
                      : `تفاوت نرخ اقساط: +${drv.bnplFeePercent}٪`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Driver Configuration & Dynamic Pricing Rule Editor */}
        <div className="lg:col-span-5 space-y-5">
          {selectedDriver && (
            <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
                <div>
                  <div className="text-[11px] font-extrabold text-[#1D4ED8]">{selectedDriver.providerCode} DRIVER</div>
                  <h4 className="text-sm font-black text-stone-900 dark:text-white">{selectedDriver.titleFa}</h4>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-extrabold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDriver.enabled}
                    onChange={(e) => setSelectedDriver({ ...selectedDriver, enabled: e.target.checked })}
                  />
                  <span>درگاه فعال</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {selectedDriver.gatewayKind === 'cash_psp' ? (
                  <div className="col-span-2 space-y-1">
                    <label className="font-extrabold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-emerald-600" />
                      <span>درصد تخفیف تشویقی پرداخت نقدی:</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={30}
                      value={selectedDriver.cashDiscountPercent}
                      onChange={(e) => setSelectedDriver({ ...selectedDriver, cashDiscountPercent: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="font-extrabold text-stone-700 dark:text-stone-300">کارمزد/تفاوت نرخ اقساط (٪):</label>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={25}
                        value={selectedDriver.bnplFeePercent}
                        onChange={(e) => setSelectedDriver({ ...selectedDriver, bnplFeePercent: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-extrabold text-stone-700 dark:text-stone-300">تعداد اقساط مجاز:</label>
                      <select
                        value={selectedDriver.installmentsCount}
                        onChange={(e) => setSelectedDriver({ ...selectedDriver, installmentsCount: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                      >
                        <option value={4}>۴ قسط مساوی</option>
                        <option value={6}>۶ قسط ماهانه</option>
                        <option value={12}>۱۲ قسط بلندمدت</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Driver Credentials Fields */}
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <div className="text-xs font-extrabold text-stone-700 dark:text-stone-300">کلیدهای اتصال اختصاصی درایور:</div>
                {Object.entries(selectedDriver.credentialsJson).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span dir="ltr" className="w-28 font-mono text-stone-500 shrink-0">{k}:</span>
                    <input
                      type="text"
                      dir="ltr"
                      value={v}
                      onChange={(e) =>
                        setSelectedDriver({
                          ...selectedDriver,
                          credentialsJson: { ...selectedDriver.credentialsJson, [k]: e.target.value },
                        })
                      }
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-xs"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleSaveDriver(selectedDriver)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold hover:bg-blue-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>ذخیره درایور و قوانین نرخ در دیتابیس</span>
              </button>
            </div>
          )}

          {/* Live Dynamic Rate Calculator */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950 space-y-3">
            <div className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[#1D4ED8]" />
              <span>تست زنده موتور قوانین نرخ نقدی و اقساطی</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
              />
              <select
                value={simDriverId}
                onChange={(e) => setSimDriverId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.titleFa}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleRunPricingSimulator()}
              className="w-full py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold cursor-pointer"
            >
              محاسبه مبلغ نهایی و اقساط
            </button>
            {simResult && (
              <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs space-y-1">
                <div className="font-extrabold text-[#1D4ED8]">{simResult.titleFa}</div>
                {simResult.cashDiscountAmount > 0 && (
                  <div className="text-emerald-600 font-bold">کسر تخفیف نقدی: -{formatToman(simResult.cashDiscountAmount)}</div>
                )}
                {simResult.bnplFeeAmount > 0 && (
                  <div className="text-amber-600 font-bold">کارمزد اقساط: +{formatToman(simResult.bnplFeeAmount)}</div>
                )}
                <div className="font-black text-stone-900 dark:text-white">
                  مبلغ نهایی: {formatToman(simResult.finalPayable)} ({simResult.installmentsCount} قسط {formatToman(simResult.perInstallmentAmount)})
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
