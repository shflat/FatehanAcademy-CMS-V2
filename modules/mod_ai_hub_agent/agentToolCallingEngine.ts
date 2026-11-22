import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import { dbExec, dbQuery, formatPersianDateTime } from '../../src/server/database/connection.js';
import { getSetting, writeSystemLog } from '../../src/server/database/settingsLogsRepo.js';
import { decryptSecret } from '../../src/server/core/secretVault.js';
import { getEnvConfig } from '../../src/server/core/envConfig.js';
import {
  ensureAiHubSchema,
  getAiHubSettings,
  getAllActiveAgentSkills,
  readScopedAgentMemories,
  upsertAgentMemory,
  type AgentActorRole,
} from './aiHubSchema.js';
import { getSlotConfig } from './aiProviderGateway.js';
import { resolveBaleBotTokenOnly, sendSuperAdminBaleAlert } from './baleAlertBridge.js';
import { DEFAULT_SITE_MODULES_REGISTRY } from '../../src/server/modules/admin/modulesConfigRouter.js';
import {
  runAuditMissingSeoAndMediaTool,
  runFixItemSeoAndMediaTool,
  runSkillToProductTool,
} from './agentContentFactory.js';
import { runPublishOrDraftSocialPostTool } from './agentSocialPublisher.js';
import {
  runCreateOrUpdatePageTool,
  runManageKnowledgeCacheTool,
  runManageSiteModulesTool,
  runReplyToLiveChatTool,
} from './jarvisCmsBuilderTools.js';

export type AgentUiActionType = 'OPEN_INLINE_OTP';

export interface ExecutedToolRecord {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
}

export interface JarvisPageContext {
  path: string;
  pageTitle: string;
  entityType: 'product' | 'article' | 'order' | 'admin_panel' | 'storefront';
  entityId?: string;
  entitySlug?: string;
}

export interface AgentToolContext {
  actorRole: AgentActorRole;
  channel: 'command_center' | 'live_chat';
  userId?: string; // phone or admin id
  userDisplayName?: string;
  visitorSessionId?: string;
  pageContext?: JarvisPageContext;
  // Mutable turn side-effects captured by tools
  uiAction?: AgentUiActionType;
  uiActionPayload?: Record<string, unknown>;
  updatedDisplayName?: string;
}

export interface MultiStepAgentTurnResult {
  replyText: string;
  executedTools: ExecutedToolRecord[];
  uiAction?: AgentUiActionType;
  uiActionPayload?: Record<string, unknown>;
  updatedDisplayName?: string;
  providerUsed: string;
  modelUsed: string;
  usedFallback?: boolean;
  error?: string;
}

interface OpenAiToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required?: string[];
    };
  };
}

