/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fallback Defaults for Fatehan Standalone Theme
 * Used ONLY when CMS v2.0.0 API has not yet provided data for a specific key.
 * Every single field here is overridden automatically when the CMS API responds.
 */

import {
  CmsSiteSettings,
  CmsMenuItem,
  CmsDepartmentItem,
  TypographyConfig,
  AcademyFreeCourseItem,
  AcademyAnnouncementItem,
  FatehanCourse,
  ProductItem,
} from '../types';

export const DEFAULT_TYPOGRAPHY_CONFIG: TypographyConfig = {
  headingFont: 'YekanBakh',
  bodyFont: 'IRANSansX',
  printFont: 'Sahel',
  printPaperDefault: 'A4',
  baseScalePx: 14,
  footerAboutText:
    'مرکز تخصصی آموزش عملی رباتیک، برنامه‌نویسی، هوش مصنوعی و ساخت سه‌بعدی ویژه کودکان و نوجوانان (۴ تا ۱۸ سال) در اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا.',
  footerCopyrightRight:
    '© ۱۴۰۵ تمامی حقوق مادی و معنوی این وب‌سایت متعلق به آموزشگاه تخصصی رباتیک فاتحان می‌باشد.',
  footerCreditLeft: 'طراحی و توسعه توسط داده‌پردازی فناوران تکنولوژی (dpatech)',
  footerCreditUrl: 'https://dpatech.ir',
  blueCyanThemeEnabled: false,
  instagramId: 'fatehan.robot',
  instagramUrl: 'https://instagram.com/fatehan.robot',
  eitaaId: 'fatehan_robotics',
  eitaaUrl: 'https://eitaa.com/fatehan_robotics',
  eitaaLogoUrl: '',
  baleId: '',
  baleUrl: '',
};

export const DEFAULT_SITE_SETTINGS: CmsSiteSettings = {
  academyNameFa: 'آموزشگاه رباتیک فاتحان',
  academyNameEn: 'Fatehan Robotics Academy',
  domain: 'fatehanacademy.ir',
  url: 'https://fatehanacademy.ir',
  logoUrl: '/assets/aistudio/logo_8c26749f.webp',
  headerLogoSizePx: 68,
  taglinePrimary: 'کارآموزان امروز، فاتحان فردا',
  taglineSecondary: 'رباتیک فقط یک رشته نیست... یک مهارت زندگی است',
  mottoEn: 'DREAM · BUILD · CREATE',
  mottoFa: 'فکر کن، بساز، کشف کن!',
  description:
    'مرکز تخصصی آموزش رباتیک، مکاترونیک، هوش مصنوعی، پرینتر سه‌بعدی، برنامه‌نویسی و الکترونیک برای کودکان، نوجوانان و جوانان در اندیشه با کارگاه‌های مجهز و آموزش ۱۰۰٪ پروژه‌محور.',
  announcementTopBarText: 'ثبت‌نام ترم جدید رباتیک، کدنویسی و هوش مصنوعی در اندیشه',
  location: {
    province: 'تهران / غرب استان تهران',
    city: 'اندیشه',
    addressShort: 'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا',
    addressFull: 'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۳',
    workingHours: 'ساعات کاری: شنبه تا پنجشنبه (۹ صبح تا ۸ شب)',
    postalCode: '3351984210',
  },
  phones: {
    primary: '09103116753',
    primaryFormatted: '۰۹۱۰ ۳۱۱ ۶۷۵۳',
    primaryLabel: 'خط ۱ مشاوره و ثبت‌نام (۰۹۱۰۳۱۱۶۷۵۳)',
    secondary: '09372335026',
    secondaryFormatted: '۰۹۳۷ ۲۳۳ ۵۰۲۶',
    secondaryLabel: 'خط ۲ پشتیبانی کارگاه (۰۹۳۷۲۳۳۵۰۲۶)',
    landline: '02165506015',
    landlineFormatted: '۰۲۱ ۶۵۵۰ ۶۰۱۵',
    landlineLabel: 'تلفن ثابت دفتر مرکزی (۰۲۱-۶۵۵۰۶۰۱۵)',
  },
  social: {
    instagramId: 'fatehan.robot',
    instagramUrl: 'https://instagram.com/fatehan.robot',
    eitaaId: 'fatehan_robotics',
    eitaaUrl: 'https://eitaa.com/fatehan_robotics',
    eitaaLogoUrl: '',
    baleId: '',
    baleUrl: '',
    whatsappUrl: 'https://wa.me/989103116753',
  },
  typography: DEFAULT_TYPOGRAPHY_CONFIG,
};

