export type AccentPresetId = 'cobalt' | 'amber' | 'emerald' | 'rose' | 'violet';
export type AIToolCategory = 'Claude' | 'ChatGPT' | 'Codex';
export type PosterColorScheme = 'cobalt' | 'sage' | 'terracotta' | 'violet' | 'slate';
export type UserRoleType = 'guest' | 'customer' | 'admin' | 'super_admin';

export type ActiveTab =
  | 'store'
  | 'product_single'
  | 'articles'
  | 'article_single'
  | 'page_single'
  | 'guide'
  | 'dashboard'
  | 'admin';

export type CatalogFilter = 'all' | 'Claude' | 'ChatGPT' | 'Codex' | 'pro' | 'bookmarked';

export interface MediaVariants {
  'thumb-25'?: string;
  'thumb-300'?: string;
  'medium-800'?: string;
  'original-webp'?: string;
  thumb25?: string;
  thumb300?: string;
  medium800?: string;
  original?: string;
}

export interface MediaAssetItem {
  id: string;
  title: string;
  url: string;
  variants?: MediaVariants;
  mediaType?: 'image' | 'video';
  mimeType?: string;
  fileSizeBytes?: number;
  altText: string;
  caption: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  dimensionsLabel: string;
  categoryLabel?: string;
  category?: 'article' | 'product' | 'banner' | 'article_cover' | 'product_poster' | 'brand_banner';
  uploadedAtLabel?: string;
  createdAtLabel?: string;
}

export type TaxonomyType = 'product_category' | 'article_category' | 'brand' | 'tag';

export interface TaxonomyItem {
  id: string;
  taxonomyType: TaxonomyType;
  slug: string;
  titleFa: string;
  parentId: string | null;
  iconName?: string;
  imageUrl?: string;
  description?: string;
  sortOrder: number;
  itemsCount?: number;
  updatedAt?: string;
}

export type ComposerColumnCount = 1 | 2 | 3 | 4;

export type ComposerWidgetType =
  | 'hero_slider'
  | 'rich_text'
  | 'product_grid'
  | 'price_history_30d'
  | 'license_comparison'
  | 'video_player'
  | 'image_gallery_slider'
  | 'faq_accordion'
  | 'download_box'
  | 'cta_banner'
  | 'stats_counter'
  | 'code_snippet'
  | 'testimonials_grid'
  | 'lead_form'
  | 'custom_html'
  | 'invoice_header_brand'
  | 'invoice_items_vat_table'
  | 'invoice_stamp_qr_footer';

export interface ComposerWidgetInstance {
  id: string;
  widgetType: ComposerWidgetType;
  title: string;
  subtitle?: string;
  content?: string;
  badgeText?: string;
  ctaText?: string;
  ctaLink?: string;
  mediaUrl?: string;
  colSpan?: 1 | 2 | 3 | 4;
  accentTone?: AccentPresetId;
  configJson?: Record<string, unknown>;
}

export interface ComposerRow {
  id: string;
  rowTitle: string;
  columns: ComposerColumnCount;
  backgroundStyle?: 'default' | 'muted' | 'accent' | 'dark';
  widgets: ComposerWidgetInstance[];
}

export interface CmsDynamicPage {
  id: string;
  slug: string;
  title: string;
  status: 'published' | 'draft';
  templateType: 'standard' | 'landing' | 'full_width' | 'contact' | 'faq';
  summary: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl?: string;
  ogImage?: string;
  schemaType: 'WebPage' | 'FAQPage' | 'AboutPage' | 'ContactPage';
  composerRows: ComposerRow[];
  updatedAt: string;
}

export type CmsMenuLocation = 'header' | 'footer' | 'mobile_drawer';

export interface CmsMenuItem {
  id: string;
  location: CmsMenuLocation;
  titleFa: string;
  parentId: string | null;
  targetType: 'page' | 'category' | 'article' | 'tab' | 'custom_url';
  targetValue: string;
  badgeText?: string;
  openInNewTab: boolean;
  sortOrder: number;
  enabled: boolean;
  updatedAt?: string;
}

export interface CmsInvoiceTemplate {
  id: string;
  templateCode: string;
  titleFa: string;
  invoiceKind: 'official_tax' | 'standard_commercial';
  paperSize: 'A4' | 'A5' | 'Thermal80mm';
  vatPercent: number;
  sellerName: string;
  sellerEconomicCode: string;
  sellerNationalId: string;
  sellerPostalCode: string;
  sellerPhone: string;
  sellerAddress: string;
  logoUrl: string;
  stampSignatureUrl: string;
  footerNote: string;
  isDefault: boolean;
  composerRows: ComposerRow[];
  updatedAt: string;
}

