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

function buildGeminiClient(customApiKey?: string): GoogleGenAI {
  const resolvedKey = (customApiKey || '').trim() || getEnvConfig().geminiApiKey || '';
  return new GoogleGenAI({
    apiKey: resolvedKey || undefined,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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
  const provider = cfg?.provider_kind || 'gemini';
  const model =
    cfg?.model_name ||
    (params.slot === 'agent_core' ? 'gemini-4-neon' : 'gemini-4-hydrogen');
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

  const effectiveGeminiKey = apiKey || getEnvConfig().geminiApiKey || '';
  if (!effectiveGeminiKey) {
    throw new Error('کلید API برای این اسلات تنظیم نشده است. از بخش تنظیمات AI Hub کلید را وارد کنید.');
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
