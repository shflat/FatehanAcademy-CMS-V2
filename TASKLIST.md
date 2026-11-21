# نقشه راه و تسک‌لیست جامع هسته CMS و فروشگاه سازمانی (Enterprise Modular Persian-First CMS & E-Commerce Core Engine)

- **نسخه فعلی هسته (Current CMS Version):** `v2.7.0` (**Unified AI Hub & 24/7 Autonomous Agent Core v2.7.0** — ماژول واحد `mod_ai_hub_agent` با ۳ اسلات مجزا (`text_seo`, `image_visual`, `agent_core`)، پشتیبانی Gemini / Custom OpenAI-Compatible / Ollama با رمزنگاری AES-256-GCM، ایزوله‌سازی کامل سوپر ادمین از ادمین سایت با `HTTP 403`، حافظه یادگیرنده `SKILL.md`، صف تایید ۱-کلیکی، مرکز فرماندهی آماده ویس و پل ربات بله/ایتا/تلگرام، استودیو پرامپت و تصویر در ویرایشگر محصول/مقاله، آلارم زنده سراسری چت در هدر ادمین، اولویت فوری اختصاصی کاربران لاگین‌شده با ورود OTP درون‌خطی در چت و ابزار تکمیل خودکار پروفایل `update_visitor_user_profile`)
- **وضعیت فاز فعلی:** `Phase 11 Unified AI Hub & 24/7 Autonomous Agent — Done (v2.7.0)`

---

## PHASE 0 & PHASE 1: Foundation, Graph Agent, Dual-DB, Caching & Admin Refactor (`v1.0.0` -> `v1.1.0`)
- [x] **P1.1:** ایجاد `TASKLIST.md` در ریشه پروژه با پوشش کامل فازهای ۰ تا ۶ و مقداردهی اولیه نسخه `v1.0.0` (`Done - v1.0.0`)
- [x] **P1.2:** ساخت مجموعه ایجنت‌های حاکمیتی در `/core/agents/`: (`Done - v1.1.0`)
  - `project-indexer.js` (تولید خودکار `PROJECT_GRAPH.json` و `PROJECT_MAP.md`)
  - `security-auditor.js` (ممیزی Zero-Trust فرانت‌اند، SQL پارامتری، CSRF، Sanitization و Rate-Limit)
  - `media-optimizer.js` (موتور تبدیل تصاویر به WebP در ۴ سایز استاندارد در `/public/uploads/YYYY/MM/`)
  - `clean-code-checker.js` (تشخیص فایل‌های یتیم، توابع تکراری و فایل‌های بالای ۴۰۰ خط)
- [x] **P1.3:** سازمان‌دهی ساختار دایرکتوری‌های استاندارد (`/core/`, `/modules/`, `/themes/default/`, `/public/assets/vendor/`) و باندل محلی فونت Vazirmatn و مانیفست کتابخانه‌های آفلاین (Intranet-Ready) (`Done - v1.1.0`)
- [x] **P1.4:** ارتقای لایه دیتابیس دوگانه (SQLite فعال + PostgreSQL Connection Pool آماده از طریق `.env`) + پیاده‌سازی کش فوق‌سریع درون‌حافظه‌ای LRU سازگار با رابط Redis (`/src/server/core/cacheEngine.ts`) برای تحمل ترافیک ۱,۰۰۰,۰۰۰+ کاربر هم‌زمان (`Done - v1.1.0`)
- [x] **P1.5:** پیاده‌سازی هسته تقویم دوگانه شمسی/میلادی (`/src/core/jalali.ts`) + دیتاست بومی استان‌ها و شهرهای ایران و اعتبارسنج‌های کد ملی، کد پستی و موبایل (`/src/core/iran-geo.ts`) (`Done - v1.1.0`)
- [x] **P1.6:** بازطراحی پنل مدیریت با سایدبار استاندارد ۱۰ بخشی وردپرس‌گونه + تفکیک کامل نمای «لیست (List Table)» از نمای «ویرایشگر تمام‌صفحه (Dedicated Create/Edit View)» و پاک‌سازی پیام‌های راهنما/دمو از ویترین فروشگاه (`Done - v1.1.0`)
- [x] **P1.7:** اجرای ایجنت‌های ممیزی، به‌روزرسانی `PROJECT_GRAPH.json` و `TASKLIST.md`، ارتقای نسخه به `v1.1.0` و ارائه گزارش ممیزی فاز ۱ (`Done - v1.1.0`)

---

## PHASE 2: Production Media Engine, Multi-Size WebP, Taxonomies & 1000+ Catalog Scale (`v1.1.0` -> `v1.2.0`)
- [x] **P2.1:** پیاده‌سازی API آپلود فیزیکی (`POST /api/v1/media/upload`) متصل به `media-optimizer` با تولید ۴ سایز WebP (`25x25`, `300x300`, `800x600`, `original`) در `/public/uploads/YYYY/MM/` (`Done - v1.2.0`)
- [x] **P2.2:** ارتقای کتابخانه رسانه با آپلود چندتایی Drag & Drop، صفحه‌بندی سروری، جستجو و حذف کامل رشته‌های Base64 سنگین (`POST /api/v1/media/migrate-base64`) (`Done - v1.2.0`)
- [x] **P2.3:** ساخت سیستم طبقه‌بندی سلسله‌مراتبی پویا (Taxonomies: دسته‌بندی‌های مادر/فرزند نامحدود، برندها و برچسب‌ها با آیکون و تصویر در جدول `taxonomies`) (`Done - v1.2.0`)
- [x] **P2.4:** پیاده‌سازی صفحه‌بندی سروری (Server-Side Pagination)، فیلتر چندویژگی و عملیات گروهی (Bulk Actions) برای محصولات، نوشته‌ها، رسانه و سفارش‌ها (ایندکس‌شده برای ۱۰۰۰+ آیتم) (`Done - v1.2.0`)
- [x] **P2.5:** اجرای ممیزی، به‌روزرسانی گراف پروژه و انتشار گزارش فاز ۲ (`Done - v1.2.0`)

