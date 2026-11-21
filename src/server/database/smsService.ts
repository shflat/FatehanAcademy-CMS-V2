import type {
  BaleSendMode,
  SmsGatewaySettings,
  SmsProviderCredential,
  SmsProviderId,
  SmsTriggerEventKey,
} from '../../core/types.js';
import { DEFAULT_SMS_GATEWAY_SETTINGS } from '../../data/defaults.js';
import { getAllSmsTriggers } from './catalogOrdersRepo.js';
import { getSetting, writeSystemLog } from './settingsLogsRepo.js';
import { logDeliveryEvent } from '../../../modules/mod_delivery_logs/deliveryLogsRouter.js';

export function renderSmsTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = String(template || '');
  for (const [k, v] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return result;
}

export function ensureCancel11Suffix(message: string): string {
  const trimmed = String(message || '').trim();
  if (!trimmed) return 'لغو11';
  if (/لغو\s*(11|۱۱)/u.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}\nلغو11`;
}

function sanitizeBaleTokenForUrl(token: string): string {
  return String(token || '')
    .trim()
    .replace(/^bot/i, '')
    .replace(/[^\w:-]/g, '');
}

const MELIPAYAMAK_STATUS_ERRORS: Record<string, string> = {
  '-10': 'در ارسال پیامک پیوند وجود دارد (در متن یا متغیرها لینک غیرمجاز یافت شد).',
  '-7': 'خطای داخلی سامانه ملی‌پیامک رخ داده است.',
  '-6': 'خطای غیرمنتظره از سمت وب‌سرویس ملی‌پیامک.',
  '-5': 'متن یا متغیرها با قالب الگو مطابقت ندارد.',
  '-4': 'کد متن (bodyId) در پنل ملی‌پیامک معتبر یا تاییدشده نیست.',
  '-3': 'خط ارسالی در پنل تعریف نشده است.',
  '-2': 'محدودیت تعداد شماره در هر درخواست رعایت نشده است.',
  '-1': 'دسترسی وب‌سرویس برای این اکانت غیرفعال است.',
  '0': 'نام کاربری یا رمز عبور / API Key ملی‌پیامک اشتباه است.',
  '2': 'اعتبار حساب پیامکی کافی نیست.',
  '6': 'سامانه پیامکی در حال به‌روزرسانی است.',
  '7': 'متن یا پارامترها شامل کلمات فیلترشده مخابرات است.',
  '10': 'کاربر گرامی، اکانت پیامکی فعال نیست.',
  '11': 'پیامک ارسال نشد (خطای مخابراتی یا بلک‌لیست).',
  '12': 'مدارک کاربر در سامانه ملی‌پیامک کامل نیست.',
  '15': 'عبارت «لغو11» در انتهای متن وجود ندارد.',
  '18': 'شماره موبایل گیرنده نامعتبر است.',
  '35': 'محدودیت ارسال در فهرست سیاه مخابرات.',
  '108': 'مسدود شدن موقت دسترسی IP یا اکانت.',
  '109': 'الزام ثبت IP سرور در بخش امنیت/تنظیمات وب‌سرویس پنل ملی‌پیامک.',
  '110': 'به جای رمز عبور پنل باید از API Key (کلید وب‌سرویس) استفاده کنید.',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeBaleSafirPhone(phone: string): string {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('09') && digits.length === 11) {
    return `98${digits.slice(1)}`;
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return `98${digits}`;
  }
  if (digits.startsWith('0098')) {
    return digits.slice(2);
  }
  return digits;
}

function buildPatternArgs(
  template: string | undefined,
  vars: Record<string, string | number>,
  customMessageOverride?: string
): string[] {
  if (vars.patternArgs !== undefined && String(vars.patternArgs).trim() !== '') {
    return String(vars.patternArgs)
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (customMessageOverride && customMessageOverride.includes(';')) {
    return customMessageOverride
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (template) {
    const matches = Array.from(template.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map((m) => m[1]);
    if (matches.length > 0) {
      const uniqueKeys = Array.from(new Set(matches));
      const vals = uniqueKeys
        .map((k) => (vars[k] !== undefined ? String(vars[k]) : ''))
        .filter((v) => v.length > 0);
      if (vals.length > 0) return vals;
    }
  }
  if (vars.code !== undefined) return [String(vars.code)];
  if (vars.tracking_code !== undefined) return [String(vars.tracking_code)];
  return [customMessageOverride || 'Test'];
}

interface ProviderDispatchResult {
  ok: boolean;
  endpoint: string;
  response: unknown;
  errorMessage?: string;
}

async function sendViaMeliPayamak(params: {
  cred: SmsProviderCredential;
  phone: string;
  finalPattern: string;
  finalMessage: string;
  patternArgs: string[];
}): Promise<ProviderDispatchResult> {
  const { cred, phone, finalPattern, finalMessage, patternArgs } = params;
  const apiMethod = cred.apiMethod || 'sendbybasenumber2';

  if (finalPattern) {
    const textSemicolon = patternArgs.join(';');

    if (apiMethod === 'sendbybasenumber2') {
      const endpoint = 'https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2';
      const formBody = new URLSearchParams({
        username: cred.username.trim(),
        password: cred.apiKey.trim(),
        text: textSemicolon,
        to: phone,
        bodyId: String(Number(finalPattern) || finalPattern),
      });
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
        body: formBody.toString(),
      });
      const rawXml = await resp.text();
      const xmlMatch = rawXml.match(/<string[^>]*>([\s\S]*?)<\/string>/i);
      const rawValue = (xmlMatch ? xmlMatch[1] : rawXml).trim();
      const numVal = Number(rawValue);
      const isSuccess = resp.ok && Number.isFinite(numVal) && numVal > 1000;
      const errMsg = !isSuccess
        ? MELIPAYAMAK_STATUS_ERRORS[rawValue] ||
          `پاسخ خطا از ملی‌پیامک (SendByBaseNumber2): ${rawValue || resp.status}`
        : undefined;
      return {
        ok: isSuccess,
        endpoint,
        response: {
          method: 'SendByBaseNumber2',
          httpStatus: resp.status,
          rawValue,
          rawXml,
          patternArgs,
        },
        errorMessage: errMsg,
      };
    }

    if (apiMethod === 'sendbybasenumber') {
      const endpoint = 'https://api.payamak-panel.com/post/Send.asmx';
      const argsXml = patternArgs.map((arg) => `<string>${escapeXml(arg)}</string>`).join('');
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SendByBaseNumber xmlns="http://tempuri.org/">
      <username>${escapeXml(cred.username.trim())}</username>
      <password>${escapeXml(cred.apiKey.trim())}</password>
      <text>${argsXml}</text>
      <to>${escapeXml(phone)}</to>
      <bodyId>${Number(finalPattern) || finalPattern}</bodyId>
    </SendByBaseNumber>
  </soap:Body>
</soap:Envelope>`;
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: '"http://tempuri.org/SendByBaseNumber"',
        },
        body: soapEnvelope,
      });
      const rawXml = await resp.text();
      const resultMatch = rawXml.match(
        /<SendByBaseNumberResult>([\s\S]*?)<\/SendByBaseNumberResult>/i
      );
      const rawValue = (resultMatch ? resultMatch[1] : rawXml).trim();
      const numVal = Number(rawValue);
      const isSuccess = resp.ok && Number.isFinite(numVal) && numVal > 1000;
      const errMsg = !isSuccess
        ? MELIPAYAMAK_STATUS_ERRORS[rawValue] ||
          `پاسخ خطا از ملی‌پیامک (SendByBaseNumber SOAP): ${rawValue || resp.status}`
        : undefined;
      return {
        ok: isSuccess,
        endpoint: `${endpoint}#SendByBaseNumber`,
        response: {
          method: 'SendByBaseNumber',
          httpStatus: resp.status,
          rawValue,
          rawXml,
          patternArgs,
        },
        errorMessage: errMsg,
      };
    }

    const restEndpoint = 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber';
    const resp = await fetch(restEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cred.username.trim(),
        password: cred.apiKey.trim(),
        to: phone,
        text: textSemicolon,
        bodyId: Number(finalPattern) || finalPattern,
      }),
    });
    const json = (await resp.json().catch(() => ({}))) as {
      Value?: string | number;
      RetStatus?: number;
      StrRetStatus?: string;
    };
    const valStr = String(json?.Value ?? '').trim();
    const valNum = Number(valStr);
    const isSuccess =
      resp.ok && json?.RetStatus === 1 && (!Number.isFinite(valNum) || valNum > 1000);
    const errMsg = !isSuccess
      ? MELIPAYAMAK_STATUS_ERRORS[valStr] ||
        json?.StrRetStatus ||
        `خطا از ملی‌پیامک REST (RetStatus=${json?.RetStatus ?? resp.status}, Value=${valStr})`
      : undefined;
    return {
      ok: isSuccess,
      endpoint: restEndpoint,
      response: { method: 'REST_BaseServiceNumber', httpStatus: resp.status, ...json, patternArgs },
      errorMessage: errMsg,
    };
  }

  const sendUrl = 'https://rest.payamak-panel.com/api/SendSMS/SendSMS';
  const resp = await fetch(sendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: cred.username.trim(),
      password: cred.apiKey.trim(),
      to: phone,
      from: cred.senderLine.trim(),
      text: finalMessage,
      isFlash: false,
    }),
  });
  const json = (await resp.json().catch(() => ({}))) as {
    Value?: string | number;
    RetStatus?: number;
    StrRetStatus?: string;
  };
  const valStr = String(json?.Value ?? '').trim();
  const valNum = Number(valStr);
  const isSuccess =
    resp.ok && json?.RetStatus === 1 && (!Number.isFinite(valNum) || valNum > 1000);
  const errMsg = !isSuccess
    ? MELIPAYAMAK_STATUS_ERRORS[valStr] ||
      json?.StrRetStatus ||
      `خطای ارسال خط اختصاصی (${valStr || resp.status})`
    : undefined;
  return {
    ok: isSuccess,
    endpoint: sendUrl,
    response: { method: 'REST_SendSMS', httpStatus: resp.status, ...json },
    errorMessage: errMsg,
  };
}

