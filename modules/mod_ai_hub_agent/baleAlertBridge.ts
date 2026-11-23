import crypto from 'crypto';
import { dbQuery, formatPersianDateTime } from '../../src/server/database/connection.js';
import { getSetting, setSetting, writeSystemLog } from '../../src/server/database/settingsLogsRepo.js';
import { decryptSecret } from '../../src/server/core/secretVault.js';
import { logDeliveryEvent } from '../mod_delivery_logs/deliveryLogsRouter.js';
import {
  DEFAULT_BALE_ADMIN_ALERTS,
  ensureAiHubSchema,
  getAiHubSettings,
  isAiHubModuleEnabled,
  saveAiHubSettings,
  type BaleAdminAlertsConfig,
} from './aiHubSchema.js';

export type BaleAlertCategory =
  | 'approval_required'
  | 'user_request'
  | 'order_paid'
  | 'order_failed'
  | 'critical_error'
  | 'agent_escalation'
  | 'daily_briefing'
  | 'heartbeat'
  | 'test';

export interface BaleAlertDispatchResult {
  ok: boolean;
  sent: boolean;
  skippedReason?: string;
  channelSource?: string;
  chatId?: string;
  error?: string;
}

const ALERT_DEDUP_TIMESTAMPS = new Map<string, number>();

function pruneDedupMap(): void {
  if (ALERT_DEDUP_TIMESTAMPS.size <= 400) return;
  const now = Date.now();
  for (const [k, ts] of ALERT_DEDUP_TIMESTAMPS.entries()) {
    if (now - ts > 30 * 60 * 1000) {
      ALERT_DEDUP_TIMESTAMPS.delete(k);
    }
  }
}

export function sanitizeBaleBotToken(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^bot/i, '')
    .replace(/[^\w:-]/g, '');
}

/**
 * Resolves the configured Bale Bot API token (even if no chat_id is set yet).
 * Reused by 1-Click Pairing and Multi-Channel Bale Social Publisher.
 */
export async function resolveBaleBotTokenOnly(): Promise<{
  botToken: string;
  defaultChatId: string;
  source: string;
} | null> {
  // (a) Direct encrypted Bale Bot token saved inside Bale Admin Alerts card
  try {
    const hubCfg = await getAiHubSettings();
    const directEnc = hubCfg.baleAlerts?.baleBotTokenEnc || '';
    const directToken = sanitizeBaleBotToken(decryptSecret(directEnc));
    if (directToken) {
      return {
        botToken: directToken,
        defaultChatId: String(hubCfg.baleAlerts?.overrideChatId || '').trim(),
        source: 'bale_admin_alerts (توکن مستقیم کارت هشدارهای بله)',
      };
    }
  } catch {
    // ignore
  }

  // (b) mod_sms_hub Bale Bot API token (`site_settings: sms_gateway_config`, plus legacy `sms_gateway_settings` fallback)
  for (const settingKey of ['sms_gateway_config', 'sms_gateway_settings'] as const) {
    try {
      const smsCfg = await getSetting<{
        baleBotToken?: string;
        baleChatId?: string;
        providersMap?: {
          bale?: {
            baleBotToken?: string;
            baleChatId?: string;
          };
        };
      }>(settingKey, {});
      const bale = smsCfg?.providersMap?.bale;
      const token = sanitizeBaleBotToken(bale?.baleBotToken || smsCfg?.baleBotToken || '');
      if (token) {
        return {
          botToken: token,
          defaultChatId: String(bale?.baleChatId || smsCfg?.baleChatId || '').trim(),
          source: `mod_sms_hub (${settingKey})`,
        };
      }
    } catch {
      // ignore
    }
  }

  // (c) mod_bots_webhooks enabled Bale Bot channel (`mod_bot_channels`)
  try {
    const bots = await dbQuery<{
      title_fa: string;
      bot_token_enc: string;
      chat_id: string;
      enabled: number;
    }>(
      "SELECT title_fa, bot_token_enc, chat_id, enabled FROM mod_bot_channels WHERE platform = 'bale' AND enabled = 1 ORDER BY updated_at DESC LIMIT 3"
    );

    for (const bot of bots) {
      const token = sanitizeBaleBotToken(decryptSecret(bot.bot_token_enc));
      if (token) {
        return {
          botToken: token,
          defaultChatId: String(bot.chat_id || '').trim(),
          source: `mod_bots_webhooks (${bot.title_fa || 'بله'})`,
        };
      }
    }
  } catch {
    // mod_bot_channels table may not exist yet
  }

  // (d) Fallback: Auto-Backup Bale configuration (`site_settings: backup_schedule_config`)
  try {
    const backupCfg = await getSetting<{
      baleBotToken?: string;
      baleChatId?: string;
    }>('backup_schedule_config', {});
    const token = sanitizeBaleBotToken(backupCfg?.baleBotToken || '');
    if (token) {
      return {
        botToken: token,
        defaultChatId: String(backupCfg?.baleChatId || '').trim(),
        source: 'backup_schedule_config (تنظیمات بکاپ بله)',
      };
    }
  } catch {
    // ignore
  }

  return null;
}

