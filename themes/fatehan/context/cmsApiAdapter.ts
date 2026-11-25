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
import {
  fetchSharedStorefrontBootstrap,
  getAuthHeaders,
  writeStoredSession,
} from '../../../src/core/apiClient';
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
    sku?: string;
    title: string;
    slug: string;
    category: string;
    subCategory?: string;
    price: number;
    originalPrice?: number;
    shortDescription?: string;
    imageUrl?: string;
    status?: string;
    productType?: string;
    deliveryType?: string;
    stock?: number;
    salesCount?: number;
    warranty?: string;
    specs?: string;
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
    taglinePrimary?: string;
    taglineSecondary?: string;
    mottoFa?: string;
    mottoEn?: string;
    heroSubtitle?: string;
    topAnnouncementText?: string;
    footerDescription?: string;
    footerCopyrightText?: string;
    siteDescription?: string;
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
      whatsappUrl?: string;
    };
    contactLocation?: {
      province?: string;
      city?: string;
      fullAddress?: string;
      workingHours?: string;
      postalCode?: string;
    };
    contactPhones?: {
      line1?: string;
      line1Formatted?: string;
      line1Label?: string;
      line2?: string;
      line2Formatted?: string;
      line2Label?: string;
      landline?: string;
      landlineFormatted?: string;
      landlineLabel?: string;
    };
    aboutPageConfig?: {
      heroTitle?: string;
      heroSubtitle?: string;
      introParagraph?: string;
      missionStatement?: string;
      schoolPartnershipNote?: string;
    };
  };
}