---

## PHASE 3: Dynamic Pages, Menu Builder, Visual Composer & Visual Invoice Designer (`v1.2.0` -> `v1.3.0`)
- [x] **P3.1:** ماژول مدیریت برگه‌ها (Pages CRUD) و مسیریابی پویا (`/:slug` و `/page/:slug`) با تنظیمات کامل سئو (Title, Description, Canonical, OpenGraph, JSON-LD) در جدول `pages` (`Done - v1.3.0`)
- [x] **P3.2:** ساخت منوساز پویا (Dynamic Menu Builder) برای هدر، فوتر و موبایل با قابلیت چیدمان تودرتو (زیرمنو) در جدول `menus` (`Done - v1.3.0`)
- [x] **P3.3:** ساخت صفحه‌ساز بصری Drag & Drop (Visual Page Composer با Muuri.js) با ردیف‌های ۱ تا ۴ ستونه، قابل استفاده در برگه‌ها، محصولات، نوشته‌ها و طراح قالب فاکتور (`Done - v1.3.0`)
- [x] **P3.4:** پیاده‌سازی ۱۸ ویجت ماژولار صفحه‌ساز (اسلایدر هیرو، ویرایشگر بلوکی، گرید محصولات، نمودار تاریخچه قیمت ۳۰ روزه، جدول لایسنس، ویدئو، گالری اسلایدر، آکاردئون FAQ، باکس دانلود، بنر CTA، شمارنده، باکس کد، نظرات، فرم، HTML سفارشی و ۳ المان تخصصی فاکتور رسمی/غیررسمی) (`Done - v1.3.0`)
- [x] **P3.5:** اجرای ممیزی، به‌روزرسانی گراف پروژه و انتشار گزارش فاز ۳ (`Done - v1.3.0`)

---

## PHASE 4: Storefront, Single Product, Slide-Over Modal Checkout & Magazine Archive (`v1.3.0` -> `v1.4.0`)
- [x] **P4.1:** ارتقای صفحه تکی محصول (`/product/:slug`) شامل گالری چندتصویری + ویدئو + بزرگ‌نمایی GLightbox، باکس خرید چسبان با متغیرها، محاسبه‌گر اقساط BNPL، نمودار قیمت ۳۰ روزه، مشخصات فنی، لینک‌سازی داخلی سئو، محصولات مرتبط و بدنه کامپوزر (`Done - v1.4.0`)
- [x] **P4.2:** سبد خرید و تسویه‌حساب کشویی یک‌مرحله‌ای (Slide-Over Drawer Modal) با ورود OTP درون‌خطی، تشخیص هوشمند محصول دیجیتال/فیزیکی (نمایش فیلدهای استان/شهر/کدپستی فقط برای کالای فیزیکی) و تفکیک پرداخت نقدی از اقساطی (`Done - v1.4.0`)
- [x] **P4.3:** ارتقای آرشیو مجله و مقالات به چیدمان تحریریه (Yahoo News / Editorial Magazine Layout) (`Done - v1.4.0`)
- [x] **P4.4:** یکپارچه‌سازی کامل Barba.js، Lenis و GSAP با بارگذاری شرطی و حذف ۱۰۰٪ متون راهنما/دمو از ویترین (`Done - v1.4.0`)
- [x] **P4.5:** اجرای ممیزی، به‌روزرسانی گراف پروژه و انتشار گزارش فاز ۴ (`Done - v1.4.0`)

---

## PHASE 5: Payzito-Style Payment Hub, Inventory/Accounting, Gravity Forms & YITH Suite (`v1.4.0` -> `v1.5.0`)
- [x] **P5.1:** ماژول `mod_payment_hub` (هاب یکپارچه درگاه‌های بانکی شاپرک + درگاه‌های اقساطی BNPL شامل اسنپ‌پی، ترب‌پی، دیجی‌پی، تارا، ازکی‌وام، آنیسا، کالاپی، کالانو، قسطی با قوانین تخفیف نقدی و کارمزد اقساط) (`Done - v1.5.0`)
- [x] **P5.2:** ماژول `mod_inventory_accounting` (کنترل موجودی لحظه‌ای، رزرو موقت موجودی سبد خرید در ترافیک بلک‌فرایدی، دفتر کل حسابداری، مالیات، سود خالص و خروجی مالی) (`Done - v1.5.0`)
- [x] **P5.3:** ماژول `mod_forms` (فرم‌ساز پیشرفته چندمرحله‌ای با منطق شرطی، فیلدهای محاسباتی، فیلدهای بومی کد ملی/کد پستی/استان-شهر، آپلود فایل، ضداسپم Honeypot و خروجی Excel/CSV/PDF) (`Done - v1.5.0`)
- [x] **P5.4:** ماژول `mod_ecommerce_suite` (حمل‌ونقل پست پیشتاز/تیپاکس/پیک، صدور فاکتور رسمی A4 با کد اقتصادی و QR، لیست علاقه‌مندی، مقایسه، اطلاع‌رسانی موجود شدن با پیامک، کیف پول و کش‌بک، حالت کاتالوگ و فید زنده ترب و ایمالز `/api/v1/feeds/torob` و `/emalls`) (`Done - v1.5.0`)
- [x] **P5.5:** اجرای ممیزی، به‌روزرسانی گراف پروژه و انتشار گزارش فاز ۵ (`Done - v1.5.0`)

