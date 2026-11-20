import type { ArchitecturePhase, SkillArticle, SkillProduct, StarterFileEntry } from '../core/types.js';
import { IMAGES } from './defaults.js';
import { ADDITIONAL_VERIFIED_SKILLS } from './verifiedSkillsCatalog.js';

export const INITIAL_SKILL98_CATALOG: SkillProduct[] = [
  // 1. FREE GITHUB SKILL: Muuri Interactive Grid & Drag Layout
  {
    id: 'skill-muuri-interactive-grid',
    title: 'اسکیل چیدمان شبکه‌ای، فیلترینگ و جابه‌جایی المان‌ها با Muuri.js',
    slug: 'skill-muuri-interactive-grid',
    category: 'Codex',
    subCategory: 'چیدمان تعاملی و گرید پویا',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'پیاده‌سازی گریدهای واکنش‌گرا، قابل مرتب‌سازی (Sortable) و قابل جابه‌جایی با ماوس یا لمس به کمک کتابخانه محبوب Muuri بدون تداخل با استیت‌های React.',
    modulesCount: 5,
    durationHours: 1,
    level: 'نسخه ۲.۰ · رایگان',
    version: 'v2.0.0',
    imageUrl: IMAGES.fullstackPkg,
    imageAlt: 'اسکیل چیدمان شبکه‌ای و جابه‌جایی کارت‌ها با کتابخانه Muuri',
    featured: true,
    status: 'published',
    authorId: 'admin',
    posterCode: 'MUURI / ۰۱',
    posterTagEn: 'MUURI GRID ENGINE',
    posterColor: 'sage',
    posterIconType: 'grid',
    githubSourceRepo: 'haltu/muuri (Interactive Layout Skill)',
    seoTitle: 'دانلود رایگان اسکیل Muuri.js برای ساخت گریدهای قابل جابه‌جایی | اسکیل ۹۸',
    seoDescription:
      'راهنما و اسکیل استاندارد استفاده از کتابخانه Muuri برای ایجاد کارت‌ها و داشبوردهای قابل جابه‌جایی، مرتب‌سازی و فیلترینگ زنده.',
    seoKeywords: 'کتابخانه Muuri, Muuri.js, جابجایی المان های وبسایت, گرید تعاملی, اسکیل Codex',
    expectedOutput:
      'کد کامل راه‌اندازی Muuri در پروژه‌های مدرن به همراه قابلیت Drag & Sort، انیمیشن بازچینی خودکار و دکمه بازنشانی چیدمان.',
    prerequisites: ['نصب بودن پکیج muuri در پروژه (npm i muuri)'],
    usageSteps: [
      'روی دکمه «افزودن رایگان به حساب کاربری» کلیک کنید تا این اسکیل به پیشخوان شما اضافه شود.',
      'از طریق دکمه «دانلود از پیشخوان کاربری» وارد پیشخوان شوید و فایل SKILL.md را مطالعه یا دانلود کنید.',
      'فایل اسکیل را در پروژه خود قرار دهید تا ایجنت کدنویسی چیدمان Muuri را برایتان پیاده‌سازی کند.',
    ],
    skillMarkdownContent: `---
name: muuri-interactive-grid-layout
version: 2.0.0
compatible_tools: [Codex, Claude, ChatGPT]
source: github.com/haltu/muuri
maintainer: DPATech (SKILL 98)
---

# اسکیل مهندسی چیدمان‌های تعاملی و قابل جابه‌جایی با Muuri.js

## معرفی کتابخانه Muuri
کتابخانه **Muuri** یکی از قوی‌ترین موتورهای چیدمان شبکه‌ای (Grid Layout) در وب است که چهار قابلیت کلیدی را هم‌زمان ارائه می‌دهد:
1. چیدمان واکنش‌گرا و جفت‌شدن خودکار کارت‌ها با ابعاد مختلف (Masonry / Packery style).
2. جابه‌جایی روان المان‌ها با ماوس و تاچ (\`dragEnabled: true\`).
3. فیلتر کردن و مرتب‌سازی آنی کارت‌ها با انیمیشن ۶۰ فریم بر ثانیه.

## الگوی استاندارد راه‌اندازی Muuri در TypeScript
\`\`\`typescript
import Muuri from 'muuri';

export function createInteractiveMuuriGrid(gridElement: HTMLElement) {
  const grid = new Muuri(gridElement, {
    items: '.muuri-item',
    dragEnabled: true,
    layoutDuration: 400,
    layoutEasing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    dragSort: true,
  });

  return grid;
}
\`\`\`
`,
    syllabus: [
      'معماری DOM موردنیاز Muuri (گرید، آیتم و محتوای داخلی)',
      'فعال‌سازی Drag & Sort بدون تداخل با دکمه‌های داخل کارت',
      'همگام‌سازی چیدمان Muuri پس از لود شدن تصاویر و تغییر ستون‌ها',
    ],
    deliverables: ['فایل SKILL.md کامل + کامپوننت آماده MuuriGrid'],
  },

  // 2. FREE GITHUB SKILL: GSAP & ScrollTrigger
  {
    id: 'skill-gsap-motion-mastery',
    title: 'اسکیل انیمیشن‌سازی پیشرفته وب با GSAP و ScrollTrigger',
    slug: 'skill-gsap-motion-mastery',
    category: 'Codex',
    subCategory: 'انیمیشن و تایم‌لاین وب',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'برگرفته از مخازن برتر گیت‌هاب (claudedesignskills)؛ دستورالعمل کامل ساخت تایم‌لاین‌های GSAP، انیمیشن‌های اسکرول‌محور و افکت‌های ورود نرم بدون افت فریم.',
    modulesCount: 5,
    durationHours: 1,
    level: 'نسخه ۲.۴ · رایگان',
    version: 'v2.4.0',
    imageUrl: IMAGES.uiuxPkg,
    imageAlt: 'اسکیل انیمیشن‌سازی وب با GSAP و ScrollTrigger',
    featured: true,
    status: 'published',
    authorId: 'admin',
    posterCode: 'GSAP / ۰۲',
    posterTagEn: 'GSAP MOTION ENGINE',
    posterColor: 'cobalt',
    posterIconType: 'layers',
    githubSourceRepo: 'freshtechbro/claudedesignskills (gsap-scrolltrigger)',
    seoTitle: 'دانلود رایگان اسکیل GSAP و ScrollTrigger برای انیمیشن وب | اسکیل ۹۸',
    seoDescription:
      'با اسکیل رایگان GSAP و ScrollTrigger در Codex و Claude، انیمیشن‌های سطح Awwwards، تایم‌لاین‌های دقیق و افکت‌های ورود المنت‌ها را بسازید.',
    seoKeywords: 'اسکیل GSAP, انیمیشن وب, ScrollTrigger, اسکیل Codex, اسکیل رایگان',
    expectedOutput:
      'کدهای تایم‌لاین GSAP بهینه‌شده با پاک‌سازی خودکار حافظه، انیمیشن‌های Stagger برای کارت‌ها و هماهنگی کامل با React 19.',
    prerequisites: ['نصب بودن پکیج gsap در پروژه فرانت‌اند'],
    usageSteps: [
      'اسکیل را به حساب کاربری خود اضافه کرده و از بخش «پیشخوان من» دانلود نمایید.',
      'آن را در پوشه .claude/skills/gsap-motion یا محیط Codex قرار دهید.',
      'از ایجنت بخواهید طبق قوانین این اسکیل انیمیشن‌های صفحه را بنویسد.',
    ],
    skillMarkdownContent: `---
name: gsap-scrolltrigger-motion
version: 2.4.0
compatible_tools: [Codex, Claude, ChatGPT]
source: github.com/freshtechbro/claudedesignskills
maintainer: DPATech (SKILL 98)
---

# اسکیل مهندسی انیمیشن‌های وب با GSAP و ScrollTrigger

## قوانین طلایی پیاده‌سازی
1. فقط ویژگی‌های GPU (\`transform\`, \`opacity\`, \`filter: blur\`) را انیمیت کنید.
2. همیشه در پایان انیمیشن‌های ورود از \`clearProps: "filter,transform"\` استفاده کنید.

\`\`\`typescript
import gsap from 'gsap';

export function revealStoreCards(container: HTMLElement) {
  const cards = container.querySelectorAll('[data-gsap="reveal"]');
  gsap.fromTo(
    cards,
    { opacity: 0, y: 22, filter: 'blur(6px)' },
    {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.5,
      stagger: 0.06,
      ease: 'power3.out',
      clearProps: 'filter,transform',
    }
  );
}
\`\`\`
`,
    syllabus: [
      'ساختار تایم‌لاین‌های بدون لگ با GSAP',
      'انیمیشن‌های Stagger و Blur Reveal برای کارت‌ها',
      'مدیریت چرخه حیات انیمیشن‌ها در SPA',
    ],
    deliverables: ['فایل SKILL.md کامل + ماژول آماده TypeScript'],
  },

  // 3. FREE GITHUB SKILL: Lenis + Barba.js Glassmorphic Transitions
  {
    id: 'skill-lenis-barba-transitions',
    title: 'اسکیل اسکرول نرم Lenis و ترنزیشن شیشه‌ای صفحات با Barba.js',
    slug: 'skill-lenis-barba-transitions',
    category: 'Claude',
    subCategory: 'اسکرول نرم و ترنزیشن شیشه‌ای',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'دستورالعمل اتصال اسکرول ابریشمی Lenis به تیکر GSAP و پیاده‌سازی ترنزیشن‌های شیشه‌ای و بلورمانند (Frosted Glass Morph) بین صفحات با Barba.js.',
    modulesCount: 4,
    durationHours: 1,
    level: 'نسخه ۲.۲ · رایگان',
    version: 'v2.2.0',
    imageUrl: IMAGES.heroStudio,
    imageAlt: 'اسکیل اسکرول نرم Lenis و ترنزیشن شیشه‌ای Barba.js',
    featured: true,
    status: 'published',
    authorId: 'admin',
    posterCode: 'LENIS+BARBA / ۰۳',
    posterTagEn: 'GLASS SPA TRANSITION',
    posterColor: 'terracotta',
    posterIconType: 'starburst',
    githubSourceRepo: 'freshtechbro/claudedesignskills (lenis + barba-js)',
    seoTitle: 'اسکیل رایگان Lenis و Barba.js برای اسکرول نرم و ترنزیشن شیشه‌ای | اسکیل ۹۸',
    seoDescription:
      'آموزش و اسکیل آماده اتصال کتابخانه Lenis به GSAP و ایجاد ترنزیشن‌های بلورمانند و شیشه‌ای بین صفحات وب با Barba.js.',
    seoKeywords: 'اسکیل Lenis, کتابخانه Barba.js, اسکرول نرم وبسایت, ترنزیشن شیشه ای',
    expectedOutput:
      'راه‌اندازی کامل Lenis متصل به حلقه رندر GSAP و ترنزیشن شیشه‌ای بلورمانند هنگام جابه‌جایی بین صفحات.',
    prerequisites: ['نصب پکیج‌های lenis و @barba/core و gsap'],
    usageSteps: [
      'این اسکیل رایگان را به حساب کاربری اضافه کنید.',
      'در پیشخوان کاربری کد کامل ترنزیشن شیشه‌ای Barba + GSAP را کپی یا دانلود نمایید.',
    ],
    skillMarkdownContent: `---
name: lenis-barba-frosted-glass-navigation
version: 2.2.0
compatible_tools: [Claude, Codex, ChatGPT]
source: github.com/freshtechbro/claudedesignskills
maintainer: DPATech (SKILL 98)
---

# اسکیل اسکرول نرم Lenis و ترنزیشن شیشه‌ای (Blur Morph) با Barba.js

## ۱. همگام‌سازی Lenis با موتور زمانی GSAP
\`\`\`typescript
import Lenis from 'lenis';
import gsap from 'gsap';

const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
\`\`\`

## ۲. ترنزیشن شیشه‌ای و بلورمانند بین صفحات (Frosted Blur Transition)
به‌جای استفاده از پرده‌های تیره و سنگین، کانتینر فعلی با \`filter: blur(14px)\` و \`opacity: 0\` محو شده و صفحه جدید از حالت بلور به شفافیت کامل (\`blur(0px)\`) می‌رسد تا کاربر اصلاً متوجه بارگذاری صفحه نشود.
`,
    syllabus: [
      'پیکربندی Lenis برای اسکرول دسکتاپ و موبایل',
      'الگوی wrapper و container در Barba.js',
      'پیاده‌سازی ترنزیشن شیشه‌ای و بلورمانند با GSAP',
    ],
    deliverables: ['فایل SKILL.md + کد آماده اجرا'],
  },

  // 4. FREE GITHUB SKILL: UI/UX Pro Max Design System
  {
    id: 'skill-ui-ux-pro-max',
    title: 'اسکیل معماری رابط کاربری، صفحه‌آرایی و دیزاین سیستم UI/UX Pro Max',
    slug: 'skill-ui-ux-pro-max',
    category: 'ChatGPT',
    subCategory: 'طراحی UI/UX و صفحه‌آرایی',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'برگرفته از مخزن محبوب ui-ux-pro-max-skill در گیت‌هاب؛ شامل قوانین تایپوگرافی فارسی، گریدبندی ۲ تا ۴ ستونه، کنتراست رنگی و تجربه کاربری فروشگاهی.',
    modulesCount: 6,
    durationHours: 2,
    level: 'نسخه ۳.۰ · رایگان',
    version: 'v3.0.0',
    imageUrl: IMAGES.uiuxPkg,
    imageAlt: 'اسکیل طراحی رابط کاربری UI/UX Pro Max',
    featured: false,
    status: 'published',
    authorId: 'admin',
    posterCode: 'UI-UX / ۰۴',
    posterTagEn: 'UI/UX PRO MAX',
    posterColor: 'violet',
    posterIconType: 'radial',
    githubSourceRepo: 'nextlevelbuilder/ui-ux-pro-max-skill',
    seoTitle: 'اسکیل رایگان UI/UX Pro Max برای طراحی رابط کاربری حرفه‌ای | اسکیل ۹۸',
    seoDescription:
      'دستورالعمل جامع طراحی UI/UX مدرن، سیستم‌های گرید قابل تنظیم، سلسله‌مراتب دیداری و بهینه‌سازی صفحات فرود.',
    seoKeywords: 'اسکیل UI/UX, طراحی رابط کاربری, دیزاین سیستم, ui-ux-pro-max-skill',
    expectedOutput:
      'چک‌لیست و قوانین مهندسی برای بازطراحی صفحات فرود، کارت‌های محصول، صفحات مقاله دارای تصویر شاخص و داشبوردهای کاربری.',
    prerequisites: ['قابل استفاده در Claude، ChatGPT و Codex'],
    usageSteps: [
      'اسکیل را به حساب کاربری خود اضافه کرده و از پیشخوان دانلود کنید.',
      'کامپوننت مورد نظر خود را به همراه این اسکیل به مدل هوش مصنوعی بدهید تا بازطراحی شود.',
    ],
    skillMarkdownContent: `---
name: ui-ux-pro-max-system
version: 3.0.0
compatible_tools: [ChatGPT, Claude, Codex]
source: github.com/nextlevelbuilder/ui-ux-pro-max-skill
maintainer: DPATech (SKILL 98)
---

# اسکیل جامع طراحی رابط و تجربه کاربری (UI/UX Pro Max)

## اصول کلیدی در طراحی فروشگاهی و مجله محتوایی
1. **صفحه‌آرایی منعطف (Configurable Grid)**: امکان تغییر چیدمان کارت‌های محصول بین ۲، ۳ و ۴ ستون بر اساس تراکم محتوا.
2. **صفحه اختصاصی مقاله با تصویر شاخص**: مقالات آموزشی باید در صفحه مستقل با تصویر شاخص عریض، فهرست مطالب و تایپوگرافی خوانا باز شوند.
3. **جریان دریافت از پیشخوان**: محصولات رایگان و پولی ابتدا به کتابخانه حساب کاربری اضافه شده و سپس از داخل پیشخوان شخصی دانلود و مدیریت می‌شوند.
`,
    syllabus: [
      'مهندسی کارت‌های محصول و گریدهای ۲ تا ۴ ستونه',
      'طراحی صفحات مقاله دارای تصویر شاخص استاندارد',
      'تایپوگرافی فارسی و اعداد نرم (Smooth Tabular Numerals)',
    ],
    deliverables: ['فایل SKILL.md کامل + چک‌لیست ممیزی رابط کاربری'],
  },

  // 5. FREE SKILL: Codex Project Map & Architecture Analyzer
  {
    id: 'skill-codex-project-map',
    title: 'اسکیل نقشه‌خوان پروژه و مستندساز خودکار معماری کدبیس',
    slug: 'skill-codex-project-map',
    category: 'Codex',
    subCategory: 'معماری نرم‌افزار',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'برای شناخت سریع ساختار یک پروژه نرم‌افزاری، استخراج نقاط ورود فرانت‌اند و بک‌اند، تحلیل وابستگی‌ها و ترسیم نقشه ماژول‌ها در پروژه‌های React و Node.',
    modulesCount: 4,
    durationHours: 1,
    level: 'نسخه ۱.۵ · رایگان',
    version: 'v1.5.0',
    imageUrl: IMAGES.fullstackPkg,
    imageAlt: 'اسکیل نقشه‌خوان پروژه برای Codex',
    featured: false,
    status: 'published',
    authorId: 'admin',
    posterCode: 'CODEX / ۰۵',
    posterTagEn: 'PROJECT MAPPER',
    posterColor: 'cobalt',
    posterIconType: 'braces',
    githubSourceRepo: 'anthropics/skills (codebase-mapper)',
    seoTitle: 'اسکیل نقشه‌خوان پروژه برای Codex و تحلیل معماری کدبیس | اسکیل ۹۸',
    seoDescription:
      'دریافت رایگان اسکیل نقشه‌خوان پروژه برای شناسایی سریع ساختار پوشه‌ها، نقاط ورود و معماری پروژه‌های نرم‌افزاری.',
    seoKeywords: 'اسکیل Codex, نقشه خوان پروژه, تحلیل کدبیس, اسکیل رایگان',
    expectedOutput:
      'گزارش فنی ساختاریافته شامل درخت پوشه‌ها، APIهای سرور، کامپوننت‌های کلیدی و جریان داده.',
    prerequisites: ['دسترسی به مخزن کد در Codex یا Claude Code'],
    usageSteps: [
      'اسکیل را به حساب کاربری اضافه و از پیشخوان خود دانلود کنید.',
      'دستور تحلیل معماری را اجرا نمایید تا نقشه کامل ماژول‌ها تولید شود.',
    ],
    skillMarkdownContent: `---
name: codex-project-map
version: 1.5.0
compatible_tools: [Codex, Claude]
maintainer: DPATech (SKILL 98)
---

# اسکیل نقشه‌خوان پروژه (Project Architecture Mapper)

## مراحل اجرا توسط ایجنت
1. بررسی \`package.json\`, \`tsconfig.json\` و \`server.ts\`.
2. استخراج تمامی Endpointهای سرور (مانند \`/api/payment/request\`, \`/api/sms/send-otp\`, \`/api/cms/ai-assist\`).
3. ترسیم جدول ارتباط کامپوننت‌ها، استیت‌ها و سرویس‌های دیتابیس.
`,
    syllabus: ['کشف خودکار نقاط ورود', 'تحلیل وابستگی‌ها و APIها'],
    deliverables: ['فایل SKILL.md استاندارد'],
  },

  // 6. PAID PACKAGE 1: Enterprise Full-Stack & E-Commerce Suite
  {
    id: 'pkg-dpatech-cms-enterprise',
    title: 'پکیج جامع معماری فروشگاه، صفحه‌ساز بصری و امنیت درگاه شاپرک/OTP',
    slug: 'pkg-dpatech-cms-enterprise',
    category: 'Codex',
    subCategory: 'مجموعه کامل سازمانی',
    itemType: 'package',
    price: 2850000,
    originalPrice: 3900000,
    shortDescription:
      'بسته کامل ۱۶ اسکیل مهندسی بک‌اند و فرانت‌اند برای پیاده‌سازی پنل مدیریت دو سطحی (ادمین و سوپر ادمین)، صفحه‌ساز صفحه اصلی، گالری رسانه با سئوی تصویر، درگاه‌های شاپرک و پیامک OTP.',
    modulesCount: 16,
    durationHours: 28,
    level: 'نسخه ۴.۵ · پکیج سازمانی VIP',
    version: 'v4.5.0 Pro',
    imageUrl: IMAGES.securityPkg,
    imageAlt: 'پکیج جامع معماری فروشگاه و صفحه‌ساز اسکیل ۹۸',
    featured: true,
    status: 'published',
    authorId: 'admin',
    posterCode: 'ENTERPRISE / VIP-01',
    posterTagEn: 'FULLSTACK & SHAPARAK',
    posterColor: 'slate',
    posterIconType: 'shield',
    githubSourceRepo: 'DPATech/Enterprise-Platform-Skills',
    seoTitle: 'پکیج جامع معماری فروشگاه، صفحه‌ساز و درگاه شاپرک | اسکیل ۹۸',
    seoDescription:
      'پکیج حرفه‌ای اسکیل‌های ساخت فروشگاه و پنل مدیریت اختصاصی با صفحه‌ساز، گالری رسانه، مدیریت نقش‌ها (RBAC)، درگاه‌های شاپرک و سئوی هوشمند.',
    seoKeywords: 'پکیج اسکیل کدنویسی, امنیت سشن و OTP, درگاه شاپرک, صفحه ساز ری اکت',
    expectedOutput:
      'تولید کامل کدهای سرور، وب‌سرویس‌های پرداخت و پیامک OTP، صفحه‌ساز بصری، گالری رسانه و پنل سوپر ادمین.',
    prerequisites: ['آشنایی با TypeScript، React و Node.js/Express'],
    usageSteps: [
      'پکیج را به سبد خرید اضافه کرده و با کد تخفیف SKILL98 یا DPATECH تسویه کنید.',
      'بلافاصله در «پیشخوان من» روی این پکیج کلیک کنید تا تمام ۱۶ ماژول و فایل‌های SKILL.md برایتان باز شود.',
      'فایل‌ها را مستقیماً در پیشخوان مطالعه یا به صورت یکجا دانلود نمایید.',
    ],
    skillMarkdownContent: `---
name: enterprise-platform-suite
version: 4.5.0
compatible_tools: [Codex, Claude, ChatGPT]
maintainer: DPATech (SKILL 98)
---

# پکیج جامع معماری پلتفرم سازمانی و فروشگاهی (ویرایش ۴.۵)

## ماژول‌های داخل این پکیج
1. **صفحه‌ساز بصری صفحه اصلی (Visual Homepage Builder)**:
   - تنظیم لوگو و فاویکون، اسلایدر هیرو، انتخاب تعداد ستون‌های محصولات (۲، ۳ یا ۴ ستونه) و مدیریت نمایش سکشن‌ها.
2. **گالری رسانه و سئوی هوشمند تصاویر (Media Library & Image SEO)**:
   - آپلود، حذف، ویرایش Alt Text و تولید متاتگ‌های سئو برای تصاویر شاخص محصولات و مقالات.
3. **وب‌سرویس‌های واقعی درگاه پرداخت و پیامک OTP در سرور (\`server.ts\`)**:
   - اندپوینت‌های \`/api/payment/request\` (زرین‌پال REST v4، زیبال، شاپرک) و \`/api/sms/send-otp\` + \`/api/sms/verify-otp\` (کاوه‌نگار، ملی‌پیامک، فراز اس‌ام‌اس).
4. **مدیریت نقش‌ها (RBAC) و مجوز هوش مصنوعی سئو**:
   - تفکیک کامل \`super_admin\`، \`admin\`، \`seo_editor\` و \`customer\`.
`,
    syllabus: [
      'معماری صفحه‌ساز و گالری رسانه دارای سئو',
      'پیاده‌سازی وب‌سرویس‌های سرور برای OTP و درگاه‌های پرداخت',
      'مدیریت نقش‌ها (RBAC) و سطوح دسترسی دو مرحله‌ای',
      'اتصال موتورهای هوش مصنوعی (OpenAI / Claude / Gemini)',
    ],
    deliverables: [
      '۱۶ فایل SKILL.md تخصصی + سورس‌کد کامل مرجع + راهنمای پیاده‌سازی',
    ],
  },

  // 7. PAID PACKAGE 2: Interactive Web Stack (Muuri + GSAP + Lenis + Barba.js)
  {
    id: 'pkg-interactive-web-motion-bundle',
    title: 'پکیج استودیو فرانت‌اند تعاملی (Muuri + GSAP + Lenis + Barba.js)',
    slug: 'pkg-interactive-web-motion-bundle',
    category: 'Claude',
    subCategory: 'پکیج ویژه فرانت‌اند و انیمیشن',
    itemType: 'package',
    price: 1950000,
    originalPrice: 2600000,
    shortDescription:
      'مجموعه کامل ۱۲ اسکیل پیشرفته برای ساخت وب‌سایت‌های تعاملی سطح جهانی با ترکیب گریدهای Muuri، تایم‌لاین‌های GSAP، اسکرول نرم Lenis و ترنزیشن شیشه‌ای Barba.js.',
    modulesCount: 12,
    durationHours: 18,
    level: 'نسخه ۳.۸ · پکیج طلایی',
    version: 'v3.8.0 Pro',
    imageUrl: IMAGES.aiAutomationPkg,
    imageAlt: 'پکیج استودیو فرانت‌اند تعاملی با Muuri و GSAP',
    featured: true,
    status: 'published',
    authorId: 'admin',
    posterCode: 'MOTION / VIP-02',
    posterTagEn: 'MUURI + GSAP + BARBA',
    posterColor: 'violet',
    posterIconType: 'starburst',
    githubSourceRepo: 'DPATech/interactive-motion-skillstack',
    seoTitle: 'پکیج اسکیل‌های طراحی وب تعاملی با Muuri، GSAP، Lenis و Barba | اسکیل ۹۸',
    seoDescription:
      'مجموعه ۱۲ اسکیل حرفه‌ای برای تبدیل رابط‌های کاربری ساده به وب‌سایت‌های تعاملی، دارای ترنزیشن شیشه‌ای و چیدمان قابل جابه‌جایی Muuri.',
    seoKeywords: 'پکیج Muuri, آموزش GSAP, اسکرول Lenis, ترنزیشن شیشه ای Barba.js',
    expectedOutput:
      'تبدیل هر لندینگ‌پیج یا فروشگاه معمولی به یک تجربه کاربری زنده، شیشه‌ای و تعاملی بدون افت سرعت.',
    prerequisites: ['آشنایی با فرانت‌اند مدرن (React / Vite / Tailwind)'],
    usageSteps: [
      'پکیج را خریداری کنید تا در بخش «پیشخوان من» فعال شود.',
      'در پیشخوان کاربری، هر یک از ۱۲ اسکیل انیمیشن و چیدمان Muuri را انتخاب، مطالعه و دانلود نمایید.',
    ],
    skillMarkdownContent: `---
name: interactive-web-motion-stack-pro
version: 3.8.0
compatible_tools: [Claude, Codex, ChatGPT]
maintainer: DPATech (SKILL 98)
---

# پکیج استودیو فرانت‌اند تعاملی (Muuri + GSAP + Lenis + Barba.js)

## فهرست اسکیل‌های داخل بسته
1. **معماری گریدهای قابل جابه‌جایی و فیلترشونده با Muuri.js**
2. **هماهنگی کامل Lenis و GSAP ScrollTrigger در اپلیکیشن‌های React 19**
3. **ترنزیشن‌های شیشه‌ای و بلورمانند (Frosted Blur Morph) با Barba.js**
4. **انیمیشن‌های تایپوگرافی فارسی و شمارنده‌های نرم قیمت (Smooth Numerals)**
`,
    syllabus: [
      'چیدمان‌های Drag & Sort با کتابخانه Muuri',
      'ترنزیشن‌های شیشه‌ای و بلورمانند بین صفحات',
      'بهینه‌سازی انیمیشن‌های ۶۰ فریم بر ثانیه',
    ],
    deliverables: ['۱۲ فایل SKILL.md حرفه‌ای + تمپلیت‌های آماده اجرا'],
  },
  // 8. FREE SKILL: Context7, Playwright & Figma MCP Servers for Claude Code
  {
    id: 'skill-context7-playwright-figma-mcp',
    title: 'اسکیل اتصال سرورهای Context7، Playwright و Figma MCP به Claude Code',
    slug: 'skill-context7-playwright-figma-mcp',
    category: 'Claude',
    subCategory: 'پروتکل MCP و ایجنت‌های ۲۰۲۵–۲۰۲۶',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'پیکربندی استاندارد سه سرور کلیدی MCP: دریافت مستندات لحظه‌ای کتابخانه‌ها با Context7، تست خودکار مرورگر با Playwright MCP و استخراج دقیق توکن‌های طراحی از Figma MCP.',
    modulesCount: 6,
    durationHours: 2,
    level: 'نسخه ۳.۲ · رایگان',
    version: 'v3.2.0',
    imageUrl: IMAGES.aiAutomationPkg,
    imageAlt: 'پیکربندی سرورهای Context7، Playwright و Figma MCP در Claude Code',
    featured: true,
    status: 'published',
    authorId: 'admin',
    posterCode: 'MCP-SUITE / ۰۸',
    posterTagEn: 'CONTEXT7 + PLAYWRIGHT + FIGMA',
    posterColor: 'cobalt',
    posterIconType: 'layers',
    githubSourceRepo: 'upstash/context7 & microsoft/playwright-mcp',
    seoTitle: 'اسکیل رایگان Context7، Playwright و Figma MCP برای Claude Code | اسکیل ۹۸',
    seoDescription:
      'راهنمای عملی و فایل SKILL.md برای اتصال سرورهای Context7 MCP، Playwright MCP و Figma Dev Mode MCP به Claude Code و Cursor جهت حذف توهم کدنویسی.',
    seoKeywords: 'Context7 MCP, Playwright MCP, Figma MCP, Claude Code SKILL.md, پروتکل MCP',
    expectedOutput:
      'فایل mcp.json آماده اجرا، قوانین استفاده خودکار از Context7 پیش از نوشتن کد کتابخانه‌ها و اسکریپت تست تصویری با Playwright MCP.',
    prerequisites: ['نصب Node.js 20+ و یکی از ابزارهای Claude Code، Cursor یا Windsurf'],
    usageSteps: [
      'این اسکیل رایگان را به حساب کاربری اضافه کرده و از پیشخوان دانلود کنید.',
      'فایل SKILL.md را در مسیر .claude/skills/mcp-workflow/SKILL.md ذخیره کنید.',
      'تنظیمات سرورهای Context7 و Playwright را در فایل .mcp.json ریشه پروژه قرار دهید.',
    ],
    skillMarkdownContent: `---
name: context7-playwright-figma-mcp
version: 3.2.0
compatible_tools: [Claude, Codex, ChatGPT]
source: github.com/upstash/context7 | github.com/microsoft/playwright-mcp
maintainer: DPATech (SKILL 98)
---

# اسکیل یکپارچه‌سازی سرورهای Context7، Playwright و Figma MCP

## قوانین اجرایی برای ایجنت کدنویسی
1. **حذف توهم نسخه‌های قدیمی با Context7:** پیش از استفاده از APIهای جدید (مانند Tailwind v4، React 19، Drizzle ORM یا Next.js 15/16)، حتماً ابزار \`resolve-library-id\` و \`get-library-docs\` را از سرور **Context7 MCP** فراخوانی کن.
2. **تست واقعی مرورگر با Playwright MCP:** پس از هر تغییر در رابط کاربری، صفحه را با Playwright MCP باز کرده، خطاهای کنسول را بررسی و از نمایش صحیح دسکتاپ و موبایل اطمینان حاصل کن.
3. **استخراج دقیق دیزاین از Figma MCP:** رنگ‌ها، فاصله‌ها (Spacing) و تایپوگرافی را مستقیماً از نود فیگما استخراج کن و از حدس زدن مقادیر خودداری نما.

## نمونه پیکربندی \`.mcp.json\`
\`\`\`json
{
  "mcpServers": {
    "context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp@latest"] },
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] },
    "github": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"] }
  }
}
\`\`\`
`,
    syllabus: [
      'راه‌اندازی Context7 MCP برای خواندن مستندات به‌روز کتابخانه‌ها',
      'تست E2E و بررسی کنسول مرورگر با Playwright MCP',
      'تبدیل مستقیم فریم‌های Figma به کد Tailwind v4',
    ],
    deliverables: ['فایل SKILL.md + نمونه .mcp.json استاندارد'],
  },

  // 9. FREE SKILL: Cursor .mdc Rules & Caveman Token Optimizer
  {
    id: 'skill-cursor-mdc-caveman-optimizer',
    title: 'اسکیل مهندسی قوانین .cursor/rules (.mdc) و بهینه‌ساز توکن Caveman',
    slug: 'skill-cursor-mdc-caveman-optimizer',
    category: 'Claude',
    subCategory: 'بهینه‌سازی توکن و قوانین ایجنت',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'ساختاردهی قوانین ماژولار .mdc با فیلتر Glob در Cursor و اعمال الگوی فشرده‌سازی پاسخ Caveman برای کاهش ۵۵ تا ۶۵ درصدی مصرف توکن بدون افت کیفیت کد.',
    modulesCount: 5,
    durationHours: 1,
    level: 'نسخه ۲.۱ · رایگان',
    version: 'v2.1.0',
    imageUrl: IMAGES.heroStudio,
    imageAlt: 'مهندسی قوانین .cursor/rules و کاهش مصرف توکن با الگوی Caveman',
    featured: true,
    status: 'published',
    authorId: 'admin',
    posterCode: 'RULES / ۰۹',
    posterTagEn: 'CURSOR .MDC + CAVEMAN',
    posterColor: 'terracotta',
    posterIconType: 'braces',
    githubSourceRepo: 'JuliusBrussee/caveman & PatrickJS/awesome-cursorrules',
    seoTitle: 'اسکیل قوانین .cursor/rules (.mdc) و بهینه‌ساز توکن Caveman | اسکیل ۹۸',
    seoDescription:
      'کاهش چشمگیر هزینه API و افزایش دقت ایجنت‌های کدنویسی با ساختار فایل‌های .mdc در Cursor و دستورالعمل پاسخ‌دهی موجز Caveman.',
    seoKeywords: 'Cursor .mdc rules, Caveman token optimizer, کاهش مصرف توکن هوش مصنوعی, قوانین Claude Code',
    expectedOutput:
      'پوشه .cursor/rules شامل قوانین تفکیک‌شده فرانت‌اند، بک‌اند و امنیت به همراه پروفایل پاسخ‌دهی کم‌مصرف.',
    prerequisites: ['استفاده از Cursor، Claude Code یا Codex CLI'],
    usageSteps: [
      'اسکیل را به حساب کاربری خود اضافه کرده و از پیشخوان فایل .md را دریافت کنید.',
      'قوانین را بر اساس الگوی globs در پوشه .cursor/rules/ پروژه ذخیره نمایید.',
    ],
    skillMarkdownContent: `---
name: cursor-mdc-caveman-optimizer
version: 2.1.0
compatible_tools: [Claude, Codex, ChatGPT]
maintainer: DPATech (SKILL 98)
---

# اسکیل قوانین ماژولار .mdc و الگوی کم‌مصرف Caveman

## ۱. تفکیک قوانین بر اساس مسیر فایل (Scoped .mdc)
به‌جای یک فایل عظیم و پرمصرف، قوانین را به ماژول‌های کوچک با \`globs\` مشخص تقسیم کنید تا فقط هنگام ویرایش فایل‌های مرتبط وارد کانتکست مدل شوند:
- \`01-frontend-react.mdc\` → \`globs: ["src/**/*.tsx"]\`
- \`02-backend-api.mdc\` → \`globs: ["src/server/**/*.ts"]\`
- \`03-security-audit.mdc\` → \`alwaysApply: true\`

## ۲. الگوی بهینه‌سازی توکن (Caveman Concise Output)
- حذف جملات تشریفاتی و تکرار صورت مسئله در پاسخ‌های میانی ایجنت.
- ارائه مستقیم Diff یا کد نهایی با کامنت‌های حداقلی و فنی.
- حفظ کامل کیفیت نام‌گذاری، تایپ‌های TypeScript و تست‌پذیری کد.
`,
    syllabus: [
      'تفاوت فایل‌های قدیمی .cursorrules با ساختار جدید .mdc',
      'نوشتن الگوهای Glob برای بارگذاری شرطی کانتکست',
      'اعمال الگوی Caveman برای کاهش ۶۵٪ مصرف توکن خروجی',
    ],
    deliverables: ['فایل SKILL.md + ۳ تمپلیت آماده .mdc'],
  },

  // 10. FREE SKILL: Motion (WAAPI 60fps) & Anime.js v4
  {
    id: 'skill-motion-waapi-animejs-v4',
    title: 'اسکیل انیمیشن‌های ۶۰ فریم WAAPI با Motion و Anime.js v4',
    slug: 'skill-motion-waapi-animejs-v4',
    category: 'Codex',
    subCategory: 'انیمیشن مدرن و میکروتعامل‌ها',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'پیاده‌سازی انیمیشن‌های سخت‌افزاری (Hardware-Accelerated) روی ترد کامپوزیتور با کتابخانه Motion (نسل جدید Framer Motion) و تایم‌لاین‌های ماژولار Anime.js v4.',
    modulesCount: 5,
    durationHours: 2,
    level: 'نسخه ۴.۰ · رایگان',
    version: 'v4.0.0',
    imageUrl: IMAGES.uiuxPkg,
    imageAlt: 'اسکیل انیمیشن‌های ۶۰ فریم با کتابخانه Motion و Anime.js v4',
    featured: true,
    status: 'published',
    authorId: 'admin',
    posterCode: 'MOTION / ۱۰',
    posterTagEn: 'MOTION WAAPI + ANIME V4',
    posterColor: 'violet',
    posterIconType: 'starburst',
    githubSourceRepo: 'motiondivision/motion & juliangarnier/anime',
    seoTitle: 'اسکیل رایگان Motion WAAPI و Anime.js v4 برای انیمیشن ری‌اکت | اسکیل ۹۸',
    seoDescription:
      'ساخت انیمیشن‌های فوق‌روان ۶۰ فریم در React و جاوااسکریپت با حجم باندل کمتر از ۵ کیلوبایت به کمک Motion و نسخه چهارم Anime.js.',
    seoKeywords: 'Motion library, Framer Motion, Anime.js v4, انیمیشن WAAPI, میکروتعامل UI',
    expectedOutput:
      'کامپوننت‌های انیمیشنی سبک با فنرهای فیزیکی طبیعی (Spring Physics)، افکت‌های Scroll-linked و پشتیبانی کامل از prefers-reduced-motion.',
    prerequisites: ['نصب motion یا animejs نسخه ۴ در پروژه'],
    usageSteps: [
      'اسکیل را به کتابخانه خود اضافه کنید و از پیشخوان دانلود نمایید.',
      'دستورالعمل‌های بهینه‌سازی Layout Animation و WAAPI را در پروژه اعمال کنید.',
    ],
    skillMarkdownContent: `---
name: motion-waapi-animejs-v4
version: 4.0.0
compatible_tools: [Codex, Claude, ChatGPT]
maintainer: DPATech (SKILL 98)
---

# اسکیل انیمیشن‌های ۶۰ فریم با Motion و Anime.js v4

## اصول مهندسی انیمیشن در ۲۰۲۶
1. برای انیمیشن‌های ساده ورود/خروج و هاور از **Motion Mini (WAAPI)** با حجم حدود ۲.۵ کیلوبایت استفاده کنید تا بار از روی Main Thread برداشته شود.
2. برای انیمیشن‌های SVG، مورف کردن مسیرها (SVG Path Morphing) و تایم‌لاین‌های پیچیده از **Anime.js v4** با ایمپورت ماژولار (\`import { animate, stagger } from 'animejs'\`) بهره ببرید.
3. همیشه کلید \`prefers-reduced-motion\` سیستم کاربر را رعایت کنید.
`,
    syllabus: [
      'تفاوت موتور WAAPI با انیمیشن‌های JS در نرخ فریم موبایل',
      'ایمپورت ماژولار و Tree-Shaking در Anime.js v4',
      'ساخت میکروتعامل‌های فنری و مودال‌های شناور بدون Layout Shift',
    ],
    deliverables: ['فایل SKILL.md + الگوی آماده Spring Modal'],
  },

  // 11. FREE SKILL: Three.js WebGPU & TSL Shaders
  {
    id: 'skill-threejs-webgpu-shaders',
    title: 'اسکیل گرافیک سه‌بعدی Three.js WebGPU و شیدرهای TSL در وب مدرن',
    slug: 'skill-threejs-webgpu-shaders',
    category: 'Codex',
    subCategory: 'گرافیک سه‌بعدی و WebGPU',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'ساخت صحنه‌های سه‌بعدی سبک، نورپردازی فیزیکی PBR و شیدرهای مدرن با زبان Three.js Shading Language (TSL) و رندرر WebGPU با فال‌بک خودکار WebGL2.',
    modulesCount: 6,
    durationHours: 3,
    level: 'نسخه ۱.۸ · رایگان',
    version: 'v1.8.0',
    imageUrl: IMAGES.fullstackPkg,
    imageAlt: 'گرافیک سه‌بعدی وب با Three.js WebGPU و شیدرهای TSL',
    featured: false,
    status: 'published',
    authorId: 'admin',
    posterCode: 'WEBGPU / ۱۱',
    posterTagEn: 'THREE.JS WEBGPU + TSL',
    posterColor: 'slate',
    posterIconType: 'radial',
    githubSourceRepo: 'mrdoob/three.js (WebGPURenderer & TSL)',
    seoTitle: 'اسکیل Three.js WebGPU و شیدرهای TSL برای طراحی سایت سه‌بعدی | اسکیل ۹۸',
    seoDescription:
      'الگوهای استاندارد ساخت صحنه‌های سه‌بعدی بدون افت سرعت با Three.js، رندرر WebGPU، مدیریت حافظه GPU و پاک‌سازی صحیح Geometry/Material در React.',
    seoKeywords: 'Three.js WebGPU, TSL Shaders, طراحی سایت سه بعدی, بهینه سازی WebGL',
    expectedOutput:
      'معماری تمیز صحنه سه‌بعدی با رندر شرطی (On-demand Rendering)، پاک‌سازی کامل GPU در unmount و پشتیبانی از موبایل.',
    prerequisites: ['آشنایی با Three.js یا React Three Fiber'],
    usageSteps: [
      'اسکیل را به کتابخانه اضافه کرده و فایل دستورالعمل را از پیشخوان دانلود کنید.',
      'قوانین Dispose حافظه و لود تنبل (Lazy Loading) مدل‌های GLB/Draco را در پروژه اجرا کنید.',
    ],
    skillMarkdownContent: `---
name: threejs-webgpu-tsl-shaders
version: 1.8.0
compatible_tools: [Codex, Claude]
maintainer: DPATech (SKILL 98)
---

# اسکیل مهندسی Three.js WebGPU و شیدرهای TSL

## چک‌لیست حیاتی پرفورمنس سه‌بعدی در وب
1. **محدود کردن DPR:** مقدار \`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))\` را همیشه قفل کنید.
2. **فشرده‌سازی مدل‌ها:** تمام فایل‌های سه‌بعدی باید با **glTF + Draco/Meshopt** و تکسچرهای **KTX2/WebP** سرو شوند.
3. **پاک‌سازی حافظه (Zero Memory Leak):** هنگام خروج کاربر از صفحه، تمامی \`geometry.dispose()\` و \`material.dispose()\` و \`renderer.dispose()\` فراخوانی شوند.
`,
    syllabus: [
      'معماری WebGPURenderer با فال‌بک خودکار WebGL2',
      'نوشتن متریال‌های نودمحور با TSL به‌جای GLSL خام',
      'تکنیک‌های فشرده‌سازی glTF و جلوگیری از داغ‌شدن موبایل',
    ],
    deliverables: ['فایل SKILL.md + چک‌لیست پرفورمنس GPU'],
  },

  // 12. FREE SKILL: TanStack Query v5 + Router + Zustand
  {
    id: 'skill-tanstack-zustand-architecture',
    title: 'اسکیل معماری داده و استیت فرانت‌اند با TanStack Query، Router و Zustand',
    slug: 'skill-tanstack-zustand-architecture',
    category: 'Codex',
    subCategory: 'معماری React و مدیریت وضعیت',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'تفکیک اصولی Server State از Client State با TanStack Query v5، مسیریابی کاملاً Type-Safe با TanStack Router و استورهای اتمیک و بدون رندر اضافی در Zustand.',
    modulesCount: 5,
    durationHours: 2,
    level: 'نسخه ۵.۰ · رایگان',
    version: 'v5.0.0',
    imageUrl: IMAGES.securityPkg,
    imageAlt: 'معماری استیت ری‌اکت با TanStack Query و Zustand',
    featured: false,
    status: 'published',
    authorId: 'admin',
    posterCode: 'TANSTACK / ۱۲',
    posterTagEn: 'TANSTACK + ZUSTAND',
    posterColor: 'sage',
    posterIconType: 'grid',
    githubSourceRepo: 'TanStack/query & pmndrs/zustand',
    seoTitle: 'اسکیل معماری TanStack Query v5، TanStack Router و Zustand | اسکیل ۹۸',
    seoDescription:
      'حذف کامل useEffectهای پیچیده و کش‌کردن هوشمند API در React با الگوهای استاندارد TanStack Query v5 و مدیریت استیت سبک Zustand.',
    seoKeywords: 'TanStack Query v5, TanStack Router, Zustand, معماری فرانت اند React',
    expectedOutput:
      'ساختار کلیدهای کش استاندارد (Query Key Factory)، آپدیت خوش‌بینانه (Optimistic Updates) و اسلایس‌های سبک Zustand.',
    prerequisites: ['پروژه React 18/19 + TypeScript'],
    usageSteps: [
      'اسکیل را به حساب کاربری اضافه کنید و فایل SKILL.md را از پیشخوان دریافت نمایید.',
    ],
    skillMarkdownContent: `---
name: tanstack-query-router-zustand
version: 5.0.0
compatible_tools: [Codex, Claude, ChatGPT]
maintainer: DPATech (SKILL 98)
---

# اسکیل معماری داده فرانت‌اند با TanStack Query v5 و Zustand

## قوانین تفکیک استیت
1. **هر داده‌ای که از سرور می‌آید** (محصولات، سفارش‌ها، پروفایل) فقط در **TanStack Query** نگهداری شود؛ هرگز آن را در Zustand کپی نکنید.
2. **فقط استیت‌های خالص رابط کاربری** (باز بودن سبد خرید، تم، فیلترهای موقت) در **Zustand** با Selectorهای اتمیک ذخیره شوند.
3. برای هر موجودیت از الگوی **Query Key Factory** جهت ابطال دقیق کش (\`invalidateQueries\`) استفاده کنید.
`,
    syllabus: [
      'الگوی Query Key Factory و کش هوشمند در TanStack Query v5',
      'پیاده‌سازی Optimistic UI بدون پرش صفحه',
      'جلوگیری از Re-renderهای غیرضروری با Selectorهای Zustand',
    ],
    deliverables: ['فایل SKILL.md + ساختار پوشه hooks و stores'],
  },

  // 13. FREE SKILL: Hono Edge API + Drizzle ORM + Biome
  {
    id: 'skill-hono-drizzle-biome-stack',
    title: 'اسکیل بک‌اند فوق‌سریع Hono API، Drizzle ORM و لینتر یکپارچه Biome',
    slug: 'skill-hono-drizzle-biome-stack',
    category: 'Codex',
    subCategory: 'بک‌اند مدرن و ابزارهای توسعه',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    shortDescription:
      'ساخت APIهای تایپ‌سیف و فوق‌سبک با Hono، کوئری‌های SQL بدون سربار با Drizzle ORM (سازگار با SQLite و PostgreSQL) و جایگزینی ESLint+Prettier با Biome با سرعت ۲۵ برابری.',
    modulesCount: 6,
    durationHours: 2,
    level: 'نسخه ۲.۵ · رایگان',
    version: 'v2.5.0',
    imageUrl: IMAGES.fullstackPkg,
    imageAlt: 'بک‌اند مدرن Node.js با Hono، Drizzle ORM و Biome',
    featured: false,
    status: 'published',
    authorId: 'admin',
    posterCode: 'EDGE-API / ۱۳',
    posterTagEn: 'HONO + DRIZZLE + BIOME',
    posterColor: 'cobalt',
    posterIconType: 'shield',
    githubSourceRepo: 'honojs/hono & drizzle-team/drizzle-orm & biomejs/biome',
    seoTitle: 'اسکیل بک‌اند Hono، Drizzle ORM و لینتر Biome | اسکیل ۹۸',
    seoDescription:
      'الگوی مهندسی ساخت APIهای سریع و ایمن با Hono RPC، اسکیمای تایپ‌سیف Drizzle ORM و پیکربندی یک‌فایله Biome.',
    seoKeywords: 'Hono framework, Drizzle ORM, Biome linter, بک اند تایپ اسکریپت, PostgreSQL',
    expectedOutput:
      'روت‌های تایپ‌سیف Hono با اعتبارسنجی Zod، اسکیمای Drizzle با ایندکس‌های ترکیبی و فایل biome.json استاندارد.',
    prerequisites: ['آشنایی با TypeScript و SQL'],
    usageSteps: [
      'اسکیل را به کتابخانه خود اضافه کنید و از پیشخوان دانلود نمایید.',
    ],
    skillMarkdownContent: `---
name: hono-drizzle-biome-fullstack
version: 2.5.0
compatible_tools: [Codex, Claude]
maintainer: DPATech (SKILL 98)
---

# اسکیل معماری بک‌اند مدرن با Hono، Drizzle ORM و Biome

## چرا این سه ابزار استک طلایی ۲۰۲۶ هستند؟
1. **Hono:** فریم‌ورک فوق‌سبک مبتنی بر Web Standards با قابلیت RPC End-to-End Type Safety بین سرور و فرانت‌اند.
2. **Drizzle ORM:** بدون موتور باینری سنگین، کوئری‌های SQL شفاف با مهاجرت آسان بین SQLite و PostgreSQL.
3. **Biome:** جایگزین واحد ESLint و Prettier نوشته‌شده با Rust که در چند میلی‌ثانیه کل پروژه را فرمت و ممیزی می‌کند.
`,
    syllabus: [
      'ساخت API تایپ‌سیف با Hono + Zod Validator',
      'طراحی اسکیما و ایندکس‌های ترکیبی در Drizzle ORM',
      'پیکربندی biome.json برای تیم‌های TypeScript',
    ],
    deliverables: ['فایل SKILL.md + نمونه schema.ts و biome.json'],
  },
  ...ADDITIONAL_VERIFIED_SKILLS,
];

