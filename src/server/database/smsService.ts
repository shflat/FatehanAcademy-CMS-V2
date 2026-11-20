import type { SmsGatewaySettings, SmsTriggerEventKey } from '../../core/types.js';
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

function buildMeliPayamakPatternArgs(
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

async function sendViaMeliPayamak(params: {
  smsCfg: SmsGatewaySettings;
  phone: string;
  finalPattern: string;
  finalMessage: string;
  patternArgs: string[];
}): Promise<{ ok: boolean; endpoint: string; response: unknown; errorMessage?: string }> {
  const { smsCfg, phone, finalPattern, finalMessage, patternArgs } = params;
  const apiMethod = smsCfg.apiMethod || 'sendbybasenumber2';

  if (finalPattern) {
    const textSemicolon = patternArgs.join(';');

    if (apiMethod === 'sendbybasenumber2') {
      const endpoint = 'https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2';
      const formBody = new URLSearchParams({
        username: smsCfg.username.trim(),
        password: smsCfg.apiKey.trim(),
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
      <username>${escapeXml(smsCfg.username.trim())}</username>
      <password>${escapeXml(smsCfg.apiKey.trim())}</password>
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
        username: smsCfg.username.trim(),
        password: smsCfg.apiKey.trim(),
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
      username: smsCfg.username.trim(),
      password: smsCfg.apiKey.trim(),
      to: phone,
      from: smsCfg.senderLine.trim(),
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

export async function dispatchEventSms(params: {
  eventKey?: SmsTriggerEventKey;
  phone: string;
  variables?: Record<string, string | number>;
  customMessageOverride?: string;
  patternCodeOverride?: string;
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

  const vars = params.variables || {};
  const finalMessage = params.customMessageOverride
    ? renderSmsTemplate(params.customMessageOverride, vars)
    : activeRule
    ? renderSmsTemplate(activeRule.messageTemplate, vars)
    : `پیام سیستم اسکیل ۹۸ (${params.phone})`;

  const finalPattern =
    params.patternCodeOverride ||
    (activeRule?.sendMode === 'pattern_code'
      ? activeRule.patternCode ||
        (params.eventKey === 'user_registered' ? smsCfg.otpPatternCode : '')
      : '') ||
    '';

  const matchedTitle = activeRule ? activeRule.title : 'ارسال دستی / تست مستقیم';
  let gatewayResponse: unknown = { simulated: true };
  let liveSent = false;
  let errorMessage: string | undefined;
  let usedEndpoint = `SMS:${smsCfg.provider.toUpperCase()} · ${finalPattern ? `Pattern:${finalPattern}` : 'CustomText'}`;

  const activeCred = smsCfg.providersMap?.[smsCfg.provider];
  const effectiveCfg: SmsGatewaySettings = activeCred
    ? {
        ...smsCfg,
        username: activeCred.username || smsCfg.username,
        apiKey: activeCred.apiKey || smsCfg.apiKey,
        senderLine: activeCred.senderLine || smsCfg.senderLine,
        otpPatternCode: activeCred.otpPatternCode || smsCfg.otpPatternCode,
        apiMethod: activeCred.apiMethod || smsCfg.apiMethod,
        sandboxMode: typeof activeCred.sandboxMode === 'boolean' ? activeCred.sandboxMode : smsCfg.sandboxMode,
      }
    : smsCfg;

  if (!effectiveCfg.sandboxMode) {
    if (effectiveCfg.provider === 'kavenegar' && (effectiveCfg.apiKey || process.env.KAVENEGAR_API_KEY)) {
      const apiKey = effectiveCfg.apiKey || process.env.KAVENEGAR_API_KEY || '';
      const targetUrl = finalPattern
        ? `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json?receptor=${encodeURIComponent(params.phone)}&token=${encodeURIComponent(String(vars.code || vars.tracking_code || '98000'))}&template=${encodeURIComponent(finalPattern)}`
        : `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/sms/send.json?receptor=${encodeURIComponent(params.phone)}&sender=${encodeURIComponent(effectiveCfg.senderLine)}&message=${encodeURIComponent(finalMessage)}`;
      const resp = await fetch(targetUrl);
      const kvJson = (await resp.json().catch(() => ({}))) as {
        return?: { status?: number; message?: string };
      };
      gatewayResponse = kvJson;
      liveSent = resp.ok && (kvJson?.return?.status === 200 || kvJson?.return?.status === undefined);
      if (!liveSent) {
        errorMessage = kvJson?.return?.message || `خطای کاوه‌نگار (${resp.status})`;
      }
    } else if (
      effectiveCfg.provider === 'melipayamak' ||
      effectiveCfg.provider === 'farapayamak'
    ) {
      if (!effectiveCfg.username?.trim() || !effectiveCfg.apiKey?.trim()) {
        errorMessage = 'نام کاربری یا کلمه عبور/API Key پنل پیامک در تنظیمات وارد نشده است.';
        gatewayResponse = { error: errorMessage };
      } else {
        try {
          const patternArgs = buildMeliPayamakPatternArgs(
            activeRule?.messageTemplate,
            vars,
            params.customMessageOverride
          );
          const mpResult = await sendViaMeliPayamak({
            smsCfg: effectiveCfg,
            phone: params.phone,
            finalPattern,
            finalMessage,
            patternArgs,
          });
          gatewayResponse = mpResult.response;
          liveSent = mpResult.ok;
          errorMessage = mpResult.errorMessage;
          usedEndpoint = mpResult.endpoint;
        } catch (err) {
          liveSent = false;
          errorMessage = err instanceof Error ? err.message : String(err);
          gatewayResponse = { networkError: errorMessage };
        }
      }
    } else if (effectiveCfg.provider === 'farazsms' && effectiveCfg.apiKey?.trim()) {
      const endpoint = 'https://api2.ippanel.com/api/v1/sms/send/webservice/single';
      usedEndpoint = endpoint;
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: effectiveCfg.apiKey.trim(),
          },
          body: JSON.stringify({
            recipient: [params.phone],
            sender: effectiveCfg.senderLine.trim(),
            message: finalMessage,
          }),
        });
        const json = await resp.json().catch(() => ({}));
        gatewayResponse = json;
        liveSent = resp.ok;
        if (!liveSent) errorMessage = `خطای فراز اس‌ام‌اس (${resp.status})`;
      } catch (err) {
        liveSent = false;
        errorMessage = err instanceof Error ? err.message : 'خطای شبکه فراز اس‌ام‌اس';
      }
    } else if (effectiveCfg.provider === 'smsir' && effectiveCfg.apiKey?.trim()) {
      const endpoint = finalPattern
        ? 'https://api.sms.ir/v1/send/verify'
        : 'https://api.sms.ir/v1/send/bulk';
      usedEndpoint = endpoint;
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': effectiveCfg.apiKey.trim(),
          },
          body: JSON.stringify(
            finalPattern
              ? {
                  mobile: params.phone,
                  templateId: Number(finalPattern) || finalPattern,
                  parameters: [{ name: 'CODE', value: String(vars.code || vars.tracking_code || '98000') }],
                }
              : {
                  lineNumber: Number(effectiveCfg.senderLine) || effectiveCfg.senderLine,
                  messageText: finalMessage,
                  mobiles: [params.phone],
                }
          ),
        });
        const json = await resp.json().catch(() => ({}));
        gatewayResponse = json;
        liveSent = resp.ok;
        if (!liveSent) errorMessage = `خطای SMS.ir (${resp.status})`;
      } catch (err) {
        liveSent = false;
        errorMessage = err instanceof Error ? err.message : 'خطای شبکه SMS.ir';
      }
    } else if (effectiveCfg.apiKey?.trim() || effectiveCfg.username?.trim()) {
      // Standard REST bridge for ParsGreen, IranPayamak, TasnimSMS, SavatPayamak, PayamakSara, Ghasedak, Magfa
      const providerEndpoints: Record<string, string> = {
        parsgreen: 'https://sms.parsgreen.ir/Apiv2/Message/SendSms',
        iranpayamak: 'https://api.iranpayamak.com/ws/v1/sms/send',
        tasnimsms: 'https://api.tasnimsms.ir/v1/sms/send',
        savatpayamak: 'https://api.savatpayamak.ir/v1/sms/send',
        payamaksara: 'https://api.payamaksara.com/v1/send',
        ghasedak: 'https://api.ghasedak.me/v2/sms/send/simple',
        magfa: 'https://sms.magfa.com/api/http/sms/v2/send',
      };
      const endpoint = providerEndpoints[effectiveCfg.provider] || `https://api.${effectiveCfg.provider}.ir/v1/send`;
      usedEndpoint = endpoint;
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: effectiveCfg.apiKey.trim(),
            Authorization: `Bearer ${effectiveCfg.apiKey.trim()}`,
          },
          body: JSON.stringify({
            username: effectiveCfg.username,
            sender: effectiveCfg.senderLine,
            receptor: params.phone,
            message: finalMessage,
            patternCode: finalPattern || undefined,
          }),
        });
        const json = await resp.json().catch(() => ({}));
        gatewayResponse = json;
        liveSent = resp.ok;
        if (!liveSent) errorMessage = `خطای ارسال از درگاه ${effectiveCfg.provider} (HTTP ${resp.status})`;
      } catch (err) {
        liveSent = false;
        errorMessage = err instanceof Error ? err.message : `خطای اتصال به درگاه ${effectiveCfg.provider}`;
      }
    } else {
      errorMessage = `اطلاعات اتصال (API Key / نام کاربری) برای درگاه «${effectiveCfg.provider}» وارد نشده است.`;
      gatewayResponse = { error: errorMessage };
    }
  }

  const dispatched = effectiveCfg.sandboxMode ? true : liveSent;

  await writeSystemLog({
    level: smsCfg.sandboxMode ? 'success' : liveSent ? 'success' : 'error',
    category: 'sms',
    title: `${smsCfg.sandboxMode ? '[سندباکس] ' : liveSent ? '[ارسال موفق] ' : '[خطای ارسال] '}پیامک به ${params.phone} (${matchedTitle})`,
    detail: errorMessage ? `${errorMessage} | ${finalMessage}` : finalMessage,
    sqlOrEndpoint: usedEndpoint,
    payload: {
      phone: params.phone,
      provider: smsCfg.provider,
      apiMethod: smsCfg.apiMethod || 'sendbybasenumber2',
      sandboxMode: smsCfg.sandboxMode,
      patternCode: finalPattern || null,
      message: finalMessage,
      errorMessage,
      gatewayResponse,
    },
  });

  await logDeliveryEvent({
    channel: 'sms',
    provider: effectiveCfg.provider,
    recipient: params.phone,
    eventKey: params.eventKey || 'manual_sms',
    messagePreview: finalMessage,
    status: effectiveCfg.sandboxMode ? 'sandbox' : liveSent ? 'sent' : 'failed',
    errorMessage,
    responsePayload: gatewayResponse,
  });

  return {
    dispatched,
    sandbox: smsCfg.sandboxMode,
    provider: smsCfg.provider,
    matchedRuleTitle: matchedTitle,
    messagePreview: finalMessage,
    errorMessage,
    gatewayResponse,
  };
}
