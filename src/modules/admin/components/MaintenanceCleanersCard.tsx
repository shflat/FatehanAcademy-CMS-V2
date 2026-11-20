import React, { useState } from 'react';
import { AlertTriangle, Eraser, FolderSearch, HardDrive, Trash2 } from 'lucide-react';
import { apiJson } from '../../../core/apiClient';

interface OrphanFileItem {
  relPath: string;
  publicUrl: string;
  sizeBytes: number;
}

const DEMO_TARGETS = [
  { key: 'products', label: 'محصولات دمو (products)' },
  { key: 'posts', label: 'مقالات و نوشته‌ها (articles)' },
  { key: 'orders', label: 'سفارش‌های آزمایشی (orders)' },
  { key: 'demoUsers', label: 'کاربران غیر سوپر-ادمین (حفظ اکانت مدیرکل)' },
  { key: 'demoChats', label: 'مکالمات گفتگوی زنده (mod_live_chat)' },
  { key: 'reviews', label: 'دیدگاه‌ها و پرسش‌های محصولات (mod_reviews_qa)' },
] as const;

type DemoKey = (typeof DEMO_TARGETS)[number]['key'];

export const MaintenanceCleanersCard: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
  onCleaned?: () => void;
}> = ({ onNotice, onCleaned }) => {
  const [selectedDemo, setSelectedDemo] = useState<Record<DemoKey, boolean>>({
    products: false,
    posts: false,
    orders: false,
    demoUsers: false,
    demoChats: true,
    reviews: false,
  });
  const [confirmCleanDemo, setConfirmCleanDemo] = useState(false);
  const [cleaningDemo, setCleaningDemo] = useState(false);

  const [scanningOrphans, setScanningOrphans] = useState(false);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [orphans, setOrphans] = useState<OrphanFileItem[]>([]);
  const [scannedTotal, setScannedTotal] = useState<number | null>(null);
  const [selectedOrphans, setSelectedOrphans] = useState<string[]>([]);

  const selectedDemoCount = Object.values(selectedDemo).filter(Boolean).length;

  const handleRunDemoClean = async () => {
    if (selectedDemoCount === 0) {
      onNotice?.('error', 'لطفاً حداقل یک بخش را برای پاک‌سازی انتخاب کنید.');
      return;
    }
    setCleaningDemo(true);
    try {
      const { ok, data } = await apiJson<{ totalRemoved?: number; error?: string }>(
        '/api/admin/maintenance/clean-demo',
        {
          method: 'POST',
          body: JSON.stringify(selectedDemo),
        }
      );
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در پاک‌سازی انتخابی داده‌ها');
        return;
      }
      setConfirmCleanDemo(false);
      onNotice?.(
        'success',
        `پاک‌سازی انتخابی انجام شد: ${(data.totalRemoved || 0).toLocaleString('fa-IR')} رکورد حذف گردید.`
      );
      onCleaned?.();
    } finally {
      setCleaningDemo(false);
    }
  };

  const handleScanOrphans = async () => {
    setScanningOrphans(true);
    try {
      const { ok, data } = await apiJson<{
        scannedCount?: number;
        orphans?: OrphanFileItem[];
        error?: string;
      }>('/api/admin/maintenance/orphan-media');
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در اسکن پوشه uploads');
        return;
      }
      const list = data.orphans || [];
      setOrphans(list);
      setScannedTotal(data.scannedCount ?? 0);
      setSelectedOrphans(list.map((o) => o.relPath));
      onNotice?.(
        'success',
        `اسکن کامل شد: ${list.length.toLocaleString('fa-IR')} فایل بلااستفاده از مجموع ${(data.scannedCount || 0).toLocaleString('fa-IR')} فایل شناسایی شد.`
      );
    } finally {
      setScanningOrphans(false);
    }
  };

  const handleDeleteOrphans = async () => {
    if (selectedOrphans.length === 0) return;
    setCleaningOrphans(true);
    try {
      const { ok, data } = await apiJson<{
        deletedCount?: number;
        freedBytes?: number;
        error?: string;
      }>('/api/admin/maintenance/orphan-media/clean', {
        method: 'POST',
        body: JSON.stringify({ relPaths: selectedOrphans }),
      });
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در حذف فایل‌های بلااستفاده');
        return;
      }
      setOrphans((prev) => prev.filter((f) => !selectedOrphans.includes(f.relPath)));
      setSelectedOrphans([]);
      onNotice?.(
        'success',
        `${(data.deletedCount || 0).toLocaleString('fa-IR')} فایل بلااستفاده حذف و ${Math.round((data.freedBytes || 0) / 1024).toLocaleString('fa-IR')} کیلوبایت فضا آزاد شد.`
      );
    } finally {
      setCleaningOrphans(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Selective Demo Cleaner */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
        <div className="flex items-center gap-2 text-amber-600">
          <Eraser className="w-4 h-4" />
          <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
            پاک‌سازی انتخابی داده‌های دمو (Selective Demo Cleaner)
          </h3>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          بخش‌هایی را که می‌خواهید پیش از انتشار نهایی سایت خالی شوند با تیک انتخاب کنید. حساب سوپر ادمین و تنظیمات هسته همواره محافظت می‌شوند.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEMO_TARGETS.map((item) => (
            <label
              key={item.key}
              className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/60 flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedDemo[item.key]}
                onChange={() =>
                  setSelectedDemo((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                }
                className="w-4 h-4 accent-rose-600 cursor-pointer"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        {!confirmCleanDemo ? (
          <button
            type="button"
            disabled={selectedDemoCount === 0}
            onClick={() => setConfirmCleanDemo(true)}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>پاک‌سازی {selectedDemoCount.toLocaleString('fa-IR')} بخش انتخاب‌شده</span>
          </button>
        ) : (
          <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-2.5">
            <div className="text-xs font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>این عملیات غیرقابل بازگشت است. ابتدا بکاپ بگیرید! ادامه می‌دهید؟</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={cleaningDemo}
                onClick={() => void handleRunDemoClean()}
                className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-xs font-extrabold cursor-pointer"
              >
                {cleaningDemo ? 'در حال پاک‌سازی...' : 'بله، حذف کن'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmCleanDemo(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Orphan Media Cleaner */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#1D4ED8]">
            <HardDrive className="w-4 h-4" />
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              پاک‌ساز فایل‌های رسانه بلااستفاده (Orphan Media Cleaner)
            </h3>
          </div>
          <button
            type="button"
            disabled={scanningOrphans}
            onClick={() => void handleScanOrphans()}
            className="px-3 py-1.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <FolderSearch className="w-3.5 h-3.5" />
            <span>{scanningOrphans ? 'در حال اسکن...' : 'اسکن /uploads'}</span>
          </button>
        </div>

        <p className="text-xs text-stone-500 leading-relaxed">
          پوشه <code className="font-mono">/uploads</code> را با تمام جداول دیتابیس تطبیق می‌دهد (پوشه فایل‌های دانلودی فروشی <code className="font-mono">_protected_downloads</code> مستثنی و محفوظ است).
        </p>

        {scannedTotal !== null && (
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-stone-600 dark:text-stone-300 smooth-nums">
              کل فایل‌های اسکن‌شده: {scannedTotal.toLocaleString('fa-IR')} · فایل‌های بلااستفاده:{' '}
              <span className="text-rose-600 font-black">{orphans.length.toLocaleString('fa-IR')}</span>
            </div>

            {orphans.length > 0 ? (
              <>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
                  {orphans.map((file) => (
                    <label
                      key={file.relPath}
                      className="p-2 flex items-center justify-between gap-2 text-[11px] cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-950"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedOrphans.includes(file.relPath)}
                          onChange={() =>
                            setSelectedOrphans((prev) =>
                              prev.includes(file.relPath)
                                ? prev.filter((p) => p !== file.relPath)
                                : [...prev, file.relPath]
                            )
                          }
                          className="accent-rose-600"
                        />
                        <span className="font-mono truncate" dir="ltr">
                          {file.publicUrl}
                        </span>
                      </span>
                      <span className="text-stone-400 shrink-0 smooth-nums">
                        {Math.max(1, Math.round(file.sizeBytes / 1024)).toLocaleString('fa-IR')} KB
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={cleaningOrphans || selectedOrphans.length === 0}
                  onClick={() => void handleDeleteOrphans()}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
                >
                  {cleaningOrphans
                    ? 'در حال حذف...'
                    : `حذف ${selectedOrphans.length.toLocaleString('fa-IR')} فایل بلااستفاده`}
                </button>
              </>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                هیچ فایل بلااستفاده‌ای در /uploads یافت نشد. فضای دیسک کاملاً بهینه است!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
