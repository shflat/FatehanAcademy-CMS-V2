import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { dbQuery } from '../../src/server/database/connection.js';
import { decryptSecret } from '../../src/server/core/secretVault.js';
import { getEnvConfig } from '../../src/server/core/envConfig.js';
import { ensureAiHubSchema, type AiSlotKey, type AiSlotRow } from './aiHubSchema.js';

export interface SlotGenerationResult {
  text: string;
  providerUsed: string;
  modelUsed: string;
  fallbackNotice?: string;
}

export async function getSlotConfig(slotKey: AiSlotKey): Promise<AiSlotRow | null> {
  await ensureAiHubSchema();
  const rows = await dbQuery<AiSlotRow>(
    'SELECT * FROM mod_ai_provider_configs WHERE slot_key = $1 LIMIT 1',
    [slotKey]
  );
  return rows[0] || null;
}

function resolveServerGeminiKey(): string {
  return (process.env.GEMINI_API_KEY || '').trim() || getEnvConfig().geminiApiKey || '';
}

function buildGeminiClient(customApiKey?: string): GoogleGenAI {
  const resolvedKey = (customApiKey || '').trim() || resolveServerGeminiKey();
  return new GoogleGenAI({
    apiKey: resolvedKey || undefined,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiErrorFa(err: unknown, model: string): { error: string; hint?: string } {
  const raw = err instanceof Error ? err.message : String(err || 'خطای نامشخص');
  if (/API_KEY_INVALID|PERMISSION_DENIED|403|401|API key not valid/i.test(raw)) {
    return {
      error: `کلید API جمنای نامعتبر یا بدون مجوز است (${raw.slice(0, 140)}).`,
      hint: 'لطفاً کلید API معتبر را در تنظیمات همین اسلات ذخیره کنید یا در متغیر محیطی GEMINI_API_KEY سرور بررسی نمایید.',
    };
  }
  if (/NOT_FOUND|404|is not found|not supported/i.test(raw)) {
    return {
      error: `مدل انتخابی «${model}» در API یافت نشد یا منسوخ شده است.`,
      hint: 'از مدل‌های فعال مانند gemini-4-hydrogen (متن و چت ۲۴/۷) یا gemini-3.1-flash-lite-image (تصویر) استفاده کنید.',
    };
  }
  if (/RESOURCE_EXHAUSTED|429|quota/i.test(raw)) {
    return {
      error: `سقف درخواست (Quota / 429) برای مدل «${model}» پر شده یا این مدل نیازمند کلید API دارای صورتحساب است.`,
      hint: 'برای استفاده با کلید رایگان، مدل gemini-4-hydrogen را انتخاب کرده و دوباره تست کنید.',
    };
  }
  return {
    error: `خطا در ارتباط با سرویس هوش مصنوعی: ${raw.slice(0, 200)}`,
  };
}

async function callOpenAiCompatibleText(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
}): Promise<string> {
  const endpoint = `${params.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(params.apiKey ? { Authorization: `Bearer ${params.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!resp.ok) {
    throw new Error(data.error?.message || `OpenAI-Compatible HTTP ${resp.status}`);
  }
  return String(data.choices?.[0]?.message?.content || '').trim();
}

async function callOllamaText(params: {
  baseUrl: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const root = (params.baseUrl || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const resp = await fetch(`${root}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model || 'llama3.1',
      stream: false,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
    }),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    message?: { content?: string };
    error?: string;
  };
  if (!resp.ok) {
    throw new Error(data.error || `Ollama HTTP ${resp.status}`);
  }
  return String(data.message?.content || '').trim();
}

export async function generateTextViaSlot(params: {
  slot: AiSlotKey;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
}): Promise<SlotGenerationResult> {
  const cfg = await getSlotConfig(params.slot);
  if (cfg && !cfg.enabled) {
    throw new Error(`اسلات هوش مصنوعی «${params.slot}» در تنظیمات غیرفعال است.`);
  }
  const provider = cfg?.provider_kind || 'gemini';
  const model =
    (cfg?.model_name || '').trim() || 'gemini-4-hydrogen';
  const apiKey = cfg?.api_key_enc ? decryptSecret(cfg.api_key_enc) : '';

  if (provider === 'openai_compatible' && cfg?.base_url) {
    const text = await callOpenAiCompatibleText({
      baseUrl: cfg.base_url,
      apiKey,
      model,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      jsonMode: params.jsonMode,
    });
    return { text, providerUsed: 'openai_compatible', modelUsed: model };
  }

  if (provider === 'ollama') {
    const text = await callOllamaText({
      baseUrl: cfg?.base_url || 'http://127.0.0.1:11434',
      model,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
    });
    return { text, providerUsed: 'ollama', modelUsed: model };
  }

  const effectiveGeminiKey = apiKey || resolveServerGeminiKey();
  if (!effectiveGeminiKey) {
    throw new Error(
      'کلید API برای این اسلات تنظیم نشده است. لطفاً کلید API را در تب «تنظیمات هوش مصنوعی» ذخیره کنید یا متغیر GEMINI_API_KEY سرور را مقداردهی نمایید.'
    );
  }

  const ai = buildGeminiClient(effectiveGeminiKey);
  const response = await ai.models.generateContent({
    model,
    contents: params.userPrompt,
    config: {
      systemInstruction: params.systemPrompt,
      ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  });
  return {
    text: String(response.text || '').trim(),
    providerUsed: 'gemini',
    modelUsed: model,
  };
}

export interface AiConnectionTestResult {
  ok: boolean;
  connected: boolean;
  slotKey: string;
  providerUsed: string;
  modelUsed: string;
  latencyMs: number;
  sampleReply?: string;
  message: string;
  error?: string;
  hint?: string;
}

export async function testAiSlotConnection(params: {
  slotKey: AiSlotKey | 'custom_probe';
  providerKind?: 'gemini' | 'openai_compatible' | 'ollama' | 'openai' | 'claude' | 'custom_openai';
  baseUrl?: string;
  modelName?: string;
  apiKey?: string;
}): Promise<AiConnectionTestResult> {
  const startedAt = Date.now();
  const savedCfg =
    params.slotKey !== 'custom_probe' ? await getSlotConfig(params.slotKey) : null;

  const rawProvider = params.providerKind || savedCfg?.provider_kind || 'gemini';
  const normalizedProvider =
    rawProvider === 'openai' || rawProvider === 'custom_openai'
      ? 'openai_compatible'
      : rawProvider;

  const model =
    (params.modelName || savedCfg?.model_name || '').trim() ||
    (params.slotKey === 'image_visual' ? 'gemini-3.1-flash-lite-image' : 'gemini-4-hydrogen');

  const rawBaseUrl =
    (params.baseUrl ?? savedCfg?.base_url ?? '').trim() ||
    (rawProvider === 'openai'
      ? 'https://api.openai.com/v1'
      : normalizedProvider === 'ollama'
      ? 'http://127.0.0.1:11434'
      : '');

  const isMasked =
    typeof params.apiKey === 'string' &&
    (params.apiKey.includes('••••') || params.apiKey.includes('****'));
  const savedKey = savedCfg?.api_key_enc ? decryptSecret(savedCfg.api_key_enc) : '';
  const explicitKey =
    typeof params.apiKey === 'string' && params.apiKey.trim() && !isMasked
      ? params.apiKey.trim()
      : '';
  const effectiveKey = explicitKey || savedKey;

  try {
    if (normalizedProvider === 'ollama') {
      const root = rawBaseUrl.replace(/\/+$/, '');
      const resp = await fetch(`${root}/api/tags`, { method: 'GET' });
      const latencyMs = Math.max(1, Date.now() - startedAt);
      if (!resp.ok) {
        return {
          ok: false,
          connected: false,
          slotKey: params.slotKey,
          providerUsed: 'ollama',
          modelUsed: model,
          latencyMs,
          message: `اتصال به سرور Ollama (${root}) ناموفق بود (HTTP ${resp.status}).`,
          error: `Ollama HTTP ${resp.status}`,
          hint: 'مطمئن شوید سرویس Ollama روی آدرس پایه واردشده در حال اجراست.',
        };
      }
      const tagsData = (await resp.json().catch(() => ({}))) as {
        models?: { name?: string }[];
      };
      const installed = (tagsData.models || []).map((m) => String(m.name || ''));
      const hasModel = installed.some((n) => n === model || n.startsWith(`${model}:`));
      return {
        ok: true,
        connected: true,
        slotKey: params.slotKey,
        providerUsed: 'ollama',
        modelUsed: model,
        latencyMs,
        sampleReply: hasModel
          ? `مدل ${model} نصب و آماده است`
          : `سرور متصل شد (${installed.length} مدل نصب‌شده)`,
        message: hasModel
          ? `اتصال به Ollama برقرار است و مدل «${model}» در ${latencyMs}ms تایید شد.`
          : `سرور Ollama در ${latencyMs}ms متصل شد اما مدل «${model}» در لیست نصب‌شده‌ها یافت نشد (${installed.slice(0, 4).join(', ') || 'خالی'}).`,
      };
    }

    if (normalizedProvider === 'claude') {
      const claudeKey = effectiveKey || (process.env.ANTHROPIC_API_KEY || '').trim();
      if (!claudeKey) {
        return {
          ok: false,
          connected: false,
          slotKey: params.slotKey,
          providerUsed: 'claude',
          modelUsed: model,
          latencyMs: Math.max(1, Date.now() - startedAt),
          message: 'کلید API سرویس Anthropic Claude تنظیم نشده است.',
          error: 'MISSING_CLAUDE_API_KEY',
          hint: 'کلید ANTHROPIC_API_KEY را در سرور یا تنظیمات اسلات OpenAI-Compatible وارد کنید.',
        };
      }
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 12,
          messages: [{ role: 'user', content: 'Reply with OK' }],
        }),
      });
      const latencyMs = Math.max(1, Date.now() - startedAt);
      const data = (await resp.json().catch(() => ({}))) as {
        content?: { text?: string }[];
        error?: { message?: string };
      };
      if (!resp.ok) {
        return {
          ok: false,
          connected: false,
          slotKey: params.slotKey,
          providerUsed: 'claude',
          modelUsed: model,
          latencyMs,
          message: data.error?.message || `خطا در اتصال به Claude (HTTP ${resp.status})`,
          error: data.error?.message || `HTTP ${resp.status}`,
        };
      }
      const reply = String(data.content?.[0]?.text || 'OK').trim();
      return {
        ok: true,
        connected: true,
        slotKey: params.slotKey,
        providerUsed: 'claude',
        modelUsed: model,
        latencyMs,
        sampleReply: reply,
        message: `اتصال به Anthropic Claude (${model}) در ${latencyMs}ms برقرار و تایید شد.`,
      };
    }

    if (normalizedProvider === 'openai_compatible') {
      if (!rawBaseUrl) {
        return {
          ok: false,
          connected: false,
          slotKey: params.slotKey,
          providerUsed: 'openai_compatible',
          modelUsed: model,
          latencyMs: Math.max(1, Date.now() - startedAt),
          message: 'آدرس پایه (Base URL) برای ارائه‌دهنده OpenAI-Compatible وارد نشده است.',
          error: 'MISSING_BASE_URL',
          hint: 'مثال: https://api.openai.com/v1 یا آدرس سرویس OpenRouter / Groq / Ava',
        };
      }
      const openAiKey = effectiveKey || (process.env.OPENAI_API_KEY || '').trim();
      const root = rawBaseUrl.replace(/\/+$/, '');
      if (params.slotKey === 'image_visual') {
        const resp = await fetch(`${root}/models`, {
          method: 'GET',
          headers: openAiKey ? { Authorization: `Bearer ${openAiKey}` } : {},
        });
        const latencyMs = Math.max(1, Date.now() - startedAt);
        if (!resp.ok) {
          return {
            ok: false,
            connected: false,
            slotKey: params.slotKey,
            providerUsed: 'openai_compatible',
            modelUsed: model,
            latencyMs,
            message: `تست اتصال به سرویس تصویر (${root}) ناموفق بود (HTTP ${resp.status}).`,
            error: `HTTP ${resp.status}`,
          };
        }
        return {
          ok: true,
          connected: true,
          slotKey: params.slotKey,
          providerUsed: 'openai_compatible',
          modelUsed: model,
          latencyMs,
          sampleReply: 'Models endpoint reachable',
          message: `اتصال به سرویس تصویرساز OpenAI-Compatible در ${latencyMs}ms با موفقیت تایید شد.`,
        };
      }
      const sampleReply = await callOpenAiCompatibleText({
        baseUrl: root,
        apiKey: openAiKey,
        model,
        systemPrompt: 'Reply concisely with OK.',
        userPrompt: 'Ping',
      });
      const latencyMs = Math.max(1, Date.now() - startedAt);
      return {
        ok: true,
        connected: true,
        slotKey: params.slotKey,
        providerUsed: 'openai_compatible',
        modelUsed: model,
        latencyMs,
        sampleReply: sampleReply.slice(0, 60) || 'OK',
        message: `اتصال به سرویس OpenAI-Compatible (${model}) در ${latencyMs}ms با موفقیت تایید شد.`,
      };
    }

    // Google Gemini live test
    const effectiveGeminiKey = effectiveKey || resolveServerGeminiKey();
    if (!effectiveGeminiKey) {
      return {
        ok: false,
        connected: false,
        slotKey: params.slotKey,
        providerUsed: 'gemini',
        modelUsed: model,
        latencyMs: Math.max(1, Date.now() - startedAt),
        message: 'کلید API جمنای (Gemini) تنظیم نشده است.',
        error: 'MISSING_GEMINI_API_KEY',
        hint: 'کلید اختصاصی API را در همین کارت وارد و ذخیره کنید یا در متغیر محیطی GEMINI_API_KEY سرور تنظیم نمایید.',
      };
    }

    const ai = buildGeminiClient(effectiveGeminiKey);
    const probeModel =
      params.slotKey === 'image_visual' && /image/i.test(model)
        ? 'gemini-4-hydrogen'
        : model;
    const response = await ai.models.generateContent({
      model: probeModel,
      contents: 'Reply with a single word: OK',
    });
    const latencyMs = Math.max(1, Date.now() - startedAt);
    const sampleReply = String(response.text || 'OK').trim().slice(0, 60);
    return {
      ok: true,
      connected: true,
      slotKey: params.slotKey,
      providerUsed: 'gemini',
      modelUsed: model,
      latencyMs,
      sampleReply,
      message: `اتصال به Google Gemini (${model}) در ${latencyMs}ms با موفقیت برقرار و تایید شد.`,
    };
  } catch (err) {
    const latencyMs = Math.max(1, Date.now() - startedAt);
    const formatted =
      normalizedProvider === 'gemini'
        ? formatGeminiErrorFa(err, model)
        : {
            error: err instanceof Error ? err.message : 'خطای ارتباط با سرور هوش مصنوعی',
          };
    return {
      ok: false,
      connected: false,
      slotKey: params.slotKey,
      providerUsed: normalizedProvider,
      modelUsed: model,
      latencyMs,
      message: formatted.error,
      error: formatted.error,
      hint: formatted.hint,
    };
  }
}

export interface ImageStudioResult {
  promptEn: string;
  promptFa: string;
  negativePrompt: string;
  aspectRatio: string;
  generatedImageUrl?: string;
  providerUsed: string;
  modelUsed: string;
  note?: string;
}

export async function generateImagePromptAndAsset(params: {
  title: string;
  category?: string;
  style?: string;
  aspectRatio?: string;
  generateImage?: boolean;
}): Promise<ImageStudioResult> {
  const cleanTitle = params.title.trim();
  const category = (params.category || 'محصول دیجیتال').trim();
  const style = (params.style || 'editorial minimalist studio product photography').trim();
  const aspectRatio = params.aspectRatio || '16:9';

  const fallbackPromptEn = `High-craft ${style} hero visual representing "${cleanTitle}" (${category}), crisp studio lighting, ultra-detailed modern composition, clean depth of field, commercial brand aesthetic, no watermark, no messy text`;
  const fallbackPromptFa = `طراحی تصویر شاخص حرفه‌ای برای «${cleanTitle}» در دسته‌بندی «${category}» با نورپردازی استودیویی مدرن، کادربندی مینیمال، جزئیات بالا و بدون واترمارک.`;
  const fallbackNegative = 'blurry, low quality, watermark, distorted typography, cluttered background';

  let promptEn = fallbackPromptEn;
  let promptFa = fallbackPromptFa;
  let negativePrompt = fallbackNegative;
  let providerUsed = 'template_smart';
  let modelUsed = 'prompt-architect-v27';

  try {
    const promptRes = await generateTextViaSlot({
      slot: 'text_seo',
      jsonMode: true,
      systemPrompt:
        'You are an art director for an Iranian SaaS/ecommerce CMS. Return JSON with keys: promptEn (rich English image generation prompt), promptFa (Persian visual brief), negativePrompt (comma-separated English negative terms).',
      userPrompt: `Title: ${cleanTitle}\nCategory: ${category}\nVisual Style: ${style}\nAspect Ratio: ${aspectRatio}`,
    });
    const parsed = JSON.parse(promptRes.text || '{}') as Partial<ImageStudioResult>;
    if (parsed.promptEn) promptEn = parsed.promptEn;
    if (parsed.promptFa) promptFa = parsed.promptFa;
    if (parsed.negativePrompt) negativePrompt = parsed.negativePrompt;
    providerUsed = promptRes.providerUsed;
    modelUsed = promptRes.modelUsed;
  } catch {
    // Keep high-craft structured prompt if LLM key isn't active yet
  }

  let generatedImageUrl: string | undefined;
  let note: string | undefined;

  if (params.generateImage) {
    const imgSlot = await getSlotConfig('image_visual');
    const imgProvider = imgSlot?.provider_kind || 'gemini';
    const imgModel = imgSlot?.model_name || 'gemini-3.1-flash-lite-image';
    const imgKey = (imgSlot?.api_key_enc ? decryptSecret(imgSlot.api_key_enc) : '') || getEnvConfig().geminiApiKey || '';

    try {
      if (imgProvider === 'openai_compatible' && imgSlot?.base_url && imgKey) {
        const resp = await fetch(`${imgSlot.base_url.replace(/\/+$/, '')}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${imgKey}`,
          },
          body: JSON.stringify({ model: imgModel, prompt: promptEn, n: 1, size: '1024x1024', response_format: 'b64_json' }),
        });
        const data = (await resp.json().catch(() => ({}))) as { data?: { b64_json?: string; url?: string }[] };
        const b64 = data.data?.[0]?.b64_json;
        if (b64) {
          generatedImageUrl = saveGeneratedBase64Image(b64, 'png');
        } else if (data.data?.[0]?.url) {
          generatedImageUrl = data.data[0].url;
        }
        providerUsed = 'openai_compatible';
        modelUsed = imgModel;
      } else if (imgProvider === 'gemini' && imgKey) {
        const ai = buildGeminiClient(imgKey);
        const resp = await ai.models.generateContent({
          model: imgModel,
          contents: promptEn,
          config: { responseModalities: ['IMAGE'] },
        });
        const parts = resp.candidates?.[0]?.content?.parts || [];
        const inlinePart = parts.find((p) => p.inlineData?.data);
        if (inlinePart?.inlineData?.data) {
          const ext = (inlinePart.inlineData.mimeType || '').includes('jpeg') ? 'jpg' : 'png';
          generatedImageUrl = saveGeneratedBase64Image(inlinePart.inlineData.data, ext);
          providerUsed = 'gemini';
          modelUsed = imgModel;
        } else {
          note = 'پرامپت آماده شد؛ پاسخ تصویری مستقیم از مدل دریافت نشد.';
        }
      } else {
        note = 'پرامپت آماده شد. برای رندر مستقیم تصویر، کلید اسلات «image_visual» را در مرکز AI Hub تنظیم کنید.';
      }
    } catch (err) {
      note = `پرامپت آماده شد؛ خطای سرویس ساخت تصویر: ${err instanceof Error ? err.message : 'نامشخص'}`;
    }
  }

  return {
    promptEn,
    promptFa,
    negativePrompt,
    aspectRatio,
    generatedImageUrl,
    providerUsed,
    modelUsed,
    note,
  };
}

function saveGeneratedBase64Image(base64Data: string, ext: string): string {
  const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  const dir = path.join(uploadRoot, 'ai-studio');
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  fs.writeFileSync(path.join(dir, fileName), Buffer.from(base64Data, 'base64'));
  return `/uploads/ai-studio/${fileName}`;
}
