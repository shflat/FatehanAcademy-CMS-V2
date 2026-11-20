export interface AcademyDepartmentItem {
  id: string;
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

export interface AcademyCourseItem {
  id: string;
  courseKind?: 'official' | 'free';
  code: string;
  title: string;
  slug: string;
  ageGroup: 'S' | 'A' | 'B' | 'C';
  ageRangeFa: string;
  category: string;
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
  status: string;
  featuredImageUrl: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  // Optional free-course fields
  subtitle?: string;
  badge?: string;
  duration?: string;
  projectsCount?: number;
  projects?: string[];
  ctaText?: string;
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

export interface AcademyIdeaItem {
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

export interface AcademyAgeRoadmapItem {
  id: 'kids' | 'teens' | 'youth' | string;
  badge: string;
  title: string;
  goal: string;
  steps: Array<{ step: string; name: string; desc: string }>;
}

export interface AcademyTuitionSettings {
  siblingDiscountPercent: number;
  maxSiblingsCount: number;
  vatPercent: number;
  earlyBirdLabelFa: string;
  normalTwoStepLabelFa: string;
  approvedLabelFa: string;
  privateClassLabelFa: string;
  currencyLabelFa: string;
}

export interface AcademySuiteSettings {
  tuitionCalculator: AcademyTuitionSettings;
  ageRoadmaps: AcademyAgeRoadmapItem[];
  freeCoursesPage: {
    gridColumns: 2 | 3 | 4;
    heroBadge: string;
    heroTitle: string;
    heroDescription: string;
    heroCtaText: string;
    listSectionTitle: string;
    listSectionSubtitle: string;
  };
}

export const INITIAL_ACADEMY_DEPARTMENTS: AcademyDepartmentItem[] = [
  {
    id: 'robotics',
    deptNumFa: 'دپارتمان ۰۱',
    codeEn: 'ROBOTICS / ۰۱',
    title: 'دپارتمان رباتیک',
    badge: 'مبتدی تا پیشرفته',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    deckBg: '#D4E9DF',
    deckBorder: '#1E6B5240',
    deckText: '#134E3A',
    deckAccent: '#1E6B52',
    iconKey: 'bot',
    subtitle: 'ساخت، مونتاژ و هدایت ربات‌های مسابقه‌ای و هوشمند',
    description:
      'در دپارتمان رباتیک، کارآموزان از ساخت ربات‌های مکانیکی ساده شروع کرده و گام‌به‌گام به طراحی ربات‌های هوشمند مسیریاب، فوتبالیست، جنگجو و حل‌کننده ماز برای المپیادها و مسابقات کشوری می‌رسند.',
    stages: [
      'سطح ۱ و ۲: رباتیک پایه، مفاهیم انتقال قدرت و مکانیزم‌های حرکتی',
      'سطح ۳ و ۴: ربات‌های سنسوردار (مسیریاب، تعقیب‌کننده نور و تشخیص مانع)',
      'سطح ۵ به بالا: رباتیک مسابقه‌ای، بازوهای صنعتی و ربات‌های خودمختار',
    ],
    projects: [
      'ربات فوتبالیست دو موتوره کنترلی',
      'ربات هوشمند مسیریاب با سنسور مادون قرمز (IR)',
      'ربات آتش‌نشان و تشخیص مانع با اولتراسونیک',
    ],
  },
  {
    id: 'coding',
    deptNumFa: 'دپارتمان ۰۲',
    codeEn: 'AI & CODEX / ۰۲',
    title: 'دپارتمان برنامه‌نویسی',
    badge: 'کدنویسی و هوش مصنوعی',
    color: 'blue',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    deckBg: '#DCE8FA',
    deckBorder: '#1D4ED840',
    deckText: '#1E3A8A',
    deckAccent: '#1D4ED8',
    iconKey: 'terminal',
    subtitle: 'از بازی‌سازی با اسکرچ تا پایتون و پروژه‌های هوش مصنوعی',
    description:
      'مغز متفکر ربات‌ها با برنامه‌نویسی هدایت می‌شود. آموزش را از تفکر الگوریتمی و بازی‌سازی تصویری با اسکرچ آغاز می‌کنیم و دانش‌آموزان را به دنیای زبان پایتون و بینایی ماشین هدایت می‌کنیم.',
    stages: [
      'رده کودک: تفکر منطقی و بازی‌سازی بلوکی با Scratch 3.0',
      'رده نوجوان: برنامه‌نویسی متنی پایتون (Python) از مقدماتی تا کاربردی',
      'رده پیشرفته: هوش مصنوعی، بینایی ماشین (OpenCV) و ربات‌های بینا',
    ],
    projects: [
      'طراحی بازی کامپیوتری دوبعدی با منطق امتیاز و مراحل',
      'سیستم تشخیص چهره و فرامین حرکتی دست با وب‌کم',
      'دستیار صوتی هوشمند به زبان پایتون',
    ],
  },
  {
    id: 'electronics',
    deptNumFa: 'دپارتمان ۰۳',
    codeEn: 'CIRCUITS / ۰۳',
    title: 'دپارتمان الکترونیک',
    badge: 'مدار و برد هوشمند',
    color: 'amber',
    badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
    deckBg: '#ECD6C7',
    deckBorder: '#9A4B2640',
    deckText: '#6B3115',
    deckAccent: '#9A4B26',
    iconKey: 'cpu',
    subtitle: 'شناخت قطعات، طراحی مدار، سنسورها و بردهای هوشمند آردوینو',
    description:
      'الکترونیک قلب تپنده هر سیستم هوشمند است. دانش‌آموزان در کارگاه مجهز با بردبورد، قطعات الکترونیک، سنسورهای حرکتی/نوری و بردهای آردوینو مدار می‌سازند و منطق الکتریسیته را درک می‌کنند.',
    stages: [
      'سطح مقدماتی: جریان، ولتاژ، باتری، کلیدها و بستن مدار روی بردبورد',
      'سطح متوسطه: کار با سنسورهای دما، نور، صدا، نمایشگرها و بازر',
      'سطح پیشرفته: اینترنت اشیاء (IoT)، خانه هوشمند و اصول طراحی PCB با آلتیوم',
    ],
    projects: [
      'سیستم هشدار دزدگیر لیزری با سنسور LDR',
      'سیستم آبیاری خودکار گلدان با سنسور رطوبت خاک',
      'چراغ راهنمایی هوشمند با بردهای میکروکنترلری',
    ],
  },
  {
    id: 'printing',
    deptNumFa: 'دپارتمان ۰۴',
    codeEn: '3D-DESIGN / ۰۴',
    title: 'دپارتمان چاپ سه‌بعدی',
    badge: 'مدل‌سازی و ساخت قطعه',
    color: 'violet',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    deckBg: '#E4E1FA',
    deckBorder: '#4338CA40',
    deckText: '#312E81',
    deckAccent: '#4338CA',
    iconKey: 'box',
    subtitle: 'تبدیل ایده‌های ذهنی به قطعات واقعی با پرینترهای سه‌بعدی آموزشگاه',
    description:
      'کارآموزان یاد می‌گیرند قطعات شاسی یا مکانیزم‌های خلاقانه خود را در نرم‌افزارهای سه‌بعدی طراحی کرده و با پرینترهای سه‌بعدی موجود در کارگاه مستقیماً چاپ و لمس کنند.',
    stages: [
      'گام اول: تجسم فضایی و طراحی مقدماتی قطعات (Tinkercad)',
      'گام دوم: مدل‌سازی مهندسی چرخ‌دنده‌ها و شاسی ربات با SolidWorks',
      'گام سوم: آماده‌سازی فایل (Slicing) با Cura و اپراتوری پرینتر ۳D',
    ],
    projects: [
      'طراحی و چاپ شاسی اختصاصی ربات مسابقه‌ای',
      'ساخت ست چرخ‌دنده حلزونی و خورشیدی',
      'طراحی سرکلیدی، ماکت و المان‌های مکانیکی مفصل‌دار',
    ],
  },
  {
    id: 'mechanics',
    deptNumFa: 'دپارتمان ۰۵',
    codeEn: 'MECHANICS / ۰۵',
    title: 'دپارتمان مکانیک',
    badge: 'ساخت و سازه',
    color: 'rose',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    deckBg: '#F6DDE3',
    deckBorder: '#9F123940',
    deckText: '#881337',
    deckAccent: '#9F1239',
    iconKey: 'cog',
    subtitle: 'درک عملی قوانین فیزیک، انتقال قدرت، اهرم‌ها و سازه‌های مهندسی',
    description:
      'بدون یک بدنه و ساختار مکانیکی مهندسی، هیچ رباتی حرکت پایداری ندارد. کارآموزان با مفاهیم گشتاور، نسبت تبدیل دور چرخ‌دنده‌ها، سیستم‌های تعلیق و بازوهای متحرک آشنا می‌شوند.',
    stages: [
      'مقدماتی: ماشین‌های ساده، اهرم‌های کلاس ۱ تا ۳ و چرخ و محور',
      'متوسطه: سازه‌های پایدار، پل‌های مهندسی و انواع گیربکس‌های چندمرحله‌ای',
      'پیشرفته: سیستم‌های انتقال قدرت، بازوهای مکانیکی هیدرولیکی/پنوماتیکی',
    ],
    projects: [
      'ساخت جرثقیل مکانیکی با قابلیت چرخش و قلاب متحرک',
      'ربات راه‌رونده ۴ پا با مکانیزم میل‌لنگ و شاتون',
      'ساخت منجنیق کششی و سیستم پرتابگر فنری',
    ],
  },
];

export const INITIAL_ACADEMY_COURSES: AcademyCourseItem[] = [
  {
    id: 'CRS-FAT-01',
    courseKind: 'official',
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
      'تقویت مهارت‌های حرکتی ظریف دست، هماهنگی چشم و دست، آشنایی با اشکال هندسی سه‌بعدی و ساخت اولین سازه‌های مکانیکی ساده با قطعات ایمن.',
    syllabusPoints: [
      'آشنایی با ابزارها و قطعات پلاستیکی ایمن کودک',
      'ساخت سازه‌های تعادلی و الگوهای هندسی',
      'مفاهیم اولیه اهرم‌ها، چرخ‌ها و محورها',
      'تقویت خلاقیت داستانی و بازی‌های تیمی سازنده',
    ],
    equipmentNeeded: 'بسته کودک خلاق تام',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-07.jpg',
    seoTitle: 'دوره کودک خلاق ۱ | آموزشگاه رباتیک فاتحان اندیشه',
    seoDescription: 'ثبت‌نام دوره کودک خلاق ۱ ویژه کودکان ۶ تا ۷ سال با آموزش عملی سازه‌سازی.',
    focusKeyword: 'دوره کودک خلاق ۱',
  },
  {
    id: 'CRS-FAT-02',
    courseKind: 'official',
    code: 'FAT-KID-23',
    title: 'کودک خلاق ۲ تا ۳',
    slug: 'creative-kid-2-3',
    ageGroup: 'S',
    ageRangeFa: '۶ تا ۷ سال (گروه سنی S)',
    category: 'کودک خلاق',
    tuitionApprovedToman: 5900000,
    tuitionEarlyBirdToman: 3900000,
    tuitionNormalToman: 4500000,
    tuitionPrivateToman: 8000000,
    sessionsCount: 12,
    hoursPerSession: 1.5,
    levelFa: 'تکمیلی کودک خلاق',
    prerequisites: 'گذراندن کودک خلاق ۱',
    summaryFa:
      'ترکیب موتورهای دور پایین، پایه‌های متحرک، ساخت وسایل نقلیه مکانیکی ساده و ورود به مفاهیم مقدماتی برنامه‌نویسی بصری Scratch Jr.',
    syllabusPoints: [
      'آشنایی با موتور DC ایمن و منبع تغذیه باتری',
      'ساخت چرخ‌دنده‌ها و انتقال نیرو',
      'روایت‌گری مکانیکی و هدایت ربات با ریموت سیم‌دار',
      'حل پازل‌های حرکتی و تفکر ساختاری',
    ],
    equipmentNeeded: 'بسته کودک خلاق تام + موتور و ریموت سیم‌دار',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-07.jpg',
  },
  {
    id: 'CRS-FAT-03',
    courseKind: 'official',
    code: 'FAT-MEC-A1',
    title: 'مکانیک A1',
    slug: 'mechanics-a1',
    ageGroup: 'A',
    ageRangeFa: '۸ تا ۹ سال (گروه سنی A)',
    category: 'مکانیک',
    tuitionApprovedToman: 5900000,
    tuitionEarlyBirdToman: 3900000,
    tuitionNormalToman: 4500000,
    tuitionPrivateToman: 8000000,
    sessionsCount: 14,
    hoursPerSession: 1.5,
    levelFa: 'مقدماتی مهندسی مکانیک',
    prerequisites: 'بدون پیش‌نیاز (گروه سنی A)',
    summaryFa:
      'شروع رسمی مهندسی سازه، شناخت گشتاور، انواع اتصالات پیچ و مهره صنعتی، طراحی شاسی ربات‌های ۴ چرخ و آزمایش استحکام.',
    syllabusPoints: [
      'اصول اتصالات مکانیکی، آچارها و پیچ و مهره',
      'طراحی و مونتاژ شاسی صلب ربات',
      'نسبت چرخ‌دنده‌ها برای افزایش سرعت یا قدرت',
      'ساخت ربات آتش‌نشان و ربات فوتبالیست مکانیکی',
    ],
    equipmentNeeded: 'بسته سطح ۱ یا بسته مکانیک تام',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-06.jpg',
  },
  {
    id: 'CRS-FAT-04',
    courseKind: 'official',
    code: 'FAT-MEC-A26',
    title: 'مکانیک A2 تا A6',
    slug: 'mechanics-a2-to-a6',
    ageGroup: 'A',
    ageRangeFa: '۸ تا ۹ سال (گروه سنی A)',
    category: 'مکانیک',
    tuitionApprovedToman: 5900000,
    tuitionEarlyBirdToman: 3900000,
    tuitionNormalToman: 4500000,
    tuitionPrivateToman: 8000000,
    sessionsCount: 16,
    hoursPerSession: 1.5,
    levelFa: 'متوسطه مهندسی مکانیک',
    prerequisites: 'گذراندن مکانیک A1',
    summaryFa:
      'ساخت بازوهای مکانیکی چند درجه آزادی، مکانیزم‌های بادامک و لنگ، تسمه و پولی و طراحی ربات‌های لیفتراک و بالابر.',
    syllabusPoints: [
      'مکانیزم‌های تبدیل حرکت دورانی به رفت و برگشتی',
      'طراحی گریپر (دستگیره بازویی ربات)',
      'توزیع وزن و مرکز ثقل در ربات‌های شیب‌پیما',
      'مسابقه سازه‌های باربری درون آموزشگاه',
    ],
    equipmentNeeded: 'بسته مکانیک تام + کتاب‌ها (دوره مکانیک)',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-02.jpg',
  },
  {
    id: 'CRS-FAT-05',
    courseKind: 'official',
    code: 'FAT-MEC-B1',
    title: 'مکانیک B1',
    slug: 'mechanics-b1',
    ageGroup: 'B',
    ageRangeFa: '۱۰ تا ۱۳ سال (گروه سنی B)',
    category: 'مکانیک',
    tuitionApprovedToman: 5900000,
    tuitionEarlyBirdToman: 3900000,
    tuitionNormalToman: 4500000,
    tuitionPrivateToman: 8000000,
    sessionsCount: 14,
    hoursPerSession: 1.5,
    levelFa: 'مهندسی مکانیک نوجوانان',
    prerequisites: 'گروه سنی ۱۰ تا ۱۳ سال',
    summaryFa:
      'محاسبات نیرو و اصطکاک، سیستم تعلیق ربات، گیربکس‌های قدرتی و ساخت سازه‌های مسابقه‌ای مستحکم.',
    syllabusPoints: [
      'فیزیک حرکت و محاسبات گشتاور موتورهای گیربکس‌دار',
      'شاسی‌های پیشرفته و سیستم‌های تعلیق مکانیکی',
      'مکانیزم‌های پرتابگر و ربات‌های جنگجو',
      'مدیریت باتری و اتصالات تغذیه موتورها',
    ],
    equipmentNeeded: 'بسته سطح ۲ یا بسته مکانیک تام',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-05.jpg',
  },
  {
    id: 'CRS-FAT-06',
    courseKind: 'official',
    code: 'FAT-MEC-B23',
    title: 'مکانیک B2 تا B3',
    slug: 'mechanics-b2-to-b3',
    ageGroup: 'B',
    ageRangeFa: '۱۰ تا ۱۳ سال (گروه سنی B)',
    category: 'مکانیک',
    tuitionApprovedToman: 5900000,
    tuitionEarlyBirdToman: 3900000,
    tuitionNormalToman: 4500000,
    tuitionPrivateToman: 8000000,
    sessionsCount: 16,
    hoursPerSession: 1.5,
    levelFa: 'تکمیلی مکانیک نوجوانان',
    prerequisites: 'گذراندن مکانیک B1',
    summaryFa:
      'طراحی مکانیزم‌های پیشرفته انتقال قدرت، گیربکس‌های خورشیدی و حلزونی، بازوهای صنعتی چندمحوره و شاسی‌های ربات‌های مسابقاتی.',
    syllabusPoints: [
      'گیربکس‌های ترکیبی خورشیدی و حلزونی با گشتاور بالا',
      'طراحی مکانیزم‌های راه‌رونده و شاسی‌های ۶ چرخ',
      'کنترل بی‌سیم سازه‌های مکانیکی با ریموت بی‌سیم',
      'پروژه عملی آماده‌سازی شاسی مسابقات کشوری',
    ],
    equipmentNeeded: 'بسته مکانیک تام + ریموت بی‌سیم',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-02.jpg',
  },
  {
    id: 'CRS-FAT-07',
    courseKind: 'official',
    code: 'FAT-MEC-C',
    title: 'مکانیک C',
    slug: 'mechanics-c',
    ageGroup: 'C',
    ageRangeFa: 'بالای ۱۳ سال (گروه سنی C)',
    category: 'مکانیک',
    tuitionApprovedToman: 6400000,
    tuitionEarlyBirdToman: 4500000,
    tuitionNormalToman: 5200000,
    tuitionPrivateToman: 9000000,
    sessionsCount: 16,
    hoursPerSession: 2,
    levelFa: 'تخصصی سازه‌های صنعتی و مبانی کامپیوتر',
    prerequisites: 'گروه سنی بالای ۱۳ سال',
    summaryFa:
      'طراحی شاسی‌های صنعتی، تحلیل استاتیکی سازه، تلفیق مکانیک با مبانی کامپیوتر و نرم‌افزار و آماده‌سازی برای مدل‌سازی سه‌بعدی.',
    syllabusPoints: [
      'استاتیک و مقاومت مصالح در طراحی شاسی ربات',
      'کار با موتورهای صنعتی و سیستم‌های انتقال قدرت دقیق',
      'طراحی قطعات اختصاصی برای ساخت افزایشی',
      'پروژه نهایی: ساخت شاسی ربات خودران رده خوارزمی',
    ],
    equipmentNeeded: 'بسته اسمارت یا بسته مکانیک تام',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-01.jpg',
  },
  {
    id: 'CRS-FAT-08',
    courseKind: 'official',
    code: 'FAT-ELE-13',
    title: 'الکترونیک ۱ تا ۳',
    slug: 'electronics-1-to-3',
    ageGroup: 'A',
    ageRangeFa: '۸ تا ۱۳ سال (گروه سنی A و B)',
    category: 'الکترونیک',
    tuitionApprovedToman: 6400000,
    tuitionEarlyBirdToman: 4500000,
    tuitionNormalToman: 5200000,
    tuitionPrivateToman: 9000000,
    sessionsCount: 16,
    hoursPerSession: 1.5,
    levelFa: 'مبتدی تا پیشرفته الکترونیک عملی',
    prerequisites: 'بدون پیش‌نیاز',
    summaryFa:
      'آشنایی عملی با قطعه‌شناسی، بردبورد، سنسورهای نوری (LDR)، فروسرخ (IR)، ترانزیستور، رله و ساخت مدارات دزدگیر و هوشمند.',
    syllabusPoints: [
      'قوانین ولتاژ، جریان، مقاومت و بستن مدار روی بردبورد',
      'کار با مولتی‌متر دیجیتال و ابزارهای قطعه‌شناسی',
      'راه‌اندازی سنسورهای نوری، صوتی و تشخیص مانع',
      'مدارات درایور موتور و برد راه‌انداز ربات',
    ],
    equipmentNeeded: 'بسته قطعه‌شناسی تام + برد راه‌انداز',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-08.jpg',
  },
  {
    id: 'CRS-FAT-09',
    courseKind: 'official',
    code: 'FAT-MCT-13',
    title: 'مکاترونیک ۱ تا ۳',
    slug: 'mechatronics-1-to-3',
    ageGroup: 'B',
    ageRangeFa: '۸ تا ۱۳ سال (گروه سنی A و B)',
    category: 'مکاترونیک',
    tuitionApprovedToman: 7200000,
    tuitionEarlyBirdToman: 4900000,
    tuitionNormalToman: 5800000,
    tuitionPrivateToman: 10400000,
    sessionsCount: 16,
    hoursPerSession: 2,
    levelFa: 'تخصصی چندرشته‌ای (مکانیک + الکترونیک)',
    prerequisites: 'الکترونیک پایه یا مکانیک پایه',
    summaryFa:
      'تلفیق سازه مکانیکی، مدار الکترونیکی و سنسورهای هوشمند؛ ساخت ربات مسیریاب، حل‌کننده ماز، آتش‌نشان و فوتبالیست حرفه‌ای.',
    syllabusPoints: [
      'ترکیب شاسی مکانیکی با سنسورهای اولتراسونیک و مادون قرمز',
      'کار با بردهای راه‌انداز و تغذیه استاندارد باطری لیتیومی',
      'طراحی ربات‌های خودران هوشمند بدون دخالت دست',
      'آماده‌سازی عملی برای مسابقات استانی و کشوری رباتیک',
    ],
    equipmentNeeded: 'بسته ربو گیت یا بسته اسمارت',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-04.jpg',
  },
  {
    id: 'CRS-FAT-10',
    courseKind: 'official',
    code: 'FAT-ARC-15',
    title: 'برنامه‌نویسی ARC1 تا ARC5',
    slug: 'arc-programming-1-to-5',
    ageGroup: 'B',
    ageRangeFa: '۱۰ سال به بالا (گروه سنی B و C)',
    category: 'برنامه‌نویسی و هوش مصنوعی',
    tuitionApprovedToman: 8000000,
    tuitionEarlyBirdToman: 5000000,
    tuitionNormalToman: 6400000,
    tuitionPrivateToman: 11000000,
    sessionsCount: 18,
    hoursPerSession: 2,
    levelFa: 'کدنویسی تخصصی سخت‌افزار و ربات',
    prerequisites: 'گذراندن مکاترونیک یا آشنایی اولیه',
    summaryFa:
      'برنامه‌نویسی گام‌به‌گام بردهای میکروکنترلری تخصصی ARC از سطح ۱ تا ۵؛ کنترل دیجیتال موتورها، خواندن سنسورها و منطق تصمیم‌گیری هوشمند ربات.',
    syllabusPoints: [
      'دستورات شرطی، حلقه‌ها، متغیرها و توابع در محیط ARC',
      'خواندن سنسورهای آنالوگ و دیجیتال و کنترل دقیق PWM',
      'برنامه‌نویسی ربات‌های مسیریاب سرعتی و حل‌کننده ماز',
      'پروژه نهایی: ساخت ربات هوشمند مسابقه‌ای با برد ARC',
    ],
    equipmentNeeded: 'بسته برنامه‌نویسی ARC',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-03.jpg',
  },
  {
    id: 'CRS-FAT-11',
    courseKind: 'official',
    code: 'FAT-ICDL',
    title: 'ICDL',
    slug: 'icdl-computer-skills',
    ageGroup: 'C',
    ageRangeFa: 'گروه سنی C (نوجوانان و جوانان)',
    category: 'مهارت‌های تخصصی',
    tuitionApprovedToman: 10400000,
    tuitionEarlyBirdToman: 5500000,
    tuitionNormalToman: 7200000,
    tuitionPrivateToman: 14000000,
    sessionsCount: 20,
    hoursPerSession: 1.5,
    levelFa: 'مهارت‌های هفتگانه بین‌المللی کامپیوتر',
    prerequisites: 'بدون پیش‌نیاز',
    summaryFa:
      'آموزش جامع و عملی مهارت‌های هفتگانه کامپیوتر (ICDL 1 & 2) شامل ویندوز، اینترنت، Word، Excel، PowerPoint و Access.',
    syllabusPoints: [
      'تسلط کامل بر سیستم‌عامل Windows و مدیریت فایل‌ها',
      'تایپ، صفحه‌آرایی و مستندسازی حرفه‌ای در Microsoft Word',
      'فرمول‌نویسی، جداول و نمودارهای آماری در Excel',
      'طراحی ارائه‌های علمی و مهندسی در PowerPoint',
    ],
    equipmentNeeded: 'سایت کامپیوتر مجهز آموزشگاه',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-15.jpg',
  },
  {
    id: 'CRS-FAT-12',
    courseKind: 'official',
    code: 'FAT-AVR',
    title: 'AVR',
    slug: 'avr-microcontroller',
    ageGroup: 'C',
    ageRangeFa: 'گروه سنی B و C (۱۰ سال به بالا)',
    category: 'الکترونیک',
    tuitionApprovedToman: 10400000,
    tuitionEarlyBirdToman: 5500000,
    tuitionNormalToman: 7200000,
    tuitionPrivateToman: 14000000,
    sessionsCount: 16,
    hoursPerSession: 2,
    levelFa: 'تخصصی میکروکنترلر AVR (سطوح ۱ و ۲)',
    prerequisites: 'الکترونیک پایه',
    summaryFa:
      'برنامه‌نویسی تراشه‌های میکروکنترلر AVR به زبان C، راه‌اندازی نمایشگرهای LCD، کی‌پد، مبدل ADC، تایمرها و ساخت سیستم‌های کنترلی.',
    syllabusPoints: [
      'معماری میکروکنترلرهای AVR و پروگرام کردن تراشه',
      'راه‌اندازی نمایشگر کاراکتری LCD، سون‌سگمنت و کی‌پد ماتریسی',
      'کار با وقفه‌ها (Interrupts) و مبدل آنالوگ به دیجیتال (ADC)',
      'پروژه عملی: ساخت قفل دیجیتال رمزدار و دماسنج هوشمند',
    ],
    equipmentNeeded: 'برد آموزشی AVR و قطعات الکترونیک',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-10.jpg',
  },
  {
    id: 'CRS-FAT-13',
    courseKind: 'official',
    code: 'FAT-ALTIUM',
    title: 'ALTIUM',
    slug: 'altium-pcb-design',
    ageGroup: 'C',
    ageRangeFa: 'گروه سنی C (بالای ۱۳ سال)',
    category: 'الکترونیک',
    tuitionApprovedToman: 10400000,
    tuitionEarlyBirdToman: 5500000,
    tuitionNormalToman: 7200000,
    tuitionPrivateToman: 14000000,
    sessionsCount: 18,
    hoursPerSession: 2,
    levelFa: 'تخصصی طراحی برد مدار چاپی (PCB)',
    prerequisites: 'الکترونیک کاربردی',
    summaryFa:
      'آموزش حرفه‌ای طراحی شماتیک و برد مدار چاپی (PCB) یک‌لایه و دولایه در نرم‌افزار صنعتی Altium Designer تا خروجی نهایی کارخانه.',
    syllabusPoints: [
      'ترسیم نقشه شماتیک استاندارد و ساخت کتابخانه قطعات',
      'اصول چیدمان قطعات (Placement) و مسیریابی (Routing) برد PCB',
      'قوانین طراحی صنعتی (Design Rules) و پلی‌گان‌ریزی',
      'تولید فایل‌های Gerber جهت سفارش ساخت برد مدار چاپی',
    ],
    equipmentNeeded: 'سیستم‌های مهندسی کارگاه',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-10.jpg',
  },
  {
    id: 'CRS-FAT-14',
    courseKind: 'official',
    code: 'FAT-PROTEUS',
    title: 'PROTEUS',
    slug: 'proteus-circuit-simulation',
    ageGroup: 'C',
    ageRangeFa: 'گروه سنی B و C',
    category: 'الکترونیک',
    tuitionApprovedToman: 10400000,
    tuitionEarlyBirdToman: 5500000,
    tuitionNormalToman: 7200000,
    tuitionPrivateToman: 14000000,
    sessionsCount: 16,
    hoursPerSession: 2,
    levelFa: 'شبیه‌سازی تخصصی مدارات و میکروکنترلرها',
    prerequisites: 'الکترونیک پایه',
    summaryFa:
      'آموزش جامع شبیه‌سازی مدارهای آنالوگ، دیجیتال و میکروکنترلرهای AVR و Arduino در محیط نرم‌افزار Proteus پیش از ساخت عملی.',
    syllabusPoints: [
      'شبیه‌سازی زنده مدارات الکترونیکی با اسیلوسکوپ مجازی',
      'بارگذاری فایل Hex میکروکنترلر و تست برنامه روی شماتیک',
      'خطایابی و بهینه‌سازی عملکرد مدار پیش از لحیم‌کاری',
      'پروژه عملی شبیه‌سازی کامل مدار کنترلی ربات هوشمند',
    ],
    equipmentNeeded: 'سیستم کامپیوتری کارگاه',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-08.jpg',
  },
  {
    id: 'CRS-FAT-15',
    courseKind: 'official',
    code: 'FAT-SOLID',
    title: 'Solid (سالیدورک و طراحی سه‌بعدی)',
    slug: 'solidworks-3d-cad',
    ageGroup: 'C',
    ageRangeFa: 'گروه سنی C (بالای ۱۳ سال)',
    category: 'طراحی و ساخت سه‌بعدی',
    tuitionApprovedToman: 10400000,
    tuitionEarlyBirdToman: 5500000,
    tuitionNormalToman: 7200000,
    tuitionPrivateToman: 14000000,
    sessionsCount: 20,
    hoursPerSession: 2,
    levelFa: 'طراحی صنعتی سه‌بعدی و پرینتر ۳D',
    prerequisites: 'آشنایی با کامپیوتر',
    summaryFa:
      'آموزش جامع طراحی قطعات مکانیکی و صنعتی در نرم‌افزار SolidWorks (محیط‌های Part، Assembly و Drawing) و خروجی مستقیم برای پرینتر سه‌بعدی.',
    syllabusPoints: [
      'ترسیم اسکچ‌های دوبعدی دقیق و قیدگذاری مهندسی',
      'حجم‌دهی سه‌بعدی پیشرفته (Extrude, Revolve, Sweep, Loft)',
      'مونتاژ مکانیزم‌های رباتیک و شبیه‌سازی حرکت چرخ‌دنده‌ها',
      'خروجی STL و چاپ قطعه طراحی‌شده با پرینتر سه‌بعدی',
    ],
    equipmentNeeded: 'سیستم‌های طراحی سه‌بعدی و پرینتر ۳D کارگاه',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/kits/kit-05.jpg',
  },
  // 4 Free Courses
  {
    id: 'FREE-FAT-01',
    courseKind: 'free',
    code: 'FREE-AI-01',
    title: 'دوره رایگان هوش مصنوعی و برنامه‌نویسی رباتیک (ویژه شروع)',
    slug: 'free-ai-and-robotics-starter',
    subtitle: 'آموزش رایگان آکادمی — با انجام ۴ پروژه عملی و کاربردی',
    badge: '۱۰۰٪ رایگان + گواهی شرکت',
    ageGroup: 'A',
    ageRangeFa: '۷ تا ۱۶ سال',
    category: 'کارگاه رایگان',
    tuitionApprovedToman: 0,
    tuitionEarlyBirdToman: 0,
    tuitionNormalToman: 0,
    tuitionPrivateToman: 0,
    sessionsCount: 4,
    hoursPerSession: 1.5,
    duration: '۴ جلسه (پروژه‌محور)',
    projectsCount: 4,
    projects: [
      'پروژه ۱: آشنایی با مغز متفکر ربات‌ها و منطق شرطی هوشمند',
      'پروژه ۲: ساخت اولین بازی و انیمیشن تعاملی با کدنویسی بلوکی',
      'پروژه ۳: تشخیص اشیاء و تصویر با هوش مصنوعی مقدماتی',
      'پروژه ۴: جلسه عملی کارگاهی و استعدادیابی حضوری با مربیان',
    ],
    levelFa: 'مقدماتی رایگان',
    prerequisites: 'بدون پیش‌نیاز',
    summaryFa:
      'در دوره رایگان هوش مصنوعی و مبانی رباتیک، دانش‌آموزان با انجام ۴ پروژه عملی مسیر ورود به دنیای تکنولوژی و ساخت ربات را تجربه می‌کنند.',
    syllabusPoints: [
      'آشنایی با منطق شرطی هوشمند',
      'ساخت بازی و انیمیشن تعاملی بلوکی',
      'تشخیص اشیاء با هوش مصنوعی مقدماتی',
    ],
    equipmentNeeded: 'تجهیزات کارگاه آموزشگاه',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/blog/blog-03.jpg',
    ctaText: 'ثبت‌نام رایگان در این دوره',
  },
  {
    id: 'FREE-FAT-02',
    courseKind: 'free',
    code: 'FREE-MEC-02',
    title: 'کارگاه رایگان ساخت اولین سازه و مکانیزم حرکتی (کودک خلاق)',
    slug: 'free-creative-mechanics-workshop',
    subtitle: 'آشنایی عملی با چرخ‌دنده‌ها، اهرم‌ها و موتورهای رباتیک',
    badge: 'کارگاه رایگان استعدادیابی',
    ageGroup: 'S',
    ageRangeFa: '۶ تا ۱۰ سال',
    category: 'کارگاه رایگان',
    tuitionApprovedToman: 0,
    tuitionEarlyBirdToman: 0,
    tuitionNormalToman: 0,
    tuitionPrivateToman: 0,
    sessionsCount: 1,
    hoursPerSession: 2,
    duration: '۲ ساعت کارگاه حضوری + ویدیو',
    projectsCount: 2,
    projects: [
      'آشنایی با قطعات مکانیکی ایمن و ابزارهای ساخت',
      'ساخت مکانیزم انتقال نیرو با چرخ‌دنده‌های رنگی',
      'تست حرکت سازه در پیست کارگاه و سنجش استعداد مکانیکی',
    ],
    levelFa: 'استعدادیابی کودک',
    prerequisites: 'بدون پیش‌نیاز',
    summaryFa:
      'فرصتی بی‌نظیر برای کودکان ۶ تا ۱۰ سال تا در محیط واقعی کارگاه با قطعات استاندارد مکانیکی اولین خودرو یا پرتابگر متحرک خود را بسازند.',
    syllabusPoints: ['قطعات مکانیکی ایمن', 'چرخ‌دنده‌های رنگی و تست حرکت'],
    equipmentNeeded: 'قطعات کارگاهی آموزشگاه',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/blog/blog-02.jpg',
    ctaText: 'ثبت‌نام رایگان در این دوره',
  },
  {
    id: 'FREE-FAT-03',
    courseKind: 'free',
    code: 'FREE-SCR-03',
    title: 'آموزش رایگان بازی‌سازی دوبعدی با اسکرچ (Scratch 3.0)',
    slug: 'free-scratch-game-dev',
    subtitle: 'تبدیل علاقه به بازی‌های کامپیوتری به مهارت برنامه‌نویسی',
    badge: 'آموزش رایگان ویدیویی و حضوری',
    ageGroup: 'B',
    ageRangeFa: '۸ تا ۱۳ سال',
    category: 'کارگاه رایگان',
    tuitionApprovedToman: 0,
    tuitionEarlyBirdToman: 0,
    tuitionNormalToman: 0,
    tuitionPrivateToman: 0,
    sessionsCount: 3,
    hoursPerSession: 1,
    duration: '۳ بخش آموزشی + تمرین عملی',
    projectsCount: 3,
    projects: [
      'آشنایی با محیط فارسی و گرافیکی Scratch 3.0',
      'حرکت دادن کاراکتر ربات با کلیدهای صفحه‌کلید',
      'طراحی سیستم امتیازگیری و مراحل بازی',
    ],
    levelFa: 'مقدماتی برنامه‌نویسی',
    prerequisites: 'بدون پیش‌نیاز',
    summaryFa:
      'در این دوره رایگان دانش‌آموزان یاد می‌گیرند چطور کاراکتر، مرحله و امتیازدهی یک بازی واقعی را طراحی کنند.',
    syllabusPoints: ['محیط Scratch 3.0', 'کنترل کاراکتر و امتیازگیری'],
    equipmentNeeded: 'رایانه یا لپ‌تاپ',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/blog/blog-01.jpg',
    ctaText: 'ثبت‌نام رایگان در این دوره',
  },
  {
    id: 'FREE-FAT-04',
    courseKind: 'free',
    code: 'FREE-3D-04',
    title: 'آشنایی رایگان با پرینتر سه‌بعدی و تبدیل ایده به قطعه واقعی',
    slug: 'free-3d-printing-intro',
    subtitle: 'مشاهده زنده چاپ سه‌بعدی قطعات ربات در کارگاه',
    badge: 'بازدید و آموزش رایگان',
    ageGroup: 'C',
    ageRangeFa: '۱۰ تا ۱۸ سال',
    category: 'کارگاه رایگان',
    tuitionApprovedToman: 0,
    tuitionEarlyBirdToman: 0,
    tuitionNormalToman: 0,
    tuitionPrivateToman: 0,
    sessionsCount: 1,
    hoursPerSession: 2,
    duration: '۱ جلسه کارگاهی + فایل آموزشی',
    projectsCount: 2,
    projects: [
      'چگونه پرینتر سه‌بعدی لایه‌به‌لایه قطعه را می‌سازد؟',
      'طراحی اولین مدل سه‌بعدی در کمتر از ۲۰ دقیقه',
      'مشاهده پرینت زنده قطعه در کارگاه آموزشگاه',
    ],
    levelFa: 'مقدماتی طراحی سه‌بعدی',
    prerequisites: 'بدون پیش‌نیاز',
    summaryFa:
      'نوجوانان با نحوه کار پرینترهای سه‌بعدی صنعتی، فیلامنت‌های PLA و طراحی اولین قطعه سه‌بعدی آشنا می‌شوند.',
    syllabusPoints: ['مبانی پرینت سه‌بعدی و فیلامنت PLA', 'طراحی و چاپ زنده'],
    equipmentNeeded: 'پرینتر ۳D کارگاه',
    status: 'ثبت‌نام فعال',
    featuredImageUrl: '/assets/blog/blog-05.jpg',
    ctaText: 'ثبت‌نام رایگان در این دوره',
  },
];

export const INITIAL_ACADEMY_ANNOUNCEMENTS: AcademyAnnouncementItem[] = [
  {
    id: 'ANN-201',
    title: 'آغاز ثبت‌نام دوره رایگان هوش مصنوعی و رباتیک (۴ پروژه عملی)',
    message:
      'ظرفیت کارگاه رایگان آشنایی با هوش مصنوعی و ساخت ۴ پروژه عملی رباتیک برای دانش‌آموزان باز شد. همین حالا از منوی «دوره رایگان» ثبت‌نام کنید.',
    createdAt: '۱۴۰۴/۰۸/۰۵',
    badgeText: 'دوره رایگان جدید',
    targetType: 'public',
    linkUrl: '/free-courses',
    isImportant: true,
  },
  {
    id: 'ANN-202',
    title: 'تمدید تخفیف ثبت‌نام زودهنگام ترم پاییز و زمستان',
    message:
      'والدین گرامی می‌توانند با استفاده از طرح ثبت‌نام زودهنگام (یک‌مرحله‌ای یا دومرحله‌ای) از تخفیف ویژه شهریه در هر ۱۵ دوره رسمی بهره‌مند شوند.',
    createdAt: '۱۴۰۴/۰۸/۰۴',
    badgeText: 'تخفیف شهریه',
    targetType: 'public',
    linkUrl: '/courses',
    isImportant: false,
  },
];

export const INITIAL_ACADEMY_IDEAS: AcademyIdeaItem[] = [
  {
    id: 'IDEA-101',
    title: 'ربات هوشمند آبیاری گلدان‌های آپارتمانی با سنسور رطوبت',
    note: 'می‌خواهم با استفاده از بسته اسمارت و سنسور رطوبت خاک، رباتی بسازم که وقتی خاک خشک شد خودش به گلدان آب بدهد و روی موبایل پیام بفرستد.',
    studentName: 'امیرعلی محمدی',
    phone: '09121002001',
    ageGroup: '۱۱ تا ۱۴ سال',
    createdAt: '۱۴۰۴/۰۸/۰۵ - ۱۶:۳۰',
    status: 'تایید و تقدیر شده',
    adminReply:
      'آفرین امیرعلی عزیز! ایده بسیار کاربردی و جذابی است. در جلسه این هفته کارگاه الکترونیک، ماژول رله و سنسور رطوبت خاک را برایت آماده کرده‌ایم.',
  },
  {
    id: 'IDEA-102',
    title: 'دستکش کنترلی بی‌سیم برای هدایت ربات فوتبالیست با حرکت دست',
    note: 'به جای ریموت معمولی، یک سنسور شتاب‌سنج روی دستکش نصب کنیم تا هر طرف دستمان را خم کردیم ربات به همان سمت حرکت کند.',
    studentName: 'امیر احمدی',
    phone: '09121002003',
    ageGroup: '۱۲ تا ۱۶ سال',
    createdAt: '۱۴۰۴/۰۸/۰۴ - ۱۱:۱۵',
    status: 'بررسی شده',
    adminReply:
      'ایده فوق‌العاده‌ای برای پروژه پایانی ترم برنامه‌نویسی ARC3 است. می‌توانیم با ماژول ژیروسکوپ MPU6050 پیاده‌سازی‌اش کنیم.',
  },
];

export const INITIAL_ACADEMY_SETTINGS: AcademySuiteSettings = {
  tuitionCalculator: {
    siblingDiscountPercent: 5,
    maxSiblingsCount: 4,
    vatPercent: 10,
    earlyBirdLabelFa: 'تخفیف زودهنگام یک‌مرحله‌ای',
    normalTwoStepLabelFa: 'تخفیف ثبت‌نام به‌موقع (دو‌مرحله‌ای)',
    approvedLabelFa: 'شهریه مصوب',
    privateClassLabelFa: 'کلاس خصوصی ۱ تا ۳ نفره',
    currencyLabelFa: 'تومان',
  },
  ageRoadmaps: [
    {
      id: 'kids',
      badge: '۷ تا ۱۰ سال (دبستان)',
      title: 'مسیر کاشفان کوچک',
      goal: 'شکوفایی خلاقیت، تقویت دست‌ورزی، درک مقدماتی فیزیک حرکت و تفکر الگوریتمی',
      steps: [
        {
          step: 'گام اول',
          name: 'مکانیک و سازه خلاق',
          desc: 'آشنایی با چرخ‌دنده‌ها، اهرم‌ها و ساخت ماشین‌های متحرک هیجان‌انگیز.',
        },
        {
          step: 'گام دوم',
          name: 'الکترونیک مقدماتی و ایمن',
          desc: 'شناخت باتری، لامپ، موتور، کلید و ساخت اولین ربات‌های نوری ساده.',
        },
        {
          step: 'گام سوم',
          name: 'کدنویسی تصویری (Scratch)',
          desc: 'ساخت انیمیشن و بازی‌های دوبعدی با بلوک‌های رنگی بدون نیاز به تایپ انگلیسی.',
        },
        {
          step: 'گام چهارم',
          name: 'پروژه ربات مسابقه‌ای مقدماتی',
          desc: 'مونتاژ ربات فوتبالیست کنترلی و شرکت در رقابت‌های دوستانه کارگاه.',
        },
      ],
    },
    {
      id: 'teens',
      badge: '۱۱ تا ۱۴ سال (متوسطه اول)',
      title: 'مسیر مهندسان نوجوان',
      goal: 'تسلط بر طراحی مدار، سنسورهای محیطی، مدل‌سازی سه‌بعدی و بردهای هوشمند',
      steps: [
        {
          step: 'گام اول',
          name: 'الکترونیک کاربردی و سنسورها',
          desc: 'بستن مدارهای واقعی روی بردبورد و کار با سنسورهای اولتراسونیک، مادون قرمز و دما.',
        },
        {
          step: 'گام دوم',
          name: 'طراحی و چاپ سه‌بعدی',
          desc: 'طراحی شاسی و قطعات اختصاصی ربات در کامپیوتر و پرینت واقعی آن‌ها در کارگاه.',
        },
        {
          step: 'گام سوم',
          name: 'بردهای هوشمند آردوینو (Arduino)',
          desc: 'کدنویسی به زبان C/C++ و پایتون برای کنترل هوشمند موتورها و تصمیم‌گیری ربات.',
        },
        {
          step: 'گام چهارم',
          name: 'ساخت ربات‌های خودمختار مسابقه‌ای',
          desc: 'طراحی ربات مسیریاب، حل‌کننده ماز و آمادگی برای جشنواره‌های رباتیک کشوری.',
        },
      ],
    },
    {
      id: 'youth',
      badge: '۱۵ تا ۱۸ سال (متوسطه دوم)',
      title: 'مسیر فاتحان آینده',
      goal: 'ورود حرفه‌ای به مهندسی مکاترونیک، پایتون پیشرفته، هوش مصنوعی و ساخت نمونه‌های صنعتی',
      steps: [
        {
          step: 'گام اول',
          name: 'برنامه‌نویسی پیشرفته پایتون',
          desc: 'تسلط بر الگوریتم‌ها، ساختار داده‌ها، ماژول‌ها و توسعه نرم‌افزارهای کاربردی.',
        },
        {
          step: 'گام دوم',
          name: 'هوش مصنوعی و بینایی ماشین',
          desc: 'پردازش تصویر با OpenCV، تشخیص چهره، ردیابی اجسام و فرامین هوشمند.',
        },
        {
          step: 'گام سوم',
          name: 'اینترنت اشیاء (IoT) و مکاترونیک',
          desc: 'اتصال بردهای پیشرفته ESP32 به اینترنت، مانیتورینگ از راه دور و کنترل صنعتی.',
        },
        {
          step: 'گام چهارم',
          name: 'پروژه نهایی و رزومه علمی',
          desc: 'توسعه یک اختراع کاربردی برای مسابقات خوارزمی و ساخت رزومه تخصصی ورود به دانشگاه.',
        },
      ],
    },
  ],
  freeCoursesPage: {
    gridColumns: 2,
    heroBadge: 'آموزش رایگان آکادمی رباتیک و هوش مصنوعی فاتحان',
    heroTitle: 'دوره رایگان هوش مصنوعی، رباتیک و کدنویسی',
    heroDescription:
      'در دوره‌های رایگان آکادمی فاتحان، با انجام ۴ پروژه عملی و کاربردی، مسیر ورود به دنیای هوش مصنوعی، ساخت ربات و برنامه‌نویسی را تجربه کنید.',
    heroCtaText: 'ثبت نام دوره رایگان',
    listSectionTitle: 'لیست کارگاه‌ها و دوره‌های رایگان آکادمی',
    listSectionSubtitle: 'هر یک از دوره‌های رایگان زیر شامل پروژه‌های عملی گام‌به‌گام است:',
  },
};
