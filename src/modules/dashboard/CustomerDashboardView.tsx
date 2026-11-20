import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Download,
  Bookmark,
  FileCode,
  Copy,
  Check,
  FileText,
  Layers,
  ShieldCheck,
  Terminal,
  ExternalLink,
  CheckCircle2,
  Search,
  Lock,
  BookOpen,
  X,
  ArrowUpLeft,
  ChevronDown,
  Crown,
  Sparkles,
  FileArchive,
} from 'lucide-react';
import type {
  ActiveTab,
  CmsSessionRecord,
  OrderRecord,
  SiteModuleRegistryItem,
  SkillArticle,
  SkillProduct,
  SmartCrmRecommendation,
  SubscriptionPlanItem,
  UserRoleType,
  UserSubscriptionRecord,
} from '../../core/types';
import { apiJson } from '../../core/apiClient';
import { downloadSingleSkillFile } from '../../core/zipGenerator';
import { resolveResponsiveMediaUrl } from '../../data/mediaAssets';
import { ProgressiveImage } from '../../theme/components/ProgressiveImage';

interface CustomerDashboardViewProps {
  userUid: string | null;
  userDisplayName: string | null;
  userPhone?: string;
  userRole: UserRoleType;
  orders: OrderRecord[];
  products: SkillProduct[];
  articles: SkillArticle[];
  sessions: CmsSessionRecord[];
  bookmarkedIds: string[];
  claimedSkillIds?: string[];
  initialSelectedSkillId?: string;
  accentButtonClass: string;
  accentTextClass: string;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenAuthModal: () => void;
  onCancelOrder: (orderId: string) => Promise<void>;
  onDownloadStarterZip?: () => Promise<void>;
  onSelectSkillProduct: (product: SkillProduct) => void;
  onOpenFullArticle?: (article: SkillArticle) => void;
  onRevokeSession?: (sessionId: string) => void;
}

type DashboardSubTab =
  | 'my_downloads'
  | 'my_skills'
  | 'my_vip'
  | 'my_orders'
  | 'my_bookmarks'
  | 'my_security';

interface ProtectedLibraryProduct {
  productId: string;
  productTitle: string;
  productSlug: string;
  category?: string;
  productType: string;
  imageUrl?: string;
  version?: string;
  price?: number;
  accessNote?: string;
  hasSkillMarkdown?: boolean;
  orderId?: string | null;
  purchasedAtLabel?: string | null;
  files: Array<{
    id: string;
    title: string;
    fileName?: string;
    fileSizeLabel?: string;
    version?: string;
    storageType: 'uploaded' | 'external_host';
    protectedDownload: boolean;
  }>;
}

