import type express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { getSetting, setSetting } from '../../src/server/database/settingsLogsRepo.js';
import { requirePermission, type AuthenticatedRequest } from '../../src/server/core/permissionsEngine.js';
import {
  encryptSecret,
  isMaskedPlaceholder,
  maskSecret,
} from '../../src/server/core/secretVault.js';

export type AiSlotKey = 'text_seo' | 'image_visual' | 'agent_core' | 'voice_audio';
export type AiProviderKind = 'gemini' | 'openai_compatible' | 'ollama';
export type MemoryScopeType = 'global_site' | 'super_admin' | 'admin' | 'user' | 'guest';
export type AgentActorRole = 'super_admin' | 'admin' | 'customer' | 'guest';

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

export interface AgentMemoryRow {
  id: string;
  scope_type: MemoryScopeType;
  user_id: string;
  visitor_session_id: string;
  memory_key: string;
  memory_value: string;
  updated_at: string;
}

export interface AgentSkillRow {
  id: string;
  slug: string;
  title_fa: string;
  category: string;
  skill_markdown: string;
  source_type: string;
  usage_count: number;
  enabled: number;
  updated_at: string;
}

export interface BaleAdminAlertsConfig {
  enabled: boolean;
  notifyApprovals: boolean;
  notifyUserRequests: boolean;
  notifyOrdersAndFailures: boolean;
  notifyCriticalErrors: boolean;
  notifyAgentEscalations: boolean;
  overrideChatId: string;
  dailyBriefingEnabled: boolean;
  dailyBriefingTime: string;
  lastBriefingDate: string;
}

export const DEFAULT_BALE_ADMIN_ALERTS: BaleAdminAlertsConfig = {
  enabled: true,
  notifyApprovals: true,
  notifyUserRequests: true,
  notifyOrdersAndFailures: true,
  notifyCriticalErrors: true,
  notifyAgentEscalations: true,
  overrideChatId: '',
  dailyBriefingEnabled: false,
  dailyBriefingTime: '09:00',
  lastBriefingDate: '',
};

export type InstagramPublishMode = 'package_only' | 'meta_graph_api';

export interface SocialPublisherStoredConfig {
  baleChannelEnabled: boolean;
  baleChannelId: string;
  telegramChannelEnabled: boolean;
  telegramBotTokenEnc: string;
  telegramChannelId: string;
  telegramProxyUrl: string;
  instagramEnabled: boolean;
  instagramMode: InstagramPublishMode;
  instagramAccountId: string;
  instagramAccessTokenEnc: string;
  requireApprovalBeforePublish: boolean;
  updatedAt: string;
}

export interface SocialPublisherPublicConfig {
  baleChannelEnabled: boolean;
  baleChannelId: string;
  telegramChannelEnabled: boolean;
  telegramBotTokenMasked: string;
  hasTelegramBotToken: boolean;
  telegramChannelId: string;
  telegramProxyUrl: string;
  instagramEnabled: boolean;
  instagramMode: InstagramPublishMode;
  instagramAccountId: string;
  instagramAccessTokenMasked: string;
  hasInstagramAccessToken: boolean;
  requireApprovalBeforePublish: boolean;
  updatedAt: string;
}

export const DEFAULT_SOCIAL_PUBLISHER_CONFIG: SocialPublisherStoredConfig = {
  baleChannelEnabled: false,
  baleChannelId: '',
  telegramChannelEnabled: false,
  telegramBotTokenEnc: '',
  telegramChannelId: '',
  telegramProxyUrl: '',
  instagramEnabled: false,
  instagramMode: 'package_only',
  instagramAccountId: '',
  instagramAccessTokenEnc: '',
  requireApprovalBeforePublish: true,
  updatedAt: '',
};

export type VoiceReplyProvider = 'free_browser' | 'slot4_paid_tts';
export type JarvisAvatarPreset = 'orb_cyber' | 'bot_minimal' | 'shield_ai';

