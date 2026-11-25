import type { CmsDynamicPage, CmsInvoiceTemplate, CmsMenuItem } from '../../core/types.js';
import { IMAGES } from '../../data/defaults.js';
import { dbExec, dbQuery } from './connection.js';

/**
 * برگه‌های پویا و صفحات محتوایی «آموزشگاه رباتیک فاتحان»
 * منبع واحد داده (Single Source of Truth) بین پنل ادمین (مدیریت برگه‌ها) و مسیرهای فرانت‌اند (/about, /contact, /free-courses, /p/:slug)
 */
export const INITIAL_DYNAMIC_PAGES: CmsDynamicPage[] = [
  {
    id: 'page_about_us',
    slug: 'about',
    title: 'درباره آموزشگاه تخصصی رباتیک، کدنویسی و هوش مصنوعی فاتحان',
    status: 'published',
    templateType: 'landing',
    summary:
      'آشنایی با ماموریت، ۵ دپارتمان تخصصی، کارگاه‌های عملی، مربیان مجرب و افتخارات کارآموزان آموزشگاه رباتیک فاتحان در شهر اندیشه.',
    seoTitle: 'درباره آموزشگاه رباتیک فاتحان | پرورش نسل خلاق در رباتیک و هوش مصنوعی',
    seoDescription:
      'آموزشگاه رباتیک فاتحان در اندیشه؛ مرکز تخصصی آموزش عملی رباتیک، برنامه‌نویسی، هوش مصنوعی، الکترونیک، چاپ سه‌بعدی و مکانیک ویژه کودکان و نوجوانان ۶ تا ۱۸ سال با مدرک معتبر فنی و حرفه‌ای.',
    canonicalUrl: 'https://fatehanrobotics.ir/about',
    ogImage: IMAGES.heroStudio,
    schemaType: 'AboutPage',
    updatedAt: '۱۴۰۵/۰۸/۲۸',
    composerRows: [
      {
        id: 'row_about_hero',
        rowTitle: 'بنر معرفی آموزشگاه رباتیک فاتحان',
        columns: 1,
        backgroundStyle: 'accent',
        widgets: [
          {
            id: 'w_about_hero_1',
            widgetType: 'hero_slider',
            title: 'آموزشگاه تخصصی رباتیک فاتحان؛ کارآموزان امروز، فاتحان فردا',
            subtitle:
              'ما در کارگاه‌های مجهز خود در فاز ۱ اندیشه، مفاهیم مهندسی مکانیک، الکترونیک، طراحی سه‌بعدی، برنامه‌نویسی و هوش مصنوعی را به صورت ۱۰۰٪ عملی و پروژه‌محور به کودکان و نوجوانان ۶ تا ۱۸ سال آموزش می‌دهیم.',
            badgeText: 'فکر کن، بساز، کشف کن!',
            ctaText: 'مشاهده دوره‌های آموزشی',
            ctaLink: '/courses',
            mediaUrl: IMAGES.heroStudio,
            accentTone: 'cobalt',
          },
        ],
      },
      {
        id: 'row_about_stats',
        rowTitle: 'آمار و دستاوردهای آموزشی فاتحان',
        columns: 3,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_about_stat_1',
            widgetType: 'stats_counter',
            title: '۵ دپارتمان تخصصی کارگاهی',
            subtitle: 'رباتیک، برنامه‌نویسی و هوش مصنوعی، الکترونیک، پرینترهای سه‌بعدی و مکانیک و سازه',
            badgeText: 'STEM Education',
          },
          {
            id: 'w_about_stat_2',
            widgetType: 'stats_counter',
            title: '۱۵+ دوره استاندارد ۶ تا ۱۸ سال',
            subtitle: 'مسیر آموزشی هدفمند از رباتیک پایه کودکان تا هوش مصنوعی و بینایی ماشین نوجوانان',
            badgeText: 'پروژه‌محور',
          },
          {
            id: 'w_about_stat_3',
            widgetType: 'stats_counter',
            title: 'مدرک معتبر فنی و حرفه‌ای و بازار کار',
            subtitle: 'اعطای گواهینامه معتبر و آماده‌سازی عملی کارآموزان برای مسابقات کشوری و ورود به بازار کار',
            badgeText: 'مهارت‌محور',
          },
        ],
      },
      {
        id: 'row_about_story',
        rowTitle: 'ماموریت آموزشی و همکاری با مدارس',
        columns: 2,
        backgroundStyle: 'muted',
        widgets: [
          {
            id: 'w_about_text_1',
            widgetType: 'rich_text',
            title: 'چرا خانواده‌ها آموزشگاه رباتیک فاتحان را انتخاب می‌کنند؟',
            content:
              'آموزشگاه رباتیک فاتحان با هدف تبدیل مصرف‌کنندگان تکنولوژی به سازندگان فناوری‌های آینده تاسیس شده است. ماموریت ما ایجاد محیطی امن، علمی و پرانرژی است که در آن هر کارآموز با دستان خود ربات بسازد، کدنویسی کند، مدار طراحی کند و با اعتمادبه‌نفس در مسابقات ملی و بین‌المللی بدرخشد.',
          },
          {
            id: 'w_about_text_2',
            widgetType: 'rich_text',
            title: 'همکاری رسمی با مدارس، فرهنگسراها و مراکز آموزشی',
            content:
              'آموزشگاه رباتیک فاتحان آماده عقد قرارداد رسمی با مدارس دولتی و غیردولتی، فرهنگسراها و مراکز آموزشی جهت برگزاری کارگاه‌های فوق‌برنامه رباتیک، کدنویسی، هوش مصنوعی و چاپ سه‌بعدی به همراه تامین کیت‌های استاندارد کارگاهی است.',
          },
        ],
      },
    ],
  },
  {
    id: 'page_contact_us',
    slug: 'contact',
    title: 'تماس با ما، آدرس و رزرو مشاوره رایگان آموزشگاه رباتیک فاتحان',
    status: 'published',
    templateType: 'contact',
    summary:
      'شماره‌های تماس مستقیم مشاوره و ثبت‌نام، آدرس کارگاه مرکزی در فاز ۱ اندیشه، ساعات کاری و شبکه‌های اجتماعی رسمی آموزشگاه رباتیک فاتحان.',
    seoTitle: 'تماس با آموزشگاه رباتیک فاتحان | آدرس، تلفن مشاوره و ساعات کاری',
    seoDescription:
      'ارتباط مستقیم با واحد مشاوره و ثبت‌نام آموزشگاه رباتیک فاتحان در اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۳.',
    canonicalUrl: 'https://fatehanrobotics.ir/contact',
    ogImage: IMAGES.securityPkg,
    schemaType: 'ContactPage',
    updatedAt: '۱۴۰۵/۰۸/۲۸',
    composerRows: [
      {
        id: 'row_contact_main',
        rowTitle: 'اطلاعات تماس، آدرس و فرم مشاوره استعدادیابی',
        columns: 2,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_contact_info',
            widgetType: 'rich_text',
            title: 'راه‌های ارتباطی و نشانی آموزشگاه رباتیک فاتحان',
            content:
              'آدرس: اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۳\nخط ۱ مشاوره و ثبت‌نام: ۰۹۱۰۳۱۱۶۷۵۳\nخط ۲ پشتیبانی کارگاه: ۰۹۳۷۲۳۳۵۰۲۶\nتلفن ثابت دفتر مرکزی: ۰۲۱-۶۵۵۰۶۰۱۵\nساعات کاری: شنبه تا پنجشنبه (۹ صبح تا ۸ شب)\nاینستاگرام: @fatehan.robot | ایتا: @fatehan_robotics',
            badgeText: 'پاسخگویی و مشاوره حضوری و تلفنی',
          },
          {
            id: 'w_contact_form',
            widgetType: 'lead_form',
            title: 'فرم رزرو جلسه مشاوره و استعدادیابی رایگان',
            subtitle: 'نام کارآموز، سن و شماره موبایل خود را ثبت کنید تا مشاوران آموزشی فاتحان با شما تماس بگیرند.',
            ctaText: 'ثبت درخواست مشاوره رایگان',
          },
        ],
      },
    ],
  },
  {
    id: 'page_free_courses',
    slug: 'free-courses',
    title: 'کارگاه‌ها و دوره‌های رایگان استعدادیابی رباتیک و هوش مصنوعی فاتحان',
    status: 'published',
    templateType: 'landing',
    summary:
      'ثبت‌نام رایگان در جلسه حضوری استعدادیابی رباتیک، آشنایی با پرینتر سه‌بعدی و کارگاه مقدماتی کدنویسی ویژه کودکان و نوجوانان ۶ تا ۱۸ سال.',
    seoTitle: 'کارگاه رایگان استعدادیابی رباتیک و برنامه‌نویسی | آموزشگاه فاتحان',
    seoDescription:
      'رزرو رایگان جلسه معارفه و استعدادیابی حضوری رباتیک، الکترونیک، چاپ سه‌بعدی و برنامه‌نویسی در آموزشگاه رباتیک فاتحان اندیشه.',
    canonicalUrl: 'https://fatehanrobotics.ir/free-courses',
    ogImage: IMAGES.fullstackPkg,
    schemaType: 'WebPage',
    updatedAt: '۱۴۰۵/۰۸/۲۸',
    composerRows: [
      {
        id: 'row_free_workshop_intro',
        rowTitle: 'معرفی کارگاه رایگان استعدادیابی فاتحان',
        columns: 1,
        backgroundStyle: 'accent',
        widgets: [
          {
            id: 'w_free_workshop_1',
            widgetType: 'cta_banner',
            title: 'جلسه اول استعدادیابی و کار با ربات‌های واقعی، کاملاً رایگان!',
            subtitle:
              'پیش از ثبت‌نام در ترم اصلی، فرزند شما در کارگاه مجهز فاتحان با مربیان تخصصی دیدار کرده و علاقه و استعداد او در ۵ دپارتمان رباتیک، کدنویسی، الکترونیک، چاپ سه‌بعدی و مکانیک سنجیده می‌شود.',
            badgeText: 'ویژه سنین ۶ تا ۱۸ سال',
            ctaText: 'رزرو نوبت استعدادیابی رایگان',
            ctaLink: '/free-courses',
            accentTone: 'emerald',
          },
        ],
      },
    ],
  },
  {
    id: 'page_terms',
    slug: 'terms-and-privacy',
    title: 'قوانین آموزشی، شرایط ثبت‌نام دوره‌ها و خرید کیت‌های رباتیک فاتحان',
    status: 'published',
    templateType: 'standard',
    summary:
      'آیین‌نامه حضور در کلاس‌های کارگاهی، نحوه دریافت مدرک فنی و حرفه‌ای، شرایط گارانتی و ارسال کیت‌های فروشگاهی و حفظ حریم خصوصی کارآموزان.',
    seoTitle: 'قوانین و مقررات آموزشی و فروشگاهی | آموزشگاه رباتیک فاتحان',
    seoDescription:
      'شرایط ثبت‌نام حضوری و آنلاین دوره‌های رباتیک، پرداخت اقساطی شهریه، گارانتی کیت‌های آموزشی و قوانین آموزشگاه رباتیک فاتحان.',
    canonicalUrl: 'https://fatehanrobotics.ir/p/terms-and-privacy',
    ogImage: IMAGES.uiuxPkg,
    schemaType: 'FAQPage',
    updatedAt: '۱۴۰۵/۰۸/۲۷',
    composerRows: [
      {
        id: 'row_terms_faq',
        rowTitle: 'مقررات آموزشی و فروشگاهی آموزشگاه رباتیک فاتحان',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_terms_1',
            widgetType: 'faq_accordion',
            title: '۱. شرایط حضور در کارگاه‌ها و جلسات جبرانی چگونه است؟',
            content:
              'تمامی کلاس‌های آموزشگاه رباتیک فاتحان به‌صورت عملی و کارگاهی برگزار می‌شوند. در صورت غیبت موجه کارآموز با اطلاع قبلی والدین، هماهنگی جلسه جبرانی توسط واحد آموزش انجام می‌پذیرد.',
          },
          {
            id: 'w_terms_2',
            widgetType: 'faq_accordion',
            title: '۲. گارانتی و تحویل کیت‌های رباتیک و قطعات الکترونیکی چگونه است؟',
            content:
              'تمامی کیت‌های عرضه‌شده در فروشگاه آموزشگاه رباتیک فاتحان پیش از تحویل در کارگاه تست سلامت می‌شوند و دارای راهنمای مونتاژ فارسی و پشتیبانی فنی مربیان آموزشگاه هستند.',
          },
          {
            id: 'w_terms_3',
            widgetType: 'faq_accordion',
            title: '۳. شرایط دریافت گواهینامه پایان دوره و مدرک فنی و حرفه‌ای چیست؟',
            content:
              'کارآموزان پس از تکمیل پروژه‌های عملی هر ترم گواهینامه رسمی آموزشگاه رباتیک فاتحان را دریافت می‌کنند و در سطوح تکمیلی جهت اخذ مدرک رسمی و بین‌المللی سازمان آموزش فنی و حرفه‌ای معرفی می‌شوند.',
          },
        ],
      },
    ],
  },
  {
    id: 'page_tuition_guide',
    slug: 'tuition-guide',
    title: 'شرایط پرداخت اقساطی شهریه دوره‌ها و خرید کیت‌های آموزشی فاتحان',
    status: 'published',
    templateType: 'landing',
    summary:
      'راهنمای استفاده از تسهیلات پرداخت اقساطی شهریه ترم‌های رباتیک، برنامه‌نویسی و خرید کیت‌های کارگاهی در آموزشگاه رباتیک فاتحان.',
    seoTitle: 'پرداخت اقساطی شهریه کلاس رباتیک و خرید کیت | آموزشگاه فاتحان',
    seoDescription:
      'شرایط ویژه پرداخت اقساطی شهریه دوره‌های رباتیک، کدنویسی، هوش مصنوعی و پرینتر سه‌بعدی در آموزشگاه رباتیک فاتحان اندیشه.',
    canonicalUrl: 'https://fatehanrobotics.ir/p/tuition-guide',
    ogImage: IMAGES.aiAutomationPkg,
    schemaType: 'WebPage',
    updatedAt: '۱۴۰۵/۰۸/۲۶',
    composerRows: [
      {
        id: 'row_tuition_guide_main',
        rowTitle: 'شرایط پرداخت اقساطی شهریه در آموزشگاه رباتیک فاتحان',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'w_tuition_guide_1',
            widgetType: 'rich_text',
            title: 'تسهیلات ویژه خانواده‌ها برای ثبت‌نام اقساطی دوره‌های رباتیک و کدنویسی',
            content:
              'در آموزشگاه رباتیک فاتحان، به منظور حمایت از خانواده‌ها و تداوم مسیر یادگیری کارآموزان، امکان پرداخت شهریه دوره‌ها به صورت اقساط ۲ تا ۴ ماهه (با پیش‌پرداخت۳۰٪ تا ۵۰٪ هنگام ثبت‌نام) فراهم شده است. می‌توانید در صفحه اصلی سایت از «محاسبه‌گر هوشمند اقساط شهریه» مبلغ دقیق هر قسط را مشاهده نمایید.',
            badgeText: 'بدون کارمزد و سود اضافه',
          },
        ],
      },
    ],
  },
];