async function sendViaBaleMessenger(params: {
  cred: SmsProviderCredential;
  phone: string;
  finalMessage: string;
  vars: Record<string, string | number>;
  matchedTitle: string;
  baleChatIdOverride?: string;
  baleTestChannel?: 'bot_api' | 'safir_otp';
}): Promise<ProviderDispatchResult> {
  const { cred, phone, finalMessage, vars, matchedTitle, baleChatIdOverride, baleTestChannel } = params;
  const mode: BaleSendMode = baleTestChannel || cred.baleMode || 'auto';
  const clientId = (cred.baleClientId || cred.username || '').trim();
  const clientSecret = (cred.baleClientSecret || cred.apiKey || '').trim();
  const botToken = sanitizeBaleTokenForUrl(cred.baleBotToken || '');
  const targetChatId = (baleChatIdOverride || cred.baleChatId || '').trim();
  const otpRaw = vars.code !== undefined ? String(vars.code).replace(/[^0-9]/g, '') : '';

  const hasSafirCreds = Boolean(clientId && clientSecret);
  const hasBotCreds = Boolean(botToken && targetChatId);
  const shouldUseSafir =
    mode === 'safir_otp' ||
    (mode === 'auto' && Boolean(otpRaw) && hasSafirCreds && Boolean(phone) && !baleTestChannel);

  if (shouldUseSafir) {
    if (!hasSafirCreds) {
      return {
        ok: false,
        endpoint: 'https://safir.bale.ai/api/v2/send_otp',
        response: { error: 'missing_safir_credentials' },
        errorMessage: 'شناسه کلاینت (Client ID) و کلید محرمانه (Client Secret) سفیر بله وارد نشده است.',
      };
    }
    const intlPhone = normalizeBaleSafirPhone(phone);
    if (!/^989\d{9}$/.test(intlPhone)) {
      return {
        ok: false,
        endpoint: 'https://safir.bale.ai/api/v2/send_otp',
        response: { error: 'invalid_phone', phone },
        errorMessage: 'برای ارسال از طریق سفیر بله، شماره موبایل معتبر ایرانی الزامی است.',
      };
    }

    const tokenEndpoint = 'https://safir.bale.ai/api/v2/auth/token';
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'read',
    });

    const tokenResp = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });
    const tokenRaw = await tokenResp.text().catch(() => '');
    let tokenJson: {
      access_token?: string;
      error?: string;
      error_description?: string;
    } = {};
    try {
      tokenJson = tokenRaw ? JSON.parse(tokenRaw) : {};
    } catch {
      tokenJson = { error: tokenRaw.slice(0, 200) };
    }

    if (!tokenResp.ok || !tokenJson.access_token) {
      return {
        ok: false,
        endpoint: tokenEndpoint,
        response: { httpStatus: tokenResp.status, ...tokenJson },
        errorMessage:
          tokenJson.error_description ||
          tokenJson.error ||
          `خطای احراز هویت سفیر بله (HTTP ${tokenResp.status})`,
      };
    }

    const otpEndpoint = 'https://safir.bale.ai/api/v2/send_otp';
    const otpNumeric = Number(otpRaw || '54321');
    const otpResp = await fetch(otpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
      body: JSON.stringify({
        phone: intlPhone,
        otp: Number.isFinite(otpNumeric) ? otpNumeric : 54321,
      }),
    });
    const otpRawText = await otpResp.text().catch(() => '');
    let otpJson: {
      balance?: number;
      message?: string;
      code?: number;
    } = {};
    try {
      otpJson = otpRawText ? JSON.parse(otpRawText) : {};
    } catch {
      otpJson = { message: otpRawText.slice(0, 200) };
    }
    return {
      ok: otpResp.ok,
      endpoint: otpEndpoint,
      response: { mode: 'bale_safir_otp', httpStatus: otpResp.status, ...otpJson },
      errorMessage: otpResp.ok
        ? undefined
        : otpJson.message || `خطای ارسال OTP از سفیر بله (HTTP ${otpResp.status})`,
    };
  }

  // Bale Bot API (tapi.bale.ai) — keep ":" intact in Bot Token (never encodeURIComponent)
  if (!hasBotCreds) {
    return {
      ok: false,
      endpoint: 'https://tapi.bale.ai/bot/sendMessage',
      response: { error: 'missing_bale_bot_credentials' },
      errorMessage:
        mode === 'bot_api'
          ? 'توکن ربات بله (Bot Token) و شناسه چت مقصد (chat_id) وارد نشده‌اند.'
          : 'برای ارسال از پیام‌رسان بله، اطلاعات سفیر بله (برای OTP) یا توکن ربات و chat_id (برای پیام متنی) را تکمیل کنید.',
    };
  }

  const botEndpoint = `https://tapi.bale.ai/bot${botToken}/sendMessage`;
  const textPayload = phone
    ? `📩 ${matchedTitle}\n📱 گیرنده: ${phone}\n\n${finalMessage}`
    : `📩 ${matchedTitle}\n\n${finalMessage}`;

  const resp = await fetch(botEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: targetChatId,
      text: textPayload,
    }),
  });
  const rawText = await resp.text().catch(() => '');
  let json: {
    ok?: boolean;
    description?: string;
    result?: unknown;
  } = {};
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    json = { ok: false, description: rawText.slice(0, 220) };
  }
  const ok = resp.ok && json.ok === true;
  return {
    ok,
    endpoint: 'https://tapi.bale.ai/bot***/sendMessage',
    response: { mode: 'bale_bot_api', httpStatus: resp.status, ...json },
    errorMessage: ok ? undefined : json.description || `خطای ربات بله (HTTP ${resp.status})`,
  };
}

