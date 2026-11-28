import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
import type { MediaAssetItem } from '../../src/core/types';
import type {
  AcademyAnnouncementItem,
  AcademyCourseItem,
  AcademyDepartmentItem,
  AcademyIdeaItem,
  AcademySuiteSettings,
} from './academySeeds';
import { INITIAL_ACADEMY_SETTINGS } from './academySeeds';

type AcademyTab = 'departments' | 'courses' | 'announcements' | 'ideas' | 'tuition_roadmap';

interface ConsultationRow {
  id: string;
  phone: string;
  student_name: string;
  department: string;
  age_group: string;
  note: string;
  created_at: string;
}

interface AcademySuiteAdminPanelProps {
  onNotice: (type: 'success' | 'error', text: string) => void;
  mediaItems?: MediaAssetItem[];
  onSaveMediaItem?: (item: MediaAssetItem) => void;
}

const COURSE_LEVEL_OPTIONS = [
  'مقدماتی (بدون پیش‌نیاز)',
  'متوسط (با پیش‌نیاز متوسط)',
  'پیشرفته و تخصصی',
  'مبتدی تا پیشرفته',
  'آمادگی مسابقات و المپیاد',
];

const TERM_SEASON_OPTIONS = [
  'بهار',
  'تابستان',
  'پاییز',
  'زمستان',
  'ترم جاری',
  'ثبت‌نام آزاد',
];

const BRANCH_OPTIONS = [
  'شعبه مرکزی اندیشه (فاز ۱)',
  'برگزاری آنلاین زنده (وبینار)',
  'کارگاه ترکیبی (حضوری + آنلاین)',
];

const GRADE_LEVEL_OPTIONS = [
  { label: 'پیش‌دبستانی (۵ تا ۷ سال)', ageGroup: 'S' as const, ageRangeFa: '۵ تا ۷ سال' },
  { label: '۶ تا ۸ سال - پایه اول تا دوم', ageGroup: 'S' as const, ageRangeFa: '۶ تا ۸ سال' },
  { label: '۸ تا ۱۳ سال - پایه دوم تا هفتم', ageGroup: 'A' as const, ageRangeFa: '۸ تا ۱۳ سال' },
  { label: '۱۰ تا ۱۳ سال - پایه چهارم تا هفتم', ageGroup: 'B' as const, ageRangeFa: '۱۰ تا ۱۳ سال' },
  { label: '۱۳ تا ۱۸ سال - متوسطه اول و دوم', ageGroup: 'C' as const, ageRangeFa: '۱۳ تا ۱۸ سال' },
  { label: 'آزاد / نوجوانان و بزرگسالان', ageGroup: 'C' as const, ageRangeFa: 'آزاد' },
];

const CLASS_DAY_OPTIONS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'روزهای زوج',
  'روزهای فرد',
  'پنجشنبه و جمعه (آخر هفته)',
];

const DELIVERY_MODE_OPTIONS = [
  'حضوری کارگاهی',
  'آنلاین زنده',
  'ترکیبی (حضوری و آنلاین)',
  'ویدیویی آفلاین',
];

const DEFAULT_CATEGORIES = [
  'رباتیک',
  'الکترونیک',
  'مکانیک',
  'مکاترونیک',
  'برنامه‌نویسی و هوش مصنوعی',
  'طراحی و ساخت سه‌بعدی',
  'کودک خلاق',
  'مهارت‌های تخصصی',
];

