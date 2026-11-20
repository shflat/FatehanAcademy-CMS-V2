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
  baleId: '',
  baleUrl: '',
};

export const DEFAULT_SITE_SETTINGS: CmsSiteSettings = {
  academyNameFa: 'آموزشگاه رباتیک فاتحان',
  academyNameEn: 'Fatehan Robotics Academy',
  domain: 'fatehanacademy.ir',
  url: 'https://fatehanacademy.ir',
  logoUrl: '/assets/aistudio/fatehan_logo_transparent.png',
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
    addressFull: 'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۲',
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