export const INITIAL_ARTICLES: SkillArticle[] = [
  {
    id: 'art-claude-code-skill-md-mcp-guide',
    title: 'راهنمای جامع استاندارد SKILL.md و سرورهای MCP کلود (Context7، Playwright و Figma MCP در ۲۰۲۶)',
    slug: 'claude-code-skill-md-and-mcp-servers-guide',
    category: 'پروتکل MCP و اسکیل‌نویسی',
    authorName: 'تحریریه مهندسی هوش مصنوعی اسکیل ۹۸',
    featuredImageUrl: IMAGES.aiAutomationPkg,
    featuredImageAlt: 'معماری استاندارد SKILL.md و اتصال سرورهای Context7 و Playwright MCP به Claude Code',
    summary:
      'چگونه با ترکیب فایل‌های ماژولار SKILL.md و پروتکل MCP (اتصال زنده به Context7 برای مستندات به‌روز، Playwright برای تست واقعی مرورگر و Figma برای استخراج توکن‌های طراحی) خطای ایجنت‌های کدنویسی را نزدیک به صفر کنیم.',
    readingTimeMinutes: 9,
    publishedDateLabel: '۱۴۰۵/۰۸/۲۶',
    status: 'published',
    featured: true,
    seoTitle: 'آموزش استاندارد SKILL.md و سرورهای Context7 و Playwright MCP | مجله اسکیل ۹۸',
    seoDescription:
      'راهنمای کامل راه‌اندازی سرورهای Context7 MCP، Playwright MCP و Figma MCP در Claude Code و Cursor به همراه استاندارد نوشتن فایل SKILL.md.',
    seoKeywords: 'SKILL.md, پروتکل MCP, Context7 MCP, Playwright MCP, Figma MCP, Claude Code',
    bodyMarkdown: `### چرا پرامپت‌های سنتی دیگر برای پروژه‌های واقعی پاسخگو نیستند؟
در پروژه‌های نرم‌افزاری سال‌های ۲۰۲۵ و ۲۰۲۶، تکرار قوانین معماری، نسخه کتابخانه‌ها و چک‌لیست‌های امنیتی در هر چت هم زمان‌بر است و هم باعث هدررفت هزاران توکن می‌شود. دو استاندارد جهانی این چالش را به شکل ریشه‌ای حل کرده‌اند: **فایل‌های ماژولار \`SKILL.md\`** برای انتقال دانش پایدار تیمی، و **پروتکل MCP (Model Context Protocol)** برای اتصال زنده مدل به ابزارهای واقعی.

### ۱. حذف توهم نسخه کتابخانه‌ها با Context7 MCP
یکی از رایج‌ترین خطاهای مدل‌های زبانی، نوشتن کد بر اساس سینتکس قدیمی کتابخانه‌ها (مثلاً Tailwind v3 به‌جای v4 یا نسخه قدیمی Drizzle) است. با نصب [اسکیل اتصال سرورهای Context7، Playwright و Figma MCP](/product/skill-context7-playwright-figma-mcp)، ایجنت پیش از نوشتن هر قطعه کد، مستندات رسمی و لحظه‌ای همان نسخه کتابخانه را از Context7 واکشی می‌کند.

### ۲. راستی‌آزمایی واقعی رابط کاربری با Playwright MCP
به‌جای اینکه ایجنت صرفاً حدس بزند چیدمان صفحه درست است، سرور **Playwright MCP** به او امکان می‌دهد مرورگر واقعی را باز کند، اسکرین‌شات بگیرد، خطاهای کنسول و شبکه (401/500) را بخواند و واکنش‌گرایی موبایل را تست کند. همچنین برای ساخت سرورهای اختصاصی سازمان خود می‌توانید از [اسکیل ساخت سرورهای استاندارد MCP](/product/skill-mcp-server-architect) استفاده نمایید.

### ۳. مدیریت هوشمند کانتکست و کاهش هزینه با قوانین .mdc
بارگذاری هم‌زمان ده‌ها اسکیل باعث شلوغی پنجره کانتکست می‌شود. توصیه می‌کنیم مقاله [مهندسی قوانین .cursor/rules (.mdc) و الگوی Caveman برای کاهش ۶۵ درصدی مصرف توکن](/article/cursor-mdc-rules-and-caveman-token-optimization) را مطالعه کنید و [اسکیل قوانین .mdc و بهینه‌ساز Caveman](/product/skill-cursor-mdc-caveman-optimizer) را کنار اسکیل‌های MCP فعال نمایید.`,
  },
  {
    id: 'art-modern-js-animation-stack-2026',
    title: 'مقایسه فنی موتورهای انیمیشن وب در ۲۰۲۶: GSAP (صددرصد رایگان)، Motion WAAPI، Anime.js v4 و Three.js WebGPU',
    slug: 'modern-js-animation-libraries-comparison-2026',
    category: 'مهندسی فرانت‌اند و انیمیشن',
    authorName: 'تیم مهندسی فرانت‌اند DPATech',
    featuredImageUrl: IMAGES.uiuxPkg,
    featuredImageAlt: 'مقایسه کتابخانه‌های انیمیشن جاوااسکریپت GSAP، Motion، Anime.js v4 و Three.js WebGPU',
    summary:
      'کدام کتابخانه انیمیشن برای پروژه شما بهترین انتخاب است؟ بررسی دقیق آزادسازی ۱۰۰٪ پلاگین‌های GSAP (شامل SplitText و MorphSVG)، عملکرد ۶۰ فریم Motion روی WAAPI، بازنویسی ماژولار Anime.js v4 و تحول گرافیک سه‌بعدی با Three.js WebGPU.',
    readingTimeMinutes: 8,
    publishedDateLabel: '۱۴۰۵/۰۸/۲۵',
    status: 'published',
    featured: true,
    seoTitle: 'مقایسه GSAP، Motion WAAPI، Anime.js v4 و Three.js WebGPU در ۲۰۲۶ | اسکیل ۹۸',
    seoDescription:
      'راهنمای انتخاب بهترین کتابخانه انیمیشن جاوااسکریپت بین GSAP، Motion، Anime.js v4، Lenis و Three.js WebGPU برای ساخت رابط‌های کاربری ۶۰ فریم.',
    seoKeywords: 'GSAP رایگان, Motion WAAPI, Anime.js v4, Three.js WebGPU, انیمیشن وب',
    bodyMarkdown: `### نقشه راه انتخاب کتابخانه انیمیشن در وب مدرن
انتخاب اشتباه کتابخانه انیمیشن می‌تواند حجم باندل صفحه را سنگین کرده و در موبایل باعث افت فریم (Jank) شود. در ادامه چهار ابزار پیشرو سال ۲۰۲۶ را از نظر معماری و کاربرد واقعی مقایسه می‌کنیم:

### ۱. GSAP 3 (اکنون ۱۰۰٪ رایگان با تمام پلاگین‌های حرفه‌ای)
خبر بزرگ دنیای وب این است که تمامی پلاگین‌های پرمیوم **GSAP** از جمله \`ScrollTrigger\`، \`SplitText\`، \`Flip\` و \`MorphSVG\` به‌صورت کامل رایگان شده‌اند. برای لندینگ‌پیج‌های داستانی و تایم‌لاین‌های پیچیده، هیچ جایگزینی به دقت GSAP نمی‌رسد. پیشنهاد می‌کنیم [اسکیل انیمیشن‌سازی پیشرفته با GSAP و ScrollTrigger](/product/skill-gsap-motion-mastery) را به پیشخوان خود اضافه کنید.

### ۲. Motion (نسل جدید Framer Motion) و Anime.js v4
اگر در React به دنبال میکروتعامل‌های فوق‌سبک با فیزیک فنری روی موتور سخت‌افزاری مرورگر (WAAPI) هستید، **Motion** بهترین گزینه است. در کنار آن، **Anime.js v4** با معماری کاملاً ماژولار و پشتیبانی عالی از Tree-Shaking برای انیمیشن‌های SVG و تایم‌لاین‌های سبک می‌درخشد. الگوی کامل هر دو کتابخانه در [اسکیل انیمیشن‌های ۶۰ فریم Motion و Anime.js v4](/product/skill-motion-waapi-animejs-v4) آماده شده است.

### ۳. صحنه‌های سه‌بعدی با Three.js WebGPU و شیدرهای TSL
با فراگیر شدن **WebGPU** و زبان شیدر **TSL** در Three.js، رندر المان‌های سه‌بعدی تعاملی و شیشه‌ای با مصرف باتری بسیار کمتر در موبایل ممکن شده است. چک‌لیست کامل مدیریت حافظه GPU را در [اسکیل Three.js WebGPU و شیدرهای TSL](/product/skill-threejs-webgpu-shaders) ببینید.

### ۴. ترکیب با چیدمان Muuri و اسکرول Lenis
برای آشنایی با ترکیب هم‌زمان گرید قابل جابه‌جایی و اسکرول نرم، راهنمای [ترکیب Muuri، GSAP، Lenis و Barba.js](/article/interactive-web-with-muuri-gsap-lenis-barba) را بخوانید.`,
  },
  {
    id: 'art-interactive-web-muuri-gsap-lenis-barba',
    title: 'راهنمای جامع ترکیب Muuri، GSAP، Lenis و Barba.js برای خلق وب‌سایت‌های تعاملی و شیشه‌ای',
    slug: 'interactive-web-with-muuri-gsap-lenis-barba',
    category: 'مهندسی فرانت‌اند و انیمیشن',
    authorName: 'تیم مهندسی فرانت‌اند DPATech',
    featuredImageUrl: IMAGES.fullstackPkg,
    featuredImageAlt: 'ترکیب کتابخانه‌های Muuri، GSAP، Lenis و Barba.js در طراحی وب مدرن',
    summary:
      'بررسی دقیق و فنی نحوه ترکیب چهار کتابخانه مکمل وب: Muuri برای چیدمان و جابه‌جایی آزادانه کارت‌ها، Lenis برای اسکرول ابریشمی، Barba.js برای ترنزیشن‌های شیشه‌ای بین صفحات و GSAP برای زمان‌بندی انیمیشن‌ها بدون تداخل با React.',
    readingTimeMinutes: 8,
    publishedDateLabel: '۱۴۰۵/۰۸/۲۴',
    status: 'published',
    featured: true,
    seoTitle: 'آموزش ترکیب Muuri، GSAP، Lenis و Barba.js در طراحی سایت | مجله اسکیل ۹۸',
    seoDescription:
      'چگونه با استفاده از کتابخانه Muuri برای جابه‌جایی المنت‌ها، Lenis برای اسکرول نرم و Barba.js + GSAP برای ترنزیشن شیشه‌ای، یک وب‌سایت مدرن بسازیم.',
    seoKeywords: 'کتابخانه Muuri, GSAP, Lenis, Barba.js, ترنزیشن شیشه ای, طراحی سایت تعاملی',
    bodyMarkdown: `### چرا ترکیب این چهار کتابخانه تجربه کاربری وب‌سایت را متحول می‌کند؟
در وب‌سایت‌های مدرن، کاربر انتظار دارد محیط سایت زنده، واکنش‌گرا و بدون پرش‌های ناگهانی باشد. هر یک از این چهار کتابخانه وظیفه مشخصی را در معماری فرانت‌اند بر عهده دارند و وقتی درست همگام‌سازی شوند، هیچ تداخلی با یکدیگر ندارند.

### ۱. کتابخانه Muuri: چیدمان شبکه‌ای هوشمند و جابه‌جایی کارت‌ها
برخلاف گریدهای ایستا، **Muuri** به کاربر اجازه می‌دهد کارت‌های محصول و بلوک‌های اطلاعاتی را با ماوس یا لمس صفحه جابه‌جا کند و هنگام فیلتر کردن، کارت‌ها با انیمیشن ۶۰ فریم در جای جدید قرار بگیرند. کد مرجع کامل در [اسکیل چیدمان شبکه‌ای و جابه‌جایی با Muuri.js](/product/skill-muuri-interactive-grid) قرار دارد.

### ۲. کتابخانه Lenis و ترنزیشن شیشه‌ای Barba.js + GSAP
با اتصال حلقه \`raf\` کتابخانه **Lenis** به \`gsap.ticker\`، اسکرول کل فروشگاه و مقالات دارای اینرسی ابریشمی می‌شود. هنگام جابه‌جایی بین صفحات نیز با ترکیب **Barba.js** و افکت \`blur(14px)\`، صفحه فعلی به شکل شیشه‌ای محو شده و صفحه جدید بدون پرش ظاهر می‌گردد. برای پیاده‌سازی سریع، [اسکیل اسکرول نرم Lenis و ترنزیشن Barba.js](/product/skill-lenis-barba-transitions) و همچنین [پکیج استودیو فرانت‌اند تعاملی](/product/pkg-interactive-web-motion-bundle) را بررسی کنید.

### ادامه مسیر یادگیری
پیشنهاد می‌کنیم مقاله [مقایسه فنی موتورهای انیمیشن وب در ۲۰۲۶](/article/modern-js-animation-libraries-comparison-2026) را نیز مطالعه نمایید.`,
  },
  {
    id: 'art-cursor-mdc-caveman-token-optimization',
    title: 'مهندسی قوانین .cursor/rules (.mdc) و الگوی Caveman برای کاهش ۶۵ درصدی مصرف توکن و خطای ایجنت‌ها',
    slug: 'cursor-mdc-rules-and-caveman-token-optimization',
    category: 'پروتکل MCP و اسکیل‌نویسی',
    authorName: 'تحریریه فنی اسکیل ۹۸',
    featuredImageUrl: IMAGES.heroStudio,
    featuredImageAlt: 'بهینه‌سازی مصرف توکن و ساختار قوانین .mdc در Cursor و Claude Code',
    summary:
      'چگونه با تفکیک فایل‌های قوانین بر اساس Glob، جلوگیری از بارگذاری کانتکست اضافی و استفاده از الگوی پاسخ‌دهی فشرده Caveman، سرعت اجرای ایجنت‌های کدنویسی را دو برابر و هزینه API را تا ۶۵٪ کاهش دهیم.',
    readingTimeMinutes: 7,
    publishedDateLabel: '۱۴۰۵/۰۸/۲۳',
    status: 'published',
    featured: false,
    seoTitle: 'آموزش قوانین .cursor/rules (.mdc) و الگوی Caveman | مجله اسکیل ۹۸',
    seoDescription:
      'راهنمای ساختاردهی پوشه .cursor/rules با فایل‌های .mdc و کاهش چشمگیر مصرف توکن در Cursor، Claude Code و Codex.',
    seoKeywords: 'Cursor mdc rules, Caveman optimizer, کاهش مصرف توکن, مهندسی کانتکست',
    bodyMarkdown: `### تله کانتکست متورم در پروژه‌های بزرگ
وقتی تمام قوانین فرانت‌اند، بک‌اند، دیتابیس و دیزاین را در یک فایل \`CLAUDE.md\` یا \`.cursorrules\` دوهزار خطی می‌ریزید، مدل در هر پیام هزاران توکن غیرمرتبط می‌خواند و دقت دستورپذیری آن افت می‌کند.

### ۱. قوانین شرطی با فرمت .mdc و فیلتر Glob
در ساختار استاندارد پوشه \`.cursor/rules/\`، هر قانون دارای هدر متادیتا با فیلتر \`globs\` است. برای مثال قانون کامپوننت‌های UI فقط زمانی بارگذاری می‌شود که فایل \`.tsx\` باز باشد و قانون SQL فقط هنگام ویرایش پوشه \`database/\` تزریق می‌گردد. تمپلیت کامل این ساختار را از [اسکیل مهندسی قوانین .mdc و بهینه‌ساز Caveman](/product/skill-cursor-mdc-caveman-optimizer) دریافت کنید.

### ۲. الگوی Caveman در پاسخ‌های ایجنت
با تعریف صریح لحن پاسخ‌دهی موجز و بدون حاشیه در مراحل میانی دیباگ، توکن‌های خروجی (که گران‌ترین بخش هزینه مدل هستند) تا ۶۵ درصد کاهش می‌یابند بدون آنکه کوچک‌ترین افتی در کیفیت کد TypeScript ایجاد شود. برای شناخت خودکار نقشه فایل‌های پروژه قبل از اعمال قوانین، [اسکیل نقشه‌خوان پروژه و معماری کدبیس](/product/skill-codex-project-map) مکمل بی‌نظیری است.

### مطالعه مرتبط
برای تکمیل گردش کار ایجنت خود، [راهنمای جامع استاندارد SKILL.md و سرورهای MCP](/article/claude-code-skill-md-and-mcp-servers-guide) را بخوانید.`,
  },
  {
    id: 'art-fullstack-hono-drizzle-tanstack-biome',
    title: 'معماری فول‌استک مدرن با Hono، Drizzle ORM، TanStack Query و ابزار Biome بدون سربار اضافی',
    slug: 'fullstack-architecture-hono-drizzle-tanstack-biome',
    category: 'معماری نرم‌افزار و بک‌اند',
    authorName: 'تیم معماری بک‌اند اسکیل ۹۸',
    featuredImageUrl: IMAGES.securityPkg,
    featuredImageAlt: 'معماری فول‌استک تایپ‌اسکریپت با Hono، Drizzle ORM، TanStack Query و Biome',
    summary:
      'بررسی استک سبک و پرسرعت TypeScript برای سال ۲۰۲۶: از APIهای تایپ‌سیف Hono و کوئری‌های شفاف Drizzle ORM روی SQLite/PostgreSQL تا مدیریت هوشمند Server State با TanStack Query v5 و لینتینگ آنی با Biome.',
    readingTimeMinutes: 9,
    publishedDateLabel: '۱۴۰۵/۰۸/۲۲',
    status: 'published',
    featured: false,
    seoTitle: 'معماری فول‌استک Hono، Drizzle ORM، TanStack Query و Biome | اسکیل ۹۸',
    seoDescription:
      'چگونه یک اپلیکیشن فول‌استک مقیاس‌پذیر و تایپ‌سیف با Hono، Drizzle ORM، TanStack Query، Zustand و Biome پیاده‌سازی کنیم.',
    seoKeywords: 'Hono API, Drizzle ORM, TanStack Query, Zustand, Biome, معماری فول استک',
    bodyMarkdown: `### چرا تیم‌های مهندسی به سمت استک‌های سبک و تایپ‌سیف حرکت کرده‌اند؟
ابزارهای سنگین قدیمی با زمان بیلد طولانی و کانفیگ‌های پیچیده، سرعت تیم‌ها را می‌گرفتند. ترکیب **Hono + Drizzle + TanStack + Biome** تمام لایه‌های پروژه را با یک زبان واحد (TypeScript) و حداکثر سرعت اجرا به هم متصل می‌کند.

### ۱. لایه سرور و دیتابیس: Hono + Drizzle ORM
فریم‌ورک **Hono** روی Node.js، Bun و Edge Runtimeها اجرا می‌شود و با **Drizzle ORM** به شما اجازه می‌دهد همان اسکیمای تایپ‌سیف را در محیط توسعه روی SQLite و در پروداکشن روی PostgreSQL اجرا کنید. جزئیات کامل پیاده‌سازی را در [اسکیل بک‌اند Hono، Drizzle ORM و Biome](/product/skill-hono-drizzle-biome-stack) ببینید.

### ۲. لایه فرانت‌اند: تفکیک Server State با TanStack Query و Zustand
نگهداری پاسخ‌های API در استورهای عمومی یکی از عوامل اصلی باگ‌های همگام‌سازی است. با [اسکیل معماری TanStack Query، Router و Zustand](/product/skill-tanstack-zustand-architecture)، کش داده‌ها، رفرش پس‌زمینه و آپدیت خوش‌بینانه به‌صورت خودکار مدیریت می‌شود.

### ۳. امنیت لایه API و محافظت OWASP
هیچ بک‌اند پرسرعتی بدون امنیت کامل نیست؛ حتماً [اسکیل امنیت وب‌سرویس و محافظت OWASP Top 10](/product/skill-owasp-api-security-shield) را در کنار لایه API خود پیاده‌سازی نمایید.`,
  },
  {
    id: 'art-how-to-write-production-skill-md',
    title: 'استاندارد مهندسی فایل SKILL.md و دیزاین سیستم فروشگاهی برای تیم‌های توسعه در اسکیل ۹۸',
    slug: 'engineering-standard-skill-md-for-claude-and-codex',
    category: 'پروتکل MCP و اسکیل‌نویسی',
    authorName: 'تحریریه فنی اسکیل ۹۸',
    featuredImageUrl: IMAGES.heroStudio,
    featuredImageAlt: 'ساختار استاندارد فایل SKILL.md برای دستیارهای کدنویسی و هوش مصنوعی',
    summary:
      'یک فایل SKILL.md حرفه‌ای از چه بخش‌هایی تشکیل شده است؟ بررسی ساختار YAML Frontmatter، قوانین طراحی رابط کاربری Anti-Slop، الگوهای کد مرجع و نحوه استقرار در فروشگاه‌های مدرن.',
    readingTimeMinutes: 6,
    publishedDateLabel: '۱۴۰۵/۰۸/۲۱',
    status: 'published',
    featured: false,
    seoTitle: 'آموزش نوشتن فایل SKILL.md استاندارد برای Claude و Codex | اسکیل ۹۸',
    seoDescription:
      'یاد بگیرید چگونه دستورالعمل‌های تکراری کدنویسی، طراحی رابط کاربری و معماری فروشگاه را به یک فایل SKILL.md استاندارد تبدیل کنید.',
    seoKeywords: 'فایل SKILL.md, اسکیل نویسی, Claude Code Skills, دیزاین سیستم UI/UX, اسکیل ۹۸',
    bodyMarkdown: `### اجزای یک فایل SKILL.md استاندارد و قابل اتکا
یک اسکیل مهندسی‌شده فقط چند خط پرامپت نیست؛ بلکه یک قرارداد دقیق بین معمار نرم‌افزار و ایجنت هوش مصنوعی است که از سه بخش تشکیل می‌شود:
1. **متادیتای ساختاریافته (YAML Frontmatter):** شامل شناسه اسکیل، نسخه، ابزارهای سازگار و دامنه اجرا.
2. **قوانین سخت‌گیرانه (Constraints & Anti-Patterns):** مشخص می‌کند ایجنت دقیقاً چه کارهایی را *نباید* انجام دهد (مثلاً پرهیز از طرح‌های کلیشه‌ای، استفاده از ایندکس‌های ترکیبی SQL و رعایت کنتراست RTL).
3. **الگوهای کد تست‌شده (Reference Snippets):** نمونه کدهای واقعی که مدل مستقیماً از ساختار آن‌ها الگوبرداری می‌کند.

### ترکیب اسکیل‌نویسی با دیزاین سیستم و معماری سازمانی
برای ارتقای کیفیت بصری پروژه‌های تولیدشده با هوش مصنوعی، [اسکیل دیزاین سیستم UI/UX Pro Max](/product/skill-ui-ux-pro-max) و برای راه‌اندازی کامل فروشگاه و پنل مدیریت دو سطحی با درگاه شاپرک، [پکیج جامع معماری فروشگاه و صفحه‌ساز](/product/pkg-dpatech-cms-enterprise) را بررسی کنید. همچنین پیشنهاد می‌شود [راهنمای استاندارد SKILL.md و سرورهای MCP](/article/claude-code-skill-md-and-mcp-servers-guide) را مطالعه فرمایید.`,
  },
];