interface DynamicPagesPayload {
  pages?: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    summary?: string;
    seoTitle?: string;
    seoDescription?: string;
    composerRows?: Array<{
      id: string;
      rowTitle: string;
      widgets?: Array<{
        id: string;
        widgetType: string;
        title?: string;
        subtitle?: string;
        content?: string;
        badgeText?: string;
      }>;
    }>;
  }>;
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
      const [coreBoot, academyBoot, pagesBoot] = await Promise.all([
        fetchSharedStorefrontBootstrap<CoreBootstrapPayload>(base, { headers }),
        safeJsonFetch<AcademyBootstrapPayload>(`${base}/api/v1/modules/academy/bootstrap`, {
          headers,
        }),
        safeJsonFetch<DynamicPagesPayload>(`${base}/api/v1/pages`, { headers }),
      ]);

      const mappedProducts: ProductItem[] = (coreBoot?.products || [])
        .filter((p) => p.status !== 'draft' && !p.id.startsWith('skill-') && !p.id.startsWith('pkg-'))
        .map((p) => {
          const regularPrice = Number(
            p.originalPrice && p.originalPrice >= p.price ? p.originalPrice : p.price || 0
          );
          const effectiveSalePrice =
            p.originalPrice && p.originalPrice > p.price ? Number(p.price) : undefined;
          const stockCount = typeof p.stock === 'number' ? p.stock : 20;
          return {
            id: p.id,
            sku: p.sku || p.id.toUpperCase(),
            slug: p.slug,
            name: p.title,
            productKind:
              p.productType === 'downloadable' || p.deliveryType === 'digital'
                ? 'downloadable'
                : 'simple',
            type:
              p.subCategory ||
              (p.productType === 'downloadable' ? 'فایل دانلودی / دیجیتال' : 'کیت کامل رباتیک'),
            category: p.category || 'دپارتمان رباتیک',
            featuredImageUrl: p.imageUrl || '/assets/kits/kit-01.jpg',
            shortDescription: p.shortDescription || '',
            description: p.shortDescription || '',
            priceToman: regularPrice,
            salePriceToman: effectiveSalePrice,
            stock: stockCount,
            salesCount: typeof p.salesCount === 'number' ? p.salesCount : 45,
            status: stockCount > 0 ? 'In Stock' : 'Out of Stock',
            warranty: p.warranty || 'گارانتی سلامت قطعات + راهنمای مونتاژ فارسی فاتحان',
            specs: p.specs || p.shortDescription || '',
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
            focusKeyword: p.seoKeywords,
            galleryUrls: p.galleryUrls || [],
            introVideoUrl: p.videoUrl,
            techSpecsTable: (p.technicalSpecs || []).map((s) => ({
              key: s.label,
              value: s.value,
            })),
          };
        });

      const mappedPosts: CmsPost[] = (coreBoot?.articles || [])
        .filter((a) => a.status !== 'draft')
        .map((a) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          type: 'مقاله علمی',
          category: a.category || 'رباتیک و مکاترونیک',
          author: a.authorName || 'شورای علمی آموزشگاه رباتیک فاتحان',
          featuredImageUrl: a.featuredImageUrl || '/assets/blog/blog-01.jpg',
          seoScore: 95,
          seoTitle: a.seoTitle,
          seoDescription: a.seoDescription,
          focusKeyword: a.seoKeywords,
          views: 1420,
          readingTimeMinutes: a.readingTimeMinutes || 6,
          status: 'Published',
          updatedAt: a.publishedDateLabel || '۱۴۰۵/۰۸/۲۸',
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
      const loc = tc?.contactLocation;
      const ph = tc?.contactPhones;

      const settingsPatch = tc
        ? {
            academyNameFa: tc.brandNameFa || 'آموزشگاه رباتیک فاتحان',
            academyNameEn: tc.brandNameEn || 'Fatehan Robotics Academy',
            logoUrl: tc.logoUrl || '/assets/aistudio/logo_8c26749f.webp',
            headerLogoSizePx:
              typeof tc.headerLogoSizePx === 'number' && tc.headerLogoSizePx >= 32
                ? tc.headerLogoSizePx
                : 68,
            taglinePrimary: tc.taglinePrimary || 'کارآموزان امروز، فاتحان فردا',
            taglineSecondary:
              tc.taglineSecondary || 'رباتیک فقط یک رشته نیست... یک مهارت زندگی است',
            mottoFa: tc.mottoFa || 'فکر کن، بساز، کشف کن!',
            mottoEn: tc.mottoEn || 'Think, Build, Discover!',
            announcementTopBarText:
              tc.topAnnouncementText ||
              'ثبت‌نام ترم جدید رباتیک، کدنویسی، هوش مصنوعی و چاپ سه‌بعدی با مدرک معتبر فنی و حرفه‌ای',
            description:
              tc.siteDescription ||
              tc.heroSubtitle ||
              'آموزشگاه تخصصی رباتیک، کدنویسی و هوش مصنوعی فاتحان ویژه کودکان و نوجوانان ۶ تا ۱۸ سال در اندیشه',
            footerCopyright:
              tc.footerCopyrightText ||
              'تمامی حقوق مادی و معنوی برای آموزشگاه تخصصی رباتیک، کدنویسی و هوش مصنوعی فاتحان محفوظ است.',
            location: {
              province: loc?.province || 'تهران / البرز',
              city: loc?.city || 'اندیشه',
              addressFull:
                loc?.fullAddress ||
                'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۳',
              workingHours:
                loc?.workingHours || 'ساعات کاری: شنبه تا پنجشنبه (۹ صبح تا ۸ شب)',
            },
            phones: {
              line1: ph?.line1 || '09103116753',
              line1Formatted: ph?.line1Formatted || ph?.line1 || '۰۹۱۰ ۳۱۱ ۶۷۵۳',
              line1Label: ph?.line1Label || 'خط ۱ مشاوره و ثبت‌نام (۰۹۱۰۳۱۱۶۷۵۳)',
              line2: ph?.line2 || '09372335026',
              line2Formatted: ph?.line2Formatted || ph?.line2 || '۰۹۳۷ ۲۳۳ ۵۰۲۶',
              line2Label: ph?.line2Label || 'خط ۲ پشتیبانی کارگاه (۰۹۳۷۲۳۳۵۰۲۶)',
              landline: ph?.landline || '02165506015',
              landlineFormatted: ph?.landlineFormatted || ph?.landline || '۰۲۱ ۶۵۵۰ ۶۰۱۵',
              landlineLabel: ph?.landlineLabel || 'تلفن ثابت دفتر مرکزی (۰۲۱-۶۵۵۰۶۰۱۵)',
              primary: ph?.line1 || '09103116753',
              primaryFormatted: ph?.line1Formatted || ph?.line1 || '۰۹۱۰ ۳۱۱ ۶۷۵۳',
              primaryLabel: ph?.line1Label || 'خط ۱ مشاوره و ثبت‌نام (۰۹۱۰۳۱۱۶۷۵۳)',
              secondary: ph?.line2 || '09372335026',
              secondaryFormatted: ph?.line2Formatted || ph?.line2 || '۰۹۳۷ ۲۳۳ ۵۰۲۶',
              secondaryLabel: ph?.line2Label || 'خط ۲ پشتیبانی کارگاه (۰۹۳۷۲۳۳۵۰۲۶)',
            },
            social: {
              instagramId: sc?.instagramId || 'fatehan.robot',
              instagramUrl:
                sc?.instagramUrl ||
                `https://instagram.com/${(sc?.instagramId || 'fatehan.robot').replace(/^@/, '')}`,
              eitaaId: sc?.eitaaId ?? 'fatehan_robotics',
              eitaaUrl:
                sc?.eitaaUrl ||
                (sc?.eitaaId ? `https://eitaa.com/${sc.eitaaId.replace(/^@/, '')}` : ''),
              eitaaLogoUrl: sc?.eitaaLogoUrl || '',
              baleId: sc?.baleId || '',
              baleUrl:
                sc?.baleUrl ||
                (sc?.baleId ? `https://ble.ir/${sc.baleId.replace(/^@/, '')}` : ''),
              whatsappUrl:
                sc?.whatsappUrl || `https://wa.me/98${(ph?.line1 || '09103116753').replace(/^0/, '')}`,
            },
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

      // Map About Page from Admin Pages Manager (/api/v1/pages slug='about') + themeConfig.aboutPageConfig
      const dbAboutPage = (pagesBoot?.pages || []).find(
        (pg) => pg.slug === 'about' || pg.slug === 'about-us' || pg.id === 'page_about_us'
      );
      const abCfg = tc?.aboutPageConfig;
      const aboutHeroWidget = dbAboutPage?.composerRows?.[0]?.widgets?.[0];
      const aboutStoryWidgets = dbAboutPage?.composerRows?.find((r) => r.id === 'row_about_story')?.widgets;

      const mappedAboutPage: CmsStorefrontData['aboutPage'] | undefined =
        abCfg || dbAboutPage
          ? {
              heroBadge:
                aboutHeroWidget?.badgeText ||
                'درباره آموزشگاه تخصصی رباتیک فاتحان · معرفی رسمی ویژه والدین، مدارس و سازمان‌ها',
              title:
                abCfg?.heroTitle ||
                dbAboutPage?.title ||
                'آموزشگاه تخصصی رباتیک، کدنویسی و هوش مصنوعی فاتحان؛ مرکز رسمی مهارت‌آموزی و استعدادیابی نسل آینده',
              subtitle:
                abCfg?.heroSubtitle ||
                dbAboutPage?.summary ||
                'دارای مجوز رسمی، ۵ دپارتمان تخصصی کارگاهی، مدرک معتبر فنی و حرفه‌ای و سابقه درخشان در مسابقات کشوری رباتیک',
              introParagraph:
                abCfg?.introParagraph ||
                aboutHeroWidget?.subtitle ||
                'آموزشگاه تخصصی رباتیک فاتحان در شهر جدید اندیشه، با هدف تبدیل کودکان و نوجوانان ۶ تا ۱۸ سال از مصرف‌کنندگان صرف تکنولوژی به خالقان فناوری، مهندسان خلاق و برنامه‌نویسان پیشرو تاسیس شده است.',
              missionStatement:
                abCfg?.missionStatement ||
                aboutStoryWidgets?.[0]?.content ||
                'ماموریت راهبردی آکادمی فاتحان بر پایه شعار «رباتیک فقط یک رشته نیست... یک مهارت زندگی است» بنا شده است؛ ما باور داریم تقویت تفکر الگوریتمی، حل مسئله، دریافت مدرک فنی و حرفه‌ای و آمادگی ورود به بازار کار، مهم‌ترین سرمایه هر دانش‌آموز است.',
              institutionalPitch:
                abCfg?.schoolPartnershipNote ||
                aboutStoryWidgets?.[1]?.content ||
                'آمادگی کامل جهت عقد تفاهم‌نامه و همکاری رسمی با مدارس دولتی و غیردولتی، پژوهش‌سراهای دانش‌آموزی، مراکز فرهنگی و سازمان‌ها جهت برگزاری کارگاه‌های تخصصی رباتیک، هوش مصنوعی و برنامه‌نویسی.',
              highlights: [
                {
                  title: '۱۵ دوره مصوب و استاندارد از ۶ تا ۱۸ سال',
                  description:
                    'سرفصل‌های گام‌به‌گام از کودک خلاق و مکانیک پایه تا الکترونیک، بردهای هوشمند، آردوینو، پایتون و طراحی سه‌بعدی.',
                  badge: 'سرفصل علمی استاندارد',
                },
                {
                  title: 'کارگاه‌های مجهز به پرینتر سه‌بعدی و ابزار دقیق',
                  description:
                    'تمامی کلاس‌ها ۱۰۰٪ عملی بوده و کارآموزان به پرینترهای سه‌بعدی صنعتی، ایستگاه‌های الکترونیک ایمن و کیت‌های استاندارد دسترسی دارند.',
                  badge: 'آموزش ۱۰۰٪ کارگاهی',
                },
                {
                  title: 'همکاری رسمی با مدیران مدارس و مراکز آموزشی',
                  description:
                    'اعزام اساتید مجرب، تامین کیت‌های آموزشی استاندارد با نرخ نمایندگی و برگزاری مسابقات داخلی ویژه مدارس منطقه.',
                  badge: 'ویژه مدارس و سازمان‌ها',
                },
                {
                  title: 'مدرک معتبر فنی و حرفه‌ای و آمادگی ورود به بازار کار',
                  description:
                    'ارائه گواهی پایان دوره معتبر، معرفی جهت اخذ مدرک رسمی سازمان فنی و حرفه‌ای و آموزش مهارت‌های پول‌ساز برای ورود به بازار کار.',
                  badge: 'مدرک فنی‌حرفه‌ای و بازار کار',
                },
              ],
              seoTitle:
                dbAboutPage?.seoTitle ||
                'درباره آموزشگاه رباتیک فاتحان اندیشه | مرکز تخصصی رباتیک، کدنویسی و هوش مصنوعی',
              seoDescription:
                dbAboutPage?.seoDescription ||
                'آشنایی کامل با آموزشگاه تخصصی رباتیک فاتحان در اندیشه فاز ۱؛ برگزارکننده ۱۵ دوره عملی رباتیک، برنامه‌نویسی، الکترونیک و چاپ سه‌بعدی ویژه سنین ۶ تا ۱۸ سال.',
              focusKeyword: 'آموزشگاه رباتیک فاتحان اندیشه',
              slug: 'about',
            }
          : undefined;

      // Single Source of Truth: Use backend products directly when non-empty; fallback to DEFAULT_FATEHAN_HARDWARE_PRODUCTS only if DB returned 0 products
      const finalProducts: ProductItem[] =
        mappedProducts.length > 0 ? mappedProducts : DEFAULT_FATEHAN_HARDWARE_PRODUCTS;

      return {
        ...(settingsPatch
          ? {
              settings: settingsPatch as unknown as CmsStorefrontData['settings'],
              typography: settingsPatch.typography,
            }
          : {}),
        ...(mappedAboutPage ? { aboutPage: mappedAboutPage } : {}),
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
      const normalizedPhone = String(payload.phone || '')
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[^0-9]/g, '')
        .replace(/^009809/, '09')
        .replace(/^00989/, '09')
        .replace(/^9809/, '09')
        .replace(/^989/, '09')
        .replace(/^9(\d{9})$/, '09$1');
      try {
        const res = await fetch(`${base}/api/sms/send-otp`, {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: buildHeaders(),
          body: JSON.stringify({ phone: normalizedPhone }),
        });
        const data = await res.json().catch(() => ({}));
        return {
          ok: res.ok && Boolean(data.success !== false),
          message: typeof data.message === 'string' ? data.message : undefined,
          gatewayStatus: typeof data.gatewayStatus === 'string' ? data.gatewayStatus : undefined,
          requiresMasterCode: Boolean(data.requiresMasterCode),
          error:
            typeof data.error === 'string' && data.error
              ? data.error
              : !res.ok
              ? `خطای سرور احراز هویت (کد ${res.status})`
              : undefined,
        };
      } catch {
        return {
          ok: false,
          error: 'خطا در برقراری ارتباط با سرور پیامک. لطفاً اتصال اینترنت را بررسی کنید.',
        };
      }
    },

    async verifyOtp(payload) {
      const normalizedPhone = String(payload.phone || '')
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[^0-9]/g, '')
        .replace(/^009809/, '09')
        .replace(/^00989/, '09')
        .replace(/^9809/, '09')
        .replace(/^989/, '09')
        .replace(/^9(\d{9})$/, '09$1');
      const normalizedCode = String(payload.code || '')
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .trim();
      try {
        const res = await fetch(`${base}/api/sms/verify-otp`, {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: buildHeaders(),
          body: JSON.stringify({
            phone: normalizedPhone,
            code: normalizedCode,
            fullName: payload.fullName,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const isVerified = Boolean(res.ok && (data.verified || data.ok));
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
        if (isVerified && resolvedSessionToken) {
          writeStoredSession({
            sessionToken: resolvedSessionToken,
            phone: data.phone || normalizedPhone,
            fullName: resolvedFullName,
            userRole: resolvedRole,
            roleId: data.roleId || 'role_customer',
          });
        }
        return {
          ok: isVerified,
          verified: isVerified,
          sessionToken: resolvedSessionToken,
          user: isVerified
            ? {
                fullName: resolvedFullName,
                phone: data.phone || normalizedPhone,
                verified: true,
                walletBalanceToman: 0,
                role: resolvedRole,
                roleId: data.roleId,
              }
            : undefined,
          message: typeof data.message === 'string' ? data.message : undefined,
          error:
            typeof data.error === 'string' && data.error
              ? data.error
              : !isVerified
              ? !res.ok
                ? `خطا در بررسی کد امنیتی (کد ${res.status})`
                : 'پاسخ معتبری از سرور احراز هویت دریافت نشد. لطفاً صفحه را رفرش کرده و مجدداً تلاش کنید.'
              : undefined,
        };
      } catch {
        return {
          ok: false,
          verified: false,
          error: 'خطا در برقراری ارتباط با سرور احراز هویت. لطفاً مجدداً تلاش کنید.',
        };
      }
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
