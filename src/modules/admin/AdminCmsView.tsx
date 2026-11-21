import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Activity,
  AlertCircle,
  Blocks,
  Check,
  Crown,
  FileText,
  Menu,
  MessageSquare,
  Palette,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  ShoppingBag,
  X,
} from 'lucide-react';
import type {
  AiEngineConfig,
  CmsDynamicPage,
  CmsRoleDefinition,
  CmsSessionRecord,
  CouponRule,
  MediaAssetItem,
  OrderRecord,
  OtpSecurityConfig,
  PaymentDisplayConfig,
  PaymentGatewayOption,
  SiteModuleRegistryItem,
  SkillArticle,
  SkillProduct,
  ThemeConfig,
} from '../../core/types';
import { apiJson, emitGlobalToast } from '../../core/apiClient';
import {
  canUserUseAiSeo,
  resolveEffectivePermissions,
} from '../../core/permissions';
import { DEFAULT_PAYMENT_DISPLAY_CONFIG } from '../../data/skill98Data';
import {
  CatalogEditorPanel,
  createEmptyProductDraft,
  productToDraft,
  type ProductEditorDraft,
} from './panels/CatalogEditorPanel';
import { PageBuilderPanel } from './panels/PageBuilderPanel';
import { MediaLibraryPanel } from './panels/MediaLibraryPanel';
import { ArticlesSeoPanel } from './panels/ArticlesSeoPanel';
import { OrdersCouponsPanel } from './panels/OrdersCouponsPanel';
import { RbacPermissionsPanel } from './panels/RbacPermissionsPanel';
import { PaymentGatewaysPanel } from './panels/PaymentGatewaysPanel';
import { SmsTriggersPanel } from './panels/SmsTriggersPanel';
import { DbBackupPanel } from './panels/DbBackupPanel';
import { LogsDiagnosticsPanel } from './panels/LogsDiagnosticsPanel';
import { UsersDirectoryPanel } from './panels/UsersDirectoryPanel';
import { AiSessionsThemePanel } from './panels/AiSessionsThemePanel';
import {
  EnterpriseCoreHubPanel,
  type EnterpriseHubMode,
} from './panels/EnterpriseCoreHubPanel';
import { TaxonomiesManagerPanel } from './panels/TaxonomiesManagerPanel';
import { PagesManagerPanel } from './panels/PagesManagerPanel';
import { MenuBuilderInvoicePanel } from './panels/MenuBuilderInvoicePanel';
import { ModulesControlCenterPanel } from './panels/ModulesControlCenterPanel';
import {
  UnifiedSettingsHubPanel,
  type UnifiedSettingsTabId,
} from './panels/UnifiedSettingsHubPanel';
import { PayzitoPaymentHubPanel } from '../../../modules/mod_payment_hub/PayzitoPaymentHubPanel';
import { InventoryAccountingPanel } from '../../../modules/mod_inventory_accounting/InventoryAccountingPanel';
import { FormsManagerPanel } from '../../../modules/mod_forms/FormsManagerPanel';
import { GoftinoOperatorInboxPanel } from '../../../modules/mod_live_chat/GoftinoOperatorInboxPanel';
import { NativeAnalyticsGscPanel } from '../../../modules/mod_analytics_gsc/NativeAnalyticsGscPanel';
import { Phase6EnterpriseSuitePanel } from '../../../modules/mod_ai_digikala/Phase6EnterpriseSuitePanel';
import { SolarBookingAutoBackupPanel } from '../../../modules/mod_booking/SolarBookingAutoBackupPanel';
import { SmartCrmAdminPanel } from '../../../modules/mod_smart_crm/SmartCrmAdminPanel';
import { SubscriptionsAdminPanel } from '../../../modules/mod_subscriptions/SubscriptionsAdminPanel';
import { AcademySuiteAdminPanel } from '../../../modules/mod_academy_suite/AcademySuiteAdminPanel';
import { DeliveryLogsPanel } from '../../../modules/mod_delivery_logs/DeliveryLogsPanel';
import { NotificationsPwaPanel } from '../../../modules/mod_notifications_pwa/NotificationsPwaPanel';
import { AbandonedCartPanel } from '../../../modules/mod_abandoned_cart/AbandonedCartPanel';
import { AnnouncementsPopupsPanel } from '../../../modules/mod_announcements_popups/AnnouncementsPopupsPanel';
import { ReviewsQaPanel } from '../../../modules/mod_reviews_qa/ReviewsQaPanel';
import { WalletRmaPanel } from '../../../modules/mod_wallet_rma/WalletRmaPanel';
import { AffiliatePanel } from '../../../modules/mod_affiliate/AffiliatePanel';
import { B2bComparePanel } from '../../../modules/mod_b2b_compare/B2bComparePanel';
import { BotsWebhooksPanel } from '../../../modules/mod_bots_webhooks/BotsWebhooksPanel';
import { MaintenanceAuditPanel } from '../../../modules/mod_maintenance_audit/MaintenanceAuditPanel';
import { I18nPanel } from '../../../modules/mod_i18n/I18nPanel';
import { AiHubAgentPanel } from '../../../modules/mod_ai_hub_agent/AiHubAgentPanel';
import { AdminGlobalChatAlarm } from '../../../modules/mod_live_chat/AdminGlobalChatAlarm';

export type { OrderRecord };

