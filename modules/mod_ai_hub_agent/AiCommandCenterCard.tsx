import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Loader2,
  Mic,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Square,
  Wrench,
  XCircle,
} from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';
import { AiScheduledTasksCard, type AgentTaskItem } from './AiScheduledTasksCard';

interface AgentConversation {
  id: string;
  channel: string;
  role: string;
  message_text: string;
  tool_calls_json?: string;
  created_at_fa: string;
}

type AgentTask = AgentTaskItem;

export const AiCommandCenterCard: React.FC<{
  agentMode: 'light' | 'autonomous_24_7';
  liveChatAutoReply: boolean;
  autoProfileCompletion: boolean;
  botBridgeEnabled: boolean;
  tasks: AgentTask[];
  conversations: AgentConversation[];
  onRefresh: () => void;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({
  agentMode,
  liveChatAutoReply,
  autoProfileCompletion,
  botBridgeEnabled,
  tasks,
  conversations,
  onRefresh,
  onNotice,
}) => {
  const [command, setCommand] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [testingBridge, setTestingBridge] = useState(false);
  const [testingAgent, setTestingAgent] = useState(false);
  const [agentConnStatus, setAgentConnStatus] = useState<{
    connected: boolean;
    latencyMs?: number;
    message: string;
    hint?: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore cleanup stop error
      }
      stopStreamTracks();
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

  const transcribeRecordedBlob = async (blob: Blob, mimeType: string) => {
    if (blob.size < 128) {
      onNotice?.('error', 'فایل صوتی ضبط‌شده بسیار کوتاه یا خالی بود.');
      return;
    }
    setTranscribing(true);
    try {
      const ext = mimeType.includes('ogg')
        ? 'ogg'
        : mimeType.includes('mp4')
        ? 'm4a'
        : 'webm';
      const form = new FormData();
      form.append('file', blob, `voice_command.${ext}`);
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

  const handleVoiceToggle = async () => {
    if (transcribing) return;

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

  const handleRunCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    setSending(true);
    try {
      const { ok, data } = await apiJson<{ ok?: boolean; error?: string }>(
        '/api/v1/modules/ai-hub/agent/command',
        {
          method: 'POST',
          body: JSON.stringify({ command: command.trim(), channel: 'command_center' }),
        }
      );
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در اجرای فرمان ایجنت');
        return;
      }
      setCommand('');
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

  return (
    <div className="space-y-5">
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
            conversations.map((c) => (
              <div
                key={c.id}
                className={`flex flex-col ${c.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs space-y-1 ${
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
                  <p className="whitespace-pre-wrap leading-relaxed">{c.message_text}</p>
                </div>
                <span className="text-[9px] text-stone-400 mt-0.5 px-1">{c.created_at_fa}</span>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={(e) => void handleRunCommand(e)}
          className="p-3 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2"
        >
          <button
            type="button"
            disabled={transcribing}
            onClick={() => void handleVoiceToggle()}
            title={
              transcribing
                ? 'در حال تبدیل ویس به متن با اسلات ۴ (Whisper)...'
                : recording
                ? 'توقف ضبط و تبدیل ویس به متن فارسی'
                : 'ضبط فرمان صوتی فارسی (اسلات ۴ Whisper STT)'
            }
            className={`px-2.5 py-2.5 rounded-xl border cursor-pointer transition-colors inline-flex items-center gap-1.5 text-[11px] font-extrabold shrink-0 disabled:opacity-60 ${
              recording
                ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                : transcribing
                ? 'bg-violet-600 text-white border-violet-600'
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
                ? 'در حال ضبط ویس... برای تبدیل به متن دوباره روی دکمه قرمز کلیک کنید'
                : transcribing
                ? 'در حال تبدیل صدا به متن فارسی از طریق اسلات ۴ (Whisper)...'
                : 'فرمان متنی یا صوتی به ایجنت ۲۴/۷...'
            }
            className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-xs"
          />
          <button
            type="submit"
            disabled={sending}
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
