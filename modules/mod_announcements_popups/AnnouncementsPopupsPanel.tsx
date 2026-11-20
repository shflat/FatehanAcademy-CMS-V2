import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface PopupItem {
  id: string;
  kind: 'announcement_bar' | 'modal_popup';
  title: string;
  message: string;
  cta_label?: string;
  cta_url?: string;
  trigger_delay_sec: number;
  tone: string;
  enabled: number;
}

export const AnnouncementsPopupsPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [items, setItems] = useState<PopupItem[]>([]);
  const [kind, setKind] = useState<'announcement_bar' | 'modal_popup'>('announcement_bar');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('#catalog');
  const [delaySec, setDelaySec] = useState(5);

  const loadItems = async () => {
    const { ok, data } = await apiJson<{ items?: PopupItem[] }>('/api/v1/modules/announcements');
    if (ok) setItems(data.items || []);
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await apiJson<{ error?: string }>('/api/v1/modules/announcements', {
      method: 'POST',
      body: JSON.stringify({
        kind,
        title,
        message,
        ctaLabel,
        ctaUrl,
        triggerDelaySec: delaySec,
        tone: 'cobalt',
        enabled: true,
      }),
    });
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در ثبت اطلاعیه');
      return;
    }
    setTitle('');
    setMessage('');
    setCtaLabel('');
    onNotice?.('success', 'اطلاعیه / پاپ‌آپ با موفقیت ایجاد و فعال شد.');
    void loadItems();
  };

  const handleToggle = async (item: PopupItem) => {
    await apiJson('/api/v1/modules/announcements', {
      method: 'POST',
      body: JSON.stringify({
        id: item.id,
        kind: item.kind,
        title: item.title,
        message: item.message,
        ctaLabel: item.cta_label,
        ctaUrl: item.cta_url,
        triggerDelaySec: item.trigger_delay_sec,
        tone: item.tone,
        enabled: !item.enabled,
      }),
    });
    void loadItems();
  };

  const handleDelete = async (id: string) => {
    await apiJson(`/api/v1/modules/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });
    onNotice?.('success', 'اطلاعیه حذف شد.');
    void loadItems();
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
          <Megaphone className="w-4 h-4" />
          <span>اطلاعیه‌های هدر و پاپ‌آپ‌های هوشمند (mod_announcements_popups)</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
          مدیریت نوار اعلان بالای سایت و پاپ‌آپ‌های زمان‌دار تبلیغاتی بدون کدنویسی
        </h2>
      </div>

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as 'announcement_bar' | 'modal_popup')}
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
        >
          <option value="announcement_bar">نوار اطلاعیه بالای سایت (Announcement Bar)</option>
          <option value="modal_popup">پاپ‌آپ مودال زمان‌دار (Timed Popup)</option>
        </select>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان اطلاعیه یا پاپ‌آپ"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <textarea
          rows={2}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="متن پیام اطلاع‌رسانی یا کد تخفیف..."
          className="md:col-span-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <input
          type="text"
          value={ctaLabel}
          onChange={(e) => setCtaLabel(e.target.value)}
          placeholder="متن دکمه (اختیاری)"
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            dir="ltr"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="لینک هدف (#catalog)"
            className="flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
          />
          {kind === 'modal_popup' && (
            <input
              type="number"
              min={0}
              max={60}
              value={delaySec}
              onChange={(e) => setDelaySec(Number(e.target.value))}
              className="w-20 px-2 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs text-center"
              title="تاخیر نمایش (ثانیه)"
            />
          )}
        </div>
        <button
          type="submit"
          className="md:col-span-2 py-2.5 rounded-xl bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت و فعال‌سازی اطلاعیه جدید</span>
        </button>
      </form>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-[#1D4ED8] text-[10px] font-extrabold">
                  {item.kind === 'modal_popup' ? 'پاپ‌آپ مودال' : 'نوار اعلان'}
                </span>
                <strong className="text-xs font-extrabold text-stone-900 dark:text-white">
                  {item.title}
                </strong>
              </div>
              <p className="text-xs text-stone-500">{item.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(item.enabled)}
                  onChange={() => void handleToggle(item)}
                  className="accent-emerald-600 w-4 h-4"
                />
                <span>{item.enabled ? 'فعال' : 'غیرفعال'}</span>
              </label>
              <button
                type="button"
                onClick={() => void handleDelete(item.id)}
                className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
