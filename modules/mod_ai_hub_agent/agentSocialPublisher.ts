import fs from 'fs';
import path from 'path';
import { dbExec, dbQuery, formatPersianDateTime } from '../../src/server/database/connection.js';
import { writeSystemLog } from '../../src/server/database/settingsLogsRepo.js';
import { decryptSecret } from '../../src/server/core/secretVault.js';
import { getEnvConfig } from '../../src/server/core/envConfig.js';
import { logDeliveryEvent } from '../mod_delivery_logs/deliveryLogsRouter.js';
import {
  ensureAiHubSchema,
  getAiHubSettings,
  getSocialPublisherConfig,
  type SocialPublisherStoredConfig,
} from './aiHubSchema.js';
import { generateTextViaSlot } from './aiProviderGateway.js';
import { queueAgentApproval } from './agentToolsEngine.js';
import { resolveBaleBotTokenOnly } from './baleAlertBridge.js';
import { assertSafePublicUrl, generateAndOptimizeWebpCover } from './agentContentFactory.js';
import type { AgentToolContext, ExecutedToolRecord } from './agentToolCallingEngine.js';

export type SocialChannelKey = 'bale' | 'telegram' | 'instagram';
export type InstagramFormatType = 'post' | 'carousel' | 'reel' | 'story';

export interface GeneratedSocialCopy {
  balePost: string;
  telegramPost: string;
  instagramHook: string;
  instagramCaption: string;
  instagramScript: string;
  instagramHashtags: string[];
  imagePromptEn: string;
}

export interface ChannelDispatchOutcome {
  channel: SocialChannelKey;
  status: 'published' | 'queued_for_approval' | 'package_ready' | 'skipped' | 'failed';
  detail: string;
}

function sanitizeBotToken(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^bot/i, '')
    .replace(/[^\w:-]/g, '');
}

function resolveAppBaseUrl(): string {
  const env = getEnvConfig();
  if (env.appUrl && /^https?:\/\//i.test(env.appUrl)) {
    return env.appUrl.replace(/\/+$/, '');
  }
  if (env.appDomain) {
    const clean = env.appDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    return `https://${clean}`;
  }
  return 'https://skill98.ir';
}

function resolveFullPublicAssetUrl(imageUrl: string): string {
  const clean = String(imageUrl || '').trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith('/')) {
    return `${resolveAppBaseUrl()}${clean}`;
  }
  return '';
}

function resolveLocalUploadFile(imageUrl: string): { buffer: Buffer; filename: string; mimeType: string } | null {
  const clean = String(imageUrl || '').trim();
  if (!clean.startsWith('/uploads/') || clean.includes('..') || clean.includes('_protected_downloads')) {
    return null;
  }
  const relPath = clean.replace(/^\/uploads\//, '');
  const roots = [
    path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')),
    path.resolve(process.cwd(), 'public', 'uploads'),
  ];

  for (const baseDir of roots) {
    const resolved = path.resolve(baseDir, relPath);
    if (!resolved.startsWith(baseDir + path.sep)) continue;
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        const buffer = fs.readFileSync(resolved);
        const ext = path.extname(resolved).toLowerCase();
        const mimeType =
          ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : 'image/webp';
        return { buffer, filename: path.basename(resolved), mimeType };
      }
    } catch {
      // try next root
    }
  }
  return null;
}

async function resolveTelegramApiBase(proxyUrl?: string): Promise<string> {
  const cleanProxy = String(proxyUrl || '').trim().replace(/\/+$/, '');
  if (!cleanProxy) {
    return 'https://api.telegram.org';
  }
  const safe = await assertSafePublicUrl(cleanProxy);
  return safe.toString().replace(/\/+$/, '');
}

