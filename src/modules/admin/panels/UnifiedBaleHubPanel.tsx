import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import type {
  BackupScheduleConfig,
  BaleSafirApiVersion,
  BaleSendMode,
  SmsGatewaySettings,
  SmsProviderCredential,
} from '../../../core/types';
import { apiJson } from '../../../core/apiClient';
import {
  DEFAULT_BACKUP_SCHEDULE_CONFIG,
  DEFAULT_SMS_GATEWAY_SETTINGS,
} from '../../../data/defaults';

interface UnifiedBaleHubPanelProps {
  isSuperAdmin: boolean;
  onNotice: (type: 'success' | 'error', text: string) => void;
}

interface BaleAlertsState {
  enabled: boolean;
  notifyApprovals: boolean;
  notifyUserRequests: boolean;
  notifyOrdersAndFailures: boolean;
  notifyCriticalErrors: boolean;
  notifyAgentEscalations: boolean;
  overrideChatId: string;
  hasDirectBotToken: boolean;
  baleBotTokenMasked: string;
  dailyBriefingEnabled: boolean;
  dailyBriefingTime: string;
}

interface BaleSocialState {
  baleChannelEnabled: boolean;
  baleChannelId: string;
  requireApprovalBeforePublish: boolean;
}

const DEFAULT_BALE_ALERTS: BaleAlertsState = {
  enabled: false,
  notifyApprovals: true,
  notifyUserRequests: true,
  notifyOrdersAndFailures: true,
  notifyCriticalErrors: true,
  notifyAgentEscalations: true,
  overrideChatId: '',
  hasDirectBotToken: false,
  baleBotTokenMasked: '',
  dailyBriefingEnabled: false,
  dailyBriefingTime: '09:00',
};

const EMPTY_BALE_CRED: SmsProviderCredential = {
  provider: 'bale',
  enabled: true,
  username: '',
  apiKey: '',
  senderLine: '',
  otpPatternCode: '',
  baleMode: 'auto',
  baleSafirVersion: 'v3',
  baleClientId: '',
  baleClientSecret: '',
  baleSafirApiAccessKey: '',
  baleSafirBotId: '',
  baleBotToken: '',
  baleChatId: '',
  sandboxMode: false,
};

function extractBotIdFromToken(token: string): string {
  const m = String(token || '')
    .trim()
    .replace(/^bot/i, '')
    .match(/^(\d{5,}):/);
  return m ? m[1] : '';
}

