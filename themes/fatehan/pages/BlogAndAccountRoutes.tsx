import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { formatToman, formatPersianNumber } from '../utils/formatters';
import { BiDiText } from '../ui/BiDiText';
import { CustomerSavedAddress } from '../types';
import { RichFormattedContent } from '../utils/RichFormattedContent';
import {
  BookOpen,
  Calendar,
  User,
  Tag,
  MessageSquare,
  Send,
  ArrowRight,
  FilePlus2,
  Edit3,
  LayoutDashboard,
  ShoppingBag,
  MapPin,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  Star,
  FileText,
  Wallet,
  ShieldCheck,
  Smartphone,
  Lightbulb,
  Bell,
} from 'lucide-react';

// Built-in rich Fatehan Robotics Academy articles ensuring a full Yahoo-style magazine portal
const FATEHAN_PORTAL_ARTICLES = [
  {
    id: 'PST-FAT-101',
    title: 'چرا یادگیری رباتیک و هوش مصنوعی مهم‌ترین مهارت زندگی برای نسل آینده است؟',
    slug: 'why-robotics-and-ai-is-life-skill-for-kids',
    type: 'مقاله تخصصی',
    parentCategory: 'آموزش و مهارت',
    category: 'راهنمای والدین و استعدادیابی',
    tags: ['رباتیک کودکان', 'مهارت آینده', 'استعدادیابی', 'آموزشگاه فاتحان'],
    author: 'تحریریه علمی آموزشگاه فاتحان',
    featuredImageUrl: '/assets/blog/blog-01.jpg',
    seoScore: 98,
    views: 18450,
    readingTimeMinutes: 6,
    status: 'Published' as const,
    updatedAt: '۱۴۰۵/۰۸/۰۵',
    excerpt:
      'در دنیای امروز، کودکانی که به جای مصرف‌کننده صرف موبایل و تبلت بودن، منطق ساخت ربات، الگوریتم و حل مسئله را در کارگاه تجربه می‌کنند، اعتمادبه‌نفس و آینده شغلی متمایزی خواهند داشت.',
    bodyContent: `## تبدیل دانش‌آموز از مصرف‌کننده تکنولوژی به خالق تکنولوژی\nبسیاری از والدین نگران ساعت‌های طولانی استفاده فرزندانشان از گوشی و بازی‌های کامپیوتری هستند. در آموزشگاه تخصصی رباتیک فاتحان، این علاقه طبیعی به تکنولوژی در مسیر درست هدایت می‌شود.\n\n- تقویت تفکر الگوریتمی و مهارت حل مسئله در مواجهه با چالش‌های واقعی\n- تجربه کار تیمی در پروژه‌های کارگاهی و مسابقات رباتیک\n- افزایش تمرکز، دقت و هماهنگی چشم و دست در سنین ۷ تا ۱۸ سال\n\n![کارگاه عملی رباتیک فاتحان](/assets/blog/blog-02.jpg)\n\n> شعار راهبردی فاتحان: «رباتیک فقط یک رشته نیست... یک مهارت زندگی است»\n\n## از چه سنی آموزش رباتیک را شروع کنیم؟\nبهترین سن شروع آموزش‌های پایه و مکانیک خلاق از ۶ الی ۷ سالگی (پیش‌دبستانی و دبستان) است و در مقاطع متوسطه اول و دوم به سمت الکترونیک پیشرفته، آردوینو، پایتون و هوش مصنوعی هدایت می‌شود.`,
  },
  {
    id: 'PST-FAT-102',
    title: 'نقشه راه جامع آموزش رباتیک از ۶ تا ۱۸ سالگی در آموزشگاه فاتحان اندیشه',
    slug: 'fatehan-robotics-roadmap-ages-6-to-18',
    type: 'گزارش ویژه',
    parentCategory: 'مسیر آموزشی',
    category: 'رباتیک و مکاترونیک',
    tags: ['نقشه راه سنی', 'دوره‌های رباتیک', 'اندیشه فاز ۱', 'مکانیک و الکترونیک'],
    author: 'مهندس واحد آموزش فاتحان',
    featuredImageUrl: '/assets/blog/blog-02.jpg',
    seoScore: 96,
    views: 14920,
    readingTimeMinutes: 8,
    status: 'Published' as const,
    updatedAt: '۱۴۰۵/۰۸/۰۴',
    excerpt:
      'آشنایی گام‌به‌گام با ۱۵ دوره مصوب آموزشگاه فاتحان؛ از دوره کودک خلاق و مکانیک پایه تا برنامه‌نویسی بردهای هوشمند ARC، آردوینو و بینایی ماشین.',
    bodyContent: `## تفکیک علمی دوره‌ها بر اساس سن و مقطع تحصیلی\nدر آکادمی فاتحان، سرفصل‌های آموزشی دقیقاً متناسب با رشد شناختی دانش‌آموزان در سه رده «کاشفان کوچک (۷ تا ۱۰ سال)»، «مهندسان نوجوان (۱۱ تا ۱۴ سال)» و «فاتحان آینده (۱۵ تا ۱۸ سال)» طراحی شده‌اند.\n\n- **پنج دپارتمان تخصصی:** رباتیک، الکترونیک، برنامه‌نویسی، مکانیک و چاپ سه‌بعدی\n- **آموزش ۱۰۰٪ عملی:** ساخت پروژه واقعی در پایان هر ترم توسط خود کارآموز\n- **پشتیبانی از مسابقات:** آماده‌سازی تیم‌های منتخب برای المپیادها و جشنواره‌های کشوری`,
  },
  {
    id: 'PST-FAT-103',
    title: 'درخشش و افتخارآفرینی کارآموزان فاتحان در مسابقات کشوری رباتیک و خوارزمی',
    slug: 'fatehan-students-national-robotics-championship',
    type: 'خبر ویژه مسابقات',
    parentCategory: 'اخبار آموزشگاه',
    category: 'افتخارات و مسابقات',
    tags: ['مسابقات رباتیک', 'ربات مسیریاب', 'ربات فوتبالیست', 'افتخارات فاتحان'],
    author: 'روابط عمومی آکادمی فاتحان',
    featuredImageUrl: '/assets/blog/blog-04.jpg',
    seoScore: 95,
    views: 21300,
    readingTimeMinutes: 5,
    status: 'Published' as const,
    updatedAt: '۱۴۰۵/۰۸/۰۳',
    excerpt:
      'گزارش تصویری و مشروح از کسب رتبه‌های برتر تیم‌های دانش‌آموزی آموزشگاه رباتیک فاتحان در لیگ‌های ربات‌های جنگجو، مسیریاب سرعتی و خلاقیت و نوآوری.',
    bodyContent: `## حضور پرقدرت تیم‌های دانش‌آموزی فاتحان در رقابت‌های ملی\nتیم‌های منتخب کارآموزان آموزشگاه رباتیک فاتحان پس از ماه‌ها تلاش در کارگاه و بهینه‌سازی شاسی و الگوریتم‌های ربات‌های خود، موفق به کسب عناوین برتر کشوری شدند.\n\n- کسب مقام برتر در لیگ ربات‌های مسیریاب پیشرفته\n- طراحی شاسی اختصاصی با پرینترهای سه‌بعدی کارگاه فاتحان\n- اعطای گواهینامه معتبر و امتیاز ویژه رزومه علمی به اعضای تیم‌ها`,
  },
  {
    id: 'PST-FAT-104',
    title: 'آموزش برنامه‌نویسی پایتون و اسکرچ به کودکان و نوجوانان؛ از بازی‌سازی تا هوش مصنوعی',
    slug: 'python-and-scratch-coding-for-kids-and-teens',
    type: 'مقاله آموزشی',
    parentCategory: 'برنامه‌نویسی',
    category: 'کدنویسی و هوش مصنوعی',
    tags: ['پایتون نوجوانان', 'اسکرچ', 'هوش مصنوعی', 'بازی‌سازی'],
    author: 'دپارتمان کدنویسی فاتحان',
    featuredImageUrl: '/assets/blog/blog-03.jpg',
    seoScore: 97,
    views: 12780,
    readingTimeMinutes: 7,
    status: 'Published' as const,
    updatedAt: '۱۴۰۵/۰۸/۰۲',
    excerpt:
      'چگونه دانش‌آموزان بدون نیاز به پیش‌زمینه قبلی، منطق کدنویسی را با ساخت بازی‌های دوبعدی در Scratch آغاز کرده و به برنامه‌نویسی حرفه‌ای Python و پردازش تصویر می‌رسند؟',
    bodyContent: `## چرا اسکرچ (Scratch) و پایتون (Python) بهترین زوج آموزشی هستند؟\nدر سنین دبستان، تایپ دستورات انگلیسی می‌تواند برای کودک خسته‌کننده باشد؛ به همین دلیل در فاتحان ابتدا تفکر الگوریتمی را با بلوک‌های رنگی Scratch آموزش می‌دهیم و سپس در دوره نوجوانان وارد دنیای قدرتمند پایتون و هوش مصنوعی می‌شویم.\n\n- طراحی بازی‌های رایانه‌ای دوبعدی و انیمیشن‌های تعاملی\n- برنامه‌نویسی بردهای هوشمند و اتصال کد به دنیای واقعی\n- پیاده‌سازی پروژه‌های تشخیص چهره و دست با کتابخانه OpenCV`,
  },
  {
    id: 'PST-FAT-105',
    title: 'کاربرد پرینتر سه‌بعدی و طراحی SolidWorks در ساخت قطعات سفارشی ربات',
    slug: '3d-printing-and-solidworks-for-student-inventors',
    type: 'گزارش کارگاهی',
    parentCategory: 'تولید و ساخت',
    category: 'چاپ سه‌بعدی و الکترونیک',
    tags: ['چاپ سه‌بعدی', 'سالیدورک', 'ساخت قطعه', 'کارگاه فاتحان'],
    author: 'دپارتمان مدل‌سازی و ساخت فاتحان',
    featuredImageUrl: '/assets/blog/blog-05.jpg',
    seoScore: 94,
    views: 9840,
    readingTimeMinutes: 6,
    status: 'Published' as const,
    updatedAt: '۱۴۰۵/۰۸/۰۱',
    excerpt:
      'در کارگاه مجهز فاتحان، دانش‌آموزان محدود به قطعات آماده نیستند؛ هر قطعه‌ای که در ذهنشان طراحی کنند را در کامپیوتر مدل‌سازی کرده و با پرینتر سه‌بعدی چاپ می‌کنند!',
    bodyContent: `## از ایده ذهنی تا قطعه واقعی در کمتر از ۲ ساعت\nیکی از جذاب‌ترین بخش‌های آموزش در آکادمی فاتحان، کار با پرینترهای سه‌بعدی صنعتی کارگاه است. کارآموزان یاد می‌گیرند چگونه چرخ‌دنده، شاسی ربات یا بازوی مکانیکی دلخواه خود را طراحی و پرینت کنند.`,
  },
  {
    id: 'PST-FAT-106',
    title: '۵ نشانه کلیدی که می‌گوید فرزند شما استعداد درخشانی در مهندسی و رباتیک دارد',
    slug: '5-signs-your-child-has-engineering-talent',
    type: 'راهنمای خانواده',
    parentCategory: 'مشاوره والدین',
    category: 'راهنمای والدین و استعدادیابی',
    tags: ['استعدادیابی کودک', 'مشاوره رایگان', 'خلاقیت دانش‌آموز', 'خانواده'],
    author: 'واحد مشاوره و استعدادیابی فاتحان',
    featuredImageUrl: '/assets/blog/blog-07.jpg',
    seoScore: 96,
    views: 16210,
    readingTimeMinutes: 5,
    status: 'Published' as const,
    updatedAt: '۱۴۰۵/۰۷/۲۹',
    excerpt:
      'باز کردن اسباب‌بازی‌ها برای دیدن داخل آن‌ها، علاقه به لگو و کنجکاوی درباره نحوه کار وسایل برقی؛ چگونه این نشانه‌ها را در جلسه استعدادیابی رایگان فاتحان شکوفا کنیم؟',
    bodyContent: `## کنجکاوی کودک را به مهارت مهندسی تبدیل کنید\nاگر فرزندتان اسباب‌بازی‌هایش را باز می‌کند تا ببیند موتور و چرخ‌دنده‌های داخل آن چطور کار می‌کنند، او یک مهندس کوچک است! در جلسه معارفه و تعیین سطح رایگان آموزشگاه فاتحان، مربیان ما علاقه و استعداد دقیق او را ارزیابی می‌کنند.`,
  },
  {
    id: 'PST-FAT-107',
    title: 'آشنایی با بردهای هوشمند آردوینو (Arduino) و اینترنت اشیاء (IoT) برای نوجوانان',
    slug: 'arduino-and-iot-smart-projects-for-teens',
    type: 'مقاله تخصصی',
    parentCategory: 'الکترونیک هوشمند',
    category: 'چاپ سه‌بعدی و الکترونیک',
    tags: ['آردوینو', 'اینترنت اشیاء', 'خانه هوشمند', 'الکترونیک عملی'],
    author: 'دپارتمان الکترونیک فاتحان',
    featuredImageUrl: '/assets/blog/blog-06.jpg',
    seoScore: 93,
    views: 11050,
    readingTimeMinutes: 7,
    status: 'Published' as const,
    updatedAt: '۱۴۰۵/۰۷/۲۷',
    excerpt:
      'ساخت دزدگیر لیزری، گلدان هوشمند سخنگو و سیستم کنترل روشنایی با موبایل؛ پروژه‌های واقعی که نوجوانان در دپارتمان الکترونیک فاتحان با دستان خود می‌سازند.',
    bodyContent: `## الکترونیک ایمن، جذاب و ۱۰۰٪ کاربردی\nدر دپارتمان الکترونیک فاتحان، کارآموزان بدون هیچ‌گونه خطر با ولتاژهای ایمن ۵ ولت، بردبورد، سنسورهای اولتراسونیک، دما، رطوبت و بردهای میکروکنترلر آردوینو پروژه‌های هوشمند می‌سازند.`,
  },
  {
    id: 'PST-FAT-108',
    title: 'معرفی کامل بسته‌ها و کیت‌های استاندارد آموزشی رباتیک فاتحان (از سطح ۱ تا پیشرفته)',
    slug: 'guide-to-fatehan-official-robotics-kits',
    type: 'راهنمای تجهیزات',
    parentCategory: 'تجهیزات آموزشی',
    category: 'رباتیک و مکاترونیک',
    tags: ['کیت رباتیک', 'بسته اسمارت', 'مکانیک تام', 'پردازنده ARC'],
    author: 'واحد تجهیزات کارگاهی فاتحان',
    featuredImageUrl: '/assets/blog/blog-08.jpg',
    seoScore: 95,
    views: 13600,
    readingTimeMinutes: 6,
    status: 'Published' as const,
    updatedAt: '۱۴۰۵/۰۷/۲۵',
    excerpt:
      'بررسی قطعات، موتورهای گیربکس‌دار، بردهای درایور و سنسورهای موجود در پک‌های استاندارد آموزشی فاتحان برای تمرین در کارگاه و منزل.',
    bodyContent: `## کیفیت صنعتی و ایمنی کامل قطعات آموزشی\nتمامی کیت‌های آموزشی ارائه شده در آموزشگاه فاتحان دارای قطعات استاندارد، مقاوم و قابل ارتقا در ترم‌های بعدی هستند تا خانواده‌ها کمترین هزینه را برای تهیه تجهیزات بپردازند.`,
  },
];

