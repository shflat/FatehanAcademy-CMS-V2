import React, { useEffect, useState } from 'react';
import {
  Crown,
  Sliders,
  KeyRound,
  Activity,
  Palette,
  ShieldCheck,
  Lock,
  Save,
  Loader2,
  PlugZap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type {
  AccentPresetId,
  AiEngineConfig,
  AiProviderId,
  CmsSessionRecord,
  OtpSecurityConfig,
  ThemeConfig,
} from '../../../core/types';
import { apiJson } from '../../../core/apiClient';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface AiSessionsThemePanelProps {
  mode: 'super_ai' | 'super_sessions' | 'super_theme';
  hideBrandIdentityCard?: boolean;
  aiConfig: AiEngineConfig;
  sessions: CmsSessionRecord[];
  otpConfig: OtpSecurityConfig;
  themeConfig: ThemeConfig;
  isSuperAdmin: boolean;
  onUpdateAiConfig: (next: AiEngineConfig) => void;
  onRevokeSession: (sessionId: string) => void;
  onUpdateOtpConfig: (next: OtpSecurityConfig) => void;
  onUpdateTheme: (next: ThemeConfig) => void;
  onSaveThemeNow?: (next?: ThemeConfig, successText?: string) => Promise<void>;
  onGoToSms: () => void;
  onRefreshFromServer?: () => void;
  onNotice: NoticeFn;
}

export const AiSessionsThemePanel: React.FC<AiSessionsThemePanelProps> = ({
  mode,
  hideBrandIdentityCard = false,
  aiConfig,
  sessions,
  otpConfig,
  themeConfig,
  isSuperAdmin,
  onUpdateAiConfig,
  onRevokeSession,
  onUpdateOtpConfig,
  onUpdateTheme,
  onSaveThemeNow,
  onGoToSms,
  onRefreshFromServer,
  onNotice,
}) => {
  const [newMasterCode, setNewMasterCode] = useState('');
  const [confirmMasterCode, setConfirmMasterCode] = useState('');
  const [isUpdatingMasterCode, setIsUpdatingMasterCode] = useState(false);
  const [uploadingBrandAsset, setUploadingBrandAsset] = useState<'logo' | 'favicon' | null>(null);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isTestingAiEngine, setIsTestingAiEngine] = useState(false);
  const [isSavingAiSlot, setIsSavingAiSlot] = useState(false);
  const [slot1Loaded, setSlot1Loaded] = useState(false);
  const [slot1Provider, setSlot1Provider] = useState<'gemini' | 'openai_compatible' | 'ollama'>(
    aiConfig.activeProvider === 'gemini' ? 'gemini' : 'openai_compatible'
  );
  const [slot1BaseUrl, setSlot1BaseUrl] = useState(aiConfig.customBaseUrl || '');
  const [slot1ModelName, setSlot1ModelName] = useState(aiConfig.modelName || 'gemini-4-hydrogen');
  const [slot1ApiKey, setSlot1ApiKey] = useState('');
  const [slot1HasSavedKey, setSlot1HasSavedKey] = useState(false);
  const [aiEngineTestResult, setAiEngineTestResult] = useState<{
    ok: boolean;
    message: string;
    hint?: string;
    latencyMs?: number;
    modelName?: string;
  } | null>(null);

  // Sync legacy "تنظیمات موتور هوش مصنوعی" panel directly with AI Hub Slot 1 (text_seo)
  useEffect(() => {
    if (mode !== 'super_ai') return;
    let active = true;
    void apiJson<{
      ok?: boolean;
      slots?: {
        slotKey: string;
        providerKind: 'gemini' | 'openai_compatible' | 'ollama';
        baseUrl: string;
        modelName: string;
        apiKeyMasked: string;
        hasApiKey: boolean;
      }[];
    }>('/api/v1/modules/ai-hub/config').then(({ ok, data }) => {
      if (!active || !ok || !Array.isArray(data.slots)) return;
      const textSlot = data.slots.find((s) => s.slotKey === 'text_seo');
      if (!textSlot) return;
      setSlot1Provider(textSlot.providerKind || 'gemini');
      setSlot1BaseUrl(textSlot.baseUrl || '');
      setSlot1ModelName(textSlot.modelName || 'gemini-4-hydrogen');
      setSlot1ApiKey(textSlot.apiKeyMasked || '');
      setSlot1HasSavedKey(Boolean(textSlot.hasApiKey));
      setSlot1Loaded(true);
    });
    return () => {
      active = false;
    };
  }, [mode]);

  const handleSaveUnifiedSlot1 = async () => {
    setIsSavingAiSlot(true);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        apiKeyMasked?: string;
        error?: string;
      }>('/api/v1/modules/ai-hub/slots/save', {
        method: 'POST',
        body: JSON.stringify({
          slotKey: 'text_seo',
          providerKind: slot1Provider,
          baseUrl: slot1BaseUrl.trim(),
          modelName: slot1ModelName.trim() || 'gemini-4-hydrogen',
          apiKey: slot1ApiKey.trim(),
          enabled: true,
        }),
      });
      if (!ok) {
        onNotice('error', data.error || 'خطا در ذخیره تنظیمات اسلات ۱ (text_seo)');
        return;
      }
      const mappedLegacyProvider: AiProviderId =
        slot1Provider === 'gemini' ? 'gemini' : 'custom_openai';
      onUpdateAiConfig({
        ...aiConfig,
        activeProvider: mappedLegacyProvider,
        modelName: slot1ModelName.trim() || aiConfig.modelName,
        customBaseUrl: slot1BaseUrl.trim(),
      });
      if (typeof data.apiKeyMasked === 'string') {
        setSlot1ApiKey(data.apiKeyMasked);
        setSlot1HasSavedKey(Boolean(data.apiKeyMasked));
      }
      onNotice(
        'success',
        'تنظیمات یکپارچه موتور هوش مصنوعی (اسلات ۱ متن و سئو) با رمزنگاری AES-256-GCM ذخیره شد.'
      );
    } finally {
      setIsSavingAiSlot(false);
    }
  };

  const handleTestAiEngineConnection = async () => {
    setIsTestingAiEngine(true);
    setAiEngineTestResult(null);
    try {
      const trimmedKey = slot1ApiKey.trim();
      const looksMasked = trimmedKey.includes('•') || trimmedKey.includes('***');
      const { ok, data } = await apiJson<{
        ok?: boolean;
        connected?: boolean;
        message?: string;
        hint?: string;
        latencyMs?: number;
        modelName?: string;
        error?: string;
      }>('/api/v1/modules/ai-hub/slots/test', {
        method: 'POST',
        body: JSON.stringify({
          slotKey: 'text_seo',
          providerKind: slot1Provider,
          modelName: slot1ModelName.trim(),
          baseUrl: slot1BaseUrl.trim(),
          ...(!looksMasked && trimmedKey ? { apiKey: trimmedKey } : {}),
        }),
      });
      const isOk = Boolean(ok && (data.ok || data.connected));
      const msg =
        data.message ||
        data.error ||
        (isOk ? 'اتصال به اسلات ۱ موتور هوش مصنوعی برقرار است.' : 'اتصال به سرویس هوش مصنوعی برقرار نشد.');
      setAiEngineTestResult({
        ok: isOk,
        message: msg,
        hint: data.hint,
        latencyMs: data.latencyMs,
        modelName: data.modelName,
      });
      onNotice(isOk ? 'success' : 'error', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور برای تست اتصال AI';
      setAiEngineTestResult({ ok: false, message: msg });
      onNotice('error', msg);
    } finally {
      setIsTestingAiEngine(false);
    }
  };

  const handleSaveThemeExplicit = async (msg: string) => {
    setIsSavingTheme(true);
    try {
      if (onSaveThemeNow) {
        await onSaveThemeNow(themeConfig, msg);
      } else {
        onUpdateTheme({ ...themeConfig });
        onNotice('success', msg);
      }
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleUploadBrandImage = async (
    target: 'logo' | 'favicon',
    file: File | undefined
  ) => {
    if (!file) return;
    setUploadingBrandAsset(target);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر'));
        reader.readAsDataURL(file);
      });

      const { ok, data } = await apiJson<{
        ok?: boolean;
        items?: { url: string; variants?: { original?: string; medium800?: string } }[];
        error?: string;
      }>('/api/v1/media/upload', {
        method: 'POST',
        body: JSON.stringify({
          files: [
            {
              name: file.name,
              title: target === 'logo' ? 'لوگوی اصلی سایت' : 'فاوآیکون سایت',
              dataUrl,
              category: 'banner',
            },
          ],
        }),
      });

      const uploadedUrl =
        ok && data.items?.[0]
          ? data.items[0].variants?.original || data.items[0].url
          : dataUrl;

      if (target === 'logo') {
        onUpdateTheme({ ...themeConfig, logoUrl: uploadedUrl });
        onNotice('success', 'لوگوی جدید سایت با موفقیت آپلود و در هدر سایت فعال شد.');
      } else {
        onUpdateTheme({ ...themeConfig, faviconUrl: uploadedUrl });
        if (typeof document !== 'undefined') {
          let linkEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
          if (!linkEl) {
            linkEl = document.createElement('link');
            linkEl.rel = 'icon';
            document.head.appendChild(linkEl);
          }
          linkEl.href = uploadedUrl;
        }
        onNotice('success', 'فاوآیکون (آیکون تب مرورگر) با موفقیت بروزرسانی شد.');
      }
      onRefreshFromServer?.();
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در بارگذاری تصویر هویت بصری'
      );
    } finally {
      setUploadingBrandAsset(null);
    }
  };

  const handleUpdateMasterCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMasterCode.trim();
    if (trimmed.length < 4) {
      onNotice('error', 'کد مستر امنیتی باید حداقل ۴ کاراکتر باشد.');
      return;
    }
    if (trimmed !== confirmMasterCode.trim()) {
      onNotice('error', 'کد مستر جدید و تکرار آن یکسان نیستند.');
      return;
    }
    setIsUpdatingMasterCode(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/auth/master-code',
        {
          method: 'POST',
          body: JSON.stringify({ newCode: trimmed }),
        }
      );
      if (!ok) {
        throw new Error(data.error || 'خطا در بروزرسانی کد مستر');
      }
      setNewMasterCode('');
      setConfirmMasterCode('');
      onNotice(
        'success',
        'کد مستر سوپر ادمین با الگوریتم HMAC-SHA256 هش و در دیتابیس ذخیره شد.'
      );
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در تغییر کد مستر'
      );
    } finally {
      setIsUpdatingMasterCode(false);
    }
  };

  if (mode === 'super_ai') {
    return (
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-stone-200 dark:border-stone-800 pb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5 mb-1">
              <Crown className="w-4 h-4" />
              <span>ویژه سوپر ادمین · همگام‌سازی زنده با اسلات ۱ هاب AI (text_seo)</span>
            </div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#1D4ED8]" />
              <span>تنظیمات یکپارچه موتور هوش مصنوعی (متن و سئو — اسلات ۱)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              تمامی تغییرات این بخش مستقیماً با «اسلات ۱ (تولید متن و سئو)» در هاب هوش مصنوعی همگام است و کلید API با AES-256-GCM ذخیره می‌شود.
            </p>
          </div>
          {slot1Loaded && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold">
              متصل به اسلات ۱ (text_seo)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                id: 'gemini',
                title: 'Google Gemini',
                sub: 'مدل Gemini 4 Hydrogen (پیشنهادی)',
                defaultModel: 'gemini-4-hydrogen',
                defaultBase: '',
              },
              {
                id: 'openai_compatible',
                title: 'OpenAI-Compatible (GapGPT / AvalAI / OpenAI)',
                sub: 'سازگار با گپ‌جی‌پی‌تی، اول‌ای‌آی، OpenRouter و OpenAI',
                defaultModel: 'gpt-4o-mini',
                defaultBase: 'https://api.gapgpt.app/v1',
              },
              {
                id: 'ollama',
                title: 'Ollama (لوکال / سرور اختصاصی)',
                sub: 'اجرای آفلاین مدل‌های متن‌باز روی سرور خودتان',
                defaultModel: 'llama3.1',
                defaultBase: 'http://127.0.0.1:11434',
              },
            ] as {
              id: 'gemini' | 'openai_compatible' | 'ollama';
              title: string;
              sub: string;
              defaultModel: string;
              defaultBase: string;
            }[]
          ).map((prov) => {
            const active = slot1Provider === prov.id;
            return (
              <button
                key={prov.id}
                type="button"
                onClick={() => {
                  setSlot1Provider(prov.id);
                  if (!slot1ModelName.trim() || slot1Provider !== prov.id) {
                    setSlot1ModelName(prov.defaultModel);
                  }
                  if (prov.id === 'gemini') {
                    setSlot1BaseUrl('');
                  } else if (!slot1BaseUrl.trim() || slot1Provider !== prov.id) {
                    setSlot1BaseUrl(prov.defaultBase);
                  }
                }}
                className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
                  active
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-600'
                    : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/40'
                }`}
              >
                <div className="text-sm font-extrabold text-stone-900 dark:text-white">
                  {prov.title}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">{prov.sub}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              شناسه مدل فعال اسلات ۱ (Model ID)
            </label>
            <input
              type="text"
              dir="ltr"
              value={slot1ModelName}
              onChange={(e) => setSlot1ModelName(e.target.value)}
              placeholder="gemini-4-hydrogen یا gpt-4o-mini"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center justify-between">
              <span>کلید API اسلات ۱ (ذخیره امن AES-256-GCM)</span>
              {slot1HasSavedKey && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                  کلید ذخیره شده
                </span>
              )}
            </label>
            <input
              type="password"
              dir="ltr"
              autoComplete="off"
              value={slot1ApiKey}
              onChange={(e) => setSlot1ApiKey(e.target.value)}
              placeholder="کلید جدید وارد کنید یا برای حفظ کلید فعلی دست نزنید"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          {slot1Provider !== 'gemini' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                آدرس پایه وب‌سرویس (Base URL — مثلاً https://api.gapgpt.app/v1)
              </label>
              <input
                type="text"
                dir="ltr"
                value={slot1BaseUrl}
                onChange={(e) => setSlot1BaseUrl(e.target.value)}
                placeholder="https://api.gapgpt.app/v1"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              لحن پیش‌فرض تولید محتوا و سئو
            </label>
            <input
              type="text"
              value={aiConfig.defaultTone}
              onChange={(e) =>
                onUpdateAiConfig({ ...aiConfig, defaultTone: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="text-xs font-extrabold text-stone-900 dark:text-white">
            تعیین سطح دسترسی ادمین‌ها به دکمه «سئو کردن با هوش مصنوعی»:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-stone-800 dark:text-stone-200">
              <input
                type="checkbox"
                checked={aiConfig.allowAdminAiSeo}
                onChange={(e) =>
                  onUpdateAiConfig({
                    ...aiConfig,
                    allowAdminAiSeo: e.target.checked,
                  })
                }
              />
              <span>
                مجوز استفاده از هوش مصنوعی سئو برای نقش «ادمین فروشگاه»
              </span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-stone-800 dark:text-stone-200">
              <input
                type="checkbox"
                checked={aiConfig.allowEditorAiSeo}
                onChange={(e) =>
                  onUpdateAiConfig({
                    ...aiConfig,
                    allowEditorAiSeo: e.target.checked,
                  })
                }
              />
              <span>
                مجوز استفاده از هوش مصنوعی سئو برای نقش «کارشناس سئو و نویسنده»
              </span>
            </label>
          </div>
        </div>

        {/* Connection Test & Explicit Save Bar */}
        <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={isTestingAiEngine}
              onClick={() => void handleTestAiEngineConnection()}
              className="px-4 py-2.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isTestingAiEngine ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlugZap className="w-4 h-4" />
              )}
              <span>
                {isTestingAiEngine
                  ? 'در حال بررسی اتصال واقعی اسلات ۱...'
                  : 'تست اتصال اسلات ۱ (Check Connection)'}
              </span>
            </button>

            <button
              type="button"
              disabled={isSavingAiSlot}
              onClick={() => void handleSaveUnifiedSlot1()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSavingAiSlot ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSavingAiSlot ? 'در حال ذخیره...' : 'ذخیره یکپارچه اسلات ۱ موتور AI'}</span>
            </button>
          </div>

          {aiEngineTestResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                aiEngineTestResult.ok
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                  : 'border-rose-500/35 bg-rose-500/10 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 font-extrabold">
                <span className="inline-flex items-center gap-1.5">
                  {aiEngineTestResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{aiEngineTestResult.message}</span>
                </span>
                {typeof aiEngineTestResult.latencyMs === 'number' && (
                  <span className="font-mono text-[11px] opacity-80" dir="ltr">
                    {aiEngineTestResult.latencyMs}ms · {aiEngineTestResult.modelName}
                  </span>
                )}
              </div>
              {aiEngineTestResult.hint && (
                <p className="text-[11px] opacity-90">{aiEngineTestResult.hint}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'super_sessions') {
    return (
      <div className="space-y-6">
        <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="border-b border-stone-200 dark:border-stone-800 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5 mb-1">
                <KeyRound className="w-4 h-4" />
                <span>ویژه سوپر ادمین · مانیتورینگ زنده نشست‌ها و امنیت سشن</span>
              </div>
              <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
                مدیریت نشست‌های فعال کاربران و سیاست اعتبار سشن (DB Sessions)
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                تمامی تنظیمات وب‌سرویس پیامک، کد پترن OTP و شرط‌های ارسال خودکار
                در منوی «پیامک، پترن و شرط‌ها» متمرکز شده‌اند.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={onGoToSms}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer shrink-0"
              >
                تنظیمات وب‌سرویس پیامک، پترن و شرط‌ها ←
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-3">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                مدت اعتبار سشن‌های ورود کاربران و کوکی HttpOnly (ساعت)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[24, 48, 72].map((hours) => {
                  const active = Number(otpConfig.sessionTimeoutHours || 24) === hours;
                  return (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => {
                        onUpdateOtpConfig({
                          ...otpConfig,
                          sessionTimeoutHours: hours,
                        });
                        onNotice('success', `سیاست انقضای سشن روی ${hours.toLocaleString('fa-IR')} ساعت تنظیم و ذخیره شد.`);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-emerald-500'
                      }`}
                    >
                      {hours.toLocaleString('fa-IR')} ساعت {hours === 24 ? '(پیش‌فرض امن)' : ''}
                    </button>
                  );
                })}
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={otpConfig.sessionTimeoutHours || 24}
                  onChange={(e) =>
                    onUpdateOtpConfig({
                      ...otpConfig,
                      sessionTimeoutHours: Math.max(
                        1,
                        Math.min(720, Number(e.target.value) || 24)
                      ),
                    })
                  }
                  className="w-24 px-3 py-1.5 text-xs smooth-nums rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateOtpConfig({
                      ...otpConfig,
                      sessionTimeoutHours: Math.max(
                        1,
                        Math.min(720, Number(otpConfig.sessionTimeoutHours) || 24)
                      ),
                    });
                    onNotice('success', 'مدت اعتبار سشن با موفقیت در دیتابیس ذخیره شد.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ذخیره</span>
                </button>
              </div>
              <p className="text-[11px] text-stone-500">
                مقدار Max-Age کوکی HttpOnly و ستون <code className="font-mono" dir="ltr">expires_at</code> دقیقاً مطابق همین عدد (یا <code className="font-mono" dir="ltr">SESSION_TTL_HOURS</code>) اعمال و پس از انقضا نشست با ۴۰۱ حذف می‌شود.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 flex flex-col justify-center space-y-1">
              <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>وضعیت ذخیره‌سازی سشن‌ها در دیتابیس سرور</span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                هر ورود موفق با موبایل یا کد مستر، یک رکورد واقعی در جدول{' '}
                <code className="font-mono" dir="ltr">
                  auth_sessions
                </code>{' '}
                ثبت می‌کند و توکن با HMAC امضا می‌شود.
              </p>
            </div>
          </div>

          {/* Super Admin Master Code Rotator */}
          {isSuperAdmin && (
            <form
              onSubmit={handleUpdateMasterCode}
              className="p-5 rounded-2xl border border-amber-500/35 bg-amber-50/40 dark:bg-amber-950/15 space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-800 dark:text-amber-300">
                <Lock className="w-4 h-4" />
                <span>
                  تغییر کد مستر امنیتی ورود سوپر ادمین (ذخیره به صورت هش
                  HMAC-SHA256 در دیتابیس)
                </span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-400">
                برای حفظ امنیت، هیچ کد مستری به صورت متن خام در کد منبع ذخیره
                نمی‌شود. مقدار جدید پس از هش رمزنگاری‌شده جایگزین کد فعلی
                می‌گردد.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="password"
                  dir="ltr"
                  value={newMasterCode}
                  onChange={(e) => setNewMasterCode(e.target.value)}
                  placeholder="کد مستر جدید (حداقل ۴ کاراکتر)"
                  className="px-3.5 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                />
                <input
                  type="password"
                  dir="ltr"
                  value={confirmMasterCode}
                  onChange={(e) => setConfirmMasterCode(e.target.value)}
                  placeholder="تکرار کد مستر جدید"
                  className="px-3.5 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                />
                <button
                  type="submit"
                  disabled={isUpdatingMasterCode}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingMasterCode
                    ? 'در حال هش و ذخیره...'
                    : 'بروزرسانی و هش کد مستر'}
                </button>
              </div>
            </form>
          )}

          {/* Active Sessions Table */}
          <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>نشست‌های ثبت‌شده در دیتابیس (Live Session Monitor)</span>
              </h3>
              <div className="flex items-center gap-2">
                {onRefreshFromServer && (
                  <button
                    type="button"
                    onClick={onRefreshFromServer}
                    className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-[11px] font-bold hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                  >
                    بروزرسانی زنده
                  </button>
                )}
                <span className="text-xs text-stone-500 smooth-nums">
                  {sessions
                    .filter((s) => s.status === 'active')
                    .length.toLocaleString('fa-IR')}{' '}
                  نشست فعال
                </span>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-stone-300 dark:border-stone-800 text-center text-xs text-stone-500">
                هنوز نشستی در دیتابیس ثبت نشده است.
              </div>
            ) : (
              <div className="divide-y divide-stone-200 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                          {sess.userDisplay}
                        </span>
                        {sess.phone && (
                          <span
                            className="text-xs font-mono text-stone-500"
                            dir="ltr"
                          >
                            ({sess.phone})
                          </span>
                        )}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-[#1D4ED8]">
                          {sess.roleLabel}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            sess.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : 'bg-rose-500/10 text-rose-700'
                          }`}
                        >
                          {sess.status === 'active' ? 'فعال' : 'باطل‌شده'}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 smooth-nums">
                        {sess.deviceLabel} · IP: {sess.ipMasked} · آخرین فعالیت:{' '}
                        {sess.lastActiveLabel}
                      </div>
                    </div>

                    {sess.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => {
                          onRevokeSession(sess.id);
                          onNotice(
                            'success',
                            'نشست مورد نظر در دیتابیس باطل گردید.'
                          );
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-50 cursor-pointer shrink-0"
                      >
                        ابطال آنی سشن
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // mode === 'super_theme'
  return (
    <div className="space-y-6">
      {/* Brand Identity, Site Logo & Favicon Physical Uploader */}
      {!hideBrandIdentityCard && (
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <div className="text-xs font-extrabold text-[#1D4ED8] mb-1">
              هویت بصری و برندینگ سایت (آپلود مستقیم لوگو و فاوآیکون)
            </div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#1D4ED8]" />
              <span>لوگوی سایت، فاوآیکون مرورگر و نام برند</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              تغییرات لوگو، فاوآیکون و عنوان برند به صورت آنی در هدر، فوتر، فاکتور و تب مرورگر اعمال می‌شوند.
            </p>
          </div>
          <button
            type="button"
            disabled={isSavingTheme}
            onClick={() =>
              void handleSaveThemeExplicit(
                'تنظیمات هویت بصری، لوگو و نام برند با موفقیت در دیتابیس ذخیره شد.'
              )
            }
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
          >
            {isSavingTheme ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSavingTheme ? 'در حال ذخیره...' : 'ذخیره هویت بصری و لوگو'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Site Logo Card */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                  لوگوی اصلی هدر و سایت (Site Logo)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  فرمت‌های پیشنهادی: PNG شفاف، WebP یا SVG
                </div>
              </div>
              <img
                src={themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                alt={themeConfig.brandNameFa}
                className="w-14 h-14 object-contain shrink-0 bg-transparent border-0 p-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold cursor-pointer">
                <span>
                  {uploadingBrandAsset === 'logo'
                    ? 'در حال آپلود لوگو...'
                    : 'آپلود تصویر لوگوی جدید'}
                </span>
                <input
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={(e) =>
                    void handleUploadBrandImage('logo', e.target.files?.[0])
                  }
                />
              </label>
              <input
                type="text"
                dir="ltr"
                value={themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                onChange={(e) =>
                  onUpdateTheme({ ...themeConfig, logoUrl: e.target.value })
                }
                placeholder="/assets/aistudio/logo_8c26749f.webp"
                className="flex-1 min-w-[160px] px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>
          </div>

          {/* Site Favicon Card */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                  آیکون تب مرورگر (Favicon)
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5">
                  ابعاد پیشنهادی: 64×64 یا 128×128 (PNG / ICO / SVG)
                </div>
              </div>
              <img
                src={themeConfig.faviconUrl || themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                alt="Favicon"
                className="w-10 h-10 object-contain shrink-0 bg-transparent border-0 p-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold cursor-pointer">
                <span>
                  {uploadingBrandAsset === 'favicon'
                    ? 'در حال آپلود فاوآیکون...'
                    : 'آپلود فاوآیکون جدید'}
                </span>
                <input
                  type="file"
                  accept="image/*,.svg,.ico"
                  className="hidden"
                  onChange={(e) =>
                    void handleUploadBrandImage('favicon', e.target.files?.[0])
                  }
                />
              </label>
              <input
                type="text"
                dir="ltr"
                value={themeConfig.faviconUrl || '/assets/aistudio/logo_8c26749f.webp'}
                onChange={(e) =>
                  onUpdateTheme({ ...themeConfig, faviconUrl: e.target.value })
                }
                placeholder="/assets/aistudio/logo_8c26749f.webp"
                className="flex-1 min-w-[160px] px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              نام فارسی برند (نمایش در هدر و عنوان صفحات):
            </label>
            <input
              type="text"
              value={themeConfig.brandNameFa}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, brandNameFa: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              نام انگلیسی برند:
            </label>
            <input
              type="text"
              dir="ltr"
              value={themeConfig.brandNameEn}
              onChange={(e) =>
                onUpdateTheme({ ...themeConfig, brandNameEn: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>
        </div>
      </div>
      )}

      {/* Color Palette & Motion Libraries Card */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#1D4ED8]" />
              <span>
                پوسته‌ها و کتابخانه‌های انیمیشن (GSAP / Lenis / Barba / Muuri)
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              سفارشی‌سازی رنگ‌بندی و کنترل ۴ کتابخانه حرکتی و تعاملی سایت
            </p>
          </div>
          <button
            type="button"
            disabled={isSavingTheme}
            onClick={() =>
              void handleSaveThemeExplicit(
                'تنظیمات پالت رنگی و کتابخانه‌های انیمیشن با موفقیت ذخیره و اعمال شد.'
              )
            }
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0 shadow-xs"
          >
            {isSavingTheme ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {isSavingTheme ? 'در حال ذخیره...' : 'ذخیره و اعمال پوسته و انیمیشن‌ها'}
            </span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-extrabold text-stone-800 dark:text-stone-200">
            انتخاب پالت و پوسته رنگی سایت:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(
              [
                { id: 'cobalt', label: 'کبالت استودیویی', dot: 'bg-blue-600' },
                { id: 'amber', label: 'طلایی نئون', dot: 'bg-amber-400' },
                { id: 'emerald', label: 'زمردی مدرن', dot: 'bg-emerald-600' },
                { id: 'rose', label: 'یاقوتی گرم', dot: 'bg-rose-600' },
                { id: 'violet', label: 'بنفش دیجیتال', dot: 'bg-purple-600' },
              ] as { id: AccentPresetId; label: string; dot: string }[]
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onUpdateTheme({ ...themeConfig, accentPreset: preset.id })
                }
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${
                  themeConfig.accentPreset === preset.id
                    ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 text-stone-900 dark:text-white'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full ${preset.dot}`} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="text-xs font-extrabold text-stone-900 dark:text-white">
            وضعیت ۴ کتابخانه حرکتی و تعاملی فرانت‌اند:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-2.5 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={themeConfig.enableGsapAnimations !== false}
                onChange={(e) =>
                  onUpdateTheme({
                    ...themeConfig,
                    enableGsapAnimations: e.target.checked,
                  })
                }
              />
              <span>۱. کتابخانه GSAP (انیمیشن‌های ورود و Stagger کارت‌ها)</span>
            </label>

            <label className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-2.5 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={themeConfig.enableLenisSmoothScroll !== false}
                onChange={(e) =>
                  onUpdateTheme({
                    ...themeConfig,
                    enableLenisSmoothScroll: e.target.checked,
                  })
                }
              />
              <span>۲. کتابخانه Lenis (اسکرول نرم و سینمایی کل وب‌سایت)</span>
            </label>

            <label className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-2.5 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={themeConfig.enableBarbaTransitions !== false}
                onChange={(e) =>
                  onUpdateTheme({
                    ...themeConfig,
                    enableBarbaTransitions: e.target.checked,
                  })
                }
              />
              <span>
                ۳. کتابخانه Barba.js (ترنزیشن شیشه‌ای و بلور هنگام جابه‌جایی
                صفحات)
              </span>
            </label>

            <label className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-2.5 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={themeConfig.enableMuuriDrag !== false}
                onChange={(e) =>
                  onUpdateTheme({
                    ...themeConfig,
                    enableMuuriDrag: e.target.checked,
                  })
                }
              />
              <span>
                ۴. کتابخانه Muuri (گرید تعاملی و جابه‌جایی المان‌ها با ماوس)
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
          <p className="text-[11px] text-stone-500">
            پس از انتخاب رنگ‌بندی و کتابخانه‌های انیمیشن، برای ثبت قطعی در دیتابیس سرور روی دکمه ذخیره کلیک کنید.
          </p>
          <button
            type="button"
            disabled={isSavingTheme}
            onClick={() =>
              void handleSaveThemeExplicit(
                'تمامی تنظیمات پوسته، هویت بصری و کتابخانه‌های انیمیشن ذخیره و اعمال شد.'
              )
            }
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {isSavingTheme ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {isSavingTheme ? 'در حال ذخیره...' : 'ذخیره و اعمال تنظیمات'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
