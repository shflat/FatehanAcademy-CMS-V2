import React, { useState } from 'react';
import {
  Crown,
  Sliders,
  KeyRound,
  Activity,
  Palette,
  ShieldCheck,
  Lock,
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
  aiConfig: AiEngineConfig;
  sessions: CmsSessionRecord[];
  otpConfig: OtpSecurityConfig;
  themeConfig: ThemeConfig;
  isSuperAdmin: boolean;
  onUpdateAiConfig: (next: AiEngineConfig) => void;
  onRevokeSession: (sessionId: string) => void;
  onUpdateOtpConfig: (next: OtpSecurityConfig) => void;
  onUpdateTheme: (next: ThemeConfig) => void;
  onGoToSms: () => void;
  onRefreshFromServer?: () => void;
  onNotice: NoticeFn;
}

export const AiSessionsThemePanel: React.FC<AiSessionsThemePanelProps> = ({
  mode,
  aiConfig,
  sessions,
  otpConfig,
  themeConfig,
  isSuperAdmin,
  onUpdateAiConfig,
  onRevokeSession,
  onUpdateOtpConfig,
  onUpdateTheme,
  onGoToSms,
  onRefreshFromServer,
  onNotice,
}) => {
  const [newMasterCode, setNewMasterCode] = useState('');
  const [confirmMasterCode, setConfirmMasterCode] = useState('');
  const [isUpdatingMasterCode, setIsUpdatingMasterCode] = useState(false);
  const [uploadingBrandAsset, setUploadingBrandAsset] = useState<'logo' | 'favicon' | null>(null);

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
        <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5 mb-1">
            <Crown className="w-4 h-4" />
            <span>ویژه سوپر ادمین · اتصال هوش مصنوعی و مجوز سئو</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#1D4ED8]" />
            <span>
              تنظیمات موتور هوش مصنوعی (OpenAI / Claude / Gemini / Custom)
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            انتخاب سرویس هوش مصنوعی متصل به CMS و تعیین مجوز دسترسی ادمین‌ها به
            دکمه «سئو کردن با هوش مصنوعی»
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              {
                id: 'openai',
                title: 'OpenAI (ChatGPT)',
                sub: 'مدل‌های GPT-4o / o3-mini',
                defaultModel: 'gpt-4o',
              },
              {
                id: 'claude',
                title: 'Anthropic Claude',
                sub: 'مدل Claude 3.7 Sonnet',
                defaultModel: 'claude-3-7-sonnet',
              },
              {
                id: 'gemini',
                title: 'Google Gemini',
                sub: 'مدل Gemini 2.5 / 3 Flash',
                defaultModel: 'gemini-2.5-flash',
              },
              {
                id: 'custom_openai',
                title: 'Custom (OpenAI Base)',
                sub: 'سرویس سفارشی بر پایه OpenAI',
                defaultModel: 'custom-gpt-model',
              },
            ] as {
              id: AiProviderId;
              title: string;
              sub: string;
              defaultModel: string;
            }[]
          ).map((prov) => {
            const active = aiConfig.activeProvider === prov.id;
            return (
              <button
                key={prov.id}
                type="button"
                onClick={() =>
                  onUpdateAiConfig({
                    ...aiConfig,
                    activeProvider: prov.id,
                    modelName: prov.defaultModel,
                  })
                }
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
              شناسه مدل فعال (Model ID)
            </label>
            <input
              type="text"
              dir="ltr"
              value={aiConfig.modelName}
              onChange={(e) =>
                onUpdateAiConfig({ ...aiConfig, modelName: e.target.value })
              }
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          <div>
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

          {aiConfig.activeProvider === 'custom_openai' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                آدرس سرور سازگار با OpenAI (Custom Base URL)
              </label>
              <input
                type="text"
                dir="ltr"
                value={aiConfig.customBaseUrl}
                onChange={(e) =>
                  onUpdateAiConfig({
                    ...aiConfig,
                    customBaseUrl: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
          )}
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
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                مدت اعتبار سشن‌های ورود کاربران (ساعت)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={8760}
                  value={otpConfig.sessionTimeoutHours}
                  onChange={(e) =>
                    onUpdateOtpConfig({
                      ...otpConfig,
                      sessionTimeoutHours: Math.max(
                        1,
                        Number(e.target.value) || 24
                      ),
                    })
                  }
                  className="w-36 px-3.5 py-2 text-xs smooth-nums rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
                <span className="text-xs text-stone-500">
                  ساعت ماندگاری کوکی HttpOnly و توکن دیتابیس (auth_sessions)
                </span>
              </div>
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
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
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
              <div className="w-14 h-14 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-2 flex items-center justify-center shrink-0">
                <img
                  src={themeConfig.logoUrl || '/logo-skill98.svg'}
                  alt={themeConfig.brandNameFa}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
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
                value={themeConfig.logoUrl || '/logo-skill98.svg'}
                onChange={(e) =>
                  onUpdateTheme({ ...themeConfig, logoUrl: e.target.value })
                }
                placeholder="/logo-skill98.svg"
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
              <div className="w-14 h-14 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 flex items-center justify-center shrink-0">
                <img
                  src={themeConfig.faviconUrl || themeConfig.logoUrl || '/logo-skill98.svg'}
                  alt="Favicon"
                  className="w-8 h-8 object-contain"
                />
              </div>
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
                value={themeConfig.faviconUrl || '/logo-skill98.svg'}
                onChange={(e) =>
                  onUpdateTheme({ ...themeConfig, faviconUrl: e.target.value })
                }
                placeholder="/logo-skill98.svg"
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

      {/* Color Palette & Motion Libraries Card */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-stone-200 dark:border-stone-800 pb-4">
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
      </div>
    </div>
  );
};
