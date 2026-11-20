import React, { useMemo, useState } from 'react';
import {
  Check,
  Code2,
  CreditCard,
  Download,
  Layers,
  Settings2,
  Wallet,
} from 'lucide-react';
import type {
  PaymentDisplayConfig,
  PaymentGatewayId,
  PaymentGatewayOption,
} from '../../../core/types';
import { apiFetch, apiJson } from '../../../core/apiClient';
import { INITIAL_PAYMENT_GATEWAYS } from '../../../data/defaults';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface PaymentGatewaysPanelProps {
  gateways: PaymentGatewayOption[];
  displayConfig: PaymentDisplayConfig;
  onUpdateGateways: (next: PaymentGatewayOption[]) => void;
  onUpdateDisplayConfig: (next: PaymentDisplayConfig) => void;
  onNotice: NoticeFn;
}

export const PaymentGatewaysPanel: React.FC<PaymentGatewaysPanelProps> = ({
  gateways,
  displayConfig,
  onUpdateGateways,
  onUpdateDisplayConfig,
  onNotice,
}) => {
  // Merge any newly introduced gateways from defaults while preserving DB states
  const mergedGateways = useMemo(() => {
    const byId = new Map(gateways.map((g) => [g.id, g]));
    return INITIAL_PAYMENT_GATEWAYS.map((def) => {
      const existing = byId.get(def.id);
      if (existing) {
        return {
          ...def,
          ...existing,
          showOnStorefront:
            existing.showOnStorefront !== undefined
              ? Boolean(existing.showOnStorefront)
              : Boolean(existing.enabled),
          gatewayKind: existing.gatewayKind || def.gatewayKind || 'cash',
        };
      }
      return {
        ...def,
        showOnStorefront: Boolean(def.enabled),
      };
    });
  }, [gateways]);

  const [kindFilter, setKindFilter] = useState<'all' | 'cash' | 'bnpl' | 'wallet'>('all');
  const [selectedGatewayId, setSelectedGatewayId] = useState<PaymentGatewayId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingRouter, setIsTestingRouter] = useState(false);
  const [routerTestResult, setRouterTestResult] = useState<string | null>(null);
  const [phpPreviewCode, setPhpPreviewCode] = useState<string | null>(null);

  const visibleGateways = useMemo(() => {
    if (kindFilter === 'all') return mergedGateways;
    return mergedGateways.filter((g) => (g.gatewayKind || 'cash') === kindFilter);
  }, [mergedGateways, kindFilter]);

  const selectedGateway = useMemo(
    () => mergedGateways.find((g) => g.id === selectedGatewayId) || null,
    [mergedGateways, selectedGatewayId]
  );

  const activeCashCount = mergedGateways.filter(
    (g) => g.enabled && (g.gatewayKind || 'cash') === 'cash'
  ).length;
  const activeBnplCount = mergedGateways.filter(
    (g) => g.enabled && g.gatewayKind === 'bnpl'
  ).length;
  const shownOnSiteCount = mergedGateways.filter(
    (g) => g.enabled && g.showOnStorefront !== false
  ).length;

  const updateGatewayField = (
    id: PaymentGatewayId,
    patch: Partial<PaymentGatewayOption>
  ) => {
    const next = mergedGateways.map((g) => (g.id === id ? { ...g, ...patch } : g));
    onUpdateGateways(next);
  };

  const handleSavePaymentConfig = async () => {
    setIsSaving(true);
    try {
      const { ok, data } = await apiJson<{ error?: string }>(
        '/api/admin/payment/config',
        {
          method: 'POST',
          body: JSON.stringify({ gateways: mergedGateways, displayConfig }),
        }
      );
      if (!ok) throw new Error(data.error || 'خطا در ذخیره تنظیمات درگاه');
      onUpdateGateways(mergedGateways);
      onNotice(
        'success',
        `تنظیمات ${mergedGateways.filter((g) => g.enabled).length} درگاه فعال (نقدی و اقساطی) ذخیره شد.`
      );
    } catch {
      onNotice('error', 'امکان ذخیره تنظیمات درگاه‌ها در سرور وجود نداشت.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestRouter = async (url?: string) => {
    if (!url?.trim()) {
      onNotice('error', 'ابتدا آدرس فایل روتر هاست اصلی را وارد کنید.');
      return;
    }
    setIsTestingRouter(true);
    setRouterTestResult(null);
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        status?: number;
        response?: unknown;
      }>('/api/admin/payment/test-router', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      if (!ok) throw new Error(data.error || 'خطای اتصال به روتر');
      setRouterTestResult(JSON.stringify(data.response, null, 2));
      onNotice('success', `اتصال به روتر برقرار شد (HTTP ${data.status}).`);
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در تست روتر');
    } finally {
      setIsTestingRouter(false);
    }
  };

  const handleTogglePhpPreview = async () => {
    if (phpPreviewCode) {
      setPhpPreviewCode(null);
      return;
    }
    try {
      const { ok, data } = await apiJson<{ code?: string }>(
        '/api/admin/payment/router-php'
      );
      if (!ok) throw new Error();
      setPhpPreviewCode(data.code || '');
    } catch {
      onNotice('error', 'خطا در دریافت کد PHP روتر');
    }
  };

  const handleDownloadPhpRouter = async () => {
    try {
      const res = await apiFetch('/api/admin/payment/router-php?download=1');
      if (!res.ok) throw new Error('خطا در دانلود فایل روتر');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'skill98-ipg-router.php';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onNotice('success', 'فایل روتر skill98-ipg-router.php دانلود شد.');
    } catch {
      onNotice('error', 'امکان دانلود فایل روتر وجود نداشت.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Compact Header & Multi-Gateway Summary */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
            <CreditCard className="w-4 h-4" />
            <span>هاب جامع ۱۶ درگاه پرداخت نقدی و اقساطی ایران</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
            فعال‌سازی همزمان چند درگاه نقدی و اقساطی · کلیک روی هر درگاه برای تنظیمات
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 smooth-nums">
            درگاه‌های نقدی فعال: <strong className="text-emerald-600">{activeCashCount.toLocaleString('fa-IR')}</strong> · درگاه‌های اقساطی فعال: <strong className="text-purple-600">{activeBnplCount.toLocaleString('fa-IR')}</strong>
          </p>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSavePaymentConfig()}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shrink-0"
        >
          <Check className="w-4 h-4" />
          <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات درگاه‌ها'}</span>
        </button>
      </div>

      {/* Single Storefront Display Mode Strip: Selected Gateways Only */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="font-extrabold text-stone-700 dark:text-stone-300">
            نحوه نمایش در تسویه‌حساب:
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-[#1D4ED8] text-white font-extrabold inline-flex items-center gap-1.5 shadow-xs">
            <Check className="w-3.5 h-3.5" />
            <span>نمایش درگاه/های انتخاب‌شده در سایت</span>
          </span>
          <span className="text-[11px] font-bold text-stone-500 smooth-nums">
            (درگاه‌های دارای تیک «فعال» + «نمایش در سایت»:{' '}
            <strong className="text-[#1D4ED8]">{shownOnSiteCount.toLocaleString('fa-IR')}</strong>{' '}
            درگاه)
          </span>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300 cursor-pointer">
          <input
            type="checkbox"
            checked={displayConfig.enablePaymentSimulator}
            onChange={(e) =>
              onUpdateDisplayConfig({
                ...displayConfig,
                displayMode: 'selected_only',
                enablePaymentSimulator: e.target.checked,
              })
            }
            className="w-4 h-4 accent-[#1D4ED8]"
          />
          <span>حالت تست/شبیه‌ساز پرداخت</span>
        </label>
      </div>

      {/* Filter Chips & Compact Selectable 16-Gateway Grid (Collapsed by Default) */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `همه درگاه‌ها (${mergedGateways.length.toLocaleString('fa-IR')})` },
                { id: 'cash', label: 'نقدی و شاپرک (۱۰)' },
                { id: 'bnpl', label: 'اقساطی BNPL (۴)' },
                { id: 'wallet', label: 'کیف پول و رمزارز (۲)' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setKindFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                  kindFilter === f.id
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-stone-500 font-bold">
            برای تنظیم اطلاعات اتصال، روی نام درگاه کلیک کنید
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {visibleGateways.map((gw) => {
            const isSelected = selectedGatewayId === gw.id;
            const kindBadge =
              gw.gatewayKind === 'bnpl'
                ? 'اقساطی'
                : gw.gatewayKind === 'wallet'
                ? 'کیف پول'
                : 'نقدی';
            return (
              <div
                key={gw.id}
                onClick={() => setSelectedGatewayId(isSelected ? null : gw.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'border-[#1D4ED8] bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-[#1D4ED8]/25'
                    : gw.enabled
                    ? 'border-emerald-500/45 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-500'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                      {gw.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          gw.gatewayKind === 'bnpl'
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                            : gw.gatewayKind === 'wallet'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-blue-500/10 text-[#1D4ED8] dark:text-sky-300'
                        }`}
                      >
                        {kindBadge}
                      </span>
                      {displayConfig.defaultGatewayId === gw.id && (
                        <span className="px-1.5 py-0.5 rounded bg-stone-900 text-white dark:bg-white dark:text-stone-950 text-[9px] font-bold">
                          پیش‌فرض
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Independent Multi-Gateway Enable/Disable Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateGatewayField(gw.id, { enabled: !gw.enabled });
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold shrink-0 cursor-pointer transition-colors ${
                      gw.enabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {gw.enabled ? 'فعال' : 'خاموش'}
                  </button>
                </div>

                {/* Independent "نمایش در سایت" checkbox separate from فعال/خاموش */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200/60 dark:border-stone-800"
                >
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-stone-700 dark:text-stone-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={gw.showOnStorefront !== false}
                      onChange={(e) =>
                        updateGatewayField(gw.id, {
                          showOnStorefront: e.target.checked,
                        })
                      }
                      className="w-3.5 h-3.5 rounded accent-[#1D4ED8]"
                    />
                    <span>نمایش در سایت</span>
                  </label>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#1D4ED8]">
                    <Settings2 className="w-3 h-3" />
                    {isSelected ? 'در حال ویرایش' : 'تنظیمات'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SINGLE Dedicated Configuration Card Below List for Selected Gateway */}
      {selectedGateway ? (
        <div className="border-2 border-[#1D4ED8]/35 rounded-2xl bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-5 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center">
                {selectedGateway.gatewayKind === 'bnpl' ? (
                  <Layers className="w-5 h-5" />
                ) : selectedGateway.gatewayKind === 'wallet' ? (
                  <Wallet className="w-5 h-5" />
                ) : (
                  <CreditCard className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
                  تنظیمات درگاه: {selectedGateway.title}
                </h3>
                <p className="text-xs text-stone-500">{selectedGateway.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateDisplayConfig({
                    ...displayConfig,
                    defaultGatewayId: selectedGateway.id,
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                  displayConfig.defaultGatewayId === selectedGateway.id
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                    : 'border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >
                {displayConfig.defaultGatewayId === selectedGateway.id
                  ? '✓ درگاه پیش‌فرض سایت'
                  : 'تنظیم به عنوان پیش‌فرض'}
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-500/25 text-xs font-extrabold text-[#1E3A8A] dark:text-sky-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedGateway.showOnStorefront !== false}
                  onChange={(e) =>
                    updateGatewayField(selectedGateway.id, {
                      showOnStorefront: e.target.checked,
                    })
                  }
                  className="rounded accent-[#1D4ED8]"
                />
                <span>نمایش در سایت</span>
              </label>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(selectedGateway.sandboxMode)}
                  onChange={(e) =>
                    updateGatewayField(selectedGateway.id, { sandboxMode: e.target.checked })
                  }
                />
                <span>حالت سندباکس</span>
              </label>

              <button
                type="button"
                onClick={() =>
                  updateGatewayField(selectedGateway.id, { enabled: !selectedGateway.enabled })
                }
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                  selectedGateway.enabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                {selectedGateway.enabled ? 'درگاه فعال است' : 'فعال‌سازی درگاه'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                {selectedGateway.id === 'irankish'
                  ? 'کد پذیرنده (Acceptor ID)'
                  : 'کد مرچنت / پذیرنده (Merchant ID)'}
              </label>
              <input
                type="text"
                dir="ltr"
                value={selectedGateway.merchantId || ''}
                onChange={(e) =>
                  updateGatewayField(selectedGateway.id, { merchantId: e.target.value })
                }
                placeholder="Merchant ID"
                className="w-full px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                شماره ترمینال (Terminal ID)
              </label>
              <input
                type="text"
                dir="ltr"
                value={selectedGateway.terminalId || ''}
                onChange={(e) =>
                  updateGatewayField(selectedGateway.id, { terminalId: e.target.value })
                }
                placeholder="Terminal ID"
                className="w-full px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                کلید API / توکن وب‌سرویس (API Key)
              </label>
              <input
                type="password"
                dir="ltr"
                value={selectedGateway.apiKey || ''}
                onChange={(e) =>
                  updateGatewayField(selectedGateway.id, { apiKey: e.target.value })
                }
                placeholder="••••••••••••••••"
                className="w-full px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>

            {selectedGateway.gatewayKind === 'bnpl' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-purple-700 dark:text-purple-300 mb-1">
                    تعداد اقساط مجاز (ماه)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={selectedGateway.installmentMonths || 4}
                    onChange={(e) =>
                      updateGatewayField(selectedGateway.id, {
                        installmentMonths: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 font-bold smooth-nums rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-700 dark:text-purple-300 mb-1">
                    درصد کارمزد اقساطی (٪)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={selectedGateway.bnplFeePercent || 0}
                    onChange={(e) =>
                      updateGatewayField(selectedGateway.id, {
                        bnplFeePercent: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 font-bold smooth-nums rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20"
                  />
                </div>
              </>
            )}

            {selectedGateway.id === 'irankish' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    عبارت امنیتی (PassPhrase - اختیاری)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={selectedGateway.passPhrase || ''}
                    onChange={(e) =>
                      updateGatewayField(selectedGateway.id, { passPhrase: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                    کلید عمومی رمزنگاری (RSA Public Key PEM)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={selectedGateway.publicKey || ''}
                    onChange={(e) =>
                      updateGatewayField(selectedGateway.id, { publicKey: e.target.value })
                    }
                    placeholder="-----BEGIN PUBLIC KEY-----"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                  آدرس بازگشت از درگاه (Callback URL)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateGatewayField(selectedGateway.id, {
                      callbackUrl: `${window.location.origin}/?payment_verify=1`,
                    })
                  }
                  className="text-[11px] font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  پرکردن خودکار با دامنه فعلی
                </button>
              </div>
              <input
                type="text"
                dir="ltr"
                value={selectedGateway.callbackUrl || ''}
                onChange={(e) =>
                  updateGatewayField(selectedGateway.id, { callbackUrl: e.target.value })
                }
                placeholder={`${typeof window !== 'undefined' ? window.location.origin : ''}/?payment_verify=1`}
                className="w-full px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
          </div>

          {selectedGateway.id === 'irankish' && (
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <div className="text-xs font-extrabold text-purple-900 dark:text-purple-200">
                    روتر واسط روی هاست اصلی (عبور از محدودیت IP شاپرک)
                  </div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-300">
                    ارسال درخواست توکن از طریق فایل PHP روی هاست دارای IP وایت‌لیست‌شده
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(selectedGateway.useHostRouter)}
                  onChange={(e) =>
                    updateGatewayField(selectedGateway.id, {
                      useHostRouter: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-purple-600 cursor-pointer shrink-0"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={selectedGateway.hostRouterUrl || ''}
                  onChange={(e) =>
                    updateGatewayField(selectedGateway.id, { hostRouterUrl: e.target.value })
                  }
                  placeholder="https://example.ir/skill98-ipg-router.php"
                  className="flex-1 min-w-[220px] px-3 py-2 text-xs font-mono rounded-xl border border-purple-300 dark:border-purple-800 bg-white dark:bg-stone-950"
                />
                <button
                  type="button"
                  disabled={isTestingRouter}
                  onClick={() => void handleTestRouter(selectedGateway.hostRouterUrl)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-extrabold cursor-pointer"
                >
                  {isTestingRouter ? 'در حال تست...' : 'تست روتر'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleTogglePhpPreview()}
                  className="px-3 py-2 rounded-xl border border-purple-400 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{phpPreviewCode ? 'بستن PHP' : 'کد PHP'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadPhpRouter()}
                  className="px-3 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود</span>
                </button>
              </div>
              {phpPreviewCode && (
                <pre dir="ltr" className="p-3 rounded-xl bg-stone-950 text-emerald-300 text-[11px] font-mono overflow-x-auto max-h-48">
                  {phpPreviewCode}
                </pre>
              )}
              {routerTestResult && (
                <pre dir="ltr" className="p-3 rounded-xl bg-stone-900 text-sky-300 text-[11px] font-mono overflow-x-auto">
                  {routerTestResult}
                </pre>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500 font-bold">
          برای مشاهده و ویرایش اطلاعات اتصال (مرچنت، ترمینال، API Key یا اقساط BNPL)، روی یکی از ۱۶ درگاه بالا کلیک کنید.
        </div>
      )}
    </div>
  );
};
