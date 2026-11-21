import React, { useEffect, useState } from 'react';
import { Bot, Loader2, Plus, Send, Webhook } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface BotItem {
  id: string;
  platform: 'bale' | 'eitaa' | 'telegram';
  titleFa: string;
  botTokenMasked: string;
  chatId: string;
  enabled: boolean;
}

interface WebhookItem {
  id: string;
  titleFa: string;
  targetUrl: string;
  secretMasked: string;
  enabled: boolean;
}

export const BotsWebhooksPanel: React.FC<{
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ onNotice }) => {
  const [bots, setBots] = useState<BotItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);

  const [platform, setPlatform] = useState<'bale' | 'eitaa' | 'telegram'>('bale');
  const [botTitle, setBotTitle] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');

  const [whTitle, setWhTitle] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whSecret, setWhSecret] = useState('');
  const [savingBot, setSavingBot] = useState(false);
  const [savingWh, setSavingWh] = useState(false);
  const [testingId, setTestingId] = useState<string>('');

  const loadAll = async () => {
    const { ok, data } = await apiJson<{ bots?: BotItem[]; webhooks?: WebhookItem[] }>(
      '/api/v1/modules/bots-webhooks/overview'
    );
    if (ok) {
      setBots(data.bots || []);
      setWebhooks(data.webhooks || []);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBot(true);
    try {
      const { ok, data } = await apiJson<{ error?: string }>('/api/v1/modules/bots-webhooks/bot', {
        method: 'POST',
        body: JSON.stringify({ platform, titleFa: botTitle, botToken, chatId }),
      });
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در ثبت کانال ربات');
        return;
      }
      setBotTitle('');
      setBotToken('');
      setChatId('');
      onNotice?.('success', 'ربات با رمزنگاری AES-256-GCM ذخیره شد (توکن خام هرگز نمایش داده نمی‌شود).');
      await loadAll();
    } finally {
      setSavingBot(false);
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWh(true);
    try {
      const { ok, data } = await apiJson<{ error?: string }>('/api/v1/modules/bots-webhooks/webhook', {
        method: 'POST',
        body: JSON.stringify({ titleFa: whTitle, targetUrl: whUrl, secret: whSecret }),
      });
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در ثبت وب‌هوک');
        return;
      }
      setWhTitle('');
      setWhUrl('');
      setWhSecret('');
      onNotice?.('success', 'وب‌هوک خروجی با امضای HMAC-SHA256 ثبت شد.');
      await loadAll();
    } finally {
      setSavingWh(false);
    }
  };

  const handleTest = async (kind: 'bot' | 'webhook', id: string) => {
    setTestingId(`${kind}:${id}`);
    try {
      const { ok, data } = await apiJson<{ dispatched?: boolean; errorMessage?: string }>(
        `/api/v1/modules/bots-webhooks/${kind}/${encodeURIComponent(id)}/test`,
        { method: 'POST' }
      );
      if (ok && data.dispatched) {
        onNotice?.('success', 'ارسال آزمایشی با موفقیت انجام و در لاگ یکپارچه ثبت شد.');
      } else {
        onNotice?.('error', `خطا در ارسال آزمایشی (${data.errorMessage || 'خطای اتصال'})`);
      }
    } finally {
      setTestingId('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mb-1">
          <Bot className="w-4 h-4" />
          <span>ربات‌های بله / ایتا / تلگرام و وب‌هوک‌های خروجی (mod_bots_webhooks)</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white">
          اتصال ایمن پیام‌رسان‌ها و سرویس‌های بیرونی با رمزنگاری AES-256-GCM و ثبت خودکار در لاگ یکپارچه
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form
          onSubmit={(e) => void handleSaveBot(e)}
          className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3"
        >
          <div className="text-xs font-extrabold flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-emerald-600" />
            <span>افزودن ربات (بله / ایتا / تلگرام)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'bale' | 'eitaa' | 'telegram')}
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-bold"
            >
              <option value="bale">پیام‌رسان بله (Bale)</option>
              <option value="eitaa">پیام‌رسان ایتا (Eitaa)</option>
              <option value="telegram">تلگرام (Telegram)</option>
            </select>
            <input
              type="text"
              required
              value={botTitle}
              onChange={(e) => setBotTitle(e.target.value)}
              placeholder="عنوان کانال (مثلاً: اطلاع سفارش)"
              className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
            />
          </div>
          <input
            type="password"
            dir="ltr"
            required
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={
              platform === 'eitaa'
                ? 'توکن ایتایار (مثال: bot12345:xxxx-xxxx)'
                : 'Bot Token (مثال: 194829148:AAH...)'
            }
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
          />
          <input
            type="text"
            dir="ltr"
            required
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder={
              platform === 'eitaa'
                ? 'شناسه کانال/گروه در ایتایار (عدد یا آیدی بدون @)'
                : 'Chat ID / Channel ID'
            }
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
          />
          <button
            type="submit"
            disabled={savingBot}
            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {savingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{savingBot ? 'در حال ثبت...' : 'ثبت ربات امن'}</span>
          </button>

          <div className="space-y-2 pt-2">
            {bots.map((b) => (
              <div key={b.id} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-extrabold">
                    {b.titleFa} <span className="text-[10px] font-mono text-stone-400">({b.platform})</span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600" dir="ltr">
                    Token: {b.botTokenMasked} · Chat: {b.chatId}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={testingId === `bot:${b.id}`}
                  onClick={() => void handleTest('bot', b.id)}
                  className="px-2.5 py-1 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
                >
                  {testingId === `bot:${b.id}` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>{testingId === `bot:${b.id}` ? 'ارسال...' : 'تست'}</span>
                </button>
              </div>
            ))}
          </div>
        </form>

        <form
          onSubmit={(e) => void handleSaveWebhook(e)}
          className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3"
        >
          <div className="text-xs font-extrabold flex items-center gap-1.5">
            <Webhook className="w-4 h-4 text-amber-600" />
            <span>افزودن وب‌هوک خروجی (HMAC-SHA256)</span>
          </div>
          <input
            type="text"
            required
            value={whTitle}
            onChange={(e) => setWhTitle(e.target.value)}
            placeholder="عنوان وب‌هوک (مثلاً: اتصال به CRM حسابداری)"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <input
            type="url"
            dir="ltr"
            required
            value={whUrl}
            onChange={(e) => setWhUrl(e.target.value)}
            placeholder="https://example.com/webhooks/orders"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
          />
          <input
            type="password"
            dir="ltr"
            value={whSecret}
            onChange={(e) => setWhSecret(e.target.value)}
            placeholder="Signing Secret (اختیاری — تولید خودکار)"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs font-mono"
          />
          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-amber-600 text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> ثبت وب‌هوک
          </button>

          <div className="space-y-2 pt-2">
            {webhooks.map((w) => (
              <div key={w.id} className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-extrabold">{w.titleFa}</div>
                  <div className="text-[10px] font-mono text-stone-500 truncate" dir="ltr">
                    {w.targetUrl} · Secret: {w.secretMasked}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleTest('webhook', w.id)}
                  className="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Send className="w-3 h-3" /> تست
                </button>
              </div>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
};
