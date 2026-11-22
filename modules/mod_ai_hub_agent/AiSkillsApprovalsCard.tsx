import React, { useState } from 'react';
import { BookOpen, Check, CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface SkillRow {
  id: string;
  slug: string;
  title_fa: string;
  category: string;
  skill_markdown: string;
  updated_at: string;
}

interface ApprovalRow {
  id: string;
  title_fa: string;
  action_type: string;
  summary_fa: string;
  status: string;
  reviewed_by: string;
  created_at_fa: string;
}

export const AiSkillsApprovalsCard: React.FC<{
  mode: 'skills' | 'approvals';
  skills: SkillRow[];
  approvals: ApprovalRow[];
  onRefresh: () => void;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ mode, skills, approvals, onRefresh, onNotice }) => {
  const [titleFa, setTitleFa] = useState('');
  const [category, setCategory] = useState('operations');
  const [skillMarkdown, setSkillMarkdown] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleFa.trim() || !skillMarkdown.trim()) return;
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/ai-hub/agent/skills',
        {
          method: 'POST',
          body: JSON.stringify({ titleFa, category, skillMarkdown }),
        }
      );
      if (ok) {
        setTitleFa('');
        setSkillMarkdown('');
        onNotice?.('success', 'مهارت جدید در حافظه SKILL.md ایجنت ذخیره شد.');
        onRefresh();
      } else {
        onNotice?.('error', data.error || 'خطا در ذخیره مهارت');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    const { ok } = await apiJson(`/api/v1/modules/ai-hub/agent/skills/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (ok) {
      onNotice?.('success', 'مهارت از حافظه ایجنت حذف شد.');
      onRefresh();
    }
  };

  const handleDecideApproval = async (id: string, decision: 'approved' | 'rejected') => {
    const { ok, data } = await apiJson<{ ok?: boolean; executionSummary?: string; error?: string }>(
      `/api/v1/modules/ai-hub/agent/approvals/${encodeURIComponent(id)}/decide`,
      {
        method: 'POST',
        body: JSON.stringify({ decision }),
      }
    );
    if (ok) {
      onNotice?.(
        'success',
        decision === 'approved'
          ? data.executionSummary
            ? `تایید و اجرا شد: ${data.executionSummary}`
            : 'پیشنهاد ایجنت با ۱ کلیک تایید و اعمال شد.'
          : 'پیشنهاد ایجنت رد شد.'
      );
      onRefresh();
    } else {
      onNotice?.('error', data.error || 'خطا در ثبت تصمیم صف تایید');
    }
  };

  if (mode === 'approvals') {
    return (
      <div className="space-y-3">
        {approvals.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-xs text-stone-500">
            صف تایید ۱-کلیکی خالی است. با اجرای تسک‌ها یا ارسال فرمان در مرکز فرماندهی، پیشنهادها اینجا نمایش داده می‌شوند.
          </div>
        ) : (
          approvals.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                  <span className="font-extrabold text-stone-900 dark:text-white">
                    {item.title_fa}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                      item.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : item.status === 'rejected'
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {item.status === 'approved'
                      ? 'تاییدشده'
                      : item.status === 'rejected'
                      ? 'ردشده'
                      : 'در انتظار تایید'}
                  </span>
                </div>
                <p className="text-stone-600 dark:text-stone-400">{item.summary_fa}</p>
                <div className="text-[10px] text-stone-400">{item.created_at_fa}</div>
              </div>

              {item.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleDecideApproval(item.id, 'approved')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>تایید ۱-کلیکی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecideApproval(item.id, 'rejected')}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>رد</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => void handleSaveSkill(e)}
        className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 space-y-3 text-xs"
      >
        <div className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-[#1D4ED8]" />
          <span>آموزش مهارت جدید به حافظه SKILL.md ایجنت</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            required
            value={titleFa}
            onChange={(e) => setTitleFa(e.target.value)}
            placeholder="عنوان مهارت (مثلاً: قوانین پاسخ‌گویی به سفارش عمده)"
            className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
          >
            <option value="support">پشتیبانی و چت</option>
            <option value="seo">سئو و محتوا</option>
            <option value="sales">فروش و CRM</option>
            <option value="operations">عملیات و امنیت</option>
          </select>
        </div>
        <textarea
          rows={3}
          required
          value={skillMarkdown}
          onChange={(e) => setSkillMarkdown(e.target.value)}
          placeholder="# SKILL.md&#10;- قانون اول...&#10;- قانون دوم..."
          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-[11px]"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-extrabold cursor-pointer disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره در حافظه SKILL.md'}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {skills.map((sk) => (
          <div
            key={sk.id}
            className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#1D4ED8]" />
                <span>{sk.title_fa}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleDeleteSkill(sk.id)}
                className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                title="حذف مهارت"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-[11px] whitespace-pre-wrap font-sans text-stone-700 dark:text-stone-300 leading-relaxed">
              {sk.skill_markdown}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
