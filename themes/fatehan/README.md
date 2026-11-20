# پوسته مستقل ویترین آموزشگاه فاتحان (`@fatehan/storefront-theme`)

پکیج کاملاً خودکفا و مستقل ظاهر فرانت‌اند (`fatehanacademy.ir`) طراحی‌شده برای سوار شدن بدون درز روی **هسته جدید CMS v2.0.0** — بدون کوچک‌ترین وابستگی به `CoreContext` قدیمی یا کدهای پنل ادمین.

---

## ۱. ساختار پوشه و فایل‌های پوسته (`/themes/fatehan/`)

```text
themes/fatehan/
├── index.ts                          # نقطه ورود اصلی (FatehanThemeRoot + تمام Exportها)
├── theme.manifest.json               # شناسنامه پوسته، توکن‌های رنگ/فونت، وابستگی‌ها و APIها
├── README.md                         # راهنمای استقرار و اتصال به CMS v2.0.0
├── styles/
│   └── fatehan-theme.css             # فونت‌های فارسی (@font-face)، تایپوگرافی، BiDi RTL، انیمیشن‌ها و @media print
├── types/
│   └── index.ts                      # قراردادهای تایپ‌اسکریپت CMS v2.0.0 (محصولات، دوره‌ها، منوها، برگه‌ها، سفارش‌ها)
├── context/
│   ├── cmsApiAdapter.ts              # آداپتور استاندارد REST برای CMS v2.0.0 (+ حالت سازگاری legacyMode)
│   └── FatehanThemeContext.tsx       # کانتکست مستقل ویترین، سبد خرید، نشست کاربر و متغیرهای CSS پویا
├── layouts/
│   ├── FatehanThemeShell.tsx         # پوسته والد (سوئیچ خودکار دسکتاپ/تبلت/موبایل + مودال‌ها + Toast)
│   ├── DesktopLayout.tsx             # نمای دسکتاپ
│   ├── TabletLayout.tsx              # نمای تبلت
│   └── MobileLayout.tsx              # نمای موبایل با نوار ناوبری پایینی پویا
├── components/
│   ├── StorefrontHeader.tsx          # هدر چسبان، منوی پویا، زنگوله اعلانات، جستجو و سبد خرید
│   ├── StorefrontFooter.tsx          # فوتر حرفه‌ای، لینک‌های سریع، اینماد هوشمند و لایت‌باکس مجوز رسمی
│   ├── FatehanStorefrontHome.tsx     # صفحه اصلی (هیرو، کارت‌های ورق‌مانند ۵ دپارتمان، شبیه‌ساز، محاسبه‌گر، ایده‌ها، تماس)
│   ├── CartDrawer.tsx                # کشوی کناری سبد خرید و اعمال کد تخفیف
│   ├── VideoLabModal.tsx             # مودال پخش ویدیو / انیمیشن تعاملی معرفی کارگاه
│   └── StoreOtpLoginModal.tsx        # مودال ورود با شماره موبایل و کد یک‌بارمصرف پیامکی (OTP)
├── pages/
│   ├── StorefrontRouter.tsx          # مسیریاب کامل ویترین (فروشگاه، جزئیات محصول، سبد، تسویه، شاپرک، فاکتور)
│   ├── FatehanMultiPages.tsx         # برگه‌های دوره‌ها، محاسبه‌گر شهریه، شبیه‌ساز ربات، تماس، دوره رایگان و درباره ما
│   ├── BlogAndAccountRoutes.tsx      # مجله خبری سبک یاهو (/blog) و پنل کاربری ۵ تب (/my-account)
│   └── PageRenderer.tsx              # رندرکننده بلوک‌های برگه‌ساز ۳ حالته (دسکتاپ/تبلت/موبایل)
├── ui/
│   ├── FatehanLogo.tsx               # لوگوی متالیک سه‌بعدی خوانده‌شده از تنظیمات CMS
│   ├── BiDiText.tsx                  # ایزوله‌ساز دوجهته متن‌های ترکیبی فارسی/انگلیسی
│   └── ScrollReveal.tsx              # انیمیشن اسکرول دوطرفه + نوار پیشرفت مطالعه بالای صفحه
└── utils/
    ├── formatters.ts                 # فرمت ارقام فارسی، واحد تومان و کش حافظه سمت کلاینت
    ├── RichFormattedContent.tsx      # رندرکننده ایمن محتوای Markdown/HTML مقالات و محصولات
    └── defaultFallbacks.ts           # مقادیر پیش‌فرض ایمن برای جلوگیری از صفحه خالی پیش از تکمیل دیتابیس
```

---

## ۲. نحوه اتصال سریع روی هسته جدید CMS v2.0.0

```tsx
import React from 'react';
import { FatehanThemeRoot, createCmsV2ApiAdapter } from './themes/fatehan';

const cmsAdapter = createCmsV2ApiAdapter({
  baseUrl: 'https://api.fatehanacademy.ir', // یا '' برای دامنه یکسان
});

export default function App() {
  return <FatehanThemeRoot adapter={cmsAdapter} />;
}
```

> **نکته:** اگر هنوز در مرحله مهاجرت هستید و می‌خواهید موقتاً روی API نسخه ۱ (`/api/state`) تست بگیرید، کافی است `createCmsV2ApiAdapter({ legacyMode: true })` قرار دهید.

---

## ۳. نقشه تبدیل داده‌های هاردکدشده به APIهای استاندارد CMS v2.0.0

