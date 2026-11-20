# ممیزی جامع، معماری هدف (سبک وردپرس) و تسک‌لیست اجرایی پروژه Skill 98

این سند حاصل ممیزی کامل تمامی فایل‌ها، داده‌ها، فانکشن‌ها، تنظیمات و ایرادات امنیتی/ساختاری پروژه **Skill 98** است و نقشه راه بازنویسی ماژولار (Core / Database / Modules / Theme) و رفع کامل ایرادات را مشخص می‌کند.

---

## بخش اول: چک‌لیست ممیزی کامل داده‌ها، فانکشن‌ها، اهداف و تنظیمات

### ۱. هسته اصلی (Core)
| بخش | فایل/نماد فعلی | هدف و مسئولیت | تنظیمات و داده‌های کلیدی | وضعیت ممیزی |
| :--- | :--- | :--- | :--- | :--- |
| **تایپ‌های دامنه** | `src/data/skill98Data.ts`, `AdminCmsView.tsx` | تعریف مدل‌های محصول، مقاله، سفارش، کاربر، نقش، سشن، درگاه، پیامک، بکاپ، پوسته و لاگ | `SkillProduct`, `SkillArticle`, `OrderRecord`, `CmsRoleDefinition`, `ThemeConfig` | نیازمند انتقال به `src/core/types.ts` |
| **موتور دسترسی (RBAC)** | `INITIAL_CMS_ROLES` در `skill98Data.ts` و چک سطحی در `AdminCmsView.tsx` | مدیریت ۱۲ سطح دسترسی ادمین و سوپرادمین | `CmsRolePermissions` (۱۲ قابلیت) | **بحرانی:** فقط در کلاینت چک می‌شود؛ بدون هش و بدون گارد سروری |
| **تنظیمات محیطی و اسرار** | پراکنده در `server.ts`, `database.ts`, `.env.example` | خواندن `PORT`, `DATABASE_URL`, `OTP_HMAC_SECRET`, `GEMINI_API_KEY`, `ADMIN_PHONE` | متغیرهای `.env` | **بحرانی:** هاردکد شماره `09122685759`، کد `31364`، کلید `skill98-otp-secret-key` و پسورد جیمیل واقعی در `.env.example` |
| **فایربیس کلاینت** | `src/firebase.ts`, `firestore.rules` | اتصال Auth/Firestore، مدیریت خطای دسترسی و اعتبارسنجی اسکیما | `firebase-applet-config.json`, `OperationType` | نیازمند حذف ایمیل هاردکد و هم‌ترازی با `core` |
| **موتور انیمیشن و درگ** | `src/utils/motionAndDragEngine.ts` | اسکرول نرم (Lenis)، ترنزیشن (Barba+GSAP)، درگ کارت (Muuri) | `initSmoothScroll`, `triggerBarbaGsapTransition`, `MuuriGridController` | سالم؛ نیازمند انتقال به `src/core/` |
| **مولد پکیج ZIP** | `src/utils/zipGenerator.ts` | تولید فایل `.md` اسکیل و قالب خام ZIP استارتر | `downloadSingleSkillFile`, `downloadSkill98StarterZip` | سالم؛ نیازمند انتقال به `src/core/` |

### ۲. لایه دیتابیس (Database)
| بخش | فایل/نماد فعلی | هدف و مسئولیت | جداول و تنظیمات | وضعیت ممیزی |
| :--- | :--- | :--- | :--- | :--- |
| **موتور اتصال SQL** | `src/server/database.ts` (۲٬۵۰۲ خط) | اتصال دوگانه PostgreSQL / SQLite با WAL و تبدیل پارامتر `$1..$n` به `?` | `DATABASE_URL`, `data/skill98.db` | **سنگین و یکپارچه**؛ وجود ۴ سری فایل `corrupt` در `data/` |
| **جداول پایه** | `initDatabase` در `database.ts` | ذخیره کاربران، محصولات، مقالات، سفارشات، کوپن، رسانه، درگاه، پیامک، تنظیمات، لاگ، بکاپ و سشن | ۱۲ جدول SQL | فاقد جدول `rbac_permission_hashes` برای ذخیره هش دسترسی‌ها |
| **عملیات بکاپ و بازیابی** | `database.ts` (خطوط ۱۷۰۷-۲۰۹۰) | خروجی JSON/SQL، زمان‌بندی خودکار، ارسال به ایمیل SMTP و بله | `BackupScheduleConfig`, `BACKUP_DIR` | نیازمند جداسازی در `database/backupService.ts` |
| **سرویس پیامک** | `database.ts` (خطوط ۲۰۹۸-۲۴۵۰) | رندر قالب متغیرها و ارسال به کاوه‌نگار، ملی‌پیامک، فرازاس‌ام‌اس، قاصدک | `SmsGatewaySettings`, `SmsTriggerRule` | نیازمند جداسازی در `database/smsService.ts` |