async function sendTelegramOrBalePost(params: {
  platform: 'bale' | 'telegram';
  apiBase: string;
  botToken: string;
  chatId: string;
  text: string;
  imageUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const cleanToken = sanitizeBotToken(params.botToken);
  const cleanChatId = String(params.chatId || '').trim();
  if (!cleanToken || !cleanChatId) {
    return { ok: false, error: 'توکن ربات یا شناسه کانال تنظیم نشده است.' };
  }

  const caption = String(params.text || '').trim().slice(0, 1000);
  const fullText = String(params.text || '').trim().slice(0, 3900);
  const localImg = params.imageUrl ? resolveLocalUploadFile(params.imageUrl) : null;
  const publicImgUrl = params.imageUrl ? resolveFullPublicAssetUrl(params.imageUrl) : '';

  // Try sending photo first if available, then fallback gracefully to sendMessage
  if (localImg) {
    try {
      const form = new FormData();
      form.append('chat_id', cleanChatId);
      form.append('caption', caption);
      form.append(
        'photo',
        new Blob([new Uint8Array(localImg.buffer)], { type: localImg.mimeType }),
        localImg.filename
      );
      const photoResp = await fetch(`${params.apiBase}/bot${cleanToken}/sendPhoto`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
        body: form,
      });
      const photoJson = (await photoResp.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
      };
      if (photoResp.ok && photoJson.ok) {
        return { ok: true };
      }
    } catch {
      // fallback to text post below
    }
  } else if (publicImgUrl && /^https:\/\//i.test(publicImgUrl)) {
    try {
      const photoResp = await fetch(`${params.apiBase}/bot${cleanToken}/sendPhoto`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          photo: publicImgUrl,
          caption,
        }),
      });
      const photoJson = (await photoResp.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
      };
      if (photoResp.ok && photoJson.ok) {
        return { ok: true };
      }
    } catch {
      // fallback to sendMessage
    }
  }

  try {
    const resp = await fetch(`${params.apiBase}/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: fullText,
      }),
    });
    const raw = await resp.text().catch(() => '');
    let parsed: { ok?: boolean; description?: string } = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = { ok: false, description: raw.slice(0, 200) };
    }
    if (resp.ok && parsed.ok === true) {
      return { ok: true };
    }
    return { ok: false, error: parsed.description || `HTTP ${resp.status}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'network_error',
    };
  }
}

async function publishToInstagramMetaGraph(params: {
  accountId: string;
  accessToken: string;
  caption: string;
  imageUrl: string;
}): Promise<{ ok: boolean; mediaId?: string; error?: string }> {
  const accountId = String(params.accountId || '').trim().replace(/[^0-9A-Za-z_-]/g, '');
  const accessToken = String(params.accessToken || '').trim();
  const publicImgUrl = resolveFullPublicAssetUrl(params.imageUrl);

  if (!accountId || !accessToken) {
    return { ok: false, error: 'شناسه اکانت یا Access Token اینستاگرام تنظیم نشده است.' };
  }
  if (!publicImgUrl || !/^https:\/\//i.test(publicImgUrl)) {
    return {
      ok: false,
      error:
        'برای انتشار مستقیم از طریق Meta Graph API یک تصویر با آدرس عمومی HTTPS الزامی است (یا حالت را روی «بسته آماده کپی» بگذارید).',
    };
  }

  try {
    const createBody = new URLSearchParams({
      image_url: publicImgUrl,
      caption: params.caption.slice(0, 2100),
      access_token: accessToken,
    });
    const createResp = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(accountId)}/media`,
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(18_000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: createBody.toString(),
      }
    );
    const createJson = (await createResp.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (!createResp.ok || !createJson.id) {
      return {
        ok: false,
        error: createJson.error?.message || `خطای ایجاد مدیا در Meta API (HTTP ${createResp.status})`,
      };
    }

    const publishBody = new URLSearchParams({
      creation_id: createJson.id,
      access_token: accessToken,
    });
    const pubResp = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(accountId)}/media_publish`,
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(18_000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishBody.toString(),
      }
    );
    const pubJson = (await pubResp.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (!pubResp.ok || !pubJson.id) {
      return {
        ok: false,
        error: pubJson.error?.message || `خطای انتشار در Meta API (HTTP ${pubResp.status})`,
      };
    }
    return { ok: true, mediaId: pubJson.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'meta_graph_network_error',
    };
  }
}

