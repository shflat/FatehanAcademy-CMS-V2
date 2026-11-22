import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Cpu,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Shield,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import { apiJson, emitGlobalToast } from '../../src/core/apiClient';
import {
  DEFAULT_JARVIS_UI_SETTINGS,
  type JarvisSettingsUiConfig,
} from './AiJarvisSettingsCard';
import {
  playJarvisMessageAudio,
  stopJarvisSpeech,
} from './jarvisTtsPlayer';
import { encodeAudioBlobToMono16kWav } from './voiceWavEncoder';
import { SafeMarkdownText } from './SafeMarkdownText';

export interface JarvisClientPageContext {
  path: string;
  pageTitle: string;
  entityType: 'product' | 'article' | 'order' | 'admin_panel' | 'storefront';
  entityId?: string;
  entitySlug?: string;
}

interface JarvisChatBubble {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAtFa?: string;
  tools?: { tool?: string; summary?: string; ok?: boolean }[];
}

interface SuperAdminJarvisMascotProps {
  pageContext: JarvisClientPageContext;
  elevateBottomOffset?: boolean;
}

const ENTITY_TYPE_LABELS_FA: Record<JarvisClientPageContext['entityType'], string> = {
  product: 'صفحه محصول',
  article: 'صفحه مقاله',
  order: 'سفارش',
  admin_panel: 'پنل مدیریت',
  storefront: 'ویترین فروشگاه',
};

