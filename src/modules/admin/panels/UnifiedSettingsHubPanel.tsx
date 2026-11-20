import React, { useEffect, useState } from 'react';
import {
  Bot,
  Calendar,
  CheckCircle2,
  CreditCard,
  Database,
  Globe,
  Image as ImageIcon,
  MessageSquare,
  Palette,
  Settings,
  Shield,
  ShieldCheck,
  Truck,
  UploadCloud,
} from 'lucide-react';
import type {
  AiEngineConfig,
  CmsRoleDefinition,
  CmsSessionRecord,
  FooterTrustBadgesConfig,
  MediaAssetItem,
  OrderRecord,
  OtpSecurityConfig,
  PaymentDisplayConfig,
  PaymentGatewayOption,
  SkillArticle,
  SkillProduct,
  ThemeConfig,
} from '../../../core/types';
import { apiJson } from '../../../core/apiClient';
import { DEFAULT_THEME_CONFIG } from '../../../data/defaults';
import { EnterpriseCoreHubPanel } from './EnterpriseCoreHubPanel';
import { PaymentGatewaysPanel } from './PaymentGatewaysPanel';
import { SmsTriggersPanel } from './SmsTriggersPanel';
import { AiSessionsThemePanel } from './AiSessionsThemePanel';
import { UsersDirectoryPanel } from './UsersDirectoryPanel';
import { RbacPermissionsPanel } from './RbacPermissionsPanel';
import { DbBackupPanel } from './DbBackupPanel';
import { AiHubAgentPanel } from '../../../../modules/mod_ai_hub_agent/AiHubAgentPanel';
import { MediaPickerModal } from '../components/MediaPickerModal';
import { SeoVisibilityControlCard } from '../components/SeoVisibilityControlCard';
import { SolarBookingAutoBackupPanel } from '../../../../modules/mod_booking/SolarBookingAutoBackupPanel';
import { ShippingSettingsPanel } from '../../../../modules/mod_ecommerce_suite/ShippingSettingsPanel';
import {
  REGISTERED_THEMES_LIST,
  type RegisteredThemeId,
} from '../../../../themes/registry';

export type UnifiedSettingsTabId =
  | 'general'
  | 'shipping'
  | 'calendar'
  | 'gateways'
  | 'sms'
  | 'ai'
  | 'security'
  | 'backup';

interface UnifiedSettingsHubPanelProps {
  initialTab?: UnifiedSettingsTabId;
  isSuperAdmin: boolean;
  canManageUsers: boolean;
  products: SkillProduct[];
  articles: SkillArticle[];
  orders: OrderRecord[];
  mediaItems: MediaAssetItem[];
  themeConfig: ThemeConfig;
  aiConfig: AiEngineConfig;
  otpConfig: OtpSecurityConfig;
  roles: CmsRoleDefinition[];
  sessions: CmsSessionRecord[];
  paymentGateways: PaymentGatewayOption[];
  paymentDisplayConfig: PaymentDisplayConfig;
  accentButtonClass: string;
  onUpdateThemeConfig: (next: ThemeConfig) => void;
  onUpdateAiConfig: (next: AiEngineConfig) => void;
  onUpdateOtpConfig: (next: OtpSecurityConfig) => void;
  onUpdateRoles: (next: CmsRoleDefinition[]) => void;
  onRevokeSession: (sessionId: string) => void;
  onUpdateGateways: (next: PaymentGatewayOption[]) => void;
  onUpdatePaymentDisplayConfig: (next: PaymentDisplayConfig) => void;
  onNavigateSection: (sec: string) => void;
  onRefreshFromServer?: () => void;
  onNotice: (type: 'success' | 'error', text: string) => void;
}

