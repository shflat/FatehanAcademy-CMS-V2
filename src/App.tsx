import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import type {
  ActiveTab,
  AiEngineConfig,
  CartItem,
  CatalogFilter,
  CmsDynamicPage,
  CmsRoleDefinition,
  CmsSessionRecord,
  CouponRule,
  MediaAssetItem,
  OrderRecord,
  OtpSecurityConfig,
  PaymentDisplayConfig,
  PaymentGatewayId,
  PaymentGatewayOption,
  SkillArticle,
  SkillProduct,
  ThemeConfig,
  UserRoleType,
} from './core/types';
import {
  apiFetch,
  apiJson,
  emitGlobalToast,
  readStoredSession,
  syncClientBuildId,
  writeStoredSession,
} from './core/apiClient';
import { syncPageSeoHead } from './core/seoHeadManager';
import { GlobalActivityOverlay } from './components/GlobalActivityOverlay';
import {
  initSmoothScroll,
  installGlobalModalScrollLock,
  triggerBarbaGsapTransition,
  animatePageEntrance,
  scrollToTopImmediate,
  scrollToElementSmooth,
  MuuriGridController,
} from './core/motionAndDragEngine';
import {
  resolveRegisteredTheme,
  createCmsV2ApiAdapter,
} from '../themes/registry';
import {
  INITIAL_SKILL98_CATALOG,
  INITIAL_ARTICLES,
  INITIAL_COUPONS,
  INITIAL_PAYMENT_GATEWAYS,
  INITIAL_CMS_ROLES,
  INITIAL_CMS_SESSIONS,
  DEFAULT_OTP_SECURITY_CONFIG,
  DEFAULT_AI_ENGINE_CONFIG,
  DEFAULT_THEME_CONFIG,
  INITIAL_MEDIA_LIBRARY,
  DEFAULT_PAYMENT_DISPLAY_CONFIG,
} from './data/skill98Data';
import { resolveStaticImageUrl } from './data/mediaAssets';
import { getAccentStyles } from './theme/accentStyles';
import { SiteHeader } from './theme/components/SiteHeader';
import { SiteFooter } from './theme/components/SiteFooter';
import { MobileBottomNav } from './theme/components/MobileBottomNav';
import { StorefrontView } from './theme/components/StorefrontView';
import type { AuthStep } from './modules/auth/AuthModal';
import { initWebVitalsReporter } from './core/webVitalsReporter';

// Route & Modal Code Splitting (keeps initial storefront JS minimal for PageSpeed 95+)
const SingleProductView = lazy(() =>
  import('./theme/components/SingleProductView').then((m) => ({
    default: m.SingleProductView,
  }))
);
const ArticlesView = lazy(() =>
  import('./theme/components/ArticlesView').then((m) => ({
    default: m.ArticlesView,
  }))
);
const DynamicPageView = lazy(() =>
  import('./theme/components/DynamicPageView').then((m) => ({
    default: m.DynamicPageView,
  }))
);
const SkillDetailModal = lazy(() =>
  import('./modules/catalog/SkillDetailModal').then((m) => ({
    default: m.SkillDetailModal,
  }))
);
const AuthModal = lazy(() =>
  import('./modules/auth/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const CartDrawerModal = lazy(() =>
  import('./modules/cart/CartDrawerModal').then((m) => ({
    default: m.CartDrawerModal,
  }))
);
const CustomerDashboardView = lazy(() =>
  import('./modules/dashboard/CustomerDashboardView').then((m) => ({
    default: m.CustomerDashboardView,
  }))
);
const TargetGuideAndZipView = lazy(() =>
  import('./modules/guide/TargetGuideAndZipView').then((m) => ({
    default: m.TargetGuideAndZipView,
  }))
);
const AdminCmsView = lazy(() =>
  import('./modules/admin/AdminCmsView').then((m) => ({
    default: m.AdminCmsView,
  }))
);
const GoftinoLiveChatWidget = lazy(() =>
  import('../modules/mod_live_chat/GoftinoLiveChatWidget').then((m) => ({
    default: m.GoftinoLiveChatWidget,
  }))
);
const PWAInstallBanner = lazy(() =>
  import('../modules/mod_notifications_pwa/PWAInstallBanner').then((m) => ({
    default: m.PWAInstallBanner,
  }))
);
const StorefrontPopupsRenderer = lazy(() =>
  import('../modules/mod_announcements_popups/StorefrontPopupsRenderer').then((m) => ({
    default: m.StorefrontPopupsRenderer,
  }))
);
const SuperAdminJarvisMascot = lazy(() =>
  import('../modules/mod_ai_hub_agent/SuperAdminJarvisMascot').then((m) => ({
    default: m.SuperAdminJarvisMascot,
  }))
);

function toLatinDigits(raw: string): string {
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  let cleaned = raw;
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned
      .replace(new RegExp(persianDigits[i], 'g'), String(i))
      .replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return cleaned;
}

function normalizeIranMobile(raw: string): string {
  let cleaned = toLatinDigits(raw.trim()).replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+98')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('0098')) cleaned = '0' + cleaned.slice(4);
  cleaned = cleaned.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('989') && cleaned.length === 12) cleaned = '0' + cleaned.slice(2);
  else if (cleaned.startsWith('9') && cleaned.length === 10) cleaned = '0' + cleaned;
  return cleaned;
}

function normalizeDigits(raw: string): string {
  return toLatinDigits(raw.trim()).replace(/[^0-9]/g, '');
}

function sanitizeSlugOrId(input: string, fallback = 'item_98'): string {
  const cleaned = input
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
  return cleaned.length >= 2 ? cleaned : `${fallback}_${Date.now()}`;
}

function truncateString(val: string, minLen: number, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim();
  if (trimmed.length < minLen) return fallback.slice(0, maxLen);
  return trimmed.slice(0, maxLen);
}