const ALL_TOOL_DEFS: OpenAiToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'inspect_site_capabilities',
      description:
        'Reads active CMS modules (modules/registry.json), active storefront theme, products/articles/pages counts, and active forms in mod_forms.',
      parameters: {
        type: 'object',
        properties: {
          includeInactiveModules: {
            type: 'boolean',
            description: 'Include disabled modules in output (Super Admin/Admin only).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_site_catalog',
      description:
        'Searches real products, articles, and dynamic pages in the Skill 98 / DPATech CMS database.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Keyword or phrase in Persian or English to search for.',
          },
          entityType: {
            type: 'string',
            description: 'Filter search scope.',
            enum: ['all', 'products', 'articles', 'pages'],
          },
          limit: {
            type: 'number',
            description: 'Max items per entity type (1 to 15).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_system_logs',
      description:
        'Super Admin diagnostic tool: queries recent system_logs, orders (including failed/pending checkouts), and mod_delivery_logs.',
      parameters: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            description: 'Which diagnostic source to query.',
            enum: ['all', 'system_logs', 'orders', 'delivery_logs'],
          },
          levelOrStatus: {
            type: 'string',
            description: 'Optional filter such as error, warning, failed, pending, paid.',
          },
          limit: {
            type: 'number',
            description: 'Number of recent records to return (1 to 30).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_learned_skill',
      description:
        'Super Admin only: permanently saves or updates an operational rule/instruction into mod_ai_agent_skills (SKILL.md) and mod_ai_agent_memory.',
      parameters: {
        type: 'object',
        properties: {
          titleFa: {
            type: 'string',
            description: 'Short Persian title for this learned skill or rule.',
          },
          slug: {
            type: 'string',
            description: 'Optional ASCII slug (e.g. shipping-rule-tehran).',
          },
          category: {
            type: 'string',
            description: 'Category such as operations, support, seo, sales, security.',
          },
          skillMarkdown: {
            type: 'string',
            description: 'Detailed Markdown instructions to always follow on future turns.',
          },
          memoryScope: {
            type: 'string',
            description: 'Memory scope for the saved rule.',
            enum: ['global_site', 'super_admin'],
          },
        },
        required: ['titleFa', 'skillMarkdown'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'trigger_chat_otp_box',
      description:
        'Live Chat tool for guests: opens the inline Mobile + OTP signup/login verification card right inside the chat widget so the visitor can authenticate and continue their request.',
      parameters: {
        type: 'object',
        properties: {
          reasonFa: {
            type: 'string',
            description: 'Short Persian message explaining why mobile verification is requested.',
          },
          pendingRequestSummary: {
            type: 'string',
            description:
              'Summary of the guest request to save in private guest memory so it can be submitted immediately after OTP login.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_visitor_user_profile',
      description:
        'Live Chat tool: updates the authenticated user full_name in users, auth_sessions, live chat session, and saves it in their private mod_ai_agent_memory.',
      parameters: {
        type: 'object',
        properties: {
          fullName: {
            type: 'string',
            description: 'User real full name in Persian or English.',
          },
        },
        required: ['fullName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_or_submit_user_request',
      description:
        'After user confirmation & authentication, submits a structured user request into an active form in mod_forms or creates a prioritized support ticket/lead, returning a tracking code.',
      parameters: {
        type: 'object',
        properties: {
          requestTitle: {
            type: 'string',
            description: 'Short Persian title of the user request or consultation.',
          },
          details: {
            type: 'string',
            description: 'Full structured details of the user request.',
          },
          formIdOrKeyword: {
            type: 'string',
            description: 'Optional mod_forms ID or keyword to match an existing form.',
          },
          provinceCity: {
            type: 'string',
            description: 'Optional province/city in Iran.',
          },
          priority: {
            type: 'string',
            description: 'Ticket priority if fallback ticket is created.',
            enum: ['urgent', 'high', 'normal'],
          },
        },
        required: ['requestTitle', 'details'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_site_form',
      description:
        'Super Admin / authorized Admin tool: dynamically creates a new active form in mod_forms_definitions when no matching form exists.',
      parameters: {
        type: 'object',
        properties: {
          titleFa: {
            type: 'string',
            description: 'Persian title of the new form.',
          },
          slug: {
            type: 'string',
            description: 'URL-safe ASCII slug for the form.',
          },
          fieldsCommaSeparated: {
            type: 'string',
            description:
              'Comma-separated Persian field labels (e.g. "نام و نام خانوادگی, شماره تماس, شرح درخواست").',
          },
          pricingFormula: {
            type: 'string',
            description: 'Optional pricing formula or empty string.',
          },
        },
        required: ['titleFa'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'notify_super_admin_bale',
      description:
        'Proactively escalates an unanswered question, urgent customer issue, or critical alert directly to the Super Admin on Bale messenger.',
      parameters: {
        type: 'object',
        properties: {
          urgency: {
            type: 'string',
            description: 'Escalation urgency level.',
            enum: ['urgent', 'high', 'normal'],
          },
          subjectFa: {
            type: 'string',
            description: 'Concise Persian subject of the escalation alert.',
          },
          summaryFa: {
            type: 'string',
            description: 'Detailed Persian summary of the customer issue or question that needs Super Admin attention.',
          },
          customerPhoneOrSession: {
            type: 'string',
            description: 'Optional customer phone number or chat session ID for follow-up.',
          },
        },
        required: ['subjectFa', 'summaryFa'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'skill_to_product',
      description:
        'Super Admin only (requires jarvisSettings.allowSkillToProduct=true): converts a .md file, public http(s) URL, or notes into a complete Persian SEO Product or Article with FAQ (Slot 1) and WebP cover image (Slot 2), saving into the CMS database.',
      parameters: {
        type: 'object',
        properties: {
          targetType: {
            type: 'string',
            description: 'Whether to create a product or an article.',
            enum: ['product', 'article'],
          },
          sourceUrl: {
            type: 'string',
            description: 'Optional public http(s) URL to fetch and parse.',
          },
          rawMarkdownOrNotes: {
            type: 'string',
            description: 'Raw .md file content or descriptive notes provided by Super Admin.',
          },
          publishMode: {
            type: 'string',
            description: 'Save as draft (default) or published immediately.',
            enum: ['draft', 'published'],
          },
          priceToman: {
            type: 'number',
            description: 'Optional product price in Toman (default 0).',
          },
          generateCoverImage: {
            type: 'boolean',
            description: 'Whether to generate and optimize a WebP cover image via Slot 2 (default true).',
          },
          category: {
            type: 'string',
            description: 'Optional category override (e.g. Claude, ChatGPT, Codex or Persian article category).',
          },
        },
        required: ['targetType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'audit_missing_seo_and_media',
      description:
        'Super Admin only: scans products and articles in the database and reports items missing cover images, SEO titles, meta descriptions, or short descriptions.',
      parameters: {
        type: 'object',
        properties: {
          targetType: {
            type: 'string',
            description: 'Scan products, articles, or all.',
            enum: ['all', 'product', 'article'],
          },
          limit: {
            type: 'number',
            description: 'Max number of issue items to return (5 to 40, default 25).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fix_item_seo_and_media',
      description:
        'Super Admin only: fixes missing Persian SEO title/description/summary (Slot 1) and optionally generates a missing WebP cover image (Slot 2) for 1 to 5 products or articles.',
      parameters: {
        type: 'object',
        properties: {
          targetType: {
            type: 'string',
            description: 'Entity type to update.',
            enum: ['product', 'article'],
          },
          itemId: {
            type: 'string',
            description: 'Single product or article ID (or slug) to fix.',
          },
          itemIds: {
            type: 'string',
            description: 'Comma-separated list of up to 5 item IDs to batch fix.',
          },
          generateMissingImage: {
            type: 'boolean',
            description: 'Whether to generate a missing WebP cover via Slot 2 (default true).',
          },
        },
        required: ['targetType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'publish_or_draft_social_post',
      description:
        'Super Admin only (requires jarvisSettings.allowSocialPublisher=true): crafts platform-tailored Persian copy with emojis, hashtags, CTA link, and visual for Bale Channel, Telegram Channel (+ proxy), and Instagram (ready-to-copy package or Meta Graph API). Respects requireApprovalBeforePublish switch.',
      parameters: {
        type: 'object',
        properties: {
          entityType: {
            type: 'string',
            description: 'Target content type.',
            enum: ['product', 'article', 'custom'],
          },
          entityId: {
            type: 'string',
            description: 'Optional product/article ID or slug (defaults to current pageContext entity).',
          },
          channels: {
            type: 'string',
            description:
              'Comma-separated target channels from: bale, telegram, instagram (e.g. "bale,telegram,instagram").',
          },
          instagramFormat: {
            type: 'string',
            description: 'Instagram content format.',
            enum: ['post', 'carousel', 'reel', 'story'],
          },
          publishImmediately: {
            type: 'boolean',
            description:
              'If true and requireApprovalBeforePublish is OFF, publishes immediately; otherwise queues in approval queue or returns ready package.',
          },
          generateVisual: {
            type: 'boolean',
            description: 'Whether to generate a visual via Slot 2 when no image exists (default true).',
          },
          customTitle: {
            type: 'string',
            description: 'Optional custom title when entityType is custom.',
          },
          customNotes: {
            type: 'string',
            description: 'Optional extra campaign angle or notes.',
          },
        },
        required: ['entityType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_live_chat_messages',
      description:
        'Super Admin only: reads actual recent or unread customer live chat threads and their real messages from mod_live_chat_sessions and mod_live_chat_messages.',
      parameters: {
        type: 'object',
        properties: {
          onlyUnread: {
            type: 'boolean',
            description: 'If true, returns only sessions with unread_admin_count > 0.',
          },
          priority: {
            type: 'string',
            description: 'Optional priority filter (urgent, high, normal).',
            enum: ['urgent', 'high', 'normal'],
          },
          limit: {
            type: 'number',
            description: 'Number of chat threads to inspect (1 to 15, default 8).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'diagnose_site_config',
      description:
        'Super Admin only: inspects non-secret readiness status across Bale Bot token, Bale Safir OTP, AI Hub Slots 1-4, SMTP mail config, active CMS modules count, recent system_logs errors, and recent failed/pending orders.',
      parameters: {
        type: 'object',
        properties: {
          includeRecentErrors: {
            type: 'boolean',
            description: 'Include last 10 error logs from system_logs (default true).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_or_update_page',
      description:
        'Super Admin only: dynamically creates or updates a custom CMS page in the pages table with sanitized HTML content, SEO title/meta, slug, and draft/published status.',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Optional existing page ID to update.',
          },
          title: {
            type: 'string',
            description: 'Persian page title (required).',
          },
          slug: {
            type: 'string',
            description: 'URL slug (e.g. about-us or ai-consulting).',
          },
          summary: {
            type: 'string',
            description: 'Short intro/summary shown in the hero section.',
          },
          htmlContent: {
            type: 'string',
            description: 'Clean HTML content for the page body (headings, paragraphs, lists, callouts). Executable tags are stripped automatically.',
          },
          seoTitle: {
            type: 'string',
            description: 'Optional SEO meta title.',
          },
          seoDescription: {
            type: 'string',
            description: 'Optional SEO meta description.',
          },
          templateType: {
            type: 'string',
            description: 'Page layout template.',
            enum: ['standard', 'landing', 'full_width', 'contact', 'faq'],
          },
          ctaText: {
            type: 'string',
            description: 'Optional CTA button label.',
          },
          ctaLink: {
            type: 'string',
            description: 'Optional CTA link path or https URL.',
          },
          status: {
            type: 'string',
            description: 'Publish status (default draft unless Super Admin asks to publish).',
            enum: ['draft', 'published'],
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reply_to_live_chat',
      description:
        'Super Admin only: sends an official admin reply directly into a customer live-chat conversation (mod_live_chat_messages) and marks unread messages as read.',
      parameters: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Exact chat session ID obtained from read_live_chat_messages.',
          },
          replyText: {
            type: 'string',
            description: 'Official Persian reply message to send to the visitor/customer.',
          },
          senderName: {
            type: 'string',
            description: 'Optional display name for the operator (default مدیریت پشتیبانی).',
          },
        },
        required: ['sessionId', 'replyText'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_site_modules',
      description:
        'Super Admin only: lists, enables, or disables non-core CMS modules safely with audit logging (refuses to disable protected core/auth/admin modules).',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Operation to perform.',
            enum: ['list', 'enable', 'disable'],
          },
          moduleId: {
            type: 'string',
            description: 'Target module ID (required for enable/disable).',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_knowledge_cache',
      description:
        'Super Admin only: lists, adds, edits, approves, disables, or deletes zero-token Knowledge Base answers in mod_ai_knowledge_cache.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'KB operation to run.',
            enum: ['list', 'add', 'update', 'approve', 'disable', 'delete'],
          },
          id: {
            type: 'string',
            description: 'KB entry ID (required for update, approve, disable, delete).',
          },
          questionPattern: {
            type: 'string',
            description: 'Question pattern in Persian (required for add/update).',
          },
          normalizedKeywords: {
            type: 'string',
            description: 'Optional space-separated keywords for matching.',
          },
          answerText: {
            type: 'string',
            description: 'Zero-token Persian answer text (supports {siteTitle} variable).',
          },
          category: {
            type: 'string',
            description: 'KB entry category.',
            enum: ['greeting', 'faq', 'catalog', 'auto_learned'],
          },
          status: {
            type: 'string',
            description: 'Entry status.',
            enum: ['active', 'pending_review', 'disabled'],
          },
        },
        required: ['action'],
      },
    },
  },
];

function getAllowedToolsForContext(ctx: AgentToolContext): OpenAiToolDef[] {
  const allowedNames = new Set<string>([
    'inspect_site_capabilities',
    'search_site_catalog',
    'notify_super_admin_bale',
  ]);
  if (ctx.actorRole === 'super_admin') {
    allowedNames.add('read_system_logs');
    allowedNames.add('read_live_chat_messages');
    allowedNames.add('diagnose_site_config');
    allowedNames.add('save_learned_skill');
    allowedNames.add('create_site_form');
    allowedNames.add('create_or_submit_user_request');
    allowedNames.add('skill_to_product');
    allowedNames.add('audit_missing_seo_and_media');
    allowedNames.add('fix_item_seo_and_media');
    allowedNames.add('publish_or_draft_social_post');
    allowedNames.add('create_or_update_page');
    allowedNames.add('reply_to_live_chat');
    allowedNames.add('manage_site_modules');
    allowedNames.add('manage_knowledge_cache');
  } else if (ctx.actorRole === 'admin') {
    allowedNames.add('create_site_form');
    allowedNames.add('create_or_submit_user_request');
  } else if (ctx.actorRole === 'customer') {
    allowedNames.add('update_visitor_user_profile');
    allowedNames.add('create_or_submit_user_request');
  } else {
    // guest
    allowedNames.add('trigger_chat_otp_box');
    allowedNames.add('create_or_submit_user_request');
  }
  return ALL_TOOL_DEFS.filter((t) => allowedNames.has(t.function.name));
}

function readRegistryFileModules(): { id: string; titleFa?: string; enabled?: boolean; category?: string }[] {
  try {
    const regPath = path.resolve(process.cwd(), 'modules', 'registry.json');
    if (!fs.existsSync(regPath)) return [];
    const parsed = JSON.parse(fs.readFileSync(regPath, 'utf-8')) as
      | { modules?: { id: string; titleFa?: string; enabled?: boolean; category?: string }[] }
      | { id: string; titleFa?: string; enabled?: boolean; category?: string }[];
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.modules)) return parsed.modules;
  } catch {
    // ignore file read fallback
  }
  return [];
}

export async function executeCmsTool(
  toolName: string,
  rawArgs: Record<string, unknown>,
  ctx: AgentToolContext
): Promise<ExecutedToolRecord> {
  const args = rawArgs && typeof rawArgs === 'object' ? rawArgs : {};

  try {
    switch (toolName) {
      case 'inspect_site_capabilities': {
        const isPrivileged = ctx.actorRole === 'super_admin' || ctx.actorRole === 'admin';
        const includeInactive = isPrivileged && Boolean(args.includeInactiveModules);

        const [dbReg, themeCfg, prodCnt, artCnt, pageCnt, formsRows] = await Promise.all([
          getSetting<{ id: string; titleFa?: string; enabled?: boolean }[]>('site_modules_registry', []),
          getSetting<{ activeThemeId?: string; siteTitle?: string }>('theme_config', {}),
          dbQuery<{ cnt: number | string }>(
            isPrivileged
              ? 'SELECT COUNT(*) AS cnt FROM products'
              : "SELECT COUNT(*) AS cnt FROM products WHERE status = 'published'"
          ).catch(() => [{ cnt: 0 }]),
          dbQuery<{ cnt: number | string }>(
            isPrivileged
              ? 'SELECT COUNT(*) AS cnt FROM articles'
              : "SELECT COUNT(*) AS cnt FROM articles WHERE status = 'published'"
          ).catch(() => [{ cnt: 0 }]),
          dbQuery<{ cnt: number | string }>(
            isPrivileged
              ? 'SELECT COUNT(*) AS cnt FROM pages'
              : "SELECT COUNT(*) AS cnt FROM pages WHERE status = 'published'"
          ).catch(() => [{ cnt: 0 }]),
          dbQuery<{ id: string; slug: string; title_fa: string; submissions_count: number }>(
            'SELECT id, slug, title_fa, submissions_count FROM mod_forms_definitions ORDER BY updated_at DESC LIMIT 30'
          ).catch(() => []),
        ]);

        const fileModules = readRegistryFileModules();
        const dbList = Array.isArray(dbReg) ? dbReg : [];
        const dbMap = new Map(dbList.map((m) => [m.id, m]));
        const mergedById = new Map<string, { id: string; titleFa: string; enabled: boolean }>();

        // Seed from built-in default registry first (guarantees accurate count even in minimal Docker images)
        for (const m of DEFAULT_SITE_MODULES_REGISTRY) {
          mergedById.set(m.id, {
            id: m.id,
            titleFa: m.titleFa || m.id,
            enabled: Boolean(m.enabled),
          });
        }
        // Layer modules/registry.json when present
        for (const m of fileModules) {
          const prev = mergedById.get(m.id);
          mergedById.set(m.id, {
            id: m.id,
            titleFa: m.titleFa || prev?.titleFa || m.id,
            enabled: typeof m.enabled === 'boolean' ? m.enabled : prev?.enabled ?? true,
          });
        }
        // Apply live DB overrides from site_modules_registry (highest priority)
        for (const m of dbList) {
          const prev = mergedById.get(m.id);
          mergedById.set(m.id, {
            id: m.id,
            titleFa: m.titleFa || prev?.titleFa || m.id,
            enabled: typeof m.enabled === 'boolean' ? m.enabled : prev?.enabled ?? true,
          });
        }

        const mergedModules = Array.from(mergedById.values()).map((m) => {
          const override = dbMap.get(m.id);
          return {
            id: m.id,
            titleFa: override?.titleFa || m.titleFa || m.id,
            enabled: override ? Boolean(override.enabled) : Boolean(m.enabled),
          };
        });
        const visibleModules = includeInactive
          ? mergedModules
          : mergedModules.filter((m) => m.enabled);

        const data = {
          cmsName: 'DPATech Final Base CMS (v2.9.2)',
          activeTheme: themeCfg?.activeThemeId || 'default',
          siteTitle: themeCfg?.siteTitle || 'اسکیل ۹۸',
          counts: {
            products: Number(prodCnt[0]?.cnt || 0),
            articles: Number(artCnt[0]?.cnt || 0),
            pages: Number(pageCnt[0]?.cnt || 0),
            activeForms: formsRows.length,
          },
          activeModulesCount: mergedModules.filter((m) => m.enabled).length,
          totalModulesCount: mergedModules.length,
          modules: visibleModules,
          forms: formsRows.map((f) => ({
            id: f.id,
            slug: f.slug,
            titleFa: f.title_fa,
            submissionsCount: Number(f.submissions_count || 0),
          })),
        };
        return {
          tool: toolName,
          args,
          ok: true,
          summary: `بازرسی زنده سامانه: ${data.counts.products} محصول، ${data.counts.articles} مقاله، ${data.counts.pages} برگه، ${data.forms.length} فرم فعال و ${data.activeModulesCount} ماژول روشن از ${data.totalModulesCount} ماژول.`,
          data,
        };
      }

      case 'search_site_catalog': {
        const q = String(args.query || '').trim();
        const entityType = String(args.entityType || 'all');
        const limit = Math.min(15, Math.max(1, Number(args.limit || 8)));
        const isPrivileged = ctx.actorRole === 'super_admin' || ctx.actorRole === 'admin';
        const likePattern = `%${q.toLowerCase()}%`;

        const results: {
          products?: Record<string, unknown>[];
          articles?: Record<string, unknown>[];
          pages?: Record<string, unknown>[];
        } = {};

        if (entityType === 'all' || entityType === 'products') {
          const rows = q
            ? await dbQuery<Record<string, unknown>>(
                isPrivileged
                  ? `SELECT id, title, slug, category, item_type, price, status, summary FROM products
                     WHERE LOWER(title) LIKE $1 OR LOWER(category) LIKE $1 OR LOWER(summary) LIKE $1
                     ORDER BY featured DESC, id ASC LIMIT $2`
                  : `SELECT id, title, slug, category, item_type, price, summary FROM products
                     WHERE status = 'published' AND (LOWER(title) LIKE $1 OR LOWER(category) LIKE $1 OR LOWER(summary) LIKE $1)
                     ORDER BY featured DESC, id ASC LIMIT $2`,
                [likePattern, limit]
              ).catch(() => [])
            : await dbQuery<Record<string, unknown>>(
                isPrivileged
                  ? 'SELECT id, title, slug, category, item_type, price, status, summary FROM products ORDER BY featured DESC, id ASC LIMIT $1'
                  : "SELECT id, title, slug, category, item_type, price, summary FROM products WHERE status = 'published' ORDER BY featured DESC, id ASC LIMIT $1",
                [limit]
              ).catch(() => []);
          results.products = rows;
        }

        if (entityType === 'all' || entityType === 'articles') {
          const rows = q
            ? await dbQuery<Record<string, unknown>>(
                isPrivileged
                  ? `SELECT id, title, slug, category, status, excerpt FROM articles
                     WHERE LOWER(title) LIKE $1 OR LOWER(category) LIKE $1 OR LOWER(excerpt) LIKE $1
                     ORDER BY updated_at DESC LIMIT $2`
                  : `SELECT id, title, slug, category, excerpt FROM articles
                     WHERE status = 'published' AND (LOWER(title) LIKE $1 OR LOWER(category) LIKE $1 OR LOWER(excerpt) LIKE $1)
                     ORDER BY updated_at DESC LIMIT $2`,
                [likePattern, limit]
              ).catch(() => [])
            : await dbQuery<Record<string, unknown>>(
                isPrivileged
                  ? 'SELECT id, title, slug, category, status, excerpt FROM articles ORDER BY updated_at DESC LIMIT $1'
                  : "SELECT id, title, slug, category, excerpt FROM articles WHERE status = 'published' ORDER BY updated_at DESC LIMIT $1",
                [limit]
              ).catch(() => []);
          results.articles = rows;
        }

        if (entityType === 'all' || entityType === 'pages') {
          const rows = q
            ? await dbQuery<Record<string, unknown>>(
                isPrivileged
                  ? `SELECT id, slug, title, status, template_type FROM pages
                     WHERE LOWER(title) LIKE $1 OR LOWER(slug) LIKE $1
                     ORDER BY updated_at DESC LIMIT $2`
                  : `SELECT id, slug, title, template_type FROM pages
                     WHERE status = 'published' AND (LOWER(title) LIKE $1 OR LOWER(slug) LIKE $1)
                     ORDER BY updated_at DESC LIMIT $2`,
                [likePattern, limit]
              ).catch(() => [])
            : await dbQuery<Record<string, unknown>>(
                isPrivileged
                  ? 'SELECT id, slug, title, status, template_type FROM pages ORDER BY updated_at DESC LIMIT $1'
                  : "SELECT id, slug, title, template_type FROM pages WHERE status = 'published' ORDER BY updated_at DESC LIMIT $1",
                [limit]
              ).catch(() => []);
          results.pages = rows;
        }

        const totalFound =
          (results.products?.length || 0) +
          (results.articles?.length || 0) +
          (results.pages?.length || 0);

        return {
          tool: toolName,
          args,
          ok: true,
          summary: `جستجوی کاتالوگ برای «${q || 'همه موارد'}»: ${totalFound} نتیجه زنده از دیتابیس یافت شد.`,
          data: results,
        };
      }

      case 'read_system_logs': {
        if (ctx.actorRole !== 'super_admin') {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'دسترسی رد شد: ابزار read_system_logs فقط مخصوص سوپر ادمین است.',
          };
        }

        const source = String(args.source || 'all').trim().toLowerCase();
        const rawFilter = String(args.levelOrStatus || '').trim().toLowerCase();
        const filterVal = ['all', 'any', 'recent', 'همه', '*'].includes(rawFilter) ? '' : rawFilter;
        const isErrorFamily = ['error', 'errors', 'err', 'fail', 'failed', 'warning', 'خطا', 'ناموفق'].includes(filterVal);
        const limit = Math.min(30, Math.max(1, Number(args.limit || 15)));
        const out: Record<string, unknown> = {};

        if (source === 'all' || source === 'system_logs') {
          const logs = isErrorFamily
            ? await dbQuery<Record<string, unknown>>(
                `SELECT id, level, category, title, detail, sql_or_endpoint, created_at_fa
                 FROM system_logs
                 WHERE LOWER(level) IN ('error', 'warning')
                 ORDER BY created_at DESC LIMIT $1`,
                [limit]
              ).catch(() => [])
            : filterVal
            ? await dbQuery<Record<string, unknown>>(
                `SELECT id, level, category, title, detail, sql_or_endpoint, created_at_fa
                 FROM system_logs
                 WHERE LOWER(level) LIKE $1 OR LOWER(category) LIKE $1 OR LOWER(title) LIKE $1
                 ORDER BY created_at DESC LIMIT $2`,
                [`%${filterVal}%`, limit]
              ).catch(() => [])
            : await dbQuery<Record<string, unknown>>(
                `SELECT id, level, category, title, detail, sql_or_endpoint, created_at_fa
                 FROM system_logs ORDER BY created_at DESC LIMIT $1`,
                [limit]
              ).catch(() => []);
          out.systemLogs = logs;
        }

        if (source === 'all' || source === 'orders') {
          const orders = isErrorFamily
            ? await dbQuery<Record<string, unknown>>(
                `SELECT id, buyer_phone, buyer_name, total_amount, payment_method, status, created_at_label
                 FROM orders
                 WHERE LOWER(status) IN ('failed', 'pending', 'cancelled', 'unpaid')
                 ORDER BY created_at DESC LIMIT $1`,
                [limit]
              ).catch(() => [])
            : filterVal
            ? await dbQuery<Record<string, unknown>>(
                `SELECT id, buyer_phone, buyer_name, total_amount, payment_method, status, created_at_label
                 FROM orders WHERE LOWER(status) LIKE $1
                 ORDER BY created_at DESC LIMIT $2`,
                [`%${filterVal}%`, limit]
              ).catch(() => [])
            : await dbQuery<Record<string, unknown>>(
                `SELECT id, buyer_phone, buyer_name, total_amount, payment_method, status, created_at_label
                 FROM orders ORDER BY created_at DESC LIMIT $1`,
                [limit]
              ).catch(() => []);
          out.orders = orders;
        }

        if (source === 'all' || source === 'delivery_logs') {
          const deliveries = isErrorFamily
            ? await dbQuery<Record<string, unknown>>(
                `SELECT id, channel, provider, recipient, event_key, status, error_message, created_at_fa
                 FROM mod_delivery_logs
                 WHERE LOWER(status) IN ('failed', 'error')
                 ORDER BY created_at DESC LIMIT $1`,
                [limit]
              ).catch(() => [])
            : filterVal
            ? await dbQuery<Record<string, unknown>>(
                `SELECT id, channel, provider, recipient, event_key, status, error_message, created_at_fa
                 FROM mod_delivery_logs WHERE LOWER(status) LIKE $1 OR LOWER(channel) LIKE $1
                 ORDER BY created_at DESC LIMIT $2`,
                [`%${filterVal}%`, limit]
              ).catch(() => [])
            : await dbQuery<Record<string, unknown>>(
                `SELECT id, channel, provider, recipient, event_key, status, error_message, created_at_fa
                 FROM mod_delivery_logs ORDER BY created_at DESC LIMIT $1`,
                [limit]
              ).catch(() => []);
          out.deliveryLogs = deliveries;
        }

        const totalRows =
          (Array.isArray(out.systemLogs) ? out.systemLogs.length : 0) +
          (Array.isArray(out.orders) ? out.orders.length : 0) +
          (Array.isArray(out.deliveryLogs) ? out.deliveryLogs.length : 0);

        return {
          tool: toolName,
          args,
          ok: true,
          summary: `خواندن لاگ‌های زنده سامانه (${source}${filterVal ? ` · فیلتر: ${filterVal}` : ''}): ${totalRows} رکورد یافت شد.`,
          data: out,
        };
      }

      case 'save_learned_skill': {
        if (ctx.actorRole !== 'super_admin') {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'دسترسی رد شد: فقط سوپر ادمین مجاز به ثبت یا ویرایش SKILL.md دائمی است.',
          };
        }

        const titleFa = String(args.titleFa || '').trim().slice(0, 140);
        const skillMarkdown = String(args.skillMarkdown || '').trim().slice(0, 4000);
        if (!titleFa || !skillMarkdown) {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'عنوان فارسی (titleFa) و متن دستورالعمل (skillMarkdown) الزامی هستند.',
          };
        }
        const rawSlug = String(args.slug || `learned-${Date.now()}`)
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 64);
        const slug = rawSlug || `learned-${Date.now()}`;
        const category = String(args.category || 'operations').trim().slice(0, 40);
        const memoryScope = args.memoryScope === 'super_admin' ? 'super_admin' : 'global_site';
        const nowIso = new Date().toISOString();

        const existingSkill = await dbQuery<{ id: string }>(
          'SELECT id FROM mod_ai_agent_skills WHERE slug = $1 LIMIT 1',
          [slug]
        );
        const skillId = existingSkill[0]?.id || `skill_${Date.now()}`;

        await dbExec(
          `INSERT INTO mod_ai_agent_skills
           (id, slug, title_fa, category, skill_markdown, source_type, usage_count, enabled, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'learned', 1, 1, $6)
           ON CONFLICT(id) DO UPDATE SET
             title_fa = excluded.title_fa,
             category = excluded.category,
             skill_markdown = excluded.skill_markdown,
             enabled = 1,
             updated_at = excluded.updated_at`,
          [skillId, slug, titleFa, category, skillMarkdown, nowIso]
        );

        await upsertAgentMemory({
          scopeType: memoryScope,
          userId: memoryScope === 'super_admin' ? ctx.userId || 'super_admin' : '',
          memoryKey: `skill:${slug}`,
          memoryValue: `${titleFa}: ${skillMarkdown.slice(0, 600)}`,
        });

        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `یادگیری مهارت دائمی توسط ایجنت (${titleFa})`,
          detail: `slug=${slug} · scope=${memoryScope}`,
          sqlOrEndpoint: 'TOOL save_learned_skill',
        });

        return {
          tool: toolName,
          args,
          ok: true,
          summary: `مهارت «${titleFa}» در SKILL.md (${slug}) و حافظه دائمی (${memoryScope}) ذخیره شد.`,
          data: { id: skillId, slug, titleFa, memoryScope },
        };
      }

      case 'trigger_chat_otp_box': {
        if (ctx.actorRole !== 'guest') {
          return {
            tool: toolName,
            args,
            ok: true,
            summary: 'کاربر قبلاً احراز هویت و وارد حساب کاربری شده است؛ نیازی به باز کردن فرم OTP نیست.',
            data: { alreadyAuthenticated: true },
          };
        }

        const reasonFa =
          String(args.reasonFa || '').trim() ||
          'برای ثبت رسمی درخواست و دریافت کد پیگیری، لطفاً شماره موبایل خود را در کادر زیر تایید کنید.';
        const pendingSummary = String(args.pendingRequestSummary || '').trim();

        ctx.uiAction = 'OPEN_INLINE_OTP';
        ctx.uiActionPayload = {
          reasonFa,
          pendingRequestSummary: pendingSummary || undefined,
        };

        if (pendingSummary && ctx.visitorSessionId) {
          await upsertAgentMemory({
            scopeType: 'guest',
            visitorSessionId: ctx.visitorSessionId,
            memoryKey: 'pending_request_draft',
            memoryValue: pendingSummary,
          });
        }

        return {
          tool: toolName,
          args,
          ok: true,
          summary: 'باکس ورود و ثبت‌نام سریع OTP درون پنجره چت فعال شد (uiAction: OPEN_INLINE_OTP).',
          data: { uiAction: 'OPEN_INLINE_OTP', reasonFa },
        };
      }

      case 'update_visitor_user_profile': {
        const cleanName = String(args.fullName || '').trim().slice(0, 80);
        const phone = String(ctx.userId || '').trim();
        if (!phone || ctx.actorRole === 'guest') {
          ctx.uiAction = 'OPEN_INLINE_OTP';
          ctx.uiActionPayload = {
            reasonFa: 'برای ذخیره نام در پروفایل کاربری، ابتدا با شماره موبایل وارد شوید.',
          };
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'کاربر مهمان است؛ ابتدا باکس OTP باز شد تا پس از ورود، نام در پروفایل ثبت شود.',
            data: { uiAction: 'OPEN_INLINE_OTP' },
          };
        }
        if (cleanName.length < 2) {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'نام واردشده کوتاه‌تر از حد مجاز است.',
          };
        }

        const nowIso = new Date().toISOString();
        await dbExec('UPDATE users SET full_name = $1, updated_at = $2 WHERE phone = $3', [
          cleanName,
          nowIso,
          phone,
        ]);
        await dbExec('UPDATE auth_sessions SET user_display = $1 WHERE phone = $2', [
          cleanName,
          phone,
        ]);
        if (ctx.visitorSessionId) {
          await dbExec('UPDATE mod_live_chat_sessions SET visitor_name = $1 WHERE id = $2', [
            cleanName,
            ctx.visitorSessionId,
          ]);
        }

        await upsertAgentMemory({
          scopeType: 'user',
          userId: phone,
          memoryKey: 'user_full_name',
          memoryValue: cleanName,
        });

        ctx.updatedDisplayName = cleanName;
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `تکمیل خودکار پروفایل کاربر توسط ایجنت (${cleanName})`,
          detail: `شماره: ${phone} · نشست: ${ctx.visitorSessionId || '-'}`,
          sqlOrEndpoint: 'TOOL update_visitor_user_profile',
        });

        return {
          tool: toolName,
          args,
          ok: true,
          summary: `نام کاربر (${phone}) به «${cleanName}» در پروفایل و حافظه اختصاصی کاربر ذخیره شد.`,
          data: { phone, fullName: cleanName },
        };
      }

      case 'create_or_submit_user_request': {
        const requestTitle = String(args.requestTitle || 'درخواست پشتیبانی / مشاوره').trim().slice(0, 140);
        const details = String(args.details || '').trim().slice(0, 2000);
        const formIdOrKeyword = String(args.formIdOrKeyword || '').trim();
        const provinceCity = String(args.provinceCity || 'تهران - تهران').trim().slice(0, 80);
        const priority =
          args.priority === 'urgent' || args.priority === 'high' ? args.priority : 'urgent';

        if (!details) {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'جزئیات درخواست (details) برای ثبت الزامی است.',
          };
        }

        // Guests MUST verify via Inline OTP before request submission
        if (ctx.actorRole === 'guest' || !ctx.userId) {
          ctx.uiAction = 'OPEN_INLINE_OTP';
          ctx.uiActionPayload = {
            reasonFa: 'برای ثبت نهایی درخواست و دریافت کد پیگیری، لطفاً شماره موبایل خود را در کادر زیر تایید کنید.',
            pendingRequestSummary: `${requestTitle}: ${details}`,
          };
          if (ctx.visitorSessionId) {
            await upsertAgentMemory({
              scopeType: 'guest',
              visitorSessionId: ctx.visitorSessionId,
              memoryKey: 'pending_request_draft',
              memoryValue: JSON.stringify({ requestTitle, details, formIdOrKeyword, provinceCity }),
            });
          }
          return {
            tool: toolName,
            args,
            ok: false,
            summary:
              'کاربر هنوز احراز هویت نشده است؛ پیش‌نویس درخواست در حافظه نشست ذخیره شد و کادر ورود سریع OTP (OPEN_INLINE_OTP) باز گردید.',
            data: { requiresAuth: true, uiAction: 'OPEN_INLINE_OTP' },
          };
        }

        const nowIso = new Date().toISOString();
        const nowFa = formatPersianDateTime();
        const trackingCode = `REQ-98-${Date.now().toString().slice(-6)}`;

        // Try matching an active form in mod_forms_definitions
        const forms = await dbQuery<{ id: string; slug: string; title_fa: string }>(
          'SELECT id, slug, title_fa FROM mod_forms_definitions ORDER BY updated_at DESC LIMIT 30'
        ).catch(() => []);

        const searchNeedle = (formIdOrKeyword || requestTitle).toLowerCase();
        const matchedForm =
          forms.find(
            (f) =>
              f.id === formIdOrKeyword ||
              f.slug.toLowerCase() === formIdOrKeyword.toLowerCase()
          ) ||
          forms.find(
            (f) =>
              searchNeedle.includes(f.title_fa.toLowerCase()) ||
              f.title_fa.toLowerCase().includes(searchNeedle) ||
              searchNeedle
                .split(/\s+/)
                .filter((w) => w.length >= 3)
                .some((w) => f.title_fa.toLowerCase().includes(w))
          ) ||
          forms[0];

        if (matchedForm) {
          const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
          await dbExec(
            `INSERT INTO mod_forms_submissions
             (id, form_id, submitter_phone, submitter_national_id, province_city, calculated_price, payload_json, created_at)
             VALUES ($1, $2, $3, '', $4, 0, $5, $6)`,
            [
              subId,
              matchedForm.id,
              ctx.userId,
              provinceCity,
              JSON.stringify({
                trackingCode,
                requestTitle,
                details,
                fullName: ctx.userDisplayName || '',
                source: 'ai_agent_tool',
                sessionId: ctx.visitorSessionId || '',
              }),
              nowIso,
            ]
          );
          await dbExec(
            'UPDATE mod_forms_definitions SET submissions_count = submissions_count + 1, updated_at = $1 WHERE id = $2',
            [nowIso, matchedForm.id]
          );

          await upsertAgentMemory({
            scopeType: ctx.actorRole === 'super_admin' ? 'super_admin' : 'user',
            userId: ctx.userId,
            memoryKey: 'last_submitted_request',
            memoryValue: `${trackingCode} | ${requestTitle} | فرم: ${matchedForm.title_fa}`,
          });
          // Clear any pending draft after successful submission
          await dbExec(
            `DELETE FROM mod_ai_agent_memory WHERE user_id = $1 AND memory_key = 'pending_request_draft'`,
            [ctx.userId]
          ).catch(() => {});

          await writeSystemLog({
            level: 'success',
            category: 'system',
            title: `ثبت خودکار درخواست کاربر در فرم «${matchedForm.title_fa}» (${trackingCode})`,
            detail: `کاربر: ${ctx.userDisplayName || '-'} (${ctx.userId}) · موضوع: ${requestTitle}`,
            sqlOrEndpoint: 'TOOL create_or_submit_user_request',
          });

          void sendSuperAdminBaleAlert({
            category: 'user_request',
            title: `درخواست جدید در فرم «${matchedForm.title_fa}»`,
            lines: [
              `کد پیگیری: ${trackingCode}`,
              `کاربر: ${ctx.userDisplayName || 'کاربر عضو'} (${ctx.userId})`,
              `موضوع: ${requestTitle}`,
              `جزئیات: ${details.slice(0, 220)}`,
            ],
          });

          return {
            tool: toolName,
            args,
            ok: true,
            summary: `درخواست کاربر در فرم «${matchedForm.title_fa}» با کد پیگیری ${trackingCode} ثبت شد.`,
            data: {
              trackingCode,
              submissionId: subId,
              formId: matchedForm.id,
              formTitleFa: matchedForm.title_fa,
              channel: 'mod_forms',
            },
          };
        }

        // Fallback: create a prioritized support ticket / lead in mod_live_chat_sessions
        const ticketId = `ticket_${Date.now()}`;
        await dbExec(
          `INSERT INTO mod_live_chat_sessions
           (id, visitor_name, visitor_phone, subject, department, status, priority, unread_admin_count, last_message_preview, created_at_fa, updated_at)
           VALUES ($1, $2, $3, $4, 'درخواست ثبت‌شده توسط ایجنت', 'open', $5, 1, $6, $7, $8)`,
          [
            ticketId,
            ctx.userDisplayName || `کاربر ${ctx.userId.slice(-4)}`,
            ctx.userId,
            `${trackingCode} — ${requestTitle}`,
            priority,
            details.slice(0, 140),
            nowFa,
            nowIso,
          ]
        );
        await dbExec(
          `INSERT INTO mod_live_chat_messages
           (id, session_id, sender_role, sender_name, message_text, attachment_url, attachment_name, created_at_fa, created_at)
           VALUES ($1, $2, 'visitor', $3, $4, '', '', $5, $6)`,
          [
            `msg_req_${Date.now()}`,
            ticketId,
            ctx.userDisplayName || ctx.userId,
            `[کد پیگیری: ${trackingCode}]\nموضوع: ${requestTitle}\nجزئیات: ${details}`,
            nowFa,
            nowIso,
          ]
        );

        await upsertAgentMemory({
          scopeType: ctx.actorRole === 'super_admin' ? 'super_admin' : 'user',
          userId: ctx.userId,
          memoryKey: 'last_submitted_request',
          memoryValue: `${trackingCode} | ${requestTitle} | تیکت اولویت‌دار`,
        });
        await dbExec(
          `DELETE FROM mod_ai_agent_memory WHERE user_id = $1 AND memory_key = 'pending_request_draft'`,
          [ctx.userId]
        ).catch(() => {});

        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `ایجاد تیکت/درخواست اولویت‌دار توسط ایجنت (${trackingCode})`,
          detail: `کاربر: ${ctx.userId} · موضوع: ${requestTitle}`,
          sqlOrEndpoint: 'TOOL create_or_submit_user_request',
        });

        void sendSuperAdminBaleAlert({
          category: 'user_request',
          title: `تیکت/درخواست اولویت‌دار جدید (${priority})`,
          lines: [
            `کد پیگیری: ${trackingCode}`,
            `کاربر: ${ctx.userDisplayName || 'کاربر عضو'} (${ctx.userId})`,
            `موضوع: ${requestTitle}`,
            `جزئیات: ${details.slice(0, 220)}`,
          ],
        });

        return {
          tool: toolName,
          args,
          ok: true,
          summary: `تیکت اولویت‌دار با کد پیگیری ${trackingCode} ثبت شد.`,
          data: {
            trackingCode,
            ticketId,
            priority,
            channel: 'priority_ticket',
          },
        };
      }

      case 'create_site_form': {
        if (ctx.actorRole !== 'super_admin' && ctx.actorRole !== 'admin') {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'دسترسی رد شد: ایجاد فرم جدید در mod_forms فقط برای مدیران مجاز است.',
          };
        }

        const titleFa = String(args.titleFa || '').trim().slice(0, 120);
        if (!titleFa) {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'عنوان فارسی فرم (titleFa) الزامی است.',
          };
        }
        const rawSlug = String(args.slug || `form-${Date.now()}`)
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 64);
        const slug = rawSlug || `form-${Date.now()}`;
        const id = `form_${slug.replace(/-/g, '_')}_${Date.now().toString().slice(-4)}`;
        const fieldLabels = String(
          args.fieldsCommaSeparated || 'نام و نام خانوادگی, شماره موبایل, شرح درخواست'
        )
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean);

        const steps = [
          {
            step: 1,
            titleFa: 'اطلاعات درخواست',
            fields: fieldLabels.map((label, idx) => ({
              name: `field_${idx + 1}`,
              labelFa: label,
              type: /موبایل|تلفن|شماره/.test(label)
                ? 'tel'
                : /شرح|توضیح|پیام/.test(label)
                ? 'textarea'
                : 'text',
              required: idx < 3,
            })),
          },
        ];

        const nowIso = new Date().toISOString();
        await dbExec(
          `INSERT INTO mod_forms_definitions
           (id, slug, title_fa, steps_json, conditional_logic_json, pricing_formula, honeypot_enabled, sms_notify_enabled, payment_gateway_linked, submissions_count, updated_at)
           VALUES ($1, $2, $3, $4, '[]', $5, 1, 1, 0, 0, $6)`,
          [
            id,
            slug,
            titleFa,
            JSON.stringify(steps),
            String(args.pricingFormula || ''),
            nowIso,
          ]
        );

        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `ساخت خودکار فرم جدید توسط ایجنت (${titleFa})`,
          detail: `id=${id} · slug=${slug} · فیلدها: ${fieldLabels.join('، ')}`,
          sqlOrEndpoint: 'TOOL create_site_form',
        });

        return {
          tool: toolName,
          args,
          ok: true,
          summary: `فرم جدید «${titleFa}» با شناسه ${id} در ماژول فرم‌ساز (mod_forms) ایجاد شد.`,
          data: { id, slug, titleFa, fieldsCount: fieldLabels.length },
        };
      }

      case 'notify_super_admin_bale': {
        const subjectFa = String(args.subjectFa || 'ارجاع موضوع فوری از ایجنت ۲۴/۷')
          .trim()
          .slice(0, 140);
        const summaryFa = String(args.summaryFa || '').trim().slice(0, 700);
        if (!summaryFa) {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'متن خلاصه ارجاع (summaryFa) برای ارسال هشدار به سوپر ادمین الزامی است.',
          };
        }
        const urgency = ['urgent', 'high', 'normal'].includes(String(args.urgency))
          ? String(args.urgency)
          : 'high';
        const contactRef = String(
          args.customerPhoneOrSession || ctx.userId || ctx.visitorSessionId || '-'
        )
          .trim()
          .slice(0, 100);

        const dedupKey = `escalate:${ctx.userId || ctx.visitorSessionId || ctx.channel}:${subjectFa.slice(0, 40)}`;
        const alertRes = await sendSuperAdminBaleAlert({
          category: 'agent_escalation',
          title: `[${urgency === 'urgent' ? 'فوری' : urgency === 'high' ? 'مهم' : 'عادی'}] ${subjectFa}`,
          lines: [
            `کانال: ${ctx.channel === 'live_chat' ? 'چت آنلاین فروشگاه' : 'مرکز فرماندهی'}`,
            `مخاطب: ${ctx.userDisplayName || ctx.actorRole} (${contactRef})`,
            `شرح: ${summaryFa}`,
          ],
          dedupKey,
          cooldownMs: 2 * 60 * 1000,
        });

        if (alertRes.sent) {
          return {
            tool: toolName,
            args,
            ok: true,
            summary: `هشدار ارجاع فوری با موفقیت به بله سوپر ادمین ارسال شد (${alertRes.chatId || 'chat_id'}).`,
            data: { sent: true, chatId: alertRes.chatId, source: alertRes.channelSource },
          };
        }
        if (alertRes.skippedReason) {
          return {
            tool: toolName,
            args,
            ok: true,
            summary: `هشدار ارجاع ثبت شد (وضعیت ارسال بله: ${alertRes.skippedReason}).`,
            data: { sent: false, skippedReason: alertRes.skippedReason },
          };
        }
        return {
          tool: toolName,
          args,
          ok: false,
          summary: `ارسال هشدار به بله ناموفق بود: ${alertRes.error || 'بله پیکربندی نشده است'}`,
          data: { sent: false, error: alertRes.error },
        };
      }

      case 'skill_to_product':
        return runSkillToProductTool(args, ctx);

      case 'audit_missing_seo_and_media':
        return runAuditMissingSeoAndMediaTool(args, ctx);

      case 'fix_item_seo_and_media':
        return runFixItemSeoAndMediaTool(args, ctx);

      case 'publish_or_draft_social_post':
        return runPublishOrDraftSocialPostTool(args, ctx);

      case 'read_live_chat_messages': {
        if (ctx.actorRole !== 'super_admin') {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'دسترسی رد شد: ابزار read_live_chat_messages فقط مخصوص سوپر ادمین است.',
          };
        }
        const onlyUnread = Boolean(args.onlyUnread);
        const priorityFilter = ['urgent', 'high', 'normal'].includes(String(args.priority || ''))
          ? String(args.priority)
          : '';
        const limit = Math.min(15, Math.max(1, Number(args.limit || 8)));

        const whereClauses: string[] = [];
        const paramsArr: unknown[] = [];
        if (onlyUnread) {
          whereClauses.push('unread_admin_count > 0');
        }
        if (priorityFilter) {
          paramsArr.push(priorityFilter);
          whereClauses.push(`priority = $${paramsArr.length}`);
        }
        paramsArr.push(limit);
        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const sessions = await dbQuery<{
          id: string;
          visitor_name: string;
          visitor_phone: string;
          subject: string;
          department: string;
          status: string;
          priority: string;
          unread_admin_count: number;
          last_message_preview: string;
          created_at_fa: string;
          updated_at: string;
        }>(
          `SELECT id, visitor_name, visitor_phone, subject, department, status, priority,
                  unread_admin_count, last_message_preview, created_at_fa, updated_at
           FROM mod_live_chat_sessions
           ${whereSql}
           ORDER BY unread_admin_count DESC, updated_at DESC
           LIMIT $${paramsArr.length}`,
          paramsArr
        ).catch(() => []);

        const threads = await Promise.all(
          sessions.map(async (s) => {
            const msgs = await dbQuery<{
              sender_role: string;
              sender_name: string;
              message_text: string;
              created_at_fa: string;
            }>(
              `SELECT sender_role, sender_name, message_text, created_at_fa
               FROM mod_live_chat_messages
               WHERE session_id = $1
               ORDER BY created_at DESC LIMIT 8`,
              [s.id]
            ).catch(() => []);
            return {
              sessionId: s.id,
              visitorName: s.visitor_name || 'بازدیدکننده مهمان',
              visitorPhone: s.visitor_phone || '-',
              subject: s.subject || '-',
              department: s.department || '-',
              status: s.status,
              priority: s.priority,
              unreadAdminCount: Number(s.unread_admin_count || 0),
              createdAtFa: s.created_at_fa,
              recentMessages: msgs.reverse().map((m) => ({
                role: m.sender_role,
                sender: m.sender_name,
                text: String(m.message_text || '').slice(0, 420),
                at: m.created_at_fa,
              })),
            };
          })
        );

        const totalUnread = threads.reduce((acc, t) => acc + t.unreadAdminCount, 0);
        return {
          tool: toolName,
          args,
          ok: true,
          summary: `${threads.length} رشته چت زنده مشتریان بازیابی شد (مجموع پیام‌های خوانده‌نشده: ${totalUnread}).`,
          data: {
            threadsCount: threads.length,
            totalUnreadMessages: totalUnread,
            threads,
          },
        };
      }

      case 'diagnose_site_config': {
        if (ctx.actorRole !== 'super_admin') {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'دسترسی رد شد: ابزار diagnose_site_config فقط مخصوص سوپر ادمین است.',
          };
        }
        const includeRecentErrors = args.includeRecentErrors !== false;

        const [
          hubSettings,
          baleTokenInfo,
          smsCfg,
          backupCfg,
          slotRows,
          dbReg,
          recentErrors,
          failedOrders,
          activeSkillsRows,
        ] = await Promise.all([
          getAiHubSettings(),
          resolveBaleBotTokenOnly(),
          getSetting<Record<string, unknown>>('sms_gateway_config', {}),
          getSetting<Record<string, unknown>>('backup_schedule_config', {}),
          dbQuery<{
            slot_key: string;
            provider_kind: string;
            base_url: string;
            model_name: string;
            api_key_enc: string;
            enabled: number;
          }>('SELECT slot_key, provider_kind, base_url, model_name, api_key_enc, enabled FROM mod_ai_provider_configs').catch(
            () => []
          ),
          getSetting<{ id: string; enabled?: boolean }[]>('site_modules_registry', []),
          includeRecentErrors
            ? dbQuery<{
                level: string;
                category: string;
                title: string;
                detail: string;
                sql_or_endpoint: string;
                created_at_fa: string;
              }>(
                `SELECT level, category, title, detail, sql_or_endpoint, created_at_fa
                 FROM system_logs
                 WHERE LOWER(level) IN ('error', 'warning')
                 ORDER BY created_at DESC LIMIT 10`
              ).catch(() => [])
            : Promise.resolve([]),
          dbQuery<{ cnt: number | string }>(
            `SELECT COUNT(*) AS cnt FROM orders WHERE LOWER(status) IN ('failed', 'pending', 'cancelled', 'unpaid')`
          ).catch(() => [{ cnt: 0 }]),
          getAllActiveAgentSkills().catch(() => []),
        ]);

        const envCfg = getEnvConfig();
        const slotsStatus = slotRows.map((r) => ({
          slotKey: r.slot_key,
          enabled: Boolean(r.enabled),
          provider: r.provider_kind,
          model: r.model_name,
          baseUrl: r.base_url || '(پیش‌فرض ارائه‌دهنده)',
          hasSavedApiKey: Boolean(r.api_key_enc),
          hasEnvFallbackKey:
            r.provider_kind === 'gemini'
              ? Boolean((process.env.GEMINI_API_KEY || '').trim() || envCfg.geminiApiKey)
              : r.provider_kind === 'openai_compatible'
              ? Boolean((process.env.OPENAI_API_KEY || '').trim())
              : true,
        }));

        const fileModules = readRegistryFileModules();
        const modMap = new Map<string, boolean>();
        for (const m of DEFAULT_SITE_MODULES_REGISTRY) modMap.set(m.id, Boolean(m.enabled));
        for (const m of fileModules) if (typeof m.enabled === 'boolean') modMap.set(m.id, m.enabled);
        for (const m of Array.isArray(dbReg) ? dbReg : []) {
          if (typeof m.enabled === 'boolean') modMap.set(m.id, m.enabled);
        }
        const activeModulesCount = Array.from(modMap.values()).filter(Boolean).length;

        const hasSmtpHost = Boolean(
          String(backupCfg?.smtpHost || process.env.SMTP_HOST || '').trim()
        );
        const hasSmtpAuth = Boolean(
          String(backupCfg?.smtpUser || process.env.SMTP_USER || '').trim() &&
            String(backupCfg?.smtpPass || process.env.SMTP_PASS || '').trim()
        );

        const baleMapCred =
          smsCfg &&
          typeof smsCfg.providersMap === 'object' &&
          smsCfg.providersMap !== null &&
          typeof (smsCfg.providersMap as Record<string, unknown>).bale === 'object'
            ? ((smsCfg.providersMap as Record<string, Record<string, unknown>>).bale || {})
            : {};

        const data = {
          baleBot: {
            hasBotToken: Boolean(baleTokenInfo?.botToken),
            tokenSource: baleTokenInfo?.source || 'تنظیم نشده',
            hasDirectBaleBotToken: Boolean(hubSettings.baleAlerts?.baleBotTokenEnc),
            hasSuperAdminChatId: Boolean(
              String(hubSettings.baleAlerts?.overrideChatId || '').trim() ||
                String(baleTokenInfo?.defaultChatId || '').trim() ||
                String(baleMapCred.baleChatId || '').trim()
            ),
            baleAlertsEnabled: Boolean(hubSettings.baleAlerts?.enabled),
            dailyBriefingEnabled: Boolean(hubSettings.baleAlerts?.dailyBriefingEnabled),
          },
          baleSafirOtp: {
            activeSmsProvider: String(smsCfg?.provider || 'melipayamak'),
            baleMode: String(baleMapCred.baleMode || 'auto'),
            safirVersion: String(baleMapCred.baleSafirVersion || 'v3'),
            hasSafirV3AccessKey: Boolean(String(baleMapCred.baleSafirApiAccessKey || '').trim()),
            hasSafirV3BotId: Boolean(String(baleMapCred.baleSafirBotId || '').trim()),
            hasSafirV2ClientId: Boolean(String(baleMapCred.baleClientId || '').trim()),
            hasSafirV2ClientSecret: Boolean(String(baleMapCred.baleClientSecret || '').trim()),
            hasSmsApiKey: Boolean(String(smsCfg?.apiKey || '').trim()),
          },
          aiHubSlots: slotsStatus,
          jarvisSwitches: {
            agentEnabled: Boolean(hubSettings.jarvisSettings?.enabled),
            mascotEnabled: Boolean(hubSettings.jarvisSettings?.mascotEnabled),
            liveChatAutoReply: Boolean(hubSettings.liveChatAutoReply),
            voiceReplyEnabled: Boolean(hubSettings.jarvisSettings?.voiceReplyEnabled),
            allowSkillToProduct: Boolean(hubSettings.jarvisSettings?.allowSkillToProduct),
            allowSocialPublisher: Boolean(hubSettings.jarvisSettings?.allowSocialPublisher),
          },
          smtpEmail: {
            configured: hasSmtpHost && hasSmtpAuth,
            hasHost: hasSmtpHost,
            hasCredentials: hasSmtpAuth,
            targetEmailSet: Boolean(String(backupCfg?.smtpTargetEmail || '').trim()),
          },
          modules: {
            activeCount: activeModulesCount,
            totalCount: modMap.size,
          },
          activeInjectedSkillsCount: activeSkillsRows.length,
          failedOrPendingOrdersCount: Number(failedOrders[0]?.cnt || 0),
          recentSystemErrors: recentErrors.map((e) => ({
            level: e.level,
            category: e.category,
            title: e.title,
            detail: String(e.detail || '').slice(0, 220),
            endpoint: e.sql_or_endpoint,
            at: e.created_at_fa,
          })),
        };

        return {
          tool: toolName,
          args,
          ok: true,
          summary: `عیب‌یابی پیکربندی انجام شد: توکن بله (${data.baleBot.hasBotToken ? `فعال از ${data.baleBot.tokenSource}` : 'تنظیم نشده'})، ماژول‌های روشن (${activeModulesCount}/${modMap.size})، مهارت‌های تزریق‌شده (${activeSkillsRows.length})، خطاهای اخیر (${recentErrors.length}).`,
          data,
        };
      }

      case 'create_or_update_page': {
        if (ctx.actorRole !== 'super_admin') {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'دسترسی رد شد: ابزار create_or_update_page فقط مخصوص سوپر ادمین است.',
          };
        }
        const res = await runCreateOrUpdatePageTool(args);
        return { tool: toolName, args, ...res };
      }

      case 'reply_to_live_chat': {
        if (ctx.actorRole !== 'super_admin') {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'دسترسی رد شد: ابزار reply_to_live_chat فقط مخصوص سوپر ادمین است.',
          };
        }
        const res = await runReplyToLiveChatTool(args);
        return { tool: toolName, args, ...res };
      }

      case 'manage_site_modules': {
        if (ctx.actorRole !== 'super_admin') {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'دسترسی رد شد: ابزار manage_site_modules فقط مخصوص سوپر ادمین است.',
          };
        }
        const res = await runManageSiteModulesTool(args);
        return { tool: toolName, args, ...res };
      }

      case 'manage_knowledge_cache': {
        if (ctx.actorRole !== 'super_admin') {
          return {
            tool: toolName,
            args,
            ok: false,
            summary: 'دسترسی رد شد: ابزار manage_knowledge_cache فقط مخصوص سوپر ادمین است.',
          };
        }
        const res = await runManageKnowledgeCacheTool(args);
        return { tool: toolName, args, ...res };
      }

      default:
        return {
          tool: toolName,
          args,
          ok: false,
          summary: `ابزار ناشناخته: ${toolName}`,
        };
    }
  } catch (err) {
    return {
      tool: toolName,
      args,
      ok: false,
      summary: `خطا در اجرای ابزار ${toolName}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function buildGroundedSystemPrompt(params: {
  ctx: AgentToolContext;
  tools: OpenAiToolDef[];
  extraContext?: string;
  includeJsonFallbackProtocol?: boolean;
}): Promise<string> {
  const [skills, memories, hubSettings, themeCfg, prodCats, artCats, sampleProds] = await Promise.all([
    getAllActiveAgentSkills(),
    readScopedAgentMemories({
      actorRole: params.ctx.actorRole,
      userId: params.ctx.userId,
      visitorSessionId: params.ctx.visitorSessionId,
      limit: 35,
    }),
    getAiHubSettings(),
    getSetting<Record<string, unknown>>('theme_config', {}),
    dbQuery<{ category: string }>(
      "SELECT DISTINCT category FROM products WHERE category != '' LIMIT 16"
    ).catch(() => []),
    dbQuery<{ category: string }>(
      "SELECT DISTINCT category FROM articles WHERE category != '' LIMIT 12"
    ).catch(() => []),
    dbQuery<{ title: string; category: string }>(
      "SELECT title, category FROM products WHERE status = 'published' ORDER BY updated_at DESC LIMIT 8"
    ).catch(() => []),
  ]);

  const roleLabels: Record<AgentActorRole, string> = {
    super_admin:
      'سوپر ادمین (فرماندهی کل سامانه از طریق جارویس — ناظر ارشد تمام زیر-ایجنت‌ها، ساخت برگه/فرم/محصول، عیب‌یابی، چت مشتریان، ماژول‌ها و بانک دانش صفرتوکن)',
    admin: 'ادمین سایت',
    customer: 'کاربر احراز هویت‌شده (عضو سایت)',
    guest: 'کاربر مهمان (احراز هویت نشده)',
  };

  const liveSiteTitle = String(
    themeCfg?.brandNameFa || themeCfg?.siteTitle || 'این وب‌سایت'
  ).trim();
  const liveSiteDescription = String(
    themeCfg?.heroSubtitle || themeCfg?.footerDescription || ''
  )
    .trim()
    .slice(0, 260);
  const productCategoriesStr =
    prodCats.map((c) => c.category).filter(Boolean).join('، ') || 'محصولات و خدمات اصلی سایت';
  const articleCategoriesStr =
    artCats.map((c) => c.category).filter(Boolean).join('، ') || 'مقالات و راهنماهای آموزشی سایت';
  const sampleProductsStr = sampleProds
    .map((p) => `${p.title}${p.category ? ` (${p.category})` : ''}`)
    .join(' | ');

  const skillsSection =
    skills.length > 0
      ? skills
          .map(
            (s) =>
              `### [${s.title_fa}] (slug: ${s.slug} | category: ${s.category})\n${s.skill_markdown}`
          )
          .join('\n\n')
      : 'هنوز مهارت سفارشی ثبت نشده است.';

  const memorySection =
    memories.length > 0
      ? memories
          .map((m) => `- (${m.scope_type}) ${m.memory_key}: ${m.memory_value}`)
          .join('\n')
      : 'حافظه اختصاصی جدیدی برای این نشست ثبت نشده است.';

  const toolNamesList = params.tools.map((t) => `- ${t.function.name}: ${t.function.description}`).join('\n');

  const jsonFallbackGuide = params.includeJsonFallbackProtocol
    ? `\n\n## پروتکل اجرای ابزار (Fallback JSON)\nاگر ابزار بومی مدل فعال نبود و نیاز به اجرای ابزار داشتی، فقط یک بلوک JSON خالص بدون متن اضافه با ساختار زیر برگردان:\n{"tool_call": {"name": "TOOL_NAME", "arguments": { ... }}}\nدر غیر این صورت پاسخ نهایی فارسی خود را بنویس.`
    : '';

  const jarvisCfg = hubSettings.jarvisSettings;
  const jarvisName = jarvisCfg.mascotName || 'جارویس';
  const isLiveChatChannel = params.ctx.channel === 'live_chat';

  const pageCtx = params.ctx.pageContext;
  const pageContextBlock = pageCtx
    ? `## کانتکست لحظه‌ای صفحه‌ای که سوپر ادمین هم‌اکنون در حال مشاهده آن است:\n- مسیر صفحه: ${pageCtx.path || '/'}\n- عنوان صفحه: ${pageCtx.pageTitle || '-'}\n- نوع موجودیت: ${pageCtx.entityType}${
        pageCtx.entityId ? `\n- شناسه موجودیت (entityId): ${pageCtx.entityId}` : ''
      }${pageCtx.entitySlug ? `\n- اسلاگ (entitySlug): ${pageCtx.entitySlug}` : ''}\nاگر سوپر ادمین گفت «همین صفحه»، «همین محصول»، «همین مقاله» یا «همین سفارش»، دقیقاً منظورش همین موجودیت بالاست.`
    : '';

  // Strict hierarchy & role-specific constitution
  const roleConstitution = isLiveChatChannel
    ? [
        `تو زیر-ایجنت گفتگوی آنلاین فروشگاه (Storefront Live Chat Sub-Agent) تحت نظارت ارشد «${jarvisName}» در وب‌سایت **«${liveSiteTitle}»** (اجراشده بر بستر DPATech Final Base CMS v2.9.2) هستی.`,
        `## هویت زنده این وب‌سایت (به‌صورت پویا از دیتابیس خوانده شده):`,
        `- نام برند/سایت: **${liveSiteTitle}**`,
        liveSiteDescription ? `- معرفی و حوزه فعالیت سایت: ${liveSiteDescription}` : '',
        `- دسته‌بندی واقعی محصولات/خدمات: ${productCategoriesStr}`,
        `- دسته‌بندی واقعی مقالات: ${articleCategoriesStr}`,
        sampleProductsStr ? `- نمونه موارد موجود در کاتالوگ: ${sampleProductsStr}` : '',
        `## قوانین حیاتی و غیرقابل‌نقض چت آنلاین (Anti-Free-Labor & Conversion Guardrail):
1. نقش تو **صرفاً مشاور فروش، راهنمای استفاده از سایت و ثبت‌کننده سرنخ/درخواست مشتریان «${liveSiteTitle}»** است.
2. **ممنوعیت مطلق کار رایگان (Anti-Free-Labor):** هرگز نقش ChatGPT عمومی بازی نکن! هرگز برای بازدیدکننده کد، مقاله، کاتالوگ، پرامپت اختصاصی، ترجمه، تمرین درسی یا هر کار رایگان بیرونی تولید نکن.
3. **پاسخ‌های کوتاه و کم‌مصرف:** پاسخ‌های خود را بسیار خلاصه، دقیق و محترمانه در حداکثر **۲ تا ۴ جمله کوتاه فارسی** بنویس تا مصرف توکن به حداقل برسد.
4. **جریان هوشمند تبدیل مورد ناموجود به سرنخ (Dynamic Missing-Item Conversion):** اگر بازدیدکننده محصول، دوره، فایل یا خدمتی متناسب با حوزه فعالیت «${liveSiteTitle}» خواست، ابتدا حتماً \`search_site_catalog\` را صدا بزن. اگر مورد دقیق در کاتالوگ پیدا نشد، **هرگز پیشنهاد نده کارش را رایگان انجام دهی**؛ محترمانه بگو در حال حاضر این مورد در کاتالوگ «${liveSiteTitle}» موجود نیست، پیشنهاد بده درخواست اختصاصی‌اش ثبت شود تا تیم ما نسخه اختصاصی آماده کند و **بلافاصله** برای مهمان ابزار \`trigger_chat_otp_box\` را اجرا کن تا کادر ورود با موبایل و OTP همینجا باز شود (و اگر وارد شده است، با تاییدش ابزار \`create_or_submit_user_request\` را اجرا کن).
5. **موضوعات خارج از حوزه سایت:** اگر سوال بازدیدکننده کاملاً بی‌ربط به حوزه فعالیت و خدمات «${liveSiteTitle}» بود (مثلاً سوال عمومی، آشپزی، کدنویسی متفرقه یا پرامپت رایگان)، محترمانه عذرخواهی کن و گفتگو را به محصولات و خدمات واقعی «${liveSiteTitle}» هدایت کن.
6. اگر کاربر وارد شده است و نام واقعی خود را اعلام کرد، بلافاصله ابزار \`update_visitor_user_profile\` را صدا بزن.
7. اگر مشکل فوری خرید/پرداخت یا سوال حساس بی‌پاسخ پیش آمد، ابزار \`notify_super_admin_bale\` را اجرا کن.`,
      ]
        .filter(Boolean)
        .join('\n')
    : [
        `تو **«${jarvisName}»**، ارکستراتور ارشد سوپر ادمین (Master Orchestrator) و ناظر کل زیر-ایجنت‌های سامانه **«${liveSiteTitle}»** (DPATech Final Base CMS v2.9.2) هستی. زیر-ایجنت‌های چت آنلاین ویترین، تولید محتوا و سئو، انتشار شبکه‌های اجتماعی و پایش سلامت سیستم همگی تحت نظارت و فرمان تو عمل می‌کنند.`,
        jarvisCfg.mascotPersona ? `شخصیت و لحن مورد نظر سوپر ادمین: ${jarvisCfg.mascotPersona}` : '',
        `هویت زنده این وب‌سایت: نام سایت «${liveSiteTitle}»${
          liveSiteDescription ? ` · معرفی: ${liveSiteDescription}` : ''
        } · دسته‌بندی محصولات: ${productCategoriesStr} · دسته‌بندی مقالات: ${articleCategoriesStr}.`,
        `قانون امنیتی و هویت: هرگز نگو «من دسترسی به دیتابیس یا سایت ندارم» و هرگز نپرس «آیا سایت وردپرس یا شاپیفای است؟». این CMS اختصاصی DPATech است و تمام کارها باید منحصراً از طریق ابزارهای ایمن و اعتبارسنجی‌شده همین سامانه انجام شود (هرگز کد منبع خام یا SQL خام اجرا نکن).`,
        `## قوانین فرماندهی ارکستراتور (${jarvisName} — سوپر ادمین):
1. تمام پاسخ‌ها را دقیق، مستند به خروجی واقعی ابزارها و به زبان فارسی روان بنویس.
2. برای **ساخت یا ویرایش برگه‌های پویا** (مثل «یک برگه جدید برای ... بساز») مستقیماً ابزار \`create_or_update_page\` را اجرا کن (به‌صورت پیش‌فرض \`draft\` مگر اینکه سوپر ادمین صراحتاً انتشار فوری بخواهد).
3. برای **نظارت و پاسخ مستقیم به مشتریان چت آنلاین** ابتدا با \`read_live_chat_messages\` مکالمات واقعی را بخوان و با دستور سوپر ادمین از طریق \`reply_to_live_chat\` پاسخ رسمی ارسال و خوانده‌نشده‌ها را صفر کن.
4. برای **روشن یا خاموش کردن ماژول‌های غیرهسته‌ای CMS** با ثبت لاگ ممیزی از \`manage_site_modules\` استفاده کن.
5. برای **مدیریت بانک دانش صفرتوکن چت** (مشاهده، افزودن، ویرایش، تایید، غیرفعال‌سازی یا حذف پاسخ‌های صفرتوکن) از \`manage_knowledge_cache\` استفاده کن.
6. برای **عیب‌یابی خطاها، اتصال بله/سفیر/اسلات‌های AI یا سفارش‌های ناموفق** حتماً \`diagnose_site_config\` و \`read_system_logs\` را اجرا کن و بر اساس داده واقعی گزارش بده.
7. برای **تبدیل فایل .md، لینک یا توضیحات به محصول/مقاله سئوشده** از \`skill_to_product\`، برای **ممیزی و رفع نقص سئو/تصویر** از \`audit_missing_seo_and_media\` و \`fix_item_seo_and_media\`، و برای **انتشار شبکه‌های اجتماعی** از \`publish_or_draft_social_post\` استفاده کن.
8. برای **آموزش قانون یا دستورالعمل دائمی جدید** به سیستم (مثل «یاد بگیر...» یا «از این به بعد...») ابزار \`save_learned_skill\` را صدا بزن.`,
      ]
        .filter(Boolean)
        .join('\n');

  return [
    roleConstitution,
    `کانال فعلی: ${
      params.ctx.channel === 'command_center'
        ? `مرکز فرماندهی سوپر ادمین (${jarvisName} Master Orchestrator)`
        : 'گفتگوی آنلاین فروشگاه (Storefront Live Chat Sub-Agent)'
    }`,
    `نقش مخاطب فعلی: ${roleLabels[params.ctx.actorRole]}${
      params.ctx.userDisplayName ? ` | نام فعلی: ${params.ctx.userDisplayName}` : ''
    }${params.ctx.userId ? ` | شناسه/موبایل: ${params.ctx.userId}` : ''}`,
    pageContextBlock,
    `## ابزارهای مجاز برای این نشست:\n${toolNamesList}`,
    `## حافظه دائمی مهارت‌ها و دستورالعمل‌های فعال (${skills.length} مهارت فعال SKILL.md — همیشه تزریق‌شده):\n${skillsSection}`,
    `## حافظه اختصاصی و مجاز این نشست (Scoped Memory — کاملاً ایزوله):\n${memorySection}`,
    params.extraContext ? `## اطلاعات تکمیلی نشست:\n${params.extraContext}` : '',
    jsonFallbackGuide,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function tryExtractFallbackJsonToolCall(
  text: string
): { name: string; arguments: Record<string, unknown> } | null {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?"tool_call"[\s\S]*?\})\s*```/i);
  const candidate = fenced?.[1] || (trimmed.startsWith('{') && trimmed.includes('"tool_call"') ? trimmed : '');
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as {
      tool_call?: { name?: string; arguments?: Record<string, unknown> };
    };
    if (parsed?.tool_call?.name) {
      return {
        name: String(parsed.tool_call.name),
        arguments:
          parsed.tool_call.arguments && typeof parsed.tool_call.arguments === 'object'
            ? parsed.tool_call.arguments
            : {},
      };
    }
  } catch {
    // not a valid tool_call JSON block
  }
  return null;
}

function toGeminiFunctionDeclarations(tools: OpenAiToolDef[]): FunctionDeclaration[] {
  const mapType = (t: string): Type => {
    if (t === 'number') return Type.NUMBER;
    if (t === 'boolean') return Type.BOOLEAN;
    return Type.STRING;
  };
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: {
      type: Type.OBJECT,
      properties: Object.fromEntries(
        Object.entries(t.function.parameters.properties).map(([k, v]) => [
          k,
          {
            type: mapType(v.type),
            description: v.description,
            ...(v.enum ? { enum: v.enum } : {}),
          },
        ])
      ),
      ...(t.function.parameters.required ? { required: t.function.parameters.required } : {}),
    },
  }));
}

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function runMultiStepAgentTurn(params: {
  ctx: AgentToolContext;
  userMessage: string;
  history?: ChatHistoryMessage[];
  extraContext?: string;
  maxSteps?: number;
}): Promise<MultiStepAgentTurnResult> {
  await ensureAiHubSchema();
  const maxSteps = Math.min(4, Math.max(1, Number(params.maxSteps || 4)));
  const allowedTools = getAllowedToolsForContext(params.ctx);
  const allowedToolNames = new Set(allowedTools.map((t) => t.function.name));
  const executedTools: ExecutedToolRecord[] = [];

  const cfg = await getSlotConfig('agent_core');
  if (cfg && !cfg.enabled) {
    return {
      replyText: '',
      executedTools,
      providerUsed: 'disabled',
      modelUsed: '',
      usedFallback: true,
      error: 'اسلات هسته ایجنت ۲۴/۷ (agent_core) غیرفعال است.',
    };
  }

  const provider = cfg?.provider_kind || 'gemini';
  const model = (cfg?.model_name || '').trim() || 'gemini-4-hydrogen';
  const savedKey = cfg?.api_key_enc ? decryptSecret(cfg.api_key_enc) : '';
  const recentHistory = (params.history || []).slice(-10);

  // 1) OpenAI-Compatible Multi-Step Tool Calling (Native `tools` / `tool_calls` + JSON fallback)
  if (provider === 'openai_compatible' && cfg?.base_url) {
    const systemPrompt = await buildGroundedSystemPrompt({
      ctx: params.ctx,
      tools: allowedTools,
      extraContext: params.extraContext,
      includeJsonFallbackProtocol: true,
    });
    const endpoint = `${cfg.base_url.replace(/\/+$/, '')}/chat/completions`;
    const apiKey = savedKey || (process.env.OPENAI_API_KEY || '').trim();

    type OaiMsg =
      | { role: 'system' | 'user'; content: string }
      | {
          role: 'assistant';
          content: string | null;
          tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
        }
      | { role: 'tool'; tool_call_id: string; name: string; content: string };

    const messages: OaiMsg[] = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: params.userMessage },
    ];

    for (let step = 0; step < maxSteps; step++) {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          tools: allowedTools,
          tool_choice: 'auto',
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        choices?: {
          message?: {
            content?: string | null;
            tool_calls?: {
              id?: string;
              type?: 'function';
              function?: { name?: string; arguments?: string };
            }[];
          };
        }[];
        error?: { message?: string };
      };
      if (!resp.ok) {
        throw new Error(data.error?.message || `OpenAI-Compatible HTTP ${resp.status}`);
      }

      const msg = data.choices?.[0]?.message;
      const nativeCalls = Array.isArray(msg?.tool_calls) ? msg.tool_calls : [];

      if (nativeCalls.length > 0) {
        messages.push({
          role: 'assistant',
          content: msg?.content ?? null,
          tool_calls: nativeCalls.map((c, idx) => ({
            id: c.id || `call_${step}_${idx}`,
            type: 'function',
            function: {
              name: String(c.function?.name || ''),
              arguments: String(c.function?.arguments || '{}'),
            },
          })),
        });

        for (let idx = 0; idx < nativeCalls.length; idx++) {
          const call = nativeCalls[idx];
          const toolName = String(call.function?.name || '');
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(String(call.function?.arguments || '{}')) as Record<
              string,
              unknown
            >;
          } catch {
            parsedArgs = {};
          }
          const execRes = allowedToolNames.has(toolName)
            ? await executeCmsTool(toolName, parsedArgs, params.ctx)
            : {
                tool: toolName,
                args: parsedArgs,
                ok: false,
                summary: `ابزار ${toolName} برای نقش ${params.ctx.actorRole} مجاز نیست.`,
              };
          executedTools.push(execRes);
          messages.push({
            role: 'tool',
            tool_call_id: call.id || `call_${step}_${idx}`,
            name: toolName,
            content: JSON.stringify(execRes),
          });
        }
        continue;
      }

      const textReply = String(msg?.content || '').trim();
      const jsonTool = tryExtractFallbackJsonToolCall(textReply);
      if (jsonTool && step < maxSteps - 1) {
        const execRes = allowedToolNames.has(jsonTool.name)
          ? await executeCmsTool(jsonTool.name, jsonTool.arguments, params.ctx)
          : {
              tool: jsonTool.name,
              args: jsonTool.arguments,
              ok: false,
              summary: `ابزار ${jsonTool.name} برای نقش ${params.ctx.actorRole} مجاز نیست.`,
            };
        executedTools.push(execRes);
        messages.push({ role: 'assistant', content: textReply });
        messages.push({
          role: 'user',
          content: `نتیجه اجرای ابزار ${jsonTool.name}:\n${JSON.stringify(execRes)}\nحالا پاسخ نهایی فارسی را ارائه بده یا در صورت نیاز ابزار بعدی را صدا بزن.`,
        });
        continue;
      }

      return {
        replyText: textReply,
        executedTools,
        uiAction: params.ctx.uiAction,
        uiActionPayload: params.ctx.uiActionPayload,
        updatedDisplayName: params.ctx.updatedDisplayName,
        providerUsed: 'openai_compatible',
        modelUsed: model,
      };
    }

    // Final synthesis after max tool steps
    const finalResp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ model, messages }),
    });
    const finalData = (await finalResp.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string } }[];
    };
    return {
      replyText:
        String(finalData.choices?.[0]?.message?.content || '').trim() ||
        executedTools.map((t) => t.summary).join('\n'),
      executedTools,
      uiAction: params.ctx.uiAction,
      uiActionPayload: params.ctx.uiActionPayload,
      updatedDisplayName: params.ctx.updatedDisplayName,
      providerUsed: 'openai_compatible',
      modelUsed: model,
    };
  }

  // 2) Ollama Multi-Step Structured JSON Tool Loop
  if (provider === 'ollama') {
    const systemPrompt = await buildGroundedSystemPrompt({
      ctx: params.ctx,
      tools: allowedTools,
      extraContext: params.extraContext,
      includeJsonFallbackProtocol: true,
    });
    const root = (cfg?.base_url || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: params.userMessage },
    ];

    for (let step = 0; step < maxSteps; step++) {
      const resp = await fetch(`${root}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3.1',
          stream: false,
          messages,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        message?: { content?: string };
        error?: string;
      };
      if (!resp.ok) {
        throw new Error(data.error || `Ollama HTTP ${resp.status}`);
      }
      const reply = String(data.message?.content || '').trim();
      const jsonTool = tryExtractFallbackJsonToolCall(reply);
      if (jsonTool && step < maxSteps - 1) {
        const execRes = allowedToolNames.has(jsonTool.name)
          ? await executeCmsTool(jsonTool.name, jsonTool.arguments, params.ctx)
          : {
              tool: jsonTool.name,
              args: jsonTool.arguments,
              ok: false,
              summary: `ابزار ${jsonTool.name} برای نقش ${params.ctx.actorRole} مجاز نیست.`,
            };
        executedTools.push(execRes);
        messages.push({ role: 'assistant', content: reply });
        messages.push({
          role: 'user',
          content: `نتیجه اجرای ابزار ${jsonTool.name}:\n${JSON.stringify(execRes)}\nاکنون پاسخ نهایی فارسی را ارائه بده.`,
        });
        continue;
      }
      return {
        replyText: reply,
        executedTools,
        uiAction: params.ctx.uiAction,
        uiActionPayload: params.ctx.uiActionPayload,
        updatedDisplayName: params.ctx.updatedDisplayName,
        providerUsed: 'ollama',
        modelUsed: model,
      };
    }
    return {
      replyText: executedTools.map((t) => t.summary).join('\n'),
      executedTools,
      uiAction: params.ctx.uiAction,
      uiActionPayload: params.ctx.uiActionPayload,
      updatedDisplayName: params.ctx.updatedDisplayName,
      providerUsed: 'ollama',
      modelUsed: model,
    };
  }

  // 3) Google Gemini Native Multi-Step Function Calling (+ JSON fallback)
  const effectiveGeminiKey =
    savedKey || (process.env.GEMINI_API_KEY || '').trim() || getEnvConfig().geminiApiKey || '';
  if (!effectiveGeminiKey) {
    throw new Error(
      'کلید API برای اسلات agent_core تنظیم نشده است. لطفاً کلید API را در تب ۴ اسلات موتور هوش مصنوعی ذخیره کنید.'
    );
  }

  const systemPrompt = await buildGroundedSystemPrompt({
    ctx: params.ctx,
    tools: allowedTools,
    extraContext: params.extraContext,
    includeJsonFallbackProtocol: false,
  });

  const ai = new GoogleGenAI({
    apiKey: effectiveGeminiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });

  const functionDeclarations = toGeminiFunctionDeclarations(allowedTools);
  type GeminiContent = {
    role: 'user' | 'model';
    parts: Record<string, unknown>[];
  };

  const contents: GeminiContent[] = [
    ...recentHistory.map(
      (h): GeminiContent => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })
    ),
    { role: 'user', parts: [{ text: params.userMessage }] },
  ];

  for (let step = 0; step < maxSteps; step++) {
    const response = await ai.models.generateContent({
      model,
      contents: contents as never,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations }],
      },
    });

    const fnCalls = response.functionCalls || [];
    if (fnCalls.length > 0) {
      const modelParts = response.candidates?.[0]?.content?.parts || [];
      contents.push({
        role: 'model',
        parts:
          modelParts.length > 0
            ? (modelParts as unknown as Record<string, unknown>[])
            : fnCalls.map((fc) => ({ functionCall: { name: fc.name, args: fc.args || {} } })),
      });

      const responseParts: Record<string, unknown>[] = [];
      for (const fc of fnCalls) {
        const toolName = String(fc.name || '');
        const toolArgs = (fc.args && typeof fc.args === 'object' ? fc.args : {}) as Record<
          string,
          unknown
        >;
        const execRes = allowedToolNames.has(toolName)
          ? await executeCmsTool(toolName, toolArgs, params.ctx)
          : {
              tool: toolName,
              args: toolArgs,
              ok: false,
              summary: `ابزار ${toolName} برای نقش ${params.ctx.actorRole} مجاز نیست.`,
            };
        executedTools.push(execRes);
        responseParts.push({
          functionResponse: {
            name: toolName,
            response: execRes as unknown as Record<string, unknown>,
          },
        });
      }
      contents.push({ role: 'user', parts: responseParts });
      continue;
    }

    const textReply = String(response.text || '').trim();
    const jsonTool = tryExtractFallbackJsonToolCall(textReply);
    if (jsonTool && step < maxSteps - 1) {
      const execRes = allowedToolNames.has(jsonTool.name)
        ? await executeCmsTool(jsonTool.name, jsonTool.arguments, params.ctx)
        : {
            tool: jsonTool.name,
            args: jsonTool.arguments,
            ok: false,
            summary: `ابزار ${jsonTool.name} برای نقش ${params.ctx.actorRole} مجاز نیست.`,
          };
      executedTools.push(execRes);
      contents.push({ role: 'model', parts: [{ text: textReply }] });
      contents.push({
        role: 'user',
        parts: [
          {
            text: `نتیجه اجرای ابزار ${jsonTool.name}: ${JSON.stringify(execRes)}\nحالا پاسخ نهایی فارسی را بنویس.`,
          },
        ],
      });
      continue;
    }

    return {
      replyText: textReply || executedTools.map((t) => t.summary).join('\n'),
      executedTools,
      uiAction: params.ctx.uiAction,
      uiActionPayload: params.ctx.uiActionPayload,
      updatedDisplayName: params.ctx.updatedDisplayName,
      providerUsed: 'gemini',
      modelUsed: model,
    };
  }

  // Final synthesis after max tool calls
  const finalResp = await ai.models.generateContent({
    model,
    contents: contents as never,
    config: {
      systemInstruction: systemPrompt,
    },
  });

  return {
    replyText:
      String(finalResp.text || '').trim() || executedTools.map((t) => t.summary).join('\n'),
    executedTools,
    uiAction: params.ctx.uiAction,
    uiActionPayload: params.ctx.uiActionPayload,
    updatedDisplayName: params.ctx.updatedDisplayName,
    providerUsed: 'gemini',
    modelUsed: model,
  };
}
