/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Official Storefront Homepage for Fatehan Robotics Academy (fatehanacademy.ir)
 * Designed specifically for students (7-18 years) and families.
 * Bright, cheerful, modern, inspiring educational aesthetic (Royal Blue, Cyber Cyan, Warm Amber).
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { FatehanLogo } from '../ui/FatehanLogo';
import { formatPersianNumber, formatToman } from '../utils/formatters';
import { DEFAULT_FALLBACK_COURSES } from '../utils/defaultFallbacks';
import { FatehanCourse, ProductItem } from '../types';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Calendar,
  Clock,
  Phone,
  PhoneCall,
  Smartphone,
  Copy,
  MapPin,
  Instagram,
  ShoppingBag,
  Cpu,
  Cog,
  Box,
  Layers,
  Terminal,
  Trophy,
  Users,
  Compass,
  Star,
  ShieldCheck,
  Check,
  HelpCircle,
  Play,
  Share2,
  Bookmark,
  ExternalLink,
  Plus,
  RotateCcw,
  Bot,
  Zap,
  Flag,
  Lightbulb,
  Award,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Send,
  X,
  Gift,
  Building2,
} from 'lucide-react';

export const FatehanStorefrontHome: React.FC = () => {
  const {
    state,
    settings,
    adapter,
    navigateStore,
    addToCart,
    notify,
    openVideoModal,
    loggedInCustomer,
    setLoggedInCustomer,
    refreshState,
  } = useFatehanTheme();

  // Dynamic courses catalog from CMS v2.0.0 API (fallback only if empty)
  const coursesCatalog: FatehanCourse[] =
    state.courses && state.courses.length > 0
      ? (state.courses as FatehanCourse[])
      : DEFAULT_FALLBACK_COURSES;

  // Active department selection + ref for smooth auto-scroll
  const [activeDepartment, setActiveDepartment] = useState<string>('robotics');
  const deptDetailRef = useRef<HTMLDivElement | null>(null);

  const handleSelectDepartment = (deptId: string, shouldScroll = true) => {
    setActiveDepartment(deptId);
    if (shouldScroll) {
      setTimeout(() => {
        deptDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  };

  // Interactive "DREAM · BUILD / ایده‌ها" Modal State
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaNote, setIdeaNote] = useState('');
  const [ideaStudentName, setIdeaStudentName] = useState(loggedInCustomer?.fullName || '');
  const [ideaPhone, setIdeaPhone] = useState(loggedInCustomer?.phone || '');
  const [ideaAgeGroup, setIdeaAgeGroup] = useState('۱۱ تا ۱۴ سال (متوسطه اول)');
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false);

  // Sync customer info into Idea form automatically if logged in
  useEffect(() => {
    if (loggedInCustomer) {
      if (loggedInCustomer.fullName) setIdeaStudentName(loggedInCustomer.fullName);
      if (loggedInCustomer.phone) setIdeaPhone(loggedInCustomer.phone);
    }
  }, [loggedInCustomer, isIdeaModalOpen]);

  const handleIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim() || !ideaNote.trim()) {
      notify('لطفاً عنوان ایده و توضیحات یادداشت خود را بنویسید.');
      return;
    }
    setIsSubmittingIdea(true);
    try {
      const submitPhone = (ideaPhone.trim() || loggedInCustomer?.phone || '09120000000').replace(/\s+/g, '');
      const submitName = ideaStudentName.trim() || loggedInCustomer?.fullName || 'کارآموز خلاق فاتحان';
      const res = await adapter.submitStudentIdea({
        title: ideaTitle.trim(),
        note: ideaNote.trim(),
        studentName: submitName,
        phone: submitPhone,
        ageGroup: ideaAgeGroup,
      });
      if (res.ok) {
        setLastIdeaPhone(submitPhone);
        // Keep lightweight UI session state in memory only (server cookie remains source of truth)
        if (!loggedInCustomer && submitPhone) {
          setLoggedInCustomer({
            fullName: submitName,
            phone: submitPhone,
            verified: true,
            walletBalanceToman: 0,
            role: 'کارآموز / عضو باشگاه فاتحان',
          });
        }
        setIdeaTitle('');
        setIdeaNote('');
        await refreshState();
        notify('💡 ایده شما ثبت شد و در پنل کاربری شما همگام‌سازی گردید!');
      }
    } finally {
      setIsSubmittingIdea(false);
    }
  };

  // Active age group tab
  const [activeAgeGroup, setActiveAgeGroup] = useState<'kids' | 'teens' | 'youth'>('kids');

  // Smart course finder state
  const [finderAge, setFinderAge] = useState<string>('7-10');
  const [finderInterest, setFinderInterest] = useState<'build' | 'code' | 'circuit' | 'print'>('build');

  // Tuition calculator state
  const [calcCourseId, setCalcCourseId] = useState<string>(coursesCatalog[0]?.id || 'CRS-ROBO-1');
  const [calcPlan, setCalcPlan] = useState<'approved' | 'early' | 'normal' | 'private'>('early');

  // Hardware kit filter
  const [kitCategoryFilter, setKitCategoryFilter] = useState<string>('all');

  // Interactive Robot Simulator Lab State
  const [robotPos, setRobotPos] = useState<{ x: number; y: number }>({ x: 0, y: 3 });
  const [collectedGears, setCollectedGears] = useState<number[]>([]);
  const [simSteps, setSimSteps] = useState<number>(0);
  const [simMessage, setSimMessage] = useState<string>('ربات در نقطه شروع آماده حرکت است.');
  const [simStatusType, setSimStatusType] = useState<'normal' | 'gear' | 'win' | 'collision'>('normal');

  // Consultation Booking Form state
  const [consultName, setConsultName] = useState('');
  const [consultPhone, setConsultPhone] = useState('');
  const [consultDept, setConsultDept] = useState('رباتیک (مبتدی تا پیشرفته)');
  const [consultAge, setConsultAge] = useState('۱۱ تا ۱۴ سال (متوسطه اول)');
  const [consultNote, setConsultNote] = useState('');
  const [consultSubmitted, setConsultSubmitted] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dynamic Social Channels from CMS Settings & Typography Config
  const igHandle = (state?.typography?.instagramId || settings.social.instagramId || 'fatehan.robot').replace(/^@/, '');
  const igUrl = state?.typography?.instagramUrl || settings.social.instagramUrl || `https://instagram.com/${igHandle}`;
  const eitaaHandle = (state?.typography?.eitaaId ?? settings.social.eitaaId ?? 'fatehan_robotics').replace(/^@/, '').trim();
  const eitaaUrl = state?.typography?.eitaaUrl || settings.social.eitaaUrl || (eitaaHandle ? `https://eitaa.com/${eitaaHandle}` : '');
  const baleHandle = (state?.typography?.baleId ?? settings.social.baleId ?? '').replace(/^@/, '').trim();
  const baleUrl = state?.typography?.baleUrl || settings.social.baleUrl || (baleHandle ? `https://ble.ir/${baleHandle}` : '');

  // Free Courses list from CMS API
  const freeCoursesList = state.freeCourses;

  // Bind live Page Builder blocks for the Home page (pageSlug === 'home')
  const homeBlocks = (state?.builderBlocks || []).filter(
    (b) => (!b.pageSlug || b.pageSlug === 'home') && !/^BLK-(HERO-01|STATS-02|FEAT-03|PROD-04|POST-05|PRICE-06|FAQ-07|CTA-08)$/.test(b.id)
  );
  const getHomeBlock = (id: string) => homeBlocks.find((b) => b.id === id);
  const heroBlk = getHomeBlock('BLK-HOME-HERO');
  const deptsBlk = getHomeBlock('BLK-HOME-DEPTS');
  const freeBlk = getHomeBlock('BLK-HOME-FREE');
  const roadmapBlk = getHomeBlock('BLK-HOME-ROADMAP');
  const aboutBlk = getHomeBlock('BLK-HOME-ABOUT');
  const simBlk = getHomeBlock('BLK-HOME-SIMULATOR');
  const kitsBlk = getHomeBlock('BLK-HOME-KITS');
  const whyBlk = getHomeBlock('BLK-HOME-WHY');
  const contactBlk = getHomeBlock('BLK-HOME-CONTACT');
  const customHomeBlocks = homeBlocks.filter(
    (b) =>
      ![
        'BLK-HOME-HERO',
        'BLK-HOME-DEPTS',
        'BLK-HOME-FREE',
        'BLK-HOME-ROADMAP',
        'BLK-HOME-ABOUT',
        'BLK-HOME-SIMULATOR',
        'BLK-HOME-KITS',
        'BLK-HOME-WHY',
        'BLK-HOME-CONTACT',
      ].includes(b.id) && !b.desktopHidden
  );

  const [lastIdeaPhone, setLastIdeaPhone] = useState<string>('');
  // Student Ideas filtered for current user in the modal
  const activeUserPhone = loggedInCustomer?.phone || ideaPhone.trim() || lastIdeaPhone;
  const userSubmittedIdeas = (state?.studentIdeas || []).filter(
    (item) => !activeUserPhone || item.phone === activeUserPhone
  );

  const handleCopy = (text: string, key: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      notify(`${label} با موفقیت کپی شد.`);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      notify(`کپی نشد. لطفاً دستی کپی کنید: ${text}`);
    }
  };

  // Department definitions driven dynamically by CMS `state.departments` + live Page Builder overrides
  const deptIconMap = {
    bot: Cpu,
    terminal: Terminal,
    cpu: Zap,
    box: Box,
    cog: Cog,
  } as const;

  const deptColorStyles: Record<
    string,
    { activeBorder: string; btnBg: string; tools: string }
  > = {
    robotics: {
      activeBorder: 'border-emerald-700',
      btnBg: 'bg-emerald-700 hover:bg-emerald-800 text-white',
      tools: 'کیت‌های استاندارد سازه، موتورهای گیربکس‌دار فلزی، درایور L298 و سنسورهای اولتراسونیک',
    },
    coding: {
      activeBorder: 'border-blue-700',
      btnBg: 'bg-blue-700 hover:bg-blue-800 text-white',
      tools: 'Scratch 3.0, محیط‌های برنامه‌نویسی Thonny و VS Code، وب‌کم‌های بینایی ماشین',
    },
    electronics: {
      activeBorder: 'border-amber-700',
      btnBg: 'bg-amber-700 hover:bg-amber-800 text-white',
      tools: 'بردهای Arduino Uno و Nano، کیت ۳۷ تکه سنسور، بردبورد و مولتی‌مترهای آموزشی ایمن',
    },
    printing: {
      activeBorder: 'border-indigo-700',
      btnBg: 'bg-indigo-700 hover:bg-indigo-800 text-white',
      tools: 'پرینترهای سه‌بعدی صنعتی FDM آموزشگاه، فیلامنت PLA دوستدار محیط‌زیست و نرم‌افزار SolidWorks',
    },
    mechanics: {
      activeBorder: 'border-rose-700',
      btnBg: 'bg-rose-700 hover:bg-rose-800 text-white',
      tools: 'پکیج‌های قطعات سازه مکانیک فلزی و پلیمری، انواع چرخ‌دنده‌ها، پیچ و مهره و شفت‌ها',
    },
  };

  const departmentsList = state.departments.map((d, idx) => {
    const style = deptColorStyles[d.id] || deptColorStyles.robotics;
    const override = deptsBlk?.itemsList?.[idx];
    return {
      id: d.id,
      deptNumFa: d.deptNumFa,
      codeEn: d.codeEn,
      title: override?.title || d.title,
      badge: override?.badge || d.badge,
      color: d.color,
      badgeBg: d.badgeBg,
      activeBorder: style.activeBorder,
      btnBg: style.btnBg,
      accentColor: d.deckAccent,
      cardBg: d.deckBg,
      cardInnerBorder: d.deckBorder,
      cardText: d.deckText,
      icon: deptIconMap[d.iconKey] || Cpu,
      subtitle: override?.subtitle || d.subtitle,
      description: d.description,
      levels: d.stages,
      projects: d.projects,
      tools: style.tools,
    };
  });

  const departmentsData = Object.fromEntries(
    departmentsList.map((d) => [d.id, d])
  ) as Record<string, (typeof departmentsList)[number]>;

  const departmentKeys = departmentsList.map((d) => d.id);
  const activeDeptIndex = Math.max(0, departmentKeys.indexOf(activeDepartment));
  const activeDeptData = departmentsData[activeDepartment] || departmentsList[0];

  const stepDepartment = (dir: 1 | -1) => {
    const nextIdx = (activeDeptIndex + dir + departmentKeys.length) % departmentKeys.length;
    setActiveDepartment(departmentKeys[nextIdx] as any);
  };

  // Age Roadmaps (connected to BLK-HOME-ROADMAP itemsList)
  const ageRoadmaps = {
    kids: {
      id: 'kids',
      badge: roadmapBlk?.itemsList?.[0]?.badge || '۷ تا ۱۰ سال (دبستان)',
      title: roadmapBlk?.itemsList?.[0]?.title || 'مسیر کاشفان کوچک',
      goal: roadmapBlk?.itemsList?.[0]?.subtitle || 'شکوفایی خلاقیت، تقویت دست‌ورزی، درک مقدماتی فیزیک حرکت و تفکر الگوریتمی',
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
          desc: 'ساخت انیمیشن و بازی‌های دو بعدی با بلوک‌های رنگی بدون نیاز به تایپ انگلیسی.',
        },
        {
          step: 'گام چهارم',
          name: 'پروژه ربات مسابقه‌ای مقدماتی',
          desc: 'مونتاژ ربات فوتبالیست کنترلی و شرکت در رقابت‌های دوستانه کارگاه.',
        },
      ],
    },
    teens: {
      id: 'teens',
      badge: roadmapBlk?.itemsList?.[1]?.badge || '۱۱ تا ۱۴ سال (متوسطه اول)',
      title: roadmapBlk?.itemsList?.[1]?.title || 'مسیر مهندسان نوجوان',
      goal: roadmapBlk?.itemsList?.[1]?.subtitle || 'تسلط بر طراحی مدار، سنسورهای محیطی، مدل‌سازی سه‌بعدی و بردهای هوشمند',
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
    youth: {
      id: 'youth',
      badge: roadmapBlk?.itemsList?.[2]?.badge || '۱۵ تا ۱۸ سال (متوسطه دوم)',
      title: roadmapBlk?.itemsList?.[2]?.title || 'مسیر فاتحان آینده',
      goal: roadmapBlk?.itemsList?.[2]?.subtitle || 'ورود حرفه‌ای به مهندسی مکاترونیک، پایتون پیشرفته، هوش مصنوعی و ساخت نمونه‌های صنعتی',
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
  };

  const currentRoadmap = ageRoadmaps[activeAgeGroup];

  // Simulator Logic (5 cols x 4 rows)
  const flagPos = { x: 4, y: 0 };
  const obstacles = [
    { x: 1, y: 3 },
    { x: 2, y: 1 },
    { x: 3, y: 2 },
  ];
  const gears = [
    { id: 1, x: 1, y: 1 },
    { id: 2, x: 3, y: 0 },
  ];

  const handleSimMove = (dx: number, dy: number, actionName: string) => {
    const nx = robotPos.x + dx;
    const ny = robotPos.y + dy;

    if (nx < 0 || nx > 4 || ny < 0 || ny > 3) {
      setSimMessage('⚠️ خارج از محدوده پیست! مسیر دیگری انتخاب کنید.');
      setSimStatusType('collision');
      return;
    }

    if (obstacles.some((o) => o.x === nx && o.y === ny)) {
      setSimMessage('⚡ مانع ولتاژ و برخورد! ربات به مسیر امن برگشت.');
      setSimStatusType('collision');
      return;
    }

    setRobotPos({ x: nx, y: ny });
    setSimSteps((s) => s + 1);

    const hitGear = gears.find((g) => g.x === nx && g.y === ny && !collectedGears.includes(g.id));
    if (hitGear) {
      setCollectedGears((prev) => [...prev, hitGear.id]);
      setSimMessage('⚙️ عالی! یک چرخ‌دنده مهارت دریافت شد!');
      setSimStatusType('gear');
    } else if (nx === flagPos.x && ny === flagPos.y) {
      setSimMessage('🏆 تبریک! ربات فاتحان به قله افتخار رسید!');
      setSimStatusType('win');
      notify('آفرین! ماموریت ربات با موفقیت انجام شد 🚩');
    } else {
      setSimMessage(`فرمان اجرا شد: ${actionName}`);
      setSimStatusType('normal');
    }
  };

  const handleSimReset = () => {
    setRobotPos({ x: 0, y: 3 });
    setCollectedGears([]);
    setSimSteps(0);
    setSimMessage('ربات در نقطه شروع قرار گرفت.');
    setSimStatusType('normal');
  };

  const handleSimAuto = () => {
    handleSimReset();
    const route = [
      { dx: 0, dy: -1, name: 'حرکت به سمت بالا' },
      { dx: 0, dy: -1, name: 'حرکت به سمت بالا' },
      { dx: 1, dy: 0, name: 'دریافت چرخ‌دنده اول' },
      { dx: 0, dy: -1, name: 'صعود به ردیف بالا' },
      { dx: 1, dy: 0, name: 'حرکت به راست' },
      { dx: 1, dy: 0, name: 'دریافت چرخ‌دنده دوم' },
      { dx: 1, dy: 0, name: 'فتح قله فاتحان!' },
    ];

    route.forEach((step, idx) => {
      setTimeout(() => {
        handleSimMove(step.dx, step.dy, step.name);
      }, (idx + 1) * 380);
    });
  };

  // Tuition Calculator Course Selection
  const selectedCourseObj =
    coursesCatalog.find((c) => c.id === calcCourseId) || coursesCatalog[0];

  let currentTuitionToman = selectedCourseObj.tuitionApprovedToman;
  let currentDiscountLabel = 'شهریه استاندارد مصوب';

  if (calcPlan === 'early') {
    currentTuitionToman = selectedCourseObj.tuitionEarlyBirdToman;
    currentDiscountLabel = 'تخفیف ویژه ثبت‌نام زودهنگام';
  } else if (calcPlan === 'normal') {
    currentTuitionToman = selectedCourseObj.tuitionNormalToman;
    currentDiscountLabel = 'تخفیف دو مرحله‌ای ثبت‌نام به‌موقع';
  } else if (calcPlan === 'private') {
    currentTuitionToman = selectedCourseObj.tuitionPrivateToman;
    currentDiscountLabel = 'کلاس خصوصی ۱ تا ۳ نفره';
  }

  const handleEnrollCourse = () => {
    const courseProduct: ProductItem = {
      id: `ENR-${selectedCourseObj.id}-${calcPlan}`,
      sku: `ENR-${selectedCourseObj.code}`,
      name: `ثبت‌نام ${selectedCourseObj.title} (${currentDiscountLabel})`,
      type: 'دوره آموزشی حضوری',
      category: 'ثبت‌نام دوره‌های آموزشی',
      featuredImageUrl: selectedCourseObj.featuredImageUrl,
      priceToman: selectedCourseObj.tuitionApprovedToman,
      salePriceToman: currentTuitionToman,
      stock: 12,
      salesCount: 30,
      status: 'In Stock',
      warranty: 'تضمین کیفیت آموزش و اعطای گواهینامه معتبر فاتحان',
      specs: `${selectedCourseObj.sessionsCount} جلسه / رده سنی: ${selectedCourseObj.ageRangeFa}`,
    };

    addToCart(courseProduct, undefined, 1, true);
    notify(`دوره «${selectedCourseObj.title}» به سبد ثبت‌نام افزوده شد.`);
  };

  // Products from store
  const storeProducts = state?.products || [];
  const displayKits =
    kitCategoryFilter === 'all'
      ? storeProducts.slice(0, 8)
      : storeProducts
          .filter((p) => p.category?.toLowerCase().includes(kitCategoryFilter.toLowerCase()))
          .slice(0, 8);

  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultName.trim() || !consultPhone.trim()) {
      notify('لطفاً نام و شماره تماس را وارد کنید.');
      return;
    }
    if (adapter.submitConsultationLead) {
      await adapter.submitConsultationLead({
        studentName: consultName.trim(),
        phone: consultPhone.trim(),
        department: consultDept,
        ageGroup: consultAge,
        note: consultNote.trim(),
      });
    }
    setConsultSubmitted(true);
    notify('درخواست مشاوره و تعیین سطح رایگان شما با موفقیت ثبت شد.');
  };

  return (
    <div className="space-y-16 sm:space-y-24 py-4 sm:py-8 font-sans text-slate-800">
      
      {/* =====================================================================
          1. HERO SECTION: BRIGHT, FRIENDLY, INSPIRING FOR FAMILIES & STUDENTS
          ===================================================================== */}
      {!heroBlk?.desktopHidden && (
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-blue-50/70 via-indigo-50/30 to-white border border-blue-200/80 p-6 sm:p-12 shadow-sm">
        
        {/* Soft Ambient Colorful Lighting */}
        <div className="absolute top-0 right-10 w-80 h-80 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Right Column: Copy & Actions (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-right">
            
            {/* Friendly Location Authority Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-900 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span>{heroBlk?.highlightWord || 'مجهزترین آموزشگاه رباتیک، برنامه‌نویسی و هوش مصنوعی در اندیشه'}</span>
            </div>

            {/* Main Balanced Persian Display Headline (Connected to BLK-HOME-HERO heading) */}
            {heroBlk?.heading && heroBlk.heading !== 'کودکان و نوجوانان رویاهایشان را با علم و تکنولوژی واقعی می‌کنند...' ? (
              <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-black text-slate-900 leading-[1.7] tracking-normal">
                {heroBlk.heading}
              </h1>
            ) : (
              <h1 className="text-2xl sm:text-3xl lg:text-[38px] font-black text-slate-900 leading-[1.7] tracking-normal">
                کودکان و نوجوانان رویاهایشان را با{' '}
                <span className="relative inline-flex items-center gap-1.5 px-3.5 py-0.5 mx-1 rounded-2xl bg-gradient-to-l from-blue-600 via-blue-700 to-indigo-600 text-white shadow-md shadow-blue-600/20">
                  <Sparkles className="w-5 h-5 text-amber-300 shrink-0 animate-pulse" />
                  <span>علم و تکنولوژی</span>
                  <svg
                    className="absolute -bottom-2 right-2 left-2 w-[calc(100%-16px)] h-2.5 text-amber-400"
                    viewBox="0 0 200 12"
                    fill="none"
                  >
                    <path
                      d="M2 9.5C52 2.5 148 2.5 198 9.5"
                      stroke="currentColor"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{' '}
                <span className="bg-gradient-to-l from-slate-900 via-blue-950 to-indigo-950 bg-clip-text text-transparent">
                  واقعی می‌کنند...
                </span>
              </h1>
            )}

            {/* Core Brand Slogan Box */}
            <div className="inline-flex flex-wrap items-center gap-3 bg-white border-r-4 border-amber-400 px-5 py-3 rounded-2xl shadow-xs border border-slate-200">
              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                آموزشگاه تخصصی فاتحان:
              </span>
              <span className="text-sm sm:text-base font-black text-blue-600">
                «کارآموزان امروز، فاتحان فردا»
              </span>
            </div>

            {heroBlk?.subheading &&
            heroBlk.subheading !==
              'در آکادمی تخصصی فاتحان، دانش‌آموزان ۷ تا ۱۸ سال صرفاً مصرف‌کننده تکنولوژی نیستند؛ بلکه با یادگیری عملی رباتیک، کدنویسی، هوش مصنوعی، الکترونیک، مکانیک و چاپ سه‌بعدی، ایده‌های خود را می‌سازند و مهارت‌های واقعی زندگی را تجربه می‌کنند.' ? (
              <p className="text-sm sm:text-base text-slate-600 leading-[1.95] max-w-2xl font-normal">
                {heroBlk.subheading}
              </p>
            ) : (
              <p className="text-sm sm:text-base text-slate-600 leading-[1.95] max-w-2xl font-normal">
                در آکادمی تخصصی <strong className="text-slate-900 font-bold">فاتحان</strong>، دانش‌آموزان ۷ تا ۱۸ سال صرفاً مصرف‌کننده تکنولوژی نیستند؛ بلکه با یادگیری عملی <span className="text-blue-700 font-semibold">رباتیک، کدنویسی، هوش مصنوعی، الکترونیک، مکانیک و چاپ سه‌بعدی</span>، ایده‌های خود را می‌سازند و مهارت‌های واقعی زندگی را تجربه می‌کنند.
              </p>
            )}

            {/* Warm, Clean Call-to-Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigateStore('/contact')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-400/25 transition-all hover:-translate-y-0.5 cursor-pointer min-h-[46px] whitespace-nowrap"
              >
                <span>{heroBlk?.ctaPrimary || 'ثبت‌نام و تعیین سطح رایگان'}</span>
                <ArrowLeft className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => navigateStore('/courses')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-xs sm:text-sm transition-all hover:border-blue-400 cursor-pointer min-h-[46px] shadow-2xs whitespace-nowrap"
              >
                <span>{heroBlk?.ctaSecondary || 'مشاهده ۱۵ دوره و سرفصل‌ها'}</span>
                <ArrowLeft className="w-4 h-4 shrink-0 text-blue-600" />
              </button>
            </div>

            {/* 3 Enhanced Trust Metric Cards (Connected to BLK-HOME-HERO itemsList) */}
            <div className="pt-3 grid grid-cols-3 gap-3 max-w-xl">
              <div className="bg-white/95 rounded-2xl p-3.5 border border-blue-100 shadow-xs hover:border-blue-300 transition-all flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 hidden sm:flex">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-black text-blue-700 whitespace-nowrap">
                    {heroBlk?.itemsList?.[0]?.title || '۵ دپارتمان'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                    {heroBlk?.itemsList?.[0]?.subtitle || 'مبتدی تا پیشرفته'}
                  </div>
                </div>
              </div>
              <div className="bg-white/95 rounded-2xl p-3.5 border border-amber-100 shadow-xs hover:border-amber-300 transition-all flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 hidden sm:flex">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-black text-amber-600 whitespace-nowrap">
                    {heroBlk?.itemsList?.[1]?.title || '۱۰۰٪ عملی'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                    {heroBlk?.itemsList?.[1]?.subtitle || 'کارگاهی و پروژه‌محور'}
                  </div>
                </div>
              </div>
              <div className="bg-white/95 rounded-2xl p-3.5 border border-emerald-100 shadow-xs hover:border-emerald-300 transition-all flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 hidden sm:flex">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm sm:text-lg font-black text-emerald-700 whitespace-nowrap">
                    {heroBlk?.itemsList?.[2]?.title || '۷ تا ۱۸ سال'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                    {heroBlk?.itemsList?.[2]?.subtitle || 'کودکان و نوجوانان'}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Left Column: Official 3D Metallic Emblem & Creative Mascot Showcase (5 Cols) */}
          <div className="lg:col-span-5 relative flex flex-col items-center pb-8 sm:pb-10">
            
            {/* Interactive Sticky Note ("فکر کن، بساز، کشف کن!") -> Opens "ایده‌ها" Modal on Click */}
            <motion.button
              type="button"
              onClick={() => setIsIdeaModalOpen(true)}
              initial={{ rotate: -8, y: 0 }}
              animate={{ y: [-4, 4, -4] }}
              whileHover={{ scale: 1.06, rotate: -4 }}
              whileTap={{ scale: 0.96 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              title="کلیک کنید و ایده یا اختراع ذهنی خودتان را ثبت کنید!"
              className="absolute -top-5 -left-2 sm:left-2 z-20 bg-amber-400 hover:bg-amber-300 text-slate-950 p-3.5 rounded-2xl shadow-lg border-2 border-white max-w-[185px] text-right cursor-pointer group"
            >
              <div className="flex items-center justify-between text-[11px] font-mono font-black text-blue-900 mb-1 gap-2">
                <span>DREAM · BUILD</span>
                <span className="text-sm group-hover:scale-125 transition-transform">💡</span>
              </div>
              <p className="font-black text-xs sm:text-sm leading-snug">
                فکر کن<br />بساز<br />کشف کن ؟!
              </p>
              <div className="mt-1.5 pt-1 border-t border-amber-500/40 flex items-center justify-between text-[10px] font-extrabold text-blue-950">
                <span>ثبت ایده من</span>
                <span>←</span>
              </div>
            </motion.button>

            {/* Central Official 3D Metallic Logo Card */}
            <div className="relative w-full max-w-[385px] bg-white rounded-3xl p-6 sm:p-7 border-2 border-blue-200 shadow-lg text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-transparent to-amber-50/30 pointer-events-none" />
              
              {/* Rotating Gear In Background */}
              <Cog className="w-48 h-48 absolute -top-12 -right-12 text-blue-100/70 animate-spin-slow pointer-events-none" />

              {/* Official Fatehan 3D Metallic Emblem */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative w-44 sm:w-52 h-44 sm:h-52 mb-3 flex items-center justify-center">
                  <img
                    src={settings.logoUrl}
                    alt={settings.academyNameFa}
                    className="w-full h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    آموزشگاه تخصصی رباتیک فاتحان
                  </h3>
                  <p className="text-xs text-blue-700 font-bold">
                    مجوز رسمی و مجهزترین کارگاه‌های تخصصی در اندیشه
                  </p>
                </div>

                {/* Bottom Card Footer: Status on Right + Left-Aligned Stacked Social Handles on Left (Image 2 Fix) */}
                <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-slate-700 text-[11px]">پذیرش ترم جدید فعال</span>
                  </span>

                  {/* Left-Aligned Social Channels (Icons Aligned Vertically on the Left, Eitaa without @) */}
                  <div className="flex flex-col items-start gap-1.5 text-left" dir="ltr">
                    {igHandle && (
                      <a
                        href={igUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-blue-600 hover:text-pink-600 transition-colors"
                        title="صفحه رسمی اینستاگرام"
                      >
                        <span className="w-4 h-4 rounded-md bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white inline-flex items-center justify-center shrink-0 shadow-2xs">
                          <Instagram className="w-2.5 h-2.5" />
                        </span>
                        <span>@{igHandle}</span>
                      </a>
                    )}

                    {eitaaHandle && (
                      <a
                        href={eitaaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
                        title="کانال رسمی ایتا آموزشگاه فاتحان"
                      >
                        <span className="w-4 h-4 rounded-md bg-gradient-to-tr from-orange-500 to-amber-500 text-white inline-flex items-center justify-center shrink-0 shadow-2xs">
                          <Send className="w-2.5 h-2.5" />
                        </span>
                        <span>{eitaaHandle}</span>
                      </a>
                    )}

                    {baleHandle && (
                      <a
                        href={baleUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                        title="کانال رسمی بله"
                      >
                        <span className="w-4 h-4 rounded-md bg-emerald-500 text-white inline-flex items-center justify-center shrink-0 shadow-2xs">
                          <Send className="w-2.5 h-2.5" />
                        </span>
                        <span>{baleHandle}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* "پایه‌های علمی کارگاه" Badge Placed Cleanly Below the Card on the Right — Zero Overlap with Card Text (Image 2 Fix) */}
            <div className="mt-3.5 w-full max-w-[385px] flex justify-start">
              <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border-2 border-blue-100 shadow-md space-y-1 w-48">
                <div className="text-[10px] text-slate-600 font-extrabold mb-0.5 text-right">
                  پایه‌های علمی کارگاه:
                </div>
                <div className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-mono text-[10px] font-bold tracking-wider flex justify-between items-center">
                  <span>ROBOTICS</span>
                  <span>🤖</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-mono text-[10px] font-bold tracking-wider flex justify-between items-center">
                  <span>CODING</span>
                  <span>💻</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-rose-600 text-white font-mono text-[10px] font-bold tracking-wider flex justify-between items-center">
                  <span>INNOVATION</span>
                  <span>🚀</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Sleek Hero Bottom Footer Bar (فوتر پایین سکشن هیرو) */}
        <div className="relative z-10 mt-8 pt-5 border-t border-blue-200/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700 ml-1">
              دسترسی سریع به دپارتمان‌ها:
            </span>
            {[
              { id: 'robotics', label: '🤖 رباتیک مسابقه‌ای' },
              { id: 'coding', label: '💻 کدنویسی و هوش مصنوعی' },
              { id: 'electronics', label: '⚡ الکترونیک و برد هوشمند' },
              { id: 'printing', label: '🧊 طراحی و چاپ سه‌بعدی' },
              { id: 'mechanics', label: '⚙️ مکانیک و سازه' },
            ].map((pill) => (
              <a
                key={pill.id}
                href="#departments"
                onClick={() => handleSelectDepartment(pill.id as any, true)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-200 hover:border-blue-600 text-[11px] font-bold transition-all shadow-2xs whitespace-nowrap"
              >
                {pill.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl whitespace-nowrap">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>جلسه معارفه و تعیین سطح حضوری: کاملاً رایگان</span>
          </div>
        </div>
      </section>
      )}

      {/* =====================================================================
          2. FIVE CORE DEPARTMENTS — INTERACTIVE FANNED CARD DECK ("ورق‌مانند") + UNIFIED SHOWCASE
          ===================================================================== */}
      {!deptsBlk?.desktopHidden && (
      <section id="departments" className="space-y-6">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
            <span>⚙️ {deptsBlk?.highlightWord || 'پنج دپارتمان تخصصی آموزشگاه فاتحان'}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900">
            {deptsBlk?.heading || 'از ساخت سازه و مدار تا هوش مصنوعی و چاپ سه‌بعدی'}
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            {deptsBlk?.subheading || 'کارت‌های دپارتمان را ورق بزنید یا روی هر کارت عقبی کلیک کنید تا سرفصل‌ها، مراحل پیشرفت و پروژه‌های عملی آن را ببینید:'}
          </p>
        </div>

        {/* Single Unified Showcase Box containing Top Quick-Selector, Fanned Card Deck, and Department Details */}
        <div
          style={{
            borderColor: `${activeDeptData.accentColor}45`,
            boxShadow: `0 24px 60px -20px ${activeDeptData.accentColor}22`,
          }}
          className="bg-gradient-to-b from-slate-50/90 via-white to-slate-50/80 rounded-[32px] border-2 p-4 sm:p-7 lg:p-9 transition-colors duration-500 relative overflow-hidden"
        >
          {/* Ambient Background Glow matching Active Card */}
          <div
            className="w-96 h-96 rounded-full blur-3xl absolute -top-28 -right-28 pointer-events-none opacity-25 transition-colors duration-500"
            style={{ backgroundColor: activeDeptData.cardBg }}
          />
          <div
            className="w-80 h-80 rounded-full blur-3xl absolute -bottom-28 -left-24 pointer-events-none opacity-20 transition-colors duration-500"
            style={{ backgroundColor: activeDeptData.cardBg }}
          />

          {/* Compact Top Quick-Switch Bar (5 Departments in 1 clean segmented row) */}
          <div className="relative z-20 flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-2 mb-6 border-b border-slate-200/80">
            {departmentKeys.map((key, idx) => {
              const dept = departmentsData[key];
              const isSelected = activeDepartment === key;
              const Icon = dept.icon;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setActiveDepartment(key)}
                  style={{
                    backgroundColor: isSelected ? dept.cardBg : undefined,
                    borderColor: isSelected ? dept.accentColor : undefined,
                    color: isSelected ? dept.cardText : undefined,
                  }}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                    isSelected
                      ? 'shadow-xs scale-[1.02]'
                      : 'bg-white/80 hover:bg-white text-slate-600 border-slate-200/90'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">۰{formatPersianNumber(idx + 1)}</span>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{dept.title.replace('دپارتمان ', '')}</span>
                </button>
              );
            })}
          </div>

          {/* Main Unified Stage: Fanned Card Deck (Image 3 style) + Synchronized Page-Flip Details */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* RIGHT / TOP COLUMN: Interactive Fanned Card Deck ("ورق‌مانند" — Image 3) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center select-none">
              <div className="relative w-full max-w-[430px] h-[390px] sm:h-[430px] flex items-center justify-center">
                
                {/* Concentric Circular Orbit Backdrop (matches Image 3) */}
                <div className="w-[310px] h-[310px] sm:w-[390px] sm:h-[390px] rounded-full bg-slate-100/90 border border-slate-200/90 shadow-inner absolute pointer-events-none flex items-center justify-center">
                  <div className="w-[266px] h-[266px] sm:w-[338px] sm:h-[338px] rounded-full border border-dashed border-slate-300/90" />
                </div>

                {/* 5 Fanned Cards Stack */}
                {departmentKeys.map((key, idx) => {
                  const dept = departmentsData[key];
                  const Icon = dept.icon;
                  // Circular relative offset in [-2, -1, 0, 1, 2]
                  const rawDiff = (idx - activeDeptIndex + departmentKeys.length) % departmentKeys.length;
                  const offset = rawDiff === 0 ? 0 : rawDiff === 1 ? 1 : rawDiff === 2 ? 2 : rawDiff === 3 ? -2 : -1;
                  const isFront = offset === 0;

                  // Responsive fan coordinates matching Image 3's fanned hand of cards
                  const xOffset = offset === 0 ? 0 : offset === -1 ? -48 : offset === 1 ? 48 : offset === -2 ? -88 : 88;
                  const yOffset = offset === 0 ? -4 : Math.abs(offset) === 1 ? 14 : 34;
                  const rotateDeg = offset === 0 ? 0 : offset === -1 ? -9 : offset === 1 ? 9 : offset === -2 ? -18 : 18;
                  const scaleVal = offset === 0 ? 1 : Math.abs(offset) === 1 ? 0.92 : 0.85;
                  const zIndexVal = offset === 0 ? 30 : Math.abs(offset) === 1 ? 20 : 10;

                  return (
                    <motion.div
                      key={dept.id}
                      drag={isFront ? 'x' : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.22}
                      onDragEnd={(_, info) => {
                        if (info.offset.x > 45) {
                          stepDepartment(-1);
                        } else if (info.offset.x < -45) {
                          stepDepartment(1);
                        }
                      }}
                      onClick={() => {
                        if (!isFront) {
                          setActiveDepartment(key);
                        }
                      }}
                      animate={{
                        x: xOffset,
                        y: yOffset,
                        rotate: rotateDeg,
                        scale: scaleVal,
                        zIndex: zIndexVal,
                      }}
                      whileHover={
                        isFront
                          ? { y: -8, scale: 1.015 }
                          : { y: yOffset - 6, scale: scaleVal + 0.02 }
                      }
                      transition={{
                        type: 'spring',
                        stiffness: 310,
                        damping: 26,
                      }}
                      style={{
                        backgroundColor: dept.cardBg,
                        color: dept.cardText,
                        zIndex: zIndexVal,
                        boxShadow: isFront
                          ? '0 24px 48px -12px rgba(15, 23, 42, 0.22), 0 4px 14px -2px rgba(15, 23, 42, 0.08)'
                          : '0 12px 28px -8px rgba(15, 23, 42, 0.14)',
                      }}
                      className={`w-[225px] sm:w-[255px] h-[310px] sm:h-[345px] rounded-[28px] p-3 sm:p-3.5 absolute border border-white/80 ${
                        isFront ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                      }`}
                    >
                      {/* Inner Framed Card Border (Exact Image 3 Aesthetic) */}
                      <div
                        style={{ borderColor: dept.cardInnerBorder }}
                        className="w-full h-full rounded-[20px] border-[1.5px] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden"
                      >
                        {/* Top Header Row inside Card Frame */}
                        <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs font-black tracking-tight">
                          <span>{dept.deptNumFa}</span>
                          <span dir="ltr" className="font-mono text-[10px] sm:text-[11px] opacity-85">
                            {dept.codeEn}
                          </span>
                        </div>

                        {/* Center Geometric Emblem Circle + Icon */}
                        <div className="my-auto flex flex-col items-center justify-center">
                          <div
                            style={{
                              borderColor: dept.cardText,
                              backgroundColor: 'rgba(255,255,255,0.35)',
                            }}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] flex items-center justify-center shadow-inner relative"
                          >
                            {/* Subtle geometric crosshairs like Image 3 */}
                            <div
                              style={{ backgroundColor: `${dept.cardText}25` }}
                              className="w-full h-[1.5px] absolute rotate-45 pointer-events-none"
                            />
                            <div
                              style={{ backgroundColor: `${dept.cardText}25` }}
                              className="w-full h-[1.5px] absolute -rotate-45 pointer-events-none"
                            />
                            <Icon className="w-10 h-10 sm:w-11 sm:h-11 relative z-10 stroke-[2.2]" />
                          </div>
                        </div>

                        {/* Bottom Title & Action Row */}
                        <div className="space-y-3 text-right">
                          <div>
                            <h3 className="text-base sm:text-lg font-black leading-snug">
                              {dept.title}
                            </h3>
                            <p className="text-[11px] opacity-80 font-bold line-clamp-1 mt-0.5">
                              {dept.subtitle}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-1.5 pt-1">
                            <span className="px-2.5 py-1 rounded-lg bg-white/95 text-slate-900 font-black text-[10px] sm:text-[11px] shadow-2xs truncate max-w-[105px]">
                              {dept.badge}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isFront) {
                                  setActiveDepartment(key);
                                } else {
                                  deptDetailRef.current?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'nearest',
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] sm:text-[11px] inline-flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
                            >
                              <span>مشاهده جزئیات</span>
                              <Sparkles className="w-3 h-3 text-amber-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Helper Pill + Left/Right Flip Controls below Fanned Deck (matches Image 3) */}
              <div className="mt-2 flex items-center justify-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => stepDepartment(-1)}
                  aria-label="دپارتمان قبلی"
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-700 cursor-pointer transition"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="px-4 py-1.5 rounded-full bg-white/95 border border-slate-200/90 shadow-2xs text-[11px] font-bold text-slate-600 text-center">
                  کارت‌ها را به چپ یا راست بکشید · کلیک روی کارت عقبی برای انتخاب
                </div>

                <button
                  type="button"
                  onClick={() => stepDepartment(1)}
                  aria-label="دپارتمان بعدی"
                  className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-700 cursor-pointer transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LEFT / BOTTOM COLUMN: Synchronized Page-Flip Detail Stage inside the same Unified Box */}
            <div ref={deptDetailRef} className="lg:col-span-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeDepartment}
                  initial={{ opacity: 0, x: -18, rotateY: 6 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: 18, rotateY: -6 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    borderColor: `${activeDeptData.accentColor}35`,
                  }}
                  className="bg-white rounded-3xl p-5 sm:p-7 border shadow-sm space-y-5 relative overflow-hidden"
                >
                  {/* Top Accent Strip matching the active card's pastel surface */}
                  <div
                    className="h-2 w-full absolute top-0 inset-x-0"
                    style={{ backgroundColor: activeDeptData.cardBg }}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div
                      style={{
                        backgroundColor: activeDeptData.cardBg,
                        color: activeDeptData.cardText,
                      }}
                      className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black"
                    >
                      <span>{activeDeptData.deptNumFa}</span>
                      <span>·</span>
                      <span>{activeDeptData.badge}</span>
                    </div>

                    <span
                      dir="ltr"
                      className="text-xs font-mono font-bold text-slate-400"
                    >
                      {activeDeptData.codeEn}
                    </span>
                  </div>

                  <div className="space-y-2 text-right">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                      {activeDeptData.title} ({activeDeptData.badge})
                    </h3>
                    <p
                      style={{ color: activeDeptData.accentColor }}
                      className="text-xs sm:text-sm font-extrabold"
                    >
                      {activeDeptData.subtitle}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {activeDeptData.description}
                    </p>
                  </div>

                  {/* 3 Progress Levels */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-black text-slate-900">
                      مراحل پیشرفت کارآموز در این دپارتمان:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {activeDeptData.levels.map((lvl, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderColor: `${activeDeptData.accentColor}28`,
                            backgroundColor: `${activeDeptData.cardBg}35`,
                          }}
                          className="p-3 rounded-2xl border text-xs font-bold text-slate-800 leading-relaxed"
                        >
                          <span
                            className="inline-block w-5 h-5 rounded-full text-white text-center leading-5 ml-1.5 font-mono text-[11px]"
                            style={{ backgroundColor: activeDeptData.accentColor }}
                          >
                            {idx + 1}
                          </span>
                          {lvl}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Practical Projects + Workshop Tools + CTA */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2 border-t border-slate-100 items-center">
                    <div className="sm:col-span-7 space-y-2">
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>نمونه پروژه‌های عملی که دانش‌آموز می‌سازد:</span>
                      </div>
                      <ul className="space-y-1.5 text-xs font-bold text-slate-700">
                        {activeDeptData.projects.map((p, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2
                              className="w-4 h-4 shrink-0"
                              style={{ color: activeDeptData.accentColor }}
                            />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="sm:col-span-5 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                      <div className="text-[11px] text-slate-600 leading-relaxed">
                        <strong className="text-slate-900 font-black block mb-0.5">
                          🛠️ ابزارهای کارگاهی:
                        </strong>
                        {activeDeptData.tools}
                      </div>

                      <a
                        href="#contact"
                        onClick={() => setConsultDept(activeDeptData.title)}
                        style={{ backgroundColor: activeDeptData.accentColor }}
                        className="block w-full text-center py-3 px-4 rounded-xl text-white font-black text-xs shadow-sm hover:opacity-95 transition-all"
                      >
                        رزرو مشاوره رایگان {activeDeptData.title.replace('دپارتمان ', '')} ←
                      </a>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>
      </section>
      )}

      {/* =====================================================================
          2.5 AUTO-SCROLLING FREE COURSES ROW ("دوره‌های رایگان آکادمی فاتحان")
          ===================================================================== */}
      {!freeBlk?.desktopHidden && (
      <section id="free-courses-strip" className="space-y-5">
        <div className="bg-gradient-to-l from-cyan-950 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-cyan-500/30 shadow-xl space-y-6 overflow-hidden relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                <Gift className="w-3.5 h-3.5" />
                <span>{freeBlk?.highlightWord || 'آموزش رایگان آکادمی فاتحان · همراه با پروژه‌های عملی'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {freeBlk?.heading || 'دوره‌های رایگان هوش مصنوعی، رباتیک و کدنویسی ویژه دانش‌آموزان'}
              </h2>
              <p className="text-xs sm:text-sm text-cyan-200">
                {freeBlk?.subheading || 'برای آشنایی اولیه خانواده‌ها و کشف استعداد فرزندان، در کارگاه‌ها و دوره‌های رایگان فاتحان ثبت‌نام کنید:'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateStore('/free-courses')}
              className="px-5 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-all shadow-lg shadow-cyan-400/20 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>{freeBlk?.ctaPrimary || 'ورود به صفحه دوره رایگان'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Horizontal Scrollable / Auto-Animated Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {freeCoursesList.map((fc: any, idx: number) => (
              <motion.div
                key={fc.id || idx}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.35, delay: idx * 0.07 }}
                whileHover={{ y: -4 }}
                onClick={() => navigateStore('/free-courses')}
                className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-cyan-400/30 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black">
                      {freeBlk?.itemsList?.[idx]?.badge || fc.badge || '۱۰۰٪ رایگان'}
                    </span>
                    <span className="text-cyan-300 font-bold">{fc.ageRange}</span>
                  </div>

                  <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                    {freeBlk?.itemsList?.[idx]?.title || fc.title}
                  </h3>

                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                    {freeBlk?.itemsList?.[idx]?.subtitle || fc.subtitle || fc.description}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-amber-300 font-bold">
                    {formatPersianNumber(fc.projectsCount || 4)} پروژه عملی
                  </span>
                  <span className="text-cyan-300 font-extrabold inline-flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                    <span>ثبت‌نام رایگان</span>
                    <span>←</span>
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* =====================================================================
          3. INTERACTIVE AGE ROADMAP (۷ تا ۱۸ سال)
          ===================================================================== */}
      {!roadmapBlk?.desktopHidden && (
      <section id="roadmap" className="space-y-8">
        
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
            <span>🎯 {roadmapBlk?.highlightWord || 'نقشه راه استاندارد سنی'}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900">
            {roadmapBlk?.heading || 'مسیر یادگیری فرزند شما در کدام رده سنی قرار دارد؟'}
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            {roadmapBlk?.subheading || 'آموزش‌های فاتحان متناسب با رشد ذهنی و درک علمی هر مقطع تحصیلی تفکیک شده است:'}
          </p>
        </div>

        {/* Age Bracket Segmented Tabs */}
        <div className="flex flex-wrap justify-center gap-2.5">
          {Object.values(ageRoadmaps).map((rm) => {
            const isTabActive = activeAgeGroup === rm.id;
            return (
              <button
                key={rm.id}
                type="button"
                onClick={() => setActiveAgeGroup(rm.id as any)}
                className={`px-5 py-3 rounded-2xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
                  isTabActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 scale-[1.02]'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{rm.title}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${isTabActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {rm.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Roadmap Steps */}
        <motion.div
          key={activeAgeGroup}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                {currentRoadmap.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                🎯 {currentRoadmap.goal}
              </p>
            </div>

            <a
              href="#contact"
              onClick={() => setConsultAge(currentRoadmap.badge)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs self-start sm:self-auto border border-blue-200"
            >
              <span>تعیین سطح رایگان این رده سنی</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentRoadmap.steps.map((st, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-2xl p-5 border border-slate-200 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs">
                      {st.step}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      0{i + 1} / 04
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 mb-2">
                    {st.name}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* SMART COURSE FINDER & TALENT QUIZ WIDGET */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 sm:p-10 text-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-5 space-y-3">
              <span className="inline-block px-3 py-1 rounded-full bg-cyan-400/20 text-cyan-300 text-xs font-bold">
                🤖 دستیار هوشمند انتخاب دوره
              </span>
              <h3 className="text-xl sm:text-2xl font-black leading-snug">
                نمی‌دانید کدام رشته برای شروع فرزندتان بهتر است؟
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                سن دانش‌آموز و بیشترین علاقه او را مشخص کنید تا سیستم هوشمند فاتحان بهترین دوره شروع را به شما پیشنهاد دهد:
              </p>
            </div>

            <div className="lg:col-span-7 bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/20 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-cyan-300 mb-1.5">
                    ۱. رده سنی دانش‌آموز:
                  </label>
                  <select
                    value={finderAge}
                    onChange={(e) => setFinderAge(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-slate-700 text-white px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="6-7">۶ تا ۷ سال (پیش‌دبستان و اول)</option>
                    <option value="7-10">۷ تا ۱۰ سال (دبستان)</option>
                    <option value="11-14">۱۱ تا ۱۴ سال (متوسطه اول)</option>
                    <option value="15-18">۱۵ تا ۱۸ سال (متوسطه دوم)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-300 mb-1.5">
                    ۲. بیشترین علاقه و کنجکاوی:
                  </label>
                  <select
                    value={finderInterest}
                    onChange={(e) => setFinderInterest(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-900/90 border border-slate-700 text-white px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="build">ساختن ربات، لگو و مکانیزم‌های حرکتی</option>
                    <option value="code">کامپیوتر، بازی‌سازی و هوش مصنوعی</option>
                    <option value="circuit">چرخ‌دنده، سیم، باتری و مدارهای الکترونیکی</option>
                    <option value="print">طراحی کامپیوتری و پرینت سه‌بعدی قطعات</option>
                  </select>
                </div>
              </div>

              {/* Quiz Result Box */}
              <div className="p-4 rounded-xl bg-white/10 border border-cyan-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-amber-300 font-bold">
                    پیشنهاد هوشمند سیستم آموزشی فاتحان:
                  </div>
                  <div className="text-sm font-black text-white">
                    {finderInterest === 'build'
                      ? finderAge === '6-7'
                        ? 'دوره کودک خلاق ۱ (مکانیک مقدماتی)'
                        : 'دوره مکانیک و سازه رباتیک A1'
                      : finderInterest === 'code'
                      ? finderAge === '15-18'
                        ? 'دوره برنامه‌نویسی پایتون و هوش مصنوعی'
                        : 'دوره بازی‌سازی و اسکرچ (Scratch)'
                      : finderInterest === 'circuit'
                      ? 'دوره الکترونیک مقدماتی و مدارهای سنسوردار'
                      : 'دوره طراحی مهندسی با سالیدورک و چاپ سه‌بعدی'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateStore('/courses')}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs whitespace-nowrap self-start sm:self-auto transition-colors cursor-pointer"
                >
                  مشاهده مشخصات و ثبت‌نام دوره ←
                </button>
              </div>

            </div>

          </div>
        </div>

      </section>
      )}

      {/* =====================================================================
          4. ABOUT FATEHAN ACADEMY & INSTITUTIONAL COOPERATION PREVIEW (/about)
          ===================================================================== */}
      {!aboutBlk?.desktopHidden && (
      <section id="about-preview" className="w-full">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-blue-100 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3 text-right">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black">
              <Building2 className="w-3.5 h-3.5" />
              <span>{aboutBlk?.highlightWord || state?.aboutPage?.heroBadge || 'درباره آموزشگاه تخصصی رباتیک فاتحان'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {aboutBlk?.heading || state?.aboutPage?.title || 'آموزشگاه تخصصی رباتیک، کدنویسی و هوش مصنوعی فاتحان؛ مرکز رسمی مهارت‌آموزی و استعدادیابی'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {aboutBlk?.subheading ||
                state?.aboutPage?.introParagraph ||
                'آموزشگاه تخصصی رباتیک فاتحان در شهر جدید اندیشه، با بهره‌گیری از کارگاه‌های مجهز ساخت ربات، الکترونیک، پرینترهای سه‌بعدی و آزمایشگاه هوش مصنوعی، بستر علمی و عملی استاندارد را برای دانش‌آموزان ۶ تا ۱۸ سال و همکاری رسمی با مدارس و مراکز آموزشی فراهم کرده است.'}
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-2.5">
            <button
              type="button"
              onClick={() => navigateStore('/about')}
              className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20 transition-all"
            >
              <span>{aboutBlk?.ctaPrimary || 'صفحه معرفی رسمی و درباره ما'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigateStore('/courses')}
              className="w-full py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>{aboutBlk?.ctaSecondary || 'مشاهده ۱۵ دوره و محاسبه‌گر شهریه'}</span>
            </button>
          </div>
        </div>
      </section>
      )}

      {/* =====================================================================
          5. INTERACTIVE ROBOT SIMULATOR LAB (5x4 GRID GAME FOR KIDS)
          ===================================================================== */}
      {!simBlk?.desktopHidden && (
      <section id="simulator" className="space-y-8">
        
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs font-black">
            <span>🎮 {simBlk?.highlightWord || 'آزمایشگاه تعاملی رباتیک فاتحان'}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900">
            {simBlk?.heading || 'ربات فاتحان را تا قله افتخار برنامه‌نویسی کنید!'}
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            {simBlk?.subheading || 'با استفاده از دکمه‌های کنترلی زیر به ربات فرمان دهید تا موانع را دور بزند، چرخ‌دنده‌ها را جمع کند و به پرچم برسد:'}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Simulator Grid (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-50 p-4 sm:p-6 rounded-3xl border border-slate-200">
            <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-[420px] mx-auto">
              {Array.from({ length: 4 }).map((_, y) =>
                Array.from({ length: 5 }).map((_, x) => {
                  const isRobot = robotPos.x === x && robotPos.y === y;
                  const isFlag = flagPos.x === x && flagPos.y === y;
                  const isObs = obstacles.some((o) => o.x === x && o.y === y);
                  const gearItem = gears.find((g) => g.x === x && g.y === y);
                  const isCollected = gearItem ? collectedGears.includes(gearItem.id) : false;

                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`h-14 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border transition-all select-none ${
                        isRobot
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-105'
                          : isFlag
                          ? 'bg-amber-100 border-amber-300 animate-pulse'
                          : isObs
                          ? 'bg-rose-100 border-rose-300'
                          : gearItem && !isCollected
                          ? 'bg-emerald-100 border-emerald-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {isRobot ? (
                        '🤖'
                      ) : isFlag ? (
                        '🚩'
                      ) : isObs ? (
                        '⚡'
                      ) : gearItem && !isCollected ? (
                        '⚙️'
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Status message */}
            <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs font-bold">
              <span
                className={
                  simStatusType === 'win'
                    ? 'text-emerald-700'
                    : simStatusType === 'collision'
                    ? 'text-rose-600'
                    : simStatusType === 'gear'
                    ? 'text-amber-600'
                    : 'text-blue-700'
                }
              >
                {simMessage}
              </span>
              <span className="font-mono text-slate-500">
                گام‌ها: {formatPersianNumber(simSteps)} | چرخ‌دنده‌ها: {formatPersianNumber(collectedGears.length)}/۲
              </span>
            </div>
          </div>

          {/* Controls & AI Solver (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-black text-slate-900">
              فرمان‌های هدایت و کنترل موتورها:
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div />
              <button
                type="button"
                onClick={() => handleSimMove(0, -1, 'حرکت به بالا')}
                className="py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowUp className="w-4 h-4" />
                <span>بالا</span>
              </button>
              <div />

              <button
                type="button"
                onClick={() => handleSimMove(-1, 0, 'حرکت به راست')}
                className="py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>راست</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimMove(0, 1, 'حرکت به پایین')}
                className="py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowDown className="w-4 h-4" />
                <span>پایین</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimMove(1, 0, 'حرکت به چپ')}
                className="py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>چپ</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleSimAuto}
                className="py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>الگوریتم هوشمند خودکار</span>
              </button>

              <button
                type="button"
                onClick={handleSimReset}
                className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>شروع مجدد</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed pt-2">
              💡 در ترم‌های کدنویسی فاتحان، دانش‌آموزان همین الگوریتم‌های ناوبری خودکار را برای ربات‌های واقعی مسیریاب و حل ماز در زبان‌های پایتون و C++ می‌نویسند.
            </p>
          </div>

        </div>

      </section>
      )}

      {/* =====================================================================
          6. OFFICIAL HARDWARE KITS & COMPONENTS STORE
          ===================================================================== */}
      {!kitsBlk?.desktopHidden && (
      <section id="store-kits" className="space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
              <span>🛒 {kitsBlk?.highlightWord || 'کیت‌ها و قطعات استاندارد آموزشگاه'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {kitsBlk?.heading || 'تجهیزات و بسته‌های کمک‌آموزشی رباتیک فاتحان'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'همه کالاها' },
              { id: 'کیت', label: 'بسته‌های آموزشی' },
              { id: 'برد', label: 'بردهای الکترونیکی' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setKitCategoryFilter(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  kitCategoryFilter === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => navigateStore('/shop')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{kitsBlk?.ctaPrimary || 'مشاهده همه در فروشگاه'}</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayKits.map((prd) => (
            <div
              key={prd.id}
              className="bg-white rounded-3xl p-4 border border-slate-200 hover:border-blue-400 transition-all flex flex-col justify-between shadow-2xs hover:shadow-md"
            >
              <div>
                <div
                  onClick={() => navigateStore(`/product/${prd.id}`)}
                  className="relative h-44 rounded-2xl bg-slate-100 overflow-hidden cursor-pointer group mb-3"
                >
                  <img
                    src={prd.featuredImageUrl}
                    alt={prd.name}
                    onError={(e) => {
                      e.currentTarget.src = '/assets/kits/kit-01.jpg';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-bold text-slate-800">
                    {prd.category || 'آموزشی'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3
                    onClick={() => navigateStore(`/product/${prd.id}`)}
                    className="text-xs sm:text-sm font-black text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-1"
                  >
                    {prd.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {prd.description || prd.specs}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">قیمت:</span>
                  <span className="font-mono font-black text-blue-700">
                    {formatToman(prd.salePriceToman || prd.priceToman)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => addToCart(prd, undefined, 1, true)}
                  className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>+ افزودن به سبد خرید</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </section>
      )}

      {/* =====================================================================
          7. WHY FAMILIES CHOOSE FATEHAN & ICONIC QUOTE BANNER
          ===================================================================== */}
      {!whyBlk?.desktopHidden && (
      <section id="why-fatehan" className="space-y-8">
        
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs font-black">
            <span>⭐ {whyBlk?.highlightWord || 'مزایای رقابتی آموزشگاه'}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900">
            {whyBlk?.heading || 'چرا خانواده‌ها «فاتحان» را انتخاب می‌کنند؟'}
          </h2>
          {whyBlk?.subheading && (
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              {whyBlk.subheading}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(whyBlk?.itemsList && whyBlk.itemsList.length > 0
            ? whyBlk.itemsList.map((it, idx) => ({
                icon: [Lightbulb, Box, Users, Award][idx % 4],
                title: it.title,
                desc: it.subtitle,
                badge: it.badge,
              }))
            : [
                {
                  icon: Lightbulb,
                  title: 'تقویت خلاقیت و مهارت حل مسئله',
                  desc: 'دانش‌آموزان یاد می‌گیرند در مواجهه با چالش‌های فنی، خودشان راه‌حل‌های خلاقانه طراحی و آزمایش کنند.',
                  badge: '',
                },
                {
                  icon: Box,
                  title: 'کارگاه‌های مجهز و مدرن',
                  desc: 'دسترسی کامل کارآموزان به پرینترهای سه‌بعدی، ایستگاه‌های الکترونیک و لپ‌تاپ‌های کارگاهی پیشرفته.',
                  badge: '',
                },
                {
                  icon: Users,
                  title: 'اساتید مجرب و متخصص',
                  desc: 'تدریس توسط مربیان باسابقه مهندسی و مسابقات کشوری رباتیک با متدولوژی‌های روز دنیا.',
                  badge: '',
                },
                {
                  icon: Award,
                  title: 'آموزش کاربردی و پروژه‌محور',
                  desc: 'در پایان هر ترم، کارآموز یک پروژه واقعی و قابل لمس (ربات، مدار هوشمند یا بازی رایانه‌ای) با دستان خود می‌سازد.',
                  badge: '',
                },
              ]
          ).map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow text-right space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  {item.badge && (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Iconic Brush Quote Banner from Flyer */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1">
            <div className="text-xs text-cyan-300 font-bold">شعار راهبردی آموزشگاه فاتحان:</div>
            <div className="text-lg sm:text-2xl font-black text-amber-400">
              {whyBlk?.subheading || '«رباتیک فقط یک رشته نیست... یک مهارت زندگی است»'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateStore('/courses')}
            className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm whitespace-nowrap self-start sm:self-auto transition-all shadow-md cursor-pointer"
          >
            {whyBlk?.ctaPrimary || 'شروع مسیر موفقیت فرزندتان'} ←
          </button>
        </div>

      </section>
      )}

      {/* =====================================================================
          8. CONSULTATION BOOKING FORM & ANDISHEH CAMPUS CONTACT CARD (MATCHING IMAGE 1)
          ===================================================================== */}
      {!contactBlk?.desktopHidden && (
      <section id="contact" className="w-full">
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200/90 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Right Column in RTL: Booking Form (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-5 text-right">
            <div>
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100/90 text-amber-900 text-xs font-black mb-3">
                <span>📞 {contactBlk?.highlightWord || 'با ما در ارتباط باشید'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                {contactBlk?.heading || 'رزرو مشاوره رایگان و جلسه آشنایی با کارگاه'}
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-2">
                {contactBlk?.subheading || 'مشخصات دانش‌آموز را وارد کنید تا کارشناسان آموزشگاه فاتحان در کمتر از ۲ ساعت با شما تماس بگیرند و بهترین مسیر آموزشی را معرفی کنند.'}
              </p>
            </div>

            <form onSubmit={handleConsultSubmit} className="space-y-4">
              {consultSubmitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 text-base font-black">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>درخواست مشاوره «{consultName}» با موفقیت ثبت شد!</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    کارشناسان آموزشگاه فاتحان ظرف کمتر از ۲ ساعت با شماره {consultPhone} تماس خواهند گرفت و زمان جلسه رایگان معارفه را هماهنگ می‌کنند.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConsultSubmitted(false)}
                    className="mt-2 text-xs font-bold text-emerald-800 underline cursor-pointer"
                  >
                    ثبت فرم جدید برای فرزند دیگر
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        شماره تماس والدین *
                      </label>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        value={consultPhone}
                        onChange={(e) => setConsultPhone(e.target.value)}
                        placeholder="0912..."
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs sm:text-sm font-mono text-left focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        نام و نام خانوادگی دانش‌آموز *
                      </label>
                      <input
                        type="text"
                        required
                        value={consultName}
                        onChange={(e) => setConsultName(e.target.value)}
                        placeholder="مثلاً: آریا محمدی"
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs sm:text-sm font-bold text-right focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        دپارتمان مورد علاقه:
                      </label>
                      <select
                        value={consultDept}
                        onChange={(e) => setConsultDept(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="رباتیک (مبتدی تا پیشرفته)">رباتیک (مبتدی تا پیشرفته)</option>
                        <option value="برنامه‌نویسی و هوش مصنوعی">برنامه‌نویسی و هوش مصنوعی</option>
                        <option value="مکانیک و ساخت سازه">مکانیک و ساخت سازه</option>
                        <option value="الکترونیک و مکاترونیک">الکترونیک و مکاترونیک</option>
                        <option value="چاپ سه‌بعدی و مدل‌سازی">چاپ سه‌بعدی و مدل‌سازی</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        رده سنی دانش‌آموز:
                      </label>
                      <select
                        value={consultAge}
                        onChange={(e) => setConsultAge(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="۱۱ تا ۱۴ سال (متوسطه اول)">۱۱ تا ۱۴ سال (متوسطه اول)</option>
                        <option value="۶ تا ۷ سال (پیش‌دبستانی و پایه اول)">۶ تا ۷ سال (پیش‌دبستانی و پایه اول)</option>
                        <option value="۸ تا ۱۰ سال (دبستان)">۸ تا ۱۰ سال (دبستان)</option>
                        <option value="۱۵ تا ۱۸ سال (دبیرستان و کنکور)">۱۵ تا ۱۸ سال (دبیرستان و کنکور)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      توضیحات تکمیلی (اختیاری):
                    </label>
                    <textarea
                      rows={3}
                      value={consultNote}
                      onChange={(e) => setConsultNote(e.target.value)}
                      placeholder="اگر فرزندتان قبلاً تجربه شرکت در کلاس‌های رباتیک یا کدنویسی را داشته بنویسید..."
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <span>{contactBlk?.ctaPrimary || 'ثبت درخواست مشاوره و تعیین سطح رایگان'} ←</span>
                  </button>
                </>
              )}
            </form>

            {/* Form Footer Status Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>جلسه معارفه و استعدادیابی کاملاً رایگان است.</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>حضور در کارگاه با هماهنگی قبلی</span>
              </div>
            </div>
          </div>

          {/* Left Column in RTL: Dark Navy Contact & Address Card (5 Cols) - Connected Live to BLK-HOME-CONTACT */}
          {(() => {
            const phone1Num = contactBlk?.itemsList?.[0]?.title || settings.phones.primaryFormatted;
            const phone1Clean = phone1Num.replace(/\s+/g, '');
            const phone1Label =
              contactBlk?.itemsList?.[0]?.subtitle || settings.phones.primaryLabel || 'خط ۱ مشاوره و ثبت‌نام';

            const phone2Num = contactBlk?.itemsList?.[1]?.title || settings.phones.secondaryFormatted;
            const phone2Clean = phone2Num.replace(/\s+/g, '');
            const phone2Label =
              contactBlk?.itemsList?.[1]?.subtitle || settings.phones.secondaryLabel || 'خط ۲ پشتیبانی کارگاه';

            const landlineNum = contactBlk?.itemsList?.[2]?.title || settings.phones.landlineFormatted;
            const landlineClean = landlineNum.replace(/\s+/g, '');
            const landlineLabel =
              contactBlk?.itemsList?.[2]?.subtitle || settings.phones.landlineLabel || 'تلفن ثابت دفتر مرکزی';

            const addressTitleLabel =
              contactBlk?.itemsList?.[3]?.badge &&
              contactBlk.itemsList[3].badge !== 'آدرس کارگاه'
                ? contactBlk.itemsList[3].badge
                : `آدرس ${settings.academyNameFa}:`;
            const addressExactText =
              contactBlk?.itemsList?.[3]?.title || settings.location.addressFull;
            const addressHoursText =
              contactBlk?.itemsList?.[3]?.subtitle || settings.location.workingHours;
            const extraContactItems = (contactBlk?.itemsList || []).slice(4);

            return (
              <div className="lg:col-span-5 bg-[#0c1427] border border-slate-800 text-white rounded-[2rem] p-6 sm:p-7 space-y-4 shadow-xl flex flex-col justify-between">
                {/* Top Bar with Badge & Academy Slug */}
                <div className="flex items-center justify-between gap-2">
                  <div className="px-3.5 py-1.5 rounded-full bg-[#facc15] text-slate-950 font-black text-xs inline-flex items-center shadow-xs whitespace-nowrap">
                    اطلاعات تماس و آدرس دقیق
                  </div>
                  <span
                    className="text-[#22d3ee] font-mono font-bold text-xs tracking-wider"
                    dir="ltr"
                  >
                    FATEHAN ACADEMY
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-1.5 text-right">
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {contactBlk?.ctaSecondary ||
                      'منتظر دیدار شما در کارگاه رباتیک فاتحان هستیم!'}
                  </h3>
                  <p className="text-[#38bdf8] text-xs font-bold pt-1">
                    شماره‌های تماس مستقیم و واتساپ:
                  </p>
                </div>

                {/* Interactive Contact Cards */}
                <div className="space-y-3">
                  {/* Phone 1 */}
                  <div className="bg-[#162039] border border-slate-700/60 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-blue-500/50 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleCopy(phone1Clean, 'p1', 'شماره تماس خط ۱')}
                      className="px-3.5 py-1.5 rounded-xl bg-[#222d4c] hover:bg-blue-600 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/60 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                    >
                      {copiedKey === 'p1' ? 'کپی شد!' : 'کپی'}
                    </button>

                    <div className="flex items-center gap-3">
                      <div>
                        <a
                          href={`tel:${phone1Clean}`}
                          className="font-mono text-white font-black text-lg sm:text-xl tracking-wider block text-left hover:text-cyan-300 transition-colors"
                          dir="ltr"
                        >
                          {phone1Num}
                        </a>
                        <div
                          className="text-slate-400 text-[11px] font-medium mt-0.5 text-right"
                          dir="rtl"
                        >
                          {phone1Label}
                        </div>
                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-[#fbbf24] text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                        <PhoneCall className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Phone 2 */}
                  <div className="bg-[#162039] border border-slate-700/60 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-cyan-500/50 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleCopy(phone2Clean, 'p2', 'شماره تماس خط ۲')}
                      className="px-3.5 py-1.5 rounded-xl bg-[#222d4c] hover:bg-cyan-600 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/60 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                    >
                      {copiedKey === 'p2' ? 'کپی شد!' : 'کپی'}
                    </button>

                    <div className="flex items-center gap-3">
                      <div>
                        <a
                          href={`tel:${phone2Clean}`}
                          className="font-mono text-white font-black text-lg sm:text-xl tracking-wider block text-left hover:text-cyan-300 transition-colors"
                          dir="ltr"
                        >
                          {phone2Num}
                        </a>
                        <div
                          className="text-slate-400 text-[11px] font-medium mt-0.5 text-right"
                          dir="rtl"
                        >
                          {phone2Label}
                        </div>
                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-[#06b6d4] text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                        <Smartphone className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Landline Phone */}
                  <div className="bg-[#162039] border border-slate-700/60 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-emerald-500/50 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleCopy(landlineClean, 'landline', 'تلفن ثابت آموزشگاه')}
                      className="px-3.5 py-1.5 rounded-xl bg-[#222d4c] hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/60 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                    >
                      {copiedKey === 'landline' ? 'کپی شد!' : 'کپی'}
                    </button>

                    <div className="flex items-center gap-3">
                      <div>
                        <a
                          href={`tel:${landlineClean}`}
                          className="font-mono text-white font-black text-lg sm:text-xl tracking-wider block text-left hover:text-emerald-300 transition-colors"
                          dir="ltr"
                        >
                          {landlineNum}
                        </a>
                        <div
                          className="text-slate-400 text-[11px] font-medium mt-0.5 text-right"
                          dir="rtl"
                        >
                          {landlineLabel}
                        </div>
                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                        <Phone className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Instagram Card Row */}
                  <div className="bg-gradient-to-r from-[#281c44] via-[#1c1d3c] to-[#162039] border border-purple-500/40 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-pink-500/60 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleCopy(`@${igHandle}`, 'ig', 'آی‌دی اینستاگرام')}
                      className="px-3 py-1.5 rounded-xl bg-[#2b1f49] hover:bg-pink-600 text-pink-200 hover:text-white font-bold text-xs border border-purple-500/40 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                    >
                      {copiedKey === 'ig' ? 'کپی شد!' : 'کپی آی‌دی'}
                    </button>

                    <div className="flex items-center gap-3">
                      <div>
                        <a
                          href={igUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-white font-black text-base sm:text-lg tracking-wide block text-left hover:text-pink-300 transition-colors"
                          dir="ltr"
                        >
                          @{igHandle}
                        </a>
                        <div
                          className="text-slate-400 text-[11px] font-medium mt-0.5 text-right"
                          dir="rtl"
                        >
                          صفحه رسمی اینستاگرام آموزشگاه فاتحان
                        </div>
                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <Instagram className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  {/* Eitaa Channel Card Row */}
                  {eitaaHandle && (
                    <div className="bg-[#162039] border border-orange-500/35 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-orange-400/70 transition-colors">
                      <button
                        type="button"
                        onClick={() => handleCopy(eitaaHandle, 'eitaa', 'آی‌دی کانال ایتا')}
                        className="px-3 py-1.5 rounded-xl bg-[#222d4c] hover:bg-orange-500 text-orange-200 hover:text-white font-bold text-xs border border-orange-500/30 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedKey === 'eitaa' ? 'کپی شد!' : 'کپی آی‌دی'}
                      </button>

                      <div className="flex items-center gap-3">
                        <div>
                          <a
                            href={eitaaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-white font-black text-base sm:text-lg tracking-wide block text-left hover:text-orange-300 transition-colors"
                            dir="ltr"
                          >
                            {eitaaHandle}
                          </a>
                          <div
                            className="text-slate-400 text-[11px] font-medium mt-0.5 text-right"
                            dir="rtl"
                          >
                            کانال رسمی ایتا آموزشگاه رباتیک فاتحان
                          </div>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                          <Send className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bale Channel Card Row (If Set in Admin) */}
                  {baleHandle && (
                    <div className="bg-[#162039] border border-emerald-500/35 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-emerald-400/70 transition-colors">
                      <button
                        type="button"
                        onClick={() => handleCopy(baleHandle, 'bale', 'آی‌دی کانال بله')}
                        className="px-3 py-1.5 rounded-xl bg-[#222d4c] hover:bg-emerald-600 text-emerald-200 hover:text-white font-bold text-xs border border-emerald-500/30 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedKey === 'bale' ? 'کپی شد!' : 'کپی آی‌دی'}
                      </button>

                      <div className="flex items-center gap-3">
                        <div>
                          <a
                            href={baleUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-white font-black text-base sm:text-lg tracking-wide block text-left hover:text-emerald-300 transition-colors"
                            dir="ltr"
                          >
                            {baleHandle}
                          </a>
                          <div
                            className="text-slate-400 text-[11px] font-medium mt-0.5 text-right"
                            dir="rtl"
                          >
                            کانال رسمی بله آموزشگاه رباتیک فاتحان
                          </div>
                        </div>

                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                          <Send className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Extra Custom Items Added by Admin in BLK-HOME-CONTACT */}
                  {extraContactItems.map((ext, i) => (
                    <div
                      key={i}
                      className="bg-[#162039] border border-slate-700/60 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3"
                    >
                      {ext.badge && (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-cyan-300 text-[10px] font-bold shrink-0">
                          {ext.badge}
                        </span>
                      )}
                      <div className="text-right flex-1">
                        <div className="text-white font-black text-xs sm:text-sm">{ext.title}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{ext.subtitle}</div>
                      </div>
                    </div>
                  ))}

                  {/* Address Card (Connected Live to BLK-HOME-CONTACT itemsList[3]) */}
                  <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="text-amber-400 font-bold text-xs">
                          {addressTitleLabel}
                        </div>
                        <div className="text-white font-bold text-xs leading-relaxed">
                          {addressExactText}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{addressHoursText}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(addressExactText, 'addr', 'آدرس آموزشگاه')
                        }
                        className="text-[#22d3ee] font-bold hover:underline cursor-pointer"
                      >
                        {copiedKey === 'addr' ? 'کپی شد!' : 'کپی آدرس'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </section>
      )}

      {/* =====================================================================
          8.5 CUSTOM PAGE BUILDER SECTIONS ADDED BY ADMIN FOR HOME PAGE
          ===================================================================== */}
      {customHomeBlocks.map((customBlk) => (
        <section
          key={customBlk.id}
          className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 text-right"
        >
          <div className="max-w-3xl space-y-2">
            {customBlk.highlightWord && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black">
                <span>✨ {customBlk.highlightWord}</span>
              </div>
            )}
            <h2 className="text-xl sm:text-3xl font-black text-slate-900">
              {customBlk.heading}
            </h2>
            {customBlk.subheading && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {customBlk.subheading}
              </p>
            )}
          </div>

          {customBlk.itemsList && customBlk.itemsList.length > 0 && (
            <div
              className={`grid grid-cols-1 gap-4 ${
                customBlk.desktopGridCols === 4
                  ? 'sm:grid-cols-2 lg:grid-cols-4'
                  : customBlk.desktopGridCols === 3
                  ? 'sm:grid-cols-2 lg:grid-cols-3'
                  : customBlk.desktopGridCols === 2
                  ? 'sm:grid-cols-2'
                  : 'grid-cols-1'
              }`}
            >
              {customBlk.itemsList.map((item, i) => (
                <div
                  key={i}
                  className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2"
                >
                  {item.badge && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                      {item.badge}
                    </span>
                  )}
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              ))}
            </div>
          )}

          {(customBlk.ctaPrimary || customBlk.ctaSecondary) && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {customBlk.ctaPrimary && (
                <button
                  type="button"
                  onClick={() => navigateStore('/courses')}
                  className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm cursor-pointer transition-all"
                >
                  {customBlk.ctaPrimary} ←
                </button>
              )}
              {customBlk.ctaSecondary && (
                <button
                  type="button"
                  onClick={() => navigateStore('/contact')}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm cursor-pointer transition-all"
                >
                  {customBlk.ctaSecondary}
                </button>
              )}
            </div>
          )}
        </section>
      ))}

      {/* =====================================================================
          9. INTERACTIVE "DREAM · BUILD / ایده‌ها" MODAL (IMAGE 2)
          ===================================================================== */}
      <AnimatePresence>
        {isIdeaModalOpen && (
          <div
            onClick={() => setIsIdeaModalOpen(false)}
            className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-2 border-amber-300 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl my-8"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-l from-amber-400 via-amber-300 to-yellow-300 text-slate-950 px-6 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center text-xl shadow-md">
                    💡
                  </div>
                  <div>
                    <div className="text-[11px] font-mono font-black text-blue-950">
                      DREAM · BUILD · FATEHAN INNOVATION BOX
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-950">
                      صندوق ایده‌ها و یادداشت‌های خلاقانه (فکر کن، بساز، کشف کن!)
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsIdeaModalOpen(false)}
                  className="p-2 rounded-xl bg-white/60 hover:bg-white text-slate-900 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  هر ایده، ربات رویایی، اختراع یا یادداشتی که در ذهن داری را اینجا بنویس! یادداشت تو هم در{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsIdeaModalOpen(false);
                      navigateStore('/my-account');
                    }}
                    className="font-black text-blue-600 hover:text-blue-800 underline cursor-pointer inline"
                  >
                    حساب کاربری خودت
                  </button>{' '}
                  ذخیره می‌شود و هم مستقیم برای{' '}
                  <strong className="text-slate-900">مربیان و مدیریت آموزشگاه فاتحان</strong> ارسال می‌گردد تا برای ساختش راهنمایی‌ات کنند.
                </p>

                <form onSubmit={handleIdeaSubmit} className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        نام و نام خانوادگی شما *:
                      </label>
                      <input
                        type="text"
                        required
                        value={ideaStudentName}
                        onChange={(e) => setIdeaStudentName(e.target.value)}
                        placeholder="مثلاً: پارسا محمدی"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        شماره موبایل (جهت ذخیره در پنل کاربری) *:
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        required
                        value={ideaPhone}
                        onChange={(e) => setIdeaPhone(e.target.value)}
                        placeholder="0912..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-mono text-left text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        رده سنی:
                      </label>
                      <select
                        value={ideaAgeGroup}
                        onChange={(e) => setIdeaAgeGroup(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900"
                      >
                        <option value="۷ تا ۱۰ سال (دبستان)">۷ تا ۱۰ سال (دبستان)</option>
                        <option value="۱۱ تا ۱۴ سال (متوسطه اول)">۱۱ تا ۱۴ سال (متوسطه اول)</option>
                        <option value="۱۵ تا ۱۸ سال (متوسطه دوم)">۱۵ تا ۱۸ سال (متوسطه دوم)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      عنوان ایده یا یادداشت *:
                    </label>
                    <input
                      type="text"
                      required
                      value={ideaTitle}
                      onChange={(e) => setIdeaTitle(e.target.value)}
                      placeholder="مثلاً: ربات هوشمند آبیاری گیاهان آپارتمانی با سنسور رطوبت"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      توضیحات کامل ایده یا یادداشت علمی *:
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={ideaNote}
                      onChange={(e) => setIdeaNote(e.target.value)}
                      placeholder="توضیح بده دوست داری این ربات یا برنامه چطور کار کنه و چه مشکلی رو حل کنه..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsIdeaModalOpen(false);
                        navigateStore('/my-account');
                      }}
                      className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer"
                    >
                      مشاهده همه ایده‌های من در حساب کاربری ←
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmittingIdea}
                      className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingIdea ? 'در حال ثبت ایده...' : 'ثبت در ایده‌های من و ارسال برای مربیان'}</span>
                    </button>
                  </div>
                </form>

                {/* User's Own Ideas List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>📒 یادداشت‌ها و ایده‌های ثبت‌شده:</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {formatPersianNumber(userSubmittedIdeas.length)} مورد
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {userSubmittedIdeas.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900">{item.title}</span>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold">
                              {item.status}
                            </span>
                            <span className="font-mono text-slate-500">{item.createdAt}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{item.note}</p>
                        {item.adminReply && (
                          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-950">
                            <strong className="text-blue-700 block mb-0.5">پاسخ مربی و واحد علمی فاتحان:</strong>
                            {item.adminReply}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