export const DEFAULT_HEADER_MENU: CmsMenuItem[] = [
  { id: 'menu-home', label: 'صفحه اصلی', path: '/', icon: 'home', matchPrefixes: ['/'] },
  {
    id: 'menu-courses',
    label: 'دوره‌های آموزشی',
    path: '/courses',
    icon: 'sparkles',
    matchPrefixes: ['/courses', '/course/', '/calculator'],
  },
  {
    id: 'menu-free',
    label: 'دوره رایگان',
    path: '/free-courses',
    icon: 'gift',
    variant: 'highlight-emerald',
    matchPrefixes: ['/free-courses'],
  },
  {
    id: 'menu-shop',
    label: 'کیت‌ها و قطعات',
    path: '/shop',
    icon: 'store',
    matchPrefixes: ['/shop', '/product/'],
  },
  {
    id: 'menu-blog',
    label: 'مجله و اخبار',
    path: '/blog',
    icon: 'file-text',
    matchPrefixes: ['/blog'],
  },
  {
    id: 'menu-about',
    label: 'درباره ما',
    path: '/about',
    icon: 'info',
    matchPrefixes: ['/about'],
  },
  {
    id: 'menu-contact',
    label: 'تماس و آدرس',
    path: '/contact',
    icon: 'map-pin',
    matchPrefixes: ['/contact'],
  },
];

export const DEFAULT_FOOTER_MENU: CmsMenuItem[] = [
  { id: 'f-home', label: 'صفحه اصلی', path: '/' },
  { id: 'f-courses', label: 'دوره‌ها و شهریه', path: '/courses' },
  { id: 'f-free', label: '🎁 دوره رایگان', path: '/free-courses' },
  { id: 'f-shop', label: 'فروشگاه کیت‌ها و قطعات', path: '/shop' },
  { id: 'f-lab', label: 'آزمایشگاه ربات', path: '/lab' },
  { id: 'f-blog', label: 'افتخارات و وبلاگ', path: '/blog' },
  { id: 'f-about', label: 'درباره آموزشگاه فاتحان', path: '/about' },
  { id: 'f-contact', label: 'تماس و آدرس', path: '/contact' },
];

export const DEFAULT_MOBILE_BOTTOM_MENU: CmsMenuItem[] = [
  { id: 'mb-home', label: 'فاتحان', path: '/', icon: 'home' },
  { id: 'mb-courses', label: 'دوره‌ها', path: '/courses', icon: 'sparkles' },
  { id: 'mb-shop', label: 'کیت‌ها', path: '/shop', icon: 'store' },
  { id: 'mb-cart', label: 'سبد', path: '/cart', icon: 'credit-card' },
  { id: 'mb-contact', label: 'تماس', path: '/contact', icon: 'phone' },
];

