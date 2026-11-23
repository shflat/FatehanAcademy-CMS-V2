/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dedicated Multi-Page Routes for Fatehan Robotics Academy (fatehanacademy.ir)
 * Designed for WordPress/WooCommerce Architecture with Apple-Grade Craftsmanship.
 * WCAG AAA Contrast, Strict Single-Line Elements, Dedicated Mobile Layouts (80% Mobile Users).
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFatehanTheme } from '../context/FatehanThemeContext';
import { FatehanLogo } from '../ui/FatehanLogo';
import { formatPersianNumber, formatToman } from '../utils/formatters';
import { DEFAULT_FALLBACK_COURSES, DEFAULT_FALLBACK_FREE_COURSES } from '../utils/defaultFallbacks';
import { FatehanCourse, ProductItem } from '../types';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
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
  Terminal,
  Trophy,
  Users,
  Compass,
  Star,
  ShieldCheck,
  Check,
  HelpCircle,
  Play,
  RotateCcw,
  Bot,
  Zap,
  Flag,
  Lightbulb,
  Award,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Filter,
  Search,
  MessageCircle,
  Gift,
  Share2,
  Building2,
  Send,
  X,
} from 'lucide-react';

// ============================================================================
// 1. DEDICATED COURSES CATALOG & SINGLE COURSE PAGE (/courses & /courses/:id)
// ============================================================================
export const FatehanCoursesPage: React.FC = () => {
  const { state, settings, storePath, navigateStore, addToCart, notify, viewportMode } = useFatehanTheme();
  const isMobile = viewportMode === 'mobile';

  const allCourses: FatehanCourse[] = useMemo(() => {
    if (state?.courses && Array.isArray(state.courses) && state.courses.length > 0) {
      return state.courses as unknown as FatehanCourse[];
    }
    return DEFAULT_FALLBACK_COURSES;
  }, [state?.courses]);

  // Check if viewing a single course
  const singleCourseId = storePath.startsWith('/courses/')
    ? storePath.replace('/courses/', '').trim()
    : storePath.startsWith('/course/')
    ? storePath.replace('/course/', '').trim()
    : '';

  const singleCourse = useMemo(() => {
    if (!singleCourseId) return null;
    return (
      allCourses.find(
        (c) =>
          String(c.id) === singleCourseId ||
          (c.code && c.code.toLowerCase() === singleCourseId.toLowerCase()) ||
          (c.slug && c.slug.toLowerCase() === singleCourseId.toLowerCase())
      ) || null
    );
  }, [singleCourseId, allCourses]);

  // Filters for Archive View
  const [selectedAge, setSelectedAge] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Single Course Tuition Plan Selection
  const [selectedPlan, setSelectedPlan] = useState<'early' | 'normal' | 'approved' | 'private'>('early');

  // Embedded Tuition Calculator State inside /courses
  const [calcCourseId, setCalcCourseId] = useState<string>(String(allCourses[0]?.id || 'CRS-ROBO-1'));
  const [calcPlan, setCalcPlan] = useState<'early' | 'normal' | 'approved' | 'private'>('early');
  const [calcSiblings, setCalcSiblings] = useState<number>(1);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return allCourses.filter((crs) => {
      if (selectedAge !== 'ALL' && crs.ageGroup !== selectedAge) return false;
      if (selectedCategory !== 'ALL' && crs.category !== selectedCategory) return false;
      if (
        searchQuery.trim() &&
        !crs.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
        !(crs.summaryFa || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [allCourses, selectedAge, selectedCategory, searchQuery]);

  const handleEnroll = (crs: FatehanCourse, plan: 'early' | 'normal' | 'approved' | 'private') => {
    let price = crs.tuitionEarlyBirdToman;
    let label = 'تخفیف زودهنگام';
    if (plan === 'normal') {
      price = crs.tuitionNormalToman;
      label = 'تخفیف دو مرحله‌ای ثبت‌نام به‌موقع';
    } else if (plan === 'approved') {
      price = crs.tuitionApprovedToman;
      label = 'شهریه استاندارد مصوب';
    } else if (plan === 'private') {
      price = crs.tuitionPrivateToman;
      label = 'کلاس خصوصی ۱ تا ۳ نفره';
    }

    const courseProduct: ProductItem = {
      id: `ENR-${crs.id}-${plan}`,
      sku: `ENR-${crs.code}`,
      name: `ثبت‌نام ${crs.title} (${label})`,
      type: 'دوره آموزشی حضوری',
      category: 'ثبت‌نام دوره‌های آموزشی',
      featuredImageUrl: crs.featuredImageUrl,
      priceToman: crs.tuitionApprovedToman,
      salePriceToman: price,
      stock: 12,
      salesCount: 35,
      status: 'In Stock',
      warranty: 'تضمین کیفیت آموزش و اعطای مدرک رسمی آموزشگاه فاتحان',
      specs: `${crs.sessionsCount} جلسه / رده سنی: ${crs.ageRangeFa}`,
    };

    addToCart(courseProduct, undefined, 1, true);
    notify(`دوره «${crs.title}» با موفقیت به سبد ثبت‌نام افزوده شد.`);
  };

  // --------------------------------------------------------------------------
  // A. SINGLE COURSE DETAIL VIEW
  // --------------------------------------------------------------------------
  if (singleCourse) {
    let currentPrice = singleCourse.tuitionEarlyBirdToman;
    if (selectedPlan === 'normal') currentPrice = singleCourse.tuitionNormalToman;
    if (selectedPlan === 'approved') currentPrice = singleCourse.tuitionApprovedToman;
    if (selectedPlan === 'private') currentPrice = singleCourse.tuitionPrivateToman;

    return (
      <div className="py-4 sm:py-6 space-y-6">
        {/* Breadcrumb Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 whitespace-nowrap overflow-x-auto">
            <button
              type="button"
              onClick={() => navigateStore('/')}
              className="text-slate-700 hover:text-blue-600 cursor-pointer whitespace-nowrap"
            >
              صفحه اصلی
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => navigateStore('/courses')}
              className="text-slate-700 hover:text-blue-600 cursor-pointer whitespace-nowrap"
            >
              کاتالوگ دوره‌ها
            </button>
            <span>/</span>
            <span className="text-slate-900 font-black truncate max-w-[200px] sm:max-w-none">
              {singleCourse.title}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigateStore('/courses')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به همه دوره‌ها</span>
          </button>
        </div>

        {/* Hero Course Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 shadow-sm">
          {/* Right Column: Information & Syllabus */}
          <div className="lg:col-span-7 space-y-5 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black whitespace-nowrap">
                {singleCourse.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold whitespace-nowrap">
                {singleCourse.ageRangeFa}
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold whitespace-nowrap" dir="ltr">
                {singleCourse.code}
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-slate-900 leading-snug">
              {singleCourse.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              {singleCourse.summaryFa}
            </p>

            {/* Quick Specs Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-right">
                <div className="text-[11px] text-slate-500 font-bold">تعداد جلسات:</div>
                <div className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-0.5">
                  {formatPersianNumber(singleCourse.sessionsCount)} جلسه کارگاهی
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-right">
                <div className="text-[11px] text-slate-500 font-bold">زمان هر جلسه:</div>
                <div className="text-xs sm:text-sm font-black text-slate-900 font-mono mt-0.5">
                  {formatPersianNumber(singleCourse.hoursPerSession)} ساعت
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-right col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-500 font-bold">پیش‌نیاز علمی:</div>
                <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                  {singleCourse.prerequisites}
                </div>
              </div>
            </div>

            {/* Syllabus Points */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>سرفصل‌های آموزشی و مباحث عملی این دوره:</span>
              </h3>
              <div className="space-y-2">
                {(singleCourse.syllabusPoints || []).map((pt, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment Needed */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-bold space-y-1">
              <div>📦 پکیج و تجهیزات کارگاهی مورد نیاز:</div>
              <div className="text-slate-800 font-normal">{singleCourse.equipmentNeeded}</div>
            </div>
          </div>

          {/* Left Column: Tuition Selector & Direct Enrollment */}
          <div className="lg:col-span-5 space-y-5">
            <div className="relative h-56 sm:h-64 rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
              <img
                src={singleCourse.featuredImageUrl}
                alt={singleCourse.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-900/85 text-white text-xs font-black">
                {singleCourse.levelFa}
              </div>
            </div>

            {/* Tuition Calculator Box */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg text-right">
              <div className="space-y-1 pb-3 border-b border-slate-800">
                <div className="text-[11px] text-amber-400 font-bold">
                  انتخاب طرح ثبت‌نام و اعمال تخفیف رسمی:
                </div>
                <div className="text-base font-black text-white">{singleCourse.title}</div>
              </div>

              {/* Plan Tabs */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'early', label: 'تخفیف زودهنگام', desc: 'تخفیف یک‌مرحله‌ای' },
                  { id: 'normal', label: 'ثبت‌نام به‌موقع', desc: 'تخفیف دو‌مرحله‌ای' },
                  { id: 'approved', label: 'شهریه مصوب', desc: 'نرخ پایه مصوب' },
                  { id: 'private', label: 'کلاس خصوصی', desc: '۱ تا ۳ نفر' },
                ].map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => setSelectedPlan(pl.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedPlan === pl.id
                        ? 'bg-blue-600 text-white border-blue-600 font-black shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold whitespace-nowrap">{pl.label}</div>
                    <div className="text-[10px] opacity-75 mt-0.5 whitespace-nowrap">{pl.desc}</div>
                  </button>
                ))}
              </div>

              {/* Price Display */}
              <div className="pt-2 space-y-1">
                <div className="text-xs text-slate-400">مبلغ نهایی شهریه:</div>
                <div className="flex items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">
                    {formatToman(currentPrice)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  معادل ریالی: {formatPersianNumber(currentPrice * 10)} ریال
                </div>
              </div>

              {selectedPlan !== 'approved' && selectedPlan !== 'private' && (
                <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
                  <span>سود شما از تخفیف:</span>
                  <span className="font-mono font-black">
                    {formatToman(singleCourse.tuitionApprovedToman - currentPrice)}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleEnroll(singleCourse, selectedPlan)}
                  className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>ثبت‌نام آنلاین و پرداخت شهریه</span>
                </button>

                <a
                  href={`tel:${settings.phones.primary}`}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 whitespace-nowrap"
                  dir="ltr"
                >
                  <Phone className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>مشاوره تلفنی: {settings.phones.primaryFormatted}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // B. FULL COURSES ARCHIVE CATALOG VIEW (/courses)
  // --------------------------------------------------------------------------
  const coursesHeroBlk = (state?.builderBlocks || []).find((b) => b.id === 'BLK-COURSES-HERO');
  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 text-right">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{coursesHeroBlk?.highlightWord || 'کاتالوگ رسمی دوره‌های آموزشگاه رباتیک فاتحان'}</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-white">
            {coursesHeroBlk?.heading || 'برنامه ترمیک و سرفصل‌های آموزشی مقاطع مختلف تحصیلی'}
          </h1>
          <p className="text-xs text-slate-200">
            {coursesHeroBlk?.subheading || '۱۵ دوره تخصصی در ۵ دپارتمان با تخفیف‌های رسمی زودهنگام و دو مرحله‌ای'}
          </p>
        </div>

        <a
          href="#tuition-calculator-section"
          className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm whitespace-nowrap self-start sm:self-auto cursor-pointer shadow-md transition-all flex items-center gap-1.5"
        >
          <Calendar className="w-4 h-4" />
          <span>{coursesHeroBlk?.ctaPrimary || 'محاسبه‌گر شهریه و تقویم ثبت‌نام'}</span>
        </a>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان یا مباحث دوره‌ها..."
              className="w-full pr-9 pl-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Age Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 ml-1">رده سنی:</span>
            {[
              { id: 'ALL', label: 'همه سنین' },
              { id: 'S', label: '۶ تا ۷ سال' },
              { id: 'A', label: '۸ تا ۹ سال' },
              { id: 'B', label: '۱۰ تا ۱۳ سال' },
              { id: 'C', label: '۱۴ سال به بالا' },
            ].map((age) => (
              <button
                key={age.id}
                type="button"
                onClick={() => setSelectedAge(age.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedAge === age.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {age.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 ml-1">دپارتمان:</span>
          {[
            'ALL',
            'کودک خلاق',
            'مکانیک',
            'الکترونیک',
            'مکاترونیک',
            'برنامه‌نویسی و هوش مصنوعی',
            'طراحی و ساخت سه‌بعدی',
          ].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'همه رشته‌ها' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCourses.map((crs) => (
          <div
            key={crs.id}
            className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-blue-400 transition-all flex flex-col justify-between shadow-2xs hover:shadow-md text-right"
          >
            <div>
              <div
                onClick={() => navigateStore(`/courses/${crs.id}`)}
                className="relative h-48 rounded-2xl bg-slate-100 overflow-hidden cursor-pointer group mb-4"
              >
                <img
                  src={crs.featuredImageUrl}
                  alt={crs.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-white/90 text-slate-900 text-[10px] font-black shadow-xs whitespace-nowrap">
                    {crs.ageRangeFa}
                  </span>
                </div>
                <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 text-amber-300 text-[10px] font-bold font-mono whitespace-nowrap" dir="ltr">
                  {crs.sessionsCount} Sessions
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-blue-700">
                  {crs.category}
                </div>

                <h3
                  onClick={() => navigateStore(`/courses/${crs.id}`)}
                  className="text-sm sm:text-base font-black text-slate-900 hover:text-blue-600 cursor-pointer leading-snug line-clamp-1"
                >
                  {crs.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {crs.summaryFa}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-slate-400 font-sans">شهریه با تخفیف زودهنگام:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {formatToman(crs.tuitionEarlyBirdToman)}
                  </span>
                </div>
                <span className="text-[11px] line-through text-slate-400">
                  {formatToman(crs.tuitionApprovedToman)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigateStore(`/courses/${crs.id}`)}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs text-center cursor-pointer transition-colors whitespace-nowrap"
                >
                  مشاهده سرفصل
                </button>

                <button
                  type="button"
                  onClick={() => handleEnroll(crs, 'early')}
                  className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                  <span>ثبت‌نام سریع</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =====================================================================
          EMBEDDED OFFICIAL TUITION CALCULATOR & REGISTRATION CALENDAR IN /COURSES
          ===================================================================== */}
      {(() => {
        const calcCourse =
          allCourses.find((c) => String(c.id) === String(calcCourseId)) || allCourses[0];
        let unitTuition = calcCourse.tuitionApprovedToman;
        let calcPlanTitle = 'شهریه مصوب استاندارد';
        if (calcPlan === 'early') {
          unitTuition = calcCourse.tuitionEarlyBirdToman;
          calcPlanTitle = 'تخفیف ثبت‌نام زودهنگام (یک‌مرحله‌ای)';
        } else if (calcPlan === 'normal') {
          unitTuition = calcCourse.tuitionNormalToman;
          calcPlanTitle = 'تخفیف ثبت‌نام به‌موقع (دو‌مرحله‌ای)';
        } else if (calcPlan === 'private') {
          unitTuition = calcCourse.tuitionPrivateToman;
          calcPlanTitle = 'کلاس خصوصی ۱ تا ۳ نفره';
        }
        const siblingMult = calcSiblings > 1 ? 0.95 : 1;
        const finalTuition = Math.round(unitTuition * calcSiblings * siblingMult);

        return (
          <section id="tuition-calculator-section" className="pt-6 space-y-6">
            <div className="bg-gradient-to-l from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-blue-500/30 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="space-y-1 text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>محاسبه‌گر رسمی شهریه و تقویم ثبت‌نام ۱۵ دوره مصوب</span>
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
                    محاسبه آنلاین شهریه، تخفیف‌های زودهنگام و تخفیف خواهر و برادر
                  </h2>
                  <p className="text-xs text-slate-300">
                    مطابق تابلوی رسمی نرخ‌نامه آموزشگاه رباتیک فاتحان، دوره و نوع ثبت‌نام خود را انتخاب نمایید:
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigateStore('/free-courses')}
                  className="px-4 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Gift className="w-4 h-4" />
                  <span>مشاهده دوره‌های رایگان فاتحان</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center text-right">
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-cyan-300 mb-1.5">
                      ۱. انتخاب دوره از لیست ۱۵ دوره مصوب:
                    </label>
                    <select
                      value={calcCourseId}
                      onChange={(e) => setCalcCourseId(e.target.value)}
                      className="w-full rounded-2xl bg-slate-900 border border-slate-700 text-white px-4 py-3 text-xs sm:text-sm font-bold focus:outline-none focus:border-cyan-400"
                    >
                      {allCourses.map((crs) => (
                        <option key={crs.id} value={crs.id}>
                          {crs.title} · {crs.ageRangeFa} ({crs.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cyan-300 mb-1.5">
                      ۲. انتخاب طرح پرداخت و تخفیف:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'early', label: 'تخفیف زودهنگام', desc: 'یک‌مرحله‌ای' },
                        { id: 'normal', label: 'ثبت‌نام به‌موقع', desc: 'دو‌مرحله‌ای' },
                        { id: 'approved', label: 'شهریه مصوب', desc: 'نرخ پایه' },
                        { id: 'private', label: 'کلاس خصوصی', desc: '۱ تا ۳ نفر' },
                      ].map((pl) => (
                        <button
                          key={pl.id}
                          type="button"
                          onClick={() => setCalcPlan(pl.id as any)}
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            calcPlan === pl.id
                              ? 'bg-amber-400 text-slate-950 border-amber-400 font-black shadow-md'
                              : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/15'
                          }`}
                        >
                          <div className="text-xs font-black">{pl.label}</div>
                          <div className="text-[10px] opacity-80 mt-0.5">{pl.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-white">تعداد کارآموزان همزمان (تخفیف خانواده):</div>
                      <div className="text-[11px] text-slate-300">
                        برای ثبت‌نام همزمان ۲ فرزند یا بیشتر، ۵٪ تخفیف مازاد خانوادگی کسر می‌گردد.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCalcSiblings((c) => Math.max(1, c - 1))}
                        className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-600 text-white font-black cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono text-sm font-black px-2 text-amber-400">
                        {formatPersianNumber(calcSiblings)} نفر
                      </span>
                      <button
                        type="button"
                        onClick={() => setCalcSiblings((c) => Math.min(4, c + 1))}
                        className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-600 text-white font-black cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-6 space-y-4 shadow-xl">
                  <div className="border-b border-slate-100 pb-3 space-y-1">
                    <div className="text-[11px] font-extrabold text-blue-600">{calcPlanTitle}</div>
                    <div className="text-base sm:text-lg font-black text-slate-900">{calcCourse.title}</div>
                    <div className="text-xs text-slate-500">
                      {`${formatPersianNumber(calcCourse.sessionsCount || 14)} جلسه عملی`} · رده سنی: {calcCourse.ageRangeFa}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">مبلغ نهایی قابل پرداخت:</div>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-blue-700">
                      {formatToman(finalTuition)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      معادل ریالی: {formatPersianNumber(finalTuition * 10)} ریال
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEnroll(calcCourse, calcPlan)}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/25 transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>افزودن دوره به سبد ثبت‌نام آنلاین</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })()}
    </div>
  );
};

// ============================================================================
// 2. DEDICATED TUITION CALCULATOR PAGE (/calculator)
// ============================================================================
export const FatehanTuitionCalculatorPage: React.FC = () => {
  const { state, navigateStore, addToCart, notify } = useFatehanTheme();
  const calcBlk = (state?.builderBlocks || []).find((b) => b.id === 'BLK-CALC-MAIN');

  const coursesList: FatehanCourse[] = useMemo(() => {
    if (state?.courses && state.courses.length > 0) {
      return state.courses as unknown as FatehanCourse[];
    }
    return DEFAULT_FALLBACK_COURSES;
  }, [state?.courses]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(coursesList[0]?.id || 'CRS-ROBO-1');
  const [selectedPlan, setSelectedPlan] = useState<'early' | 'normal' | 'approved' | 'private'>('early');
  const [siblingsCount, setSiblingsCount] = useState<number>(1);

  const course = useMemo(() => {
    return coursesList.find((c) => c.id === selectedCourseId) || coursesList[0];
  }, [selectedCourseId, coursesList]);

  let unitPrice = course.tuitionApprovedToman;
  let planLabel = 'شهریه مصوب';

  if (selectedPlan === 'early') {
    unitPrice = course.tuitionEarlyBirdToman;
    planLabel = 'تخفیف زودهنگام یک‌مرحله‌ای';
  } else if (selectedPlan === 'normal') {
    unitPrice = course.tuitionNormalToman;
    planLabel = 'تخفیف ثبت‌نام به‌موقع (دو‌مرحله‌ای)';
  } else if (selectedPlan === 'private') {
    unitPrice = course.tuitionPrivateToman;
    planLabel = 'کلاس خصوصی ۱ تا ۳ نفره';
  }

  // Sibling discount (5% extra for 2+ kids)
  const siblingMultiplier = siblingsCount > 1 ? 0.95 : 1.0;
  const totalPriceToman = Math.round(unitPrice * siblingsCount * siblingMultiplier);

  const handleEnroll = () => {
    const courseProduct: ProductItem = {
      id: `ENR-${course.id}-${selectedPlan}-${siblingsCount}`,
      sku: `ENR-${course.code}`,
      name: `ثبت‌نام ${course.title} (${planLabel} - ${formatPersianNumber(siblingsCount)} نفر)`,
      type: 'دوره آموزشی حضوری',
      category: 'ثبت‌نام دوره‌های آموزشی',
      featuredImageUrl: course.featuredImageUrl,
      priceToman: course.tuitionApprovedToman * siblingsCount,
      salePriceToman: totalPriceToman,
      stock: 10,
      salesCount: 40,
      status: 'In Stock',
      warranty: 'تضمین کیفیت آموزشگاه فاتحان',
      specs: `${course.sessionsCount} جلسه / رده سنی: ${course.ageRangeFa}`,
    };

    addToCart(courseProduct, undefined, 1, true);
    notify(`دوره «${course.title}» برای ${formatPersianNumber(siblingsCount)} نفر به سبد خرید افزوده شد.`);
  };

  return (
    <div className="py-4 sm:py-6 space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 whitespace-nowrap">
          <button
            type="button"
            onClick={() => navigateStore('/')}
            className="text-slate-700 hover:text-blue-600 cursor-pointer whitespace-nowrap"
          >
            صفحه اصلی
          </button>
          <span>/</span>
          <span className="text-slate-900 font-black whitespace-nowrap">محاسبه‌گر رسمی شهریه و تخفیف‌ها</span>
        </div>

        <button
          type="button"
          onClick={() => navigateStore('/courses')}
          className="text-xs font-bold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
        >
          مشاهده همه دوره‌ها ←
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-right">
        {/* Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="space-y-1">
            <span className="text-xs font-bold text-blue-700">
              {calcBlk?.highlightWord || 'سامانه شفاف مالی آموزشگاه فاتحان'}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {calcBlk?.heading || 'محاسبه‌گر هوشمند شهریه و بسته‌های تخفیف ویژه'}
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              {calcBlk?.subheading || 'بر اساس تابلوی نرخ‌نامه مصوب آموزشگاه، دوره و نوع ثبت‌نام را انتخاب کنید:'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ۱. انتخاب دوره آموزشی:
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 px-4 py-3 text-xs sm:text-sm font-bold focus:outline-none focus:border-blue-600"
            >
              {coursesList.map((crs) => (
                <option key={crs.id} value={crs.id}>
                  {crs.title} · {crs.ageRangeFa} ({crs.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ۲. نوع ثبت‌نام و طرح تخفیف:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'early', label: 'تخفیف زودهنگام', desc: 'یک‌مرحله‌ای' },
                { id: 'normal', label: 'ثبت‌نام به‌موقع', desc: 'دو‌مرحله‌ای' },
                { id: 'approved', label: 'شهریه مصوب', desc: 'نرخ پایه' },
                { id: 'private', label: 'کلاس خصوصی', desc: '۱ تا ۳ نفر' },
              ].map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => setSelectedPlan(pl.id as any)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedPlan === pl.id
                      ? 'bg-blue-600 text-white border-blue-600 font-black shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold whitespace-nowrap">{pl.label}</div>
                  <div className="text-[10px] opacity-80 mt-0.5 whitespace-nowrap">{pl.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Siblings Stepper */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-slate-900">تعداد فرزندان همزمان:</div>
              <div className="text-[11px] text-slate-500">برای ۲ فرزند یا بیشتر، ۵٪ تخفیف مازاد خانوادگی لحاظ می‌شود.</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSiblingsCount((c) => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 font-black text-sm flex items-center justify-center cursor-pointer hover:bg-slate-100"
              >
                -
              </button>
              <span className="font-mono text-sm font-black px-2">{formatPersianNumber(siblingsCount)}</span>
              <button
                type="button"
                onClick={() => setSiblingsCount((c) => Math.min(4, c + 1))}
                className="w-8 h-8 rounded-xl bg-white border border-slate-300 font-black text-sm flex items-center justify-center cursor-pointer hover:bg-slate-100"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Card (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 space-y-5 shadow-lg">
          <div className="space-y-1 pb-3 border-b border-slate-800">
            <div className="text-[11px] text-amber-400 font-bold">{planLabel}</div>
            <div className="text-base sm:text-lg font-black">{course.title}</div>
            <div className="text-xs text-slate-400">{course.ageRangeFa}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-400">مجموع قابل پرداخت:</div>
            <div className="flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">
                {formatToman(totalPriceToman)}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              معادل ریالی: {formatPersianNumber(totalPriceToman * 10)} ریال
            </div>
          </div>

          <button
            type="button"
            onClick={handleEnroll}
            className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>ثبت‌نام دوره با این مبلغ و رفتن به سبد خرید</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. DEDICATED ROBOT & CODING LAB PAGE (/lab)
// ============================================================================
export const FatehanSimulatorPage: React.FC = () => {
  const { navigateStore, notify } = useFatehanTheme();

  const [robotPos, setRobotPos] = useState<{ x: number; y: number }>({ x: 0, y: 3 });
  const [collectedGears, setCollectedGears] = useState<number[]>([]);
  const [simSteps, setSimSteps] = useState<number>(0);
  const [simMessage, setSimMessage] = useState<string>('ربات در نقطه شروع آماده دریافت فرمان است.');

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
      return;
    }

    if (obstacles.some((o) => o.x === nx && o.y === ny)) {
      setSimMessage('⚡ مانع ولتاژ و برخورد! ربات به مسیر امن برگشت.');
      return;
    }

    setRobotPos({ x: nx, y: ny });
    setSimSteps((s) => s + 1);

    const hitGear = gears.find((g) => g.x === nx && g.y === ny && !collectedGears.includes(g.id));
    if (hitGear) {
      setCollectedGears((prev) => [...prev, hitGear.id]);
      setSimMessage('⚙️ عالی! یک چرخ‌دنده مهارت دریافت شد!');
    } else if (nx === flagPos.x && ny === flagPos.y) {
      setSimMessage('🏆 تبریک! ربات فاتحان به قله افتخار رسید!');
      notify('آفرین! ماموریت ربات با موفقیت انجام شد 🚩');
    } else {
      setSimMessage(`فرمان اجرا شد: ${actionName}`);
    }
  };

  const handleSimReset = () => {
    setRobotPos({ x: 0, y: 3 });
    setCollectedGears([]);
    setSimSteps(0);
    setSimMessage('ربات در نقطه شروع قرار گرفت.');
  };

  const handleSimAuto = () => {
    handleSimReset();
    const route = [
      { dx: 0, dy: -1, name: 'حرکت به بالا' },
      { dx: 0, dy: -1, name: 'حرکت به بالا' },
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

  return (
    <div className="py-4 sm:py-6 space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 whitespace-nowrap">
          <button
            type="button"
            onClick={() => navigateStore('/')}
            className="text-slate-700 hover:text-blue-600 cursor-pointer whitespace-nowrap"
          >
            صفحه اصلی
          </button>
          <span>/</span>
          <span className="text-slate-900 font-black whitespace-nowrap">آزمایشگاه و شبیه‌ساز تعاملی رباتیک</span>
        </div>

        <button
          type="button"
          onClick={() => navigateStore('/courses')}
          className="text-xs font-bold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
        >
          ثبت‌نام دوره‌های کدنویسی ←
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center text-right">
        {/* Simulator Grid */}
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
                    {isRobot ? '🤖' : isFlag ? '🚩' : isObs ? '⚡' : gearItem && !isCollected ? '⚙️' : '•'}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
            <span>{simMessage}</span>
            <span className="font-mono text-blue-700">گام‌ها: {formatPersianNumber(simSteps)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-black text-slate-900">فرمان‌های ناوبری ربات فاتحان</h2>
          <div className="grid grid-cols-3 gap-2">
            <div />
            <button
              type="button"
              onClick={() => handleSimMove(0, -1, 'حرکت به بالا')}
              className="py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <ArrowUp className="w-4 h-4" />
              <span>بالا</span>
            </button>
            <div />

            <button
              type="button"
              onClick={() => handleSimMove(-1, 0, 'حرکت به راست')}
              className="py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <ArrowRight className="w-4 h-4" />
              <span>راست</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimMove(0, 1, 'حرکت به پایین')}
              className="py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <ArrowDown className="w-4 h-4" />
              <span>پایین</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimMove(1, 0, 'حرکت به چپ')}
              className="py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>چپ</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={handleSimAuto}
              className="py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Bot className="w-4 h-4" />
              <span>الگوریتم خودکار هوشمند</span>
            </button>

            <button
              type="button"
              onClick={handleSimReset}
              className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>شروع مجدد</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. DEDICATED CONTACT & CAMPUS VISIT PAGE (/contact)
// ============================================================================
export const FatehanContactPage: React.FC = () => {
  const { state, settings, adapter, navigateStore, notify } = useFatehanTheme();
  const contactMainBlk = (state?.builderBlocks || []).find((b) => b.id === 'BLK-CONTACT-MAIN');
  const homeContactBlk = (state?.builderBlocks || []).find((b) => b.id === 'BLK-HOME-CONTACT');

  const igHandle = (state?.typography?.instagramId || settings.social.instagramId || 'fatehan.robot').replace(/^@/, '');
  const igUrl = state?.typography?.instagramUrl || settings.social.instagramUrl || `https://instagram.com/${igHandle}`;
  const eitaaHandle = (state?.typography?.eitaaId ?? settings.social.eitaaId ?? 'fatehan_robotics').replace(/^@/, '').trim();
  const eitaaUrl = state?.typography?.eitaaUrl || settings.social.eitaaUrl || (eitaaHandle ? `https://eitaa.com/${eitaaHandle}` : '');
  const eitaaLogoUrl = (state?.typography?.eitaaLogoUrl || settings.social.eitaaLogoUrl || '').trim();

  // Prefer BLK-CONTACT-MAIN if it has the 4th item or modified items, otherwise fall back to BLK-HOME-CONTACT
  const activeContactItems =
    contactMainBlk?.itemsList && contactMainBlk.itemsList.length >= 4
      ? contactMainBlk.itemsList
      : homeContactBlk?.itemsList && homeContactBlk.itemsList.length > 0
      ? homeContactBlk.itemsList
      : contactMainBlk?.itemsList || [];

  const phone1Num = activeContactItems[0]?.title || settings.phones.primaryFormatted;
  const phone1Clean = phone1Num.replace(/\s+/g, '');
  const phone1Label = activeContactItems[0]?.subtitle || settings.phones.primaryLabel || 'خط ۱ مشاوره و ثبت‌نام';

  const phone2Num = activeContactItems[1]?.title || settings.phones.secondaryFormatted;
  const phone2Clean = phone2Num.replace(/\s+/g, '');
  const phone2Label = activeContactItems[1]?.subtitle || settings.phones.secondaryLabel || 'خط ۲ پشتیبانی کارگاه';

  const landlineNum = activeContactItems[2]?.title || settings.phones.landlineFormatted;
  const landlineClean = landlineNum.replace(/\s+/g, '');
  const landlineLabel = activeContactItems[2]?.subtitle || settings.phones.landlineLabel || 'تلفن ثابت دفتر مرکزی';

  const addressTitleLabel =
    activeContactItems[3]?.badge && activeContactItems[3].badge !== 'آدرس کارگاه'
      ? activeContactItems[3].badge
      : `آدرس ${settings.academyNameFa}:`;
  const addressExactText =
    activeContactItems[3]?.title ||
    homeContactBlk?.itemsList?.[3]?.title ||
    settings.location.addressFull;
  const addressHoursText =
    activeContactItems[3]?.subtitle ||
    homeContactBlk?.itemsList?.[3]?.subtitle ||
    settings.location.workingHours;
  const extraContactItems = activeContactItems.slice(4);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dept, setDept] = useState('رباتیک');
  const [childAge, setChildAge] = useState('۹ سال');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      notify(`${label} با موفقیت کپی شد.`);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      notify(`کپی نشد: ${text}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      notify('لطفاً نام و شماره تماس را وارد کنید.');
      return;
    }
    if (adapter.submitConsultationLead) {
      await adapter.submitConsultationLead({
        studentName: name.trim(),
        phone: phone.trim(),
        department: dept,
        ageGroup: childAge,
        note: note.trim(),
      });
    }
    setSubmitted(true);
    notify('درخواست مشاوره حضوری شما ثبت شد. کارشناسان ما به زودی با شما تماس می‌گیرند.');
  };

  return (
    <div className="py-4 sm:py-6 space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 whitespace-nowrap">
          <button
            type="button"
            onClick={() => navigateStore('/')}
            className="text-slate-700 hover:text-blue-600 cursor-pointer whitespace-nowrap"
          >
            صفحه اصلی
          </button>
          <span>/</span>
          <span className="text-slate-900 font-black whitespace-nowrap">ارتباط با آموزشگاه و آدرس کارگاه</span>
        </div>

        <a
          href={`tel:${phone1Clean}`}
          className="text-xs font-bold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
          dir="ltr"
        >
          {phone1Num}
        </a>
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200/90 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch text-right">
        {/* Right Column in RTL: Booking Form (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100/90 text-amber-900 text-xs font-black mb-3">
              <span>📞 {contactMainBlk?.highlightWord || 'با ما در ارتباط باشید'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              {contactMainBlk?.heading || 'رزرو مشاوره رایگان و جلسه آشنایی با کارگاه'}
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-2">
              {contactMainBlk?.subheading || 'مشخصات دانش‌آموز را وارد کنید تا کارشناسان آموزشگاه فاتحان در کمتر از ۲ ساعت با شما تماس بگیرند و بهترین مسیر آموزشی را معرفی کنند.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 text-base font-black">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>درخواست مشاوره «{name}» با موفقیت ثبت شد!</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  مشاوران آموزشگاه فاتحان ظرف کمتر از ۲ ساعت با شماره {phone} تماس حاصل خواهند کرد.
                </p>
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
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
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
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
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
                      value={childAge}
                      onChange={(e) => setChildAge(e.target.value)}
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
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="اگر فرزندتان قبلاً تجربه شرکت در کلاس‌های رباتیک یا کدنویسی را داشته بنویسید..."
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-black text-sm sm:text-base shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span>{contactMainBlk?.ctaPrimary || 'ثبت درخواست مشاوره و تعیین سطح رایگان'} ←</span>
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

        {/* Left Column in RTL: Dark Navy Contact Card (5 Cols) - Connected Live to Page Builder */}
        <div className="lg:col-span-5 bg-[#0c1427] border border-slate-800 text-white rounded-[2rem] p-6 sm:p-7 space-y-4 shadow-xl flex flex-col justify-between">
          {/* Top Bar with Badge & Academy Slug */}
          <div className="flex items-center justify-between gap-2">
            <div className="px-3.5 py-1.5 rounded-full bg-[#facc15] text-slate-950 font-black text-xs inline-flex items-center shadow-xs whitespace-nowrap">
              اطلاعات تماس و آدرس دقیق
            </div>
            <span className="text-[#22d3ee] font-mono font-bold text-xs tracking-wider" dir="ltr">
              FATEHAN ACADEMY
            </span>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1.5 text-right">
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {contactMainBlk?.ctaSecondary && contactMainBlk.ctaSecondary !== 'کپی آدرس کارگاه'
                ? contactMainBlk.ctaSecondary
                : homeContactBlk?.ctaSecondary || 'منتظر دیدار شما در کارگاه رباتیک فاتحان هستیم!'}
            </h3>
            <p className="text-[#38bdf8] text-xs font-bold pt-1">
              شماره‌های تماس مستقیم و واتساپ:
            </p>
          </div>

          {/* Interactive Contact Cards — Left-Aligned LTR Numbers/IDs & Right-Aligned RTL Subtitles */}
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
                  <div className="text-slate-400 text-[11px] font-medium mt-0.5 text-right" dir="rtl">
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
                  <div className="text-slate-400 text-[11px] font-medium mt-0.5 text-right" dir="rtl">
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
                  <div className="text-slate-400 text-[11px] font-medium mt-0.5 text-right" dir="rtl">
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
                  <div className="text-slate-400 text-[11px] font-medium mt-0.5 text-right" dir="rtl">
                    صفحه رسمی اینستاگرام {settings.academyNameFa}
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
                    <div className="text-slate-400 text-[11px] font-medium mt-0.5 text-right" dir="rtl">
                      کانال رسمی ایتا {settings.academyNameFa}
                    </div>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md overflow-hidden p-1.5">
                    {eitaaLogoUrl ? (
                      <img
                        src={eitaaLogoUrl}
                        alt="لوگوی کانال ایتا"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Send className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Extra Custom Items Added by Admin */}
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

            {/* Address Card — Connected Live to Page Builder */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-amber-400 font-bold text-xs">{addressTitleLabel}</div>
                  <div className="text-white font-bold text-xs leading-relaxed">
                    {addressExactText}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{addressHoursText}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(addressExactText, 'addr', 'آدرس آموزشگاه')}
                  className="text-[#22d3ee] font-bold hover:underline cursor-pointer"
                >
                  {copiedKey === 'addr' ? 'کپی شد!' : 'کپی آدرس'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. DEDICATED FREE COURSES LANDING PAGE (/free-courses) — CONFIGURABLE 2/3/4 COLUMNS IN ADMIN (IMAGE 10)
// ============================================================================
export const FatehanFreeCoursesPage: React.FC = () => {
  const { state, navigateStore, notify } = useFatehanTheme();
  const [selectedFreeCourse, setSelectedFreeCourse] = useState<any | null>(null);
  const [studentName, setStudentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentAge, setStudentAge] = useState('۱۱ تا ۱۴ سال');
  const [enrolledSuccess, setEnrolledSuccess] = useState(false);

  const freeCourses = useMemo(() => {
    if (state?.freeCourses && state.freeCourses.length > 0) {
      return state.freeCourses;
    }
    return DEFAULT_FALLBACK_FREE_COURSES;
  }, [state?.freeCourses]);

  // Page layout & content settings editable in Admin (2, 3, or 4 columns)
  const pageConfig = state?.freeCoursesPage || {
    gridColumns: 2,
    heroBadge: 'آموزش رایگان آکادمی رباتیک و هوش مصنوعی فاتحان',
    heroTitle: 'دوره رایگان هوش مصنوعی، رباتیک و کدنویسی',
    heroDescription:
      'در دوره‌های رایگان آکادمی فاتحان، با انجام ۴ پروژه عملی و کاربردی، مسیر ورود به دنیای هوش مصنوعی، ساخت ربات و برنامه‌نویسی را به ساده‌ترین و جذاب‌ترین شکل تجربه کنید!',
    heroCtaText: 'ثبت نام دوره رایگان',
    listSectionTitle: 'لیست کارگاه‌ها و دوره‌های رایگان آکادمی فاتحان',
    listSectionSubtitle: 'هر یک از دوره‌های رایگان زیر شامل پروژه‌های عملی گام‌به‌گام است:',
  };

  const gridColsClass =
    pageConfig.gridColumns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : pageConfig.gridColumns === 3
      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2';

  const handleRegisterFree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !parentPhone.trim()) {
      notify('لطفاً نام دانش‌آموز و شماره تماس والدین را وارد نمایید.');
      return;
    }
    setEnrolledSuccess(true);
    notify(`🎉 ثبت‌نام دوره رایگان برای «${studentName}» با موفقیت انجام شد!`);
  };

  return (
    <div className="py-5 space-y-8" dir="rtl">
      {/* Breadcrumb */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigateStore('/')}
            className="hover:text-blue-600 font-bold cursor-pointer"
          >
            صفحه اصلی
          </button>
          <span>/</span>
          <span className="font-extrabold text-slate-900">آموزش رایگان آکادمی فاتحان</span>
        </div>

        <button
          type="button"
          onClick={() => navigateStore('/courses')}
          className="text-blue-600 font-extrabold hover:underline cursor-pointer"
        >
          مشاهده ۱۵ دوره تخصصی حضوری ←
        </button>
      </div>

      {/* Hero Banner (Simulator Test Button Removed per Image 10 Request) */}
      <section className="relative rounded-[2.5rem] bg-gradient-to-l from-[#eef7ff] via-[#f5faff] to-[#e0f2fe] border-2 border-cyan-200/80 p-6 sm:p-12 overflow-hidden shadow-md">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Right 7 Cols: Title, 4 Practical Projects Subtitle & Single Clean CTA Button */}
          <div className="lg:col-span-7 space-y-5 text-right">
            <div className="inline-block border-b-2 border-cyan-500 pb-1.5">
              <span className="text-sm sm:text-base font-extrabold text-slate-700">
                {pageConfig.heroBadge}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
              {pageConfig.heroTitle.includes('رایگان') ? (
                <>
                  {pageConfig.heroTitle.split('رایگان')[0]}
                  <span className="text-cyan-600">رایگان</span>
                  {pageConfig.heroTitle.split('رایگان').slice(1).join('رایگان')}
                </>
              ) : (
                pageConfig.heroTitle
              )}
            </h1>

            <p className="text-xs sm:text-base text-slate-600 leading-relaxed max-w-2xl font-medium">
              {pageConfig.heroDescription}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedFreeCourse(freeCourses[0]);
                  setEnrolledSuccess(false);
                }}
                className="px-8 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-sm sm:text-base shadow-lg shadow-cyan-600/25 cursor-pointer transition-all"
              >
                {pageConfig.heroCtaText || 'ثبت نام دوره رایگان'}
              </button>
            </div>

            <div className="pt-3 flex flex-wrap items-center gap-5 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>بدون نیاز به پیش‌زمینه قبلی</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>همراه با جلسه استعدادیابی حضوری رایگان</span>
              </span>
            </div>
          </div>

          {/* Left 5 Cols: 3D Robot + Code Graphic (< / >) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative bg-white/90 backdrop-blur-md border-2 border-cyan-200 rounded-3xl p-6 shadow-xl max-w-sm w-full text-center space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-xs font-black">
                  🎁 ۴ پروژه عملی رایگان
                </span>
                <span className="font-mono text-2xl font-black text-cyan-500" dir="ltr">
                  &lt;/&gt;
                </span>
              </div>

              <img
                src="/assets/kits/kit-01.jpg"
                alt="دوره رایگان هوش مصنوعی و رباتیک فاتحان"
                className="w-full h-48 object-cover rounded-2xl border border-slate-200"
              />

              <div className="space-y-1">
                <div className="text-sm font-black text-slate-900">
                  شروع مسیر مهندسان و برنامه‌نویسان فردا
                </div>
                <div className="text-xs text-slate-500">
                  ویژه سنین ۶ تا ۱۸ سال · حضوری و آنلاین
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Courses Grid — Dynamically 2, 3, or 4 Columns per Row from Admin */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900">
              {pageConfig.listSectionTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {pageConfig.listSectionSubtitle}
            </p>
          </div>
        </div>

        <div className={`grid ${gridColsClass} gap-6`}>
          {freeCourses.map((fc: any, idx: number) => {
            const projects: string[] = fc.projects || fc.projectsList || [
              'پروژه اول: آشنایی عملی با اجزای ربات و هوش مصنوعی',
              'پروژه دوم: طراحی الگوریتم تصمیم‌گیری هوشمند',
              'پروژه سوم: پیاده‌سازی و تست عملی پروژه',
              'پروژه چهارم: دریافت گواهی شرکت در کارگاه مقدماتی',
            ];
            return (
              <div
                key={fc.id || idx}
                className="bg-white border-2 border-slate-200 hover:border-cyan-500 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xs hover:shadow-lg transition-all"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                      {fc.badge || '۱۰۰٪ رایگان'}
                    </span>
                    <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-xl border border-cyan-200">
                      رده سنی: {fc.ageRange}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-xl font-black text-slate-900 leading-snug">
                    {fc.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {fc.description || fc.subtitle}
                  </p>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-black text-slate-900">
                      پروژه‌های عملی این دوره رایگان ({formatPersianNumber(fc.projectsCount || projects.length)} پروژه):
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {projects.map((prj, i) => (
                        <li key={i} className="flex items-center gap-2 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                          <span>{prj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-500">
                    مدت زمان: {fc.duration || fc.durationText || '۴ جلسه عملی'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFreeCourse(fc);
                      setEnrolledSuccess(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black cursor-pointer transition-colors shadow-sm"
                  >
                    {fc.ctaText || 'ثبت نام دوره رایگان ←'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Free Course Registration Modal */}
      <AnimatePresence>
        {selectedFreeCourse && (
          <div
            onClick={() => setSelectedFreeCourse(null)}
            className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border-2 border-cyan-300 shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-black text-cyan-600">ثبت‌نام آنی و رایگان</span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {selectedFreeCourse.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFreeCourse(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {enrolledSuccess ? (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <div className="text-sm font-black">
                    ثبت‌نام «{studentName}» در دوره رایگان با موفقیت انجام شد!
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    لینک دسترسی و هماهنگی جلسه معارفه حضوری به شماره همراه {parentPhone} ارسال می‌گردد.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFreeCourse(null)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black cursor-pointer"
                  >
                    بستن پنجره
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRegisterFree} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      نام و نام خانوادگی دانش‌آموز *:
                    </label>
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="مثلاً: امیرعلی رضایی"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      شماره موبایل والدین *:
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      required
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="0912..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رده سنی دانش‌آموز:
                    </label>
                    <select
                      value={studentAge}
                      onChange={(e) => setStudentAge(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                    >
                      <option value="۶ تا ۹ سال (دبستان)">۶ تا ۹ سال (دبستان)</option>
                      <option value="۱۰ تا ۱۴ سال (متوسطه اول)">۱۰ تا ۱۴ سال (متوسطه اول)</option>
                      <option value="۱۵ تا ۱۸ سال (متوسطه دوم)">۱۵ تا ۱۸ سال (متوسطه دوم)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs sm:text-sm cursor-pointer shadow-md"
                  >
                    تایید و ثبت‌نام رایگان در این دوره ←
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// 6. DEDICATED SHAREABLE & SEO-OPTIMIZED ABOUT US PAGE (/about)
// ============================================================================
export const FatehanAboutPage: React.FC = () => {
  const { state, navigateStore, notify } = useFatehanTheme();
  const [copiedLink, setCopiedLink] = useState(false);

  const about = state?.aboutPage || {
    heroBadge: 'درباره آموزشگاه تخصصی رباتیک فاتحان · معرفی رسمی ویژه والدین، مدارس و سازمان‌ها',
    title: 'آموزشگاه تخصصی رباتیک، کدنویسی و هوش مصنوعی فاتحان؛ مرکز رسمی مهارت‌آموزی و استعدادیابی نسل آینده',
    subtitle: 'دارای مجوز رسمی، ۵ دپارتمان تخصصی کارگاهی و سابقه درخشان در مسابقات کشوری رباتیک و خوارزمی',
    introParagraph:
      'آموزشگاه تخصصی رباتیک فاتحان در شهر جدید اندیشه، با هدف تبدیل کودکان و نوجوانان ۶ تا ۱۸ سال از مصرف‌کنندگان صرف تکنولوژی به خالقان فناوری، مهندسان خلاق و برنامه‌نویسان پیشرو تاسیس شده است.',
    missionStatement:
      'ماموریت راهبردی آکادمی فاتحان بر پایه شعار «رباتیک فقط یک رشته نیست... یک مهارت زندگی است» بنا شده است؛ ما باور داریم تقویت تفکر الگوریتمی، حل مسئله، کار تیمی و شجاعت ساختن، مهم‌ترین سرمایه هر دانش‌آموز برای موفقیت تحصیلی و شغلی در آینده است.',
    institutionalPitch:
      'آمادگی کامل جهت عقد تفاهم‌نامه و همکاری رسمی با مدارس دولتی و غیردولتی، پژوهش‌سراهای دانش‌آموزی، مراکز فرهنگی و سازمان‌ها جهت برگزاری کارگاه‌های تخصصی رباتیک، هوش مصنوعی، برنامه‌نویسی و آماده‌سازی تیم‌های المپیاد و جشنواره خوارزمی.',
    highlights: [
      {
        title: '۱۵ دوره مصوب و استاندارد از ۶ تا ۱۸ سال',
        description: 'سرفصل‌های گام‌به‌گام از کودک خلاق و مکانیک پایه تا الکترونیک، بردهای هوشمند ARC، آردوینو، پایتون و طراحی سه‌بعدی SolidWorks.',
        badge: 'سرفصل علمی استاندارد',
      },
      {
        title: 'کارگاه‌های مجهز به پرینتر سه‌بعدی و ابزار دقیق',
        description: 'تمامی کلاس‌ها ۱۰۰٪ عملی بوده و کارآموزان به پرینترهای سه‌بعدی صنعتی، ایستگاه‌های الکترونیک ایمن و کیت‌های استاندارد دسترسی دارند.',
        badge: 'آموزش ۱۰۰٪ کارگاهی',
      },
      {
        title: 'همکاری رسمی با مدیران مدارس و مراکز آموزشی',
        description: 'اعزام اساتید مجرب، تامین کیت‌های آموزشی استاندارد با نرخ نمایندگی و برگزاری مسابقات داخلی ویژه مدارس منطقه.',
        badge: 'ویژه مدارس و سازمان‌ها',
      },
      {
        title: 'اعطای گواهینامه معتبر و رزومه‌سازی علمی',
        description: 'ارائه گواهی پایان دوره معتبر برای تمامی سطوح و هدایت تیم‌های برتر به مسابقات ملی رباتیک و جشنواره‌های نوآوری.',
        badge: 'گواهینامه معتبر',
      },
    ],
    seoTitle: 'درباره آموزشگاه رباتیک فاتحان اندیشه | مرکز تخصصی رباتیک، کدنویسی و هوش مصنوعی',
    seoDescription:
      'آشنایی کامل با آموزشگاه تخصصی رباتیک فاتحان در اندیشه فاز ۱؛ برگزارکننده ۱۵ دوره عملی رباتیک، برنامه‌نویسی، الکترونیک و چاپ سه‌بعدی ویژه سنین ۶ تا ۱۸ سال و همکار رسمی مدارس.',
    focusKeyword: 'آموزشگاه رباتیک فاتحان اندیشه',
    slug: 'about',
  };

  const handleCopyShareUrl = () => {
    const shareUrl = `${window.location.origin}/about`;
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      notify('لینک مستقیم صفحه «درباره ما» جهت ارسال برای مدیران و همکاران کپی شد.');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      notify(shareUrl);
    }
  };

  return (
    <div className="py-5 space-y-8" dir="rtl">
      {/* Top Breadcrumb + Shareable Link Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <button
            type="button"
            onClick={() => navigateStore('/')}
            className="hover:text-blue-600 font-bold cursor-pointer"
          >
            صفحه اصلی
          </button>
          <span>/</span>
          <span className="font-extrabold text-slate-900">درباره آموزشگاه رباتیک فاتحان (/about)</span>
        </div>

        <button
          type="button"
          onClick={handleCopyShareUrl}
          className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copiedLink ? 'لینک صفحه کپی شد!' : 'کپی لینک مستقیم معرفی آموزشگاه'}</span>
        </button>
      </div>

      {/* Hero Official Introduction Card */}
      <section className="bg-gradient-to-l from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
          <Building2 className="w-4 h-4" />
          <span>{about.heroBadge}</span>
        </div>

        <h1 className="text-xl sm:text-3xl lg:text-4xl font-black leading-snug text-white">
          {about.title}
        </h1>

        <p className="text-xs sm:text-base text-cyan-300 font-bold leading-relaxed">
          {about.subtitle}
        </p>

        <div className="p-5 rounded-2xl bg-white/10 border border-white/15 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3">
          <p>{about.introParagraph}</p>
          <p className="text-amber-300 font-bold">{about.missionStatement}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigateStore('/courses')}
            className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm cursor-pointer transition-all"
          >
            مشاهده ۱۵ دوره مصوب و جدول شهریه ←
          </button>
          <button
            type="button"
            onClick={() => navigateStore('/contact')}
            className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm cursor-pointer transition-all"
          >
            ارتباط مستقیم و هماهنگی بازدید حضوری
          </button>
        </div>
      </section>

      {/* 4 Key Pillars Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(about.highlights || []).map((hl, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-3xl p-6 space-y-2.5 shadow-2xs hover:border-blue-400 transition-colors"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-black border border-blue-200">
              {hl.badge}
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900">{hl.title}</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{hl.description}</p>
          </div>
        ))}
      </section>

      {/* Institutional Cooperation Box for School Principals & Organizations */}
      <section className="bg-white border-2 border-blue-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-black text-blue-700">
              🤝 ویژه مدیران مدارس، پژوهش‌سراها، آموزشگاه‌ها و سازمان‌ها
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900">
              همکاری آموزشی، تجهیز کارگاه رباتیک مدارس و تامین کیت با نرخ نمایندگی
            </h2>
          </div>
          <a
            href="tel:02165506015"
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-amber-400 font-mono text-xs font-black"
            dir="ltr"
          >
            021 6550 60 15
          </a>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          {about.institutionalPitch}
        </p>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span>
            📍 نشانی دفتر مرکزی و کارگاه:{' '}
            {(state?.builderBlocks || []).find((b) => b.id === 'BLK-HOME-CONTACT')?.itemsList?.[3]?.title ||
              (state?.builderBlocks || []).find((b) => b.id === 'BLK-CONTACT-MAIN')?.itemsList?.[3]?.title ||
              'اندیشه، فاز ۱، نبش خیابان شاهد غربی، ساختمان کیمیا، طبقه اول، واحد ۲'}
          </span>
          <div className="flex items-center gap-3 font-mono font-bold text-blue-700" dir="ltr">
            <span>
              {(state?.builderBlocks || []).find((b) => b.id === 'BLK-HOME-CONTACT')?.itemsList?.[0]?.title ||
                '0910 311 67 53'}
            </span>
            <span>|</span>
            <span>
              {(state?.builderBlocks || []).find((b) => b.id === 'BLK-HOME-CONTACT')?.itemsList?.[2]?.title ||
                '021 6550 60 15'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