export interface JarvisSettingsConfig {
  enabled: boolean;
  mascotEnabled: boolean;
  mascotName: string;
  mascotPersona: string;
  mascotAvatar: JarvisAvatarPreset;
  voiceReplyEnabled: boolean;
  voiceReplyProvider: VoiceReplyProvider;
  ttsModel: string;
  ttsVoice: string;
  allowSkillToProduct: boolean;
  allowSocialPublisher: boolean;
}

export const DEFAULT_JARVIS_SETTINGS: JarvisSettingsConfig = {
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

export interface AiHubRuntimeSettings {
  agentMode: 'light' | 'autonomous_24_7';
  liveChatAutoReply: boolean;
  autoProfileCompletion: boolean;
  botBridgeEnabled: boolean;
  botBridgePlatforms: ('bale' | 'eitaa' | 'telegram')[];
  superAdminPhone: string;
  baleAlerts: BaleAdminAlertsConfig;
  jarvisSettings: JarvisSettingsConfig;
}

export const DEFAULT_AI_HUB_SETTINGS: AiHubRuntimeSettings = {
  agentMode: 'autonomous_24_7',
  liveChatAutoReply: true,
  autoProfileCompletion: true,
  botBridgeEnabled: false,
  botBridgePlatforms: ['bale', 'eitaa', 'telegram'],
  superAdminPhone: '09122685759',
  baleAlerts: DEFAULT_BALE_ADMIN_ALERTS,
  jarvisSettings: DEFAULT_JARVIS_SETTINGS,
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

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ai_agent_memory (
      id TEXT PRIMARY KEY,
      scope_type TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT '',
      visitor_session_id TEXT NOT NULL DEFAULT '',
      memory_key TEXT NOT NULL,
      memory_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_ai_social_packages (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL DEFAULT '',
      entity_title TEXT NOT NULL,
      cta_url TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      channels_json TEXT NOT NULL DEFAULT '[]',
      instagram_format TEXT NOT NULL DEFAULT 'post',
      payload_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      approval_id TEXT NOT NULL DEFAULT '',
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  try {
    await dbExec(
      'CREATE INDEX IF NOT EXISTS idx_ai_mem_scope_user ON mod_ai_agent_memory (scope_type, user_id)'
    );
    await dbExec(
      'CREATE INDEX IF NOT EXISTS idx_ai_mem_scope_visitor ON mod_ai_agent_memory (scope_type, visitor_session_id)'
    );
  } catch {
    // ignore index creation notice on existing DB
  }

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

function normalizeJarvisSettings(
  base: JarvisSettingsConfig,
  patch?: Partial<JarvisSettingsConfig>
): JarvisSettingsConfig {
  const src = { ...base, ...(patch || {}) };
  const validAvatars: JarvisAvatarPreset[] = ['orb_cyber', 'bot_minimal', 'shield_ai'];
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : base.enabled,
    mascotEnabled: typeof src.mascotEnabled === 'boolean' ? src.mascotEnabled : base.mascotEnabled,
    mascotName: String(src.mascotName || DEFAULT_JARVIS_SETTINGS.mascotName).trim().slice(0, 40) || 'جارویس',
    mascotPersona: String(src.mascotPersona ?? DEFAULT_JARVIS_SETTINGS.mascotPersona).trim().slice(0, 320),
    mascotAvatar: validAvatars.includes(src.mascotAvatar as JarvisAvatarPreset)
      ? (src.mascotAvatar as JarvisAvatarPreset)
      : base.mascotAvatar,
    voiceReplyEnabled:
      typeof src.voiceReplyEnabled === 'boolean' ? src.voiceReplyEnabled : false,
    voiceReplyProvider:
      src.voiceReplyProvider === 'slot4_paid_tts' ? 'slot4_paid_tts' : 'free_browser',
    ttsModel:
      String(src.ttsModel || DEFAULT_JARVIS_SETTINGS.ttsModel).trim().slice(0, 80) ||
      'gemini-3.8-flash-tts',
    ttsVoice:
      String(src.ttsVoice || DEFAULT_JARVIS_SETTINGS.ttsVoice).trim().slice(0, 40) || 'alloy',
    allowSkillToProduct:
      typeof src.allowSkillToProduct === 'boolean' ? src.allowSkillToProduct : false,
    allowSocialPublisher:
      typeof src.allowSocialPublisher === 'boolean' ? src.allowSocialPublisher : false,
  };
}

function normalizeBriefingTime(raw: unknown, fallback = '09:00'): string {
  const s = String(raw || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return fallback;
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export async function getAiHubSettings(): Promise<AiHubRuntimeSettings> {
  const saved = await getSetting<Partial<AiHubRuntimeSettings>>(
    'mod_ai_hub_runtime_settings',
    DEFAULT_AI_HUB_SETTINGS
  );
  const savedBale = saved?.baleAlerts;
  return {
    ...DEFAULT_AI_HUB_SETTINGS,
    ...(saved || {}),
    baleAlerts: {
      ...DEFAULT_BALE_ADMIN_ALERTS,
      ...(savedBale || {}),
      dailyBriefingEnabled:
        typeof savedBale?.dailyBriefingEnabled === 'boolean'
          ? savedBale.dailyBriefingEnabled
          : false,
      dailyBriefingTime: normalizeBriefingTime(savedBale?.dailyBriefingTime, '09:00'),
      lastBriefingDate: String(savedBale?.lastBriefingDate || '').trim().slice(0, 20),
    },
    jarvisSettings: normalizeJarvisSettings(DEFAULT_JARVIS_SETTINGS, saved?.jarvisSettings),
  };
}

export async function saveAiHubSettings(
  next: Omit<Partial<AiHubRuntimeSettings>, 'baleAlerts' | 'jarvisSettings'> & {
    baleAlerts?: Partial<BaleAdminAlertsConfig>;
    jarvisSettings?: Partial<JarvisSettingsConfig>;
  }
): Promise<AiHubRuntimeSettings> {
  const current = await getAiHubSettings();
  const mergedBaleRaw = {
    ...DEFAULT_BALE_ADMIN_ALERTS,
    ...(current.baleAlerts || {}),
    ...(next.baleAlerts || {}),
  };
  const merged: AiHubRuntimeSettings = {
    ...current,
    ...next,
    agentMode:
      next.agentMode === 'autonomous_24_7'
        ? 'autonomous_24_7'
        : next.agentMode === 'light'
        ? 'light'
        : current.agentMode,
    baleAlerts: {
      ...mergedBaleRaw,
      dailyBriefingEnabled: Boolean(mergedBaleRaw.dailyBriefingEnabled),
      dailyBriefingTime: normalizeBriefingTime(mergedBaleRaw.dailyBriefingTime, '09:00'),
      lastBriefingDate: String(mergedBaleRaw.lastBriefingDate || '').trim().slice(0, 20),
    },
    jarvisSettings: normalizeJarvisSettings(current.jarvisSettings, next.jarvisSettings),
  };
  await setSetting('mod_ai_hub_runtime_settings', merged);
  return merged;
}

export async function getSocialPublisherConfig(): Promise<SocialPublisherStoredConfig> {
  const saved = await getSetting<Partial<SocialPublisherStoredConfig>>(
    'mod_ai_social_publisher_config',
    DEFAULT_SOCIAL_PUBLISHER_CONFIG
  );
  return {
    ...DEFAULT_SOCIAL_PUBLISHER_CONFIG,
    ...(saved || {}),
    instagramMode: saved?.instagramMode === 'meta_graph_api' ? 'meta_graph_api' : 'package_only',
    requireApprovalBeforePublish:
      typeof saved?.requireApprovalBeforePublish === 'boolean'
        ? saved.requireApprovalBeforePublish
        : true,
  };
}

export async function getMaskedSocialPublisherConfig(): Promise<SocialPublisherPublicConfig> {
  const cfg = await getSocialPublisherConfig();
  return {
    baleChannelEnabled: Boolean(cfg.baleChannelEnabled),
    baleChannelId: cfg.baleChannelId || '',
    telegramChannelEnabled: Boolean(cfg.telegramChannelEnabled),
    telegramBotTokenMasked: maskSecret(cfg.telegramBotTokenEnc),
    hasTelegramBotToken: Boolean(cfg.telegramBotTokenEnc),
    telegramChannelId: cfg.telegramChannelId || '',
    telegramProxyUrl: cfg.telegramProxyUrl || '',
    instagramEnabled: Boolean(cfg.instagramEnabled),
    instagramMode: cfg.instagramMode === 'meta_graph_api' ? 'meta_graph_api' : 'package_only',
    instagramAccountId: cfg.instagramAccountId || '',
    instagramAccessTokenMasked: maskSecret(cfg.instagramAccessTokenEnc),
    hasInstagramAccessToken: Boolean(cfg.instagramAccessTokenEnc),
    requireApprovalBeforePublish: cfg.requireApprovalBeforePublish !== false,
    updatedAt: cfg.updatedAt || '',
  };
}

export async function saveSocialPublisherConfig(patch: {
  baleChannelEnabled?: boolean;
  baleChannelId?: string;
  telegramChannelEnabled?: boolean;
  telegramBotToken?: string;
  telegramChannelId?: string;
  telegramProxyUrl?: string;
  instagramEnabled?: boolean;
  instagramMode?: InstagramPublishMode;
  instagramAccountId?: string;
  instagramAccessToken?: string;
  requireApprovalBeforePublish?: boolean;
}): Promise<SocialPublisherPublicConfig> {
  const current = await getSocialPublisherConfig();

  let telegramBotTokenEnc = current.telegramBotTokenEnc || '';
  if (typeof patch.telegramBotToken === 'string') {
    const trimmed = patch.telegramBotToken.trim();
    if (trimmed === '') {
      telegramBotTokenEnc = '';
    } else if (!isMaskedPlaceholder(trimmed)) {
      telegramBotTokenEnc = encryptSecret(trimmed);
    }
  }

  let instagramAccessTokenEnc = current.instagramAccessTokenEnc || '';
  if (typeof patch.instagramAccessToken === 'string') {
    const trimmed = patch.instagramAccessToken.trim();
    if (trimmed === '') {
      instagramAccessTokenEnc = '';
    } else if (!isMaskedPlaceholder(trimmed)) {
      instagramAccessTokenEnc = encryptSecret(trimmed);
    }
  }

  const merged: SocialPublisherStoredConfig = {
    baleChannelEnabled:
      typeof patch.baleChannelEnabled === 'boolean'
        ? patch.baleChannelEnabled
        : current.baleChannelEnabled,
    baleChannelId:
      typeof patch.baleChannelId === 'string'
        ? patch.baleChannelId.trim().slice(0, 120)
        : current.baleChannelId,
    telegramChannelEnabled:
      typeof patch.telegramChannelEnabled === 'boolean'
        ? patch.telegramChannelEnabled
        : current.telegramChannelEnabled,
    telegramBotTokenEnc,
    telegramChannelId:
      typeof patch.telegramChannelId === 'string'
        ? patch.telegramChannelId.trim().slice(0, 120)
        : current.telegramChannelId,
    telegramProxyUrl:
      typeof patch.telegramProxyUrl === 'string'
        ? patch.telegramProxyUrl.trim().replace(/\/+$/, '').slice(0, 300)
        : current.telegramProxyUrl,
    instagramEnabled:
      typeof patch.instagramEnabled === 'boolean'
        ? patch.instagramEnabled
        : current.instagramEnabled,
    instagramMode:
      patch.instagramMode === 'meta_graph_api'
        ? 'meta_graph_api'
        : patch.instagramMode === 'package_only'
        ? 'package_only'
        : current.instagramMode,
    instagramAccountId:
      typeof patch.instagramAccountId === 'string'
        ? patch.instagramAccountId.trim().slice(0, 120)
        : current.instagramAccountId,
    instagramAccessTokenEnc,
    requireApprovalBeforePublish:
      typeof patch.requireApprovalBeforePublish === 'boolean'
        ? patch.requireApprovalBeforePublish
        : current.requireApprovalBeforePublish,
    updatedAt: new Date().toISOString(),
  };

  await setSetting('mod_ai_social_publisher_config', merged);
  return getMaskedSocialPublisherConfig();
}

export async function isAiHubModuleEnabled(): Promise<boolean> {
  const reg = await getSetting<{ id: string; enabled: boolean }[]>('site_modules_registry', []);
  const found = reg.find((m) => m.id === 'mod_ai_hub_agent');
  return found ? Boolean(found.enabled) : true;
}

export async function upsertAgentMemory(params: {
  scopeType: MemoryScopeType;
  userId?: string;
  visitorSessionId?: string;
  memoryKey: string;
  memoryValue: string;
}): Promise<AgentMemoryRow> {
  await ensureAiHubSchema();
  const scopeType = params.scopeType;
  const userId = String(params.userId || '').trim().slice(0, 120);
  const visitorSessionId = String(params.visitorSessionId || '').trim().slice(0, 120);
  const memoryKey = String(params.memoryKey || '').trim().slice(0, 120);
  const memoryValue = String(params.memoryValue || '').trim().slice(0, 2000);
  const nowIso = new Date().toISOString();

  const existing = await dbQuery<{ id: string }>(
    `SELECT id FROM mod_ai_agent_memory
     WHERE scope_type = $1 AND user_id = $2 AND visitor_session_id = $3 AND memory_key = $4
     LIMIT 1`,
    [scopeType, userId, visitorSessionId, memoryKey]
  );

  const id =
    existing[0]?.id ||
    `mem_${scopeType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  if (existing[0]?.id) {
    await dbExec(
      'UPDATE mod_ai_agent_memory SET memory_value = $1, updated_at = $2 WHERE id = $3',
      [memoryValue, nowIso, id]
    );
  } else {
    await dbExec(
      `INSERT INTO mod_ai_agent_memory
       (id, scope_type, user_id, visitor_session_id, memory_key, memory_value, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, scopeType, userId, visitorSessionId, memoryKey, memoryValue, nowIso]
    );
  }

  return {
    id,
    scope_type: scopeType,
    user_id: userId,
    visitor_session_id: visitorSessionId,
    memory_key: memoryKey,
    memory_value: memoryValue,
    updated_at: nowIso,
  };
}

/**
 * Strictly isolated per-role & per-user memory retrieval (zero cross-user leakage):
 * - guest: ONLY 'global_site' + own ('guest' with matching visitor_session_id)
 * - customer: ONLY 'global_site' + own ('user' with matching user_id) + own ('guest' with matching visitor_session_id)
 * - admin: 'global_site' + 'admin' (shared or own user_id) — NEVER 'super_admin'
 * - super_admin: 'global_site' + 'super_admin' + 'admin'
 */
export async function readScopedAgentMemories(params: {
  actorRole: AgentActorRole;
  userId?: string;
  visitorSessionId?: string;
  limit?: number;
}): Promise<AgentMemoryRow[]> {
  await ensureAiHubSchema();
  const limit = Math.min(60, Math.max(5, Number(params.limit || 30)));
  const cleanUserId = String(params.userId || '').trim();
  const cleanVisitorSid = String(params.visitorSessionId || '').trim();

  if (params.actorRole === 'super_admin') {
    return dbQuery<AgentMemoryRow>(
      `SELECT * FROM mod_ai_agent_memory
       WHERE scope_type IN ('global_site', 'super_admin', 'admin')
       ORDER BY updated_at DESC LIMIT $1`,
      [limit]
    );
  }

  if (params.actorRole === 'admin') {
    if (cleanUserId) {
      return dbQuery<AgentMemoryRow>(
        `SELECT * FROM mod_ai_agent_memory
         WHERE scope_type = 'global_site'
            OR (scope_type = 'admin' AND (user_id = '' OR user_id = $1))
         ORDER BY updated_at DESC LIMIT $2`,
        [cleanUserId, limit]
      );
    }
    return dbQuery<AgentMemoryRow>(
      `SELECT * FROM mod_ai_agent_memory
       WHERE scope_type = 'global_site' OR (scope_type = 'admin' AND user_id = '')
       ORDER BY updated_at DESC LIMIT $1`,
      [limit]
    );
  }

  if (params.actorRole === 'customer') {
    if (cleanUserId && cleanVisitorSid) {
      return dbQuery<AgentMemoryRow>(
        `SELECT * FROM mod_ai_agent_memory
         WHERE scope_type = 'global_site'
            OR (scope_type = 'user' AND user_id = $1)
            OR (scope_type = 'guest' AND visitor_session_id = $2)
         ORDER BY updated_at DESC LIMIT $3`,
        [cleanUserId, cleanVisitorSid, limit]
      );
    }
    if (cleanUserId) {
      return dbQuery<AgentMemoryRow>(
        `SELECT * FROM mod_ai_agent_memory
         WHERE scope_type = 'global_site'
            OR (scope_type = 'user' AND user_id = $1)
         ORDER BY updated_at DESC LIMIT $2`,
        [cleanUserId, limit]
      );
    }
    return dbQuery<AgentMemoryRow>(
      `SELECT * FROM mod_ai_agent_memory
       WHERE scope_type = 'global_site'
       ORDER BY updated_at DESC LIMIT $1`,
      [limit]
    );
  }

  // Guest role: strictly global_site + own visitor_session_id only
  if (cleanVisitorSid) {
    return dbQuery<AgentMemoryRow>(
      `SELECT * FROM mod_ai_agent_memory
       WHERE scope_type = 'global_site'
          OR (scope_type = 'guest' AND visitor_session_id = $1)
       ORDER BY updated_at DESC LIMIT $2`,
      [cleanVisitorSid, limit]
    );
  }

  return dbQuery<AgentMemoryRow>(
    `SELECT * FROM mod_ai_agent_memory
     WHERE scope_type = 'global_site'
     ORDER BY updated_at DESC LIMIT $1`,
    [limit]
  );
}

/**
 * Promotes a guest session's private memories to the authenticated user scope upon inline OTP login.
 */
export async function migrateGuestMemoriesToUser(params: {
  visitorSessionId: string;
  userId: string;
}): Promise<number> {
  await ensureAiHubSchema();
  const sid = String(params.visitorSessionId || '').trim();
  const uid = String(params.userId || '').trim();
  if (!sid || !uid) return 0;

  const guestRows = await dbQuery<AgentMemoryRow>(
    `SELECT * FROM mod_ai_agent_memory WHERE scope_type = 'guest' AND visitor_session_id = $1`,
    [sid]
  );
  for (const row of guestRows) {
    await upsertAgentMemory({
      scopeType: 'user',
      userId: uid,
      visitorSessionId: '',
      memoryKey: row.memory_key,
      memoryValue: row.memory_value,
    });
  }
  if (guestRows.length > 0) {
    await dbExec(
      `DELETE FROM mod_ai_agent_memory WHERE scope_type = 'guest' AND visitor_session_id = $1`,
      [sid]
    );
  }
  return guestRows.length;
}

export async function getAllActiveAgentSkills(): Promise<AgentSkillRow[]> {
  await ensureAiHubSchema();
  return dbQuery<AgentSkillRow>(
    'SELECT * FROM mod_ai_agent_skills WHERE enabled = 1 ORDER BY updated_at DESC'
  );
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