export const CustomerDashboardView: React.FC<CustomerDashboardViewProps> = ({
  userUid,
  userDisplayName,
  userPhone,
  userRole,
  orders,
  products,
  articles,
  sessions,
  bookmarkedIds,
  claimedSkillIds = [],
  initialSelectedSkillId,
  accentButtonClass,
  onNavigateTab,
  onOpenAuthModal,
  onCancelOrder,
  onSelectSkillProduct,
  onOpenFullArticle,
  onRevokeSession,
}) => {
  const [subTab, setSubTab] = useState<DashboardSubTab>('my_skills');
  const [activeReaderSkill, setActiveReaderSkill] = useState<SkillProduct | null>(() =>
    initialSelectedSkillId
      ? products.find((p) => p.id === initialSelectedSkillId) || null
      : null
  );
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<'unlocked' | 'all' | 'Claude' | 'ChatGPT' | 'Codex'>('all');
  const [copiedSkillId, setCopiedSkillId] = useState<string | null>(null);
  const [downloadedNotice, setDownloadedNotice] = useState<string | null>(null);
  const [customNotesBySkill, setCustomNotesBySkill] = useState<Record<string, string>>({});
  const [vipPlans, setVipPlans] = useState<SubscriptionPlanItem[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<UserSubscriptionRecord | null>(null);
  const [crmRecs, setCrmRecs] = useState<SmartCrmRecommendation[]>([]);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [protectedLibrary, setProtectedLibrary] = useState<ProtectedLibraryProduct[]>([]);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [enabledModulesMap, setEnabledModulesMap] = useState<Record<string, boolean>>({
    mod_subscriptions: true,
    mod_smart_crm: true,
  });

  React.useEffect(() => {
    void apiJson<{ ok?: boolean; modules?: SiteModuleRegistryItem[] }>('/api/v1/modules/registry')
      .then(({ ok, data }) => {
        if (ok && Array.isArray(data.modules)) {
          const map: Record<string, boolean> = {};
          for (const m of data.modules) map[m.id] = m.enabled;
          setEnabledModulesMap(map);
        }
      })
      .catch(() => {});

    void apiJson<{ ok?: boolean; plans?: SubscriptionPlanItem[] }>(
      '/api/v1/modules/subscriptions/plans'
    )
      .then(({ ok, data }) => {
        if (ok && Array.isArray(data.plans)) setVipPlans(data.plans);
      })
      .catch(() => {});

    if (userUid) {
      void apiJson<{ ok?: boolean; activeSubscription?: UserSubscriptionRecord | null }>(
        '/api/v1/modules/subscriptions/my-status'
      )
        .then(({ ok, data }) => {
          if (ok) setActiveSubscription(data.activeSubscription || null);
        })
        .catch(() => {});

      void apiJson<{ ok?: boolean; items?: SmartCrmRecommendation[] }>(
        '/api/v1/modules/smart-crm/my-recommendations'
      )
        .then(({ ok, data }) => {
          if (ok && Array.isArray(data.items)) setCrmRecs(data.items);
        })
        .catch(() => {});

      void apiJson<{ ok?: boolean; items?: ProtectedLibraryProduct[] }>(
        '/api/v1/downloads/my-library'
      )
        .then(({ ok, data }) => {
          if (ok && Array.isArray(data.items)) setProtectedLibrary(data.items);
        })
        .catch(() => {});
    }
  }, [userUid, orders.length]);

  const totalProtectedDownloadFiles = useMemo(
    () => protectedLibrary.reduce((acc, item) => acc + item.files.length, 0),
    [protectedLibrary]
  );

  const handleSecureProtectedDownload = async (
    productId: string,
    fileId: string,
    fileTitle: string
  ) => {
    const key = `${productId}:${fileId}`;
    setDownloadingKey(key);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        downloadUrl?: string;
        expiresInSeconds?: number;
        error?: string;
      }>('/api/v1/downloads/token', {
        method: 'POST',
        body: JSON.stringify({ productId, fileId }),
      });
      if (!ok || !data.downloadUrl) {
        throw new Error(data.error || 'خطا در صدور لینک امن دانلود');
      }
      const anchor = document.createElement('a');
      anchor.href = data.downloadUrl;
      anchor.setAttribute('download', '');
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setDownloadedNotice(
        `دانلود امن فایل «${fileTitle}» با توکن موقت اختصاصی (بدون افشای لینک اصلی سرور) آغاز شد.`
      );
      setTimeout(() => setDownloadedNotice(null), 5000);
    } catch (err) {
      setDownloadedNotice(
        err instanceof Error ? err.message : 'خطا در دریافت فایل دانلودی محافظت‌شده'
      );
      setTimeout(() => setDownloadedNotice(null), 5000);
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleActivateVipPlan = async (plan: SubscriptionPlanItem) => {
    if (!userUid) {
      onOpenAuthModal();
      return;
    }
    setSubscribingPlanId(plan.id);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        subscription?: UserSubscriptionRecord;
        error?: string;
      }>('/api/v1/modules/subscriptions/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId: plan.id }),
      });
      if (!ok || !data.subscription) {
        throw new Error(data.error || 'خطا در فعال‌سازی اشتراک VIP');
      }
      setActiveSubscription(data.subscription);
      setDownloadedNotice(
        `اشتراک «${plan.titleFa}» فعال شد! تمامی اسکیل‌های مشمول و آپدیت‌های جدید به‌صورت خودکار برای شما باز شدند.`
      );
      setTimeout(() => setDownloadedNotice(null), 5500);
    } catch (err) {
      setDownloadedNotice(err instanceof Error ? err.message : 'خطا در خرید اشتراک');
      setTimeout(() => setDownloadedNotice(null), 4000);
    } finally {
      setSubscribingPlanId(null);
    }
  };

  React.useEffect(() => {
    if (initialSelectedSkillId) {
      const target = products.find((p) => p.id === initialSelectedSkillId) || null;
      if (target) {
        setActiveReaderSkill(target);
        setSubTab('my_skills');
      }
    }
  }, [initialSelectedSkillId, products]);

  const userOrders = useMemo(() => {
    if (!userPhone && !userUid) return [];
    return orders.filter(
      (o) =>
        (userPhone && o.buyerId === userPhone) ||
        (userUid && userUid !== 'user_logged_in' && o.buyerId === userUid)
    );
  }, [orders, userPhone, userUid]);

  // Strict customer-only sessions (never leaks other users' sessions)
  const userSessions = useMemo<CmsSessionRecord[]>(() => {
    if (!userPhone) return [];
    const filtered = sessions.filter((s) => s.phone === userPhone);
    if (filtered.length > 0) return filtered;
    return [
      {
        id: `current_${userPhone}`,
        phone: userPhone,
        userDisplay: userDisplayName || 'کاربر اسکیل ۹۸',
        roleLabel: 'حساب کاربری تاییدشده',
        deviceLabel: 'مرورگر فعلی شما · ورود تاییدشده با OTP',
        authMethod: 'otp_sms',
        ipMasked: 'نشست جاری',
        status: 'active',
        lastActiveLabel: 'هم‌اکنون (فعال)',
      },
    ];
  }, [sessions, userPhone, userDisplayName]);

  const isSkillUnlocked = (skill: SkillProduct | null): boolean => {
    if (!skill) return false;
    if (skill.price === 0) return true;
    if (claimedSkillIds.includes(skill.id)) return true;
    if (userRole === 'admin' || userRole === 'super_admin') return true;
    if (activeSubscription && activeSubscription.status === 'active') {
      const cats = activeSubscription.coveredCategories || ['all'];
      if (cats.includes('all') || cats.includes(skill.category)) return true;
    }
    return false;
  };

  const unlockedCount = useMemo(
    () => products.filter((p) => isSkillUnlocked(p)).length,
    [products, claimedSkillIds, userRole, activeSubscription]
  );

  const bookmarkedProducts = useMemo(
    () => products.filter((p) => bookmarkedIds.includes(p.id)),
    [products, bookmarkedIds]
  );

  const customerArticles = useMemo(
    () =>
      articles.filter(
        (a) =>
          a.status === 'published' &&
          a.id !== 'art-dpatech-cms-core-pagebuilder-seo' &&
          !a.category.includes('صفحه‌ساز')
      ),
    [articles]
  );

  const filteredSkills = useMemo(() => {
    return products.filter((item) => {
      if (skillFilter === 'unlocked' && !isSkillUnlocked(item)) return false;
      if (
        (skillFilter === 'Claude' || skillFilter === 'ChatGPT' || skillFilter === 'Codex') &&
        item.category !== skillFilter
      ) {
        return false;
      }
      if (skillSearchQuery.trim()) {
        const q = skillSearchQuery.trim().toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.shortDescription.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.subCategory || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, skillFilter, skillSearchQuery, claimedSkillIds, userRole]);

  const completedOrders = useMemo(
    () => userOrders.filter((o) => o.status === 'paid' || o.status === 'completed'),
    [userOrders]
  );

  const totalSpent = useMemo(
    () => completedOrders.reduce((acc, o) => acc + o.totalAmount, 0),
    [completedOrders]
  );

  const handleDownloadSkill = (skill: SkillProduct) => {
    if (!isSkillUnlocked(skill)) {
      onSelectSkillProduct(skill);
      return;
    }
    const filename = downloadSingleSkillFile(skill);
    setDownloadedNotice(
      `فایل «${filename}» مربوط به «${skill.title}» با موفقیت دانلود شد.`
    );
    setTimeout(() => setDownloadedNotice(null), 4000);
  };

  const handleCopySkillMarkdown = async (skill: SkillProduct) => {
    if (!isSkillUnlocked(skill)) {
      onSelectSkillProduct(skill);
      return;
    }
    const text =
      skill.skillMarkdownContent ||
      `# ${skill.title}\n\n${skill.shortDescription}\n\n## خروجی مورد انتظار\n${skill.expectedOutput || ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSkillId(skill.id);
      setTimeout(() => setCopiedSkillId(null), 2200);
    } catch {
      // ignore clipboard denial
    }
  };

  const formatGatewayLabel = (gw: string) => {
    switch (gw) {
      case 'behpardakht_mellat':
        return 'درگاه شاپرک (به‌پرداخت ملت)';
      case 'sep_saman':
        return 'درگاه سامان کیش (SEP)';
      case 'zarinpal_online':
        return 'درگاه زرین‌پال';
      case 'zibal_direct':
        return 'درگاه زیبال';
      case 'wallet_credit':
        return 'کیف پول حساب کاربری';
      case 'crypto_tether':
        return 'تتر (USDT)';
      default:
        return 'درگاه پرداخت آنلاین شاپرک';
    }
  };

  const initials = (userDisplayName || 'کاربر').trim().slice(0, 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Minimal Apple/Pinterest Profile Header */}
      <div className="rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 font-black text-xl flex items-center justify-center shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-stone-500">
                کتابخانه شخصی و پیشخوان یادگیری من
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                {userDisplayName || 'کاربر اسکیل ۹۸'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                {userPhone && (
                  <span className="font-mono smooth-nums" dir="ltr">
                    {userPhone}
                  </span>
                )}
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>حساب کاربری تاییدشده</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!userUid && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className={`px-5 py-2.5 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
              >
                ورود به حساب کاربری
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigateTab('store')}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-stone-400 text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>مرور فروشگاه اسکیل‌ها</span>
              <ArrowUpLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Clean 4-Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-stone-100 dark:border-stone-800/80">
          <button
            type="button"
            onClick={() => setSubTab('my_skills')}
            className="text-right p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-950/70 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-bold text-stone-500">اسکیل‌های آماده دانلود</div>
            <div className="text-2xl font-black text-stone-900 dark:text-white smooth-nums mt-1">
              {unlockedCount.toLocaleString('fa-IR')}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('my_orders')}
            className="text-right p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-950/70 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-bold text-stone-500">سفارش‌ها و فاکتورها</div>
            <div className="text-2xl font-black text-stone-900 dark:text-white smooth-nums mt-1">
              {userOrders.length.toLocaleString('fa-IR')}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('my_bookmarks')}
            className="text-right p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-950/70 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-bold text-stone-500">نشان‌شده‌ها و آموزش‌ها</div>
            <div className="text-2xl font-black text-stone-900 dark:text-white smooth-nums mt-1">
              {bookmarkedProducts.length.toLocaleString('fa-IR')}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('my_security')}
            className="text-right p-4 rounded-2xl bg-stone-50/80 dark:bg-stone-950/70 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 transition-colors cursor-pointer"
          >
            <div className="text-[11px] font-bold text-stone-500">نشست‌های فعال من</div>
            <div className="text-2xl font-black text-emerald-600 smooth-nums mt-1">
              {userSessions.filter((s) => s.status === 'active').length.toLocaleString('fa-IR')}
            </div>
          </button>
        </div>
      </div>

      {downloadedNotice && (
        <div className="p-4 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{downloadedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadedNotice(null)}
            className="text-xs underline cursor-pointer"
          >
            بستن
          </button>
        </div>
      )}

      {/* Clean Structured Segmented Navigation Tabs */}
      {(() => {
        const dashboardTabs: { id: DashboardSubTab; label: string; icon: React.ElementType }[] = [
          {
            id: 'my_downloads',
            label:
              totalProtectedDownloadFiles > 0
                ? `دانلودها (${totalProtectedDownloadFiles.toLocaleString('fa-IR')})`
                : 'دانلودهای خریداری‌شده',
            icon: FileArchive,
          },
          { id: 'my_skills', label: 'کتابخانه اسکیل‌ها', icon: Layers },
          ...(enabledModulesMap.mod_subscriptions !== false
            ? [
                {
                  id: 'my_vip' as DashboardSubTab,
                  label: activeSubscription ? 'اشتراک VIP فعال ★' : 'خرید اشتراک VIP',
                  icon: Crown,
                },
              ]
            : []),
          { id: 'my_orders', label: 'سابقه خرید و سفارش‌ها', icon: ShoppingBag },
          { id: 'my_bookmarks', label: 'نشان‌شده‌ها و مقالات', icon: Bookmark },
          { id: 'my_security', label: 'امنیت و نشست‌های من', icon: ShieldCheck },
        ];
        const desktopColsClass =
          dashboardTabs.length >= 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-5';

        return (
          <nav
            aria-label="بخش‌های پیشخوان کاربری"
            className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-1.5 shadow-xs"
          >
            <div className={`grid grid-cols-2 sm:grid-cols-3 ${desktopColsClass} gap-1.5`}>
              {dashboardTabs.map((tab) => {
                const Icon = tab.icon;
                const active = subTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubTab(tab.id)}
                    title={tab.label}
                    className={`w-full min-h-[42px] px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-w-0 ${
                      active
                        ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-950 shadow-xs'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100/80 dark:hover:bg-stone-800/70 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        );
      })()}

      {/* TAB 0: Protected Digital Downloads Vault (Zero-Leak Signed Token Streaming) */}
      {subTab === 'my_downloads' && (
        <div className="space-y-5">
          <div className="p-5 sm:p-6 rounded-3xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>تحویل امن محصولات دانلودی (بدون افشای لینک هاست دانلود)</span>
              </div>
              <h2 className="text-base font-black text-stone-900 dark:text-white">
                فایل‌های دانلودی فعال در حساب کاربری شما
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                هر بار کلیک روی دکمه دانلود، یک لینک موقت امضاشده اختصاصی برای حساب شما صادر می‌کند.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubTab('my_orders')}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-extrabold text-stone-800 dark:text-stone-200 cursor-pointer shrink-0"
            >
              مشاهده سابقه خرید و فاکتورها
            </button>
          </div>

          {!userUid ? (
            <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center space-y-4">
              <Lock className="w-10 h-10 text-stone-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                  برای دریافت فایل‌های خریداری‌شده وارد حساب خود شوید
                </h3>
                <p className="text-xs text-stone-500">
                  تمامی فایل‌های دانلودی خریداری‌شده شما پس از ورود با شماره موبایل در این بخش آماده دانلود هستند.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className={`px-5 py-2.5 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
              >
                ورود / ثبت‌نام در حساب کاربری
              </button>
            </div>
          ) : protectedLibrary.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center space-y-4">
              <FileArchive className="w-10 h-10 text-stone-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                  هنوز فایل دانلودی اختصاصی برای محصولات شما ثبت یا خریداری نشده است
                </h3>
                <p className="text-xs text-stone-500">
                  به‌محض خرید محصولات دانلودی، تمامی فایل‌ها و بسته‌های ضمیمه آن‌ها به صورت خودکار اینجا آزاد می‌شوند.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab('store')}
                  className={`px-5 py-2.5 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
                >
                  مرور محصولات فروشگاه
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('my_skills')}
                  className="px-4 py-2.5 text-xs font-extrabold rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer"
                >
                  مشاهده کتابخانه اسکیل‌ها
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {protectedLibrary.map((item) => {
                const matchedSkill = products.find((p) => p.id === item.productId);
                return (
                  <div
                    key={item.productId}
                    className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                          {item.orderId
                            ? `خریداری‌شده · فاکتور #${item.orderId.slice(-6)}`
                            : item.price === 0
                            ? 'محصول رایگان ✓'
                            : 'فعال در حساب شما ★'}
                        </span>
                        <h3 className="text-sm font-black text-stone-900 dark:text-white">
                          {item.productTitle}
                        </h3>
                        {item.purchasedAtLabel && (
                          <div className="text-[10px] text-stone-400">
                            تاریخ خرید: {item.purchasedAtLabel}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-stone-400 smooth-nums shrink-0">
                        {(item.files.length || (item.hasSkillMarkdown ? 1 : 0)).toLocaleString('fa-IR')} فایل
                      </span>
                    </div>

                    {item.accessNote && (
                      <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                        <strong>راهنمای فایل:</strong> {item.accessNote}
                      </div>
                    )}

                    <div className="space-y-2">
                      {item.files.map((file) => {
                        const dlKey = `${item.productId}:${file.id}`;
                        const isBusy = downloadingKey === dlKey;
                        return (
                          <div
                            key={file.id}
                            className="p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                                {file.title}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
                                {file.version && <span className="font-mono">v{file.version}</span>}
                                {file.fileSizeLabel && <span>· {file.fileSizeLabel}</span>}
                                <span className="text-emerald-600 font-bold">· لینک محافظت‌شده</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void handleSecureProtectedDownload(
                                  item.productId,
                                  file.id,
                                  file.title
                                )
                              }
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{isBusy ? 'صدور لینک...' : 'دانلود امن'}</span>
                            </button>
                          </div>
                        );
                      })}

                      {item.files.length === 0 && item.hasSkillMarkdown && matchedSkill && (
                        <div className="p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 flex items-center justify-between gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                              فایل استاندارد SKILL.md ({item.productSlug}.md)
                            </div>
                            <div className="text-[10px] text-stone-500">
                              آماده نصب در Claude / Cursor / Codex
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadSkill(matchedSkill)}
                            className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 hover:bg-[#1D4ED8] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>دانلود SKILL.md</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Smart CRM Personalized Recommendations Strip (Auto-Generated from Interests) */}
      {subTab === 'my_skills' &&
        enabledModulesMap.mod_smart_crm !== false &&
        crmRecs.length > 0 && (
          <div className="p-5 rounded-3xl border border-[#1D4ED8]/25 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#1E3A8A] dark:text-sky-300">
                <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                <span>پیشنهادهای هوشمند مخصوص شما (بر اساس خریدها و علایق شما)</span>
              </div>
              <span className="text-[11px] font-bold text-stone-500 smooth-nums">
                {crmRecs.length.toLocaleString('fa-IR')} پیشنهاد تازه
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {crmRecs.slice(0, 3).map((rec) => {
                const matchedProd = products.find((p) => p.id === rec.productId);
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      if (matchedProd) setActiveReaderSkill(matchedProd);
                    }}
                    className="text-right p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-[#1D4ED8] transition-colors cursor-pointer space-y-1"
                  >
                    <div className="text-[10px] font-extrabold text-[#1D4ED8]">{rec.category}</div>
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white line-clamp-1">
                      {rec.productTitle}
                    </div>
                    <div className="text-[11px] text-stone-500 line-clamp-2">{rec.reasonText}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {/* TAB: VIP Subscriptions (1M / 3M / 6M / 12M Auto-Unlock) */}
      {subTab === 'my_vip' && enabledModulesMap.mod_subscriptions !== false && (
        <div className="space-y-6">
          {activeSubscription && (
            <div className="p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Crown className="w-4 h-4" />
                  <span>اشتراک VIP شما فعال است</span>
                </div>
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  {activeSubscription.planTitle}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  تمامی اسکیل‌های جدید و آپدیت‌های دسته‌بندی‌های مشمول تا تاریخ{' '}
                  <strong>{activeSubscription.expiresAtFa}</strong> به‌صورت خودکار برای شما باز است.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('my_skills')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer shrink-0"
              >
                مشاهده اسکیل‌های بازشده
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vipPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 flex flex-col justify-between gap-4 shadow-xs hover:border-[#1D4ED8] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold">
                      {plan.badgeText || `${plan.durationDays} روزه`}
                    </span>
                    <span className="text-[11px] font-bold text-stone-400 smooth-nums">
                      {plan.durationDays.toLocaleString('fa-IR')} روز
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white">
                    {plan.titleFa}
                  </h3>
                  <div className="space-y-0.5">
                    {plan.originalPrice > plan.price && (
                      <div className="text-xs text-stone-400 line-through smooth-nums">
                        {plan.originalPrice.toLocaleString('fa-IR')} تومان
                      </div>
                    )}
                    <div className="text-xl font-black text-[#1D4ED8] smooth-nums">
                      {plan.price.toLocaleString('fa-IR')}{' '}
                      <span className="text-xs font-bold text-stone-500">تومان</span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">{plan.description}</p>
                  <ul className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                    {plan.features.map((feat, idx) => (
                      <li
                        key={idx}
                        className="text-[11px] text-stone-700 dark:text-stone-300 flex items-start gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={subscribingPlanId === plan.id}
                  onClick={() => void handleActivateVipPlan(plan)}
                  className="w-full py-2.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 hover:bg-[#1D4ED8] dark:hover:bg-stone-200 text-xs font-extrabold cursor-pointer transition-colors disabled:opacity-60"
                >
                  {subscribingPlanId === plan.id
                    ? 'در حال فعال‌سازی...'
                    : activeSubscription?.planId === plan.id
                    ? 'تمدید همین پلن'
                    : 'خرید و فعال‌سازی آنی'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: Pinterest-Style Visual Masonry Board for Skills */}
      {subTab === 'my_skills' && (
        <div className="space-y-6">
          {/* Clean Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={skillSearchQuery}
                onChange={(e) => setSkillSearchQuery(e.target.value)}
                placeholder="جستجو در اسکیل‌ها و کتابخانه‌ها (مثلاً Claude, MCP, GSAP, Three.js...)"
                className="w-full pr-10 pl-4 py-2.5 text-xs rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            {/* Mobile: Native Select Filter (Zero Horizontal Scroll) */}
            <div className="sm:hidden relative">
              <select
                value={skillFilter}
                onChange={(e) =>
                  setSkillFilter(
                    e.target.value as 'all' | 'unlocked' | 'Claude' | 'ChatGPT' | 'Codex'
                  )
                }
                aria-label="فیلتر کتابخانه اسکیل‌ها"
                className="w-full h-10 appearance-none pr-3 pl-8 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs font-bold text-stone-800 dark:text-stone-100 focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="all">همه اسکیل‌ها</option>
                <option value="unlocked">بازشده در حساب من</option>
                <option value="Claude">Claude & MCP</option>
                <option value="ChatGPT">ChatGPT & Cursor</option>
                <option value="Codex">JS & Full-Stack</option>
              </select>
              <ChevronDown className="w-4 h-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Desktop/Tablet: Wrapped Filter Buttons (Zero Horizontal Scroll) */}
            <div className="hidden sm:flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'همه' },
                  { id: 'unlocked', label: 'بازشده در حساب من' },
                  { id: 'Claude', label: 'Claude & MCP' },
                  { id: 'ChatGPT', label: 'ChatGPT & Cursor' },
                  { id: 'Codex', label: 'JS & Full-Stack' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSkillFilter(f.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                    skillFilter === f.id
                      ? 'bg-[#1D4ED8] text-white'
                      : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pinterest Visual Masonry Grid */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {filteredSkills.map((item) => {
              const unlocked = isSkillUnlocked(item);
              const isBookmarked = bookmarkedIds.includes(item.id);
              return (
                <article
                  key={item.id}
                  onClick={() => setActiveReaderSkill(item)}
                  className="break-inside-avoid group rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs hover:shadow-lg hover:border-stone-300 dark:hover:border-stone-700 transition-all cursor-pointer"
                >
                  {/* Visual Cover */}
                  <div className="relative aspect-16/10 bg-stone-100 dark:bg-stone-950 overflow-hidden">
                    <ProgressiveImage
                      src={resolveResponsiveMediaUrl(item.imageUrl, 'thumb300')}
                      alt={item.imageAlt || item.title}
                      wrapperClassName="w-full h-full"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-xl bg-white/92 dark:bg-stone-950/90 backdrop-blur-md text-[10px] font-extrabold text-stone-900 dark:text-white shadow-xs">
                        {item.category}
                      </span>
                      {isBookmarked && (
                        <span className="p-1.5 rounded-xl bg-amber-400 text-stone-950 shadow-xs">
                          <Bookmark className="w-3 h-3 fill-current" />
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold shadow-xs ${
                          unlocked
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-900/85 text-amber-300 backdrop-blur-md'
                        }`}
                      >
                        {unlocked
                          ? item.price === 0
                            ? 'رایگان · آماده دانلود'
                            : 'فعال در حساب ✓'
                          : `${item.price.toLocaleString('fa-IR')} تومان`}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3">
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-stone-400 flex items-center justify-between">
                        <span>{item.subCategory || 'مهندسی نرم‌افزار'}</span>
                        <span className="font-mono">{item.version || item.level}</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-stone-900 dark:text-white leading-snug group-hover:text-[#1D4ED8] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-3">
                        {item.shortDescription}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReaderSkill(item);
                        }}
                        className="text-xs font-extrabold text-[#1D4ED8] dark:text-sky-400 flex items-center gap-1 cursor-pointer"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>مشاهده SKILL.md</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSkill(item);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          unlocked
                            ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-950 hover:bg-[#1D4ED8] dark:hover:bg-stone-200'
                            : 'bg-amber-400 text-stone-950 hover:bg-amber-300'
                        }`}
                      >
                        {unlocked ? (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>دانلود فایل</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>مشاهده و خرید</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Orders & Invoices */}
      {subTab === 'my_orders' && (
        <div className="space-y-5">
          {userOrders.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-12 text-center space-y-4">
              <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
                  هنوز سفارشی ثبت نکرده‌اید
                </h3>
                <p className="text-xs text-stone-500">
                  تمامی پکیج‌های خریداری‌شده و فاکتورهای رسمی شما در این بخش نگهداری می‌شوند.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('store')}
                className={`px-5 py-2.5 text-xs font-extrabold rounded-xl cursor-pointer ${accentButtonClass}`}
              >
                مشاهده فروشگاه اسکیل‌ها
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                <span>
                  مجموع کل سفارش‌های شما: {userOrders.length.toLocaleString('fa-IR')} مورد
                </span>
                <span className="font-extrabold text-stone-900 dark:text-white smooth-nums">
                  مجموع پرداخت موفق: {totalSpent.toLocaleString('fa-IR')} تومان
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 space-y-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-stone-400 smooth-nums">
                          فاکتور #{order.id.slice(-8)} · {order.createdAtLabel}
                        </div>
                        <h3 className="text-sm font-black text-stone-900 dark:text-white">
                          {order.itemsSummary}
                        </h3>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold shrink-0 ${
                          order.status === 'paid' || order.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : order.status === 'cancelled'
                            ? 'bg-rose-500/10 text-rose-700'
                            : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {order.status === 'paid' || order.status === 'completed'
                          ? 'پرداخت موفق'
                          : order.status === 'cancelled'
                          ? 'لغوشده'
                          : 'در انتظار پرداخت'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-stone-100 dark:border-stone-800">
                      <div>
                        <div className="text-stone-400 text-[11px]">مبلغ فاکتور:</div>
                        <div className="font-black text-stone-900 dark:text-white smooth-nums mt-0.5">
                          {order.totalAmount.toLocaleString('fa-IR')} تومان
                        </div>
                      </div>
                      <div>
                        <div className="text-stone-400 text-[11px]">روش پرداخت:</div>
                        <div className="font-bold text-stone-700 dark:text-stone-300 mt-0.5">
                          {formatGatewayLabel(order.paymentMethod)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 dark:border-stone-800">
                      {(order.status === 'paid' || order.status === 'completed') && (
                        <button
                          type="button"
                          onClick={() => setSubTab('my_downloads')}
                          className="px-3.5 py-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>دریافت فایل‌های دانلودی این خرید ←</span>
                        </button>
                      )}
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => void onCancelOrder(order.id)}
                          className="px-3.5 py-1.5 text-xs font-bold text-rose-600 border border-rose-200 dark:border-rose-900/50 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer mr-auto"
                        >
                          لغو سفارش
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Bookmarked Skills & Tutorials */}
      {subTab === 'my_bookmarks' && (
        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-500" />
              <span>اسکیل‌های نشان‌شده شما ({bookmarkedProducts.length.toLocaleString('fa-IR')})</span>
            </h2>
            {bookmarkedProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 p-8 text-center text-xs text-stone-500">
                هنوز اسکیلی را نشان نکرده‌اید. در فروشگاه روی آیکون نشانک کلیک کنید تا اینجا ذخیره شود.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookmarkedProducts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveReaderSkill(item)}
                    className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex items-center gap-3 hover:border-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    <ProgressiveImage
                      src={resolveResponsiveMediaUrl(item.imageUrl, 'thumb300')}
                      alt={item.title}
                      wrapperClassName="w-16 h-16 rounded-xl shrink-0"
                      className="w-full h-full object-cover"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-black text-stone-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-stone-500 line-clamp-2">
                        {item.shortDescription}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1D4ED8]" />
              <span>مقالات و آموزش‌های تخصصی پیشنهادی</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {customerArticles.slice(0, 6).map((article) => (
                <article
                  key={article.id}
                  onClick={() => onOpenFullArticle?.(article)}
                  className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="aspect-16/9 bg-stone-100 dark:bg-stone-950 overflow-hidden">
                    <ProgressiveImage
                      src={resolveResponsiveMediaUrl(article.featuredImageUrl, 'thumb300')}
                      alt={article.featuredImageAlt || article.title}
                      wrapperClassName="w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-[#1D4ED8]">
                        {article.category} · {article.readingTimeMinutes.toLocaleString('fa-IR')} دقیقه مطالعه
                      </div>
                      <h3 className="text-sm font-black text-stone-900 dark:text-white leading-snug">
                        {article.title}
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {article.summary}
                      </p>
                    </div>
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      <span>مطالعه کامل مقاله</span>
                      <ExternalLink className="w-3 h-3 mr-auto text-stone-400" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Personal Account Security & Sessions */}
      {subTab === 'my_security' && (
        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="border-b border-stone-100 dark:border-stone-800 pb-4">
            <h2 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>دستگاه‌ها و نشست‌های فعال حساب من</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              برای حفظ امنیت حساب کاربری، می‌توانید هر نشست ناشناس را با یک کلیک باطل کنید.
            </p>
          </div>

          {userSessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              برای مشاهده نشست‌های فعال، لطفاً وارد حساب کاربری خود شوید.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {userSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                        {sess.deviceLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          sess.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {sess.status === 'active' ? 'فعال' : 'باطل‌شده'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500">
                      آخرین فعالیت: {sess.lastActiveLabel}
                    </div>
                  </div>

                  {sess.status === 'active' &&
                    onRevokeSession &&
                    !sess.id.startsWith('current_') && (
                      <button
                        type="button"
                        onClick={() => onRevokeSession(sess.id)}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-600 text-xs font-bold hover:bg-rose-50 cursor-pointer shrink-0"
                      >
                        خروج از این دستگاه
                      </button>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Centered Skill Reader & Direct Download Modal */}
      {activeReaderSkill && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActiveReaderSkill(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[90vh] rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold text-[#1D4ED8]">
                  {activeReaderSkill.category} · {activeReaderSkill.subCategory || 'مهندسی هوش مصنوعی'}
                </div>
                <h3 className="text-base font-black text-stone-900 dark:text-white truncate">
                  {activeReaderSkill.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReaderSkill(null)}
                className="p-2 rounded-xl bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-200 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                {activeReaderSkill.shortDescription}
              </p>

              {activeReaderSkill.githubSourceRepo && (
                <div
                  dir="ltr"
                  className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-950 text-xs font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
                >
                  <Terminal className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{activeReaderSkill.githubSourceRepo}</span>
                </div>
              )}

              {activeReaderSkill.usageSteps && activeReaderSkill.usageSteps.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activeReaderSkill.usageSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1"
                    >
                      <span className="text-[11px] font-extrabold text-[#1D4ED8] smooth-nums">
                        گام {(idx + 1).toLocaleString('fa-IR')}
                      </span>
                      <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {isSkillUnlocked(activeReaderSkill) ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-stone-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-[#1D4ED8]" />
                      <span>محتوای فایل آماده اجرا (SKILL.md)</span>
                    </span>
                    <span dir="ltr" className="font-mono text-[11px] text-stone-500">
                      {activeReaderSkill.slug}.md
                    </span>
                  </div>
                  <pre
                    dir="ltr"
                    className="p-4 rounded-2xl bg-stone-950 text-stone-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-64 border border-stone-800"
                  >
                    <code>
                      {activeReaderSkill.skillMarkdownContent ||
                        `# ${activeReaderSkill.title}\n\n${activeReaderSkill.shortDescription}`}
                    </code>
                  </pre>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                      یادداشت شخصی شما برای این اسکیل:
                    </label>
                    <textarea
                      rows={2}
                      value={customNotesBySkill[activeReaderSkill.id] || ''}
                      onChange={(e) =>
                        setCustomNotesBySkill((prev) => ({
                          ...prev,
                          [activeReaderSkill.id]: e.target.value,
                        }))
                      }
                      placeholder="نکات یا پرامپت مکمل پروژه خودتان را اینجا بنویسید..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-stone-950 text-stone-200 border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-extrabold text-amber-400">
                      این پکیج تخصصی هنوز به حساب شما اضافه نشده است
                    </div>
                    <p className="text-[11px] text-stone-400">
                      برای مشاهده کد کامل SKILL.md و دانلود فایل آماده، ابتدا پکیج را تهیه کنید.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeReaderSkill;
                      setActiveReaderSkill(null);
                      onSelectSkillProduct(target);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 text-stone-950 text-xs font-extrabold cursor-pointer shrink-0"
                  >
                    مشاهده صفحه محصول ({activeReaderSkill.price.toLocaleString('fa-IR')} تومان)
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex flex-wrap items-center justify-between gap-2">
              {isSkillUnlocked(activeReaderSkill) ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleCopySkillMarkdown(activeReaderSkill)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedSkillId === activeReaderSkill.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>کپی شد!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>کپی متن اسکیل</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSkill(activeReaderSkill)}
                    className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود فایل آماده (.md)</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveReaderSkill(null)}
                  className="mr-auto px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
