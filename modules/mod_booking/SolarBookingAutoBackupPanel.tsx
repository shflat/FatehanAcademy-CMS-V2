import React, { useEffect, useState } from 'react';
import { CalendarCheck, Lock, Plus } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface BookingSlotRow {
  id: string;
  service_title_fa: string;
  expert_name_fa: string;
  jalali_date: string;
  time_window: string;
  capacity: number;
  booked_count: number;
  price_toman: number;
  status: string;
}

interface EncryptedArchiveRow {
  id: string;
  archive_name: string;
  includes_summary: string;
  encryption_algo: string;
  checksum_sha256: string;
  size_bytes: number;
  created_at_fa: string;
}

export const SolarBookingAutoBackupPanel: React.FC<{
  mode: 'booking' | 'auto_backup';
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ mode, onNotice }) => {
  const [slots, setSlots] = useState<BookingSlotRow[]>([]);
  const [serviceTitleFa, setServiceTitleFa] = useState('');
  const [expertNameFa] = useState('دکتر کیانوش فرهمند');
  const [jalaliDate, setJalaliDate] = useState('۱۴۰۵/۰۹/۰۵');
  const [timeWindow, setTimeWindow] = useState('۱۱:۰۰ تا ۱۲:۳۰');
  const [priceToman] = useState(1850000);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [archives, setArchives] = useState<EncryptedArchiveRow[]>([]);
  const [cronExpression, setCronExpression] = useState('0 3 * * *');
  const [s3WebhookUrl, setS3WebhookUrl] = useState('https://s3-backup.skill98.ir/webhook/vault');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === 'booking') {
      void apiJson<{ slots?: BookingSlotRow[] }>('/api/v1/modules/booking/slots').then(
        ({ ok, data }) => {
          if (ok && data.slots) {
            setSlots(data.slots);
            if (data.slots[0]) setSelectedSlotId(data.slots[0].id);
          }
        }
      );
    } else {
      void apiJson<{ archives?: EncryptedArchiveRow[] }>(
        '/api/v1/modules/auto-backup/archives'
      ).then(({ ok, data }) => {
        if (ok && data.archives) setArchives(data.archives);
      });
    }
  }, [mode]);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitleFa.trim()) return;
    const { ok, data } = await apiJson<{ slots?: BookingSlotRow[] }>(
      '/api/v1/modules/booking/slots',
      {
        method: 'POST',
        body: JSON.stringify({ serviceTitleFa, expertNameFa, jalaliDate, timeWindow, priceToman }),
      }
    );
    if (ok && data.slots) {
      setSlots(data.slots);
      setServiceTitleFa('');
      onNotice?.('success', 'سانس جدید در تقویم شمسی ثبت شد.');
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{
      trackingCode?: string;
      slots?: BookingSlotRow[];
      error?: string;
    }>('/api/v1/modules/booking/appointments', {
      method: 'POST',
      body: JSON.stringify({ slotId: selectedSlotId, customerName, customerPhone }),
    });
    if (ok) {
      if (data.slots) setSlots(data.slots);
      setCustomerName('');
      setCustomerPhone('');
      onNotice?.('success', `نوبت شمسی با کد پیگیری ${data.trackingCode} ثبت و پیامک ارسال شد.`);
    } else {
      onNotice?.('error', data.error || 'خطا در ثبت نوبت.');
    }
  };

  const handleRunEncryptedBackup = async () => {
    setBusy(true);
    try {
      const { ok, data } = await apiJson<{
        archiveName?: string;
        archives?: EncryptedArchiveRow[];
      }>('/api/v1/modules/auto-backup/run-encrypted', {
        method: 'POST',
        body: JSON.stringify({
          cronConfig: { enabled: true, cronExpression, s3OrWebhookUrl: s3WebhookUrl },
        }),
      });
      if (ok) {
        if (data.archives) setArchives(data.archives);
        onNotice?.('success', `بکاپ کامل رمزنگاری‌شده (${data.archiveName}) تولید شد.`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'booking') {
    return (
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5">
        <div className="flex items-center gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
          <CalendarCheck className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
              موتور رزرواسیون و نوبت‌دهی با تقویم شمسی (Solar Booking Engine — mod_booking)
            </h3>
            <p className="text-xs text-stone-500">
              تعریف سانس‌های زمانی، ظرفیت، کارشناس و ثبت نوبت با ارسال خودکار کد رهگیری پیامکی
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleCreateSlot(e)} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            type="text"
            value={serviceTitleFa}
            onChange={(e) => setServiceTitleFa(e.target.value)}
            placeholder="عنوان جلسه یا خدمت..."
            className="sm:col-span-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <input
            type="text"
            value={jalaliDate}
            onChange={(e) => setJalaliDate(e.target.value)}
            placeholder="۱۴۰۵/۰۹/۰۵"
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <input
            type="text"
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value)}
            placeholder="۱۱:۰۰ تا ۱۲:۳۰"
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>افزودن سانس شمسی</span>
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {slots.map((s) => (
            <div
              key={s.id}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950 space-y-1.5"
            >
              <div className="text-xs font-extrabold text-stone-900 dark:text-white">
                {s.service_title_fa}
              </div>
              <div className="text-[11px] text-stone-500">
                {s.expert_name_fa} • {s.jalali_date} ({s.time_window})
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="font-bold text-[#1D4ED8] smooth-nums">
                  ظرفیت: {s.booked_count.toLocaleString('fa-IR')} / {s.capacity.toLocaleString('fa-IR')}
                </span>
                <span className="font-black text-emerald-600 smooth-nums">
                  {Number(s.price_toman).toLocaleString('fa-IR')} ت
                </span>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => void handleBookAppointment(e)}
          className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 grid grid-cols-1 sm:grid-cols-4 gap-2"
        >
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold"
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.jalali_date} - {s.service_title_fa}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="نام و نام خانوادگی مراجع"
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
          />
          <input
            type="tel"
            dir="ltr"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="0912..."
            className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-right"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer"
          >
            ثبت نوبت و ارسال پیامک
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white">
              موتور بکاپ خودکار رمزنگاری‌شده AES-256-GCM (دیتابیس کامل + /uploads — mod_auto_backup)
            </h3>
            <p className="text-xs text-stone-500">
              فشرده‌سازی و رمزنگاری تمام ۳۶ جدول SQL و مانیفست تصاویر WebP با زمان‌بندی Cron و ارسال به S3/Webhook
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRunEncryptedBackup()}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer"
        >
          {busy ? 'در حال رمزنگاری AES-256...' : '+ تولید فوری بکاپ رمزنگاری‌شده ZIP.ENC'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          dir="ltr"
          value={cronExpression}
          onChange={(e) => setCronExpression(e.target.value)}
          placeholder="0 3 * * *"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
        />
        <input
          type="url"
          dir="ltr"
          value={s3WebhookUrl}
          onChange={(e) => setS3WebhookUrl(e.target.value)}
          placeholder="https://s3-backup..."
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
      </div>

      <div className="space-y-2">
        {archives.map((a) => (
          <div
            key={a.id}
            className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div>
              <div className="font-extrabold text-stone-900 dark:text-white" dir="ltr">
                {a.archive_name}
              </div>
              <div className="text-[11px] text-stone-500">{a.includes_summary}</div>
            </div>
            <div className="text-left space-y-0.5">
              <div className="text-[10px] font-mono text-emerald-600" dir="ltr">
                SHA256: {a.checksum_sha256.slice(0, 20)}...
              </div>
              <div className="text-[10px] text-stone-400">
                {a.created_at_fa} • {(Number(a.size_bytes) / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