export const UnifiedBaleHubPanel: React.FC<UnifiedBaleHubPanelProps> = ({
  isSuperAdmin,
  onNotice,
}) => {
  const [loading, setLoading] = useState(true);

  // 1) Unified Bot Token + Pairing + Admin Alerts
  const [botTokenInput, setBotTokenInput] = useState('');
  const [botTokenMasked, setBotTokenMasked] = useState('');
  const [hasSavedBotToken, setHasSavedBotToken] = useState(false);
  const [baleAlerts, setBaleAlerts] = useState<BaleAlertsState>(DEFAULT_BALE_ALERTS);
  const [savingBotIdentity, setSavingBotIdentity] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);

  // 1-Click Pairing State
  const [pairingStarting, setPairingStarting] = useState(false);
  const [pairingVerifying, setPairingVerifying] = useState(false);
  const [pairingInfo, setPairingInfo] = useState<{
    code: string;
    deepLink: string;
    botUsername: string;
    startCommand: string;
  } | null>(null);

  // 2) Safir v2/v3 & SMS Hub Bale Config
  const [smsSettings, setSmsSettings] = useState<SmsGatewaySettings>(DEFAULT_SMS_GATEWAY_SETTINGS);
  const [baleCred, setBaleCred] = useState<SmsProviderCredential>(EMPTY_BALE_CRED);
  const [savingSafir, setSavingSafir] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testingChannel, setTestingChannel] = useState<'safir_otp' | 'bot_api' | null>(null);
  const [lastTestReport, setLastTestReport] = useState<{
    ok: boolean;
    title: string;
    detail: string;
  } | null>(null);

  // 3) Agent Alerts & Daily Briefing Test
  const [testingAlert, setTestingAlert] = useState(false);
  const [testingBriefing, setTestingBriefing] = useState(false);

  // 4) Bale Channel Publisher
  const [socialState, setSocialState] = useState<BaleSocialState>({
    baleChannelEnabled: false,
    baleChannelId: '',
    requireApprovalBeforePublish: true,
  });
  const [savingSocial, setSavingSocial] = useState(false);
  const [testingSocial, setTestingSocial] = useState(false);

  // 5) Auto Backup to Bale
  const [backupCfg, setBackupCfg] = useState<BackupScheduleConfig>(DEFAULT_BACKUP_SCHEDULE_CONFIG);
  const [savingBackup, setSavingBackup] = useState(false);
  const [testingBackup, setTestingBackup] = useState(false);

  const loadAllBaleConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const [smsRes, backupRes, agentRes, socialRes] = await Promise.all([
        apiJson<{ settings?: SmsGatewaySettings }>('/api/admin/sms/config'),
        apiJson<{ scheduleConfig?: BackupScheduleConfig }>('/api/admin/backup/history'),
        isSuperAdmin
          ? apiJson<{
              ok?: boolean;
              settings?: {
                baleAlerts?: Partial<BaleAlertsState>;
              };
            }>('/api/v1/modules/ai-hub/agent/overview')
          : Promise.resolve({ ok: false, data: {} as { settings?: { baleAlerts?: Partial<BaleAlertsState> } } }),
        isSuperAdmin
          ? apiJson<{
              ok?: boolean;
              config?: {
                baleChannelEnabled?: boolean;
                baleChannelId?: string;
                requireApprovalBeforePublish?: boolean;
              };
            }>('/api/v1/modules/ai-hub/agent/social-config')
          : Promise.resolve({
              ok: false,
              data: {} as {
                config?: {
                  baleChannelEnabled?: boolean;
                  baleChannelId?: string;
                  requireApprovalBeforePublish?: boolean;
                };
              },
            }),
      ]);

      let smsBaleToken = '';
      if (smsRes.ok && smsRes.data?.settings) {
        const s = smsRes.data.settings;
        setSmsSettings(s);
        const existingBale = s.providersMap?.bale;
        const resolvedVersion: BaleSafirApiVersion =
          existingBale?.baleSafirVersion === 'v2' || existingBale?.baleSafirVersion === 'v3'
            ? existingBale.baleSafirVersion
            : existingBale?.baleClientId && existingBale?.baleClientSecret && !existingBale?.baleSafirApiAccessKey
            ? 'v2'
            : 'v3';
        const mergedCred: SmsProviderCredential = {
          ...EMPTY_BALE_CRED,
          ...(existingBale || {}),
          provider: 'bale',
          baleSafirVersion: resolvedVersion,
          baleMode: existingBale?.baleMode || 'auto',
          sandboxMode: typeof existingBale?.sandboxMode === 'boolean' ? existingBale.sandboxMode : false,
        };
        setBaleCred(mergedCred);
        smsBaleToken = (mergedCred.baleBotToken || '').trim();
      }

      if (backupRes.ok && backupRes.data?.scheduleConfig) {
        setBackupCfg({
          ...DEFAULT_BACKUP_SCHEDULE_CONFIG,
          ...backupRes.data.scheduleConfig,
        });
      }

      if (agentRes.ok && agentRes.data?.settings?.baleAlerts) {
        const ba = agentRes.data.settings.baleAlerts;
        setBaleAlerts({
          ...DEFAULT_BALE_ALERTS,
          ...ba,
          overrideChatId: ba.overrideChatId || '',
          dailyBriefingTime: ba.dailyBriefingTime || '09:00',
        });
        setHasSavedBotToken(Boolean(ba.hasDirectBotToken || smsBaleToken));
        setBotTokenMasked(
          ba.baleBotTokenMasked ||
            (smsBaleToken ? `${smsBaleToken.slice(0, 6)}••••${smsBaleToken.slice(-4)}` : '')
        );
      } else if (smsBaleToken) {
        setHasSavedBotToken(true);
        setBotTokenMasked(`${smsBaleToken.slice(0, 6)}••••${smsBaleToken.slice(-4)}`);
      }

      if (socialRes.ok && socialRes.data?.config) {
        setSocialState({
          baleChannelEnabled: Boolean(socialRes.data.config.baleChannelEnabled),
          baleChannelId: socialRes.data.config.baleChannelId || '',
          requireApprovalBeforePublish: socialRes.data.config.requireApprovalBeforePublish !== false,
        });
      }
    } catch {
      onNotice('error', 'خطا در بارگذاری تنظیمات یکپارچه پیام‌رسان بله.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, onNotice]);

  useEffect(() => {
    void loadAllBaleConfigs();
  }, [loadAllBaleConfigs]);

  const effectiveBotIdHint =
    (baleCred.baleSafirBotId || '').trim() ||
    extractBotIdFromToken(botTokenInput || baleCred.baleBotToken || '');

  const persistSmsBaleCred = async (nextCred: SmsProviderCredential, setAsPrimaryProvider?: boolean) => {
    const nextSettings: SmsGatewaySettings = {
      ...smsSettings,
      ...(setAsPrimaryProvider ? { provider: 'bale', enabled: true } : {}),
      providersMap: {
        ...(smsSettings.providersMap || {}),
        bale: nextCred,
      },
    };
    const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>('/api/admin/sms/config', {
      method: 'POST',
      body: JSON.stringify({ settings: nextSettings }),
    });
    if (!ok) {
      throw new Error(data.error || 'خطا در ذخیره تنظیمات پیام‌رسان بله در هاب پیامک');
    }
    setSmsSettings(nextSettings);
    setBaleCred(nextCred);
  };

  // Save unified Bot API Token & Chat ID across Agent Alerts (AES-256-GCM), SMS Hub, and Backup Config
  const handleSaveUnifiedBotIdentity = async () => {
    setSavingBotIdentity(true);
    try {
      const cleanToken = botTokenInput.trim();
      const unifiedChatId = (baleAlerts.overrideChatId || baleCred.baleChatId || '').trim();
      const inferredBotId = cleanToken ? extractBotIdFromToken(cleanToken) : '';

      // 1) Save encrypted Bot Token + Chat ID into Super Admin Bale Alerts (if super_admin)
      if (isSuperAdmin) {
        const alertPayload: Record<string, unknown> = {
          overrideChatId: unifiedChatId,
        };
        if (cleanToken) {
          alertPayload.baleBotToken = cleanToken;
        }
        const { ok, data } = await apiJson<{
          ok?: boolean;
          error?: string;
          settings?: { baleAlerts?: Partial<BaleAlertsState> };
        }>('/api/v1/modules/ai-hub/agent/mode', {
          method: 'POST',
          body: JSON.stringify({ baleAlerts: alertPayload }),
        });
        if (!ok) throw new Error(data.error || 'خطا در ذخیره توکن رمزنگاری‌شده بازوی بله');
        if (data.settings?.baleAlerts) {
          const ba = data.settings.baleAlerts;
          setBaleAlerts((prev) => ({ ...prev, ...ba }));
          setHasSavedBotToken(Boolean(ba.hasDirectBotToken || cleanToken));
          if (ba.baleBotTokenMasked) setBotTokenMasked(ba.baleBotTokenMasked);
        }
      }

      // 2) Sync token & chat_id to SMS Hub Bale provider (and auto-fill bot_id for Safir v3 if empty)
      const nextBaleCred: SmsProviderCredential = {
        ...baleCred,
        enabled: true,
        baleBotToken: cleanToken || baleCred.baleBotToken || '',
        baleChatId: unifiedChatId || baleCred.baleChatId || '',
        baleSafirBotId: (baleCred.baleSafirBotId || '').trim() || inferredBotId || '',
      };
      await persistSmsBaleCred(nextBaleCred);

      // 3) Sync token & chat_id to Backup Schedule Config if cleanToken or chat_id provided
      if (cleanToken || (unifiedChatId && !backupCfg.baleChatId)) {
        const nextBackup: BackupScheduleConfig = {
          ...backupCfg,
          baleBotToken: cleanToken || backupCfg.baleBotToken || '',
          baleChatId: backupCfg.baleChatId || unifiedChatId,
        };
        await apiJson('/api/admin/backup/settings', {
          method: 'POST',
          body: JSON.stringify(nextBackup),
        });
        setBackupCfg(nextBackup);
      }

      if (cleanToken) {
        setBotTokenInput('');
      }
      onNotice(
        'success',
        'توکن واحد بازوی بله و شناسه چت با موفقیت ذخیره و در تمام بخش‌ها (هشدارها، ربات پیام‌رسان، کانال و بکاپ) همگام‌سازی شد.'
      );
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره هویت بازوی بله');
    } finally {
      setSavingBotIdentity(false);
    }
  };

  const handleStartPairing = async () => {
    setPairingStarting(true);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        code?: string;
        deepLink?: string;
        botUsername?: string;
        startCommand?: string;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/bale-pair/start', { method: 'POST' });
      if (!ok || !data.code || !data.deepLink) {
        throw new Error(data.error || 'ابتدا توکن بازوی بله را وارد و ذخیره کنید.');
      }
      setPairingInfo({
        code: data.code,
        deepLink: data.deepLink,
        botUsername: data.botUsername || '',
        startCommand: data.startCommand || `/start pair_${data.code}`,
      });
      onNotice('success', 'لینک اتصال یک‌کلیکی ساخته شد. آن را در بله باز کرده و دکمه «شروع» را بزنید.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ایجاد لینک اتصال یک‌کلیکی بله');
    } finally {
      setPairingStarting(false);
    }
  };

  const handleVerifyPairing = async () => {
    setPairingVerifying(true);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        paired?: boolean;
        chatId?: string;
        message?: string;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/bale-pair/verify', {
        method: 'POST',
        body: JSON.stringify({ code: pairingInfo?.code }),
      });
      if (!ok || !data.paired) {
        throw new Error(data.error || data.message || 'هنوز پیام /start از بله دریافت نشده است.');
      }
      if (data.chatId) {
        setBaleAlerts((prev) => ({ ...prev, overrideChatId: data.chatId || prev.overrideChatId, enabled: true }));
        const nextCred: SmsProviderCredential = { ...baleCred, baleChatId: data.chatId };
        await persistSmsBaleCred(nextCred).catch(() => {});
      }
      setPairingInfo(null);
      onNotice('success', data.message || `اتصال یک‌کلیکی تکمیل شد (chat_id: ${data.chatId}).`);
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در تایید اتصال بله');
    } finally {
      setPairingVerifying(false);
    }
  };

  const handleSaveSafirSettings = async (makeDefaultProvider = false) => {
    setSavingSafir(true);
    try {
      const nextCred: SmsProviderCredential = {
        ...baleCred,
        enabled: true,
        baleBotToken: botTokenInput.trim() || baleCred.baleBotToken || '',
        baleChatId: (baleAlerts.overrideChatId || baleCred.baleChatId || '').trim(),
      };
      await persistSmsBaleCred(nextCred, makeDefaultProvider);
      onNotice(
        'success',
        makeDefaultProvider
          ? `تنظیمات سفیر بله (نسخه ${nextCred.baleSafirVersion || 'v3'}) ذخیره شد و پیام‌رسان بله به‌عنوان اپراتور اصلی انتخاب گردید.`
          : `تنظیمات سرویس سفیر بله (نسخه ${nextCred.baleSafirVersion || 'v3'}) با موفقیت ذخیره شد.`
      );
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات سفیر بله');
    } finally {
      setSavingSafir(false);
    }
  };

  const handleRunBaleLiveTest = async (channel: 'safir_otp' | 'bot_api') => {
    const targetChat = (baleAlerts.overrideChatId || baleCred.baleChatId || '').trim();
    if (channel === 'safir_otp' && !testPhone.trim()) {
      onNotice('error', 'برای تست ارسال کد تایید از سفیر بله، شماره موبایل گیرنده (مثلاً 0912...) را وارد کنید.');
      return;
    }
    if (channel === 'bot_api' && !targetChat) {
      onNotice('error', 'برای تست Bot API بله، ابتدا شناسه چت مقصد (chat_id) را وارد یا از اتصال یک‌کلیکی استفاده کنید.');
      return;
    }
    setTestingChannel(channel);
    setLastTestReport(null);
    try {
      const liveCredOverride: Partial<SmsProviderCredential> = {
        ...baleCred,
        baleBotToken: botTokenInput.trim() || baleCred.baleBotToken || '',
        baleChatId: targetChat,
      };
      const { ok, data } = await apiJson<{
        ok?: boolean;
        error?: string;
        errorMessage?: string;
        sandbox?: boolean;
        gatewayResponse?: unknown;
      }>('/api/admin/sms/test', {
        method: 'POST',
        body: JSON.stringify({
          phone: testPhone.trim(),
          baleChatId: targetChat,
          providerOverride: 'bale',
          baleTestChannel: channel,
          credentialsOverride: liveCredOverride,
          testCode: '54321',
          customMessage:
            channel === 'bot_api'
              ? 'پیام تست اتصال مستقیم از مرکز یکپارچه تنظیمات بله (Skill 98)'
              : undefined,
        }),
      });
      if (!ok) {
        const msg = data.error || data.errorMessage || 'خطا در ارسال تست به بله';
        setLastTestReport({
          ok: false,
          title: channel === 'safir_otp' ? `خطای تست سفیر (${baleCred.baleSafirVersion || 'v3'})` : 'خطای تست Bot API',
          detail: msg,
        });
        onNotice('error', msg);
        return;
      }
      const successMsg =
        channel === 'safir_otp'
          ? `کد تایید تست (54321) از طریق سفیر بله نسخه ${baleCred.baleSafirVersion || 'v3'} با موفقیت به ${testPhone.trim()} ارسال شد (${
              data.sandbox ? 'حالت تست سندباکس' : 'ارسال واقعی'
            }).`
          : `پیام تست ربات بله (tapi.bale.ai) با موفقیت به شناسه چت ${targetChat} ارسال شد.`;
      setLastTestReport({
        ok: true,
        title: channel === 'safir_otp' ? `تست موفق سفیر (${baleCred.baleSafirVersion || 'v3'})` : 'تست موفق Bot API',
        detail: successMsg,
      });
      onNotice('success', successMsg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور بله';
      setLastTestReport({ ok: false, title: 'خطای ارتباطی', detail: msg });
      onNotice('error', msg);
    } finally {
      setTestingChannel(null);
    }
  };

  const handleSaveAlertsAndBriefing = async () => {
    setSavingAlerts(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>('/api/v1/modules/ai-hub/agent/mode', {
        method: 'POST',
        body: JSON.stringify({
          baleAlerts: {
            enabled: baleAlerts.enabled,
            notifyApprovals: baleAlerts.notifyApprovals,
            notifyUserRequests: baleAlerts.notifyUserRequests,
            notifyOrdersAndFailures: baleAlerts.notifyOrdersAndFailures,
            notifyCriticalErrors: baleAlerts.notifyCriticalErrors,
            notifyAgentEscalations: baleAlerts.notifyAgentEscalations,
            overrideChatId: baleAlerts.overrideChatId.trim(),
            dailyBriefingEnabled: baleAlerts.dailyBriefingEnabled,
            dailyBriefingTime: baleAlerts.dailyBriefingTime || '09:00',
          },
        }),
      });
      if (!ok) throw new Error(data.error || 'خطا در ذخیره تنظیمات هشدارهای بله');
      onNotice('success', 'تنظیمات هشدارهای هوشمند و گزارش صبحگاهی بله ذخیره شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره هشدارهای بله');
    } finally {
      setSavingAlerts(false);
    }
  };

  const handleTestAgentAlert = async () => {
    setTestingAlert(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; message?: string; error?: string }>(
        '/api/v1/modules/ai-hub/agent/bale-alerts/test',
        {
          method: 'POST',
          body: JSON.stringify({ overrideChatId: baleAlerts.overrideChatId.trim() || undefined }),
        }
      );
      if (!ok) throw new Error(data.error || 'خطا در ارسال تست هشدار ایجنت به بله');
      onNotice('success', data.message || 'پیام تست هشدار ایجنت با موفقیت در بله ارسال شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در تست هشدار بله');
    } finally {
      setTestingAlert(false);
    }
  };

  const handleTestDailyBriefing = async () => {
    setTestingBriefing(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; message?: string; error?: string }>(
        '/api/v1/modules/ai-hub/agent/daily-briefing/test',
        { method: 'POST' }
      );
      if (!ok) throw new Error(data.error || 'خطا در ارسال گزارش صبحگاهی بله');
      onNotice('success', data.message || 'گزارش صبحگاهی زنده با موفقیت به بله ارسال شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ارسال گزارش صبحگاهی');
    } finally {
      setTestingBriefing(false);
    }
  };

  const handleSaveBaleChannel = async () => {
    setSavingSocial(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/ai-hub/agent/social-config',
        {
          method: 'POST',
          body: JSON.stringify({
            baleChannelEnabled: socialState.baleChannelEnabled,
            baleChannelId: socialState.baleChannelId.trim(),
            requireApprovalBeforePublish: socialState.requireApprovalBeforePublish,
          }),
        }
      );
      if (!ok) throw new Error(data.error || 'خطا در ذخیره تنظیمات کانال بله');
      onNotice('success', 'تنظیمات انتشار خودکار در کانال بله با موفقیت ذخیره شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره کانال بله');
    } finally {
      setSavingSocial(false);
    }
  };

  const handleTestBaleChannel = async () => {
    setTestingSocial(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; message?: string; error?: string }>(
        '/api/v1/modules/ai-hub/agent/social-config/test',
        {
          method: 'POST',
          body: JSON.stringify({ channel: 'bale' }),
        }
      );
      if (!ok) throw new Error(data.error || 'خطا در ارسال پست تست به کانال بله');
      onNotice('success', data.message || 'پیام تست با موفقیت در کانال بله منتشر شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در تست کانال بله');
    } finally {
      setTestingSocial(false);
    }
  };

  const handleSaveBackupBale = async () => {
    setSavingBackup(true);
    try {
      const nextCfg: BackupScheduleConfig = {
        ...backupCfg,
        baleBotToken: botTokenInput.trim() || baleCred.baleBotToken || backupCfg.baleBotToken || '',
        baleChatId: (backupCfg.baleChatId || baleAlerts.overrideChatId || baleCred.baleChatId || '').trim(),
      };
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>('/api/admin/backup/settings', {
        method: 'POST',
        body: JSON.stringify(nextCfg),
      });
      if (!ok) throw new Error(data.error || 'خطا در ذخیره تنظیمات بکاپ بله');
      setBackupCfg(nextCfg);
      onNotice('success', 'تنظیمات ارسال بکاپ خودکار به بله ذخیره شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در ذخیره بکاپ بله');
    } finally {
      setSavingBackup(false);
    }
  };

  const handleTestBackupBale = async () => {
    const tokenToTest = botTokenInput.trim() || baleCred.baleBotToken || backupCfg.baleBotToken || '';
    const chatToTest = (backupCfg.baleChatId || baleAlerts.overrideChatId || baleCred.baleChatId || '').trim();
    if (!tokenToTest || !chatToTest) {
      onNotice('error', 'برای تست بکاپ بله، ابتدا توکن بازو و شناسه چت مقصد را ذخیره کنید.');
      return;
    }
    setTestingBackup(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; message?: string; error?: string }>(
        '/api/admin/backup/test-bale',
        {
          method: 'POST',
          body: JSON.stringify({ baleBotToken: tokenToTest, baleChatId: chatToTest }),
        }
      );
      if (!ok) throw new Error(data.error || 'خطا در تست اتصال بکاپ به بله');
      onNotice('success', data.message || 'پیام تست بکاپ با موفقیت در بله ارسال شد.');
    } catch (err) {
      onNotice('error', err instanceof Error ? err.message : 'خطا در تست بکاپ بله');
    } finally {
      setTestingBackup(false);
    }
  };

  const activeSafirVersion: BaleSafirApiVersion = baleCred.baleSafirVersion === 'v2' ? 'v2' : 'v3';
  const activeBaleMode: BaleSendMode = baleCred.baleMode || 'auto';

  if (loading) {
    return (
      <div className="p-10 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-center gap-2 text-xs font-bold text-stone-500">
        <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
        در حال بارگذاری مرکز یکپارچه تنظیمات پیام‌رسان بله...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl border border-teal-500/30 bg-gradient-to-l from-teal-50/80 via-white to-sky-50/60 dark:from-teal-950/30 dark:via-stone-900 dark:to-sky-950/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
              مرکز یکپارچه تنظیمات پیام‌رسان بله (بازو + سفیر v2/v3 + هشدار + کانال + بکاپ)
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed max-w-3xl">
              تمامی تنظیمات مربوط به بله در همین یک صفحه متمرکز شده‌اند. توکن بازوی بله (دریافتی از{' '}
              <span className="font-mono font-bold" dir="ltr">@BotFather</span>) یک بار ذخیره می‌شود و به صورت خودکار در
              هشدارهای مدیر، ربات پیام‌رسان، انتشار کانال و ارسال بکاپ همگام‌سازی می‌گردد.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadAllBaleConfigs()}
          className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          بروزرسانی وضعیت
        </button>
      </div>

      {/* SECTION 1: Unified Bot API Identity + 1-Click Pairing */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-sky-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                ۱. هویت واحد بازوی بله (Bot API — <span className="font-mono" dir="ltr">tapi.bale.ai</span>) و اتصال یک‌کلیکی
              </h4>
              <p className="text-[11px] text-stone-500">
                برای ربات بله، هشدارهای سوپر ادمین، گزارش صبحگاهی، انتشار در کانال و ارسال بکاپ
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
              hasSavedBotToken
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {hasSavedBotToken ? `توکن فعال (${botTokenMasked || 'ذخیره‌شده'})` : 'توکن بازو هنوز ثبت نشده'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              توکن بازوی بله (Bot API Token از @BotFather)
            </label>
            <input
              type="password"
              dir="ltr"
              value={botTokenInput}
              onChange={(e) => setBotTokenInput(e.target.value)}
              placeholder={
                hasSavedBotToken
                  ? `ذخیره‌شده (${botTokenMasked}) — برای جایگزینی توکن جدید وارد کنید`
                  : '123456789:ABCdefGHIjklMNO...'
              }
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
            <p className="text-[10.5px] text-stone-500 mt-1">
              با رمزنگاری AES-256-GCM ذخیره و هم‌زمان با هاب پیامک و سیستم بکاپ همگام می‌شود.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              شناسه چت سوپر ادمین / مقصد پیام‌های ربات (<span className="font-mono" dir="ltr">chat_id</span>)
            </label>
            <input
              type="text"
              dir="ltr"
              value={baleAlerts.overrideChatId || baleCred.baleChatId || ''}
              onChange={(e) => {
                const v = e.target.value;
                setBaleAlerts((prev) => ({ ...prev, overrideChatId: v }));
                setBaleCred((prev) => ({ ...prev, baleChatId: v }));
              }}
              placeholder="مثلاً 123456789 (یا با اتصال یک‌کلیکی خودکار پر شود)"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
            <p className="text-[10.5px] text-stone-500 mt-1">
              برای دریافت پیام در گفتگوی شخصی، یک‌بار در بله به بازو پیام <span className="font-mono">/start</span> بدهید.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            disabled={savingBotIdentity}
            onClick={() => void handleSaveUnifiedBotIdentity()}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {savingBotIdentity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            ذخیره و همگام‌سازی توکن بازو در کل سایت
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              disabled={pairingStarting}
              onClick={() => void handleStartPairing()}
              className="px-3.5 py-2.5 rounded-xl border border-teal-500/40 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs font-extrabold flex items-center gap-1.5 hover:bg-teal-100 dark:hover:bg-teal-950/60 cursor-pointer disabled:opacity-60"
            >
              {pairingStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              اتصال یک‌کلیکی و دریافت خودکار chat_id
            </button>
          )}

          <button
            type="button"
            disabled={testingChannel === 'bot_api'}
            onClick={() => void handleRunBaleLiveTest('bot_api')}
            className="px-3.5 py-2.5 rounded-xl border border-blue-500/40 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-sky-300 text-xs font-extrabold flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-950/50 cursor-pointer disabled:opacity-60"
          >
            {testingChannel === 'bot_api' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            تست ارسال پیام با Bot API
          </button>
        </div>

        {pairingInfo && (
          <div className="p-4 rounded-xl border border-emerald-400/50 bg-emerald-50/70 dark:bg-emerald-950/30 space-y-2.5 text-xs">
            <div className="font-extrabold text-emerald-800 dark:text-emerald-300">
              لینک اتصال یک‌کلیکی به بازوی <span className="font-mono" dir="ltr">@{pairingInfo.botUsername}</span> آماده شد:
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={pairingInfo.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center gap-1.5 hover:bg-emerald-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                باز کردن لینک در بله و زدن «شروع»
              </a>
              <button
                type="button"
                disabled={pairingVerifying}
                onClick={() => void handleVerifyPairing()}
                className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {pairingVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                دکمه شروع را زدم — بررسی و ثبت chat_id
              </button>
            </div>
            <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono" dir="ltr">
              {pairingInfo.deepLink} · دستور دستی: {pairingInfo.startCommand}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Bale Safir OTP — Selectable Version v3 (New) & v2 (OAuth2) */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                ۲. وب‌سرویس رسمی سفیر بله (ارسال OTP مستقیم به شماره موبایل — انتخاب نسخه API)
              </h4>
              <p className="text-[11px] text-stone-500">
                مطابق مستندات رسمی <span className="font-mono" dir="ltr">docs.bale.ai</span> با پشتیبانی هم‌زمان از نسخه ۳ (جدید) و نسخه ۲ (OAuth2)
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!baleCred.sandboxMode}
              onChange={(e) => setBaleCred((prev) => ({ ...prev, sandboxMode: !e.target.checked }))}
              className="w-4 h-4 accent-teal-600 rounded"
            />
            ارسال واقعی (خاموش بودن حالت شبیه‌ساز/سندباکس)
          </label>
        </div>

        {/* Version Switcher Cards: v3 vs v2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setBaleCred((prev) => ({ ...prev, baleSafirVersion: 'v3' }))}
            className={`text-right p-4 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
              activeSafirVersion === 'v3'
                ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/35'
                : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-900 dark:text-white">
                سفیر بله نسخه ۳ (v3 — پنل کسب‌وکار جدید)
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-teal-600 text-white">
                پیشنهادی docs.bale.ai
              </span>
            </div>
            <div className="text-[11px] font-mono text-teal-700 dark:text-teal-300" dir="ltr">
              POST safir.bale.ai/api/v3/send_message
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400">
              احراز هویت مستقیم با هدر <span className="font-mono font-bold">api-access-key</span> و شناسه عددی بازو (
              <span className="font-mono font-bold">bot_id</span>) — ارسال OTP و پیامک خدماتی بدون نیاز به OAuth2.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setBaleCred((prev) => ({ ...prev, baleSafirVersion: 'v2' }))}
            className={`text-right p-4 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
              activeSafirVersion === 'v2'
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/35'
                : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-900 dark:text-white">
                سفیر بله نسخه ۲ (v2 — احراز هویت OAuth2)
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                پنل کلاسیک OTP
              </span>
            </div>
            <div className="text-[11px] font-mono text-blue-700 dark:text-sky-300" dir="ltr">
              POST safir.bale.ai/api/v2/auth/token → send_otp
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400">
              دریافت توکن موقت با <span className="font-mono font-bold">Client ID</span> و{' '}
              <span className="font-mono font-bold">Client Secret</span> و ارسال کد تایید به شماره موبایل.
            </p>
          </button>
        </div>

        {/* Send Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              استراتژی ارسال پیام از کانال بله
            </label>
            <select
              value={activeBaleMode}
              onChange={(e) => setBaleCred((prev) => ({ ...prev, baleMode: e.target.value as BaleSendMode }))}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            >
              <option value="auto">حالت هوشمند (کد OTP با سفیر بله + پیام‌های متنی با بازوی بله) — پیشنهادی</option>
              <option value="safir_otp">فقط سرویس سفیر بله (ارسال مستقیم به شماره موبایل کاربر در بله)</option>
              <option value="bot_api">فقط بازوی بله (ارسال به chat_id از طریق Bot API)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              وضعیت اپراتور پیش‌فرض پیامک سایت
            </label>
            <div className="px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs flex items-center justify-between">
              <span className="font-bold text-stone-700 dark:text-stone-300">
                اپراتور فعال فعلی:{' '}
                <strong className="text-teal-700 dark:text-teal-400">
                  {smsSettings.provider === 'bale' ? 'پیام‌رسان بله' : smsSettings.provider}
                </strong>
              </span>
              {smsSettings.provider !== 'bale' && (
                <button
                  type="button"
                  onClick={() => void handleSaveSafirSettings(true)}
                  className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                >
                  تنظیم بله به‌عنوان پیش‌فرض
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Version-Specific Credentials Form */}
        {activeSafirVersion === 'v3' ? (
          <div className="p-4 rounded-xl border border-teal-500/35 bg-teal-50/40 dark:bg-teal-950/20 space-y-3">
            <div className="text-xs font-extrabold text-teal-800 dark:text-teal-300">
              مشخصات اتصال سفیر بله نسخه ۳ (پنل کسب‌وکار <span className="font-mono" dir="ltr">safir.bale.ai</span>)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                  کلید دسترسی سفیر v3 (<span className="font-mono" dir="ltr">api-access-key</span>) *
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={baleCred.baleSafirApiAccessKey || ''}
                  onChange={(e) => setBaleCred((prev) => ({ ...prev, baleSafirApiAccessKey: e.target.value }))}
                  placeholder="کلید api-access-key دریافتی از پنل کسب‌وکار بله"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                  شناسه عددی بازو (<span className="font-mono" dir="ltr">bot_id</span>) *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={baleCred.baleSafirBotId || ''}
                  onChange={(e) =>
                    setBaleCred((prev) => ({ ...prev, baleSafirBotId: e.target.value.replace(/[^0-9]/g, '') }))
                  }
                  placeholder={effectiveBotIdHint ? `تشخیص خودکار از توکن: ${effectiveBotIdHint}` : 'مثلاً 123456789'}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
                {effectiveBotIdHint && !baleCred.baleSafirBotId && (
                  <p className="text-[10.5px] text-teal-700 dark:text-teal-300 mt-1">
                    بخش عددی ابتدای توکن بازو (<span className="font-mono font-bold">{effectiveBotIdHint}</span>) به صورت
                    خودکار استفاده می‌شود.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-blue-500/35 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
            <div className="text-xs font-extrabold text-blue-800 dark:text-sky-300">
              مشخصات اتصال سفیر بله نسخه ۲ (احراز هویت OAuth2 — <span className="font-mono" dir="ltr">safir.bale.ai/api/v2</span>)
            </div>
            {(/^\d{5,}:/.test(String(baleCred.baleClientId || '').trim()) ||
              /^\d{5,}:/.test(String(baleCred.baleClientSecret || '').trim())) && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                ⚠️ هشدار: مقدار واردشده شبیه توکن بازوی بله (دارای «:») است! توکن بازو باید در بخش ۱ وارد شود و اینجا فقط
                Client ID و Client Secret پنل سفیر v2 قرار می‌گیرد.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                  شناسه کلاینت سفیر v2 (<span className="font-mono" dir="ltr">Client ID</span>) *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={baleCred.baleClientId || ''}
                  onChange={(e) => setBaleCred((prev) => ({ ...prev, baleClientId: e.target.value }))}
                  placeholder="safir_client_id"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                  کلید محرمانه سفیر v2 (<span className="font-mono" dir="ltr">Client Secret</span>) *
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={baleCred.baleClientSecret || ''}
                  onChange={(e) => setBaleCred((prev) => ({ ...prev, baleClientSecret: e.target.value }))}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Save + Live Safir OTP Test Bar */}
        <div className="flex flex-wrap items-end gap-3 pt-1">
          <button
            type="button"
            disabled={savingSafir}
            onClick={() => void handleSaveSafirSettings(false)}
            className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {savingSafir ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            ذخیره تنظیمات سفیر ({activeSafirVersion})
          </button>

          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="block text-[10.5px] font-bold text-stone-500 mb-1">
              شماره موبایل برای تست ارسال OTP سفیر
            </label>
            <input
              type="tel"
              dir="ltr"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="09123456789"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
          </div>

          <button
            type="button"
            disabled={testingChannel === 'safir_otp'}
            onClick={() => void handleRunBaleLiveTest('safir_otp')}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {testingChannel === 'safir_otp' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            تست زنده OTP سفیر ({activeSafirVersion})
          </button>
        </div>

        {lastTestReport && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              lastTestReport.ok
                ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-rose-300 bg-rose-50/70 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
            }`}
          >
            {lastTestReport.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="font-extrabold">{lastTestReport.title}</div>
              <div className="leading-relaxed break-words">{lastTestReport.detail}</div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Super Admin Smart Alerts & Daily Morning Briefing */}
      {isSuperAdmin && (
        <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  ۳. هشدارهای هوشمند ایجنت ۲۴/۷ و گزارش صبحگاهی در بله (ویژه سوپر ادمین)
                </h4>
                <p className="text-[11px] text-stone-500">
                  اطلاع‌رسانی آنی سفارش‌ها، خطاها، فرم‌ها، صف تایید ۱-کلیکی و گزارش عملکرد روزانه
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-extrabold text-stone-800 dark:text-stone-200 cursor-pointer">
              <input
                type="checkbox"
                checked={baleAlerts.enabled}
                onChange={(e) => setBaleAlerts((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 accent-teal-600 rounded"
              />
              فعال‌سازی ارسال هشدارها به بله
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {[
              { key: 'notifyApprovals', label: 'اقدامات حساس در صف تایید ۱-کلیکی' },
              { key: 'notifyUserRequests', label: 'ثبت درخواست کاربر و فرم‌های جدید' },
              { key: 'notifyOrdersAndFailures', label: 'سفارش‌های موفق و پرداخت‌های ناموفق' },
              { key: 'notifyCriticalErrors', label: 'خطاهای بحرانی سرور و سیستم' },
              { key: 'notifyAgentEscalations', label: 'مکالمات نیازمند بررسی مدیر در چت زنده' },
            ].map((item) => {
              const k = item.key as keyof BaleAlertsState;
              return (
                <label
                  key={item.key}
                  className="flex items-center gap-2 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(baleAlerts[k])}
                    onChange={(e) => setBaleAlerts((prev) => ({ ...prev, [k]: e.target.checked }))}
                    className="w-4 h-4 accent-teal-600 rounded shrink-0"
                  />
                  <span className="font-bold text-stone-700 dark:text-stone-300">{item.label}</span>
                </label>
              );
            })}
          </div>

          {/* Daily Briefing Sub-bar */}
          <div className="p-3.5 rounded-xl border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sun className="w-4 h-4 text-amber-600 shrink-0" />
              <label className="flex items-center gap-2 text-xs font-extrabold text-stone-800 dark:text-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={baleAlerts.dailyBriefingEnabled}
                  onChange={(e) => setBaleAlerts((prev) => ({ ...prev, dailyBriefingEnabled: e.target.checked }))}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                ارسال خودکار گزارش صبحگاهی روزانه به بله
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-600 dark:text-stone-400 font-bold">ساعت اجرا (تهران):</span>
              <input
                type="time"
                dir="ltr"
                value={baleAlerts.dailyBriefingTime || '09:00'}
                onChange={(e) => setBaleAlerts((prev) => ({ ...prev, dailyBriefingTime: e.target.value }))}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={savingAlerts}
              onClick={() => void handleSaveAlertsAndBriefing()}
              className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {savingAlerts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              ذخیره تنظیمات هشدارها و گزارش صبحگاهی
            </button>
            <button
              type="button"
              disabled={testingAlert}
              onClick={() => void handleTestAgentAlert()}
              className="px-3.5 py-2.5 rounded-xl border border-teal-500/40 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {testingAlert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              ارسال تست هشدار ایجنت به بله
            </button>
            <button
              type="button"
              disabled={testingBriefing}
              onClick={() => void handleTestDailyBriefing()}
              className="px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {testingBriefing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sun className="w-3.5 h-3.5" />}
              ارسال تست گزارش صبحگاهی
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4 & 5: Two-Column Grid for Bale Channel Publishing + Auto-Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 4: Bale Channel Social Publisher */}
        {isSuperAdmin && (
          <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                    ۴. انتشار خودکار محتوا در کانال بله
                  </h4>
                  <p className="text-[11px] text-stone-500">ارسال خودکار محصولات و مقالات با همان توکن بازوی بخش ۱</p>
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={socialState.baleChannelEnabled}
                  onChange={(e) =>
                    setSocialState((prev) => ({ ...prev, baleChannelEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                فعال
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                آیدی یا شناسه عددی کانال بله
              </label>
              <input
                type="text"
                dir="ltr"
                value={socialState.baleChannelId}
                onChange={(e) => setSocialState((prev) => ({ ...prev, baleChannelId: e.target.value }))}
                placeholder="@my_bale_channel"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
              />
              <p className="text-[10.5px] text-stone-500 mt-1">
                بازوی بله را به‌عنوان «مدیر (Admin)» با دسترسی ارسال پیام به این کانال اضافه کنید.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={socialState.requireApprovalBeforePublish}
                onChange={(e) =>
                  setSocialState((prev) => ({ ...prev, requireApprovalBeforePublish: e.target.checked }))
                }
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              قبل از انتشار خودکار، ابتدا در «صف تایید ۱-کلیکی» منتظر تایید مدیر بماند
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={savingSocial}
                onClick={() => void handleSaveBaleChannel()}
                className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {savingSocial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                ذخیره تنظیمات کانال
              </button>
              <button
                type="button"
                disabled={testingSocial}
                onClick={() => void handleTestBaleChannel()}
                className="px-3.5 py-2 rounded-xl border border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {testingSocial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                تست ارسال پست در کانال
              </button>
            </div>
          </div>
        )}

        {/* SECTION 5: Auto-Backup Dispatch to Bale */}
        <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-stone-900 dark:text-white">
                  ۵. ارسال بکاپ خودکار دیتابیس به بله
                </h4>
                <p className="text-[11px] text-stone-500">ارسال فایل نسخه پشتیبان به چت یا کانال آرشیو بله</p>
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(backupCfg.baleEnabled)}
                onChange={(e) => setBackupCfg((prev) => ({ ...prev, baleEnabled: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              فعال
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                شناسه چت یا کانال مقصد فایل‌های بکاپ (<span className="font-mono" dir="ltr">chat_id</span>)
              </label>
              {(baleAlerts.overrideChatId || baleCred.baleChatId) && (
                <button
                  type="button"
                  onClick={() =>
                    setBackupCfg((prev) => ({
                      ...prev,
                      baleChatId: (baleAlerts.overrideChatId || baleCred.baleChatId || '').trim(),
                    }))
                  }
                  className="text-[10.5px] font-extrabold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                >
                  کپی از chat_id سوپر ادمین
                </button>
              )}
            </div>
            <input
              type="text"
              dir="ltr"
              value={backupCfg.baleChatId || ''}
              onChange={(e) => setBackupCfg((prev) => ({ ...prev, baleChatId: e.target.value }))}
              placeholder="123456789 یا @backup_channel"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950"
            />
            <p className="text-[10.5px] text-stone-500 mt-1">
              فایل پشتیبان با استفاده از توکن بازوی ذخیره شده در بخش ۱ به این مقصد ارسال می‌شود.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={savingBackup}
              onClick={() => void handleSaveBackupBale()}
              className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {savingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              ذخیره تنظیمات بکاپ بله
            </button>
            <button
              type="button"
              disabled={testingBackup}
              onClick={() => void handleTestBackupBale()}
              className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {testingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              تست ارسال پیام بکاپ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
