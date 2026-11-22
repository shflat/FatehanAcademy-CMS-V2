import { dbExec, dbQuery, formatPersianDateTime } from '../../src/server/database/connection.js';
import { findUserByPhone } from '../../src/server/database/usersSessionsRepo.js';
import { writeSystemLog } from '../../src/server/database/settingsLogsRepo.js';
import { decryptSecret } from '../../src/server/core/secretVault.js';
import { logDeliveryEvent } from '../mod_delivery_logs/deliveryLogsRouter.js';
import {
  ensureAiHubSchema,
  getAiHubSettings,
  isAiHubModuleEnabled,
  readScopedAgentMemories,
  upsertAgentMemory,
} from './aiHubSchema.js';
import {
  executeCmsTool,
  runMultiStepAgentTurn,
  type AgentUiActionType,
  type ExecutedToolRecord,
} from './agentToolCallingEngine.js';
import { sendSuperAdminBaleAlert } from './baleAlertBridge.js';
import {
  getGuestLlmQuotaUsage,
  getLiveSiteTitleAndDesc,
  incrementGuestLlmQuotaUsage,
  matchKnowledgeCache,
  tryLearnToKnowledgeCache,
} from './knowledgeCacheEngine.js';

const GENERIC_NAME_PATTERNS = [
  /^کاربر\s*\d{3,5}$/,
  /^کاربر\s*اسکیل\s*۹۸$/,
  /^بازدیدکننده(\s*سایت)?$/,
  /^مهمان$/,
  /^user$/i,
];

export function isGenericDisplayName(name?: string | null): boolean {
  const clean = String(name || '').trim();
  if (!clean || clean.length < 2) return true;
  return GENERIC_NAME_PATTERNS.some((re) => re.test(clean));
}

/**
 * Strips Persian conversational fillers and punctuation from a display name.
 * Examples: "مهرسام هستم." -> "مهرسام", "من علی رضایی هستم!" -> "علی رضایی", "اسمم سارا است" -> "سارا"
 */