function sanitizeEitaaTokenForUrl(raw: string): string {
  // Eitaayar tokens look like "bot12345:xxxx-xxxx" — keep leading "bot" and colon intact
  return raw.trim().replace(/[^\w:-]/g, '');
}

async function sendViaEitaaMessenger(params: {
  cred: SmsProviderCredential;
  phone: string;
  finalMessage: string;
  matchedTitle: string;
  chatIdOverride?: string;
}): Promise<{
  ok: boolean;
  endpoint: string;
  response: unknown;
  errorMessage?: string;
}> {
  const { cred, phone, finalMessage, matchedTitle, chatIdOverride } = params;
  const cleanToken = sanitizeEitaaTokenForUrl(
    cred.eitaaToken || cred.apiKey || process.env.EITAA_BOT_TOKEN || ''
  );
  const targetChatId = (
    chatIdOverride ||
    cred.eitaaChatId ||
    process.env.EITAA_CHAT_ID ||
    ''
  ).trim();

  if (!cleanToken || !targetChatId) {
    const msg =
      'برای ارسال از طریق پیام‌رسان ایتا (ایتایار)، وارد کردن توکن ایتایار (Token) و شناسه کانال/گروه (chat_id) الزامی است.';
    return {
      ok: false,
      endpoint: 'https://eitaayar.ir/api/***/sendMessage',
      response: { error: msg },
      errorMessage: msg,
    };
  }

  const textPayload = phone
    ? `${finalMessage}\n\n📱 مخاطب: ${phone}\n📌 رویداد: ${matchedTitle}`
    : finalMessage;

  const formBody = new URLSearchParams({
    chat_id: targetChatId,
    text: textPayload,
  });

  const resp = await fetch(`https://eitaayar.ir/api/${cleanToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
    body: formBody.toString(),
  });
  const rawText = await resp.text().catch(() => '');
  let json: { ok?: boolean; description?: string; result?: unknown } = {};
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch {
    json = { ok: false, description: rawText.slice(0, 220) };
  }
  const ok = resp.ok && json.ok === true;
  return {
    ok,
    endpoint: 'https://eitaayar.ir/api/***/sendMessage',
    response: { mode: 'eitaayar_api', httpStatus: resp.status, ...json },
    errorMessage: ok
      ? undefined
      : json.description || `خطای وب‌سرویس ایتایار (HTTP ${resp.status})`,
  };
}

function resolveProviderCredential(
  smsCfg: SmsGatewaySettings,
  providerId: SmsProviderId,
  credentialsOverride?: Partial<SmsProviderCredential>
): SmsProviderCredential {
  const fromMap = smsCfg.providersMap?.[providerId];
  const isLegacyPrimary = smsCfg.provider === providerId;
  const base: SmsProviderCredential = {
    provider: providerId,
    enabled:
      typeof fromMap?.enabled === 'boolean'
        ? fromMap.enabled
        : isLegacyPrimary
        ? smsCfg.enabled !== false
        : false,
    username: fromMap?.username ?? (isLegacyPrimary ? smsCfg.username : ''),
    apiKey: fromMap?.apiKey ?? (isLegacyPrimary ? smsCfg.apiKey : ''),
    senderLine: fromMap?.senderLine ?? (isLegacyPrimary ? smsCfg.senderLine : ''),
    otpPatternCode: fromMap?.otpPatternCode ?? (isLegacyPrimary ? smsCfg.otpPatternCode : ''),
    apiMethod: fromMap?.apiMethod ?? (isLegacyPrimary ? smsCfg.apiMethod : 'sendbybasenumber2'),
    domain: fromMap?.domain ?? '',
    patternVarName: fromMap?.patternVarName ?? '',
    baleMode: fromMap?.baleMode ?? 'auto',
    baleClientId: fromMap?.baleClientId ?? '',
    baleClientSecret: fromMap?.baleClientSecret ?? '',
    baleBotToken: fromMap?.baleBotToken ?? '',
    baleChatId: fromMap?.baleChatId ?? '',
    eitaaToken: fromMap?.eitaaToken ?? '',
    eitaaChatId: fromMap?.eitaaChatId ?? '',
    sandboxMode:
      typeof fromMap?.sandboxMode === 'boolean'
        ? fromMap.sandboxMode
        : isLegacyPrimary
        ? smsCfg.sandboxMode
        : true,
  };
  if (!credentialsOverride) return base;
  return {
    ...base,
    ...credentialsOverride,
    provider: providerId,
  };
}

export async function dispatchEventSms(params: {
  eventKey?: SmsTriggerEventKey;
  phone: string;
  variables?: Record<string, string | number>;
  customMessageOverride?: string;
  patternCodeOverride?: string;
  providerOverride?: SmsProviderId;
  credentialsOverride?: Partial<SmsProviderCredential>;
  baleChatIdOverride?: string;
  baleTestChannel?: 'bot_api' | 'safir_otp';
}): Promise<{
  dispatched: boolean;
  sandbox: boolean;
  provider: string;
  matchedRuleTitle: string;
  messagePreview: string;
  errorMessage?: string;
  gatewayResponse?: unknown;
}> {
  const smsCfg = await getSetting<SmsGatewaySettings>(
    'sms_gateway_config',
    DEFAULT_SMS_GATEWAY_SETTINGS
  );
  const rules = await getAllSmsTriggers();
  const activeRule = params.eventKey
    ? rules
        .filter((r) => r.enabled && r.eventKey === params.eventKey)
        .sort((a, b) => a.priorityOrder - b.priorityOrder)[0]
    : undefined;

  // Strictly resolve ONE single gateway for this process:
  // 1) Explicit providerOverride (direct per-provider test)
  // 2) Active rule's providerOverride (if not 'default')
  // 3) Per-event routing table in smsCfg.eventRouting (if not 'default')
  // 4) Default primary gateway (smsCfg.provider)
  let resolvedProvider: SmsProviderId = smsCfg.provider || 'melipayamak';
  let usingDefaultPrimary = true;

  if (params.providerOverride) {
    resolvedProvider = params.providerOverride;
    usingDefaultPrimary = false;
  } else if (activeRule?.providerOverride && activeRule.providerOverride !== 'default') {
    resolvedProvider = activeRule.providerOverride;
    usingDefaultPrimary = false;
  } else if (
    params.eventKey &&
    smsCfg.eventRouting?.[params.eventKey] &&
    smsCfg.eventRouting[params.eventKey] !== 'default'
  ) {
    resolvedProvider = smsCfg.eventRouting[params.eventKey] as SmsProviderId;
    usingDefaultPrimary = false;
  }

  const effectiveCred = resolveProviderCredential(
    smsCfg,
    resolvedProvider,
    params.credentialsOverride
  );

  const isDirectTestWithOverride = Boolean(params.providerOverride && params.credentialsOverride);
  const isGatewayActive =
    isDirectTestWithOverride ||
    (usingDefaultPrimary
      ? smsCfg.enabled !== false && effectiveCred.enabled
      : effectiveCred.enabled);

  const vars = params.variables || {};
  const rawMessage = params.customMessageOverride
    ? renderSmsTemplate(params.customMessageOverride, vars)
    : activeRule
    ? renderSmsTemplate(activeRule.messageTemplate, vars)
    : `پیام سیستم اسکیل ۹۸ (${params.phone || 'Bale'})`;

  const finalPattern =
    params.patternCodeOverride ||
    (activeRule?.sendMode === 'pattern_code'
      ? activeRule.patternCode ||
        (params.eventKey === 'user_registered' ? effectiveCred.otpPatternCode : '')
      : '') ||
    '';

  // Auto-append mandatory "لغو11" suffix to all plain-text (non-pattern) Iranian SMS dispatches
  const isMessenger = resolvedProvider === 'bale' || resolvedProvider === 'eitaa';
  const finalMessage =
    !isMessenger && !finalPattern
      ? ensureCancel11Suffix(rawMessage)
      : rawMessage;

  const matchedTitle = activeRule ? activeRule.title : 'ارسال دستی / تست مستقیم';
  let gatewayResponse: unknown = { simulated: true };
  let liveSent = false;
  let errorMessage: string | undefined;
  let usedEndpoint = `${
    resolvedProvider === 'bale'
      ? 'BALE'
      : resolvedProvider === 'eitaa'
      ? 'EITAA'
      : 'SMS'
  }:${resolvedProvider.toUpperCase()} · ${finalPattern ? `Pattern:${finalPattern}` : 'CustomText'}`;

  if (!isGatewayActive) {
    errorMessage = `درگاه «${resolvedProvider}» برای این فرآیند غیرفعال (خاموش) است. لطفاً آن را در تنظیمات درگاه‌های پیامکی و پیام‌رسان‌ها فعال کنید.`;
    gatewayResponse = { disabled: true, provider: resolvedProvider };
  } else if (!effectiveCred.sandboxMode) {
    const patternArgs = buildPatternArgs(
      activeRule?.messageTemplate,
      vars,
      params.customMessageOverride
    );

    try {
      if (resolvedProvider === 'bale') {
        const baleRes = await sendViaBaleMessenger({
          cred: effectiveCred,
          phone: params.phone,
          finalMessage,
          vars,
          matchedTitle,
          baleChatIdOverride: params.baleChatIdOverride,
          baleTestChannel: params.baleTestChannel,
        });
        liveSent = baleRes.ok;
        usedEndpoint = baleRes.endpoint;
        gatewayResponse = baleRes.response;
        errorMessage = baleRes.errorMessage;
      } else if (resolvedProvider === 'eitaa') {
        const eitaaRes = await sendViaEitaaMessenger({
          cred: effectiveCred,
          phone: params.phone,
          finalMessage,
          matchedTitle,
          chatIdOverride: params.baleChatIdOverride,
        });
        liveSent = eitaaRes.ok;
        usedEndpoint = eitaaRes.endpoint;
        gatewayResponse = eitaaRes.response;
        errorMessage = eitaaRes.errorMessage;
      } else if (resolvedProvider === 'kavenegar') {
        const apiKey = (effectiveCred.apiKey || process.env.KAVENEGAR_API_KEY || '').trim();
        if (!apiKey) {
          errorMessage = 'کلید API کاوه‌نگار در تنظیمات وارد نشده است.';
          gatewayResponse = { error: errorMessage };
        } else if (finalPattern) {
          const qs = new URLSearchParams({
            receptor: params.phone,
            template: finalPattern,
            token: String(patternArgs[0] || vars.code || vars.tracking_code || '98000').replace(/\s+/g, '_'),
          });
          if (patternArgs[1]) qs.set('token2', patternArgs[1].replace(/\s+/g, '_'));
          if (patternArgs[2]) qs.set('token3', patternArgs[2].replace(/\s+/g, '_'));
          const targetUrl = `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json?${qs.toString()}`;
          usedEndpoint = 'https://api.kavenegar.com/v1/***/verify/lookup.json';
          const resp = await fetch(targetUrl);
          const kvJson = (await resp.json().catch(() => ({}))) as {
            return?: { status?: number; message?: string };
          };
          gatewayResponse = kvJson;
          liveSent = resp.ok && (kvJson?.return?.status === 200 || kvJson?.return?.status === undefined);
          if (!liveSent) errorMessage = kvJson?.return?.message || `خطای کاوه‌نگار (${resp.status})`;
        } else {
          const qs = new URLSearchParams({
            receptor: params.phone,
            message: finalMessage,
          });
          if (effectiveCred.senderLine.trim()) qs.set('sender', effectiveCred.senderLine.trim());
          const targetUrl = `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/sms/send.json?${qs.toString()}`;
          usedEndpoint = 'https://api.kavenegar.com/v1/***/sms/send.json';
          const resp = await fetch(targetUrl);
          const kvJson = (await resp.json().catch(() => ({}))) as {
            return?: { status?: number; message?: string };
          };
          gatewayResponse = kvJson;
          liveSent = resp.ok && (kvJson?.return?.status === 200 || kvJson?.return?.status === undefined);
          if (!liveSent) errorMessage = kvJson?.return?.message || `خطای کاوه‌نگار (${resp.status})`;
        }
      } else if (resolvedProvider === 'melipayamak' || resolvedProvider === 'farapayamak') {
        if (!effectiveCred.username?.trim() || !effectiveCred.apiKey?.trim()) {
          errorMessage = 'نام کاربری یا کلمه عبور/API Key پنل پیامک در تنظیمات وارد نشده است.';
          gatewayResponse = { error: errorMessage };
        } else {
          const mpResult = await sendViaMeliPayamak({
            cred: effectiveCred,
            phone: params.phone,
            finalPattern,
            finalMessage,
            patternArgs,
          });
          gatewayResponse = mpResult.response;
          liveSent = mpResult.ok;
          errorMessage = mpResult.errorMessage;
          usedEndpoint = mpResult.endpoint;
        }
      } else if (resolvedProvider === 'farazsms') {
        if (!effectiveCred.apiKey?.trim() || !effectiveCred.senderLine?.trim()) {
          errorMessage = 'کلید API و شماره خط ارسال فراز اس‌ام‌اس (IPPanel) الزامی هستند.';
          gatewayResponse = { error: errorMessage };
        } else if (finalPattern) {
          const endpoint = 'https://api2.ippanel.com/api/v1/sms/pattern/normal/send';
          usedEndpoint = endpoint;
          const varName = (effectiveCred.patternVarName || 'code').trim();
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: effectiveCred.apiKey.trim(),
            },
            body: JSON.stringify({
              code: finalPattern,
              sender: effectiveCred.senderLine.trim(),
              recipient: params.phone,
              variable: { [varName]: patternArgs[0] || String(vars.code || '54321') },
            }),
          });
          const json = (await resp.json().catch(() => ({}))) as { status?: string; error_message?: string };
          gatewayResponse = json;
          liveSent = resp.ok && json.status !== 'ERROR';
          if (!liveSent) errorMessage = json.error_message || `خطای پترن فراز اس‌ام‌اس (${resp.status})`;
        } else {
          const endpoint = 'https://api2.ippanel.com/api/v1/sms/send/webservice/single';
          usedEndpoint = endpoint;
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: effectiveCred.apiKey.trim(),
            },
            body: JSON.stringify({
              recipient: [params.phone],
              sender: effectiveCred.senderLine.trim(),
              message: finalMessage,
            }),
          });
          const json = (await resp.json().catch(() => ({}))) as { status?: string; error_message?: string };
          gatewayResponse = json;
          liveSent = resp.ok && json.status !== 'ERROR';
          if (!liveSent) errorMessage = json.error_message || `خطای فراز اس‌ام‌اس (${resp.status})`;
        }
      } else if (resolvedProvider === 'smsir') {
        if (!effectiveCred.apiKey?.trim()) {
          errorMessage = 'کلید API (x-api-key) درگاه SMS.ir وارد نشده است.';
          gatewayResponse = { error: errorMessage };
        } else {
          const endpoint = finalPattern
            ? 'https://api.sms.ir/v1/send/verify'
            : 'https://api.sms.ir/v1/send/bulk';
          usedEndpoint = endpoint;
          const paramName = (effectiveCred.patternVarName || 'CODE').trim();
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': effectiveCred.apiKey.trim(),
            },
            body: JSON.stringify(
              finalPattern
                ? {
                    mobile: params.phone,
                    templateId: Number(finalPattern) || finalPattern,
                    parameters: [
                      {
                        name: paramName,
                        value: String(patternArgs[0] || vars.code || vars.tracking_code || '98000'),
                      },
                    ],
                  }
                : {
                    lineNumber: Number(effectiveCred.senderLine) || effectiveCred.senderLine,
                    messageText: finalMessage,
                    mobiles: [params.phone],
                  }
            ),
          });
          const json = (await resp.json().catch(() => ({}))) as { status?: number; message?: string };
          gatewayResponse = json;
          liveSent = resp.ok && (json.status === 1 || json.status === undefined);
          if (!liveSent) errorMessage = json.message || `خطای SMS.ir (${resp.status})`;
        }
      } else if (resolvedProvider === 'ghasedak') {
        if (!effectiveCred.apiKey?.trim()) {
          errorMessage = 'کلید API قاصدک (apikey) وارد نشده است.';
          gatewayResponse = { error: errorMessage };
        } else if (finalPattern) {
          const endpoint = 'https://api.ghasedak.me/v2/verification/send/simple';
          usedEndpoint = endpoint;
          const form = new URLSearchParams({
            receptor: params.phone,
            type: '1',
            template: finalPattern,
            param1: patternArgs[0] || String(vars.code || '54321'),
          });
          if (patternArgs[1]) form.set('param2', patternArgs[1]);
          if (patternArgs[2]) form.set('param3', patternArgs[2]);
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              apikey: effectiveCred.apiKey.trim(),
            },
            body: form.toString(),
          });
          const json = (await resp.json().catch(() => ({}))) as { result?: { code?: number; message?: string } };
          gatewayResponse = json;
          liveSent = resp.ok && (json.result?.code === 200 || json.result?.code === undefined);
          if (!liveSent) errorMessage = json.result?.message || `خطای پترن قاصدک (${resp.status})`;
        } else {
          const endpoint = 'https://api.ghasedak.me/v2/sms/send/simple';
          usedEndpoint = endpoint;
          const form = new URLSearchParams({
            message: finalMessage,
            receptor: params.phone,
            linenumber: effectiveCred.senderLine.trim(),
          });
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              apikey: effectiveCred.apiKey.trim(),
            },
            body: form.toString(),
          });
          const json = (await resp.json().catch(() => ({}))) as { result?: { code?: number; message?: string } };
          gatewayResponse = json;
          liveSent = resp.ok && (json.result?.code === 200 || json.result?.code === undefined);
          if (!liveSent) errorMessage = json.result?.message || `خطای قاصدک (${resp.status})`;
        }
      } else if (resolvedProvider === 'magfa') {
        if (
          !effectiveCred.username?.trim() ||
          !effectiveCred.apiKey?.trim() ||
          !effectiveCred.domain?.trim() ||
          !effectiveCred.senderLine?.trim()
        ) {
          errorMessage = 'برای مگفا تکمیل نام کاربری، رمز عبور، نام دامنه (Domain) و سرشماره ۳۰۰۰ الزامی است.';
          gatewayResponse = { error: errorMessage };
        } else {
          const endpoint = 'https://sms.magfa.com/api/http/sms/v2/send';
          usedEndpoint = endpoint;
          const authToken = Buffer.from(
            `${effectiveCred.username.trim()}/${effectiveCred.domain.trim()}:${effectiveCred.apiKey.trim()}`
          ).toString('base64');
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${authToken}`,
            },
            body: JSON.stringify({
              senders: [effectiveCred.senderLine.trim()],
              recipients: [params.phone],
              messages: [finalMessage],
            }),
          });
          const json = (await resp.json().catch(() => ({}))) as { status?: number };
          gatewayResponse = json;
          liveSent = resp.ok && (json.status === 0 || json.status === undefined);
          if (!liveSent) errorMessage = `خطای مگفا (status=${json.status ?? resp.status})`;
        }
      } else if (resolvedProvider === 'parsgreen') {
        if (!effectiveCred.apiKey?.trim()) {
          errorMessage = 'امضای دیجیتال (Signature / API Key) پارس‌گرین وارد نشده است.';
          gatewayResponse = { error: errorMessage };
        } else if (finalPattern) {
          const endpoint = 'https://sms.parsgreen.ir/Apiv2/Message/SendOtp';
          usedEndpoint = endpoint;
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `basic apikey:${effectiveCred.apiKey.trim()}`,
            },
            body: JSON.stringify({
              Mobile: params.phone,
              SmsCode: patternArgs[0] || String(vars.code || '54321'),
              TemplateId: Number(finalPattern) || 0,
            }),
          });
          const json = (await resp.json().catch(() => ({}))) as { R_Success?: boolean; R_Message?: string };
          gatewayResponse = json;
          liveSent = resp.ok && json.R_Success !== false;
          if (!liveSent) errorMessage = json.R_Message || `خطای OTP پارس‌گرین (${resp.status})`;
        } else {
          const endpoint = 'https://sms.parsgreen.ir/Apiv2/Message/SendSms';
          usedEndpoint = endpoint;
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `basic apikey:${effectiveCred.apiKey.trim()}`,
            },
            body: JSON.stringify({
              SmsBody: finalMessage,
              Mobiles: [params.phone],
              SmsNumber: effectiveCred.senderLine.trim(),
            }),
          });
          const json = (await resp.json().catch(() => ({}))) as { R_Success?: boolean; R_Message?: string };
          gatewayResponse = json;
          liveSent = resp.ok && json.R_Success !== false;
          if (!liveSent) errorMessage = json.R_Message || `خطای ارسال پارس‌گرین (${resp.status})`;
        }
      } else if (effectiveCred.apiKey?.trim() || effectiveCred.username?.trim()) {
        // REST bridge for IranPayamak, TasnimSMS, SavatPayamak, PayamakSara
        const providerEndpoints: Record<string, string> = {
          iranpayamak: 'https://api.iranpayamak.com/ws/v1/sms/send',
          tasnimsms: 'https://api.tasnimsms.ir/v1/sms/send',
          savatpayamak: 'https://api.savatpayamak.ir/v1/sms/send',
          payamaksara: 'https://api.payamaksara.com/v1/send',
        };
        const endpoint =
          providerEndpoints[resolvedProvider] || `https://api.${resolvedProvider}.ir/v1/send`;
        usedEndpoint = endpoint;
        const varName = (effectiveCred.patternVarName || 'code').trim();
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': effectiveCred.apiKey.trim(),
            apikey: effectiveCred.apiKey.trim(),
            Authorization: `Bearer ${effectiveCred.apiKey.trim()}`,
          },
          body: JSON.stringify({
            username: effectiveCred.username.trim() || undefined,
            sender: effectiveCred.senderLine.trim(),
            line_number: effectiveCred.senderLine.trim(),
            receptor: params.phone,
            message: finalMessage,
            patternCode: finalPattern || undefined,
            parameters: finalPattern ? { [varName]: patternArgs[0] || '' } : undefined,
          }),
        });
        const json = await resp.json().catch(() => ({}));
        gatewayResponse = json;
        liveSent = resp.ok;
        if (!liveSent) {
          errorMessage = `خطای ارسال از درگاه ${resolvedProvider} (HTTP ${resp.status})`;
        }
      } else {
        errorMessage = `اطلاعات اتصال (API Key / نام کاربری) برای درگاه «${resolvedProvider}» وارد نشده است.`;
        gatewayResponse = { error: errorMessage };
      }
    } catch (err) {
      liveSent = false;
      errorMessage =
        err instanceof Error ? err.message : `خطای اتصال شبکه به درگاه ${resolvedProvider}`;
      gatewayResponse = { networkError: errorMessage };
    }
  }

  const dispatched = isGatewayActive && (effectiveCred.sandboxMode ? true : liveSent);

  await writeSystemLog({
    level: !isGatewayActive
      ? 'warning'
      : effectiveCred.sandboxMode
      ? 'success'
      : liveSent
      ? 'success'
      : 'error',
    category: 'sms',
    title: `${
      !isGatewayActive
        ? '[غیرفعال] '
        : effectiveCred.sandboxMode
        ? '[سندباکس] '
        : liveSent
        ? '[ارسال موفق] '
        : '[خطای ارسال] '
    }${resolvedProvider === 'bale' ? 'پیام بله' : 'پیامک'} به ${
      params.phone || params.baleChatIdOverride || effectiveCred.baleChatId || '—'
    } (${matchedTitle})`,
    detail: errorMessage ? `${errorMessage} | ${finalMessage}` : finalMessage,
    sqlOrEndpoint: usedEndpoint,
    payload: {
      phone: params.phone,
      provider: resolvedProvider,
      apiMethod: effectiveCred.apiMethod || 'sendbybasenumber2',
      sandboxMode: effectiveCred.sandboxMode,
      patternCode: finalPattern || null,
      message: finalMessage,
      errorMessage,
      gatewayResponse,
    },
  });

  await logDeliveryEvent({
    channel: resolvedProvider === 'bale' ? 'bot' : 'sms',
    provider: resolvedProvider,
    recipient: params.phone || params.baleChatIdOverride || effectiveCred.baleChatId || 'unknown',
    eventKey: params.eventKey || 'manual_sms',
    messagePreview: finalMessage,
    status: !isGatewayActive
      ? 'failed'
      : effectiveCred.sandboxMode
      ? 'sandbox'
      : liveSent
      ? 'sent'
      : 'failed',
    errorMessage,
    responsePayload: gatewayResponse,
  });

  return {
    dispatched,
    sandbox: isGatewayActive ? effectiveCred.sandboxMode : false,
    provider: resolvedProvider,
    matchedRuleTitle: matchedTitle,
    messagePreview: finalMessage,
    errorMessage,
    gatewayResponse,
  };
}
