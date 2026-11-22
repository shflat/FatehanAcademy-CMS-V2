import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Globe,
  Instagram,
  Loader2,
  Lock,
  Save,
  Send,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

interface SocialPublisherUiConfig {
  baleChannelEnabled: boolean;
  baleChannelId: string;
  telegramChannelEnabled: boolean;
  telegramBotTokenMasked: string;
  hasTelegramBotToken: boolean;
  telegramChannelId: string;
  telegramProxyUrl: string;
  instagramEnabled: boolean;
  instagramMode: 'package_only' | 'meta_graph_api';
  instagramAccountId: string;
  instagramAccessTokenMasked: string;
  hasInstagramAccessToken: boolean;
  requireApprovalBeforePublish: boolean;
  updatedAt: string;
}

interface SocialPackageRow {
  id: string;
  entity_type: string;
  entity_title: string;
  cta_url: string;
  image_url: string;
  channels_json: string;
  instagram_format: string;
  payload_json: string;
  status: string;
  created_at_fa: string;
}

const DEFAULT_SOCIAL_UI: SocialPublisherUiConfig = {
  baleChannelEnabled: false,
  baleChannelId: '',
  telegramChannelEnabled: false,
  telegramBotTokenMasked: '',
  hasTelegramBotToken: false,
  telegramChannelId: '',
  telegramProxyUrl: '',
  instagramEnabled: false,
  instagramMode: 'package_only',
  instagramAccountId: '',
  instagramAccessTokenMasked: '',
  hasInstagramAccessToken: false,
  requireApprovalBeforePublish: true,
  updatedAt: '',
};