export const UnifiedSettingsHubPanel: React.FC<UnifiedSettingsHubPanelProps> = ({
  initialTab = 'general',
  isSuperAdmin,
  canManageUsers,
  products,
  articles,
  orders,
  mediaItems,
  themeConfig,
  aiConfig,
  otpConfig,
  roles,
  sessions,
  paymentGateways,
  paymentDisplayConfig,
  accentButtonClass,
  onUpdateThemeConfig,
  onUpdateAiConfig,
  onUpdateOtpConfig,
  onUpdateRoles,
  onRevokeSession,
  onUpdateGateways,
  onUpdatePaymentDisplayConfig,
  onNavigateSection,
  onRefreshFromServer,
  onNotice,
}) => {
  const [activeTab, setActiveTab] = useState<UnifiedSettingsTabId>(initialTab);
  const [siteDescription, setSiteDescription] = useState(
    'پلتفرم ماژولار مدیریت محتوا، فروش اسکیل‌های هوش مصنوعی و فروشگاه اینترنتی بومی ایران'
  );
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'favicon' | null>(null);
  const [badgePickerSlot, setBadgePickerSlot] = useState<'enamad' | 'license2' | null>(null);
  const [localUploadedMedia, setLocalUploadedMedia] = useState<MediaAssetItem[]>([]);
  const combinedMediaItems = [
    ...localUploadedMedia,
    ...mediaItems.filter((m) => !localUploadedMedia.some((l) => l.id === m.id)),
  ];

  const trustBadges: FooterTrustBadgesConfig = {
    ...(DEFAULT_THEME_CONFIG.footerTrustBadges as FooterTrustBadgesConfig),
    ...(themeConfig.footerTrustBadges || {}),
  };

  const updateTrustBadges = (patch: Partial<FooterTrustBadgesConfig>) => {
    onUpdateThemeConfig({
      ...themeConfig,
      footerTrustBadges: {
        ...trustBadges,
        ...patch,
      },
    });
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleUploadBrandAsset = async (
    kind: 'logo' | 'favicon',
    files: FileList | null
  ) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingAsset(kind);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
        reader.readAsDataURL(file);
      });
      const { ok, data } = await apiJson<{
        ok?: boolean;
        items?: Array<{ url: string }>;
        error?: string;
      }>('/api/v1/media/upload', {
        method: 'POST',
        body: JSON.stringify({
          files: [
            {
              name: file.name,
              title: kind === 'logo' ? 'لوگوی سایت' : 'فاوآیکون سایت',
              dataUrl,
              category: 'branding',
            },
          ],
        }),
      });
      if (!ok || !data.items?.[0]?.url) {
        throw new Error(data.error || 'خطا در آپلود فایل');
      }
      const nextUrl = data.items[0].url;
      onUpdateThemeConfig({
        ...themeConfig,
        ...(kind === 'logo' ? { logoUrl: nextUrl } : { faviconUrl: nextUrl }),
      });
      onNotice(
        'success',
        kind === 'logo'
          ? 'لوگوی جدید سایت با موفقیت آپلود و اعمال شد.'
          : 'فاوآیکون جدید سایت آپلود و اعمال شد.'
      );
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در آپلود');
    } finally {
      setUploadingAsset(null);
    }
  };

  const TABS: {
    id: UnifiedSettingsTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'general', label: 'تنظیمات عمومی، لوگو و پوسته', icon: Settings },
    { id: 'shipping', label: 'حمل‌ونقل و ارسال', icon: Truck },
    { id: 'calendar', label: 'تقویم شمسی و جغرافیا', icon: Calendar },
    { id: 'gateways', label: 'درگاه‌های پرداخت (۱۶)', icon: CreditCard },
    { id: 'sms', label: 'درگاه‌های پیامکی (۱۲) و OTP', icon: MessageSquare },
    { id: 'ai', label: 'هوش مصنوعی و سئو', icon: Bot },
    { id: 'security', label: 'کاربران، نقش‌ها و نشست‌ها', icon: Shield },
    { id: 'backup', label: 'دیتابیس SQL و بکاپ', icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Unified Header + Non-Scrolling Wrapped Tabs (flex-wrap) */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
              مرکز یکپارچه تنظیمات عمومی و هسته سیستم
            </h2>
            <p className="text-xs text-stone-500">
              تمامی تنظیمات پایه سایت (هویت بصری، لوگو، فاوآیکون، پرداخت، پیامک، هوش مصنوعی، امنیت و بکاپ) در تب‌های چندخطی بدون اسکرول
            </p>
          </div>
        </div>

        {/* Non-Scrolling Wrapped Tab Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: General Site Identity (Name, Description, Logo, Favicon & Theme) */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white border-b border-stone-200 dark:border-stone-800 pb-3">
              تنظیمات عمومی سایت (نام، توضیحات، لوگو و فاوآیکون)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  نام فارسی سایت / برند
                </label>
                <input
                  type="text"
                  value={themeConfig.brandNameFa}
                  onChange={(e) =>
                    onUpdateThemeConfig({ ...themeConfig, brandNameFa: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  نام انگلیسی / شناسه برند
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={themeConfig.brandNameEn}
                  onChange={(e) =>
                    onUpdateThemeConfig({ ...themeConfig, brandNameEn: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  توضیحات کوتاه سایت (Tagline / Meta Description)
                </label>
                <input
                  type="text"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              {/* Direct Logo Uploader */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                    <img
                      src={themeConfig.logoUrl || '/logo-skill98.svg'}
                      alt="لوگوی سایت"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                      لوگوی اصلی هدر و فوتر
                    </div>
                    <div className="text-[10px] font-mono text-stone-500 truncate" dir="ltr">
                      {themeConfig.logoUrl || '/logo-skill98.svg'}
                    </div>
                  </div>
                </div>
                <label className="px-3 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{uploadingAsset === 'logo' ? 'آپلود...' : 'آپلود لوگو'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleUploadBrandAsset('logo', e.target.files)}
                  />
                </label>
              </div>

              {/* Direct Favicon Uploader */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 flex items-center justify-center overflow-hidden p-2 shrink-0">
                    <img
                      src={themeConfig.faviconUrl || '/logo-skill98-emblem.svg'}
                      alt="فاوآیکون سایت"
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                      آیکون تب مرورگر (Favicon)
                    </div>
                    <div className="text-[10px] font-mono text-stone-500 truncate" dir="ltr">
                      {themeConfig.faviconUrl || '/logo-skill98-emblem.svg'}
                    </div>
                  </div>
                </div>
                <label className="px-3 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{uploadingAsset === 'favicon' ? 'آپلود...' : 'آپلود فاوآیکون'}</span>
                  <input
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={(e) => void handleUploadBrandAsset('favicon', e.target.files)}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Active Theme Registry Switcher (1-Click Storefront Theme Switch) */}
          <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#1D4ED8]" />
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                    انتخاب پوسته فعال ویترین سایت (Theme Registry · سوییچ ۱-کلیکی)
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    بدون تغییر در دیتابیس یا پنل مدیریت، ظاهر کل ویترین سایت را با یک کلیک بین پوسته‌های نصب‌شده جابه‌جا کنید.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-[#1D4ED8] dark:text-sky-400 text-[11px] font-extrabold">
                پوسته فعال:{' '}
                {(themeConfig.activeThemeId || 'default') === 'fatehan'
                  ? 'آکادمی فاتحان'
                  : 'پیش‌فرض اسکیل ۹۸'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {REGISTERED_THEMES_LIST.map((themeItem) => {
                const isActive =
                  (themeConfig.activeThemeId || 'default') === themeItem.id;
                return (
                  <div
                    key={themeItem.id}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 ${
                      isActive
                        ? 'border-[#1D4ED8] bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 hover:border-stone-300 dark:hover:border-stone-700'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-lg border border-black/10 shrink-0 shadow-xs"
                            style={{
                              background: `linear-gradient(135deg, ${themeItem.previewAccentHex} 50%, ${themeItem.previewBgHex} 50%)`,
                            }}
                          />
                          <span className="px-2 py-0.5 rounded-lg bg-stone-200/70 dark:bg-stone-800 text-[10px] font-extrabold text-stone-700 dark:text-stone-300">
                            {themeItem.badgeText}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400">
                            {themeItem.version}
                          </span>
                        </div>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>فعال</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-stone-900 dark:text-white">
                          {themeItem.nameFa}
                        </h4>
                        <div className="text-[10px] font-mono text-stone-400 mt-0.5" dir="ltr">
                          /themes/{themeItem.id} · {themeItem.nameEn}
                        </div>
                      </div>

                      <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                        {themeItem.descriptionFa}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-200/70 dark:border-stone-800">
                      <span className="text-[10px] text-stone-500">
                        ماژول پیشنهادی:{' '}
                        <strong className="font-mono">{themeItem.recommendedModules[0]}</strong>
                      </span>
                      <button
                        type="button"
                        disabled={isActive}
                        onClick={() => {
                          onUpdateThemeConfig({
                            ...themeConfig,
                            activeThemeId: themeItem.id as RegisteredThemeId,
                          });
                          onNotice(
                            'success',
                            `پوسته فعال سایت به «${themeItem.nameFa}» تغییر یافت و ذخیره شد.`
                          );
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 cursor-default'
                            : 'bg-stone-900 dark:bg-white text-white dark:text-stone-950 hover:bg-[#1D4ED8] dark:hover:bg-stone-200'
                        }`}
                      >
                        {isActive ? 'پوسته فعال فعلی' : 'فعال‌سازی این پوسته'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Trust & License Badges Card (eNamad + Second License: Image or Raw Embed Code) */}
          <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1D4ED8]" />
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                    مجوزها و نمادهای اعتماد فوتر (اینماد و مجوز دوم)
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    در فوتر سایت به جای ستون‌های تکراری منو، ۲ جایگاه استاندارد برای نماد اعتماد و مجوز دوم نمایش داده می‌شود. برای جلوگیری از قطعی لود تصویر اینماد، می‌توانید حالت «تصویر محلی» را فعال کنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
              {/* Slot 1: eNamad */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-stone-900 dark:text-white">
                    جایگاه ۱: نماد اعتماد الکترونیکی (اینماد)
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trustBadges.enamadEnabled}
                      onChange={(e) =>
                        updateTrustBadges({ enamadEnabled: e.target.checked })
                      }
                      className="rounded accent-[#1D4ED8]"
                    />
                    <span>نمایش در فوتر</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      عنوان زیر نماد
                    </label>
                    <input
                      type="text"
                      value={trustBadges.enamadLabel}
                      onChange={(e) =>
                        updateTrustBadges({ enamadLabel: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      کد اصلی دریافتی از سامانه اینماد (تکه کد HTML شامل لینک تاییدیه و تصویر):
                    </label>
                    <textarea
                      rows={3}
                      dir="ltr"
                      value={trustBadges.enamadHtmlCode}
                      onChange={(e) =>
                        updateTrustBadges({ enamadHtmlCode: e.target.value })
                      }
                      placeholder='<a referrerpolicy="origin" target="_blank" href="https://trustseal.enamad.ir/?id=12345&Code=XYZ"><img referrerpolicy="origin" src="https://trustseal.enamad.ir/logo.aspx?id=12345&Code=XYZ" style="cursor:pointer" code="XYZ" /></a>'
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trustBadges.enamadMode === 'image'}
                    onChange={(e) =>
                      updateTrustBadges({
                        enamadMode: e.target.checked ? 'image' : 'code',
                      })
                    }
                    className="rounded accent-[#1D4ED8] mt-0.5 shrink-0"
                  />
                  <span className="text-[11px] font-extrabold text-[#1E3A8A] dark:text-sky-300 leading-relaxed">
                    جایگزینی سورس تصویر داخل کد اینماد با تصویر انتخاب‌شده از گالری رسانه (رفع کندی/قطعی سرور اینماد — لینک و کد اصلی حفظ می‌شود)
                  </span>
                </label>

                {trustBadges.enamadMode === 'image' && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={trustBadges.enamadImageUrl || '/badges/enamad-seal.svg'}
                        alt={trustBadges.enamadLabel}
                        className="w-14 h-14 rounded-xl object-contain bg-stone-50 dark:bg-stone-950 p-1.5 border border-stone-200 dark:border-stone-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold text-stone-800 dark:text-stone-200">
                          تصویر محلی جایگزین برای اینماد
                        </div>
                        <div className="text-[10px] font-mono text-stone-400 truncate" dir="ltr">
                          {trustBadges.enamadImageUrl || '/badges/enamad-seal.svg'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBadgePickerSlot('enamad')}
                      className="px-3 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>انتخاب از گالری</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Slot 2: Second License (Samandehi / Union) */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-stone-900 dark:text-white">
                    جایگاه ۲: مجوز دوم (ساماندهی / اتحادیه / نظام صنفی)
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trustBadges.secondBadgeEnabled}
                      onChange={(e) =>
                        updateTrustBadges({ secondBadgeEnabled: e.target.checked })
                      }
                      className="rounded accent-[#1D4ED8]"
                    />
                    <span>نمایش در فوتر</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      عنوان زیر مجوز
                    </label>
                    <input
                      type="text"
                      value={trustBadges.secondBadgeLabel}
                      onChange={(e) =>
                        updateTrustBadges({ secondBadgeLabel: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      کد اصلی HTML مجوز دوم (ساماندهی / اتحادیه):
                    </label>
                    <textarea
                      rows={3}
                      dir="ltr"
                      value={trustBadges.secondBadgeHtmlCode}
                      onChange={(e) =>
                        updateTrustBadges({ secondBadgeHtmlCode: e.target.value })
                      }
                      placeholder='<a referrerpolicy="origin" target="_blank" href="https://logo.samandehi.ir/..."><img referrerpolicy="origin" src="https://logo.samandehi.ir/logo.aspx?id=..." /></a>'
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trustBadges.secondBadgeMode === 'image'}
                    onChange={(e) =>
                      updateTrustBadges({
                        secondBadgeMode: e.target.checked ? 'image' : 'code',
                      })
                    }
                    className="rounded accent-[#1D4ED8] mt-0.5 shrink-0"
                  />
                  <span className="text-[11px] font-extrabold text-[#1E3A8A] dark:text-sky-300 leading-relaxed">
                    جایگزینی سورس تصویر داخل کد مجوز دوم با تصویر انتخاب‌شده از گالری رسانه
                  </span>
                </label>

                {trustBadges.secondBadgeMode === 'image' && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={trustBadges.secondBadgeImageUrl || '/badges/samandehi-seal.svg'}
                        alt={trustBadges.secondBadgeLabel}
                        className="w-14 h-14 rounded-xl object-contain bg-stone-50 dark:bg-stone-950 p-1.5 border border-stone-200 dark:border-stone-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold text-stone-800 dark:text-stone-200">
                          تصویر محلی جایگزین برای مجوز دوم
                        </div>
                        <div className="text-[10px] font-mono text-stone-400 truncate" dir="ltr">
                          {trustBadges.secondBadgeImageUrl || '/badges/samandehi-seal.svg'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBadgePickerSlot('license2')}
                      className="px-3 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>انتخاب از گالری</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <AiSessionsThemePanel
            mode="super_theme"
            aiConfig={aiConfig}
            otpConfig={otpConfig}
            sessions={sessions}
            themeConfig={themeConfig}
            isSuperAdmin={isSuperAdmin}
            onUpdateAiConfig={onUpdateAiConfig}
            onUpdateOtpConfig={onUpdateOtpConfig}
            onRevokeSession={onRevokeSession}
            onUpdateTheme={onUpdateThemeConfig}
            onGoToSms={() => setActiveTab('sms')}
            onRefreshFromServer={onRefreshFromServer}
            onNotice={onNotice}
          />
        </div>
      )}

      {activeTab === 'shipping' && <ShippingSettingsPanel onNotice={onNotice} />}

      {activeTab === 'calendar' && (
        <EnterpriseCoreHubPanel
          mode="general_calendar"
          products={products}
          articles={articles}
          orders={orders}
          mediaItems={mediaItems}
          themeConfig={themeConfig}
          accentButtonClass={accentButtonClass}
          onNavigateSection={onNavigateSection}
          onNotice={onNotice}
        />
      )}

      {activeTab === 'gateways' && (
        <PaymentGatewaysPanel
          gateways={paymentGateways}
          displayConfig={paymentDisplayConfig}
          onUpdateGateways={onUpdateGateways}
          onUpdateDisplayConfig={onUpdatePaymentDisplayConfig}
          onNotice={onNotice}
        />
      )}

      {activeTab === 'sms' && <SmsTriggersPanel onNotice={onNotice} />}

      {activeTab === 'ai' && (
        <div className="space-y-6">
          <AiHubAgentPanel isSuperAdmin={isSuperAdmin} onNotice={onNotice} />
          <SeoVisibilityControlCard onNotice={onNotice} />
          <AiSessionsThemePanel
            mode="super_ai"
            aiConfig={aiConfig}
            otpConfig={otpConfig}
            sessions={sessions}
            themeConfig={themeConfig}
            isSuperAdmin={isSuperAdmin}
            onUpdateAiConfig={onUpdateAiConfig}
            onUpdateOtpConfig={onUpdateOtpConfig}
            onRevokeSession={onRevokeSession}
            onUpdateTheme={onUpdateThemeConfig}
            onGoToSms={() => setActiveTab('sms')}
            onRefreshFromServer={onRefreshFromServer}
            onNotice={onNotice}
          />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <UsersDirectoryPanel
            roles={roles}
            onNotice={onNotice}
            onUsersChanged={onRefreshFromServer}
          />
          <RbacPermissionsPanel
            roles={roles}
            canManageUsers={canManageUsers}
            onUpdateRoles={onUpdateRoles}
            onGoToUsers={() => setActiveTab('security')}
            onNotice={onNotice}
          />
          <AiSessionsThemePanel
            mode="super_sessions"
            aiConfig={aiConfig}
            otpConfig={otpConfig}
            sessions={sessions}
            themeConfig={themeConfig}
            isSuperAdmin={isSuperAdmin}
            onUpdateAiConfig={onUpdateAiConfig}
            onUpdateOtpConfig={onUpdateOtpConfig}
            onRevokeSession={onRevokeSession}
            onUpdateTheme={onUpdateThemeConfig}
            onGoToSms={() => setActiveTab('sms')}
            onRefreshFromServer={onRefreshFromServer}
            onNotice={onNotice}
          />
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="space-y-6">
          <SolarBookingAutoBackupPanel mode="auto_backup" onNotice={onNotice} />
          <DbBackupPanel
            onNotice={onNotice}
            onDataRestored={onRefreshFromServer}
          />
        </div>
      )}

      <MediaPickerModal
        isOpen={badgePickerSlot !== null}
        mode="featured"
        allowVideo={false}
        mediaItems={combinedMediaItems}
        defaultCategory="brand_banner"
        onClose={() => setBadgePickerSlot(null)}
        onMediaUploaded={(uploaded) => {
          setLocalUploadedMedia((prev) => [...uploaded, ...prev]);
          onRefreshFromServer?.();
        }}
        onSelect={(sel) => {
          if (badgePickerSlot === 'enamad') {
            updateTrustBadges({ enamadImageUrl: sel.url, enamadMode: 'image' });
            onNotice('success', 'تصویر نماد اعتماد (اینماد) در فوتر به‌روزرسانی شد.');
          } else if (badgePickerSlot === 'license2') {
            updateTrustBadges({ secondBadgeImageUrl: sel.url, secondBadgeMode: 'image' });
            onNotice('success', 'تصویر مجوز دوم در فوتر به‌روزرسانی شد.');
          }
          setBadgePickerSlot(null);
        }}
        onNotice={onNotice}
      />
    </div>
  );
};
