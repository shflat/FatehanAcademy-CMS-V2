import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BellRing,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  KeyRound,
  Link2,
  Loader2,
  Mic,
  Paperclip,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Square,
  Sun,
  Volume2,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
import { AiScheduledTasksCard, type AgentTaskItem } from './AiScheduledTasksCard';
import {
  AiJarvisSettingsCard,
  DEFAULT_JARVIS_UI_SETTINGS,
  type JarvisSettingsUiConfig,
} from './AiJarvisSettingsCard';
import { AiSocialPublisherCard } from './AiSocialPublisherCard';
import { playJarvisMessageAudio, stopJarvisSpeech } from './jarvisTtsPlayer';
import { encodeAudioBlobToMono16kWav } from './voiceWavEncoder';
import {
  getSavedVoiceMode,
  isBrowserSpeechSupported,
  saveVoiceMode,
  startBrowserPersianSpeech,
  type BrowserSpeechRecognitionHandle,
  type JarvisVoiceInputMode,
} from './browserSpeechHelper';
import { SafeMarkdownText } from './SafeMarkdownText';

interface AgentConversation {
  id: string;
  channel: string;
  role: string;
  message_text: string;
  tool_calls_json?: string;
  created_at_fa: string;
}

export interface BaleAlertsUiConfig {
  enabled: boolean;
  notifyApprovals: boolean;
  notifyUserRequests: boolean;
  notifyOrdersAndFailures: boolean;
  notifyCriticalErrors: boolean;
  notifyAgentEscalations: boolean;
  overrideChatId: string;
  baleBotTokenMasked?: string;
  hasDirectBaleBotToken?: boolean;
  dailyBriefingEnabled?: boolean;
  dailyBriefingTime?: string;
  lastBriefingDate?: string;
  heartbeatEnabled?: boolean;
}

const DEFAULT_BALE_ALERTS_UI: BaleAlertsUiConfig = {
  enabled: true,
  notifyApprovals: true,
  notifyUserRequests: true,
  notifyOrdersAndFailures: true,
  notifyCriticalErrors: true,
  notifyAgentEscalations: true,
  overrideChatId: '',
  baleBotTokenMasked: '',
  hasDirectBaleBotToken: false,
  dailyBriefingEnabled: false,
  dailyBriefingTime: '09:00',
  lastBriefingDate: '',
  heartbeatEnabled: true,
};

type AgentTask = AgentTaskItem;

