import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { formatToman, formatPersianNumber } from '../utils/formatters';
import { BiDiText } from '../ui/BiDiText';
import { FatehanLogo } from '../ui/FatehanLogo';
import { RichFormattedContent } from '../utils/RichFormattedContent';
import { PrintPaperSize } from '../types';
import { PageRenderer } from './PageRenderer';
import { FatehanStorefrontHome } from '../components/FatehanStorefrontHome';
import {
  getResponsiveImageVariant,
  getResponsiveSrcSet,
} from '../../../src/core/responsiveImage';
import {
  SHOP_DEPARTMENTS,
  resolveProductDepartmentId,
} from '../utils/defaultFallbacks';

// Route-Level Code Splitting for Secondary Fatehan Storefront Pages
const BlogRoutesPage = lazy(() =>
  import('./BlogAndAccountRoutes').then((m) => ({ default: m.BlogRoutesPage }))
);
const CustomerAccountDashboardPage = lazy(() =>
  import('./BlogAndAccountRoutes').then((m) => ({ default: m.CustomerAccountDashboardPage }))
);
const FatehanCoursesPage = lazy(() =>
  import('./FatehanMultiPages').then((m) => ({ default: m.FatehanCoursesPage }))
);
const FatehanTuitionCalculatorPage = lazy(() =>
  import('./FatehanMultiPages').then((m) => ({ default: m.FatehanTuitionCalculatorPage }))
);
const FatehanSimulatorPage = lazy(() =>
  import('./FatehanMultiPages').then((m) => ({ default: m.FatehanSimulatorPage }))
);
const FatehanContactPage = lazy(() =>
  import('./FatehanMultiPages').then((m) => ({ default: m.FatehanContactPage }))
);
const FatehanFreeCoursesPage = lazy(() =>
  import('./FatehanMultiPages').then((m) => ({ default: m.FatehanFreeCoursesPage }))
);
const FatehanAboutPage = lazy(() =>
  import('./FatehanMultiPages').then((m) => ({ default: m.FatehanAboutPage }))
);
import {
  ShoppingBag,
  Filter,
  Search,
  Star,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Wallet,
  Building2,
  Landmark,
  Printer,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Play,
  Download,
  Lock,
  Sparkles,
  FileText,
  Package,
  RefreshCw,
  XCircle,
  Cpu,
  Box,
  Zap,
  Terminal,
  Cog,
  Layers,
} from 'lucide-react';

