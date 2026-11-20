import React, { useEffect, useState } from 'react';
import { History, ShieldAlert, Wrench } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface MaintenanceCfg {
  enabled: boolean;
  titleFa: string;
  messageFa: string;
  etaTextFa: string;
  allowAdminBypass: boolean;
}

interface AuditRow {
  id: string;
  actor_phone: string;
  actor_role: string;
  action_key: string;
  summary_fa: string;
  created_at_fa: string;
}

export const MaintenanceAuditPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [cfg, setCfg] = useState<MaintenanceCfg>({
    enabled: false,
    titleFa: 'سامانه در حال به‌روزرسانی برنامه‌ریزی‌شده است',
    messageFa: 'لطفاً چند دقیقه دیگر مجدداً تلاش کنید.',
    etaTextFa: 'بازگشت تا ۳۰ دقیقه آینده',
    allowAdminBypass: true,
  });
  const [events, setEvents] = useState<AuditRow[]>([]);

  const loadAll = async () => {
    const { ok, data } = await apiJson<{ maintenance?: MaintenanceCfg; events?: AuditRow[] }>(
      '/api/v1/modules/maintenance/admin/overview'
    );
    if (ok) {
      if (data.maintenance) setCfg(data.maintenance);
      setEvents(data.events || []);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{ error?: string }>(
      '/api/v1/modules/maintenance/admin/config',
      { method: 'POST', body: JSON.stringify(cfg) }
    );
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در ذخیره وضعیت تعمیرات');
      return;
    }
    onNotice?.(
      'success',
      cfg.enabled
        ? 'حالت تعمیرات فعال شد (مدیران با بای‌پس همچنان دسترسی دارند).'
        : 'حالت تعمیرات غیرفعال شد و سایت برای همه باز است.'
    );
    void loadAll();
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5 mb-1">
          <Wrench className="w-4 h-4" />
          <span>حالت تعمیرات (Maintenance Mode) و گزارش ممیزی مدیران (mod_maintenance_audit)</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
          بستن موقت ویترین برای به‌روزرسانی همراه با بای‌پس مدیران و ثبت تاریخچه اقدامات حساس
        </h2>
      </div>

      <form
        onSubmit={(e) => void handleSave(e)}
        className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3"
      >
        <label className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/35 bg-amber-500/10 cursor-pointer">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4" />
            <span>فعال‌سازی حالت تعمیرات و «به‌زودی برمی‌گردیم» برای بازدیدکنندگان</span>
          </div>
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => setCfg((p) => ({ ...p, enabled: e.target.checked }))}
            className="w-5 h-5 accent-amber-600 cursor-pointer"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={cfg.titleFa}
            onChange={(e) => setCfg((p) => ({ ...p, titleFa: e.target.value }))}
            placeholder="عنوان صفحه تعمیرات"
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <input
            type="text"
            value={cfg.etaTextFa}
            onChange={(e) => setCfg((p) => ({ ...p, etaTextFa: e.target.value }))}
            placeholder="زمان تقریبی بازگشت"
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
        </div>
        <textarea
          rows={2}
          value={cfg.messageFa}
          onChange={(e) => setCfg((p) => ({ ...p, messageFa: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold cursor-pointer"
        >
          ذخیره تنظیمات حالت تعمیرات
        </button>
      </form>

      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2.5">
        <div className="text-xs font-extrabold flex items-center gap-1.5">
          <History className="w-4 h-4 text-[#1D4ED8]" />
          <span>تاریخچه ممیزی اقدامات (Audit Trail · {events.length.toLocaleString('fa-IR')})</span>
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-stone-400">هنوز رویداد ممیزی ثبت نشده است.</p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {events.map((ev) => (
              <div key={ev.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono text-[10px]">
                    {ev.action_key}
                  </span>{' '}
                  <span className="font-bold">{ev.summary_fa}</span>
                </div>
                <div className="text-[11px] text-stone-400 shrink-0 smooth-nums">
                  {ev.actor_phone} · {ev.created_at_fa}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