async function resolveSuperAdminBaleTarget(overrideChatId?: string): Promise<{
  botToken: string;
  chatId: string;
  source: string;
} | null> {
  const customChatId = String(overrideChatId || '').trim();
  const resolved = await resolveBaleBotTokenOnly();
  if (!resolved) return null;
  const chatId = customChatId || resolved.defaultChatId;
  if (!chatId) return null;
  return {
    botToken: resolved.botToken,
    chatId,
    source: resolved.source,
  };
}

function isCategoryEnabled(
  category: BaleAlertCategory,
  cfg: BaleAdminAlertsConfig
): boolean {
  if (category === 'test') return true;
  if (!cfg.enabled) return false;
  switch (category) {
    case 'approval_required':
      return cfg.notifyApprovals !== false;
    case 'user_request':
      return cfg.notifyUserRequests !== false;
    case 'order_paid':
    case 'order_failed':
      return cfg.notifyOrdersAndFailures !== false;
    case 'critical_error':
      return cfg.notifyCriticalErrors !== false;
    case 'agent_escalation':
      return cfg.notifyAgentEscalations !== false;
    case 'daily_briefing':
      return cfg.dailyBriefingEnabled === true;
    case 'heartbeat':
      return cfg.heartbeatEnabled !== false;
    default:
      return true;
  }
}

const CATEGORY_LABELS_FA: Record<BaleAlertCategory, string> = {
  approval_required: '🔐 نیاز به تایید سوپر ادمین (صف تایید)',
  user_request: '📩 درخواست / فرم جدید کاربر',
  order_paid: '✅ سفارش جدید و پرداخت موفق',
  order_failed: '⚠️ پرداخت یا خرید ناموفق',
  critical_error: '🚨 خطای بحرانی سامانه',
  agent_escalation: '🤖 ارجاع فوری از ایجنت ۲۴/۷',
  daily_briefing: '☀️ گزارش صبحگاهی ۲۴ ساعته سامانه (Jarvis Briefing)',
  heartbeat: '💓 پایش خودکار ۲ دقیقه‌ای (صفرتوکن)',
  test: '🧪 تست پل هشدار ایجنت ۲۴/۷ به بله',
};

/**
 * Proactive 24/7 Agent -> Super Admin Bale Bot Notification Bridge.
 * Sends concise, structured Persian alerts directly to Super Admin's Bale chat_id
 * with built-in cooldown deduplication so critical logs or visitor prompts never spam.
 */
