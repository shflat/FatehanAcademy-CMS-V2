/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fatehan Standalone Theme Context & Provider
 * Completely independent from legacy CoreContext. Accepts any CMS v2.0.0 `adapter`
 * and optional SSR/preloaded `initialData`.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CmsApiAdapter,
  CmsSiteSettings,
  CmsStorefrontData,
  LoggedInCustomer,
  ProductItem,
  StoreCartItem,
  VideoModalPayload,
  ViewportMode,
} from '../types';
import { createCmsV2ApiAdapter } from './cmsApiAdapter';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_FALLBACK_ANNOUNCEMENTS,
  DEFAULT_FALLBACK_COURSES,
  DEFAULT_FALLBACK_FREE_COURSES,
  DEFAULT_FOOTER_MENU,
  DEFAULT_HEADER_MENU,
  DEFAULT_MOBILE_BOTTOM_MENU,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_TYPOGRAPHY_CONFIG,
} from '../utils/defaultFallbacks';

export interface FatehanThemeContextValue {
  state: CmsStorefrontData;
  settings: CmsSiteSettings;
  adapter: CmsApiAdapter;
  loading: boolean;
  viewportMode: ViewportMode;
  setViewportMode: (mode: ViewportMode) => void;
  storePath: string;
  navigateStore: (path: string) => void;
  isRouteTransitioning: boolean;
  toastMessage: string | null;
  notify: (msg: string) => void;
  refreshState: () => Promise<void>;
  // Cart
  cartItems: StoreCartItem[];
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  addToCart: (
    product: ProductItem,
    variationId?: string,
    qty?: number,
    openDrawer?: boolean
  ) => void;
  updateCartItemQty: (cartKey: string, nextQty: number) => void;
  removeFromCart: (cartKey: string) => void;
  clearCart: () => void;
  appliedCouponCode: string;
  setAppliedCouponCode: (code: string) => void;
  // Video Modal
  activeVideoModal: VideoModalPayload;
  openVideoModal: (payload?: Omit<VideoModalPayload, 'open'>) => void;
  closeVideoModal: () => void;
  // Customer Session & OTP Modal
  isOtpModalOpen: boolean;
  setIsOtpModalOpen: (open: boolean) => void;
  loggedInCustomer: LoggedInCustomer | null;
  setLoggedInCustomer: React.Dispatch<React.SetStateAction<LoggedInCustomer | null>>;
}

const FatehanThemeContext = createContext<FatehanThemeContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'fatehan_theme_cart_v2';
const CUSTOMER_STORAGE_KEY = 'fatehan_theme_customer_v2';

function mergeStorefrontData(partial?: Partial<CmsStorefrontData>): CmsStorefrontData {
  const mergedTypo = {
    ...DEFAULT_TYPOGRAPHY_CONFIG,
    ...(partial?.settings?.typography || {}),
    ...(partial?.typography || {}),
  };

  const mergedSettings: CmsSiteSettings = {
    ...DEFAULT_SITE_SETTINGS,
    ...(partial?.settings || {}),
    location: {
      ...DEFAULT_SITE_SETTINGS.location,
      ...(partial?.settings?.location || {}),
    },
    phones: {
      ...DEFAULT_SITE_SETTINGS.phones,
      ...(partial?.settings?.phones || {}),
    },
    social: {
      ...DEFAULT_SITE_SETTINGS.social,
      ...(partial?.settings?.social || {}),
      instagramId:
        partial?.settings?.social?.instagramId ||
        mergedTypo.instagramId ||
        DEFAULT_SITE_SETTINGS.social.instagramId,
      instagramUrl:
        partial?.settings?.social?.instagramUrl ||
        mergedTypo.instagramUrl ||
        DEFAULT_SITE_SETTINGS.social.instagramUrl,
      eitaaId:
        partial?.settings?.social?.eitaaId ??
        mergedTypo.eitaaId ??
        DEFAULT_SITE_SETTINGS.social.eitaaId,
      eitaaUrl:
        partial?.settings?.social?.eitaaUrl ||
        mergedTypo.eitaaUrl ||
        DEFAULT_SITE_SETTINGS.social.eitaaUrl,
      baleId: partial?.settings?.social?.baleId ?? mergedTypo.baleId ?? '',
      baleUrl: partial?.settings?.social?.baleUrl || mergedTypo.baleUrl || '',
    },
    typography: mergedTypo,
  };

  return {
    settings: mergedSettings,
    typography: mergedTypo,
    headerMenu:
      partial?.headerMenu && partial.headerMenu.length > 0
        ? partial.headerMenu
        : DEFAULT_HEADER_MENU,
    footerMenu:
      partial?.footerMenu && partial.footerMenu.length > 0
        ? partial.footerMenu
        : DEFAULT_FOOTER_MENU,
    mobileBottomMenu:
      partial?.mobileBottomMenu && partial.mobileBottomMenu.length > 0
        ? partial.mobileBottomMenu
        : DEFAULT_MOBILE_BOTTOM_MENU,
    departments:
      partial?.departments && partial.departments.length > 0
        ? partial.departments
        : DEFAULT_DEPARTMENTS,
    courses:
      partial?.courses && partial.courses.length > 0
        ? partial.courses
        : DEFAULT_FALLBACK_COURSES,
    freeCourses:
      partial?.freeCourses && partial.freeCourses.length > 0
        ? partial.freeCourses
        : DEFAULT_FALLBACK_FREE_COURSES,
    freeCoursesPage: partial?.freeCoursesPage,
    aboutPage: partial?.aboutPage,
    builderBlocks: partial?.builderBlocks || [],
    products: partial?.products || [],
    cmsPosts: partial?.cmsPosts || [],
    cmsComments: partial?.cmsComments || [],
    orders: partial?.orders || [],
    coupons: partial?.coupons || [],
    cashbackConfig: partial?.cashbackConfig,
    paymentGateways: partial?.paymentGateways || [],
    customerAddresses: partial?.customerAddresses || [],
    studentIdeas: partial?.studentIdeas || [],
    announcements:
      partial?.announcements && partial.announcements.length > 0
        ? partial.announcements
        : DEFAULT_FALLBACK_ANNOUNCEMENTS,
    users: partial?.users || [],
  };
}