export const TARGET_ARCHITECTURE_GUIDE: ArchitecturePhase[] = [
  {
    stepNumber: '۰۱',
    title: 'انتخاب اسکیل و احراز هویت با شماره همراه',
    subtitle: 'گام اول: انتخاب و ثبت در حساب کاربری',
    summary:
      'ابتدا از فروشگاه اسکیل ۹۸، اسکیل رایگان یا پکیج تخصصی متناسب با ابزار خود (Claude، ChatGPT یا Codex) را انتخاب کنید و با شماره موبایل و کد تایید وارد شوید تا برای همیشه در سوابق شما ثبت بماند.',
    keyActions: [
      'فیلتر اسکیل‌ها بر اساس ابزار سازگار (Claude، ChatGPT، Codex) یا جستجو بر اساس نیاز پروژه',
      'ورود یک‌مرحله‌ای با شماره تلفن همراه و کد تایید پیامکی برای حفظ دائمی فایل‌ها و فاکتورها',
      'کلیک روی «افزودن رایگان به حساب کاربری» برای اسکیل‌های آزاد و ثبت فوری در کتابخانه شخصی',
    ],
    deliverableTag: 'ثبت در کتابخانه کاربر',
  },
  {
    stepNumber: '۰۲',
    title: 'خرید پکیج‌های تخصصی و تسویه آنلاین شاپرک',
    subtitle: 'گام دوم: افزودن به سبد خرید و پرداخت امن',
    summary:
      'برای دریافت پکیج‌های حرفه‌ای، محصول را به سبد خرید اضافه کنید، در صورت داشتن کد تخفیف آن را اعمال نمایید و از طریق درگاه‌های فعال شاپرک تسویه کنید.',
    keyActions: [
      'بازبینی اقلام سبد خرید و اعمال کد تخفیف در صورت وجود',
      'انتخاب درگاه پرداخت فعال و دریافت کد پیگیری تراکنش',
      'باز شدن خودکار دسترسی دانلود پکیج در پیشخوان کاربری بلافاصله پس از پرداخت',
    ],
    deliverableTag: 'فعال‌سازی فوری در پیشخوان',
  },
  {
    stepNumber: '۰۳',
    title: 'دانلود یا کپی فایل استاندارد SKILL.md از پیشخوان من',
    subtitle: 'گام سوم: دسترسی دائمی به فایل‌ها و نوشته‌ها',
    summary:
      'پس از ورود به «پیشخوان من ← اسکیل‌های من»، هر اسکیل را انتخاب کنید تا متن کامل دستورالعمل، مراحل اجرا و دکمه دانلود مستقیم فایل `.md` برای شما نمایش داده شود.',
    keyActions: [
      'جستجو و انتخاب هر اسکیل در لیست کتابخانه شخصی و مشاهده جزئیات و دستورالعمل آن',
      'دانلود مستقیم فایل استاندارد با فرمت Markdown (.md) یا کپی سریع متن اسکیل با یک کلیک',
      'امکان ذخیره یادداشت شخصی برای هر اسکیل و مشاهده تاریخچه سفارش‌های قبلی',
    ],
    deliverableTag: 'فایل آماده SKILL.md',
  },
  {
    stepNumber: '۰۴',
    title: 'نصب و اجرای اسکیل در Claude، ChatGPT، Codex و Cursor',
    subtitle: 'گام چهارم: نصب و استفاده عملی در ابزارهای هوش مصنوعی',
    summary:
      'فایل دانلودشده را متناسب با ابزار هوش مصنوعی خود در پوشه پروژه قرار دهید یا به دانش پروژه اضافه کنید تا مدل زبانی دقیقاً طبق استاندارد اسکیل عمل کند.',
    keyActions: [
      'در Claude Code: ذخیره فایل در مسیر `.claude/skills/<skill-name>/SKILL.md` یا آپلود در Claude Projects',
      'در Codex CLI و ChatGPT: ذخیره در `.codex/skills/<skill-name>/SKILL.md` یا درج در Custom Instructions',
      'در Cursor و VS Code: قرار دادن در `.cursor/rules/` یا فراخوانی مستقیم با `@SKILL.md` در چت',
    ],
    deliverableTag: 'اجرای دقیق در پروژه',
  },
];