interface AdminCmsViewProps {
  products: SkillProduct[];
  articles: SkillArticle[];
  orders: OrderRecord[];
  coupons: CouponRule[];
  gateways: PaymentGatewayOption[];
  aiConfig: AiEngineConfig;
  roles: CmsRoleDefinition[];
  sessions: CmsSessionRecord[];
  otpConfig: OtpSecurityConfig;
  themeConfig: ThemeConfig;
  mediaItems: MediaAssetItem[];
  activeUserRole: 'admin' | 'super_admin';
  activeUserRoleId?: string;
  activeUserName?: string | null;
  accentButtonClass: string;
  accentTextClass: string;
  onSwitchActiveRole?: (role: 'admin' | 'super_admin') => void;
  onSaveProduct: (
    product: Omit<SkillProduct, 'authorId'>,
    existingId?: string
  ) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSeedCatalog: () => Promise<void>;
  onSaveArticle: (article: SkillArticle) => void;
  onDeleteArticle: (articleId: string) => void;
  onSaveMediaItem: (item: MediaAssetItem) => void;
  onDeleteMediaItem: (id: string) => void;
  onUpdateOrderStatus: (
    orderId: string,
    status: OrderRecord['status']
  ) => Promise<void>;
  onSaveCoupon: (coupon: CouponRule) => void;
  onDeleteCoupon: (code: string) => void;
  onUpdateGateways: (next: PaymentGatewayOption[]) => void;
  paymentDisplayConfig?: PaymentDisplayConfig;
  onUpdatePaymentDisplayConfig?: (next: PaymentDisplayConfig) => void;
  onRefreshFromServer?: () => void;
  onUpdateAiConfig: (next: AiEngineConfig) => void;
  onUpdateRoles: (next: CmsRoleDefinition[]) => void;
  onRevokeSession: (sessionId: string) => void;
  onUpdateOtpConfig: (next: OtpSecurityConfig) => void;
  onUpdateTheme: (next: ThemeConfig) => void;
  onSaveThemeNow?: (next?: ThemeConfig, successText?: string) => Promise<void>;
  onOpenDynamicPage?: (page: CmsDynamicPage) => void;
  onDownloadStarterZip?: () => Promise<void>;
}

export type AdminSection =
  | 'dashboard'
  | 'articles_list'
  | 'articles_editor'
  | 'taxonomies'
  | 'pages_list'
  | 'pages_editor'
  | 'media_list'
  | 'media_editor'
  | 'catalog'
  | 'editor'
  | 'inventory'
  | 'orders'
  | 'messages_tickets'
  | 'forms_manager'
  | 'forms_chat'
  | 'booking'
  | 'menu_builder'
  | 'super_theme'
  | 'page_builder'
  | 'invoice_designer'
  | 'super_backup'
  | 'seo_center'
  | 'redirects_seo'
  | 'super_logs'
  | 'general_calendar'
  | 'super_gateways'
  | 'super_sms'
  | 'super_ai'
  | 'modules_manager'
  | 'settings_hub'
  | 'mod_subscriptions'
  | 'mod_smart_crm'
  | 'mod_academy_suite'
  | 'mod_delivery_logs'
  | 'mod_notifications_pwa'
  | 'mod_abandoned_cart'
  | 'mod_announcements_popups'
  | 'mod_reviews_qa'
  | 'mod_wallet_rma'
  | 'mod_affiliate'
  | 'mod_b2b_compare'
  | 'mod_bots_webhooks'
  | 'mod_maintenance_audit'
  | 'mod_i18n'
  | 'mod_ai_hub_agent'
  | 'super_users'
  | 'super_rbac'
  | 'super_sessions';

const EDIT_FOCUS_SECTIONS: AdminSection[] = [
  'editor',
  'articles_editor',
  'pages_editor',
  'page_builder',
  'invoice_designer',
  'menu_builder',
  'media_editor',
];

interface SidebarCategoryGroup {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
  items: { id: AdminSection; label: string; badge?: string }[];
}

