/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fatehan Standalone Theme — CMS v2.0.0 Data Contracts & API Interfaces
 * Completely decoupled from legacy CoreContext and admin internals.
 */

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';
export type PersianFontFamily = 'Vazirmatn' | 'IRANSansX' | 'Sahel' | 'YekanBakh' | 'Abar';
export type PrintPaperSize = 'A4' | 'A5' | '80mm';
export type DeviceFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type DeviceSpacingPreset = 'compact' | 'normal' | 'spacious';

export type BuilderWidgetType =
  | 'hero_banner'
  | 'multi_heading'
  | 'rich_text'
  | 'interactive_banner'
  | 'feature_grid'
  | 'kpi_strip'
  | 'roadmap_timeline'
  | 'product_showcase'
  | 'blog_grid'
  | 'testimonials'
  | 'faq_accordion'
  | 'pricing_table'
  | 'smart_form'
  | 'video_lab'
  | 'countdown_timer'
  | 'custom_code'
  | 'enterprise_cta';

export interface BuilderBlockItem {
  title: string;
  subtitle: string;
  badge?: string;
}

export interface BuilderBlock {
  id: string;
  pageSlug?: string;
  type: BuilderWidgetType;
  title: string;
  heading: string;
  highlightWord?: string;
  subheading: string;
  ctaPrimary: string;
  ctaSecondary: string;
  desktopCols: 12 | 6 | 4;
  tabletCols: 12 | 6;
  desktopGridCols?: 1 | 2 | 3 | 4;
  tabletGridCols?: 1 | 2 | 3;
  mobileGridCols?: 1 | 2;
  desktopFontSize?: DeviceFontSize;
  tabletFontSize?: DeviceFontSize;
  mobileFontSize?: DeviceFontSize;
  desktopPadding?: DeviceSpacingPreset;
  tabletPadding?: DeviceSpacingPreset;
  mobilePadding?: DeviceSpacingPreset;
  mobileHidden: boolean;
  desktopHidden?: boolean;
  tabletHidden?: boolean;
  customHtml?: string;
  countdownTarget?: string;
  videoUrl?: string;
  itemsList?: BuilderBlockItem[];
}

export interface CmsMenuItem {
  id: string;
  label: string;
  path: string;
  icon?:
    | 'home'
    | 'sparkles'
    | 'gift'
    | 'store'
    | 'file-text'
    | 'info'
    | 'map-pin'
    | 'compass'
    | 'phone'
    | 'credit-card'
    | 'user';
  variant?: 'default' | 'highlight-emerald';
  matchPrefixes?: string[];
}

export interface CmsSiteSettings {
  academyNameFa: string;
  academyNameEn: string;
  domain: string;
  url: string;
  logoUrl: string;
  headerLogoSizePx?: number;
  taglinePrimary: string;
  taglineSecondary: string;
  mottoEn: string;
  mottoFa: string;
  description: string;
  announcementTopBarText?: string;
  location: {
    province: string;
    city: string;
    addressShort: string;
    addressFull: string;
    workingHours: string;
    postalCode?: string;
  };
  phones: {
    primary: string;
    primaryFormatted: string;
    primaryLabel?: string;
    secondary: string;
    secondaryFormatted: string;
    secondaryLabel?: string;
    landline: string;
    landlineFormatted: string;
    landlineLabel?: string;
  };
  social: {
    instagramId: string;
    instagramUrl: string;
    eitaaId: string;
    eitaaUrl: string;
    eitaaLogoUrl?: string;
    baleId?: string;
    baleUrl?: string;
    whatsappUrl?: string;
  };
  typography: TypographyConfig;
}

export interface TypographyConfig {
  headingFont: PersianFontFamily;
  bodyFont: PersianFontFamily;
  printFont: PersianFontFamily;
  printPaperDefault: PrintPaperSize;
  baseScalePx: number;
  footerAboutText?: string;
  footerCopyrightRight?: string;
  footerCreditLeft?: string;
  footerCreditUrl?: string;
  footerTrustHtml?: string;
  blueCyanThemeEnabled?: boolean;
  instagramId?: string;
  instagramUrl?: string;
  eitaaId?: string;
  eitaaUrl?: string;
  eitaaLogoUrl?: string;
  baleId?: string;
  baleUrl?: string;
  enamadHtmlCode?: string;
  enamadUseCustomImage?: boolean;
  enamadCustomImageUrl?: string;
  licenseImageUrl?: string;
  licenseTitle?: string;
  licenseTargetUrl?: string;
}

