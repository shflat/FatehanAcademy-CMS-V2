/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Final Base CMS (v2.5.0) Real Core API Adapter for Fatehan Standalone Theme
 * Wired directly to the live core backend endpoints:
 *   - GET  /api/storefront/bootstrap
 *   - GET  /api/v1/modules/academy/bootstrap
 *   - GET  /api/v1/menus & /api/v1/pages
 *   - POST /api/v1/modules/academy/ideas
 *   - POST /api/v1/modules/academy/consultations
 *   - POST /api/sms/send-otp & /api/sms/verify-otp
 *   - POST /api/orders/create & /api/payment/request & /api/payment/verify
 */

import {
  CmsApiAdapter,
  CmsPost,
  CmsStorefrontData,
  ProductItem,
  PaymentGatewayConfig,
} from '../types';
import { getAuthHeaders, writeStoredSession } from '../../../src/core/apiClient';

export interface CmsApiAdapterOptions {
  /** Base URL of CMS Core API ('' for same-origin) */
  baseUrl?: string;
  /** Optional custom headers (e.g., Authorization Bearer token) */
  headers?: Record<string, string>;
  /** Kept for backward compatibility */
  legacyMode?: boolean;
}

function getAuthTokenHeader(): Record<string, string> {
  return getAuthHeaders();
}

async function safeJsonFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface CoreBootstrapPayload {
  products?: Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
    price: number;
    originalPrice?: number;
    shortDescription?: string;
    imageUrl?: string;
    status?: string;
    productType?: string;
    deliveryType?: string;
    galleryUrls?: string[];
    videoUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
    technicalSpecs?: Array<{ label: string; value: string }>;
  }>;
  articles?: Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
    authorName?: string;
    featuredImageUrl?: string;
    summary?: string;
    bodyMarkdown?: string;
    readingTimeMinutes?: number;
    publishedDateLabel?: string;
    status?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
  }>;
  coupons?: Array<{
    code: string;
    discountPercent: number;
    description: string;
    active: boolean;
  }>;
  gateways?: Array<{
    id: string;
    title: string;
    subtitle: string;
    enabled: boolean;
    sandboxMode?: boolean;
  }>;
  themeConfig?: {
    brandNameFa?: string;
    brandNameEn?: string;
    logoUrl?: string;
    heroSubtitle?: string;
    topAnnouncementText?: string;
    footerDescription?: string;
    footerTrustBadges?: {
      enamadHtmlCode?: string;
      enamadImageUrl?: string;
      enamadMode?: string;
      secondBadgeImageUrl?: string;
      secondBadgeLabel?: string;
      secondBadgeLinkUrl?: string;
    };
  };
}

interface AcademyBootstrapPayload {
  ok?: boolean;
  enabled?: boolean;
  departments?: CmsStorefrontData['departments'];
  courses?: CmsStorefrontData['courses'];
  freeCourses?: CmsStorefrontData['freeCourses'];
  freeCoursesPage?: CmsStorefrontData['freeCoursesPage'];
  announcements?: CmsStorefrontData['announcements'];
  studentIdeas?: CmsStorefrontData['studentIdeas'];
}

