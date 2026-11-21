import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';
import {
  encryptSecret,
  isMaskedPlaceholder,
  maskSecret,
} from '../../src/server/core/secretVault.js';
import {
  ensureAiHubSchema,
  getAiHubSettings,
  type AiProviderKind,
  type AiSlotKey,
  type AiSlotRow,
} from './aiHubSchema.js';
import {
  generateImagePromptAndAsset,
  testAiSlotConnection,
} from './aiProviderGateway.js';
import { registerSuperAdminAgentRoutes } from './aiAgentSubRouter.js';

const ALLOWED_SLOTS: AiSlotKey[] = ['text_seo', 'image_visual', 'agent_core'];
const ALLOWED_PROVIDERS: AiProviderKind[] = ['gemini', 'openai_compatible', 'ollama'];

export function createAiHubAgentRouter(): express.Router {
  const router = express.Router();

  // Site Admin + Super Admin: Read 3-slot config (keys ALWAYS masked, agent_core hidden from non-super-admin)
  router.get('/api/v1/modules/ai-hub/config', requireAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const isSuperAdmin = req.authUser?.role === 'super_admin';
      const rows = await dbQuery<AiSlotRow>(
        'SELECT * FROM mod_ai_provider_configs ORDER BY slot_key ASC'
      );
      const settings = await getAiHubSettings();

      const slots = rows
        .filter((r) => isSuperAdmin || r.slot_key !== 'agent_core')
        .map((r) => ({
          slotKey: r.slot_key,
          providerKind: r.provider_kind,
          baseUrl: r.base_url,
          modelName: r.model_name,
          apiKeyMasked: maskSecret(r.api_key_enc),
          hasApiKey: Boolean(r.api_key_enc),
          enabled: Boolean(r.enabled),
          updatedBy: r.updated_by,
          updatedAt: r.updated_at,
          superAdminOnly: r.slot_key === 'agent_core',
        }));

      res.json({
        ok: true,
        isSuperAdmin,
        settings: isSuperAdmin
          ? settings
          : {
              agentMode: settings.agentMode,
              liveChatAutoReply: settings.liveChatAutoReply,
              autoProfileCompletion: settings.autoProfileCompletion,
            },
        slots,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Config error' });
    }
  });

  // Save a provider slot (Site Admin: text_seo & image_visual; Super Admin ONLY: agent_core -> 403 otherwise)
  router.post('/api/v1/modules/ai-hub/slots/save', requireAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const b = (req.body || {}) as {
        slotKey?: string;
        providerKind?: string;
        baseUrl?: string;
        modelName?: string;
        apiKey?: string;
        enabled?: boolean;
      };
      const slotKey = String(b.slotKey || '') as AiSlotKey;
      if (!ALLOWED_SLOTS.includes(slotKey)) {
        res.status(400).json({ ok: false, error: 'اسلات انتخابی معتبر نیست.' });
        return;
      }
      if (slotKey === 'agent_core' && req.authUser?.role !== 'super_admin') {
        res.status(403).json({
          ok: false,
          error: 'تنظیم اسلات هسته ایجنت ۲۴/۷ (agent_core) فقط برای سوپر ادمین مجاز است.',
        });
        return;
      }

      const providerKind = ALLOWED_PROVIDERS.includes(b.providerKind as AiProviderKind)
        ? (b.providerKind as AiProviderKind)
        : 'gemini';
      const baseUrl = String(b.baseUrl || '').trim().slice(0, 300);
      const modelName = String(b.modelName || 'gemini-4-hydrogen').trim().slice(0, 120);

      const existing = await dbQuery<{ api_key_enc: string }>(
        'SELECT api_key_enc FROM mod_ai_provider_configs WHERE slot_key = $1 LIMIT 1',
        [slotKey]
      );
      let apiKeyEnc = existing[0]?.api_key_enc || '';
      if (typeof b.apiKey === 'string') {
        const trimmedKey = b.apiKey.trim();
        if (trimmedKey === '') {
          apiKeyEnc = '';
        } else if (!isMaskedPlaceholder(trimmedKey)) {
          apiKeyEnc = encryptSecret(trimmedKey);
        }
      }

      const nowIso = new Date().toISOString();
      await dbExec(
        `INSERT INTO mod_ai_provider_configs
         (slot_key, provider_kind, base_url, model_name, api_key_enc, enabled, extra_json, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, '{}', $7, $8)
         ON CONFLICT(slot_key) DO UPDATE SET
           provider_kind = excluded.provider_kind,
           base_url = excluded.base_url,
           model_name = excluded.model_name,
           api_key_enc = excluded.api_key_enc,
           enabled = excluded.enabled,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`,
        [
          slotKey,
          providerKind,
          baseUrl,
          modelName,
          apiKeyEnc,
          b.enabled === false ? 0 : 1,
          req.authUser?.phone || 'admin',
          nowIso,
        ]
      );

      res.json({
        ok: true,
        slotKey,
        providerKind,
        modelName,
        apiKeyMasked: maskSecret(apiKeyEnc),
        encryptedWith: 'AES-256-GCM',
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Save slot error' });
    }
  });

  // Live Connection Test for any AI slot (text_seo, image_visual, agent_core) or custom provider probe
  router.post('/api/v1/modules/ai-hub/slots/test', requireAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const b = (req.body || {}) as {
        slotKey?: string;
        providerKind?: 'gemini' | 'openai_compatible' | 'ollama' | 'openai' | 'claude' | 'custom_openai';
        baseUrl?: string;
        modelName?: string;
        apiKey?: string;
      };
      const slotKey = String(b.slotKey || 'text_seo') as AiSlotKey | 'custom_probe';
      if (slotKey !== 'custom_probe' && !ALLOWED_SLOTS.includes(slotKey)) {
        res.status(400).json({ ok: false, error: 'اسلات انتخابی برای تست معتبر نیست.' });
        return;
      }
      if (slotKey === 'agent_core' && req.authUser?.role !== 'super_admin') {
        res.status(403).json({
          ok: false,
          error: 'تست اتصال هسته ایجنت ۲۴/۷ فقط برای سوپر ادمین مجاز است.',
        });
        return;
      }

      const result = await testAiSlotConnection({
        slotKey,
        providerKind: b.providerKind,
        baseUrl: b.baseUrl,
        modelName: b.modelName,
        apiKey: b.apiKey,
      });

      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      res.status(500).json({
        ok: false,
        connected: false,
        error: err instanceof Error ? err.message : 'خطا در تست اتصال هوش مصنوعی',
      });
    }
  });

  // Site Admin + Super Admin: Image Prompt & Visual Asset Studio
  router.post('/api/v1/modules/ai-hub/image-studio', requireAdmin, async (req, res) => {
    try {
      const b = (req.body || {}) as {
        title?: string;
        category?: string;
        style?: string;
        aspectRatio?: string;
        generateImage?: boolean;
      };
      if (!b.title?.trim()) {
        res.status(400).json({ ok: false, error: 'عنوان محصول یا مقاله برای تولید پرامپت الزامی است.' });
        return;
      }
      const result = await generateImagePromptAndAsset({
        title: b.title.trim(),
        category: b.category,
        style: b.style,
        aspectRatio: b.aspectRatio,
        generateImage: Boolean(b.generateImage),
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Image studio error' });
    }
  });

  // Mount strict Super Admin 24/7 Autonomous Agent endpoints (HTTP 403 for non-Super-Admin)
  registerSuperAdminAgentRoutes(router);

  return router;
}