export const AdminCmsView: React.FC<AdminCmsViewProps> = ({
  products,
  articles,
  orders,
  coupons,
  gateways,
  aiConfig,
  roles,
  sessions,
  otpConfig,
  themeConfig,
  mediaItems,
  activeUserRole,
  activeUserRoleId,
  activeUserName,
  accentButtonClass,
  accentTextClass,
  onSwitchActiveRole,
  onSaveProduct,
  onDeleteProduct,
  onSeedCatalog,
  onSaveArticle,
  onDeleteArticle,
  onSaveMediaItem,
  onDeleteMediaItem,
  onUpdateOrderStatus,
  onSaveCoupon,
  onDeleteCoupon,
  onUpdateGateways,
  paymentDisplayConfig,
  onUpdatePaymentDisplayConfig,
  onRefreshFromServer,
  onUpdateAiConfig,
  onUpdateRoles,
  onRevokeSession,
  onUpdateOtpConfig,
  onUpdateTheme,
  onSaveThemeNow,
  onOpenDynamicPage,
}) => {
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [productDraft, setProductDraft] = useState<ProductEditorDraft>(() =>
    createEmptyProductDraft()
  );
  const [selectedFeaturedMedia, setSelectedFeaturedMedia] = useState<{
    url: string;
    altText: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [settingsHubTab, setSettingsHubTab] = useState<UnifiedSettingsTabId>('general');
  const [siteModules, setSiteModules] = useState<SiteModuleRegistryItem[]>([]);
  const [selectedChatSessionId, setSelectedChatSessionId] = useState<string>('');
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void apiJson<{ ok?: boolean; modules?: SiteModuleRegistryItem[] }>('/api/v1/modules/registry')
      .then(({ ok, data }) => {
        if (ok && Array.isArray(data.modules)) {
          setSiteModules(data.modules);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileSidebarOpen]);

  const isModuleEnabled = useCallback(
    (moduleId: string): boolean => {
      const defaultOff = new Set([
        'mod_academy_suite',
        'mod_abandoned_cart',
        'mod_wallet_rma',
        'mod_affiliate',
        'mod_b2b_compare',
        'mod_bots_webhooks',
        'mod_maintenance_audit',
        'mod_i18n',
      ]);
      if (siteModules.length === 0) {
        return !defaultOff.has(moduleId);
      }
      const found = siteModules.find((m) => m.id === moduleId);
      if (!found) return !defaultOff.has(moduleId);
      return found.enabled;
    },
    [siteModules]
  );

  const handleSelectSection = useCallback((nextSection: AdminSection | string) => {
    if (typeof nextSection === 'string' && nextSection.startsWith('settings_hub:')) {
      const tabPart = nextSection.split(':')[1] as UnifiedSettingsTabId;
      setSettingsHubTab(tabPart || 'general');
      setSection('settings_hub');
    } else {
      setSection(nextSection as AdminSection);
    }
    setIsMobileSidebarOpen(false);
    // Auto-collapse right sidebar into sleek icon rail when entering any visual/content editor
    setIsSidebarCollapsed(EDIT_FOCUS_SECTIONS.includes(nextSection as AdminSection));
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const isSuperAdmin = activeUserRole === 'super_admin';
  const effectivePerms = resolveEffectivePermissions(
    activeUserRole,
    activeUserRoleId,
    roles
  );
  const canCurrentUserUseAiSeo = canUserUseAiSeo(
    activeUserRole,
    effectivePerms,
    aiConfig
  );

  const showNotice = useCallback((type: 'success' | 'error', text: string) => {
    emitGlobalToast(type, text);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    setStatusMessage({ type, text });
    noticeTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
      noticeTimerRef.current = null;
    }, 4500);
  }, []);

  const handleQuickEditProduct = (item: SkillProduct) => {
    setProductDraft(productToDraft(item));
    handleSelectSection('editor');
  };

  const handleUseMediaInArticle = (media: MediaAssetItem) => {
    setSelectedFeaturedMedia({
      url: media.url,
      altText: media.altText || media.title,
    });
    handleSelectSection('articles_editor');
    showNotice('success', `تصویر «${media.title}» برای نوشته انتخاب شد.`);
  };

  // Compact, Short & Module-Driven Sidebar (Unified Settings + Per-Module Visibility)
  const rawSidebarGroups: SidebarCategoryGroup[] = [
    {
      id: 'sec-1',
      title: '۱. پیشخوان و آمار',
      shortTitle: 'پیشخوان',
      icon: <Activity className="w-4 h-4 text-[#1D4ED8]" />,
      items: [{ id: 'dashboard', label: 'پیشخوان و گزارش بازدید' }],
    },
    {
      id: 'sec-2',
      title: '۲. محتوا، برگه‌ها و رسانه',
      shortTitle: 'محتوا',
      icon: <FileText className="w-4 h-4 text-amber-500" />,
      items: [
        {
          id: 'articles_list',
          label: 'نوشته‌ها و مجله',
          badge: articles.length.toLocaleString('fa-IR'),
        },
        { id: 'pages_list', label: 'برگه‌های سایت' },
        {
          id: 'media_list',
          label: 'کتابخانه رسانه',
          badge: mediaItems.length.toLocaleString('fa-IR'),
        },
        { id: 'taxonomies', label: 'دسته‌بندی و برچسب' },
      ],
    },
    {
      id: 'sec-3',
      title: '۳. فروشگاه و اشتراک VIP',
      shortTitle: 'فروشگاه',
      icon: <ShoppingBag className="w-4 h-4 text-[#1D4ED8]" />,
      items: [
        {
          id: 'catalog',
          label: 'محصولات و اسکیل‌ها',
          badge: products.length.toLocaleString('fa-IR'),
        },
        { id: 'editor', label: 'افزودن محصول جدید' },
        {
          id: 'orders',
          label: 'سفارش‌ها و تخفیف‌ها',
          badge: orders.length.toLocaleString('fa-IR'),
        },
        ...(isModuleEnabled('mod_subscriptions')
          ? [{ id: 'mod_subscriptions' as AdminSection, label: 'اشتراک‌های VIP (۱ تا ۱۲ ماهه)' }]
          : []),
        ...(isModuleEnabled('mod_inventory_accounting')
          ? [{ id: 'inventory' as AdminSection, label: 'انبارداری و حسابداری' }]
          : []),
        ...(isModuleEnabled('mod_academy_suite')
          ? [{ id: 'mod_academy_suite' as AdminSection, label: 'آکادمی، دوره‌ها و شهریه' }]
          : []),
      ],
    },
    {
      id: 'sec-4',
      title: '۴. ارتباطات، CRM و رزرو',
      shortTitle: 'ارتباطات',
      icon: <MessageSquare className="w-4 h-4 text-emerald-600" />,
      items: [
        ...(isModuleEnabled('mod_live_chat')
          ? [{ id: 'messages_tickets' as AdminSection, label: 'پیام‌ها و تیکت‌های پشتیبانی' }]
          : []),
        ...(isModuleEnabled('mod_forms')
          ? [{ id: 'forms_manager' as AdminSection, label: 'فرم‌ها و فرم‌ساز' }]
          : []),
        ...(isModuleEnabled('mod_smart_crm')
          ? [{ id: 'mod_smart_crm' as AdminSection, label: 'CRM هوشمند و پیشنهاد خودکار' }]
          : []),
        ...(isModuleEnabled('mod_booking')
          ? [{ id: 'booking' as AdminSection, label: 'رزرواسیون و تقویم شمسی' }]
          : []),
      ],
    },
    {
      id: 'sec-5',
      title: '۵. نمایش، سئو و ابزارها',
      shortTitle: 'نمایش',
      icon: <Palette className="w-4 h-4 text-purple-600" />,
      items: [
        { id: 'page_builder', label: 'صفحه‌ساز بصری' },
        { id: 'menu_builder', label: 'منوساز درختی' },
        { id: 'invoice_designer', label: 'طراح قالب فاکتور' },
        ...(isModuleEnabled('mod_seo_redirects')
          ? [{ id: 'seo_center' as AdminSection, label: 'سئو و ریدایرکت ۳۰۱' }]
          : []),
        ...(isModuleEnabled('mod_delivery_logs')
          ? [{ id: 'mod_delivery_logs' as AdminSection, label: 'لاگ یکپارچه ارسال‌ها' }]
          : []),
        ...(isModuleEnabled('mod_notifications_pwa')
          ? [{ id: 'mod_notifications_pwa' as AdminSection, label: 'وب‌پوش و اپلیکیشن PWA' }]
          : []),
        ...(isModuleEnabled('mod_announcements_popups')
          ? [{ id: 'mod_announcements_popups' as AdminSection, label: 'اطلاعیه‌ها و پاپ‌آپ‌ها' }]
          : []),
        ...(isModuleEnabled('mod_reviews_qa')
          ? [{ id: 'mod_reviews_qa' as AdminSection, label: 'دیدگاه‌ها و پرسش و پاسخ' }]
          : []),
        ...(isModuleEnabled('mod_abandoned_cart')
          ? [{ id: 'mod_abandoned_cart' as AdminSection, label: 'سبد خرید رهاشده' }]
          : []),
        ...(isModuleEnabled('mod_wallet_rma')
          ? [{ id: 'mod_wallet_rma' as AdminSection, label: 'کیف پول و مرجوعی RMA' }]
          : []),
        ...(isModuleEnabled('mod_affiliate')
          ? [{ id: 'mod_affiliate' as AdminSection, label: 'همکاری در فروش' }]
          : []),
        ...(isModuleEnabled('mod_b2b_compare')
          ? [{ id: 'mod_b2b_compare' as AdminSection, label: 'فروش عمده B2B و مقایسه' }]
          : []),
        ...(isModuleEnabled('mod_bots_webhooks')
          ? [{ id: 'mod_bots_webhooks' as AdminSection, label: 'ربات‌ها و وب‌هوک‌ها' }]
          : []),
        ...(isModuleEnabled('mod_maintenance_audit')
          ? [{ id: 'mod_maintenance_audit' as AdminSection, label: 'حالت تعمیرات و ممیزی' }]
          : []),
        ...(isModuleEnabled('mod_i18n')
          ? [{ id: 'mod_i18n' as AdminSection, label: 'چندزبانه (fa/en/ar)' }]
          : []),
        ...(isModuleEnabled('mod_ai_hub_agent')
          ? [{ id: 'mod_ai_hub_agent' as AdminSection, label: 'هاب هوش مصنوعی و ایجنت ۲۴/۷' }]
          : []),
        { id: 'super_logs', label: 'لاگ و سلامت سیستم' },
      ],
    },
    {
      id: 'sec-6',
      title: '۶. ماژول‌ها و تنظیمات سیستم',
      shortTitle: 'تنظیمات',
      icon: <Settings className="w-4 h-4 text-amber-600" />,
      items: [
        {
          id: 'modules_manager',
          label: 'مرکز ماژول‌های سایت',
          badge: siteModules.length
            ? `${siteModules.filter((m) => m.enabled).length.toLocaleString('fa-IR')}`
            : '۱۵',
        },
        { id: 'settings_hub', label: 'تنظیمات عمومی و سیستم' },
      ],
    },
  ];
  const sidebarGroups: SidebarCategoryGroup[] = rawSidebarGroups.filter((g) => g.items.length > 0);

  const enterpriseHubModes: EnterpriseHubMode[] = ['dashboard', 'general_calendar'];

  const activeSectionMeta = (() => {
    for (const g of sidebarGroups) {
      const found = g.items.find((i) => i.id === section);
      if (found) return { groupTitle: g.shortTitle, itemLabel: found.label };
    }
    if (section === 'articles_editor') {
      return { groupTitle: 'محتوا', itemLabel: 'ویرایشگر نوشته' };
    }
    if (section === 'pages_editor') {
      return { groupTitle: 'محتوا', itemLabel: 'ویرایشگر برگه' };
    }
    return { groupTitle: 'مدیریت', itemLabel: 'پیشخوان سیستم' };
  })();

  return (
    <div className="max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6 overflow-x-hidden">
      {/* Mobile Compact Hamburger Bar (< 1024px) — Zero Horizontal Scroll */}
      <div className="lg:hidden sticky top-2 z-30 flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200/90 dark:border-stone-800 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="باز کردن منوی مدیریت"
            aria-expanded={isMobileSidebarOpen}
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-[#1D4ED8]/10 hover:text-[#1D4ED8] text-stone-800 dark:text-stone-100 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-stone-500 dark:text-stone-400 truncate">
              پنل مدیریت · {activeSectionMeta.groupTitle}
            </div>
            <div className="text-xs font-black text-stone-900 dark:text-white truncate">
              {activeSectionMeta.itemLabel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <AdminGlobalChatAlarm
            enabled={isModuleEnabled('mod_live_chat')}
            compact
            onJumpToChat={(sid) => {
              if (sid) setSelectedChatSessionId(sid);
              handleSelectSection('messages_tickets');
            }}
          />
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 shrink-0 ${
              isSuperAdmin
                ? 'bg-amber-400/20 text-amber-800 dark:text-amber-300'
                : 'bg-blue-500/12 text-[#1D4ED8] dark:text-sky-300'
            }`}
          >
            {isSuperAdmin && <Crown className="w-3 h-3 shrink-0" />}
            <span>{isSuperAdmin ? 'سوپر ادمین' : 'ادمین'}</span>
          </span>
        </div>
      </div>

      {/* Mobile Slide-Over Hamburger Navigation Drawer (< 1024px) */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex justify-start"
          role="dialog"
          aria-modal="true"
          aria-label="ناوبری مدیریت"
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
        >
          {/* Translucent Backdrop */}
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            onWheel={(e) => e.preventDefault()}
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm transition-opacity"
          />

          {/* Sleek RTL Right-Aligned Drawer Sheet */}
          <div
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="relative z-10 w-[82%] max-w-[304px] h-[100dvh] rounded-l-3xl bg-white/96 dark:bg-stone-900/96 backdrop-blur-2xl border-l border-stone-200/80 dark:border-stone-800 shadow-[0_24px_60px_rgba(15,23,42,0.22)] flex flex-col overflow-hidden"
          >
            {/* Delicate Close Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="بستن منو"
              className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-stone-100/90 dark:bg-stone-800/90 text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Centered Site Logo + User Name Profile Block */}
            <div className="pt-6 pb-4 px-5 flex flex-col items-center text-center gap-2 shrink-0">
              <div className="w-13 h-13 rounded-2xl bg-slate-50 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 shadow-xs p-2 flex items-center justify-center">
                <img
                  src={themeConfig.logoUrl || '/logo-skill98.svg'}
                  alt={themeConfig.brandNameFa}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-0.5 max-w-full">
                <div className="text-[13px] font-black text-stone-900 dark:text-white truncate">
                  {activeUserName || (isSuperAdmin ? 'مدیر ارشد سیستم' : 'مدیر سیستم')}
                </div>
                <div className="text-[10.5px] font-bold text-stone-400 dark:text-stone-500 truncate">
                  {themeConfig.brandNameFa}
                </div>
              </div>
            </div>

            {/* Sleek Segmented Role Switcher */}
            <div className="px-4 pb-3.5 border-b border-stone-100 dark:border-stone-800/80 shrink-0">
              <div className="grid grid-cols-2 rounded-xl border border-stone-200/80 dark:border-stone-800 p-0.5 bg-stone-100/85 dark:bg-stone-950">
                <button
                  type="button"
                  onClick={() => onSwitchActiveRole?.('admin')}
                  className={`min-h-[34px] px-2 py-1 text-[11px] font-bold rounded-[10px] transition-all cursor-pointer ${
                    !isSuperAdmin
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
                  }`}
                >
                  پنل ادمین
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchActiveRole?.('super_admin')}
                  className={`min-h-[34px] px-2 py-1 text-[11px] font-bold rounded-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isSuperAdmin
                      ? 'bg-amber-400/95 text-stone-950 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
                  }`}
                >
                  <Crown className="w-3 h-3" />
                  <span>سوپر ادمین</span>
                </button>
              </div>
            </div>

            {/* Independently Scrollable Vertical Menu Groups (Isolated from Lenis) */}
            <div
              data-lenis-prevent
              data-lenis-prevent-wheel
              data-lenis-prevent-touch
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar px-3.5 py-3.5 pb-8 space-y-3.5"
            >
              {sidebarGroups.map((group) => (
                <div
                  key={group.id}
                  className="pb-3 border-b last:border-b-0 border-stone-100 dark:border-stone-800/70 space-y-1"
                >
                  <div className="px-2 py-0.5 text-[10.5px] font-bold text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
                    <span className="opacity-85 scale-90">{group.icon}</span>
                    <span>{group.title}</span>
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = section === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (item.id === 'editor') {
                              setProductDraft(createEmptyProductDraft());
                            }
                            handleSelectSection(item.id);
                          }}
                          className={`relative w-full min-h-[38px] flex items-center justify-between px-3 py-1.5 rounded-xl text-[12px] transition-all cursor-pointer ${
                            active
                              ? 'bg-[#1D4ED8]/10 dark:bg-sky-400/15 text-[#1D4ED8] dark:text-sky-300 font-extrabold'
                              : 'text-stone-700 dark:text-stone-300 font-semibold hover:bg-stone-100/80 dark:hover:bg-stone-800/70'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {active && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] dark:bg-sky-400 shrink-0" />
                            )}
                            <span className="truncate">{item.label}</span>
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md smooth-nums tabular-nums shrink-0 ${
                                active
                                  ? 'bg-[#1D4ED8]/15 text-[#1D4ED8] dark:text-sky-300 font-extrabold'
                                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop CMS Header & Role Switcher (lg+) */}
      <div className="hidden lg:flex lg:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
            <span className={accentTextClass}>
              هسته مدیریت محتوا و فروشگاه ماژولار (Skill98 Core Engine v2.7.0)
            </span>
            <span className="text-stone-400">/</span>
            <span
              className={`px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                isSuperAdmin
                  ? 'bg-amber-400/20 text-amber-800 dark:text-amber-300'
                  : 'bg-blue-500/15 text-[#1D4ED8] dark:text-sky-300'
              }`}
            >
              {isSuperAdmin ? (
                <>
                  <Crown className="w-3.5 h-3.5" />
                  <span>سطح فعال: سوپر ادمین (دسترسی کل)</span>
                </>
              ) : (
                <span>سطح فعال: ادمین محتوا و فروشگاه</span>
              )}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight">
            پیشخوان ماژولار مدیریت محتوا، هوش مصنوعی ۲۴/۷ و فروشگاه
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {/* Global Live Chat Alarm Bell (Visible on ALL Admin Pages) */}
          <AdminGlobalChatAlarm
            enabled={isModuleEnabled('mod_live_chat')}
            onJumpToChat={(sid) => {
              if (sid) setSelectedChatSessionId(sid);
              handleSelectSection('messages_tickets');
            }}
          />
          {/* Desktop Sidebar Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="inline-flex min-h-[40px] px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-[#1D4ED8] text-xs font-extrabold text-stone-700 dark:text-stone-200 items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            title={isSidebarCollapsed ? 'باز کردن کامل منوی سمت راست' : 'جمع کردن منوی سمت راست به حالت آیکون'}
          >
            {isSidebarCollapsed ? (
              <>
                <PanelRightOpen className="w-4 h-4 text-[#1D4ED8]" />
                <span>باز کردن منو</span>
              </>
            ) : (
              <>
                <PanelRightClose className="w-4 h-4 text-stone-500" />
                <span>حالت تمرکز (جمع‌کردن منو)</span>
              </>
            )}
          </button>

          <div className="inline-flex rounded-xl border border-stone-200 dark:border-stone-800 p-1 bg-stone-100 dark:bg-stone-950">
            <button
              type="button"
              onClick={() => onSwitchActiveRole?.('admin')}
              className={`min-h-[38px] px-3.5 py-2 text-xs font-extrabold rounded-lg transition-colors cursor-pointer ${
                !isSuperAdmin
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              نمای پنل ادمین
            </button>
            <button
              type="button"
              onClick={() => onSwitchActiveRole?.('super_admin')}
              className={`min-h-[38px] px-3.5 py-2 text-xs font-extrabold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSuperAdmin
                  ? 'bg-amber-400 text-stone-950 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>سوپر ادمین</span>
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-bold ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs underline cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* Desktop Auto-Collapsible Right Sidebar (Icon-Only Rail in Edit Mode) + Full-Width Workspace */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <aside
          className={`hidden lg:block lg:sticky lg:top-20 shrink-0 transition-all duration-300 border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 shadow-sm ${
            isSidebarCollapsed ? 'lg:w-[68px] p-2 space-y-2' : 'lg:w-[272px] p-3.5 space-y-3'
          }`}
        >
          {/* Sidebar Rail Header Toggle */}
          <div
            className={`hidden lg:flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between px-2'
            } pb-2 border-b border-stone-100 dark:border-stone-800`}
          >
            {!isSidebarCollapsed && (
              <span className="text-[11px] font-extrabold text-stone-500">
                منوی ۱۰ بخشی سیستم
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={isSidebarCollapsed ? 'باز کردن منوی کامل' : 'جمع کردن به ریل آیکون'}
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-[#1D4ED8] transition-colors cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <PanelRightOpen className="w-4 h-4" />
              ) : (
                <PanelRightClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {isSidebarCollapsed ? (
            /* Compact Icon-Only Rail for Maximum Editor Workspace */
            <div className="hidden lg:flex flex-col items-center gap-1.5">
              {sidebarGroups.map((group) => {
                const isGroupActive = group.items.some((i) => i.id === section);
                const primaryItem = group.items[0];
                return (
                  <button
                    key={group.id}
                    type="button"
                    title={`${group.title} — کلیک برای باز کردن`}
                    onClick={() => {
                      if (isGroupActive) {
                        setIsSidebarCollapsed(false);
                      } else if (primaryItem) {
                        handleSelectSection(primaryItem.id);
                      }
                    }}
                    className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isGroupActive
                        ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-sm ring-2 ring-[#1D4ED8]/30'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span className={isGroupActive ? '[&_svg]:text-current' : ''}>
                      {group.icon}
                    </span>
                    {isGroupActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] absolute -right-1 top-1/2 -translate-y-1/2" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Full Expanded Sidebar (always visible on mobile drawer or when expanded on desktop) */}
          <div className={isSidebarCollapsed ? 'lg:hidden space-y-3' : 'space-y-3'}>
            {sidebarGroups.map((group) => (
              <div
                key={group.id}
                className="pb-2.5 border-b last:border-b-0 border-stone-100 dark:border-stone-800/80 space-y-1"
              >
                <div className="px-2.5 py-1 text-[11px] font-extrabold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  {group.icon}
                  <span>{group.title}</span>
                </div>
                <div className="space-y-0.5 pr-2">
                  {group.items.map((item) => {
                    const active = section === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (item.id === 'editor') {
                            setProductDraft(createEmptyProductDraft());
                          }
                          handleSelectSection(item.id);
                        }}
                        className={`w-full min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          active
                            ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-500/15 smooth-nums tabular-nums shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Active Panel Content (Expands smoothly to full available width when sidebar is collapsed) */}
        <div className="flex-1 w-full space-y-6 min-w-0">
          {enterpriseHubModes.includes(section as EnterpriseHubMode) && (
            <EnterpriseCoreHubPanel
              mode={section as EnterpriseHubMode}
              products={products}
              articles={articles}
              orders={orders}
              mediaItems={mediaItems}
              themeConfig={themeConfig}
              accentButtonClass={accentButtonClass}
              onNavigateSection={(sec) => handleSelectSection(sec as AdminSection)}
              onNotice={showNotice}
            />
          )}

          {section === 'dashboard' && (
            <NativeAnalyticsGscPanel onNotice={showNotice} />
          )}

          {section === 'booking' && (
            <SolarBookingAutoBackupPanel mode="booking" onNotice={showNotice} />
          )}

          {section === 'taxonomies' && (
            <TaxonomiesManagerPanel
              accentButtonClass={accentButtonClass}
              onNotice={showNotice}
            />
          )}

          {(section === 'pages_list' || section === 'pages_editor') && (
            <PagesManagerPanel
              subView={section === 'pages_editor' ? 'editor' : 'list'}
              onChangeSubView={(next) =>
                handleSelectSection(next === 'editor' ? 'pages_editor' : 'pages_list')
              }
              products={products}
              accentButtonClass={accentButtonClass}
              onPreviewPageInStorefront={onOpenDynamicPage}
              onPagesChanged={onRefreshFromServer}
              onNotice={showNotice}
            />
          )}

          {(section === 'menu_builder' || section === 'invoice_designer') && (
            <MenuBuilderInvoicePanel
              initialMode={section}
              products={products}
              articles={articles}
              accentButtonClass={accentButtonClass}
              onMenusChanged={onRefreshFromServer}
              onNotice={showNotice}
            />
          )}

          {(section === 'catalog' || section === 'editor') && (
            <CatalogEditorPanel
              mode={section}
              products={products}
              mediaItems={mediaItems}
              draft={productDraft}
              onChangeDraft={setProductDraft}
              onSwitchSection={(s) => handleSelectSection(s)}
              onSaveProduct={onSaveProduct}
              onDeleteProduct={onDeleteProduct}
              onSeedCatalog={onSeedCatalog}
              themeConfig={themeConfig}
              aiConfig={aiConfig}
              canCurrentUserUseAiSeo={canCurrentUserUseAiSeo}
              accentButtonClass={accentButtonClass}
              onRefreshFromServer={onRefreshFromServer}
              onNotice={showNotice}
            />
          )}

          {section === 'page_builder' && (
            <PageBuilderPanel
              themeConfig={themeConfig}
              products={products}
              accentButtonClass={accentButtonClass}
              onUpdateTheme={onUpdateTheme}
              onQuickEditProduct={handleQuickEditProduct}
              onNotice={showNotice}
            />
          )}

          {(section === 'media_list' || section === 'media_editor') && (
            <MediaLibraryPanel
              subView={section === 'media_editor' ? 'editor' : 'list'}
              onChangeSubView={(sub) =>
                handleSelectSection(sub === 'editor' ? 'media_editor' : 'media_list')
              }
              mediaItems={mediaItems}
              aiConfig={aiConfig}
              canCurrentUserUseAiSeo={canCurrentUserUseAiSeo}
              accentButtonClass={accentButtonClass}
              onSaveMediaItem={onSaveMediaItem}
              onDeleteMediaItem={onDeleteMediaItem}
              onUseMediaInArticle={handleUseMediaInArticle}
              onRefreshFromServer={onRefreshFromServer}
              onNotice={showNotice}
            />
          )}

          {(section === 'articles_list' ||
            section === 'articles_editor' ||
            section === 'seo_center') && (
            <ArticlesSeoPanel
              mode={section === 'seo_center' ? 'seo_center' : 'articles'}
              subView={section === 'articles_editor' ? 'editor' : 'list'}
              onChangeSubView={(sub) =>
                handleSelectSection(
                  sub === 'editor' ? 'articles_editor' : 'articles_list'
                )
              }
              articles={articles}
              products={products}
              mediaItems={mediaItems}
              aiConfig={aiConfig}
              canCurrentUserUseAiSeo={canCurrentUserUseAiSeo}
              accentButtonClass={accentButtonClass}
              selectedFeaturedMedia={selectedFeaturedMedia}
              onClearSelectedFeaturedMedia={() =>
                setSelectedFeaturedMedia(null)
              }
              onSaveArticle={onSaveArticle}
              onDeleteArticle={onDeleteArticle}
              onOpenMediaLibrary={() => handleSelectSection('media_list')}
              onOptimizeProductSeo={handleQuickEditProduct}
              onRefreshFromServer={onRefreshFromServer}
              onNotice={showNotice}
            />
          )}

          {section === 'orders' && (
            <OrdersCouponsPanel
              orders={orders}
              coupons={coupons}
              accentButtonClass={accentButtonClass}
              onSaveCoupon={onSaveCoupon}
              onDeleteCoupon={onDeleteCoupon}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onRefreshFromServer={onRefreshFromServer}
              onNotice={showNotice}
            />
          )}

          {section === 'super_users' && (
            <UsersDirectoryPanel
              roles={roles}
              onNotice={showNotice}
              onUsersChanged={onRefreshFromServer}
            />
          )}

          {section === 'super_rbac' && (
            <RbacPermissionsPanel
              roles={roles}
              canManageUsers={
                isSuperAdmin || Boolean(effectivePerms.canManageUsers)
              }
              onUpdateRoles={onUpdateRoles}
              onGoToUsers={() => setSection('super_users')}
              onNotice={showNotice}
            />
          )}

          {section === 'inventory' && (
            <InventoryAccountingPanel onNotice={showNotice} />
          )}

          {(section === 'messages_tickets' || section === 'forms_chat') && (
            <GoftinoOperatorInboxPanel
              initialSessionId={selectedChatSessionId}
              onNotice={showNotice}
            />
          )}

          {section === 'forms_manager' && (
            <FormsManagerPanel onNotice={showNotice} />
          )}

          {(section === 'seo_center' || section === 'redirects_seo') && (
            <Phase6EnterpriseSuitePanel onNotice={showNotice} />
          )}

          {section === 'super_gateways' && (
            <div className="space-y-8">
              <PayzitoPaymentHubPanel onNotice={showNotice} />
              <PaymentGatewaysPanel
                gateways={gateways}
                displayConfig={
                  paymentDisplayConfig || DEFAULT_PAYMENT_DISPLAY_CONFIG
                }
                onUpdateGateways={onUpdateGateways}
                onUpdateDisplayConfig={(nextCfg) =>
                  onUpdatePaymentDisplayConfig?.(nextCfg)
                }
                onNotice={showNotice}
              />
            </div>
          )}

          {section === 'super_sms' && (
            <SmsTriggersPanel onNotice={showNotice} />
          )}

          {section === 'super_backup' && (
            <div className="space-y-8">
              <SolarBookingAutoBackupPanel mode="auto_backup" onNotice={showNotice} />
              <DbBackupPanel
                onNotice={showNotice}
                onDataRestored={onRefreshFromServer}
              />
            </div>
          )}

          {section === 'super_logs' && (
            <LogsDiagnosticsPanel onNotice={showNotice} />
          )}

          {section === 'modules_manager' && (
            <ModulesControlCenterPanel
              modules={siteModules}
              onChangeModules={setSiteModules}
              onOpenModuleTarget={(target) => handleSelectSection(target)}
              onNotice={showNotice}
            />
          )}

          {section === 'settings_hub' && (
            <UnifiedSettingsHubPanel
              initialTab={settingsHubTab}
              isSuperAdmin={isSuperAdmin}
              canManageUsers={
                isSuperAdmin || Boolean(effectivePerms.canManageUsers)
              }
              products={products}
              articles={articles}
              orders={orders}
              mediaItems={mediaItems}
              themeConfig={themeConfig}
              aiConfig={aiConfig}
              otpConfig={otpConfig}
              roles={roles}
              sessions={sessions}
              paymentGateways={gateways}
              paymentDisplayConfig={
                paymentDisplayConfig || DEFAULT_PAYMENT_DISPLAY_CONFIG
              }
              accentButtonClass={accentButtonClass}
              onUpdateThemeConfig={onUpdateTheme}
              onSaveThemeNow={onSaveThemeNow}
              onUpdateAiConfig={onUpdateAiConfig}
              onUpdateOtpConfig={onUpdateOtpConfig}
              onUpdateRoles={onUpdateRoles}
              onRevokeSession={onRevokeSession}
              onUpdateGateways={onUpdateGateways}
              onUpdatePaymentDisplayConfig={(nextCfg) =>
                onUpdatePaymentDisplayConfig?.(nextCfg)
              }
              onNavigateSection={(sec) => handleSelectSection(sec)}
              onRefreshFromServer={onRefreshFromServer}
              onNotice={showNotice}
            />
          )}

          {section === 'mod_subscriptions' && (
            <SubscriptionsAdminPanel onNotice={showNotice} />
          )}

          {section === 'mod_smart_crm' && (
            <SmartCrmAdminPanel onNotice={showNotice} />
          )}

          {section === 'mod_academy_suite' && (
            <AcademySuiteAdminPanel onNotice={showNotice} />
          )}

          {section === 'mod_delivery_logs' && (
            <DeliveryLogsPanel onNotice={showNotice} />
          )}

          {section === 'mod_notifications_pwa' && (
            <NotificationsPwaPanel onNotice={showNotice} />
          )}

          {section === 'mod_abandoned_cart' && (
            <AbandonedCartPanel onNotice={showNotice} />
          )}

          {section === 'mod_announcements_popups' && (
            <AnnouncementsPopupsPanel onNotice={showNotice} />
          )}

          {section === 'mod_reviews_qa' && (
            <ReviewsQaPanel onNotice={showNotice} />
          )}

          {section === 'mod_wallet_rma' && (
            <WalletRmaPanel onNotice={showNotice} />
          )}

          {section === 'mod_affiliate' && (
            <AffiliatePanel onNotice={showNotice} />
          )}

          {section === 'mod_b2b_compare' && (
            <B2bComparePanel onNotice={showNotice} />
          )}

          {section === 'mod_bots_webhooks' && (
            <BotsWebhooksPanel onNotice={showNotice} />
          )}

          {section === 'mod_maintenance_audit' && (
            <MaintenanceAuditPanel onNotice={showNotice} />
          )}

          {section === 'mod_i18n' && (
            <I18nPanel onNotice={showNotice} />
          )}

          {section === 'mod_ai_hub_agent' && (
            <AiHubAgentPanel isSuperAdmin={isSuperAdmin} onNotice={showNotice} />
          )}

          {(section === 'super_ai' ||
            section === 'super_sessions' ||
            section === 'super_theme') && (
            <AiSessionsThemePanel
              mode={section}
              aiConfig={aiConfig}
              sessions={sessions}
              otpConfig={otpConfig}
              themeConfig={themeConfig}
              isSuperAdmin={isSuperAdmin}
              onUpdateAiConfig={onUpdateAiConfig}
              onRevokeSession={onRevokeSession}
              onUpdateOtpConfig={onUpdateOtpConfig}
              onUpdateTheme={onUpdateTheme}
              onSaveThemeNow={onSaveThemeNow}
              onGoToSms={() => handleSelectSection('settings_hub:sms')}
              onRefreshFromServer={onRefreshFromServer}
              onNotice={showNotice}
            />
          )}
        </div>
      </div>
    </div>
  );
};