export const STARTER_KIT_FILES: StarterFileEntry[] = [
  {
    path: 'README-SKILL98.md',
    description: 'مستندات معماری پلتفرم اسکیل ۹۸ و استک تعاملی (Muuri + GSAP + Lenis + Barba)',
    getContent: (theme) => `# ${theme.brandNameFa} (${theme.brandNameEn}) — Starter Kit

این بسته شامل ساختار کامل فرانت‌اند و ماژول‌های تعاملی **${theme.brandNameFa}** (طراحی و توسعه توسط **DPATech**) است.

## کتابخانه‌های تعاملی و انیمیشن فعال در پروژه
1. **Muuri**: چیدمان شبکه‌ای هوشمند و قابلیت جابه‌جایی المان‌های وب‌سایت توسط کاربر.
2. **Lenis**: اسکرول نرم و سینمایی هماهنگ با \`gsap.ticker\`.
3. **Barba.js**: ترنزیشن‌های شیشه‌ای و بلورمانند (Frosted Glass Blur) هنگام جابه‌جایی بین صفحات.
4. **GSAP**: انیمیشن‌های ورود کارت‌ها و تایم‌لاین‌های حرکتی.
`,
  },
  {
    path: 'index.html',
    description: 'فایل HTML اصلی با فونت ساحل (Sahel) برای هدرها، فونت‌های نرم برای اعداد و فاویکون اختصاصی',
    getContent: (theme) => `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="${theme.faviconUrl || '/favicon.svg'}" />
  <title>${theme.brandNameFa} | مرجع تخصصی اسکیل‌های هوش مصنوعی</title>
  <link rel="preload" as="font" type="font/woff2" href="/fonts/Vazirmatn-Variable.woff2" crossorigin />
  <link rel="preload" as="font" type="font/woff2" href="/fonts/Sahel-Bold.woff2" crossorigin />
</head>
<body class="bg-[#F6F5F1] text-stone-900">
  <div id="root" data-barba="wrapper"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
  },
  {
    path: 'src/core/motionAndDragEngine.ts',
    description: 'ماژول یکپارچه Muuri + GSAP + Lenis + Barba.js با ترنزیشن شیشه‌ای',
    getContent: () => `// Motion & Interactive Grid Engine (Muuri + GSAP + Lenis + Barba.js)
import gsap from 'gsap';
import Lenis from 'lenis';
import barba from '@barba/core';
import Muuri from 'muuri';

export function setupMotionEngine() {
  const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  return { lenis, barbaVersion: barba.version, muuriAvailable: Boolean(Muuri) };
}
`,
  },
  {
    path: 'src/data/catalog.json',
    description: 'کاتالوگ JSON شامل ۶۰ اسکیل معتبر گیت‌هاب و پکیج‌های تخصصی',
    getContent: () =>
      JSON.stringify(
        INITIAL_SKILL98_CATALOG.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          price: item.price,
          githubSourceRepo: item.githubSourceRepo,
          version: item.version,
        })),
        null,
        2
      ),
  },
];

export const FULL_TARGET_GUIDE_MARKDOWN = `# راهنمای خرید، دانلود، نصب و استفاده از اسکیل‌ها در اسکیل ۹۸

## ۱. دریافت اسکیل‌های رایگان و خرید پکیج‌ها
1. ابتدا اسکیل یا پکیج مورد نظر خود را از فروشگاه انتخاب کنید.
2. با شماره تلفن همراه خود وارد شوید تا سوابق خرید و فایل‌های دانلودی همیشه به نام شما محفوظ بماند.
3. برای اسکیل‌های رایگان روی «افزودن رایگان به حساب کاربری» کلیک کنید و برای پکیج‌های تخصصی، پرداخت شاپرک را از سبد خرید تکمیل نمایید.

## ۲. دانلود از پیشخوان کاربری
- وارد بخش «پیشخوان من» شوید.
- از فهرست کتابخانه شخصی، اسکیل دلخواه را انتخاب کنید تا متن کامل و دکمه دانلود فایل \`.md\` در اختیارتان قرار گیرد.

## ۳. نصب و استفاده در ابزارهای هوش مصنوعی
- **Claude Code:** فایل را در مسیر \`.claude/skills/<skill-name>/SKILL.md\` قرار دهید یا در **Claude Projects** آپلود کنید.
- **Codex CLI / ChatGPT:** فایل را در مسیر \`.codex/skills/<skill-name>/SKILL.md\` ذخیره کنید یا متن آن را در دستورالعمل چت قرار دهید.
- **Cursor / VS Code:** فایل را داخل \`.cursor/rules/\` کپی کرده و در چت با \`@SKILL.md\` به آن ارجاع دهید.
`;