export interface CmsDepartmentItem {
  id: 'robotics' | 'electronics' | 'printing' | 'coding' | 'mechanics' | string;
  deptNumFa: string;
  codeEn: string;
  title: string;
  badge: string;
  color: 'emerald' | 'amber' | 'violet' | 'blue' | 'rose';
  badgeBg: string;
  deckBg: string;
  deckBorder: string;
  deckText: string;
  deckAccent: string;
  iconKey: 'bot' | 'cpu' | 'box' | 'terminal' | 'cog';
  subtitle: string;
  description: string;
  stages: string[];
  projects: string[];
}

export interface FatehanCourse {
  id: string;
  code: string;
  title: string;
  slug?: string;
  ageGroup: 'S' | 'A' | 'B' | 'C';
  ageRangeFa: string;
  category:
    | 'کودک خلاق'
    | 'مکانیک'
    | 'الکترونیک'
    | 'مکاترونیک'
    | 'برنامه‌نویسی و هوش مصنوعی'
    | 'طراحی و ساخت سه‌بعدی'
    | 'مهارت‌های تخصصی'
    | string;
  tuitionApprovedToman: number;
  tuitionEarlyBirdToman: number;
  tuitionNormalToman: number;
  tuitionPrivateToman: number;
  sessionsCount: number;
  hoursPerSession: number;
  levelFa: string;
  prerequisites: string;
  summaryFa: string;
  syllabusPoints: string[];
  equipmentNeeded: string;
  status: 'ثبت‌نام فعال' | 'در حال برگزاری' | 'تکمیل ظرفیت' | string;
  featuredImageUrl: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  departmentId?: string;
  instructorName?: string;
  maxCapacity?: number;
  enrolledCount?: number;
  scheduleTime?: string;
  termSeason?: string;
  branchName?: string;
  gradeLevel?: string;
  classDays?: string;
  deliveryMode?: string;
  hasCertificate?: boolean;
  certificateTitle?: string;
  installmentAvailable?: boolean;
  installmentNote?: string;
  introVideoUrl?: string;
  galleryImages?: string[];
  fullDescription?: string;
  tags?: string[];
  isPublished?: boolean;
  isFeatured?: boolean;
}

export interface AcademyCourseItem {
  id: string | number;
  slug: string;
  title: string;
  enTitle?: string;
  subtitle?: string;
  department?: string;
  category?: string;
  ageRange: string;
  durationSummary?: string;
  sessionsSummary?: string;
  description: string;
  tuitionApprovedToman?: number;
  tuitionEarlyBirdToman?: number;
  tuitionNormalToman?: number;
  tuitionPrivateToman?: number;
  approvedPrice?: number;
  earlyTwoStepPrice?: number;
  earlyOneStepPrice?: number;
  privatePrice?: number;
  popular?: boolean;
  isFeatured?: boolean;
  badgeColor?: string;
  accentColor?: string;
  outcomes?: string[];
  toolsUsed?: string[];
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
}

export interface AcademyFreeCourseItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  badge: string;
  ageRange: string;
  duration?: string;
  durationText?: string;
  projectsCount: number;
  projects?: string[];
  projectsList?: string[];
  description: string;
  imageUrl?: string;
  ctaText?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
}

export interface FreeCoursesPageConfig {
  gridColumns: 2 | 3 | 4;
  heroBadge: string;
  heroTitle: string;
  heroHighlightWord?: string;
  heroDescription: string;
  heroCtaText: string;
  listSectionTitle: string;
  listSectionSubtitle: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
}

export interface AboutPageConfig {
  heroBadge: string;
  title: string;
  subtitle: string;
  introParagraph: string;
  missionStatement: string;
  institutionalPitch: string;
  highlights: Array<{ title: string; description: string; badge: string }>;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  slug: string;
}

export type ProductKind = 'simple' | 'variable' | 'virtual' | 'downloadable';

export interface ProductAttributeDef {
  name: string;
  values: string[];
}

export interface ProductVariationItem {
  id: string;
  attributeSummary: string;
  sku: string;
  priceToman: number;
  salePriceToman?: number;
  stock: number;
  imageUrl?: string;
}

export interface ProductVirtualSession {
  id: string;
  title: string;
  durationMinutes: number;
  instructorOrLead: string;
}

export interface ProductDownloadableFile {
  id: string;
  fileName: string;
  fileUrl: string;
  sizeMb: string;
}

export interface ProductTechSpecRow {
  key: string;
  value: string;
}

