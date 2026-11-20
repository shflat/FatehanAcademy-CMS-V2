import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Bot,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Webhook,
  XCircle,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface DeliveryLogRow {
  id: string;
  channel: 'sms' | 'push' | 'bot' | 'webhook';
  provider: string;
  recipient: string;
  event_key?: string;
  message_preview: string;
  status: 'sent' | 'failed' | 'sandbox';
  http_status?: number;
  error_message?: string;
  created_at_fa: string;
}

const CHANNEL_META: Record<string, { label: string; badge: string }> = {
  sms: { label: 'پیامک (SMS)', badge: 'bg-blue-500/15 text-[#1D4ED8] dark:text-sky-300' },
  push: { label: 'وب‌پوش (Push)', badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300' },
  bot: { label: 'ربات پیام‌رسان', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  webhook: { label: 'وب‌هوک (Webhook)', badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
};

export const DeliveryLogsPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [logs, setLogs] = useState<DeliveryLogRow[]>([]);
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ channel, status, q: search });
      const { ok, data } = await apiJson<{ logs?: DeliveryLogRow[] }>(
        `/api/v1/modules/delivery-logs?${qs.toString()}`
      );
      if (ok) setLogs(data.logs || []);
    } finally {
      setLoading(false);
    }
  }, [channel, status, search]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleClear = async () => {
    const { ok } = await apiJson('/api/v1/modules/delivery-logs/clear', { method: 'DELETE' });
    if (ok) {
      setLogs([]);
      onNotice?.('success', 'تمامی رکوردهای لاگ یکپارچه ارسال‌ها پاک‌سازی شد.');
    }
  };

  const sentCount = logs.filter((l) => l.status === 'sent' || l.status === 'sandbox').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold text-[#1D4ED8] flex items-center gap-1.5 mb-1">
            <Send className="w-4 h-4" />
            <span>لاگ یکپارچه ارسال‌ها (Unified Delivery Logs · mod_delivery_logs)</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
            ثبت و پایش دقیق تمامی ارسال‌های پیامک، وب‌پوش، ربات‌ها (بله/ایتا/تلگرام) و وب‌هوک‌ها
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>
          <button
            type="button"
            onClick={() => void handleClear()}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>پاک‌سازی لاگ‌ها</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="text-[11px] text-stone-500">کل ارسال‌های ثبت‌شده</div>
          <div className="text-lg font-black smooth-nums">{logs.length.toLocaleString('fa-IR')}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400">ارسال موفق / سندباکس</div>
          <div className="text-lg font-black text-emerald-600 smooth-nums">{sentCount.toLocaleString('fa-IR')}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5">
          <div className="text-[11px] text-rose-700 dark:text-rose-400">خطا در ارسال</div>
          <div className="text-lg font-black text-rose-600 smooth-nums">{failedCount.toLocaleString('fa-IR')}</div>
        </div>
        <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center gap-2 text-xs text-stone-500">
          <MessageSquare className="w-4 h-4 text-[#1D4ED8]" />
          <Bell className="w-4 h-4 text-purple-600" />
          <Bot className="w-4 h-4 text-emerald-600" />
          <Webhook className="w-4 h-4 text-amber-600" />
          <span className="font-bold">۴ کانال یکپارچه</span>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center gap-2.5">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
        >
          <option value="all">همه کانال‌ها</option>
          <option value="sms">پیامک (SMS)</option>
          <option value="push">اعلان وب‌پوش (Push)</option>
          <option value="bot">ربات‌ها (بله/ایتا/تلگرام)</option>
          <option value="webhook">وب‌هوک‌ها (Webhook)</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="sent">ارسال موفق</option>
          <option value="sandbox">حالت سندباکس</option>
          <option value="failed">ناموفق / خطا</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در گیرنده، سرویس‌دهنده یا متن پیام..."
            className="w-full pr-9 pl-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            <tr>
              <th className="p-3">کانال / سرویس</th>
              <th className="p-3">گیرنده</th>
              <th className="p-3">متن پیام / خطا</th>
              <th className="p-3">وضعیت</th>
              <th className="p-3">زمان ثبت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-400">
                  هنوز رویداد ارسالی در این فیلتر ثبت نشده است.
                </td>
              </tr>
            ) : (
              logs.map((row) => {
                const meta = CHANNEL_META[row.channel] || { label: row.channel, badge: 'bg-stone-100 text-stone-600' };
                return (
                  <tr key={row.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-950/40">
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <div className="text-[11px] font-mono text-stone-500 mt-1">{row.provider}</div>
                    </td>
                    <td className="p-3 font-mono text-[11px]" dir="ltr">
                      {row.recipient}
                    </td>
                    <td className="p-3 max-w-md">
                      <div className="text-stone-800 dark:text-stone-200 line-clamp-2">{row.message_preview}</div>
                      {row.error_message && (
                        <div className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          خطا: {row.error_message}
                        </div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {row.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold">
                          <XCircle className="w-3 h-3" />
                          ناموفق {row.http_status ? `(${row.http_status})` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                          <CheckCircle2 className="w-3 h-3" />
                          {row.status === 'sandbox' ? 'سندباکس' : 'ارسال موفق'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-stone-500 smooth-nums">{row.created_at_fa}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
