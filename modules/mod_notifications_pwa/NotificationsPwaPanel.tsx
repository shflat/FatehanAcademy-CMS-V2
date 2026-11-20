import React, { useEffect, useState } from 'react';
import { Bell, KeyRound, RefreshCw, Send, Smartphone } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface VapidInfo {
  enabled: boolean;
  subject: string;
  publicKey: string;
  privateKeyMasked: string;
  updatedAt: string;
}

interface PushHistoryRow {
  id: string;
  title: string;
  body: string;
  target_url?: string;
  sent_count: number;
  created_at_fa: string;
}

export const NotificationsPwaPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [vapid, setVapid] = useState<VapidInfo | null>(null);
  const [subsCount, setSubsCount] = useState(0);
  const [history, setHistory] = useState<PushHistoryRow[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetUrl, setTargetUrl] = useState('/');
  const [subject, setSubject] = useState('mailto:admin@skill98.ir');
  const [busy, setBusy] = useState(false);

  const loadOverview = async () => {
    const { ok, data } = await apiJson<{
      vapid?: VapidInfo;
      subscriptionsCount?: number;
      history?: PushHistoryRow[];
    }>('/api/v1/modules/pwa/admin/overview');
    if (ok) {
      if (data.vapid) {
        setVapid(data.vapid);
        setSubject(data.vapid.subject);
      }
      setSubsCount(data.subscriptionsCount || 0);
      setHistory(data.history || []);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleRotateVapid = async () => {
    setBusy(true);
    try {
      const { ok, data } = await apiJson<{ vapid?: VapidInfo; error?: string }>(
        '/api/v1/modules/pwa/admin/rotate-vapid',
        { method: 'POST', body: JSON.stringify({ subject, enabled: true }) }
      );
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در تولید کلیدهای VAPID');
        return;
      }
      if (data.vapid) setVapid(data.vapid);
      onNotice?.('success', 'جفت‌کلید جدید VAPID تولید و کلید خصوصی با AES-256-GCM رمزنگاری شد.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const { ok, data } = await apiJson<{ sentCount?: number; error?: string }>(
        '/api/v1/modules/pwa/admin/broadcast',
        { method: 'POST', body: JSON.stringify({ title, body, targetUrl }) }
      );
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در ارسال اعلان وب‌پوش');
        return;
      }
      setTitle('');
      setBody('');
      onNotice?.(
        'success',
        `اعلان وب‌پوش با موفقیت ثبت و به ${(data.sentCount || 0).toLocaleString('fa-IR')} مشترک ارسال شد (ثبت در لاگ یکپارچه).`
      );
      void loadOverview();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold text-purple-600 flex items-center gap-1.5 mb-1">
            <Smartphone className="w-4 h-4" />
            <span>وب‌پوش بومی و اپلیکیشن PWA (mod_notifications_pwa)</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
            مدیریت کلیدهای VAPID (رمزنگاری AES-256-GCM)، مانیفست نصب PWA و ارسال اعلان پوش
          </h2>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold smooth-nums">
          مشترکان فعال پوش: {subsCount.toLocaleString('fa-IR')} دستگاه
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* VAPID Keypair Vault */}
        <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <div className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-[#1D4ED8]" />
            <span>کلیدهای امنیتی VAPID (کلید خصوصی هرگز خام نمایش داده نمی‌شود)</span>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">VAPID Public Key</label>
            <input
              readOnly
              dir="ltr"
              value={vapid?.publicKey || ''}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-[11px] font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">
              VAPID Private Key (AES-256-GCM Masked)
            </label>
            <input
              readOnly
              dir="ltr"
              value={vapid?.privateKeyMasked || '••••'}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-[11px] font-mono text-emerald-600"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">شناسه ایمیل تماس VAPID</label>
            <input
              type="text"
              dir="ltr"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-mono"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRotateVapid()}
            className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تولید مجدد جفت‌کلید VAPID</span>
          </button>
        </div>

        {/* Send Broadcast Push */}
        <form
          onSubmit={(e) => void handleSendPush(e)}
          className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3"
        >
          <div className="text-xs font-extrabold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-purple-600" />
            <span>ارسال اعلان همگانی (Web Push Broadcast)</span>
          </div>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان اعلان (مثلاً: تخفیف ویژه آخر هفته)"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <textarea
            rows={3}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="متن پیام اعلان برای دستگاه‌های نصب‌شده..."
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <input
            type="text"
            dir="ltr"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="/store"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ارسال اعلان وب‌پوش و ثبت در لاگ</span>
          </button>
        </form>
      </div>

      {/* History */}
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2.5">
        <h3 className="text-xs font-extrabold text-stone-700 dark:text-stone-300">تاریخچه اعلان‌های ارسال‌شده</h3>
        {history.length === 0 ? (
          <p className="text-xs text-stone-400">هنوز اعلانی ارسال نشده است.</p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {history.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-extrabold text-stone-900 dark:text-white">{item.title}</div>
                  <div className="text-stone-500">{item.body}</div>
                </div>
                <div className="text-left shrink-0 text-[11px] text-stone-400 smooth-nums">
                  <div className="font-bold text-emerald-600">{item.sent_count.toLocaleString('fa-IR')} دستگاه</div>
                  <div>{item.created_at_fa}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