### ۳. ماژول‌های کسب‌وکار (Modules — سبک پلاگین وردپرس)
| ماژول | مسیر فعلی | اندپوینت‌ها و فانکشن‌ها | وضعیت ممیزی |
| :--- | :--- | :--- | :--- |
| **احراز هویت و سشن** | `server.ts` (۶۴۴-۱۰۳۸) + `App.tsx` | `/api/auth/check-phone`, `/api/sms/send-otp`, `/api/sms/verify-otp`, `/api/auth/session`, `/api/auth/sessions`, `/api/auth/logout` | نیازمند حذف هاردکد مستر کد و شماره مدیر از فرانت و بک‌اند |
| **کاتالوگ و محصولات** | `App.tsx` + `AdminCmsView.tsx` + `verifiedSkillsCatalog.ts` | فیلتر، جستجو، بوکمارک، دریافت اسکیل رایگان، ویرایشگر محصول/پکیج | ادغام‌شده در فایل ۴۲۱۳ خطی `App.tsx` |
| **مقالات و سئو (AI)** | `server.ts` (۵۶۸-۶۴۲) + `AdminCmsView.tsx` | `/api/cms/ai-assist`, مدیریت مقالات، متا تگ سئو و کلمات کلیدی | فاقد گارد احراز هویت/دسترسی روی `/api/cms/ai-assist` |
| **سفارشات و درگاه پرداخت** | `server.ts` (۴۴۰-۵۶۶, ۱۰۴۰-۱۴۰۳, ۱۶۶۴-۱۷۳۷) + `AdminOperationsPanels.tsx` | سبد خرید، کوپن، ایجاد سفارش، ایران‌کیش، نوینوپی، زرین‌پال، روتر PHP | فاقد گارد امنیتی روی اندپوینت‌های ادمین درگاه |
| **صفحه‌ساز و رسانه** | `AdminCmsView.tsx` (۱۵۷۹-۲۵۸۶) | ویرایشگر چیدمان ۲/۳/۴ ستونه، ویجت‌ها، پلاگین‌ها، کتابخانه رسانه | حجم بالای JSX در یک کامپوننت |
| **مدیریت کاربران، لاگ و دیتابیس** | `server.ts` (۱۴۰۶-۲۰۰۵) + `AdminOperationsPanels.tsx` (۲٬۹۹۵ خط) | کوئری SQL خواندنی، لاگ سیستم، خروجی CSV، CRUD کاربران ادمین | **بحرانی:** تمام `/api/admin/*` بدون توکن سشن و چک پرمیژن باز هستند |

### ۴. لایه قالب و پوسته (Theme)
| بخش | فایل/نماد فعلی | هدف و تنظیمات | وضعیت ممیزی |
| :--- | :--- | :--- | :--- |
| **تنظیمات پوسته و رنگ** | `src/index.css` + `ThemeConfig` | ۵ پالت رنگی (`cobalt`, `amber`, `emerald`, `rose`, `violet`)، دارک/لایت، فونت‌های `Sahel` / `Vazirmatn` / `Rubik` | سالم؛ نیازمند جداسازی کامپوننت‌های قالب |
| **هدر، فوتر و ناوبری** | `src/App.tsx` (خطوط ۲۱۰۵-۲۳۳۰ و ۴۰۰۰-۴۲۱۰) | هدر شیشه‌ای، منوی اصلی، نوار پایین موبایل، فوتر و برندینگ | درهم‌تنیده داخل `App.tsx` |
| **نمای فروشگاه و مقالات** | `src/App.tsx` (خطوط ۲۳۴۰-۳۲۳۵) + `SkillPosterCard.tsx` + `ResilientImage.tsx` | اسلایدر هیرو، گرید Muuri، ویجت‌های سفارشی، FAQ، آرشیو و تک‌مقاله | نیازمند انتقال به `src/theme/components/` |
| **پیشخوان کاربری و راهنما** | `CustomerDashboardView.tsx`, `TargetGuideAndZipView.tsx` | کتابخانه اسکیل‌های خریداری/دریافت‌شده، سفارش‌ها، راهنما و دانلود ZIP | آماده اتصال به ساختار `src/modules/` |