---

## PHASE 6: Goftino-Style Live Chat, Native Analytics + Search Console, AI Digikala Importer & Auto-Backup (`v1.5.0` -> `v1.6.0`)
- [x] **P6.1:** ماژول `mod_live_chat` (گفتگوی آنلاین بومی مشابه گفتینو در گوشه فروشگاه + صندوق پاسخ‌گویی اپراتور ادمین با ارسال فایل و تاریخچه) (`Done - v1.6.0`)
- [x] **P6.2:** ماژول `mod_analytics_gsc` (آنالیتیکس بومی بازدیدها بدون نیاز به اینترنت خارجی + اتصال به Google Search Console API + گزارش فروش استانی/شهری) (`Done - v1.6.0`)
- [x] **P6.3:** ماژول `mod_ai_digikala` (ایمپورت مشخصات و تصاویر محصول از دیجی‌کالا، بازنویسی محتوا با هوش مصنوعی، امتیازدهی زنده سئو مشابه Yoast/RankMath، پیشنهاد لینک داخلی و تولید دیدگاه) (`Done - v1.6.0`)
- [x] **P6.4:** ماژول‌های `mod_seo_redirects` و `mod_booking` (تولید پویا `sitemap.xml`، `robots.txt`، مانیتور 404، ریدایرکت 301/302 و سیستم نوبت‌دهی شمسی) (`Done - v1.6.0`)
- [x] **P6.5:** ماژول `mod_auto_backup` (بکاپ خودکار زمان‌بندی‌شده رمزنگاری‌شده ZIP از دیتابیس و `/uploads` با قابلیت وب‌هوک/S3) (`Done - v1.6.0`)
- [x] **P6.6:** اجرای ممیزی نهایی کل سیستم، تکمیل `TASKLIST.md` و انتشار گزارش نهایی فاز ۶ (`Done - v1.6.0`)

---

## PHASE 7: Jony Ive Precision UI/UX Overhaul, Mobile App Experience & Design Guardian Agent (`v1.6.0` -> `v2.0.0`)
- [x] **P7.1:** ایجاد قانون اساسی طراحی `/DESIGN_SYSTEM_SKILL.md` و ایجنت دائمی ممیزی رابط کاربری `/core/agents/design-system-auditor.js` (ثبت در `PROJECT_GRAPH.json`) (`Done - v2.0.0`)
- [x] **P7.2:** جراحی ناوبری و رفع کامل Scroll-Trap در ادمین و ویترین (`window.scrollTo({ top: 0, behavior: 'smooth' })` در تمامی کلیک‌های منو، تب‌ها و دکمه‌های ویرایش) + کشوی موبایلی سایدبار ۱۰ بخشی ادمین (`Done - v2.0.0`)
- [x] **P7.3:** بازطراحی ویرایشگر محصول (`CatalogEditorPanel.tsx`) و نوشته (`ArticlesSeoPanel.tsx`) به گرید ۱۲ ستونه وردپرسی (`8 ستون اصلی راست` با نوار ابزار کامل Rich Text + `4 ستون سایدبار چسبان چپ` با کارت انتشار، پیش‌نمایش زنده تصویر شاخص و گالری ۵ اسلاته، دسته‌بندی، قیمت و گیج زنده سئو RankMath) (`Done - v2.0.0`)
- [x] **P7.4:** ارتقای ارگونومی صفحه‌ساز بصری (`VisualComposerCanvas.tsx`) به سبک المنتور با بلوک‌های بصری فشرده در بوم و کشوی بازرس تنظیمات کناری (Slide-Over Side Inspector Drawer) (`Done - v2.0.0`)
- [x] **P7.5:** ارتقای عمق بصری ویترین فروشگاه (`StorefrontView.tsx` و `SingleProductView.tsx`) با افکت‌های سه‌بعدی هاور، چیدمان متوازن، منوهای کامل و محتوای ۱۰۰٪ اصیل فارسی برای بازارچه اسکیل‌ها و ایجنت‌های هوش مصنوعی (`Done - v2.0.0`)
- [x] **P7.6:** بازطراحی تجربه اپلیکیشن بومی موبایل (`< 768px`) شامل نوار تب پایین iOS با بج زنده سبد خرید و اهداف لمسی `44px+`، اسکرول افقی لمسی دسته‌بندی‌ها و کارت‌های داده موبایلی بدون اسکرول افقی مزاحم (`Done - v2.0.0`)
- [x] **P7.7:** اجرای هر ۵ ایجنت حاکمیتی، رفع باگ‌های سرور (ورود کد مستر، حذف کامل بنر شبیه‌ساز OTP و ناوبری مستقیم دکمه مدیریت پس از ورود)، کامپایل و تایپ‌چک بدون خطا، ارتقای نسخه هسته به `v2.0.0` و انتشار گزارش نهایی فاز ۷ (`Done - v2.0.0`)

---