export type HomepageSectionKey =
  | 'hero'
  | 'widgets'
  | 'tools_bento'
  | 'catalog'
  | 'motion_stack'
  | 'articles'
  | 'faq';

export interface CustomPageWidget {
  id: string;
  type: 'promo_banner' | 'stats_strip' | 'code_spotlight' | 'cta_card';
  title: string;
  subtitle: string;
  badgeText: string;
  buttonText: string;
  buttonTargetTab: 'store' | 'articles' | 'guide' | 'dashboard';
  accentTone: AccentPresetId;
  enabled: boolean;
}

export interface CmsPluginItem {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  enabled: boolean;
}

export interface FooterTrustBadgesConfig {
  enamadEnabled: boolean;
  enamadMode: 'image' | 'code';
  enamadImageUrl: string;
  enamadLinkUrl: string;
  enamadHtmlCode: string;
  enamadLabel: string;
  secondBadgeEnabled: boolean;
  secondBadgeMode: 'image' | 'code';
  secondBadgeImageUrl: string;
  secondBadgeLinkUrl: string;
  secondBadgeHtmlCode: string;
  secondBadgeLabel: string;
}

export interface SeoCrawlVisibilityConfig {
  allowSearchEngines: boolean;
  allowAiCrawlers: boolean;
  customRobotsExtra?: string;
  customLlmsIntro?: string;
}

export interface ThemeConfig {
  brandNameFa: string;
  brandNameEn: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroBadgeText?: string;
  heroTitleLine1: string;
  heroTitleAccent: string;
  heroSubtitle: string;
  heroPrimaryCtaText?: string;
  toolsSectionTitle?: string;
  toolsSectionSubtitle?: string;
  catalogSectionTitle?: string;
  catalogSectionSubtitle?: string;
  motionSectionTitle?: string;
  articlesSectionTitle?: string;
  faqSectionTitle?: string;
  footerQuoteTitle?: string;
  footerQuoteSubtitle?: string;
  footerDescription?: string;
  siteDescription?: string;
  footerTrustBadges?: FooterTrustBadgesConfig;
  topAnnouncementText?: string;
  showTopAnnouncement?: boolean;
  accentPreset: AccentPresetId;
  activeThemeId?: 'default' | 'fatehan';
  darkMode: boolean;
  skinName?: string;
  enableLenisSmoothScroll?: boolean;
  enableGsapAnimations?: boolean;
  enableBarbaTransitions?: boolean;
  enableMuuriDrag?: boolean;
  productGridColumns: 2 | 3 | 4;
  heroSliderSkillIds: string[];
  showHeroSection: boolean;
  showCustomWidgetsSection?: boolean;
  showToolsBentoSection: boolean;
  showMotionShowcaseSection: boolean;
  showArticlesSection: boolean;
  showFaqSection: boolean;
  sectionOrder?: HomepageSectionKey[];
  customWidgets?: CustomPageWidget[];
  activePlugins?: CmsPluginItem[];
}

export type ProductTypeKind = 'downloadable' | 'physical' | 'subscription';

export interface ProductDownloadFile {
  id: string;
  title: string;
  fileName?: string;
  storageType: 'uploaded' | 'external_host';
  /** Raw protected path or external host URL (never sent to unauthenticated/public storefront clients) */
  sourceUrl?: string;
  fileSizeLabel?: string;
  version?: string;
  mimeType?: string;
  protectedDownload?: boolean;
}

export interface SkillProduct {
  id: string;
  title: string;
  slug: string;
  category: string;
  subCategory?: string;
  itemType: 'product' | 'package';
  price: number;
  originalPrice: number;
  shortDescription: string;
  modulesCount: number;
  durationHours: number;
  level: string;
  imageUrl: string;
  imageAlt?: string;
  featured: boolean;
  status: 'published' | 'draft';
  authorId: string;
  posterCode?: string;
  posterTagEn?: string;
  posterColor?: PosterColorScheme;
  posterIconType?: 'braces' | 'grid' | 'radial' | 'starburst' | 'shield' | 'layers';
  version?: string;
  expectedOutput?: string;
  prerequisites?: string[];
  usageSteps?: string[];
  skillMarkdownContent?: string;
  syllabus?: string[];
  deliverables?: string[];
  githubSourceRepo?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  galleryUrls?: string[];
  videoUrl?: string;
  deliveryType?: 'digital' | 'physical';
  productType?: ProductTypeKind;
  downloadFiles?: ProductDownloadFile[];
  downloadAccessNote?: string;
  downloadLimitPerUser?: number;
  technicalSpecs?: { label: string; value: string }[];
  composerRows?: ComposerRow[];
}

export interface CartItem {
  product: SkillProduct;
  quantity: number;
}

