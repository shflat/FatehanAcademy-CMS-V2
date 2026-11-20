import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Crown,
  RefreshCw,
  Save,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  SubscriptionPlanItem,
  UserSubscriptionRecord,
} from '../../src/core/types';
import { apiJson } from '../../src/core/apiClient';

interface SubscriptionsAdminPanelProps {
  onNotice: (type: 'success' | 'error', text: string) => void;
}

export const SubscriptionsAdminPanel: React.FC<SubscriptionsAdminPanelProps> = ({
  onNotice,
}) => {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [subscribers, setSubscribers] = useState<UserSubscriptionRecord[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{
        plans?: SubscriptionPlanItem[];
        subscribers?: UserSubscriptionRecord[];
      }>('/api/v1/modules/subscriptions/admin/overview');
      if (ok) {
        const list = data.plans || [];
        setPlans(list);
        setSubscribers(data.subscribers || []);
        if (!selectedPlanId && list[0]) setSelectedPlanId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  const updateSelectedPlan = (patch: Partial<SubscriptionPlanItem>) => {
    if (!selectedPlan) return;
    setPlans((prev) =>
      prev.map((p) => (p.id === selectedPlan.id ? { ...p, ...patch } : p))
    );
  };

  const handleSavePlan = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{ error?: string }>(
        '/api/v1/modules/subscriptions/admin/plans',
        {
          method: 'POST',
          body: JSON.stringify(selectedPlan),
        }
      );
      if (!ok) throw new Error(data.error || 'خطا در ذخیره پلن اشتراک');
      onNotice('success', `پلن «${selectedPlan.titleFa}» در دیتابیس ذخیره شد.`);
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره پلن');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5 mb-1">
            <Crown className="w-4 h-4" />
            <span>ماژول فروش اشتراک VIP (۱ ماهه، ۳ ماهه، ۶ ماهه و سالانه)</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            مدیریت پلن‌های اشتراک و باز شدن خودکار اسکیل‌ها و آپدیت‌های جدید
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            مشترکین فعال در طول دوره اشتراک به‌صورت خودکار به تمام اسکیل‌های جدید و آپدیت‌های دسته‌بندی‌های مشمول دسترسی خواهند داشت.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>بروزرسانی</span>
        </button>
      </div>

      {/* 4 Selectable Plans Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((plan) => {
          const active = selectedPlan?.id === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={`p-4 rounded-2xl border text-right transition-all cursor-pointer space-y-2 ${
                active
                  ? 'border-[#1D4ED8] bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-[#1D4ED8]/25'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold">
                  {plan.badgeText || `${plan.durationDays} روزه`}
                </span>
                <span
                  className={`text-[10px] font-extrabold ${
                    plan.enabled ? 'text-emerald-600' : 'text-stone-400'
                  }`}
                >
                  {plan.enabled ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <div className="text-sm font-extrabold text-stone-900 dark:text-white">
                {plan.titleFa}
              </div>
              <div className="text-base font-black text-[#1D4ED8] smooth-nums">
                {plan.price.toLocaleString('fa-IR')} تومان
              </div>
              <div className="text-[11px] text-stone-500 line-clamp-2">
                {plan.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Single Plan Editor Card Below */}
      {selectedPlan && (
        <div className="p-5 sm:p-6 rounded-2xl border-2 border-[#1D4ED8]/30 bg-white dark:bg-stone-900 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
              <span>ویرایش پلن: {selectedPlan.titleFa}</span>
            </h3>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSavePlan()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'در حال ذخیره...' : 'ذخیره تغییرات پلن'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                عنوان پلن اشتراک
              </label>
              <input
                type="text"
                value={selectedPlan.titleFa}
                onChange={(e) => updateSelectedPlan({ titleFa: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                مدت اعتبار (روز)
              </label>
              <input
                type="number"
                min={1}
                value={selectedPlan.durationDays}
                onChange={(e) =>
                  updateSelectedPlan({ durationDays: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold smooth-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                برچسب ویژه (Badge)
              </label>
              <input
                type="text"
                value={selectedPlan.badgeText}
                onChange={(e) => updateSelectedPlan({ badgeText: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                قیمت فروش (تومان)
              </label>
              <input
                type="number"
                min={0}
                value={selectedPlan.price}
                onChange={(e) => updateSelectedPlan({ price: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold smooth-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                قیمت خط‌خورده (تومان)
              </label>
              <input
                type="number"
                min={0}
                value={selectedPlan.originalPrice}
                onChange={(e) =>
                  updateSelectedPlan({ originalPrice: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold smooth-nums"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                دسته‌بندی‌های مشمول (all برای همه یا با کاما جدا کنید)
              </label>
              <input
                type="text"
                dir="ltr"
                value={selectedPlan.coveredCategories.join(', ')}
                onChange={(e) =>
                  updateSelectedPlan({
                    coveredCategories: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                توضیحات پلن (نمایش به مشتری)
              </label>
              <textarea
                rows={2}
                value={selectedPlan.description}
                onChange={(e) => updateSelectedPlan({ description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-[11px] font-bold text-stone-500 mb-1">
                امکانات و مزایای پلن (هر خط یک مورد)
              </label>
              <textarea
                rows={3}
                value={selectedPlan.features.join('\n')}
                onChange={(e) =>
                  updateSelectedPlan({
                    features: e.target.value
                      .split('\n')
                      .map((l) => l.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 pt-2 text-xs font-bold">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPlan.enabled}
                onChange={(e) => updateSelectedPlan({ enabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-600"
              />
              <span>نمایش و فروش فعال این پلن</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPlan.autoUnlockNewProducts}
                onChange={(e) =>
                  updateSelectedPlan({ autoUnlockNewProducts: e.target.checked })
                }
                className="w-4 h-4 accent-[#1D4ED8]"
              />
              <span>باز شدن خودکار اسکیل‌ها و محصولات جدید</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPlan.autoUnlockUpdates}
                onChange={(e) =>
                  updateSelectedPlan({ autoUnlockUpdates: e.target.checked })
                }
                className="w-4 h-4 accent-[#1D4ED8]"
              />
              <span>دسترسی خودکار به تمام آپدیت‌ها</span>
            </label>
          </div>
        </div>
      )}

      {/* Active Subscribers List */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3 shadow-xs">
        <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1D4ED8]" />
          <span>لیست مشترکین VIP ({subscribers.length.toLocaleString('fa-IR')} اشتراک)</span>
        </h3>
        {subscribers.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500">
            هنوز کاربری اشتراک خریداری نکرده است. کاربران از بخش «اشتراک VIP» در پیشخوان مشتری می‌توانند پلن انتخاب کنند.
          </div>
        ) : (
          <div className="space-y-2">
            {subscribers.map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-stone-900 dark:text-white">
                      {sub.userName} ({sub.planTitle})
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono" dir="ltr">
                      {sub.userPhone}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold text-stone-600 dark:text-stone-300 smooth-nums">
                  <span>شروع: {sub.startedAtFa}</span>
                  <span>انقضا: {sub.expiresAtFa}</span>
                  <span className="text-emerald-600">
                    {sub.amountPaid.toLocaleString('fa-IR')} تومان
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