// ============================================================================
// 1. YAHOO-STYLE NEWS & MAGAZINE PORTAL (/blog) & SINGLE ARTICLE PAGE (/blog/:id)
// ============================================================================
export const BlogRoutesPage: React.FC = () => {
  const { state, settings, adapter, storePath, navigateStore, loggedInCustomer, refreshState, notify } =
    useFatehanTheme();

  const [commentAuthor, setCommentAuthor] = useState<string>(
    loggedInCustomer?.fullName || ''
  );
  const [commentRole, setCommentRole] = useState<string>(
    loggedInCustomer?.role || `خانواده کارآموز ${settings.academyNameFa}`
  );
  const [commentBody, setCommentBody] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  // Yahoo Portal Archive State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewLayout, setViewLayout] = useState<'yahoo-stream' | 'grid'>('yahoo-stream');
  const [selectedPollOption, setSelectedPollOption] = useState<number | null>(null);
  const [pollVotes, setPollVotes] = useState<number[]>([44, 31, 15, 10]);

  if (!state) return null;

  // Primary source: CMS v2.0.0 API (`state.cmsPosts`); falls back to built-in demo articles ONLY when CMS has 0 posts
  const allPosts = React.useMemo(() => {
    const dbPosts = (state.cmsPosts || []).map((p, idx) => {
      const fallbackImg = `/assets/blog/blog-0${(idx % 8) + 1}.jpg`;
      const hasGenericKitImg = !p.featuredImageUrl || p.featuredImageUrl === '/assets/kits/kit-01.jpg';
      return {
        ...p,
        featuredImageUrl: hasGenericKitImg ? fallbackImg : p.featuredImageUrl,
      };
    });
    return dbPosts.length > 0 ? dbPosts : FATEHAN_PORTAL_ARTICLES;
  }, [state.cmsPosts]);

  const isSinglePost =
    storePath.startsWith('/blog/') && storePath.replace('/blog/', '').trim().length > 0;
  const postIdOrSlug = isSinglePost ? storePath.replace('/blog/', '').trim() : '';

  if (isSinglePost) {
    const activePost =
      allPosts.find((p) => p.id === postIdOrSlug || p.slug === postIdOrSlug) ||
      allPosts[0];

    if (!activePost) return null;

    const postComments = state.cmsComments.filter(
      (c) =>
        c.categoryType === 'post_comment' &&
        (c.targetId === activePost.id ||
          c.targetTitle === activePost.title ||
          c.targetTitle.includes(activePost.title.slice(0, 15)))
    );

    const handleSubmitPostComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!commentBody.trim()) return;
      setIsSubmittingComment(true);
      try {
        const res = await adapter.submitComment({
          categoryType: 'post_comment',
          authorName: commentAuthor.trim() || loggedInCustomer?.fullName || 'کاربر سایت',
          authorRoleOrOrg: commentRole,
          targetId: activePost.id,
          targetTitle: activePost.title,
          body: commentBody.trim(),
          rating: 5,
        });
        if (res.ok) {
          setCommentBody('');
          await refreshState();
          notify('دیدگاه شما برای این مقاله با موفقیت ثبت شد.');
        } else {
          notify(res.error || 'خطا در ثبت دیدگاه');
        }
      } finally {
        setIsSubmittingComment(false);
      }
    };

    const otherPosts = allPosts.filter((p) => p.id !== activePost.id).slice(0, 4);

    return (
      <div className="py-6 space-y-6">
        {/* Breadcrumb & Top Actions */}
        <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigateStore('/')}
              className="hover:text-blue-600 font-bold cursor-pointer"
            >
              صفحه اصلی
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => navigateStore('/blog')}
              className="hover:text-blue-600 font-bold cursor-pointer"
            >
              پورتال خبری و مجله علمی فاتحان
            </button>
            <span>/</span>
            <span className="font-extrabold text-slate-900 truncate max-w-xs">{activePost.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateStore('/blog')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>بازگشت به پورتال مجله و اخبار</span>
            </button>
          </div>
        </div>

        {/* Single Article Main Card */}
        <article className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Large Featured Image */}
          <div className="relative h-64 sm:h-96 bg-slate-900 overflow-hidden">
            <img
              src={activePost.featuredImageUrl || '/assets/blog/blog-01.jpg'}
              alt={activePost.title}
              onError={(e) => {
                e.currentTarget.src = '/assets/kits/kit-01.jpg';
              }}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-5 right-5 left-5 text-white space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-lg bg-blue-600 font-bold">
                  {activePost.category}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-amber-400 font-mono">
                  بازدید: {formatPersianNumber(activePost.views || 12400)} نفر
                </span>
              </div>
              <BiDiText
                as="h1"
                className="text-lg sm:text-3xl font-black leading-relaxed text-white"
              >
                {activePost.title}
              </BiDiText>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>نویسنده: {activePost.author}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>تاریخ انتشار: {activePost.updatedAt}</span>
                </span>
                <span>
                  زمان مطالعه: {formatPersianNumber(activePost.readingTimeMinutes || 6)} دقیقه
                </span>
              </div>
            </div>
          </div>

          {/* Formatted Rich-Text Content Body */}
          <div className="p-6 sm:p-10 space-y-6">
            {/* Excerpt Lead Box */}
            {activePost.excerpt && (
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 border-r-4 border-blue-600 border border-blue-100 text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">
                {activePost.excerpt}
              </div>
            )}

            {/* Main Rich Content */}
            <RichFormattedContent
              content={
                activePost.bodyContent ||
                `## ${activePost.title}\n\n${activePost.excerpt}\n\nاین مقاله آموزشی توسط تیم علمی آموزشگاه تخصصی رباتیک فاتحان منتشر شده است.`
              }
            />

            {/* Article Tags */}
            {activePost.tags && activePost.tags.length > 0 && (
              <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>برچسب‌های مرتبط:</span>
                </span>
                {activePost.tags.map((tg, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                  >
                    #{tg}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Article Comments & Submission Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>
                دیدگاه‌ها و پرسش‌های خانواده‌ها درباره این مطلب ({formatPersianNumber(postComments.length)})
              </span>
            </h3>
            <span className="text-xs text-slate-500">
              پاسخ کارشناسان آموزشگاه فاتحان در همین بخش درج می‌شود
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-3">
              {postComments.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  هنوز دیدگاهی برای این مقاله ثبت نشده است. اولین نفری باشید که سوال یا نظر خود را می‌نویسد!
                </div>
              ) : (
                postComments.map((cm) => (
                  <div
                    key={cm.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-extrabold text-slate-900">
                          {cm.authorName}
                        </span>
                        <span className="text-[11px] text-blue-600 mr-2">
                          ({cm.authorRoleOrOrg})
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{cm.createdAt}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{cm.body}</p>
                    {cm.adminReply && (
                      <div className="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950">
                        <strong className="block mb-0.5 text-blue-700">
                          پاسخ واحد آموزش فاتحان:
                        </strong>
                        {cm.adminReply}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleSubmitPostComment}
              className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 text-white space-y-3.5"
            >
              <h4 className="text-xs sm:text-sm font-extrabold text-amber-400">
                ارسال دیدگاه یا سوال درباره این مقاله
              </h4>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">مقطع تحصیلی یا عنوان:</label>
                <input
                  type="text"
                  value={commentRole}
                  onChange={(e) => setCommentRole(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">متن دیدگاه یا پرسش:</label>
                <textarea
                  rows={4}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="سوال یا نظر خود درباره این مبحث آموزشی را بنویسید..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingComment ? 'در حال ثبت...' : 'ثبت دیدگاه در مقاله'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Related Articles */}
        {otherPosts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">سایر مطالب پیشنهادی مجله فاتحان</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherPosts.map((op) => (
                <div
                  key={op.id}
                  onClick={() => navigateStore(`/blog/${op.id}`)}
                  className="p-4 bg-white border border-slate-200 hover:border-blue-400 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all shadow-2xs"
                >
                  <img
                    src={op.featuredImageUrl || '/assets/blog/blog-02.jpg'}
                    alt={op.title}
                    onError={(e) => {
                      e.currentTarget.src = '/assets/kits/kit-01.jpg';
                    }}
                    className="w-20 h-20 rounded-xl object-cover shrink-0 bg-slate-100"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="text-[11px] text-blue-600 font-bold">{op.category}</div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                      {op.title}
                    </h4>
                    <div className="text-[11px] text-slate-500">مطالعه کامل گزارش ←</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // YAHOO-STYLE NEWS & MAGAZINE PORTAL ARCHIVE (/blog)
  // ============================================================================
  const categories = [
    { id: 'ALL', label: 'همه اخبار و مقالات' },
    { id: 'راهنمای والدین و استعدادیابی', label: '👨‍👩‍👧 راهنمای والدین و استعدادیابی' },
    { id: 'رباتیک و مکاترونیک', label: '🤖 رباتیک و مکاترونیک' },
    { id: 'کدنویسی و هوش مصنوعی', label: '💻 کدنویسی و هوش مصنوعی' },
    { id: 'افتخارات و مسابقات', label: '🏆 افتخارات و مسابقات' },
    { id: 'چاپ سه‌بعدی و الکترونیک', label: '⚡ چاپ سه‌بعدی و الکترونیک' },
  ];

  const filteredPosts = allPosts.filter((post) => {
    const matchesCat =
      selectedCategory === 'ALL' ||
      post.category === selectedCategory ||
      post.parentCategory === selectedCategory ||
      (post.tags && post.tags.some((t) => selectedCategory.includes(t)));
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      post.title.toLowerCase().includes(q) ||
      (post.excerpt && post.excerpt.toLowerCase().includes(q)) ||
      (post.category && post.category.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const leadStory = filteredPosts[0] || allPosts[0];
  const subHeroStories = filteredPosts.slice(1, 4);
  const streamStories = filteredPosts.length > 4 ? filteredPosts.slice(1) : filteredPosts;
  const trendingTop5 = [...allPosts]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  const totalPollVotes = pollVotes.reduce((acc, v) => acc + v, 0);
  const handleVotePoll = (idx: number) => {
    if (selectedPollOption !== null) return;
    setSelectedPollOption(idx);
    setPollVotes((prev) => prev.map((v, i) => (i === idx ? v + 1 : v)));
    notify('رای شما در نظرسنجی علمی هفته ثبت شد!');
  };

  return (
    <div className="py-5 space-y-6">
      {/* 1. YAHOO-STYLE BREAKING NEWS & TICKER BAR */}
      <div className="bg-slate-900 text-white rounded-2xl px-4 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-black shrink-0 animate-pulse">
            <span>🔴 سرخط خبرها</span>
          </span>
          <button
            type="button"
            onClick={() => navigateStore(`/blog/${allPosts[2]?.id || 'PST-FAT-103'}`)}
            className="text-xs font-bold text-amber-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            🏆 درخشش تیم‌های دانش‌آموزی فاتحان در مسابقات کشوری رباتیک
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            onClick={() => navigateStore('/courses')}
            className="text-xs font-medium text-cyan-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            ⚡ آغاز ثبت‌نام ترم جدید در ۵ دپارتمان تخصصی (۷ تا ۱۸ سال)
          </button>
          <span className="text-slate-600 hidden xl:inline">|</span>
          <button
            type="button"
            onClick={() => navigateStore('/contact')}
            className="text-xs font-medium text-emerald-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer hidden xl:inline"
          >
            🎯 رزرو نوبت جلسه معارفه و استعدادیابی حضوری رایگان در شعبه اندیشه
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400 font-mono">
          <span>پورتال خبری و علمی فاتحان</span>
          <span>·</span>
          <span className="text-white font-bold">{formatPersianNumber(allPosts.length)} گزارش و مقاله</span>
        </div>
      </div>

      {/* 2. YAHOO PORTAL MASTHEAD, SEARCH & CATEGORY NAVIGATION PILLS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black">
              <BookOpen className="w-3.5 h-3.5" />
              <span>مجله علمی، اخبار مسابقات و پایگاه دانش خانواده‌ها</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900">
              پورتال خبری و مقالات تخصصی رباتیک فاتحان
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              جدیدترین مقالات استعدادیابی، آموزش رباتیک، کدنویسی، هوش مصنوعی و گزارش مسابقات دانش‌آموزی
            </p>
          </div>

          {/* Search Input & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در اخبار و مقالات..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  پاک کردن
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Yahoo-Style Category Bar */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewLayout('yahoo-stream')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                viewLayout === 'yahoo-stream' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              نمای پورتال یاهو
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                viewLayout === 'grid' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              نمای شبکه‌ای
            </button>
          </div>
        </div>
      </div>

      {/* 3. YAHOO! BENTO HERO SHOWCASE (LEAD STORY + 3 TOP HEADLINES STACK) */}
      {leadStory && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Right 7 Cols: Lead Story Spotlight */}
          <div
            onClick={() => navigateStore(`/blog/${leadStory.id}`)}
            className="lg:col-span-7 group relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 shadow-md cursor-pointer min-h-[360px] sm:min-h-[430px] flex flex-col justify-end"
          >
            <img
              src={leadStory.featuredImageUrl || '/assets/blog/blog-01.jpg'}
              alt={leadStory.title}
              onError={(e) => {
                e.currentTarget.src = '/assets/kits/kit-01.jpg';
              }}
              className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />

            <div className="relative z-10 p-6 sm:p-8 space-y-3 text-white">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black">
                  ⭐ گزارش اول مجله
                </span>
                <span className="px-3 py-1 rounded-xl bg-blue-600/90 text-white font-bold">
                  {leadStory.category}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-white/15 backdrop-blur-xs text-slate-200 font-mono text-[11px]">
                  زمان مطالعه: {formatPersianNumber(leadStory.readingTimeMinutes || 6)} دقیقه
                </span>
              </div>

              <h2 className="text-lg sm:text-2xl lg:text-[26px] font-black text-white leading-snug group-hover:text-amber-300 transition-colors">
                {leadStory.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-2">
                {leadStory.excerpt}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 border-t border-white/15">
                <div className="flex items-center gap-3">
                  <span>نویسنده: {leadStory.author}</span>
                  <span>·</span>
                  <span>{leadStory.updatedAt}</span>
                </div>
                <span className="font-extrabold text-amber-400 inline-flex items-center gap-1">
                  <span>مشاهده کامل گزارش</span>
                  <span>←</span>
                </span>
              </div>
            </div>
          </div>

          {/* Left 5 Cols: Yahoo Top-3 Editor's Picks Stack */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>برگزیده‌های سردبیر و اخبار داغ</span>
              </h3>
              <span className="text-[11px] font-bold text-blue-600">بروزرسانی امروز</span>
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {subHeroStories.map((story) => (
                <div
                  key={story.id}
                  onClick={() => navigateStore(`/blog/${story.id}`)}
                  className="group p-2.5 rounded-2xl hover:bg-blue-50/60 border border-transparent hover:border-blue-200 transition-all flex items-center gap-3.5 cursor-pointer"
                >
                  <img
                    src={story.featuredImageUrl || '/assets/blog/blog-02.jpg'}
                    alt={story.title}
                    onError={(e) => {
                      e.currentTarget.src = '/assets/kits/kit-02.jpg';
                    }}
                    className="w-24 h-20 rounded-xl object-cover shrink-0 bg-slate-100 group-hover:scale-105 transition-transform"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold truncate">
                        {story.category}
                      </span>
                      <span className="text-slate-400 font-mono shrink-0">
                        {formatPersianNumber(story.readingTimeMinutes || 5)} دقیقه
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-[13px] font-black text-slate-900 group-hover:text-blue-700 leading-snug line-clamp-2">
                      {story.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Promo Strip inside Bento Box */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-l from-slate-900 to-blue-950 text-white flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-extrabold text-amber-400">
                  🎯 استعدادیابی حضوری رایگان
                </div>
                <div className="text-xs font-bold text-slate-200">
                  مشاوره انتخاب رشته رباتیک و کدنویسی برای ۷ تا ۱۸ سال
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigateStore('/contact')}
                className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black shrink-0 cursor-pointer whitespace-nowrap"
              >
                رزرو نوبت ←
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 4. YAHOO 12-COLUMN PORTAL STREAM + STICKY SIDEBAR WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right 8 Cols: Main News & Articles Feed */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>
                آخرین مقالات و گزارش‌های علمی ({formatPersianNumber(filteredPosts.length)} مطلب)
              </span>
            </h2>
            <span className="text-xs text-slate-500">
              مرتب‌سازی: جدیدترین مطالب
            </span>
          </div>

          {viewLayout === 'yahoo-stream' ? (
            <div className="space-y-3.5">
              {streamStories.map((post) => (
                <article
                  key={post.id}
                  onClick={() => navigateStore(`/blog/${post.id}`)}
                  className="group bg-white border border-slate-200 hover:border-blue-400 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-5 cursor-pointer transition-all shadow-2xs hover:shadow-md"
                >
                  <div className="relative w-full sm:w-52 h-44 sm:h-36 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={post.featuredImageUrl || '/assets/blog/blog-03.jpg'}
                      alt={post.title}
                      onError={(e) => {
                        e.currentTarget.src = '/assets/kits/kit-03.jpg';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-900/85 text-amber-400 text-[10px] font-bold">
                      {post.category}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-bold text-blue-700">{post.author}</span>
                        <span>·</span>
                        <span>{post.updatedAt}</span>
                        <span>·</span>
                        <span>مطالعه: {formatPersianNumber(post.readingTimeMinutes || 6)} دقیقه</span>
                        <span>·</span>
                        <span className="font-mono text-slate-600">
                          👁 {formatPersianNumber(post.views || 9500)}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-lg font-black text-slate-900 group-hover:text-blue-600 leading-snug transition-colors">
                        {post.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(post.tags || ['رباتیک', 'فاتحان']).slice(0, 3).map((tg, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold"
                          >
                            #{tg}
                          </span>
                        ))}
                      </div>

                      <span className="text-xs font-extrabold text-blue-600 group-hover:translate-x-[-3px] transition-transform inline-flex items-center gap-1">
                        <span>ادامه مطلب و دیدگاه‌ها</span>
                        <span>←</span>
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  onClick={() => navigateStore(`/blog/${post.id}`)}
                  className="group bg-white border border-slate-200 hover:border-blue-400 rounded-3xl overflow-hidden flex flex-col justify-between cursor-pointer transition-all shadow-2xs hover:shadow-md"
                >
                  <div>
                    <div className="relative h-48 bg-slate-900 overflow-hidden">
                      <img
                        src={post.featuredImageUrl || '/assets/blog/blog-01.jpg'}
                        alt={post.title}
                        onError={(e) => {
                          e.currentTarget.src = '/assets/kits/kit-01.jpg';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/85 text-amber-400 text-[11px] font-bold">
                        {post.category}
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{post.author}</span>
                        <span>{post.updatedAt}</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-600 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-blue-600">
                    <span>مطالعه کامل مقاله</span>
                    <span>←</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Left 4 Cols: Yahoo Portal Sidebar Widgets */}
        <aside className="lg:col-span-4 space-y-5">
          {/* WIDGET 1: Yahoo Trending Top 5 ("پربازدیدترین مطالب هفته") */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>پربازدیدترین مطالب هفته</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                TRENDING
              </span>
            </div>

            <div className="space-y-3">
              {trendingTop5.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => navigateStore(`/blog/${item.id}`)}
                  className="group flex items-start gap-3 p-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <span className="w-7 h-7 rounded-xl bg-slate-900 text-amber-400 font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {formatPersianNumber(idx + 1)}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 leading-snug line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="text-blue-600 font-bold">{item.category}</span>
                      <span>·</span>
                      <span>{formatPersianNumber(item.views || 12000)} بازدید</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WIDGET 2: Interactive Family Poll ("نظرسنجی علمی هفته") */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black">
                📊 نظرسنجی علمی خانواده‌ها
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {formatPersianNumber(totalPollVotes)} رای ثبت‌شده
              </span>
            </div>

            <h3 className="text-xs sm:text-sm font-black leading-snug text-white">
              فرزند شما به کدام حوزه فناوری علاقه و کنجکاوی بیشتری نشان می‌دهد؟
            </h3>

            <div className="space-y-2.5">
              {[
                'ساخت ربات‌های متحرک و مسابقه‌ای',
                'برنامه‌نویسی، بازی‌سازی و هوش مصنوعی',
                'الکترونیک، مدارها و بردهای هوشمند',
                'طراحی سه‌بعدی و پرینتر ۳D',
              ].map((opt, idx) => {
                const pct = Math.round((pollVotes[idx] / totalPollVotes) * 100);
                const isSelected = selectedPollOption === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleVotePoll(idx)}
                    className={`w-full text-right p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-amber-400 bg-slate-800'
                        : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="absolute inset-y-0 right-0 bg-blue-600/25 pointer-events-none transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative z-10 flex items-center justify-between gap-2 text-xs font-bold">
                      <span>{opt}</span>
                      <span className="font-mono text-amber-400 shrink-0">
                        %{formatPersianNumber(pct)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400">
              {selectedPollOption !== null
                ? '✅ سپاس! رای شما در آمار زنده لحاظ شد.'
                : 'روی گزینه مورد نظر کلیک کنید تا نتیجه زنده را ببینید.'}
            </p>
          </div>

          {/* WIDGET 3: Upcoming Academy Events ("تقویم رویدادها و کارگاه‌ها") */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3.5 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>تقویم رویدادها و کارگاه‌های فاتحان</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-black text-blue-800">
                  <span>کارگاه رایگان استعدادیابی رباتیک</span>
                  <span>پنجشنبه‌ها</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  آشنایی حضوری دانش‌آموزان با ربات‌ها و پرینتر سه‌بعدی با هماهنگی قبلی
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-black text-amber-900">
                  <span>لیگ داخلی ربات‌های فوتبالیست و مسیریاب</span>
                  <span>پایان هر ترم</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  رقابت جذاب بین پروژه‌های ساخته‌شده توسط کارآموزان در پیست استاندارد
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateStore('/courses')}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer transition-colors"
            >
              مشاهده تقویم و لیست ۱۵ دوره آموزشی ←
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

// ============================================================================
// 2. DEDICATED CUSTOMER ACCOUNT PORTAL (/my-account) WITH 5 TABS
// ============================================================================
export const CustomerAccountDashboardPage: React.FC = () => {
  const {
    state,
    settings,
    adapter,
    loggedInCustomer,
    canAccessAdmin,
    openAdminPanel,
    syncAuthSession,
    logoutCustomer,
    onGoogleLogin,
    navigateStore,
    refreshState,
    notify,
  } = useFatehanTheme();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'ideas' | 'orders' | 'addresses' | 'comments' | 'logout'
  >('dashboard');

  // Student Idea Submission State inside /my-account
  const [newIdeaTitle, setNewIdeaTitle] = useState<string>('');
  const [newIdeaNote, setNewIdeaNote] = useState<string>('');
  const [isSubmittingAccountIdea, setIsSubmittingAccountIdea] = useState<boolean>(false);

  // Address Book Form State
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrLabel, setAddrLabel] = useState<string>('');
  const [addrRecipient, setAddrRecipient] = useState<string>(
    loggedInCustomer?.fullName || ''
  );
  const [addrPhone, setAddrPhone] = useState<string>(
    loggedInCustomer?.phone || ''
  );
  const [addrProvince, setAddrProvince] = useState<string>(settings.location.province || 'تهران');
  const [addrCity, setAddrCity] = useState<string>(settings.location.city || 'اندیشه');
  const [addrPostalCode, setAddrPostalCode] = useState<string>('');
  const [addrExact, setAddrExact] = useState<string>('');
  const [addrIsDefault, setAddrIsDefault] = useState<boolean>(true);
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);

  // Mobile Login State when logged out (Username = Mobile Number)
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginCode, setLoginCode] = useState<string>('');
  const [loginOtpSent, setLoginOtpSent] = useState<boolean>(false);
  const [isSendingCode, setIsSendingCode] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);

  if (!state) return null;

  const addresses = state.customerAddresses || [];
  const myOrders = state.orders || [];
  const myComments = state.cmsComments || [];
  const allIdeas = state.studentIdeas || [];
  const myIdeas = loggedInCustomer
    ? allIdeas.filter(
        (item) =>
          item.phone === loggedInCustomer.phone ||
          item.studentName === loggedInCustomer.fullName
      )
    : allIdeas;
  const displayIdeas = myIdeas.length > 0 ? myIdeas : allIdeas;

  const myAnnouncements = (state.announcements || []).filter(
    (ann) =>
      ann.targetType === 'public' ||
      (loggedInCustomer && ann.mentionedPhone === loggedInCustomer.phone)
  );

  const handleCreateIdeaFromAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle.trim() || !newIdeaNote.trim() || !loggedInCustomer) return;
    setIsSubmittingAccountIdea(true);
    try {
      const res = await adapter.submitStudentIdea({
        title: newIdeaTitle.trim(),
        note: newIdeaNote.trim(),
        studentName: loggedInCustomer.fullName,
        phone: loggedInCustomer.phone,
        ageGroup: loggedInCustomer.role || 'کارآموز فاتحان',
      });
      if (res.ok) {
        setNewIdeaTitle('');
        setNewIdeaNote('');
        await refreshState();
        notify('💡 ایده و یادداشت شما در حساب کاربری ثبت شد و برای مدیریت ارسال گردید.');
      } else {
        notify(res.error || 'خطا در ثبت ایده');
      }
    } finally {
      setIsSubmittingAccountIdea(false);
    }
  };

  const handleRequestCustomerOtp = async () => {
    if (!loginPhone.trim()) {
      notify('لطفاً شماره موبایل خود را وارد نمایید.');
      return;
    }
    setIsSendingCode(true);
    try {
      const data = await adapter.sendOtp({ phone: loginPhone, patternKey: 'otp_login' });
      if (data.ok) {
        setLoginOtpSent(true);
        notify('کد تایید ۵ رقمی به شماره همراه شما پیامک شد.');
      } else {
        notify(data.error || 'خطا در ارسال پیامک تایید');
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim() || !loginCode.trim()) {
      notify('لطفاً شماره موبایل و کد تایید را وارد نمایید.');
      return;
    }
    setIsVerifyingCode(true);
    try {
      const data = await adapter.verifyOtp({ phone: loginPhone, code: loginCode });
      if (data.ok && data.verified && data.user) {
        syncAuthSession(data.user, data.sessionToken);
        await refreshState();
        setActiveTab('dashboard');
        notify(
          data.message ||
            (data.user.role === 'super_admin' || data.user.role === 'admin'
              ? 'ورود مدیریت تایید شد! اکنون می‌توانید وارد پنل مدیریت CMS شوید.'
              : 'ورود به حساب کاربری با موفقیت انجام شد.')
        );
      } else {
        notify(data.error || 'شماره موبایل یا کد امنیتی وارد شده معتبر نیست.');
      }
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrRecipient.trim() || !addrExact.trim()) {
      notify('لطفاً نام تحویل‌گیرنده و آدرس دقیق پستی را وارد نمایید.');
      return;
    }
    setIsSavingAddress(true);
    try {
      const res = await adapter.saveCustomerAddress({
        label: addrLabel.trim() || `آدرس ${addrCity}`,
        recipientName: addrRecipient.trim(),
        phone: addrPhone.trim(),
        province: addrProvince.trim(),
        city: addrCity.trim(),
        postalCode: addrPostalCode.trim(),
        exactAddress: addrExact.trim(),
        isDefault: addrIsDefault,
      });
      if (res.ok) {
        await refreshState();
        setEditingAddrId(null);
        setAddrLabel('');
        setAddrPostalCode('');
        setAddrExact('');
        notify(
          editingAddrId
            ? 'آدرس پستی شما با موفقیت ویرایش شد.'
            : 'آدرس پستی جدید به دفترچه آدرس‌های شما اضافه شد.'
        );
      } else {
        notify(res.error || 'خطا در ذخیره آدرس');
      }
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleEditAddress = (addr: CustomerSavedAddress) => {
    setEditingAddrId(addr.id);
    setAddrLabel(addr.label);
    setAddrRecipient(addr.recipientName);
    setAddrPhone(addr.phone);
    setAddrProvince(addr.province);
    setAddrCity(addr.city);
    setAddrPostalCode(addr.postalCode);
    setAddrExact(addr.exactAddress);
    setAddrIsDefault(Boolean(addr.isDefault));
  };

  const handleDeleteAddress = async (id: string) => {
    const res = await adapter.deleteCustomerAddress(id);
    if (res.ok) {
      await refreshState();
      notify('آدرس انتخابی از حساب کاربری حذف شد.');
    }
  };

  // Production-secure Mobile Login Screen inside /my-account (Zero mention of admin, zero quick-login bypass)
  if (!loggedInCustomer) {
    return (
      <div className="py-10 max-w-md mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900">
                ورود به پنل کاربری آموزشگاه فاتحان
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                نام کاربری شما همان شماره موبایل ثبت‌شده در آموزشگاه است
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyCustomerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                شماره موبایل (نام کاربری):
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  dir="ltr"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="0912..."
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
                <button
                  type="button"
                  onClick={handleRequestCustomerOtp}
                  disabled={isSendingCode}
                  className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                >
                  {isSendingCode
                    ? 'در حال ارسال...'
                    : loginOtpSent
                    ? 'ارسال مجدد کد'
                    : 'دریافت کد پیامکی'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                کد تایید پیامکی (OTP) یا رمز امنیتی حساب:
              </label>
              <input
                type="password"
                dir="ltr"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                placeholder="•••••"
                className="w-full px-3.5 py-2.5 text-sm font-mono tracking-widest text-center bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isVerifyingCode}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-600/20"
            >
              {isVerifyingCode ? 'در حال بررسی و احراز هویت...' : 'تایید و ورود به حساب کاربری'}
            </button>

            {onGoogleLogin && (
              <button
                type="button"
                onClick={() => void onGoogleLogin()}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                ورود سریع با حساب گوگل (Google Sign-In)
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  const roleDisplayFa =
    loggedInCustomer.role === 'super_admin'
      ? 'مدیر ارشد سیستم (سوپر ادمین)'
      : loggedInCustomer.role === 'admin'
      ? 'ادمین سیستم'
      : 'کاربر / کارآموز';

  return (
    <div className="py-6 space-y-6">
      {/* Top Customer Profile Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg">
            {loggedInCustomer.fullName.slice(0, 1)}
          </div>
          <div className="space-y-0.5">
            <div className="text-[11px] font-mono text-amber-400">
              {canAccessAdmin
                ? 'SUPER ADMIN & ACCOUNT PORTAL · /MY-ACCOUNT'
                : 'CUSTOMER PORTAL & DASHBOARD · /MY-ACCOUNT'}
            </div>
            <h1 className="text-base sm:text-xl font-extrabold">{loggedInCustomer.fullName}</h1>
            <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3">
              <span className="font-mono" dir="ltr">
                {loggedInCustomer.phone}
              </span>
              <span>·</span>
              <span
                className={
                  canAccessAdmin ? 'text-amber-400 font-extrabold' : 'text-emerald-400 font-bold'
                }
              >
                {roleDisplayFa}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canAccessAdmin && openAdminPanel && (
            <button
              type="button"
              onClick={() => openAdminPanel()}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-md"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ورود به پنل مدیریت CMS / تغییر پوسته</span>
            </button>
          )}
          <div className="px-4 py-2 rounded-2xl bg-slate-800 border border-slate-700 text-xs">
            <span className="text-slate-400 block text-[10px]">موجودی کیف پول سازمانی:</span>
            <span className="font-mono font-extrabold text-emerald-400">
              {formatToman(loggedInCustomer.walletBalanceToman)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigateStore('/shop')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
          >
            خرید جدید از فروشگاه
          </button>
        </div>
      </div>

      {/* Main Layout: 5 Navigation Tabs Sidebar + Active Tab Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar 6 Tabs (3 Cols) */}
        <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-4 space-y-1.5">
          {[
            { id: 'dashboard', label: '۱. پیشخوان کاربری', icon: LayoutDashboard },
            {
              id: 'ideas',
              label: `۲. ایده‌ها و یادداشت‌های من (${formatPersianNumber(displayIdeas.length)})`,
              icon: Lightbulb,
            },
            {
              id: 'orders',
              label: `۳. سفارشات من (${formatPersianNumber(myOrders.length)})`,
              icon: ShoppingBag,
            },
            {
              id: 'addresses',
              label: `۴. مدیریت آدرس‌ها (${formatPersianNumber(addresses.length)})`,
              icon: MapPin,
            },
            {
              id: 'comments',
              label: `۵. نظرات و دیدگاه‌های من (${formatPersianNumber(myComments.length)})`,
              icon: MessageSquare,
            },
            { id: 'logout', label: '۶. خروج از حساب کاربری', icon: LogOut },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const isLogout = tab.id === 'logout';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-right ${
                  active
                    ? isLogout
                      ? 'bg-rose-600 text-white'
                      : 'bg-indigo-600 text-white shadow-md'
                    : isLogout
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Active Tab Content (9 Cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: پیشخوان کاربری (User Dashboard) */}
          {activeTab === 'dashboard' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-6">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-sm sm:text-base font-extrabold text-indigo-950">
                    خوش آمدید، {loggedInCustomer.fullName} عزیز!
                  </h2>
                  <p className="text-xs text-slate-600">
                    از طریق این پیشخوان می‌توانید وضعیت سفارشات و فاکتورهای رسمی، آدرس‌های پستی و دیدگاه‌های ثبت‌شده خود را مدیریت نمایید.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>حساب تاییدشده OTP</span>
                </span>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  <div className="text-[11px] text-slate-500">اعتبار کیف پول</div>
                  <div className="text-xs sm:text-sm font-mono font-extrabold text-slate-900">
                    {formatToman(loggedInCustomer.walletBalanceToman)}
                  </div>
                </div>
                <div
                  onClick={() => setActiveTab('orders')}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 cursor-pointer hover:border-indigo-400"
                >
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  <div className="text-[11px] text-slate-500">کل سفارشات من</div>
                  <div className="text-sm font-mono font-extrabold text-slate-900">
                    {formatPersianNumber(myOrders.length)} سفارش
                  </div>
                </div>
                <div
                  onClick={() => setActiveTab('addresses')}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 cursor-pointer hover:border-indigo-400"
                >
                  <MapPin className="w-5 h-5 text-amber-600" />
                  <div className="text-[11px] text-slate-500">آدرس‌های ثبت‌شده</div>
                  <div className="text-sm font-mono font-extrabold text-slate-900">
                    {formatPersianNumber(addresses.length)} آدرس
                  </div>
                </div>
                <div
                  onClick={() => setActiveTab('comments')}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 cursor-pointer hover:border-indigo-400"
                >
                  <MessageSquare className="w-5 h-5 text-sky-600" />
                  <div className="text-[11px] text-slate-500">دیدگاه‌ها و نظرات</div>
                  <div className="text-sm font-mono font-extrabold text-slate-900">
                    {formatPersianNumber(myComments.length)} دیدگاه
                  </div>
                </div>
              </div>

              {/* Recent Orders Summary */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    خلاصه آخرین سفارشات ثبت‌شده
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    مشاهده همه سفارشات ←
                  </button>
                </div>

                <div className="space-y-2.5">
                  {myOrders.slice(0, 3).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-900 flex items-center gap-2">
                          <span className="font-mono text-indigo-700" dir="ltr">
                            {ord.id}
                          </span>
                          <span>·</span>
                          <span>شماره فاکتور: {ord.invoiceNumber}</span>
                        </div>
                        <div className="text-slate-500">
                          تاریخ: {ord.createdAt} · مبلغ کل:{' '}
                          <strong className="font-mono text-slate-900">
                            {formatToman(ord.totalToman)}
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateStore(`/order-received/${ord.id}`)}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>مشاهده جزییات سفارش و فاکتور</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Announcements & @Mentions inside User Dashboard */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <span>اطلاعیه‌ها و پیام‌های اختصاصی شما (@منشن)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ideas')}
                    className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    ورود به صندوق ایده‌های من ←
                  </button>
                </div>
                <div className="space-y-2">
                  {myAnnouncements.slice(0, 3).map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3 rounded-xl bg-white border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              ann.targetType === 'user_mention'
                                ? 'bg-blue-600 text-white'
                                : 'bg-amber-200 text-amber-950'
                            }`}
                          >
                            {ann.targetType === 'user_mention' ? 'پیام اختصاصی شما' : ann.badgeText || 'عمومی'}
                          </span>
                          <span className="font-black text-slate-900">{ann.title}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{ann.message}</p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">{ann.createdAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: ایده‌ها و یادداشت‌های من (Student Creative Ideas & Notes) */}
          {activeTab === 'ideas' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <span>صندوق ایده‌ها و یادداشت‌های من (فکر کن، بساز، کشف کن!)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تمامی ایده‌ها و یادداشت‌هایی که ثبت کرده‌اید، در این بخش و همچنین برای مدیریت آموزشگاه فاتحان قابل مشاهده است.
                  </p>
                </div>
              </div>

              {/* Submit New Idea Form */}
              <form
                onSubmit={handleCreateIdeaFromAccount}
                className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3.5"
              >
                <div className="text-xs font-black text-slate-900">
                  💡 ثبت ایده یا یادداشت جدید در دفترچه خلاقیت من:
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان ایده یا پروژه *:
                  </label>
                  <input
                    type="text"
                    required
                    value={newIdeaTitle}
                    onChange={(e) => setNewIdeaTitle(e.target.value)}
                    placeholder="مثلاً: ساخت ربات مرتب‌کننده اتاق یا بازی هوش مصنوعی"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    متن یادداشت و توضیحات کامل *:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newIdeaNote}
                    onChange={(e) => setNewIdeaNote(e.target.value)}
                    placeholder="جزئیات ایده خودت رو اینجا یادداشت کن..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 leading-relaxed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingAccountIdea}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingAccountIdea ? 'در حال ثبت...' : 'ذخیره در ایده‌های من و ارسال برای مربیان'}</span>
                </button>
              </form>

              {/* List of Ideas */}
              <div className="space-y-3">
                {displayIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-black text-slate-900">
                        {idea.title}
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                          {idea.status}
                        </span>
                        <span className="font-mono text-slate-400">{idea.createdAt}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{idea.note}</p>
                    {idea.adminReply && (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950">
                        <strong className="block text-blue-700 mb-0.5">
                          پاسخ و راهنمایی مربی آموزشگاه فاتحان:
                        </strong>
                        {idea.adminReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: سفارشات من (My Orders & Official Invoices) */}
          {activeTab === 'orders' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                    سفارشات من و فاکتورهای رسمی ({formatPersianNumber(myOrders.length)} فاکتور)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    لیست تمام سفارشات به همراه وضعیت پرداخت و دکمه مشاهده جزییات و چاپ فاکتور رسمی
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {myOrders.map((ord) => {
                  const isPaid = ord.status === 'Paid' || ord.status === 'Shipped';
                  const isCancelled = ord.status === 'Cancelled';
                  return (
                    <div
                      key={ord.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="font-mono text-xs sm:text-sm font-extrabold text-indigo-700"
                            dir="ltr"
                          >
                            {ord.id}
                          </span>
                          <span className="text-xs text-slate-400">|</span>
                          <span className="text-xs font-bold text-slate-800">
                            فاکتور رسمی: {ord.invoiceNumber}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                              isCancelled
                                ? 'bg-rose-100 text-rose-800'
                                : isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isCancelled
                              ? 'لغو شده'
                              : isPaid
                              ? 'پرداخت شده (تایید شاپرک)'
                              : 'در انتظار پرداخت / تایید'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600">
                          اقلام: {ord.items.map((i) => `${i.title} (${formatPersianNumber(i.qty)} عدد)`).join(' ، ')}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                          <span>تاریخ ثبت: {ord.createdAt}</span>
                          <span>درگاه: {ord.paymentGateway}</span>
                          <span className="font-mono font-extrabold text-slate-900">
                            مبلغ کل: {formatToman(ord.totalToman)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateStore(`/order-received/${ord.id}`)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                      >
                        <FileText className="w-4 h-4" />
                        <span>مشاهده جزییات سفارش و فاکتور</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: مدیریت آدرس‌ها (Address Book Management) */}
          {activeTab === 'addresses' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  مدیریت دفترچه آدرس‌های پستی ({formatPersianNumber(addresses.length)} آدرس)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  افزودن، ویرایش و حذف آدرس‌های پستی متعدد جهت انتخاب سریع در صفحه تسویه حساب (/checkout)
                </p>
              </div>

              {/* Saved Addresses Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-2xl border space-y-2.5 flex flex-col justify-between ${
                      addr.isDefault
                        ? 'bg-indigo-50/40 border-indigo-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-indigo-600" />
                          <span>{addr.label}</span>
                        </span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold">
                            آدرس پیش‌فرض
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-700 font-bold">
                        تحویل‌گیرنده: {addr.recipientName} ({addr.phone})
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        استان {addr.province}، شهر {addr.city} — {addr.exactAddress}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        کد پستی ۱۰ رقمی: {addr.postalCode}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditAddress(addr)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>ویرایش</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add / Edit Address Form */}
              <form
                onSubmit={handleSaveAddress}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4"
              >
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>
                    {editingAddrId ? 'ویرایش آدرس پستی انتخابی' : 'افزودن آدرس پستی جدید'}
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      عنوان آدرس (مثلاً: دفتر مرکزی / منزل):
                    </label>
                    <input
                      type="text"
                      value={addrLabel}
                      onChange={(e) => setAddrLabel(e.target.value)}
                      placeholder="دفتر مرکزی تهران"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      نام و نام خانوادگی تحویل‌گیرنده *:
                    </label>
                    <input
                      type="text"
                      value={addrRecipient}
                      onChange={(e) => setAddrRecipient(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      شماره تماس تحویل‌گیرنده *:
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={addrPhone}
                      onChange={(e) => setAddrPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">استان *:</label>
                    <input
                      type="text"
                      value={addrProvince}
                      onChange={(e) => setAddrProvince(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">شهر *:</label>
                    <input
                      type="text"
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      کد پستی ۱۰ رقمی *:
                    </label>
                    <input
                      type="text"
                      value={addrPostalCode}
                      onChange={(e) => setAddrPostalCode(e.target.value)}
                      placeholder="۱۵۸۷۵-۴۳۱۱۱"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نشانی دقیق پستی *:
                  </label>
                  <textarea
                    rows={2}
                    value={addrExact}
                    onChange={(e) => setAddrExact(e.target.value)}
                    placeholder="خیابان، کوچه، پلاک، طبقه، واحد..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                    required
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addrIsDefault}
                      onChange={(e) => setAddrIsDefault(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>تنظیم به عنوان آدرس پیش‌فرض خریدهای بعدی</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {editingAddrId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddrId(null);
                          setAddrLabel('');
                          setAddrExact('');
                        }}
                        className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        انصراف
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingAddress}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isSavingAddress
                          ? 'در حال ذخیره...'
                          : editingAddrId
                          ? 'بروزرسانی آدرس'
                          : 'ذخیره آدرس جدید'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: نظرات و دیدگاه‌های من (My Reviews & Comments) */}
          {activeTab === 'comments' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  نظرات و دیدگاه‌های ثبت‌شده من ({formatPersianNumber(myComments.length)} دیدگاه)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  لیست دیدگاه‌ها و امتیازهایی که زیر محصولات فروشگاه یا مقالات وبلاگ ثبت کرده‌اید
                </p>
              </div>

              <div className="space-y-3">
                {myComments.map((cm) => {
                  const isProduct = cm.categoryType === 'product_review';
                  const matchedProd = state.products.find(
                    (p) => p.id === cm.targetId || cm.targetTitle.includes(p.name.slice(0, 12))
                  );
                  const matchedPost = state.cmsPosts.find(
                    (p) => p.id === cm.targetId || cm.targetTitle.includes(p.title.slice(0, 12))
                  );

                  return (
                    <div
                      key={cm.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                              isProduct
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {isProduct ? 'دیدگاه محصول فروشگاهی' : 'دیدگاه مقاله وبلاگ'}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">
                            {cm.targetTitle}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {cm.rating && (
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {Array.from({ length: cm.rating }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                              ))}
                            </div>
                          )}
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {cm.status === 'Approved' ? 'تایید و منتشر شده' : 'در حال بررسی'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">{cm.body}</p>

                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>ثبت‌شده توسط: {cm.authorName} · تاریخ: {cm.createdAt}</span>
                        {isProduct && matchedProd ? (
                          <button
                            type="button"
                            onClick={() => navigateStore(`/product/${matchedProd.id}`)}
                            className="text-indigo-600 font-bold hover:underline cursor-pointer"
                          >
                            مشاهده صفحه محصول ←
                          </button>
                        ) : matchedPost ? (
                          <button
                            type="button"
                            onClick={() => navigateStore(`/blog/${matchedPost.id}`)}
                            className="text-indigo-600 font-bold hover:underline cursor-pointer"
                          >
                            مشاهده صفحه مقاله ←
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: خروج از حساب کاربری (Logout) */}
          {activeTab === 'logout' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <LogOut className="w-7 h-7" />
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                خروج از حساب کاربری ({loggedInCustomer.fullName})
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                با خروج از حساب کاربری، نشست فعلی شما بسته می‌شود. هر زمان که بخواهید می‌توانید مجدداً با شماره موبایل خود وارد پنل کاربری شوید.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    void logoutCustomer().then(() => {
                      notify('شما با موفقیت از حساب کاربری خود خارج شدید.');
                    });
                  }}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl cursor-pointer"
                >
                  تایید و خروج از حساب کاربری
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                >
                  انصراف و بازگشت به پیشخوان
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