export const AcademySuiteAdminPanel: React.FC<AcademySuiteAdminPanelProps> = ({
  onNotice,
  mediaItems = [],
  onSaveMediaItem,
}) => {
  const [activeTab, setActiveTab] = useState<AcademyTab>('departments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<AcademyDepartmentItem[]>([]);
  const [courses, setCourses] = useState<AcademyCourseItem[]>([]);
  const [announcements, setAnnouncements] = useState<AcademyAnnouncementItem[]>([]);
  const [ideas, setIdeas] = useState<AcademyIdeaItem[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [settings, setSettings] = useState<AcademySuiteSettings>(INITIAL_ACADEMY_SETTINGS);

  // Course filter, modal editor, uploader & gallery picker
  const [courseKindFilter, setCourseKindFilter] = useState<'all' | 'official' | 'free'>('all');
  const [courseSearch, setCourseSearch] = useState('');
  const [editingCourse, setEditingCourse] = useState<AcademyCourseItem | null>(null);
  const [isNewCourseModal, setIsNewCourseModal] = useState(false);
  const [showAdvancedCourseFields, setShowAdvancedCourseFields] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [gallerySearch, setGallerySearch] = useState('');
  const [localMediaItems, setLocalMediaItems] = useState<MediaAssetItem[]>([]);
  const courseFileInputRef = useRef<HTMLInputElement | null>(null);

  // Announcement quick-create form
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTargetType, setAnnTargetType] = useState<'public' | 'user_mention'>('public');
  const [annMentionPhone, setAnnMentionPhone] = useState('');
  const [annBadgeText, setAnnBadgeText] = useState('اطلاعیه جدید');
  const [annImportant, setAnnImportant] = useState(false);

  // Idea reply drafts
  const [ideaReplies, setIdeaReplies] = useState<Record<string, string>>({});

  // Department draft
  const [deptDraft, setDeptDraft] = useState<Partial<AcademyDepartmentItem> | null>(null);

  const combinedMediaItems = React.useMemo(() => {
    const map = new Map<string, MediaAssetItem>();
    for (const item of [...localMediaItems, ...mediaItems]) {
      if (item?.url && !map.has(item.url)) {
        map.set(item.url, item);
      }
    }
    return Array.from(map.values());
  }, [localMediaItems, mediaItems]);

  const categoryChoices = React.useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const d of departments) {
      if (d.title?.trim()) set.add(d.title.trim());
    }
    if (editingCourse?.category?.trim()) {
      set.add(editingCourse.category.trim());
    }
    return Array.from(set);
  }, [departments, editingCourse?.category]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        departments?: AcademyDepartmentItem[];
        courses?: AcademyCourseItem[];
        announcements?: AcademyAnnouncementItem[];
        ideas?: AcademyIdeaItem[];
        consultations?: ConsultationRow[];
        settings?: AcademySuiteSettings;
        error?: string;
      }>('/api/v1/modules/academy/admin/overview');
      if (!ok) throw new Error(data.error || 'خطا در بارگذاری ماژول آکادمی');
      setDepartments(data.departments || []);
      setCourses(data.courses || []);
      setAnnouncements(data.announcements || []);
      setIdeas(data.ideas || []);
      setConsultations(data.consultations || []);
      if (data.settings) setSettings(data.settings);
      const replyMap: Record<string, string> = {};
      for (const idea of data.ideas || []) {
        replyMap[idea.id] = idea.adminReply || '';
      }
      setIdeaReplies(replyMap);
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در اتصال به ماژول آکادمی');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOverview();
  }, []);

  const handleSaveDepartment = async () => {
    if (!deptDraft?.id || !deptDraft?.title) {
      onNotice('error', 'شناسه و عنوان دپارتمان الزامی است.');
      return;
    }
    setSaving(true);
    try {
      const payload: AcademyDepartmentItem = {
        id: deptDraft.id.trim(),
        deptNumFa: deptDraft.deptNumFa || `دپارتمان ۰${departments.length + 1}`,
        codeEn: deptDraft.codeEn || deptDraft.id.toUpperCase(),
        title: deptDraft.title.trim(),
        badge: deptDraft.badge || 'تخصصی',
        color: deptDraft.color || 'blue',
        badgeBg: deptDraft.badgeBg || 'bg-blue-50 text-blue-800 border-blue-200',
        deckBg: deptDraft.deckBg || '#DCE8FA',
        deckBorder: deptDraft.deckBorder || '#1D4ED840',
        deckText: deptDraft.deckText || '#1E3A8A',
        deckAccent: deptDraft.deckAccent || '#1D4ED8',
        iconKey: deptDraft.iconKey || 'bot',
        subtitle: deptDraft.subtitle || '',
        description: deptDraft.description || '',
        stages: deptDraft.stages || ['سطح مقدماتی', 'سطح متوسطه', 'سطح پیشرفته'],
        projects: deptDraft.projects || ['پروژه عملی ۱', 'پروژه عملی ۲'],
      };
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/academy/departments',
        { method: 'POST', body: JSON.stringify(payload) }
      );
      if (!ok) throw new Error(data.error || 'خطا در ذخیره دپارتمان');
      setDeptDraft(null);
      onNotice('success', `دپارتمان «${payload.title}» ذخیره شد.`);
      await fetchOverview();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره دپارتمان');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    const { ok } = await apiJson(`/api/v1/modules/academy/departments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (ok) {
      onNotice('success', 'دپارتمان حذف شد.');
      await fetchOverview();
    }
  };

  const handleCourseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingCourse) return;
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر'));
        reader.readAsDataURL(file);
      });
      const { ok, data } = await apiJson<{
        ok?: boolean;
        items?: MediaAssetItem[];
        error?: string;
      }>('/api/v1/media/upload', {
        method: 'POST',
        body: JSON.stringify({
          name: file.name,
          title: editingCourse.title || file.name,
          category: 'product',
          dataUrl,
        }),
      });
      if (!ok || !data.items?.[0]) {
        throw new Error(data.error || 'خطا در آپلود و تبدیل تصویر به WebP');
      }
      const uploaded = data.items[0];
      setLocalMediaItems((prev) => [uploaded, ...prev]);
      onSaveMediaItem?.(uploaded);
      setEditingCourse((prev) => (prev ? { ...prev, featuredImageUrl: uploaded.url } : prev));
      onNotice('success', 'تصویر با موفقیت به فرمت بهینه WebP (۴ سایز) تبدیل و ثبت شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در بارگذاری تصویر دوره');
    } finally {
      setUploadingImage(false);
    }
  };

  const openNewCourseEditor = () => {
    setIsNewCourseModal(true);
    setShowAdvancedCourseFields(false);
    setGalleryPickerOpen(false);
    setEditingCourse({
      id: `CRS-${Date.now().toString(36).toUpperCase()}`,
      courseKind: courseKindFilter === 'free' ? 'free' : 'official',
      code: `FAT-${Date.now().toString().slice(-3)}`,
      title: '',
      slug: '',
      ageGroup: 'A',
      ageRangeFa: '۸ تا ۱۳ سال',
      gradeLevel: '۸ تا ۱۳ سال - پایه دوم تا هفتم',
      category: categoryChoices[0] || 'رباتیک',
      departmentId: departments[0]?.id || 'robotics',
      tuitionApprovedToman: 4500000,
      tuitionEarlyBirdToman: 3500000,
      tuitionNormalToman: 3900000,
      tuitionPrivateToman: 7500000,
      sessionsCount: 12,
      hoursPerSession: 1.5,
      levelFa: 'متوسط (با پیش‌نیاز متوسط)',
      prerequisites: 'بدون پیش‌نیاز',
      summaryFa: '',
      fullDescription: '',
      syllabusPoints: [],
      equipmentNeeded: '',
      status: 'ثبت‌نام فعال',
      featuredImageUrl: '',
      instructorName: '',
      maxCapacity: 25,
      enrolledCount: 0,
      scheduleTime: '',
      termSeason: 'بهار',
      branchName: 'شعبه مرکزی اندیشه (فاز ۱)',
      classDays: 'شنبه',
      deliveryMode: 'حضوری کارگاهی',
      hasCertificate: true,
      certificateTitle: 'مدرک معتبر فنی و حرفه‌ای',
      installmentAvailable: false,
      installmentNote: '',
      introVideoUrl: '',
      tags: [],
      isPublished: true,
      isFeatured: false,
    });
  };

  const openExistingCourseEditor = (course: AcademyCourseItem) => {
    setIsNewCourseModal(false);
    setShowAdvancedCourseFields(false);
    setGalleryPickerOpen(false);
    setEditingCourse({
      ...course,
      isPublished: course.isPublished !== false,
      syllabusPoints: course.syllabusPoints || [],
      tags: course.tags || [],
    });
  };

  const handleSaveCourse = async () => {
    if (!editingCourse?.title?.trim()) {
      onNotice('error', 'عنوان دوره آموزشی الزامی است.');
      return;
    }
    setSaving(true);
    try {
      const payload: AcademyCourseItem = {
        ...editingCourse,
        title: editingCourse.title.trim(),
        tuitionApprovedToman:
          editingCourse.courseKind === 'free'
            ? 0
            : Number(editingCourse.tuitionApprovedToman || editingCourse.tuitionEarlyBirdToman || 0),
        tuitionEarlyBirdToman:
          editingCourse.courseKind === 'free' ? 0 : Number(editingCourse.tuitionEarlyBirdToman || 0),
        tuitionNormalToman:
          editingCourse.courseKind === 'free'
            ? 0
            : Number(editingCourse.tuitionNormalToman || editingCourse.tuitionEarlyBirdToman || 0),
        tuitionPrivateToman:
          editingCourse.courseKind === 'free' ? 0 : Number(editingCourse.tuitionPrivateToman || 0),
        isPublished: editingCourse.isPublished !== false,
      };
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/academy/courses',
        { method: 'POST', body: JSON.stringify(payload) }
      );
      if (!ok) throw new Error(data.error || 'خطا در ذخیره دوره');
      setEditingCourse(null);
      setGalleryPickerOpen(false);
      onNotice('success', `دوره «${payload.title}» با موفقیت ذخیره شد.`);
      await fetchOverview();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره دوره');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    const { ok } = await apiJson(`/api/v1/modules/academy/courses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (ok) {
      onNotice('success', 'دوره حذف شد.');
      await fetchOverview();
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) {
      onNotice('error', 'عنوان و متن اعلان الزامی است.');
      return;
    }
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/academy/announcements',
        {
          method: 'POST',
          body: JSON.stringify({
            title: annTitle,
            message: annMessage,
            targetType: annTargetType,
            mentionedPhone: annTargetType === 'user_mention' ? annMentionPhone : undefined,
            badgeText: annBadgeText,
            isImportant: annImportant,
          }),
        }
      );
      if (!ok) throw new Error(data.error || 'خطا در ثبت اعلان');
      setAnnTitle('');
      setAnnMessage('');
      setAnnMentionPhone('');
      onNotice('success', 'اعلان جدید با موفقیت منتشر شد.');
      await fetchOverview();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ثبت اعلان');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { ok } = await apiJson(`/api/v1/modules/academy/announcements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (ok) {
      onNotice('success', 'اعلان حذف شد.');
      await fetchOverview();
    }
  };

  const handleModerateIdea = async (
    id: string,
    status: AcademyIdeaItem['status'],
    adminReply: string
  ) => {
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        `/api/v1/modules/academy/ideas/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: JSON.stringify({ status, adminReply }) }
      );
      if (!ok) throw new Error(data.error || 'خطا در ذخیره وضعیت ایده');
      onNotice('success', 'وضعیت و پاسخ مربی برای ایده ذخیره شد.');
      await fetchOverview();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره ایده');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/academy/settings',
        { method: 'PUT', body: JSON.stringify(settings) }
      );
      if (!ok) throw new Error(data.error || 'خطا در ذخیره تنظیمات آکادمی');
      onNotice('success', 'تنظیمات محاسبه‌گر شهریه و نقشه راه سنی ذخیره شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (courseKindFilter !== 'all' && (c.courseKind || 'official') !== courseKindFilter) {
      return false;
    }
    if (courseSearch.trim()) {
      const q = courseSearch.trim().toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.instructorName || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const TABS: { id: AcademyTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'departments', label: `دپارتمان‌ها (${departments.length})`, icon: Layers },
    { id: 'courses', label: `دوره‌ها و کارگاه‌ها (${courses.length})`, icon: BookOpen },
    { id: 'announcements', label: `اعلانات زنگوله (${announcements.length})`, icon: Bell },
    { id: 'ideas', label: `بانک ایده‌ها (${ideas.length})`, icon: Lightbulb },
    { id: 'tuition_roadmap', label: 'محاسبه‌گر شهریه و نقشه راه سنی', icon: Calculator },
  ];

  return (
    <div className="space-y-6">
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
                ماژول جامع آکادمی و آموزش (Academy Suite)
              </h2>
              <p className="text-xs text-stone-500">
                مدیریت ایزوله دپارتمان‌ها، دوره‌های رسمی به‌عنوان محصول کامل آموزشی، کارگاه‌های رایگان، اعلانات زنگوله، بانک ایده‌ها و نقشه راه سنی
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchOverview()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              دپارتمان‌های تخصصی آکادمی (Fanned Card Deck)
            </h3>
            <button
              type="button"
              onClick={() =>
                setDeptDraft({
                  id: `dept_${Date.now().toString(36)}`,
                  deptNumFa: `دپارتمان ۰${departments.length + 1}`,
                  title: '',
                  subtitle: '',
                  description: '',
                  color: 'blue',
                  iconKey: 'bot',
                })
              }
              className="px-3.5 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>دپارتمان جدید</span>
            </button>
          </div>

          {deptDraft && (
            <div className="p-5 rounded-2xl border-2 border-[#1D4ED8]/30 bg-white dark:bg-stone-900 space-y-3 text-xs">
              <div className="font-extrabold text-stone-900 dark:text-white">
                ویرایش / ایجاد دپارتمان
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  dir="ltr"
                  placeholder="slug (e.g. robotics)"
                  value={deptDraft.id || ''}
                  onChange={(e) => setDeptDraft({ ...deptDraft, id: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
                />
                <input
                  type="text"
                  placeholder="عنوان فارسی (مثلاً دپارتمان رباتیک)"
                  value={deptDraft.title || ''}
                  onChange={(e) => setDeptDraft({ ...deptDraft, title: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                />
                <input
                  type="text"
                  placeholder="برچسب (مثلاً مبتدی تا پیشرفته)"
                  value={deptDraft.badge || ''}
                  onChange={(e) => setDeptDraft({ ...deptDraft, badge: e.target.value })}
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
              <input
                type="text"
                placeholder="زیرعنوان کوتاه..."
                value={deptDraft.subtitle || ''}
                onChange={(e) => setDeptDraft({ ...deptDraft, subtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
              <textarea
                rows={3}
                placeholder="توضیحات کامل دپارتمان..."
                value={deptDraft.description || ''}
                onChange={(e) => setDeptDraft({ ...deptDraft, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveDepartment()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold cursor-pointer"
                >
                  ذخیره دپارتمان
                </button>
                <button
                  type="button"
                  onClick={() => setDeptDraft(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {departments.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                      {d.deptNumFa} · {d.badge}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400" dir="ltr">
                      {d.id}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">{d.title}</h4>
                  <p className="text-xs text-stone-500 line-clamp-2">{d.subtitle}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setDeptDraft(d)}
                    className="flex-1 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-extrabold cursor-pointer"
                  >
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDepartment(d.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: COURSES & FREE WORKSHOPS (FULL EDUCATIONAL PRODUCT MANAGER) */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'official', 'free'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCourseKindFilter(k)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                    courseKindFilter === k
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                      : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600'
                  }`}
                >
                  {k === 'all' ? 'همه دوره‌ها' : k === 'official' ? 'دوره‌های رسمی مصوب' : 'دوره‌ها و کارگاه‌های رایگان'}
                </button>
              ))}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="جستجو در عنوان، مدرس یا کد..."
                  className="pr-8 pl-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs w-52 sm:w-64"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={openNewCourseEditor}
              className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن دوره آموزشی جدید</span>
            </button>
          </div>

          {/* FULL-FEATURED EDUCATIONAL PRODUCT COURSE MODAL */}
          {editingCourse && (
            <div
              className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
              role="dialog"
              aria-modal="true"
              data-lenis-prevent
            >
              <div className="w-full max-w-3xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
                {/* Modal Top Dark Header */}
                <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="text-sm sm:text-base font-black">
                        {isNewCourseModal ? 'افزودن دوره آموزشی جدید' : `ویرایش دوره: ${editingCourse.title || editingCourse.id}`}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        فقط عنوان دوره اجباری است؛ سایر ویژگی‌های محصول آموزشی کاملاً اختیاری هستند.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCourse(null);
                      setGalleryPickerOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>

                {/* Modal Scrollable Form Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-right flex-1">
                  {/* Row 1: Category & Difficulty Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        دسته‌بندی موضوعی / دپارتمان
                      </label>
                      <select
                        value={editingCourse.category}
                        onChange={(e) => {
                          const cat = e.target.value;
                          const matchedDept = departments.find(
                            (d) => d.title === cat || cat.includes(d.title.replace('دپارتمان ', ''))
                          );
                          setEditingCourse({
                            ...editingCourse,
                            category: cat,
                            departmentId: matchedDept?.id || editingCourse.departmentId,
                          });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold text-stone-800 dark:text-white"
                      >
                        {categoryChoices.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        سطح سختی دوره
                      </label>
                      <select
                        value={editingCourse.levelFa}
                        onChange={(e) =>
                          setEditingCourse({ ...editingCourse, levelFa: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold text-stone-800 dark:text-white"
                      >
                        {COURSE_LEVEL_OPTIONS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                        {!COURSE_LEVEL_OPTIONS.includes(editingCourse.levelFa) && editingCourse.levelFa && (
                          <option value={editingCourse.levelFa}>{editingCourse.levelFa}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Course Title (Required) */}
                  <div>
                    <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                      عنوان دوره آموزشی <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: آموزش رباتیک و آردوینو مقدماتی تا ساخت ربات مسیریاب"
                      value={editingCourse.title}
                      onChange={(e) =>
                        setEditingCourse({ ...editingCourse, title: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold text-stone-900 dark:text-white"
                    />
                  </div>

                  {/* Row 3: Instructor & Tuition (Primary Price) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        استاد / مدرس دوره
                      </label>
                      <input
                        type="text"
                        placeholder="مثلاً: مهندس امین کریمی"
                        value={editingCourse.instructorName || ''}
                        onChange={(e) =>
                          setEditingCourse({ ...editingCourse, instructorName: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        شهریه پرداختی / تخفیف زودهنگام (تومان)
                      </label>
                      <input
                        type="number"
                        dir="ltr"
                        placeholder="3500000"
                        disabled={editingCourse.courseKind === 'free'}
                        value={editingCourse.courseKind === 'free' ? 0 : editingCourse.tuitionEarlyBirdToman}
                        onChange={(e) =>
                          setEditingCourse({
                            ...editingCourse,
                            tuitionEarlyBirdToman: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono font-bold text-left smooth-nums disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Row 4: Max Capacity & Schedule Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        حداکثر ظرفیت ثبت‌نام (نفر)
                      </label>
                      <input
                        type="number"
                        dir="ltr"
                        min={0}
                        placeholder="25"
                        value={editingCourse.maxCapacity ?? ''}
                        onChange={(e) =>
                          setEditingCourse({
                            ...editingCourse,
                            maxCapacity: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono font-bold text-left smooth-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        زمان و ساعت برگزاری کلاس‌ها
                      </label>
                      <input
                        type="text"
                        placeholder="شنبه و چهارشنبه ۱۷:۰۰ الی ۱۹:۰۰"
                        value={editingCourse.scheduleTime || ''}
                        onChange={(e) =>
                          setEditingCourse({ ...editingCourse, scheduleTime: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                      />
                    </div>
                  </div>

                  {/* Row 5: Term/Season & Branch */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        فصل / دوره ثبت‌نام
                      </label>
                      <select
                        value={editingCourse.termSeason || ''}
                        onChange={(e) =>
                          setEditingCourse({ ...editingCourse, termSeason: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                      >
                        <option value="">انتخاب فصل / ترم (اختیاری)</option>
                        {TERM_SEASON_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        شعبه برگزاری
                      </label>
                      <input
                        type="text"
                        list="academy-branch-list"
                        placeholder="شعبه مرکزی اندیشه (فاز ۱)"
                        value={editingCourse.branchName || ''}
                        onChange={(e) =>
                          setEditingCourse({ ...editingCourse, branchName: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                      />
                      <datalist id="academy-branch-list">
                        {BRANCH_OPTIONS.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Row 6: Grade Level / Age Group & Class Days */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        پایه تحصیلی / رده سنی
                      </label>
                      <select
                        value={editingCourse.gradeLevel || ''}
                        onChange={(e) => {
                          const selected = GRADE_LEVEL_OPTIONS.find((g) => g.label === e.target.value);
                          setEditingCourse({
                            ...editingCourse,
                            gradeLevel: e.target.value,
                            ageGroup: selected ? selected.ageGroup : editingCourse.ageGroup,
                            ageRangeFa: selected ? selected.ageRangeFa : editingCourse.ageRangeFa,
                          });
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                      >
                        <option value="">انتخاب پایه تحصیلی (اختیاری)</option>
                        {GRADE_LEVEL_OPTIONS.map((g) => (
                          <option key={g.label} value={g.label}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                        روز تشکیل کلاس
                      </label>
                      <select
                        value={editingCourse.classDays || ''}
                        onChange={(e) =>
                          setEditingCourse({ ...editingCourse, classDays: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                      >
                        <option value="">انتخاب روز تشکیل کلاس (اختیاری)</option>
                        {CLASS_DAY_OPTIONS.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 7: Course Header Image + Direct WebP Uploader + Gallery Picker + Live Preview */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="font-extrabold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-amber-500" />
                        <span>عکس یا تصویر هدر دوره</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setGalleryPickerOpen((v) => !v)}
                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-extrabold text-[11px] cursor-pointer hover:underline"
                      >
                        {galleryPickerOpen ? 'بستن گالری تصاویر' : 'انتخاب از تصاویر موجود / گالری'}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="/uploads/... یا آدرس تصویر دوره"
                        value={editingCourse.featuredImageUrl || ''}
                        onChange={(e) =>
                          setEditingCourse({ ...editingCourse, featuredImageUrl: e.target.value })
                        }
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-left"
                      />
                      <input
                        ref={courseFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleCourseImageUpload(e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={uploadingImage}
                        onClick={() => courseFileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-white font-extrabold flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-60"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>{uploadingImage ? 'تبدیل به WebP...' : 'بارگذاری فایل جدید'}</span>
                      </button>
                    </div>

                    {/* Inline Media Gallery Picker */}
                    {galleryPickerOpen && (
                      <div className="p-3.5 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/40 dark:bg-stone-950 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={gallerySearch}
                            onChange={(e) => setGallerySearch(e.target.value)}
                            placeholder="جستجو در کتابخانه رسانه..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setGalleryPickerOpen(false)}
                            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-44 overflow-y-auto">
                          {combinedMediaItems
                            .filter(
                              (m) =>
                                m.mediaType !== 'video' &&
                                (!gallerySearch.trim() ||
                                  m.title.toLowerCase().includes(gallerySearch.trim().toLowerCase()))
                            )
                            .slice(0, 30)
                            .map((m) => (
                              <button
                                key={m.id || m.url}
                                type="button"
                                onClick={() => {
                                  setEditingCourse({ ...editingCourse, featuredImageUrl: m.url });
                                  setGalleryPickerOpen(false);
                                }}
                                className={`group relative rounded-xl overflow-hidden border-2 aspect-video bg-stone-100 dark:bg-stone-800 cursor-pointer ${
                                  editingCourse.featuredImageUrl === m.url
                                    ? 'border-blue-600 ring-2 ring-blue-500/30'
                                    : 'border-stone-200 dark:border-stone-700 hover:border-blue-400'
                                }`}
                                title={m.title}
                              >
                                <img
                                  src={m.variants?.thumb300 || m.url}
                                  alt={m.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          {combinedMediaItems.filter((m) => m.mediaType !== 'video').length === 0 && (
                            <div className="col-span-full text-center py-4 text-stone-400">
                              تصویری در کتابخانه یافت نشد. از دکمه «بارگذاری فایل جدید» استفاده کنید.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Live Preview Box */}
                    <div className="w-full sm:w-1/2 h-32 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 overflow-hidden flex items-center justify-center">
                      {editingCourse.featuredImageUrl ? (
                        <img
                          src={editingCourse.featuredImageUrl}
                          alt={editingCourse.title || 'پیش‌نمایش تصویر دوره'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-stone-400 flex flex-col items-center gap-1 text-[11px]">
                          <ImageIcon className="w-6 h-6 opacity-50" />
                          <span>پیش‌نمایش تصویر دوره</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 8: Class Description / Summary */}
                  <div>
                    <label className="block font-extrabold text-stone-700 dark:text-stone-200 mb-1.5">
                      توضیحات معرفی کلاس
                    </label>
                    <textarea
                      rows={3}
                      placeholder="سرفصل‌ها و توضیحات کلی مربوط به زمان آزمون، مخاطبین و خروجی عملی کلاس..."
                      value={editingCourse.summaryFa}
                      onChange={(e) =>
                        setEditingCourse({ ...editingCourse, summaryFa: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 leading-relaxed"
                    />
                  </div>

                  {/* Collapsible Advanced Educational Product Section (All Optional) */}
                  <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedCourseFields((v) => !v)}
                      className="w-full px-4 py-3 flex items-center justify-between text-xs font-extrabold text-stone-700 dark:text-stone-200 hover:bg-stone-100/80 dark:hover:bg-stone-900 cursor-pointer"
                    >
                      <span>ویژگی‌های تکمیلی محصول آموزشی (طرح‌های شهریه، اقساط، جلسات، سرفصل‌ها، مدرک و سئو — اختیاری)</span>
                      {showAdvancedCourseFields ? (
                        <ChevronUp className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      )}
                    </button>

                    {showAdvancedCourseFields && (
                      <div className="p-4 pt-2 border-t border-stone-200 dark:border-stone-800 space-y-4">
                        {/* Course Type, Status, Code, Slug */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">نوع دوره</label>
                            <select
                              value={editingCourse.courseKind || 'official'}
                              onChange={(e) =>
                                setEditingCourse({
                                  ...editingCourse,
                                  courseKind: e.target.value as 'official' | 'free',
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                            >
                              <option value="official">دوره رسمی شهریه‌دار</option>
                              <option value="free">کارگاه / دوره رایگان</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">وضعیت ثبت‌نام</label>
                            <select
                              value={editingCourse.status}
                              onChange={(e) =>
                                setEditingCourse({ ...editingCourse, status: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                            >
                              <option value="ثبت‌نام فعال">ثبت‌نام فعال</option>
                              <option value="در حال برگزاری">در حال برگزاری</option>
                              <option value="تکمیل ظرفیت">تکمیل ظرفیت</option>
                              <option value="به‌زودی">به‌زودی</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">کد محصول / دوره (SKU)</label>
                            <input
                              type="text"
                              dir="ltr"
                              value={editingCourse.code}
                              onChange={(e) =>
                                setEditingCourse({ ...editingCourse, code: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">اسلاگ نشانی (Slug)</label>
                            <input
                              type="text"
                              dir="ltr"
                              placeholder="arduino-starter"
                              value={editingCourse.slug}
                              onChange={(e) =>
                                setEditingCourse({ ...editingCourse, slug: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono"
                            />
                          </div>
                        </div>

                        {/* Pricing Tiers */}
                        {editingCourse.courseKind !== 'free' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-stone-500 mb-1">شهریه مصوب پایه / خط‌خورده (تومان)</label>
                              <input
                                type="number"
                                dir="ltr"
                                value={editingCourse.tuitionApprovedToman}
                                onChange={(e) =>
                                  setEditingCourse({
                                    ...editingCourse,
                                    tuitionApprovedToman: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono smooth-nums"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-stone-500 mb-1">ثبت‌نام به‌موقع ۲مرحله‌ای (تومان)</label>
                              <input
                                type="number"
                                dir="ltr"
                                value={editingCourse.tuitionNormalToman}
                                onChange={(e) =>
                                  setEditingCourse({
                                    ...editingCourse,
                                    tuitionNormalToman: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono smooth-nums"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-stone-500 mb-1">شهریه کلاس خصوصی (تومان)</label>
                              <input
                                type="number"
                                dir="ltr"
                                value={editingCourse.tuitionPrivateToman}
                                onChange={(e) =>
                                  setEditingCourse({
                                    ...editingCourse,
                                    tuitionPrivateToman: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono smooth-nums"
                              />
                            </div>
                          </div>
                        )}

                        {/* Sessions, Hours, Delivery Mode, Enrolled Count */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">تعداد جلسات</label>
                            <input
                              type="number"
                              dir="ltr"
                              min={1}
                              value={editingCourse.sessionsCount}
                              onChange={(e) =>
                                setEditingCourse({
                                  ...editingCourse,
                                  sessionsCount: Number(e.target.value) || 1,
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono smooth-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">ساعت هر جلسه</label>
                            <input
                              type="number"
                              dir="ltr"
                              step="0.5"
                              min={0.5}
                              value={editingCourse.hoursPerSession}
                              onChange={(e) =>
                                setEditingCourse({
                                  ...editingCourse,
                                  hoursPerSession: Number(e.target.value) || 1,
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono smooth-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">شیوه برگزاری</label>
                            <select
                              value={editingCourse.deliveryMode || 'حضوری کارگاهی'}
                              onChange={(e) =>
                                setEditingCourse({ ...editingCourse, deliveryMode: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                            >
                              {DELIVERY_MODE_OPTIONS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">ثبت‌نام‌شده فعلی</label>
                            <input
                              type="number"
                              dir="ltr"
                              min={0}
                              value={editingCourse.enrolledCount ?? 0}
                              onChange={(e) =>
                                setEditingCourse({
                                  ...editingCourse,
                                  enrolledCount: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono smooth-nums"
                            />
                          </div>
                        </div>

                        {/* Certificate & Installment Toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                            <label className="flex items-center gap-2 font-bold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(editingCourse.hasCertificate)}
                                onChange={(e) =>
                                  setEditingCourse({
                                    ...editingCourse,
                                    hasCertificate: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 accent-[#1D4ED8]"
                              />
                              <span>دارای گواهی‌نامه معتبر پایان دوره</span>
                            </label>
                            {editingCourse.hasCertificate && (
                              <input
                                type="text"
                                placeholder="عنوان مدرک (مثلاً: مدرک معتبر فنی و حرفه‌ای)"
                                value={editingCourse.certificateTitle || ''}
                                onChange={(e) =>
                                  setEditingCourse({
                                    ...editingCourse,
                                    certificateTitle: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-[11px]"
                              />
                            )}
                          </div>
                          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                            <label className="flex items-center gap-2 font-bold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(editingCourse.installmentAvailable)}
                                onChange={(e) =>
                                  setEditingCourse({
                                    ...editingCourse,
                                    installmentAvailable: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 accent-[#1D4ED8]"
                              />
                              <span>امکان پرداخت اقساطی شهریه</span>
                            </label>
                            {editingCourse.installmentAvailable && (
                              <input
                                type="text"
                                placeholder="توضیح اقساط (مثلاً: ۵۰٪ پیش‌پرداخت + مابقی در میانه ترم)"
                                value={editingCourse.installmentNote || ''}
                                onChange={(e) =>
                                  setEditingCourse({
                                    ...editingCourse,
                                    installmentNote: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-[11px]"
                              />
                            )}
                          </div>
                        </div>

                        {/* Prerequisites, Equipment, Video URL */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">پیش‌نیاز علمی</label>
                            <input
                              type="text"
                              placeholder="بدون پیش‌نیاز"
                              value={editingCourse.prerequisites}
                              onChange={(e) =>
                                setEditingCourse({ ...editingCourse, prerequisites: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">پکیج و تجهیزات کارگاهی مورد نیاز</label>
                            <input
                              type="text"
                              placeholder="کیت آموزشی در کارگاه تامین می‌شود"
                              value={editingCourse.equipmentNeeded}
                              onChange={(e) =>
                                setEditingCourse({ ...editingCourse, equipmentNeeded: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                            />
                          </div>
                        </div>

                        {/* Syllabus Points (One per line) */}
                        <div>
                          <label className="block text-[11px] font-bold text-stone-500 mb-1">
                            سرفصل‌های آموزشی (هر سرفصل در یک خط جداگانه)
                          </label>
                          <textarea
                            rows={3}
                            placeholder={'آشنایی با الکترونیک پایه و برد آردوینو\nسنسورهای اولتراسونیک و مادون قرمز\nساخت پروژه نهایی ربات مسیریاب'}
                            value={(editingCourse.syllabusPoints || []).join('\n')}
                            onChange={(e) =>
                              setEditingCourse({
                                ...editingCourse,
                                syllabusPoints: e.target.value
                                  .split('\n')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 leading-relaxed"
                          />
                        </div>

                        {/* SEO Metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">عنوان سئو (SEO Title)</label>
                            <input
                              type="text"
                              placeholder="اختیاری — عنوان نمایشی در گوگل"
                              value={editingCourse.seoTitle || ''}
                              onChange={(e) =>
                                setEditingCourse({ ...editingCourse, seoTitle: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">کلمه کلیدی کانونی (Focus Keyword)</label>
                            <input
                              type="text"
                              placeholder="مثلاً: آموزش رباتیک کودکان اندیشه"
                              value={editingCourse.focusKeyword || ''}
                              onChange={(e) =>
                                setEditingCourse({ ...editingCourse, focusKeyword: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-stone-500 mb-1">توضیحات متا سئو (Meta Description)</label>
                            <input
                              type="text"
                              placeholder="اختیاری — توضیح کوتاه دوره برای موتورهای جستجو"
                              value={editingCourse.seoDescription || ''}
                              onChange={(e) =>
                                setEditingCourse({ ...editingCourse, seoDescription: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Publish Toggle Box (Matching Reference Image 4) */}
                  <div className="p-4 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCourse.isPublished !== false}
                        onChange={(e) =>
                          setEditingCourse({ ...editingCourse, isPublished: e.target.checked })
                        }
                        className="w-4 h-4 mt-0.5 accent-amber-500 shrink-0"
                      />
                      <div>
                        <div className="font-extrabold text-stone-900 dark:text-white">
                          انتشار رسمی دوره (فعال/غیرفعال)
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          در صورت غیرفعال بودن (پیش‌نویس)، دوره آموزشی در وب‌سایت عمومی برای دانشجویان پنهان خواهد شد.
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 font-bold text-stone-700 dark:text-stone-300 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(editingCourse.isFeatured)}
                        onChange={(e) =>
                          setEditingCourse({ ...editingCourse, isFeatured: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#1D4ED8]"
                      />
                      <span>نمایش ویژه</span>
                    </label>
                  </div>
                </div>

                {/* Modal Sticky Action Footer */}
                <div className="px-5 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCourse(null);
                      setGalleryPickerOpen(false);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 font-extrabold text-xs cursor-pointer hover:bg-stone-100"
                  >
                    لغو و انصراف از ویرایش
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveCourse()}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#1D4ED8] dark:hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'در حال ذخیره...' : 'ذخیره و ثبت تغییرات دوره'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredCourses.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0 flex items-center justify-center">
                    {c.featuredImageUrl ? (
                      <img
                        src={c.featuredImageUrl}
                        alt={c.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <GraduationCap className="w-6 h-6 text-stone-400" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-md ${
                          c.courseKind === 'free'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {c.courseKind === 'free' ? 'رایگان' : `کد ${c.code}`}
                      </span>
                      {c.isPublished === false && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 dark:text-amber-300">
                          پیش‌نویس
                        </span>
                      )}
                      <span className="text-stone-500">{c.category}</span>
                      {c.termSeason && <span className="text-stone-400">· {c.termSeason}</span>}
                    </div>
                    <div className="text-sm font-extrabold text-stone-900 dark:text-white truncate">
                      {c.title}
                    </div>
                    <div className="text-[11px] text-stone-500 smooth-nums truncate">
                      {c.courseKind === 'free'
                        ? `${c.sessionsCount} جلسه · ثبت‌نام رایگان`
                        : `شهریه: ${c.tuitionEarlyBirdToman.toLocaleString('fa-IR')} تومان${c.instructorName ? ` · مدرس: ${c.instructorName}` : ''}${c.maxCapacity ? ` · ظرفیت ${c.maxCapacity} نفر` : ''}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openExistingCourseEditor(c)}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-xs font-extrabold cursor-pointer"
                  >
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCourse(c.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleCreateAnnouncement}
            className="lg:col-span-5 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 text-xs h-fit"
          >
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              انتشار اعلان زنگوله هدر (عمومی یا منشن اختصاصی)
            </h3>
            <input
              type="text"
              placeholder="عنوان اعلان..."
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
            />
            <textarea
              rows={3}
              placeholder="متن کامل اطلاعیه..."
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={annTargetType}
                onChange={(e) => setAnnTargetType(e.target.value as 'public' | 'user_mention')}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
              >
                <option value="public">عمومی (همه بازدیدکنندگان)</option>
                <option value="user_mention">منشن اختصاصی کاربر (@موبایل)</option>
              </select>
              <input
                type="text"
                placeholder="متن بج"
                value={annBadgeText}
                onChange={(e) => setAnnBadgeText(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
            {annTargetType === 'user_mention' && (
              <input
                type="text"
                dir="ltr"
                placeholder="0912..."
                value={annMentionPhone}
                onChange={(e) => setAnnMentionPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono"
              />
            )}
            <label className="flex items-center gap-2 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={annImportant}
                onChange={(e) => setAnnImportant(e.target.checked)}
                className="w-4 h-4 accent-[#1D4ED8]"
              />
              <span>اعلان مهم (سنجاق در بالای زنگوله)</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-[#1D4ED8] text-white font-extrabold cursor-pointer"
            >
              ثبت و انتشار اعلان
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      {a.targetType === 'user_mention' ? `منشن @${a.mentionedPhone}` : 'عمومی'}
                    </span>
                    <span className="text-stone-400">{a.createdAt}</span>
                  </div>
                  <div className="text-sm font-extrabold text-stone-900 dark:text-white">{a.title}</div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{a.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteAnnouncement(a.id)}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: STUDENT IDEAS */}
      {activeTab === 'ideas' && (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold text-stone-900 dark:text-white">{idea.title}</div>
                  <div className="text-[11px] text-stone-500">
                    {idea.studentName} · {idea.phone} · {idea.ageGroup || 'نامشخص'} · {idea.createdAt}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold">
                  {idea.status}
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{idea.note}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="پاسخ مربی ارشد به ایده کارآموز..."
                  value={ideaReplies[idea.id] ?? ''}
                  onChange={(e) =>
                    setIdeaReplies((prev) => ({ ...prev, [idea.id]: e.target.value }))
                  }
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      void handleModerateIdea(idea.id, 'بررسی شده', ideaReplies[idea.id] || '')
                    }
                    className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-extrabold cursor-pointer"
                  >
                    بررسی شد
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleModerateIdea(idea.id, 'تایید و تقدیر شده', ideaReplies[idea.id] || '')
                    }
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تایید و تقدیر</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: TUITION CALCULATOR & AGE ROADMAP */}
      {activeTab === 'tuition_roadmap' && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#1D4ED8]" />
                <span>تنظیمات محاسبه‌گر هوشمند شهریه و تخفیف خانواده</span>
              </h3>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveSettings()}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ذخیره تنظیمات آکادمی</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  درصد تخفیف ثبت‌نام خواهر/برادر (۲ نفر به بالا)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={settings.tuitionCalculator.siblingDiscountPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tuitionCalculator: {
                        ...settings.tuitionCalculator,
                        siblingDiscountPercent: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold smooth-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  درصد مالیات بر ارزش افزوده (VAT)
                </label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={settings.tuitionCalculator.vatPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tuitionCalculator: {
                        ...settings.tuitionCalculator,
                        vatPercent: Number(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold smooth-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                  تعداد ستون گرید صفحه دوره‌های رایگان
                </label>
                <select
                  value={settings.freeCoursesPage.gridColumns}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      freeCoursesPage: {
                        ...settings.freeCoursesPage,
                        gridColumns: Number(e.target.value) as 2 | 3 | 4,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                >
                  <option value={2}>۲ ستونه</option>
                  <option value={3}>۳ ستونه</option>
                  <option value={4}>۴ ستونه</option>
                </select>
              </div>
            </div>
          </div>

          {/* Age Roadmaps Editor */}
          <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#1D4ED8]" />
              <span>نقشه راه آموزشی ۳ رده سنی ({settings.ageRoadmaps.length} مسیر)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settings.ageRoadmaps.map((rm, idx) => (
                <div
                  key={rm.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 space-y-2 text-xs"
                >
                  <input
                    type="text"
                    value={rm.badge}
                    onChange={(e) => {
                      const next = [...settings.ageRoadmaps];
                      next[idx] = { ...rm, badge: e.target.value };
                      setSettings({ ...settings, ageRoadmaps: next });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-[11px] font-bold"
                  />
                  <input
                    type="text"
                    value={rm.title}
                    onChange={(e) => {
                      const next = [...settings.ageRoadmaps];
                      next[idx] = { ...rm, title: e.target.value };
                      setSettings({ ...settings, ageRoadmaps: next });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-extrabold"
                  />
                  <textarea
                    rows={2}
                    value={rm.goal}
                    onChange={(e) => {
                      const next = [...settings.ageRoadmaps];
                      next[idx] = { ...rm, goal: e.target.value };
                      setSettings({ ...settings, ageRoadmaps: next });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-[11px]"
                  />
                  <div className="text-[10px] text-stone-400">
                    شامل {rm.steps.length} گام آموزشی تعریف‌شده
                  </div>
                </div>
              ))}
            </div>
          </div>

          {consultations.length > 0 && (
            <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                درخواست‌های مشاوره و ثبت‌نام کارگاه رایگان ({consultations.length})
              </h3>
              <div className="space-y-2 text-xs">
                {consultations.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex flex-wrap justify-between gap-2"
                  >
                    <span className="font-bold">
                      {c.student_name} ({c.phone})
                    </span>
                    <span className="text-stone-500">
                      {c.department} · {c.age_group}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