export interface ProductItem {
  id: string;
  sku: string;
  slug?: string;
  name: string;
  productKind?: ProductKind;
  type: string;
  category?: string;
  featuredImageUrl?: string;
  shortDescription?: string;
  description?: string;
  fullReviewContent?: string;
  priceToman: number;
  salePriceToman?: number;
  saleEndDate?: string;
  stock: number;
  salesCount: number;
  status: string;
  warranty: string;
  specs: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  weightKg?: string;
  dimensionsCm?: string;
  attributes?: ProductAttributeDef[];
  variations?: ProductVariationItem[];
  virtualSessions?: ProductVirtualSession[];
  enrollmentCapacity?: number;
  downloadableFiles?: ProductDownloadableFile[];
  downloadLimit?: number;
  downloadExpiryDays?: number;
  techSpecsTable?: ProductTechSpecRow[];
  galleryUrls?: string[];
  introVideoUrl?: string;
  upSellSkus?: string[];
  crossSellSkus?: string[];
  minOrderQty?: number;
  maxOrderQty?: number;
}

export interface StoreCartItem {
  cartKey: string;
  productId: string;
  title: string;
  sku: string;
  variationId?: string;
  variationSummary?: string;
  unitPrice: number;
  regularPrice?: number;
  qty: number;
  imageUrl?: string;
  maxStock?: number;
}

export interface OrderLineItem {
  sku: string;
  title: string;
  qty: number;
  unitPrice: number;
}

export type OrderLifecycleStatus =
  | 'Paid'
  | 'Processing'
  | 'Shipped'
  | 'Pending'
  | 'Installment_Active'
  | 'Cancelled';

export type PaymentGatewayId =
  | 'zarinpal'
  | 'novinopay'
  | 'zibal'
  | 'idpay'
  | 'wallet'
  | 'card_to_card'
  | 'installment';

export interface OrderRecord {
  id: string;
  invoiceNumber: string;
  customerName: string;
  nationalId: string;
  economicCode: string;
  postalCode: string;
  phone: string;
  province?: string;
  city?: string;
  address: string;
  createdAt: string;
  status: OrderLifecycleStatus;
  paymentGateway: string;
  gatewayId?: PaymentGatewayId;
  paymentRefId?: string;
  paymentAuthority?: string;
  trackingCode: string;
  shippingMethod: string;
  orderNote?: string;
  cardReceiptRef?: string;
  cardReceiptApproved?: boolean;
  cashbackAwardedToman?: number;
  items: OrderLineItem[];
  discountToman: number;
  taxToman: number;
  totalToman: number;
}

export interface CustomerSavedAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  exactAddress: string;
  isDefault?: boolean;
}

export type CouponDiscountType = 'percent' | 'fixed_cart' | 'fixed_product' | 'free_shipping';

export interface CouponItem {
  code: string;
  discountType?: CouponDiscountType;
  discountPercent: number;
  fixedAmountToman?: number;
  maxCapToman: number;
  minOrderToman?: number;
  maxOrderToman?: number;
  firstOrderOnly?: boolean;
  allowedRoleName?: string;
  allowedCategoryOrSku?: string;
  excludeSaleItems?: boolean;
  usageCount: number;
  usageLimit: number;
  perUserLimit?: number;
  startDate?: string;
  expiryDate?: string;
  status: string;
}

export interface CashbackRewardConfig {
  enabled: boolean;
  cashbackPercent: number;
  maxCashbackPerOrderToman: number;
  minCartForCashbackToman: number;
  expiryDays: number;
  totalAwardedToman: number;
}

export interface PaymentGatewayConfig {
  id: PaymentGatewayId;
  title: string;
  subtitle: string;
  enabled: boolean;
  merchantCode: string;
  sandboxMode?: boolean;
  cardNumber?: string;
  ibanNumber?: string;
  accountHolder?: string;
  upfrontPercent?: number;
  installmentMonths?: number;
}

export interface CmsPost {
  id: string;
  title: string;
  slug: string;
  type: string;
  category: string;
  parentCategory?: string;
  tags?: string[];
  author: string;
  featuredImageUrl?: string;
  seoScore: number;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  views: number;
  readingTimeMinutes?: number;
  status: 'Published' | 'Draft' | 'Scheduled';
  scheduledFor?: string;
  updatedAt: string;
  excerpt: string;
  bodyContent?: string;
  tableOfContents?: string[];
}

export type CommentCategoryType = 'post_comment' | 'product_review' | 'customer_qa';
export type CommentModerationStatus = 'Approved' | 'Pending' | 'Rejected';

export interface CmsCommentItem {
  id: string;
  categoryType: CommentCategoryType;
  authorName: string;
  authorRoleOrOrg: string;
  targetId?: string;
  targetTitle: string;
  body: string;
  createdAt: string;
  status: CommentModerationStatus;
  rating?: 1 | 2 | 3 | 4 | 5;
  pros?: string[];
  cons?: string[];
  isVerifiedBuyer?: boolean;
  adminReply?: string;
  adminRepliedAt?: string;
}