## PHASE 8: Admin Focus UX, Compact Media Grid, Customer Masonry Dashboard & 2026 Content Overhaul (`v2.0.0` -> `v2.1.0`)
- [x] **P8.1:** جمع‌وجورسازی جعبه ابزار ۱۸ ویجت صفحه‌ساز به نوار افقی تمام‌عرض بالای بوم بدون اسکرول افقی/عمودی دوگانه (`VisualComposerCanvas.tsx`) (`Done - v2.1.0`)
- [x] **P8.2:** انتقال پنل تنظیمات ویجت صفحه‌ساز از کشوی چسبیده به چپ به مودال شناور متمرکز در وسط صفحه (`Done - v2.1.0`)
- [x] **P8.3:** منوی سمت راست کشویی و جمع‌شونده خودکار (`68px` Icon-Only Rail) هنگام ورود به تمامی ویرایشگرهای محتوا و صفحه‌ساز با دکمه دستی باز/بسته‌شدن (`AdminCmsView.tsx`) (`Done - v2.1.0`)
- [x] **P8.4:** بازطراحی کتابخانه رسانه به گرید مربعی فشرده سبک وردپرس (تا ۸ ستون) + مودال جزئیات، ۴ سایز WebP، سئوی خودکار و حذف دائمی (`MediaLibraryPanel.tsx`) (`Done - v2.1.0`)
- [x] **P8.5:** رفع کامل هم‌پوشانی فرم طراح فاکتور (`MenuBuilderInvoicePanel.tsx`) + افزودن آپلودر فیزیکی مستقیم لوگو و فاوآیکون با پیش‌نمایش زنده (`AiSessionsThemePanel.tsx` و `EnterpriseCoreHubPanel.tsx`) (`Done - v2.1.0`)
- [x] **P8.6:** رفع کامل حلقه چشمک‌زن خطای ۴۰۱ در پنل دیتابیس و بکاپ (`DbBackupPanel.tsx`) (`Done - v2.1.0`)
- [x] **P8.7:** بازطراحی پیشخوان مشتری عادی به سبک Masonry (الهام‌گرفته از Pinterest/Apple) با حذف کامل متون و تنظیمات ادمین و محدودسازی نشست‌ها به کاربر جاری (`CustomerDashboardView.tsx`) (`Done - v2.1.0`)
- [x] **P8.8:** بازنویسی محتوای واقعی ۲۰۲۵–۲۰۲۶ شامل ۶ اسکیل/کتابخانه جدید (`Context7/Playwright/Figma MCP`, `Cursor .mdc + Caveman`, `Motion WAAPI + Anime.js v4`, `Three.js WebGPU`, `TanStack + Zustand`, `Hono + Drizzle + Biome`) و ۶ مقاله مهندسی با لینک‌های داخلی قابل کلیک سئو (`Done - v2.1.0`)

---

## PHASE 9: Media Picker Modal + Video Player, Priority Inbox, 16 Payment & 12 SMS Hubs, Smart CRM, VIP Subscriptions & Tabbed Settings (`v2.1.0` -> `v2.2.0`)
- [x] **P9.1:** مودال انتخاب و آپلود رسانه (تصویر و ویدیو) درون ویرایشگر محصول و نوشته بدون پرش به صفحه رسانه + حذف کامل نوار تصاویر زیر تصویر شاخص + تبدیل خودکار هر فرمت تصویر به ۴ سایز WebP و انتخاب هوشمند سایز متناسب + درج پلیر ویدیو (`MediaPickerModal.tsx`, `mediaEngineRouter.ts`, `ArticlesSeoPanel.tsx`, `CatalogEditorPanel.tsx`, `ArticlesView.tsx`) (`Done - v2.2.0`)
- [x] **P9.2:** ارتقای صندوق پیام‌های زنده (`GoftinoOperatorInboxPanel.tsx` و `liveChatRouter.ts`) با سیستم اولویت‌بندی (`فوری/بالا/عادی/کم`) و چیدمان ردیفی تمام‌عرض که با کلیک روی هر ردیف تمام مکالمات و فرم پاسخ اپراتور باز شود (`Done - v2.2.0`)
- [x] **P9.3:** بازطراحی پنل درگاه‌های پرداخت (`PaymentGatewaysPanel.tsx`) به لیست فشرده ۱۶ درگاه نقدی و اقساطی (بسته در حالت پیش‌فرض) + یک کارت تنظیمات اختصاصی در پایین برای درگاه انتخاب‌شده + امکان فعال‌سازی همزمان چند درگاه نقدی و اقساطی (`Done - v2.2.0`)
- [x] **P9.4:** توسعه پنل پیامک (`SmsTriggersPanel.tsx` و `smsService.ts`) به ۱۲ درگاه پیامکی ایرانی (ملی‌پیامک، کاوه‌نگار، فراز اس‌ام‌اس، پارس‌گرین، ایران‌پیامک، تسنیم اس‌ام‌اس، سوات پیامک، پیامک‌سرا، SMS.ir، قاصدک، مگفا، فراپیامک) با انتخاب و پیکربندی تکی زیر لیست (`Done - v2.2.0`)
- [x] **P9.5:** پیاده‌سازی ماژول هوشمندی مشتریان و پیشنهاد خودکار بر اساس خرید و علایق (`mod_smart_crm`) با جداول مستقل، موتور تطبیق خودکار هنگام به‌روزرسانی محصول و نمایش پیشنهادهای هوشمند در پیشخوان مشتری (`Done - v2.2.0`)
- [x] **P9.6:** پیاده‌سازی ماژول خرید اشتراک VIP (`mod_subscriptions`) با ۴ پلن قابل پیکربندی (یک‌ماهه، سه‌ماهه، شش‌ماهه، سالانه)، توضیحات و دسته‌بندی‌های مشمول، فعال/غیرفعال‌سازی ماژول و باز شدن خودکار اسکیل‌ها و آپدیت‌های جدید برای مشترکین (`Done - v2.2.0`)
- [x] **P9.7:** مرکز کنترل ماژول‌های سایت (`ModulesControlCenterPanel.tsx` و `/api/v1/modules/registry`) با امکان تیک‌زدن ماژول‌های فعال هر سایت (تنظیمات و ابزارهای مجزای هر ماژول + همگام‌سازی زنده با سایدبار و ویترین) (`Done - v2.2.0`)
- [x] **P9.8:** تجمیع تنظیمات سیستم در بخش واحد «تنظیمات عمومی و سیستم» با تب‌های چندخطی بدون اسکرول (`عمومی/لوگو/فاوآیکون`، `تقویم شمسی و جغرافیا`، `درگاه‌های پرداخت`، `درگاه‌های پیامکی`، `هوش مصنوعی`، `نقش‌ها و نشست‌ها`، `دیتابیس و بکاپ`) و کوتاه‌سازی منوی سایدبار ادمین (`Done - v2.2.0`)
- [x] **P9.9:** اجرای هر ۵ ایجنت حاکمیتی، کامپایل و لینت بدون خطا، به‌روزرسانی `TASKLIST.md` به نسخه `v2.2.0` و ارائه گزارش ممیزی کامل تسک‌های دو پیام اخیر (`Done - v2.2.0`)

