import { dbExec, dbQuery, formatPersianDateTime } from '../../src/server/database/connection.js';
import { findUserByPhone } from '../../src/server/database/usersSessionsRepo.js';
import { writeSystemLog } from '../../src/server/database/settingsLogsRepo.js';
import { decryptSecret } from '../../src/server/core/secretVault.js';
import { logDeliveryEvent } from '../mod_delivery_logs/deliveryLogsRouter.js';
import {
  ensureAiHubSchema,
  getAiHubSettings,
  isAiHubModuleEnabled,
} from './aiHubSchema.js';
import { generateTextViaSlot } from './aiProviderGateway.js';

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
 * Extracts a clean Persian/Latin full name when a visitor introduces themselves in chat.
 * Examples: "من علی هستم", "اسمم سارا محمدی است", "اسم من رضا رضاییه", "بنده حسین کریمی هستم"
 */
export function extractNameFromChatMessage(text: string, agentAskedForName: boolean): string | null {
  const raw = String(text || '').trim().replace(/[.!؟?،,]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw || raw.length > 80) return null;

  const patterns: RegExp[] = [
    /(?:من|بنده)\s+([\u0600-\u06FFa-zA-Z]{2,20}(?:\s+[\u0600-\u06FFa-zA-Z]{2,22})?)\s+(?:هستم|می‌باشم|میباشم)/,
    /(?:اسمم|نامم|اسم من|نام من)\s+([\u0600-\u06FFa-zA-Z]{2,20}(?:\s+[\u0600-\u06FFa-zA-Z]{2,22})?)(?:\s+(?:است|هست|ه|می‌باشد))?$/,
    /(?:نام|اسم)\s*[:：]\s*([\u0600-\u06FFa-zA-Z]{2,20}(?:\s+[\u0600-\u06FFa-zA-Z]{2,22})?)/,
  ];

  const stopWords = new Set([
    'سلام', 'ممنون', 'مرسی', 'تشکر', 'خرید', 'سفارش', 'پشتیبانی', 'فوری', 'قیمت', 'مشکل', 'خطا', 'بله', 'خیر', 'نه', 'باشه', 'چرا', 'چطور',
  ]);

  for (const p of patterns) {
    const m = raw.match(p);
    if (m && m[1]) {
      const candidate = m[1].trim().replace(/(?:ه|ام)$/, (tail) => (m[1].length > 5 ? '' : tail)).trim();
      const firstWord = candidate.split(' ')[0];
      if (candidate.length >= 2 && candidate.length <= 40 && !stopWords.has(firstWord)) {
        return candidate;
      }
    }
  }

  // If the agent explicitly asked for their name in the previous turn and they answered with 1-3 words
  if (agentAskedForName) {
    const words = raw.split(' ').filter(Boolean);
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
 * Saves the visitor's real Full Name in `users`, active `auth_sessions`, and `mod_live_chat_sessions`.
 */
export async function updateVisitorUserProfileTool(params: {
  phone: string;
  fullName: string;
  sessionId?: string;
}): Promise<{ ok: boolean; phone: string; fullName: string }> {
  const cleanPhone = String(params.phone || '').trim();
  const cleanName = String(params.fullName || '').trim().slice(0, 80);
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

async function generateLiveChatAiReply(params: {
  addressee: string;
  isGuest: boolean;
  messageText: string;
  existingMessages: { sender_role?: string; message_text?: string }[];
}): Promise<{ reply?: string; error?: string }> {
  try {
    const [skills, products] = await Promise.all([
      dbQuery<{ title_fa: string; skill_markdown: string }>(
        'SELECT title_fa, skill_markdown FROM mod_ai_agent_skills WHERE enabled = 1 LIMIT 6'
      ).catch(() => []),
      dbQuery<{ title: string; category: string; price: number }>(
        "SELECT title, category, price FROM products WHERE status = 'published' ORDER BY featured DESC LIMIT 12"
      ).catch(() => []),
    ]);

    const skillContext = skills
      .map((s) => `• ${s.title_fa}: ${String(s.skill_markdown || '').slice(0, 260)}`)
      .join('\n');
    const catalogContext = products
      .map(
        (p) =>
          `- ${p.title} (${p.category} · ${
            Number(p.price) === 0 ? 'رایگان' : `${Number(p.price).toLocaleString('fa-IR')} تومان`
          })`
      )
      .join('\n');

    const recentHistory = params.existingMessages
      .slice(-8)
      .map(
        (m) =>
          `${m.sender_role === 'visitor' ? 'کاربر' : 'پشتیبان'}: ${String(m.message_text || '').slice(0, 300)}`
      )
      .join('\n');

    const systemPrompt = [
      `شما دستیار هوشمند ۲۴/۷ پشتیبانی سایت «اسکیل ۹۸» هستید.`,
      `مخاطب فعلی: ${params.addressee} (${params.isGuest ? 'کاربر مهمان' : 'کاربر واردشده به حساب'}).`,
      `پاسخ را کوتاه، دقیق، محترمانه و کاملاً به زبان فارسی روان بنویسید.`,
      catalogContext ? `فهرست برخی محصولات و اسکیل‌های موجود در فروشگاه:\n${catalogContext}` : '',
      skillContext ? `دستورالعمل‌ها و مهارت‌های پشتیبانی:\n${skillContext}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const userPrompt = recentHistory
      ? `تاریخچه کوتاه گفتگو:\n${recentHistory}\n\nپیام جدید کاربر:\n${params.messageText}`
      : params.messageText;

    const res = await generateTextViaSlot({
      slot: 'agent_core',
      systemPrompt,
      userPrompt,
    });
    return { reply: res.text || undefined };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await writeSystemLog({
      level: 'error',
      category: 'system',
      title: 'خطای اتصال دستیار هوشمند ۲۴/۷ در چت آنلاین',
      detail: errMsg,
      sqlOrEndpoint: 'LIVE_CHAT_AGENT_24_7 (agent_core)',
    }).catch(() => {});
    return { error: errMsg };
  }
}

/**
 * Live Chat AI Agent Hook:
 * - In autonomous_24_7 mode (or with liveChatAutoReply): answers both guests and logged-in users using live AI + store catalog + SKILL.md rules.
 * - For logged-in users: detects & saves their Full Name via `update_visitor_user_profile`, or gently asks for their name if still missing.
 */
export async function handleLiveChatAgentAutomation(params: {
  sessionId: string;
  messageText: string;
  authenticatedPhone?: string;
  existingMessages: { sender_role?: string; message_text?: string }[];
}): Promise<{
  agentReply?: string;
  updatedDisplayName?: string;
  toolExecuted?: string;
}> {
  const enabled = await isAiHubModuleEnabled();
  if (!enabled) return {};
  const settings = await getAiHubSettings();
  if (!settings.liveChatAutoReply && !settings.autoProfileCompletion) return {};

  const isGuest = !params.authenticatedPhone;
  const alreadyPromptedGuest = params.existingMessages.some(
    (m) =>
      m.sender_role === 'operator' &&
      String(m.message_text || '').includes('اولویت فوری')
  );

  if (isGuest) {
    if (settings.liveChatAutoReply && settings.agentMode === 'autonomous_24_7') {
      const aiAttempt = await generateLiveChatAiReply({
        addressee: 'کاربر گرامی',
        isGuest: true,
        messageText: params.messageText,
        existingMessages: params.existingMessages,
      });
      if (aiAttempt.reply) {
        const suffix = !alreadyPromptedGuest
          ? '\n\n💡 برای ثبت درخواست با «اولویت فوری» می‌توانید شماره موبایل خود را در بالای همین پنجره تایید کنید.'
          : '';
        return { agentReply: `${aiAttempt.reply}${suffix}` };
      }
      if (!alreadyPromptedGuest) {
        return {
          agentReply:
            'سلام و خوش آمدید! پیام شما با موفقیت ثبت شد و برای اپراتور پشتیبانی ارسال گردید. برای دریافت پاسخ با «اولویت فوری»، شماره موبایل خود را در بالای همین پنجره وارد کنید.',
        };
      }
      return {
        agentReply:
          'پیام شما در صف پشتیبانی ثبت شد. همکاران ما در کوتاه‌ترین زمان پاسخ شما را ارسال خواهند کرد.',
      };
    }

    if (!alreadyPromptedGuest) {
      return {
        agentReply:
          'سلام و خوش آمدید! پیام شما دریافت شد. برای دریافت پاسخ سریع‌تر و ثبت درخواست با اولویت فوری، شماره موبایل خود را همینجا وارد کنید یا وارد حساب کاربری شوید.',
      };
    }
    return {};
  }

  // Logged-in visitor: inspect user profile in DB
  const userRow = await findUserByPhone(params.authenticatedPhone!);
  const currentName = userRow?.full_name || '';
  const needsName = isGenericDisplayName(currentName);

  const lastOperatorMsg = [...params.existingMessages]
    .reverse()
    .find((m) => m.sender_role === 'operator');
  const agentAskedForName = Boolean(
    lastOperatorMsg &&
      /نام|اسم/.test(String(lastOperatorMsg.message_text || ''))
  );

  if (settings.autoProfileCompletion) {
    const extractedName = extractNameFromChatMessage(params.messageText, agentAskedForName);
    if (extractedName && (needsName || extractedName !== currentName)) {
      const toolRes = await updateVisitorUserProfileTool({
        phone: params.authenticatedPhone!,
        fullName: extractedName,
        sessionId: params.sessionId,
      });
      if (toolRes.ok) {
        return {
          updatedDisplayName: extractedName,
          toolExecuted: 'update_visitor_user_profile',
          agentReply: `خوشبختم ${extractedName} عزیز! نام شما با موفقیت در حساب کاربری‌تان ثبت شد و درخواست شما با اولویت فوری در دست بررسی است. چطور می‌توانم دقیق‌تر کمکتان کنم؟`,
        };
      }
    }
  }

  if (settings.agentMode === 'autonomous_24_7' && settings.liveChatAutoReply) {
    const addressee = needsName ? 'کاربر گرامی' : `${currentName} عزیز`;
    const aiAttempt = await generateLiveChatAiReply({
      addressee,
      isGuest: false,
      messageText: params.messageText,
      existingMessages: params.existingMessages,
    });
    if (aiAttempt.reply) {
      const askNameSuffix =
        settings.autoProfileCompletion && needsName && !agentAskedForName
          ? '\n\n(برای تکمیل پروفایل و خطاب بهتر، خوشحال می‌شوم نام شریفتان را هم بفرمایید.)'
          : '';
      return { agentReply: `${aiAttempt.reply}${askNameSuffix}` };
    }
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
