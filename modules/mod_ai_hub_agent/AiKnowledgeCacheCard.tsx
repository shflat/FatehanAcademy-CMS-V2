import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

type KbCategory = 'greeting' | 'faq' | 'catalog' | 'auto_learned';
type KbStatus = 'active' | 'pending_review' | 'disabled';
type KbAutoLearnMode = 'pending_review' | 'auto_active';

interface KbEntryItem {
  id: string;
  question_pattern: string;
  normalized_keywords: string;
  answer_text: string;
  category: KbCategory;
  status: KbStatus;
  hit_count: number;
  source: 'seed' | 'admin' | 'ai_learned';
  created_at: string;
  updated_at: string;
}

interface KbStats {
  totalEntries: number;
  activeCount: number;
  pendingCount: number;
  disabledCount: number;
  totalHits: number;
  estimatedTokensSaved: number;
}

const CATEGORY_LABELS: Record<KbCategory, string> = {
  greeting: 'احوال‌پرسی',
  faq: 'سوالات متداول',
  catalog: 'راهنمای کاتالوگ',
  auto_learned: 'خودیادگیری AI',
};

const STATUS_BADGE: Record<KbStatus, { label: string; cls: string }> = {
  active: {
    label: 'فعال (پاسخ صفرتوکن)',
    cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  },
  pending_review: {
    label: 'در انتظار تایید مدیر',
    cls: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  },
  disabled: {
    label: 'غیرفعال',
    cls: 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700',
  },
};