export const DEFAULT_DEPARTMENTS: CmsDepartmentItem[] = [
  {
    id: 'robotics',
    deptNumFa: 'دپارتمان ۰۱',
    codeEn: 'ROBOTICS / ۰۱',
    title: 'دپارتمان رباتیک',
    badge: 'مبتدی تا پیشرفته',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    deckBg: 'bg-[#d5ece0]',
    deckBorder: 'border-[#8ec5a9]',
    deckText: 'text-[#1c5c40]',
    deckAccent: '#25704f',
    iconKey: 'bot',
    subtitle: 'از ساخت سازه‌های حرکتی تا ربات‌های هوشمند و مسابقاتی',
    description:
      'در دپارتمان رباتیک، دانش‌آموزان به صورت کاملاً عملی با ترکیب مکانیک، الکترونیک و برنامه‌نویسی، ربات‌های واقعی می‌سازند و برای حضور در مسابقات کشوری و المپیادهای رباتیک آماده می‌شوند.',
    stages: [
      'سطح ۱: ساخت ربات‌های مکانیکی، گیربکس‌ها و کنترل سیمی (مناسب ۷ تا ۱۰ سال)',
      'سطح ۲: ربات‌های هوشمند سنسوردار (تعقیب خط، مانع‌یاب و کنترل بلوتوثی)',
      'سطح ۳: ربات‌های مسابقاتی پیشرفته (جنگجو، فوتبالیست، امدادگر و بازوی رباتیک)',
    ],
    projects: ['ربات تعقیب خط سرعتی', 'ربات امدادگر هوشمند', 'بازوی مکانیکی ۶ محوره'],
  },
  {
    id: 'electronics',
    deptNumFa: 'دپارتمان ۰۲',
    codeEn: 'ELECTRONICS / ۰۲',
    title: 'دپارتمان الکترونیک',
    badge: 'مدار و آردوینو',
    color: 'amber',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    deckBg: 'bg-[#f3ded0]',
    deckBorder: 'border-[#deb093]',
    deckText: 'text-[#87431f]',
    deckAccent: '#b45309',
    iconKey: 'cpu',
    subtitle: 'قطعه شناسی، لحیم‌کاری، طراحی مدار و هوشمندسازی با Arduino',
    description:
      'الکترونیک قلب تپنده تمام دستگاه‌های هوشمند است. کارآموزان از شناخت قطعات پایه مانند مقاومت، LED و سنسورها آغاز کرده و به طراحی مدار روی برد بورد، لحیم‌کاری و طراحی PCB با Altium می‌رسند.',
    stages: [
      'مرحله ۱: شناخت قطعات الکترونیکی، کار با مولتی‌متر و بستن مدار روی برد بورد',
      'مرحله ۲: راه‌اندازی میکروکنترلرها، برد آردوینو (Arduino) و درایور موتورها',
      'مرحله ۳: شبیه‌سازی مدار در Proteus و طراحی برد مدار چاپی (PCB) حرفه‌ای',
    ],
    projects: ['سیستم آبیاری خودکار گلخانه', 'دزدگیر لیزری هوشمند', 'برد مدار چاپی اختصاصی'],
  },
  {
    id: 'printing',
    deptNumFa: 'دپارتمان ۰۳',
    codeEn: '3D PRINT / ۰۳',
    title: 'دپارتمان پرینتر سه‌بعدی',
    badge: 'طراحی و ساخت',
    color: 'violet',
    badgeBg: 'bg-violet-50 text-violet-800 border-violet-200',
    deckBg: 'bg-[#e6e0f7]',
    deckBorder: 'border-[#b9ace6]',
    deckText: 'text-[#4c3094]',
    deckAccent: '#6d28d9',
    iconKey: 'box',
    subtitle: 'از ایده و مدل‌سازی سه‌بعدی تا چاپ واقعی قطعات رباتیک',
    description:
      'دانش‌آموزان در این کارگاه یاد می‌گیرند هر ایده‌ای که در ذهن دارند را با نرم‌افزارهای مدل‌سازی سه‌بعدی طراحی کرده و با پرینترهای سه‌بعدی مجهز کارگاه فاتحان به یک جسم واقعی تبدیل کنند.',
    stages: [
      'فاز ۱: آشنایی با هندسه سه‌بعدی، کار با Tinkercad و طراحی اجسام خلاقانه',
      'فاز ۲: مدل‌سازی مهندسی قطعات صنعتی و شاسی ربات با SolidWorks',
      'فاز ۳: کار با نرم‌افزارهای اسلایسر (Cura) و اپراتوری کامل پرینتر سه‌بعدی',
    ],
    projects: ['شاسی اختصاصی ربات جنگجو', 'چرخ‌دنده‌های مهندسی سفارشی', 'بدنه پهپاد و قطعات مکاترونیک'],
  },
  {
    id: 'coding',
    deptNumFa: 'دپارتمان ۰۴',
    codeEn: 'CODING / ۰۴',
    title: 'دپارتمان برنامه‌نویسی',
    badge: 'کدنویسی و هوش مصنوعی',
    color: 'blue',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    deckBg: 'bg-[#d8e6f8]',
    deckBorder: 'border-[#96bae8]',
    deckText: 'text-[#1c4b8f]',
    deckAccent: '#1d4ed8',
    iconKey: 'terminal',
    subtitle: 'از بازی‌سازی با اسکرچ تا پایتون و پروژه‌های هوش مصنوعی',
    description:
      'مغز متفکر ربات‌ها با برنامه‌نویسی هدایت می‌شود. آموزش را از تفکر الگوریتمی و بازی‌سازی تصویری با اسکرچ آغاز می‌کنیم و دانش‌آموزان را به دنیای قدرتمند زبان پایتون (Python) و مدل‌های بینایی ماشین هدایت می‌کنیم.',
    stages: [
      'رده کودک: تفکر منطقی و بازی‌سازی بلوکی با Scratch 3.0',
      'رده نوجوان: برنامه‌نویسی متنی پایتون (Python) از مقدماتی تا کاربردی',
      'رده پیشرفته: برنامه‌نویسی سخت‌افزار C++، ربات‌های تلگرام و هوش مصنوعی (AI)',
    ],
    projects: ['بازی کامپیوتری دوبعدی اختصاصی', 'سیستم تشخیص چهره با پایتون', 'دستیار هوشمند صوتی'],
  },
  {
    id: 'mechanics',
    deptNumFa: 'دپارتمان ۰۵',
    codeEn: 'MECHANICS / ۰۵',
    title: 'دپارتمان مکانیک',
    badge: 'ساخت و سازه',
    color: 'rose',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    deckBg: 'bg-[#f6dce3]',
    deckBorder: 'border-[#e4a6b6]',
    deckText: 'text-[#8c2340]',
    deckAccent: '#be123c',
    iconKey: 'cog',
    subtitle: 'اصول فیزیک، اهرم‌ها، گیربکس‌ها و ساخت سازه‌های مهندسی',
    description:
      'بدون یک بدنه و ساختار مکانیکی مهندسی، هیچ رباتی نمی‌تواند حرکت پایداری داشته باشد. کارآموزان با مفاهیم فیزیک کاربردی، انتقال نیرو، تعادل، چرخ‌دنده‌ها و ساخت مکانیزم‌های حرکتی آشنا می‌شوند.',
    stages: [
      'گام ۱: آشنایی با اتصالات، پیچ و مهره، شاسی‌سازی و افزایش استحکام سازه',
      'گام ۲: قوانین اهرم‌ها، قرقره‌ها، انتقال قدرت و محاسبه نسبت دور گیربکس‌ها',
      'گام ۳: طراحی مکانیزم‌های حرکتی پیشرفته (پرتابگر، چنگک و سیستم تعلیق)',
    ],
    projects: ['جرثقیل برجی با گیربکس قدرتی', 'خودرو چهارچرخ محرک آفرود', 'مکانیزم پرتابگر توپ هوشمند'],
  },
];

