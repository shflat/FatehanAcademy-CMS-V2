import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import type { SmartCrmRecommendation, SmartCrmRule } from '../../src/core/types';
import { apiJson } from '../../src/core/apiClient';

interface CustomerInterestProfile {
  phone: string;
  fullName: string;
  ownedCount: number;
  interestedCategories: string[];
}

interface SmartCrmAdminPanelProps {
  onNotice: (type: 'success' | 'error', text: string) => void;
}

export const SmartCrmAdminPanel: React.FC<SmartCrmAdminPanelProps> = ({ onNotice }) => {
  const [rules, setRules] = useState<SmartCrmRule[]>([]);
  const [recommendations, setRecommendations] = useState<SmartCrmRecommendation[]>([]);
  const [profiles, setProfiles] = useState<CustomerInterestProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningScan, setRunningScan] = useState(false);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{
        rules?: SmartCrmRule[];
        recommendations?: SmartCrmRecommendation[];
        customerProfiles?: CustomerInterestProfile[];
      }>('/api/v1/modules/smart-crm/admin/overview');
      if (ok) {
        setRules(data.rules || []);
        setRecommendations(data.recommendations || []);
        setProfiles(data.customerProfiles || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleRunAutoMatch = async () => {
    setRunningScan(true);
    try {
      const { ok, data } = await apiJson<{
        matchedCount?: number;
        scannedUsers?: number;
        error?: string;
      }>('/api/v1/modules/smart-crm/admin/run-auto-match', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!ok) throw new Error(data.error || 'خطا در اجرای موتور هوشمند CRM');
      onNotice(
        'success',
        `اسکن هوشمند تکمیل شد: ${(data.matchedCount || 0).toLocaleString('fa-IR')} پیشنهاد جدید برای ${(data.scannedUsers || 0).toLocaleString('fa-IR')} کاربر ثبت شد.`
      );
      await loadOverview();
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در اجرای تطبیق هوشمند');
    } finally {
      setRunningScan(false);
    }
  };

  const handleSaveRule = async (rule: SmartCrmRule) => {
    setSavingRuleId(rule.id);
    try {
      const { ok, data } = await apiJson<{ error?: string }>(
        '/api/v1/modules/smart-crm/admin/rules',
        {
          method: 'POST',
          body: JSON.stringify(rule),
        }
      );
      if (!ok) throw new Error(data.error || 'خطا در ذخیره قانون');
      onNotice('success', `قانون «${rule.titleFa}» ذخیره شد.`);
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره قانون CRM');
    } finally {
      setSavingRuleId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>ماژول CRM هوشمند و پیشنهاد خودکار (mod_smart_crm)</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            ارسال خودکار پیشنهاد محصول و آپدیت بر اساس سابقه خرید و علایق هر مشتری
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            بدون نیاز به کار دستی ادمین: هر زمان محصولی اضافه یا به‌روزرسانی شود، سیستم علایق هر کاربر را تطبیق داده و پیشنهاد اختصاصی در پیشخوان او نمایش می‌دهد.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={runningScan}
            onClick={() => void handleRunAutoMatch()}
            className="px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningScan ? 'در حال اسکن علایق...' : 'اجرای فوری تطبیق هوشمند'}</span>
          </button>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs text-stone-500 font-bold">پروفایل‌های تحلیل‌شده مشتریان</div>
          <div className="text-2xl font-black text-stone-900 dark:text-white mt-1 smooth-nums">
            {profiles.length.toLocaleString('fa-IR')}
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs text-stone-500 font-bold">قوانین خودکار فعال</div>
          <div className="text-2xl font-black text-emerald-600 mt-1 smooth-nums">
            {rules.filter((r) => r.enabled).length.toLocaleString('fa-IR')} از{' '}
            {rules.length.toLocaleString('fa-IR')}
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-xs text-stone-500 font-bold">پیشنهادهای ارسال‌شده خودکار</div>
          <div className="text-2xl font-black text-[#1D4ED8] mt-1 smooth-nums">
            {recommendations.length.toLocaleString('fa-IR')}
          </div>
        </div>
      </div>

      {/* Automation Rules */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
        <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-[#1D4ED8]" />
          <span>قوانین خودکار CRM (تنظیمات ماژول)</span>
        </h3>
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) =>
                      setRules((prev) =>
                        prev.map((r) =>
                          r.id === rule.id ? { ...r, enabled: e.target.checked } : r
                        )
                      )
                    }
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm font-extrabold text-stone-900 dark:text-white">
                    {rule.titleFa}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={rule.channel}
                    onChange={(e) =>
                      setRules((prev) =>
                        prev.map((r) =>
                          r.id === rule.id
                            ? { ...r, channel: e.target.value as SmartCrmRule['channel'] }
                            : r
                        )
                      )
                    }
                    className="px-2.5 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                  >
                    <option value="dashboard">نمایش در پیشخوان مشتری</option>
                    <option value="sms_and_dashboard">پیشخوان مشتری + ارسال پیامک</option>
                  </select>
                  <button
                    type="button"
                    disabled={savingRuleId === rule.id}
                    onClick={() => void handleSaveRule(rule)}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>ذخیره</span>
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                value={rule.messageTemplate}
                onChange={(e) =>
                  setRules((prev) =>
                    prev.map((r) =>
                      r.id === rule.id ? { ...r, messageTemplate: e.target.value } : r
                    )
                  )
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Customer Interest Profiles & Recent Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1D4ED8]" />
            <span>نقشه علایق مشتریان بر اساس خرید</span>
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {profiles.map((p) => (
              <div
                key={p.phone}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                    {p.fullName}
                  </div>
                  <div className="text-[11px] font-mono text-stone-500" dir="ltr">
                    {p.phone}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {p.interestedCategories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-lg bg-[#1D4ED8]/10 text-[#1D4ED8] text-[10px] font-bold"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>آخرین پیشنهادهای ارسال‌شده خودکار</span>
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recommendations.length === 0 ? (
              <div className="py-10 text-center text-xs text-stone-500">
                هنوز پیشنهادی تولید نشده است. دکمه «اجرای فوری تطبیق هوشمند» را بزنید.
              </div>
            ) : (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-extrabold text-stone-900 dark:text-white">
                      {rec.userName} ← <span className="text-[#1D4ED8]">{rec.productTitle}</span>
                    </span>
                    <span className="text-[10px] text-stone-400">{rec.createdAtFa}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    {rec.reasonText}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