export function sanitizePersianDisplayName(rawInput: string): string {
  let text = String(rawInput || '')
    .replace(/[\u200C\u200D]/g, ' ')
    .replace(/[.!؟?،,:؛"«»()\-_~*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';

  // Remove leading greetings / intro fillers
  const leadingRe =
    /^(?:سلام|درود|وقت\s*بخیر|بله|بفرمایید|من|بنده|اسمم|نامم|اسم\s+من|نام\s+من|اسم|نام)\s+/i;
  for (let i = 0; i < 4; i++) {
    const next = text.replace(leadingRe, '').trim();
    if (next === text) break;
    text = next;
  }

  // Remove trailing verb / copula fillers ("هستم", "می‌باشم", "است", "هست")
  const trailingRe =
    /\s+(?:هستم|می\s*باشم|میباشم|است|هست|هستش|ام|ه|هستیم|ممنون|مرسی|تشکر)$/i;
  for (let i = 0; i < 3; i++) {
    const next = text.replace(trailingRe, '').trim();
    if (next === text) break;
    text = next;
  }

  // Remove trailing attached verb if whole token is only filler
  text = text.replace(/\s+/g, ' ').trim().slice(0, 60);
  if (/^(?:من|بنده|هستم|اسمم|نامم|کاربر|مهمان|سلام|ممنون)$/i.test(text)) return '';
  return text;
}

/**
 * Extracts a clean Persian/Latin full name when a visitor introduces themselves in chat.
 * Examples: "من علی هستم", "مهرسام هستم.", "اسمم سارا محمدی است", "بنده حسین کریمی هستم"
 */
export function extractNameFromChatMessage(text: string, agentAskedForName: boolean): string | null {
  const raw = String(text || '').trim().replace(/[.!؟?،,:؛"«»()]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw || raw.length > 80) return null;

  const patterns: RegExp[] = [
    /(?:من|بنده)\s+([\u0600-\u06FFa-zA-Z]{2,20}(?:\s+[\u0600-\u06FFa-zA-Z]{2,22})?)\s+(?:هستم|می‌?باشم|می\s+باشم)/,
    /^([\u0600-\u06FFa-zA-Z]{2,20}(?:\s+[\u0600-\u06FFa-zA-Z]{2,22})?)\s+(?:هستم|می‌?باشم|می\s+باشم)$/,
    /(?:اسمم|نامم|اسم من|نام من)\s+([\u0600-\u06FFa-zA-Z]{2,20}(?:\s+[\u0600-\u06FFa-zA-Z]{2,22})?)(?:\s+(?:است|هست|ه|می‌?باشد))?$/,
    /(?:نام|اسم)\s*[:：]\s*([\u0600-\u06FFa-zA-Z]{2,20}(?:\s+[\u0600-\u06FFa-zA-Z]{2,22})?)/,
  ];

  const stopWords = new Set([
    'سلام', 'ممنون', 'مرسی', 'تشکر', 'خرید', 'سفارش', 'پشتیبانی', 'فوری', 'قیمت', 'مشکل', 'خطا', 'بله', 'خیر', 'نه', 'باشه', 'چرا', 'چطور', 'دنبال', 'نیاز', 'درخواست', 'منتظر', 'مشتری', 'کاربر', 'مهمان',
  ]);

  for (const p of patterns) {
    const m = raw.match(p);
    if (m && m[1]) {
      const candidate = sanitizePersianDisplayName(m[1]);
      const firstWord = candidate.split(' ')[0];
      if (candidate.length >= 2 && candidate.length <= 40 && !stopWords.has(firstWord)) {
        return candidate;
      }
    }
  }

  if (agentAskedForName) {
    const cleaned = sanitizePersianDisplayName(raw);
    const words = cleaned.split(' ').filter(Boolean);
    if (
      words.length >= 1 &&
      words.length <= 3 &&
      words.every((w) => /^[\u0600-\u06FFa-zA-Z]{2,20}$/.test(w) && !stopWords.has(w))
    ) {
      return words.join(' ');
    }
  }
  return null;
}

/**
 * Internal Safe Backend Tool: update_visitor_user_profile
 * Saves the visitor's real Full Name in `users`, active `auth_sessions`, `mod_live_chat_sessions`,
 * and scoped `mod_ai_agent_memory`.
 */
export async function updateVisitorUserProfileTool(params: {
  phone: string;
  fullName: string;
  sessionId?: string;
}): Promise<{ ok: boolean; phone: string; fullName: string }> {
  const cleanPhone = String(params.phone || '').trim();
  const cleanName = sanitizePersianDisplayName(params.fullName).slice(0, 80);
  if (!cleanPhone || cleanName.length < 2) {
    return { ok: false, phone: cleanPhone, fullName: cleanName };
  }

  const nowIso = new Date().toISOString();
  await dbExec('UPDATE users SET full_name = $1, updated_at = $2 WHERE phone = $3', [
    cleanName,
    nowIso,
    cleanPhone,
  ]);
  await dbExec('UPDATE auth_sessions SET user_display = $1 WHERE phone = $2', [
    cleanName,
    cleanPhone,
  ]);
  if (params.sessionId) {
    await dbExec('UPDATE mod_live_chat_sessions SET visitor_name = $1 WHERE id = $2', [
      cleanName,
      params.sessionId,
    ]);
  }

  await ensureAiHubSchema();
  await upsertAgentMemory({
    scopeType: 'user',
    userId: cleanPhone,
    visitorSessionId: params.sessionId || '',
    memoryKey: 'user_full_name',
    memoryValue: cleanName,
  });

  await dbExec(
    `INSERT INTO mod_ai_agent_conversations
     (id, channel, sender_phone, role, message_text, tool_calls_json, created_at_fa, created_at)
     VALUES ($1, 'live_chat_tool', $2, 'tool', $3, $4, $5, $6)`,
    [
      `tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cleanPhone,
      `ابزار update_visitor_user_profile اجرا شد: نام کاربر ${cleanPhone} به «${cleanName}» به‌روزرسانی شد.`,
      JSON.stringify([{ tool: 'update_visitor_user_profile', phone: cleanPhone, fullName: cleanName }]),
      formatPersianDateTime(),
      nowIso,
    ]
  );

  await writeSystemLog({
    level: 'success',
    category: 'system',
    title: `تکمیل خودکار پروفایل کاربر توسط ایجنت (${cleanName})`,
    detail: `شماره: ${cleanPhone} · نشست چت: ${params.sessionId || '-'}`,
    sqlOrEndpoint: 'TOOL update_visitor_user_profile',
  });

  return { ok: true, phone: cleanPhone, fullName: cleanName };
}

export async function queueAgentApproval(params: {
  titleFa: string;
  actionType: string;
  summaryFa: string;
  payload: Record<string, unknown>;
}): Promise<string> {
  await ensureAiHubSchema();
  const id = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await dbExec(
    `INSERT INTO mod_ai_approval_queue
     (id, title_fa, action_type, summary_fa, payload_json, status, reviewed_by, created_at_fa, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', '', $6, $7)`,
    [
      id,
      params.titleFa.slice(0, 140),
      params.actionType,
      params.summaryFa.slice(0, 500),
      JSON.stringify(params.payload || {}),
      formatPersianDateTime(),
      new Date().toISOString(),
    ]
  );

  void sendSuperAdminBaleAlert({
    category: 'approval_required',
    title: params.titleFa.slice(0, 140),
    lines: [
      `شناسه تایید: ${id}`,
      `نوع اقدام: ${params.actionType}`,
      `خلاصه: ${params.summaryFa.slice(0, 260)}`,
      'برای تایید یا رد ۱-کلیکی وارد پنل ادمین ← تب «صف تایید ۱-کلیکی» شوید.',
    ],
  });

  return id;
}

export async function dispatchAgentBotBridgeAlert(params: {
  title: string;
  message: string;
}): Promise<{ sentCount: number; details: string[] }> {
  const details: string[] = [];
  let sentCount = 0;
  try {
    const bots = await dbQuery<{
      id: string;
      platform: string;
      title_fa: string;
      bot_token_enc: string;
      chat_id: string;
      enabled: number;
    }>('SELECT * FROM mod_bot_channels WHERE enabled = 1');

    for (const bot of bots) {
      const rawToken = String(decryptSecret(bot.bot_token_enc) || '').trim();
      const safeBotToken = rawToken.replace(/^bot/i, '').replace(/[^\w:-]/g, '');
      const safeEitaaToken = rawToken.replace(/[^\w:-]/g, '');
      const text = `🤖 [ایجنت ۲۴/۷] ${params.title}\n${params.message}`;
      let status: 'sent' | 'failed' = 'sent';
      let errMsg = '';
      try {
        let resp: Response;
        if (bot.platform === 'eitaa') {
          const url = `https://eitaayar.ir/api/${safeEitaaToken}/sendMessage`;
          const body = new URLSearchParams({
            chat_id: String(bot.chat_id || '').trim(),
            text,
          });
          resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
            body: body.toString(),
          });
        } else {
          const url =
            bot.platform === 'bale'
              ? `https://tapi.bale.ai/bot${safeBotToken}/sendMessage`
              : `https://api.telegram.org/bot${safeBotToken}/sendMessage`;
          resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: String(bot.chat_id || '').trim(), text }),
          });
        }
        const rawResp = await resp.text().catch(() => '');
        let parsed: { ok?: boolean; description?: string } = {};
        try {
          parsed = rawResp ? JSON.parse(rawResp) : {};
        } catch {
          // non-json response
        }
        if (!resp.ok || parsed.ok === false) {
          status = 'failed';
          errMsg = parsed.description || `HTTP ${resp.status}`;
        } else {
          sentCount += 1;
        }
      } catch (e) {
        status = 'failed';
        errMsg = e instanceof Error ? e.message : 'network_error';
      }
      await logDeliveryEvent({
        channel: 'bot',
        provider: `agent_bridge_${bot.platform}`,
        recipient: bot.chat_id,
        eventKey: 'agent_escalation',
        status,
        errorMessage: errMsg,
        messagePreview: text.slice(0, 120),
      });
      details.push(`${bot.platform}(${bot.title_fa}): ${status}${errMsg ? ` - ${errMsg}` : ''}`);
    }
  } catch {
    // mod_bot_channels might not exist yet if mod_bots_webhooks was never initialized
  }
  return { sentCount, details };
}

