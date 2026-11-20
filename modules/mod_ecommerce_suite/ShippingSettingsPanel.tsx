import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, PackageCheck, RefreshCw, Truck } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface ShippingCarrierItem {
  code: string;
  titleFa: string;
  enabled: boolean;
  baseFeeToman: number;
  estimatedDays: string;
}

interface ShippingConfigState {
  originCity: string;
  freeShippingThresholdToman: number;
  autoTrackingSmsEnabled: boolean;
  carriers: ShippingCarrierItem[];
}

interface ShipmentRecord {
  id: string;
  orderId: string;
  carrierCode: string;
  trackingCode: string;
  recipientName: string;
  recipientPhone: string;
  destinationCity: string;
  status: string;
  smsNotified: boolean;
}

const DEFAULT_CONFIG: ShippingConfigState = {
  originCity: 'تهران',
  freeShippingThresholdToman: 2500000,
  autoTrackingSmsEnabled: true,
  carriers: [
    {
      code: 'post_pishtaz',
      titleFa: 'پست پیشتاز جمهوری اسلامی ایران',
      enabled: true,
      baseFeeToman: 65000,
      estimatedDays: '۲ تا ۴ روز کاری',
    },
    {
      code: 'tipax',
      titleFa: 'تیپاکس (پس‌کرایه / پیش‌کرایه سراسری)',
      enabled: true,
      baseFeeToman: 120000,
      estimatedDays: '۱ تا ۲ روز کاری',
    },
    {
      code: 'city_courier',
      titleFa: 'پیک موتوری فوری تهران و کرج',
      enabled: true,
      baseFeeToman: 95000,
      estimatedDays: 'تحویل همان روز (۲ تا ۴ ساعت)',
    },
    {
      code: 'barbari',
      titleFa: 'باربری و ارسال بسته‌های سازمانی حجیم',
      enabled: false,
      baseFeeToman: 180000,
      estimatedDays: '۲ تا ۳ روز کاری',
    },
  ],
};