export interface FatehanThemeProviderProps {
  children: React.ReactNode;
  /** Pluggable CMS v2.0.0 API adapter (defaults to `createCmsV2ApiAdapter()`) */
  adapter?: CmsApiAdapter;
  /** Optional SSR / preloaded storefront data */
  initialData?: Partial<CmsStorefrontData>;
  /** Optional external router path if host CMS manages routing (e.g. Next.js / React Router) */
  controlledPath?: string;
  /** Optional external navigation callback when host CMS controls routing */
  onNavigate?: (path: string) => void;
  /** Optional forced viewport mode for visual previews */
  forcedViewport?: ViewportMode;
}

export const FatehanThemeProvider: React.FC<FatehanThemeProviderProps> = ({
  children,
  adapter: customAdapter,
  initialData,
  controlledPath,
  onNavigate,
  forcedViewport,
}) => {
  const adapter = useMemo(() => customAdapter || createCmsV2ApiAdapter(), [customAdapter]);

  const [state, setState] = useState<CmsStorefrontData>(() => mergeStorefrontData(initialData));
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState<boolean>(false);

  const [viewportMode, setViewportMode] = useState<ViewportMode>(() => {
    if (forcedViewport) return forcedViewport;
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth < 640) return 'mobile';
    if (window.innerWidth < 1024) return 'tablet';
    return 'desktop';
  });

  const [internalPath, setInternalPath] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname || '/';
  });

  const storePath = controlledPath ?? internalPath;

  // Cart & Coupon state
  const [cartItems, setCartItems] = useState<StoreCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');

  // Video Modal state
  const [activeVideoModal, setActiveVideoModal] = useState<VideoModalPayload>({ open: false });

  // Customer OTP Auth state
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [loggedInCustomer, setLoggedInCustomer] = useState<LoggedInCustomer | null>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      if (loggedInCustomer) {
        localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(loggedInCustomer));
      } else {
        localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [loggedInCustomer]);

  // Responsive viewport detection when not forced
  useEffect(() => {
    if (forcedViewport) {
      setViewportMode(forcedViewport);
      return;
    }
    const handleResize = () => {
      if (window.innerWidth < 640) setViewportMode('mobile');
      else if (window.innerWidth < 1024) setViewportMode('tablet');
      else setViewportMode('desktop');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [forcedViewport]);

  // Browser back/forward popstate listener
  useEffect(() => {
    if (controlledPath !== undefined) return;
    const onPopState = () => {
      setInternalPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [controlledPath]);

  // Apply dynamic CSS typography variables & optional Fatehan Blue-Cyan theme
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const t = state.typography;
    root.style.setProperty('--font-heading', `'${t.headingFont}', 'IRANSansX', 'Vazirmatn', sans-serif`);
    root.style.setProperty('--font-body', `'${t.bodyFont}', 'Vazirmatn', sans-serif`);
    root.style.setProperty('--font-print', `'${t.printFont}', 'IRANSansX', sans-serif`);
    root.setAttribute('data-fatehan-blue', t.blueCyanThemeEnabled ? 'true' : 'false');
    root.setAttribute('dir', 'rtl');
    root.setAttribute('lang', 'fa');
  }, [state.typography]);

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const fresh = await adapter.fetchStorefrontData();
      setState((prev) => mergeStorefrontData({ ...prev, ...fresh }));
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const navigateStore = useCallback(
    (path: string) => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      setIsCartDrawerOpen(false);
      setIsRouteTransitioning(true);

      if (onNavigate) {
        onNavigate(cleanPath);
      } else {
        setInternalPath(cleanPath);
        try {
          if (window.location.pathname !== cleanPath) {
            window.history.pushState({}, '', cleanPath);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          // ignore
        }
      }

      setTimeout(() => setIsRouteTransitioning(false), 120);
    },
    [onNavigate]
  );

  const addToCart = useCallback(
    (product: ProductItem, variationId?: string, qty = 1, openDrawer = true) => {
      const matchedVar =
        variationId && product.variations
          ? product.variations.find((v) => v.id === variationId)
          : product.variations?.[0];

      const cartKey = matchedVar ? `${product.id}__${matchedVar.id}` : product.id;
      const unitPrice = matchedVar
        ? matchedVar.salePriceToman || matchedVar.priceToman
        : product.salePriceToman || product.priceToman;
      const regularPrice = matchedVar ? matchedVar.priceToman : product.priceToman;
      const sku = matchedVar ? matchedVar.sku : product.sku;
      const imageUrl = matchedVar?.imageUrl || product.featuredImageUrl;

      setCartItems((prev) => {
        const existing = prev.find((it) => it.cartKey === cartKey);
        if (existing) {
          return prev.map((it) =>
            it.cartKey === cartKey ? { ...it, qty: it.qty + qty } : it
          );
        }
        return [
          ...prev,
          {
            cartKey,
            productId: product.id,
            title: product.name,
            sku,
            variationId: matchedVar?.id,
            variationSummary: matchedVar?.attributeSummary,
            unitPrice,
            regularPrice,
            qty,
            imageUrl,
            maxStock: matchedVar ? matchedVar.stock : product.stock,
          },
        ];
      });

      notify(`«${product.name}» به سبد خرید اضافه شد.`);
      if (openDrawer) setIsCartDrawerOpen(true);
    },
    [notify]
  );

  const updateCartItemQty = useCallback((cartKey: string, nextQty: number) => {
    if (nextQty <= 0) {
      setCartItems((prev) => prev.filter((it) => it.cartKey !== cartKey));
      return;
    }
    setCartItems((prev) =>
      prev.map((it) => (it.cartKey === cartKey ? { ...it, qty: nextQty } : it))
    );
  }, []);

  const removeFromCart = useCallback((cartKey: string) => {
    setCartItems((prev) => prev.filter((it) => it.cartKey !== cartKey));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setAppliedCouponCode('');
  }, []);

  const openVideoModal = useCallback((payload?: Omit<VideoModalPayload, 'open'>) => {
    setActiveVideoModal({
      open: true,
      title: payload?.title || 'معرفی کارگاه و تجهیزات آموزشگاه رباتیک فاتحان',
      subtitle: payload?.subtitle || 'آشنایی با فضای آموزشی، کیت‌های رباتیک و پروژه‌های کارآموزان',
      videoUrl: payload?.videoUrl,
      chapters: payload?.chapters,
    });
  }, []);

  const closeVideoModal = useCallback(() => {
    setActiveVideoModal((prev) => ({ ...prev, open: false }));
  }, []);

  const value: FatehanThemeContextValue = {
    state,
    settings: state.settings,
    adapter,
    loading,
    viewportMode,
    setViewportMode,
    storePath,
    navigateStore,
    isRouteTransitioning,
    toastMessage,
    notify,
    refreshState,
    cartItems,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    addToCart,
    updateCartItemQty,
    removeFromCart,
    clearCart,
    appliedCouponCode,
    setAppliedCouponCode,
    activeVideoModal,
    openVideoModal,
    closeVideoModal,
    isOtpModalOpen,
    setIsOtpModalOpen,
    loggedInCustomer,
    setLoggedInCustomer,
  };

  return <FatehanThemeContext.Provider value={value}>{children}</FatehanThemeContext.Provider>;
};

export function useFatehanTheme(): FatehanThemeContextValue {
  const ctx = useContext(FatehanThemeContext);
  if (!ctx) {
    throw new Error('useFatehanTheme must be used inside <FatehanThemeProvider>.');
  }
  return ctx;
}