export const AiKnowledgeCacheCard: React.FC<{
  onRefreshParent?: () => void;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onRefreshParent, onNotice }) => {
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);

  const [entries, setEntries] = useState<KbEntryItem[]>([]);
  const [stats, setStats] = useState<KbStats>({
    totalEntries: 0,
    activeCount: 0,
    pendingCount: 0,
    disabledCount: 0,
    totalHits: 0,
    estimatedTokensSaved: 0,
  });

  const [autoLearnMode, setAutoLearnMode] = useState<KbAutoLearnMode>('pending_review');
  const [guestMaxLlmReplies, setGuestMaxLlmReplies] = useState<number>(4);

  const [statusFilter, setStatusFilter] = useState<'all' | KbStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for create / edit
  const [editingId, setEditingId] = useState<string>('');
  const [questionPattern, setQuestionPattern] = useState('');
  const [normalizedKeywords, setNormalizedKeywords] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [category, setCategory] = useState<KbCategory>('faq');
  const [status, setStatus] = useState<KbStatus>('active');

  const loadCache = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiJson<{
        ok?: boolean;
        entries?: KbEntryItem[];
        stats?: KbStats;
        kbAutoLearnMode?: KbAutoLearnMode;
        guestMaxLlmReplies?: number;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/knowledge-cache');
      if (res.ok && res.data.ok) {
        setEntries(res.data.entries || []);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.kbAutoLearnMode) setAutoLearnMode(res.data.kbAutoLearnMode);
        if (typeof res.data.guestMaxLlmReplies === 'number') {
          setGuestMaxLlmReplies(res.data.guestMaxLlmReplies);
        }
      } else {
        onNotice?.('error', res.data?.error || 'خطا در بارگذاری بانک دانش صفرتوکن');
      }
    } finally {
      setLoading(false);
    }
  }, [onNotice]);

  useEffect(() => {
    void loadCache();
  }, [loadCache]);

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    try {
      const clampedLimit = Math.max(1, Math.min(20, Math.round(Number(guestMaxLlmReplies) || 4)));
      const res = await apiJson<{ ok?: boolean; error?: string }>('/api/v1/modules/ai-hub/agent/mode', {
        method: 'POST',
        body: JSON.stringify({
          kbAutoLearnMode: autoLearnMode,
          guestMaxLlmReplies: clampedLimit,
        }),
      });
      if (res.ok && res.data.ok) {
        setGuestMaxLlmReplies(clampedLimit);
        onNotice?.('success', 'سیاست خودیادگیری بانک دانش و سقف پیام هوشمند مهمان با موفقیت ذخیره شد.');
        onRefreshParent?.();
      } else {
        onNotice?.('error', res.data?.error || 'ذخیره تنظیمات با خطا مواجه شد.');
      }
    } finally {
      setSavingPolicy(false);
    }
  };

  const resetForm = () => {
    setEditingId('');
    setQuestionPattern('');
    setNormalizedKeywords('');
    setAnswerText('');
    setCategory('faq');
    setStatus('active');
  };

  const handleEditEntry = (item: KbEntryItem) => {
    setEditingId(item.id);
    setQuestionPattern(item.question_pattern);
    setNormalizedKeywords(item.normalized_keywords);
    setAnswerText(item.answer_text);
    setCategory(item.category);
    setStatus(item.status);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionPattern.trim() || !answerText.trim()) {
      onNotice?.('error', 'الگوی سوال و متن پاسخ الزامی هستند.');
      return;
    }
    setSavingEntry(true);
    try {
      const res = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/ai-hub/agent/knowledge-cache',
        {
          method: 'POST',
          body: JSON.stringify({
            id: editingId || undefined,
            questionPattern: questionPattern.trim(),
            normalizedKeywords: normalizedKeywords.trim() || undefined,
            answerText: answerText.trim(),
            category,
            status,
          }),
        }
      );
      if (res.ok && res.data.ok) {
        onNotice?.('success', editingId ? 'ورودی بانک دانش ویرایش شد.' : 'ورودی جدید به بانک دانش صفرتوکن اضافه شد.');
        resetForm();
        await loadCache();
        onRefreshParent?.();
      } else {
        onNotice?.('error', res.data?.error || 'خطا در ذخیره ورودی بانک دانش');
      }
    } finally {
      setSavingEntry(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: KbStatus) => {
    const res = await apiJson<{ ok?: boolean; error?: string }>(
      `/api/v1/modules/ai-hub/agent/knowledge-cache/${encodeURIComponent(id)}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      }
    );
    if (res.ok && res.data.ok) {
      onNotice?.(
        'success',
        nextStatus === 'active'
          ? 'ورودی تایید و برای پاسخ صفرتوکن فعال شد.'
          : nextStatus === 'disabled'
          ? 'ورودی غیرفعال شد.'
          : 'وضعیت به در انتظار تایید تغییر یافت.'
      );
      await loadCache();
      onRefreshParent?.();
    } else {
      onNotice?.('error', res.data?.error || 'خطا در تغییر وضعیت');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const res = await apiJson<{ ok?: boolean; error?: string }>(
      `/api/v1/modules/ai-hub/agent/knowledge-cache/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    if (res.ok && res.data.ok) {
      onNotice?.('success', 'ورودی از بانک دانش حذف شد.');
      if (editingId === id) resetForm();
      await loadCache();
      onRefreshParent?.();
    } else {
      onNotice?.('error', res.data?.error || 'خطا در حذف ورودی');
    }
  };

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.question_pattern.toLowerCase().includes(q) ||
        item.normalized_keywords.toLowerCase().includes(q) ||
        item.answer_text.toLowerCase().includes(q)
      );
    });
  }, [entries, statusFilter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header & KPI Strip */}
      <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/40 dark:from-emerald-950/30 dark:via-stone-900 dark:to-stone-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                بانک دانش صفرتوکن و خودیادگیری چت
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                پاسخ فوری و رایگان به سوالات تکراری و احوال‌پرسی‌ها بدون مصرف توکن LLM + فیلتر امنیتی جلوگیری از ذخیره اطلاعات شخصی (PII)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadCache()}
            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی آمار</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-xl bg-white/90 dark:bg-stone-950/60 border border-stone-200/80 dark:border-stone-800">
            <div className="text-[11px] text-stone-500">کل ورودی‌ها</div>
            <div className="text-lg font-black text-stone-900 dark:text-white mt-0.5">
              {stats.totalEntries.toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/90 dark:bg-stone-950/60 border border-emerald-200/80 dark:border-emerald-900/50">
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400">پاسخ‌های فعال</div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
              {stats.activeCount.toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/90 dark:bg-stone-950/60 border border-amber-200/80 dark:border-amber-900/50">
            <div className="text-[11px] text-amber-700 dark:text-amber-400">در انتظار تایید</div>
            <div className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
              {stats.pendingCount.toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/90 dark:bg-stone-950/60 border border-sky-200/80 dark:border-sky-900/50">
            <div className="text-[11px] text-sky-700 dark:text-sky-400">تعداد پاسخ صفرتوکن</div>
            <div className="text-lg font-black text-sky-700 dark:text-sky-300 mt-0.5">
              {stats.totalHits.toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/90 dark:bg-stone-950/60 border border-indigo-200/80 dark:border-indigo-900/50 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-indigo-700 dark:text-indigo-400">تخمین توکن صرفه‌جویی‌شده</div>
            <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
              ~{stats.estimatedTokensSaved.toLocaleString('fa-IR')}
            </div>
          </div>
        </div>
      </div>

      {/* Policy Controls: Auto-Learn Mode & Guest AI Token Quota */}
      <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1.5">
            حالت خودیادگیری چت هوشمند
          </label>
          <select
            value={autoLearnMode}
            onChange={(e) => setAutoLearnMode(e.target.value as KbAutoLearnMode)}
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold text-stone-900 dark:text-white"
          >
            <option value="pending_review">تایید دستی سوپر ادمین (پیش‌فرض امن)</option>
            <option value="auto_active">فعال‌سازی خودکار پس از فیلتر PII</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1.5">
            سقف پاسخ پولی LLM برای هر مهمان لاگین‌نشده
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={20}
              value={guestMaxLlmReplies}
              onChange={(e) => setGuestMaxLlmReplies(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-extrabold text-center text-stone-900 dark:text-white"
            />
            <span className="text-[11px] text-stone-500">
              پس از آن فرم ورود سریع موبایل باز می‌شود (ضد مصرف توکن)
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={savingPolicy}
            onClick={() => void handleSavePolicy()}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingPolicy ? 'در حال ذخیره...' : 'ذخیره سیاست خودیادگیری و سهمیه مهمان'}</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Entry Form */}
      <form
        onSubmit={(e) => void handleSaveEntry(e)}
        className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-stone-900 dark:text-white">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>{editingId ? `ویرایش ورودی (${editingId})` : 'افزودن پاسخ سریع صفرتوکن جدید'}</span>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
            >
              انصراف از ویرایش
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
              الگوی سوال کاربر
            </label>
            <input
              type="text"
              value={questionPattern}
              onChange={(e) => setQuestionPattern(e.target.value)}
              placeholder="مثلاً: نحوه خرید و پرداخت در سایت چگونه است؟"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-stone-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
              کلیدواژه‌های تطبیق (اختیاری — با فاصله جدا کنید)
            </label>
            <input
              type="text"
              value={normalizedKeywords}
              onChange={(e) => setNormalizedKeywords(e.target.value)}
              placeholder="خودکار از سوال استخراج می‌شود (مثلاً: خرید پرداخت سفارش درگاه)"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-stone-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
            متن پاسخ صفرتوکن (از متغیر <code className="px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800">{'{siteTitle}'}</code> برای جایگذاری خودکار نام برند سایت استفاده کنید)
          </label>
          <textarea
            rows={3}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="پاسخ کوتاه، صمیمی و دقیق (۲ تا ۳ جمله)..."
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-stone-900 dark:text-white leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as KbCategory)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-bold"
            >
              <option value="faq">سوالات متداول</option>
              <option value="greeting">احوال‌پرسی</option>
              <option value="catalog">راهنمای کاتالوگ</option>
              <option value="auto_learned">خودیادگیری AI</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as KbStatus)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-bold"
            >
              <option value="active">فعال (پاسخ صفرتوکن)</option>
              <option value="pending_review">در انتظار تایید</option>
              <option value="disabled">غیرفعال</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={savingEntry}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{savingEntry ? 'در حال ثبت...' : editingId ? 'ذخیره تغییرات' : 'ثبت در بانک دانش'}</span>
          </button>
        </div>
      </form>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: `همه (${stats.totalEntries.toLocaleString('fa-IR')})` },
              { id: 'pending_review', label: `در انتظار تایید (${stats.pendingCount.toLocaleString('fa-IR')})` },
              { id: 'active', label: `فعال (${stats.activeCount.toLocaleString('fa-IR')})` },
              { id: 'disabled', label: `غیرفعال (${stats.disabledCount.toLocaleString('fa-IR')})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                statusFilter === f.id
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در سوال، کلیدواژه یا پاسخ..."
            className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs text-stone-900 dark:text-white"
          />
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-2.5">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-xs text-stone-500">
            موردی در بانک دانش با این فیلتر یافت نشد.
          </div>
        ) : (
          filteredEntries.map((item) => {
            const badge = STATUS_BADGE[item.status] || STATUS_BADGE.active;
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/90 space-y-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                      {item.source === 'ai_learned' && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>یادگرفته‌شده از چت</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300">
                        {Number(item.hit_count || 0).toLocaleString('fa-IR')} پاسخ صفرتوکن
                      </span>
                    </div>
                    <h5 className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white">
                      {item.question_pattern}
                    </h5>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.status !== 'active' && (
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(item.id, 'active')}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تایید و فعال‌سازی</span>
                      </button>
                    )}
                    {item.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(item.id, 'disabled')}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>غیرفعال</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEditEntry(item)}
                      className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
                      title="ویرایش"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteEntry(item.id)}
                      className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap bg-stone-50 dark:bg-stone-950/60 p-3 rounded-xl border border-stone-100 dark:border-stone-800/80">
                  {item.answer_text}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-500">
                  <div className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>کلیدواژه‌ها: {item.normalized_keywords}</span>
                  </div>
                  <span className="font-mono opacity-75">{item.id}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