// GPU-Accelerated Shimmering Skeleton Loader for Storefront Transitions
export const StoreShimmerSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-5 py-4 animate-pulse">
      <div className="h-12 bg-slate-200/80 rounded-2xl w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-4 space-y-3"
          >
            <div className="h-40 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-xl" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
            <div className="h-9 bg-slate-200 rounded-xl w-full mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const StorefrontRouter: React.FC = () => {
  const {
    state,
    settings,
    adapter,
    storePath,
    navigateStore,
    isRouteTransitioning,
    cartItems,
    addToCart,
    updateCartItemQty,
    removeFromCart,
    clearCart,
    appliedCouponCode,
    setAppliedCouponCode,
    openVideoModal,
    loggedInCustomer,
    notify,
    refreshState,
    viewportMode,
  } = useFatehanTheme();

  // Shop Archive Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [maxPriceMillion, setMaxPriceMillion] = useState<number>(350);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'cheapest' | 'expensive' | 'bestselling'>(
    'newest'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFilteringShimmer, setIsFilteringShimmer] = useState<boolean>(false);

  // Sync optional ?dept=<id> query string when navigating to /shop
  useEffect(() => {
    if (!storePath.startsWith('/shop')) return;
    const qIndex = storePath.indexOf('?');
    if (qIndex === -1) return;
    const params = new URLSearchParams(storePath.slice(qIndex + 1));
    const deptParam = params.get('dept');
    if (deptParam && SHOP_DEPARTMENTS.some((d) => d.id === deptParam)) {
      setSelectedCategory(deptParam);
    } else if (deptParam === 'ALL' || deptParam === 'all') {
      setSelectedCategory('ALL');
    }
  }, [storePath]);

  // Product Detail Page (PDP) State
  const [pdpVariationId, setPdpVariationId] = useState<string>('');
  const [pdpActiveImg, setPdpActiveImg] = useState<string>('');
  const [pdpQty, setPdpQty] = useState<number>(1);
  const [pdpTab, setPdpTab] = useState<'specs' | 'desc' | 'reviews'>('specs');
  const [reviewAuthor, setReviewAuthor] = useState<string>(loggedInCustomer?.fullName || '');
  const [reviewOrg, setReviewOrg] = useState<string>(loggedInCustomer?.role || 'کارآموز / ولی دانش‌آموز');
  const [reviewRating, setReviewRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [reviewBody, setReviewBody] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Checkout Form State
  const [customerName, setCustomerName] = useState<string>(loggedInCustomer?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(loggedInCustomer?.phone || '');
  const [nationalId, setNationalId] = useState<string>('');
  const [economicCode, setEconomicCode] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [province, setProvince] = useState<string>(settings.location.province || 'تهران');
  const [city, setCity] = useState<string>(settings.location.city || 'اندیشه');
  const [address, setAddress] = useState<string>('');
  const [shippingMethod, setShippingMethod] = useState<string>(
    'تحویل حضوری در آموزشگاه یا ارسال با پست پیشتاز'
  );
  const [orderNote, setOrderNote] = useState<string>('');
  const [selectedGateway, setSelectedGateway] = useState<
    'zarinpal' | 'novinopay' | 'card_to_card' | 'wallet'
  >('zarinpal');
  const [cardReceiptRef, setCardReceiptRef] = useState<string>('');
  const [isCreatingPayment, setIsCreatingPayment] = useState<boolean>(false);

  // Sandbox Payment Terminal State
  const [sandboxCardNumber, setSandboxCardNumber] = useState<string>('6104-3378-9912-4401');
  const [sandboxCvv2, setSandboxCvv2] = useState<string>('849');
  const [sandboxExpMonth, setSandboxExpMonth] = useState<string>('08');
  const [sandboxExpYear, setSandboxExpYear] = useState<string>('06');
  const [sandboxPin, setSandboxPin] = useState<string>('492810');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);

  // Official Invoice Paper Size in Order Received Page
  const [invoicePaperSize, setInvoicePaperSize] = useState<PrintPaperSize>('A4');

  // Selected Product for PDP
  const activeProductId = storePath.startsWith('/product/')
    ? storePath.replace('/product/', '').trim()
    : '';
  const activeProduct = useMemo(() => {
    if (!state?.products) return undefined;
    return (
      state.products.find((p) => p.id === activeProductId || p.sku === activeProductId) ||
      state.products[0]
    );
  }, [state?.products, activeProductId]);

  useEffect(() => {
    if (activeProduct) {
      const firstVar =
        activeProduct.variations && activeProduct.variations.length > 0
          ? activeProduct.variations[0]
          : undefined;
      setPdpVariationId(firstVar ? firstVar.id : '');
      setPdpActiveImg(
        firstVar?.imageUrl ||
          activeProduct.featuredImageUrl ||
          '/assets/kits/kit-01.jpg'
      );
      setPdpQty(1);
    }
  }, [activeProduct?.id]);

  if (!state) return null;

  const isMobile = viewportMode === 'mobile';

  // Calculate Cart Totals & Coupon Discount
  const cartSubtotal = cartItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const matchedCoupon = appliedCouponCode.trim()
    ? state.coupons.find((c) => c.code.toUpperCase() === appliedCouponCode.trim().toUpperCase())
    : undefined;

  let couponDiscountToman = 0;
  if (matchedCoupon && cartSubtotal > 0) {
    if (
      matchedCoupon.discountType === 'fixed_cart' ||
      matchedCoupon.discountType === 'fixed_product'
    ) {
      couponDiscountToman = Math.min(
        cartSubtotal,
        matchedCoupon.fixedAmountToman || matchedCoupon.maxCapToman
      );
    } else if (matchedCoupon.discountType === 'free_shipping') {
      couponDiscountToman = Math.min(cartSubtotal, 2500000);
    } else {
      const raw = Math.round((cartSubtotal * matchedCoupon.discountPercent) / 100);
      couponDiscountToman = Math.min(raw, matchedCoupon.maxCapToman || raw);
    }
  }

  const taxableTotal = Math.max(0, cartSubtotal - couponDiscountToman);
  const vatTaxToman = Math.round(taxableTotal * 0.1);
  const grandTotalToman = taxableTotal + vatTaxToman;

  const triggerFilterShimmer = (cb: () => void) => {
    setIsFilteringShimmer(true);
    cb();
    setTimeout(() => setIsFilteringShimmer(false), 180);
  };

  if (isRouteTransitioning) {
    return <StoreShimmerSkeleton count={4} />;
  }

  // ============================================================================
  // CUSTOMER ACCOUNT DASHBOARD (/my-account)
  // ============================================================================
  if (storePath.startsWith('/my-account')) {
    return (
      <Suspense fallback={<StoreShimmerSkeleton count={4} />}>
        <CustomerAccountDashboardPage />
      </Suspense>
    );
  }

  // ============================================================================
  // BLOG ARCHIVE & SINGLE ARTICLE PAGE (/blog & /blog/:id)
  // ============================================================================
  if (storePath.startsWith('/blog')) {
    return (
      <Suspense fallback={<StoreShimmerSkeleton count={4} />}>
        <BlogRoutesPage />
      </Suspense>
    );
  }

  // ============================================================================
  // DEDICATED COURSES CATALOG & SINGLE COURSE PAGE (/courses & /courses/:id)
  // ============================================================================
  if (storePath.startsWith('/courses') || storePath.startsWith('/course/')) {
    return (
      <Suspense fallback={<StoreShimmerSkeleton count={4} />}>
        <FatehanCoursesPage />
      </Suspense>
    );
  }

  // ============================================================================
  // DEDICATED TUITION CALCULATOR PAGE (/calculator)
  // ============================================================================
  if (storePath.startsWith('/calculator')) {
    return (
      <Suspense fallback={<StoreShimmerSkeleton count={3} />}>
        <FatehanTuitionCalculatorPage />
      </Suspense>
    );
  }

  // ============================================================================
  // DEDICATED ROBOT LAB & SIMULATOR PAGE (/lab & /simulator)
  // ============================================================================
  if (storePath.startsWith('/lab') || storePath.startsWith('/simulator')) {
    return (
      <Suspense fallback={<StoreShimmerSkeleton count={3} />}>
        <FatehanSimulatorPage />
      </Suspense>
    );
  }

  // ============================================================================
  // DEDICATED FREE COURSES LANDING PAGE (/free-courses)
  // ============================================================================
  if (storePath.startsWith('/free-courses')) {
    return (
      <Suspense fallback={<StoreShimmerSkeleton count={4} />}>
        <FatehanFreeCoursesPage />
      </Suspense>
    );
  }

  // ============================================================================
  // DEDICATED ABOUT US & INSTITUTIONAL COOPERATION PAGE (/about)
  // ============================================================================
  if (storePath.startsWith('/about')) {
    return (
      <Suspense fallback={<StoreShimmerSkeleton count={3} />}>
        <FatehanAboutPage />
      </Suspense>
    );
  }

  // ============================================================================
  // DEDICATED CONTACT & CAMPUS VISIT PAGE (/contact)
  // ============================================================================
  if (storePath.startsWith('/contact')) {
    return (
      <Suspense fallback={<StoreShimmerSkeleton count={3} />}>
        <FatehanContactPage />
      </Suspense>
    );
  }

  // ============================================================================
  // ROUTE 1: SHOP CATALOG & ARCHIVE (/shop) — CATEGORIZED BY DEPARTMENT
  // ============================================================================
  if (storePath.startsWith('/shop')) {
    const shopDeptIconMap = {
      robotics: Cpu,
      printing: Box,
      electronics: Zap,
      coding: Terminal,
      mechanics: Cog,
    } as const;

    const deptCounts: Record<string, number> = {};
    for (const dept of SHOP_DEPARTMENTS) {
      deptCounts[dept.id] = 0;
    }
    for (const p of state.products) {
      const resolved = resolveProductDepartmentId(p);
      deptCounts[resolved] = (deptCounts[resolved] || 0) + 1;
    }

    const filteredProducts = state.products
      .filter((p) => {
        if (selectedCategory !== 'ALL') {
          const resolvedDept = resolveProductDepartmentId(p);
          if (resolvedDept !== selectedCategory && (p.category || '') !== selectedCategory) {
            return false;
          }
        }
        const effectivePrice = p.salePriceToman || p.priceToman;
        if (effectivePrice > maxPriceMillion * 1_000_000) return false;
        if (onlyInStock && p.stock <= 0) return false;
        if (
          searchQuery.trim() &&
          !p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
          !p.sku.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
          !(p.category || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pa = a.salePriceToman || a.priceToman;
        const pb = b.salePriceToman || b.priceToman;
        if (sortBy === 'cheapest') return pa - pb;
        if (sortBy === 'expensive') return pb - pa;
        if (sortBy === 'bestselling') return (b.salesCount || 0) - (a.salesCount || 0);
        return 0;
      });

    const selectedDeptMeta = SHOP_DEPARTMENTS.find((d) => d.id === selectedCategory);
    const shouldGroupByDepartment =
      selectedCategory === 'ALL' && !searchQuery.trim() && sortBy === 'newest';

    const renderProductCard = (prd: (typeof state.products)[number], idx: number) => {
      const hasVars = prd.variations && prd.variations.length > 0;
      const firstVar = hasVars ? prd.variations![0] : undefined;
      const displayPrice = firstVar ? firstVar.priceToman : prd.priceToman;
      const displaySale = firstVar ? firstVar.salePriceToman : prd.salePriceToman;
      const displayImg =
        firstVar?.imageUrl ||
        prd.featuredImageUrl ||
        '/assets/kits/kit-01.jpg';
      const prdDeptId = resolveProductDepartmentId(prd);
      const prdDept = SHOP_DEPARTMENTS.find((d) => d.id === prdDeptId);

      return (
        <motion.div
          key={prd.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.24) }}
          whileHover={{ y: -3 }}
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md transition-all"
        >
          <div>
            <div
              onClick={() => navigateStore(`/product/${prd.id}`)}
              className="relative h-48 bg-slate-100 overflow-hidden cursor-pointer group"
            >
              <img
                src={getResponsiveImageVariant(displayImg, 'thumb-300')}
                srcSet={getResponsiveSrcSet(displayImg)}
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 44vw, 280px"
                width={360}
                height={240}
                loading="lazy"
                decoding="async"
                alt={prd.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.dataset.fallbackApplied === '1') return;
                  target.dataset.fallbackApplied = '1';
                  target.srcset = '';
                  target.src = displayImg || '/assets/kits/kit-01.jpg';
                }}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
                <span
                  style={{
                    backgroundColor: prdDept?.softBg || '#0f172a',
                    color: prdDept?.accentHex || '#f8fafc',
                  }}
                  className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-md shadow-2xs"
                >
                  {prdDept?.label || prd.type}
                </span>
                {displaySale && (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded-md">
                    تخفیف ویژه
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate font-bold text-slate-600">
                  {prd.type || prdDept?.shortLabel}
                </span>
                <span className="font-mono text-emerald-700 font-bold tabular-nums">
                  موجودی: {formatPersianNumber(prd.stock)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigateStore(`/product/${prd.id}`)}
                className="text-right block w-full cursor-pointer"
              >
                <BiDiText
                  as="h3"
                  className="text-sm font-extrabold text-slate-900 hover:text-blue-600 leading-snug"
                >
                  {prd.name}
                </BiDiText>
              </button>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {prd.description || prd.specs}
              </p>
            </div>
          </div>

          <div className="p-4 pt-3 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-mono tabular-nums">
                {displaySale ? (
                  <div className="flex flex-col">
                    <span className="text-[10px] line-through text-slate-400">
                      {formatToman(displayPrice)}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-700">
                      {formatToman(displaySale)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {formatToman(displayPrice)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigateStore(`/product/${prd.id}`)}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl cursor-pointer whitespace-nowrap"
              >
                جزئیات محصول
              </button>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => addToCart(prd, firstVar?.id, 1, true)}
              className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-xs font-extrabold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>افزودن به سبد خرید</span>
            </motion.button>
          </div>
        </motion.div>
      );
    };

    return (
      <div className="py-6 space-y-6">
        {/* Top Storefront Catalog Banner */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-amber-400">
              {settings.academyNameEn.toUpperCase()} · STOREFRONT BY DEPARTMENT
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold">
              فروشگاه تفکیک‌شده بر اساس دپارتمان‌های {settings.academyNameFa}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              تمامی کیت‌های آموزشی، قطعات الکترونیکی، فیلامنت‌ها و پرینترهای سه‌بعدی به‌صورت جداگانه بر اساس هر دپارتمان تخصصی دسته‌بندی شده‌اند.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openVideoModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-amber-400" />
              <span>معرفی تجهیزات</span>
            </button>
            <button
              type="button"
              onClick={() => navigateStore('/cart')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>سبد خرید ({formatPersianNumber(cartItems.reduce((s, i) => s + i.qty, 0))})</span>
            </button>
          </div>
        </motion.div>

        {/* Department Navigation Tabs Strip */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => triggerFilterShimmer(() => setSelectedCategory('ALL'))}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shrink-0 transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>همه دپارتمان‌ها (تفکیک‌شده)</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
              selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {formatPersianNumber(state.products.length)}
            </span>
          </button>

          {SHOP_DEPARTMENTS.map((dept) => {
            const Icon = shopDeptIconMap[dept.id];
            const isSelected = selectedCategory === dept.id;
            const count = deptCounts[dept.id] || 0;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => triggerFilterShimmer(() => setSelectedCategory(dept.id))}
                style={
                  isSelected
                    ? {
                        backgroundColor: dept.accentHex,
                        color: '#ffffff',
                        borderColor: dept.accentHex,
                      }
                    : undefined
                }
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 shrink-0 transition-all cursor-pointer border whitespace-nowrap ${
                  isSelected
                    ? 'shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{dept.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {formatPersianNumber(count)}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`grid gap-6 ${
            isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12 items-start'
          }`}
        >
          {/* Sidebar Filters (Departments, Price Range, In-Stock, Sort) */}
          <aside
            className={`${
              isMobile ? 'w-full' : 'lg:col-span-3 sticky top-24'
            } bg-white border border-slate-200 rounded-2xl p-4 space-y-5`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>فیلترهای فروشگاه</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  triggerFilterShimmer(() => {
                    setSelectedCategory('ALL');
                    setMaxPriceMillion(350);
                    setOnlyInStock(false);
                    setSearchQuery('');
                    setSortBy('newest');
                  })
                }
                className="text-[11px] text-blue-600 hover:underline cursor-pointer font-semibold"
              >
                پاکسازی فیلترها
              </button>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">جستجو در محصولات:</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="مثلاً: پرینتر سه‌بعدی، آردوینو، ربات..."
                  className="w-full pr-8 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">دپارتمان تخصصی:</label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => triggerFilterShimmer(() => setSelectedCategory('ALL'))}
                  className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                    selectedCategory === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>همه دپارتمان‌ها</span>
                  <span className="font-mono text-[10px] opacity-80 tabular-nums">
                    {formatPersianNumber(state.products.length)}
                  </span>
                </button>

                {SHOP_DEPARTMENTS.map((dept) => {
                  const Icon = shopDeptIconMap[dept.id];
                  const isSelected = selectedCategory === dept.id;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => triggerFilterShimmer(() => setSelectedCategory(dept.id))}
                      style={
                        isSelected
                          ? { backgroundColor: dept.accentHex, color: '#ffffff' }
                          : undefined
                      }
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{dept.label}</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-80 tabular-nums shrink-0">
                        {formatPersianNumber(deptCounts[dept.id] || 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">سقف قیمت:</span>
                <span className="font-mono font-bold text-blue-600 tabular-nums">
                  تا {formatPersianNumber(maxPriceMillion)} میلیون تومان
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={350}
                step={1}
                value={maxPriceMillion}
                onChange={(e) => setMaxPriceMillion(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* In-Stock Toggle */}
            <label className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 cursor-pointer">
              <span className="text-xs font-bold text-slate-700">فقط کالاهای موجود در انبار</span>
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => triggerFilterShimmer(() => setOnlyInStock(e.target.checked))}
                className="w-4 h-4 accent-blue-600 rounded"
              />
            </label>
          </aside>

          {/* Main Product Catalog Grid / Department Sections */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-9'} space-y-6`}>
            {/* Top Sort Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                نمایش{' '}
                <strong className="font-mono text-slate-900 tabular-nums">
                  {formatPersianNumber(filteredProducts.length)}
                </strong>{' '}
                محصول{' '}
                {selectedDeptMeta ? `در ${selectedDeptMeta.label}` : 'در ۵ دپارتمان تخصصی'}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 ml-1">مرتب‌سازی:</span>
                {[
                  { id: 'newest', label: 'تفکیک دپارتمان' },
                  { id: 'cheapest', label: 'ارزان‌ترین' },
                  { id: 'expensive', label: 'گران‌ترین' },
                  { id: 'bestselling', label: 'پرفروش‌ترین' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => triggerFilterShimmer(() => setSortBy(s.id as any))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                      sortBy === s.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {isFilteringShimmer ? (
              <StoreShimmerSkeleton count={3} />
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <div className="text-sm font-bold text-slate-800">
                  محصولی با این فیلترها یافت نشد
                </div>
                <p className="text-xs text-slate-500">
                  دپارتمان انتخابی یا سقف قیمت را تغییر دهید.
                </p>
              </div>
            ) : shouldGroupByDepartment ? (
              /* Grouped Department-by-Department Catalog View */
              <div className="space-y-8">
                {SHOP_DEPARTMENTS.map((dept) => {
                  const deptItems = filteredProducts.filter(
                    (p) => resolveProductDepartmentId(p) === dept.id
                  );
                  if (deptItems.length === 0) return null;
                  const Icon = shopDeptIconMap[dept.id];

                  return (
                    <section
                      key={dept.id}
                      className="space-y-4 bg-white/80 border border-slate-200 rounded-3xl p-4 sm:p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                          <div
                            style={{
                              backgroundColor: dept.softBg,
                              color: dept.accentHex,
                            }}
                            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-black/5"
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-base sm:text-lg font-black text-slate-900">
                                {dept.label}
                              </h2>
                              <span
                                style={{
                                  backgroundColor: dept.softBg,
                                  color: dept.accentHex,
                                }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums"
                              >
                                {formatPersianNumber(deptItems.length)} محصول
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              {dept.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => triggerFilterShimmer(() => setSelectedCategory(dept.id))}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-900 text-slate-800 hover:text-white text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
                        >
                          نمایش اختصاصی این دپارتمان ←
                        </button>
                      </div>

                      <div
                        className={`grid gap-5 ${
                          isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                        }`}
                      >
                        {deptItems.map((prd, idx) => renderProductCard(prd, idx))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              /* Selected Single Department or Search/Sorted Flat Grid */
              <div className="space-y-4">
                {selectedDeptMeta && (
                  <div
                    style={{
                      backgroundColor: selectedDeptMeta.softBg,
                      borderColor: `${selectedDeptMeta.accentHex}35`,
                    }}
                    className="p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: selectedDeptMeta.accentHex }}
                        className="w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0"
                      >
                        {React.createElement(shopDeptIconMap[selectedDeptMeta.id], {
                          className: 'w-5 h-5',
                        })}
                      </div>
                      <div>
                        <h2
                          style={{ color: selectedDeptMeta.accentHex }}
                          className="text-sm sm:text-base font-black"
                        >
                          {selectedDeptMeta.label}
                        </h2>
                        <p className="text-xs text-slate-700 mt-0.5">
                          {selectedDeptMeta.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerFilterShimmer(() => setSelectedCategory('ALL'))}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-900 text-slate-900 hover:text-white text-xs font-extrabold border border-slate-200 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
                    >
                      بازگشت به همه دپارتمان‌ها
                    </button>
                  </div>
                )}

                <div
                  className={`grid gap-5 ${
                    isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}
                >
                  {filteredProducts.map((prd, idx) => renderProductCard(prd, idx))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ROUTE 2: PRODUCT DETAIL PAGE (/product/:id)
  // ============================================================================
  if (storePath.startsWith('/product/') && activeProduct) {
    const hasVars = activeProduct.variations && activeProduct.variations.length > 0;
    const activeVar = hasVars
      ? activeProduct.variations!.find((v) => v.id === pdpVariationId) ||
        activeProduct.variations![0]
      : undefined;

    const currentSku = activeVar ? activeVar.sku : activeProduct.sku;
    const currentRegularPrice = activeVar ? activeVar.priceToman : activeProduct.priceToman;
    const currentSalePrice = activeVar ? activeVar.salePriceToman : activeProduct.salePriceToman;
    const currentStock = activeVar ? activeVar.stock : activeProduct.stock;

    const allGalleryImages = Array.from(
      new Set(
        [
          activeVar?.imageUrl,
          activeProduct.featuredImageUrl,
          ...(activeProduct.galleryUrls || []),
          ...(activeProduct.variations?.map((v) => v.imageUrl) || []),
        ].filter(Boolean) as string[]
      )
    );

    const productReviews = state.cmsComments.filter(
      (c) =>
        c.targetId === activeProduct.id ||
        (c.categoryType === 'product_review' &&
          c.targetTitle.includes(activeProduct.name.slice(0, 15)))
    );

    const relatedProducts = state.products
      .filter((p) => p.id !== activeProduct.id)
      .slice(0, 3);

    const handleSubmitReview = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!reviewBody.trim()) return;
      setSubmittingReview(true);
      try {
        const res = await adapter.submitComment({
          categoryType: 'product_review',
          targetId: activeProduct.id,
          authorName: reviewAuthor.trim() || loggedInCustomer?.fullName || 'کاربر سایت',
          authorRoleOrOrg: reviewOrg,
          targetTitle: activeProduct.name,
          body: reviewBody,
          rating: reviewRating,
          pros: ['کیفیت ساخت استاندارد', `پشتیبانی تخصصی ${settings.academyNameFa}`],
          cons: [],
        });
        if (res.ok) {
          setReviewBody('');
          await refreshState();
          notify('دیدگاه و امتیاز شما با موفقیت در سامانه ثبت شد.');
        } else {
          notify(res.error || 'خطا در ثبت دیدگاه');
        }
      } finally {
        setSubmittingReview(false);
      }
    };

    return (
      <div className="py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 bg-white border border-slate-200 px-4 py-3 rounded-2xl">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigateStore('/')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              صفحه اصلی
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => navigateStore('/shop')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              فروشگاه محصولات
            </button>
            <span>/</span>
            <span className="font-bold text-slate-900 truncate max-w-xs">
              {activeProduct.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigateStore('/shop')}
            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>بازگشت به کاتالوگ</span>
          </button>
        </div>

        {/* Contiguous Purchase Module (Gallery + Variant Configurator + Buy Box) */}
        <div
          className={`bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 grid gap-8 ${
            isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
          }`}
        >
          {/* Image Gallery Slider (5 Cols) */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-5'} space-y-3`}>
            <div className="relative h-64 sm:h-80 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200">
              <motion.img
                key={pdpActiveImg}
                initial={{ opacity: 0.4, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                src={getResponsiveImageVariant(
                  pdpActiveImg ||
                    activeProduct.featuredImageUrl ||
                    '/assets/kits/kit-01.jpg',
                  'medium-800'
                )}
                srcSet={getResponsiveSrcSet(
                  pdpActiveImg ||
                    activeProduct.featuredImageUrl ||
                    '/assets/kits/kit-01.jpg'
                )}
                sizes="(max-width: 1024px) 92vw, 520px"
                width={800}
                height={533}
                decoding="async"
                alt={activeProduct.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 flex gap-1.5">
                <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-900/90 text-amber-400 rounded-lg">
                  {activeProduct.type}
                </span>
                {currentSalePrice && (
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-rose-600 text-white rounded-lg">
                    پیشنهاد ویژه جشنواره
                  </span>
                )}
              </div>
            </div>

            {/* Gallery Thumbnails */}
            {allGalleryImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2.5">
                {allGalleryImages.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPdpActiveImg(imgUrl)}
                    className={`h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      pdpActiveImg === imgUrl
                        ? 'border-indigo-600 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`thumb-${i}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                openVideoModal({
                  title: `ویدیوی بررسی تخصصی: ${activeProduct.name}`,
                  subtitle: activeProduct.specs,
                  videoUrl: activeProduct.introVideoUrl,
                })
              }
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-amber-400" />
              <span>پخش ویدیوی معرفی و بررسی تخصصی محصول</span>
            </button>
          </div>

          {/* Product Details & Interactive Variations (7 Cols) */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-7'} flex flex-col justify-between space-y-5`}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-indigo-600 font-bold">
                  {activeProduct.category || `تجهیزات و کیت‌های آموزشی ${settings.academyNameFa}`}
                </span>
                <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-800 font-bold" dir="ltr">
                  SKU: {currentSku}
                </span>
              </div>

              <BiDiText
                as="h1"
                className="text-lg sm:text-2xl font-extrabold text-slate-900 leading-snug"
              >
                {activeProduct.name}
              </BiDiText>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {activeProduct.description || activeProduct.specs}
              </p>

              {/* Interactive Variations Selector */}
              {hasVars && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-indigo-950">
                      انتخاب کانفیگ و متغیر محصول (بروزرسانی آنی قیمت و موجودی):
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      {currentStock > 0
                        ? `موجود در انبار (${formatPersianNumber(currentStock)} عدد)`
                        : 'ناموجود'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {activeProduct.variations!.map((v) => {
                      const isSelected = activeVar?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setPdpVariationId(v.id);
                            if (v.imageUrl) setPdpActiveImg(v.imageUrl);
                          }}
                          className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                              : 'bg-white hover:bg-indigo-50 text-slate-800 border-slate-200'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-extrabold">{v.attributeSummary}</div>
                            <div
                              className={`text-[10px] font-mono ${
                                isSelected ? 'text-indigo-200' : 'text-slate-500'
                              }`}
                              dir="ltr"
                            >
                              SKU: {v.sku} · Stock: {v.stock}
                            </div>
                          </div>
                          <div className="font-mono text-xs font-extrabold whitespace-nowrap">
                            {formatToman(v.salePriceToman || v.priceToman)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warranty & Availability Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-700 font-medium">{activeProduct.warranty}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">وضعیت انبار:</span>
                  <span className="font-bold text-emerald-700">
                    {currentStock > 0
                      ? `آماده تحویل (${formatPersianNumber(currentStock)} عدد)`
                      : 'اتمام موجودی'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Price Box + Quantity Stepper + Add to Cart CTA */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-slate-400">قیمت نهایی (با احتساب متغیر انتخابی):</div>
                  <div className="flex items-baseline gap-2.5 font-mono tabular-nums mt-0.5">
                    <span className="text-lg sm:text-2xl font-extrabold text-amber-400">
                      {formatToman(currentSalePrice || currentRegularPrice)}
                    </span>
                    {currentSalePrice && (
                      <span className="text-xs line-through text-slate-400">
                        {formatToman(currentRegularPrice)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setPdpQty((q) => Math.max(1, q - 1))}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 font-mono text-sm font-extrabold">
                    {formatPersianNumber(pdpQty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPdpQty((q) => Math.min(currentStock || 10, q + 1))}
                    className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => addToCart(activeProduct, activeVar?.id, pdpQty, true)}
                  className="py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-extrabold rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>افزودن به سبد خرید</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    addToCart(activeProduct, activeVar?.id, pdpQty, false);
                    navigateStore('/checkout');
                  }}
                  className="py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>خرید آنی و تسویه حساب</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* PDP Tabs: Technical Specs, Full Description & 5-Star Customer Reviews */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            {[
              { id: 'specs', label: 'مشخصات فنی و فایل‌ها' },
              { id: 'desc', label: 'بررسی تخصصی محصول' },
              {
                id: 'reviews',
                label: `دیدگاه‌ها و ثبت نظر ۵ ستاره (${formatPersianNumber(productReviews.length)})`,
              },
            ].map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setPdpTab(tb.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                  pdpTab === tb.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {pdpTab === 'specs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {(
                  activeProduct.techSpecsTable || [
                    { key: 'مشخصات پایه', value: activeProduct.specs },
                    { key: 'گارانتی و خدمات', value: activeProduct.warranty },
                  ]
                ).map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <span className="font-bold text-slate-700">{row.key}</span>
                    <span className="sm:col-span-2 font-mono text-slate-900" dir="ltr">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {activeProduct.virtualSessions && activeProduct.virtualSessions.length > 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                  <h4 className="text-xs font-extrabold text-indigo-950">
                    سرفصل‌ها و جلسات دوره آموزشی / خدمت مجازی:
                  </h4>
                  {activeProduct.virtualSessions.map((ses) => (
                    <div
                      key={ses.id}
                      className="p-2.5 bg-white rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-bold text-slate-800">{ses.title}</span>
                      <span className="text-slate-500">
                        مدرس: {ses.instructorOrLead} · {formatPersianNumber(ses.durationMinutes)}{' '}
                        دقیقه
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeProduct.downloadableFiles && activeProduct.downloadableFiles.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <h4 className="text-xs font-extrabold text-emerald-950">
                    فایل‌های قابل دانلود مستقیم این محصول:
                  </h4>
                  {activeProduct.downloadableFiles.map((df) => (
                    <a
                      key={df.id}
                      href={df.fileUrl}
                      download={df.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-mono text-indigo-600 hover:underline"
                      dir="ltr"
                    >
                      <span className="inline-flex items-center gap-2 font-bold">
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>{df.fileName}</span>
                      </span>
                      <span>{df.sizeMb}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {pdpTab === 'desc' && (
            <div className="space-y-4">
              <RichFormattedContent
                content={
                  activeProduct.fullReviewContent ||
                  activeProduct.description ||
                  activeProduct.specs
                }
              />
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                این محصول تحت استانداردهای کیفی {settings.academyNameFa} ({settings.domain}) عرضه
                شده و همراه با فاکتور رسمی و پشتیبانی مستقیم واحد فنی و کارگاهی ارائه می‌گردد.
              </div>
            </div>
          )}

          {pdpTab === 'reviews' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Existing Reviews */}
              <div className="lg:col-span-7 space-y-3">
                {productReviews.map((rv) => (
                  <div
                    key={rv.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-slate-900">
                          {rv.authorName}
                        </span>
                        <span className="text-[11px] text-indigo-600 mr-2">
                          ({rv.authorRoleOrOrg})
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: rv.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{rv.body}</p>
                  </div>
                ))}
              </div>

              {/* 5-Star Review Submission Form */}
              <form
                onSubmit={handleSubmitReview}
                className="lg:col-span-5 p-4 rounded-2xl bg-slate-900 text-white space-y-3"
              >
                <h4 className="text-xs font-extrabold text-amber-400">
                  ثبت دیدگاه تخصصی و امتیازدهی ۵ ستاره
                </h4>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">نام و نام خانوادگی:</label>
                  <input
                    type="text"
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">سمت یا سازمان:</label>
                  <input
                    type="text"
                    value={reviewOrg}
                    onChange={(e) => setReviewOrg(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">امتیاز شما:</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star as 1 | 2 | 3 | 4 | 5)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 ${
                          reviewRating >= star
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{formatPersianNumber(star)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">متن نظر و تجربه فنی:</label>
                  <textarea
                    rows={3}
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    placeholder="دیدگاه خود درباره کیفیت و عملکرد این محصول را بنویسید..."
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  {submittingReview ? 'در حال ثبت در دیتابیس...' : 'ثبت دیدگاه در دیتابیس'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Related & Similar Products Section */}
        {relatedProducts.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  محصولات مرتبط و مشابه {settings.academyNameFa}
                </h3>
                <p className="text-xs text-slate-500">
                  تجهیزات، سرورها و لایسنس‌های سازمانی مکمل این محصول
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateStore('/shop')}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                مشاهده همه کالاها ←
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedProducts.map((rel) => {
                const relPrice = rel.salePriceToman || rel.priceToman;
                return (
                  <div
                    key={rel.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between gap-3"
                  >
                    <div
                      onClick={() => navigateStore(`/product/${rel.id}`)}
                      className="space-y-2.5 cursor-pointer"
                    >
                      <div className="h-36 rounded-xl bg-slate-900 overflow-hidden">
                        <img
                          src={
                            rel.featuredImageUrl ||
                            '/assets/kits/kit-01.jpg'
                          }
                          alt={rel.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="text-[11px] font-bold text-indigo-600">
                        {rel.category || 'سازمانی'}
                      </div>
                      <BiDiText
                        as="h4"
                        className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-2"
                      >
                        {rel.name}
                      </BiDiText>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-extrabold text-emerald-700">
                        {formatToman(relPrice)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigateStore(`/product/${rel.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-indigo-600 cursor-pointer"
                        >
                          مشاهده
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(rel, undefined, 1, true)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          + خرید
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // ROUTE 3: SHOPPING CART PAGE (/cart)
  // ============================================================================
  if (storePath === '/cart') {
    return (
      <div className="py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-5 rounded-3xl">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
              سبد خرید و محاسبه هوشمند کوپن (/cart)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              تغییر تعداد اقلام، بررسی متغیرهای انتخابی و اعمال زنده کد تخفیف
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateStore('/shop')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
          >
            + افزودن کالای دیگر از فروشگاه
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto" />
            <div className="text-base font-extrabold text-slate-800">سبد خرید شما خالی است</div>
            <button
              type="button"
              onClick={() => navigateStore('/shop')}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl cursor-pointer"
            >
              بازگشت به کاتالوگ محصولات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cart Items Table */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
              <div className="divide-y divide-slate-100">
                {cartItems.map((item) => (
                  <div
                    key={item.cartKey}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="space-y-1 min-w-0">
                        <BiDiText as="h3" className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {item.title}
                        </BiDiText>
                        {item.variationSummary && (
                          <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md inline-block">
                            {item.variationSummary}
                          </div>
                        )}
                        <div className="text-[11px] font-mono text-slate-500" dir="ltr">
                          SKU: {item.sku} · Unit: {formatToman(item.unitPrice)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="inline-flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.cartKey, item.qty - 1)}
                          className="p-1.5 rounded-lg bg-white text-slate-700 hover:text-rose-600 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 font-mono text-xs font-extrabold">
                          {formatPersianNumber(item.qty)}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.cartKey, item.qty + 1)}
                          className="p-1.5 rounded-lg bg-white text-slate-700 hover:text-indigo-600 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="font-mono text-xs sm:text-sm font-extrabold text-emerald-700 whitespace-nowrap">
                        {formatToman(item.qty * item.unitPrice)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.cartKey)}
                        className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Input Bar */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={appliedCouponCode}
                    onChange={(e) => setAppliedCouponCode(e.target.value)}
                    placeholder="کد کوپن تخفیف (مثلاً: DPATECH2026)"
                    className="flex-1 px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      notify(
                        matchedCoupon
                          ? `کوپن «${matchedCoupon.code}» با موفقیت روی سبد اعمال شد.`
                          : 'کد کوپن در لیست کوپن‌های فعال یافت نشد.'
                      )
                    }
                    className="px-4 py-2 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    بررسی و اعمال کوپن
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500">کوپن‌های فعال:</span>
                  {state.coupons.map((cp) => (
                    <button
                      key={cp.code}
                      type="button"
                      onClick={() => {
                        setAppliedCouponCode(cp.code);
                        notify(`کوپن ${cp.code} انتخاب و اعمال شد.`);
                      }}
                      className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-mono font-bold hover:bg-indigo-100 cursor-pointer"
                    >
                      {cp.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart Summary Card */}
            <div className="lg:col-span-4 bg-slate-900 text-white rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-amber-400 border-b border-slate-800 pb-3">
                خلاصه صورتحساب و فاکتور
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">جمع کل اقلام:</span>
                  <span className="font-mono font-bold">{formatToman(cartSubtotal)}</span>
                </div>
                {couponDiscountToman > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>تخفیف کوپن ({appliedCouponCode}):</span>
                    <span className="font-mono font-bold">-{formatToman(couponDiscountToman)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">مالیات و عوارض ارزش افزوده (۱۰٪):</span>
                  <span className="font-mono font-bold">{formatToman(vatTaxToman)}</span>
                </div>
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-sm">
                  <span className="font-extrabold">مبلغ قابل پرداخت:</span>
                  <span className="font-mono font-extrabold text-amber-400">
                    {formatToman(grandTotalToman)}
                  </span>
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigateStore('/checkout')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-extrabold rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <span>ادامه جهت تسویه حساب</span>
                <ArrowLeft className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // ROUTE 4: CHECKOUT & PAYMENT GATEWAY SELECTION (/checkout)
  // ============================================================================
  if (storePath === '/checkout') {
    const handleCreatePaymentAndSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (cartItems.length === 0) {
        notify('سبد خرید شما خالی است. ابتدا یک محصول اضافه کنید.');
        return;
      }
      setIsCreatingPayment(true);
      try {
        const data = await adapter.createPaymentRequest({
          customerName,
          phone: customerPhone,
          nationalId,
          economicCode,
          postalCode,
          province,
          city,
          address,
          shippingMethod,
          orderNote,
          couponCode: appliedCouponCode.trim() || undefined,
          gatewayId: selectedGateway,
          cardReceiptRef: selectedGateway === 'card_to_card' ? cardReceiptRef : undefined,
          items: cartItems,
        });
        if (!data.ok) {
          notify(data.error || 'خطا در اتصال به درگاه پرداخت');
          return;
        }

        const createdOrderId = data.order?.id || (data as any).orderId || 'ORD-NEW';
        const authorityCode = data.authority || createdOrderId;

        // If online bank IPG (Zarinpal or NovinoPay), redirect to payment terminal or sandbox
        if (selectedGateway === 'zarinpal' || selectedGateway === 'novinopay') {
          notify('در حال انتقال به درگاه پرداخت بانکی شاپرک...');
          navigateStore(`/payment-gateway/${authorityCode}`);
          return;
        }

        // For Wallet or Card-to-Card, verify immediately and navigate to Order Received
        const verifyData = await adapter.verifyPayment({
          authority: authorityCode,
          orderId: createdOrderId,
          status: 'OK',
        });
        if (verifyData.ok) {
          clearCart();
          await refreshState();
          notify(`سفارش ${createdOrderId} با موفقیت ثبت و فاکتور رسمی صادر شد.`);
          navigateStore(`/order-received/${createdOrderId}`);
        } else {
          notify(verifyData.error || 'خطا در تایید سفارش');
        }
      } finally {
        setIsCreatingPayment(false);
      }
    };

    const cardToCardGw = state.paymentGateways.find((g) => g.id === 'card_to_card');

    return (
      <div className="py-6 w-full max-w-3xl mx-auto flex flex-col gap-5">
        {/* Top Page Title & Back Button */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
              تسویه حساب نهایی و ثبت سفارش (/checkout)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              فرآیند ۴ مرحله‌ای شفاف: ۱. خلاصه سبد خرید ← ۲. اطلاعات گیرنده ← ۳. انتخاب درگاه ← ۴. پرداخت
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateStore('/cart')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
          >
            بازگشت به سبد خرید
          </button>
        </div>

        <form onSubmit={handleCreatePaymentAndSubmit} className="w-full flex flex-col gap-5">
          {/* STEP 1: COMPACT CART SUMMARY BOX AT THE TOP */}
          <div className="w-full bg-slate-900 text-white rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h2 className="text-sm sm:text-base font-extrabold text-amber-400 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 text-xs font-extrabold inline-flex items-center justify-center">
                  ۱
                </span>
                <span>
                  خلاصه سبد خرید ({formatPersianNumber(cartItems.reduce((s, i) => s + i.qty, 0))} کالا)
                </span>
              </h2>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                مبلغ کل قابل پرداخت: {formatToman(grandTotalToman)}
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-52 overflow-y-auto pr-1">
              {cartItems.map((it) => (
                <div
                  key={it.cartKey}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{it.title}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {formatPersianNumber(it.qty)} عدد × {formatToman(it.unitPrice)}
                      {it.variationSummary ? ` | ${it.variationSummary}` : ''}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 whitespace-nowrap">
                    {formatToman(it.qty * it.unitPrice)}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800 text-xs">
              <div className="p-3 rounded-2xl bg-slate-800/70 flex items-center justify-between">
                <span className="text-slate-300">جمع اقلام:</span>
                <span className="font-mono font-bold">{formatToman(cartSubtotal)}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/70 flex items-center justify-between">
                <span className="text-slate-300">ارزش افزوده (۱۰٪):</span>
                <span className="font-mono font-bold">{formatToman(vatTaxToman)}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between">
                <span className="text-amber-300 font-bold">قابل پرداخت:</span>
                <span className="font-mono font-extrabold text-amber-400">
                  {formatToman(grandTotalToman)}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 2: FULL-WIDTH SINGLE-COLUMN RECIPIENT & SHIPPING FORM */}
          <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold inline-flex items-center justify-center">
                  ۲
                </span>
                <span>اطلاعات گیرنده و آدرس ارسال مرسوله</span>
              </h2>
              <button
                type="button"
                onClick={() => navigateStore('/my-account')}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                مدیریت دفترچه آدرس‌ها ←
              </button>
            </div>

            {/* Quick Select from Customer Saved Addresses */}
            {state.customerAddresses && state.customerAddresses.length > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
                <div className="text-xs font-extrabold text-indigo-950">
                  انتخاب سریع از آدرس‌های ذخیره‌شده شما:
                </div>
                <div className="flex flex-col gap-2">
                  {state.customerAddresses.map((saved) => (
                    <button
                      key={saved.id}
                      type="button"
                      onClick={() => {
                        setCustomerName(saved.recipientName);
                        setCustomerPhone(saved.phone);
                        setProvince(saved.province);
                        setCity(saved.city);
                        setPostalCode(saved.postalCode);
                        setAddress(saved.exactAddress);
                        notify(`آدرس «${saved.label}» در فرم تسویه حساب جایگذاری شد.`);
                      }}
                      className="w-full p-3 rounded-xl bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-right transition-colors cursor-pointer space-y-1"
                    >
                      <div className="text-xs font-extrabold flex items-center justify-between">
                        <span>{saved.label}</span>
                        <span className="text-[11px] font-mono opacity-80">
                          {saved.province} - {saved.city}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-85 truncate">{saved.exactAddress}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Single-Column Full-Width Fields */}
            <div className="w-full flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نام و نام خانوادگی گیرنده / نام حقوقی شرکت *:
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  شماره موبایل تحویل‌گیرنده *:
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">استان *:</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="مثلاً: تهران"
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">شهر *:</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثلاً: تهران"
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  کد پستی ۱۰ رقمی *:
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  کد ملی / شناسه ملی سازمان (جهت صدور فاکتور رسمی):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نشانی کامل پستی *:
                </label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">روش ارسال:</label>
                <select
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="پست پیشتاز ویژه سازمانی (بیمه کامل)">
                    پست پیشتاز ویژه سازمانی (بیمه کامل)
                  </option>
                  <option value="تیپاکس اکسپرس سازمانی">تیپاکس اکسپرس سازمانی</option>
                  <option value="پیک اختصاصی دیتاسنتر (تهران)">پیک اختصاصی دیتاسنتر (تهران)</option>
                  <option value="تحویل آنی دیجیتال / ابری">تحویل آنی دیجیتال / ابری</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  توضیحات سفارش (اختیاری):
                </label>
                <input
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="مثلاً: تحویل در ساعات اداری به حراست مجموعه..."
                  className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: PAYMENT METHOD SELECTION (LARGE, READABLE CARDS) */}
          <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold inline-flex items-center justify-center">
                  ۳
                </span>
                <span>انتخاب روش پرداخت و درگاه بانکی</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                یکی از درگاه‌های رسمی بانکی شاپرک یا روش‌های تسویه سازمانی زیر را انتخاب نمایید
              </p>
            </div>

            <div className="w-full flex flex-col gap-3">
              {[
                {
                  id: 'zarinpal',
                  title: 'درگاه پرداخت اینترنتی زرین‌پال (Zarinpal Enterprise)',
                  sub: 'پرداخت آنلاین و آنی با کلیه کارت‌های بانکی عضو شبکه شتاب (شاپرک)',
                  icon: Landmark,
                },
                {
                  id: 'novinopay',
                  title: 'درگاه هوشمند نوینوپی (NovinoPay IPG)',
                  sub: 'سوئیچ مستقیم بانکی با تایید خودکار تراکنش و صدور آنی فاکتور',
                  icon: CreditCard,
                },
                {
                  id: 'card_to_card',
                  title: 'کارت به کارت / حواله پایا سازمانی',
                  sub: 'مناسب پرداخت‌های سازمانی و ثبت شماره پیگیری فیش بانکی',
                  icon: Building2,
                },
                {
                  id: 'wallet',
                  title: `پرداخت از اعتبار کیف پول ${settings.academyNameFa}`,
                  sub: `موجودی فعلی کیف پول شما: ${formatToman(
                    loggedInCustomer?.walletBalanceToman || 0
                  )}`,
                  icon: Wallet,
                },
              ].map((gw) => {
                const Icon = gw.icon;
                const active = selectedGateway === gw.id;
                return (
                  <button
                    key={gw.id}
                    type="button"
                    onClick={() => setSelectedGateway(gw.id as any)}
                    className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          active ? 'bg-white/15 text-amber-300' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold">{gw.title}</div>
                        <div
                          className={`text-[11px] sm:text-xs leading-relaxed ${
                            active ? 'text-indigo-100' : 'text-slate-500'
                          }`}
                        >
                          {gw.sub}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        active ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-slate-300'
                      }`}
                    >
                      {active && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedGateway === 'card_to_card' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5 text-xs text-amber-950">
                <div className="font-bold">
                  شماره کارت رسمی {settings.academyNameFa}:{' '}
                  <span className="font-mono font-extrabold" dir="ltr">
                    {cardToCardGw?.cardNumber || 'از تنظیمات درگاه در پنل مدیریت وارد شود'}
                  </span>
                </div>
                {cardToCardGw?.ibanNumber && (
                  <div className="font-mono text-[11px]" dir="ltr">
                    IBAN: {cardToCardGw.ibanNumber} ({cardToCardGw.accountHolder || settings.academyNameFa})
                  </div>
                )}
                <div className="pt-1">
                  <label className="block text-[11px] font-bold mb-1">
                    شماره پیگیری فیش واریزی یا حواله پایا:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={cardReceiptRef}
                    onChange={(e) => setCardReceiptRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-mono text-xs"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: LARGE FULL-WIDTH SUBMIT BUTTON */}
          <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold text-slate-800">
              <span>مبلغ نهایی قابل پرداخت:</span>
              <span className="font-mono text-base sm:text-lg text-emerald-700">
                {formatToman(grandTotalToman)}
              </span>
            </div>

            <motion.button
              type="submit"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              disabled={isCreatingPayment || cartItems.length === 0}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm sm:text-base font-extrabold rounded-2xl cursor-pointer flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/25"
            >
              <Lock className="w-5 h-5" />
              <span>
                {isCreatingPayment
                  ? 'در حال اتصال به درگاه بانکی...'
                  : 'پرداخت و انتقال به درگاه'}
              </span>
            </motion.button>
          </div>
        </form>
      </div>
    );
  }

  // ============================================================================
  // ROUTE 5: SHAPARAK / ZARINPAL / NOVINOPAY SANDBOX GATEWAY (/payment-gateway/:authority)
  // ============================================================================
  if (storePath.startsWith('/payment-gateway/')) {
    const authority = storePath.replace('/payment-gateway/', '').trim();
    const pendingOrder =
      state.orders.find((o) => o.paymentAuthority === authority) || state.orders[0];

    const handleGatewayCallback = async (callbackStatus: 'OK' | 'NOK') => {
      setIsVerifyingPayment(true);
      try {
        const data = await adapter.verifyPayment({
          authority,
          orderId: pendingOrder?.id,
          status: callbackStatus,
        });
        await refreshState();

        if (callbackStatus === 'OK' && data.ok) {
          clearCart();
          const refId = (data as any).refId || data.order?.paymentRefId || 'VERIFIED';
          notify(`پرداخت با موفقیت انجام شد! کد پیگیری بانکی (RefID): ${refId}`);
          navigateStore(`/order-received/${data.order?.id || pendingOrder?.id || 'ORD-NEW'}`);
        } else {
          notify('تراکنش توسط خریدار لغو شد.');
          navigateStore(`/order-received/${pendingOrder?.id || 'ORD-NEW'}`);
        }
      } finally {
        setIsVerifyingPayment(false);
      }
    };

    const amountToman = pendingOrder?.totalToman || grandTotalToman || 0;
    const amountRial = amountToman * 10;

    return (
      <div className="py-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border-2 border-indigo-600/30 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Shaparak Official Style Top Banner */}
          <div className="bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-mono text-emerald-400">
                  SHAPARAK ELECTRONIC PAYMENT NETWORK · SANDBOX IPG
                </div>
                <h1 className="text-sm sm:text-base font-extrabold">
                  شبیه‌ساز درگاه پرداخت اینترنتی شاپرک ({pendingOrder?.paymentGateway || 'زرین‌پال / نوینوپی'})
                </h1>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-amber-400" dir="ltr">
              SSL 256-BIT VERIFIED
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Merchant & Transaction Info (5 Cols) */}
            <div className="md:col-span-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="pb-2 border-b border-slate-200">
                <FatehanLogo size="sm" variant="full" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">نام پذیرنده:</span>
                <span className="font-bold text-slate-900">
                  {settings.academyNameFa} ({settings.domain})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">شماره سفارش:</span>
                <span className="font-mono font-bold text-indigo-700" dir="ltr">
                  {pendingOrder?.id || 'ORD-84925'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">شناسه Authority:</span>
                <span className="font-mono text-[10px] text-slate-700 truncate max-w-[140px]" dir="ltr">
                  {authority}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="text-slate-500">مبلغ قابل پرداخت (تومان):</div>
                <div className="text-sm font-mono font-extrabold text-emerald-700">
                  {formatToman(amountToman)}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  معادل ریالی شاپرک: {formatPersianNumber(amountRial)} ریال
                </div>
              </div>
            </div>

            {/* Sandbox Card Form & Callback Triggers (7 Cols) */}
            <div className="md:col-span-7 space-y-4">
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-950 leading-relaxed">
                <strong>محیط تست درگاه شاپرک (Sandbox Mode):</strong> اطلاعات کارت به صورت پیش‌فرض
                پر شده است. با کلیک روی <strong>«پرداخت موفق»</strong>، بازگشت از بانک
                (`/api/payment/verify`)، صدور کد رهگیری `RefID`، کسر موجودی از انبار و صدور فاکتور
                رسمی به صورت زنده اجرا می‌شود.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شماره کارت ۱۶ رقمی عضو شتاب:
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={sandboxCardNumber}
                    onChange={(e) => setSandboxCardNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm font-mono font-bold text-center tracking-wider bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رمز دوم پویا (OTP):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={sandboxPin}
                      onChange={(e) => setSandboxPin(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono text-center bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      CVV2:
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={sandboxCvv2}
                      onChange={(e) => setSandboxCvv2(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono text-center bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تاریخ انقضا:
                    </label>
                    <div className="flex gap-1" dir="ltr">
                      <input
                        type="text"
                        value={sandboxExpYear}
                        onChange={(e) => setSandboxExpYear(e.target.value)}
                        className="w-1/2 px-2 py-2 text-xs font-mono text-center bg-slate-50 border border-slate-300 rounded-xl"
                      />
                      <input
                        type="text"
                        value={sandboxExpMonth}
                        onChange={(e) => setSandboxExpMonth(e.target.value)}
                        className="w-1/2 px-2 py-2 text-xs font-mono text-center bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={isVerifyingPayment}
                  onClick={() => handleGatewayCallback('OK')}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>پرداخت موفق و تکمیل خرید</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={isVerifyingPayment}
                  onClick={() => handleGatewayCallback('NOK')}
                  className="py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-extrabold rounded-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>انصراف از پرداخت</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // ROUTE 6: ORDER RECEIVED & OFFICIAL PRINTABLE INVOICE (/order-received/:id)
  // ============================================================================
  if (storePath.startsWith('/order-received/')) {
    const orderIdParam = storePath.replace('/order-received/', '').trim();
    const order =
      state.orders.find((o) => o.id === orderIdParam) || state.orders[0];

    if (!order) return null;

    const isPaid = order.status === 'Paid' || order.status === 'Shipped';
    const isCancelled = order.status === 'Cancelled';
    const subtotalBeforeTax = order.totalToman - order.taxToman + order.discountToman;

    return (
      <div className="py-6 space-y-6">
        {/* Status Banner (Hidden on Print) */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className={`no-print p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isCancelled
              ? 'bg-rose-950 text-white border-rose-800'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isCancelled ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {isCancelled ? (
                <XCircle className="w-6 h-6 text-white" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono text-amber-400">
                ORDER CONFIRMATION · /ORDER-RECEIVED/{order.id}
              </div>
              <h1 className="text-base sm:text-xl font-extrabold">
                {isCancelled
                  ? `تراکنش سفارش ${order.id} لغو گردید`
                  : `سفارش ${order.id} با موفقیت ثبت و تایید شد`}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                <span>
                  کد پیگیری تراکنش بانکی (RefID):{' '}
                  <strong className="font-mono text-emerald-400" dir="ltr">
                    {order.paymentRefId || order.trackingCode}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  شماره فاکتور رسمی:{' '}
                  <strong className="font-mono text-amber-300">{order.invoiceNumber}</strong>
                </span>
                {order.cashbackAwardedToman ? (
                  <>
                    <span>·</span>
                    <span className="text-amber-300 font-bold">
                      پاداش کش‌بک کیف پول: +{formatToman(order.cashbackAwardedToman)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isCancelled ? (
              <button
                type="button"
                onClick={() => navigateStore('/checkout')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تلاش مجدد برای پرداخت</span>
              </button>
            ) : (
              <>
                <div className="inline-flex bg-slate-800 p-1 rounded-xl text-xs">
                  {(['A4', 'A5', '80mm'] as PrintPaperSize[]).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setInvoicePaperSize(sz)}
                      className={`px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer ${
                        invoicePaperSize === sz
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ فاکتور رسمی ({invoicePaperSize})</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigateStore('/shop')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              بازگشت به فروشگاه
            </button>
          </div>
        </motion.div>

        {/* Official Locked DPA Tech Printable Tax Invoice */}
        <div
          className={`bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-8 space-y-5 mx-auto ${
            invoicePaperSize === '80mm'
              ? 'max-w-[360px]'
              : invoicePaperSize === 'A5'
              ? 'max-w-3xl'
              : 'max-w-5xl'
          }`}
        >
          {/* Seller Official Fatehan Robotics Academy Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
            <FatehanLogo size="md" variant="full" />
            <div className="text-xs space-y-1 font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                شماره فاکتور رسمی: <strong>{order.invoiceNumber}</strong>
              </div>
              <div>
                تاریخ صدور: <strong>{order.createdAt}</strong>
              </div>
              <div>
                وضعیت پرداخت:{' '}
                <strong className={isPaid ? 'text-emerald-700' : 'text-amber-700'}>
                  {isPaid ? 'پرداخت شده (تایید شاپرک)' : order.status}
                </strong>
              </div>
            </div>
          </div>

          {/* Seller & Buyer Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
              <div className="font-extrabold text-slate-900">
                فروشنده: {settings.academyNameFa} ({settings.location.city})
              </div>
              <div>تلفن تماس: {settings.phones.primaryFormatted}</div>
              <div>نشانی: {settings.location.addressFull} · وب‌سایت: {settings.domain}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-1">
              <div className="font-extrabold text-slate-900">خریدار: {order.customerName}</div>
              <div>
                شناسه/کد ملی: {order.nationalId} · کد پستی: {order.postalCode}
              </div>
              <div>
                تلفن: {order.phone} · نشانی: {order.address}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-2.5 border border-slate-700 text-right">ردیف</th>
                  <th className="p-2.5 border border-slate-700 text-right">کد کالا (SKU)</th>
                  <th className="p-2.5 border border-slate-700 text-right">
                    شرح کالا / خدمت و متغیر انتخابی
                  </th>
                  <th className="p-2.5 border border-slate-700 text-center">تعداد</th>
                  <th className="p-2.5 border border-slate-700 text-left">مبلغ واحد</th>
                  <th className="p-2.5 border border-slate-700 text-left">مبلغ کل</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="p-2.5 border border-slate-200 font-mono">
                      {formatPersianNumber(i + 1)}
                    </td>
                    <td className="p-2.5 border border-slate-200 font-mono" dir="ltr">
                      {it.sku}
                    </td>
                    <td className="p-2.5 border border-slate-200 font-bold text-slate-900">
                      {it.title}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono">
                      {formatPersianNumber(it.qty)}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-left font-mono whitespace-nowrap">
                      {formatToman(it.unitPrice)}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-left font-mono font-extrabold whitespace-nowrap">
                      {formatToman(it.qty * it.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Official Stamp Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
            <div className="text-xs text-slate-600 space-y-1">
              <div>روش پرداخت: {order.paymentGateway}</div>
              <div>
                کد رهگیری تراکنش / مرسوله:{' '}
                <span className="font-mono font-bold text-slate-900" dir="ltr">
                  {order.paymentRefId || order.trackingCode}
                </span>
              </div>
              <div>روش ارسال: {order.shippingMethod}</div>
            </div>

            <div className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="whitespace-nowrap">جمع کل اقلام:</span>
                <span className="font-mono font-bold whitespace-nowrap">
                  {formatToman(subtotalBeforeTax)}
                </span>
              </div>
              {order.discountToman > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span className="whitespace-nowrap">کسر تخفیف کوپن:</span>
                  <span className="font-mono font-bold whitespace-nowrap">
                    -{formatToman(order.discountToman)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="whitespace-nowrap">مالیات و عوارض ارزش افزوده (۱۰٪):</span>
                <span className="font-mono font-bold whitespace-nowrap">
                  {formatToman(order.taxToman)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-extrabold text-slate-900">
                <span className="whitespace-nowrap">مبلغ نهایی پرداخت‌شده:</span>
                <span className="font-mono text-indigo-700 whitespace-nowrap">
                  {formatToman(order.totalToman)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ROUTE 0: DYNAMIC HOME PAGE (/) - FATEHAN ROBOTICS ACADEMY
  // ============================================================================
  return <FatehanStorefrontHome />;
};
