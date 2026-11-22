import { apiFetch } from '../../src/core/apiClient';

export type JarvisVoiceProvider = 'free_browser' | 'slot4_paid_tts';

export interface JarvisTtsConfig {
  voiceReplyEnabled: boolean;
  voiceReplyProvider: JarvisVoiceProvider;
  ttsModel?: string;
  ttsVoice?: string;
}

let activeAudioEl: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;

export function stripMarkdownForSpeech(raw: string): string {
  return String(raw || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`>[\]()]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stopJarvisSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore cancel errors in restricted browsers
    }
  }
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.currentTime = 0;
    } catch {
      // ignore pause errors
    }
    activeAudioEl = null;
  }
  if (activeAudioUrl) {
    try {
      URL.revokeObjectURL(activeAudioUrl);
    } catch {
      // ignore revoke errors
    }
    activeAudioUrl = null;
  }
}

function pickPersianBrowserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;
  return (
    voices.find((v) => /^fa[-_]?ir/i.test(v.lang)) ||
    voices.find((v) => /^fa\b/i.test(v.lang) || /persian|farsi/i.test(v.name)) ||
    voices.find((v) => /^ar[-_]/i.test(v.lang)) ||
    null
  );
}

export function speakWithFreeBrowserTts(
  rawText: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (msg: string) => void;
  }
): void {
  const cleanText = stripMarkdownForSpeech(rawText).slice(0, 1800);
  if (!cleanText) {
    callbacks?.onError?.('متنی برای پخش صوتی وجود ندارد.');
    return;
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onError?.('مرورگر فعلی از پخش صوتی رایگان (Web Speech) پشتیبانی نمی‌کند.');
    return;
  }

  stopJarvisSpeech();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'fa-IR';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  const preferredVoice = pickPersianBrowserVoice();
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => callbacks?.onStart?.();
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = () => {
    callbacks?.onEnd?.();
    callbacks?.onError?.('پخش صوتی مرورگر با خطا مواجه شد یا لغو گردید.');
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    callbacks?.onError?.('امکان اجرای موتور گفتار مرورگر وجود ندارد.');
  }
}

export async function speakWithSlot4PaidTts(
  rawText: string,
  config: JarvisTtsConfig,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (msg: string) => void;
  }
): Promise<void> {
  const cleanText = stripMarkdownForSpeech(rawText).slice(0, 1800);
  if (!cleanText) {
    callbacks?.onError?.('متنی برای پخش صوتی وجود ندارد.');
    return;
  }

  stopJarvisSpeech();

  try {
    const resp = await apiFetch('/api/v1/modules/ai-hub/agent/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        ttsModel: config.ttsModel || 'gemini-3.8-flash-tts',
        voice: config.ttsVoice || 'alloy',
      }),
    });

    if (!resp.ok) {
      const errJson = (await resp.json().catch(() => ({}))) as { error?: string };
      throw new Error(errJson.error || `خطای سرویس TTS اسلات ۴ (HTTP ${resp.status})`);
    }

    const audioBlob = await resp.blob();
    const objUrl = URL.createObjectURL(audioBlob);
    activeAudioUrl = objUrl;

    const audio = new Audio(objUrl);
    activeAudioEl = audio;
    audio.onplay = () => callbacks?.onStart?.();
    audio.onended = () => {
      stopJarvisSpeech();
      callbacks?.onEnd?.();
    };
    audio.onerror = () => {
      stopJarvisSpeech();
      callbacks?.onEnd?.();
      callbacks?.onError?.('پخش فایل صوتی دریافتی ناموفق بود.');
    };
    await audio.play();
  } catch (err) {
    stopJarvisSpeech();
    callbacks?.onEnd?.();
    callbacks?.onError?.(
      err instanceof Error ? err.message : 'خطا در اتصال به سرویس صوتی اسلات ۴'
    );
  }
}

/**
 * Unified Jarvis TTS playback helper:
 * - Auto-play NEVER triggers when `voiceReplyEnabled === false` (strictly silent by default).
 * - Manual per-message click ALWAYS works at $0 cost via `free_browser` unless `voiceReplyEnabled` is ON
 *   AND `voiceReplyProvider === 'slot4_paid_tts'` was explicitly chosen by Super Admin.
 */
export async function playJarvisMessageAudio(params: {
  text: string;
  config: JarvisTtsConfig;
  isAutoPlay?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}): Promise<void> {
  if (params.isAutoPlay && !params.config.voiceReplyEnabled) {
    return;
  }

  if (params.config.voiceReplyEnabled && params.config.voiceReplyProvider === 'slot4_paid_tts') {
    await speakWithSlot4PaidTts(params.text, params.config, {
      onStart: params.onStart,
      onEnd: params.onEnd,
      onError: params.onError,
    });
    return;
  }

  speakWithFreeBrowserTts(params.text, {
    onStart: params.onStart,
    onEnd: params.onEnd,
    onError: params.onError,
  });
}
