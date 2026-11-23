import type { ComposerRow, SiteModuleRegistryItem } from '../../src/core/types.js';
import { cmsCache } from '../../src/server/core/cacheEngine.js';
import { dbExec, dbQuery, formatPersianDateTime } from '../../src/server/database/connection.js';
import { getSetting, setSetting, writeSystemLog } from '../../src/server/database/settingsLogsRepo.js';
import { DEFAULT_SITE_MODULES_REGISTRY } from '../../src/server/modules/admin/modulesConfigRouter.js';
import {
  deleteKnowledgeCacheEntry,
  getKnowledgeCacheStats,
  listKnowledgeCache,
  updateKnowledgeCacheStatus,
  upsertKnowledgeCacheEntry,
  type KnowledgeCacheCategory,
  type KnowledgeCacheStatus,
} from './knowledgeCacheEngine.js';

export interface JarvisBuilderToolResult {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
}

/**
 * Strict server-side HTML sanitizer for dynamic pages created by Jarvis.
 * Strips active/executable elements, inline event handlers, and dangerous URL protocols.
 */
export function sanitizePageHtml(rawHtml: string): string {
  return String(rawHtml || '')
    .replace(/<\s*(script|style|iframe|object|embed|applet|form|input|button|textarea|select|meta|link|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|applet|form|input|button|textarea|select|meta|link|base)[^>]*\/?>/gi, '')
    .replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"']*\2/gi, '$1="#"')
    .replace(/javascript\s*:/gi, '')
    .trim()
    .slice(0, 24000);
}

