import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Blocks,
  Check,
  GitBranch,
  Settings2,
  Wrench,
  X,
} from 'lucide-react';
import type { SiteModuleRegistryItem } from '../../../core/types';
import { apiJson } from '../../../core/apiClient';

interface ModulesControlCenterPanelProps {
  modules: SiteModuleRegistryItem[];
  onChangeModules: (next: SiteModuleRegistryItem[]) => void;
  onOpenModuleTarget: (targetSection: string) => void;
  onNotice: (type: 'success' | 'error', text: string) => void;
}

interface PendingDependencyWarning {
  target: SiteModuleRegistryItem;
  action: 'enable' | 'disable';
  affected: SiteModuleRegistryItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'همه ماژول‌ها',
  plugins: 'افزونه‌های فاز ۱۰',
  ecommerce: 'فروشگاه و اشتراک',
  academy: 'آکادمی و آموزش',
  marketing: 'مارکتینگ و CRM',
  communication: 'ارتباطات و پیامک',
  operations: 'عملیات و بکاپ',
  seo: 'سئو و آنالیتیکس',
};

export const ModulesControlCenterPanel: React.FC<ModulesControlCenterPanelProps> = ({
  modules,
  onChangeModules,
  onOpenModuleTarget,
  onNotice,
}) => {
  const [catFilter, setCatFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [depWarning, setDepWarning] = useState<PendingDependencyWarning | null>(null);

  const visibleModules = useMemo(() => {
    if (catFilter === 'all') return modules;
    return modules.filter((m) => m.category === catFilter);
  }, [modules, catFilter]);

  const moduleTitleMap = useMemo(
    () => new Map(modules.map((m) => [m.id, m.titleFa])),
    [modules]
  );

  const enabledCount = modules.filter((m) => m.enabled).length;

  const persistModules = async (nextList: SiteModuleRegistryItem[], msg: string) => {
    onChangeModules(nextList);
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{
        modules?: SiteModuleRegistryItem[];
        error?: string;
      }>('/api/v1/modules/registry', {
        method: 'POST',
        body: JSON.stringify({
          modules: nextList.map((m) => ({ id: m.id, enabled: m.enabled })),
        }),
      });
      if (!ok) throw new Error(data.error || 'خطا در ذخیره وضعیت ماژول‌ها');
      if (data.modules) onChangeModules(data.modules);
      onNotice('success', msg);
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره وضعیت ماژول‌ها');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleModule = (id: string) => {
    const target = modules.find((m) => m.id === id);
    if (!target) return;

    const enabling = !target.enabled;
    if (enabling) {
      // Dependency Guard: check disabled prerequisites
      const missingDeps = (target.dependencies || [])
        .map((depId) => modules.find((m) => m.id === depId))
        .filter((m): m is SiteModuleRegistryItem => Boolean(m && !m.enabled));
      if (missingDeps.length > 0) {
        setDepWarning({ target, action: 'enable', affected: missingDeps });
        return;
      }
    } else {
      // Dependency Guard: check active modules that depend on this module
      const activeDependents = modules.filter(
        (m) => m.enabled && (m.dependencies || []).includes(target.id)
      );
      if (activeDependents.length > 0) {
        setDepWarning({ target, action: 'disable', affected: activeDependents });
        return;
      }
    }

    const next = modules.map((m) => (m.id === id ? { ...m, enabled: enabling } : m));
    void persistModules(
      next,
      `ماژول «${target.titleFa}» ${enabling ? 'فعال' : 'غیرفعال'} شد و منوی سایت به‌روزرسانی گردید.`
    );
  };

  const confirmCascadeToggle = () => {
    if (!depWarning) return;
    const affectedIds = new Set([depWarning.target.id, ...depWarning.affected.map((a) => a.id)]);
    const nextEnabled = depWarning.action === 'enable';
    const next = modules.map((m) => (affectedIds.has(m.id) ? { ...m, enabled: nextEnabled } : m));
    const msg = nextEnabled
      ? `ماژول «${depWarning.target.titleFa}» به همراه ${depWarning.affected.length.toLocaleString('fa-IR')} پیش‌نیاز فعال شد.`
      : `ماژول «${depWarning.target.titleFa}» به همراه ${depWarning.affected.length.toLocaleString('fa-IR')} ماژول وابسته غیرفعال شد.`;
    setDepWarning(null);
    void persistModules(next, msg);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
            <Blocks className="w-4 h-4" />
            <span>مرکز مدیریت و فعال‌سازی ماژول‌های سایت (Site Module Registry + Dependency Guard)</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            انتخاب ماژول‌های فعال برای این سایت · کنترل هوشمند وابستگی‌ها
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 smooth-nums">
            ماژول‌های روشن فعلی:{' '}
            <strong className="text-emerald-600">
              {enabledCount.toLocaleString('fa-IR')} از {modules.length.toLocaleString('fa-IR')}
            </strong>{' '}
            · هر ماژول با یک تیک و با بررسی خودکار پیش‌نیازها به سایدبار اضافه یا حذف می‌شود.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void persistModules(
              modules.map((m) => ({ ...m, enabled: true })),
              `همه ${modules.length.toLocaleString('fa-IR')} ماژول با موفقیت فعال شدند.`
            )
          }
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
        >
          <Check className="w-4 h-4" />
          <span>فعال‌سازی همه ماژول‌ها</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCatFilter(key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
              catFilter === key
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleModules.map((mod) => (
          <div
            key={mod.id}
            className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
              mod.enabled
                ? 'border-emerald-500/45 bg-white dark:bg-stone-900 shadow-xs'
                : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 opacity-85'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <span className="px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-bold">
                  {CATEGORY_LABELS[mod.category] || mod.category}
                </span>

                <label className="flex items-center gap-2 text-xs font-extrabold cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={mod.enabled}
                    onChange={() => handleToggleModule(mod.id)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span className={mod.enabled ? 'text-emerald-600' : 'text-stone-400'}>
                    {mod.enabled ? 'روشن' : 'خاموش'}
                  </span>
                </label>
              </div>

              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white leading-snug">
                {mod.titleFa}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">{mod.description}</p>

              {mod.dependencies && mod.dependencies.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  <GitBranch className="w-3 h-3 shrink-0" />
                  <span>پیش‌نیازها:</span>
                  {mod.dependencies.map((d) => (
                    <span key={d} className="px-1.5 py-0.5 rounded bg-amber-500/10 font-mono">
                      {moduleTitleMap.get(d)?.split(' ')[0] || d} ({d})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {mod.enabled && mod.targetSection ? (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-200/70 dark:border-stone-800">
                {mod.hasTools && (
                  <button
                    type="button"
                    onClick={() => onOpenModuleTarget(mod.targetSection!)}
                    className="flex-1 px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    <span>ابزارها</span>
                  </button>
                )}
                {mod.hasSettings && (
                  <button
                    type="button"
                    onClick={() => onOpenModuleTarget(mod.targetSection!)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#1D4ED8]/10 hover:bg-[#1D4ED8]/20 text-[#1D4ED8] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>تنظیمات ماژول</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="pt-3 border-t border-stone-200/70 dark:border-stone-800 text-[11px] text-stone-400 font-bold">
                برای نمایش در سایدبار و دسترسی به ابزارها، تیک ماژول را فعال کنید.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Module Dependency Guard Modal */}
      {depWarning && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full p-5 rounded-2xl bg-white dark:bg-stone-900 border border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  هشدار وابستگی ماژول (Module Dependency Guard)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDepWarning(null)}
                className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {depWarning.action === 'disable' ? (
                <>
                  ماژول <strong>«{depWarning.target.titleFa}»</strong> پیش‌نیاز ماژول‌های فعال زیر است. در صورت خاموش کردن، این ماژول‌ها نیز باید غیرفعال شوند:
                </>
              ) : (
                <>
                  برای فعال‌سازی ماژول <strong>«{depWarning.target.titleFa}»</strong>، ماژول‌های پیش‌نیاز زیر باید هم‌زمان روشن شوند:
                </>
              )}
            </p>

            <ul className="space-y-1.5 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-bold">
              {depWarning.affected.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span>{item.titleFa}</span>
                  <span className="font-mono text-[10px] text-stone-400">{item.id}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmCascadeToggle}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-extrabold cursor-pointer"
              >
                {depWarning.action === 'disable'
                  ? 'خاموش کردن همراه با وابسته‌ها'
                  : 'روشن کردن همراه با پیش‌نیازها'}
              </button>
              <button
                type="button"
                onClick={() => setDepWarning(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
