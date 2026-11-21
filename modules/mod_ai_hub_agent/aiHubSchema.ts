import type express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { getSetting, setSetting } from '../../src/server/database/settingsLogsRepo.js';
import { requirePermission, type AuthenticatedRequest } from '../../src/server/core/permissionsEngine.js';

export type AiSlotKey = 'text_seo' | 'image_visual' | 'agent_core' | 'voice_audio';
export type AiProviderKind = 'gemini' | 'openai_compatible' | 'ollama';

export interface AiSlotRow {
  slot_key: AiSlotKey;
  provider_kind: AiProviderKind;
  base_url: string;
  model_name: string;
  api_key_enc: string;
  enabled: number;
  extra_json: string;
  updated_by: string;
  updated_at: string;
}

export interface AiHubRuntimeSettings {
  agentMode: 'light' | 'autonomous_24_7';
  liveChatAutoReply: boolean;
  autoProfileCompletion: boolean;
  botBridgeEnabled: boolean;
  botBridgePlatforms: ('bale' | 'eitaa' | 'telegram')[];
  superAdminPhone: string;
}

export const DEFAULT_AI_HUB_SETTINGS: AiHubRuntimeSettings = {
  agentMode: 'autonomous_24_7',
  liveChatAutoReply: true,
  autoProfileCompletion: true,
  botBridgeEnabled: false,
  botBridgePlatforms: ['bale', 'eitaa', 'telegram'],
  superAdminPhone: '09122685759',
};

let aiHubSchemaReady = false;

