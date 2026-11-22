export type JarvisVoiceInputMode = 'whisper' | 'browser_free';

const VOICE_MODE_STORAGE_KEY = 'jarvis_voice_input_mode_v1';

interface BrowserSpeechRecognitionAlternative {
  transcript?: string;
}

interface BrowserSpeechRecognitionResult {
  isFinal?: boolean;
  0?: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionEvent {
  resultIndex?: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
}

interface BrowserSpeechRecognitionErrorEvent {
  error?: string;
}

export interface BrowserSpeechRecognitionHandle {
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((ev: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isBrowserSpeechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function getSavedVoiceMode(): JarvisVoiceInputMode {
  if (typeof window === 'undefined') return 'whisper';
  try {
    const raw = window.localStorage.getItem(VOICE_MODE_STORAGE_KEY);
    if (raw === 'browser_free' && isBrowserSpeechSupported()) {
      return 'browser_free';
    }
  } catch {
    // ignore storage errors
  }
  return 'whisper';
}

export function saveVoiceMode(mode: JarvisVoiceInputMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}

export function startBrowserPersianSpeech(callbacks: {
  onTranscript: (text: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (persianMessage: string) => void;
}): BrowserSpeechRecognitionHandle | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    callbacks.onError('مرورگر شما از تشخیص گفتار رایگان (SpeechRecognition) پشتیبانی نمی‌کند. از حالت Whisper استفاده کنید.');
    return null;
  }

  try {
    const rec = new Ctor();
    rec.lang = 'fa-IR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let emittedFinal = false;

    rec.onresult = (ev) => {
      let fullText = '';
      let hasFinal = false;
      for (let i = 0; i < ev.results.length; i += 1) {
        const chunk = ev.results[i];
        const piece = chunk?.[0]?.transcript || '';
        if (piece) fullText += (fullText ? ' ' : '') + piece.trim();
        if (chunk?.isFinal) hasFinal = true;
      }
      const cleaned = fullText.trim();
      if (cleaned) {
        if (hasFinal) emittedFinal = true;
        callbacks.onTranscript(cleaned, hasFinal);
      }
    };

    rec.onerror = (ev) => {
      const code = ev?.error || 'unknown';
      if (code === 'aborted') return;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        callbacks.onError('دسترسی میکروفون در مرورگر تایید نشد.');
      } else if (code === 'no-speech') {
        callbacks.onError('صدایی دریافت نشد؛ لطفاً دوباره صحبت کنید.');
      } else if (code === 'network') {
        callbacks.onError('ارتباط سرویس تشخیص گفتار مرورگر برقرار نشد؛ می‌توانید حالت Whisper WAV را انتخاب کنید.');
      } else {
        callbacks.onError(`خطای تشخیص گفتار مرورگر (${code}).`);
      }
    };

    rec.onend = () => {
      if (!emittedFinal) {
        // nothing extra needed; caller reads latest transcript
      }
      callbacks.onEnd();
    };

    rec.start();

    return {
      stop: () => {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      },
      abort: () => {
        try {
          rec.abort();
        } catch {
          // ignore
        }
      },
    };
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'راه‌اندازی میکروفون مرورگر ناموفق بود.');
    return null;
  }
}