/**
 * ساختار منوهای هدر، فوتر و دراور موبایل «آموزشگاه رباتیک فاتحان»
 */
export const INITIAL_MENU_ITEMS: CmsMenuItem[] = [
  // Header Navigation
  {
    id: 'menu_hdr_home',
    location: 'header',
    titleFa: 'صفحه اصلی',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/',
    openInNewTab: false,
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'menu_hdr_courses',
    location: 'header',
    titleFa: 'دوره‌های آموزشی (۱۵ دوره)',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/courses',
    badgeText: 'ثبت‌نام ترم جدید',
    openInNewTab: false,
    sortOrder: 2,
    enabled: true,
  },
  {
    id: 'menu_hdr_free_workshop',
    location: 'header',
    titleFa: 'کارگاه رایگان استعدادیابی',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/free-courses',
    badgeText: 'رایگان',
    openInNewTab: false,
    sortOrder: 3,
    enabled: true,
  },
  {
    id: 'menu_hdr_shop',
    location: 'header',
    titleFa: 'فروشگاه کیت‌ها و قطعات رباتیک',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/shop',
    openInNewTab: false,
    sortOrder: 4,
    enabled: true,
  },
  {
    id: 'menu_hdr_blog',
    location: 'header',
    titleFa: 'مجله علمی و راهنمای والدین',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/blog',
    openInNewTab: false,
    sortOrder: 5,
    enabled: true,
  },
  {
    id: 'menu_hdr_about',
    location: 'header',
    titleFa: 'درباره فاتحان',
    parentId: null,
    targetType: 'page',
    targetValue: 'about',
    openInNewTab: false,
    sortOrder: 6,
    enabled: true,
  },
  {
    id: 'menu_hdr_contact',
    location: 'header',
    titleFa: 'تماس با ما و آدرس',
    parentId: null,
    targetType: 'page',
    targetValue: 'contact',
    openInNewTab: false,
    sortOrder: 7,
    enabled: true,
  },

  // Footer Navigation
  {
    id: 'menu_ftr_courses',
    location: 'footer',
    titleFa: 'تقویم و فهرست دوره‌های رباتیک',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/courses',
    openInNewTab: false,
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'menu_ftr_shop',
    location: 'footer',
    titleFa: 'فروشگاه کیت‌های رباتیک و آردوینو',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/shop',
    openInNewTab: false,
    sortOrder: 2,
    enabled: true,
  },
  {
    id: 'menu_ftr_about',
    location: 'footer',
    titleFa: 'درباره آموزشگاه رباتیک فاتحان',
    parentId: null,
    targetType: 'page',
    targetValue: 'about',
    openInNewTab: false,
    sortOrder: 3,
    enabled: true,
  },
  {
    id: 'menu_ftr_contact',
    location: 'footer',
    titleFa: 'تماس با ما و آدرس کارگاه اندیشه',
    parentId: null,
    targetType: 'page',
    targetValue: 'contact',
    openInNewTab: false,
    sortOrder: 4,
    enabled: true,
  },
  {
    id: 'menu_ftr_terms',
    location: 'footer',
    titleFa: 'قوانین آموزشی و گارانتی کیت‌ها',
    parentId: null,
    targetType: 'page',
    targetValue: 'terms-and-privacy',
    openInNewTab: false,
    sortOrder: 5,
    enabled: true,
  },
  {
    id: 'menu_ftr_tuition',
    location: 'footer',
    titleFa: 'راهنمای پرداخت اقساطی شهریه',
    parentId: null,
    targetType: 'page',
    targetValue: 'tuition-guide',
    openInNewTab: false,
    sortOrder: 6,
    enabled: true,
  },

  // Mobile Bottom Bar / Drawer
  {
    id: 'menu_mob_home',
    location: 'mobile_drawer',
    titleFa: 'فاتحان',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/',
    openInNewTab: false,
    sortOrder: 1,
    enabled: true,
  },
  {
    id: 'menu_mob_courses',
    location: 'mobile_drawer',
    titleFa: 'دوره‌ها',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/courses',
    openInNewTab: false,
    sortOrder: 2,
    enabled: true,
  },
  {
    id: 'menu_mob_shop',
    location: 'mobile_drawer',
    titleFa: 'کیت‌ها',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/shop',
    openInNewTab: false,
    sortOrder: 3,
    enabled: true,
  },
  {
    id: 'menu_mob_blog',
    location: 'mobile_drawer',
    titleFa: 'مجله علمی',
    parentId: null,
    targetType: 'custom_url',
    targetValue: '/blog',
    openInNewTab: false,
    sortOrder: 4,
    enabled: true,
  },
  {
    id: 'menu_mob_contact',
    location: 'mobile_drawer',
    titleFa: 'تماس با ما',
    parentId: null,
    targetType: 'page',
    targetValue: 'contact',
    openInNewTab: false,
    sortOrder: 5,
    enabled: true,
  },
];