const GUEST_REQUEST_INTENT_REGEX =
  /(?:ثبت\s*درخواست|درخواست\s*(?:مشاوره|پشتیبانی|سفارش|فوری|طراحی|همکاری|دمو|قیمت)|سفارش\s*(?:دارم|بدم|بگذارم|ثبت)|فرم\s*(?:پر|ثبت|بفرست)|اولویت\s*فوری|ثبت\s*تیکت|می‌?خواهم\s*(?:ثبت|سفارش|خرید|درخواست)|میخوام\s*(?:ثبت|سفارش|خرید|درخواست)|تماس\s*بگیرید|شماره\s*(?:بدم|بدهم)|عضویت|ورود\s*با\s*موبایل)/i;

/**
 * Live Chat AI Agent Hook (Phase 13.2):
 * - Runs multi-step tool-calling engine with always-on SKILL.md + strictly isolated per-user/guest memory.
 * - Guests NEVER see Super Admin or other users' data; when guests want to submit a request or upgrade priority,
 *   the agent triggers `uiAction: 'OPEN_INLINE_OTP'` so Mobile + OTP signup opens directly inside chat.
 * - Authenticated customers can update their profile name and submit real requests/forms with tracking codes.
 * - On post-login continuation (`isPostLoginContinuation`), resumes the visitor's confirmed request seamlessly.
 */