export const ShippingSettingsPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [config, setConfig] = useState<ShippingConfigState>(DEFAULT_CONFIG);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Quick Tracking Dispatch State
  const [carrierCode, setCarrierCode] = useState('post_pishtaz');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [destinationCity, setDestinationCity] = useState('تهران');
  const [trackingCode, setTrackingCode] = useState('');

  // Torob / Emalls Live Feed Tester
  const [feedPreview, setFeedPreview] = useState<{ label: string; count: number } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, shpRes] = await Promise.all([
        apiJson<{ config?: ShippingConfigState }>('/api/v1/modules/ecommerce/shipping-config'),
        apiJson<{ shipments?: ShipmentRecord[] }>('/api/v1/modules/ecommerce/shipments'),
      ]);
      if (cfgRes.ok && cfgRes.data.config) {
        setConfig(cfgRes.data.config);
      }
      if (shpRes.ok && Array.isArray(shpRes.data.shipments)) {
        setShipments(shpRes.data.shipments);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{ error?: string }>(
        '/api/v1/modules/ecommerce/shipping-config',
        {
          method: 'PUT',
          body: JSON.stringify(config),
        }
      );
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در ذخیره تنظیمات حمل‌ونقل');
        return;
      }
      onNotice?.('success', 'تنظیمات روش‌های ارسال و تعرفه حمل‌ونقل با موفقیت ذخیره شد.');
    } finally {
      setSaving(false);
    }
  };

  const handleDispatchTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{ trackingCode?: string; error?: string }>(
      '/api/v1/modules/ecommerce/shipments',
      {
        method: 'POST',
        body: JSON.stringify({
          carrierCode,
          recipientName: recipientName.trim() || 'مشتری گرامی',
          recipientPhone: recipientPhone.trim() || '09123456789',
          destinationCity: destinationCity.trim() || 'تهران',
          trackingCode: trackingCode.trim() || undefined,
        }),
      }
    );
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در ثبت کد رهگیری مرسوله');
      return;
    }
    onNotice?.(
      'success',
      `مرسوله ثبت شد و پیامک کد رهگیری (${data.trackingCode || '-'}) به مشتری ارسال گردید.`
    );
    setRecipientName('');
    setRecipientPhone('');
    setTrackingCode('');
    void loadAll();
  };

  const handleTestFeed = async (target: 'torob' | 'emalls') => {
    const endpoint = target === 'torob' ? '/api/v1/feeds/torob' : '/api/v1/feeds/emalls';
    const { ok, data } = await apiJson<{ count?: number; totalItems?: number }>(endpoint);
    if (ok) {
      const count = Number(data.count ?? data.totalItems ?? 0);
      setFeedPreview({
        label: target === 'torob' ? 'فید زنده ترب (Torob v2)' : 'فید زنده ایمالز (Emalls)',
        count,
      });
      onNotice?.('success', `فید زنده با ${count.toLocaleString('fa-IR')} محصول فعال تست شد.`);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Section 1: Iranian Carriers & Rates Configuration */}
      <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
                تنظیمات حمل‌ونقل، روش‌های ارسال و ارسال رایگان
              </h3>
              <p className="text-xs text-stone-500">
                مدیریت تعرفه‌های پست پیشتاز، تیپاکس، پیک شهری و باربری برای محصولات فیزیکی فروشگاه
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAll()}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveConfig()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات حمل‌ونقل'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">
              شهر مبدا ارسال (انبار مرکزی)
            </label>
            <input
              type="text"
              value={config.originCity}
              onChange={(e) => setConfig({ ...config, originCity: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">
              حداقل مبلغ سبد برای ارسال رایگان (تومان)
            </label>
            <input
              type="number"
              dir="ltr"
              value={config.freeShippingThresholdToman}
              onChange={(e) =>
                setConfig({
                  ...config,
                  freeShippingThresholdToman: Math.max(0, Number(e.target.value || 0)),
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-right"
            />
          </div>
          <div className="flex items-end">
            <label className="w-full p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-500/20 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoTrackingSmsEnabled}
                onChange={(e) =>
                  setConfig({ ...config, autoTrackingSmsEnabled: e.target.checked })
                }
                className="accent-[#1D4ED8]"
              />
              <span className="font-extrabold text-[#1E3A8A] dark:text-sky-300">
                ارسال خودکار پیامک کد رهگیری پس از ثبت مرسوله
              </span>
            </label>
          </div>
        </div>

        {/* Carriers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {config.carriers.map((carrier, idx) => (
            <div
              key={carrier.code}
              className={`p-4 rounded-2xl border space-y-3 transition-colors ${
                carrier.enabled
                  ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-stone-900 dark:text-white">
                  {carrier.titleFa}
                </span>
                <label className="inline-flex items-center gap-1.5 font-extrabold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={carrier.enabled}
                    onChange={(e) => {
                      const next = [...config.carriers];
                      next[idx] = { ...carrier, enabled: e.target.checked };
                      setConfig({ ...config, carriers: next });
                    }}
                    className="accent-[#1D4ED8]"
                  />
                  <span>{carrier.enabled ? 'فعال' : 'غیرفعال'}</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">
                    هزینه پایه ارسال (تومان)
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={carrier.baseFeeToman}
                    onChange={(e) => {
                      const next = [...config.carriers];
                      next[idx] = {
                        ...carrier,
                        baseFeeToman: Math.max(0, Number(e.target.value || 0)),
                      };
                      setConfig({ ...config, carriers: next });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">
                    زمان تحویل تخمینی
                  </label>
                  <input
                    type="text"
                    value={carrier.estimatedDays}
                    onChange={(e) => {
                      const next = [...config.carriers];
                      next[idx] = { ...carrier, estimatedDays: e.target.value };
                      setConfig({ ...config, carriers: next });
                    }}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Shipment Tracking Code Dispatch & Active Shipments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form
          onSubmit={(e) => void handleDispatchTracking(e)}
          className="lg:col-span-5 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 shadow-xs"
        >
          <div className="flex items-center gap-2 font-extrabold text-sm text-stone-900 dark:text-white border-b border-stone-100 dark:border-stone-800 pb-2.5">
            <PackageCheck className="w-4 h-4 text-[#1D4ED8]" />
            <span>ثبت مرسوله و ارسال پیامک کد رهگیری</span>
          </div>
          <select
            value={carrierCode}
            onChange={(e) => setCarrierCode(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
          >
            {config.carriers.map((c) => (
              <option key={c.code} value={c.code}>
                {c.titleFa}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="نام گیرنده"
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
            <input
              type="tel"
              dir="ltr"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="0912..."
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-right"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              placeholder="شهر مقصد"
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
            <input
              type="text"
              dir="ltr"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="کد رهگیری (تولید خودکار در صورت خالی)"
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-right"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-extrabold cursor-pointer"
          >
            ثبت مرسوله و ارسال پیامک رهگیری
          </button>
        </form>

        <div className="lg:col-span-7 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-2.5">
            <span className="font-extrabold text-sm text-stone-900 dark:text-white">
              مرسوله‌های ثبت‌شده ({shipments.length.toLocaleString('fa-IR')})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleTestFeed('torob')}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>تست فید ترب</span>
              </button>
              <button
                type="button"
                onClick={() => void handleTestFeed('emalls')}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-[#1D4ED8] dark:text-sky-300 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>تست فید ایمالز</span>
              </button>
            </div>
          </div>

          {feedPreview && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
              {feedPreview.label}: {feedPreview.count.toLocaleString('fa-IR')} محصول آماده خزش زنده
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {shipments.length === 0 ? (
              <div className="py-8 text-center text-stone-400">
                هنوز مرسوله فیزیکی ثبت نشده است.
              </div>
            ) : (
              shipments.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-extrabold text-stone-900 dark:text-white">
                      {s.recipientName} — {s.destinationCity}
                    </div>
                    <div className="text-[11px] font-mono text-stone-500" dir="ltr">
                      {s.carrierCode} · {s.trackingCode}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                    {s.smsNotified ? 'پیامک رهگیری ارسال شد' : s.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
