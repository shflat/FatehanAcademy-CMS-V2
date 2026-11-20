import type { SkillProduct, PosterColorScheme } from './skill98Data';

const CATALOG_IMAGES = {
  fullstackPkg: '/images/skill98-fullstack-pkg.png',
  uiuxPkg: '/images/skill98-uiux-pkg.png',
  securityPkg: '/images/skill98-security-pkg.png',
  aiAutomationPkg: '/images/skill98-ai-automation-pkg.png',
};

interface CompactSkillSeed {
  id: string;
  title: string;
  category: 'Claude' | 'ChatGPT' | 'Codex';
  subCategory: string;
  itemType: 'product' | 'package';
  price: number;
  originalPrice: number;
  posterCode: string;
  posterTagEn: string;
  posterColor: PosterColorScheme;
  posterIconType: 'braces' | 'grid' | 'radial' | 'starburst' | 'shield' | 'layers';
  githubSourceRepo: string;
  shortDescription: string;
  expectedOutput: string;
  codeSnippet: string;
  keywords: string;
}

const VERIFIED_SKILL_SEEDS: CompactSkillSeed[] = [
  {
    id: 'skill-mcp-server-architect',
    title: 'اسکیل ساخت سرورهای استاندارد MCP (Model Context Protocol)',
    category: 'Claude',
    subCategory: 'پروتکل MCP و ابزارها',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'MCP / ۰۹',
    posterTagEn: 'MODEL CONTEXT PROTOCOL',
    posterColor: 'terracotta',
    posterIconType: 'layers',
    githubSourceRepo: 'modelcontextprotocol/servers',
    shortDescription:
      'اتصال مستقیم Claude Desktop و Claude Code به دیتابیس‌ها، APIهای داخلی و فایل‌سیستم با پروتکل رسمی MCP شرکت Anthropic.',
    expectedOutput:
      'سرور کامل TypeScript MCP با تعریف Tools، Resources و Prompts استاندارد به همراه فایل تنظیمات claude_desktop_config.json.',
    codeSnippet: `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
const server = new McpServer({ name: "dpatech-mcp", version: "1.0.0" });`,
    keywords: 'پروتکل MCP, اسکیل Claude, Model Context Protocol, ساخت سرور MCP',
  },
  {
    id: 'skill-docker-ubuntu-traefik',
    title: 'اسکیل معماری میکروسرویس و پیکربندی SSL خودکار در پروژه‌های Node.js',
    category: 'Codex',
    subCategory: 'معماری بک‌اند و شبکه',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'CLOUD / ۱۰',
    posterTagEn: 'CLOUD NATIVE NODE22',
    posterColor: 'cobalt',
    posterIconType: 'shield',
    githubSourceRepo: 'nodejs/docker-node',
    shortDescription:
      'الگوهای استاندارد ساخت سرویس‌های Node 22، بهینه‌سازی حافظه، شبکه ایزوله و پیکربندی گواهی امنیتی SSL خودکار.',
    expectedOutput:
      'فایل‌های پیکربندی استاندارد محیط پروداکشن به همراه بررسی سلامت خودکار سرویس (Healthcheck).',
    codeSnippet: `export const serverConfig = {
  port: 3000,
  healthCheckPath: "/api/health"
};`,
    keywords: 'معماری میکروسرویس, Node.js 22, گواهی SSL, بهینه سازی بک اند',
  },
  {
    id: 'skill-ios-telegram-mobile-ui',
    title: 'اسکیل طراحی رابط موبایل به سبک iOS 18 و تلگرام مدرن',
    category: 'ChatGPT',
    subCategory: 'طراحی موبایل و Glass UI',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'IOS-TG / ۱۱',
    posterTagEn: 'TELEGRAM & IOS GLASS UX',
    posterColor: 'violet',
    posterIconType: 'radial',
    githubSourceRepo: 'TelegramMessenger/Telegram-iOS (UI Patterns)',
    shortDescription:
      'پیاده‌سازی نوار ناوبری شیشه‌ای پایین صفحه (Bottom Glass Bar)، دراورهای لمسی نرم، جلوگیری از اسکرول افقی و تایپوگرافی یک‌خطی تمیز در موبایل.',
    expectedOutput:
      'کامپوننت‌های واکنش‌گرا با استاندارد Touch Target 44px، افکت بلور دولایه (backdrop-blur-2xl) و پالت تیره سرمه‌ای بدون مشکی خالص.',
    codeSnippet: `.ios-glass {
  background: rgba(22, 32, 56, 0.82);
  backdrop-filter: blur(24px) saturate(190%);
}`,
    keywords: 'طراحی موبایل تلگرام, رابط کاربری iOS, اسکیل UI موبایل, فرستد گلس',
  },
  {
    id: 'skill-tailwind-v4-design-tokens',
    title: 'اسکیل معماری توکن‌های رنگی و تم‌پذیری در Tailwind CSS v4',
    category: 'Codex',
    subCategory: 'استایل و دیزاین سیستم',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'TW-V4 / ۱۲',
    posterTagEn: 'TAILWIND V4 ENGINE',
    posterColor: 'sage',
    posterIconType: 'grid',
    githubSourceRepo: 'tailwindlabs/tailwindcss',
    shortDescription:
      'پیکربندی حرفه‌ای Tailwind v4 با متغیرهای CSS زنده، پشتیبانی کامل از حالت روشن و تیره (@custom-variant dark) و پالت‌های چندگانه.',
    expectedOutput:
      'فایل استایل سراسری با متغیرهای رنگ پویا، فونت‌های فارسی با اعداد نرم (tabular-nums) و حذف کامل تداخل‌های کنتراست.',
    codeSnippet: `@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));`,
    keywords: 'اسکیل Tailwind v4, تغییر تم سایت, دارک مود استاندارد, CSS Variables',
  },
  {
    id: 'skill-owasp-api-security-shield',
    title: 'اسکیل امنیت وب‌سرویس، Rate-Limit و محافظت OWASP Top 10',
    category: 'Claude',
    subCategory: 'امنیت سایبری و API',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'OWASP / ۱۳',
    posterTagEn: 'API SECURITY SHIELD',
    posterColor: 'slate',
    posterIconType: 'shield',
    githubSourceRepo: 'OWASP/API-Security',
    shortDescription:
      'ایمن‌سازی سرورهای Express و Node.js در برابر حملات Brute-force، تزریق اسکریپت (XSS)، جعل درخواست و محدودسازی نرخ درخواست (Rate Limiting).',
    expectedOutput:
      'میدل‌ورهای امنیتی آماده برای هدرهای HTTP، امضای رمزنگاری‌شده HMAC-SHA256 برای OTP و محدودکننده هوشمند درخواست بر اساس IP.',
    codeSnippet: `res.setHeader("X-Content-Type-Options", "nosniff");
res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");`,
    keywords: 'امنیت API, استاندارد OWASP, جلوگیری از Brute Force, امنیت Node.js',
  },
  {
    id: 'skill-shadcn-radix-primitives',
    title: 'اسکیل ساخت کامپوننت‌های دسترس‌پذیر با shadcn/ui و Radix',
    category: 'Codex',
    subCategory: 'کامپوننت‌های React',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'SHADCN / ۱۴',
    posterTagEn: 'SHADCN & RADIX UI',
    posterColor: 'cobalt',
    posterIconType: 'grid',
    githubSourceRepo: 'shadcn-ui/ui',
    shortDescription:
      'طراحی دیالوگ‌ها، منوهای کشویی، تب‌ها و فرم‌های تعاملی با پشتیبانی کامل از راست‌به‌چپ (RTL) و فوکوس کیبورد استاندارد WAI-ARIA.',
    expectedOutput:
      'مجموعه کامپوننت‌های ماژولار و قابل سفارشی‌سازی بدون وابستگی سنگین و کاملاً منطبق با تم پروژه.',
    codeSnippet: `export function DialogSurface({ children }: { children: React.ReactNode }) {
  return <div role="dialog" aria-modal="true">{children}</div>;
}`,
    keywords: 'اسکیل shadcn, کامپوننت React, طراحی RTL, Radix UI',
  },
  {
    id: 'skill-playwright-e2e-automation',
    title: 'اسکیل تست سرتاسری (E2E) و ممیزی خودکار رابط کاربری با Playwright',
    category: 'Codex',
    subCategory: 'تست و تضمین کیفیت',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'TEST / ۱۵',
    posterTagEn: 'PLAYWRIGHT E2E SUITE',
    posterColor: 'sage',
    posterIconType: 'braces',
    githubSourceRepo: 'microsoft/playwright',
    shortDescription:
      'نوشتن سناریوهای تست خودکار برای فرآیند خرید، ورود با OTP، بررسی عدم سرریز افقی در موبایل و صحت عملکرد دکمه‌ها.',
    expectedOutput:
      'اسکریپت‌های تست Playwright برای دسکتاپ (1440px) و موبایل (375px) به همراه گزارش سلامت چیدمان صفحه.',
    codeSnippet: `test("mobile viewport has zero horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
});`,
    keywords: 'تست Playwright, تست خودکار فرانت اند, تضمین کیفیت وب, اسکیل تست',
  },
  {
    id: 'skill-drizzle-postgres-schema',
    title: 'اسکیل طراحی اسکیمای پایگاه داده رابطه‌ای با Drizzle ORM و PostgreSQL',
    category: 'Codex',
    subCategory: 'پایگاه داده و بک‌اند',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'DRIZZLE / ۱۶',
    posterTagEn: 'DRIZZLE ORM & SQL',
    posterColor: 'cobalt',
    posterIconType: 'layers',
    githubSourceRepo: 'drizzle-team/drizzle-orm',
    shortDescription:
      'مدل‌سازی جداول کاربران، نقش‌ها، سفارشات، کوپن‌ها و مقالات با Type-Safety کامل در TypeScript و کوئری‌های بهینه.',
    expectedOutput:
      'فایل schema.ts کامل به همراه ایندکس‌های بهینه، روابط کلید خارجی و مهاجرت‌های بدون قطعی (Zero-Downtime Migrations).',
    codeSnippet: `export const products = pgTable("products", {
  id: text("id").primaryKey(),
  price: integer("price").notNull(),
});`,
    keywords: 'اسکیل Drizzle ORM, طراحی دیتابیس PostgreSQL, بک اند TypeScript',
  },
  {
    id: 'skill-prisma-enterprise-data',
    title: 'اسکیل مدیریت تراکنش‌های مالی و مدل‌سازی داده با Prisma ORM',
    category: 'Codex',
    subCategory: 'پایگاه داده و تراکنش',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'PRISMA / ۱۷',
    posterTagEn: 'PRISMA DATA LAYER',
    posterColor: 'violet',
    posterIconType: 'layers',
    githubSourceRepo: 'prisma/prisma',
    shortDescription:
      'پیاده‌سازی تراکنش‌های اتمیک (ACID) برای ثبت سفارش، کسر موجودی کیف پول و صدور فاکتور بدون بروز خطای Race Condition.',
    expectedOutput:
      'مدل‌های Prisma و سرویس تراکنش مالی امن برای فروشگاه‌های آنلاین پرترافیک.',
    codeSnippet: `await prisma.$transaction(async (tx) => {
  await tx.order.create({ data: orderPayload });
});`,
    keywords: 'اسکیل Prisma, تراکنش مالی دیتابیس, ORM تایپ اسکریپت',
  },
  {
    id: 'skill-threejs-webgl-interactive',
    title: 'اسکیل صحنه‌های سه‌بعدی تعاملی و شیدرهای وب با Three.js',
    category: 'Codex',
    subCategory: 'گرافیک سه‌بعدی و WebGL',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'THREE / ۱۸',
    posterTagEn: 'THREE.JS & WEBGL 3D',
    posterColor: 'terracotta',
    posterIconType: 'starburst',
    githubSourceRepo: 'mrdoob/three.js',
    shortDescription:
      'ساخت پس‌زمینه‌های سه‌بعدی سبک، نورپردازی استودیویی و انیمیشن‌های واکنش‌گرا به حرکت ماوس با حفظ نرخ ۶۰ فریم بر ثانیه.',
    expectedOutput:
      'بوم WebGL بهینه با مدیریت خودکار Resize، پاک‌سازی حافظه GPU (dispose) و هماهنگی با GSAP.',
    codeSnippet: `const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));`,
    keywords: 'اسکیل Three.js, طراحی سه بعدی وب, WebGL, شیدر GLSL',
  },
  {
    id: 'skill-tanstack-query-caching',
    title: 'اسکیل مدیریت کش سرور، همگام‌سازی زنده و Optimistic UI با TanStack Query',
    category: 'Codex',
    subCategory: 'مدیریت استیت و شبکه',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'QUERY / ۱۹',
    posterTagEn: 'TANSTACK QUERY V5',
    posterColor: 'sage',
    posterIconType: 'radial',
    githubSourceRepo: 'TanStack/query',
    shortDescription:
      'حذف کامل وضعیت‌های لودینگ تکراری، بروزرسانی آنی رابط کاربری پیش از پاسخ سرور و مدیریت هوشمند خطاهای شبکه.',
    expectedOutput:
      'هوک‌های سفارشی واکشی داده با قابلیت Stale-While-Revalidate و آپدیت خوش‌بینانه سبد خرید.',
    codeSnippet: `const { data } = useQuery({
  queryKey: ["skills", filter],
  staleTime: 60_000,
});`,
    keywords: 'اسکیل TanStack Query, React Query, مدیریت کش فرانت اند',
  },
  {
    id: 'skill-zustand-clean-store',
    title: 'اسکیل معماری استیت سراسری سبک و پایدار با Zustand',
    category: 'Codex',
    subCategory: 'مدیریت استیت فرانت‌اند',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'ZUSTAND / ۲۰',
    posterTagEn: 'ZUSTAND STATE ENGINE',
    posterColor: 'cobalt',
    posterIconType: 'braces',
    githubSourceRepo: 'pmndrs/zustand',
    shortDescription:
      'مدیریت سبد خرید، نشست کاربر، تنظیمات پوسته و اسکیل‌های ذخیره‌شده بدون رندرهای اضافی کامپوننت‌ها.',
    expectedOutput:
      'استور ماژولار تایپ‌اسکریپت با میان‌افزار ذخیره‌سازی پایدار و سلکتورهای بهینه.',
    codeSnippet: `export const useCartStore = create<CartState>()((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
}));`,
    keywords: 'اسکیل Zustand, مدیریت استیت React, بهینه سازی رندر',
  },
  {
    id: 'skill-zod-type-validation',
    title: 'اسکیل اعتبارسنجی دقیق فرم‌ها و ورودی‌های سرور با Zod',
    category: 'Codex',
    subCategory: 'اعتبارسنجی و امنیت داده',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'ZOD / ۲۱',
    posterTagEn: 'ZOD SCHEMA VALIDATION',
    posterColor: 'violet',
    posterIconType: 'shield',
    githubSourceRepo: 'colinhacks/zod',
    shortDescription:
      'تعریف اسکیمای واحد برای فرم‌های فرانت‌اند و بدنه درخواست‌های API بک‌اند با پیام‌های خطای فارسی دقیق.',
    expectedOutput:
      'اسکیماهای اعتبارسنجی محصول، مقاله، شماره موبایل و کد تخفیف با استنتاج خودکار تایپ‌ها.',
    codeSnippet: `const PhoneSchema = z.string().regex(/^09\\d{9}$/, "شماره موبایل معتبر نیست");`,
    keywords: 'اسکیل Zod, اعتبارسنجی فرم در React, امنیت ورودی API',
  },
  {
    id: 'skill-technical-seo-jsonld',
    title: 'اسکیل سئوی تکنیکال، اسکیماهای JSON-LD و کارت‌های شبکه اجتماعی',
    category: 'ChatGPT',
    subCategory: 'سئو تکنیکال و معنایی',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'SEO-PRO / ۲۲',
    posterTagEn: 'SCHEMA.ORG & OPENGRAPH',
    posterColor: 'sage',
    posterIconType: 'radial',
    githubSourceRepo: 'schemaorg/schemaorg',
    shortDescription:
      'تولید داده‌های ساختاریافته Product، Article و FAQPage برای نمایش ستاره‌ها، قیمت و سوالات متداول در نتایج اول گوگل.',
    expectedOutput:
      'بلوک‌های استاندارد JSON-LD، متاتگ‌های OpenGraph و Twitter Card و ساختار هدینگ‌های H1 تا H3.',
    codeSnippet: `{"@context":"https://schema.org","@type":"Product","name":"اسکیل ۹۸"}`,
    keywords: 'اسکیل سئو تکنیکال, اسکیما JSON-LD, بهینه سازی گوگل, OpenGraph',
  },
  {
    id: 'skill-persian-ux-copywriting',
    title: 'اسکیل میکروکاپی و UX Writing فارسی برای محصولات دیجیتال',
    category: 'ChatGPT',
    subCategory: 'محتوا و تجربه کاربری',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'UX-COPY / ۲۳',
    posterTagEn: 'PERSIAN UX WRITING',
    posterColor: 'terracotta',
    posterIconType: 'starburst',
    githubSourceRepo: 'ux-writing-persian/guidelines',
    shortDescription:
      'نگارش متن دکمه‌ها، پیام‌های خطا، راهنمای فرم‌ها و عنوان‌های یک‌خطی شفاف و اثرگذار به زبان فارسی معیار.',
    expectedOutput:
      'بانک عبارات استاندارد برای دکمه‌های خرید، وضعیت‌های خالی (Empty States) و اعلان‌های موفقیت.',
    codeSnippet: `// بجای «عملیات با موفقیت انجام شد» -> «اسکیل به پیشخوان شما اضافه شد ✓»`,
    keywords: 'UX Writing فارسی, میکروکاپی, نگارش رابط کاربری, اسکیل محتوا',
  },
  {
    id: 'skill-claude-code-refactoring',
    title: 'اسکیل بازآرایی (Refactoring) کدبیس‌های بزرگ با Claude Code',
    category: 'Claude',
    subCategory: 'مهندسی نرم‌افزار و کلین‌کد',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'CLAUDE / ۲۴',
    posterTagEn: 'ENTERPRISE REFACTORING',
    posterColor: 'terracotta',
    posterIconType: 'braces',
    githubSourceRepo: 'anthropics/claude-code',
    shortDescription:
      'شکستن فایل‌های بزرگ به ماژول‌های مستقل، حذف کدهای تکراری و ارتقای معماری بدون تغییر در رفتار ظاهری برنامه.',
    expectedOutput:
      'ساختار پوشه‌بندی تمیز، کامپوننت‌های تفکیک‌شده و حفظ ۱۰۰٪ سازگاری تایپ‌ها.',
    codeSnippet: `// Extract modular sub-components while preserving strict TypeScript props`,
    keywords: 'اسکیل Claude Code, ریفکتورینگ کد, کلین کد تایپ اسکریپت',
  },
  {
    id: 'skill-nextjs-app-router-ssr',
    title: 'اسکیل معماری Server Components و رندر ترکیبی در Next.js 15',
    category: 'Codex',
    subCategory: 'فریم‌ورک‌های فول‌استک',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'NEXT / ۲۵',
    posterTagEn: 'NEXT.JS APP ROUTER',
    posterColor: 'slate',
    posterIconType: 'layers',
    githubSourceRepo: 'vercel/next.js',
    shortDescription:
      'تفکیک هوشمند کامپوننت‌های سرور و کلاینت، Streaming SSR و بهینه‌سازی Core Web Vitals برای فروشگاه‌های اینترنتی.',
    expectedOutput:
      'ساختار کامل App Router با Metadata API پویا و زمان بارگذاری زیر ۱ ثانیه.',
    codeSnippet: `export async function generateMetadata({ params }): Promise<Metadata> { ... }`,
    keywords: 'اسکیل Next.js, Server Components, سئو در ری اکت, Vercel',
  },
  {
    id: 'skill-fastify-high-throughput',
    title: 'اسکیل ساخت وب‌سرویس‌های فوق‌سریع Node.js با Fastify',
    category: 'Codex',
    subCategory: 'معماری بک‌اند و API',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'FASTIFY / ۲۶',
    posterTagEn: 'HIGH-SPEED NODE API',
    posterColor: 'cobalt',
    posterIconType: 'braces',
    githubSourceRepo: 'fastify/fastify',
    shortDescription:
      'پیاده‌سازی سرورهای REST با سریالایزر JSON مبتنی بر اسکیما و توان عملیاتی ۳ برابر سریع‌تر از معماری‌های سنتی.',
    expectedOutput:
      'سرور ماژولار با پلاگین‌های احراز هویت، لاگینگ ساختاریافته Pino و مدیریت خطا.',
    codeSnippet: `fastify.get("/api/catalog", { schema: responseSchema }, handler);`,
    keywords: 'اسکیل Fastify, بک اند سریع Node.js, بهینه سازی API',
  },
  {
    id: 'skill-nestjs-clean-architecture',
    title: 'اسکیل معماری سازمانی ماژولار و تزریق وابستگی با NestJS',
    category: 'Codex',
    subCategory: 'معماری بک‌اند سازمانی',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'NEST / ۲۷',
    posterTagEn: 'NESTJS CLEAN ARCH',
    posterColor: 'terracotta',
    posterIconType: 'layers',
    githubSourceRepo: 'nestjs/nest',
    shortDescription:
      'طراحی بک‌اندهای مقیاس‌پذیر با الگوهای Controller، Service، Guard و Interceptor برای سیستم‌های مدیریت محتوا.',
    expectedOutput:
      'ماژول‌های استاندارد RBAC، گاردهای سطح دسترسی نقش‌ها و مستندات خودکار OpenAPI/Swagger.',
    codeSnippet: `@UseGuards(JwtAuthGuard, RolesGuard)\n@Roles("super_admin")`,
    keywords: 'اسکیل NestJS, معماری تمیز بک اند, تزریق وابستگی',
  },
  {
    id: 'skill-redis-caching-ratelimit',
    title: 'اسکیل کشینگ توزیع‌شده، مدیریت سشن و صف با Redis و ioredis',
    category: 'Codex',
    subCategory: 'کش و پایگاه داده درون‌حافظه‌ای',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'REDIS / ۲۸',
    posterTagEn: 'REDIS CACHE & SESSION',
    posterColor: 'terracotta',
    posterIconType: 'shield',
    githubSourceRepo: 'redis/ioredis',
    shortDescription:
      'ذخیره‌سازی کدهای یک‌بارمصرف OTP با TTL خودکار، مدیریت نشست‌های فعال کاربران و کش کردن کاتالوگ محصولات.',
    expectedOutput:
      'لایه کش Redis با الگوی Cache-Aside و ابطال آنی سشن‌های غیرمجاز از پنل سوپر ادمین.',
    codeSnippet: `await redis.set("otp:" + phone, hash, "EX", 120);`,
    keywords: 'اسکیل Redis, مدیریت سشن, کش دیتابیس, ioredis',
  },
  {
    id: 'skill-langchain-rag-pipeline',
    title: 'اسکیل ساخت پایپ‌لاین‌های جستجوی معنایی و RAG با LangChain',
    category: 'Claude',
    subCategory: 'هوش مصنوعی و RAG',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'RAG / ۲۹',
    posterTagEn: 'LANGCHAIN RAG ENGINE',
    posterColor: 'sage',
    posterIconType: 'radial',
    githubSourceRepo: 'langchain-ai/langchainjs',
    shortDescription:
      'خرد کردن مستندات فنی (Chunking)، تولید Embedding و بازیابی دقیق پاسخ از پایگاه دانش اختصاصی سازمان.',
    expectedOutput:
      'پایپ‌لاین کامل RAG با ارجاع دقیق به منبع و جلوگیری از توهم (Hallucination) مدل زبانی.',
    codeSnippet: `const retriever = vectorStore.asRetriever({ k: 4 });`,
    keywords: 'اسکیل LangChain, پیاده سازی RAG, جستجوی برداری, هوش مصنوعی',
  },
  {
    id: 'skill-crewai-multi-agent',
    title: 'اسکیل ارکستراسیون تیم ایجنت‌های خودمختار با CrewAI',
    category: 'ChatGPT',
    subCategory: 'ایجنت‌های چندگانه هوش مصنوعی',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'CREW / ۳۰',
    posterTagEn: 'MULTI-AGENT WORKFLOW',
    posterColor: 'violet',
    posterIconType: 'starburst',
    githubSourceRepo: 'crewAIInc/crewAI',
    shortDescription:
      'تعریف نقش‌های پژوهشگر، نویسنده فنی و ممیز سئو در قالب یک تیم هماهنگ برای تولید خودکار مقالات عمیق.',
    expectedOutput:
      'پیکربندی ایجنت‌ها، وظایف (Tasks) و ابزارهای جستجو با خروجی ساختاریافته.',
    codeSnippet: `Agent(role="Senior SEO Architect", goal="Optimize technical articles")`,
    keywords: 'اسکیل CrewAI, ایجنت هوش مصنوعی, اتوماسیون تولید محتوا',
  },
  {
    id: 'skill-dspy-prompt-optimization',
    title: 'اسکیل بهینه‌سازی الگوریتمی پرامپت‌ها با فریم‌ورک DSPy استنفورد',
    category: 'Claude',
    subCategory: 'مهندسی پرامپت پیشرفته',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'DSPY / ۳۱',
    posterTagEn: 'STANFORD DSPY SYSTEM',
    posterColor: 'cobalt',
    posterIconType: 'braces',
    githubSourceRepo: 'stanfordnlp/dspy',
    shortDescription:
      'تبدیل پرامپت‌های دستی شکننده به امضاهای برنامه‌نویسی (Signatures) قابل کامپایل و ارزیابی خودکار.',
    expectedOutput:
      'ماژول‌های پرامپت خودبهینه‌شونده با دقت خروجی بالای ۹۵٪ در تولید JSON.',
    codeSnippet: `class SeoSignature(dspy.Signature):\n    """Generate Persian SEO tags."""`,
    keywords: 'اسکیل DSPy, مهندسی پرامپت, بهینه سازی مدل زبانی',
  },
  {
    id: 'skill-supabase-realtime-rls',
    title: 'اسکیل امنیت سطح سطر (RLS) و همگام‌سازی زنده در Supabase',
    category: 'Codex',
    subCategory: 'بک‌اند ابری و دیتابیس',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'SUPA / ۳۲',
    posterTagEn: 'SUPABASE & RLS POLICIES',
    posterColor: 'sage',
    posterIconType: 'shield',
    githubSourceRepo: 'supabase/supabase',
    shortDescription:
      'نوشتن قوانین امنیتی PostgreSQL RLS برای تفکیک دسترسی مشتریان، ادمین‌ها و سوپر ادمین به همراه اشتراک زنده تغییرات.',
    expectedOutput:
      'اسکریپت‌های Policy دیتابیس و کلاینت Realtime برای بروزرسانی آنی سفارشات.',
    codeSnippet: `CREATE POLICY "Admins manage catalog" ON products FOR ALL TO authenticated;`,
    keywords: 'اسکیل Supabase, امنیت دیتابیس RLS, دیتابیس زنده',
  },
  {
    id: 'skill-firebase-firestore-rules',
    title: 'اسکیل مهندسی قوانین امنیتی Firestore و احراز هویت چندنقشی',
    category: 'Codex',
    subCategory: 'فایربیس و امنیت ابری',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'FIRE / ۳۳',
    posterTagEn: 'FIRESTORE SECURITY RULES',
    posterColor: 'amber' as PosterColorScheme,
    posterIconType: 'shield',
    githubSourceRepo: 'firebase/firebase-js-sdk',
    shortDescription:
      'پیاده‌سازی دقیق firestore.rules با اعتبارسنجی فیلدها، محدودیت حجم رشته‌ها و کنترل دسترسی مبتنی بر نقش (RBAC).',
    expectedOutput:
      'فایل قوانین امنیتی غیرقابل نفوذ به همراه هندلینگ استاندارد خطاها در کلاینت.',
    codeSnippet: `allow write: if isAdmin() && isValidProductPayload(request.resource.data);`,
    keywords: 'اسکیل فایربیس, Firestore Rules, امنیت دیتابیس ابری',
  },
  {
    id: 'skill-shaparak-zarinpal-gateway',
    title: 'اسکیل اتصال درگاه‌های پرداخت شاپرک، زرین‌پال v4 و زیبال',
    category: 'Codex',
    subCategory: 'فین‌تک و درگاه پرداخت',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'PAY / ۳۴',
    posterTagEn: 'SHAPARAK & ZARINPAL V4',
    posterColor: 'cobalt',
    posterIconType: 'shield',
    githubSourceRepo: 'ZarinPal/ZarinPal-NodeJS',
    shortDescription:
      'پیاده‌سازی چرخه کامل Request، هدایت به درگاه، Callback و Verify تراکنش‌های بانکی ایران با جلوگیری از Double Spending.',
    expectedOutput:
      'سرویس کامل پرداخت در سرور Express با پشتیبانی از حالت تست (Sandbox) و عملیاتی.',
    codeSnippet: `const res = await fetch("https://api.zarinpal.com/pg/v4/payment/request.json", ...);`,
    keywords: 'اسکیل درگاه پرداخت, زرین پال v4, اتصال شاپرک, به پرداخت ملت',
  },
  {
    id: 'skill-kavenegar-sms-otp-auth',
    title: 'اسکیل احراز هویت پیامکی (OTP) با الگوی سریع کاوه‌نگار و ملی‌پیامک',
    category: 'Codex',
    subCategory: 'احراز هویت و پیامک',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'OTP / ۳۵',
    posterTagEn: 'KAVENEGAR LOOKUP OTP',
    posterColor: 'violet',
    posterIconType: 'shield',
    githubSourceRepo: 'kavenegar/kavenegar-node',
    shortDescription:
      'ارسال زیر ۲ ثانیه کد تایید با وب‌سرویس پترن (Lookup)، هش کردن کد با HMAC-SHA256 و محدودسازی دفعات تلاش.',
    expectedOutput:
      'API ارسال و تایید کد پیامکی امن به همراه تایمر معکوس در رابط کاربری.',
    codeSnippet: `/v1/{API-KEY}/verify/lookup.json?receptor={phone}&token={code}&template={pattern}`,
    keywords: 'اسکیل کاوه نگار, ورود با پیامک OTP, وب سرویس پیامک, احراز هویت',
  },
  {
    id: 'skill-vite-esbuild-fullstack',
    title: 'اسکیل باندلینگ فوق‌سریع فرانت‌اند و بک‌اند با Vite 8 و esbuild',
    category: 'Codex',
    subCategory: 'ابزارهای ساخت و باندلینگ',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'VITE / ۳۶',
    posterTagEn: 'VITE & ESBUILD PIPELINE',
    posterColor: 'violet',
    posterIconType: 'layers',
    githubSourceRepo: 'vitejs/vite',
    shortDescription:
      'ادغام سرور Express با میان‌افزار Vite در محیط توسعه و کامپایل تک‌فایلی server.js برای محیط پروداکشن.',
    expectedOutput:
      'تنظیمات vite.config.ts و اسکریپت‌های build بهینه با زمان بیلد زیر ۳ ثانیه.',
    codeSnippet: `esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.js`,
    keywords: 'اسکیل Vite, باندلینگ esbuild, فول استک تایپ اسکریپت',
  },
  {
    id: 'skill-wordpress-headless-migration',
    title: 'اسکیل مهاجرت از سیستم‌های سنتی به معماری مدرن React و TypeScript',
    category: 'Claude',
    subCategory: 'سیستم‌های مدیریت محتوا',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'CMS / ۳۷',
    posterTagEn: 'HEADLESS CMS MIGRATION',
    posterColor: 'terracotta',
    posterIconType: 'layers',
    githubSourceRepo: 'DPATech/Modern-CMS-Architecture',
    shortDescription:
      'انتقال ساختار نوشته‌ها، محصولات، رسانه، نقش‌های کاربری و صفحه‌ساز به معماری مدرن React + TypeScript با امنیت بالا.',
    expectedOutput:
      'نقشه مهاجرت داده‌ها، صفحه‌ساز پویا، مدیریت افزونه‌ها و پنل مدیریت دولایه.',
    codeSnippet: `// Modular CMS Architecture with Visual Page Builder, Media SEO & RBAC`,
    keywords: 'سیستم مدیریت محتوا اختصاصی, صفحه‌ساز ری اکت, مهاجرت به React',
  },
  {
    id: 'skill-framer-motion-micro-ux',
    title: 'اسکیل میکرو-اینتراکشن‌های فنری و انیمیشن‌های لی‌اوت با Motion',
    category: 'Codex',
    subCategory: 'انیمیشن رابط کاربری',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'MOTION / ۳۸',
    posterTagEn: 'SPRING MICRO-INTERACTIONS',
    posterColor: 'cobalt',
    posterIconType: 'radial',
    githubSourceRepo: 'motiondivision/motion',
    shortDescription:
      'طراحی انیمیشن‌های باز و بسته شدن دراورها، تب‌های لغزنده (Shared Layout) و بازخورد لمسی دکمه‌ها در زیر ۱۵۰ میلی‌ثانیه.',
    expectedOutput:
      'ترنزیشن‌های فیزیک فنری (Spring Physics) طبیعی و هماهنگ با ژست‌های حرکتی موبایل.',
    codeSnippet: `transition={{ type: "spring", stiffness: 380, damping: 30 }}`,
    keywords: 'اسکیل Framer Motion, انیمیشن React, میکرو اینتراکشن',
  },
  {
    id: 'skill-svg-geometric-poster-art',
    title: 'اسکیل طراحی پوسترهای برداری و نمادهای هندسی SVG در کد',
    category: 'ChatGPT',
    subCategory: 'گرافیک برداری و آیکون',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'SVG / ۳۹',
    posterTagEn: 'VECTOR POSTER SYSTEM',
    posterColor: 'sage',
    posterIconType: 'starburst',
    githubSourceRepo: 'svg/svgo',
    shortDescription:
      'خلق کاورها و پوسترهای مینیمال مهندسی با کدهای SVG خالص، بدون نیاز به بارگذاری فایل‌های تصویری سنگین.',
    expectedOutput:
      'مجموعه نمادهای هندسی مقیاس‌پذیر با قابلیت تغییر رنگ خط (stroke) بر اساس پالت محصول.',
    codeSnippet: `<svg viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="40" /></svg>`,
    keywords: 'طراحی SVG در کد, پوستر هندسی مینیمال, بهینه سازی گرافیک وب',
  },
  {
    id: 'skill-rtl-arabic-persian-layout',
    title: 'اسکیل مهندسی چیدمان‌های راست‌به‌چپ (RTL) و دوجهته (BiDi)',
    category: 'Codex',
    subCategory: 'طراحی رابط فارسی و RTL',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'RTL / ۴۰',
    posterTagEn: 'BIDIRECTIONAL RTL MASTERY',
    posterColor: 'cobalt',
    posterIconType: 'grid',
    githubSourceRepo: 'rtlcSS/rtlcss',
    shortDescription:
      'نمایش بی‌نقص کدهای انگلیسی، آدرس‌های اینترنتی و شماره‌ها در دل صفحات فارسی بدون به‌هم‌ریختگی پرانتزها و جهت فلش‌ها.',
    expectedOutput:
      'قوانین دقیق استفاده از dir="rtl"، dir="ltr" و ویژگی‌های منطقی CSS (inline-start / inline-end).',
    codeSnippet: `<span dir="ltr" className="font-mono text-xs">SKILL / 01</span>`,
    keywords: 'طراحی سایت راست به چپ, استاندارد RTL, تایپوگرافی فارسی و انگلیسی',
  },
  {
    id: 'skill-accessibility-wcag-aa',
    title: 'اسکیل ممیزی دسترس‌پذیری، کنتراست رنگی WCAG AA و ناوبری کیبورد',
    category: 'Claude',
    subCategory: 'استاندارد وب و دسترس‌پذیری',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'A11Y / ۴۱',
    posterTagEn: 'WCAG 2.2 AA COMPLIANCE',
    posterColor: 'sage',
    posterIconType: 'shield',
    githubSourceRepo: 'w3c/wcag',
    shortDescription:
      'تضمین خوانایی کامل متن‌ها در حالت روشن و تیره، حلقه‌های فوکوس مشخص و برچسب‌های aria-label برای اسکرین‌ریدرها.',
    expectedOutput:
      'رابط کاربری با امتیاز ۱۰۰ در ممیزی Accessibility لایت‌هاوس گوگل.',
    codeSnippet: `<button aria-label="مشاهده سبد خرید" className="focus-visible:ring-2">`,
    keywords: 'دسترس پذیری وب, استاندارد WCAG, کنتراست رنگ در دارک مود',
  },
  {
    id: 'skill-core-web-vitals-perf',
    title: 'اسکیل بهینه‌سازی سرعت بارگذاری و شاخص‌های Core Web Vitals',
    category: 'Codex',
    subCategory: 'پرفورمنس و سرعت وب',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'PERF / ۴۲',
    posterTagEn: 'LCP & INP OPTIMIZER',
    posterColor: 'cobalt',
    posterIconType: 'radial',
    githubSourceRepo: 'GoogleChrome/web-vitals',
    shortDescription:
      'بهبود شاخص‌های LCP، CLS و INP از طریق بارگذاری تنبل تصاویر، ابعاد مشخص کانتینرها و حذف بلاکینگ رندر.',
    expectedOutput:
      'صفحات وب با پاسخ‌دهی فوری به کلیک کاربر و صفر شدن پرش چیدمان (Zero Layout Shift).',
    codeSnippet: `<img loading="lazy" decoding="async" className="aspect-16/9 object-cover" />`,
    keywords: 'افزایش سرعت سایت, Core Web Vitals, بهینه سازی LCP و CLS',
  },
  {
    id: 'skill-pwa-offline-service-worker',
    title: 'اسکیل تبدیل وب‌اپلیکیشن به نسخه قابل نصب موبایل (PWA) و آفلاین',
    category: 'Codex',
    subCategory: 'اپلیکیشن پیش‌رونده وب',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'PWA / ۴۳',
    posterTagEn: 'INSTALLABLE MOBILE PWA',
    posterColor: 'violet',
    posterIconType: 'layers',
    githubSourceRepo: 'vite-pwa/vite-plugin-pwa',
    shortDescription:
      'افزودن Web App Manifest، آیکون‌های استاندارد iOS/Android و کش کردن فایل‌های حیاتی برای اجرای نرم روی گوشی.',
    expectedOutput:
      'قابلیت Add to Home Screen در آیفون و اندروید با ظاهر تمام‌صفحه شبیه اپلیکیشن بومی.',
    codeSnippet: `<meta name="apple-mobile-web-app-capable" content="yes" />`,
    keywords: 'اسکیل PWA, تبدیل سایت به اپلیکیشن موبایل, Service Worker',
  },
  {
    id: 'skill-websocket-realtime-collab',
    title: 'اسکیل ارتباطات بلادرنگ دوطرفه با WebSockets و Socket.IO',
    category: 'Codex',
    subCategory: 'ارتباط زنده و بلادرنگ',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'SOCKET / ۴۴',
    posterTagEn: 'REALTIME WEBSOCKET HUB',
    posterColor: 'sage',
    posterIconType: 'radial',
    githubSourceRepo: 'socketio/socket.io',
    shortDescription:
      'ارسال اعلان‌های آنی ثبت سفارش به پنل مدیریت، نمایش وضعیت زنده کاربران و اتصال مجدد خودکار در صورت قطعی شبکه.',
    expectedOutput:
      'سرور و کلاینت WebSocket با مدیریت Roomها و احراز هویت توکن در مرحله Handshake.',
    codeSnippet: `io.to("admin-room").emit("order:created", newOrderRecord);`,
    keywords: 'اسکیل WebSocket, ارتباط بلادرنگ Socket.IO, نوتیفیکیشن زنده',
  },
  {
    id: 'skill-graphql-apollo-federation',
    title: 'اسکیل طراحی APIهای انعطاف‌پذیر با GraphQL و تایپ‌های خودکار',
    category: 'Codex',
    subCategory: 'معماری API و داده',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'GQL / ۴۵',
    posterTagEn: 'GRAPHQL SCHEMA DESIGN',
    posterColor: 'terracotta',
    posterIconType: 'braces',
    githubSourceRepo: 'graphql/graphql-js',
    shortDescription:
      'جلوگیری از Over-fetching داده‌ها در موبایل با واکشی دقیق فیلدهای موردنیاز هر کامپوننت در یک درخواست واحد.',
    expectedOutput:
      'اسکیمای GraphQL به همراه Resolverهای بهینه و حل مشکل N+1 با DataLoader.',
    codeSnippet: `type SkillProduct { id: ID! title: String! price: Int! }`,
    keywords: 'اسکیل GraphQL, طراحی API مدرن, بهینه سازی ترافیک موبایل',
  },
  {
    id: 'skill-trpc-end-to-end-typesafe',
    title: 'اسکیل ارتباط مستقیم و ۱۰۰٪ Type-Safe بین فرانت و بک با tRPC',
    category: 'Codex',
    subCategory: 'فول‌استک تایپ‌اسکریپت',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'TRPC / ۴۶',
    posterTagEn: 'END-TO-END TYPESAFE API',
    posterColor: 'cobalt',
    posterIconType: 'braces',
    githubSourceRepo: 'trpc/trpc',
    shortDescription:
      'فراخوانی توابع بک‌اند از داخل کامپوننت‌های React با تکمیل خودکار کد (Autocomplete) بدون نیاز به تولید دستی کد.',
    expectedOutput:
      'روترهای tRPC متصل به Zod با امنیت کامل تایپ از دیتابیس تا رابط کاربری.',
    codeSnippet: `export const appRouter = router({ getSkills: publicProcedure.query(...) });`,
    keywords: 'اسکیل tRPC, فول استک TypeScript, توسعه سریع وب',
  },
  {
    id: 'skill-github-actions-cicd-pipeline',
    title: 'اسکیل پایپ‌لاین تست و انتشار خودکار (CI/CD) با GitHub Actions',
    category: 'Codex',
    subCategory: 'اتوماسیون تست و بیلد',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'CICD / ۴۷',
    posterTagEn: 'GITHUB ACTIONS PIPELINE',
    posterColor: 'slate',
    posterIconType: 'layers',
    githubSourceRepo: 'actions/starter-workflows',
    shortDescription:
      'اجرای خودکار تست تایپ‌اسکریپت، بررسی کیفیت کد (Lint) و بیلد نسخه نهایی پس از هر git push.',
    expectedOutput:
      'فایل .github/workflows/ci.yml استاندارد برای پروژه‌های فول‌استک TypeScript.',
    codeSnippet: `run: npm ci && npm run lint && npm run build`,
    keywords: 'اسکیل GitHub Actions, اتوماسیون تست, CI/CD تایپ اسکریپت',
  },
  {
    id: 'skill-nginx-reverse-proxy-tuning',
    title: 'اسکیل بهینه‌سازی کشینگ HTTP/3 و فشرده‌سازی Brotli/Gzip در وب',
    category: 'Codex',
    subCategory: 'شبکه و سرعت وب',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'HTTP3 / ۴۸',
    posterTagEn: 'BROTLI & HTTP3 CACHING',
    posterColor: 'sage',
    posterIconType: 'shield',
    githubSourceRepo: 'h5bp/server-configs-nginx',
    shortDescription:
      'تنظیم هدرهای کش فایل‌های استاتیک، فعال‌سازی فشرده‌سازی Brotli و محدودسازی نرخ درخواست‌ها برای وب‌اپلیکیشن‌های پرترافیک.',
    expectedOutput:
      'قوانین بهینه‌سازی کش و امنیت شبکه برای اپلیکیشن‌های پرترافیک.',
    codeSnippet: `Cache-Control: public, max-age=31536000, immutable`,
    keywords: 'فشرده سازی Brotli, کشینگ وب, افزایش امنیت شبکه',
  },
  {
    id: 'skill-sentry-error-observability',
    title: 'اسکیل ردیابی خطاها و پایش سلامت برنامه در پروداکشن با Sentry',
    category: 'Codex',
    subCategory: 'مانیتورینگ و پایداری',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'SENTRY / ۴۹',
    posterTagEn: 'PRODUCTION OBSERVABILITY',
    posterColor: 'violet',
    posterIconType: 'radial',
    githubSourceRepo: 'getsentry/sentry-javascript',
    shortDescription:
      'ثبت دقیق Stack Trace خطاهای مرورگر و سرور به همراه Source Maps و گزارش گلوگاه‌های کندی.',
    expectedOutput:
      'یکپارچه‌سازی Error Boundary در React و میدل‌ور ثبت خطا در Express.',
    codeSnippet: `Sentry.captureException(error, { extra: { context: "checkout" } });`,
    keywords: 'اسکیل Sentry, مانیتورینگ خطا در React, پایداری نرم افزار',
  },
  {
    id: 'skill-storybook-component-catalog',
    title: 'اسکیل مستندسازی بصری و تست ایزوله کامپوننت‌ها با Storybook 8',
    category: 'Codex',
    subCategory: 'دیزاین سیستم و مستندسازی',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'STORY / ۵۰',
    posterTagEn: 'STORYBOOK UI CATALOG',
    posterColor: 'terracotta',
    posterIconType: 'grid',
    githubSourceRepo: 'storybookjs/storybook',
    shortDescription:
      'توسعه و بررسی کارت‌های محصول، مودال‌ها و دکمه‌ها در تمامی حالت‌های روشن، تیره و موبایل به‌صورت مستقل.',
    expectedOutput:
      'فایل‌های *.stories.tsx استاندارد برای تمامی اجزای دیزاین سیستم.',
    codeSnippet: `export const DarkModeCard: Story = { args: { darkMode: true } };`,
    keywords: 'اسکیل Storybook, مستندسازی دیزاین سیستم, کامپوننت های UI',
  },
  {
    id: 'skill-astro-content-collections',
    title: 'اسکیل ساخت مجلات محتوایی فوق‌سریع با معماری جزیره‌ای Astro',
    category: 'Codex',
    subCategory: 'وب‌سایت‌های محتوایی و سئو',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'ASTRO / ۵۱',
    posterTagEn: 'ASTRO ISLANDS ENGINE',
    posterColor: 'cobalt',
    posterIconType: 'starburst',
    githubSourceRepo: 'withastro/astro',
    shortDescription:
      'ارسال صفر کیلوبایت جاوااسکریپت اضافی برای صفحات مقاله و بارگذاری تعاملی فقط برای ویجت‌های موردنیاز.',
    expectedOutput:
      'معماری Content Collections تایپ‌سیف برای مقالات Markdown و MDX.',
    codeSnippet: `const articles = await getCollection("articles");`,
    keywords: 'اسکیل Astro, سایت محتوایی سریع, معماری Islands',
  },
  {
    id: 'skill-vitest-unit-testing',
    title: 'اسکیل تست واحد (Unit Test) منطق تجاری و محاسبات مالی با Vitest',
    category: 'Codex',
    subCategory: 'تست و کیفیت کد',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'VITEST / ۵۲',
    posterTagEn: 'VITEST FAST UNIT TEST',
    posterColor: 'sage',
    posterIconType: 'braces',
    githubSourceRepo: 'vitest-dev/vitest',
    shortDescription:
      'تست دقیق توابع محاسبه تخفیف کوپن، جمع کل سبد خرید، اعتبارسنجی کدهای OTP و تبدیل اعداد فارسی.',
    expectedOutput:
      'مجموعه تست‌های سریع با پوشش ۱۰۰٪ روی توابع حساس مالی و امنیتی.',
    codeSnippet: `expect(calculateDiscount(1000000, 20)).toBe(800000);`,
    keywords: 'اسکیل Vitest, تست واحد تایپ اسکریپت, تست محاسبات سبد خرید',
  },
  {
    id: 'skill-cursor-windsurf-rules',
    title: 'اسکیل نگارش فایل‌های قوانین هوشمند (.cursorrules و CLAUDE.md)',
    category: 'Claude',
    subCategory: 'پیکربندی محیط‌های هوش مصنوعی',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'RULES / ۵۳',
    posterTagEn: 'AI IDE CONTEXT RULES',
    posterColor: 'terracotta',
    posterIconType: 'layers',
    githubSourceRepo: 'PatrickJS/awesome-cursorrules',
    shortDescription:
      'تعریف استانداردهای کدنویسی تیم، قوانین نام‌گذاری، ساختار پوشه‌ها و ممنوعیت‌های امنیتی برای ایجنت‌های کدنویسی.',
    expectedOutput:
      'فایل جامع CLAUDE.md و .cursorrules هماهنگ با استک پروژه شما.',
    codeSnippet: `# Project Invariants\n- Always enforce RTL & overflow-x-hidden on mobile`,
    keywords: 'فایل CLAUDE.md, قوانین Cursor, تنظیمات ایجنت کدنویسی',
  },
  {
    id: 'skill-openai-structured-outputs',
    title: 'اسکیل تضمین خروجی ۱۰۰٪ منطبق بر اسکیما (Structured JSON) در مدل‌های زبانی',
    category: 'ChatGPT',
    subCategory: 'مهندسی API هوش مصنوعی',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'JSON-AI / ۵۴',
    posterTagEn: 'STRICT JSON SCHEMA AI',
    posterColor: 'sage',
    posterIconType: 'braces',
    githubSourceRepo: 'openai/openai-node',
    shortDescription:
      'استفاده از قابلیت responseSchema برای دریافت تضمین‌شده فیلدهای سئو، خلاصه مقاله و برچسب‌ها بدون خطای پارس JSON.',
    expectedOutput:
      'توابع سرور هوش مصنوعی با خروجی تایپ‌شده و پایدار برای پنل‌های ادمین.',
    codeSnippet: `config: { responseMimeType: "application/json", responseSchema: schema }`,
    keywords: 'Structured Outputs, خروجی JSON هوش مصنوعی, اسکیل OpenAI و Gemini',
  },
  {
    id: 'skill-cloudflare-edge-workers',
    title: 'اسکیل اجرای منطق سرور در لبه شبکه (Edge Workers) و کش جهانی',
    category: 'Codex',
    subCategory: 'پردازش ابری و CDN',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'EDGE / ۵۵',
    posterTagEn: 'CLOUDFLARE EDGE WORKER',
    posterColor: 'cobalt',
    posterIconType: 'radial',
    githubSourceRepo: 'cloudflare/workers-sdk',
    shortDescription:
      'اجرای میدل‌ورهای امنیتی، تغییر مسیرهای هوشمند و کش کردن پاسخ‌های API در نزدیک‌ترین دیتاسنتر به کاربر.',
    expectedOutput:
      'اسکریپت Edge Worker با زمان تاخیر (Latency) نزدیک به صفر.',
    codeSnippet: `export default { async fetch(request, env) { return handleEdge(request); } };`,
    keywords: 'اسکیل Cloudflare Workers, پردازش Edge, افزایش سرعت CDN',
  },
  {
    id: 'pkg-ai-agency-automation-suite',
    title: 'پکیج VIP اتوماسیون کامل تولید محتوا، سئوی معنایی و تقویم تحریریه',
    category: 'ChatGPT',
    subCategory: 'پکیج ویژه تحریریه و سئو',
    itemType: 'package',
    price: 1650000,
    originalPrice: 2300000,
    posterCode: 'VIP-SEO / ۵۶',
    posterTagEn: 'AI EDITORIAL SUITE VIP',
    posterColor: 'sage',
    posterIconType: 'starburst',
    githubSourceRepo: 'DPATech/AI-Editorial-Automation',
    shortDescription:
      'بسته جامع شامل ۱۰ اسکیل تخصصی برای تحقیق کلمات کلیدی، تولید مقالات سئوشده، سئوی خودکار تصاویر گالری و لینک‌سازی داخلی.',
    expectedOutput:
      'سیستم کامل تحریریه هوشمند متصل به پنل مدیریت با قابلیت تولید تقویم محتوایی ۳۰ روزه.',
    codeSnippet: `// Full AI Editorial & Image SEO Automation Suite`,
    keywords: 'پکیج سئو هوش مصنوعی, اتوماسیون تولید محتوا, سئو تصاویر',
  },
  {
    id: 'pkg-devops-ubuntu-docker-cluster',
    title: 'پکیج VIP امنیت پیشرفته وب‌اپلیکیشن، پایش سلامت و بکاپ خودکار داده',
    category: 'Codex',
    subCategory: 'پکیج ویژه امنیت و پایداری',
    itemType: 'package',
    price: 2150000,
    originalPrice: 2950000,
    posterCode: 'VIP-SEC / ۵۷',
    posterTagEn: 'ENTERPRISE SECURITY SUITE',
    posterColor: 'slate',
    posterIconType: 'shield',
    githubSourceRepo: 'DPATech/Enterprise-Security-Suite',
    shortDescription:
      'مجموعه کامل اسکریپت‌ها و اسکیل‌های محافظت از API، فایروال لایه اپلیکیشن، لاگینگ ساختاریافته، مانیتورینگ و بکاپ خودکار روزانه.',
    expectedOutput:
      'زیرساخت امنیتی آماده برای وب‌اپلیکیشن‌های سازمانی با استانداردهای سطح بانکی.',
    codeSnippet: `// Automated Security Shield, Rate Limiter & Encrypted Backup Suite`,
    keywords: 'پکیج امنیت وب, حفاظت API, مانیتورینگ و بکاپ خودکار',
  },
  {
    id: 'pkg-mobile-first-superapp-ui',
    title: 'پکیج VIP طراحی سوپراپ‌های موبایل‌محور با تجربه کاربری iOS و تلگرام',
    category: 'Claude',
    subCategory: 'پکیج ویژه UI/UX موبایل',
    itemType: 'package',
    price: 1980000,
    originalPrice: 2700000,
    posterCode: 'VIP-MOB / ۵۸',
    posterTagEn: 'IOS & TELEGRAM SUPERAPP',
    posterColor: 'violet',
    posterIconType: 'layers',
    githubSourceRepo: 'DPATech/Telegram-iOS-SuperApp-UI',
    shortDescription:
      'کیت کامل مهندسی رابط‌های موبایل مدرن شامل منوهای شیشه‌ای شناور، شیت‌های کشویی، انیمیشن‌های ۶۰ فریم و تم‌های سرمه‌ای شب.',
    expectedOutput:
      'کتابخانه کامل کامپوننت‌های موبایل‌محور بدون اسکرول افقی و منطبق با ارگونومی شست دست.',
    codeSnippet: `// Complete iOS 18 & Telegram Glassmorphic Mobile Component Kit`,
    keywords: 'پکیج طراحی موبایل, رابط کاربری تلگرام, دیزاین سیستم iOS',
  },
  {
    id: 'skill-elastic-search-persian-analyzer',
    title: 'اسکیل موتور جستجوی آنی فارسی و نرمال‌سازی حروف (ی/ک) و نیم‌فاصله',
    category: 'Codex',
    subCategory: 'موتور جستجو و متن فارسی',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'SEARCH / ۵۹',
    posterTagEn: 'PERSIAN SEARCH NORMALIZER',
    posterColor: 'cobalt',
    posterIconType: 'radial',
    githubSourceRepo: 'persian-tools/persian-tools',
    shortDescription:
      'یکسان‌سازی کاراکترهای فارسی و عربی، تبدیل اعداد فارسی/عربی به انگلیسی در جستجو و یافتن نتایج حتی با غلط املایی جزئی.',
    expectedOutput:
      'موتور جستجوی کلاینت و سرور فوق‌سریع و مقاوم در برابر تفاوت کیبوردهای فارسی.',
    codeSnippet: `export const normalizePersian = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک");`,
    keywords: 'جستجوی فارسی, نرمال سازی متن فارسی, persian-tools',
  },
  {
    id: 'skill-Clean-hexagonal-ddd-ts',
    title: 'اسکیل معماری شش‌ضلعی (Hexagonal) و طراحی دامنه محور (DDD) در TypeScript',
    category: 'Claude',
    subCategory: 'معماری کلان نرم‌افزار',
    itemType: 'product',
    price: 0,
    originalPrice: 0,
    posterCode: 'DDD / ۶۰',
    posterTagEn: 'HEXAGONAL & DDD ARCH',
    posterColor: 'terracotta',
    posterIconType: 'layers',
    githubSourceRepo: 'Sairyss/domain-driven-hexagon',
    shortDescription:
      'جداسازی کامل هسته قوانین تجاری (Domain) از فریم‌ورک‌ها، دیتابیس و درگاه‌های بیرونی با الگوی Ports & Adapters.',
    expectedOutput:
      'معماری سازمانی ماندگار که تغییر دیتابیس یا درگاه پرداخت در آن نیازمند تغییر هیچ کدی در هسته نیست.',
    codeSnippet: `export interface PaymentGatewayPort { requestPayment(amount: number): Promise<TxReceipt>; }`,
    keywords: 'معماری Hexagonal, طراحی دامنه محور DDD, معماری نرم افزار',
  },
];