export const SuperAdminJarvisMascot: React.FC<SuperAdminJarvisMascotProps> = ({
  pageContext,
  elevateBottomOffset = false,
}) => {
  const [config, setConfig] = useState<JarvisSettingsUiConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<JarvisChatBubble[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ fileName: string; content: string; sizeKb: number } | null>(null);
  const mdInputRef = useRef<HTMLInputElement | null>(null);

  // Slot 4 Whisper Voice-to-Text recording state
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-message TTS audio state
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fetchJarvisConfig = useCallback(async () => {
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        jarvisSettings?: Partial<JarvisSettingsUiConfig>;
      }>('/api/v1/modules/ai-hub/agent/jarvis-config');
      if (ok && data.jarvisSettings) {
        setConfig({ ...DEFAULT_JARVIS_UI_SETTINGS, ...data.jarvisSettings });
      }
    } catch {
      // keep silent if offline or non-super-admin
    }
  }, []);

  useEffect(() => {
    void fetchJarvisConfig();

    const onUpdated = (ev: Event) => {
      const custom = ev as CustomEvent<Partial<JarvisSettingsUiConfig>>;
      if (custom.detail && typeof custom.detail === 'object') {
        setConfig((prev) => ({
          ...(prev || DEFAULT_JARVIS_UI_SETTINGS),
          ...custom.detail,
        }));
      } else {
        void fetchJarvisConfig();
      }
    };
    window.addEventListener('jarvis-settings-updated', onUpdated);
    return () => {
      window.removeEventListener('jarvis-settings-updated', onUpdated);
      stopJarvisSpeech();
    };
  }, [fetchJarvisConfig]);

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
        // ignore cleanup error
      }
      stopStreamTracks();
      stopJarvisSpeech();
    };
  }, []);

  // Load recent command_center history once drawer opens
  useEffect(() => {
    if (!isOpen || historyLoaded) return;
    setHistoryLoaded(true);
    void apiJson<{
      ok?: boolean;
      conversations?: {
        id: string;
        role: string;
        message_text: string;
        tool_calls_json?: string;
        created_at_fa?: string;
      }[];
    }>('/api/v1/modules/ai-hub/agent/overview').then(({ ok, data }) => {
      if (!ok || !Array.isArray(data.conversations)) return;
      const mapped: JarvisChatBubble[] = data.conversations
        .filter((c) => c.role === 'user' || c.role === 'assistant')
        .slice(-14)
        .map((c) => {
          let tools: { tool?: string; summary?: string; ok?: boolean }[] = [];
          if (c.tool_calls_json && c.role === 'assistant') {
            try {
              const parsed = JSON.parse(c.tool_calls_json);
              if (Array.isArray(parsed)) tools = parsed;
            } catch {
              // ignore malformed tool JSON
            }
          }
          return {
            id: c.id,
            role: c.role === 'user' ? 'user' : 'assistant',
            text: c.message_text,
            createdAtFa: c.created_at_fa,
            tools,
          };
        });
      setMessages(mapped);
    });
  }, [isOpen, historyLoaded]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, sending]);

  const quickChips = useMemo(() => {
    if (pageContext.entityType === 'product') {
      return [
        'سئوی همین محصول رو بررسی کن',
        'گزارش سریع سیستم',
        'بررسی سفارش‌های ناموفق',
      ];
    }
    if (pageContext.entityType === 'article') {
      return [
        'سئوی همین مقاله رو بررسی کن',
        'گزارش سریع سیستم',
        'بررسی سفارش‌های ناموفق',
      ];
    }
    return ['بررسی همین صفحه', 'گزارش سریع سیستم', 'بررسی سفارش‌های ناموفق'];
  }, [pageContext.entityType]);

  // Render ZERO DOM if disabled or not yet confirmed enabled for Super Admin
  if (!config || !config.enabled || !config.mascotEnabled) {
    return null;
  }

  const handleSpeakMessage = async (msgId: string, text: string, isAutoPlay = false) => {
    if (!isAutoPlay && speakingMessageId === msgId) {
      stopJarvisSpeech();
      setSpeakingMessageId(null);
      return;
    }
    setSpeakingMessageId(msgId);
    await playJarvisMessageAudio({
      text,
      config,
      isAutoPlay,
      onStart: () => setSpeakingMessageId(msgId),
      onEnd: () => setSpeakingMessageId((curr) => (curr === msgId ? null : curr)),
      onError: (errMsg) => {
        setSpeakingMessageId((curr) => (curr === msgId ? null : curr));
        if (!isAutoPlay) {
          emitGlobalToast('error', errMsg);
        }
      },
    });
  };

  const handlePickMarkdownFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    if (file.size > 120 * 1024) {
      emitGlobalToast('error', 'حجم فایل متنی/مارک‌داون نباید بیش از ۱۲۰ کیلوبایت باشد.');
      return;
    }
    try {
      const content = (await file.text()).trim();
      if (!content) {
        emitGlobalToast('error', 'فایل انتخاب‌شده خالی است.');
        return;
      }
      setAttachedFile({
        fileName: file.name,
        content: content.slice(0, 24000),
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
      });
      if (!input.trim()) {
        setInput('این فایل را به محصول سئوشده تبدیل کن');
      }
    } catch {
      emitGlobalToast('error', 'خطا در خواندن فایل .md انتخاب‌شده');
    }
  };

  const sendCommand = async (rawCommand: string) => {
    const trimmed = rawCommand.trim();
    const currentAttachment = attachedFile;
    if ((!trimmed && !currentAttachment) || sending) return;
    setSending(true);
    setInput('');
    setAttachedFile(null);

    const displayUserText = currentAttachment
      ? `${trimmed || 'بررسی فایل پیوست‌شده'}\n📄 ${currentAttachment.fileName} (${currentAttachment.sizeKb} KB)`
      : trimmed;

    const localUserId = `j_u_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: localUserId, role: 'user', text: displayUserText, createdAtFa: 'الان' },
    ]);

    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        replyId?: string;
        replyText?: string;
        executedTools?: { tool?: string; summary?: string; ok?: boolean }[];
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/command', {
        method: 'POST',
        body: JSON.stringify({
          command: trimmed,
          channel: 'command_center',
          pageContext,
          ...(currentAttachment
            ? {
                attachedMarkdown: {
                  fileName: currentAttachment.fileName,
                  content: currentAttachment.content,
                },
              }
            : {}),
        }),
      });

      if (!ok || !data.replyText) {
        const errMsg = data.error || 'خطا در اجرای فرمان دستیار';
        emitGlobalToast('error', errMsg);
        setMessages((prev) => [
          ...prev,
          { id: `j_err_${Date.now()}`, role: 'assistant', text: errMsg, createdAtFa: 'الان' },
        ]);
        return;
      }

      const assistantId = data.replyId || `j_a_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          text: data.replyText!,
          createdAtFa: 'الان',
          tools: Array.isArray(data.executedTools) ? data.executedTools : [],
        },
      ]);

      // Auto-speak ONLY when explicitly enabled in Jarvis settings (OFF by default)
      if (config.voiceReplyEnabled) {
        void handleSpeakMessage(assistantId, data.replyText, true);
      }
    } finally {
      setSending(false);
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

  const transcribeBlob = async (blob: Blob, _mimeType: string) => {
    if (blob.size < 128) {
      emitGlobalToast('error', 'فایل صوتی ضبط‌شده بسیار کوتاه بود.');
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
        error?: string;
      }>('/api/v1/modules/ai-hub/agent/transcribe', {
        method: 'POST',
        body: form,
      });

      if (!ok || !data.text) {
        emitGlobalToast('error', data.error || 'خطا در تبدیل ویس با اسلات ۴ (Whisper).');
        return;
      }
      const transcript = data.text.trim();
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    } catch {
      emitGlobalToast('error', 'خطا در ارسال ویس به سرور تبدیل گفتار');
    } finally {
      setTranscribing(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (transcribing) return;
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
      emitGlobalToast('error', 'مرورگر یا محیط فعلی از ضبط میکروفون MediaRecorder پشتیبانی نمی‌کند.');
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
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const effectiveMime = recorder.mimeType || chosenMime || 'audio/webm';
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        stopStreamTracks();
        setRecording(false);
        setRecordingSeconds(0);
        void transcribeBlob(new Blob(chunks, { type: effectiveMime }), effectiveMime);
      };
      recorder.onerror = () => {
        mediaRecorderRef.current = null;
        stopStreamTracks();
        setRecording(false);
        setRecordingSeconds(0);
        emitGlobalToast('error', 'خطا هنگام ضبط صدا از میکروفون رخ داد.');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      stopStreamTracks();
      setRecording(false);
      emitGlobalToast('error', 'دسترسی به میکروفون تایید نشد.');
    }
  };

  const renderAvatarIcon = (sizeClass = 'w-5 h-5') => {
    if (config.mascotAvatar === 'bot_minimal') return <Bot className={sizeClass} />;
    if (config.mascotAvatar === 'shield_ai') return <Shield className={sizeClass} />;
    return <Cpu className={sizeClass} />;
  };

  const positionClass = elevateBottomOffset
    ? 'bottom-[140px] md:bottom-20'
    : 'bottom-[74px] md:bottom-5';

  return (
    <div dir="rtl" className={`fixed left-3 sm:left-6 z-40 ${positionClass}`}>
      {/* Quick-Command Drawer */}
      {isOpen && (
        <div className="mb-3 w-[calc(100vw-1.5rem)] sm:w-[390px] max-h-[74vh] flex flex-col rounded-3xl border border-indigo-400/35 dark:border-indigo-500/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-[0_24px_70px_-15px_rgba(30,64,175,0.45)] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-l from-slate-950 via-indigo-950 to-blue-950 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shrink-0 relative">
                {renderAvatarIcon('w-4.5 h-4.5 text-white')}
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-sm truncate">
                    {config.mascotName}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-[9px] font-bold text-sky-200">
                    سوپر ادمین
                  </span>
                </div>
                <div className="text-[10px] text-sky-200/85 truncate flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  <span>
                    {ENTITY_TYPE_LABELS_FA[pageContext.entityType]}
                    {pageContext.pageTitle ? `: ${pageContext.pageTitle}` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {speakingMessageId && (
                <button
                  type="button"
                  onClick={() => {
                    stopJarvisSpeech();
                    setSpeakingMessageId(null);
                  }}
                  title="توقف پخش صوتی"
                  className="p-1.5 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 cursor-pointer"
                >
                  <VolumeX className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="بستن دستیار جارویس"
                className="p-1.5 rounded-xl hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Context Chips */}
          <div className="px-3 py-2 border-b border-stone-200/80 dark:border-slate-800 bg-stone-50/90 dark:bg-slate-900/70 flex flex-wrap gap-1.5">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={sending}
                onClick={() => void sendCommand(chip)}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-stone-200 dark:border-slate-700 text-[11px] font-bold text-stone-700 dark:text-slate-200 cursor-pointer transition-colors disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            data-lenis-prevent
            data-lenis-prevent-wheel
            onWheel={(e) => e.stopPropagation()}
            className="flex-1 min-h-[240px] max-h-[340px] overflow-y-auto overscroll-contain p-3.5 space-y-2.5 bg-stone-50/50 dark:bg-slate-950/60"
          >
            {messages.length === 0 ? (
              <div className="text-center py-8 px-3 space-y-2">
                <div className="w-11 h-11 mx-auto rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-sky-300 flex items-center justify-center">
                  {renderAvatarIcon('w-5 h-5')}
                </div>
                <p className="text-xs font-extrabold text-stone-800 dark:text-white">
                  سلام! {config.mascotName} آماده فرمان شماست.
                </p>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  صفحه فعلی شما ({ENTITY_TYPE_LABELS_FA[pageContext.entityType]}) به‌صورت خودکار شناسایی شده است. می‌توانید متنی بنویسید یا با میکروفون اسلات ۴ فرمان صوتی بدهید.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs space-y-1.5 ${
                      m.role === 'user'
                        ? 'bg-gradient-to-l from-indigo-600 to-blue-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-800 dark:text-slate-100 shadow-xs'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <SafeMarkdownText text={m.text} />
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    )}

                    {m.role === 'assistant' && m.tools && m.tools.length > 0 && (
                      <div className="pt-1.5 border-t border-stone-200/70 dark:border-slate-800 space-y-1">
                        {m.tools.map((t, idx) => (
                          <div
                            key={`${m.id}_t_${idx}`}
                            className="flex items-start gap-1 text-[10px] rounded-lg px-2 py-1 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                          >
                            <Wrench className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="truncate">
                              <strong className="font-mono" dir="ltr">
                                {t.tool || 'tool'}
                              </strong>
                              {t.summary ? ` · ${t.summary}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Manual per-message zero-cost / configured TTS speaker button */}
                    {m.role === 'assistant' && (
                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-stone-100 dark:border-slate-800/80">
                        <span className="text-[9px] text-stone-400">{m.createdAtFa || ''}</span>
                        <button
                          type="button"
                          onClick={() => void handleSpeakMessage(m.id, m.text, false)}
                          title={
                            speakingMessageId === m.id
                              ? 'توقف پخش صوتی'
                              : config.voiceReplyEnabled &&
                                config.voiceReplyProvider === 'slot4_paid_tts'
                              ? 'پخش صوتی با اسلات ۴'
                              : 'پخش صوتی رایگان مرورگر'
                          }
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                            speakingMessageId === m.id
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                              : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-indigo-500/15 hover:text-indigo-600'
                          }`}
                        >
                          {speakingMessageId === m.id ? (
                            <>
                              <Square className="w-2.5 h-2.5 fill-current" />
                              <span>توقف</span>
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
                </div>
              ))
            )}
            {sending && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-600 dark:text-sky-300 px-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{config.mascotName} در حال تحلیل صفحه و اجرای ابزارها...</span>
              </div>
            )}
          </div>

          {/* Attached .md File Preview Bar */}
          {attachedFile && (
            <div className="px-3 py-1.5 border-t border-indigo-200/70 dark:border-slate-800 bg-indigo-50/70 dark:bg-indigo-950/30 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0 font-bold text-indigo-800 dark:text-sky-200">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate" dir="ltr">
                  {attachedFile.fileName}
                </span>
                <span className="text-[10px] opacity-75 shrink-0">({attachedFile.sizeKb} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                aria-label="حذف فایل پیوست"
                className="p-0.5 rounded-md hover:bg-indigo-500/20 text-indigo-700 dark:text-sky-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input, .md Upload & Slot 4 Whisper Voice Mic */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendCommand(input);
            }}
            className="p-2.5 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5"
          >
            <input
              ref={mdInputRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              onChange={(e) => void handlePickMarkdownFile(e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => mdInputRef.current?.click()}
              title="آپلود فایل .md یا متنی برای تبدیل به محصول/مقاله"
              className={`h-9 px-2.5 rounded-xl border cursor-pointer transition-colors inline-flex items-center justify-center shrink-0 ${
                attachedFile
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300'
              }`}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={transcribing}
              onClick={() => void handleVoiceToggle()}
              title={
                transcribing
                  ? 'در حال تبدیل ویس فارسی با اسلات ۴...'
                  : recording
                  ? 'توقف ضبط و ارسال به Whisper'
                  : 'فرمان صوتی فارسی (اسلات ۴ Whisper STT)'
              }
              className={`h-9 px-2.5 rounded-xl border cursor-pointer transition-colors inline-flex items-center gap-1 text-[11px] font-extrabold shrink-0 disabled:opacity-50 ${
                recording
                  ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                  : transcribing
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-300'
              }`}
            >
              {transcribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : recording ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span className="smooth-nums">
                    {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                    {String(recordingSeconds % 60).padStart(2, '0')}
                  </span>
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                recording
                  ? 'در حال ضبط ویس...'
                  : transcribing
                  ? 'در حال تبدیل ویس به متن...'
                  : `فرمان به ${config.mascotName}...`
              }
              className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 text-xs outline-none focus:border-indigo-500"
            />

            <button
              type="submit"
              disabled={sending || (!input.trim() && !attachedFile)}
              className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Animated Mascot Trigger Button (Bottom-Left) */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={`باز کردن دستیار هوشمند ${config.mascotName}`}
        className="group relative inline-flex items-center gap-2.5 h-12 pl-4 pr-3 rounded-full bg-gradient-to-l from-slate-950 via-indigo-900 to-blue-700 hover:from-slate-900 hover:to-sky-600 text-white shadow-[0_14px_34px_-6px_rgba(37,99,235,0.65)] border border-sky-300/35 backdrop-blur-xl cursor-pointer transition-all duration-300 active:scale-95"
      >
        <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/15 ring-2 ring-sky-400/40 group-hover:scale-105 transition-transform">
          {renderAvatarIcon('w-4.5 h-4.5 text-sky-200')}
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
        </span>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-xs font-extrabold tracking-tight">{config.mascotName}</span>
          <span className="text-[9px] text-sky-200/85 font-semibold">
            {ENTITY_TYPE_LABELS_FA[pageContext.entityType]}
          </span>
        </div>
      </button>
    </div>
  );
};