export const INITIAL_INVOICE_TEMPLATES: CmsInvoiceTemplate[] = [
  {
    id: 'inv_tpl_official_tax_a4',
    templateCode: 'FATEHAN-TAX-A4',
    titleFa: 'فاکتور رسمی فروش کیت و ثبت‌نام دوره آموزشگاه رباتیک فاتحان (A4)',
    invoiceKind: 'official_tax',
    paperSize: 'A4',
    vatPercent: 10,
    sellerName: 'آموزشگاه تخصصی رباتیک، کدنویسی و هوش مصنوعی فاتحان',
    sellerEconomicCode: '411-9874-5521',
    sellerNationalId: '14012589630',
    sellerPostalCode: '3351984210',
    sellerPhone: '021-65506015',
    sellerAddress: 'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۳',
    logoUrl: '/assets/aistudio/logo_8c26749f.webp',
    stampSignatureUrl: '/assets/aistudio/logo_8c26749f.webp',
    footerNote:
      'این فاکتور به منزله تاییدیه رسمی ثبت‌نام دوره آموزشی / خرید کیت‌های رباتیک از آموزشگاه تخصصی رباتیک فاتحان بوده و دارای گارانتی و پشتیبانی کارگاهی می‌باشد.',
    isDefault: true,
    updatedAt: '۱۴۰۵/۰۸/۲۸',
    composerRows: [
      {
        id: 'inv_row_header',
        rowTitle: 'سربرگ رسمی آموزشگاه رباتیک فاتحان و مشخصات کارآموز/خریدار',
        columns: 2,
        backgroundStyle: 'muted',
        widgets: [
          {
            id: 'inv_w_1',
            widgetType: 'invoice_header_brand',
            title: 'مشخصات آموزشگاه (فروشنده) و شماره سریال فاکتور',
            subtitle: 'نمایش لوگو، نام آموزشگاه رباتیک فاتحان، آدرس اندیشه و تلفن ۰۲۱-۶۵۵۰۶۰۱۵',
          },
          {
            id: 'inv_w_2',
            widgetType: 'rich_text',
            title: 'مشخصات کارآموز / خریدار و کد رهگیری',
            content: 'نام کارآموز/والدین، شماره موبایل، تاریخ صدور شمسی و شناسه مرجع تراکنش',
          },
        ],
      },
      {
        id: 'inv_row_table',
        rowTitle: 'جدول اقلام کیت‌های رباتیک / شهریه دوره‌ها',
        columns: 1,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'inv_w_3',
            widgetType: 'invoice_items_vat_table',
            title: 'جدول ردیف‌های دوره یا کیت رباتیک، تخفیف و جمع کل (تومان / ریال)',
            subtitle: 'محاسبه خودکار تخفیف کوپن و مبلغ قابل پرداخت',
          },
        ],
      },
      {
        id: 'inv_row_footer',
        rowTitle: 'مهر و امضای آموزشگاه رباتیک فاتحان و بارکد اصالت',
        columns: 2,
        backgroundStyle: 'default',
        widgets: [
          {
            id: 'inv_w_4',
            widgetType: 'invoice_stamp_qr_footer',
            title: 'مهر رسمی واحد آموزش و فروشگاه آموزشگاه رباتیک فاتحان',
            subtitle: 'تاییدیه اصالت کیت و ثبت‌نام کارآموز',
          },
          {
            id: 'inv_w_5',
            widgetType: 'rich_text',
            title: 'توضیحات پشتیبانی و گارانتی کارگاهی',
            content: 'خط ۱ مشاوره و ثبت‌نام: ۰۹۱۰۳۱۱۶۷۵۳ | خط ۲ پشتیبانی کارگاه: ۰۹۳۷۲۳۳۵۰۲۶ | تلفن ثابت: ۰۲۱-۶۵۵۰۶۰۱۵',
          },
        ],
      },
    ],
  },
];

