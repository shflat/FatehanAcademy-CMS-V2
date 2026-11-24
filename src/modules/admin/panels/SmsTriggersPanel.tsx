import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Plus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Send,
  Edit3,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type {
  BaleSafirApiVersion,
  BaleSendMode,
  SmsGatewaySettings,
  SmsProviderCredential,
  SmsProviderId,
  SmsTriggerEventKey,
  SmsTriggerRule,
} from '../../../core/types';
import { apiJson } from '../../../core/apiClient';
import {
  DEFAULT_SMS_GATEWAY_SETTINGS,
  INITIAL_SMS_TRIGGER_RULES,
} from '../../../data/skill98Data';

type NoticeFn = (type: 'success' | 'error', text: string) => void;

interface ProviderFieldConfig {
  id: SmsProviderId;
  titleFa: string;
  subtitle: string;
  isMessenger?: boolean;
  apiNote: string;
  fields: {
    username?: { label: string; placeholder: string; required?: boolean };
    apiKey?: { label: string; placeholder: string; required?: boolean; hint?: string };
    domain?: { label: string; placeholder: string; required?: boolean; hint?: string };
    senderLine?: { label: string; placeholder: string; required?: boolean; hint?: string };
    otpPatternCode?: { label: string; placeholder: string; hint?: string };
    patternVarName?: { label: string; placeholder: string; hint?: string };
    apiMethod?: boolean;
    baleFields?: boolean;
    eitaaFields?: boolean;
  };
}

