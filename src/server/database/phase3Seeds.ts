import type {
  CmsDynamicPage,
  CmsInvoiceTemplate,
  CmsMenuItem,
} from '../../core/types.js';
import { dbExec, dbQuery } from './connection.js';

export const INITIAL_DYNAMIC_PAGES: CmsDynamicPage[] = [
  {
    id: 'page_about_us',
    slug: 'about-us',
    title: 'درباره ما و معماری اسکیل ۹۸',
    status: 'published',
    templateType: 'landing',
    summary:
      'مرجع تخصصی مهندسی اسکیل‌های هوش مصنوعی، پرامپت‌های سازمانی و معماری نرم‌افزار برای تیم‌های فنی ایران.',
    seoTitle: 'درباره اسکیل ۹۸ | استودیو مهندسی هوش مصنوعی و اسکیل‌های سازمانی',
    seoDescription:
      'آشنایی با استودیو مهندسی اسکیل ۹۸، استانداردهای تولید اسکیل‌های Claude، ChatGPT و Codex و زیرساخت بومی.',
    canonicalUrl: '/page/about-us',
    ogImage: '/assets/aistudio/logo_8c26749f.webp',
    schemaType: 'AboutPage',
    updatedAt: '2026-11-18T12:00:00.000Z',
    composerRows: [
      {
        id: 'row_about_hero',
        rowTitle: 'سربرگ معرفی استودیو',
        columns: 1,
        backgroundStyle: 'accent',
        widgets: [
          {
            id: 'w_about_hero',
            widgetType: 'hero_slider',
            title: 'مهندسی دقیق اسکیل‌های هوش مصنوعی برای تیم‌های پیشرو',
            subtitle:
              'ما در اسکیل ۹۸ بسته‌های استاندارد دستورالعمل، معماری کد و اتوماسیون را برای مدل‌های Claude، ChatGPT و Codex طراحی و ممیزی می‌کنیم.',
            badgeText: 'استودیو مهندسی اسکیل ۹۸',
            ctaText: 'مشاهده مخزن اسکیل‌ها',
            ctaLink: 'store',
            colSpan: 1,
          },
        ],
      },
      {
        id: 'row_about_stats',
        rowTitle: 'شاخص‌های کلیدی عملکرد',
        columns: 3,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_stat_1',
            widgetType: 'stats_counter',
            title: '+۶۰ اسکیل تخصصی',
            subtitle: 'تست‌شده در پروژه‌های واقعی فول‌استک و دواپس',
            badgeText: '۱۰۰٪ بومی و استاندارد',
            colSpan: 1,
          },
          {
            id: 'w_stat_2',
            widgetType: 'stats_counter',
            title: '۹۹.۹٪ پایداری اینترانت',
            subtitle: 'بدون وابستگی به CDN خارجی و آماده ترافیک بالا',
            badgeText: 'معماری Enterprise',
            colSpan: 1,
          },
          {
            id: 'w_stat_3',
            widgetType: 'stats_counter',
            title: 'پشتیبانی ۲۴/۷ سازمانی',
            subtitle: 'به‌روزرسانی مستمر اسکیل‌ها همگام با نسخه‌های جدید مدل‌ها',
            badgeText: 'تضمین کیفیت',
            colSpan: 1,
          },
        ],
      },
      {
        id: 'row_about_body',
        rowTitle: 'توضیحات فنی و جدول لایسنس',
        columns: 2,
        backgroundStyle: 'muted',
        widgets: [
          {
            id: 'w_about_text',
            widgetType: 'rich_text',
            title: 'چرا استانداردسازی اسکیل‌ها اهمیت دارد؟',
            content:
              'استفاده از پرامپت‌های پراکنده باعث خروجی‌های ناپایدار و باگ‌های امنیتی می‌شود. در اسکیل ۹۸ هر اسکیل شامل ساختار درختی قوانین، چک‌لیست ممیزی امنیت و الگوهای کدنویسی تمیز است.',
            colSpan: 1,
          },
          {
            id: 'w_about_license',
            widgetType: 'license_comparison',
            title: 'مقایسه لایسنس‌های فردی و شرکتی',
            subtitle: 'امکان استفاده در تیم‌های توسعه نرم‌افزار و سازمان‌ها',
            content:
              'لایسنس فردی: ۱ توسعه‌دهنده | لایسنس تیمی: تا ۱۰ نفر | لایسنس سازمانی: نامحدود + استقرار اختصاصی',
            colSpan: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'page_contact_us',
    slug: 'contact-us',
    title: 'تماس با ما و پشتیبانی سازمانی',
    status: 'published',
    templateType: 'contact',
    summary: 'ارتباط مستقیم با واحد فروش سازمانی، پشتیبانی فنی و مشاوره استقرار اسکیل‌ها.',
    seoTitle: 'تماس با اسکیل ۹۸ | پشتیبانی فنی و فروش سازمانی',
    seoDescription: 'راه‌های ارتباطی با تیم فنی اسکیل ۹۸، ثبت درخواست مشاوره و پشتیبانی خریداران.',
    canonicalUrl: '/page/contact-us',
    ogImage: '/assets/aistudio/logo_8c26749f.webp',
    schemaType: 'ContactPage',
    updatedAt: '2026-11-18T12:00:00.000Z',
    composerRows: [
      {
        id: 'row_contact_main',
        rowTitle: 'اطلاعات تماس و فرم ارتباط',
        columns: 2,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_contact_info',
            widgetType: 'rich_text',
            title: 'واحد پشتیبانی و امور مشتریان اسکیل ۹۸',
            subtitle: 'پاسخ‌گویی سریع در روزهای کاری و تعطیل',
            content:
              'تهران، تقاطع خیابان ولیعصر و طالقانی، مجتمع فناوری و نوآوری، واحد ۴۰۲ • تلفن پشتیبانی: ۰۲۱-۹۱۰۰۹۸۹۸ • ایمیل: support@skill98.ir',
            colSpan: 1,
          },
          {
            id: 'w_contact_form',
            widgetType: 'lead_form',
            title: 'ارسال پیام مستقیم به واحد فنی',
            subtitle: 'کارشناسان ما در کمتر از ۲ ساعت پاسخ‌گوی شما هستند.',
            ctaText: 'ثبت و ارسال درخواست',
            colSpan: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'page_terms',
    slug: 'terms-and-privacy',
    title: 'قوانین، مقررات و حریم خصوصی',
    status: 'published',
    templateType: 'standard',
    summary: 'شرایط استفاده از اسکیل‌ها، قوانین مالکیت فکری، ضمانت اصالت فایل‌ها و حفظ حریم خصوصی کاربران.',
    seoTitle: 'قوانین و حریم خصوصی | اسکیل ۹۸',
    seoDescription: 'شرایط و قوانین خرید، دانلود و استفاده از محصولات دیجیتال و اسکیل‌های هوش مصنوعی در اسکیل ۹۸.',
    canonicalUrl: '/page/terms-and-privacy',
    ogImage: '/assets/aistudio/logo_8c26749f.webp',
    schemaType: 'WebPage',
    updatedAt: '2026-11-18T12:00:00.000Z',
    composerRows: [
      {
        id: 'row_terms_content',
        rowTitle: 'متن کامل قوانین و سوالات پرتکرار',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_terms_rich',
            widgetType: 'rich_text',
            title: 'منشور حقوق کاربران و مالکیت لایسنس‌ها',
            content:
              '۱. کلیه اسکیل‌های خریداری‌شده دارای دسترسی دائمی به فایل‌های Markdown و آپدیت‌های بعدی در پنل کاربری هستند. ۲. اطلاعات موبایل و تراکنش‌های کاربران با رمزنگاری استاندارد محافظت شده و هرگز در اختیار اشخاص ثالث قرار نمی‌گیرد.',
            colSpan: 1,
          },
          {
            id: 'w_terms_faq',
            widgetType: 'faq_accordion',
            title: 'پرسش‌های حقوقی و مالی پرتکرار',
            content:
              'آیا فاکتور رسمی صادر می‌شود؟ بله، برای تمامی سفارش‌ها فاکتور استاندارد قابل چاپ صادر می‌گردد. | آیا آپدیت‌های بعدی رایگان است؟ بله، تمامی نسخه‌های بعدی همان اسکیل در داشبورد شما فعال می‌شود.',
            colSpan: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'page_installment',
    slug: 'installment-guide',
    title: 'شرایط خرید اقساطی و سازمانی (BNPL)',
    status: 'published',
    templateType: 'landing',
    summary: 'راهنمای خرید اقساطی ۴ قسطه بدون ضامن از طریق درگاه‌های اعتباری اسنپ‌پی، ترب‌پی، تارا و دیجی‌پی.',
    seoTitle: 'خرید اقساطی اسکیل‌ها و پکیج‌های سازمانی | اسکیل ۹۸',
    seoDescription: 'شرایط تسویه ۴ قسطه بدون کارمزد پنهان و خرید سازمانی با فاکتور رسمی در اسکیل ۹۸.',
    canonicalUrl: '/page/installment-guide',
    ogImage: '/assets/aistudio/logo_8c26749f.webp',
    schemaType: 'FAQPage',
    updatedAt: '2026-11-18T12:00:00.000Z',
    composerRows: [
      {
        id: 'row_bnpl_1',
        rowTitle: 'معرفی پرداخت اقساطی و نمودار قیمت',
        columns: 2,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_bnpl_cta',
            widgetType: 'cta_banner',
            title: 'پرداخت در ۴ قسط مساوی بدون ضامن',
            subtitle: 'ویژه پکیج‌های جامع فول‌استک و لایسنس‌های تیمی',
            badgeText: 'درگاه‌های BNPL فعال',
            ctaText: 'انتخاب اسکیل و خرید',
            ctaLink: 'store',
            colSpan: 1,
          },
          {
            id: 'w_bnpl_price_chart',
            widgetType: 'price_history_30d',
            title: 'شفافیت قیمت ۳۰ روز اخیر پکیج‌های سازمانی',
            subtitle: 'تضمین واقعی بودن تخفیف‌های کمپین و ثبات قیمت',
            colSpan: 1,
          },
        ],
      },
    ],
  },
];

export const INITIAL_MENU_ITEMS: CmsMenuItem[] = [
  {
    id: 'menu_hdr_store',
    location: 'header',
    titleFa: 'ویترین اسکیل‌ها',
    parentId: null,
    targetType: 'tab',
    targetValue: 'store',
    openInNewTab: false,
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'menu_hdr_cat_claude',
    location: 'header',
    titleFa: 'اسکیل‌های Claude',
    parentId: 'menu_hdr_store',
    targetType: 'category',
    targetValue: 'Claude',
    openInNewTab: false,
    sortOrder: 2,
    enabled: true,
  },
  {
    id: 'menu_hdr_cat_codex',
    location: 'header',
    titleFa: 'اسکیل‌های Codex',
    parentId: 'menu_hdr_store',
    targetType: 'category',
    targetValue: 'Codex',
    openInNewTab: false,
    sortOrder: 3,
    enabled: true,
  },
  {
    id: 'menu_hdr_articles',
    location: 'header',
    titleFa: 'مجله و آموزش',
    parentId: null,
    targetType: 'tab',
    targetValue: 'articles',
    openInNewTab: false,
    sortOrder: 4,
    enabled: true,
  },
  {
    id: 'menu_hdr_guide',
    location: 'header',
    titleFa: 'معماری و راهنما',
    parentId: null,
    targetType: 'tab',
    targetValue: 'guide',
    openInNewTab: false,
    sortOrder: 5,
    enabled: true,
  },
  {
    id: 'menu_hdr_about',
    location: 'header',
    titleFa: 'درباره ما',
    parentId: null,
    targetType: 'page',
    targetValue: 'about-us',
    openInNewTab: false,
    sortOrder: 6,
    enabled: true,
  },
  {
    id: 'menu_hdr_contact',
    location: 'header',
    titleFa: 'تماس با ما',
    parentId: 'menu_hdr_about',
    targetType: 'page',
    targetValue: 'contact-us',
    openInNewTab: false,
    sortOrder: 7,
    enabled: true,
  },
  {
    id: 'menu_ftr_about',
    location: 'footer',
    titleFa: 'درباره استودیو اسکیل ۹۸',
    parentId: null,
    targetType: 'page',
    targetValue: 'about-us',
    openInNewTab: false,
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'menu_ftr_installment',
    location: 'footer',
    titleFa: 'راهنمای خرید اقساطی (BNPL)',
    parentId: null,
    targetType: 'page',
    targetValue: 'installment-guide',
    openInNewTab: false,
    sortOrder: 2,
    enabled: true,
  },
  {
    id: 'menu_ftr_terms',
    location: 'footer',
    titleFa: 'قوانین و حریم خصوصی',
    parentId: null,
    targetType: 'page',
    targetValue: 'terms-and-privacy',
    openInNewTab: false,
    sortOrder: 3,
    enabled: true,
  },
  {
    id: 'menu_ftr_contact',
    location: 'footer',
    titleFa: 'پشتیبانی و تماس با ما',
    parentId: null,
    targetType: 'page',
    targetValue: 'contact-us',
    openInNewTab: false,
    sortOrder: 4,
    enabled: true,
  },
  {
    id: 'menu_mob_store',
    location: 'mobile_drawer',
    titleFa: 'فروشگاه اسکیل‌ها',
    parentId: null,
    targetType: 'tab',
    targetValue: 'store',
    openInNewTab: false,
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'menu_mob_articles',
    location: 'mobile_drawer',
    titleFa: 'مجله تخصصی',
    parentId: null,
    targetType: 'tab',
    targetValue: 'articles',
    openInNewTab: false,
    sortOrder: 2,
    enabled: true,
  },
  {
    id: 'menu_mob_about',
    location: 'mobile_drawer',
    titleFa: 'درباره ما و تماس',
    parentId: null,
    targetType: 'page',
    targetValue: 'about-us',
    openInNewTab: false,
    sortOrder: 3,
    enabled: true,
  },
];

export const INITIAL_INVOICE_TEMPLATES: CmsInvoiceTemplate[] = [
  {
    id: 'inv_tpl_official_tax',
    templateCode: 'OFFICIAL_TAX_A4',
    titleFa: 'قالب فاکتور رسمی مالیاتی (دارایی - A4 با کد اقتصادی و ارزش افزوده ۱۰٪)',
    invoiceKind: 'official_tax',
    paperSize: 'A4',
    vatPercent: 10,
    sellerName: 'شرکت مهندسی داده و هوش مصنوعی اسکیل ۹۸ (سهامی خاص)',
    sellerEconomicCode: '411589632147',
    sellerNationalId: '14009876543',
    sellerPostalCode: '1416895321',
    sellerPhone: '021-91009898',
    sellerAddress: 'تهران، خیابان ولیعصر، تقاطع طالقانی، مجتمع فناوری، طبقه ۴، واحد ۴۰۲',
    logoUrl: '/assets/aistudio/logo_8c26749f.webp',
    stampSignatureUrl: '/assets/aistudio/logo_8c26749f.webp',
    footerNote:
      'این صورتحساب الکترونیکی مطابق استاندارد سامانه مودیان و قانون مالیات بر ارزش افزوده صادر گردیده و با مهر و امضای دیجیتال فروشنده معتبر است.',
    isDefault: true,
    updatedAt: '2026-11-18T12:00:00.000Z',
    composerRows: [
      {
        id: 'inv_row_header',
        rowTitle: 'سربرگ فاکتور رسمی، لوگو و مشخصات طرفین',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_inv_hdr_1',
            widgetType: 'invoice_header_brand',
            title: 'صورتحساب فروش کالا و خدمات (رسمی مالیاتی)',
            subtitle: 'شامل شناسه ملی، کد اقتصادی، کد پستی ۱۰ رقمی و تاریخ صدور شمسی',
            colSpan: 1,
          },
        ],
      },
      {
        id: 'inv_row_items',
        rowTitle: 'جدول اقلام، تخفیف‌ها و مالیات بر ارزش افزوده',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_inv_tbl_1',
            widgetType: 'invoice_items_vat_table',
            title: 'جدول تفصیلی اقلام و محاسبه ۱۰٪ مالیات و عوارض ارزش افزوده',
            subtitle: 'محاسبه خودکار جمع کل به عدد و حروف فارسی (تومان / ریال)',
            colSpan: 1,
          },
        ],
      },
      {
        id: 'inv_row_footer',
        rowTitle: 'مهر و امضای فروشنده، QR Code رهگیری و توضیحات',
        columns: 1,
        backgroundStyle: 'muted',
        widgets: [
          {
            id: 'w_inv_ftr_1',
            widgetType: 'invoice_stamp_qr_footer',
            title: 'مهر و امضای رسمی شرکت + بارکد دوبعدی (QR) اصالت فاکتور',
            content: 'تحویل‌گیرنده با امضای این برگ، صحت اقلام دیجیتال و لایسنس‌های تحویلی را تایید می‌نماید.',
            colSpan: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'inv_tpl_standard_fast',
    templateCode: 'COMMERCIAL_A5_QR',
    titleFa: 'قالب فاکتور غیررسمی فروشگاهی (فشرده A5 با QR Code و مهر دیجیتال)',
    invoiceKind: 'standard_commercial',
    paperSize: 'A5',
    vatPercent: 0,
    sellerName: 'فروشگاه تخصصی اسکیل ۹۸ (Skill98 Studio)',
    sellerEconomicCode: '—',
    sellerNationalId: '—',
    sellerPostalCode: '1416895321',
    sellerPhone: '021-91009898',
    sellerAddress: 'تهران، مرکز نوآوری ولیعصر • www.skill98.ir',
    logoUrl: '/assets/aistudio/logo_8c26749f.webp',
    stampSignatureUrl: '/assets/aistudio/logo_8c26749f.webp',
    footerNote: 'از خرید شما سپاسگزاریم. فایل‌ها و لایسنس‌ها در پنل کاربری شما به صورت دائمی فعال هستند.',
    isDefault: false,
    updatedAt: '2026-11-18T12:00:00.000Z',
    composerRows: [
      {
        id: 'inv_row_fast_1',
        rowTitle: 'سربرگ فاکتور فروشگاهی',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_inv_fast_hdr',
            widgetType: 'invoice_header_brand',
            title: 'رسید خرید و لایسنس محصولات دیجیتال',
            subtitle: 'فاکتور فروشگاهی بدون مالیات ارزش افزوده',
            colSpan: 1,
          },
        ],
      },
      {
        id: 'inv_row_fast_2',
        rowTitle: 'جدول اقلام و جمع کل',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_inv_fast_tbl',
            widgetType: 'invoice_items_vat_table',
            title: 'لیست اسکیل‌ها و پکیج‌های خریداری‌شده',
            colSpan: 1,
          },
        ],
      },
      {
        id: 'inv_row_fast_3',
        rowTitle: 'پاورقی، مهر فروشگاه و QR',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_inv_fast_ftr',
            widgetType: 'invoice_stamp_qr_footer',
            title: 'تاییدیه پرداخت شاپرک و بارکد پیگیری سفارش',
            colSpan: 1,
          },
        ],
      },
    ],
  },
];

