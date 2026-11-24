import React, { useEffect, useState } from 'react';
import {
  Bot,
  Calendar,
  CheckCircle2,
  CreditCard,
  Database,
  Globe,
  Image as ImageIcon,
  Instagram,
  Loader2,
  MessageCircle,
  MessageSquare,
  Palette,
  RotateCcw,
  Save,
  Send,
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
  SocialChannelsConfig,
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
import { UnifiedBaleHubPanel } from './UnifiedBaleHubPanel';
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
  | 'bale'
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
  onSaveThemeNow?: (next?: ThemeConfig, successText?: string) => Promise<void>;
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
  onSaveThemeNow,
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
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'favicon' | 'eitaaLogo' | null>(null);
  const [savingSection, setSavingSection] = useState<'general' | 'social' | 'contact_location' | 'badges' | 'theme' | null>(null);
  const [badgePickerSlot, setBadgePickerSlot] = useState<'enamad' | 'license2' | 'logo' | 'favicon' | 'eitaaLogo' | null>(null);
  const [localUploadedMedia, setLocalUploadedMedia] = useState<MediaAssetItem[]>([]);
  const combinedMediaItems = [
    ...localUploadedMedia,
    ...mediaItems.filter((m) => !localUploadedMedia.some((l) => l.id === m.id)),
  ];

  const handleSaveThemeSection = async (
    sectionKey: 'general' | 'social' | 'contact_location' | 'badges' | 'theme',
    nextTheme: ThemeConfig,
    successText: string
  ) => {
    setSavingSection(sectionKey);
    try {
      onUpdateThemeConfig(nextTheme);
      if (onSaveThemeNow) {
        await onSaveThemeNow(nextTheme, successText);
      } else {
        onNotice('success', successText);
      }
    } finally {
      setSavingSection(null);
    }
  };

  const socialChannels: SocialChannelsConfig = {
    ...(DEFAULT_THEME_CONFIG.socialChannels as SocialChannelsConfig),
    ...(themeConfig.socialChannels || {}),
  };

  const updateSocialChannels = (patch: Partial<SocialChannelsConfig>) => {
    onUpdateThemeConfig({
      ...themeConfig,
      socialChannels: {
        ...socialChannels,
        ...patch,
      },
    });
  };

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
    kind: 'logo' | 'favicon' | 'eitaaLogo',
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
      const uploadTitle =
        kind === 'logo'
          ? 'لوگوی سایت'
          : kind === 'favicon'
          ? 'فاوآیکون سایت'
          : 'لوگوی کانال ایتا';
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
              title: uploadTitle,
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
      if (kind === 'eitaaLogo') {
        const nextTheme: ThemeConfig = {
          ...themeConfig,
          socialChannels: {
            ...socialChannels,
            eitaaLogoUrl: nextUrl,
          },
        };
        onUpdateThemeConfig(nextTheme);
        if (onSaveThemeNow) {
          await onSaveThemeNow(nextTheme, 'لوگوی کانال ایتا با موفقیت آپلود و ذخیره شد.');
        } else {
          onNotice('success', 'لوگوی کانال ایتا با موفقیت آپلود و اعمال شد.');
        }
      } else {
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
      }
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
    { id: 'sms', label: 'درگاه‌های پیامکی (۱۲)', icon: MessageSquare },
    { id: 'bale', label: 'تنظیمات یکپارچه بله', icon: MessageCircle },
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  تنظیمات عمومی سایت (نام، توضیحات، لوگو و فاوآیکون)
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  نام برند، توضیحات سئو، لوگو و فاوآیکون سایت را ویرایش کرده و با دکمه ذخیره در دیتابیس ثبت کنید.
                </p>
              </div>
              <button
                type="button"
                disabled={savingSection === 'general'}
                onClick={() =>
                  void handleSaveThemeSection(
                    'general',
                    themeConfig,
                    'تنظیمات عمومی، لوگو و فاوآیکون سایت با موفقیت ذخیره و اعمال شد.'
                  )
                }
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0 shadow-xs"
              >
                {savingSection === 'general' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>
                  {savingSection === 'general' ? 'در حال ذخیره...' : 'ذخیره تنظیمات عمومی و لوگو'}
                </span>
              </button>
            </div>

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
                  value={
                    themeConfig.siteDescription ??
                    themeConfig.footerDescription ??
                    'پلتفرم ماژولار مدیریت محتوا، فروش اسکیل‌های هوش مصنوعی و فروشگاه اینترنتی بومی ایران'
                  }
                  onChange={(e) =>
                    onUpdateThemeConfig({
                      ...themeConfig,
                      siteDescription: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              {/* Direct Logo Uploader + Gallery Picker */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                    alt="لوگوی سایت"
                    className="w-12 h-12 object-contain shrink-0 block bg-transparent border-0 p-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                      لوگوی اصلی هدر و فوتر
                    </div>
                    <div className="text-[10px] font-mono text-stone-500 truncate max-w-[200px]" dir="ltr">
                      {themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBadgePickerSlot('logo')}
                    className="px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>گالری</span>
                  </button>
                  <label className="px-3 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingAsset === 'logo' ? 'آپلود...' : 'آپلود لوگو'}</span>
                    <input
                      type="file"
                      accept="image/*,.svg"
                      className="hidden"
                      onChange={(e) => void handleUploadBrandAsset('logo', e.target.files)}
                    />
                  </label>
                </div>
              </div>

              {/* Direct Favicon Uploader + Gallery Picker */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={themeConfig.faviconUrl || '/assets/aistudio/logo_8c26749f.webp'}
                    alt="فاوآیکون سایت"
                    className="w-10 h-10 object-contain shrink-0 block bg-transparent border-0 p-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                      آیکون تب مرورگر (Favicon)
                    </div>
                    <div className="text-[10px] font-mono text-stone-500 truncate max-w-[200px]" dir="ltr">
                      {themeConfig.faviconUrl || '/assets/aistudio/logo_8c26749f.webp'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBadgePickerSlot('favicon')}
                    className="px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>گالری</span>
                  </button>
                  <label className="px-3 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingAsset === 'favicon' ? 'آپلود...' : 'آپلود فاوآیکون'}</span>
                    <input
                      type="file"
                      accept="image/*,.ico,.svg"
                      className="hidden"
                      onChange={(e) => void handleUploadBrandAsset('favicon', e.target.files)}
                    />
                  </label>
                </div>
              </div>

              {/* Draggable Header Logo Size Slider */}
              <div className="md:col-span-2 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={themeConfig.logoUrl || '/assets/aistudio/logo_8c26749f.webp'}
                    alt="پیش‌نمایش سایز لوگو"
                    style={{
                      width: `${Math.min(120, Math.max(36, Number(themeConfig.headerLogoSizePx) || 68))}px`,
                      height: `${Math.min(120, Math.max(36, Number(themeConfig.headerLogoSizePx) || 68))}px`,
                    }}
                    className="object-contain shrink-0 block bg-transparent border-0 p-0 transition-all duration-150"
                  />
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                      اندازه لوگوی هدر (بدون کادر · قابل تغییر با نوار کشیدنی)
                    </div>
                    <div className="text-[11px] text-stone-500">
                      سایز فعلی:{' '}
                      <strong className="font-mono text-[#1D4ED8] dark:text-sky-400" dir="ltr">
                        {Math.min(120, Math.max(36, Number(themeConfig.headerLogoSizePx) || 68))}px
                      </strong>{' '}
                      (بازه مجاز: ۳۶ تا ۱۲۰ پیکسل — همچنین مستقیماً از داخل هدر سایت قابل تنظیم است)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:w-72 shrink-0">
                  <span className="text-[10px] font-mono text-stone-400" dir="ltr">36px</span>
                  <input
                    type="range"
                    min={36}
                    max={120}
                    step={2}
                    value={Math.min(120, Math.max(36, Number(themeConfig.headerLogoSizePx) || 68))}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        headerLogoSizePx: Number(e.target.value),
                      })
                    }
                    className="flex-1 h-2 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-[#1D4ED8]"
                  />
                  <span className="text-[10px] font-mono text-stone-400" dir="ltr">120px</span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Channels & Eitaa Channel Logo Uploader */}
          <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                    کانال ایتا (آدرس + بارگذاری لوگو) و شبکه‌های اجتماعی
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    آدرس کانال ایتا، اینستاگرام و بله را تنظیم کنید و لوگوی رسمی ایتا را مستقیماً آپلود یا از گالری انتخاب نمایید.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={savingSection === 'social'}
                onClick={() =>
                  void handleSaveThemeSection(
                    'social',
                    themeConfig,
                    'تنظیمات کانال ایتا، لوگوی ایتا و شبکه‌های اجتماعی با موفقیت ذخیره شد.'
                  )
                }
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0 shadow-xs"
              >
                {savingSection === 'social' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>
                  {savingSection === 'social' ? 'در حال ذخیره...' : 'ذخیره شبکه‌های اجتماعی'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
              {/* Eitaa Channel + Custom Logo Uploader */}
              <div className="lg:col-span-7 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span>تنظیمات کانال رسمی ایتا (Eitaa)</span>
                  </span>
                  <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">
                    نمایش در هیرو، تماس با ما و فوتر
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                      آی‌دی کانال ایتا (بدون @)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={socialChannels.eitaaId}
                      onChange={(e) => {
                        const cleanId = e.target.value.replace(/^@/, '').trim();
                        updateSocialChannels({
                          eitaaId: cleanId,
                          eitaaUrl: cleanId ? `https://eitaa.com/${cleanId}` : socialChannels.eitaaUrl,
                        });
                      }}
                      placeholder="fatehan_robotics"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                      لینک کامل کانال ایتا
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={socialChannels.eitaaUrl}
                      onChange={(e) => updateSocialChannels({ eitaaUrl: e.target.value })}
                      placeholder="https://eitaa.com/fatehan_robotics"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                    />
                  </div>
                </div>

                {/* Eitaa Logo Uploader Box */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-stone-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-stone-950 border border-orange-200 dark:border-stone-800 flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                        {socialChannels.eitaaLogoUrl ? (
                          <img
                            src={socialChannels.eitaaLogoUrl}
                            alt="لوگوی ایتا"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Send className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                          لوگوی اختصاصی ایتا (PNG / SVG / WebP)
                        </div>
                        <div className="text-[10px] font-mono text-stone-500 truncate max-w-[220px]" dir="ltr">
                          {socialChannels.eitaaLogoUrl || 'آیکون پیش‌فرض (لوگوی سفارشی بارگذاری نشده)'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setBadgePickerSlot('eitaaLogo')}
                        className="px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>گالری</span>
                      </button>

                      <label className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{uploadingAsset === 'eitaaLogo' ? 'در حال آپلود...' : 'بارگذاری لوگوی ایتا'}</span>
                        <input
                          type="file"
                          accept="image/*,.svg,.webp,.png"
                          className="hidden"
                          onChange={(e) => void handleUploadBrandAsset('eitaaLogo', e.target.files)}
                        />
                      </label>

                      {socialChannels.eitaaLogoUrl && (
                        <button
                          type="button"
                          onClick={() => updateSocialChannels({ eitaaLogoUrl: '' })}
                          title="حذف لوگوی سفارشی و بازگشت به آیکون پیش‌فرض"
                          className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-600 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 mb-1">
                      یا آدرس مستقیم تصویر لوگوی ایتا:
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={socialChannels.eitaaLogoUrl || ''}
                      onChange={(e) => updateSocialChannels({ eitaaLogoUrl: e.target.value })}
                      placeholder="/uploads/... یا https://..."
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Instagram & Bale Settings */}
              <div className="lg:col-span-5 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-3.5">
                <div className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Instagram className="w-4 h-4 text-pink-600" />
                  <span>اینستاگرام و کانال بله</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      آی‌دی اینستاگرام
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={socialChannels.instagramId}
                      onChange={(e) => {
                        const cleanId = e.target.value.replace(/^@/, '').trim();
                        updateSocialChannels({
                          instagramId: cleanId,
                          instagramUrl: cleanId ? `https://instagram.com/${cleanId}` : socialChannels.instagramUrl,
                        });
                      }}
                      placeholder="fatehan.robot"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      لینک اینستاگرام
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={socialChannels.instagramUrl}
                      onChange={(e) => updateSocialChannels({ instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/fatehan.robot"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      آی‌دی کانال بله (اختیاری)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={socialChannels.baleId}
                      onChange={(e) => {
                        const cleanId = e.target.value.replace(/^@/, '').trim();
                        updateSocialChannels({
                          baleId: cleanId,
                          baleUrl: cleanId ? `https://ble.ir/${cleanId}` : '',
                        });
                      }}
                      placeholder="fatehan_robotics"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      لینک کانال بله
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={socialChannels.baleUrl}
                      onChange={(e) => updateSocialChannels({ baleUrl: e.target.value })}
                      placeholder="https://ble.ir/..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Phones, Workshop Address, Working Hours, Header/Footer Texts & About Page Content */}
          <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  اطلاعات تماس، شماره‌های تلفن، آدرس کارگاه، شعارهای هدر/فوتر و محتوای درباره ما
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  هرگونه تغییر در این بخش مستقیماً در هدر، فوتر، کارت تیره تماس صفحه اصلی، صفحه «تماس با ما» و صفحه «درباره ما» اعمال می‌شود.
                </p>
              </div>
              <button
                type="button"
                disabled={savingSection === 'contact_location'}
                onClick={() =>
                  void handleSaveThemeSection(
                    'contact_location',
                    themeConfig,
                    'اطلاعات تماس، آدرس کارگاه، ساعات کاری، متون هدر/فوتر و برگه درباره ما با موفقیت ذخیره شد.'
                  )
                }
                className="px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0 shadow-xs"
              >
                {savingSection === 'contact_location' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>
                  {savingSection === 'contact_location'
                    ? 'در حال ذخیره...'
                    : 'ذخیره اطلاعات تماس و آدرس'}
                </span>
              </button>
            </div>

            {/* 1. Phone Numbers Grid */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-3">
              <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                ۱. شماره‌های تماس آموزشگاه (نمایش در هدر، فوتر، صفحه اصلی و تماس با ما)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Line 1 */}
                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                  <label className="block text-[11px] font-extrabold text-[#1D4ED8]">
                    خط ۱ همراه (مشاوره و ثبت‌نام)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={themeConfig.contactPhones?.line1 || '09103116753'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactPhones: {
                          line1: e.target.value,
                          line1Formatted:
                            themeConfig.contactPhones?.line1Formatted || '۰۹۱۰ ۳۱۱ ۶۷۵۳',
                          line1Label:
                            themeConfig.contactPhones?.line1Label || 'خط ۱ مشاوره و ثبت‌نام',
                          line2: themeConfig.contactPhones?.line2 || '09372335026',
                          line2Formatted:
                            themeConfig.contactPhones?.line2Formatted || '۰۹۳۷ ۲۳۳ ۵۰۲۶',
                          line2Label:
                            themeConfig.contactPhones?.line2Label || 'خط ۲ پشتیبانی کارگاه',
                          landline: themeConfig.contactPhones?.landline || '02165506015',
                          landlineFormatted:
                            themeConfig.contactPhones?.landlineFormatted || '۰۲۱ ۶۵۵۰ ۶۰۱۵',
                          landlineLabel:
                            themeConfig.contactPhones?.landlineLabel || 'تلفن ثابت دفتر مرکزی',
                        },
                      })
                    }
                    placeholder="09103116753"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
                  />
                  <input
                    type="text"
                    value={themeConfig.contactPhones?.line1Formatted || '۰۹۱۰ ۳۱۱ ۶۷۵۳'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactPhones: {
                          ...(themeConfig.contactPhones || {
                            line1: '09103116753',
                            line1Formatted: '۰۹۱۰ ۳۱۱ ۶۷۵۳',
                            line1Label: 'خط ۱ مشاوره و ثبت‌نام',
                            line2: '09372335026',
                            line2Formatted: '۰۹۳۷ ۲۳۳ ۵۰۲۶',
                            line2Label: 'خط ۲ پشتیبانی کارگاه',
                            landline: '02165506015',
                            landlineFormatted: '۰۲۱ ۶۵۵۰ ۶۰۱۵',
                            landlineLabel: 'تلفن ثابت دفتر مرکزی',
                          }),
                          line1Formatted: e.target.value,
                        },
                      })
                    }
                    placeholder="نمایش فارسی: ۰۹۱۰ ۳۱۱ ۶۷۵۳"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                  <input
                    type="text"
                    value={themeConfig.contactPhones?.line1Label || 'خط ۱ مشاوره و ثبت‌نام'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactPhones: {
                          ...(themeConfig.contactPhones || {
                            line1: '09103116753',
                            line1Formatted: '۰۹۱۰ ۳۱۱ ۶۷۵۳',
                            line1Label: 'خط ۱ مشاوره و ثبت‌نام',
                            line2: '09372335026',
                            line2Formatted: '۰۹۳۷ ۲۳۳ ۵۰۲۶',
                            line2Label: 'خط ۲ پشتیبانی کارگاه',
                            landline: '02165506015',
                            landlineFormatted: '۰۲۱ ۶۵۵۰ ۶۰۱۵',
                            landlineLabel: 'تلفن ثابت دفتر مرکزی',
                          }),
                          line1Label: e.target.value,
                        },
                      })
                    }
                    placeholder="عنوان خط ۱"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>

                {/* Line 2 */}
                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                  <label className="block text-[11px] font-extrabold text-cyan-600">
                    خط ۲ همراه (پشتیبانی کارگاه)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={themeConfig.contactPhones?.line2 || '09372335026'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactPhones: {
                          ...(themeConfig.contactPhones || {
                            line1: '09103116753',
                            line1Formatted: '۰۹۱۰ ۳۱۱ ۶۷۵۳',
                            line1Label: 'خط ۱ مشاوره و ثبت‌نام',
                            line2: '09372335026',
                            line2Formatted: '۰۹۳۷ ۲۳۳ ۵۰۲۶',
                            line2Label: 'خط ۲ پشتیبانی کارگاه',
                            landline: '02165506015',
                            landlineFormatted: '۰۲۱ ۶۵۵۰ ۶۰۱۵',
                            landlineLabel: 'تلفن ثابت دفتر مرکزی',
                          }),
                          line2: e.target.value,
                        },
                      })
                    }
                    placeholder="09372335026"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
                  />
                  <input
                    type="text"
                    value={themeConfig.contactPhones?.line2Formatted || '۰۹۳۷ ۲۳۳ ۵۰۲۶'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactPhones: {
                          ...(themeConfig.contactPhones || {
                            line1: '09103116753',
                            line1Formatted: '۰۹۱۰ ۳۱۱ ۶۷۵۳',
                            line1Label: 'خط ۱ مشاوره و ثبت‌نام',
                            line2: '09372335026',
                            line2Formatted: '۰۹۳۷ ۲۳۳ ۵۰۲۶',
                            line2Label: 'خط ۲ پشتیبانی کارگاه',
                            landline: '02165506015',
                            landlineFormatted: '۰۲۱ ۶۵۵۰ ۶۰۱۵',
                            landlineLabel: 'تلفن ثابت دفتر مرکزی',
                          }),
                          line2Formatted: e.target.value,
                        },
                      })
                    }
                    placeholder="نمایش فارسی: ۰۹۳۷ ۲۳۳ ۵۰۲۶"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                  <input
                    type="text"
                    value={themeConfig.contactPhones?.line2Label || 'خط ۲ پشتیبانی کارگاه'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactPhones: {
                          ...(themeConfig.contactPhones || {
                            line1: '09103116753',
                            line1Formatted: '۰۹۱۰ ۳۱۱ ۶۷۵۳',
                            line1Label: 'خط ۱ مشاوره و ثبت‌نام',
                            line2: '09372335026',
                            line2Formatted: '۰۹۳۷ ۲۳۳ ۵۰۲۶',
                            line2Label: 'خط ۲ پشتیبانی کارگاه',
                            landline: '02165506015',
                            landlineFormatted: '۰۲۱ ۶۵۵۰ ۶۰۱۵',
                            landlineLabel: 'تلفن ثابت دفتر مرکزی',
                          }),
                          line2Label: e.target.value,
                        },
                      })
                    }
                    placeholder="عنوان خط ۲"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>

                {/* Landline */}
                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                  <label className="block text-[11px] font-extrabold text-emerald-600">
                    تلفن ثابت دفتر مرکزی آموزشگاه
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={themeConfig.contactPhones?.landline || '02165506015'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactPhones: {
                          ...(themeConfig.contactPhones || {
                            line1: '09103116753',
                            line1Formatted: '۰۹۱۰ ۳۱۱ ۶۷۵۳',
                            line1Label: 'خط ۱ مشاوره و ثبت‌نام',
                            line2: '09372335026',
                            line2Formatted: '۰۹۳۷ ۲۳۳ ۵۰۲۶',
                            line2Label: 'خط ۲ پشتیبانی کارگاه',
                            landline: '02165506015',
                            landlineFormatted: '۰۲۱ ۶۵۵۰ ۶۰۱۵',
                            landlineLabel: 'تلفن ثابت دفتر مرکزی',
                          }),
                          landline: e.target.value,
                        },
                      })
                    }
                    placeholder="02165506015"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
                  />
                  <input
                    type="text"
                    value={themeConfig.contactPhones?.landlineFormatted || '۰۲۱ ۶۵۵۰ ۶۰۱۵'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactPhones: {
                          ...(themeConfig.contactPhones || {
                            line1: '09103116753',
                            line1Formatted: '۰۹۱۰ ۳۱۱ ۶۷۵۳',
                            line1Label: 'خط ۱ مشاوره و ثبت‌نام',
                            line2: '09372335026',
                            line2Formatted: '۰۹۳۷ ۲۳۳ ۵۰۲۶',
                            line2Label: 'خط ۲ پشتیبانی کارگاه',
                            landline: '02165506015',
                            landlineFormatted: '۰۲۱ ۶۵۵۰ ۶۰۱۵',
                            landlineLabel: 'تلفن ثابت دفتر مرکزی',
                          }),
                          landlineFormatted: e.target.value,
                        },
                      })
                    }
                    placeholder="نمایش فارسی: ۰۲۱ ۶۵۵۰ ۶۰۱۵"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                  <input
                    type="text"
                    value={themeConfig.contactPhones?.landlineLabel || 'تلفن ثابت دفتر مرکزی'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactPhones: {
                          ...(themeConfig.contactPhones || {
                            line1: '09103116753',
                            line1Formatted: '۰۹۱۰ ۳۱۱ ۶۷۵۳',
                            line1Label: 'خط ۱ مشاوره و ثبت‌نام',
                            line2: '09372335026',
                            line2Formatted: '۰۹۳۷ ۲۳۳ ۵۰۲۶',
                            line2Label: 'خط ۲ پشتیبانی کارگاه',
                            landline: '02165506015',
                            landlineFormatted: '۰۲۱ ۶۵۵۰ ۶۰۱۵',
                            landlineLabel: 'تلفن ثابت دفتر مرکزی',
                          }),
                          landlineLabel: e.target.value,
                        },
                      })
                    }
                    placeholder="عنوان تلفن ثابت"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  />
                </div>
              </div>
            </div>

            {/* 2. Physical Address, Working Hours & Postal Code */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-3 text-xs">
              <div className="font-extrabold text-stone-900 dark:text-white">
                ۲. آدرس دقیق کارگاه حضوری، شهر، کد پستی و ساعات کاری
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    استان
                  </label>
                  <input
                    type="text"
                    value={themeConfig.contactLocation?.province || 'تهران'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactLocation: {
                          province: e.target.value,
                          city: themeConfig.contactLocation?.city || 'اندیشه',
                          fullAddress:
                            themeConfig.contactLocation?.fullAddress ||
                            'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۲',
                          workingHours:
                            themeConfig.contactLocation?.workingHours ||
                            'ساعات کاری: شنبه تا پنجشنبه (۹ صبح تا ۸ شب)',
                          postalCode:
                            themeConfig.contactLocation?.postalCode || '3351984210',
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    شهر / منطقه
                  </label>
                  <input
                    type="text"
                    value={themeConfig.contactLocation?.city || 'اندیشه'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactLocation: {
                          ...(themeConfig.contactLocation || {
                            province: 'تهران',
                            city: 'اندیشه',
                            fullAddress:
                              'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۲',
                            workingHours:
                              'ساعات کاری: شنبه تا پنجشنبه (۹ صبح تا ۸ شب)',
                          }),
                          city: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    کد پستی ۱۰ رقمی
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={themeConfig.contactLocation?.postalCode || '3351984210'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactLocation: {
                          ...(themeConfig.contactLocation || {
                            province: 'تهران',
                            city: 'اندیشه',
                            fullAddress:
                              'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۲',
                            workingHours:
                              'ساعات کاری: شنبه تا پنجشنبه (۹ صبح تا ۸ شب)',
                          }),
                          postalCode: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    ساعات کاری آموزشگاه
                  </label>
                  <input
                    type="text"
                    value={
                      themeConfig.contactLocation?.workingHours ||
                      'ساعات کاری: شنبه تا پنجشنبه (۹ صبح تا ۸ شب)'
                    }
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        contactLocation: {
                          ...(themeConfig.contactLocation || {
                            province: 'تهران',
                            city: 'اندیشه',
                            fullAddress:
                              'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۲',
                            workingHours:
                              'ساعات کاری: شنبه تا پنجشنبه (۹ صبح تا ۸ شب)',
                          }),
                          workingHours: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  نشانی کامل پستی کارگاه و دفتر ثبت‌نام حضوری
                </label>
                <input
                  type="text"
                  value={
                    themeConfig.contactLocation?.fullAddress ||
                    'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۲'
                  }
                  onChange={(e) =>
                    onUpdateThemeConfig({
                      ...themeConfig,
                      contactLocation: {
                        ...(themeConfig.contactLocation || {
                          province: 'تهران',
                          city: 'اندیشه',
                          fullAddress:
                            'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۲',
                          workingHours:
                            'ساعات کاری: شنبه تا پنجشنبه (۹ صبح تا ۸ شب)',
                        }),
                        fullAddress: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                />
              </div>
            </div>

            {/* 3. Header Taglines, Top Announcement Bar & Footer Texts */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-3 text-xs">
              <div className="font-extrabold text-stone-900 dark:text-white">
                ۳. شعارهای هدر، نوار اعلان بالای سایت و متن معرفی فوتر
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    شعار اصلی آموزشگاه (Tagline 1)
                  </label>
                  <input
                    type="text"
                    value={themeConfig.taglinePrimary || 'کارآموزان امروز، فاتحان فردا'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        taglinePrimary: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    شعار مکمل (Tagline 2)
                  </label>
                  <input
                    type="text"
                    value={
                      themeConfig.taglineSecondary ||
                      'رباتیک فقط یک رشته نیست... یک مهارت زندگی است'
                    }
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        taglineSecondary: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    شعار کوتاه سه کلمه‌ای (Motto)
                  </label>
                  <input
                    type="text"
                    value={themeConfig.mottoFa || 'فکر کن، بساز، کشف کن!'}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        mottoFa: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  متن نوار اعلان بالای هدر (Top Announcement Bar)
                </label>
                <input
                  type="text"
                  value={themeConfig.topAnnouncementText}
                  onChange={(e) =>
                    onUpdateThemeConfig({
                      ...themeConfig,
                      topAnnouncementText: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    متن معرفی آموزشگاه در فوتر
                  </label>
                  <textarea
                    rows={2}
                    value={themeConfig.footerDescription}
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        footerDescription: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    متن کپی‌رایت پایین فوتر
                  </label>
                  <textarea
                    rows={2}
                    value={
                      themeConfig.footerCopyrightText ||
                      '© ۱۴۰۴ آموزشگاه تخصصی رباتیک، کدنویسی و هوش مصنوعی فاتحان (اندیشه).'
                    }
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        footerCopyrightText: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* 4. About Us Page Direct Content Editor */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 space-y-3 text-xs">
              <div className="font-extrabold text-stone-900 dark:text-white">
                ۴. محتوای برگه «درباره ما» (/about)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    تیتر اصلی صفحه درباره ما
                  </label>
                  <input
                    type="text"
                    value={
                      themeConfig.aboutPageConfig?.heroTitle ||
                      'درباره آموزشگاه تخصصی رباتیک فاتحان'
                    }
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        aboutPageConfig: {
                          heroTitle: e.target.value,
                          heroSubtitle:
                            themeConfig.aboutPageConfig?.heroSubtitle ||
                            'کارآموزان امروز، فاتحان فردا — آموزش ۱۰۰٪ عملی و کارگاهی رباتیک، الکترونیک، چاپ سه‌بعدی و هوش مصنوعی ویژه کودکان و نوجوانان ۶ تا ۱۸ سال.',
                          introParagraph:
                            themeConfig.aboutPageConfig?.introParagraph || '',
                          missionStatement:
                            themeConfig.aboutPageConfig?.missionStatement || '',
                          schoolPartnershipNote:
                            themeConfig.aboutPageConfig?.schoolPartnershipNote || '',
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">
                    زیرتیتر صفحه درباره ما
                  </label>
                  <input
                    type="text"
                    value={
                      themeConfig.aboutPageConfig?.heroSubtitle ||
                      'کارآموزان امروز، فاتحان فردا — آموزش ۱۰۰٪ عملی و کارگاهی رباتیک، الکترونیک، چاپ سه‌بعدی و هوش مصنوعی ویژه کودکان و نوجوانان ۶ تا ۱۸ سال.'
                    }
                    onChange={(e) =>
                      onUpdateThemeConfig({
                        ...themeConfig,
                        aboutPageConfig: {
                          ...(themeConfig.aboutPageConfig || {
                            heroTitle: 'درباره آموزشگاه تخصصی رباتیک فاتحان',
                            heroSubtitle: '',
                            introParagraph: '',
                            missionStatement: '',
                            schoolPartnershipNote: '',
                          }),
                          heroSubtitle: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  متن معرفی کامل داستان و رویکرد آموزشی فاتحان
                </label>
                <textarea
                  rows={3}
                  value={
                    themeConfig.aboutPageConfig?.introParagraph ||
                    'آموزشگاه رباتیک فاتحان در شهر اندیشه با هدف تبدیل کودکان و نوجوانان از مصرف‌کنندگان منفعل تکنولوژی به سازندگان و مخترعان فردا تأسیس شده است.'
                  }
                  onChange={(e) =>
                    onUpdateThemeConfig({
                      ...themeConfig,
                      aboutPageConfig: {
                        ...(themeConfig.aboutPageConfig || {
                          heroTitle: 'درباره آموزشگاه تخصصی رباتیک فاتحان',
                          heroSubtitle: '',
                          introParagraph: '',
                          missionStatement: '',
                          schoolPartnershipNote: '',
                        }),
                        introParagraph: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 leading-relaxed"
                />
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
                {(themeConfig.activeThemeId || 'fatehan') === 'fatehan'
                  ? 'آموزشگاه رباتیک فاتحان'
                  : 'پوسته کلاسیک'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {REGISTERED_THEMES_LIST.map((themeItem) => {
                const isActive =
                  (themeConfig.activeThemeId || 'fatehan') === themeItem.id;
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
                        disabled={isActive || savingSection === 'theme'}
                        onClick={() => {
                          const nextTheme: ThemeConfig = {
                            ...themeConfig,
                            activeThemeId: themeItem.id as RegisteredThemeId,
                          };
                          void handleSaveThemeSection(
                            'theme',
                            nextTheme,
                            `پوسته فعال سایت به «${themeItem.nameFa}» تغییر یافت و در دیتابیس ذخیره شد.`
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
              <button
                type="button"
                disabled={savingSection === 'badges'}
                onClick={() =>
                  void handleSaveThemeSection(
                    'badges',
                    themeConfig,
                    'تنظیمات مجوزها و نمادهای اعتماد فوتر با موفقیت ذخیره شد.'
                  )
                }
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
              >
                {savingSection === 'badges' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>
                  {savingSection === 'badges' ? 'در حال ذخیره...' : 'ذخیره نمادهای اعتماد فوتر'}
                </span>
              </button>
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
            hideBrandIdentityCard
            aiConfig={aiConfig}
            otpConfig={otpConfig}
            sessions={sessions}
            themeConfig={themeConfig}
            isSuperAdmin={isSuperAdmin}
            onUpdateAiConfig={onUpdateAiConfig}
            onUpdateOtpConfig={onUpdateOtpConfig}
            onRevokeSession={onRevokeSession}
            onUpdateTheme={onUpdateThemeConfig}
            onSaveThemeNow={onSaveThemeNow}
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

      {activeTab === 'bale' && (
        <UnifiedBaleHubPanel isSuperAdmin={isSuperAdmin} onNotice={onNotice} />
      )}

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
            onNotice('success', 'تصویر نماد اعتماد (اینماد) انتخاب شد؛ برای ثبت نهایی دکمه ذخیره را بزنید.');
          } else if (badgePickerSlot === 'license2') {
            updateTrustBadges({ secondBadgeImageUrl: sel.url, secondBadgeMode: 'image' });
            onNotice('success', 'تصویر مجوز دوم انتخاب شد؛ برای ثبت نهایی دکمه ذخیره را بزنید.');
          } else if (badgePickerSlot === 'logo') {
            onUpdateThemeConfig({ ...themeConfig, logoUrl: sel.url });
            onNotice('success', 'لوگوی سایت از گالری انتخاب شد.');
          } else if (badgePickerSlot === 'favicon') {
            onUpdateThemeConfig({ ...themeConfig, faviconUrl: sel.url });
            onNotice('success', 'فاوآیکون سایت از گالری انتخاب شد.');
          } else if (badgePickerSlot === 'eitaaLogo') {
            updateSocialChannels({ eitaaLogoUrl: sel.url });
            onNotice('success', 'لوگوی ایتا از گالری انتخاب شد؛ برای ثبت نهایی دکمه ذخیره را بزنید.');
          }
          setBadgePickerSlot(null);
        }}
        onNotice={onNotice}
      />
    </div>
  );
};