export async function testSocialChannelConnection(channel: 'bale' | 'telegram'): Promise<{
  ok: boolean;
  channel: 'bale' | 'telegram';
  target?: string;
  usedProxy?: boolean;
  error?: string;
}> {
  await ensureAiHubSchema();
  const cfg = await getSocialPublisherConfig();

  if (channel === 'bale') {
    const channelId = String(cfg.baleChannelId || '').trim();
    if (!channelId) {
      return { ok: false, channel, error: 'شناسه کانال بله (baleChannelId) وارد نشده است.' };
    }
    const baleBot = await resolveBaleBotTokenOnly();
    if (!baleBot) {
      return {
        ok: false,
        channel,
        error: 'توکن ربات بله در سامانه یافت نشد. ابتدا ربات بله را در بخش ربات‌ها یا تنظیمات پیامک ذخیره کنید.',
      };
    }
    const res = await sendTelegramOrBalePost({
      platform: 'bale',
      apiBase: 'https://tapi.bale.ai',
      botToken: baleBot.botToken,
      chatId: channelId,
      text: `🧪 تست اتصال انتشار هوشمند در کانال بله\n✅ ایجنت ۲۴/۷ اسکیل ۹۸ آماده انتشار پست در این کانال است.\n🕒 ${formatPersianDateTime()}`,
    });
    await logDeliveryEvent({
      channel: 'bot',
      provider: 'social_bale_channel',
      recipient: channelId,
      eventKey: 'social_channel_test_bale',
      status: res.ok ? 'sent' : 'failed',
      errorMessage: res.error || '',
      messagePreview: 'تست انتشار کانال بله',
    }).catch(() => {});
    return { ok: res.ok, channel, target: channelId, error: res.error };
  }

  // Telegram channel test (supports optional Cloudflare Worker / reverse proxy URL)
  const tgToken = decryptSecret(cfg.telegramBotTokenEnc);
  const tgChannelId = String(cfg.telegramChannelId || '').trim();
  if (!tgToken || !tgChannelId) {
    return {
      ok: false,
      channel,
      error: 'توکن ربات تلگرام و شناسه کانال تلگرام الزامی هستند.',
    };
  }

  let apiBase = 'https://api.telegram.org';
  try {
    apiBase = await resolveTelegramApiBase(cfg.telegramProxyUrl);
  } catch (err) {
    return {
      ok: false,
      channel,
      error: err instanceof Error ? err.message : 'آدرس پروکسی تلگرام نامعتبر است.',
    };
  }

  const res = await sendTelegramOrBalePost({
    platform: 'telegram',
    apiBase,
    botToken: tgToken,
    chatId: tgChannelId,
    text: `🧪 تست اتصال انتشار هوشمند در کانال تلگرام\n✅ ایجنت ۲۴/۷ اسکیل ۹۸ آماده انتشار پست در این کانال است.\n🕒 ${formatPersianDateTime()}`,
  });
  await logDeliveryEvent({
    channel: 'bot',
    provider: 'social_telegram_channel',
    recipient: tgChannelId,
    eventKey: 'social_channel_test_telegram',
    status: res.ok ? 'sent' : 'failed',
    errorMessage: res.error || '',
    messagePreview: 'تست انتشار کانال تلگرام',
  }).catch(() => {});

  return {
    ok: res.ok,
    channel,
    target: tgChannelId,
    usedProxy: Boolean(cfg.telegramProxyUrl),
    error: res.error,
  };
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function craftPlatformTailoredPersianCopy(params: {
  title: string;
  summary: string;
  category: string;
  priceLabel: string;
  ctaUrl: string;
  instagramFormat: InstagramFormatType;
  customNotes?: string;
}): Promise<GeneratedSocialCopy> {
  const fallbackHashtags = ['#اسکیل۹۸', '#هوش_مصنوعی', '#آموزش_تخصصی', '#ابزار_هوشمند'];
  const fallback: GeneratedSocialCopy = {
    balePost: [
      `✨ ${params.title}`,
      '',
      params.summary || 'معرفی جدید و کاربردی در سامانه اسکیل ۹۸.',
      params.priceLabel ? `💳 ${params.priceLabel}` : '',
      '',
      `🔗 مشاهده جزئیات و دریافت:`,
      params.ctaUrl,
      '',
      fallbackHashtags.join(' '),
    ]
      .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
      .join('\n'),
    telegramPost: [
      `🚀 ${params.title}`,
      '',
      params.summary || 'محتوای جدید منتشر شد.',
      params.priceLabel ? `💎 ${params.priceLabel}` : '',
      '',
      `👇 همین حالا مشاهده کنید:`,
      params.ctaUrl,
      '',
      fallbackHashtags.join(' '),
    ]
      .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
      .join('\n'),
    instagramHook: `🎯 دنبال یک راه سریع و حرفه‌ای برای «${params.title}» هستی؟`,
    instagramCaption: [
      `🎯 ${params.title}`,
      '',
      params.summary || 'یک معرفی کوتاه، کاربردی و آماده اجرا برای رشد سریع‌تر شما.',
      params.priceLabel ? `📌 ${params.priceLabel}` : '',
      '',
      `📲 برای دریافت لینک مستقیم، کلمه «لینک» را کامنت کنید یا از بیو وارد شوید:`,
      params.ctaUrl,
    ]
      .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
      .join('\n'),
    instagramScript:
      params.instagramFormat === 'carousel'
        ? `اسلاید ۱ (قلاب): ${params.title}\nاسلاید ۲ (چالش): چرا روش‌های قدیمی وقت‌گیر هستند؟\nاسلاید ۳ (راه‌حل): ${params.summary.slice(0, 140)}\nاسلاید ۴ (دعوت به اقدام): ذخیره کن و از لینک بیو دریافت کن.`
        : params.instagramFormat === 'reel'
        ? `ثانیه ۰ تا ۳ (قلاب): اگر دنبال «${params.title}» هستی این ریلز رو از دست نده!\nثانیه ۳ تا ۲۰ (ارزش اصلی): ${params.summary.slice(0, 180)}\nثانیه ۲۰ تا ۳۰ (CTA): کلمه «لینک» رو کامنت کن تا آدرس صفحه برات ارسال بشه.`
        : params.instagramFormat === 'story'
        ? `استوری ۱: نظرسنجی جذاب درباره «${params.title}»\nاستوری ۲: معرفی سریع مزایا + استیکر لینک مستقیم (${params.ctaUrl})`
        : `تصویر اصلی شاخص + تیتر کوتاه فارسی روی کاور: «${params.title}»`,
    instagramHashtags: fallbackHashtags,
    imagePromptEn: `Modern clean minimalist Persian tech editorial square banner for "${params.title}", soft studio lighting, cobalt blue and obsidian accents, crisp 3D geometric composition, no text`,
  };

  try {
    const prompt = `به عنوان متخصص بازاریابی محتوایی شبکه‌های اجتماعی ایران (بله، تلگرام، اینستاگرام)، برای محتوای زیر کپی اختصاصی و حرفه‌ای فارسی تولید کن.
عنوان: ${params.title}
دسته‌بندی: ${params.category || 'عمومی'}
توضیح: ${params.summary || '-'}
قیمت/وضعیت: ${params.priceLabel || '-'}
لینک مستقیم CTA: ${params.ctaUrl}
فرمت اینستاگرام: ${params.instagramFormat}
${params.customNotes ? `توضیحات تکمیلی سوپر ادمین: ${params.customNotes}` : ''}

خروجی را دقیقاً فقط یک JSON معتبر بدون هیچ متن اضافه با کلیدهای زیر برگردان:
{
  "balePost": "متن کوتاه، خوانا، با ایموجی مناسب، هشتگ و لینک CTA برای کانال بله",
  "telegramPost": "متن جذاب، ساختارمند با بولت‌پوینت، ایموجی، هشتگ و لینک CTA برای کانال تلگرام",
  "instagramHook": "جمله قلاب ۳ ثانیه اول برای اینستاگرام",
  "instagramCaption": "کپشن کامل و تعاملی اینستاگرام با دعوت به اقدام (CTA) و اشاره به لینک",
  "instagramScript": "سناریوی دقیق متناسب با فرمت ${params.instagramFormat} (اسلایدبندی کاروسل یا ثانیه‌بندی ریلز یا استوری)",
  "instagramHashtags": ["#هشتگ۱", "#هشتگ۲", "#هشتگ۳", "#هشتگ۴", "#هشتگ۵"],
  "imagePromptEn": "Detailed English visual prompt for generating a clean high-resolution social graphic (no text)"
}`;

    const ai = await generateTextViaSlot({
      slot: 'text_seo',
      systemPrompt:
        'You are a senior Persian social media strategist. Return ONLY valid JSON with crisp natural Persian copy, clean formatting, and zero markdown fences.',
      userPrompt: prompt,
      jsonMode: true,
    });
    const parsed = tryParseJsonObject(ai.text);
    if (!parsed) return fallback;

    const tags = Array.isArray(parsed.instagramHashtags)
      ? parsed.instagramHashtags
          .map((t) => String(t || '').trim())
          .filter(Boolean)
          .map((t) => (t.startsWith('#') ? t : `#${t}`))
          .slice(0, 10)
      : fallbackHashtags;

    return {
      balePost: String(parsed.balePost || fallback.balePost).trim(),
      telegramPost: String(parsed.telegramPost || fallback.telegramPost).trim(),
      instagramHook: String(parsed.instagramHook || fallback.instagramHook).trim(),
      instagramCaption: String(parsed.instagramCaption || fallback.instagramCaption).trim(),
      instagramScript: String(parsed.instagramScript || fallback.instagramScript).trim(),
      instagramHashtags: tags.length > 0 ? tags : fallbackHashtags,
      imagePromptEn: String(parsed.imagePromptEn || fallback.imagePromptEn).trim(),
    };
  } catch {
    return fallback;
  }
}

async function dispatchToEnabledChannels(params: {
  channels: SocialChannelKey[];
  copy: GeneratedSocialCopy;
  imageUrl: string;
  cfg: SocialPublisherStoredConfig;
  packageId: string;
}): Promise<ChannelDispatchOutcome[]> {
  const outcomes: ChannelDispatchOutcome[] = [];

  for (const ch of params.channels) {
    if (ch === 'bale') {
      if (!params.cfg.baleChannelEnabled || !params.cfg.baleChannelId) {
        outcomes.push({
          channel: 'bale',
          status: 'skipped',
          detail: 'کانال بله در تنظیمات انتشار غیرفعال است یا شناسه کانال وارد نشده.',
        });
        continue;
      }
      const baleBot = await resolveBaleBotTokenOnly();
      if (!baleBot) {
        outcomes.push({
          channel: 'bale',
          status: 'failed',
          detail: 'توکن ربات بله در سامانه تنظیم نشده است.',
        });
        continue;
      }
      const res = await sendTelegramOrBalePost({
        platform: 'bale',
        apiBase: 'https://tapi.bale.ai',
        botToken: baleBot.botToken,
        chatId: params.cfg.baleChannelId,
        text: params.copy.balePost,
        imageUrl: params.imageUrl,
      });
      await logDeliveryEvent({
        channel: 'bot',
        provider: 'social_bale_channel',
        recipient: params.cfg.baleChannelId,
        eventKey: 'social_publish_bale',
        status: res.ok ? 'sent' : 'failed',
        errorMessage: res.error || '',
        messagePreview: params.copy.balePost.slice(0, 140),
      }).catch(() => {});
      outcomes.push({
        channel: 'bale',
        status: res.ok ? 'published' : 'failed',
        detail: res.ok
          ? `با موفقیت در کانال بله (${params.cfg.baleChannelId}) منتشر شد.`
          : `خطا در انتشار بله: ${res.error || 'نامشخص'}`,
      });
    } else if (ch === 'telegram') {
      if (!params.cfg.telegramChannelEnabled || !params.cfg.telegramChannelId) {
        outcomes.push({
          channel: 'telegram',
          status: 'skipped',
          detail: 'کانال تلگرام غیرفعال است یا شناسه کانال وارد نشده.',
        });
        continue;
      }
      const tgToken = decryptSecret(params.cfg.telegramBotTokenEnc);
      if (!tgToken) {
        outcomes.push({
          channel: 'telegram',
          status: 'failed',
          detail: 'توکن ربات تلگرام ذخیره نشده است.',
        });
        continue;
      }
      let apiBase = 'https://api.telegram.org';
      try {
        apiBase = await resolveTelegramApiBase(params.cfg.telegramProxyUrl);
      } catch (err) {
        outcomes.push({
          channel: 'telegram',
          status: 'failed',
          detail: err instanceof Error ? err.message : 'آدرس پروکسی تلگرام نامعتبر است.',
        });
        continue;
      }
      const res = await sendTelegramOrBalePost({
        platform: 'telegram',
        apiBase,
        botToken: tgToken,
        chatId: params.cfg.telegramChannelId,
        text: params.copy.telegramPost,
        imageUrl: params.imageUrl,
      });
      await logDeliveryEvent({
        channel: 'bot',
        provider: 'social_telegram_channel',
        recipient: params.cfg.telegramChannelId,
        eventKey: 'social_publish_telegram',
        status: res.ok ? 'sent' : 'failed',
        errorMessage: res.error || '',
        messagePreview: params.copy.telegramPost.slice(0, 140),
      }).catch(() => {});
      outcomes.push({
        channel: 'telegram',
        status: res.ok ? 'published' : 'failed',
        detail: res.ok
          ? `با موفقیت در کانال تلگرام (${params.cfg.telegramChannelId})${
              params.cfg.telegramProxyUrl ? ' از طریق پروکسی اختصاصی' : ''
            } منتشر شد.`
          : `خطا در انتشار تلگرام: ${res.error || 'نامشخص'}`,
      });
    } else if (ch === 'instagram') {
      if (params.cfg.instagramMode === 'meta_graph_api' && params.cfg.instagramEnabled) {
        const accessToken = decryptSecret(params.cfg.instagramAccessTokenEnc);
        const fullCaption = `${params.copy.instagramCaption}\n\n${params.copy.instagramHashtags.join(' ')}`.trim();
        const igRes = await publishToInstagramMetaGraph({
          accountId: params.cfg.instagramAccountId,
          accessToken,
          caption: fullCaption,
          imageUrl: params.imageUrl,
        });
        await logDeliveryEvent({
          channel: 'bot',
          provider: 'social_instagram_meta',
          recipient: params.cfg.instagramAccountId || 'instagram',
          eventKey: 'social_publish_instagram',
          status: igRes.ok ? 'sent' : 'failed',
          errorMessage: igRes.error || '',
          messagePreview: fullCaption.slice(0, 140),
        }).catch(() => {});
        outcomes.push({
          channel: 'instagram',
          status: igRes.ok ? 'published' : 'failed',
          detail: igRes.ok
            ? `با موفقیت در اینستاگرام منتشر شد (media_id: ${igRes.mediaId}).`
            : `خطا در Meta Graph API: ${igRes.error || 'نامشخص'} (بسته آماده کپی در بسته ${params.packageId} ذخیره شده است).`,
        });
      } else {
        outcomes.push({
          channel: 'instagram',
          status: 'package_ready',
          detail: 'بسته کامل اینستاگرام (قلاب، کپشن، اسکریپت، هشتگ و تصویر) آماده کپی و دانلود است.',
        });
      }
    }
  }

  return outcomes;
}

/**
 * Called by `POST /api/v1/modules/ai-hub/agent/approvals/:id/decide` when Super Admin
 * approves a queued `social_publish` approval item with 1 click.
 */
export async function executeQueuedSocialApproval(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  outcomes: ChannelDispatchOutcome[];
  summaryFa: string;
}> {
  await ensureAiHubSchema();
  const packageId = String(payload.packageId || '').trim();
  const channels = Array.isArray(payload.channels)
    ? (payload.channels.filter((c) => ['bale', 'telegram', 'instagram'].includes(String(c))) as SocialChannelKey[])
    : [];
  const copy = payload.copy as GeneratedSocialCopy | undefined;
  const imageUrl = String(payload.imageUrl || '').trim();

  if (!copy || channels.length === 0) {
    return {
      ok: false,
      outcomes: [],
      summaryFa: 'اطلاعات پست صف تایید ناقص است.',
    };
  }

  const cfg = await getSocialPublisherConfig();
  const outcomes = await dispatchToEnabledChannels({
    channels,
    copy,
    imageUrl,
    cfg,
    packageId: packageId || `pkg_${Date.now()}`,
  });

  const anyPublished = outcomes.some((o) => o.status === 'published');
  const nextStatus = anyPublished ? 'published' : 'approved';
  if (packageId) {
    await dbExec('UPDATE mod_ai_social_packages SET status = $1 WHERE id = $2', [
      nextStatus,
      packageId,
    ]).catch(() => {});
  }

  const summaryFa = outcomes.map((o) => `${o.channel}: ${o.detail}`).join(' | ');
  await writeSystemLog({
    level: anyPublished ? 'success' : 'warning',
    category: 'system',
    title: `اجرای تایید ۱-کلیکی انتشار شبکه اجتماعی (${packageId || 'social'})`,
    detail: summaryFa,
    sqlOrEndpoint: 'APPROVAL social_publish',
  }).catch(() => {});

  return { ok: true, outcomes, summaryFa };
}

/**
 * Agent Tool: `publish_or_draft_social_post`
 * Strictly gated to Super Admin AND `jarvisSettings.allowSocialPublisher === true`.
 */
export async function runPublishOrDraftSocialPostTool(
  args: Record<string, unknown>,
  ctx: AgentToolContext
): Promise<ExecutedToolRecord> {
  const toolName = 'publish_or_draft_social_post';
  await ensureAiHubSchema();

  if (ctx.actorRole !== 'super_admin') {
    return {
      tool: toolName,
      args,
      ok: false,
      summary: 'دسترسی رد شد: ابزار انتشار در شبکه‌های اجتماعی فقط مخصوص سوپر ادمین است.',
    };
  }

  const hubSettings = await getAiHubSettings();
  if (!hubSettings.jarvisSettings?.allowSocialPublisher) {
    return {
      tool: toolName,
      args,
      ok: false,
      summary:
        'انتشار خودکار در شبکه‌های اجتماعی در حال حاضر خاموش است. برای فعال‌سازی، در پنل «هاب هوش مصنوعی ← تنظیمات دستیار جارویس» کلید «اجازه انتشار در شبکه‌های اجتماعی» را روشن کنید.',
    };
  }

  const socialCfg = await getSocialPublisherConfig();

  const rawEntityType = String(args.entityType || ctx.pageContext?.entityType || 'custom').toLowerCase();
  const entityType: 'product' | 'article' | 'custom' =
    rawEntityType === 'product'
      ? 'product'
      : rawEntityType === 'article'
      ? 'article'
      : 'custom';
  const entityId = String(
    args.entityId || ctx.pageContext?.entityId || ctx.pageContext?.entitySlug || ''
  ).trim();
  const rawFormat = String(args.instagramFormat || 'post').toLowerCase();
  const instagramFormat: InstagramFormatType = ['post', 'carousel', 'reel', 'story'].includes(rawFormat)
    ? (rawFormat as InstagramFormatType)
    : 'post';

  // Parse requested channels (supports array or comma-separated string)
  let requestedChannels: SocialChannelKey[] = [];
  if (Array.isArray(args.channels)) {
    requestedChannels = args.channels
      .map((c) => String(c || '').trim().toLowerCase())
      .filter((c): c is SocialChannelKey => ['bale', 'telegram', 'instagram'].includes(c));
  } else if (typeof args.channels === 'string' && args.channels.trim()) {
    requestedChannels = args.channels
      .split(/[,،\s]+/)
      .map((c) => c.trim().toLowerCase())
      .filter((c): c is SocialChannelKey => ['bale', 'telegram', 'instagram'].includes(c));
  }
  if (requestedChannels.length === 0) {
    if (socialCfg.baleChannelEnabled) requestedChannels.push('bale');
    if (socialCfg.telegramChannelEnabled) requestedChannels.push('telegram');
    if (socialCfg.instagramEnabled || requestedChannels.length === 0) requestedChannels.push('instagram');
  }
  requestedChannels = Array.from(new Set(requestedChannels));

  // Hydrate entity from DB when product/article
  let title = String(args.customTitle || '').trim();
  let summary = String(args.customNotes || '').trim();
  let category = '';
  let priceLabel = '';
  let slug = '';
  let imageUrl = '';
  let resolvedEntityId = entityId;

  if (entityType === 'product' && entityId) {
    const rows = await dbQuery<{
      id: string;
      slug: string;
      title: string;
      category: string;
      price: number;
      payload_json: string;
    }>('SELECT id, slug, title, category, price, payload_json FROM products WHERE id = $1 OR slug = $2 LIMIT 1', [
      entityId,
      entityId,
    ]).catch(() => []);
    if (rows[0]) {
      let pJson: Record<string, unknown> = {};
      try {
        pJson = JSON.parse(rows[0].payload_json || '{}') as Record<string, unknown>;
      } catch {
        pJson = {};
      }
      resolvedEntityId = rows[0].id;
      title = title || rows[0].title;
      slug = rows[0].slug;
      category = rows[0].category || '';
      priceLabel =
        Number(rows[0].price || 0) > 0
          ? `قیمت: ${Number(rows[0].price).toLocaleString('fa-IR')} تومان`
          : 'دسترسی رایگان / ویژه اعضا';
      summary =
        summary ||
        String(pJson.shortDescription || pJson.seoDescription || pJson.description || '').trim().slice(0, 500);
      imageUrl = String(pJson.imageUrl || '').trim();
    }
  } else if (entityType === 'article' && entityId) {
    const rows = await dbQuery<{
      id: string;
      slug: string;
      title: string;
      category: string;
      payload_json: string;
    }>('SELECT id, slug, title, category, payload_json FROM articles WHERE id = $1 OR slug = $2 LIMIT 1', [
      entityId,
      entityId,
    ]).catch(() => []);
    if (rows[0]) {
      let aJson: Record<string, unknown> = {};
      try {
        aJson = JSON.parse(rows[0].payload_json || '{}') as Record<string, unknown>;
      } catch {
        aJson = {};
      }
      resolvedEntityId = rows[0].id;
      title = title || rows[0].title;
      slug = rows[0].slug;
      category = rows[0].category || '';
      summary =
        summary ||
        String(aJson.summary || aJson.seoDescription || aJson.excerpt || '').trim().slice(0, 500);
      imageUrl = String(aJson.featuredImageUrl || '').trim();
    }
  }

  if (!title) {
    title = String(ctx.pageContext?.pageTitle || 'محتوای جدید اسکیل ۹۸').trim();
  }

  const baseUrl = resolveAppBaseUrl();
  const ctaUrl =
    entityType === 'product' && slug
      ? `${baseUrl}/product/${encodeURIComponent(slug)}`
      : entityType === 'article' && slug
      ? `${baseUrl}/blog/${encodeURIComponent(slug)}`
      : ctx.pageContext?.path && ctx.pageContext.path !== '/'
      ? `${baseUrl}${ctx.pageContext.path}`
      : baseUrl;

  const copy = await craftPlatformTailoredPersianCopy({
    title,
    summary,
    category,
    priceLabel,
    ctaUrl,
    instagramFormat,
    customNotes: typeof args.customNotes === 'string' ? args.customNotes.trim() : undefined,
  });

  // Optionally generate a visual via Slot 2 when requested or missing
  const shouldGenerateVisual =
    args.generateVisual === true || (!imageUrl && args.generateVisual !== false);
  let visualNote = '';
  if (shouldGenerateVisual && !imageUrl) {
    const coverRes = await generateAndOptimizeWebpCover({
      promptEn: copy.imagePromptEn,
      slug: slug || `social-${Date.now()}`,
      titleFa: title,
      category: entityType === 'article' ? 'article' : 'product',
    });
    if (coverRes.imageUrl) {
      imageUrl = coverRes.imageUrl;
      visualNote = 'تصویر اختصاصی با اسلات ۲ تولید و به WebP بهینه‌سازی شد.';
    } else if (coverRes.note) {
      visualNote = coverRes.note;
    }
  }

  const packageId = `soc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const nowFa = formatPersianDateTime();

  const hasAutoPublishTarget = requestedChannels.some(
    (c) =>
      c === 'bale' ||
      c === 'telegram' ||
      (c === 'instagram' && socialCfg.instagramMode === 'meta_graph_api' && socialCfg.instagramEnabled)
  );

  // Respect `requireApprovalBeforePublish` (default true)
  const mustQueueApproval =
    socialCfg.requireApprovalBeforePublish !== false && hasAutoPublishTarget;

  let approvalId = '';
  let outcomes: ChannelDispatchOutcome[] = [];
  let pkgStatus = 'package_ready';

  if (mustQueueApproval) {
    pkgStatus = 'pending_approval';
    approvalId = await queueAgentApproval({
      titleFa: `انتشار شبکه اجتماعی: ${title.slice(0, 60)}`,
      actionType: 'social_publish',
      summaryFa: `پست آماده انتشار در کانال‌های [${requestedChannels.join('، ')}] برای «${title}». با تایید ۱-کلیکی بلافاصله منتشر می‌شود.`,
      payload: {
        packageId,
        entityType,
        entityId: resolvedEntityId,
        title,
        ctaUrl,
        imageUrl,
        channels: requestedChannels,
        instagramFormat,
        copy,
      },
    });
    outcomes = requestedChannels.map((ch) =>
      ch === 'instagram' && socialCfg.instagramMode !== 'meta_graph_api'
        ? {
            channel: ch,
            status: 'package_ready',
            detail: 'بسته کامل اینستاگرام آماده کپی و دانلود است.',
          }
        : {
            channel: ch,
            status: 'queued_for_approval',
            detail: `در صف تایید ۱-کلیکی (${approvalId}) ثبت و برای تایید به بله ارسال شد.`,
          }
    );
  } else {
    const wantsImmediate = args.publishImmediately !== false;
    if (wantsImmediate && hasAutoPublishTarget) {
      outcomes = await dispatchToEnabledChannels({
        channels: requestedChannels,
        copy,
        imageUrl,
        cfg: socialCfg,
        packageId,
      });
      pkgStatus = outcomes.some((o) => o.status === 'published') ? 'published' : 'package_ready';
    } else {
      outcomes = requestedChannels.map((ch) => ({
        channel: ch,
        status: 'package_ready',
        detail: 'پیش‌نویس آماده کپی و بررسی تولید شد.',
      }));
    }
  }

  await dbExec(
    `INSERT INTO mod_ai_social_packages
     (id, entity_type, entity_id, entity_title, cta_url, image_url, channels_json, instagram_format, payload_json, status, approval_id, created_at_fa, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      packageId,
      entityType,
      resolvedEntityId,
      title,
      ctaUrl,
      imageUrl,
      JSON.stringify(requestedChannels),
      instagramFormat,
      JSON.stringify({ copy, outcomes, visualNote }),
      pkgStatus,
      approvalId,
      nowFa,
      nowIso,
    ]
  );

  await writeSystemLog({
    level: 'success',
    category: 'system',
    title: `تولید/انتشار محتوای شبکه‌های اجتماعی (${title.slice(0, 50)})`,
    detail: `کانال‌ها: ${requestedChannels.join(',')} · وضعیت: ${pkgStatus}${approvalId ? ` · تایید: ${approvalId}` : ''}`,
    sqlOrEndpoint: 'TOOL publish_or_draft_social_post',
  }).catch(() => {});

  const instagramPackage = requestedChannels.includes('instagram')
    ? {
        mode: socialCfg.instagramMode,
        format: instagramFormat,
        hook: copy.instagramHook,
        caption: copy.instagramCaption,
        script: copy.instagramScript,
        hashtags: copy.instagramHashtags.join(' '),
        downloadableImageUrl: imageUrl || '',
        publicImageUrl: resolveFullPublicAssetUrl(imageUrl),
      }
    : undefined;

  return {
    tool: toolName,
    args,
    ok: true,
    summary: mustQueueApproval
      ? `پیش‌نویس پست شبکه‌های اجتماعی (${requestedChannels.join('، ')}) ساخته شد و در صف تایید ۱-کلیکی (${approvalId}) قرار گرفت و به بله ارسال شد.`
      : `محتوای شبکه‌های اجتماعی (${requestedChannels.join('، ')}) پردازش شد: ${outcomes
          .map((o) => `${o.channel}=${o.status}`)
          .join('، ')}.`,
    data: {
      packageId,
      status: pkgStatus,
      approvalId: approvalId || undefined,
      title,
      ctaUrl,
      imageUrl: imageUrl || undefined,
      visualNote: visualNote || undefined,
      outcomes,
      balePost: requestedChannels.includes('bale') ? copy.balePost : undefined,
      telegramPost: requestedChannels.includes('telegram') ? copy.telegramPost : undefined,
      instagramPackage,
    },
  };
}