---

## PHASE 10: Gallery Pickers, Composer Structure & Spotlight UX, SEO/AI Crawl Controls, Footer Trust Badges, Sticky Frosted Header & Bidirectional Motion (`v2.2.0` -> `v2.3.0`)
- [x] **P10.1:** افزودن گالری تصاویر اختصاصی در هر دو ویرایشگر محصول (`CatalogEditorPanel.tsx`) و نوشته (`ArticlesSeoPanel.tsx`) متصل به مودال رسانه (نمایش صرفاً تصاویر اضافه‌شده با امکان حذف و مرتب‌سازی + نمایش گالری در صفحه تکی مقاله و محصول) (`Done - v2.3.0`)
- [x] **P10.2:** ارتقای صفحه‌ساز بصری (`VisualComposerCanvas.tsx`) با دکمه بارگذاری ساختار پیش‌فرض محتوا (عنوان، چکیده و متن اصلی) + اسکرول نرم خودکار و هایلایت چشمک‌زن (`composer-just-added` + بج «اینجا اضافه شد ✓») هنگام افزودن هر ردیف یا ویجت (`Done - v2.3.0`)
- [x] **P10.3:** پیاده‌سازی تیک کنترل دیده‌شدن سایت توسط موتورهای جستجو (پیش‌فرض غیرفعال/`noindex` + `Disallow: /`) و تیک مستقل هوش‌های مصنوعی (`GPTBot`، `ClaudeBot`، `PerplexityBot` و تولید پویا `/llms.txt` و `/robots.txt`) در بک‌اند سئو و پنل‌های مدیریت (`SeoVisibilityControlCard.tsx`, `seoRedirectsRouter.ts`) (`Done - v2.3.0`)
- [x] **P10.4:** بازطراحی فوتر (`SiteFooter.tsx`) با حذف ستون‌های دسترسی سریع و دسته‌بندی و جایگزینی با ۲ جایگاه مجوز و نماد اعتماد (اینماد + مجوز دوم) با قابلیت سوییچ بین «تصویر محلی انتخابی» و «کد HTML مستقیم» در تنظیمات عمومی (`UnifiedSettingsHubPanel.tsx`) (`Done - v2.3.0`)
- [x] **P10.5:** چسبان و شیشه‌ای‌کردن هدر (`SiteHeader.tsx` با `sticky top-0` + `backdrop-blur-2xl` + نوار پیشرفت اسکرول) + رفع باگ دوکلیکی کارت‌های Claude/ChatGPT/Codex (اسکرول یک‌کلیکی نرم با Lenis) + اصلاح تیتر «مخزن اسکیل‌های آماده با گواهی تخصصی» (`Done - v2.3.0`)
- [x] **P10.6:** پیاده‌سازی افکت ورود و خروج دوطرفه عناصر هنگام اسکرول به پایین و بالا (`motionAndDragEngine.ts`)، بارگذاری تدریجی Blur-Up تصاویر (`ProgressiveImage.tsx`) و جایگزینی کامل تصاویر قدیمی با ۴ تصویر اختصاصی مهندسی هوش مصنوعی (`Done - v2.3.0`)
- [x] **P10.7:** اجرای کامل `compile_applet`، `lint_applet` و هر ۵ ایجنت حاکمیتی (۰ آسیب‌پذیری امنیتی و ۶/۶ ممیزی سیستم طراحی) و ریستارت سرور توسعه (`Done - v2.3.0`)

---