export async function ensureAiHubSchema(): Promise<void> {
  if (aiHubSchemaReady) return;

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ai_provider_configs (
      slot_key TEXT PRIMARY KEY,
      provider_kind TEXT NOT NULL,
      base_url TEXT NOT NULL DEFAULT '',
      model_name TEXT NOT NULL,
      api_key_enc TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      extra_json TEXT NOT NULL DEFAULT '{}',
      updated_by TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ai_agent_skills (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title_fa TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'operations',
      skill_markdown TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'learned',
      usage_count INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ai_agent_tasks (
      id TEXT PRIMARY KEY,
      title_fa TEXT NOT NULL,
      task_type TEXT NOT NULL,
      schedule_cron TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      last_run_at TEXT NOT NULL DEFAULT '',
      last_result_summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ai_agent_conversations (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL DEFAULT 'command_center',
      sender_phone TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL,
      message_text TEXT NOT NULL,
      tool_calls_json TEXT NOT NULL DEFAULT '[]',
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ai_approval_queue (
      id TEXT PRIMARY KEY,
      title_fa TEXT NOT NULL,
      action_type TEXT NOT NULL,
      summary_fa TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT NOT NULL DEFAULT '',
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  const nowIso = new Date().toISOString();
  const defaultSlots: {
    slot: AiSlotKey;
    provider: AiProviderKind;
    baseUrl: string;
    model: string;
  }[] = [
    { slot: 'text_seo', provider: 'gemini', baseUrl: '', model: 'gemini-4-hydrogen' },
    { slot: 'image_visual', provider: 'gemini', baseUrl: '', model: 'gemini-3.1-flash-lite-image' },
    { slot: 'agent_core', provider: 'gemini', baseUrl: '', model: 'gemini-4-hydrogen' },
    {
      slot: 'voice_audio',
      provider: 'openai_compatible',
      baseUrl: 'https://api.gapgpt.app/v1',
      model: 'gapgpt/whisper-1',
    },
  ];

  for (const s of defaultSlots) {
    const existing = await dbQuery<{ slot_key: string; provider_kind: string; model_name: string }>(
      'SELECT slot_key, provider_kind, model_name FROM mod_ai_provider_configs WHERE slot_key = $1 LIMIT 1',
      [s.slot]
    );
    if (existing.length === 0) {
      await dbExec(
        `INSERT INTO mod_ai_provider_configs
         (slot_key, provider_kind, base_url, model_name, api_key_enc, enabled, extra_json, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, '', 1, '{}', 'system', $5)`,
        [s.slot, s.provider, s.baseUrl, s.model, nowIso]
      );
    } else if (
      existing[0].provider_kind === 'gemini' &&
      /^(gemini-1\.5|gemini-2\.0|gemini-pro\b)/i.test(String(existing[0].model_name || ''))
    ) {
      await dbExec(
        'UPDATE mod_ai_provider_configs SET model_name = $1, updated_at = $2 WHERE slot_key = $3',
        [s.model, nowIso, s.slot]
      );
    }
  }

  const skillCountRows = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM mod_ai_agent_skills'
  );
  if (Number(skillCountRows[0]?.cnt || 0) === 0) {
    await dbExec(
      `INSERT INTO mod_ai_agent_skills
       (id, slug, title_fa, category, skill_markdown, source_type, usage_count, enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'core', 1, 1, $6)`,
      [
        'skill_livechat_profile',
        'livechat-profile-completion',
        'تکمیل محترمانه پروفایل مشتریان چت آنلاین',
        'support',
        '# SKILL: تکمیل خودکار پروفایل کاربر در چت\n- اگر کاربر با موبایل وارد شد و نام ندارد، محترمانه نامش را بپرس.\n- به محض اعلام نام، ابزار `update_visitor_user_profile` را صدا بزن.\n- در پاسخ‌های بعدی کاربر را با نام خودش خطاب کن.',
        nowIso,
      ]
    );
    await dbExec(
      `INSERT INTO mod_ai_agent_skills
       (id, slug, title_fa, category, skill_markdown, source_type, usage_count, enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'core', 1, 1, $6)`,
      [
        'skill_seo_persian_editorial',
        'seo-persian-editorial',
        'استاندارد سئوی فارسی و ساختار محتوا',
        'seo',
        '# SKILL: استاندارد سئو و نگارش فارسی\n- عنوان سئو بین ۴۵ تا ۶۲ کاراکتر همراه با کلیدواژه اصلی.\n- متادیسکریپشن ترغیب‌کننده بین ۱۲۵ تا ۱۵۵ کاراکتر.\n- اجتناب از تکرار مصنوعی کلیدواژه و رعایت نیم‌فاصله استاندارد فارسی.',
        nowIso,
      ]
    );
  }

  const taskCountRows = await dbQuery<{ cnt: number | string }>(
    'SELECT COUNT(*) AS cnt FROM mod_ai_agent_tasks'
  );
  if (Number(taskCountRows[0]?.cnt || 0) === 0) {
    await dbExec(
      `INSERT INTO mod_ai_agent_tasks
       (id, title_fa, task_type, schedule_cron, prompt_template, status, last_run_at, last_result_summary, created_at)
       VALUES ($1, $2, $3, $4, $5, 'active', '', 'آماده اجرا توسط ایجنت ۲۴/۷', $6)`,
      [
        'task_daily_seo_audit',
        'پایش روزانه سئو و پیشنهاد بهبود متاتگ محصولات',
        'seo_audit',
        '0 8 * * *',
        'محصولات دارای عنوان یا متادیسکریپشن ناقص را بررسی کن و پیشنهاد اصلاح را در صف تایید ۱-کلیکی ثبت کن.',
        nowIso,
      ]
    );
    await dbExec(
      `INSERT INTO mod_ai_agent_tasks
       (id, title_fa, task_type, schedule_cron, prompt_template, status, last_run_at, last_result_summary, created_at)
       VALUES ($1, $2, $3, $4, $5, 'active', '', 'آماده اجرا توسط ایجنت ۲۴/۷', $6)`,
      [
        'task_unread_chat_escalation',
        'پایش پیام‌های فوری پاسخ‌داده‌نشده چت آنلاین',
        'chat_escalation',
        '*/15 * * * *',
        'مکالمات فوری چت آنلاین که بیش از ۱۰ دقیقه بدون پاسخ مانده‌اند را به پل ربات ادمین اطلاع بده.',
        nowIso,
      ]
    );
  }

  aiHubSchemaReady = true;
}

export async function getAiHubSettings(): Promise<AiHubRuntimeSettings> {
  const saved = await getSetting<Partial<AiHubRuntimeSettings>>(
    'mod_ai_hub_runtime_settings',
    DEFAULT_AI_HUB_SETTINGS
  );
  return { ...DEFAULT_AI_HUB_SETTINGS, ...(saved || {}) };
}

export async function saveAiHubSettings(
  next: Partial<AiHubRuntimeSettings>
): Promise<AiHubRuntimeSettings> {
  const current = await getAiHubSettings();
  const merged: AiHubRuntimeSettings = {
    ...current,
    ...next,
    agentMode: next.agentMode === 'autonomous_24_7' ? 'autonomous_24_7' : next.agentMode === 'light' ? 'light' : current.agentMode,
  };
  await setSetting('mod_ai_hub_runtime_settings', merged);
  return merged;
}

export async function isAiHubModuleEnabled(): Promise<boolean> {
  const reg = await getSetting<{ id: string; enabled: boolean }[]>('site_modules_registry', []);
  const found = reg.find((m) => m.id === 'mod_ai_hub_agent');
  return found ? Boolean(found.enabled) : true;
}

/**
 * Strict Super Admin guard for 24/7 Autonomous Agent endpoints.
 * Guarantees HTTP 403 for any standard Site Admin or customer.
 */
export const requireStrictSuperAdmin: express.RequestHandler = (req, res, next) => {
  const baseGuard = requirePermission('super_admin');
  baseGuard(req, res, () => {
    const authReq = req as AuthenticatedRequest;
    const role = authReq.authSession?.role;
    if (role !== 'super_admin') {
      res.status(403).json({
        ok: false,
        error: 'دسترسی مسدود شد: تنظیمات هسته ایجنت ۲۴/۷ و کلیدهای پیشرفته فقط مختص سوپر ادمین است.',
      });
      return;
    }
    next();
  });
};