export async function handleLiveChatAgentAutomation(params: {
  sessionId: string;
  messageText: string;
  authenticatedPhone?: string;
  existingMessages: { sender_role?: string; message_text?: string }[];
  isPostLoginContinuation?: boolean;
}): Promise<{
  agentReply?: string;
  updatedDisplayName?: string;
  toolExecuted?: string;
  executedTools?: ExecutedToolRecord[];
  uiAction?: AgentUiActionType;
  uiActionPayload?: Record<string, unknown>;
  tokenSaved?: boolean;
  kbEntryId?: string;
  quotaExceeded?: boolean;
}> {
  const enabled = await isAiHubModuleEnabled();
  if (!enabled) return {};
  const settings = await getAiHubSettings();
  if (settings.jarvisSettings?.enabled === false) return {};
  if (!settings.liveChatAutoReply && !settings.autoProfileCompletion) return {};

  await ensureAiHubSchema();
  const isGuest = !params.authenticatedPhone;
  const userRow = params.authenticatedPhone ? await findUserByPhone(params.authenticatedPhone) : null;
  const currentName = userRow?.full_name || '';
  const needsName = !isGuest && isGenericDisplayName(currentName);

  const lastOperatorMsg = [...params.existingMessages]
    .reverse()
    .find((m) => m.sender_role === 'operator');
  const agentAskedForName = Boolean(
    lastOperatorMsg && /نام|اسم/.test(String(lastOperatorMsg.message_text || ''))
  );

  // Strict per-session conversation history only (compact token-diet slice; sliding window of 6 enforced in turn engine)
  const history = params.existingMessages
    .slice(-10)
    .filter((m) => Boolean(String(m.message_text || '').trim()))
    .map((m) => ({
      role: (m.sender_role === 'visitor' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: String(m.message_text || '').slice(0, 420),
    }));

  // Deterministic pre-check for explicit name introduction by authenticated user
  let detectedUpdatedName: string | undefined;
  let preExecutedToolName: string | undefined;
  if (!isGuest && !params.isPostLoginContinuation && settings.autoProfileCompletion) {
    const extractedName = extractNameFromChatMessage(params.messageText, agentAskedForName);
    if (extractedName && (needsName || extractedName !== currentName)) {
      const toolRes = await updateVisitorUserProfileTool({
        phone: params.authenticatedPhone!,
        fullName: extractedName,
        sessionId: params.sessionId,
      });
      if (toolRes.ok) {
        detectedUpdatedName = extractedName;
        preExecutedToolName = 'update_visitor_user_profile';
      }
    }
  }

  const effectiveDisplayName = detectedUpdatedName || currentName || '';

  // STEP 1 — Zero-Token Local Knowledge Base Intercept (runs BEFORE any paid LLM call!)
  if (settings.liveChatAutoReply && !params.isPostLoginContinuation && !detectedUpdatedName) {
    const { siteTitle } = await getLiveSiteTitleAndDesc();
    const kbHit = await matchKnowledgeCache({
      messageText: params.messageText,
      siteTitle,
    }).catch(() => ({ matched: false as const }));

    if (kbHit.matched && kbHit.answerText) {
      let kbUiAction: AgentUiActionType | undefined;
      let kbUiPayload: Record<string, unknown> | undefined;
      if (isGuest && kbHit.triggerOtpForGuest) {
        kbUiAction = 'OPEN_INLINE_OTP';
        kbUiPayload = {
          reasonFa: 'تایید شماره موبایل برای ثبت رسمی درخواست و دریافت کد پیگیری',
          pendingRequestSummary: params.messageText.slice(0, 320),
        };
        await upsertAgentMemory({
          scopeType: 'guest',
          visitorSessionId: params.sessionId,
          memoryKey: 'pending_request_draft',
          memoryValue: params.messageText.slice(0, 500),
        }).catch(() => {});
      }
      return {
        agentReply: kbHit.answerText,
        toolExecuted: 'zero_token_kb_cache',
        uiAction: kbUiAction,
        uiActionPayload: kbUiPayload,
        tokenSaved: true,
        kbEntryId: kbHit.entryId,
      };
    }
  }

  // STEP 2 — Guest AI Token Quota Guard (Anti-Drain Protection, default max 4 paid LLM replies per guest session)
  const guestQuotaLimit = Math.max(1, Math.min(20, Number(settings.guestMaxLlmReplies || 4)));
  if (isGuest && settings.liveChatAutoReply && !params.isPostLoginContinuation) {
    const usedGuestReplies = await getGuestLlmQuotaUsage(params.sessionId);
    if (usedGuestReplies >= guestQuotaLimit) {
      await upsertAgentMemory({
        scopeType: 'guest',
        visitorSessionId: params.sessionId,
        memoryKey: 'pending_request_draft',
        memoryValue: params.messageText.slice(0, 500),
      }).catch(() => {});
      return {
        agentReply: `سقف گفتگوی مهمان (${guestQuotaLimit.toLocaleString('fa-IR')} پیام هوشمند) به پایان رسید. برای ادامه گفتگو، دریافت مشاوره اختصاصی و ثبت رسمی درخواست، لطفاً با شماره موبایل و کد تایید در کادر زیر وارد شوید.`,
        uiAction: 'OPEN_INLINE_OTP',
        uiActionPayload: {
          reasonFa: 'تایید شماره موبایل برای ادامه گفتگوی هوشمند و ثبت درخواست',
          pendingRequestSummary: params.messageText.slice(0, 320),
        },
        toolExecuted: 'guest_quota_gate',
        tokenSaved: true,
        quotaExceeded: true,
      };
    }
  }

  // Autonomous 24/7 mode: run real Multi-Step Tool-Calling Engine (up to 4 steps)
  if (settings.liveChatAutoReply && settings.agentMode === 'autonomous_24_7') {
    const extraLines: string[] = [];
    if (isGuest) {
      extraLines.push(
        'کاربر فعلی مهمان است. اگر کاربر درخواست ثبت سفارش، فرم، مشاوره رسمی، کالای ناموجود در کاتالوگ یا اولویت فوری دارد، حتماً ابزار `trigger_chat_otp_box` را فراخوانی کن تا کادر ورود/ثبت‌نام سریع با موبایل و OTP همینجا داخل چت باز شود و خلاصه درخواستش را در `pendingRequestSummary` ذخیره کن.'
      );
    } else {
      extraLines.push(
        `کاربر احراز هویت شده است (شماره موبایل: ${params.authenticatedPhone} · نام فعلی: ${effectiveDisplayName || 'تکمیل‌نشده'}).`
      );
      if (detectedUpdatedName) {
        extraLines.push(
          `نام کاربر همین الان با موفقیت به «${detectedUpdatedName}» در پروفایل ذخیره شد؛ در پاسخ محترمانه از او با همین نام استقبال کن و کارش را ادامه بده.`
        );
      } else if (settings.autoProfileCompletion && needsName && !agentAskedForName) {
        extraLines.push(
          'نام کاربر در پروفایل هنوز عمومی است؛ در پایان پاسخ محترمانه نام شریفش را بپرس.'
        );
      }
      if (params.isPostLoginContinuation) {
        extraLines.push(
          'کاربر همین لحظه با موفقیت از طریق کادر OTP داخل چت احراز هویت و وارد حساب کاربری شد و حافظه قبلی نشست او منتقل شده است. اگر در تاریخچه گفتگو یا حافظه (`pending_request_draft`) درخواست تاییدشده‌ای از طرف او وجود دارد، همین حالا ابزار `create_or_submit_user_request` را اجرا کن و کد پیگیری رسمی را به کاربر اعلام کن؛ در غیر این صورت گرم خوش‌آمد بگو و ادامه کمک را پیشنهاد بده.'
        );
      }
    }

    try {
      const turn = await runMultiStepAgentTurn({
        ctx: {
          actorRole: isGuest ? 'guest' : 'customer',
          channel: 'live_chat',
          userId: params.authenticatedPhone || undefined,
          userDisplayName: effectiveDisplayName || undefined,
          visitorSessionId: params.sessionId,
        },
        userMessage: params.messageText,
        history,
        extraContext: extraLines.join('\n'),
        maxSteps: 4,
      });

      if (isGuest && !turn.usedFallback) {
        await incrementGuestLlmQuotaUsage(params.sessionId);
      }

      // Safety net: if guest clearly asked to submit a request/form/urgent ticket and model didn't call OTP trigger
      let finalUiAction = turn.uiAction;
      let finalUiPayload = turn.uiActionPayload;
      if (isGuest && !finalUiAction && GUEST_REQUEST_INTENT_REGEX.test(params.messageText)) {
        finalUiAction = 'OPEN_INLINE_OTP';
        finalUiPayload = {
          reasonFa:
            'برای ثبت رسمی درخواست و دریافت کد پیگیری، لطفاً شماره موبایل خود را در کادر زیر تایید کنید.',
          pendingRequestSummary: params.messageText.slice(0, 320),
        };
        await upsertAgentMemory({
          scopeType: 'guest',
          visitorSessionId: params.sessionId,
          memoryKey: 'pending_request_draft',
          memoryValue: params.messageText.slice(0, 500),
        });
      }

      if (turn.replyText) {
        // STEP 3 — Safe Self-Learning Cache Pipeline (strict PII/secret sanitizer, skips personal/account turns)
        const touchedPersonalTool = turn.executedTools.some((t) =>
          ['update_visitor_user_profile', 'create_or_submit_user_request', 'notify_super_admin_bale'].includes(
            t.tool
          )
        );
        if (!params.isPostLoginContinuation && !detectedUpdatedName && !touchedPersonalTool && !finalUiAction) {
          void tryLearnToKnowledgeCache({
            question: params.messageText,
            answer: turn.replyText,
            autoLearnMode: settings.kbAutoLearnMode || 'pending_review',
          }).catch(() => {});
        }

        return {
          agentReply: turn.replyText,
          updatedDisplayName: turn.updatedDisplayName || detectedUpdatedName,
          toolExecuted: turn.executedTools[0]?.tool || preExecutedToolName,
          executedTools: turn.executedTools,
          uiAction: finalUiAction,
          uiActionPayload: finalUiPayload,
          tokenSaved: false,
        };
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await writeSystemLog({
        level: 'error',
        category: 'system',
        title: 'خطای موتور چندمرحله‌ای دستیار ۲۴/۷ در چت آنلاین',
        detail: errMsg,
        sqlOrEndpoint: 'LIVE_CHAT_AGENT_MULTI_STEP (agent_core)',
      }).catch(() => {});
    }
  }

  // Deterministic Fallback when AI slot is offline, unconfigured, or in light mode
  if (isGuest) {
    const wantsRequestOrOtp = GUEST_REQUEST_INTENT_REGEX.test(params.messageText);
    if (wantsRequestOrOtp) {
      await upsertAgentMemory({
        scopeType: 'guest',
        visitorSessionId: params.sessionId,
        memoryKey: 'pending_request_draft',
        memoryValue: params.messageText.slice(0, 500),
      });
      return {
        agentReply:
          'با کمال میل درخواست شما را به‌صورت رسمی ثبت و پیگیری می‌کنم. برای ثبت نهایی درخواست و دریافت کد پیگیری، لطفاً شماره موبایل خود را در کادر زیر وارد و کد تایید را ثبت کنید تا بلافاصله درخواستتان ثبت شود.',
        uiAction: 'OPEN_INLINE_OTP',
        uiActionPayload: {
          reasonFa: 'تایید شماره موبایل برای ثبت رسمی درخواست و دریافت کد پیگیری',
          pendingRequestSummary: params.messageText.slice(0, 320),
        },
        toolExecuted: 'trigger_chat_otp_box',
      };
    }

    const alreadyPromptedGuest = params.existingMessages.some(
      (m) =>
        m.sender_role === 'operator' &&
        String(m.message_text || '').includes('اولویت فوری')
    );
    if (!alreadyPromptedGuest) {
      return {
        agentReply:
          'سلام و خوش آمدید! پیام شما دریافت شد. برای دریافت پاسخ سریع‌تر و ثبت رسمی درخواست با «اولویت فوری»، می‌توانید از کادر بالای همین پنجره با شماره موبایل وارد شوید.',
      };
    }
    return settings.agentMode === 'autonomous_24_7'
      ? {
          agentReply:
            'پیام شما در صف پشتیبانی ثبت شد. همکاران ما در کوتاه‌ترین زمان پاسخ شما را ارسال خواهند کرد.',
        }
      : {};
  }

  // Authenticated post-login continuation deterministic fallback (if pending draft exists in user memory)
  if (params.isPostLoginContinuation && params.authenticatedPhone) {
    const userMems = await readScopedAgentMemories({
      actorRole: 'customer',
      userId: params.authenticatedPhone,
      visitorSessionId: params.sessionId,
      limit: 10,
    });
    const pendingDraft = userMems.find((m) => m.memory_key === 'pending_request_draft');
    if (pendingDraft?.memory_value) {
      const submitCtx = {
        actorRole: 'customer' as const,
        channel: 'live_chat' as const,
        userId: params.authenticatedPhone,
        userDisplayName: effectiveDisplayName,
        visitorSessionId: params.sessionId,
      };
      const submitted = await executeCmsTool(
        'create_or_submit_user_request',
        {
          titleFa: 'درخواست تاییدشده کاربر از گفتگوی آنلاین',
          description: pendingDraft.memory_value,
          priority: 'urgent',
        },
        submitCtx
      );
      if (submitted.ok) {
        const trackingCode = String(submitted.data?.trackingCode || '');
        const greeting = isGenericDisplayName(effectiveDisplayName)
          ? 'ورود شما با موفقیت انجام شد!'
          : `${effectiveDisplayName} عزیز، ورود شما با موفقیت انجام شد!`;
        return {
          agentReply: `${greeting} درخواست قبلی شما به‌صورت رسمی و با اولویت فوری ثبت گردید.\nکد پیگیری شما: ${trackingCode}\n${
            isGenericDisplayName(effectiveDisplayName)
              ? '\nبرای تکمیل پروفایل و خطاب بهتر، خوشحال می‌شوم نام شریفتان را هم بفرمایید.'
              : 'همکاران پشتیبانی در کوتاه‌ترین زمان با شما در ارتباط خواهند بود.'
          }`,
          toolExecuted: 'create_or_submit_user_request',
          executedTools: [submitted],
        };
      }
    }
    return {};
  }

  if (detectedUpdatedName) {
    return {
      updatedDisplayName: detectedUpdatedName,
      toolExecuted: 'update_visitor_user_profile',
      agentReply: `خوشبختم ${detectedUpdatedName} عزیز! نام شما با موفقیت در حساب کاربری‌تان ثبت شد و درخواست شما با اولویت فوری در دست بررسی است. چطور می‌توانم دقیق‌تر کمکتان کنم؟`,
    };
  }

  if (settings.agentMode === 'autonomous_24_7' && settings.liveChatAutoReply) {
    return {
      agentReply:
        'پیام شما با اولویت فوری ثبت شد. به دلیل عدم اتصال موقت موتور هوش مصنوعی، پیامتان مستقیماً برای اپراتور انسانی ارسال گردید و به‌زودی پاسخ دریافت می‌کنید.',
    };
  }

  if (settings.autoProfileCompletion && needsName && !agentAskedForName) {
    return {
      agentReply:
        'ممنون از ورود شما! درخواستتان با اولویت فوری ثبت شد. برای تکمیل حساب کاربری و خطاب بهتر شما، ممکن است نام شریفتان را بفرمایید؟',
    };
  }

  return {};
}