export async function seedPhase3Tables(nowIso: string): Promise<void> {
  const pageCount = await dbQuery<{ cnt: number | string }>('SELECT COUNT(*) AS cnt FROM pages');
  if (Number(pageCount[0]?.cnt || 0) === 0) {
    for (const pg of INITIAL_DYNAMIC_PAGES) {
      await dbExec(
        `INSERT INTO pages (
           id, slug, title, status, template_type, summary, seo_title, seo_description,
           canonical_url, og_image, schema_type, composer_rows_json, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING`,
        [
          pg.id,
          pg.slug,
          pg.title,
          pg.status,
          pg.templateType,
          pg.summary,
          pg.seoTitle,
          pg.seoDescription,
          pg.canonicalUrl || `/page/${pg.slug}`,
          pg.ogImage || '/assets/aistudio/logo_8c26749f.webp',
          pg.schemaType,
          JSON.stringify(pg.composerRows),
          nowIso,
        ]
      );
    }
  }

  const menuCount = await dbQuery<{ cnt: number | string }>('SELECT COUNT(*) AS cnt FROM menus');
  if (Number(menuCount[0]?.cnt || 0) === 0) {
    for (const item of INITIAL_MENU_ITEMS) {
      await dbExec(
        `INSERT INTO menus (
           id, location, title_fa, parent_id, target_type, target_value,
           badge_text, open_in_new_tab, sort_order, enabled, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          item.id,
          item.location,
          item.titleFa,
          item.parentId,
          item.targetType,
          item.targetValue,
          item.badgeText || '',
          item.openInNewTab ? 1 : 0,
          item.sortOrder,
          item.enabled ? 1 : 0,
          nowIso,
        ]
      );
    }
  }

  const invCount = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM invoice_templates'
  );
  if (Number(invCount[0]?.cnt || 0) === 0) {
    for (const tpl of INITIAL_INVOICE_TEMPLATES) {
      await dbExec(
        `INSERT INTO invoice_templates (
           id, template_code, title_fa, invoice_kind, paper_size, vat_percent,
           seller_name, seller_economic_code, seller_national_id, seller_postal_code,
           seller_phone, seller_address, logo_url, stamp_signature_url, footer_note,
           is_default, composer_rows_json, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO NOTHING`,
        [
          tpl.id,
          tpl.templateCode,
          tpl.titleFa,
          tpl.invoiceKind,
          tpl.paperSize,
          tpl.vatPercent,
          tpl.sellerName,
          tpl.sellerEconomicCode,
          tpl.sellerNationalId,
          tpl.sellerPostalCode,
          tpl.sellerPhone,
          tpl.sellerAddress,
          tpl.logoUrl,
          tpl.stampSignatureUrl,
          tpl.footerNote,
          tpl.isDefault ? 1 : 0,
          JSON.stringify(tpl.composerRows),
          nowIso,
        ]
      );
    }
  }
}