## PHASE 11: Compact Hover Live Chat, Telegram Glass Mobile Island, Desktop-Only Sticky Header, eNamad Code+Image Override, Gateway Storefront Selection & Full Separation of Messages/Forms/Shipping (`v2.3.0` -> `v2.4.0`)
- [x] **P11.1:** تبدیل دکمه شناور گفتگوی آنلاین (`GoftinoLiveChatWidget.tsx`) به آیکون دایره‌ای فشرده با نقطه سبز چشمک‌زن زنده؛ نمایش کشویی متن «گفتگوی آنلاین پشتیبانی» صرفاً با هاور ماوس و باز شدن مستقیم چت با کلیک (`Done - v2.4.0`)
- [x] **P11.2:** بازطراحی نوار ناوبری پایین موبایل (`MobileBottomNav.tsx`) به سبک داک جزیره‌ای شیشه‌ای شناور تلگرام با بلور عمیق (`backdrop-blur-2xl`)، شفافیت بالای پس‌زمینه و هایلایت کپسولی تب فعال (`Done - v2.4.0`)
- [x] **P11.3:** اصلاح هدر چسبان شیشه‌ای (`SiteHeader.tsx`) به حالت `fixed` اختصاصی دسکتاپ (`md:` و بالاتر) همراه با اسپیسر دقیق تا روی دسکتاپ همراه اسکرول بیاید و در موبایل کاملاً ثابت در بالای صفحه بماند (`Done - v2.4.0`)
- [x] **P11.4:** بازطراحی تنظیمات و رندر اینماد و مجوز دوم (`SiteFooter.tsx` و `UnifiedSettingsHubPanel.tsx`) به شکل اصیل ایرانی: کادر تکه کد HTML اصلی همیشه محور کار است و با تیک اختیاری می‌توان سورس `<img>` داخل همان کد را با تصویر محلی گالری رسانه جایگزین کرد (بدون از دست رفتن لینک و کد تاییدیه اینماد) (`Done - v2.4.0`)
- [x] **P11.5:** حذف دکمه‌های دوحالته نمایش درگاه در پنل پرداخت (`PaymentGatewaysPanel.tsx` و `App.tsx`) و جایگزینی با حالت واحد «نمایش درگاه/های انتخاب‌شده در سایت» + تیک مستقل «نمایش در سایت» (`showOnStorefront`) جدا از «فعال/خاموش» برای هر درگاه (`Done - v2.4.0`)
- [x] **P11.6:** تفکیک کامل ۳ بخش مجزا در پنل مدیریت: ۱) بخش مستقل «پیام‌ها و تیکت‌های پشتیبانی» با دکمه و فرم «ایجاد پیام / تیکت جدید» و مشاهده/پاسخ‌گویی همه پیام‌ها (`GoftinoOperatorInboxPanel.tsx`, `liveChatRouter.ts`)، ۲) بخش مستقل «فرم‌ها و فرم‌ساز» با لیست فرم‌ها، ویرایشگر فیلدها و صندوق ورودی کاملاً مجزا به تفکیک هر فرم (`FormsManagerPanel.tsx`, `formsEngineRouter.ts`)، و ۳) تب «حمل‌ونقل و ارسال» درون «تنظیمات عمومی و سیستم» (`ShippingSettingsPanel.tsx`, `ecommerceSuiteRouter.ts`, `UnifiedSettingsHubPanel.tsx`) (`Done - v2.4.0`)
- [x] **P11.7:** کامپایل، لینت TypeScript، اجرای هر ۵ ایجنت حاکمیتی، ریستارت سرور و تست زنده عملیاتی (`curl`) تمامی APIها و بخش‌های سیستم (`Done - v2.4.0`)
- [x] **P11.8:** اجرای کامل ایجنت‌های حاکمیتی پیش از Remix (`project-indexer`, `security-auditor`, `media-optimizer`, `clean-code-checker`, `design-system-auditor`)، همگام‌سازی خودکار نسخه `v2.4.0` در `PROJECT_GRAPH.json`، `PROJECT_MAP.md`، `modules/registry.json` و `themes/default/theme.json` و ثبت گزارش اسنپ‌شات آماده برای Remix (`Done - v2.4.0`)

---

## PHASE 12: Final Base CMS (`v2.4.0` -> `v2.5.0`) — Dual-Theme Registry, Isolated Academy Module, Zero-Leak Downloadable Products & Product Editor UX Overhaul
- [x] **P12.1:** نصب کامل پوسته دوم «آکادمی فاتحان» (`/themes/fatehan/`، فونت‌های فارسی `/public/fonts/` و دارایی‌های بصری `/public/assets/` از `fatehan-export/`) با ایزولاسیون کامل CSS (`.fatehan-theme-shell`) و بارگذاری تنبل `React.lazy` جهت جلوگیری از هرگونه تداخل با پوسته پیش‌فرض (`Done - v2.5.0`)
- [x] **P12.2:** ساخت ماژول کاملاً ایزوله و قابل روشن/خاموش «آکادمی، دوره‌ها، شهریه و بانک ایده‌ها» (`/modules/mod_academy_suite/`) با ۵ جدول دیتابیس مجزا (`mod_academy_departments`، `mod_academy_courses`، `mod_academy_announcements`، `mod_academy_ideas`، `mod_academy_consultations`)، APIهای `/api/v1/modules/academy/*` و پنل مدیریت ۵ تب؛ ثبت در `modules/registry.json` و «مرکز کنترل ماژول‌ها» با وضعیت پیش‌فرض **خاموش (`enabled: false`)** (`Done - v2.5.0`)
- [x] **P12.3:** ساخت رجیستری واقعی پوسته‌ها (`/themes/registry.ts`) برای هر دو پوسته `default` و `fatehan`، اتصال `src/App.tsx` و افزودن کارت «انتخاب پوسته فعال ویترین سایت (سوییچ ۱-کلیکی)» در تب عمومی تنظیمات (`UnifiedSettingsHubPanel.tsx`) + اتصال کامل `/themes/fatehan/context/cmsApiAdapter.ts` به اندپوینت‌های واقعی هسته (`Done - v2.5.0`)
- [x] **P12.4:** پیاده‌سازی کامل سیستم محصولات دانلودی امن (Zero-Leak Protected Downloads): انتخاب نوع محصول (`دانلودی` / `فیزیکی` / `اشتراکی VIP`)، آپلود مستقیم در پوشه مسدودشده `_protected_downloads` (خطای ۴۰۳ برای دسترسی عمومی) یا ثبت لینک هاست دانلود اختصاصی با پروکسی سروری مخفی و توکن موقت HMAC-SHA256 در `/api/v1/downloads/*` + تب اختصاصی «دانلودهای خریداری‌شده» در کنار «سابقه خرید و سفارش‌ها» در پنل کاربری مشتری (`CustomerDashboardView.tsx`) (`Done - v2.5.0`)
- [x] **P12.5:** انتقال کامل باکس «سنجش زنده سئو (RankMath SEO)» در ویرایشگر محصول (`CatalogEditorPanel.tsx`) از سایدبار سمت چپ به ستون اصلی وسط + اصلاح دکمه هدر (`SiteHeader.tsx` و `StorefrontHeader.tsx`) به «ورود / ثبت‌نام» پیش از لاگین و «پنل کاربری» پس از لاگین (`Done - v2.5.0`)
- [x] **P12.6:** قفل کامل سازگاری با Ubuntu + Docker + Traefik (`app.set('trust proxy', 1)` و یکپارچگی `UPLOAD_DIR` روی `/app/uploads`) و تایید Drag & Drop مرتب‌سازی گالری تصاویر محصول و نوشته + اجرای کامل کامپایل، لینت TypeScript، هر ۵ ایجنت حاکمیتی و تست زنده APIها (`Done - v2.5.0`)