export const ADDITIONAL_VERIFIED_SKILLS: SkillProduct[] = VERIFIED_SKILL_SEEDS.map(
  (seed, idx) => ({
    id: seed.id,
    title: seed.title,
    slug: seed.id,
    category: seed.category,
    subCategory: seed.subCategory,
    itemType: seed.itemType,
    price: seed.price,
    originalPrice: seed.originalPrice,
    shortDescription: seed.shortDescription,
    modulesCount: seed.itemType === 'package' ? 12 : 5 + (idx % 4),
    durationHours: seed.itemType === 'package' ? 8 : 1 + (idx % 3),
    level:
      seed.price === 0
        ? `نسخه ۲.${(idx % 5) + 1} · رایگان`
        : 'پکیج جامع VIP · پروداکشن',
    version: `v2.${(idx % 5) + 1}.0`,
    imageUrl:
      idx % 4 === 0
        ? CATALOG_IMAGES.fullstackPkg
        : idx % 4 === 1
          ? CATALOG_IMAGES.uiuxPkg
          : idx % 4 === 2
            ? CATALOG_IMAGES.securityPkg
            : CATALOG_IMAGES.aiAutomationPkg,
    imageAlt: seed.title,
    featured: idx < 8 || seed.itemType === 'package',
    status: 'published',
    authorId: 'admin',
    posterCode: seed.posterCode,
    posterTagEn: seed.posterTagEn,
    posterColor: seed.posterColor,
    posterIconType: seed.posterIconType,
    githubSourceRepo: seed.githubSourceRepo,
    seoTitle: `${seed.title} | مخزن اسکیل ۹۸`,
    seoDescription: seed.shortDescription,
    seoKeywords: seed.keywords,
    expectedOutput: seed.expectedOutput,
    prerequisites: [
      `سازگار با ${seed.category}، Claude Code، ChatGPT و Codex`,
      'آماده استفاده در پروژه‌های واقعی و محیط‌های عملیاتی',
    ],
    usageSteps: [
      seed.price === 0
        ? 'روی دکمه «افزودن رایگان به حساب کاربری» کلیک کنید تا این اسکیل به پیشخوان شخصی شما اضافه شود.'
        : 'این پکیج تخصصی را به سبد خرید اضافه کرده و پس از تسویه آنی، در پیشخوان خود به تمامی فایل‌ها دسترسی بگیرید.',
      'در بخش «پیشخوان من» روی این اسکیل کلیک کنید تا محتوای کامل SKILL.md را مطالعه یا فایل آن را دانلود نمایید.',
      'فایل اسکیل را در پوشه skills پروژه خود قرار دهید تا ایجنت هوش مصنوعی دقیقاً طبق این معماری کدنویسی کند.',
    ],
    skillMarkdownContent: `---
name: ${seed.id}
version: 2.${(idx % 5) + 1}.0
compatible_tools: [Claude, ChatGPT, Codex]
source: ${seed.githubSourceRepo}
maintainer: DPATech (SKILL 98)
---

# ${seed.title}

## هدف و کاربرد مهندسی
${seed.shortDescription}

## خروجی استاندارد
${seed.expectedOutput}

## نمونه الگوی کد و پیاده‌سازی
\`\`\`typescript
${seed.codeSnippet}
\`\`\`
`,
    syllabus: [
      'اصول معماری و استانداردهای کدنویسی بدون بدهی فنی',
      'الگوهای پیاده‌سازی گام‌به‌گام و چک‌لیست تست پروداکشن',
      'بهینه‌سازی امنیت، سرعت و تجربه کاربری در دسکتاپ و موبایل',
    ],
    deliverables: [
      'فایل استاندارد SKILL.md + نمونه کدهای اجرایی و چک‌لیست ممیزی',
    ],
  })
);
