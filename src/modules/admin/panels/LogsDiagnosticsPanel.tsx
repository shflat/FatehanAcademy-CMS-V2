import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Terminal,
  Activity,
  FileSpreadsheet,
  Search,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { SystemLogEntry } from '../../../core/types';
import { apiFetch, apiJson } from '../../../core/apiClient';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface LogsDiagnosticsPanelProps {
  onNotice: NoticeFn;
}

export const LogsDiagnosticsPanel: React.FC<LogsDiagnosticsPanelProps> = ({
  onNotice,
}) => {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    success: 0,
    warning: 0,
    error: 0,
    snoozed: false,
  });
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ category, level, search });
      const { ok, data } = await apiJson<{
        logs?: SystemLogEntry[];
        summary?: typeof summary;
      }>(`/api/admin/logs?${qs.toString()}`);
      if (!ok) return;
      setLogs(data.logs || []);
      if (data.summary) setSummary(data.summary);
    } catch {
      onNotice('error', 'خطا در دریافت لاگ‌های سیستم');
    }
  }, [category, level, search, onNotice]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        databaseEngine?: string;
        enabledGatewaysCount?: number;
      }>('/api/admin/logs/diagnostics', { method: 'POST' });
      if (!ok) throw new Error(data.error);
      onNotice(
        'success',
        `تست سلامت با موفقیت انجام شد: ${data.databaseEngine} · ${data.enabledGatewaysCount} درگاه فعال`
      );
      await loadLogs();
    } catch {
      onNotice('error', 'خطا در اجرای تست سلامت سیستم');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await apiFetch('/api/admin/logs/export-csv');
      if (!res.ok) throw new Error('خطا در دانلود خروجی CSV');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'skill98-system-logs.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onNotice('success', 'فایل لاگ‌ها (skill98-system-logs.csv) دانلود شد.');
    } catch {
      onNotice('error', 'خطا در دانلود فایل CSV لاگ‌ها');
    }
  };

  const handleClearLogs = async () => {
    try {
      const { ok } = await apiJson('/api/admin/logs', { method: 'DELETE' });
      if (!ok) throw new Error();
      onNotice('success', 'تمامی لاگ‌های قبلی با موفقیت تخلیه شدند.');
      await loadLogs();
    } catch {
      onNotice('error', 'خطا در پاک‌سازی لاگ‌ها');
    }
  };

  const handleSnooze = async () => {
    try {
      const { ok } = await apiJson('/api/admin/logs/snooze', {
        method: 'POST',
      });
      if (!ok) throw new Error();
      setSummary((s) => ({ ...s, snoozed: true }));
      onNotice('success', 'یادآوری پاک‌سازی لاگ‌ها برای ۷ روز آینده تنظیم شد.');
    } catch {
      onNotice('error', 'خطا در ثبت یادآوری پاک‌سازی لاگ‌ها');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categoryLabels: { id: string; label: string }[] = [
    { id: 'all', label: 'همه رویدادها' },
    { id: 'payment', label: 'درگاه پرداخت' },
    { id: 'sms', label: 'پیامک و الگوها' },
    { id: 'auth', label: 'ورود و OTP' },
    { id: 'backup', label: 'بکاپ و بازیابی' },
    { id: 'database', label: 'دیتابیس و کوئری' },
    { id: 'system', label: 'سیستم' },
  ];

  return (
    <div className="space-y-6">
      {!summary.snoozed && summary.total > 20 && (
        <div className="p-4 rounded-2xl border border-amber-400/60 bg-amber-50/70 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-amber-900 dark:text-amber-200">
                مدیریت دوره‌ای حجم لاگ‌ها (هم‌اکنون{' '}
                {summary.total.toLocaleString('fa-IR')} رکورد در سیستم ثبت شده
                است)
              </div>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                برای حفظ سرعت کوئری‌های دیتابیس می‌توانید لاگ‌های قدیمی را خالی
                کرده یا ۷ روز بعد یادآوری دریافت کنید.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSnooze}
              className="px-3 py-1.5 rounded-lg border border-amber-400 text-amber-900 dark:text-amber-200 text-xs font-bold cursor-pointer"
            >
              یادآوری ۷ روز دیگر
            </button>
            <button
              type="button"
              onClick={handleClearLogs}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-extrabold cursor-pointer"
            >
              خالی کردن فوری لاگ‌ها
            </button>
          </div>
        </div>
      )}

      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mb-1">
              <Terminal className="w-4 h-4" />
              <span>
                مدیریت لاگ، کوئری و خطایابی زنده وب‌سرویس‌ها (Logs &
                Diagnostics)
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
              رهگیری دقیق درخواست‌های درگاه پرداخت، پیامک، بکاپ و کوئری‌های
              دیتابیس
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isDiagnosing}
              onClick={handleRunDiagnostics}
              className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>{isDiagnosing ? 'در حال بررسی...' : 'تست سلامت سیستم'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExportCsv()}
              className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-extrabold flex items-center gap-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>خروجی اکسل / CSV</span>
            </button>

            <button
              type="button"
              onClick={handleClearLogs}
              className="px-3.5 py-2 rounded-xl border border-rose-300 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
            >
              پاک‌سازی لاگ‌ها
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950">
            <div className="text-xs text-stone-500">کل رویدادهای ثبت‌شده</div>
            <div className="text-2xl font-black text-stone-900 dark:text-white smooth-nums mt-1">
              {summary.total.toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20">
            <div className="text-xs text-emerald-700 dark:text-emerald-300">
              عملیات‌های موفق
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 smooth-nums mt-1">
              {summary.success.toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20">
            <div className="text-xs text-amber-700 dark:text-amber-300">
              هشدارها (Warning)
            </div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-300 smooth-nums mt-1">
              {summary.warning.toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20">
            <div className="text-xs text-rose-700 dark:text-rose-300">
              خطاهای بحرانی (Error)
            </div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-300 smooth-nums mt-1">
              {summary.error.toLocaleString('fa-IR')}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در کد پیگیری، شماره موبایل، خطاها، SQL یا JSON..."
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'همه سطوح' },
                  { id: 'success', label: 'موفق' },
                  { id: 'warning', label: 'هشدار' },
                  { id: 'error', label: 'خطا' },
                ] as const
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setLevel(lvl.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    level === lvl.id
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-950'
                      : 'border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categoryLabels.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  category === cat.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {logs.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-500">
            هیچ رویدادی مطابق با فیلتر فعلی ثبت نشده است.
          </div>
        ) : (
          logs.map((entry) => {
            const expanded = Boolean(expandedIds[entry.id]);
            const levelBadge =
              entry.level === 'error'
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : entry.level === 'warning'
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
            return (
              <div
                key={entry.id}
                className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-900 p-4 space-y-2.5 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${levelBadge}`}
                    >
                      {entry.level === 'error'
                        ? 'خطا'
                        : entry.level === 'warning'
                        ? 'هشدار'
                        : 'موفق'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[#1D4ED8] dark:text-sky-300 text-[11px] font-bold">
                      {entry.category}
                    </span>
                    <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                      {entry.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-stone-500 smooth-nums shrink-0">
                    <span>{entry.createdAtFa}</span>
                    {(entry.sqlOrEndpoint || entry.payloadJson) && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(entry.id)}
                        className="px-2.5 py-1 rounded-lg bg-stone-900 dark:bg-stone-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>مشاهده کوئری / JSON</span>
                        {expanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {entry.detail}
                </p>

                {expanded && (entry.sqlOrEndpoint || entry.payloadJson) && (
                  <div
                    className="rounded-xl bg-stone-950 text-stone-200 p-3.5 text-[11px] font-mono space-y-2 overflow-x-auto"
                    dir="ltr"
                  >
                    {entry.sqlOrEndpoint && (
                      <div className="text-emerald-400 font-bold">
                        $ {entry.sqlOrEndpoint}
                      </div>
                    )}
                    {entry.payloadJson && (
                      <pre className="text-sky-300 whitespace-pre-wrap break-all">
                        {entry.payloadJson}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
