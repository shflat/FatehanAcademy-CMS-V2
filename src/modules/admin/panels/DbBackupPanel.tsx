import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  Download,
  Server,
  RefreshCw,
  Clock,
  Mail,
  Send,
  Upload,
  Play,
  ShieldAlert,
} from 'lucide-react';
import type { BackupHistoryItem, BackupScheduleConfig } from '../../../core/types';
import { apiFetch, apiJson } from '../../../core/apiClient';
import { DEFAULT_BACKUP_SCHEDULE_CONFIG } from '../../../data/skill98Data';
import { MaintenanceCleanersCard } from '../components/MaintenanceCleanersCard';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface DbBackupPanelProps {
  onNotice: NoticeFn;
  onDataRestored?: () => void;
}

interface DbStatusPayload {
  engine: string;
  engineLabel: string;
  connected: boolean;
  databasePathOrHost: string;
  pgConfigured?: boolean;
  pgTargetHost?: string;
  lastConnectionError?: string;
  sizeKb: number;
  tablesCount: number;
  tables: {
    name: string;
    description: string;
    rowCount: number;
    defaultQuery: string;
  }[];
}

export const DbBackupPanel: React.FC<DbBackupPanelProps> = ({
  onNotice,
  onDataRestored,
}) => {
  const onNoticeRef = useRef<NoticeFn>(onNotice);
  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    onNoticeRef.current(type, text);
  }, []);

  const [activeSubTab, setActiveSubTab] = useState<
    'backup_settings' | 'db_inspector'
  >('backup_settings');
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatusPayload | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('products');
  const [sqlInput, setSqlInput] = useState<string>(
    'SELECT id, title, category, item_type, price, status FROM products ORDER BY featured DESC, id ASC LIMIT 50;'
  );
  const [sqlResult, setSqlResult] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    executionMs: number;
  } | null>(null);
  const [isRunningQuery, setIsRunningQuery] = useState(false);

  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [scheduleCfg, setScheduleCfg] = useState<BackupScheduleConfig>(
    DEFAULT_BACKUP_SCHEDULE_CONFIG
  );
  const [restoreContent, setRestoreContent] = useState<string>('');
  const [restoreFilename, setRestoreFilename] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isTestingDbHealth, setIsTestingDbHealth] = useState(false);
  const [dbHealthReport, setDbHealthReport] = useState<{
    ok: boolean;
    engineLabel: string;
    latencyMs: number;
    details: string;
    lastConnectionError?: string;
  } | null>(null);

  const runSql = useCallback(async (queryToRun: string, silentOnAuthError = false) => {
    setIsRunningQuery(true);
    try {
      const { ok, status, data } = await apiJson<{
        error?: string;
        columns: string[];
        rows: Record<string, unknown>[];
        rowCount: number;
        executionMs: number;
      }>('/api/admin/db/query', {
        method: 'POST',
        body: JSON.stringify({ sql: queryToRun }),
      });
      if (status === 401 || status === 403) {
        const msg =
          data.error ||
          'برای اجرای کوئری SQL و مدیریت دیتابیس، لطفاً با نشست معتبر سوپر ادمین وارد شوید.';
        setAuthWarning(msg);
        if (!silentOnAuthError) notify('error', msg);
        return;
      }
      if (!ok) throw new Error(data.error || 'خطای اجرای کوئری');
      setAuthWarning(null);
      setSqlResult(data);
    } catch (err) {
      if (!silentOnAuthError) {
        notify('error', err instanceof Error ? err.message : 'خطای کوئری SQL');
      }
    } finally {
      setIsRunningQuery(false);
    }
  }, [notify]);

  const loadDbAndBackups = useCallback(async () => {
    try {
      const [statusRes, bkpRes] = await Promise.all([
        apiJson<DbStatusPayload & { error?: string }>('/api/admin/db/status'),
        apiJson<{
          error?: string;
          history?: BackupHistoryItem[];
          scheduleConfig?: BackupScheduleConfig;
        }>('/api/admin/backup/history'),
      ]);
      if (statusRes.status === 401 || statusRes.status === 403 || bkpRes.status === 401 || bkpRes.status === 403) {
        setAuthWarning(
          statusRes.data?.error ||
            bkpRes.data?.error ||
            'نشست امنیتی مدیریت منقضی شده است. لطفاً یک‌بار از حساب خارج شده و مجدداً با کد مستر یا OTP وارد شوید.'
        );
        return;
      }
      setAuthWarning(null);
      if (statusRes.ok) {
        setDbStatus(statusRes.data);
      }
      if (bkpRes.ok) {
        setHistory(bkpRes.data.history || []);
        if (bkpRes.data.scheduleConfig) {
          setScheduleCfg({
            ...DEFAULT_BACKUP_SCHEDULE_CONFIG,
            ...bkpRes.data.scheduleConfig,
            autoBackupFormat:
              bkpRes.data.scheduleConfig.autoBackupFormat || 'both',
          });
        }
      }
    } catch {
      notify('error', 'خطا در دریافت وضعیت دیتابیس');
    }
  }, [notify]);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void loadDbAndBackups();
  }, [loadDbAndBackups]);

  const hasLoadedInitialSqlRef = useRef(false);
  useEffect(() => {
    if (activeSubTab === 'db_inspector' && !hasLoadedInitialSqlRef.current && !authWarning) {
      hasLoadedInitialSqlRef.current = true;
      void runSql(
        'SELECT id, title, category, item_type, price, status FROM products ORDER BY featured DESC, id ASC LIMIT 50;',
        true
      );
    }
  }, [activeSubTab, authWarning, runSql]);

  const handleRunLiveDbHealthCheck = async () => {
    setIsTestingDbHealth(true);
    try {
      const { data } = await apiJson<{
        ok?: boolean;
        engineLabel?: string;
        latencyMs?: number;
        details?: string;
        lastConnectionError?: string;
      }>('/api/admin/db/test-connection', {
        method: 'POST',
      });
      setDbHealthReport({
        ok: Boolean(data.ok),
        engineLabel: String(data.engineLabel || dbStatus?.engineLabel || ''),
        latencyMs: Number(data.latencyMs || 0),
        details: String(data.details || ''),
        lastConnectionError: data.lastConnectionError
          ? String(data.lastConnectionError)
          : undefined,
      });
      await loadDbAndBackups();
      if (data.ok) {
        onNotice(
          'success',
          `تست نوشتن و خواندن در دیتابیس (${data.engineLabel}) در ${data.latencyMs}ms با موفقیت انجام شد.`
        );
      } else {
        onNotice('error', data.details || 'خطا در تست اتصال دیتابیس');
      }
    } catch {
      onNotice('error', 'خطا در ارتباط با سرور برای تست سلامت دیتابیس');
    } finally {
      setIsTestingDbHealth(false);
    }
  };

  const handleCreateBackup = async (
    format: 'json' | 'sql',
    dispatchRemote = false
  ) => {
    setIsBackingUp(true);
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        content?: string;
        item?: BackupHistoryItem;
        dispatchReport?: string[];
      }>('/api/admin/backup/create', {
        method: 'POST',
        body: JSON.stringify({ format, dispatchRemote }),
      });
      if (!ok) throw new Error(data.error);

      if (data.content && data.item?.filename) {
        const blob = new Blob([data.content], {
          type: 'text/plain;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.item.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      await loadDbAndBackups();
      const extra =
        Array.isArray(data.dispatchReport) && data.dispatchReport.length > 0
          ? ` (${data.dispatchReport.join(' · ')})`
          : '';
      onNotice(
        'success',
        `نسخه پشتیبان ${data.item?.filename || ''} با موفقیت ایجاد شد.${extra}`
      );
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در تهیه نسخه پشتیبان'
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadHistoryItem = async (item: BackupHistoryItem) => {
    try {
      const res = await apiFetch(`/api/admin/backup/download/${item.id}`);
      if (!res.ok) throw new Error('خطا در دانلود بکاپ');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      onNotice('error', 'فایل پشتیبان مورد نظر روی سرور یافت نشد.');
    }
  };

  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setRestoreContent(String(reader.result || ''));
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleExecuteRestore = async () => {
    if (!restoreContent.trim()) {
      onNotice('error', 'ابتدا یک فایل پشتیبان .json یا .sql انتخاب کنید.');
      return;
    }
    setIsRestoring(true);
    try {
      const format = restoreFilename.endsWith('.sql') ? 'sql' : 'json';
      const { ok, data } = await apiJson<{
        error?: string;
        restoredRows?: number;
      }>('/api/admin/backup/restore', {
        method: 'POST',
        body: JSON.stringify({ content: restoreContent, format }),
      });
      if (!ok) throw new Error(data.error || 'خطای بازگردانی بکاپ');
      onNotice(
        'success',
        `بازگردانی موفق انجام شد! ${Number(
          data.restoredRows || 0
        ).toLocaleString('fa-IR')} رکورد در جداول ثبت شد.`
      );
      setRestoreContent('');
      setRestoreFilename('');
      await loadDbAndBackups();
      onDataRestored?.();
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در بازیابی اطلاعات'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      const { ok } = await apiJson('/api/admin/backup/settings', {
        method: 'POST',
        body: JSON.stringify(scheduleCfg),
      });
      if (!ok) throw new Error();
      onNotice(
        'success',
        'تنظیمات بکاپ روزانه، فرمت خروجی، ایمیل SMTP و ربات بله در دیتابیس ذخیره شد.'
      );
    } catch {
      onNotice('error', 'خطا در ذخیره تنظیمات زمان‌بندی بکاپ');
    }
  };

  const handleTestBale = async () => {
    try {
      const { ok, data } = await apiJson<{ error?: string; message?: string }>(
        '/api/admin/backup/test-bale',
        {
          method: 'POST',
          body: JSON.stringify({
            baleBotToken: scheduleCfg.baleBotToken,
            baleChatId: scheduleCfg.baleChatId,
          }),
        }
      );
      if (!ok) throw new Error(data.error);
      onNotice('success', data.message || 'پیام تست به ربات بله ارسال شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ارسال به بله');
    }
  };

  const handleTestSmtp = async () => {
    try {
      const { ok, data } = await apiJson<{ error?: string; message?: string }>(
        '/api/admin/backup/test-smtp',
        {
          method: 'POST',
          body: JSON.stringify(scheduleCfg),
        }
      );
      if (!ok) throw new Error(data.error);
      onNotice('success', data.message || 'ایمیل تست با موفقیت ارسال شد.');
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در تست ایمیل SMTP'
      );
    }
  };

  return (
    <div className="space-y-6">
      {authWarning && (
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{authWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadDbAndBackups()}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-extrabold cursor-pointer shrink-0"
          >
            تلاش مجدد
          </button>
        </div>
      )}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mb-1">
              <Database className="w-4 h-4" />
              <span>
                موتور دیتابیس رابطه‌ای و سیستم بکاپ‌گیری خودکار (PostgreSQL 16 /
                SQLite)
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
              تنظیمات بکاپ‌گیری، ارسال به جیمیل / بله، بازیابی و بازبینی زنده
              دیتابیس
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-1">
              <span>
                موتور فعال:{' '}
                <strong className="text-[#1D4ED8] dark:text-sky-400">
                  {dbStatus?.engineLabel || 'در حال بررسی...'}
                </strong>{' '}
                (
                <span dir="ltr" className="font-mono">
                  {dbStatus?.databasePathOrHost}
                </span>
                )
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                {(dbStatus?.tablesCount || 12).toLocaleString('fa-IR')} جدول
                فعال · {(dbStatus?.sizeKb || 0).toLocaleString('fa-IR')} KB
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isBackingUp}
              onClick={() => void handleCreateBackup('sql', false)}
              className="px-3.5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>دانلود بکاپ SQL (PostgreSQL)</span>
            </button>

            <button
              type="button"
              disabled={isBackingUp}
              onClick={() => void handleCreateBackup('json', false)}
              className="px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>دانلود بکاپ JSON</span>
            </button>

            <button
              type="button"
              disabled={isBackingUp}
              onClick={() =>
                void handleCreateBackup(
                  scheduleCfg.autoBackupFormat === 'json' ? 'json' : 'sql',
                  true
                )
              }
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Server className="w-4 h-4" />
              <span>بکاپ فوری + ارسال به ایمیل/بله</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('backup_settings')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                activeSubTab === 'backup_settings'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              ۱. تنظیمات بکاپ‌گیری، زمان‌بندی خودکار (SQL/JSON) و بازیابی
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('db_inspector')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
                activeSubTab === 'db_inspector'
                  ? 'bg-[#1D4ED8] text-white shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              ۲. تست سلامت اتصال دیتابیس (PostgreSQL / SQLite) و بازبینی جداول
              SQL
            </button>
          </div>

          <button
            type="button"
            disabled={isTestingDbHealth}
            onClick={() => void handleRunLiveDbHealthCheck()}
            className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/20"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isTestingDbHealth ? 'animate-spin' : ''}`}
            />
            <span>
              {isTestingDbHealth
                ? 'در حال تست نوشتن/خواندن...'
                : 'تست زنده اتصال و نوشتن در دیتابیس'}
            </span>
          </button>
        </div>

        {(dbHealthReport || dbStatus?.lastConnectionError) && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              dbHealthReport?.ok
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
            }`}
          >
            {dbHealthReport && (
              <div className="font-extrabold flex flex-wrap items-center justify-between gap-2">
                <span>{dbHealthReport.details}</span>
                <span
                  className="px-2 py-0.5 rounded bg-black/10 font-mono"
                  dir="ltr"
                >
                  Latency: {dbHealthReport.latencyMs} ms
                </span>
              </div>
            )}
            {dbStatus?.lastConnectionError && (
              <div className="text-[11px] opacity-90">
                <strong>گزارش اتصال PostgreSQL:</strong>{' '}
                <span className="font-mono" dir="ltr">
                  {dbStatus.lastConnectionError}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {activeSubTab === 'backup_settings' && (
        <div className="space-y-6">
          <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1D4ED8]" />
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  تنظیمات بکاپ‌گیری خودکار روزانه، فرمت خروجی (SQL / JSON) و
                  ارسال به جیمیل / بله
                </h3>
              </div>

              <button
                type="button"
                onClick={handleSaveSchedule}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
              >
                ذخیره تنظیمات پشتیبان‌گیری
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleCfg.autoDailyEnabled}
                  onChange={(e) =>
                    setScheduleCfg({
                      ...scheduleCfg,
                      autoDailyEnabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-emerald-600"
                />
                <div>
                  <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                    پشتیبان‌گیری خودکار روزانه
                  </div>
                  <div className="text-[11px] text-stone-500">
                    تهیه اسنپ‌شات کامل از دیتابیس و ارسال به مقاصد فعال
                  </div>
                </div>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-stone-600 dark:text-stone-300 shrink-0">
                  فرمت فایل بکاپ:
                </span>
                <select
                  value={scheduleCfg.autoBackupFormat || 'both'}
                  onChange={(e) =>
                    setScheduleCfg({
                      ...scheduleCfg,
                      autoBackupFormat: e.target.value as 'sql' | 'json' | 'both',
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                >
                  <option value="both">هر دو فرمت استاندارد (SQL + JSON)</option>
                  <option value="sql">
                    فقط اسکریپت استاندارد PostgreSQL (.sql)
                  </option>
                  <option value="json">فقط اسنپ‌شات کامل (.json)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-stone-600 dark:text-stone-300 shrink-0">
                  ساعت اجرای روزانه:
                </span>
                <select
                  value={scheduleCfg.scheduleHour}
                  onChange={(e) =>
                    setScheduleCfg({
                      ...scheduleCfg,
                      scheduleHour: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 smooth-nums"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      ساعت {String(h).padStart(2, '0')}:۰۰
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SMTP */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-extrabold text-stone-900 dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleCfg.smtpEnabled}
                    onChange={(e) =>
                      setScheduleCfg({
                        ...scheduleCfg,
                        smtpEnabled: e.target.checked,
                      })
                    }
                  />
                  <Mail className="w-4 h-4 text-[#1D4ED8]" />
                  <span>ارسال فایل بکاپ به ایمیل / جیمیل (SMTP Port 587)</span>
                </label>
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  className="px-3 py-1.5 rounded-lg border border-blue-400 text-[#1D4ED8] dark:text-sky-300 text-xs font-bold cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30"
                >
                  تست ارسال ایمیل
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                <input
                  type="text"
                  dir="ltr"
                  value={scheduleCfg.smtpHost}
                  onChange={(e) =>
                    setScheduleCfg({ ...scheduleCfg, smtpHost: e.target.value })
                  }
                  placeholder="smtp.gmail.com"
                  className="px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
                <input
                  type="number"
                  dir="ltr"
                  value={scheduleCfg.smtpPort}
                  onChange={(e) =>
                    setScheduleCfg({
                      ...scheduleCfg,
                      smtpPort: Number(e.target.value),
                    })
                  }
                  placeholder="587"
                  className="px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
                <input
                  type="email"
                  dir="ltr"
                  value={scheduleCfg.smtpUser}
                  onChange={(e) =>
                    setScheduleCfg({ ...scheduleCfg, smtpUser: e.target.value })
                  }
                  placeholder="sender@gmail.com"
                  className="px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
                <input
                  type="password"
                  dir="ltr"
                  value={scheduleCfg.smtpPass}
                  onChange={(e) =>
                    setScheduleCfg({ ...scheduleCfg, smtpPass: e.target.value })
                  }
                  placeholder="Gmail App Password"
                  className="px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
                <input
                  type="email"
                  dir="ltr"
                  value={scheduleCfg.smtpTargetEmail}
                  onChange={(e) =>
                    setScheduleCfg({
                      ...scheduleCfg,
                      smtpTargetEmail: e.target.value,
                    })
                  }
                  placeholder="target@gmail.com"
                  className="px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
            </div>

            {/* Bale Bot API */}
            <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-extrabold text-stone-900 dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleCfg.baleEnabled}
                    onChange={(e) =>
                      setScheduleCfg({
                        ...scheduleCfg,
                        baleEnabled: e.target.checked,
                      })
                    }
                  />
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>
                    ارسال فایل بکاپ به ربات در پیام‌رسان بله (Bale Bot API)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleTestBale}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  تست ارسال به بله
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  dir="ltr"
                  value={scheduleCfg.baleBotToken}
                  onChange={(e) =>
                    setScheduleCfg({
                      ...scheduleCfg,
                      baleBotToken: e.target.value,
                    })
                  }
                  placeholder="Bot Token (مثال: 194829148:AAH...)"
                  className="px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
                <input
                  type="text"
                  dir="ltr"
                  value={scheduleCfg.baleChatId}
                  onChange={(e) =>
                    setScheduleCfg({
                      ...scheduleCfg,
                      baleChatId: e.target.value,
                    })
                  }
                  placeholder="شناسه چت / کانال (Chat ID)"
                  className="px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
            </div>
          </div>

          {/* Restore Card */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>بازگردانی و بازیابی اطلاعات سیستم (Restore Backup)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  آپلود فایل‌های پشتیبان کامل با پسوند{' '}
                  <strong dir="ltr">.sql</strong> یا{' '}
                  <strong dir="ltr">.json</strong> برای بازیابی ایمن تمامی جداول
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                پشتیبانی از SQL و JSON
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-dashed border-amber-400/70 bg-amber-50/30 dark:bg-amber-950/15">
              <input
                type="file"
                accept=".json,.sql"
                onChange={handleSelectRestoreFile}
                className="text-xs flex-1 file:ml-3 file:px-3.5 file:py-2 file:rounded-lg file:border-0 file:bg-stone-900 file:text-white file:text-xs file:font-bold cursor-pointer"
              />
              {restoreFilename && (
                <span
                  className="text-xs font-mono text-emerald-700 dark:text-emerald-300"
                  dir="ltr"
                >
                  {restoreFilename}
                </span>
              )}
              <button
                type="button"
                disabled={isRestoring || !restoreContent}
                onClick={handleExecuteRestore}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isRestoring
                  ? 'در حال بازگردانی...'
                  : 'اجرای بازگردانی و ثبت در سامانه'}
              </button>
            </div>
          </div>

          {/* History Table */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              تاریخچه فایل‌های پشتیبان و وضعیت ارسال (
              {history.length.toLocaleString('fa-IR')})
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-stone-500">
                هنوز بکاپی تهیه نشده است. با دکمه‌های بالای صفحه اولین نسخه
                پشتیبان SQL یا JSON را بسازید.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-500">
                      <th className="py-2.5 px-3">نام فایل پشتیبان</th>
                      <th className="py-2.5 px-3">تاریخ و ساعت</th>
                      <th className="py-2.5 px-3">نوع</th>
                      <th className="py-2.5 px-3">مقصد ارسال</th>
                      <th className="py-2.5 px-3">وضعیت</th>
                      <th className="py-2.5 px-3">دانلود</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-mono font-bold" dir="ltr">
                          {item.filename}
                        </td>
                        <td className="py-2.5 px-3 smooth-nums">
                          {item.createdAtFa}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[11px] font-bold">
                            {item.triggerType === 'scheduled'
                              ? 'زمان‌بندی‌شده'
                              : 'دستی'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-stone-600 dark:text-stone-400">
                          {item.destination} (
                          {Math.max(
                            1,
                            Math.round(item.sizeBytes / 1024)
                          ).toLocaleString('fa-IR')}{' '}
                          KB)
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                            موفق
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => void handleDownloadHistoryItem(item)}
                            className="text-[#1D4ED8] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>دانلود</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'db_inspector' && (
        <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
                <span>
                  وضعیت زنده جداول دیتابیس (
                  {(dbStatus?.tablesCount || 12).toLocaleString('fa-IR')} جدول
                  فعال)
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  حجم دیتابیس: {(dbStatus?.sizeKb || 0).toLocaleString('fa-IR')}{' '}
                  کیلوبایت
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                روی هر جدول کلیک کنید تا آخرین رکوردهای زنده از سرور خوانده شود.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadDbAndBackups()}
              className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>بروزرسانی آمار جداول</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {(dbStatus?.tables || []).map((tbl) => {
              const active = selectedTable === tbl.name;
              return (
                <button
                  key={tbl.name}
                  type="button"
                  onClick={() => {
                    setSelectedTable(tbl.name);
                    setSqlInput(tbl.defaultQuery);
                    void runSql(tbl.defaultQuery);
                  }}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    active
                      ? 'border-emerald-600 bg-emerald-900 text-white shadow-sm'
                      : 'border-stone-200 dark:border-stone-800 hover:border-emerald-500/50 bg-stone-50/70 dark:bg-stone-950/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-extrabold" dir="ltr">
                      {tbl.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold smooth-nums ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {tbl.rowCount.toLocaleString('fa-IR')} رکورد
                    </span>
                  </div>
                  <div
                    className={`text-[11px] mt-1 truncate ${
                      active ? 'text-emerald-100' : 'text-stone-500'
                    }`}
                  >
                    {tbl.description}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              dir="ltr"
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs font-mono rounded-xl bg-stone-950 text-emerald-300 border border-stone-800 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              disabled={isRunningQuery}
              onClick={() => void runSql(sqlInput)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {isRunningQuery
                  ? 'در حال اجرا...'
                  : 'اجرای کوئری SELECT روی سرور'}
              </span>
            </button>
          </div>

          {sqlResult && (
            <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl">
              <div className="px-4 py-2 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 smooth-nums">
                <span>
                  تعداد ردیف‌های بازگشتی:{' '}
                  {sqlResult.rowCount.toLocaleString('fa-IR')}
                </span>
                <span>
                  زمان اجرا:{' '}
                  {sqlResult.executionMs.toLocaleString('fa-IR')} میلی‌ثانیه
                </span>
              </div>
              {sqlResult.rows.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500">
                  رکوردی در این جدول یافت نشد.
                </div>
              ) : (
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-stone-100/70 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
                      {sqlResult.columns.map((col) => (
                        <th
                          key={col}
                          dir="ltr"
                          className="px-3 py-2 font-mono text-[11px] font-extrabold text-stone-700 dark:text-stone-300 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {sqlResult.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-stone-50/70 dark:hover:bg-stone-950/50"
                      >
                        {sqlResult.columns.map((col) => {
                          const rawVal = row[col];
                          const displayVal =
                            rawVal === null || rawVal === undefined
                              ? '—'
                              : String(rawVal).length > 85
                              ? String(rawVal).slice(0, 85) + '...'
                              : String(rawVal);
                          return (
                            <td
                              key={col}
                              className="px-3 py-2 text-stone-700 dark:text-stone-300 max-w-xs truncate"
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase 10: Selective Demo Cleaner + Orphan Media Cleaner */}
      <MaintenanceCleanersCard
        onNotice={onNotice}
        onCleaned={() => {
          void loadDbAndBackups();
          onDataRestored?.();
        }}
      />
    </div>
  );
};