export const AiCommandCenterCard: React.FC<{
  agentMode: 'light' | 'autonomous_24_7';
  liveChatAutoReply: boolean;
  autoProfileCompletion: boolean;
  botBridgeEnabled: boolean;
  baleAlerts?: BaleAlertsUiConfig;
  jarvisSettings?: JarvisSettingsUiConfig;
  tasks: AgentTask[];
  conversations: AgentConversation[];
  onRefresh: () => void;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({
  agentMode,
  liveChatAutoReply,
  autoProfileCompletion,
  botBridgeEnabled,
  baleAlerts,
  jarvisSettings,
  tasks,
  conversations,
  onRefresh,
  onNotice,
}) => {
  const effectiveBaleAlerts: BaleAlertsUiConfig = {
    ...DEFAULT_BALE_ALERTS_UI,
    ...(baleAlerts || {}),
  };
  const effectiveJarvis: JarvisSettingsUiConfig = {
    ...DEFAULT_JARVIS_UI_SETTINGS,
    ...(jarvisSettings || {}),
  };
  const [command, setCommand] = useState('');
  const [attachedMdFile, setAttachedMdFile] = useState<{
    fileName: string;
    content: string;
    sizeKb: number;
  } | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState<JarvisVoiceInputMode>(getSavedVoiceMode);
  const [browserSpeechSupported] = useState<boolean>(() => isBrowserSpeechSupported());
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [testingBridge, setTestingBridge] = useState(false);
  const [testingBaleAlert, setTestingBaleAlert] = useState(false);
  const [baleOverrideChatId, setBaleOverrideChatId] = useState(effectiveBaleAlerts.overrideChatId || '');
  const [baleBotTokenInput, setBaleBotTokenInput] = useState(effectiveBaleAlerts.baleBotTokenMasked || '');
  const [savingBaleToken, setSavingBaleToken] = useState(false);
  const [baleBriefingTime, setBaleBriefingTime] = useState(effectiveBaleAlerts.dailyBriefingTime || '09:00');
  const [baleTestResult, setBaleTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [startingPair, setStartingPair] = useState(false);
  const [verifyingPair, setVerifyingPair] = useState(false);
  const [copiedPairCmd, setCopiedPairCmd] = useState(false);
  const [balePairSession, setBalePairSession] = useState<{
    code: string;
    command: string;
    deepLink: string;
    botUsername: string;
  } | null>(null);
  const [testingBriefing, setTestingBriefing] = useState(false);
  const [testingAgent, setTestingAgent] = useState(false);
  const [agentConnStatus, setAgentConnStatus] = useState<{
    connected: boolean;
    latencyMs?: number;
    message: string;
    hint?: string;
  } | null>(null);

  const mdFileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const browserSpeechRef = useRef<BrowserSpeechRecognitionHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStreamTracks = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      try {
        browserSpeechRef.current?.abort();
        browserSpeechRef.current = null;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore cleanup stop error
      }
      stopStreamTracks();
      stopJarvisSpeech();
    };
  }, []);

  const handleTestAgent247 = async () => {
    setTestingAgent(true);
    try {
      const { ok, data } = await apiJson<{
        connected?: boolean;
        latencyMs?: number;
        message?: string;
        error?: string;
        hint?: string;
      }>('/api/v1/modules/ai-hub/slots/test', {
        method: 'POST',
        body: JSON.stringify({ slotKey: 'agent_core' }),
      });
      const connected = Boolean(ok && data.connected);
      const msg =
        data.message ||
        data.error ||
        (connected ? 'اتصال هسته هوش مصنوعی ۲۴/۷ برقرار است.' : 'هسته هوش مصنوعی ۲۴/۷ متصل نیست.');
      setAgentConnStatus({
        connected,
        latencyMs: data.latencyMs,
        message: msg,
        hint: data.hint,
      });
      onNotice?.(connected ? 'success' : 'error', msg);
    } finally {
      setTestingAgent(false);
    }
  };

  useEffect(() => {
    setBaleOverrideChatId(baleAlerts?.overrideChatId || '');
  }, [baleAlerts?.overrideChatId]);

  useEffect(() => {
    setBaleBotTokenInput(baleAlerts?.baleBotTokenMasked || '');
  }, [baleAlerts?.baleBotTokenMasked]);

  useEffect(() => {
    setBaleBriefingTime(baleAlerts?.dailyBriefingTime || '09:00');
  }, [baleAlerts?.dailyBriefingTime]);

  const handleToggleSettings = async (patch: Record<string, unknown>) => {
    const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
      '/api/v1/modules/ai-hub/agent/mode',
      {
        method: 'POST',
        body: JSON.stringify({
          agentMode,
          liveChatAutoReply,
          autoProfileCompletion,
          botBridgeEnabled,
          ...patch,
        }),
      }
    );
    if (!ok) {
      onNotice?.('error', data.error || 'خطا در تغییر تنظیمات ایجنت');
      return;
    }
    onNotice?.('success', 'پیکربندی ایجنت ۲۴/۷ با موفقیت به‌روزرسانی شد.');
    onRefresh();
  };

  const handleToggleBaleAlerts = async (
    patch: Partial<BaleAlertsUiConfig> & { baleBotToken?: string }
  ) => {
    const {
      baleBotTokenMasked: _masked,
      hasDirectBaleBotToken: _hasDirect,
      ...safeCurrent
    } = effectiveBaleAlerts;
    await handleToggleSettings({
      baleAlerts: {
        ...safeCurrent,
        ...patch,
      },
    });
  };

  const handleSaveDirectBaleToken = async () => {
    setSavingBaleToken(true);
    try {
      await handleToggleBaleAlerts({ baleBotToken: baleBotTokenInput.trim() });
    } finally {
      setSavingBaleToken(false);
    }
  };

  const handleTestBaleAdminAlert = async () => {
    setTestingBaleAlert(true);
    setBaleTestResult(null);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        sent?: boolean;
        chatId?: string;
        channelSource?: string;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/bale-alerts/test', {
        method: 'POST',
      });
      if (ok && data.sent) {
        const msg = `هشدار تست ایجنت ۲۴/۷ با موفقیت به بله ارسال شد (chat_id: ${data.chatId || '-'} · منبع: ${data.channelSource || 'بله'}).`;
        setBaleTestResult({ ok: true, text: msg });
        onNotice?.('success', msg);
      } else {
        const err = data.error || 'ارسال تست هشدار به بله ناموفق بود.';
        setBaleTestResult({ ok: false, text: err });
        onNotice?.('error', err);
      }
    } finally {
      setTestingBaleAlert(false);
    }
  };

  const handleStartBalePair = async () => {
    setStartingPair(true);
    setBaleTestResult(null);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        code?: string;
        command?: string;
        deepLink?: string;
        botUsername?: string;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/bale-pair/start', { method: 'POST' });
      if (!ok || !data.code) {
        const err = data.error || 'شروع اتصال یک‌کلیکی بله ناموفق بود.';
        setBaleTestResult({ ok: false, text: err });
        onNotice?.('error', err);
        return;
      }
      setBalePairSession({
        code: data.code,
        command: data.command || `/start ${data.code}`,
        deepLink: data.deepLink || '',
        botUsername: data.botUsername || '',
      });
      onNotice?.(
        'success',
        'کد اتصال یک‌بارمصرف بله (اعتبار ۱۰ دقیقه) ساخته شد. روی لینک ربات کلیک کرده و سپس دکمه «بررسی و ذخیره خودکار» را بزنید.'
      );
    } finally {
      setStartingPair(false);
    }
  };

  const handleVerifyBalePair = async () => {
    if (!balePairSession) return;
    setVerifyingPair(true);
    setBaleTestResult(null);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        paired?: boolean;
        chatId?: string;
        senderName?: string;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/bale-pair/verify', {
        method: 'POST',
        body: JSON.stringify({ code: balePairSession.code }),
      });
      if (ok && data.paired && data.chatId) {
        setBaleOverrideChatId(data.chatId);
        setBalePairSession(null);
        const msg = `اتصال یک‌کلیکی بله با موفقیت انجام شد! chat_id شما (${data.chatId}) به‌صورت خودکار ذخیره و پیام تایید به بله ارسال شد.`;
        setBaleTestResult({ ok: true, text: msg });
        onNotice?.('success', msg);
        onRefresh();
      } else {
        const err = data.error || 'هنوز پیام اتصال در ربات دریافت نشده است.';
        setBaleTestResult({ ok: false, text: err });
        onNotice?.('error', err);
      }
    } finally {
      setVerifyingPair(false);
    }
  };

  const handleTestDailyBriefing = async () => {
    setTestingBriefing(true);
    setBaleTestResult(null);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        sent?: boolean;
        chatId?: string;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/daily-briefing/test', { method: 'POST' });
      if (ok && data.sent) {
        const msg = `گزارش صبحگاهی تست ۲۴ ساعته با موفقیت به بله ارسال شد (chat_id: ${data.chatId || '-'}).`;
        setBaleTestResult({ ok: true, text: msg });
        onNotice?.('success', msg);
      } else {
        const err = data.error || 'ارسال تست گزارش صبحگاهی ناموفق بود.';
        setBaleTestResult({ ok: false, text: err });
        onNotice?.('error', err);
      }
    } finally {
      setTestingBriefing(false);
    }
  };

  const pickPreferredAudioMime = (): string => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];
    return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || '';
  };

  const transcribeRecordedBlob = async (blob: Blob, _mimeType: string) => {
    if (blob.size < 128) {
      onNotice?.('error', 'فایل صوتی ضبط‌شده بسیار کوتاه یا خالی بود.');
      return;
    }
    setTranscribing(true);
    try {
      const wavBlob = await encodeAudioBlobToMono16kWav(blob);
      const form = new FormData();
      form.append('file', wavBlob, 'voice.wav');
      form.append('language', 'fa');

      const { ok, data } = await apiJson<{
        ok?: boolean;
        text?: string;
        modelUsed?: string;
        latencyMs?: number;
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/transcribe', {
        method: 'POST',
        body: form,
      });

      if (!ok || !data.text) {
        onNotice?.('error', data.error || 'خطا در تبدیل ویس به متن (اسلات ۴ صوت را بررسی کنید).');
        return;
      }

      const transcript = data.text.trim();
      setCommand((prev) => (prev ? `${prev} ${transcript}` : transcript));
      onNotice?.(
        'success',
        `ویس فارسی با ${data.modelUsed || 'Whisper'} تبدیل شد${
          data.latencyMs ? ` (${data.latencyMs}ms)` : ''
        }.`
      );
    } catch (err) {
      onNotice?.(
        'error',
        err instanceof Error ? err.message : 'خطا در ارسال ویس به سرور تبدیل گفتار'
      );
    } finally {
      setTranscribing(false);
    }
  };

  const handleSwitchVoiceMode = () => {
    if (recording || transcribing) return;
    if (voiceMode === 'whisper' && !browserSpeechSupported) {
      onNotice?.('error', 'مرورگر فعلی از SpeechRecognition رایگان پشتیبانی نمی‌کند.');
      return;
    }
    const next: JarvisVoiceInputMode = voiceMode === 'whisper' ? 'browser_free' : 'whisper';
    setVoiceMode(next);
    saveVoiceMode(next);
  };

  const handleVoiceToggle = async () => {
    if (transcribing) return;

    // $0 Browser SpeechRecognition (fa-IR) mode
    if (voiceMode === 'browser_free') {
      if (recording && browserSpeechRef.current) {
        browserSpeechRef.current.stop();
        return;
      }
      const baseText = command.trim();
      const handle = startBrowserPersianSpeech({
        onTranscript: (text) => {
          setCommand(baseText ? `${baseText} ${text}` : text);
        },
        onEnd: () => {
          browserSpeechRef.current = null;
          stopStreamTracks();
          setRecording(false);
          setRecordingSeconds(0);
        },
        onError: (msg) => {
          browserSpeechRef.current = null;
          stopStreamTracks();
          setRecording(false);
          setRecordingSeconds(0);
          onNotice?.('error', msg);
        },
      });
      if (handle) {
        browserSpeechRef.current = handle;
        setRecording(true);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((sec) => sec + 1);
        }, 1000);
      }
      return;
    }

    // Stop active recording -> triggers onstop -> sends to Slot 4 Whisper STT
    if (recording && mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        stopStreamTracks();
        setRecording(false);
      }
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      onNotice?.(
        'error',
        'مرورگر فعلی یا دسترسی محیط امن (HTTPS) از ضبط میکروفون MediaRecorder پشتیبانی نمی‌کند.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const chosenMime = pickPreferredAudioMime();
      const recorder = chosenMime
        ? new MediaRecorder(stream, { mimeType: chosenMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const effectiveMime = recorder.mimeType || chosenMime || 'audio/webm';
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        stopStreamTracks();
        setRecording(false);
        setRecordingSeconds(0);
        const audioBlob = new Blob(chunks, { type: effectiveMime });
        void transcribeRecordedBlob(audioBlob, effectiveMime);
      };

      recorder.onerror = () => {
        mediaRecorderRef.current = null;
        stopStreamTracks();
        setRecording(false);
        setRecordingSeconds(0);
        onNotice?.('error', 'خطا هنگام ضبط صدا از میکروفون رخ داد.');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      stopStreamTracks();
      setRecording(false);
      const rawMsg = err instanceof Error ? err.message : '';
      onNotice?.(
        'error',
        /Permission|NotAllowed|denied/i.test(rawMsg)
          ? 'دسترسی به میکروفون توسط مرورگر مسدود شده است. لطفاً مجوز میکروفون را فعال کنید.'
          : 'امکان شروع ضبط صدا از میکروفون وجود ندارد.'
      );
    }
  };

  const handleSelectMdFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    if (file.size > 120 * 1024) {
      onNotice?.('error', 'حجم فایل .md یا متنی نباید بیشتر از ۱۲۰ کیلوبایت باشد.');
      return;
    }
    try {
      const content = (await file.text()).trim();
      if (!content) {
        onNotice?.('error', 'فایل انتخاب‌شده خالی است.');
        return;
      }
      setAttachedMdFile({
        fileName: file.name,
        content: content.slice(0, 24000),
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
      });
      if (!command.trim()) {
        setCommand('این فایل را تبدیل به محصول سئوشده کن');
      }
    } catch {
      onNotice?.('error', 'خواندن فایل انتخاب‌شده ناموفق بود.');
    }
  };

  const handleRunCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() && !attachedMdFile) return;
    const currentFile = attachedMdFile;
    setSending(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/ai-hub/agent/command',
        {
          method: 'POST',
          body: JSON.stringify({
            command: command.trim(),
            channel: 'command_center',
            ...(currentFile
              ? {
                  attachedMarkdown: {
                    fileName: currentFile.fileName,
                    content: currentFile.content,
                  },
                }
              : {}),
          }),
        }
      );
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در اجرای فرمان ایجنت');
        return;
      }
      setCommand('');
      setAttachedMdFile(null);
      onRefresh();
    } finally {
      setSending(false);
    }
  };

  const handleTestBotBridge = async () => {
    setTestingBridge(true);
    try {
      const { ok, data } = await apiJson<{ sentCount?: number; details?: string[]; error?: string }>(
        '/api/v1/modules/ai-hub/agent/bot-bridge/test',
        { method: 'POST' }
      );
      if (ok) {
        onNotice?.(
          'success',
          `تست پل ربات انجام شد (${data.sentCount || 0} کانال ارسال موفق · ثبت در لاگ یکپارچه).`
        );
      } else {
        onNotice?.('error', data.error || 'خطا در تست پل ربات');
      }
    } finally {
      setTestingBridge(false);
    }
  };

  const handleToggleSpeak = async (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      stopJarvisSpeech();
      setSpeakingMsgId(null);
      return;
    }
    setSpeakingMsgId(msgId);
    await playJarvisMessageAudio({
      text,
      config: effectiveJarvis,
      isAutoPlay: false,
      onStart: () => setSpeakingMsgId(msgId),
      onEnd: () => setSpeakingMsgId((curr) => (curr === msgId ? null : curr)),
      onError: (msg) => {
        setSpeakingMsgId((curr) => (curr === msgId ? null : curr));
        onNotice?.('error', msg);
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Phase 14.1.1 — Granular Jarvis & Agent Feature Master Switches */}
      <AiJarvisSettingsCard
        jarvisSettings={effectiveJarvis}
        liveChatAutoReply={liveChatAutoReply}
        onSaveSettings={handleToggleSettings}
        onNotice={onNotice}
      />

      {/* Mode Switcher: Light vs 24/7 Autonomous */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-stone-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              حالت عملیاتی ایجنت (Light vs 24/7)
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                agentMode === 'autonomous_24_7'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-600'
              }`}
            >
              {agentMode === 'autonomous_24_7' ? 'خودکار ۲۴/۷ فعال' : 'حالت سبک (Light)'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleToggleSettings({ agentMode: 'light' })}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold cursor-pointer border ${
                agentMode === 'light'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 border-transparent'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700'
              }`}
            >
              حالت سبک (دستی)
            </button>
            <button
              type="button"
              onClick={() => void handleToggleSettings({ agentMode: 'autonomous_24_7' })}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold cursor-pointer border ${
                agentMode === 'autonomous_24_7'
                  ? 'bg-emerald-600 text-white border-transparent'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700'
              }`}
            >
              حالت پیشرفته ۲۴/۷
            </button>
          </div>
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={testingAgent}
              onClick={() => void handleTestAgent247()}
              className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {testingAgent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Activity className="w-3.5 h-3.5" />
              )}
              <span>{testingAgent ? 'در حال بررسی اتصال...' : 'تست اتصال هسته هوش مصنوعی ۲۴/۷'}</span>
            </button>
          </div>
          {agentConnStatus && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] space-y-0.5 ${
                agentConnStatus.connected
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-extrabold">
                <span className="inline-flex items-center gap-1">
                  {agentConnStatus.connected ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>{agentConnStatus.connected ? 'متصل و آماده پاسخگویی' : 'عدم اتصال'}</span>
                </span>
                {typeof agentConnStatus.latencyMs === 'number' && (
                  <span className="font-mono text-[10px]" dir="ltr">
                    {agentConnStatus.latencyMs}ms
                  </span>
                )}
              </div>
              <p className="leading-relaxed">{agentConnStatus.message}</p>
              {agentConnStatus.hint && <p className="text-[10px] opacity-85">💡 {agentConnStatus.hint}</p>}
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 space-y-2 text-xs">
          <div className="font-extrabold text-stone-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#1D4ED8]" />
              اتوماسیون چت و پل ربات (بله / ایتا / تلگرام)
            </span>
            <button
              type="button"
              disabled={testingBridge}
              onClick={() => void handleTestBotBridge()}
              className="px-2.5 py-1 rounded-lg bg-[#1D4ED8]/10 text-[#1D4ED8] text-[10px] font-extrabold cursor-pointer"
            >
              {testingBridge ? 'در حال ارسال...' : 'تست پل ربات'}
            </button>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={liveChatAutoReply}
                onChange={(e) => void handleToggleSettings({ liveChatAutoReply: e.target.checked })}
              />
              <span>پاسخگویی هوشمند چت زنده</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={autoProfileCompletion}
                onChange={(e) =>
                  void handleToggleSettings({ autoProfileCompletion: e.target.checked })
                }
              />
              <span>تکمیل خودکار نام کاربر (Tool)</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={botBridgeEnabled}
                onChange={(e) => void handleToggleSettings({ botBridgeEnabled: e.target.checked })}
              />
              <span>پل ربات بله/ایتا/تلگرام</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bale Admin Alerts Settings Card (Phase 13.3.1) */}
      <div className="p-4 rounded-2xl border border-teal-500/30 bg-teal-50/40 dark:bg-teal-950/20 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <div>
              <h4 className="font-extrabold text-stone-900 dark:text-white">
                هشدارهای هوشمند سوپر ادمین در پیام‌رسان بله (Bale Admin Alerts)
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                ارسال خودکار گزارش‌های فوری از طریق ربات بله (Bot API) بدون نیاز به باز بودن پنل ادمین
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-extrabold cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveBaleAlerts.enabled}
                onChange={(e) => void handleToggleBaleAlerts({ enabled: e.target.checked })}
              />
              <span>{effectiveBaleAlerts.enabled ? 'فعال' : 'غیرفعال'}</span>
            </label>
            <button
              type="button"
              disabled={testingBaleAlert}
              onClick={() => void handleTestBaleAdminAlert()}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {testingBaleAlert ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{testingBaleAlert ? 'در حال ارسال...' : 'ارسال تست هشدار ایجنت به بله'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <label className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 cursor-pointer font-bold">
            <input
              type="checkbox"
              disabled={!effectiveBaleAlerts.enabled}
              checked={effectiveBaleAlerts.notifyApprovals}
              onChange={(e) => void handleToggleBaleAlerts({ notifyApprovals: e.target.checked })}
            />
            <span>اقدامات حساس نیازمند تایید (صف تایید)</span>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 cursor-pointer font-bold">
            <input
              type="checkbox"
              disabled={!effectiveBaleAlerts.enabled}
              checked={effectiveBaleAlerts.notifyUserRequests}
              onChange={(e) => void handleToggleBaleAlerts({ notifyUserRequests: e.target.checked })}
            />
            <span>درخواست‌های جدید چت و فرم‌ها (mod_forms)</span>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 cursor-pointer font-bold">
            <input
              type="checkbox"
              disabled={!effectiveBaleAlerts.enabled}
              checked={effectiveBaleAlerts.notifyOrdersAndFailures}
              onChange={(e) =>
                void handleToggleBaleAlerts({ notifyOrdersAndFailures: e.target.checked })
              }
            />
            <span>سفارش‌های پرداخت‌شده و خریدهای ناموفق</span>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 cursor-pointer font-bold">
            <input
              type="checkbox"
              disabled={!effectiveBaleAlerts.enabled}
              checked={effectiveBaleAlerts.notifyCriticalErrors}
              onChange={(e) =>
                void handleToggleBaleAlerts({ notifyCriticalErrors: e.target.checked })
              }
            />
            <span>خطاهای بحرانی سامانه (system_logs با ضداسپم)</span>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800 cursor-pointer font-bold">
            <input
              type="checkbox"
              disabled={!effectiveBaleAlerts.enabled}
              checked={effectiveBaleAlerts.notifyAgentEscalations}
              onChange={(e) =>
                void handleToggleBaleAlerts({ notifyAgentEscalations: e.target.checked })
              }
            />
            <span>ارجاع سوالات بی‌پاسخ توسط ابزار ایجنت</span>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-800/70 cursor-pointer font-bold">
            <input
              type="checkbox"
              disabled={!effectiveBaleAlerts.enabled}
              checked={effectiveBaleAlerts.heartbeatEnabled !== false}
              onChange={(e) =>
                void handleToggleBaleAlerts({ heartbeatEnabled: e.target.checked })
              }
            />
            <span>پایش صفرتوکن ۲ دقیقه‌ای (چت، سفارش ناموفق و خطا · ۰ توکن)</span>
          </label>
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white/80 dark:bg-stone-900/70 border border-stone-200/80 dark:border-stone-800">
            <input
              type="text"
              dir="ltr"
              value={baleOverrideChatId}
              onChange={(e) => setBaleOverrideChatId(e.target.value)}
              placeholder="chat_id اختیاری (یا اتصال یک‌کلیکی)"
              className="flex-1 min-w-0 px-2 py-1 text-[11px] font-mono bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() =>
                void handleToggleBaleAlerts({ overrideChatId: baleOverrideChatId.trim() })
              }
              className="px-2 py-1 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-[10px] font-extrabold cursor-pointer shrink-0"
            >
              ذخیره
            </button>
          </div>
        </div>

        {/* Direct Encrypted Bale Bot API Token (Priority #1, falls back to SMS Hub & Bot Bridge) */}
        <div className="p-2.5 rounded-xl bg-white/85 dark:bg-stone-900/75 border border-teal-500/25 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <KeyRound className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="font-extrabold text-stone-900 dark:text-white text-[11px]">
              توکن ربات بله (Bot API Token):
            </span>
            {effectiveBaleAlerts.hasDirectBaleBotToken && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold">
                رمزنگاری AES-256-GCM
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <input
              type="password"
              dir="ltr"
              autoComplete="off"
              value={baleBotTokenInput}
              onChange={(e) => setBaleBotTokenInput(e.target.value)}
              placeholder="مثال: 123456789:AbCdEf... (اختیاری — از هاب پیامک بله نیز خودکار خوانده می‌شود)"
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-[11px] outline-none focus:border-teal-500"
            />
            <button
              type="button"
              disabled={savingBaleToken}
              onClick={() => void handleSaveDirectBaleToken()}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-extrabold cursor-pointer shrink-0 disabled:opacity-50"
            >
              {savingBaleToken ? 'ذخیره...' : 'ذخیره توکن'}
            </button>
          </div>
        </div>

        {/* Phase 14.3.2 — 1-Click Bale Bot Pairing + Daily Morning Briefing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 pt-1">
          {/* 1-Click Bale Pairing */}
          <div className="p-3 rounded-xl bg-white/85 dark:bg-stone-900/75 border border-teal-500/25 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-extrabold text-stone-900 dark:text-white inline-flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-teal-600" />
                <span>اتصال یک‌کلیکی به بله (دریافت خودکار chat_id)</span>
              </span>
              <button
                type="button"
                disabled={startingPair}
                onClick={() => void handleStartBalePair()}
                className="px-2.5 py-1 rounded-lg bg-teal-600/15 hover:bg-teal-600/25 text-teal-800 dark:text-teal-200 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {startingPair ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Link2 className="w-3 h-3" />
                )}
                <span>{startingPair ? 'در حال ساخت کد...' : 'اتصال یک‌کلیکی به بله'}</span>
              </button>
            </div>
            {balePairSession ? (
              <div className="p-2.5 rounded-lg bg-teal-50/80 dark:bg-teal-950/40 border border-teal-300/60 dark:border-teal-800 space-y-2 text-[11px]">
                <div className="text-stone-700 dark:text-stone-200 leading-relaxed">
                  ۱) روی لینک ربات کلیک کرده و دکمه <strong>شروع (Start)</strong> را بزنید یا دستور زیر را در ربات ارسال کنید:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {balePairSession.deepLink && (
                    <a
                      href={balePairSession.deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-[10px] font-extrabold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>باز کردن ربات @{balePairSession.botUsername} در بله</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(balePairSession.command);
                        setCopiedPairCmd(true);
                        setTimeout(() => setCopiedPairCmd(false), 1600);
                      } catch {
                        // ignore clipboard failure
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-mono text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    dir="ltr"
                  >
                    {copiedPairCmd ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{balePairSession.command}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-stone-500">۲) پس از ارسال در بله، دکمه تایید را بزنید:</span>
                  <button
                    type="button"
                    disabled={verifyingPair}
                    onClick={() => void handleVerifyBalePair()}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {verifyingPair ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    <span>{verifyingPair ? 'در حال بررسی...' : 'بررسی و ذخیره خودکار chat_id'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-stone-500">
                بدون نیاز به پیدا کردن دستی chat_id؛ یک لینک یک‌بارمصرف می‌سازد و پس از استارت ربات، شناسه چت شما را خودکار ذخیره می‌کند.
              </p>
            )}
          </div>

          {/* Daily Morning Briefing (OFF by default) */}
          <div className="p-3 rounded-xl bg-white/85 dark:bg-stone-900/75 border border-amber-500/25 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 font-extrabold text-stone-900 dark:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(effectiveBaleAlerts.dailyBriefingEnabled)}
                  onChange={(e) =>
                    void handleToggleBaleAlerts({ dailyBriefingEnabled: e.target.checked })
                  }
                />
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>گزارش صبحگاهی روزانه به بله (آمار ۲۴ ساعته)</span>
              </label>
              <button
                type="button"
                disabled={testingBriefing}
                onClick={() => void handleTestDailyBriefing()}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {testingBriefing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>{testingBriefing ? 'در حال ارسال...' : 'ارسال گزارش صبحگاهی تست'}</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-stone-500">ساعت ارسال (به وقت تهران):</span>
              <input
                type="time"
                dir="ltr"
                value={baleBriefingTime}
                onChange={(e) => setBaleBriefingTime(e.target.value)}
                className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={() =>
                  void handleToggleBaleAlerts({ dailyBriefingTime: baleBriefingTime || '09:00' })
                }
                className="px-2.5 py-1 rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-950 text-[10px] font-extrabold cursor-pointer"
              >
                ذخیره ساعت
              </button>
              {effectiveBaleAlerts.lastBriefingDate && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                  آخرین ارسال: {effectiveBaleAlerts.lastBriefingDate}
                </span>
              )}
            </div>
            <p className="text-[10px] text-stone-500">
              شامل فروش موفق، خریدهای ناموفق، کاربران جدید، درخواست‌های فرم/چت و خطاهای بحرانی (به‌صورت پیش‌فرض خاموش و مقاوم در برابر ریستارت).
            </p>
          </div>
        </div>

        {baleTestResult && (
          <div
            className={`p-2.5 rounded-xl border text-[11px] font-bold ${
              baleTestResult.ok
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                : 'border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-200'
            }`}
          >
            {baleTestResult.text}
          </div>
        )}
      </div>

      {/* Phase 14.3.1 — Multi-Channel Social Publisher Settings Card */}
      <AiSocialPublisherCard
        allowSocialPublisher={effectiveJarvis.allowSocialPublisher}
        onNotice={onNotice}
      />

      {/* Voice-Ready Command Center */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold text-stone-900 dark:text-white">
            <Bot className="w-4 h-4 text-[#1D4ED8]" />
            <span>مرکز فرماندهی ایجنت (Command Center — آماده ویس فارسی)</span>
          </div>
          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            اختصاصی سوپر ادمین
          </span>
        </div>

        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          onWheel={(e) => e.stopPropagation()}
          className="h-60 overflow-y-auto overscroll-contain p-4 space-y-2.5 bg-stone-50/50 dark:bg-stone-950/60"
        >
          {conversations.length === 0 ? (
            <div className="text-center text-xs text-stone-400 py-14">
              فرمان متنی یا صوتی خود را وارد کنید (مثلاً: «گزارش پیام‌های فوری و پیشنهاد سئو را در صف تایید ثبت کن»).
            </div>
          ) : (
            conversations.map((c) => {
              let parsedTools: { tool?: string; summary?: string; ok?: boolean }[] = [];
              if (c.tool_calls_json && c.role === 'assistant') {
                try {
                  const arr = JSON.parse(c.tool_calls_json);
                  if (Array.isArray(arr)) parsedTools = arr;
                } catch {
                  // ignore malformed JSON
                }
              }
              return (
                <div
                  key={c.id}
                  className={`flex flex-col ${c.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs space-y-1.5 ${
                      c.role === 'user'
                        ? 'bg-[#1D4ED8] text-white'
                        : c.role === 'tool'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100'
                    }`}
                  >
                    <div className="text-[10px] font-extrabold opacity-75 flex items-center gap-1">
                      {c.role === 'tool' && <Wrench className="w-3 h-3" />}
                      <span>
                        {c.role === 'user'
                          ? 'سوپر ادمین'
                          : c.role === 'tool'
                          ? 'اجرای ابزار بک‌اند'
                          : 'ایجنت ۲۴/۷'}
                      </span>
                    </div>
                    {c.role === 'assistant' ? (
                      <SafeMarkdownText text={c.message_text} />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{c.message_text}</p>
                    )}
                    {parsedTools.length > 0 && (
                      <div className="pt-1.5 mt-1 border-t border-stone-200/70 dark:border-stone-700/70 space-y-1">
                        {parsedTools.map((t, idx) => (
                          <div
                            key={`${c.id}_tool_${idx}`}
                            className="flex items-start gap-1.5 text-[10px] rounded-lg px-2 py-1 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/60"
                          >
                            <Wrench className="w-3 h-3 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-mono font-bold" dir="ltr">
                                {t.tool || 'tool'}
                              </span>
                              {t.summary && <span className="mr-1.5 font-normal">· {t.summary}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {c.role === 'assistant' && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleToggleSpeak(c.id, c.message_text)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                            speakingMsgId === c.id
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                              : 'bg-stone-100 dark:bg-stone-700/70 text-stone-600 dark:text-stone-300 hover:bg-indigo-500/15 hover:text-indigo-600'
                          }`}
                        >
                          {speakingMsgId === c.id ? (
                            <>
                              <Square className="w-2.5 h-2.5 fill-current" />
                              <span>توقف صوت</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>پخش صوتی</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 px-1">{c.created_at_fa}</span>
                </div>
              );
            })
          )}
        </div>

        {attachedMdFile && (
          <div className="px-4 py-2 border-t border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/30 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0 font-bold text-indigo-800 dark:text-sky-200">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate" dir="ltr">
                {attachedMdFile.fileName}
              </span>
              <span className="text-[10px] opacity-75 shrink-0">
                ({attachedMdFile.sizeKb} KB · آماده تبدیل به محصول/مقاله)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedMdFile(null)}
              className="p-1 rounded-lg hover:bg-indigo-500/20 text-indigo-700 dark:text-sky-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => void handleRunCommand(e)}
          className="p-3 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2"
        >
          <input
            ref={mdFileInputRef}
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            onChange={(e) => void handleSelectMdFile(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => mdFileInputRef.current?.click()}
            title="آپلود فایل .md یا متنی برای تبدیل به محصول یا مقاله"
            className={`px-2.5 py-2.5 rounded-xl border cursor-pointer transition-colors inline-flex items-center gap-1 text-[11px] font-extrabold shrink-0 ${
              attachedMdFile
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span className="hidden sm:inline">آپلود .md</span>
          </button>
          <button
            type="button"
            disabled={recording || transcribing}
            onClick={handleSwitchVoiceMode}
            title={
              voiceMode === 'browser_free'
                ? 'حالت فعلی: تشخیص گفتار رایگان مرورگر ($0 · fa-IR) — کلیک برای سوییچ به Whisper WAV'
                : 'حالت فعلی: Whisper WAV (اسلات ۴) — کلیک برای سوییچ به میکروفون رایگان مرورگر ($0)'
            }
            className={`px-2 py-2.5 rounded-xl border cursor-pointer transition-colors text-[10px] font-extrabold shrink-0 disabled:opacity-45 ${
              voiceMode === 'browser_free'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            {voiceMode === 'browser_free' ? 'مرورگر ۰$' : 'Whisper'}
          </button>
          <button
            type="button"
            disabled={transcribing}
            onClick={() => void handleVoiceToggle()}
            title={
              transcribing
                ? 'در حال تبدیل ویس به متن با اسلات ۴ (Whisper)...'
                : recording
                ? voiceMode === 'browser_free'
                  ? 'توقف تشخیص گفتار مرورگر'
                  : 'توقف ضبط و تبدیل ویس به متن فارسی'
                : voiceMode === 'browser_free'
                ? 'فرمان صوتی رایگان مرورگر (fa-IR · ۰ دلار)'
                : 'ضبط فرمان صوتی فارسی (اسلات ۴ Whisper STT)'
            }
            className={`px-2.5 py-2.5 rounded-xl border cursor-pointer transition-colors inline-flex items-center gap-1.5 text-[11px] font-extrabold shrink-0 disabled:opacity-60 ${
              recording
                ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                : transcribing
                ? 'bg-violet-600 text-white border-violet-600'
                : voiceMode === 'browser_free'
                ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            {transcribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>تبدیل ویس...</span>
              </>
            ) : recording ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="smooth-nums">
                  توقف ({String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                  {String(recordingSeconds % 60).padStart(2, '0')})
                </span>
              </>
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={
              recording
                ? voiceMode === 'browser_free'
                  ? 'در حال شنیدن فارسی (رایگان مرورگر ۰$)...'
                  : 'در حال ضبط ویس... برای تبدیل به متن دوباره روی دکمه قرمز کلیک کنید'
                : transcribing
                ? 'در حال تبدیل صدا به متن فارسی از طریق اسلات ۴ (Whisper)...'
                : 'فرمان متنی، لینک، فایل .md یا صوتی به ایجنت ۲۴/۷...'
            }
            className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <button
            type="submit"
            disabled={sending || (!command.trim() && !attachedMdFile)}
            className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'اجرا...' : 'ارسال'}</span>
          </button>
        </form>
      </div>

      <AiScheduledTasksCard tasks={tasks} onRefresh={onRefresh} onNotice={onNotice} />
    </div>
  );
};
