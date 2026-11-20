import React, { useState } from 'react';
import { Bot, Image as ImageIcon, KeyRound, Lock, Save, Sparkles } from 'lucide-react';
import { apiJson } from '../../src/core/apiClient';

export interface AiSlotItem {
  slotKey: 'text_seo' | 'image_visual' | 'agent_core';
  providerKind: 'gemini' | 'openai_compatible' | 'ollama';
  baseUrl: string;
  modelName: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
  enabled: boolean;
  superAdminOnly: boolean;
}

const SLOT_META: Record<
  AiSlotItem['slotKey'],
  { title: string; subtitle: string; icon: React.ReactNode; badge: string }
> = {
  text_seo: {
    title: 'اسلات ۱: موتور متن، سئو و بازنویسی دیجی‌کالا',
    subtitle: 'تولید توضیحات محصول، مقاله، متاتگ سئو و بازنویسی هوشمند محتوا',
    icon: <Sparkles className="w-4 h-4 text-[#1D4ED8]" />,
    badge: 'text_seo',
  },
  image_visual: {
    title: 'اسلات ۲: موتور پرامپت و تولید تصویر (Visual Studio)',
    subtitle: 'تولید پرامپت حرفه‌ای و ساخت مستقیم تصویر شاخص در ویرایشگر محصول و مقاله',
    icon: <ImageIcon className="w-4 h-4 text-emerald-600" />,
    badge: 'image_visual',
  },
  agent_core: {
    title: 'اسلات ۳: هسته ایجنت خودکار ۲۴/۷ (مخصوص سوپر ادمین)',
    subtitle: 'استدلال چندمرحله‌ای، اجرای ابزارها، یادگیری SKILL.md و پاسخگویی ۲۴/۷',
    icon: <Bot className="w-4 h-4 text-amber-600" />,
    badge: 'agent_core',
  },
};

export const AiSlotsConfigCard: React.FC<{
  slots: AiSlotItem[];
  isSuperAdmin: boolean;
  onSaved: () => void;
  onNotice?: (type: 'success' | 'error', text: string) => void;
}> = ({ slots, isSuperAdmin, onSaved, onNotice }) => {
  const [drafts, setDrafts] = useState<Record<string, AiSlotItem & { apiKeyInput: string }>>(() => {
    const map: Record<string, AiSlotItem & { apiKeyInput: string }> = {};
    for (const s of slots) {
      map[s.slotKey] = { ...s, apiKeyInput: s.apiKeyMasked || '' };
    }
    return map;
  });
  const [savingSlot, setSavingSlot] = useState<string>('');

  const getDraft = (slot: AiSlotItem) =>
    drafts[slot.slotKey] || { ...slot, apiKeyInput: slot.apiKeyMasked || '' };

  const updateField = (slot: AiSlotItem, patch: Partial<AiSlotItem & { apiKeyInput: string }>) => {
    setDrafts((prev) => ({
      ...prev,
      [slot.slotKey]: { ...getDraft(slot), ...patch },
    }));
  };

  const handleSaveSlot = async (slot: AiSlotItem) => {
    const d = getDraft(slot);
    setSavingSlot(slot.slotKey);
    try {
      const { ok, data } = await apiJson<{
        ok?: boolean;
        error?: string;
        apiKeyMasked?: string;
      }>('/api/v1/modules/ai-hub/slots/save', {
        method: 'POST',
        body: JSON.stringify({
          slotKey: d.slotKey,
          providerKind: d.providerKind,
          baseUrl: d.baseUrl,
          modelName: d.modelName,
          apiKey: d.apiKeyInput,
          enabled: d.enabled,
        }),
      });
      if (!ok) {
        onNotice?.('error', data.error || 'خطا در ذخیره تنظیمات اسلات');
        return;
      }
      updateField(slot, {
        apiKeyMasked: data.apiKeyMasked || '',
        apiKeyInput: data.apiKeyMasked || '',
      });
      onNotice?.('success', `اسلات «${d.slotKey}» با رمزنگاری AES-256-GCM ذخیره شد.`);
      onSaved();
    } finally {
      setSavingSlot('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {slots.map((slot) => {
          const meta = SLOT_META[slot.slotKey];
          const d = getDraft(slot);
          const locked = slot.superAdminOnly && !isSuperAdmin;

          return (
            <div
              key={slot.slotKey}
              className={`rounded-2xl border p-4 space-y-3.5 bg-white dark:bg-stone-900 ${
                slot.slotKey === 'agent_core'
                  ? 'border-amber-400/50 dark:border-amber-500/30'
                  : 'border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                    {meta.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-stone-900 dark:text-white">
                      {meta.title}
                    </h4>
                    <p className="text-[10.5px] text-stone-500 mt-0.5">{meta.subtitle}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500">
                  {meta.badge}
                </span>
              </div>

              {locked ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>فقط سوپر ادمین مجاز به مشاهده و تنظیم هسته ایجنت ۲۴/۷ است.</span>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      ارائه‌دهنده (Provider)
                    </label>
                    <select
                      value={d.providerKind}
                      onChange={(e) =>
                        updateField(slot, {
                          providerKind: e.target.value as AiSlotItem['providerKind'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-bold"
                    >
                      <option value="gemini">Google Gemini (پیشنهادی)</option>
                      <option value="openai_compatible">Custom OpenAI-Compatible (OpenRouter / Groq / Ava)</option>
                      <option value="ollama">Ollama محلی (Self-Hosted)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">
                      نام مدل (Model Name)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={d.modelName}
                      onChange={(e) => updateField(slot, { modelName: e.target.value })}
                      placeholder="gemini-4-hydrogen"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-left"
                    />
                  </div>

                  {(d.providerKind === 'openai_compatible' || d.providerKind === 'ollama') && (
                    <div>
                      <label className="block text-[11px] font-bold text-stone-500 mb-1">
                        آدرس پایه (Base URL)
                      </label>
                      <input
                        type="url"
                        dir="ltr"
                        value={d.baseUrl}
                        onChange={(e) => updateField(slot, { baseUrl: e.target.value })}
                        placeholder={
                          d.providerKind === 'ollama'
                            ? 'http://127.0.0.1:11434'
                            : 'https://api.openai.com/v1'
                        }
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-left"
                      />
                    </div>
                  )}

                  {d.providerKind !== 'ollama' && (
                    <div>
                      <label className="flex items-center justify-between text-[11px] font-bold text-stone-500 mb-1">
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-emerald-600" />
                          کلید API اختصاصی (AES-256-GCM)
                        </span>
                        {d.apiKeyMasked && (
                          <span className="text-[10px] font-mono text-emerald-600" dir="ltr">
                            {d.apiKeyMasked}
                          </span>
                        )}
                      </label>
                      <input
                        type="password"
                        dir="ltr"
                        value={d.apiKeyInput}
                        onChange={(e) => updateField(slot, { apiKeyInput: e.target.value })}
                        placeholder="کلید جدید یا خالی برای استفاده از سرور"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono text-left"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 text-[11px] font-bold text-stone-600 dark:text-stone-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={d.enabled}
                        onChange={(e) => updateField(slot, { enabled: e.target.checked })}
                      />
                      <span>اسلات فعال است</span>
                    </label>
                    <button
                      type="button"
                      disabled={savingSlot === slot.slotKey}
                      onClick={() => void handleSaveSlot(slot)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingSlot === slot.slotKey ? 'در حال ذخیره...' : 'ذخیره امن'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