function normalizeSlug(raw: string, fallbackPrefix = 'page'): string {
  const cleaned = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
  return cleaned || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

/**
 * Super Admin Tool: create_or_update_page
 * Creates or updates a dynamic CMS page inside `pages` with sanitized HTML & ComposerRow blocks.
 */
export async function runCreateOrUpdatePageTool(
  args: Record<string, unknown>
): Promise<JarvisBuilderToolResult> {
  const title = String(args.title || args.titleFa || '').trim().slice(0, 160);
  if (!title) {
    return { ok: false, summary: 'عنوان برگه (title) الزامی است.' };
  }

  const slug = normalizeSlug(String(args.slug || title), 'page');
  const status: 'draft' | 'published' = args.status === 'published' ? 'published' : 'draft';
  const validTemplates = new Set(['standard', 'landing', 'full_width', 'contact', 'faq']);
  const templateType = validTemplates.has(String(args.templateType))
    ? String(args.templateType)
    : 'landing';
  const validSchemas = new Set(['WebPage', 'FAQPage', 'AboutPage', 'ContactPage']);
  const schemaType = validSchemas.has(String(args.schemaType)) ? String(args.schemaType) : 'WebPage';

  const summary = String(args.summary || '').trim().slice(0, 400);
  const seoTitle = String(args.seoTitle || title).trim().slice(0, 160);
  const seoDescription = String(args.seoDescription || summary || title).trim().slice(0, 320);
  const rawContentHtml = String(args.htmlContent || args.contentHtml || args.content || '').trim();
  const safeHtml = sanitizePageHtml(rawContentHtml);
  const ctaText = String(args.ctaText || '').trim().slice(0, 80);
  const ctaLink = String(args.ctaLink || '').trim().slice(0, 200);
  const safeCtaLink = /^(?:\/|https?:\/\/)/i.test(ctaLink) ? ctaLink : '/';

  const existing = await dbQuery<{ id: string }>(
    'SELECT id FROM pages WHERE slug = $1 OR id = $2 LIMIT 1',
    [slug, String(args.id || '').trim()]
  );
  const id = existing[0]?.id || `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();

  const composerRows: ComposerRow[] = [
    {
      id: `row_hero_${Date.now()}`,
      rowTitle: 'سربرگ برگه',
      columns: 1,
      backgroundStyle: 'accent',
      widgets: [
        {
          id: `w_hero_${Date.now()}`,
          widgetType: 'hero_slider',
          title,
          subtitle: summary || seoDescription,
          badgeText: status === 'published' ? 'منتشرشده' : 'پیش‌نویس',
          ...(ctaText ? { ctaText, ctaLink: safeCtaLink } : {}),
        },
      ],
    },
  ];

  if (safeHtml) {
    composerRows.push({
      id: `row_body_${Date.now() + 1}`,
      rowTitle: 'محتوای اصلی برگه',
      columns: 1,
      backgroundStyle: 'default',
      widgets: [
        {
          id: `w_html_${Date.now() + 1}`,
          widgetType: 'custom_html',
          title: 'محتوای صفحه',
          content: safeHtml,
        },
      ],
    });
  }

  if (ctaText) {
    composerRows.push({
      id: `row_cta_${Date.now() + 2}`,
      rowTitle: 'فراخوان اقدام (CTA)',
      columns: 1,
      backgroundStyle: 'muted',
      widgets: [
        {
          id: `w_cta_${Date.now() + 2}`,
          widgetType: 'cta_banner',
          title: ctaText,
          subtitle: summary || seoDescription,
          ctaText,
          ctaLink: safeCtaLink,
        },
      ],
    });
  }

  await dbExec(
    `INSERT INTO pages (
       id, slug, title, status, template_type, summary, seo_title, seo_description,
       canonical_url, og_image, schema_type, composer_rows_json, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO UPDATE SET
       slug = EXCLUDED.slug,
       title = EXCLUDED.title,
       status = EXCLUDED.status,
       template_type = EXCLUDED.template_type,
       summary = EXCLUDED.summary,
       seo_title = EXCLUDED.seo_title,
       seo_description = EXCLUDED.seo_description,
       canonical_url = EXCLUDED.canonical_url,
       schema_type = EXCLUDED.schema_type,
       composer_rows_json = EXCLUDED.composer_rows_json,
       updated_at = EXCLUDED.updated_at`,
    [
      id,
      slug,
      title,
      status,
      templateType,
      summary,
      seoTitle,
      seoDescription,
      `/page/${slug}`,
      '/assets/aistudio/logo_8c26749f.webp',
      schemaType,
      JSON.stringify(composerRows),
      nowIso,
    ]
  );

  cmsCache.invalidatePrefix('pages:');
  await writeSystemLog({
    level: 'success',
    category: 'system',
    title: `${existing[0] ? 'بروزرسانی' : 'ساخت'} برگه پویا توسط جارویس: ${title}`,
    detail: `مسیر: /page/${slug} · وضعیت: ${status} · تعداد ردیف: ${composerRows.length}`,
    sqlOrEndpoint: 'TOOL create_or_update_page',
  });

  return {
    ok: true,
    summary: `برگه «${title}» با موفقیت ${existing[0] ? 'بروزرسانی' : 'ایجاد'} شد (وضعیت: ${
      status === 'published' ? 'منتشرشده' : 'پیش‌نویس'
    } · آدرس: /page/${slug}).`,
    data: {
      id,
      slug,
      title,
      status,
      url: `/page/${slug}`,
      rowsCount: composerRows.length,
    },
  };
}

/**
 * Super Admin Tool: reply_to_live_chat
 * Lets Jarvis directly supervise and reply in any customer live-chat thread as official admin,
 * resetting unread_admin_count to 0.
 */
export async function runReplyToLiveChatTool(
  args: Record<string, unknown>
): Promise<JarvisBuilderToolResult> {
  const sessionId = String(args.sessionId || '').trim();
  const replyText = String(args.replyText || args.messageText || '').trim().slice(0, 2500);
  const senderName = String(args.senderName || 'مدیریت پشتیبانی').trim().slice(0, 60) || 'مدیریت پشتیبانی';

  if (!sessionId || !replyText) {
    return {
      ok: false,
      summary: 'شناسه نشست گفتگو (sessionId) و متن پاسخ رسمی (replyText) الزامی هستند.',
    };
  }

  const sessRows = await dbQuery<{
    id: string;
    visitor_name: string;
    visitor_phone: string;
    status: string;
  }>(
    'SELECT id, visitor_name, visitor_phone, status FROM mod_live_chat_sessions WHERE id = $1 LIMIT 1',
    [sessionId]
  ).catch(() => []);

  if (!sessRows[0]) {
    return {
      ok: false,
      summary: `نشست گفتگوی آنلاین با شناسه «${sessionId}» در دیتابیس یافت نشد. ابتدا با read_live_chat_messages شناسه دقیق نشست را بررسی کنید.`,
    };
  }

  const nowIso = new Date().toISOString();
  const nowFa = formatPersianDateTime();
  const msgId = `msg_jarvis_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

  await dbExec(
    `INSERT INTO mod_live_chat_messages
     (id, session_id, sender_role, sender_name, message_text, attachment_url, attachment_name, ui_action, created_at_fa, created_at)
     VALUES ($1, $2, 'operator', $3, $4, '', '', '', $5, $6)`,
    [msgId, sessionId, senderName, replyText, nowFa, nowIso]
  );

  await dbExec(
    `UPDATE mod_live_chat_sessions
     SET unread_admin_count = 0, last_message_preview = $1, updated_at = $2
     WHERE id = $3`,
    [replyText.slice(0, 140), nowIso, sessionId]
  );

  await writeSystemLog({
    level: 'success',
    category: 'system',
    title: `پاسخ مستقیم مدیریت از طریق جارویس در چت آنلاین (${sessRows[0].visitor_name || sessionId})`,
    detail: `نشست: ${sessionId} · گیرنده: ${sessRows[0].visitor_name || '-'} (${sessRows[0].visitor_phone || 'مهمان'}) · پیام: ${replyText.slice(0, 140)}`,
    sqlOrEndpoint: 'TOOL reply_to_live_chat',
  });

  return {
    ok: true,
    summary: `پاسخ رسمی با موفقیت در گفتگوی «${sessRows[0].visitor_name || sessionId}» ارسال و پیام‌های خوانده‌نشده صفر شد.`,
    data: {
      messageId: msgId,
      sessionId,
      visitorName: sessRows[0].visitor_name,
      visitorPhone: sessRows[0].visitor_phone,
      sentAtFa: nowFa,
    },
  };
}

const PROTECTED_CORE_MODULE_IDS = new Set([
  'core_auth',
  'core_admin',
  'core_security',
  'mod_security',
  'mod_ai_hub_agent',
  'mod_maintenance_audit',
]);

/**
 * Super Admin Tool: manage_site_modules
 * Safely enables or disables non-core CMS modules in `site_modules_registry` with audit logging.
 */
export async function runManageSiteModulesTool(
  args: Record<string, unknown>
): Promise<JarvisBuilderToolResult> {
  const action = String(args.action || 'list').trim().toLowerCase();
  const saved = await getSetting<SiteModuleRegistryItem[]>(
    'site_modules_registry',
    DEFAULT_SITE_MODULES_REGISTRY
  );
  const savedMap = new Map((Array.isArray(saved) ? saved : []).map((m) => [m.id, m]));
  const currentList = DEFAULT_SITE_MODULES_REGISTRY.map((def) => {
    const existing = savedMap.get(def.id);
    return existing ? { ...def, enabled: Boolean(existing.enabled) } : { ...def };
  });

  if (action === 'list') {
    return {
      ok: true,
      summary: `فهرست ${currentList.length} ماژول سامانه خوانده شد (${currentList.filter((m) => m.enabled).length} فعال).`,
      data: {
        modules: currentList.map((m) => ({
          id: m.id,
          titleFa: m.titleFa,
          category: m.category,
          enabled: m.enabled,
          protected: PROTECTED_CORE_MODULE_IDS.has(m.id),
        })),
      },
    };
  }

  const moduleId = String(args.moduleId || '').trim();
  const targetEnabled =
    action === 'enable' ? true : action === 'disable' ? false : Boolean(args.enabled);

  if (!moduleId) {
    return { ok: false, summary: 'شناسه ماژول (moduleId) الزامی است.' };
  }
  const targetMod = currentList.find((m) => m.id === moduleId);
  if (!targetMod) {
    return {
      ok: false,
      summary: `ماژول «${moduleId}» در رجیستری استاندارد CMS یافت نشد.`,
      data: { availableModuleIds: currentList.map((m) => m.id) },
    };
  }

  if (!targetEnabled && PROTECTED_CORE_MODULE_IDS.has(moduleId)) {
    return {
      ok: false,
      summary: `غیرفعال‌سازی ماژول هسته و محافظت‌شده «${targetMod.titleFa}» (${moduleId}) از طریق ایجنت مجاز نیست.`,
    };
  }

  const nextList = currentList.map((m) =>
    m.id === moduleId ? { ...m, enabled: targetEnabled } : m
  );
  await setSetting('site_modules_registry', nextList);

  await writeSystemLog({
    level: 'success',
    category: 'system',
    title: `تغییر وضعیت ماژول «${targetMod.titleFa}» توسط جارویس (${targetEnabled ? 'روشن' : 'خاموش'})`,
    detail: `moduleId=${moduleId} · enabled=${targetEnabled} · کل ماژول‌های فعال: ${nextList.filter((m) => m.enabled).length}/${nextList.length}`,
    sqlOrEndpoint: 'TOOL manage_site_modules',
  });

  return {
    ok: true,
    summary: `ماژول «${targetMod.titleFa}» (${moduleId}) با موفقیت ${targetEnabled ? 'فعال' : 'غیرفعال'} شد و در لاگ ممیزی ثبت گردید.`,
    data: {
      moduleId,
      titleFa: targetMod.titleFa,
      enabled: targetEnabled,
      activeModulesCount: nextList.filter((m) => m.enabled).length,
    },
  };
}

/**
 * Super Admin Tool: manage_knowledge_cache
 * Lets Jarvis list, add, edit, approve, disable, or delete zero-token KB entries.
 */
export async function runManageKnowledgeCacheTool(
  args: Record<string, unknown>
): Promise<JarvisBuilderToolResult> {
  const action = String(args.action || 'list').trim().toLowerCase();

  if (action === 'list') {
    const [entries, stats] = await Promise.all([listKnowledgeCache(), getKnowledgeCacheStats()]);
    return {
      ok: true,
      summary: `بانک دانش صفرتوکن دارای ${stats.totalEntries} ورودی (${stats.activeCount} فعال، ${stats.pendingCount} در انتظار تایید) و ${stats.totalHits} پاسخ صفرتوکن است.`,
      data: {
        stats,
        entries: entries.slice(0, 25).map((e) => ({
          id: e.id,
          questionPattern: e.question_pattern,
          category: e.category,
          status: e.status,
          hitCount: e.hit_count,
          source: e.source,
        })),
      },
    };
  }

  if (action === 'add' || action === 'update') {
    const questionPattern = String(args.questionPattern || args.question || '').trim();
    const answerText = String(args.answerText || args.answer || '').trim();
    const normalizedKeywords = String(args.normalizedKeywords || args.keywords || '').trim();
    const category = (args.category as KnowledgeCacheCategory) || 'faq';
    const status = (args.status as KnowledgeCacheStatus) || 'active';

    const saved = await upsertKnowledgeCacheEntry({
      id: args.id ? String(args.id) : undefined,
      questionPattern,
      normalizedKeywords,
      answerText,
      category,
      status,
      source: 'admin',
    });

    await writeSystemLog({
      level: 'success',
      category: 'system',
      title: `ذخیره ورودی بانک دانش صفرتوکن توسط جارویس (${saved.question_pattern.slice(0, 60)})`,
      detail: `id=${saved.id} · status=${saved.status} · category=${saved.category}`,
      sqlOrEndpoint: 'TOOL manage_knowledge_cache',
    });

    return {
      ok: true,
      summary: `ورودی بانک دانش صفرتوکن با شناسه ${saved.id} با موفقیت ذخیره شد (${saved.status}).`,
      data: { entry: saved },
    };
  }

  const id = String(args.id || '').trim();
  if (!id) {
    return { ok: false, summary: 'شناسه ورودی بانک دانش (id) برای این عملیات الزامی است.' };
  }

  if (action === 'approve') {
    await updateKnowledgeCacheStatus(id, 'active');
    return { ok: true, summary: `ورودی بانک دانش (${id}) تایید و فعال شد.`, data: { id, status: 'active' } };
  }
  if (action === 'disable') {
    await updateKnowledgeCacheStatus(id, 'disabled');
    return { ok: true, summary: `ورودی بانک دانش (${id}) غیرفعال شد.`, data: { id, status: 'disabled' } };
  }
  if (action === 'delete') {
    await deleteKnowledgeCacheEntry(id);
    return { ok: true, summary: `ورودی بانک دانش (${id}) حذف شد.`, data: { id, deleted: true } };
  }

  return {
    ok: false,
    summary: `عملیات ناشناخته برای manage_knowledge_cache: ${action} (مقادیر مجاز: list, add, update, approve, disable, delete).`,
  };
}