export async function sendSuperAdminBaleAlert(params: {
  category: BaleAlertCategory;
  title: string;
  lines: string[];
  dedupKey?: string;
  cooldownMs?: number;
  force?: boolean;
}): Promise<BaleAlertDispatchResult> {
  try {
    const modEnabled = await isAiHubModuleEnabled();
    if (!modEnabled && !params.force) {
      return { ok: true, sent: false, skippedReason: 'ai_hub_disabled' };
    }

    const settings = await getAiHubSettings();
    const baleCfg: BaleAdminAlertsConfig = {
      ...DEFAULT_BALE_ADMIN_ALERTS,
      ...(settings.baleAlerts || {}),
    };

    if (!params.force && !isCategoryEnabled(params.category, baleCfg)) {
      return { ok: true, sent: false, skippedReason: `disabled_${params.category}` };
    }

    // Deduplication / Cooldown guard
    if (!params.force && params.dedupKey) {
      pruneDedupMap();
      const cooldown = Math.max(5_000, params.cooldownMs ?? 5 * 60 * 1000);
      const lastSent = ALERT_DEDUP_TIMESTAMPS.get(params.dedupKey);
      if (lastSent && Date.now() - lastSent < cooldown) {
        return { ok: true, sent: false, skippedReason: 'cooldown_deduplicated' };
      }
      ALERT_DEDUP_TIMESTAMPS.set(params.dedupKey, Date.now());
    }

    const target = await resolveSuperAdminBaleTarget(baleCfg.overrideChatId);
    if (!target) {
      return {
        ok: false,
        sent: false,
        error:
          'توکن ربات بله و شناسه چت (chat_id) سوپر ادمین یافت نشد. ابتدا ربات بله را در بخش «ربات‌ها و وب‌هوک‌ها» ذخیره کنید یا از دکمه «اتصال یک‌کلیکی به بله» استفاده نمایید.',
      };
    }

    const header = CATEGORY_LABELS_FA[params.category] || '🤖 هشدار ایجنت ۲۴/۷';
    const cleanTitle = String(params.title || '').trim().slice(0, 180);
    const cleanLines = (params.lines || [])
      .map((l) => String(l || '').trim())
      .filter(Boolean)
      .slice(0, 14)
      .map((l) => `• ${l.slice(0, 320)}`);

    const text = [
      header,
      `📌 ${cleanTitle}`,
      ...cleanLines,
      `🕒 ${formatPersianDateTime()} · اسکیل ۹۸ (ایجنت ۲۴/۷)`,
    ].join('\n');

    const endpoint = `https://tapi.bale.ai/bot${target.botToken}/sendMessage`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(12_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: target.chatId,
        text: text.slice(0, 3800),
      }),
    });

    const rawText = await resp.text().catch(() => '');
    let parsed: { ok?: boolean; description?: string } = {};
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsed = { ok: false, description: rawText.slice(0, 200) };
    }

    const ok = resp.ok && parsed.ok === true;
    const errMsg = ok ? '' : parsed.description || `HTTP ${resp.status}`;

    await logDeliveryEvent({
      channel: 'bot',
      provider: 'agent_bale_bridge',
      recipient: target.chatId,
      eventKey: `agent_bale_${params.category}`,
      status: ok ? 'sent' : 'failed',
      errorMessage: errMsg,
      messagePreview: `${cleanTitle} — ${cleanLines[0] || ''}`.slice(0, 140),
    }).catch(() => {});

    return {
      ok,
      sent: ok,
      channelSource: target.source,
      chatId: target.chatId,
      error: ok ? undefined : errMsg,
    };
  } catch (err) {
    return {
      ok: false,
      sent: false,
      error: err instanceof Error ? err.message : 'bale_bridge_network_error',
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  Phase 14.3.2 — 1-Click Bale Bot Pairing (/start pair_<code>)              */
/* -------------------------------------------------------------------------- */

interface BalePairingSession {
  code: string;
  actorPhone: string;
  botUsername: string;
  createdAtMs: number;
  expiresAtMs: number;
  consumed: boolean;
}

const BALE_PAIRING_SETTING_KEY = 'mod_ai_bale_pairing_session';
const BALE_PAIRING_TTL_MS = 10 * 60 * 1000;

export async function startBalePairingSession(actorPhone: string): Promise<{
  ok: boolean;
  code?: string;
  command?: string;
  deepLink?: string;
  botUsername?: string;
  expiresAt?: string;
  source?: string;
  error?: string;
}> {
  await ensureAiHubSchema();
  const resolved = await resolveBaleBotTokenOnly();
  if (!resolved) {
    return {
      ok: false,
      error:
        'ابتدا توکن ربات بله (Bot API Token) را در بخش «ربات‌ها و وب‌هوک‌ها» یا «تنظیمات پیامک ← بله» ذخیره کنید، سپس اتصال یک‌کلیکی را بزنید.',
    };
  }

  let botUsername = '';
  try {
    const meResp = await fetch(`https://tapi.bale.ai/bot${resolved.botToken}/getMe`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    const meJson = (await meResp.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { username?: string };
      description?: string;
    };
    if (!meResp.ok || !meJson.ok) {
      return {
        ok: false,
        error: `توکن ربات بله معتبر نیست یا پاسخ نداد: ${meJson.description || `HTTP ${meResp.status}`}`,
      };
    }
    botUsername = String(meJson.result?.username || '')
      .trim()
      .replace(/^@/, '');
  } catch (err) {
    return {
      ok: false,
      error: `خطا در ارتباط با سرور بله (getMe): ${err instanceof Error ? err.message : 'network_error'}`,
    };
  }

  const randomDigits = String(crypto.randomInt(100000, 999999));
  const code = `pair_${randomDigits}`;
  const nowMs = Date.now();
  const expiresAtMs = nowMs + BALE_PAIRING_TTL_MS;

  const session: BalePairingSession = {
    code,
    actorPhone: String(actorPhone || 'super_admin'),
    botUsername,
    createdAtMs: nowMs,
    expiresAtMs,
    consumed: false,
  };
  await setSetting(BALE_PAIRING_SETTING_KEY, session);

  const deepLink = botUsername
    ? `https://ble.ir/${encodeURIComponent(botUsername)}?start=${encodeURIComponent(code)}`
    : '';

  return {
    ok: true,
    code,
    command: `/start ${code}`,
    deepLink,
    botUsername,
    expiresAt: new Date(expiresAtMs).toISOString(),
    source: resolved.source,
  };
}

export async function verifyBalePairingSession(expectedCode?: string): Promise<{
  ok: boolean;
  paired: boolean;
  chatId?: string;
  senderName?: string;
  confirmationSent?: boolean;
  error?: string;
}> {
  await ensureAiHubSchema();
  const session = await getSetting<BalePairingSession | null>(BALE_PAIRING_SETTING_KEY, null);
  if (!session || !session.code || session.consumed) {
    return {
      ok: false,
      paired: false,
      error: 'کد اتصال فعالی وجود ندارد یا قبلاً استفاده شده است. لطفاً مجدداً دکمه اتصال یک‌کلیکی را بزنید.',
    };
  }
  if (Date.now() > Number(session.expiresAtMs || 0)) {
    await setSetting(BALE_PAIRING_SETTING_KEY, { ...session, consumed: true });
    return {
      ok: false,
      paired: false,
      error: 'مهلت ۱۰ دقیقه‌ای کد اتصال به پایان رسیده است. لطفاً کد جدید بسازید.',
    };
  }

  const cleanExpected = String(expectedCode || session.code).trim();
  if (cleanExpected !== session.code) {
    return {
      ok: false,
      paired: false,
      error: 'کد اتصال ارسالی با نشست فعال مطابقت ندارد.',
    };
  }

  const resolved = await resolveBaleBotTokenOnly();
  if (!resolved) {
    return {
      ok: false,
      paired: false,
      error: 'توکن ربات بله یافت نشد.',
    };
  }

  let matchedChatId = '';
  let senderName = '';

  // 1) Check Bale getUpdates for `/start pair_<code>` or exact `pair_<code>`
  try {
    const updResp = await fetch(
      `https://tapi.bale.ai/bot${resolved.botToken}/getUpdates?limit=50`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(12_000),
      }
    );
    const updJson = (await updResp.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: {
        update_id?: number;
        message?: {
          text?: string;
          chat?: { id?: number | string; first_name?: string; username?: string };
          from?: { first_name?: string; last_name?: string; username?: string };
        };
      }[];
      description?: string;
    };

    if (updResp.ok && updJson.ok && Array.isArray(updJson.result)) {
      const updates = [...updJson.result].reverse();
      for (const u of updates) {
        const msgText = String(u.message?.text || '').trim();
        const chatId = u.message?.chat?.id;
        if (!msgText || chatId === undefined || chatId === null) continue;
        if (msgText === session.code || msgText === `/start ${session.code}` || msgText.includes(session.code)) {
          matchedChatId = String(chatId).trim();
          senderName =
            [u.message?.from?.first_name, u.message?.from?.last_name].filter(Boolean).join(' ').trim() ||
            u.message?.chat?.first_name ||
            u.message?.from?.username ||
            'سوپر ادمین';
          break;
        }
      }
    } else if (!updResp.ok || !updJson.ok) {
      const desc = updJson.description || `HTTP ${updResp.status}`;
      if (/webhook/i.test(desc)) {
        return {
          ok: false,
          paired: false,
          error:
            'برای این ربات وب‌هوک فعال است و getUpdates در دسترس نیست. لطفاً شناسه چت (chat_id) را دستی وارد کنید یا موقتاً وب‌هوک ربات را غیرفعال نمایید.',
        };
      }
      return {
        ok: false,
        paired: false,
        error: `خطای بله در دریافت پیام‌ها: ${desc}`,
      };
    }
  } catch (err) {
    return {
      ok: false,
      paired: false,
      error: `خطا در ارتباط با سرور بله (getUpdates): ${err instanceof Error ? err.message : 'network_error'}`,
    };
  }

  if (!matchedChatId) {
    return {
      ok: true,
      paired: false,
      error: `هنوز پیام «/start ${session.code}» در ربات دریافت نشده است. ابتدا روی لینک ربات کلیک کرده و دکمه Start (یا ارسال دستور) را بزنید و سپس مجدداً بررسی کنید.`,
    };
  }

  // Consume single-use code immediately and persist chat_id into Bale Admin Alerts config
  await setSetting(BALE_PAIRING_SETTING_KEY, { ...session, consumed: true });
  await saveAiHubSettings({
    baleAlerts: {
      enabled: true,
      overrideChatId: matchedChatId,
    },
  });

  const confirmRes = await sendSuperAdminBaleAlert({
    category: 'test',
    force: true,
    title: 'اتصال یک‌کلیکی سوپر ادمین با موفقیت انجام شد',
    lines: [
      `کاربر متصل‌شده: ${senderName}`,
      `شناسه چت ذخیره‌شده (chat_id): ${matchedChatId}`,
      'از این لحظه هشدارهای هوشمند ایجنت ۲۴/۷، صف تایید و گزارش صبحگاهی به این چت ارسال می‌شود.',
    ],
  });

  await writeSystemLog({
    level: 'success',
    category: 'system',
    title: `اتصال یک‌کلیکی بله سوپر ادمین تکمیل شد (chat_id: ${matchedChatId})`,
    detail: `نام: ${senderName} · کد یکبارمصرف: ${session.code}`,
    sqlOrEndpoint: 'POST /api/v1/modules/ai-hub/agent/bale-pair/verify',
  });

  return {
    ok: true,
    paired: true,
    chatId: matchedChatId,
    senderName,
    confirmationSent: confirmRes.sent,
  };
}

/* -------------------------------------------------------------------------- */
/*  Phase 14.3.2 — Daily Morning Briefing to Bale (Asia/Tehran, Deduplicated) */
/* -------------------------------------------------------------------------- */

export function getTehranDateAndTime(now = new Date()): {
  dateStr: string;
  timeStr: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    timeStr: `${hour}:${get('minute')}`,
  };
}

export interface DailyBriefingMetrics {
  paidOrdersCount: number;
  paidRevenueToman: number;
  failedOrPendingOrdersCount: number;
  newUsersCount: number;
  newFormSubmissionsCount: number;
  newLiveChatSessionsCount: number;
  criticalErrorsCount: number;
  pendingApprovalsCount: number;
}

export async function collectDailyBriefingMetrics(): Promise<DailyBriefingMetrics> {
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [paidRows, failedRows, usersRows, formRows, chatRows, errRows, apprRows] = await Promise.all([
    dbQuery<{ cnt: number | string; rev: number | string }>(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount), 0) AS rev
       FROM orders
       WHERE created_at >= $1 AND LOWER(status) IN ('paid', 'completed', 'delivered', 'success')`,
      [sinceIso]
    ).catch(() => [{ cnt: 0, rev: 0 }]),
    dbQuery<{ cnt: number | string }>(
      `SELECT COUNT(*) AS cnt
       FROM orders
       WHERE created_at >= $1 AND LOWER(status) IN ('failed', 'pending', 'canceled', 'cancelled', 'unpaid', 'awaiting_payment')`,
      [sinceIso]
    ).catch(() => [{ cnt: 0 }]),
    dbQuery<{ cnt: number | string }>(
      `SELECT COUNT(*) AS cnt FROM users WHERE created_at >= $1`,
      [sinceIso]
    ).catch(() => [{ cnt: 0 }]),
    dbQuery<{ cnt: number | string }>(
      `SELECT COUNT(*) AS cnt FROM mod_forms_submissions WHERE created_at >= $1`,
      [sinceIso]
    ).catch(() => [{ cnt: 0 }]),
    dbQuery<{ cnt: number | string }>(
      `SELECT COUNT(*) AS cnt FROM mod_live_chat_sessions WHERE updated_at >= $1`,
      [sinceIso]
    ).catch(() => [{ cnt: 0 }]),
    dbQuery<{ cnt: number | string }>(
      `SELECT COUNT(*) AS cnt FROM system_logs WHERE created_at >= $1 AND LOWER(level) = 'error'`,
      [sinceIso]
    ).catch(() => [{ cnt: 0 }]),
    dbQuery<{ cnt: number | string }>(
      `SELECT COUNT(*) AS cnt FROM mod_ai_approval_queue WHERE status = 'pending'`
    ).catch(() => [{ cnt: 0 }]),
  ]);

  return {
    paidOrdersCount: Number(paidRows[0]?.cnt || 0),
    paidRevenueToman: Number(paidRows[0]?.rev || 0),
    failedOrPendingOrdersCount: Number(failedRows[0]?.cnt || 0),
    newUsersCount: Number(usersRows[0]?.cnt || 0),
    newFormSubmissionsCount: Number(formRows[0]?.cnt || 0),
    newLiveChatSessionsCount: Number(chatRows[0]?.cnt || 0),
    criticalErrorsCount: Number(errRows[0]?.cnt || 0),
    pendingApprovalsCount: Number(apprRows[0]?.cnt || 0),
  };
}

export async function sendDailyMorningBriefing(options?: {
  force?: boolean;
  recordAsSentToday?: boolean;
}): Promise<BaleAlertDispatchResult & { metrics: DailyBriefingMetrics; tehranDate: string }> {
  await ensureAiHubSchema();
  const { dateStr } = getTehranDateAndTime();
  const metrics = await collectDailyBriefingMetrics();

  const totalLeads = metrics.newFormSubmissionsCount + metrics.newLiveChatSessionsCount;
  const lines = [
    `💰 فروش موفق ۲۴ ساعت اخیر: ${metrics.paidOrdersCount.toLocaleString('fa-IR')} سفارش · ${metrics.paidRevenueToman.toLocaleString('fa-IR')} تومان`,
    `⏳ خریدهای ناموفق / در انتظار پرداخت: ${metrics.failedOrPendingOrdersCount.toLocaleString('fa-IR')} مورد`,
    `👤 کاربران جدید ثبت‌نام‌شده: ${metrics.newUsersCount.toLocaleString('fa-IR')} نفر`,
    `📩 درخواست‌های جدید (فرم‌ها و چت آنلاین): ${totalLeads.toLocaleString('fa-IR')} مورد (${metrics.newFormSubmissionsCount.toLocaleString('fa-IR')} فرم · ${metrics.newLiveChatSessionsCount.toLocaleString('fa-IR')} نشست چت)`,
    `🚨 خطاهای بحرانی ثبت‌شده (system_logs): ${metrics.criticalErrorsCount.toLocaleString('fa-IR')} مورد`,
    `🔐 موارد در انتظار تایید ۱-کلیکی: ${metrics.pendingApprovalsCount.toLocaleString('fa-IR')} مورد`,
  ];

  const dispatch = await sendSuperAdminBaleAlert({
    category: 'daily_briefing',
    force: Boolean(options?.force),
    title: options?.force
      ? `تست گزارش صبحگاهی ۲۴ ساعته (${dateStr})`
      : `خلاصه وضعیت ۲۴ ساعته سایت (${dateStr})`,
    lines,
  });

  if (dispatch.sent && options?.recordAsSentToday !== false && !options?.force) {
    await saveAiHubSettings({
      baleAlerts: {
        lastBriefingDate: dateStr,
      },
    });
  }

  return {
    ...dispatch,
    metrics,
    tehranDate: dateStr,
  };
}

let dailyBriefingSchedulerStarted = false;
let dailyBriefingTickInProgress = false;

/**
 * Lightweight, restart-safe Daily Morning Briefing scheduler (Asia/Tehran).
 * Persists `lastBriefingDate` in DB so server restarts never double-send.
 */
export function startDailyMorningBriefingScheduler(): void {
  if (dailyBriefingSchedulerStarted) return;
  dailyBriefingSchedulerStarted = true;

  const tick = async () => {
    if (dailyBriefingTickInProgress) return;
    dailyBriefingTickInProgress = true;
    try {
      const modEnabled = await isAiHubModuleEnabled();
      if (!modEnabled) return;

      const settings = await getAiHubSettings();
      const baleCfg = settings.baleAlerts;
      if (!baleCfg.enabled || !baleCfg.dailyBriefingEnabled) return;

      const { dateStr, timeStr } = getTehranDateAndTime();
      if (baleCfg.lastBriefingDate === dateStr) return;

      const scheduledTime = baleCfg.dailyBriefingTime || '09:00';
      if (timeStr < scheduledTime) return;

      // Mark date immediately before sending only if send succeeds; serialize via tick lock
      const res = await sendDailyMorningBriefing({ force: false, recordAsSentToday: true });
      if (res.sent) {
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `ارسال خودکار گزارش صبحگاهی به بله (${dateStr} · ${scheduledTime} تهران)`,
          detail: `سفارش موفق: ${res.metrics.paidOrdersCount} · خطا: ${res.metrics.criticalErrorsCount}`,
          sqlOrEndpoint: 'SCHEDULER daily_morning_briefing',
        }).catch(() => {});
      }
    } catch {
      // keep background scheduler resilient
    } finally {
      dailyBriefingTickInProgress = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, 60_000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

/* -------------------------------------------------------------------------- */
/*  Phase 16 (v2.9.3) — Zero-Token 2-Minute Background Heartbeat              */
/*  Pure Node.js DB polling (0 LLM tokens) + strict DB/memory deduplication   */
/* -------------------------------------------------------------------------- */

const HEARTBEAT_SEEN_SETTING_KEY = 'mod_ai_heartbeat_seen';
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;
const HEARTBEAT_MEM_SEEN = new Set<string>();
const HEARTBEAT_ERR_SIG_TIMESTAMPS = new Map<string, number>();
let heartbeatSchedulerStarted = false;
let heartbeatTickInProgress = false;
let heartbeatSeenLoaded = false;

export function buildSystemErrorSignatureKey(
  category: string,
  title: string,
  detail = ''
): string {
  const normTitle = String(title || '')
    .toLowerCase()
    .replace(/\d+/g, '#')
    .trim()
    .slice(0, 80);
  const normDetail = String(detail || '')
    .toLowerCase()
    .replace(/\d+/g, '#')
    .trim()
    .slice(0, 80);
  return `errsig:${String(category || 'system').toLowerCase()}:${normTitle}:${normDetail}`;
}

export function markHeartbeatErrorSeen(logId?: string, signatureKey?: string): void {
  if (logId) {
    HEARTBEAT_MEM_SEEN.add(`err:${logId}`);
  }
  if (signatureKey) {
    HEARTBEAT_ERR_SIG_TIMESTAMPS.set(signatureKey, Date.now());
  }
}

async function loadHeartbeatSeenSet(): Promise<Set<string>> {
  if (heartbeatSeenLoaded) return HEARTBEAT_MEM_SEEN;
  heartbeatSeenLoaded = true;
  try {
    const saved = await getSetting<string[]>(HEARTBEAT_SEEN_SETTING_KEY, []);
    if (Array.isArray(saved)) {
      for (const id of saved) {
        if (typeof id === 'string' && id) HEARTBEAT_MEM_SEEN.add(id);
      }
    }
  } catch {
    // ignore load failure
  }
  return HEARTBEAT_MEM_SEEN;
}

async function persistHeartbeatSeenSet(seen: Set<string>): Promise<void> {
  const arr = Array.from(seen);
  const trimmed = arr.length > 350 ? arr.slice(-350) : arr;
  if (arr.length > 350) {
    seen.clear();
    for (const k of trimmed) seen.add(k);
  }
  await setSetting(HEARTBEAT_SEEN_SETTING_KEY, trimmed).catch(() => {});
}

export async function runZeroTokenHeartbeatCheckOnce(): Promise<{
  checked: boolean;
  alertsSent: number;
  skippedReason?: string;
}> {
  const modEnabled = await isAiHubModuleEnabled();
  if (!modEnabled) return { checked: false, alertsSent: 0, skippedReason: 'ai_hub_disabled' };

  const settings = await getAiHubSettings();
  const baleCfg = settings.baleAlerts;
  if (!baleCfg.enabled || baleCfg.heartbeatEnabled === false) {
    return { checked: false, alertsSent: 0, skippedReason: 'heartbeat_disabled' };
  }

  const seen = await loadHeartbeatSeenSet();
  const nowMs = Date.now();
  const twoMinsAgoIso = new Date(nowMs - 2 * 60 * 1000).toISOString();
  const thirtyMinsAgoIso = new Date(nowMs - 30 * 60 * 1000).toISOString();

  let alertsSent = 0;
  let dirtySeen = false;

  // 1) Unread customer live chat messages older than 2 minutes
  const staleUnreadChats = await dbQuery<{
    id: string;
    visitor_name: string;
    visitor_phone: string;
    unread_admin_count: number;
    last_message_preview: string;
    updated_at: string;
  }>(
    `SELECT id, visitor_name, visitor_phone, unread_admin_count, last_message_preview, updated_at
     FROM mod_live_chat_sessions
     WHERE unread_admin_count > 0 AND updated_at <= $1 AND updated_at >= $2
     ORDER BY updated_at DESC LIMIT 8`,
    [twoMinsAgoIso, thirtyMinsAgoIso]
  ).catch(() => []);

  for (const chat of staleUnreadChats) {
    const key = `chat:${chat.id}:${chat.updated_at}`;
    if (seen.has(key)) continue;
    const res = await sendSuperAdminBaleAlert({
      category: 'heartbeat',
      title: `پیام چت خوانده‌نشده (+۲ دقیقه بدون پاسخ)`,
      lines: [
        `کاربر: ${chat.visitor_name || 'بازدیدکننده'}${chat.visitor_phone ? ` (${chat.visitor_phone})` : ''}`,
        `تعداد خوانده‌نشده: ${Number(chat.unread_admin_count || 1).toLocaleString('fa-IR')}`,
        `آخرین پیام: ${String(chat.last_message_preview || '-').slice(0, 180)}`,
        `شناسه نشست: ${chat.id}`,
      ],
      dedupKey: key,
      cooldownMs: 30 * 60 * 1000,
    });
    if (res.sent || res.skippedReason === 'cooldown_deduplicated') {
      seen.add(key);
      dirtySeen = true;
      if (res.sent) alertsSent += 1;
    }
  }

  // 2) New failed/pending orders in last 30 minutes
  if (baleCfg.notifyOrdersAndFailures !== false) {
    const badOrders = await dbQuery<{
      id: string;
      buyer_name: string;
      buyer_phone: string;
      total_amount: number;
      status: string;
      created_at_label: string;
    }>(
      `SELECT id, buyer_name, buyer_phone, total_amount, status, created_at_label
       FROM orders
       WHERE created_at >= $1 AND LOWER(status) IN ('failed', 'pending', 'cancelled', 'canceled', 'unpaid', 'awaiting_payment')
       ORDER BY created_at DESC LIMIT 6`,
      [thirtyMinsAgoIso]
    ).catch(() => []);

    for (const ord of badOrders) {
      const key = `order:${ord.id}:${ord.status}`;
      if (seen.has(key)) continue;
      const res = await sendSuperAdminBaleAlert({
        category: 'heartbeat',
        title: `سفارش ناموفق / در انتظار پرداخت (${ord.status})`,
        lines: [
          `شناسه سفارش: ${ord.id}`,
          `خریدار: ${ord.buyer_name || 'مشتری'} (${ord.buyer_phone || '-'})`,
          `مبلغ: ${Number(ord.total_amount || 0).toLocaleString('fa-IR')} تومان`,
          `زمان: ${ord.created_at_label || '-'}`,
        ],
        dedupKey: key,
        cooldownMs: 60 * 60 * 1000,
      });
      if (res.sent || res.skippedReason === 'cooldown_deduplicated') {
        seen.add(key);
        dirtySeen = true;
        if (res.sent) alertsSent += 1;
      }
    }
  }

  // 3) New critical system_logs errors in last 30 minutes
  if (baleCfg.notifyCriticalErrors !== false) {
    const newErrors = await dbQuery<{
      id: string;
      category: string;
      title: string;
      detail: string;
      sql_or_endpoint: string;
    }>(
      `SELECT id, category, title, detail, sql_or_endpoint
       FROM system_logs
       WHERE created_at >= $1 AND LOWER(level) = 'error'
       ORDER BY created_at DESC LIMIT 5`,
      [thirtyMinsAgoIso]
    ).catch(() => []);

    for (const errRow of newErrors) {
      if (/bale_alert_bridge|agent_bale_bridge|bot-bridge/i.test(`${errRow.sql_or_endpoint} ${errRow.title}`)) {
        continue;
      }
      const key = `err:${errRow.id}`;
      if (seen.has(key)) continue;

      const sigKey = buildSystemErrorSignatureKey(
        errRow.category || 'system',
        errRow.title || '',
        errRow.detail || ''
      );
      const lastSigTs = HEARTBEAT_ERR_SIG_TIMESTAMPS.get(sigKey);
      if (lastSigTs && nowMs - lastSigTs < 30 * 60 * 1000) {
        seen.add(key);
        dirtySeen = true;
        continue;
      }

      const res = await sendSuperAdminBaleAlert({
        category: 'heartbeat',
        title: `خطای جدید سامانه: ${String(errRow.title || 'خطای بحرانی').slice(0, 120)}`,
        lines: [
          `بخش: ${errRow.category || 'system'}`,
          `جزئیات: ${String(errRow.detail || '-').slice(0, 220)}`,
          errRow.sql_or_endpoint ? `مسیر: ${errRow.sql_or_endpoint}` : '',
        ].filter(Boolean),
        dedupKey: sigKey,
        cooldownMs: 30 * 60 * 1000,
      });
      if (res.sent || res.skippedReason === 'cooldown_deduplicated') {
        seen.add(key);
        HEARTBEAT_ERR_SIG_TIMESTAMPS.set(sigKey, nowMs);
        dirtySeen = true;
        if (res.sent) alertsSent += 1;
      }
    }
  }

  if (dirtySeen) {
    await persistHeartbeatSeenSet(seen);
  }
  return { checked: true, alertsSent };
}

export function startZeroTokenHeartbeatScheduler(): void {
  if (heartbeatSchedulerStarted) return;
  heartbeatSchedulerStarted = true;

  const tick = async () => {
    if (heartbeatTickInProgress) return;
    heartbeatTickInProgress = true;
    try {
      await runZeroTokenHeartbeatCheckOnce();
    } catch {
      // keep zero-token heartbeat resilient
    } finally {
      heartbeatTickInProgress = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, HEARTBEAT_INTERVAL_MS);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
}