| داده قبلی (هاردکدشده در نسخه قدیمی) | مسیر API جدید در CMS v2.0.0 | محل مصرف در پوسته |
|---|---|---|
| `FATEHAN_BRAND` (نام، لوگو، تلفن‌ها، آدرس، شبکه‌ها) | `GET /api/v2/settings` | `StorefrontHeader`, `StorefrontFooter`, `FatehanLogo`, `FatehanStorefrontHome`, `FatehanMultiPages`, `StorefrontRouter` |
| آرایه‌های ثابت منوی هدر، فوتر و نوار موبایل | `GET /api/v2/menus` | `StorefrontHeader`, `StorefrontFooter`, `MobileLayout` |
| `departmentsData` (۵ دپارتمان و پالت کارت‌های ورق‌مانند) | `GET /api/v2/departments` | `FatehanStorefrontHome` |
| `FATEHAN_COURSES` (۱۵ دوره آموزشی و نرخ شهریه) | `GET /api/v2/courses` | `FatehanStorefrontHome`, `FatehanCoursesPage`, `FatehanTuitionCalculatorPage` |
| `DEFAULT_FREE_COURSES` (دوره‌های رایگان) | `GET /api/v2/free-courses` | `FatehanStorefrontHome`, `FatehanFreeCoursesPage` |
| `FATEHAN_PORTAL_ARTICLES` (۸ مقاله ثابت مجله) | `GET /api/v2/posts` | `BlogRoutesPage`, `PageRenderer` |
| محصولات، کیت‌ها، کد تخفیف و درگاه‌ها | `GET /api/v2/products` و `GET /api/v2/storefront/bootstrap` | `StorefrontRouter`, `CartDrawer`, `FatehanStorefrontHome` |
| بلوک‌های برگه‌ساز صفحه اصلی و برگه‌ها | `GET /api/v2/pages` | `FatehanStorefrontHome`, `FatehanMultiPages`, `PageRenderer` |
| اعلانات زنگوله هدر (`FATEHAN_DEFAULT_ANNOUNCEMENTS`) | `GET /api/v2/announcements` | `StorefrontHeader`, `CustomerAccountDashboardPage` |
| ثبت ایده (DREAM · BUILD)، دیدگاه، مشاوره، OTP، آدرس و پرداخت | `POST /api/v2/ideas`, `/comments`, `/consultations`, `/auth/*`, `/customer/addresses`, `/checkout/*` | از طریق `adapter.*` در `FatehanThemeContext` |

---

## ۴. دارایی‌های استاتیک مورد نیاز در پوشه `public/` پروژه میزبان

- **فونت‌ها (`public/fonts/`):** ۱۵ فایل `.woff2` شامل خانواده‌های `IRANSansX`، `Vazirmatn`، `YekanBakh` (Estedad)، `Sahel` و `Abar` (Shabnam).
- **لوگو و تصاویر (`public/assets/`):**
  - `/assets/aistudio/photo_2026-11-05_09-11-51_99e96614.jpg` (لوگوی متالیک سه‌بعدی)
  - `/assets/kits/kit-01.jpg` تا `kit-06.jpg`
  - `/assets/blog/blog-01.jpg` تا `blog-08.jpg`

---

## ۵. لیست کتابخانه‌های تخصصی مورد استفاده در پوسته

| کتابخانه | نسخه | چرا استفاده شده؟ | کجا استفاده شده؟ |
|---|---|---|---|
| `react` & `react-dom` | `^19.0.1` | هسته رندرینگ کامپوننت‌محور، مدیریت وضعیت و هوک‌ها | تمامی کامپوننت‌ها، صفحات و کانتکست پوسته |
| `motion` (`motion/react`) | `^12.23.24` | انیمیشن‌های شتاب‌دهی‌شده با GPU، فیزیک فنری (Spring)، ورق‌زدن و درگ کارت‌های دپارتمان، ورود/خروج نرم مودال‌ها (`AnimatePresence`) و نوار پیشرفت اسکرول (`useScroll`, `useSpring`) | `ScrollReveal`, `StorefrontHeader`, `CartDrawer`, `VideoLabModal`, `StoreOtpLoginModal`, `FatehanThemeShell`, `FatehanStorefrontHome`, `StorefrontRouter`, `BlogAndAccountRoutes`, `FatehanMultiPages`, `PageRenderer` |
| `lucide-react` | `^0.546.0` | مجموعه آیکون‌های برداری SVG فوق‌سبک با قابلیت Tree-Shaking (بدون نیاز به فونت آیکون سنگین) | هدر، فوتر، کارت‌های دوره و کیت، نوار موبایل، مودال‌ها و دپارتمان‌ها |
| `tailwindcss` + `@tailwindcss/vite` | `^4.3.3` | استایل‌دهی Utility-First، طراحی واکنش‌گرا (دسکتاپ/تبلت/موبایل)، گرادیانت‌ها و قوانین چاپی (`print:`) بدون فایل CSS مازاد | `styles/fatehan-theme.css` و تمام کامپوننت‌های TSX |
| **APIهای بومی مرورگر (بدون پکیج اضافی)** | Native | `IntersectionObserver` + `MutationObserver` (افکت اسکرول پیوسته و دوطرفه)، `Canvas 2D` (تیزر تعاملی ویدیو)، `Intl.NumberFormat('fa-IR')` (ارقام و قیمت فارسی) | `ScrollReveal.tsx`, `VideoLabModal.tsx`, `formatters.ts` |

> **نکته بهینه‌سازی:** کتابخانه‌های سمت سرور و پنل ادمین (`express`, `pg`, `sharp`, `recharts`, `@google/genai`) **هیچ نیازی در این پوسته ندارند** و کاملاً از ویترین جدا شده‌اند.