export const DEFAULT_FALLBACK_ANNOUNCEMENTS: AcademyAnnouncementItem[] = [
  {
    id: 'ANN-FALLBACK-01',
    title: 'آغاز ثبت‌نام ترم جدید رباتیک، برنامه‌نویسی و هوش مصنوعی',
    message:
      'ثبت‌نام کلاس‌های عملی رباتیک، الکترونیک، اسکرچ، پایتون و چاپ سه‌بعدی در آموزشگاه تخصصی فاتحان آغاز شد.',
    createdAt: '۱۴۰۵/۰۸/۰۵',
    badgeText: 'اطلاعیه عمومی',
    targetType: 'public',
    linkUrl: '/courses',
    isImportant: true,
  },
];

export const DEFAULT_FALLBACK_FREE_COURSES: AcademyFreeCourseItem[] = [
  {
    id: 'FREE-01',
    slug: 'free-ai-robotics-workshop',
    title: 'کارگاه رایگان هوش مصنوعی و رباتیک',
    subtitle: 'آشنایی عملی با رباتیک، سنسورها و منطق هوش مصنوعی ویژه دانش‌آموزان',
    badge: '۱۰۰٪ رایگان',
    ageRange: '۷ تا ۱۸ سال',
    duration: '۲ جلسه عملی کارگاهی',
    projectsCount: 2,
    description:
      'دوره معارفه و استعدادیابی عملی در کارگاه مجهز فاتحان برای کشف علاقه و استعداد دانش‌آموزان.',
    imageUrl: '/assets/kits/kit-01.jpg',
    ctaText: 'ثبت‌نام رایگان در این دوره',
  },
];

export const DEFAULT_FALLBACK_COURSES: FatehanCourse[] = [
  {
    id: 'CRS-FAT-01',
    code: 'FAT-KID-1',
    title: 'کودک خلاق ۱',
    slug: 'creative-kid-1',
    ageGroup: 'S',
    ageRangeFa: '۶ تا ۷ سال (گروه سنی S)',
    category: 'کودک خلاق',
    tuitionApprovedToman: 5900000,
    tuitionEarlyBirdToman: 3900000,
    tuitionNormalToman: 4500000,
    tuitionPrivateToman: 8000000,
    sessionsCount: 12,
    hoursPerSession: 1.5,
    levelFa: 'پایه‌ای و مقدماتی',
    prerequisites: 'بدون پیش‌نیاز',
    summaryFa:
      'تقویت مهارت‌های حرکتی ظریف دست، هماهنگی چشم و دست و ساخت اولین سازه‌های مکانیکی ساده.',
    syllabusPoints: [
      'آشنایی با ابزارها و قطعات ایمن کودک',
      'ساخت سازه‌های تعادلی و الگوهای هندسی',
    ],
    equipmentNeeded: 'بسته کودک خلاق',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-07.jpg',
  },
];

export interface ShopDepartmentDef {
  id: 'robotics' | 'printing' | 'electronics' | 'coding' | 'mechanics';
  label: string;
  shortLabel: string;
  description: string;
  accentHex: string;
  softBg: string;
}