export interface SkillArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  authorName?: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  summary: string;
  bodyMarkdown: string;
  readingTimeMinutes: number;
  publishedDateLabel: string;
  status: 'published' | 'draft';
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  featured: boolean;
  galleryUrls?: string[];
  composerRows?: ComposerRow[];
}

export interface CouponRule {
  code: string;
  discountPercent: number;
  description: string;
  active: boolean;
}

export type PaymentGatewayId =
  | 'irankish'
  | 'novinopay'
  | 'zarinpal_online'
  | 'zibal_direct'
  | 'behpardakht_mellat'
  | 'sep_saman'
  | 'sadad_melli'
  | 'pasargad_pep'
  | 'payping'
  | 'idpay'
  | 'wallet_credit'
  | 'crypto_tether'
  | 'snapppay_bnpl'
  | 'tara_bnpl'
  | 'digipay_bnpl'
  | 'azkivam_bnpl'
  | 'sandbox_test';

export interface PaymentGatewayOption {
  id: PaymentGatewayId;
  title: string;
  subtitle: string;
  enabled: boolean;
  showOnStorefront?: boolean;
  gatewayKind?: 'cash' | 'bnpl' | 'wallet';
  installmentMonths?: number;
  bnplFeePercent?: number;
  cashDiscountPercent?: number;
  merchantId?: string;
  terminalId?: string;
  apiKey?: string;
  passPhrase?: string;
  publicKey?: string;
  callbackUrl?: string;
  useHostRouter?: boolean;
  hostRouterUrl?: string;
  isShaparakDirect?: boolean;
  sandboxMode?: boolean;
}

export interface PaymentDisplayConfig {
  defaultGatewayId: PaymentGatewayId;
  displayMode: 'selected_only' | 'single_default' | 'all_enabled';
  enablePaymentSimulator: boolean;
}

export type SmsProviderId =
  | 'melipayamak'
  | 'kavenegar'
  | 'farazsms'
  | 'parsgreen'
  | 'iranpayamak'
  | 'tasnimsms'
  | 'savatpayamak'
  | 'payamaksara'
  | 'smsir'
  | 'ghasedak'
  | 'magfa'
  | 'farapayamak'
  | 'bale'
  | 'eitaa';

export type BaleSendMode = 'auto' | 'safir_otp' | 'bot_api';

export interface SmsProviderCredential {
  provider: SmsProviderId;
  enabled: boolean;
  username: string;
  apiKey: string;
  senderLine: string;
  otpPatternCode: string;
  apiMethod?: 'sendbybasenumber2' | 'sendbybasenumber' | 'rest_baseservicenumber';
  domain?: string;
  patternVarName?: string;
  baleMode?: BaleSendMode;
  baleClientId?: string;
  baleClientSecret?: string;
  baleBotToken?: string;
  baleChatId?: string;
  eitaaToken?: string;
  eitaaChatId?: string;
  sandboxMode: boolean;
}

export interface SmsGatewaySettings {
  enabled?: boolean;
  provider: SmsProviderId;
  apiMethod?: 'sendbybasenumber2' | 'sendbybasenumber' | 'rest_baseservicenumber';
  username: string;
  apiKey: string;
  senderLine: string;
  sandboxMode: boolean;
  otpPatternCode: string;
  providersMap?: Partial<Record<SmsProviderId, SmsProviderCredential>>;
  eventRouting?: Partial<Record<SmsTriggerEventKey, SmsProviderId | 'default'>>;
}

export interface SiteModuleRegistryItem {
  id: string;
  titleFa: string;
  description: string;
  category: 'ecommerce' | 'academy' | 'marketing' | 'communication' | 'operations' | 'seo' | 'plugins';
  enabled: boolean;
  hasTools: boolean;
  hasSettings: boolean;
  targetSection?: string;
  dependencies?: string[];
}

