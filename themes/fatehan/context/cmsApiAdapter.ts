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
import { DEFAULT_FATEHAN_HARDWARE_PRODUCTS } from '../utils/defaultFallbacks';

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
    headerLogoSizePx?: number;
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
    socialChannels?: {
      instagramId?: string;
      instagramUrl?: string;
      eitaaId?: string;
      eitaaUrl?: string;
      eitaaLogoUrl?: string;
      baleId?: string;
      baleUrl?: string;
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
      const sc = tc?.socialChannels;
      const settingsPatch = tc
        ? {
            academyNameFa: tc.brandNameFa || 'آموزشگاه رباتیک فاتحان',
            academyNameEn: tc.brandNameEn || 'Fatehan Robotics Academy',
            logoUrl: tc.logoUrl || '/assets/aistudio/logo_8c26749f.webp',
            headerLogoSizePx:
              typeof tc.headerLogoSizePx === 'number' && tc.headerLogoSizePx >= 32
                ? tc.headerLogoSizePx
                : 68,
            announcementTopBarText: tc.topAnnouncementText,
            description: tc.heroSubtitle || '',
            ...(sc
              ? {
                  social: {
                    instagramId: sc.instagramId || 'fatehan.robot',
                    instagramUrl:
                      sc.instagramUrl ||
                      `https://instagram.com/${(sc.instagramId || 'fatehan.robot').replace(/^@/, '')}`,
                    eitaaId: sc.eitaaId ?? 'fatehan_robotics',
                    eitaaUrl:
                      sc.eitaaUrl ||
                      (sc.eitaaId ? `https://eitaa.com/${sc.eitaaId.replace(/^@/, '')}` : ''),
                    eitaaLogoUrl: sc.eitaaLogoUrl || '',
                    baleId: sc.baleId || '',
                    baleUrl:
                      sc.baleUrl ||
                      (sc.baleId ? `https://ble.ir/${sc.baleId.replace(/^@/, '')}` : ''),
                  },
                }
              : {}),
            typography: {
              headingFont: 'YekanBakh' as const,
              bodyFont: 'IRANSansX' as const,
              printFont: 'Sahel' as const,
              printPaperDefault: 'A4' as const,
              baseScalePx: 15,
              footerAboutText: tc.footerDescription,
              ...(sc
                ? {
                    instagramId: sc.instagramId,
                    instagramUrl: sc.instagramUrl,
                    eitaaId: sc.eitaaId,
                    eitaaUrl: sc.eitaaUrl,
                    eitaaLogoUrl: sc.eitaaLogoUrl,
                    baleId: sc.baleId,
                    baleUrl: sc.baleUrl,
                  }
                : {}),
              enamadHtmlCode: tc.footerTrustBadges?.enamadHtmlCode,
              enamadUseCustomImage: tc.footerTrustBadges?.enamadMode === 'image',
              enamadCustomImageUrl: tc.footerTrustBadges?.enamadImageUrl,
              licenseImageUrl: tc.footerTrustBadges?.secondBadgeImageUrl,
              licenseTitle: tc.footerTrustBadges?.secondBadgeLabel,
              licenseTargetUrl: tc.footerTrustBadges?.secondBadgeLinkUrl,
            },
          }
        : undefined;

      // Prefer department-categorized Fatehan hardware products; supplement with defaults if DB only has legacy AI skill items
      const dbDeptProducts = mappedProducts.filter((p) =>
        (p.category || '').includes('دپارتمان')
      );
      const finalProducts: ProductItem[] =
        dbDeptProducts.length >= 6
          ? dbDeptProducts
          : [
              ...dbDeptProducts,
              ...DEFAULT_FATEHAN_HARDWARE_PRODUCTS.filter(
                (def) => !dbDeptProducts.some((p) => p.id === def.id || p.slug === def.slug)
              ),
            ];

      return {
        ...(settingsPatch
          ? {
              settings: settingsPatch as unknown as CmsStorefrontData['settings'],
              typography: settingsPatch.typography,
            }
          : {}),
        products: finalProducts,
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
      const resolvedRole =
        data.role === 'super_admin' || data.role === 'admin' ? data.role : 'customer';
      const resolvedFullName =
        data.displayName ||
        data.fullName ||
        payload.fullName ||
        (resolvedRole === 'super_admin'
          ? 'مدیر ارشد سیستم'
          : resolvedRole === 'admin'
          ? 'ادمین سیستم'
          : 'کاربر');
      const resolvedSessionToken = data.sessionToken || data.token;
      if (res.ok && resolvedSessionToken) {
        writeStoredSession({
          sessionToken: resolvedSessionToken,
          phone: data.phone || payload.phone,
          fullName: resolvedFullName,
          userRole: resolvedRole,
          roleId: data.roleId || 'role_customer',
        });
      }
      return {
        ok: res.ok,
        verified: Boolean(res.ok && (data.verified || data.ok)),
        sessionToken: resolvedSessionToken,
        user: res.ok
          ? {
              fullName: resolvedFullName,
              phone: data.phone || payload.phone,
              verified: true,
              walletBalanceToman: 0,
              role: resolvedRole,
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