export const SHOP_DEPARTMENTS: ShopDepartmentDef[] = [
  {
    id: 'robotics',
    label: 'دپارتمان رباتیک',
    shortLabel: 'رباتیک',
    description: 'کیت‌های ربات مسیریاب، فوتبالیست، جنگجو، موتور گیربکس و سازه‌های مسابقه‌ای',
    accentHex: '#1E6B52',
    softBg: '#D4E9DF',
  },
  {
    id: 'printing',
    label: 'دپارتمان پرینترهای سه‌بعدی',
    shortLabel: 'پرینتر سه‌بعدی',
    description: 'پرینترهای سه‌بعدی دسکتاپ FDM، فیلامنت‌های PLA/PETG، نازل و تجهیزات چاپ',
    accentHex: '#4338CA',
    softBg: '#E4E1FA',
  },
  {
    id: 'electronics',
    label: 'دپارتمان الکترونیک',
    shortLabel: 'الکترونیک',
    description: 'بردهای آردوینو، ESP32، پکیج سنسورها، بردبورد، مولتی‌متر و کیت مدارهای هوشمند',
    accentHex: '#9A4B26',
    softBg: '#ECD6C7',
  },
  {
    id: 'coding',
    label: 'دپارتمان برنامه‌نویسی و هوش مصنوعی',
    shortLabel: 'کدنویسی و AI',
    description: 'کیت‌های بینایی ماشین، رزبری‌پای آموزشی و پکیج‌های عملی پایتون و هوش مصنوعی',
    accentHex: '#1D4ED8',
    softBg: '#DCE8FA',
  },
  {
    id: 'mechanics',
    label: 'دپارتمان مکانیک و سازه',
    shortLabel: 'مکانیک و سازه',
    description: 'پکیج‌های سازه فلزی، ست چرخ‌دنده، گیربکس آموزشی و مکانیزم‌های هیدرولیک',
    accentHex: '#9F1239',
    softBg: '#F6DDE3',
  },
];

export function resolveProductDepartmentId(product: Pick<ProductItem, 'category' | 'name' | 'type' | 'specs'>): ShopDepartmentDef['id'] {
  const hay = `${product.category || ''} ${product.name || ''} ${product.type || ''} ${product.specs || ''}`.toLowerCase();
  if (
    hay.includes('پرینتر') ||
    hay.includes('سه‌بعدی') ||
    hay.includes('سه بعدی') ||
    hay.includes('فیلامنت') ||
    hay.includes('3d') ||
    hay.includes('fdm') ||
    hay.includes('pla') ||
    hay.includes('چاپ')
  ) {
    return 'printing';
  }
  if (
    hay.includes('الکترونیک') ||
    hay.includes('آردوینو') ||
    hay.includes('arduino') ||
    hay.includes('سنسور') ||
    hay.includes('مدار') ||
    hay.includes('esp32') ||
    hay.includes('بردبورد') ||
    hay.includes('مولتی')
  ) {
    return 'electronics';
  }
  if (
    hay.includes('مکانیک') ||
    hay.includes('سازه') ||
    hay.includes('چرخ‌دنده') ||
    hay.includes('گیربکس') ||
    hay.includes('هیدرولیک') ||
    hay.includes('اهرم')
  ) {
    return 'mechanics';
  }
  if (
    hay.includes('برنامه‌نویسی') ||
    hay.includes('کدنویسی') ||
    hay.includes('پایتون') ||
    hay.includes('هوش مصنوعی') ||
    hay.includes('رزبری') ||
    hay.includes('اسکیل') ||
    hay.includes('chatgpt') ||
    hay.includes('claude') ||
    hay.includes('codex')
  ) {
    return 'coding';
  }
  return 'robotics';
}