const ViewSuspenseSkeleton: React.FC = () => (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-pulse min-h-[60vh]">
    <div className="h-8 w-64 rounded-xl bg-stone-200 dark:bg-slate-800" />
    <div className="h-4 w-96 max-w-full rounded-lg bg-stone-200/70 dark:bg-slate-800/70" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
      <div className="h-56 rounded-2xl bg-stone-200/60 dark:bg-slate-800/60" />
      <div className="h-56 rounded-2xl bg-stone-200/60 dark:bg-slate-800/60" />
      <div className="h-56 rounded-2xl bg-stone-200/60 dark:bg-slate-800/60" />
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('store');
  const [themeConfig, setThemeConfig] =
    useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [dynamicPages, setDynamicPages] = useState<CmsDynamicPage[]>([]);
  const [activeDynamicPage, setActiveDynamicPage] =
    useState<CmsDynamicPage | null>(null);
  const [activeProduct, setActiveProduct] = useState<SkillProduct | null>(
    () => INITIAL_SKILL98_CATALOG[0] || null
  );

  // Defer non-critical floating widgets until after initial paint
  const [widgetsReady, setWidgetsReady] = useState(false);

  // Refs for Barba.js + GSAP + Muuri Interactive Grid
  const mainContainerRef = useRef<HTMLElement | null>(null);
  const transitionOverlayRef = useRef<HTMLDivElement | null>(null);
  const dragControllerRef = useRef<MuuriGridController | null>(null);
  const [isMuuriDragEnabled, setIsMuuriDragEnabled] = useState(true);
  const [hasDisplacedLayout, setHasDisplacedLayout] = useState(false);

  useEffect(() => {
    initWebVitalsReporter();
    const idleCb = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback;
    if (typeof idleCb === 'function') {
      const id = idleCb(() => setWidgetsReady(true), { timeout: 1800 });
      return () => {
        const cancelIdle = (window as unknown as { cancelIdleCallback?: (h: number) => void })
          .cancelIdleCallback;
        cancelIdle?.(id);
      };
    }
    const timer = window.setTimeout(() => setWidgetsReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  // Auth state hydrated exclusively from live GET /api/auth/session (HttpOnly cookie) — zero localStorage
  const [googleUserInfo, setGoogleUserInfo] = useState<{
    uid: string;
    displayName: string | null;
  } | null>(null);
  const [userRole, setUserRole] = useState<UserRoleType>('guest');
  const [loggedInRoleId, setLoggedInRoleId] = useState<string>('role_customer');
  const [loggedInName, setLoggedInName] = useState<string | null>(null);
  const [loggedInPhone, setLoggedInPhone] = useState<string>('');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [simulatedSmsCodeBanner, setSimulatedSmsCodeBanner] = useState<
    string | null
  >(null);
  const [pendingActionAfterAuth, setPendingActionAfterAuth] = useState<
    | { type: 'checkout' }
    | { type: 'claim_skill'; skill: SkillProduct }
    | null
  >(null);
  const prevAnyModalOpenRef = useRef(false);
  const isPopStateHandlingRef = useRef(false);

  // Platform State (hydrated strictly from live server DB — never cached in localStorage)
  const [localProducts, setLocalProducts] = useState<SkillProduct[]>(() =>
    INITIAL_SKILL98_CATALOG.map((p) => ({
      ...p,
      imageUrl: resolveStaticImageUrl(p.imageUrl),
    }))
  );
  const [articles, setArticles] = useState<SkillArticle[]>(() =>
    INITIAL_ARTICLES.map((a) => ({
      ...a,
      featuredImageUrl: resolveStaticImageUrl(a.featuredImageUrl),
    }))
  );
  const [activeArticle, setActiveArticle] = useState<SkillArticle | null>(() =>
    INITIAL_ARTICLES[0]
      ? {
          ...INITIAL_ARTICLES[0],
          featuredImageUrl: resolveStaticImageUrl(
            INITIAL_ARTICLES[0].featuredImageUrl
          ),
        }
      : null
  );
  const [mediaItems, setMediaItems] = useState<MediaAssetItem[]>(() =>
    INITIAL_MEDIA_LIBRARY.map((m) => ({
      ...m,
      url: resolveStaticImageUrl(m.url),
    }))
  );
  const [claimedSkillIds, setClaimedSkillIds] = useState<string[]>([]);
  const [dashboardSelectedSkillId, setDashboardSelectedSkillId] = useState<
    string | undefined
  >(undefined);
  const [coupons, setCoupons] = useState<CouponRule[]>(INITIAL_COUPONS);
  const [gateways, setGateways] = useState<PaymentGatewayOption[]>(
    INITIAL_PAYMENT_GATEWAYS
  );
  const [aiConfig, setAiConfig] = useState<AiEngineConfig>(
    DEFAULT_AI_ENGINE_CONFIG
  );
  const [cmsRoles, setCmsRoles] =
    useState<CmsRoleDefinition[]>(INITIAL_CMS_ROLES);
  const [cmsSessions, setCmsSessions] =
    useState<CmsSessionRecord[]>(INITIAL_CMS_SESSIONS);
  const [otpConfig, setOtpConfig] = useState<OtpSecurityConfig>(
    DEFAULT_OTP_SECURITY_CONFIG
  );

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // Storefront filters & Modals
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCatalogSkills, setShowAllCatalogSkills] = useState(false);
  const [selectedSkillModal, setSelectedSkillModal] =
    useState<SkillProduct | null>(null);

  // Cart & Gateway state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponRule | null>(null);
  const [couponMessage, setCouponMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [selectedGatewayId, setSelectedGatewayId] =
    useState<PaymentGatewayId>('irankish');
  const [paymentDisplayConfig, setPaymentDisplayConfig] =
    useState<PaymentDisplayConfig>(DEFAULT_PAYMENT_DISPLAY_CONFIG);
  const isDbHydratedRef = useRef(false);
  const skipNextCmsSyncRef = useRef(false);

  const [checkoutSuccessBanner, setCheckoutSuccessBanner] = useState<
    string | null
  >(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    emitGlobalToast(type, msg);
  };

  const openFreshAuthModal = () => {
    setPhoneInput('');
    setFullNameInput('');
    setOtpInput('');
    setAuthStep('phone');
    setSimulatedSmsCodeBanner(null);
    setIsAuthModalOpen(true);
  };

  // Sync live <meta name="robots"> from CMS SEO Crawl Visibility setting (default OFF -> noindex, nofollow)
  useEffect(() => {
    void apiJson<{ ok?: boolean; visibility?: { allowSearchEngines?: boolean } }>(
      '/api/v1/seo/visibility'
    )
      .then(({ ok, data }) => {
        const allowIndex = Boolean(ok && data.visibility?.allowSearchEngines);
        let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'robots';
          document.head.appendChild(meta);
        }
        meta.content = allowIndex ? 'index, follow' : 'noindex, nofollow';
      })
      .catch(() => {
        // Default safe fallback: noindex until explicitly enabled
      });
  }, []);

  // 1. Initialize Lenis Smooth Scroll + Global Modal Scroll Lock
  useEffect(() => {
    const cleanupModalLock = installGlobalModalScrollLock();
    return () => cleanupModalLock();
  }, []);

  useEffect(() => {
    if (themeConfig.enableLenisSmoothScroll === false) return;
    const { destroy } = initSmoothScroll();
    return () => destroy();
  }, [themeConfig.enableLenisSmoothScroll]);

  // 2A. Sync Dark/Light mode on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (themeConfig.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeConfig.darkMode]);

  // 2B. Sync Dynamic Favicon
  useEffect(() => {
    const favHref = themeConfig.faviconUrl || '/favicon.svg';
    let link =
      document.querySelector<HTMLLinkElement>('link#dynamic-favicon') ||
      document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.id = 'dynamic-favicon';
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = favHref;
  }, [themeConfig.faviconUrl]);

  // 2D. Hydrate Storefront & CMS State from Server Database (no localStorage caching of gateways/orders)
  const hydrateFromDatabase = async () => {
    try {
      const res = await apiFetch('/api/storefront/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.buildId === 'string') {
        syncClientBuildId(data.buildId);
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        setLocalProducts(
          data.products.map((p: SkillProduct) => ({
            ...p,
            imageUrl: resolveStaticImageUrl(p.imageUrl),
          }))
        );
      }
      if (Array.isArray(data.articles) && data.articles.length > 0) {
        const mappedArts = data.articles.map((a: SkillArticle) => ({
          ...a,
          featuredImageUrl: resolveStaticImageUrl(a.featuredImageUrl),
        }));
        setArticles(mappedArts);
        setActiveArticle((prev) =>
          prev
            ? mappedArts.find((m: SkillArticle) => m.id === prev.id) ||
              mappedArts[0]
            : mappedArts[0]
        );
      }
      if (Array.isArray(data.coupons)) setCoupons(data.coupons);
      if (Array.isArray(data.mediaItems) && data.mediaItems.length > 0) {
        setMediaItems(
          data.mediaItems.map((m: MediaAssetItem) => ({
            ...m,
            url: resolveStaticImageUrl(m.url),
          }))
        );
      }
      if (Array.isArray(data.orders) && data.orders.length > 0) {
        setOrders(data.orders);
      }
      if (Array.isArray(data.gateways) && data.gateways.length > 0) {
        setGateways(data.gateways);
      }
      if (data.paymentDisplayConfig) {
        setPaymentDisplayConfig(data.paymentDisplayConfig);
      }
      if (data.themeConfig) setThemeConfig(data.themeConfig);
      if (data.aiConfig) setAiConfig(data.aiConfig);
      if (data.otpConfig) setOtpConfig(data.otpConfig);
      if (Array.isArray(data.roles) && data.roles.length > 0) setCmsRoles(data.roles);
      if (Array.isArray(data.sessions) && data.sessions.length > 0) setCmsSessions(data.sessions);

      // Check /product/:slug URL path routing
      const currentRawPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
      if (currentRawPath.startsWith('product/')) {
        const prodSlug = currentRawPath.slice(8).toLowerCase();
        const catalogSource: SkillProduct[] =
          Array.isArray(data.products) && data.products.length > 0
            ? data.products
            : INITIAL_SKILL98_CATALOG;
        const matchedProd = catalogSource.find(
          (p) => p.slug.toLowerCase() === prodSlug || p.id.toLowerCase() === prodSlug
        );
        if (matchedProd) {
          setActiveProduct({
            ...matchedProd,
            imageUrl: resolveStaticImageUrl(matchedProd.imageUrl),
          });
          setActiveTab('product_single');
        }
      }

      // Hydrate Dynamic Pages & check URL path routing (/page/:slug or /:slug)
      try {
        const pgRes = await apiFetch('/api/v1/pages');
        if (pgRes.ok) {
          const pgData = await pgRes.json();
          if (Array.isArray(pgData.items)) {
            setDynamicPages(pgData.items);
            const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
            const cleanSlug = rawPath.startsWith('page/')
              ? rawPath.slice(5)
              : rawPath;
            if (cleanSlug && !rawPath.startsWith('product/')) {
              const matched = (pgData.items as CmsDynamicPage[]).find(
                (p) => p.slug.toLowerCase() === cleanSlug.toLowerCase()
              );
              if (matched) {
                setActiveDynamicPage(matched);
                setActiveTab('page_single');
              }
            }
          }
        }
      } catch {
        // ignore pages hydration error
      }

      skipNextCmsSyncRef.current = true;
    } catch {
      // keep initial defaults if offline
    } finally {
      isDbHydratedRef.current = true;
    }
  };

  const handleOpenDynamicPage = (page: CmsDynamicPage) => {
    setActiveDynamicPage(page);
    document.title = page.seoTitle || `${page.title} | ${themeConfig.brandNameFa}`;
    scrollToTopImmediate();
    navigateWithTransition('page_single');
  };

  const openSingleProductPage = (product: SkillProduct) => {
    setActiveProduct(product);
    document.title =
      product.seoTitle || `${product.title} | ${themeConfig.brandNameFa}`;
    try {
      window.history.pushState(
        { tab: 'product_single', productId: product.id, modalOpen: false },
        '',
        `#product/${product.slug}`
      );
    } catch {
      // ignore history error in sandboxed iframe
    }
    scrollToTopImmediate();
    navigateWithTransition('product_single', { skipHistoryPush: true });
  };

  useEffect(() => {
    void hydrateFromDatabase();
  }, []);

  // 2E. Persist Admin CMS changes back to Server Database (strictly admin-guarded)
  useEffect(() => {
    if (!isDbHydratedRef.current) return;
    if (userRole !== 'admin' && userRole !== 'super_admin') return;
    if (skipNextCmsSyncRef.current) {
      skipNextCmsSyncRef.current = false;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void apiFetch('/api/cms/state/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Silent-Activity': '1',
        },
        signal: controller.signal,
        body: JSON.stringify({
          products: localProducts,
          articles,
          coupons,
          mediaItems,
          gateways,
          themeConfig,
          aiConfig,
          otpConfig,
          roles: cmsRoles,
          sessions: cmsSessions,
        }),
      }).catch(() => {
        // Ignore aborted or transient background sync errors
      });
    }, 650);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    userRole,
    localProducts,
    articles,
    coupons,
    mediaItems,
    gateways,
    themeConfig,
    aiConfig,
    otpConfig,
    cmsRoles,
    cmsSessions,
  ]);

  const handleSaveThemeNow = async (
    nextThemeOverride?: ThemeConfig,
    successText?: string
  ) => {
    const effectiveTheme = nextThemeOverride || themeConfig;
    if (nextThemeOverride) {
      skipNextCmsSyncRef.current = true;
      setThemeConfig(nextThemeOverride);
    }
    try {
      const res = await apiFetch('/api/cms/state/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: localProducts,
          articles,
          coupons,
          mediaItems,
          gateways,
          themeConfig: effectiveTheme,
          aiConfig,
          otpConfig,
          roles: cmsRoles,
          sessions: cmsSessions,
        }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'خطا در ذخیره تنظیمات در سرور');
      }
      emitGlobalToast(
        'success',
        successText || 'تنظیمات عمومی، لوگو و پوسته با موفقیت ذخیره و اعمال شد.'
      );
    } catch (err) {
      emitGlobalToast(
        'error',
        err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات سایت'
      );
    }
  };

  // 2F. Keep in-memory session synced (zero localStorage persistence of sensitive user data)
  useEffect(() => {
    if (!loggedInPhone || userRole === 'guest') return;
    const currentStored = readStoredSession();
    writeStoredSession({
      phone: loggedInPhone,
      fullName: loggedInName || 'کاربر اسکیل ۹۸',
      userRole,
      roleId: loggedInRoleId,
      sessionToken: currentStored?.sessionToken,
    });
  }, [loggedInPhone, loggedInName, userRole, loggedInRoleId]);

  // 2G. Hydrate auth strictly from live GET /api/auth/session (HttpOnly cookie) + verify gateway callbacks
  useEffect(() => {
    let active = true;

    const clearClientAuthState = () => {
      writeStoredSession(null);
      setUserRole('guest');
      setLoggedInRoleId('role_customer');
      setLoggedInName(null);
      setLoggedInPhone('');
      setClaimedSkillIds([]);
      setOrders([]);
      setCmsSessions([]);
    };

    const restoreSessionFromServer = async () => {
      try {
        const res = await apiFetch('/api/auth/session');
        if (!active) return;

        const data = await res.json().catch(() => ({}));
        if (typeof data?.buildId === 'string') {
          if (syncClientBuildId(data.buildId)) return;
        }

        if (res.status === 401 || res.status === 403 || !res.ok || !data?.authenticated || !data?.user) {
          clearClientAuthState();
          return;
        }

        const u = data.user;
        const restoredRole: Exclude<UserRoleType, 'guest'> =
          u.role === 'super_admin'
            ? 'super_admin'
            : u.role === 'admin'
            ? 'admin'
            : 'customer';
        const resolvedRoleId = u.roleId || 'role_customer';
        const resolvedFullName = u.fullName || 'کاربر اسکیل ۹۸';

        writeStoredSession({
          phone: u.phone,
          fullName: resolvedFullName,
          userRole: restoredRole,
          roleId: resolvedRoleId,
          sessionToken: data.sessionToken ? String(data.sessionToken) : undefined,
        });

        setUserRole(restoredRole);
        setLoggedInRoleId(resolvedRoleId);
        setLoggedInName(resolvedFullName);
        setLoggedInPhone(u.phone);

        if (Array.isArray(u.claimedSkillIds)) {
          setClaimedSkillIds(u.claimedSkillIds);
        }
        if (Array.isArray(u.orders)) {
          setOrders(u.orders);
        }
        if (Array.isArray(data.sessions)) {
          setCmsSessions(data.sessions);
        }
        if (restoredRole === 'admin' || restoredRole === 'super_admin') {
          void hydrateFromDatabase();
        }
      } catch {
        if (active) clearClientAuthState();
      }
    };

    const verifyGatewayReturn = async () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get('payment_verify') !== '1') return;
        const authority =
          sp.get('Authority') || sp.get('authority') || sp.get('trackId') || '';
        const paymentStatus =
          sp.get('PaymentStatus') ||
          sp.get('Status') ||
          sp.get('success') ||
          '';
        if (!authority) return;

        const { ok, data } = await apiJson<{
          ok?: boolean;
          refId?: string;
          error?: string;
        }>('/api/payment/verify', {
          method: 'POST',
          body: JSON.stringify({
            authority,
            paymentStatus,
          }),
        });
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        if (ok && data.ok) {
          setCart([]);
          setCheckoutSuccessBanner(
            `پرداخت شما از طریق درگاه بانکی با کد پیگیری (${data.refId}) تایید و اسکیل‌ها فعال شدند!`
          );
          void restoreSessionFromServer();
          setActiveTab('dashboard');
          showToast('پرداخت تایید شد و اسکیل‌های شما آزاد شدند.');
        } else {
          showToast(
            data?.error ||
              'تراکنش پرداخت تایید نشد یا توسط کاربر لغو گردید.'
          );
        }
      } catch {
        // ignore URL parse error
      }
    };

    void restoreSessionFromServer();
    void verifyGatewayReturn();

    return () => {
      active = false;
    };
  }, []);

  // Seamless Barba.js + GSAP View Navigation with History Stack
  const navigateWithTransition = (
    nextTab: ActiveTab,
    options?: { skipHistoryPush?: boolean; articleId?: string }
  ) => {
    const applyTab = () => {
      setActiveTab(nextTab);
    };

    if (!options?.skipHistoryPush && nextTab !== activeTab) {
      try {
        window.history.pushState(
          {
            tab: nextTab,
            articleId: options?.articleId || activeArticle?.id || null,
            modalOpen: false,
          },
          '',
          `#${nextTab}`
        );
      } catch {
        // Ignore history errors in restricted sandboxes
      }
    }

    if (nextTab === activeTab) {
      scrollToTopImmediate();
      return;
    }
    if (themeConfig.enableBarbaTransitions !== false) {
      triggerBarbaGsapTransition(
        mainContainerRef.current,
        transitionOverlayRef.current,
        applyTab
      );
    } else {
      applyTab();
      scrollToTopImmediate();
    }
  };

  // Push history entry when opening any modal
  useEffect(() => {
    const anyModalOpen = Boolean(
      selectedSkillModal || isCartOpen || isAuthModalOpen
    );
    if (
      anyModalOpen &&
      !prevAnyModalOpenRef.current &&
      !isPopStateHandlingRef.current
    ) {
      try {
        window.history.pushState(
          {
            tab: activeTab,
            articleId: activeArticle?.id || null,
            modalOpen: true,
          },
          '',
          window.location.hash || `#${activeTab}`
        );
      } catch {
        // ignore
      }
    }
    prevAnyModalOpenRef.current = anyModalOpen;
  }, [selectedSkillModal, isCartOpen, isAuthModalOpen, activeTab, activeArticle]);

  // Listen to browser/mobile hardware Back button (popstate)
  useEffect(() => {
    try {
      if (!window.history.state || !window.history.state.tab) {
        window.history.replaceState(
          { tab: 'store', articleId: null, modalOpen: false },
          '',
          window.location.pathname + window.location.search
        );
      }
    } catch {
      // ignore
    }

    const handlePopState = (event: PopStateEvent) => {
      isPopStateHandlingRef.current = true;

      if (isAuthModalOpen || isCartOpen || selectedSkillModal) {
        setIsAuthModalOpen(false);
        setIsCartOpen(false);
        setSelectedSkillModal(null);
        setAuthStep('phone');
        setOtpInput('');
        setSimulatedSmsCodeBanner(null);
        setTimeout(() => {
          isPopStateHandlingRef.current = false;
        }, 60);
        return;
      }

      const targetTab = (event.state?.tab as ActiveTab) || 'store';
      if (targetTab === 'article_single' && event.state?.articleId) {
        const foundArticle = articles.find(
          (a) => a.id === event.state.articleId
        );
        if (foundArticle) setActiveArticle(foundArticle);
      }

      if (targetTab !== activeTab) {
        navigateWithTransition(targetTab, { skipHistoryPush: true });
      }

      setTimeout(() => {
        isPopStateHandlingRef.current = false;
      }, 60);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, articles, isAuthModalOpen, isCartOpen, selectedSkillModal]);

  // Active catalog from live SQL/PostgreSQL CMS database
  const activeCatalog = localProducts;

  const filteredCatalog = useMemo(() => {
    return activeCatalog.filter((item) => {
      if (item.status !== 'published' && activeTab === 'store') return false;
      if (catalogFilter === 'Claude' && item.category !== 'Claude')
        return false;
      if (catalogFilter === 'ChatGPT' && item.category !== 'ChatGPT')
        return false;
      if (catalogFilter === 'Codex' && item.category !== 'Codex') return false;
      if (catalogFilter === 'pro' && item.price === 0) return false;
      if (catalogFilter === 'bookmarked' && !bookmarkedIds.includes(item.id))
        return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.subCategory || '').toLowerCase().includes(q) ||
          item.shortDescription.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeCatalog, catalogFilter, searchQuery, activeTab, bookmarkedIds]);

  const displayedCatalog = useMemo(() => {
    if (
      showAllCatalogSkills ||
      searchQuery.trim() !== '' ||
      catalogFilter !== 'all'
    ) {
      return filteredCatalog;
    }
    return filteredCatalog.slice(0, 12);
  }, [filteredCatalog, showAllCatalogSkills, searchQuery, catalogFilter]);

  // 3A. Run GSAP Entrance on tab switch
  useEffect(() => {
    if (themeConfig.enableGsapAnimations !== false) {
      animatePageEntrance(mainContainerRef.current);
    }
  }, [activeTab, themeConfig.enableGsapAnimations]);

  // 3B. Muuri Interactive Grid Binding
  useEffect(() => {
    const muuriEnabled =
      isMuuriDragEnabled && themeConfig.enableMuuriDrag !== false;
    if (!dragControllerRef.current) {
      dragControllerRef.current = new MuuriGridController(muuriEnabled);
    } else {
      dragControllerRef.current.setEnabled(muuriEnabled);
    }
    dragControllerRef.current.setOnDisplacementChange(setHasDisplacedLayout);

    if (!muuriEnabled) {
      dragControllerRef.current.unbindAll();
      return;
    }

    const timer = setTimeout(() => {
      dragControllerRef.current?.bindContainer(mainContainerRef.current);
    }, 30);

    return () => {
      clearTimeout(timer);
      dragControllerRef.current?.unbindAll();
    };
  }, [
    activeTab,
    catalogFilter,
    filteredCatalog.length,
    isMuuriDragEnabled,
    themeConfig.enableMuuriDrag,
    themeConfig.productGridColumns,
  ]);

  useEffect(() => {
    setHasDisplacedLayout(false);
  }, [activeTab, catalogFilter]);

  useEffect(() => {
    scrollToTopImmediate();
  }, [activeTab, activeArticle?.id]);

  const handleResetDraggedElements = () => {
    dragControllerRef.current?.resetAllPositions(mainContainerRef.current);
    setHasDisplacedLayout(false);
    showToast('موقعیت تمامی کارت‌ها و المان‌ها به چیدمان استاندارد بازگشت.');
  };

  const openFullArticlePage = (article: SkillArticle) => {
    setActiveArticle(article);
    if (activeTab === 'article_single') {
      try {
        window.history.pushState(
          { tab: 'article_single', articleId: article.id, modalOpen: false },
          '',
          '#article_single'
        );
      } catch {
        // ignore
      }
      scrollToTopImmediate();
      return;
    }
    navigateWithTransition('article_single', { articleId: article.id });
  };

  // Checkout gateways show ONLY gateways that are enabled AND marked "نمایش در سایت" (showOnStorefront !== false)
  const activeGateways = useMemo(() => {
    const selectedList = gateways.filter(
      (g) => g.enabled && g.showOnStorefront !== false
    );
    if (selectedList.length === 0 && paymentDisplayConfig.enablePaymentSimulator) {
      return [
        {
          id: 'sandbox_test' as PaymentGatewayId,
          title: 'درگاه آزمایشی (سندباکس)',
          subtitle: 'پرداخت تستی و تایید خودکار تراکنش بدون کسر وجه',
          enabled: true,
          showOnStorefront: true,
          sandboxMode: true,
        },
      ];
    }
    return selectedList;
  }, [gateways, paymentDisplayConfig.enablePaymentSimulator]);

  useEffect(() => {
    if (activeGateways.length > 0) {
      if (!activeGateways.some((g) => g.id === selectedGatewayId)) {
        const preferred = activeGateways.find(
          (g) => g.id === paymentDisplayConfig.defaultGatewayId
        );
        setSelectedGatewayId(preferred ? preferred.id : activeGateways[0].id);
      }
    }
  }, [activeGateways, selectedGatewayId, paymentDisplayConfig.defaultGatewayId]);

  const accentStyles = useMemo(
    () => getAccentStyles(themeConfig.accentPreset),
    [themeConfig.accentPreset]
  );

  // Dynamic SEO Head & Structured Data (JSON-LD) Sync — keeps <meta name="robots"> untouched (default OFF)
  useEffect(() => {
    const brandFa = themeConfig.brandNameFa || 'اسکیل ۹۸';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (activeTab === 'product_single' && activeProduct) {
      syncPageSeoHead({
        title: activeProduct.seoTitle || `${activeProduct.title} | ${brandFa}`,
        description:
          activeProduct.seoDescription || activeProduct.shortDescription || themeConfig.heroSubtitle,
        canonicalPath: `/product/${activeProduct.slug}`,
        ogType: 'product',
        imageUrl: activeProduct.imageUrl,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: activeProduct.title,
          description: activeProduct.seoDescription || activeProduct.shortDescription,
          image: activeProduct.imageUrl,
          category: activeProduct.category,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'IRR',
            price: Math.max(0, Number(activeProduct.price || 0) * 10),
            availability: 'https://schema.org/InStock',
          },
        },
      });
      return;
    }
    if (activeTab === 'article_single' && activeArticle) {
      syncPageSeoHead({
        title: activeArticle.seoTitle || `${activeArticle.title} | ${brandFa}`,
        description: activeArticle.seoDescription || activeArticle.summary || themeConfig.heroSubtitle,
        canonicalPath: `/article/${activeArticle.slug}`,
        ogType: 'article',
        imageUrl: activeArticle.featuredImageUrl,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: activeArticle.title,
          description: activeArticle.seoDescription || activeArticle.summary,
          image: activeArticle.featuredImageUrl,
          author: { '@type': 'Organization', name: brandFa },
        },
      });
      return;
    }
    if (activeTab === 'page_single' && activeDynamicPage) {
      syncPageSeoHead({
        title: activeDynamicPage.seoTitle || `${activeDynamicPage.title} | ${brandFa}`,
        description: activeDynamicPage.seoDescription || themeConfig.heroSubtitle,
        canonicalPath: `/page/${activeDynamicPage.slug}`,
        ogType: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: activeDynamicPage.title,
          description: activeDynamicPage.seoDescription || themeConfig.heroSubtitle,
        },
      });
      return;
    }
    syncPageSeoHead({
      title: `${themeConfig.brandNameEn || 'Skill 98'} — ${brandFa} | پلتفرم فروشگاهی`,
      description:
        themeConfig.heroSubtitle ||
        'فروشگاه اسکیل‌های آماده برای Claude، ChatGPT و Codex همراه با مقالات آموزشی، پیشخوان کاربری و سیستم مدیریت هوشمند محتوا.',
      canonicalPath: '/',
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: brandFa,
        url: origin || '/',
      },
    });
  }, [activeTab, activeProduct, activeArticle, activeDynamicPage, themeConfig]);

  const canAccessAdmin = userRole === 'admin' || userRole === 'super_admin';

  const publishedArticles = useMemo(
    () =>
      articles.filter((a) => {
        if (a.status !== 'published') return false;
        if (!canAccessAdmin && a.id === 'art-dpatech-cms-core-pagebuilder-seo') {
          return false;
        }
        return true;
      }),
    [articles, canAccessAdmin]
  );

  const handleToggleBookmark = (skillId: string) => {
    setBookmarkedIds((prev) => {
      const exists = prev.includes(skillId);
      const next = exists
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId];
      showToast(
        exists
          ? 'اسکیل از فهرست نشان‌شده‌ها برداشته شد.'
          : 'اسکیل به فهرست نشان‌شده‌های شما اضافه شد.'
      );
      return next;
    });
  };

  const handleQuickSkillAction = (item: SkillProduct) => {
    if (item.price === 0) {
      const alreadyClaimed = claimedSkillIds.includes(item.id);
      if (alreadyClaimed) {
        setDashboardSelectedSkillId(item.id);
        navigateWithTransition('dashboard');
        showToast(
          `وارد پیشخوان کاربری شدید؛ اکنون می‌توانید فایل «${item.title}» را مطالعه یا دانلود کنید.`
        );
      } else {
        if (userRole === 'guest') {
          setPendingActionAfterAuth({ type: 'claim_skill', skill: item });
          openFreshAuthModal();
          showToast(
            'برای ثبت دائمی این فایل در سوابق شما، لطفاً شماره همراه خود را وارد و تایید نمایید.'
          );
          return;
        }
        setClaimedSkillIds((prev) =>
          prev.includes(item.id) ? prev : [...prev, item.id]
        );
        setDashboardSelectedSkillId(item.id);
        if (loggedInPhone) {
          void apiJson('/api/user/claim-skill', {
            method: 'POST',
            body: JSON.stringify({
              phone: loggedInPhone,
              skillId: item.id,
              skillTitle: item.title,
            }),
          }).catch(() => {
            // Keep optimistic local claim if background request fails
          });
        }
        showToast(
          `اسکیل «${item.title}» به حساب کاربری شما اضافه شد! اکنون روی «دانلود از پیشخوان ←» کلیک کنید.`
        );
      }
    } else {
      handleAddToCart(item);
    }
  };

  const completeVerifiedLogin = (
    role: Exclude<UserRoleType, 'guest'>,
    verifiedPhone: string,
    customDisplayName?: string,
    assignedRoleId?: string,
    sessionToken?: string
  ) => {
    const chosenName =
      fullNameInput.trim() ||
      customDisplayName ||
      (role === 'super_admin'
        ? 'مدیر ارشد سیستم'
        : role === 'admin'
        ? 'ادمین سیستم'
        : 'کاربر اسکیل ۹۸');

    const finalRoleId =
      assignedRoleId ||
      (role === 'super_admin'
        ? 'role_super_admin'
        : role === 'admin'
        ? 'role_admin'
        : 'role_customer');

    writeStoredSession({
      phone: verifiedPhone,
      fullName: chosenName,
      userRole: role,
      roleId: finalRoleId,
      sessionToken: sessionToken || readStoredSession()?.sessionToken,
    });

    setUserRole(role);
    setLoggedInRoleId(finalRoleId);
    setLoggedInName(chosenName);
    setLoggedInPhone(verifiedPhone);
    setIsAuthModalOpen(false);
    setAuthStep('phone');
    setOtpInput('');
    setSimulatedSmsCodeBanner(null);

    if (role === 'admin' || role === 'super_admin') {
      void hydrateFromDatabase();
    }

    // Hydrate user claims & persisted orders from DB
    void (async () => {
      try {
        const res = await apiFetch(
          `/api/user/profile?phone=${encodeURIComponent(verifiedPhone)}`
        );
        if (res.ok) {
          const prof = await res.json();
          if (
            Array.isArray(prof.claimedSkillIds) &&
            prof.claimedSkillIds.length > 0
          ) {
            setClaimedSkillIds((prev) =>
              Array.from(new Set([...prev, ...prof.claimedSkillIds]))
            );
          }
          if (Array.isArray(prof.orders) && prof.orders.length > 0) {
            setOrders((prev) => {
              const ids = new Set(prev.map((o) => o.id));
              const merged = prof.orders.filter(
                (o: OrderRecord) => !ids.has(o.id)
              );
              return [...merged, ...prev];
            });
          }
        }
      } catch {
        // ignore offline
      }
    })();

    if (pendingActionAfterAuth?.type === 'claim_skill') {
      const skillToClaim = pendingActionAfterAuth.skill;
      setClaimedSkillIds((prev) =>
        prev.includes(skillToClaim.id) ? prev : [...prev, skillToClaim.id]
      );
      setDashboardSelectedSkillId(skillToClaim.id);
      setPendingActionAfterAuth(null);
      void apiJson('/api/user/claim-skill', {
        method: 'POST',
        body: JSON.stringify({
          phone: verifiedPhone,
          skillId: skillToClaim.id,
          skillTitle: skillToClaim.title,
        }),
      }).catch(() => {
        // Keep optimistic local claim
      });
      showToast(
        `${chosenName} عزیز، اسکیل «${skillToClaim.title}» در حساب شما (${verifiedPhone}) ثبت شد!`
      );
      return;
    }

    if (pendingActionAfterAuth?.type === 'checkout') {
      setPendingActionAfterAuth(null);
      setIsCartOpen(true);
      showToast(
        `${chosenName} عزیز، شماره همراه شما تایید شد. اکنون می‌توانید تسویه‌حساب خود را تکمیل کنید.`
      );
      return;
    }

    showToast(
      role === 'customer'
        ? `${chosenName} عزیز خوش آمدید! سوابق و پیشخوان کاربری شما فعال شد.`
        : 'ورود مدیریت تایید شد! منوهای «پیشخوان من» و «مدیریت سیستم» فعال شدند.'
    );
  };

  const handleGoogleLogin = async () => {
    try {
      // Lazy-load Firebase Auth ONLY when user clicks Google Login (zero bundle/network overhead on storefront!)
      const [{ signInWithPopup }, { auth, googleProvider }] = await Promise.all([
        import('firebase/auth'),
        import('./firebase'),
      ]);
      const cred = await signInWithPopup(auth, googleProvider);
      setGoogleUserInfo({
        uid: cred.user.uid,
        displayName: cred.user.displayName,
      });
      const idToken = await cred.user.getIdToken();
      const { ok, data } = await apiJson<{
        authenticated?: boolean;
        sessionToken?: string;
        user?: {
          phone: string;
          fullName: string;
          role: Exclude<UserRoleType, 'guest'>;
          roleId: string;
        };
      }>('/api/auth/google-session', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });

      if (ok && data?.authenticated && data?.user) {
        completeVerifiedLogin(
          data.user.role,
          data.user.phone,
          data.user.fullName,
          data.user.roleId,
          data.sessionToken
        );
        return;
      }
      setIsAuthModalOpen(false);
      showToast('ورود با حساب گوگل انجام شد و پیشخوان کاربری فعال گردید.');
    } catch {
      showToast(
        'امکان ورود با گوگل در شبکه فعلی وجود ندارد. لطفاً با شماره موبایل وارد شوید.',
        'error'
      );
    }
  };

  const dispatchSmsOtpForPhone = async (normalizedPhone: string) => {
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        smsPreviewCode?: string;
        message?: string;
      }>('/api/sms/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: normalizedPhone,
          smsProvider: otpConfig.smsProvider,
          patternCode: otpConfig.patternCode,
        }),
      });
      if (!ok) {
        showToast(data.error || 'خطا در ارسال کد تایید.');
        return false;
      }
      setAuthStep('code');
      setSimulatedSmsCodeBanner(null);
      showToast(data.message || 'کد تایید به شماره همراه شما ارسال شد.');
      return true;
    } catch {
      showToast('خطا در برقراری ارتباط با سرور پیامک. لطفاً دوباره تلاش کنید.');
      return false;
    }
  };

  const handlePhoneLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthSubmitting) return;
    const normalizedPhone = normalizeIranMobile(phoneInput);

    if (authStep === 'phone') {
      if (!/^09\d{9}$/.test(normalizedPhone)) {
        showToast(
          'لطفاً شماره موبایل را با فرمت صحیح ۱۱ رقمی (مانند 09123456789) وارد کنید.'
        );
        return;
      }
      setPhoneInput(normalizedPhone);
      setIsAuthSubmitting(true);
      try {
        let existsInDb = false;
        let requiresMasterCode = false;
        let savedName = '';

        try {
          const checkRes = await apiJson<{
            exists?: boolean;
            requiresMasterCode?: boolean;
            fullName?: string | null;
          }>('/api/auth/check-phone', {
            method: 'POST',
            body: JSON.stringify({ phone: normalizedPhone }),
          });
          if (checkRes.ok) {
            requiresMasterCode = Boolean(checkRes.data.requiresMasterCode);
            if (checkRes.data.exists) {
              existsInDb = true;
              if (checkRes.data.fullName) {
                savedName = String(checkRes.data.fullName);
              }
            }
          }
        } catch {
          // Check local returning profile fallback below
        }

        if (requiresMasterCode) {
          setSimulatedSmsCodeBanner(null);
          setOtpInput('');
          setAuthStep('master_code');
          showToast('شماره مدیریت شناسایی شد. لطفاً کد مستر را وارد کنید.');
          return;
        }

        if (existsInDb) {
          if (savedName) setFullNameInput(savedName);
          await dispatchSmsOtpForPhone(normalizedPhone);
        } else {
          setFullNameInput('');
          setAuthStep('register_name');
        }
      } finally {
        setIsAuthSubmitting(false);
      }
      return;
    }

    if (authStep === 'register_name') {
      if (!fullNameInput.trim() || fullNameInput.trim().length < 2) {
        showToast('لطفاً نام و نام خانوادگی خود را وارد کنید.');
        return;
      }
      setIsAuthSubmitting(true);
      try {
        await dispatchSmsOtpForPhone(normalizedPhone);
      } finally {
        setIsAuthSubmitting(false);
      }
      return;
    }

    // Verify OTP or Hashed Admin Master Code via server
    const cleanCode =
      authStep === 'master_code'
        ? toLatinDigits(otpInput).trim()
        : normalizeDigits(otpInput);
    if (!cleanCode || cleanCode.length < 4) {
      showToast(
        authStep === 'master_code'
          ? 'لطفاً کد مستر امنیتی را به صورت کامل وارد کنید.'
          : 'لطفاً کد تایید را به صورت کامل وارد کنید.'
      );
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        role?: string;
        roleId?: string;
        displayName?: string;
        sessionToken?: string;
        sessions?: CmsSessionRecord[];
      }>('/api/sms/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: normalizedPhone,
          code: cleanCode,
          fullName: fullNameInput.trim() || undefined,
        }),
      });
      if (!ok) {
        showToast(data.error || 'کد واردشده نامعتبر است.');
        return;
      }
      const assignedRole: Exclude<UserRoleType, 'guest'> =
        data.role === 'super_admin'
          ? 'super_admin'
          : data.role === 'admin'
          ? 'admin'
          : 'customer';
      if (Array.isArray(data.sessions)) {
        setCmsSessions(data.sessions);
      }
      completeVerifiedLogin(
        assignedRole,
        normalizedPhone,
        fullNameInput.trim() || data.displayName || undefined,
        typeof data.roleId === 'string' ? data.roleId : undefined,
        typeof data.sessionToken === 'string' ? data.sessionToken : undefined
      );
    } catch {
      showToast('خطا در برقراری ارتباط با سرور برای بررسی کد.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (googleUserInfo) {
      try {
        const [{ signOut }, { auth }] = await Promise.all([
          import('firebase/auth'),
          import('./firebase'),
        ]);
        await signOut(auth);
      } catch {
        // Ignore Firebase signOut failure
      }
      setGoogleUserInfo(null);
    }
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout request error
    }
    writeStoredSession(null);
    setUserRole('guest');
    setLoggedInRoleId('role_customer');
    setLoggedInName(null);
    setLoggedInPhone('');
    setPhoneInput('');
    setFullNameInput('');
    setOtpInput('');
    setAuthStep('phone');
    setSimulatedSmsCodeBanner(null);
    setPendingActionAfterAuth(null);
    setClaimedSkillIds([]);
    setBookmarkedIds([]);
    setOrders([]);
    setCmsSessions([]);
    setDashboardSelectedSkillId(undefined);
    if (activeTab === 'dashboard' || activeTab === 'admin') {
      navigateWithTransition('store');
    }
    showToast('از حساب کاربری خارج شدید.');
  };

  // Cart & Coupon Logic
  const handleAddToCart = (product: SkillProduct) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSelectedSkillModal(null);
    setCouponMessage(null);
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const cartSubtotalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const cartTotalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || cartSubtotalAmount === 0) return 0;
    return Math.round(
      (cartSubtotalAmount * appliedCoupon.discountPercent) / 100
    );
  }, [appliedCoupon, cartSubtotalAmount]);

  const cartFinalPayable = useMemo(
    () => Math.max(0, cartSubtotalAmount - discountAmount),
    [cartSubtotalAmount, discountAmount]
  );

  const handleApplyCouponCode = (codeToApply?: string) => {
    const rawCode = (codeToApply ?? couponInput).trim().toUpperCase();
    if (!rawCode) {
      setCouponMessage({ type: 'error', text: 'لطفاً کد تخفیف را وارد کنید.' });
      return;
    }

    const found = coupons.find(
      (c) => c.code.toUpperCase() === rawCode && c.active
    );
    if (!found) {
      setAppliedCoupon(null);
      setCouponMessage({
        type: 'error',
        text: 'کد تخفیف واردشده معتبر نیست یا منقضی شده است.',
      });
      return;
    }

    setCouponInput(found.code);
    setAppliedCoupon(found);
    setCouponMessage({
      type: 'success',
      text: `کد تخفیف ${found.code} (${found.discountPercent.toLocaleString('fa-IR')}٪ تخفیف - ${found.description}) اعمال شد.`,
    });
  };

  const handleCompleteCheckout = async () => {
    if (cart.length === 0) return;

    if (userRole === 'guest') {
      setPendingActionAfterAuth({ type: 'checkout' });
      openFreshAuthModal();
      showToast(
        'برای ثبت سفارش و ماندگاری سوابق خرید، لطفاً ابتدا با شماره موبایل و کد تایید وارد شوید.'
      );
      return;
    }

    if (activeGateways.length === 0) {
      showToast(
        'در حال حاضر هیچ درگاه پرداختی فعال نیست. لطفاً از بخش مدیریت درگاه شاپرک را فعال نمایید.'
      );
      return;
    }

    const selectedGw =
      activeGateways.find((g) => g.id === selectedGatewayId) || activeGateways[0];
    const orderId = `ord_${Date.now()}`;
    let gatewayRef = `SHP-${Date.now().toString().slice(-6)}`;
    let livePaymentRedirectUrl = '';
    let liveAuthority = '';

    try {
      const { data: paymentData } = await apiJson<{
        referenceId?: string;
        gatewayMode?: string;
        paymentUrl?: string;
        authority?: string;
      }>('/api/payment/request', {
        method: 'POST',
        body: JSON.stringify({
          gatewayId: selectedGw.id,
          merchantId: selectedGw?.merchantId,
          terminalId: selectedGw?.terminalId,
          amountToman: cartFinalPayable,
          buyerPhone: loggedInPhone || undefined,
          orderId,
          description: `خرید از ${themeConfig.brandNameFa} (${loggedInPhone})`,
          itemsCount: cartTotalItems,
        }),
      });
      if (paymentData.referenceId) {
        gatewayRef = String(paymentData.referenceId);
      }
      if (paymentData.gatewayMode === 'live_api' && paymentData.paymentUrl) {
        livePaymentRedirectUrl = String(paymentData.paymentUrl);
        liveAuthority = String(paymentData.authority || '');
      }
    } catch {
      // Fallback reference id
    }

    const summary = truncateString(
      cart.map((c) => `${c.product.title} (${c.quantity}×)`).join(' + '),
      2,
      500,
      'سفارش اسکیل ۹۸'
    );

    if (
      livePaymentRedirectUrl &&
      !paymentDisplayConfig.enablePaymentSimulator
    ) {
      const buyerDisplay =
        loggedInName || googleUserInfo?.displayName || 'خریدار اسکیل ۹۸';
      const purchasedIds = cart.map((c) => c.product.id);
      try {
        await apiJson('/api/orders/create', {
          method: 'POST',
          body: JSON.stringify({
            id: orderId,
            phone: loggedInPhone || googleUserInfo?.uid || 'customer_98',
            buyerName: buyerDisplay,
            totalAmount: cartFinalPayable,
            discountAmount,
            couponCode: appliedCoupon?.code,
            itemsSummary: `${summary} · در انتظار پرداخت (${selectedGw.title})`,
            itemsCount: Math.min(100, cartTotalItems),
            paymentMethod: selectedGw.id,
            gatewayRef: liveAuthority || gatewayRef,
            status: 'pending',
            skillIds: purchasedIds,
          }),
        });
      } catch {
        // Proceed to redirect even if background log fails
      }
      window.location.assign(livePaymentRedirectUrl);
      return;
    }

    const newLocalOrder: OrderRecord = {
      id: orderId,
      buyerId: loggedInPhone || googleUserInfo?.uid || 'customer_98',
      buyerName:
        loggedInName || googleUserInfo?.displayName || 'خریدار اسکیل ۹۸',
      totalAmount: cartFinalPayable,
      discountAmount,
      couponCode: appliedCoupon?.code,
      itemsSummary: `${summary} · کد پیگیری شاپرک: ${gatewayRef}`,
      itemsCount: Math.min(100, cartTotalItems),
      paymentMethod: selectedGw.id,
      status: 'paid',
      createdAtLabel: new Date().toLocaleDateString('fa-IR'),
    };

    void apiJson('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        id: orderId,
        phone: loggedInPhone || newLocalOrder.buyerId,
        buyerName: newLocalOrder.buyerName,
        totalAmount: cartFinalPayable,
        discountAmount,
        couponCode: appliedCoupon?.code,
        itemsSummary: newLocalOrder.itemsSummary,
        itemsCount: newLocalOrder.itemsCount,
        paymentMethod: selectedGw.id,
        gatewayRef,
        skillIds: cart.map((c) => c.product.id),
      }),
    }).catch(() => {
      // Keep local order if background persistence fails transiently
    });

    setOrders((prev) => [newLocalOrder, ...prev]);

    const purchasedIds = cart.map((c) => c.product.id);
    setClaimedSkillIds((prev) =>
      Array.from(new Set([...prev, ...purchasedIds]))
    );
    if (purchasedIds[0]) {
      setDashboardSelectedSkillId(purchasedIds[0]);
    }

    setCart([]);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMessage(null);
    setIsCartOpen(false);
    setCheckoutSuccessBanner(
      `سفارش #${orderId.slice(-6)} به نام «${loggedInName || 'شما'}» با کد رهگیری درگاه (${gatewayRef}) ثبت و تسویه شد! در «پیشخوان من» فایل‌های خود را دانلود نمایید.`
    );
    navigateWithTransition('dashboard');
  };

  // Admin CMS Handlers
  const handleSaveProduct = async (
    productData: Omit<SkillProduct, 'authorId'>,
    existingId?: string
  ) => {
    const cleanId = sanitizeSlugOrId(
      existingId || productData.slug || productData.id,
      'skill_98'
    );
    const authorUid = googleUserInfo
      ? sanitizeSlugOrId(googleUserInfo.uid, 'admin_98')
      : 'admin_98';

    const fullItem: SkillProduct = {
      ...productData,
      id: cleanId,
      slug: cleanId,
      authorId: authorUid,
    };

    setLocalProducts((prev) => {
      const exists = prev.some((p) => p.id === cleanId);
      if (exists) {
        return prev.map((p) => (p.id === cleanId ? fullItem : p));
      }
      return [fullItem, ...prev];
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    setLocalProducts((prev) => prev.filter((p) => p.id !== productId));
    showToast('محصول مورد نظر از کاتالوگ حذف شد.');
  };

  const handleSaveArticle = (article: SkillArticle) => {
    setArticles((prev) => {
      const exists = prev.some((a) => a.id === article.id);
      if (exists) {
        return prev.map((a) => (a.id === article.id ? article : a));
      }
      return [article, ...prev];
    });
    setActiveArticle(article);
    showToast('مقاله به همراه تصویر شاخص ذخیره و منتشر شد.');
  };

  const handleDeleteArticle = (articleId: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
    showToast('مقاله حذف شد.');
  };

  const handleSaveMediaItem = (item: MediaAssetItem) => {
    setMediaItems((prev) => {
      const exists = prev.some((m) => m.id === item.id);
      if (exists) {
        return prev.map((m) => (m.id === item.id ? item : m));
      }
      return [item, ...prev];
    });
  };

  const handleDeleteMediaItem = (id: string) => {
    setMediaItems((prev) => prev.filter((m) => m.id !== id));
    showToast('تصویر از گالری رسانه حذف شد.');
  };

  const handleSaveCoupon = (coupon: CouponRule) => {
    setCoupons((prev) => {
      const exists = prev.some(
        (c) => c.code.toUpperCase() === coupon.code.toUpperCase()
      );
      if (exists) {
        return prev.map((c) =>
          c.code.toUpperCase() === coupon.code.toUpperCase() ? coupon : c
        );
      }
      return [coupon, ...prev];
    });
    showToast(`کد تخفیف ${coupon.code} ذخیره شد.`);
  };

  const handleDeleteCoupon = (code: string) => {
    setCoupons((prev) => prev.filter((c) => c.code !== code));
    showToast('کد تخفیف حذف شد.');
  };

  const handleRevokeSession = (sessionId: string) => {
    setCmsSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'revoked' } : s))
    );
    void apiJson<{ sessions?: CmsSessionRecord[] }>(
      `/api/auth/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE' }
    )
      .then(({ ok, data }) => {
        if (ok && Array.isArray(data.sessions)) {
          setCmsSessions(data.sessions);
        }
      })
      .catch(() => {
        // ignore offline
      });
    showToast('نشست مورد نظر در دیتابیس باطل شد.');
  };

  const handleSeedCatalog = async () => {
    setLocalProducts(INITIAL_SKILL98_CATALOG);
    showToast('کاتالوگ پایه به همراه اسکیل‌های رایگان گیت‌هاب بازنشانی شد.');
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: OrderRecord['status']
  ) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    void apiJson(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => {
      // Keep local status update if background request fails transiently
    });
    showToast('وضعیت سفارش به‌روزرسانی شد.');
  };

  const handleDownloadStarterZip = async () => {
    const { downloadSkill98StarterZip } = await import('./core/zipGenerator');
    const filename = await downloadSkill98StarterZip(themeConfig, activeCatalog);
    showToast(`بسته ${filename} شامل قالب خام و راهنمای شروع دانلود شد.`);
  };

  const selectToolAndScroll = (tool: CatalogFilter) => {
    const needsTabSwitch = activeTab !== 'store';
    setCatalogFilter(tool);
    if (needsTabSwitch) {
      navigateWithTransition('store');
      window.setTimeout(() => {
        scrollToElementSmooth('#skills-catalog-section', -88);
      }, 420);
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToElementSmooth('#skills-catalog-section', -88);
      });
    });
  };

  const displayUserName = googleUserInfo?.displayName || loggedInName;
  const isLoggedIn = userRole !== 'guest';
  const activeThemeDef = resolveRegisteredTheme(themeConfig.activeThemeId);

  const jarvisPageContext = useMemo(() => {
    const rawPath =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.hash || ''}`
        : '/';
    if (activeTab === 'product_single' && activeProduct) {
      return {
        path: `/product/${activeProduct.slug}`,
        pageTitle: activeProduct.title,
        entityType: 'product' as const,
        entityId: activeProduct.id,
        entitySlug: activeProduct.slug,
      };
    }
    if (activeTab === 'article_single' && activeArticle) {
      return {
        path: `/article/${activeArticle.slug}`,
        pageTitle: activeArticle.title,
        entityType: 'article' as const,
        entityId: activeArticle.id,
        entitySlug: activeArticle.slug,
      };
    }
    if (activeTab === 'admin') {
      return {
        path: '/admin',
        pageTitle: 'پنل مدیریت CMS',
        entityType: 'admin_panel' as const,
      };
    }
    if (activeTab === 'page_single' && activeDynamicPage) {
      return {
        path: `/page/${activeDynamicPage.slug}`,
        pageTitle: activeDynamicPage.title,
        entityType: 'storefront' as const,
        entityId: activeDynamicPage.id,
        entitySlug: activeDynamicPage.slug,
      };
    }
    return {
      path: rawPath || '/',
      pageTitle:
        typeof document !== 'undefined' && document.title
          ? document.title
          : themeConfig.brandNameFa,
      entityType: 'storefront' as const,
    };
  }, [activeTab, activeProduct, activeArticle, activeDynamicPage, themeConfig.brandNameFa]);

  if (
    activeThemeDef.id === 'fatehan' &&
    activeThemeDef.renderStandaloneRoot &&
    activeTab !== 'admin'
  ) {
    return (
      <div dir="rtl" className="min-h-screen relative">
        {activeThemeDef.renderStandaloneRoot({
          adapter: createCmsV2ApiAdapter(),
        })}

        {canAccessAdmin && (
          <button
            type="button"
            onClick={() => navigateWithTransition('admin')}
            className="fixed bottom-5 left-5 z-50 px-4 py-2.5 rounded-full bg-slate-950/90 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xl border border-white/15 backdrop-blur-md flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>بازگشت به پنل مدیریت CMS / تغییر پوسته</span>
          </button>
        )}

        {/* Lazy-loaded Jarvis Mascot strictly for Super Admin only */}
        {userRole === 'super_admin' && (
          <Suspense fallback={null}>
            <SuperAdminJarvisMascot
              pageContext={jarvisPageContext}
              elevateBottomOffset
            />
          </Suspense>
        )}
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      data-barba="wrapper"
      data-accent={themeConfig.accentPreset}
      className="min-h-screen flex flex-col bg-[#F6F5F1] dark:bg-[#0F172A] text-stone-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden max-w-[100vw]"
    >
      {/* Barba.js + GSAP Soft Frosted-Glass & Blur Page Transition Overlay */}
      <div
        ref={transitionOverlayRef}
        data-barba-overlay="true"
        className="fixed inset-0 z-50 bg-white/45 dark:bg-[#0F172A]/60 backdrop-blur-2xl pointer-events-none opacity-0 flex items-center justify-center transition-none"
      >
        <div className="px-6 py-3.5 rounded-2xl bg-white/85 dark:bg-[#162038]/90 backdrop-blur-xl border border-stone-200/80 dark:border-slate-700/80 shadow-2xl text-stone-900 dark:text-white font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-2.5 smooth-nums whitespace-nowrap">
          <Sparkles className="w-4 h-4 text-[#1D4ED8] dark:text-amber-400 animate-spin" />
          <span>{themeConfig.brandNameFa} · انتقال نرم صفحه</span>
        </div>
      </div>

      {/* Theme Header & Admin Motion Status Strip */}
      <SiteHeader
        activeTab={activeTab}
        themeConfig={themeConfig}
        accentStyles={accentStyles}
        userRole={userRole}
        isLoggedIn={isLoggedIn}
        canAccessAdmin={canAccessAdmin}
        displayUserName={displayUserName}
        claimedCount={claimedSkillIds.length}
        cartTotalItems={cartTotalItems}
        isMuuriDragEnabled={isMuuriDragEnabled}
        dynamicPages={dynamicPages}
        onNavigate={(tab) => navigateWithTransition(tab)}
        onSelectToolAndScroll={selectToolAndScroll}
        onOpenDynamicPage={handleOpenDynamicPage}
        onOpenAuthModal={() => {
          if (isLoggedIn) {
            navigateWithTransition(canAccessAdmin ? 'admin' : 'dashboard');
            return;
          }
          openFreshAuthModal();
        }}
        onLogout={() => void handleLogout()}
        onOpenCart={() => setIsCartOpen(true)}
        onToggleMuuriDrag={() => {
          setIsMuuriDragEnabled((prev) => !prev);
          showToast(
            !isMuuriDragEnabled
              ? 'قابلیت جابه‌جایی المان‌ها با ماوس (Muuri Grid) فعال شد.'
              : 'جابه‌جایی المان‌ها غیرفعال شد.'
          );
        }}
        onResetDraggedElements={handleResetDraggedElements}
      />

      {/* Global Activity Spinner & Transient Floating Toast Overlay */}
      <GlobalActivityOverlay />

      {/* Checkout Confirmation Banner */}
      {checkoutSuccessBanner && (
        <div className="max-w-6xl mx-auto px-6 pt-6 w-full">
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm flex items-center justify-between gap-4 smooth-nums">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{checkoutSuccessBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutSuccessBanner(null)}
              className="text-xs underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container with Barba.js + GSAP lifecycle */}
      <main
        ref={mainContainerRef}
        data-barba="container"
        data-barba-namespace={activeTab}
        className="flex-1 pb-24"
      >
        {activeTab === 'store' && (
          <StorefrontView
            themeConfig={themeConfig}
            accentStyles={accentStyles}
            activeCatalog={activeCatalog}
            filteredCatalog={filteredCatalog}
            displayedCatalog={displayedCatalog}
            publishedArticles={publishedArticles}
            catalogFilter={catalogFilter}
            searchQuery={searchQuery}
            bookmarkedIds={bookmarkedIds}
            claimedSkillIds={claimedSkillIds}
            showAllCatalogSkills={showAllCatalogSkills}
            onChangeFilter={setCatalogFilter}
            onChangeSearchQuery={setSearchQuery}
            onToggleDarkMode={() =>
              setThemeConfig((prev) => ({ ...prev, darkMode: !prev.darkMode }))
            }
            onToggleShowAllSkills={() =>
              setShowAllCatalogSkills((prev) => !prev)
            }
            onSelectToolAndScroll={selectToolAndScroll}
            onNavigate={(tab) => navigateWithTransition(tab)}
            onOpenSkillDetails={(skill) => openSingleProductPage(skill)}
            onQuickSkillAction={handleQuickSkillAction}
            onToggleBookmark={handleToggleBookmark}
            onOpenFullArticle={openFullArticlePage}
          />
        )}

        <Suspense fallback={<ViewSuspenseSkeleton />}>
        {activeTab === 'product_single' && activeProduct && (
          <SingleProductView
            product={activeProduct}
            allProducts={activeCatalog}
            brandNameFa={themeConfig.brandNameFa}
            bookmarkedIds={bookmarkedIds}
            claimedSkillIds={claimedSkillIds}
            accentStyles={accentStyles}
            onBackToStore={() => navigateWithTransition('store')}
            onSelectProduct={(prod) => openSingleProductPage(prod)}
            onToggleBookmark={handleToggleBookmark}
            onAddToCart={handleAddToCart}
            onQuickSkillAction={handleQuickSkillAction}
            onNavigateTab={(tab) => navigateWithTransition(tab)}
            onFilterByCategory={(cat) => {
              if (cat === 'Claude' || cat === 'ChatGPT' || cat === 'Codex') {
                setCatalogFilter(cat);
              } else {
                setCatalogFilter('all');
              }
            }}
          />
        )}

        {(activeTab === 'articles' || activeTab === 'article_single') && (
          <ArticlesView
            mode={activeTab}
            brandNameFa={themeConfig.brandNameFa}
            publishedArticles={publishedArticles}
            activeArticle={activeArticle}
            activeCatalog={activeCatalog}
            claimedSkillIds={claimedSkillIds}
            canAccessAdmin={canAccessAdmin}
            onNavigate={(tab) => navigateWithTransition(tab)}
            onOpenFullArticle={openFullArticlePage}
            onQuickSkillAction={handleQuickSkillAction}
            onOpenProductSingle={(prod) => openSingleProductPage(prod)}
          />
        )}

        {activeTab === 'page_single' && activeDynamicPage && (
          <DynamicPageView
            page={activeDynamicPage}
            allPages={dynamicPages}
            products={activeCatalog}
            onBackToStore={() => navigateWithTransition('store')}
            onSelectPage={handleOpenDynamicPage}
            onNavigateTab={(tab) => navigateWithTransition(tab)}
            onSelectProduct={(prod) => openSingleProductPage(prod)}
          />
        )}

        {activeTab === 'dashboard' && (
          <CustomerDashboardView
            userUid={googleUserInfo?.uid || (isLoggedIn ? 'user_logged_in' : null)}
            userDisplayName={displayUserName || null}
            userPhone={loggedInPhone || undefined}
            userRole={userRole}
            orders={orders}
            products={activeCatalog}
            claimedSkillIds={claimedSkillIds}
            initialSelectedSkillId={dashboardSelectedSkillId}
            articles={publishedArticles}
            sessions={cmsSessions}
            bookmarkedIds={bookmarkedIds}
            accentButtonClass={accentStyles.button}
            accentTextClass={accentStyles.text}
            onNavigateTab={navigateWithTransition}
            onOpenAuthModal={openFreshAuthModal}
            onCancelOrder={(orderId) =>
              handleUpdateOrderStatus(orderId, 'cancelled')
            }
            onDownloadStarterZip={handleDownloadStarterZip}
            onSelectSkillProduct={(prod) => openSingleProductPage(prod)}
            onOpenFullArticle={openFullArticlePage}
            onRevokeSession={handleRevokeSession}
          />
        )}

        {activeTab === 'admin' && canAccessAdmin && (
          <AdminCmsView
            products={activeCatalog}
            articles={articles}
            mediaItems={mediaItems}
            orders={orders}
            coupons={coupons}
            gateways={gateways}
            aiConfig={aiConfig}
            roles={cmsRoles}
            sessions={cmsSessions}
            otpConfig={otpConfig}
            themeConfig={themeConfig}
            activeUserRole={userRole === 'admin' ? 'admin' : 'super_admin'}
            activeUserRoleId={loggedInRoleId}
            activeUserName={displayUserName}
            accentButtonClass={accentStyles.button}
            accentTextClass={accentStyles.text}
            onSwitchActiveRole={(r) => setUserRole(r)}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSaveArticle={handleSaveArticle}
            onDeleteArticle={handleDeleteArticle}
            onSaveMediaItem={handleSaveMediaItem}
            onDeleteMediaItem={handleDeleteMediaItem}
            onSaveCoupon={handleSaveCoupon}
            onDeleteCoupon={handleDeleteCoupon}
            onUpdateGateways={setGateways}
            paymentDisplayConfig={paymentDisplayConfig}
            onUpdatePaymentDisplayConfig={setPaymentDisplayConfig}
            onRefreshFromServer={() => void hydrateFromDatabase()}
            onUpdateAiConfig={setAiConfig}
            onUpdateRoles={setCmsRoles}
            onRevokeSession={handleRevokeSession}
            onUpdateOtpConfig={setOtpConfig}
            onSeedCatalog={handleSeedCatalog}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateTheme={setThemeConfig}
            onSaveThemeNow={handleSaveThemeNow}
            onOpenDynamicPage={handleOpenDynamicPage}
            onDownloadStarterZip={handleDownloadStarterZip}
          />
        )}

        {activeTab === 'guide' && (
          <TargetGuideAndZipView
            themeConfig={themeConfig}
            accentButtonClass={accentStyles.button}
            accentTextClass={accentStyles.text}
            onDownloadZip={handleDownloadStarterZip}
          />
        )}
        </Suspense>
      </main>

      {/* Floating Compact Reset Layout FAB */}
      {hasDisplacedLayout && (
        <button
          type="button"
          onClick={handleResetDraggedElements}
          data-no-muuri-drag="true"
          aria-label="مرتب‌سازی چیدمان"
          title="مرتب‌سازی چیدمان کارت‌ها"
          className={`layout-reset-fab group fixed left-4 sm:left-6 z-50 h-11 min-w-11 w-fit px-3 rounded-full inline-flex items-center justify-center cursor-pointer transition-all duration-300 ease-out active:scale-95 border border-white/50 backdrop-blur-md whitespace-nowrap ${
            cart.length > 0 && !isCartOpen && activeTab !== 'admin'
              ? 'bottom-[162px] md:bottom-24'
              : 'bottom-[86px] md:bottom-6'
          } ${
            themeConfig.accentPreset === 'emerald'
              ? 'bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-[0_10px_28px_-4px_rgba(5,150,105,0.6)]'
              : themeConfig.accentPreset === 'amber'
              ? 'bg-gradient-to-l from-amber-500 via-amber-400 to-yellow-300 text-stone-950 shadow-[0_10px_28px_-4px_rgba(245,158,11,0.55)]'
              : themeConfig.accentPreset === 'rose'
              ? 'bg-gradient-to-l from-rose-600 via-rose-500 to-pink-500 text-white shadow-[0_10px_28px_-4px_rgba(225,29,72,0.55)]'
              : themeConfig.accentPreset === 'violet'
              ? 'bg-gradient-to-l from-purple-600 via-violet-600 to-indigo-500 text-white shadow-[0_10px_28px_-4px_rgba(124,58,237,0.6)]'
              : 'bg-gradient-to-l from-[#1E3A8A] via-[#1D4ED8] to-[#0EA5E9] text-white shadow-[0_10px_28px_-4px_rgba(29,78,216,0.6)]'
          }`}
        >
          <RotateCcw className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:-rotate-90 relative z-10" />
          <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[160px] group-hover:opacity-100 group-hover:mr-2 group-focus-visible:max-w-[160px] group-focus-visible:opacity-100 group-focus-visible:mr-2 transition-all duration-300 ease-out text-xs font-extrabold whitespace-nowrap relative z-10">
            مرتب‌سازی چیدمان
          </span>
        </button>
      )}

      {/* Cart Floating Bar & 1-Step Slide-Over Checkout Drawer Modal (Lazy-loaded when cart has items or opened) */}
      {(isCartOpen || cart.length > 0) && (
        <Suspense fallback={null}>
          <CartDrawerModal
            activeTab={activeTab}
            isCartOpen={isCartOpen}
            isLoggedIn={isLoggedIn}
            loggedInPhone={loggedInPhone}
            loggedInName={displayUserName}
            cart={cart}
            cartTotalItems={cartTotalItems}
            cartSubtotalAmount={cartSubtotalAmount}
            discountAmount={discountAmount}
            cartFinalPayable={cartFinalPayable}
            coupons={coupons}
            couponInput={couponInput}
            appliedCoupon={appliedCoupon}
            couponMessage={couponMessage}
            activeGateways={activeGateways}
            selectedGatewayId={selectedGatewayId}
            accentStyles={accentStyles}
            onOpenCart={() => setIsCartOpen(true)}
            onCloseCart={() => setIsCartOpen(false)}
            onUpdateQty={handleUpdateCartQty}
            onCouponInputChange={setCouponInput}
            onApplyCoupon={handleApplyCouponCode}
            onClearCoupon={() => {
              setAppliedCoupon(null);
              setCouponInput('');
              setCouponMessage(null);
            }}
            onSelectGateway={setSelectedGatewayId}
            onCompleteCheckout={() => void handleCompleteCheckout()}
            onInlineLoginSuccess={completeVerifiedLogin}
          />
        </Suspense>
      )}

      {/* Authentication & Registration Modal (Lazy-loaded on demand) */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            themeConfig={themeConfig}
            accentStyles={accentStyles}
            authStep={authStep}
            phoneInput={phoneInput}
            fullNameInput={fullNameInput}
            otpInput={otpInput}
            isAuthSubmitting={isAuthSubmitting}
            simulatedSmsCodeBanner={simulatedSmsCodeBanner}
            onPhoneChange={setPhoneInput}
            onFullNameChange={setFullNameInput}
            onOtpChange={setOtpInput}
            onAuthStepChange={setAuthStep}
            onClearSimulatedBanner={() => setSimulatedSmsCodeBanner(null)}
            onClose={() => {
              setIsAuthModalOpen(false);
              setAuthStep('phone');
              setPhoneInput('');
              setFullNameInput('');
              setOtpInput('');
              setSimulatedSmsCodeBanner(null);
              setPendingActionAfterAuth(null);
            }}
            onSubmit={(e) => void handlePhoneLoginSubmit(e)}
            onGoogleLogin={() => void handleGoogleLogin()}
          />
        </Suspense>
      )}

      {/* Skill Details & Markdown Preview Modal (Lazy-loaded on demand) */}
      {selectedSkillModal && (
        <Suspense fallback={null}>
          <SkillDetailModal
            skill={selectedSkillModal}
            brandNameFa={themeConfig.brandNameFa}
            bookmarkedIds={bookmarkedIds}
            claimedSkillIds={claimedSkillIds}
            accentStyles={accentStyles}
            onClose={() => setSelectedSkillModal(null)}
            onToggleBookmark={handleToggleBookmark}
            onQuickSkillAction={handleQuickSkillAction}
            onAddToCart={handleAddToCart}
          />
        </Suspense>
      )}

      {/* Theme Editorial Footer */}
      <SiteFooter
        themeConfig={themeConfig}
        dynamicPages={dynamicPages}
        onSelectToolAndScroll={selectToolAndScroll}
        onNavigate={(tab) => navigateWithTransition(tab)}
        onOpenDynamicPage={handleOpenDynamicPage}
      />

      {/* Deferred Non-Critical Floating Widgets (mounted after initial paint for 95+ PageSpeed) */}
      {widgetsReady && activeTab !== 'admin' && (
        <Suspense fallback={null}>
          <GoftinoLiveChatWidget
            loggedInName={displayUserName}
            loggedInPhone={loggedInPhone}
            onInlineLoginSuccess={completeVerifiedLogin}
            onDisplayNameUpdated={(nextName) => setLoggedInName(nextName)}
          />
          <PWAInstallBanner enabled />
          <StorefrontPopupsRenderer enabled />
        </Suspense>
      )}

      {/* Super Admin ONLY Context-Aware Floating Jarvis Mascot (zero bundle/DOM for non-super-admins) */}
      {userRole === 'super_admin' && (
        <Suspense fallback={null}>
          <SuperAdminJarvisMascot
            pageContext={jarvisPageContext}
            elevateBottomOffset={cart.length > 0 && !isCartOpen && activeTab !== 'admin'}
          />
        </Suspense>
      )}

      {/* Mobile Translucent Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        isLoggedIn={isLoggedIn}
        canAccessAdmin={canAccessAdmin}
        cartTotalItems={cartTotalItems}
        accentStyles={accentStyles}
        onNavigate={(tab) => navigateWithTransition(tab)}
        onOpenAuthModal={() => {
          if (isLoggedIn) {
            navigateWithTransition(canAccessAdmin ? 'admin' : 'dashboard');
            return;
          }
          openFreshAuthModal();
        }}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </div>
  );
}