export interface SubscriptionPlanItem {
  id: string;
  code: 'monthly_1m' | 'quarterly_3m' | 'semiannual_6m' | 'annual_12m' | string;
  titleFa: string;
  durationDays: number;
  price: number;
  originalPrice: number;
  badgeText: string;
  description: string;
  features: string[];
  coveredCategories: string[]; // ['all'] or specific categories
  autoUnlockNewProducts: boolean;
  autoUnlockUpdates: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface UserSubscriptionRecord {
  id: string;
  userPhone: string;
  userName: string;
  planId: string;
  planTitle: string;
  coveredCategories: string[];
  autoUnlockNewProducts: boolean;
  status: 'active' | 'expired' | 'cancelled';
  startedAt: string;
  expiresAt: string;
  startedAtFa: string;
  expiresAtFa: string;
  amountPaid: number;
}

export interface SmartCrmRule {
  id: string;
  titleFa: string;
  triggerType: 'category_new_product' | 'product_version_update' | 'post_purchase_cross_sell';
  channel: 'dashboard' | 'sms_and_dashboard';
  messageTemplate: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface SmartCrmRecommendation {
  id: string;
  userPhone: string;
  userName: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  category: string;
  reasonText: string;
  ruleTrigger: string;
  status: 'sent' | 'seen' | 'converted';
  createdAtFa: string;
  createdAt: string;
}

export type SmsTriggerEventKey =
  | 'order_created'
  | 'payment_success'
  | 'free_skill_claimed'
  | 'order_status_changed'
  | 'user_registered';

export interface SmsTriggerRule {
  id: string;
  title: string;
  eventKey: SmsTriggerEventKey;
  sectionLabel: string;
  sendMode: 'custom_text' | 'pattern_code';
  patternCode: string;
  messageTemplate: string;
  providerOverride?: SmsProviderId | 'default';
  enabled: boolean;
  priorityOrder: number;
}

export interface BackupScheduleConfig {
  autoDailyEnabled: boolean;
  scheduleHour: number;
  autoBackupFormat?: 'sql' | 'json' | 'both';
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpTargetEmail: string;
  baleEnabled: boolean;
  baleBotToken: string;
  baleChatId: string;
  lastAutoBackupDate?: string;
}

export interface BackupHistoryItem {
  id: string;
  filename: string;
  format: 'json' | 'sql';
  triggerType: 'manual' | 'scheduled';
  destination: string;
  status: 'success' | 'failed';
  sizeBytes: number;
  createdAtIso: string;
  createdAtFa: string;
}

export type SystemLogLevel = 'success' | 'warning' | 'error';
export type SystemLogCategory =
  | 'payment'
  | 'sms'
  | 'auth'
  | 'backup'
  | 'database'
  | 'system';

export interface SystemLogEntry {
  id: string;
  level: SystemLogLevel;
  category: SystemLogCategory;
  title: string;
  detail: string;
  sqlOrEndpoint?: string;
  payloadJson?: string;
  createdAtIso: string;
  createdAtFa: string;
}

export type AiProviderId = 'gemini' | 'openai' | 'claude' | 'custom_openai';

export interface AiEngineConfig {
  activeProvider: AiProviderId;
  modelName: string;
  customBaseUrl: string;
  defaultTone: string;
  autoGenerateSeo: boolean;
  enableContentAssistant: boolean;
  allowAdminAiSeo: boolean;
  allowEditorAiSeo: boolean;
}

export interface CmsRolePermissions {
  canManageProducts: boolean;
  canManageArticles: boolean;
  canManageMedia: boolean;
  canManagePageBuilder: boolean;
  canUseAiSeo: boolean;
  canManageOrders: boolean;
  canManageGateways: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageSessions: boolean;
  canManageBackups: boolean;
  canManageThemes: boolean;
}

export type CmsPermissionKey = keyof CmsRolePermissions;

export interface CmsRoleDefinition {
  id: string;
  roleSlug: 'super_admin' | 'admin' | 'seo_editor' | 'customer';
  titleFa: string;
  badgeColor: string;
  description: string;
  usersCount: number;
  permissions: CmsRolePermissions;
}

export interface HashedPermissionRecord {
  id: string;
  roleId: string;
  roleSlug: string;
  capabilityKey: CmsPermissionKey;
  granted: boolean;
  permissionHash: string;
  updatedAt: string;
}

export interface AdminUserRecord {
  phone: string;
  fullName: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'customer';
  roleId: string;
  status: 'active' | 'suspended';
  notes?: string;
  claimedSkillIds: string[];
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface CmsSessionRecord {
  id: string;
  phone?: string;
  userDisplay: string;
  roleLabel: string;
  deviceLabel: string;
  authMethod: 'google_oauth' | 'otp_sms' | 'passkey_hardware';
  ipMasked: string;
  status: 'active' | 'revoked';
  lastActiveLabel: string;
}

export interface OtpSecurityConfig {
  smsProvider: SmsProviderId;
  patternCode: string;
  senderLine: string;
  otpExpirySeconds: number;
  requireOtpForAdmin: boolean;
  sessionTimeoutHours: number;
  strictIpBinding: boolean;
}

export interface OrderRecord {
  id: string;
  buyerId: string;
  buyerName: string;
  totalAmount: number;
  discountAmount?: number;
  couponCode?: string;
  itemsSummary: string;
  itemsCount: number;
  paymentMethod: PaymentGatewayId;
  status: 'paid' | 'pending' | 'completed' | 'cancelled';
  createdAtLabel: string;
}

export interface ArchitecturePhase {
  stepNumber: string;
  title: string;
  subtitle: string;
  summary: string;
  keyActions: string[];
  deliverableTag: string;
}

export interface StarterFileEntry {
  path: string;
  description: string;
  getContent: (theme: ThemeConfig) => string;
}
