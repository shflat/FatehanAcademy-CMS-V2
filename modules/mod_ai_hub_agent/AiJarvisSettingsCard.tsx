import React, { useEffect, useState } from 'react';
import {
  Bot,
  Cpu,
  Power,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import {
  speakWithFreeBrowserTts,
  stopJarvisSpeech,
  type JarvisVoiceProvider,
} from './jarvisTtsPlayer';

export type JarvisAvatarUiPreset = 'orb_cyber' | 'bot_minimal' | 'shield_ai';

export interface JarvisSettingsUiConfig {
  enabled: boolean;
  mascotEnabled: boolean;
  mascotName: string;
  mascotPersona: string;
  mascotAvatar: JarvisAvatarUiPreset;
  voiceReplyEnabled: boolean;
  voiceReplyProvider: JarvisVoiceProvider;
  ttsModel: string;
  ttsVoice: string;
  allowSkillToProduct: boolean;
  allowSocialPublisher: boolean;
}

export const DEFAULT_JARVIS_UI_SETTINGS: JarvisSettingsUiConfig = {
  enabled: true,
  mascotEnabled: true,
  mascotName: 'جارویس',
  mascotPersona: 'دستیار هوشمند، دقیق، خلاصه‌گو و حرفه‌ای سوپر ادمین با لحن مودبانه فارسی',
  mascotAvatar: 'orb_cyber',
  voiceReplyEnabled: false,
  voiceReplyProvider: 'free_browser',
  ttsModel: 'gemini-3.8-flash-tts',
  ttsVoice: 'alloy',
  allowSkillToProduct: false,
  allowSocialPublisher: false,
};

interface AiJarvisSettingsCardProps {
  jarvisSettings?: Partial<JarvisSettingsUiConfig>;
  liveChatAutoReply: boolean;
  onSaveSettings: (patch: Record<string, unknown>) => Promise<void>;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}

export const AiJarvisSettingsCard: React.FC<AiJarvisSettingsCardProps> = ({
  jarvisSettings,
  liveChatAutoReply,
  onSaveSettings,
  onNotice,
}) => {
  const effective: JarvisSettingsUiConfig = {
    ...DEFAULT_JARVIS_UI_SETTINGS,
    ...(jarvisSettings || {}),
  };

  const [mascotName, setMascotName] = useState(effective.mascotName);
  const [mascotPersona, setMascotPersona] = useState(effective.mascotPersona);
  const [mascotAvatar, setMascotAvatar] = useState<JarvisAvatarUiPreset>(effective.mascotAvatar);
  const [ttsModel, setTtsModel] = useState(effective.ttsModel);
  const [savingIdentity, setSavingIdentity] = useState(false);

  useEffect(() => {
    setMascotName(effective.mascotName);
    setMascotPersona(effective.mascotPersona);
    setMascotAvatar(effective.mascotAvatar);
    setTtsModel(effective.ttsModel);
  }, [
    effective.mascotName,
    effective.mascotPersona,
    effective.mascotAvatar,
    effective.ttsModel,
  ]);

  const updateJarvisPatch = async (patch: Partial<JarvisSettingsUiConfig>) => {
    const nextMerged: JarvisSettingsUiConfig = { ...effective, ...patch };
    await onSaveSettings({ jarvisSettings: nextMerged });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jarvis-settings-updated', { detail: nextMerged }));
    }
  };

  const handleSaveProfileFields = async () => {
    setSavingIdentity(true);
    try {
      await updateJarvisPatch({
        mascotName: mascotName.trim() || 'جارویس',
        mascotPersona: mascotPersona.trim(),
        mascotAvatar,
        ttsModel: ttsModel.trim() || 'gemini-3.8-flash-tts',
      });
    } finally {
      setSavingIdentity(false);
    }
  };

  const handlePreviewFreeVoice = () => {
    stopJarvisSpeech();
    speakWithFreeBrowserTts(
      `سلام! من ${mascotName.trim() || 'جارویس'} هستم، دستیار هوشمند اختصاصی سوپر ادمین.`,
      {
        onError: (msg) => onNotice?.('error', msg),
      }
    );
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-50/60 via-white to-sky-50/40 dark:from-indigo-950/25 dark:via-stone-900 dark:to-slate-950 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/60 dark:border-indigo-900/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Cpu className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="font-extrabold text-stone-900 dark:text-white text-xs sm:text-sm">
              تنظیمات دستیار جارویس و کلیدهای فعال‌سازی
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              کنترل مستقل تمام قابلیت‌های ایجنت ۲۴/۷، ماسکات شناور اختصاصی سوپر ادمین و خروجی صوتی بدون هزینه
            </p>
          </div>
        </div>

        <label
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-extrabold cursor-pointer transition-colors ${
            effective.enabled
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/35 text-rose-700 dark:text-rose-300'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <input
            type="checkbox"
            checked={effective.enabled}
            onChange={(e) => void updateJarvisPatch({ enabled: e.target.checked })}
          />
          <span>{effective.enabled ? 'کلید اصلی ایجنت: روشن' : 'کلید اصلی ایجنت: خاموش'}</span>
        </label>
      </div>

      {/* Granular Feature Master Switches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/90 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            disabled={!effective.enabled}
            checked={liveChatAutoReply}
            onChange={(e) => void onSaveSettings({ liveChatAutoReply: e.target.checked })}
          />
          <div className="space-y-0.5">
            <div className="font-extrabold text-stone-900 dark:text-white">پاسخگویی هوشمند چت زنده ۲۴/۷</div>
            <p className="text-[10px] text-stone-500">پاسخ به مشتریان ویترین و باز کردن کادر OTP درون‌خطی</p>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/90 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            disabled={!effective.enabled}
            checked={effective.mascotEnabled}
            onChange={(e) => void updateJarvisPatch({ mascotEnabled: e.target.checked })}
          />
          <div className="space-y-0.5">
            <div className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-indigo-600" />
              <span>ماسکات شناور سوپر ادمین ({effective.mascotName})</span>
            </div>
            <p className="text-[10px] text-stone-500">
              فقط برای نقش super_admin با تشخیص خودکار محصول/مقاله صفحه فعلی
            </p>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/90 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            disabled={!effective.enabled}
            checked={effective.voiceReplyEnabled}
            onChange={(e) => void updateJarvisPatch({ voiceReplyEnabled: e.target.checked })}
          />
          <div className="space-y-0.5">
            <div className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1">
              {effective.voiceReplyEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-stone-400" />
              )}
              <span>خروجی صوتی خودکار پاسخ‌ها (TTS)</span>
            </div>
            <p className="text-[10px] text-stone-500">
              پیش‌فرض خاموش (برای جلوگیری از هزینه/صدا؛ دکمه پخش دستی همیشه رایگان فعال است)
            </p>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/90 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            disabled={!effective.enabled}
            checked={effective.allowSkillToProduct}
            onChange={(e) => void updateJarvisPatch({ allowSkillToProduct: e.target.checked })}
          />
          <div className="space-y-0.5">
            <div className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5 text-violet-600" />
              <span>تبدیل اسکیل/لینک به محصول و مقاله</span>
            </div>
            <p className="text-[10px] text-stone-500">
              پیش‌فرض خاموش برای سایت‌های ریمیکس‌شده (Skill-to-Product)
            </p>
          </div>
        </label>

        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/90 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            disabled={!effective.enabled}
            checked={effective.allowSocialPublisher}
            onChange={(e) => void updateJarvisPatch({ allowSocialPublisher: e.target.checked })}
          />
          <div className="space-y-0.5">
            <div className="font-extrabold text-stone-900 dark:text-white flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5 text-sky-600" />
              <span>انتشار خودکار شبکه‌های اجتماعی</span>
            </div>
            <p className="text-[10px] text-stone-500">
              پیش‌فرض خاموش (کانال بله، تلگرام و بسته محتوای اینستاگرام)
            </p>
          </div>
        </label>

        <div className="p-3 rounded-xl bg-white/90 dark:bg-stone-900/80 border border-stone-200/80 dark:border-stone-800 space-y-1.5">
          <div className="font-extrabold text-stone-900 dark:text-white flex items-center justify-between">
            <span>موتور پخش صوتی (TTS)</span>
            <button
              type="button"
              onClick={handlePreviewFreeVoice}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 font-bold cursor-pointer"
            >
              تست رایگان
            </button>
          </div>
          <select
            value={effective.voiceReplyProvider}
            onChange={(e) =>
              void updateJarvisPatch({
                voiceReplyProvider:
                  e.target.value === 'slot4_paid_tts' ? 'slot4_paid_tts' : 'free_browser',
              })
            }
            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 text-[11px] font-bold"
          >
            <option value="free_browser">رایگان مرورگر — Web Speech فارسی (هزینه ۰)</option>
            <option value="slot4_paid_tts">پولی اسلات ۴ — Slot 4 /audio/speech (اختیاری)</option>
          </select>
        </div>
      </div>

      {/* Mascot Customization & Optional Slot 4 TTS Model */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1">
        <div className="md:col-span-3 space-y-1">
          <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300">
            نام سفارشی دستیار (Mascot Name)
          </label>
          <input
            type="text"
            value={mascotName}
            onChange={(e) => setMascotName(e.target.value)}
            placeholder="مثلاً: جارویس"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-bold"
          />
        </div>

        <div className="md:col-span-5 space-y-1">
          <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300">
            شخصیت و لحن دستیار (Persona — اختیاری)
          </label>
          <input
            type="text"
            value={mascotPersona}
            onChange={(e) => setMascotPersona(e.target.value)}
            placeholder="مثلاً: خلاصه‌گو، فنی و دقیق در تحلیل سئو و فروش"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300">
            آواتار شناور
          </label>
          <select
            value={mascotAvatar}
            onChange={(e) => setMascotAvatar(e.target.value as JarvisAvatarUiPreset)}
            className="w-full px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-bold"
          >
            <option value="orb_cyber">گوی هوشمند سایبری</option>
            <option value="bot_minimal">ربات مینیمال</option>
            <option value="shield_ai">سپر فرماندهی AI</option>
          </select>
        </div>

        <div className="md:col-span-2 flex items-end">
          <button
            type="button"
            disabled={savingIdentity}
            onClick={() => void handleSaveProfileFields()}
            className="w-full px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingIdentity ? 'ذخیره...' : 'ذخیره هویت'}</span>
          </button>
        </div>
      </div>

      {effective.voiceReplyProvider === 'slot4_paid_tts' && (
        <div className="p-3 rounded-xl border border-amber-500/35 bg-amber-50/70 dark:bg-amber-950/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-amber-900 dark:text-amber-200 font-bold">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              حالت TTS پولی اسلات ۴ انتخاب شده است؛ اندپوینت <code dir="ltr">/agent/speak</code> فقط زمانی فراخوانی می‌شود که تیک «خروجی صوتی خودکار پاسخ‌ها» نیز روشن باشد.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              dir="ltr"
              value={ttsModel}
              onChange={(e) => setTtsModel(e.target.value)}
              placeholder="gemini-3.8-flash-tts"
              className="px-2.5 py-1.5 rounded-lg border border-amber-400/50 bg-white dark:bg-stone-900 font-mono text-[11px] w-48"
            />
            <button
              type="button"
              onClick={() => void handleSaveProfileFields()}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>ثبت مدل TTS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