const ALL_MESSAGING_PROVIDERS: ProviderFieldConfig[] = [
  {
    id: 'melipayamak',
    titleFa: 'ملی‌پیامک (MeliPayamak)',
    subtitle: 'پترن SOAP / REST سریع',
    apiNote: 'احراز هویت با نام کاربری و کلید API (برای رفع خطای 110 به جای رمز پنل، API Key وارد کنید).',
    fields: {
      username: { label: 'نام کاربری پنل ملی‌پیامک *', placeholder: '0912... / username', required: true },
      apiKey: { label: 'کلید API یا رمز عبور وب‌سرویس *', placeholder: 'API Key (پیشنهادی)', required: true },
      senderLine: { label: 'شماره خط ارسال (ارسال متنی)', placeholder: '50004000...' },
      otpPatternCode: { label: 'کد متن پترن OTP (bodyId عددی)', placeholder: '137991' },
      apiMethod: true,
    },
  },
  {
    id: 'kavenegar',
    titleFa: 'کاوه‌نگار (Kavenegar)',
    subtitle: 'وب‌سرویس Lookup و OTP',
    apiNote: 'کاوه‌نگار نام کاربری ندارد و فقط با API Key کار می‌کند. در متد Lookup نام متنی الگو (template) استفاده می‌شود.',
    fields: {
      apiKey: { label: 'کلید API کاوه‌نگار (API-KEY) *', placeholder: '7A4F... از بخش تنظیمات حساب کاوه‌نگار', required: true },
      senderLine: { label: 'شماره خط اختصاصی (برای ارسال ساده)', placeholder: '2000500666 (در Lookup اختیاری است)' },
      otpPatternCode: { label: 'نام الگوی اعتبارسنجی (template)', placeholder: 'verify یا skill98-otp', hint: 'در کاوه‌نگار نام متنی الگو بدون فاصله است' },
    },
  },
  {
    id: 'farazsms',
    titleFa: 'فراز اس‌ام‌اس (FarazSMS / IPPanel)',
    subtitle: 'IPPanel API v1 + پترن',
    apiNote: 'نسخه جدید IPPanel (api2.ippanel.com) با کلید دسترسی API Key، شماره خط و نام متغیر داخل پترن کار می‌کند.',
    fields: {
      apiKey: { label: 'کلید دسترسی (API Key / Access Key) *', placeholder: 'از بخش توسعه‌دهندگان پنل فراز', required: true },
      senderLine: { label: 'شماره خط ارسال (from_number) *', placeholder: '+983000505', required: true },
      otpPatternCode: { label: 'کد پترن (pattern_code)', placeholder: 't2345abcde' },
      patternVarName: { label: 'نام متغیر داخل پترن', placeholder: 'code', hint: 'مثلاً code یا verification-code' },
    },
  },
  {
    id: 'smsir',
    titleFa: 'اس‌ام‌اس دات آی‌آر (SMS.ir)',
    subtitle: 'Verify API v1 با TemplateId',
    apiNote: 'SMS.ir فقط با x-api-key احراز هویت می‌شود (نیاز به نام کاربری ندارد). برای Verify شناسه عددی قالب و نام پارامتر کافی است.',
    fields: {
      apiKey: { label: 'کلید API (x-api-key) *', placeholder: 'کلید دریافتی از پنل توسعه‌دهندگان SMS.ir', required: true },
      senderLine: { label: 'شماره خط ارسال (lineNumber - ارسال متنی)', placeholder: '30007732...' },
      otpPatternCode: { label: 'شناسه قالب تاییدشده (TemplateId عددی)', placeholder: '100000' },
      patternVarName: { label: 'نام پارامتر قالب Verify', placeholder: 'CODE', hint: 'دقیقاً مطابق نام متغیر تعریف‌شده در قالب SMS.ir' },
    },
  },
  {
    id: 'ghasedak',
    titleFa: 'قاصدک (Ghasedak)',
    subtitle: 'وب‌سرویس v2 و OTP سریع',
    apiNote: 'قاصدک فقط با کلید API (apikey) کار می‌کند و نیاز به نام کاربری ندارد.',
    fields: {
      apiKey: { label: 'کلید API قاصدک (apikey) *', placeholder: 'کلید وب‌سرویس قاصدک', required: true },
      senderLine: { label: 'شماره خط ارسال (linenumber)', placeholder: '30005088' },
      otpPatternCode: { label: 'نام قالب اعتبارسنجی (template)', placeholder: 'myOtpTemplate' },
    },
  },
  {
    id: 'magfa',
    titleFa: 'مگفا (Magfa)',
    subtitle: 'سرشماره ۳۰۰۰ و وب‌سرویس بانکی',
    apiNote: 'وب‌سرویس HTTP v2 مگفا با Basic Auth به صورت username/domain:password کار می‌کند؛ وارد کردن نام دامنه (Domain) الزامی است.',
    fields: {
      username: { label: 'نام کاربری وب‌سرویس مگفا *', placeholder: 'magfa_user', required: true },
      apiKey: { label: 'رمز عبور وب‌سرویس مگفا *', placeholder: '••••••••', required: true },
      domain: { label: 'نام دامنه مگفا (Domain) *', placeholder: 'company_domain', required: true, hint: 'دامنه اختصاصی تعریف‌شده در پنل مگفا' },
      senderLine: { label: 'سرشماره ۳۰۰۰ اختصاصی *', placeholder: '3000...', required: true },
    },
  },
  {
    id: 'parsgreen',
    titleFa: 'پارس‌گرین (ParsGreen)',
    subtitle: 'APIv2 و خطوط خدماتی',
    apiNote: 'پارس‌گرین APIv2 با امضای دیجیتال (Signature / API Key) در هدر Authorization کار می‌کند و نام کاربری نیاز ندارد.',
    fields: {
      apiKey: { label: 'امضای دیجیتال / کلید API (Signature) *', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      senderLine: { label: 'شماره خط ارسال (SmsNumber)', placeholder: '1000...' },
      otpPatternCode: { label: 'کد قالب OTP (TemplateId عددی)', placeholder: '1' },
    },
  },
  {
    id: 'farapayamak',
    titleFa: 'فراپیامک (FaraPayamak)',
    subtitle: 'سازگار با هسته پترن ملی‌پیامک',
    apiNote: 'از متدهای استاندارد SendByBaseNumber2 / SOAP / REST با نام کاربری، کلید API و bodyId پشتیبانی می‌کند.',
    fields: {
      username: { label: 'نام کاربری پنل فراپیامک *', placeholder: 'username', required: true },
      apiKey: { label: 'کلید API یا رمز عبور وب‌سرویس *', placeholder: 'API Key / Password', required: true },
      senderLine: { label: 'شماره خط ارسال', placeholder: '5000...' },
      otpPatternCode: { label: 'کد متن پترن OTP (bodyId)', placeholder: '12345' },
      apiMethod: true,
    },
  },
  {
    id: 'iranpayamak',
    titleFa: 'ایران‌پیامک (IranPayamak)',
    subtitle: 'خط خدماتی و ارسال پترن REST',
    apiNote: 'ارسال با کلید Api-Key، شماره خط ارسال و کد پترن خدماتی.',
    fields: {
      apiKey: { label: 'کلید وب‌سرویس (Api-Key) *', placeholder: 'Api-Key از پنل ایران‌پیامک', required: true },
      senderLine: { label: 'شماره خط ارسال (line_number) *', placeholder: '5000... / 9000...', required: true },
      otpPatternCode: { label: 'کد پترن / قالب خدماتی', placeholder: 'pattern_id' },
      patternVarName: { label: 'نام متغیر پترن', placeholder: 'code' },
    },
  },
  {
    id: 'tasnimsms',
    titleFa: 'تسنیم اس‌ام‌اس (TasnimSMS)',
    subtitle: 'ارسال سریع احراز هویت',
    apiNote: 'احراز هویت با نام کاربری، کلید وب‌سرویس، خط ارسال و کد پترن.',
    fields: {
      username: { label: 'نام کاربری پنل تسنیم *', placeholder: 'username', required: true },
      apiKey: { label: 'رمز عبور یا کلید وب‌سرویس *', placeholder: '••••••••', required: true },
      senderLine: { label: 'شماره خط ارسال *', placeholder: '3000... / 5000...', required: true },
      otpPatternCode: { label: 'کد پترن OTP', placeholder: 'pattern_code' },
      patternVarName: { label: 'نام متغیر پترن', placeholder: 'code' },
    },
  },
  {
    id: 'savatpayamak',
    titleFa: 'سوات پیامک (SavatPayamak)',
    subtitle: 'ارسال وب‌سرویس سازمانی',
    apiNote: 'ارسال با نام کاربری، کلید API، شماره خط و کد پترن.',
    fields: {
      username: { label: 'نام کاربری پنل *', placeholder: 'username', required: true },
      apiKey: { label: 'رمز عبور / کلید API *', placeholder: '••••••••', required: true },
      senderLine: { label: 'شماره خط ارسال *', placeholder: '3000... / 5000...', required: true },
      otpPatternCode: { label: 'کد پترن / الگو', placeholder: 'pattern_code' },
    },
  },
  {
    id: 'payamaksara',
    titleFa: 'پیامک‌سرا (PayamakSara)',
    subtitle: 'پترن و ارسال تراکنشی',
    apiNote: 'ارسال با نام کاربری، کلید API، شماره خط و کد الگو.',
    fields: {
      username: { label: 'نام کاربری پنل *', placeholder: 'username', required: true },
      apiKey: { label: 'رمز عبور / کلید API *', placeholder: '••••••••', required: true },
      senderLine: { label: 'شماره خط ارسال *', placeholder: '5000...', required: true },
      otpPatternCode: { label: 'کد الگو / پترن', placeholder: 'bodyId' },
    },
  },
  {
    id: 'bale',
    titleFa: 'پیام‌رسان بله (Bale)',
    subtitle: 'سفیر OTP بله + ربات بله (Bot API)',
    isMessenger: true,
    apiNote:
      'پشتیبانی هم‌زمان از وب‌سرویس رسمی «سفیر بله» (ارسال کد OTP مستقیم به شماره موبایل کاربر در بله) و «ربات بله» (ارسال متن سفارش و اعلان‌ها به chat_id).',
    fields: {
      baleFields: true,
    },
  },
  {
    id: 'eitaa',
    titleFa: 'پیام‌رسان ایتا (ایتایار)',
    subtitle: 'ارسال پیام به کانال و گروه ایتا (eitaayar.ir)',
    isMessenger: true,
    apiNote:
      'ارسال از طریق وب‌سرویس رسمی ایتایار (eitaayar.ir/api/<token>/sendMessage) با فرمت استاندارد Form-URLEncoded. توکن ایتایار (شروع‌شونده با bot...) و شناسه عددی کانال/گروه را وارد کنید.',
    fields: {
      eitaaFields: true,
    },
  },
];

const EVENT_KEY_OPTIONS: {
  value: SmsTriggerEventKey;
  label: string;
  shortLabel: string;
  section: string;
}[] = [
  {
    value: 'user_registered',
    label: 'ورود و ثبت‌نام / کد OTP (user_registered)',
    shortLabel: 'ورود و ارسال کد تایید (OTP)',
    section: 'بخش: ورود و ثبت‌نام',
  },
  {
    value: 'order_created',
    label: 'ثبت سفارش جدید (order_created)',
    shortLabel: 'ثبت سفارش جدید',
    section: 'بخش: ثبت سفارش محصول',
  },
  {
    value: 'payment_success',
    label: 'پرداخت موفق (payment_success)',
    shortLabel: 'پرداخت موفق و فعال‌سازی فایل',
    section: 'بخش: پرداخت موفق',
  },
  {
    value: 'free_skill_claimed',
    label: 'دریافت اسکیل رایگان (free_skill_claimed)',
    shortLabel: 'دریافت اسکیل رایگان',
    section: 'بخش: دریافت اسکیل رایگان',
  },
  {
    value: 'order_status_changed',
    label: 'تغییر وضعیت سفارش (order_status_changed)',
    shortLabel: 'تغییر وضعیت سفارش',
    section: 'بخش: به‌روزرسانی وضعیت',
  },
];

function getProviderTitle(pid: SmsProviderId | 'default' | undefined, primaryId: SmsProviderId, primaryEnabled: boolean): string {
  if (!pid || pid === 'default') {
    const primaryMeta = ALL_MESSAGING_PROVIDERS.find((p) => p.id === primaryId);
    return primaryEnabled
      ? `پیش‌فرض اصلی (${primaryMeta?.titleFa || primaryId})`
      : 'پیش‌فرض (درگاه اصلی خاموش است!)';
  }
  return ALL_MESSAGING_PROVIDERS.find((p) => p.id === pid)?.titleFa || pid;
}

interface SmsTriggersPanelProps {
  onNotice: NoticeFn;
}

export const SmsTriggersPanel: React.FC<SmsTriggersPanelProps> = ({
  onNotice,
}) => {
  const [settings, setSettings] = useState<SmsGatewaySettings>(
    DEFAULT_SMS_GATEWAY_SETTINGS
  );
  const [triggers, setTriggers] = useState<SmsTriggerRule[]>(
    INITIAL_SMS_TRIGGER_RULES
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<SmsProviderId | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingRule, setEditingRule] = useState<SmsTriggerRule | null>(null);

  // Per-provider inline test state (inside each gateway settings card)
  const [inlineTestPhone, setInlineTestPhone] = useState('');
  const [inlineTestMode, setInlineTestMode] = useState<'text' | 'pattern'>('text');
  const [inlineTestPattern, setInlineTestPattern] = useState('');
  const [inlineTestCode, setInlineTestCode] = useState('54321');
  const [inlineTestBaleChatId, setInlineTestBaleChatId] = useState('');
  const [inlineTestEitaaChatId, setInlineTestEitaaChatId] = useState('');
  const [inlineTestBaleChannel, setInlineTestBaleChannel] = useState<'bot_api' | 'safir_otp'>('bot_api');
  const [inlineTestMessage, setInlineTestMessage] = useState(
    'سلام، این یک پیام آزمایشی از سامانه پیامک آموزشگاه رباتیک فاتحان است.'
  );
  const [isSendingInlineTest, setIsSendingInlineTest] = useState(false);
  const [inlineTestResult, setInlineTestResult] = useState<{
    provider: SmsProviderId;
    ok: boolean;
    sandbox?: boolean;
    text: string;
  } | null>(null);

  // Trigger test phone (for quick rule testing)
  const [ruleTestPhone, setRuleTestPhone] = useState('');

  const getProviderCred = useCallback(
    (pid: SmsProviderId, src: SmsGatewaySettings = settings): SmsProviderCredential => {
      const existing = src.providersMap?.[pid];
      const isPrimary = src.provider === pid;
      if (existing) {
        return {
          ...existing,
          provider: pid,
          domain: existing.domain ?? '',
          patternVarName: existing.patternVarName ?? '',
          baleMode: existing.baleMode ?? 'auto',
          baleClientId: existing.baleClientId ?? '',
          baleClientSecret: existing.baleClientSecret ?? '',
          baleBotToken: existing.baleBotToken ?? '',
          baleChatId: existing.baleChatId ?? '',
          eitaaToken: existing.eitaaToken ?? '',
          eitaaChatId: existing.eitaaChatId ?? '',
        };
      }
      return {
        provider: pid,
        enabled: isPrimary ? src.enabled !== false : false,
        username: isPrimary ? src.username : '',
        apiKey: isPrimary ? src.apiKey : '',
        senderLine: isPrimary ? src.senderLine : '',
        otpPatternCode: isPrimary ? src.otpPatternCode : '',
        apiMethod: isPrimary ? src.apiMethod : 'sendbybasenumber2',
        domain: '',
        patternVarName: pid === 'smsir' ? 'CODE' : 'code',
        baleMode: 'auto',
        baleClientId: '',
        baleClientSecret: '',
        baleBotToken: '',
        baleChatId: '',
        eitaaToken: '',
        eitaaChatId: '',
        sandboxMode: isPrimary ? src.sandboxMode : true,
      };
    },
    [settings]
  );

  const loadSmsConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const { ok, data } = await apiJson<{
        settings?: SmsGatewaySettings;
        triggers?: SmsTriggerRule[];
      }>('/api/admin/sms/config');
      if (ok) {
        if (data.settings) {
          setSettings({
            ...DEFAULT_SMS_GATEWAY_SETTINGS,
            ...data.settings,
            enabled: data.settings.enabled !== false,
            eventRouting: data.settings.eventRouting || {},
          });
        }
        if (Array.isArray(data.triggers)) setTriggers(data.triggers);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSmsConfig();
  }, [loadSmsConfig]);

  const persistSmsState = async (
    nextSettings: SmsGatewaySettings,
    nextTriggers: SmsTriggerRule[],
    successMsg: string
  ) => {
    setIsSaving(true);
    try {
      const normalized = nextTriggers.map((t, idx) => ({
        ...t,
        priorityOrder: idx + 1,
      }));
      const { ok } = await apiJson('/api/admin/sms/config', {
        method: 'POST',
        body: JSON.stringify({ settings: nextSettings, triggers: normalized }),
      });
      if (!ok) throw new Error();
      setSettings(nextSettings);
      setTriggers(normalized);
      onNotice('success', successMsg);
    } catch {
      onNotice('error', 'خطا در ذخیره تنظیمات درگاه پیامک در دیتابیس.');
    } finally {
      setIsSaving(false);
    }
  };

  const buildNextSettingsWithCred = (
    pid: SmsProviderId,
    patch: Partial<SmsProviderCredential>,
    options?: { makePrimary?: boolean; disablePrimaryIfMatch?: boolean }
  ): SmsGatewaySettings => {
    const current = getProviderCred(pid);
    const updated: SmsProviderCredential = { ...current, ...patch, provider: pid };
    const nextMap: Partial<Record<SmsProviderId, SmsProviderCredential>> = {
      ...(settings.providersMap || {}),
      [pid]: updated,
    };

    const willBePrimary = Boolean(options?.makePrimary);
    const isCurrentlyPrimary = settings.provider === pid;
    let nextEnabled = settings.enabled !== false;

    if (willBePrimary) {
      nextEnabled = true;
    } else if (options?.disablePrimaryIfMatch && isCurrentlyPrimary && !updated.enabled) {
      nextEnabled = false;
    }

    const syncTopLevel = willBePrimary || isCurrentlyPrimary;
    return {
      ...settings,
      enabled: nextEnabled,
      provider: willBePrimary ? pid : settings.provider,
      username: syncTopLevel ? updated.username : settings.username,
      apiKey: syncTopLevel ? updated.apiKey : settings.apiKey,
      senderLine: syncTopLevel ? updated.senderLine : settings.senderLine,
      otpPatternCode: syncTopLevel ? updated.otpPatternCode : settings.otpPatternCode,
      apiMethod: syncTopLevel ? updated.apiMethod : settings.apiMethod,
      sandboxMode: syncTopLevel ? updated.sandboxMode : settings.sandboxMode,
      providersMap: nextMap,
    };
  };

  const updateProviderCred = (
    pid: SmsProviderId,
    patch: Partial<SmsProviderCredential>
  ) => {
    const next = buildNextSettingsWithCred(pid, patch);
    setSettings(next);
  };

  const handleToggleProviderEnabled = (pid: SmsProviderId) => {
    const provMeta = ALL_MESSAGING_PROVIDERS.find((p) => p.id === pid);
    const cred = getProviderCred(pid);
    const isCurrentlyPrimaryActive = settings.enabled !== false && settings.provider === pid;
    const isCurrentlyEnabled = cred.enabled;

    if (isCurrentlyEnabled) {
      // Turn OFF cleanly (including if it was the active primary!)
      const next = buildNextSettingsWithCred(
        pid,
        { enabled: false },
        { disablePrimaryIfMatch: true }
      );
      void persistSmsState(
        next,
        triggers,
        isCurrentlyPrimaryActive
          ? `درگاه اصلی «${provMeta?.titleFa}» غیرفعال (خاموش) شد.`
          : `درگاه «${provMeta?.titleFa}» غیرفعال شد.`
      );
    } else {
      // Turn ON — if no primary is currently enabled, automatically make this the primary gateway
      const noPrimaryActive =
        settings.enabled === false || !getProviderCred(settings.provider).enabled;
      const next = buildNextSettingsWithCred(
        pid,
        { enabled: true },
        { makePrimary: noPrimaryActive }
      );
      void persistSmsState(
        next,
        triggers,
        noPrimaryActive
          ? `درگاه «${provMeta?.titleFa}» فعال و به عنوان درگاه پیش‌فرض (اصلی) انتخاب شد.`
          : `درگاه «${provMeta?.titleFa}» فعال شد و اکنون می‌توانید آن را برای هر فرآیند انتخاب کنید.`
      );
    }
  };

  const handleSetPrimaryGateway = (pid: SmsProviderId) => {
    const provMeta = ALL_MESSAGING_PROVIDERS.find((p) => p.id === pid);
    const next = buildNextSettingsWithCred(pid, { enabled: true }, { makePrimary: true });
    void persistSmsState(
      next,
      triggers,
      `«${provMeta?.titleFa}» به عنوان تنها درگاه پیش‌فرض (اصلی) سایت فعال شد.`
    );
  };

  const handleDisablePrimaryGateway = () => {
    const primaryMeta = ALL_MESSAGING_PROVIDERS.find((p) => p.id === settings.provider);
    const next = buildNextSettingsWithCred(
      settings.provider,
      { enabled: false },
      { disablePrimaryIfMatch: true }
    );
    void persistSmsState(
      next,
      triggers,
      `درگاه پیش‌فرض «${primaryMeta?.titleFa || settings.provider}» غیرفعال شد.`
    );
  };

  const handleActivateBaleForAllProcesses = () => {
    const nextSettings = buildNextSettingsWithCred(
      'bale',
      { enabled: true },
      { makePrimary: true }
    );
    // Reset all per-event & per-rule overrides to 'default' so Bale is strictly the single active gateway for ALL processes
    nextSettings.eventRouting = {};
    const nextTriggers = triggers.map((t) => ({
      ...t,
      providerOverride: 'default' as const,
    }));
    setSelectedProviderId('bale');
    void persistSmsState(
      nextSettings,
      nextTriggers,
      'پیام‌رسان بله (Bale) به عنوان درگاه فعال برای تمامی فرآیندها تنظیم شد.'
    );
  };

  const handleResetAllProcessesToDefault = () => {
    const nextSettings: SmsGatewaySettings = {
      ...settings,
      eventRouting: {},
    };
    const nextTriggers = triggers.map((t) => ({
      ...t,
      providerOverride: 'default' as const,
    }));
    void persistSmsState(
      nextSettings,
      nextTriggers,
      'تمامی فرآیندها روی درگاه پیش‌فرض (اصلی سایت) تنظیم شدند.'
    );
  };

  const handleChangeEventGateway = (
    eventKey: SmsTriggerEventKey,
    target: SmsProviderId | 'default'
  ) => {
    let nextSettings: SmsGatewaySettings = {
      ...settings,
      eventRouting: {
        ...(settings.eventRouting || {}),
        [eventKey]: target,
      },
    };
    // If an explicit alternative gateway is chosen for a process, ensure it is enabled
    if (target !== 'default' && !getProviderCred(target).enabled) {
      const cred = getProviderCred(target);
      nextSettings = {
        ...nextSettings,
        providersMap: {
          ...(nextSettings.providersMap || {}),
          [target]: { ...cred, enabled: true },
        },
      };
    }
    // Keep any trigger rules of this event synchronized unless customized
    const nextTriggers = triggers.map((t) =>
      t.eventKey === eventKey ? { ...t, providerOverride: target } : t
    );
    const evLabel = EVENT_KEY_OPTIONS.find((e) => e.value === eventKey)?.shortLabel || eventKey;
    const gwLabel =
      target === 'default'
        ? 'درگاه پیش‌فرض (اصلی)'
        : ALL_MESSAGING_PROVIDERS.find((p) => p.id === target)?.titleFa || target;
    void persistSmsState(
      nextSettings,
      nextTriggers,
      `درگاه فرآیند «${evLabel}» به «${gwLabel}» تغییر یافت (فقط همین یک درگاه برای این فرآیند فعال است).`
    );
  };

  const handleInlineProviderTest = async (pid: SmsProviderId) => {
    const cred = getProviderCred(pid);
    const provMeta = ALL_MESSAGING_PROVIDERS.find((p) => p.id === pid);
    const phone = inlineTestPhone.trim();
    const baleChat = (inlineTestBaleChatId || cred.baleChatId || '').trim();
    const eitaaChat = (inlineTestEitaaChatId || cred.eitaaChatId || '').trim();

    if (pid !== 'bale' && pid !== 'eitaa' && !phone) {
      onNotice('error', 'لطفاً شماره موبایل گیرنده تست را وارد کنید (مثلاً 09123456789).');
      return;
    }
    if (pid === 'bale' && inlineTestBaleChannel === 'safir_otp' && !phone) {
      onNotice(
        'error',
        'برای تست وب‌سرویس سفیر بله (OTP)، وارد کردن شماره موبایل معتبر گیرنده الزامی است.'
      );
      return;
    }
    if (pid === 'bale' && inlineTestBaleChannel === 'bot_api' && !baleChat) {
      onNotice(
        'error',
        'برای تست ربات بله (Bot API)، وارد کردن شناسه چت مقصد (chat_id) الزامی است.'
      );
      return;
    }
    if (pid === 'eitaa' && !eitaaChat) {
      onNotice(
        'error',
        'برای تست پیام‌رسان ایتا (ایتایار)، وارد کردن شناسه کانال یا گروه مقصد (chat_id) الزامی است.'
      );
      return;
    }

    setIsSendingInlineTest(true);
    setInlineTestResult(null);
    try {
      const chosenPattern =
        pid !== 'bale' && pid !== 'eitaa' && inlineTestMode === 'pattern'
          ? (inlineTestPattern.trim() || cred.otpPatternCode.trim() || undefined)
          : undefined;

      const { ok, data } = await apiJson<{
        ok?: boolean;
        error?: string;
        sandbox?: boolean;
        provider?: string;
        messagePreview?: string;
      }>('/api/admin/sms/test', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          providerOverride: pid,
          credentialsOverride: cred,
          baleChatId:
            pid === 'bale' ? baleChat : pid === 'eitaa' ? eitaaChat : undefined,
          baleTestChannel: pid === 'bale' ? inlineTestBaleChannel : undefined,
          customMessage: inlineTestMessage,
          patternCode: chosenPattern,
          testCode: inlineTestCode.trim() || '54321',
        }),
      });

      if (!ok || data.ok === false) {
        const errText = data.error || 'خطا در ارسال تست از این درگاه';
        setInlineTestResult({ provider: pid, ok: false, text: errText });
        onNotice('error', errText);
        return;
      }

      const modeLabel = data.sandbox
        ? 'شبیه‌سازی سندباکس (ارسال واقعی انجام نشد)'
        : 'ارسال واقعی موفق';
      const successText = `تست «${provMeta?.titleFa}» انجام شد (${modeLabel}).`;
      setInlineTestResult({
        provider: pid,
        ok: true,
        sandbox: data.sandbox,
        text: successText,
      });
      onNotice('success', successText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در اتصال به سرور جهت تست درگاه';
      setInlineTestResult({ provider: pid, ok: false, text: msg });
      onNotice('error', msg);
    } finally {
      setIsSendingInlineTest(false);
    }
  };

  const handleMoveRule = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= triggers.length) return;
    const copy = [...triggers];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    void persistSmsState(
      settings,
      copy,
      'اولویت ارسال شرط‌های پیامک به‌روزرسانی شد.'
    );
  };

  const handleDropOnRule = (dropIdx: number) => {
    if (dragIndex === null || dragIndex === dropIdx) {
      setDragIndex(null);
      return;
    }
    const copy = [...triggers];
    const [dragged] = copy.splice(dragIndex, 1);
    copy.splice(dropIdx, 0, dragged);
    setDragIndex(null);
    void persistSmsState(settings, copy, 'ترتیب اولویت شرط‌ها ذخیره شد.');
  };

  const handleTestSpecificRule = async (rule: SmsTriggerRule) => {
    const targetPhone = (ruleTestPhone || inlineTestPhone).trim();
    const resolvedTarget =
      rule.providerOverride && rule.providerOverride !== 'default'
        ? rule.providerOverride
        : settings.eventRouting?.[rule.eventKey] && settings.eventRouting[rule.eventKey] !== 'default'
        ? (settings.eventRouting[rule.eventKey] as SmsProviderId)
        : settings.provider;

    if (resolvedTarget !== 'bale' && resolvedTarget !== 'eitaa' && !targetPhone) {
      onNotice(
        'error',
        'لطفاً ابتدا شماره موبایل گیرنده تست را در کادر بالای لیست شرط‌ها وارد کنید.'
      );
      return;
    }
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        messagePreview?: string;
        provider?: string;
        sandbox?: boolean;
      }>('/api/admin/sms/test', {
        method: 'POST',
        body: JSON.stringify({
          phone: targetPhone,
          eventKey: rule.eventKey,
          providerOverride: resolvedTarget,
          customMessage:
            rule.sendMode === 'custom_text' ? rule.messageTemplate : undefined,
          patternCode:
            rule.sendMode === 'pattern_code' ? rule.patternCode : undefined,
        }),
      });
      if (!ok) throw new Error(data.error);
      onNotice(
        'success',
        `تست شرط «${rule.title}» از طریق «${
          ALL_MESSAGING_PROVIDERS.find((p) => p.id === (data.provider || resolvedTarget))?.titleFa ||
          resolvedTarget
        }» انجام شد (${data.sandbox ? 'سندباکس' : 'ارسال واقعی'}).`
      );
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در تست شرط'
      );
    }
  };

  const isPrimaryActive =
    settings.enabled !== false && getProviderCred(settings.provider).enabled;
  const primaryMeta = ALL_MESSAGING_PROVIDERS.find((p) => p.id === settings.provider);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>وب‌سرویس پیامک ایرانی (۱۲ سامانه) + پیام‌رسان بله و ایتا (ایتایار)</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            مدیریت درگاه‌های پیامکی، پیام‌رسان‌های بله و ایتا و مسیریابی فرآیندها
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            قانون سیستم: برای هر فرآیند دقیقاً فقط یک درگاه (درگاه پیش‌فرض اصلی یا یک درگاه اختصاصی از جمله پیام‌رسان بله یا ایتا) می‌تواند فعال باشد.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setEditingRule({
              id: `trg_${Date.now()}`,
              title: 'شرط جدید اطلاع‌رسانی',
              eventKey: 'order_created',
              sectionLabel: 'بخش: اطلاع‌رسانی دلخواه',
              sendMode: 'custom_text',
              patternCode: '',
              messageTemplate: '{name} عزیز، درخواست شما در آموزشگاه رباتیک فاتحان ثبت شد.',
              providerOverride: 'default',
              enabled: true,
              priorityOrder: triggers.length + 1,
            })
          }
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن شرط پیامک جدید</span>
        </button>
      </div>

      {/* Section 1: 12 SMS Providers + Bale & Eitaa Messengers Selectable Grid */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              درگاه‌های پیامکی (۱۲ سامانه) و پیام‌رسان‌های بله و ایتا
            </h3>
            <p className="text-[11px] text-stone-500 mt-1 flex flex-wrap items-center gap-1.5">
              <span>درگاه پیش‌فرض (اصلی) فعلی:</span>
              {isPrimaryActive ? (
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {primaryMeta?.titleFa || settings.provider}
                </strong>
              ) : (
                <strong className="text-rose-600 dark:text-rose-400">
                  هیچ درگاه پیش‌فرضی فعال نیست (خاموش)
                </strong>
              )}
              <span>· روی هر کارت کلیک کنید تا فرم تنظیمات اختصاصی و تست مستقیم آن باز شود.</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isPrimaryActive && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleDisablePrimaryGateway}
                className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-[11px] font-extrabold flex items-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 cursor-pointer disabled:opacity-50"
              >
                <Power className="w-3.5 h-3.5" />
                <span>غیرفعال کردن درگاه پیش‌فرض</span>
              </button>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleActivateBaleForAllProcesses}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>فعال‌سازی بله برای همه فرآیندها</span>
            </button>
            {isLoading && (
              <span className="text-xs text-stone-400">در حال بارگذاری...</span>
            )}
          </div>
        </div>

        {/* 13 Gateways Grid (12 SMS + Bale) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {ALL_MESSAGING_PROVIDERS.map((prov) => {
            const cred = getProviderCred(prov.id);
            const isPrimary = isPrimaryActive && settings.provider === prov.id;
            const isSelected = selectedProviderId === prov.id;
            return (
              <div
                key={prov.id}
                onClick={() => {
                  const nextSel = isSelected ? null : prov.id;
                  setSelectedProviderId(nextSel);
                  setInlineTestResult(null);
                  if (nextSel) {
                    const nextCred = getProviderCred(nextSel);
                    setInlineTestPattern(nextCred.otpPatternCode || '');
                    setInlineTestBaleChatId(nextCred.baleChatId || '');
                    setInlineTestEitaaChatId(nextCred.eitaaChatId || '');
                  }
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'border-[#1D4ED8] bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-[#1D4ED8]/25'
                    : isPrimary
                    ? prov.isMessenger
                      ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/25'
                      : 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : cred.enabled
                    ? 'border-emerald-500/40 bg-emerald-50/10 dark:bg-emerald-950/10'
                    : prov.isMessenger
                    ? 'border-teal-300/70 dark:border-teal-800/70 bg-teal-50/20 dark:bg-teal-950/10 hover:border-teal-400'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white truncate flex items-center gap-1.5">
                      <span>{prov.titleFa}</span>
                    </div>
                    <div className="text-[10px] text-stone-500 truncate mt-0.5">
                      {prov.subtitle}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0 ${
                      isPrimary
                        ? prov.isMessenger
                          ? 'bg-teal-600 text-white'
                          : 'bg-emerald-600 text-white'
                        : cred.enabled
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {isPrimary ? 'اصلی (فعال)' : cred.enabled ? 'فعال' : 'خاموش'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-stone-200/60 dark:border-stone-800/70">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleProviderEnabled(prov.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 ${
                      cred.enabled
                        ? 'bg-rose-500/12 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20'
                        : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{cred.enabled ? 'غیرفعال کردن' : 'فعال‌سازی'}</span>
                  </button>

                  {!isPrimary && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimaryGateway(prov.id);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-800 cursor-pointer disabled:opacity-50"
                    >
                      انتخاب اصلی
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Single Configuration & Direct Test Card for Selected Provider */}
        {selectedProviderId ? (
          (() => {
            const provMeta = ALL_MESSAGING_PROVIDERS.find((p) => p.id === selectedProviderId)!;
            const cred = getProviderCred(selectedProviderId);
            const isPrimary = isPrimaryActive && settings.provider === selectedProviderId;
            const baleMode: BaleSendMode = cred.baleMode || 'auto';
            const f = provMeta.fields;

            return (
              <div className="p-5 rounded-2xl border-2 border-[#1D4ED8]/35 bg-stone-50/70 dark:bg-stone-950/60 space-y-5">
                {/* Settings Card Header with Explicit Enable/Disable & Set-Primary Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                        تنظیمات اختصاصی: {provMeta.titleFa}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                          isPrimary
                            ? 'bg-emerald-600 text-white'
                            : cred.enabled
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {isPrimary
                          ? 'درگاه پیش‌فرض فعال سایت'
                          : cred.enabled
                          ? 'فعال (آماده برای فرآیندهای اختصاصی)'
                          : 'غیرفعال (خاموش)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">{provMeta.apiNote}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleToggleProviderEnabled(selectedProviderId)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        cred.enabled
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{cred.enabled ? 'غیرفعال کردن این درگاه' : 'فعال‌سازی این درگاه'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving || isPrimary}
                      onClick={() => handleSetPrimaryGateway(selectedProviderId)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-60 ${
                        isPrimary
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 cursor-default'
                          : 'bg-stone-900 dark:bg-white text-white dark:text-stone-950 hover:opacity-90'
                      }`}
                    >
                      {isPrimary ? '✓ درگاه پیش‌فرض (اصلی)' : 'انتخاب به عنوان درگاه پیش‌فرض (اصلی)'}
                    </button>

                    {selectedProviderId === 'bale' && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleActivateBaleForAllProcesses}
                        className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>اعمال برای همه فرآیندها</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Audited Provider-Specific Fields */}
                {f.baleFields ? (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          حالت ارسال پیام در پیام‌رسان بله
                        </label>
                        <select
                          value={baleMode}
                          onChange={(e) =>
                            updateProviderCred('bale', {
                              baleMode: e.target.value as BaleSendMode,
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                        >
                          <option value="auto">
                            حالت هوشمند (کد OTP با وب‌سرویس سفیر بله + پیام‌های متنی با ربات بله) — پیشنهادی
                          </option>
                          <option value="safir_otp">
                            فقط وب‌سرویس رسمی سفیر بله (ارسال OTP مستقیم به شماره موبایل کاربر در بله)
                          </option>
                          <option value="bot_api">
                            فقط ربات پیام‌رسان بله (ارسال متن کامل از طریق Bot API به chat_id)
                          </option>
                        </select>
                      </div>
                    </div>

                    {(baleMode === 'auto' || baleMode === 'safir_otp') && (
                      <div className="p-4 rounded-xl border border-teal-500/35 bg-teal-50/40 dark:bg-teal-950/25 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="text-xs font-extrabold text-teal-800 dark:text-teal-300">
                              وب‌سرویس سفیر بله (Safir API — ارسال OTP مستقیم به شماره موبایل)
                            </div>
                            <p className="text-[10.5px] text-stone-600 dark:text-stone-400 leading-relaxed">
                              نسخه API سفیر را انتخاب کنید (همه تنظیمات بله در تب اختصاصی «تنظیمات یکپارچه بله» نیز در دسترس است).
                            </p>
                          </div>
                          <div className="inline-flex rounded-xl border border-stone-300 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-900">
                            {(['v3', 'v2'] as BaleSafirApiVersion[]).map((ver) => {
                              const currentVer: BaleSafirApiVersion =
                                cred.baleSafirVersion === 'v2' ? 'v2' : 'v3';
                              const active = currentVer === ver;
                              return (
                                <button
                                  key={ver}
                                  type="button"
                                  onClick={() =>
                                    updateProviderCred('bale', { baleSafirVersion: ver })
                                  }
                                  className={`px-3 py-1.5 text-[11px] font-extrabold cursor-pointer transition-colors ${
                                    active
                                      ? 'bg-teal-600 text-white'
                                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                                  }`}
                                >
                                  {ver === 'v3' ? 'نسخه ۳ (جدید — api-access-key)' : 'نسخه ۲ (OAuth2)'}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {(cred.baleSafirVersion || 'v3') === 'v3' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                                کلید دسترسی سفیر v3 (<span className="font-mono" dir="ltr">api-access-key</span>)
                              </label>
                              <input
                                type="password"
                                dir="ltr"
                                value={cred.baleSafirApiAccessKey || ''}
                                onChange={(e) =>
                                  updateProviderCred('bale', { baleSafirApiAccessKey: e.target.value })
                                }
                                placeholder="کلید api-access-key از پنل کسب‌وکار بله"
                                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                                شناسه عددی بازو (<span className="font-mono" dir="ltr">bot_id</span>)
                              </label>
                              <input
                                type="text"
                                dir="ltr"
                                value={cred.baleSafirBotId || ''}
                                onChange={(e) =>
                                  updateProviderCred('bale', {
                                    baleSafirBotId: e.target.value.replace(/[^0-9]/g, ''),
                                  })
                                }
                                placeholder="123456789 (یا خودکار از ابتدای توکن بازو)"
                                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            {(/^\d{5,}:/.test(String(cred.baleClientId || '').trim()) ||
                              /^\d{5,}:/.test(String(cred.baleClientSecret || '').trim())) && (
                              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                                ⚠️ هشدار: مقدار واردشده شبیه توکن ربات بله (دارای «:») است! توکن ربات باید در کادر پایینی (Bot API) وارد شود و اینجا فقط Client ID و Client Secret پنل سفیر v2 را قرار دهید.
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                                  شناسه کلاینت سفیر بله v2 (Safir Client ID)
                                </label>
                                <input
                                  type="text"
                                  dir="ltr"
                                  value={cred.baleClientId || ''}
                                  onChange={(e) =>
                                    updateProviderCred('bale', { baleClientId: e.target.value })
                                  }
                                  placeholder="safir_client_id"
                                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                                  کلید محرمانه سفیر بله v2 (Safir Client Secret)
                                </label>
                                <input
                                  type="password"
                                  dir="ltr"
                                  value={cred.baleClientSecret || ''}
                                  onChange={(e) =>
                                    updateProviderCred('bale', { baleClientSecret: e.target.value })
                                  }
                                  placeholder="••••••••••••••••"
                                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {(baleMode === 'auto' || baleMode === 'bot_api') && (
                      <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
                        <div className="space-y-1">
                          <div className="text-xs font-extrabold text-[#1D4ED8] dark:text-sky-300">
                            توکن ربات بله (Bot API — ارسال به chat_id)
                          </div>
                          <p className="text-[10.5px] text-stone-600 dark:text-stone-400 leading-relaxed">
                            این بخش برای ارسال پیام‌های متنی، گزارش سفارش‌ها و هشدارهای ایجنت ۲۴/۷ از طریق{' '}
                            <span className="font-mono font-bold" dir="ltr">tapi.bale.ai</span>{' '}
                            به شناسه چت/گروه (chat_id) است و برای ارسال OTP به شماره موبایل استفاده نمی‌شود.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                              توکن ربات بله (Bot API Token — دریافتی از @BotFather در بله)
                            </label>
                            <input
                              type="password"
                              dir="ltr"
                              value={cred.baleBotToken || ''}
                              onChange={(e) =>
                                updateProviderCred('bale', { baleBotToken: e.target.value })
                              }
                              placeholder="123456789:ABCdefGHIjklMNO..."
                              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                              شناسه چت / کانال / گروه مقصد (chat_id)
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              value={cred.baleChatId || ''}
                              onChange={(e) => {
                                updateProviderCred('bale', { baleChatId: e.target.value });
                                setInlineTestBaleChatId(e.target.value);
                              }}
                              placeholder="123456789 یا @channel_id"
                              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : f.eitaaFields ? (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/15 space-y-3 text-xs">
                    <div className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                      تنظیمات وب‌سرویس ایتایار (eitaayar.ir — ارسال پیام و گزارش به کانال/گروه ایتا)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          توکن اختصاصی ایتایار (Token) *
                        </label>
                        <input
                          type="password"
                          dir="ltr"
                          value={cred.eitaaToken || ''}
                          onChange={(e) =>
                            updateProviderCred('eitaa', { eitaaToken: e.target.value })
                          }
                          placeholder="bot123456:xxxxxxxx-xxxx-xxxx-xxxx"
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                        <p className="text-[10px] text-stone-500 mt-1">
                          از پنل eitaayar.ir بخش «توکن API» کپی کنید (پیشوند bot را حذف نکنید).
                        </p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          شناسه عددی کانال یا گروه در ایتایار (chat_id) *
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={cred.eitaaChatId || ''}
                          onChange={(e) => {
                            updateProviderCred('eitaa', { eitaaChatId: e.target.value });
                            setInlineTestEitaaChatId(e.target.value);
                          }}
                          placeholder="1234567"
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                        <p className="text-[10px] text-stone-500 mt-1">
                          شناسه عددی کانال/گروه ثبت‌شده در داشبورد ایتایار (در لیست کانال‌های متصل‌شده).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {f.username && (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          {f.username.label}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={cred.username}
                          onChange={(e) =>
                            updateProviderCred(selectedProviderId, { username: e.target.value })
                          }
                          placeholder={f.username.placeholder}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                    )}

                    {f.apiKey && (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          {f.apiKey.label}
                        </label>
                        <input
                          type="password"
                          dir="ltr"
                          value={cred.apiKey}
                          onChange={(e) =>
                            updateProviderCred(selectedProviderId, { apiKey: e.target.value })
                          }
                          placeholder={f.apiKey.placeholder}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                    )}

                    {f.domain && (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          {f.domain.label}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={cred.domain || ''}
                          onChange={(e) =>
                            updateProviderCred(selectedProviderId, { domain: e.target.value })
                          }
                          placeholder={f.domain.placeholder}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                        {f.domain.hint && (
                          <p className="text-[10px] text-stone-400 mt-0.5">{f.domain.hint}</p>
                        )}
                      </div>
                    )}

                    {f.senderLine && (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          {f.senderLine.label}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={cred.senderLine}
                          onChange={(e) =>
                            updateProviderCred(selectedProviderId, { senderLine: e.target.value })
                          }
                          placeholder={f.senderLine.placeholder}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                      </div>
                    )}

                    {f.otpPatternCode && (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          {f.otpPatternCode.label}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={cred.otpPatternCode}
                          onChange={(e) => {
                            updateProviderCred(selectedProviderId, {
                              otpPatternCode: e.target.value,
                            });
                            setInlineTestPattern(e.target.value);
                          }}
                          placeholder={f.otpPatternCode.placeholder}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                        {f.otpPatternCode.hint && (
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            {f.otpPatternCode.hint}
                          </p>
                        )}
                      </div>
                    )}

                    {f.patternVarName && (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          {f.patternVarName.label}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={cred.patternVarName || ''}
                          onChange={(e) =>
                            updateProviderCred(selectedProviderId, {
                              patternVarName: e.target.value,
                            })
                          }
                          placeholder={f.patternVarName.placeholder}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        />
                        {f.patternVarName.hint && (
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            {f.patternVarName.hint}
                          </p>
                        )}
                      </div>
                    )}

                    {f.apiMethod && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                          متد وب‌سرویس پترن
                        </label>
                        <select
                          value={cred.apiMethod || 'sendbybasenumber2'}
                          onChange={(e) =>
                            updateProviderCred(selectedProviderId, {
                              apiMethod: e.target.value as SmsGatewaySettings['apiMethod'],
                            })
                          }
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                        >
                          <option value="sendbybasenumber2">SendByBaseNumber2 (پیشنهادی)</option>
                          <option value="sendbybasenumber">SendByBaseNumber (SOAP)</option>
                          <option value="rest_baseservicenumber">REST BaseServiceNumber</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Sandbox + Save Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cred.sandboxMode}
                      onChange={(e) =>
                        updateProviderCred(selectedProviderId, { sandboxMode: e.target.checked })
                      }
                      className="rounded accent-emerald-600"
                    />
                    <span>حالت سندباکس / آزمایشی برای این درگاه (بدون ارسال واقعی به وب‌سرویس)</span>
                  </label>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      void persistSmsState(
                        settings,
                        triggers,
                        `تنظیمات درگاه «${provMeta.titleFa}» ذخیره شد.`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره تنظیمات این درگاه'}</span>
                  </button>
                </div>

                {/* Built-in Direct Test Box INSIDE This Gateway's Settings Card */}
                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تست مستقیم همین درگاه: {provMeta.titleFa}</span>
                    </div>
                    <span className="text-[10px] text-stone-500">
                      {cred.sandboxMode
                        ? 'وضعیت فعلی: سندباکس (شبیه‌سازی)'
                        : 'وضعیت فعلی: ارسال واقعی به وب‌سرویس'}
                    </span>
                  </div>

                  {cred.sandboxMode && (
                    <div className="p-3 rounded-xl border border-amber-400/50 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                      <span>
                        حالت «سندباکس / آزمایشی» برای این درگاه روشن است؛ در این حالت پیامی به وب‌سرویس واقعی ارسال نمی‌شود.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateProviderCred(selectedProviderId, { sandboxMode: false })
                        }
                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-[11px] cursor-pointer shrink-0"
                      >
                        خروج از سندباکس (فعال‌سازی ارسال واقعی)
                      </button>
                    </div>
                  )}

                  {selectedProviderId === 'bale' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          کانال تست در پیام‌رسان بله
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setInlineTestBaleChannel('bot_api')}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border cursor-pointer transition-colors ${
                              inlineTestBaleChannel === 'bot_api'
                                ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                                : 'bg-stone-50 dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                            }`}
                          >
                            تست ربات بله (Bot API · ارسال متن به chat_id)
                          </button>
                          <button
                            type="button"
                            onClick={() => setInlineTestBaleChannel('safir_otp')}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border cursor-pointer transition-colors ${
                              inlineTestBaleChannel === 'safir_otp'
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-stone-50 dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                            }`}
                          >
                            تست سفیر بله (Safir API · ارسال کد OTP به شماره موبایل)
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          شماره موبایل گیرنده (برای تست سفیر OTP)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={inlineTestPhone}
                          onChange={(e) => setInlineTestPhone(e.target.value)}
                          placeholder="09123456789"
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          شناسه چت مقصد (برای تست ربات بله)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={inlineTestBaleChatId}
                          onChange={(e) => setInlineTestBaleChatId(e.target.value)}
                          placeholder={cred.baleChatId || 'chat_id'}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          کد OTP آزمایشی (سفیر)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={inlineTestCode}
                          onChange={(e) => setInlineTestCode(e.target.value)}
                          placeholder="54321"
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          متن پیام تست (برای حالت ربات بله)
                        </label>
                        <input
                          type="text"
                          value={inlineTestMessage}
                          onChange={(e) => setInlineTestMessage(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        />
                      </div>
                    </div>
                  ) : selectedProviderId === 'eitaa' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          شناسه کانال/گروه مقصد در ایتایار (chat_id) *
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={inlineTestEitaaChatId}
                          onChange={(e) => setInlineTestEitaaChatId(e.target.value)}
                          placeholder={cred.eitaaChatId || '1234567'}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          متن پیام تست برای ارسال به ایتا
                        </label>
                        <input
                          type="text"
                          value={inlineTestMessage}
                          onChange={(e) => setInlineTestMessage(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">
                          شماره موبایل گیرنده تست *
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={inlineTestPhone}
                          onChange={(e) => setInlineTestPhone(e.target.value)}
                          placeholder="09123456789"
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                        />
                      </div>

                      {f.otpPatternCode && (
                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 mb-1">
                            روش ارسال تست
                          </label>
                          <select
                            value={inlineTestMode}
                            onChange={(e) =>
                              setInlineTestMode(e.target.value as 'text' | 'pattern')
                            }
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                          >
                            <option value="text">ارسال متن آزاد</option>
                            <option value="pattern">ارسال با کد الگو / پترن OTP</option>
                          </select>
                        </div>
                      )}

                      {f.otpPatternCode && inlineTestMode === 'pattern' ? (
                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 mb-1">
                            کد پترن تست (خالی = پترن OTP همین درگاه)
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={inlineTestPattern}
                            onChange={(e) => setInlineTestPattern(e.target.value)}
                            placeholder={cred.otpPatternCode || 'کد پترن'}
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                          />
                        </div>
                      ) : (
                        <div className={f.otpPatternCode ? '' : 'sm:col-span-2'}>
                          <label className="block text-[10px] font-bold text-stone-500 mb-1">
                            متن پیامک تست
                          </label>
                          <input
                            type="text"
                            value={inlineTestMessage}
                            onChange={(e) => setInlineTestMessage(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                          />
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                            عبارت «لغو11» به‌صورت خودکار به انتهای تمامی پیامک‌های متنی (آزاد) اضافه می‌شود.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isSendingInlineTest}
                      onClick={() => void handleInlineProviderTest(selectedProviderId)}
                      className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 hover:opacity-90 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSendingInlineTest ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isSendingInlineTest
                          ? 'در حال ارسال تست...'
                          : `ارسال تست با ${provMeta.titleFa}`}
                      </span>
                    </button>

                    {inlineTestResult && inlineTestResult.provider === selectedProviderId && (
                      <div
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 ${
                          inlineTestResult.ok
                            ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/12 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {inlineTestResult.ok ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{inlineTestResult.text}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500 font-bold">
            برای مشاهده و ویرایش فیلدهای اختصاصی، فعال/غیرفعال‌سازی و ارسال تست مستقیم، روی یکی از ۱۲ سامانه پیامکی یا پیام‌رسان‌های بله و ایتا در بالا کلیک کنید.
          </div>
        )}
      </div>

      {/* Section 2: Per-Process Single-Gateway Routing Matrix */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-[#1D4ED8]" />
              <span>تعیین درگاه فعال برای هر فرآیند (دقیقاً یک درگاه برای هر رویداد)</span>
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              برای هر حالت ارسال پیام می‌توانید «درگاه پیش‌فرض اصلی سایت» یا دقیقاً یک درگاه دیگر (از جمله پیام‌رسان بله) را اختصاص دهید.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleResetAllProcessesToDefault}
              className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-[11px] font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer disabled:opacity-50"
            >
              همه روی درگاه پیش‌فرض
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleActivateBaleForAllProcesses}
              className="px-3 py-1.5 rounded-xl bg-teal-600/15 text-teal-800 dark:text-teal-300 hover:bg-teal-600/25 text-[11px] font-extrabold cursor-pointer disabled:opacity-50"
            >
              همه فرآیندها با پیام‌رسان بله
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {EVENT_KEY_OPTIONS.map((ev) => {
            const assigned = settings.eventRouting?.[ev.value] || 'default';
            const resolvedPid: SmsProviderId =
              assigned === 'default' ? settings.provider : assigned;
            const resolvedEnabled =
              assigned === 'default'
                ? isPrimaryActive
                : getProviderCred(resolvedPid).enabled;
            return (
              <div
                key={ev.value}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-stone-900 dark:text-white">
                    {ev.shortLabel}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      resolvedEnabled
                        ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/12 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {resolvedEnabled ? 'آماده ارسال' : 'درگاه خاموش'}
                  </span>
                </div>

                <select
                  value={assigned}
                  disabled={isSaving}
                  onChange={(e) =>
                    handleChangeEventGateway(
                      ev.value,
                      e.target.value as SmsProviderId | 'default'
                    )
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold"
                >
                  <option value="default">
                    استفاده از درگاه پیش‌فرض (
                    {isPrimaryActive ? primaryMeta?.titleFa || settings.provider : 'خاموش'})
                  </option>
                  {ALL_MESSAGING_PROVIDERS.map((p) => {
                    const pCred = getProviderCred(p.id);
                    return (
                      <option key={p.id} value={p.id}>
                        اختصاصی: {p.titleFa} {pCred.enabled ? '(فعال)' : '(خاموش - با انتخاب فعال می‌شود)'}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Priority Trigger List */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              شرط‌های خودکار ارسال پیام (اولویت از بالا به پایین · Drag & Drop)
            </h3>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
              در صورت تعریف چند شرط برای یک رویداد، تنها شرط فعال با بالاترین اولویت از طریق درگاه مشخص‌شده اجرا می‌شود.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              dir="ltr"
              value={ruleTestPhone}
              onChange={(e) => setRuleTestPhone(e.target.value)}
              placeholder="شماره موبایل برای دکمه تست شرط (0912...)"
              className="px-3 py-1.5 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 w-60"
            />
          </div>
        </div>

        <div className="space-y-3">
          {triggers.map((rule, idx) => {
            const effectiveOverride =
              rule.providerOverride && rule.providerOverride !== 'default'
                ? rule.providerOverride
                : settings.eventRouting?.[rule.eventKey] || 'default';
            const gatewayBadgeLabel = getProviderTitle(
              effectiveOverride,
              settings.provider,
              isPrimaryActive
            );
            const isBaleRule =
              effectiveOverride === 'bale' ||
              (effectiveOverride === 'default' && settings.provider === 'bale');

            return (
              <div
                key={rule.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnRule(idx)}
                className={`p-4 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  rule.enabled
                    ? 'border-stone-200 dark:border-stone-700 bg-stone-50/60 dark:bg-stone-950/60'
                    : 'border-stone-200/70 dark:border-stone-800 opacity-65'
                } ${dragIndex === idx ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-4 h-4 text-stone-400 cursor-grab" />
                      <span className="px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-[11px] font-extrabold smooth-nums">
                        {(idx + 1).toLocaleString('fa-IR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveRule(idx, -1)}
                        className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 cursor-pointer"
                        title="افزایش اولویت"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === triggers.length - 1}
                        onClick={() => handleMoveRule(idx, 1)}
                        className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 disabled:opacity-30 cursor-pointer"
                        title="کاهش اولویت"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-stone-900 dark:text-white">
                        {rule.title}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[#1D4ED8] dark:text-sky-300 text-[10px] font-bold">
                        {rule.sectionLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isBaleRule
                            ? 'bg-teal-500/15 text-teal-800 dark:text-teal-300'
                            : 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        درگاه: {gatewayBadgeLabel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.sendMode === 'pattern_code'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {rule.sendMode === 'pattern_code'
                          ? `کد الگو (پترن): ${rule.patternCode || '—'}`
                          : 'ارسال متن اختصاصی'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 break-words">
                      {rule.messageTemplate}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleTestSpecificRule(rule)}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>تست شرط</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRule(rule)}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>ویرایش</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = triggers.map((t) =>
                        t.id === rule.id ? { ...t, enabled: !t.enabled } : t
                      );
                      void persistSmsState(
                        settings,
                        next,
                        `شرط «${rule.title}» ${
                          !rule.enabled ? 'فعال' : 'غیرفعال'
                        } شد.`
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${
                      rule.enabled
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {rule.enabled ? 'فعال' : 'غیرفعال'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = triggers.filter((t) => t.id !== rule.id);
                      void persistSmsState(settings, next, 'شرط پیامک حذف شد.');
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit / Add Trigger Modal */}
      {editingRule && (
        <div
          role="dialog"
          aria-modal="true"
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
              ویرایش / افزودن شرط ارسال پیام
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">عنوان شرط</label>
                <input
                  type="text"
                  value={editingRule.title}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    رویداد متصل (Event)
                  </label>
                  <select
                    value={editingRule.eventKey}
                    onChange={(e) => {
                      const val = e.target.value as SmsTriggerEventKey;
                      const match = EVENT_KEY_OPTIONS.find(
                        (o) => o.value === val
                      );
                      setEditingRule({
                        ...editingRule,
                        eventKey: val,
                        sectionLabel:
                          match?.section || editingRule.sectionLabel,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  >
                    {EVENT_KEY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">
                    درگاه ارسال این شرط (فقط ۱ درگاه)
                  </label>
                  <select
                    value={editingRule.providerOverride || 'default'}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        providerOverride: e.target.value as SmsProviderId | 'default',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                  >
                    <option value="default">
                      درگاه پیش‌فرض (اصلی سایت)
                    </option>
                    {ALL_MESSAGING_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        اختصاصی: {p.titleFa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">حالت ارسال</label>
                  <select
                    value={editingRule.sendMode}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        sendMode: e.target.value as
                          | 'custom_text'
                          | 'pattern_code',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                  >
                    <option value="custom_text">ارسال متن اختصاصی</option>
                    <option value="pattern_code">
                      ارسال با کد الگو (Pattern / bodyId)
                    </option>
                  </select>
                </div>

                {editingRule.sendMode === 'pattern_code' && (
                  <div>
                    <label className="block font-bold mb-1">
                      کد الگو (Pattern / bodyId / template)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={editingRule.patternCode}
                      onChange={(e) =>
                        setEditingRule({
                          ...editingRule,
                          patternCode: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1">
                  قالب متن پیام (متغیرهای {'{name}'}, {'{tracking_code}'},{' '}
                  {'{amount}'}, {'{code}'})
                </label>
                <textarea
                  rows={3}
                  value={editingRule.messageTemplate}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      messageTemplate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  let nextSettings = settings;
                  if (
                    editingRule.providerOverride &&
                    editingRule.providerOverride !== 'default'
                  ) {
                    const ov = editingRule.providerOverride;
                    const cred = getProviderCred(ov);
                    nextSettings = {
                      ...settings,
                      eventRouting: {
                        ...(settings.eventRouting || {}),
                        [editingRule.eventKey]: ov,
                      },
                      providersMap: {
                        ...(settings.providersMap || {}),
                        [ov]: { ...cred, enabled: true },
                      },
                    };
                  }
                  const exists = triggers.some((t) => t.id === editingRule.id);
                  const next = exists
                    ? triggers.map((t) =>
                        t.id === editingRule.id ? editingRule : t
                      )
                    : [...triggers, editingRule];
                  setEditingRule(null);
                  void persistSmsState(
                    nextSettings,
                    next,
                    'شرط ارسال پیام ذخیره و در دیتابیس ثبت شد.'
                  );
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer"
              >
                ذخیره شرط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