---

## بخش دوم: تسک‌لیست خردشده و اجرایی (Task List)

- [x] **Task 1:** ثبت سند ممیزی و تسک‌لیست (`docs/AUDIT_AND_TASK_LIST.md`)
- [x] **Task 2:** اصلاح فوری اسرار و فایل‌های محیطی (پاک‌سازی رمز جیمیل از `.env.example`، پاک‌سازی فایل‌های `skill98.db.corrupt_*` از `data/`، اصلاح `package.json` و `eslint.config.mjs`)
- [x] **Task 3:** ساخت هسته مشترک (`src/core/types.ts`, `src/core/permissions.ts`, `src/core/apiClient.ts`) بدون هیچ مقدار هاردکد
- [x] **Task 4:** ساخت هسته امنیتی سرور (`src/server/core/envConfig.ts`, `cryptoSecurity.ts`, `permissionsEngine.ts`) با سیستم **هش دسترسی‌ها (HMAC-SHA256)** در دیتابیس (`rbac_permission_hashes`) و فایل (`data/permissions.hash.json`) و Middleware گارد ادمین
- [x] **Task 5:** تفکیک لایه دیتابیس به سبک ماژولار (`src/server/database/connection.ts`, `schema.ts`, `settingsLogsRepo.ts`, `usersSessionsRepo.ts`, `catalogOrdersRepo.ts`, `backupService.ts`, `smsService.ts`, `index.ts`) همراه با پاک‌سازی خودکار فایل‌های کرپت SQLite و حذف کامل هاردکد
- [x] **Task 6:** تفکیک روترهای سرور به ماژول‌های مستقل وردپرس‌طور (`src/server/modules/auth/`, `storefront/`, `orders/`, `ai/`, `admin/`) و بازنویسی `server.ts` به شکل تمیز و سبک (< ۱۵۰ خط) با حفاظت کامل تمام مسیرهای مدیریتی و CMS
- [x] **Task 7:** تفکیک داده‌های استاتیک (`src/data/defaults.ts`, `src/data/initialCatalog.ts`, `src/data/skill98Data.ts`) و حذف کامل شماره/کد/ایمیل هاردکد از کلاینت
- [x] **Task 8:** تفکیک ماژول‌های فرانت‌اند (`src/modules/auth/`, `src/modules/cart/`, `src/modules/catalog/`, `src/modules/dashboard/`, `src/modules/guide/`)
- [x] **Task 9:** شکستن پنل غول‌پیکر ادمین (`AdminCmsView.tsx` و `AdminOperationsPanels.tsx`) به زیرپنل‌های تخصصی در `src/modules/admin/panels/` + پنل نمایش هش دسترسی‌ها و تست یکپارچگی RBAC
- [x] **Task 10:** تفکیک لایه قالب (`src/theme/components/SiteHeader.tsx`, `SiteFooter.tsx`, `MobileBottomNav.tsx`, `StorefrontView.tsx`, `ArticlesView.tsx`, `SkillPosterCard.tsx`, `ResilientImage.tsx`)
- [x] **Task 11:** بازنویسی `src/App.tsx` به عنوان Orchestrator تمیز و سبک با اتصال به هسته، ماژول‌ها و قالب
- [x] **Task 12:** بررسی نهایی امنیت و سلامت: اجرای `tsc --noEmit`, `eslint`, `npm run build` و تست اندپوینت‌های سرور برای اطمینان از کارکرد ۱۰۰٪ بدون هاردکد
