import express from 'express';
import { Type } from '@google/genai';
import { checkRateLimit, getAiClient } from '../../core/cryptoSecurity.js';
import { requireAuth, requirePermission } from '../../core/permissionsEngine.js';
import { isAiHubModuleEnabled } from '../../../../modules/mod_ai_hub_agent/aiHubSchema.js';
import { generateTextViaSlot, getSlotConfig } from '../../../../modules/mod_ai_hub_agent/aiProviderGateway.js';

export function createAiSeoRouter(): express.Router {
  const router = express.Router();

  router.post(
    '/api/cms/ai-assist',
    requireAuth,
    requirePermission('canUseAiSeo'),
    async (req, res) => {
      const clientIp = String(
        req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
      );
      if (!checkRateLimit(`ai:${clientIp}`, 25, 60_000)) {
        res.status(429).json({
          error: 'تعداد درخواست‌های هوش مصنوعی بیش از حد مجاز در دقیقه است.',
        });
        return;
      }

      try {
        if (!(await isAiHubModuleEnabled())) {
          res.status(503).json({
            error: 'ماژول یکپارچه هوش مصنوعی (mod_ai_hub_agent) در مرکز کنترل ماژول‌ها خاموش است.',
          });
          return;
        }

        const {
          title,
          topic,
          category = 'Codex',
          mode = 'product_copy',
          tone = 'حرفه‌ای، دقیق و کاربردی',
        } = req.body || {};

        const targetTopic = String(title || topic || '').trim().slice(0, 300);
        if (!targetTopic) {
          res.status(400).json({ error: 'لطفاً عنوان یا موضوع را وارد کنید.' });
          return;
        }

        const systemInstruction = `شما موتور هوشمند سئو و تولید محتوا در پلتفرم اسکیل ۹۸ هستید.
لحن نگارش: ${tone}.
خروجی را به زبان فارسی استاندارد و کاملاً منطبق بر JSON با کلیدهای summary, bodyMarkdown, seoTitle, seoDescription, seoKeywords, suggestedSlug, altText تولید کنید.`;

        const prompt =
          mode === 'image_seo'
            ? `برای یک تصویر رسانه با عنوان/موضوع «${targetTopic}» اطلاعات سئوی تصویر را تولید کن.`
            : mode === 'product_copy'
            ? `برای محصول/اسکیل با عنوان «${targetTopic}» در دسته‌بندی «${category}» محتوا و سئو تولید کن.`
            : `برای یک مقاله تخصصی آموزشی با عنوان «${targetTopic}» در دسته‌بندی «${category}» محتوا و سئو تولید کن.`;

        const slotCfg = await getSlotConfig('text_seo');
        if (slotCfg && slotCfg.provider_kind !== 'gemini') {
          const slotRes = await generateTextViaSlot({
            slot: 'text_seo',
            systemPrompt: systemInstruction,
            userPrompt: prompt,
            jsonMode: true,
          });
          const parsed = JSON.parse(slotRes.text || '{}');
          res.json({ ...parsed, providerUsed: slotRes.providerUsed, modelUsed: slotRes.modelUsed });
          return;
        }

        const response = await getAiClient().models.generateContent({
          model: slotCfg?.model_name || 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                bodyMarkdown: { type: Type.STRING },
                seoTitle: { type: Type.STRING },
                seoDescription: { type: Type.STRING },
                seoKeywords: { type: Type.STRING },
                suggestedSlug: { type: Type.STRING },
                altText: { type: Type.STRING },
              },
              required: [
                'summary',
                'bodyMarkdown',
                'seoTitle',
                'seoDescription',
                'seoKeywords',
                'suggestedSlug',
                'altText',
              ],
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '{}').trim());
        res.json({
          ...parsed,
          providerUsed: 'gemini',
          modelUsed: slotCfg?.model_name || 'gemini-4-hydrogen',
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'خطا در ارتباط با سرویس هوش مصنوعی سرور.';
        res.status(500).json({ error: message });
      }
    }
  );

  return router;
}
