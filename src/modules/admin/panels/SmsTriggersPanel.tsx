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
} from 'lucide-react';
import type {
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

const IRAN_SMS_PROVIDERS: {
  id: SmsProviderId;
  titleFa: string;
  subtitle: string;
}[] = [
  { id: 'melipayamak', titleFa: 'ملی‌پیامک (MeliPayamak)', subtitle: 'پترن SOAP / REST سریع' },
  { id: 'kavenegar', titleFa: 'کاوه‌نگار (Kavenegar)', subtitle: 'وب‌سرویس Lookup و OTP' },
  { id: 'farazsms', titleFa: 'فراز اس‌ام‌اس (FarazSMS)', subtitle: 'پنل IPPanel با الگوی سریع' },
  { id: 'parsgreen', titleFa: 'پارس‌گرین (ParsGreen)', subtitle: 'وب‌سرویس APIv2 و خطوط خدماتی' },
  { id: 'iranpayamak', titleFa: 'ایران‌پیامک (IranPayamak)', subtitle: 'خط خدماتی و ارسال پترن' },
  { id: 'tasnimsms', titleFa: 'تسنیم اس‌ام‌اس (TasnimSMS)', subtitle: 'ارسال سریع احراز هویت' },
  { id: 'savatpayamak', titleFa: 'سوات پیامک (SavatPayamak)', subtitle: 'ارسال وب‌سرویس سازمانی' },
  { id: 'payamaksara', titleFa: 'پیامک‌سرا (PayamakSara)', subtitle: 'پترن و ارسال تراکنشی' },
  { id: 'smsir', titleFa: 'اس‌ام‌اس دات آی‌آر (SMS.ir)', subtitle: 'Verify API v1 با TemplateId' },
  { id: 'ghasedak', titleFa: 'قاصدک (Ghasedak)', subtitle: 'ارسال OTP و خطوط اختصاصی' },
  { id: 'magfa', titleFa: 'مگفا (Magfa)', subtitle: 'سرشماره ۳۰۰۰ و وب‌سرویس بانکی' },
  { id: 'farapayamak', titleFa: 'فراپیامک (FaraPayamak)', subtitle: 'سازگار با پترن خط خدماتی' },
];

const EVENT_KEY_OPTIONS: {
  value: SmsTriggerEventKey;
  label: string;
  section: string;
}[] = [
  {
    value: 'order_created',
    label: 'ثبت سفارش جدید (order_created)',
    section: 'بخش: ثبت سفارش محصول',
  },
  {
    value: 'payment_success',
    label: 'پرداخت موفق (payment_success)',
    section: 'بخش: پرداخت موفق',
  },
  {
    value: 'free_skill_claimed',
    label: 'دریافت اسکیل رایگان (free_skill_claimed)',
    section: 'بخش: دریافت اسکیل رایگان',
  },
  {
    value: 'order_status_changed',
    label: 'تغییر وضعیت سفارش (order_status_changed)',
    section: 'بخش: به‌روزرسانی وضعیت',
  },
  {
    value: 'user_registered',
    label: 'ورود و ثبت‌نام / کد OTP (user_registered)',
    section: 'بخش: ورود و ثبت‌نام',
  },
];

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

  const getProviderCred = (pid: SmsProviderId): SmsProviderCredential => {
    const existing = settings.providersMap?.[pid];
    if (existing) return existing;
    return {
      provider: pid,
      enabled: settings.provider === pid,
      username: settings.provider === pid ? settings.username : '',
      apiKey: settings.provider === pid ? settings.apiKey : '',
      senderLine: settings.provider === pid ? settings.senderLine : '',
      otpPatternCode: settings.provider === pid ? settings.otpPatternCode : '',
      apiMethod: settings.provider === pid ? settings.apiMethod : 'sendbybasenumber2',
      sandboxMode: settings.provider === pid ? settings.sandboxMode : true,
    };
  };

  const updateProviderCred = (
    pid: SmsProviderId,
    patch: Partial<SmsProviderCredential>,
    makeActiveDefault = false
  ) => {
    const current = getProviderCred(pid);
    const updated: SmsProviderCredential = { ...current, ...patch, provider: pid };
    const nextMap = { ...(settings.providersMap || {}), [pid]: updated };
    const isActive = makeActiveDefault || settings.provider === pid;
    setSettings({
      ...settings,
      provider: isActive ? pid : settings.provider,
      username: isActive ? updated.username : settings.username,
      apiKey: isActive ? updated.apiKey : settings.apiKey,
      senderLine: isActive ? updated.senderLine : settings.senderLine,
      otpPatternCode: isActive ? updated.otpPatternCode : settings.otpPatternCode,
      apiMethod: isActive ? updated.apiMethod : settings.apiMethod,
      sandboxMode: isActive ? updated.sandboxMode : settings.sandboxMode,
      providersMap: nextMap,
    });
  };

  const [testPhone, setTestPhone] = useState('');
  const [testEventOrFree, setTestEventOrFree] = useState<
    'free' | SmsTriggerEventKey
  >('free');
  const [testPatternCode, setTestPatternCode] = useState('');
  const [testMessage, setTestMessage] = useState(
    'سلام، این یک پیامک آزمایشی از سامانه پیامک پلتفرم اسکیل ۹۸ است.'
  );
  const [isSendingTest, setIsSendingTest] = useState(false);

  const loadSmsConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const { ok, data } = await apiJson<{
        settings?: SmsGatewaySettings;
        triggers?: SmsTriggerRule[];
      }>('/api/admin/sms/config');
      if (ok) {
        if (data.settings) setSettings(data.settings);
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
      setTriggers(normalized);
      onNotice('success', successMsg);
    } catch {
      onNotice('error', 'خطا در ذخیره تنظیمات پیامک در دیتابیس.');
    } finally {
      setIsSaving(false);
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
    const targetPhone = testPhone.trim();
    if (!targetPhone) {
      onNotice(
        'error',
        'لطفاً ابتدا شماره موبایل گیرنده تست را در کادر پایین وارد کنید.'
      );
      return;
    }
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        messagePreview?: string;
      }>('/api/admin/sms/test', {
        method: 'POST',
        body: JSON.stringify({
          phone: targetPhone,
          eventKey: rule.eventKey,
          customMessage:
            rule.sendMode === 'custom_text' ? rule.messageTemplate : undefined,
          patternCode:
            rule.sendMode === 'pattern_code' ? rule.patternCode : undefined,
        }),
      });
      if (!ok) throw new Error(data.error);
      onNotice(
        'success',
        `تست شرط «${rule.title}» اجرا و در لاگ سیستم ثبت شد: ${data.messagePreview}`
      );
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در تست شرط'
      );
    }
  };

  const handleSendLiveTestSms = async () => {
    const targetPhone = testPhone.trim();
    if (!targetPhone) {
      onNotice('error', 'لطفاً شماره موبایل گیرنده تست را وارد کنید.');
      return;
    }
    setIsSendingTest(true);
    try {
      const { ok, data } = await apiJson<{
        error?: string;
        sandbox?: boolean;
      }>('/api/admin/sms/test', {
        method: 'POST',
        body: JSON.stringify({
          phone: targetPhone,
          eventKey: testEventOrFree === 'free' ? undefined : testEventOrFree,
          customMessage: testEventOrFree === 'free' ? testMessage : undefined,
          patternCode: testPatternCode.trim() || undefined,
        }),
      });
      if (!ok) throw new Error(data.error || 'خطا در ارسال پیامک تست');
      onNotice(
        'success',
        `پیامک تست به ${targetPhone} ارسال و در لاگ ثبت شد (${
          data.sandbox ? 'حالت سندباکس' : 'ارسال واقعی'
        }).`
      );
    } catch (err) {
      onNotice(
        'error',
        err instanceof Error ? err.message : 'خطا در ارسال پیامک تست'
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>وب‌سرویس پیامک (ملی‌پیامک / کاوه‌نگار / فراز اس‌ام‌اس)</span>
          </div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-white">
            مدیریت درگاه پیامک و شرط‌های اولویت‌دار ارسال خودکار به مشتریان
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            پشتیبانی از جابه‌جایی ترتیب (Drag & Drop)، ارسال متن با متغیرهای
            پویا و کد الگو (Pattern / bodyId)
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
              messageTemplate: '{name} عزیز، عملیات در اسکیل ۹۸ انجام شد.',
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

      {/* 12 Iranian SMS Providers Selectable Grid + Single Settings Card Below */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              انتخاب از ۱۲ درگاه پیامکی ایرانی (فعال‌سازی برای این سایت)
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              درگاه فعال پیش‌فرض فعلی:{' '}
              <strong className="text-emerald-600">
                {IRAN_SMS_PROVIDERS.find((p) => p.id === settings.provider)?.titleFa ||
                  settings.provider}
              </strong>{' '}
              · روی هر درگاه کلیک کنید تا فرم تنظیمات اختصاصی آن در پایین باز شود.
            </p>
          </div>
          {isLoading && (
            <span className="text-xs text-stone-400">در حال بارگذاری...</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {IRAN_SMS_PROVIDERS.map((prov) => {
            const cred = getProviderCred(prov.id);
            const isActivePrimary = settings.provider === prov.id;
            const isSelected = selectedProviderId === prov.id;
            return (
              <div
                key={prov.id}
                onClick={() => setSelectedProviderId(isSelected ? null : prov.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'border-[#1D4ED8] bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-[#1D4ED8]/25'
                    : isActivePrimary || cred.enabled
                    ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/15'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-stone-900 dark:text-white truncate">
                      {prov.titleFa}
                    </div>
                    <div className="text-[10px] text-stone-500 truncate mt-0.5">
                      {prov.subtitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateProviderCred(prov.id, { enabled: !cred.enabled }, !cred.enabled);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0 cursor-pointer ${
                      isActivePrimary
                        ? 'bg-emerald-600 text-white'
                        : cred.enabled
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {isActivePrimary ? 'فعال (اصلی)' : cred.enabled ? 'فعال' : 'خاموش'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Single Configuration Card Below List for Selected SMS Provider */}
        {selectedProviderId ? (
          (() => {
            const provMeta = IRAN_SMS_PROVIDERS.find((p) => p.id === selectedProviderId);
            const cred = getProviderCred(selectedProviderId);
            const isPrimary = settings.provider === selectedProviderId;
            return (
              <div className="p-5 rounded-2xl border-2 border-[#1D4ED8]/35 bg-stone-50/60 dark:bg-stone-950/60 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                      تنظیمات وب‌سرویس: {provMeta?.titleFa}
                    </h4>
                    <p className="text-[11px] text-stone-500">{provMeta?.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateProviderCred(selectedProviderId, { enabled: true }, true)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                      isPrimary
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-900 dark:bg-white text-white dark:text-stone-950'
                    }`}
                  >
                    {isPrimary ? '✓ درگاه اصلی فعال سایت' : 'انتخاب به عنوان درگاه اصلی ارسال'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      نام کاربری وب‌سرویس
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={cred.username}
                      onChange={(e) =>
                        updateProviderCred(selectedProviderId, { username: e.target.value })
                      }
                      placeholder="0912... / username"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      کلمه عبور یا API Key
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      value={cred.apiKey}
                      onChange={(e) =>
                        updateProviderCred(selectedProviderId, { apiKey: e.target.value })
                      }
                      placeholder="••••••••••••••••"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      شماره خط ارسال
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={cred.senderLine}
                      onChange={(e) =>
                        updateProviderCred(selectedProviderId, { senderLine: e.target.value })
                      }
                      placeholder="50004000..."
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      کد پترن پیش‌فرض OTP
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={cred.otpPatternCode}
                      onChange={(e) =>
                        updateProviderCred(selectedProviderId, { otpPatternCode: e.target.value })
                      }
                      placeholder="137991"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                  </div>

                  {(selectedProviderId === 'melipayamak' || selectedProviderId === 'farapayamak') && (
                    <div className="sm:col-span-2 lg:col-span-4">
                      <label className="block text-[11px] font-bold text-stone-500 mb-1">
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

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cred.sandboxMode}
                      onChange={(e) =>
                        updateProviderCred(selectedProviderId, { sandboxMode: e.target.checked })
                      }
                    />
                    <span>حالت سندباکس / آزمایشی برای این درگاه</span>
                  </label>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      void persistSmsState(
                        settings,
                        triggers,
                        `تنظیمات درگاه پیامک «${provMeta?.titleFa}» ذخیره شد.`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-50"
                  >
                    ذخیره تنظیمات این درگاه
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500 font-bold">
            برای تنظیم نام کاربری، کلید API، شماره خط و پترن OTP، روی یکی از ۱۲ درگاه پیامکی بالا کلیک کنید.
          </div>
        )}
      </div>

      {/* Priority Trigger List */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 dark:text-white">
              شرط‌های خودکار پیامک متصل به رویدادهای واقعی سرور (اولویت از بالا
              به پایین · Drag & Drop)
            </h3>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
              در صورت تعریف چند شرط برای یک رویداد، شرط فعال با بالاترین اولویت
              اجرا می‌شود.
            </p>
          </div>
          <span className="text-[11px] text-stone-500">
            متغیرها: {'{name}'} {'{tracking_code}'} {'{amount}'} {'{ref_id}'}{' '}
            {'{skill_title}'} {'{status}'} {'{code}'}
          </span>
        </div>

        <div className="space-y-3">
          {triggers.map((rule, idx) => (
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
                    <span className="px-2 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-[10px] font-mono">
                      {rule.eventKey}
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
          ))}
        </div>
      </div>

      {/* Live Test Dispatch Card */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900 p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-extrabold text-stone-900 dark:text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-600" />
          <span>تست زنده ارسال پیامک با وب‌سرویس متصل (پترن یا متن دلخواه)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">
              شماره موبایل گیرنده تست *
            </label>
            <input
              type="text"
              dir="ltr"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="09123456789"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">
              نوع تست (انتخاب شرط یا متن آزاد)
            </label>
            <select
              value={testEventOrFree}
              onChange={(e) =>
                setTestEventOrFree(
                  e.target.value as 'free' | SmsTriggerEventKey
                )
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            >
              <option value="free">
                تست دلخواه (متن آزاد یا کد پترن دستی)
              </option>
              {EVENT_KEY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">
              کد پترن تستی (اختیاری - bodyId)
            </label>
            <input
              type="text"
              dir="ltr"
              value={testPatternCode}
              onChange={(e) => setTestPatternCode(e.target.value)}
              placeholder="خالی = ارسال متنی"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-stone-500 mb-1">
              متن پیامک تست
            </label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={isSendingTest}
          onClick={handleSendLiveTestSms}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>
            {isSendingTest ? 'در حال ارسال...' : 'ارسال پیامک تست و ثبت در لاگ'}
          </span>
        </button>
      </div>

      {/* Edit / Add Trigger Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-stone-900 dark:text-white">
              ویرایش / افزودن شرط ارسال پیامک
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

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              {editingRule.sendMode === 'pattern_code' && (
                <div>
                  <label className="block font-bold mb-1">
                    کد الگو (Pattern / bodyId)
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

              <div>
                <label className="block font-bold mb-1">
                  قالب متن پیامک (متغیرهای {'{name}'}, {'{tracking_code}'},{' '}
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
                  const exists = triggers.some((t) => t.id === editingRule.id);
                  const next = exists
                    ? triggers.map((t) =>
                        t.id === editingRule.id ? editingRule : t
                      )
                    : [...triggers, editingRule];
                  setEditingRule(null);
                  void persistSmsState(
                    settings,
                    next,
                    'شرط پیامک ذخیره و در دیتابیس ثبت شد.'
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