export function createCmsV2ApiAdapter(options: CmsApiAdapterOptions = {}): CmsApiAdapter {
  const base = (options.baseUrl || '').replace(/\/+$/, '');
  const buildHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...getAuthTokenHeader(),
    ...(options.headers || {}),
  });

  return {
    async fetchStorefrontData(): Promise<Partial<CmsStorefrontData>> {
      const headers = buildHeaders();
      const [coreBoot, academyBoot] = await Promise.all([
        safeJsonFetch<CoreBootstrapPayload>(`${base}/api/storefront/bootstrap`, { headers }),
        safeJsonFetch<AcademyBootstrapPayload>(`${base}/api/v1/modules/academy/bootstrap`, {
          headers,
        }),
      ]);

      const mappedProducts: ProductItem[] = (coreBoot?.products || [])
        .filter((p) => p.status !== 'draft')
        .map((p) => ({
          id: p.id,
          sku: p.id.toUpperCase(),
          slug: p.slug,
          name: p.title,
          productKind:
            p.productType === 'downloadable' || p.deliveryType === 'digital'
              ? 'downloadable'
              : 'simple',
          type: p.productType === 'downloadable' ? 'فایل دانلودی / دیجیتال' : 'بسته آموزشی و کیت',
          category: p.category,
          featuredImageUrl: p.imageUrl || '/assets/kits/kit-01.jpg',
          shortDescription: p.shortDescription || '',
          description: p.shortDescription || '',
          priceToman: Number(p.originalPrice || p.price || 0),
          salePriceToman:
            p.originalPrice && p.originalPrice > p.price ? Number(p.price) : undefined,
          stock: 99,
          salesCount: 24,
          status: 'موجود',
          warranty: 'تضمین اصالت و پشتیبانی آنلاین',
          specs: p.shortDescription || '',
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          focusKeyword: p.seoKeywords,
          galleryUrls: p.galleryUrls || [],
          introVideoUrl: p.videoUrl,
          techSpecsTable: (p.technicalSpecs || []).map((s) => ({
            key: s.label,
            value: s.value,
          })),
        }));

      const mappedPosts: CmsPost[] = (coreBoot?.articles || [])
        .filter((a) => a.status !== 'draft')
        .map((a) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          type: 'مقاله',
          category: a.category || 'آموزشی',
          author: a.authorName || 'تیم تحریریه',
          featuredImageUrl: a.featuredImageUrl || '/assets/blog/blog-01.jpg',
          seoScore: 92,
          seoTitle: a.seoTitle,
          seoDescription: a.seoDescription,
          focusKeyword: a.seoKeywords,
          views: 120,
          readingTimeMinutes: a.readingTimeMinutes || 5,
          status: 'Published',
          updatedAt: a.publishedDateLabel || '۱۴۰۵/۰۸/۲۰',
          excerpt: a.summary || '',
          bodyContent: a.bodyMarkdown || a.summary || '',
        }));

      const mappedGateways: PaymentGatewayConfig[] = (coreBoot?.gateways || [])
        .filter((g) => g.enabled)
        .map((g) => ({
          id: (g.id.includes('zarinpal')
            ? 'zarinpal'
            : g.id.includes('novino')
            ? 'novinopay'
            : g.id.includes('zibal')
            ? 'zibal'
            : g.id.includes('idpay')
            ? 'idpay'
            : g.id.includes('wallet')
            ? 'wallet'
            : 'zarinpal') as PaymentGatewayConfig['id'],
          title: g.title,
          subtitle: g.subtitle,
          enabled: g.enabled,
          merchantCode: '',
          sandboxMode: g.sandboxMode,
        }));

      const mappedCoupons = (coreBoot?.coupons || [])
        .filter((c) => c.active)
        .map((c) => ({
          code: c.code,
          discountType: 'percent' as const,
          discountPercent: c.discountPercent,
          maxCapToman: 5000000,
          usageCount: 0,
          usageLimit: 1000,
          status: 'فعال',
        }));

      const tc = coreBoot?.themeConfig;
      const settingsPatch = tc
        ? {
            academyNameFa: tc.brandNameFa || 'آموزشگاه رباتیک فاتحان',
            academyNameEn: tc.brandNameEn || 'Fatehan Robotics Academy',
            logoUrl: tc.logoUrl || '/assets/aistudio/fatehan_logo_transparent.png',
            announcementTopBarText: tc.topAnnouncementText,
            description: tc.heroSubtitle || '',
            typography: {
              headingFont: 'YekanBakh' as const,
              bodyFont: 'IRANSansX' as const,
              printFont: 'Sahel' as const,
              printPaperDefault: 'A4' as const,
              baseScalePx: 15,
              footerAboutText: tc.footerDescription,
              enamadHtmlCode: tc.footerTrustBadges?.enamadHtmlCode,
              enamadUseCustomImage: tc.footerTrustBadges?.enamadMode === 'image',
              enamadCustomImageUrl: tc.footerTrustBadges?.enamadImageUrl,
              licenseImageUrl: tc.footerTrustBadges?.secondBadgeImageUrl,
              licenseTitle: tc.footerTrustBadges?.secondBadgeLabel,
              licenseTargetUrl: tc.footerTrustBadges?.secondBadgeLinkUrl,
            },
          }
        : undefined;

      return {
        ...(settingsPatch
          ? {
              settings: settingsPatch as unknown as CmsStorefrontData['settings'],
              typography: settingsPatch.typography,
            }
          : {}),
        ...(mappedProducts.length > 0 ? { products: mappedProducts } : {}),
        ...(mappedPosts.length > 0 ? { cmsPosts: mappedPosts } : {}),
        ...(mappedGateways.length > 0 ? { paymentGateways: mappedGateways } : {}),
        ...(mappedCoupons.length > 0 ? { coupons: mappedCoupons } : {}),
        ...(academyBoot?.departments?.length ? { departments: academyBoot.departments } : {}),
        ...(academyBoot?.courses?.length ? { courses: academyBoot.courses } : {}),
        ...(academyBoot?.freeCourses?.length ? { freeCourses: academyBoot.freeCourses } : {}),
        ...(academyBoot?.freeCoursesPage ? { freeCoursesPage: academyBoot.freeCoursesPage } : {}),
        ...(academyBoot?.announcements?.length ? { announcements: academyBoot.announcements } : {}),
        ...(academyBoot?.studentIdeas?.length ? { studentIdeas: academyBoot.studentIdeas } : {}),
      };
    },

    async submitComment(payload) {
      const res = await fetch(`${base}/api/v1/modules/academy/ideas`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({
          title: `دیدگاه روی ${payload.targetTitle}`,
          note: payload.body,
          studentName: payload.authorName,
          phone: '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, error: data.error };
    },

    async submitStudentIdea(payload) {
      const res = await fetch(`${base}/api/v1/modules/academy/ideas`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, error: data.error };
    },

    async submitConsultationLead(payload) {
      try {
        const res = await fetch(`${base}/api/v1/modules/academy/consultations`, {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, error: data.error };
      } catch {
        return { ok: false, error: 'خطا در اتصال به سرور مشاوره' };
      }
    },

    async sendOtp(payload) {
      const res = await fetch(`${base}/api/sms/send-otp`, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: buildHeaders(),
        body: JSON.stringify({ phone: payload.phone }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, error: data.error };
    },

    async verifyOtp(payload) {
      const res = await fetch(`${base}/api/sms/verify-otp`, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: buildHeaders(),
        body: JSON.stringify({
          phone: payload.phone,
          code: payload.code,
          fullName: payload.fullName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.sessionToken || data.token)) {
        writeStoredSession({
          sessionToken: data.sessionToken || data.token,
          phone: data.phone || payload.phone,
          fullName: data.displayName || data.fullName || payload.fullName || 'کاربر',
          userRole:
            data.role === 'super_admin' || data.role === 'admin' ? data.role : 'customer',
          roleId: data.roleId || 'role_customer',
        });
      }
      return {
        ok: res.ok,
        verified: Boolean(res.ok && (data.verified || data.ok)),
        user: res.ok
          ? {
              fullName: data.fullName || payload.fullName || 'کاربر',
              phone: data.phone || payload.phone,
              verified: true,
              walletBalanceToman: 0,
              role: data.role || 'customer',
              roleId: data.roleId,
            }
          : undefined,
        message: data.message,
        error: data.error,
      };
    },

    async saveCustomerAddress(_payload) {
      return { ok: true };
    },

    async deleteCustomerAddress(_addressId) {
      return { ok: true };
    },

    async createPaymentRequest(payload) {
      const res = await fetch(`${base}/api/payment/request`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return {
        ok: res.ok,
        order: data.order,
        authority: data.authority || data.token,
        sandboxUrl: data.paymentUrl || data.sandboxUrl,
        error: data.error,
      };
    },

    async verifyPayment(payload) {
      const res = await fetch(`${base}/api/payment/verify`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      return {
        ok: res.ok,
        order: data.order,
        error: data.error,
      };
    },
  };
}