export const DEFAULT_FATEHAN_HARDWARE_PRODUCTS: ProductItem[] = [
  // 1. دپارتمان رباتیک
  {
    id: 'fat-robo-linefollower',
    sku: 'FAT-ROBO-01',
    slug: 'fatehan-smart-line-follower-kit',
    name: 'کیت کامل ربات مسیریاب هوشمند فاتحان (سطح مسابقه‌ای)',
    productKind: 'simple',
    type: 'کیت کارگاهی رباتیک',
    category: 'دپارتمان رباتیک',
    featuredImageUrl: '/assets/kits/kit-01.jpg',
    shortDescription: 'شاسی سبک برش‌لیزری، ۲ موتور گیربکس‌دار فلزی، آرایه ۵ سنسور IR، درایور L298N و راهنمای مونتاژ فارسی.',
    description: 'کیت استاندارد ساخت ربات مسیریاب هوشمند ویژه دوره‌های رباتیک متوسطه و آماده‌سازی مسابقات کشوری.',
    priceToman: 2850000,
    salePriceToman: 2490000,
    stock: 28,
    salesCount: 94,
    status: 'موجود',
    warranty: 'تضمین سلامت قطعات و پشتیبانی مربیان فاتحان',
    specs: 'موتور گیربکس فلزی + آرایه سنسور مادون قرمز + درایور L298N',
  },
  {
    id: 'fat-robo-soccer',
    sku: 'FAT-ROBO-02',
    slug: 'fatehan-soccer-robot-kit',
    name: 'کیت ربات فوتبالیست دو موتوره کنترلی (ویژه مسابقات دانش‌آموزی)',
    productKind: 'simple',
    type: 'کیت کارگاهی رباتیک',
    category: 'دپارتمان رباتیک',
    featuredImageUrl: '/assets/kits/kit-02.jpg',
    shortDescription: 'مجهز به ریموت کنترل بی‌سیم، چرخ‌های اصطکاک بالا، سپر هدایت توپ و باتری قابل شارژ.',
    description: 'پکیج کامل ساخت ربات فوتبالیست برای یادگیری مفاهیم انتقال قدرت، کنترل موتورها و رقابت در زمین مسابقه.',
    priceToman: 2350000,
    salePriceToman: 2100000,
    stock: 34,
    salesCount: 118,
    status: 'موجود',
    warranty: 'تضمین اصالت قطعات و راهنمای تصویری کامل',
    specs: 'ریموت بی‌سیم + ۲ موتور پرقدرت + سپر شوت‌زن',
  },
  {
    id: 'fat-robo-obstacle',
    sku: 'FAT-ROBO-03',
    slug: 'fatehan-ultrasonic-firefighter-kit',
    name: 'کیت ربات هوشمند تشخیص مانع و آتش‌نشان (اولتراسونیک)',
    productKind: 'simple',
    type: 'کیت کارگاهی رباتیک',
    category: 'دپارتمان رباتیک',
    featuredImageUrl: '/assets/kits/kit-03.jpg',
    shortDescription: 'دارای سنسور فاصله‌سنج اولتراسونیک، سنسور تشخیص شعله، سروو موتور و فن خاموش‌کننده.',
    description: 'مناسب کارآموزان رباتیک سطح پیشرفته برای ساخت ربات خودمختار مسیریابی و عبور از موانع.',
    priceToman: 3400000,
    salePriceToman: 3150000,
    stock: 19,
    salesCount: 62,
    status: 'موجود',
    warranty: 'گارانتی تست کارگاهی آموزشگاه فاتحان',
    specs: 'سنسور اولتراسونیک HC-SR04 + سنسور شعله + سروو SG90',
  },

  // 2. دپارتمان پرینترهای سه‌بعدی
  {
    id: 'fat-3dp-printer-mini',
    sku: 'FAT-3DP-01',
    slug: 'fatehan-desktop-fdm-3d-printer',
    name: 'پرینتر سه‌بعدی دسکتاپ کارگاهی فاتحان (FDM مدل آموزشی دقیق)',
    productKind: 'simple',
    type: 'تجهیزات چاپ سه‌بعدی',
    category: 'دپارتمان پرینترهای سه‌بعدی',
    featuredImageUrl: '/assets/kits/kit-04.jpg',
    shortDescription: 'پرینتر سه‌بعدی ایمن و کم‌صدا با تراز خودکار صفحه، دقت ۰.۱ میلی‌متر و مناسب ساخت قطعات ربات و ماکت.',
    description: 'دستگاه پرینتر سه‌بعدی استاندارد مورد استفاده در کارگاه‌های فاتحان؛ همراه با نصب، آموزش کالیبراسیون و یک حلقه فیلامنت هدیه.',
    priceToman: 24500000,
    salePriceToman: 22900000,
    stock: 7,
    salesCount: 31,
    status: 'موجود',
    warranty: '۱۲ ماه گارانتی فنی و پشتیبانی آموزشی فاتحان',
    specs: 'ابعاد چاپ 220×220×250mm · تراز خودکار · نازل 0.4mm',
  },
  {
    id: 'fat-3dp-filament-pack',
    sku: 'FAT-3DP-02',
    slug: 'fatehan-pla-filament-4pack',
    name: 'پکیج ۴ رنگ فیلامنت PLA+ استاندارد چاپ سه‌بعدی (دوستدار محیط‌زیست)',
    productKind: 'simple',
    type: 'مصرفی پرینتر سه‌بعدی',
    category: 'دپارتمان پرینترهای سه‌بعدی',
    featuredImageUrl: '/assets/kits/kit-05.jpg',
    shortDescription: 'فیلامنت PLA+ قطر ۱.۷۵ میلی‌متر بدون بو و ایمن برای کلاس‌های دانش‌آموزی (رنگ‌های آبی، زرد، مشکی و سفید).',
    description: 'فیلامنت با کیفیت یکنواخت بدون حباب، ایده‌آل برای چاپ شاسی ربات، چرخ‌دنده‌ها و قطعات مهندسی.',
    priceToman: 2200000,
    salePriceToman: 1980000,
    stock: 45,
    salesCount: 83,
    status: 'موجود',
    warranty: 'تضمین یکنواختی قطر و کیفیت چاپ',
    specs: 'قطر 1.75mm · وزن مجموع ۲ کیلوگرم · دمای چاپ ۱۹۵ تا ۲۱۰ درجه',
  },
  {
    id: 'fat-3dp-toolkit',
    sku: 'FAT-3DP-03',
    slug: 'fatehan-3d-printing-tools-nozzle-kit',
    name: 'کیت ابزار نگهداری، نازل‌های برنجی و پس‌پردازش چاپ سه‌بعدی',
    productKind: 'simple',
    type: 'لوازم جانبی چاپ سه‌بعدی',
    category: 'دپارتمان پرینترهای سه‌بعدی',
    featuredImageUrl: '/assets/kits/kit-06.jpg',
    shortDescription: 'شامل کاردک جداکننده قطعه، ست نازل ۰.۲ تا ۰.۸ میلی‌متر، سوزن تمیزکننده و سیم‌چین دقیق.',
    description: 'مجموعه کامل ابزارهای کاربردی برای نگهداری از پرینتر سه‌بعدی و تمیزکاری حرفه‌ای قطعات چاپ‌شده.',
    priceToman: 1250000,
    stock: 32,
    salesCount: 47,
    status: 'موجود',
    warranty: 'تضمین اصالت کالا',
    specs: 'ست ۱۴ عددی ابزار تخصصی پرینتر ۳D و نازل برنجی',
  },

  // 3. دپارتمان الکترونیک
  {
    id: 'fat-elec-arduino-37',
    sku: 'FAT-ELEC-01',
    slug: 'fatehan-arduino-uno-37-sensors-kit',
    name: 'پکیج جامع برد آردوینو Uno + کیت ۳۷ سنسور کاربردی و بردبورد',
    productKind: 'simple',
    type: 'کیت الکترونیک و میکروکنترلر',
    category: 'دپارتمان الکترونیک',
    featuredImageUrl: '/assets/kits/kit-08.jpg',
    shortDescription: 'شامل برد Arduino Uno R3، بردبورد ۸۳۰ نقطه، سیم‌های جامپر، نمایشگر LCD و ۳۷ ماژول سنسور پرکاربرد.',
    description: 'کامل‌ترین جعبه آزمایشگاهی دپارتمان الکترونیک برای یادگیری مدارهای هوشمند، سنسورهای دما/نور/صدا و برنامه‌نویسی سخت‌افزار.',
    priceToman: 3200000,
    salePriceToman: 2890000,
    stock: 41,
    salesCount: 136,
    status: 'موجود',
    warranty: 'تست‌شده در آزمایشگاه الکترونیک فاتحان',
    specs: 'Arduino Uno R3 + ۳۷ سنسور + بردبورد + کابل و جعبه نظم‌دهنده',
  },
  {
    id: 'fat-elec-starter-lab',
    sku: 'FAT-ELEC-02',
    slug: 'fatehan-basic-electronics-lab-box',
    name: 'جعبه آزمایشگاه الکترونیک پایه (مقاومت، LED، مولتی‌متر و بردبورد ایمن)',
    productKind: 'simple',
    type: 'کیت الکترونیک پایه',
    category: 'دپارتمان الکترونیک',
    featuredImageUrl: '/assets/kits/kit-09.jpg',
    shortDescription: 'طراحی‌شده ویژه دانش‌آموزان ۷ تا ۱۴ سال؛ بدون نیاز به هویه و کاملاً ایمن با ولتاژ پایین.',
    description: 'شامل بیش از ۲۰۰ قطعه استاندارد (مقاومت، خازن، ترانزیستور، کلید، بازر، LDR) به همراه مولتی‌متر دیجیتال آموزشی.',
    priceToman: 1650000,
    salePriceToman: 1480000,
    stock: 52,
    salesCount: 109,
    status: 'موجود',
    warranty: 'تضمین کامل بودن قطعات و دفترچه ۲۰ آزمایش عملی',
    specs: '۲۰۰ قطعه استاندارد + مولتی‌متر دیجیتال + دفترچه مدارها',
  },
  {
    id: 'fat-elec-esp32-iot',
    sku: 'FAT-ELEC-03',
    slug: 'fatehan-esp32-smart-home-iot-kit',
    name: 'کیت اینترنت اشیاء (IoT) و خانه هوشمند با برد ESP32 وای‌فای‌دار',
    productKind: 'simple',
    type: 'کیت اینترنت اشیاء و الکترونیک',
    category: 'دپارتمان الکترونیک',
    featuredImageUrl: '/assets/kits/kit-10.jpg',
    shortDescription: 'ساخت سیستم آبیاری خودکار، دزدگیر هوشمند و کنترل چراغ‌ها از طریق موبایل با برد ESP32.',
    description: 'پکیج پیشرفته دپارتمان الکترونیک شامل برد دوهسته‌ای ESP32، رله دوکاناله، سنسور رطوبت خاک و نمایشگر OLED.',
    priceToman: 2750000,
    stock: 23,
    salesCount: 58,
    status: 'موجود',
    warranty: 'پشتیبانی فنی و کدهای نمونه آماده',
    specs: 'ESP32 WiFi/BT + رله + سنسور رطوبت DHT22 + نمایشگر OLED',
  },

  // 4. دپارتمان برنامه‌نویسی و هوش مصنوعی
  {
    id: 'fat-code-ai-vision',
    sku: 'FAT-CODE-01',
    slug: 'fatehan-ai-vision-python-kit',
    name: 'پکیج عملی هوش مصنوعی، پایتون و بینایی ماشین (وب‌کم HD + ماژول کنترل)',
    productKind: 'simple',
    type: 'کیت هوش مصنوعی و کدنویسی',
    category: 'دپارتمان برنامه‌نویسی و هوش مصنوعی',
    featuredImageUrl: '/assets/kits/kit-11.jpg',
    shortDescription: 'مناسب پروژه‌های تشخیص چهره، کنترل ربات با حرکات دست (OpenCV) و اجرای مدل‌های هوش مصنوعی.',
    description: 'همراه با جزوه پروژه‌محور پایتون و کدهای استاندارد برای اتصال دنیای نرم‌افزار به سخت‌افزار واقعی.',
    priceToman: 2950000,
    salePriceToman: 2650000,
    stock: 18,
    salesCount: 44,
    status: 'موجود',
    warranty: 'پشتیبانی آنلاین مربیان برنامه‌نویسی فاتحان',
    specs: 'دوربین HD کارگاهی + مبدل سریال + پکیج ۱۰ پروژه OpenCV',
  },

  // 5. دپارتمان مکانیک و سازه
  {
    id: 'fat-mech-gears-structure',
    sku: 'FAT-MECH-01',
    slug: 'fatehan-mechanics-gears-structure-pack',
    name: 'پکیج جامع سازه مکانیک، چرخ‌دنده‌ها و انتقال قدرت (۱۸۰ قطعه مهندسی)',
    productKind: 'simple',
    type: 'کیت مکانیک و سازه',
    category: 'دپارتمان مکانیک و سازه',
    featuredImageUrl: '/assets/kits/kit-12.jpg',
    shortDescription: 'شامل انواع چرخ‌دنده ساده و حلزونی، پولی، تسمه، شفت، پیچ و مهره و صفحات سازه‌ای مقاوم.',
    description: 'ابزار استاندارد دپارتمان مکانیک برای ساخت جرثقیل، گیربکس چندمرحله‌ای، اهرم‌ها و بدنه ربات‌های مقاوم.',
    priceToman: 1890000,
    salePriceToman: 1690000,
    stock: 36,
    salesCount: 77,
    status: 'موجود',
    warranty: 'قطعات مقاوم با استاندارد کارگاهی فاتحان',
    specs: '۱۸۰ قطعه مکانیکی + آچار و پیچ‌گوشتی کارگاهی + دفترچه سازه‌ها',
  },
  {
    id: 'fat-mech-hydraulic-arm',
    sku: 'FAT-MECH-02',
    slug: 'fatehan-hydraulic-robotic-arm-kit',
    name: 'کیت ساخت بازوی رباتیک هیدرولیکی ۴ محور (مکانیک و فیزیک کاربردی)',
    productKind: 'simple',
    type: 'کیت مکانیک و سازه',
    category: 'دپارتمان مکانیک و سازه',
    featuredImageUrl: '/assets/kits/kit-13.jpg',
    shortDescription: 'آموزش عملی قانون پاسکال، گشتاور و کنترل بازوی صنعتی بدون نیاز به باتری.',
    description: 'پروژه جذاب دپارتمان مکانیک برای درک حرکت مفاصل، تعادل سازه و بلند کردن اجسام با فشار سیال.',
    priceToman: 1450000,
    stock: 27,
    salesCount: 53,
    status: 'موجود',
    warranty: 'تضمین کامل بودن قطعات و راهنمای مونتاژ گام‌به‌گام',
    specs: 'بدنه برش‌لیزری دقیق + ۴ جک هیدرولیک + چنگک گیرنده',
  },
];