export const AiSocialPublisherCard: React.FC<{
  allowSocialPublisher: boolean;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ allowSocialPublisher, onNotice }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<'bale' | 'telegram' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [cfg, setCfg] = useState<SocialPublisherUiConfig>(DEFAULT_SOCIAL_UI);
  const [tgTokenInput, setTgTokenInput] = useState('');
  const [igTokenInput, setIgTokenInput] = useState('');
  const [packages, setPackages] = useState<SocialPackageRow[]>([]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        config?: SocialPublisherUiConfig;
        packages?: SocialPackageRow[];
      }>('/api/v1/modules/ai-hub/agent/social-config');
      if (ok && data.config) {
        setCfg(data.config);
        setTgTokenInput(data.config.telegramBotTokenMasked || '');
        setIgTokenInput(data.config.instagramAccessTokenMasked || '');
        setPackages(data.packages || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        config?: SocialPublisherUiConfig;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/social-config', {
        method: 'POST',
        body: JSON.stringify({
          baleChannelEnabled: cfg.baleChannelEnabled,
          baleChannelId: cfg.baleChannelId,
          telegramChannelEnabled: cfg.telegramChannelEnabled,
          telegramBotToken: tgTokenInput,
          telegramChannelId: cfg.telegramChannelId,
          telegramProxyUrl: cfg.telegramProxyUrl,
          instagramEnabled: cfg.instagramEnabled,
          instagramMode: cfg.instagramMode,
          instagramAccountId: cfg.instagramAccountId,
          instagramAccessToken: igTokenInput,
          requireApprovalBeforePublish: cfg.requireApprovalBeforePublish,
        }),
      });
      if (!ok || !data.config) {
        onNotice?.('error', data.error || 'خطا در ذخیره تنظیمات انتشار در شبکه‌های اجتماعی');
        return;
      }
      setCfg(data.config);
      setTgTokenInput(data.config.telegramBotTokenMasked || '');
      setIgTokenInput(data.config.instagramAccessTokenMasked || '');
      onNotice?.(
        'success',
        'تنظیمات انتشار هوشمند در شبکه‌های اجتماعی ذخیره شد (توکن‌ها با AES-256-GCM رمزنگاری شدند).'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestChannel = async (channel: 'bale' | 'telegram') => {
    setTestingChannel(channel);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        target?: string;
        usedProxy?: boolean;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/social-config/test', {
        method: 'POST',
        body: JSON.stringify({ channel }),
      });
      if (ok) {
        onNotice?.(
          'success',
          channel === 'bale'
            ? `پیام تست با موفقیت در کانال بله (${data.target || '-'}) منتشر شد.`
            : `پیام تست با موفقیت در کانال تلگرام (${data.target || '-'})${
                data.usedProxy ? ' از طریق پروکسی' : ''
              } منتشر شد.`
        );
      } else {
        onNotice?.('error', data.error || 'ارسال تست کانال ناموفق بود.');
      }
    } finally {
      setTestingChannel(null);
    }
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
      onNotice?.('success', 'متن در کلیپ‌بورد کپی شد.');
    } catch {
      onNotice?.('error', 'امکان کپی خودکار در این مرورگر وجود ندارد.');
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-50/35 dark:bg-fuchsia-950/15 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-stone-900 dark:text-white text-xs sm:text-sm">
              تنظیمات انتشار هوشمند در شبکه‌های اجتماعی (بله · تلگرام · اینستاگرام)
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              تولید کپی فارسی اختصاصی هر پلتفرم، هشتگ، لینک CTA و انتشار مستقیم یا صف تایید ۱-کلیکی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold ${
              allowSocialPublisher
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
            }`}
          >
            {allowSocialPublisher
              ? 'ابزار انتشار جارویس: روشن'
              : 'ابزار انتشار جارویس: خاموش (کلید بالا را روشن کنید)'}
          </span>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void handleSave()}
            className="px-3.5 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات انتشار'}</span>
          </button>
        </div>
      </div>

      {/* Approval Gate Switch */}
      <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/80 cursor-pointer">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-extrabold text-stone-900 dark:text-white">
              نیاز به تایید قبل از انتشار (صف تایید ۱-کلیکی + ارسال به بله)
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400">
              وقتی روشن است (پیش‌فرض امن)، پیش‌نویس پست‌ها ابتدا در صف تایید ثبت و برای تایید سوپر ادمین به بله ارسال می‌شود؛ وقتی خاموش باشد با دستور سوپر ادمین بلافاصله منتشر می‌شود.
            </div>
          </div>
        </div>
        <input
          type="checkbox"
          checked={cfg.requireApprovalBeforePublish}
          onChange={(e) =>
            setCfg((prev) => ({ ...prev, requireApprovalBeforePublish: e.target.checked }))
          }
          className="w-4 h-4 accent-emerald-600 shrink-0"
        />
      </label>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* 1. Bale Channel */}
        <div className="p-3.5 rounded-xl border border-teal-500/30 bg-white/90 dark:bg-stone-900/85 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 font-extrabold text-stone-900 dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.baleChannelEnabled}
                onChange={(e) =>
                  setCfg((prev) => ({ ...prev, baleChannelEnabled: e.target.checked }))
                }
              />
              <span>کانال بله (رایگان و بومی)</span>
            </label>
            <button
              type="button"
              disabled={testingChannel !== null}
              onClick={() => void handleTestChannel('bale')}
              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {testingChannel === 'bale' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              <span>تست بله</span>
            </button>
          </div>
          <p className="text-[10px] text-stone-500">
            از همان توکن ربات بله ذخیره‌شده در سایت استفاده می‌کند (ربات را ادمین کانال کنید).
          </p>
          <input
            type="text"
            dir="ltr"
            value={cfg.baleChannelId}
            onChange={(e) => setCfg((prev) => ({ ...prev, baleChannelId: e.target.value }))}
            placeholder="@my_bale_channel یا شناسه عددی کانال"
            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-[11px]"
          />
        </div>

        {/* 2. Telegram Channel + Optional Proxy */}
        <div className="p-3.5 rounded-xl border border-sky-500/30 bg-white/90 dark:bg-stone-900/85 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 font-extrabold text-stone-900 dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.telegramChannelEnabled}
                onChange={(e) =>
                  setCfg((prev) => ({ ...prev, telegramChannelEnabled: e.target.checked }))
                }
              />
              <span>کانال تلگرام (+ پروکسی ایران)</span>
            </label>
            <button
              type="button"
              disabled={testingChannel !== null}
              onClick={() => void handleTestChannel('telegram')}
              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {testingChannel === 'telegram' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              <span>تست تلگرام</span>
            </button>
          </div>
          <input
            type="password"
            dir="ltr"
            value={tgTokenInput}
            onChange={(e) => setTgTokenInput(e.target.value)}
            placeholder="Telegram Bot Token (رمزنگاری AES-256-GCM)"
            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-[11px]"
          />
          <input
            type="text"
            dir="ltr"
            value={cfg.telegramChannelId}
            onChange={(e) => setCfg((prev) => ({ ...prev, telegramChannelId: e.target.value }))}
            placeholder="@my_telegram_channel یا -100..."
            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-[11px]"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-stone-500">
              <Globe className="w-3 h-3 text-sky-500" />
              <span>پروکسی اختیاری تلگرام (مناسب سرور ایران، مثلاً Cloudflare Worker):</span>
            </div>
            <input
              type="url"
              dir="ltr"
              value={cfg.telegramProxyUrl}
              onChange={(e) => setCfg((prev) => ({ ...prev, telegramProxyUrl: e.target.value }))}
              placeholder="https://tg-worker.example.workers.dev"
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-[11px]"
            />
          </div>
        </div>

        {/* 3. Instagram (Package Only Free Default | Optional Meta Graph API) */}
        <div className="p-3.5 rounded-xl border border-pink-500/30 bg-white/90 dark:bg-stone-900/85 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 font-extrabold text-stone-900 dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.instagramEnabled}
                onChange={(e) =>
                  setCfg((prev) => ({ ...prev, instagramEnabled: e.target.checked }))
                }
              />
              <Instagram className="w-3.5 h-3.5 text-pink-600" />
              <span>اینستاگرام</span>
            </label>
            <span className="text-[10px] font-bold text-stone-500 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              رمزنگاری‌شده
            </span>
          </div>

          <select
            value={cfg.instagramMode}
            onChange={(e) =>
              setCfg((prev) => ({
                ...prev,
                instagramMode:
                  e.target.value === 'meta_graph_api' ? 'meta_graph_api' : 'package_only',
              }))
            }
            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold text-[11px]"
          >
            <option value="package_only">بسته آماده کپی و دانلود (رایگان - پیش‌فرض)</option>
            <option value="meta_graph_api">انتشار خودکار Meta Graph API (اختیاری)</option>
          </select>

          {cfg.instagramMode === 'meta_graph_api' ? (
            <div className="space-y-2">
              <input
                type="text"
                dir="ltr"
                value={cfg.instagramAccountId}
                onChange={(e) =>
                  setCfg((prev) => ({ ...prev, instagramAccountId: e.target.value }))
                }
                placeholder="Instagram Business Account ID"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-[11px]"
              />
              <input
                type="password"
                dir="ltr"
                value={igTokenInput}
                onChange={(e) => setIgTokenInput(e.target.value)}
                placeholder="Meta Graph Access Token (AES-256-GCM)"
                className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-[11px]"
              />
            </div>
          ) : (
            <p className="text-[10px] text-stone-500 leading-relaxed">
              در حالت رایگان، ایجنت قلاب، کپشن، اسکریپت کاروسل/ریلز/استوری، هشتگ‌ها و فایل تصویر بهینه WebP را آماده کپی و دانلود در اختیار شما قرار می‌دهد.
            </p>
          )}
        </div>
      </div>

      {/* Recent Generated Social & Instagram Packages */}
      {packages.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-fuchsia-200/60 dark:border-fuchsia-900/40">
          <div className="font-extrabold text-stone-800 dark:text-stone-200 text-[11px]">
            آخرین بسته‌های محتوای شبکه‌های اجتماعی تولیدشده ({packages.length.toLocaleString('fa-IR')})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {packages.slice(0, 4).map((pkg) => {
              let copyObj: {
                instagramHook?: string;
                instagramCaption?: string;
                instagramScript?: string;
                instagramHashtags?: string[];
                balePost?: string;
                telegramPost?: string;
              } = {};
              try {
                const parsed = JSON.parse(pkg.payload_json || '{}') as { copy?: typeof copyObj };
                if (parsed.copy) copyObj = parsed.copy;
              } catch {
                // ignore malformed json
              }
              const fullInstagramCopy = [
                copyObj.instagramHook ? `قلاب: ${copyObj.instagramHook}` : '',
                copyObj.instagramCaption || '',
                copyObj.instagramScript ? `\nسناریو (${pkg.instagram_format}):\n${copyObj.instagramScript}` : '',
                Array.isArray(copyObj.instagramHashtags) ? `\n${copyObj.instagramHashtags.join(' ')}` : '',
              ]
                .filter(Boolean)
                .join('\n\n');

              return (
                <div
                  key={pkg.id}
                  className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/80 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-stone-900 dark:text-white truncate">
                      {pkg.entity_title}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-bold shrink-0">
                      {pkg.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-600 dark:text-stone-400 line-clamp-3 whitespace-pre-wrap">
                    {copyObj.instagramCaption || copyObj.balePost || copyObj.telegramPost || '-'}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {fullInstagramCopy && (
                      <button
                        type="button"
                        onClick={() => void copyText(pkg.id, fullInstagramCopy)}
                        className="px-2.5 py-1 rounded-lg bg-pink-500/15 text-pink-700 dark:text-pink-300 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === pkg.id ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>کپی بسته اینستاگرام</span>
                      </button>
                    )}
                    {pkg.image_url &&
                      (/^(https?:\/\/|\/uploads\/)/i.test(pkg.image_url)) && (
                      <a
                        href={pkg.image_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-sky-300 text-[10px] font-extrabold inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>دانلود تصویر</span>
                      </a>
                    )}
                    <span className="text-[9px] text-stone-400 mr-auto">{pkg.created_at_fa}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