export interface StudentIdeaItem {
  id: string;
  title: string;
  note: string;
  studentName: string;
  phone: string;
  ageGroup?: string;
  createdAt: string;
  status: 'جدید' | 'بررسی شده' | 'تایید و تقدیر شده';
  adminReply?: string;
}

export interface AcademyAnnouncementItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  badgeText?: string;
  targetType: 'public' | 'user_mention';
  mentionedPhone?: string;
  mentionedUserName?: string;
  linkUrl?: string;
  isImportant?: boolean;
}

export interface UserWalletTransaction {
  id: string;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  amountToman: number;
  description: string;
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  nationalCode: string;
  roleId: string;
  role: string;
  department: string;
  walletBalanceToman: number;
  otpEnabled: boolean;
  status: 'Active' | 'Banned' | 'Pending';
  lastLogin: string;
  ordersHistory: Array<{ id: string; date: string; totalToman: number; status: string }>;
  walletTransactions: UserWalletTransaction[];
}

export interface LoggedInCustomer {
  fullName: string;
  phone: string;
  verified: boolean;
  walletBalanceToman: number;
  role: string;
  roleId?: string;
}

export interface VideoModalPayload {
  open: boolean;
  title?: string;
  subtitle?: string;
  videoUrl?: string;
  chapters?: Array<{ time: string; title: string; desc: string }>;
}

/**
 * Unified Storefront State returned by CMS v2.0.0 API Adapter
 */
export interface CmsStorefrontData {
  settings: CmsSiteSettings;
  typography: TypographyConfig;
  headerMenu: CmsMenuItem[];
  footerMenu: CmsMenuItem[];
  mobileBottomMenu: CmsMenuItem[];
  departments: CmsDepartmentItem[];
  courses: Array<FatehanCourse | AcademyCourseItem>;
  freeCourses: AcademyFreeCourseItem[];
  freeCoursesPage?: FreeCoursesPageConfig;
  aboutPage?: AboutPageConfig;
  builderBlocks: BuilderBlock[];
  products: ProductItem[];
  cmsPosts: CmsPost[];
  cmsComments: CmsCommentItem[];
  orders: OrderRecord[];
  coupons: CouponItem[];
  cashbackConfig?: CashbackRewardConfig;
  paymentGateways: PaymentGatewayConfig[];
  customerAddresses: CustomerSavedAddress[];
  studentIdeas: StudentIdeaItem[];
  announcements: AcademyAnnouncementItem[];
  users: UserAccount[];
}

/**
 * Standard Pluggable API Adapter Contract for CMS v2.0.0 Core
 */
export interface CmsApiAdapter {
  fetchStorefrontData: () => Promise<Partial<CmsStorefrontData>>;
  submitComment: (payload: {
    categoryType: CommentCategoryType;
    targetId?: string;
    authorName: string;
    authorRoleOrOrg: string;
    targetTitle: string;
    body: string;
    rating?: 1 | 2 | 3 | 4 | 5;
    pros?: string[];
    cons?: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  submitStudentIdea: (payload: {
    title: string;
    note: string;
    studentName: string;
    phone: string;
    ageGroup?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  submitConsultationLead?: (payload: {
    studentName: string;
    phone: string;
    department: string;
    ageGroup: string;
    note?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  sendOtp: (payload: { phone: string; patternKey?: string }) => Promise<{
    ok: boolean;
    message?: string;
    gatewayStatus?: string;
    requiresMasterCode?: boolean;
    error?: string;
  }>;
  verifyOtp: (payload: {
    phone: string;
    code: string;
    fullName?: string;
  }) => Promise<{
    ok: boolean;
    verified?: boolean;
    user?: LoggedInCustomer;
    sessionToken?: string;
    message?: string;
    error?: string;
  }>;
  saveCustomerAddress: (payload: Omit<CustomerSavedAddress, 'id'>) => Promise<{ ok: boolean; error?: string }>;
  deleteCustomerAddress: (addressId: string) => Promise<{ ok: boolean; error?: string }>;
  createPaymentRequest: (payload: Record<string, unknown>) => Promise<{
    ok: boolean;
    order?: OrderRecord;
    authority?: string;
    sandboxUrl?: string;
    error?: string;
  }>;
  verifyPayment: (payload: Record<string, unknown>) => Promise<{
    ok: boolean;
    order?: OrderRecord;
    error?: string;
  }>;
}