export async function seedPhase3Tables(nowIso: string): Promise<void> {
  // 1. Seed Dynamic Pages
  for (const page of INITIAL_DYNAMIC_PAGES) {
    await dbExec(
      `INSERT INTO pages (id, slug, title, status, template_type, summary, seo_title, seo_description, canonical_url, og_image, schema_type, composer_rows_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING`,
      [
        page.id,
        page.slug,
        page.title,
        page.status,
        page.templateType,
        page.summary,
        page.seoTitle,
        page.seoDescription,
        page.canonicalUrl || '',
        page.ogImage || '',
        page.schemaType,
        JSON.stringify(page.composerRows || []),
        nowIso,
      ]
    );
  }

  // 2. Seed Hierarchical Menus if empty
  const menuCountRows = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM menus'
  );
  if (Number(menuCountRows[0]?.cnt || 0) === 0) {
    for (const item of INITIAL_MENU_ITEMS) {
      await dbExec(
        `INSERT INTO menus (id, location, title_fa, parent_id, target_type, target_value, badge_text, open_in_new_tab, sort_order, enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

  // 3. Seed Invoice Templates
  for (const tpl of INITIAL_INVOICE_TEMPLATES) {
    await dbExec(
      `INSERT INTO invoice_templates (
         id, template_code, title_fa, invoice_kind, paper_size, vat_percent,
         seller_name, seller_economic_code, seller_national_id, seller_postal_code,
         seller_phone, seller_address, logo_url, stamp_signature_url, footer_note,
         is_default, composer_rows_json, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
        JSON.stringify(tpl.composerRows || []),
        nowIso,
      ]
    );
  }
}