---

## PHASE 10 (Master Upgrade `v2.5.0` -> `v2.6.0`): Dependency Guard, Granular RBAC, Full DB Backup + Cleaners, Zero-Leak Editable Attachments, Real-Time Live Chat, Offline Captcha, Unified Delivery Logs & 10 Modular Plugins + GA4 Core Web Vitals
- [x] **P10-V26.1 (Module Dependency Guard):** افزودن فیلد `dependencies: string[]` به `modules/registry.json` و `DEFAULT_SITE_MODULES_REGISTRY` همراه با مودال هشدار و تغییر آبشاری یک‌کلیکی در `ModulesControlCenterPanel.tsx` (`Done - v2.6.0`)
- [x] **P10-V26.2 (Full Granular RBAC Matrix):** پیاده‌سازی ماتریس دسترسی ۵ عملیاتی (`view`, `create`, `edit`, `delete`, `settings`) روی ۱۵ منو و ماژول با امضای رمزنگاری‌شده `HMAC-SHA256` (`rbacMatrix.ts`, `rbacMatrixRouter.ts`, `RbacMatrixEditorCard.tsx`) (`Done - v2.6.0`)
- [x] **P10-V26.3 (Full DB Backup + Selective Demo Cleaner + Orphan Media Cleaner):** ارتقای `backupService.ts` به کشف خودکار ۱۰۰٪ جداول Core و `mod_*` در SQLite/PostgreSQL + پاک‌ساز انتخابی داده‌های دمو با ۶ تیک مجزا و حفظ سوپر ادمین + اسکنر و پاک‌ساز فایل‌های بلااستفاده `/uploads` با محافظت کامل از `_protected_downloads` (`maintenanceCleanersRouter.ts`, `MaintenanceCleanersCard.tsx`) (`Done - v2.6.0`)
- [x] **P10-V26.4 (Editable Product Attachment Names + Zero-Leak):** امکان ویرایش مستقیم عنوان نمایشی هر فایل پیوست دانلودی (آپلودی و هاست دانلود) درون ویرایشگر محصول (`CatalogEditorPanel.tsx`) با حفظ ۱۰۰٪ مخفی‌سازی لینک واقعی و دانلود صرفاً از طریق توکن امضاشده کوتاه‌مدت سرور (`Done - v2.6.0`)
- [x] **P10-V26.5 (Real-Time Live Chat + Native Offline Captcha + Unified Delivery Logs):** ارتقای `GoftinoLiveChatWidget.tsx` به نشست مجزای هر بازدیدکننده، همگام‌سازی خودکار ۳.۵ ثانیه‌ای و بج خوانده‌نشده + کپچای آفلاین SVG با امضای HMAC (`captchaService.ts`, `OfflineCaptchaWidget.tsx`) + ماژول لاگ یکپارچه ارسال‌ها (`mod_delivery_logs`) متصل به پیامک، وب‌پوش، ربات‌ها و وب‌هوک‌ها (`Done - v2.6.0`)
- [x] **P10-V26.6 (10 Modular Plugins + AES-256-GCM Secret Vault + GA4 Core Web Vitals):** پیاده‌سازی کامل ۱۰ افزونه مستقل و قابل روشن/خاموش (`mod_notifications_pwa` همراه با مانیفست PWA، آیکون‌های PNG، Service Worker و VAPID رمزنگاری‌شده، `mod_abandoned_cart`، `mod_announcements_popups`، `mod_reviews_qa`، `mod_wallet_rma`، `mod_affiliate`، `mod_b2b_compare`، `mod_bots_webhooks` برای بله/ایتا/تلگرام و وب‌هوک HMAC، `mod_maintenance_audit` و `mod_i18n` سه زبانه RTL/LTR) + خزانه رمزنگاری `AES-256-GCM` (`secretVault.ts`) و پایش زنده Core Web Vitals (`LCP/CLS/INP/TTFB`) در `mod_analytics_gsc` (`Done - v2.6.0`)
- [x] **P10-V26.7 (Governance Audit Gate v2.6.0):** کامپایل، لینت TypeScript، اجرای هر ۵ ایجنت حاکمیتی، ریستارت سرور توسعه و تایید عملیاتی زنده (`curl`) تمامی اندپوینت‌های `v2.6.0` (`Done - v2.6.0`)

---

