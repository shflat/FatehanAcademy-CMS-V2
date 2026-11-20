import React, { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  Calculator,
  CheckCircle2,
  Compass,
  GraduationCap,
  Layers,
  Lightbulb,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
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
}

export const AcademySuiteAdminPanel: React.FC<AcademySuiteAdminPanelProps> = ({ onNotice }) => {
  const [activeTab, setActiveTab] = useState<AcademyTab>('departments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<AcademyDepartmentItem[]>([]);
  const [courses, setCourses] = useState<AcademyCourseItem[]>([]);
  const [announcements, setAnnouncements] = useState<AcademyAnnouncementItem[]>([]);
  const [ideas, setIdeas] = useState<AcademyIdeaItem[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [settings, setSettings] = useState<AcademySuiteSettings>(INITIAL_ACADEMY_SETTINGS);

  // Course filter & quick-create form
  const [courseKindFilter, setCourseKindFilter] = useState<'all' | 'official' | 'free'>('all');
  const [editingCourse, setEditingCourse] = useState<AcademyCourseItem | null>(null);

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

  const handleSaveCourse = async () => {
    if (!editingCourse?.title) {
      onNotice('error', 'عنوان دوره الزامی است.');
      return;
    }
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/academy/courses',
        { method: 'POST', body: JSON.stringify(editingCourse) }
      );
      if (!ok) throw new Error(data.error || 'خطا در ذخیره دوره');
      setEditingCourse(null);
      onNotice('success', `دوره «${editingCourse.title}» ذخیره شد.`);
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
    if (courseKindFilter === 'all') return true;
    return (c.courseKind || 'official') === courseKindFilter;
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
                مدیریت ایزوله دپارتمان‌ها، ۱۵ دوره رسمی، کارگاه‌های رایگان، اعلانات زنگوله هدر، بانک ایده‌ها، محاسبه‌گر شهریه و نقشه راه سنی
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

      {/* TAB 2: COURSES & FREE WORKSHOPS */}
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
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingCourse({
                  id: `CRS-${Date.now().toString(36).toUpperCase()}`,
                  courseKind: courseKindFilter === 'free' ? 'free' : 'official',
                  code: `FAT-${Date.now().toString().slice(-3)}`,
                  title: '',
                  slug: '',
                  ageGroup: 'A',
                  ageRangeFa: '۸ تا ۱۲ سال',
                  category: 'مکانیک',
                  tuitionApprovedToman: 5900000,
                  tuitionEarlyBirdToman: 3900000,
                  tuitionNormalToman: 4500000,
                  tuitionPrivateToman: 8000000,
                  sessionsCount: 12,
                  hoursPerSession: 1.5,
                  levelFa: 'مقدماتی',
                  prerequisites: 'بدون پیش‌نیاز',
                  summaryFa: '',
                  syllabusPoints: [],
                  equipmentNeeded: '',
                  status: 'ثبت‌نام فعال',
                  featuredImageUrl: '/assets/kits/kit-01.jpg',
                })
              }
              className="px-3.5 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن دوره جدید</span>
            </button>
          </div>

          {editingCourse && (
            <div className="p-5 rounded-2xl border-2 border-[#1D4ED8]/30 bg-white dark:bg-stone-900 space-y-3 text-xs">
              <div className="font-extrabold text-stone-900 dark:text-white">
                ویرایشگر دوره آکادمی ({editingCourse.id})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="عنوان دوره"
                  value={editingCourse.title}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                  className="md:col-span-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                />
                <select
                  value={editingCourse.courseKind || 'official'}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      courseKind: e.target.value as 'official' | 'free',
                    })
                  }
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                >
                  <option value="official">دوره رسمی (شهریه‌دار)</option>
                  <option value="free">کارگاه / دوره رایگان</option>
                </select>
                <select
                  value={editingCourse.ageGroup}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      ageGroup: e.target.value as 'S' | 'A' | 'B' | 'C',
                    })
                  }
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                >
                  <option value="S">رده سنی S (۶ تا ۷ سال)</option>
                  <option value="A">رده سنی A (۸ تا ۹ سال)</option>
                  <option value="B">رده سنی B (۱۰ تا ۱۳ سال)</option>
                  <option value="C">رده سنی C (بالای ۱۳ سال)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">شهریه مصوب (تومان)</label>
                  <input
                    type="number"
                    value={editingCourse.tuitionApprovedToman}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        tuitionApprovedToman: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 smooth-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">تخفیف زودهنگام</label>
                  <input
                    type="number"
                    value={editingCourse.tuitionEarlyBirdToman}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        tuitionEarlyBirdToman: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 smooth-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">ثبت‌نام به‌موقع ۲مرحله‌ای</label>
                  <input
                    type="number"
                    value={editingCourse.tuitionNormalToman}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        tuitionNormalToman: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 smooth-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 mb-1">کلاس خصوصی</label>
                  <input
                    type="number"
                    value={editingCourse.tuitionPrivateToman}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        tuitionPrivateToman: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 smooth-nums"
                  />
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="توضیحات و خلاصه دوره..."
                value={editingCourse.summaryFa}
                onChange={(e) => setEditingCourse({ ...editingCourse, summaryFa: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveCourse()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold cursor-pointer"
                >
                  ذخیره دوره
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCourses.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-3"
              >
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
                    <span className="text-stone-500">{c.ageRangeFa}</span>
                  </div>
                  <div className="text-sm font-extrabold text-stone-900 dark:text-white truncate">
                    {c.title}
                  </div>
                  <div className="text-[11px] text-stone-500 smooth-nums">
                    {c.courseKind === 'free'
                      ? `${c.sessionsCount} جلسه · ثبت‌نام رایگان`
                      : `زودهنگام: ${c.tuitionEarlyBirdToman.toLocaleString('fa-IR')} تومان · مصوب: ${c.tuitionApprovedToman.toLocaleString('fa-IR')} تومان`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingCourse(c)}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-extrabold cursor-pointer"
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