## PHASE 11 (Master Upgrade `v2.6.0` -> `v2.7.0`): Unified AI Hub (`mod_ai_hub_agent`), 3-Slot Routing, Strict Super Admin Isolation, 24/7 Autonomous Agent & Smart Live Chat Escalation
- [x] **P11-V27.1 (Unified `mod_ai_hub_agent` + 5 Isolated Tables):** تجمیع قابلیت‌های هوش مصنوعی در یک ماژول قابل روشن/خاموش (`/modules/mod_ai_hub_agent/`) با ۵ جدول ایزوله (`mod_ai_provider_configs`, `mod_ai_agent_skills`, `mod_ai_agent_tasks`, `mod_ai_agent_conversations`, `mod_ai_approval_queue`) و ثبت در `modules/registry.json` و `DEFAULT_SITE_MODULES_REGISTRY` (`Done - v2.7.0`)
- [x] **P11-V27.2 (3-Slot Multi-Provider Routing + AES-256-GCM Vault + HTTP 403 Super Admin Isolation):** پیاده‌سازی ۳ اسلات مجزا (`text_seo`, `image_visual`, `agent_core`) با پشتیبانی `Gemini`, `Custom OpenAI-Compatible`, و `Ollama`، رمزنگاری کلیدها با `AES-256-GCM` (نمایش ماسک‌شده در API) و مسدودسازی قطعی دسترسی ادمین عادی به اندپوینت‌های هسته ایجنت ۲۴/۷ با `HTTP 403` (`Done - v2.7.0`)
- [x] **P11-V27.3 (24/7 Autonomous Agent, SKILL.md Memory, 1-Click Approval Queue, Voice Command Center & Bot Bridge):** پیاده‌سازی مرکز فرماندهی آماده ویس فارسی (Web Speech API)، حالت سبک در برابر حالت پیشرفته ۲۴/۷، حافظه یادگیرنده `SKILL.md`، صف تایید ۱-کلیکی، تسک‌های زمان‌بندی‌شده و پل ربات بله/ایتا/تلگرام متصل به `mod_delivery_logs` (`Done - v2.7.0`)
- [x] **P11-V27.4 (AI Image Prompt & Visual Studio in Editors):** پیاده‌سازی ویجت `AiImageStudioWidget` در ویرایشگر محصول (`CatalogEditorPanel.tsx`)، ویرایشگر مقاله (`ArticlesSeoPanel.tsx`) و پنل AI Hub برای تولید پرامپت حرفه‌ای دوزبانه و ساخت مستقیم تصویر شاخص (`Done - v2.7.0`)
- [x] **P11-V27.5 (Global Admin Chat Alarm in Admin Header):** پیاده‌سازی نوار/زنگوله هشدار زنده و سراسری `AdminGlobalChatAlarm` در هدر دسکتاپ و موبایل کل پنل ادمین با افکت چشمک‌زن، صدای آلارم ملایم Web Audio قابل بی‌صدا کردن، نوتیفیکیشن مرورگر PWA و پرش ۱-کلیکی مستقیم به همان مکالمه (`Done - v2.7.0`)
- [x] **P11-V27.6 (Logged-In Exclusive Urgent Priority + Inline OTP Login Inside Chat + `update_visitor_user_profile` Tool):** محدودسازی سرورساید اولویت «فوری» به کاربران لاگین‌شده، فرم ورود/ثبت‌نام درون‌خطی موبایل و OTP داخل پنجره چت بدون رفرش (`ChatInlineOtpCard.tsx`, `/api/v1/modules/live-chat/link-session`) و تکمیل خودکار نام کاربر در جدول `users` توسط ابزار بک‌اند `update_visitor_user_profile` ایجنت (`Done - v2.7.0`)
- [x] **P11-V27.7 (Governance Audit Gate v2.7.0):** کامپایل، لینت TypeScript، اجرای هر ۵ ایجنت حاکمیتی، ریستارت سرور توسعه و تست زنده HTTP (رمزنگاری کلید، خطای ۴۰۳ ادمین عادی، چت و تکمیل پروفایل، پرامپت تصویر) (`Done - v2.7.0`)

---

## PHASE 13: v2.8.0 — AUTONOMOUS AGENT TOOLS, MEMORY, VOICE SLOT 4, BALE BRIDGE & BULLETPROOF BACKUP
- [x] **13.1.1 Bulletproof Schema-Tolerant JSON & SQL Backup/Restore** (PostgreSQL + SQLite, zero silent errors, exact restored rows/tables count, HTTP 422 on 0-row failure).
- [x] **13.1.2 Add AI Hub Slot 4 (`voice_audio`) & GapGPT Whisper STT** (`gapgpt/whisper-1`, AES-256-GCM key, replace broken browser Web Speech API with `MediaRecorder` + `/api/v1/modules/ai-hub/agent/transcribe`).
- [ ] **13.2.1 Per-User & Per-Role Agent Memory DB Tables + Always-On `SKILL.md` Injection** (separate memory/history for `super_admin`, `admin`, `customer`, `guest` with zero cross-user leakage).
- [ ] **13.2.2 Real Multi-Step Tool-Calling Engine (8 CMS Tools)** (`inspect_site_capabilities`, `search_site_catalog`, `read_system_logs`, `save_learned_skill`, `trigger_chat_otp_box`, `update_visitor_user_profile`, `create_or_submit_user_request`, `create_site_form`).
- [ ] **13.2.3 Interactive Storefront Live Chat Inline OTP Box** (`uiAction: 'OPEN_INLINE_OTP'` renders/expands mobile + OTP signup directly inside chat).
- [ ] **13.3.1 24/7 Agent ↔ Bale Bot Proactive Alert & Approval Bridge** (push alerts to Super Admin Bale `chat_id` for new requests, successful/failed orders, critical `system_logs` errors, and sensitive action approvals).
- [ ] **13.3.2 Fix Bale Safir OTP OAuth2 Flow (`HTTP 401`)** (separate Bot API token from Safir `client_id`/`client_secret` OAuth2 token exchange).

