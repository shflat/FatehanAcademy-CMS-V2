import express from 'express';
import { dbExec, dbQuery, formatPersianDateTime } from '../../src/server/database/connection.js';
import { writeSystemLog } from '../../src/server/database/settingsLogsRepo.js';
import {
  ensureAiHubSchema,
  getAiHubSettings,
  getMaskedSocialPublisherConfig,
  maskAiHubSettingsForClient,
  readScopedAgentMemories,
  requireStrictSuperAdmin,
  saveAiHubSettings,
  saveSocialPublisherConfig,
  type BaleAdminAlertsConfig,
  type InstagramPublishMode,
  type JarvisAvatarPreset,
  type JarvisSettingsConfig,
} from './aiHubSchema.js';
import {
  synthesizeSpeechViaVoiceSlot,
  transcribeAudioViaVoiceSlot,
} from './aiProviderGateway.js';
import {
  dispatchAgentBotBridgeAlert,
  queueAgentApproval,
} from './agentToolsEngine.js';
import {
  runMultiStepAgentTurn,
  type JarvisPageContext,
} from './agentToolCallingEngine.js';
import {
  sendDailyMorningBriefing,
  sendSuperAdminBaleAlert,
  startBalePairingSession,
  verifyBalePairingSession,
} from './baleAlertBridge.js';
import {
  executeQueuedSocialApproval,
  testSocialChannelConnection,
} from './agentSocialPublisher.js';
import { assertSafePublicUrl } from './agentContentFactory.js';
import {
  deleteKnowledgeCacheEntry,
  getKnowledgeCacheStats,
  listKnowledgeCache,
  updateKnowledgeCacheStatus,
  upsertKnowledgeCacheEntry,
  type KnowledgeCacheCategory,
  type KnowledgeCacheStatus,
} from './knowledgeCacheEngine.js';

/**
 * STRICT SUPER ADMIN ONLY sub-router (HTTP 403 for Regular Site Admins).
 * Handles 24/7 Autonomous Agent overview, mode, Voice Command Center, SKILL.md,
 * scoped memory, multi-step tool execution, scheduled tasks, 1-click approvals, and Bot Bridge testing.
 */
export function registerSuperAdminAgentRoutes(router: express.Router): void {
  router.get('/api/v1/modules/ai-hub/agent/overview', requireStrictSuperAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const [settings, skills, tasks, approvals, conversations, memories, kbStats] = await Promise.all([
        getAiHubSettings(),
        dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_ai_agent_skills ORDER BY updated_at DESC LIMIT 50'
        ),
        dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_ai_agent_tasks ORDER BY created_at DESC LIMIT 30'
        ),
        dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_ai_approval_queue ORDER BY created_at DESC LIMIT 40'
        ),
        dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_ai_agent_conversations ORDER BY created_at DESC LIMIT 40'
        ),
        readScopedAgentMemories({
          actorRole: 'super_admin',
          userId: req.authUser?.phone || 'super_admin',
          limit: 30,
        }),
        getKnowledgeCacheStats(),
      ]);
      res.json({
        ok: true,
        settings: maskAiHubSettingsForClient(settings),
        skills,
        tasks,
        approvals,
        memories,
        kbStats,
        conversations: conversations.reverse(),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Agent overview error' });
    }
  });

  // Lightweight Super Admin ONLY config endpoint for floating Jarvis mascot
  router.get('/api/v1/modules/ai-hub/agent/jarvis-config', requireStrictSuperAdmin, async (_req, res) => {
    try {
      await ensureAiHubSchema();
      const settings = await getAiHubSettings();
      res.json({
        ok: true,
        agentMode: settings.agentMode,
        jarvisSettings: settings.jarvisSettings,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Jarvis config error' });
    }
  });

  router.post('/api/v1/modules/ai-hub/agent/mode', requireStrictSuperAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const b = req.body || {};
      const baleAlertsPatch =
        b.baleAlerts && typeof b.baleAlerts === 'object'
          ? {
              enabled:
                typeof b.baleAlerts.enabled === 'boolean' ? b.baleAlerts.enabled : undefined,
              notifyApprovals:
                typeof b.baleAlerts.notifyApprovals === 'boolean'
                  ? b.baleAlerts.notifyApprovals
                  : undefined,
              notifyUserRequests:
                typeof b.baleAlerts.notifyUserRequests === 'boolean'
                  ? b.baleAlerts.notifyUserRequests
                  : undefined,
              notifyOrdersAndFailures:
                typeof b.baleAlerts.notifyOrdersAndFailures === 'boolean'
                  ? b.baleAlerts.notifyOrdersAndFailures
                  : undefined,
              notifyCriticalErrors:
                typeof b.baleAlerts.notifyCriticalErrors === 'boolean'
                  ? b.baleAlerts.notifyCriticalErrors
                  : undefined,
              notifyAgentEscalations:
                typeof b.baleAlerts.notifyAgentEscalations === 'boolean'
                  ? b.baleAlerts.notifyAgentEscalations
                  : undefined,
              overrideChatId:
                typeof b.baleAlerts.overrideChatId === 'string'
                  ? b.baleAlerts.overrideChatId.trim().slice(0, 80)
                  : undefined,
              baleBotToken:
                typeof b.baleAlerts.baleBotToken === 'string'
                  ? b.baleAlerts.baleBotToken.trim().slice(0, 260)
                  : undefined,
              dailyBriefingEnabled:
                typeof b.baleAlerts.dailyBriefingEnabled === 'boolean'
                  ? b.baleAlerts.dailyBriefingEnabled
                  : undefined,
              dailyBriefingTime:
                typeof b.baleAlerts.dailyBriefingTime === 'string'
                  ? b.baleAlerts.dailyBriefingTime.trim().slice(0, 10)
                  : undefined,
              heartbeatEnabled:
                typeof b.baleAlerts.heartbeatEnabled === 'boolean'
                  ? b.baleAlerts.heartbeatEnabled
                  : undefined,
            }
          : undefined;

      const cleanedBaleAlerts = baleAlertsPatch
        ? (Object.fromEntries(
            Object.entries(baleAlertsPatch).filter(([, v]) => v !== undefined)
          ) as Partial<BaleAdminAlertsConfig> & { baleBotToken?: string })
        : undefined;

      const validAvatars: JarvisAvatarPreset[] = ['orb_cyber', 'bot_minimal', 'shield_ai'];
      const jarvisPatchRaw =
        b.jarvisSettings && typeof b.jarvisSettings === 'object'
          ? {
              enabled:
                typeof b.jarvisSettings.enabled === 'boolean'
                  ? b.jarvisSettings.enabled
                  : undefined,
              mascotEnabled:
                typeof b.jarvisSettings.mascotEnabled === 'boolean'
                  ? b.jarvisSettings.mascotEnabled
                  : undefined,
              mascotName:
                typeof b.jarvisSettings.mascotName === 'string'
                  ? b.jarvisSettings.mascotName.trim().slice(0, 40)
                  : undefined,
              mascotPersona:
                typeof b.jarvisSettings.mascotPersona === 'string'
                  ? b.jarvisSettings.mascotPersona.trim().slice(0, 320)
                  : undefined,
              mascotAvatar: validAvatars.includes(b.jarvisSettings.mascotAvatar)
                ? (b.jarvisSettings.mascotAvatar as JarvisAvatarPreset)
                : undefined,
              voiceReplyEnabled:
                typeof b.jarvisSettings.voiceReplyEnabled === 'boolean'
                  ? b.jarvisSettings.voiceReplyEnabled
                  : undefined,
              voiceReplyProvider:
                b.jarvisSettings.voiceReplyProvider === 'slot4_paid_tts'
                  ? ('slot4_paid_tts' as const)
                  : b.jarvisSettings.voiceReplyProvider === 'free_browser'
                  ? ('free_browser' as const)
                  : undefined,
              ttsModel:
                typeof b.jarvisSettings.ttsModel === 'string'
                  ? b.jarvisSettings.ttsModel.trim().slice(0, 80)
                  : undefined,
              ttsVoice:
                typeof b.jarvisSettings.ttsVoice === 'string'
                  ? b.jarvisSettings.ttsVoice.trim().slice(0, 40)
                  : undefined,
              allowSkillToProduct:
                typeof b.jarvisSettings.allowSkillToProduct === 'boolean'
                  ? b.jarvisSettings.allowSkillToProduct
                  : undefined,
              allowSocialPublisher:
                typeof b.jarvisSettings.allowSocialPublisher === 'boolean'
                  ? b.jarvisSettings.allowSocialPublisher
                  : undefined,
            }
          : undefined;

      const cleanedJarvisSettings = jarvisPatchRaw
        ? (Object.fromEntries(
            Object.entries(jarvisPatchRaw).filter(([, v]) => v !== undefined)
          ) as Partial<JarvisSettingsConfig>)
        : undefined;

      const parsedGuestLimit =
        typeof b.guestMaxLlmReplies === 'number' && Number.isFinite(b.guestMaxLlmReplies)
          ? Math.max(1, Math.min(20, Math.round(b.guestMaxLlmReplies)))
          : undefined;

      const updated = await saveAiHubSettings({
        agentMode:
          b.agentMode === 'autonomous_24_7'
            ? 'autonomous_24_7'
            : b.agentMode === 'light'
            ? 'light'
            : undefined,
        liveChatAutoReply: typeof b.liveChatAutoReply === 'boolean' ? b.liveChatAutoReply : undefined,
        autoProfileCompletion:
          typeof b.autoProfileCompletion === 'boolean' ? b.autoProfileCompletion : undefined,
        botBridgeEnabled: typeof b.botBridgeEnabled === 'boolean' ? b.botBridgeEnabled : undefined,
        kbAutoLearnMode:
          b.kbAutoLearnMode === 'auto_active'
            ? 'auto_active'
            : b.kbAutoLearnMode === 'pending_review'
            ? 'pending_review'
            : undefined,
        guestMaxLlmReplies: parsedGuestLimit,
        ...(cleanedBaleAlerts ? { baleAlerts: cleanedBaleAlerts } : {}),
        ...(cleanedJarvisSettings ? { jarvisSettings: cleanedJarvisSettings } : {}),
      });
      await writeSystemLog({
        level: 'success',
        category: 'system',
        title: `بروزرسانی تنظیمات ایجنت ۲۴/۷ و دستیار جارویس (${updated.agentMode})`,
        detail: `کلید اصلی: ${updated.jarvisSettings.enabled} · ماسکات: ${updated.jarvisSettings.mascotEnabled} (${updated.jarvisSettings.mascotName}) · TTS: ${updated.jarvisSettings.voiceReplyEnabled} (${updated.jarvisSettings.voiceReplyProvider})`,
        sqlOrEndpoint: 'POST /api/v1/modules/ai-hub/agent/mode',
      });
      res.json({ ok: true, settings: maskAiHubSettingsForClient(updated) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Mode update error' });
    }
  });

  router.post('/api/v1/modules/ai-hub/agent/command', requireStrictSuperAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const hubSettings = await getAiHubSettings();
      if (hubSettings.jarvisSettings?.enabled === false) {
        res.status(400).json({
          ok: false,
          error:
            'کلید اصلی ایجنت خودکار ۲۴/۷ در بخش «تنظیمات دستیار جارویس» خاموش است. برای اجرای فرمان، ابتدا آن را روشن کنید.',
        });
        return;
      }

      const commandText = String(req.body?.command || '').trim();
      const channel = String(req.body?.channel || 'command_center').trim().slice(0, 40) || 'command_center';

      // Optional attached .md / .txt file from Super Admin Jarvis Drawer or Command Center
      const rawAttached = req.body?.attachedMarkdown;
      const attachedFileName =
        rawAttached && typeof rawAttached === 'object' && typeof rawAttached.fileName === 'string'
          ? rawAttached.fileName.trim().slice(0, 120)
          : '';
      const attachedFileContent =
        rawAttached && typeof rawAttached === 'object' && typeof rawAttached.content === 'string'
          ? rawAttached.content.trim().slice(0, 24000)
          : '';

      if (!commandText && !attachedFileContent) {
        res.status(400).json({ ok: false, error: 'متن دستور، فرمان صوتی یا فایل پیوست الزامی است.' });
        return;
      }

      const effectiveCommandText =
        commandText || `لطفاً فایل پیوست‌شده (${attachedFileName || 'skill.md'}) را بررسی و تحلیل کن.`;
      const conversationDisplayText = attachedFileContent
        ? `${effectiveCommandText}\n[پیوست فایل: ${attachedFileName || 'skill.md'} — ${attachedFileContent.length.toLocaleString('fa-IR')} کاراکتر]`
        : effectiveCommandText;

      // Sanitize optional live Page Context sent by floating Jarvis Mascot
      const rawCtx = req.body?.pageContext;
      const allowedEntities = new Set(['product', 'article', 'order', 'admin_panel', 'storefront']);
      const pageContext: JarvisPageContext | undefined =
        rawCtx && typeof rawCtx === 'object'
          ? {
              path: String(rawCtx.path || '/').trim().slice(0, 200),
              pageTitle: String(rawCtx.pageTitle || '').trim().slice(0, 160),
              entityType: allowedEntities.has(String(rawCtx.entityType))
                ? (String(rawCtx.entityType) as JarvisPageContext['entityType'])
                : 'storefront',
              entityId: rawCtx.entityId ? String(rawCtx.entityId).trim().slice(0, 120) : undefined,
              entitySlug: rawCtx.entitySlug ? String(rawCtx.entitySlug).trim().slice(0, 140) : undefined,
            }
          : undefined;

      // Auto-hydrate live entity record snapshot (extracting SEO & media fields from payload_json)
      let liveEntitySnapshot = '';
      if (pageContext?.entityType === 'product' && (pageContext.entityId || pageContext.entitySlug)) {
        const prodRows = await dbQuery<{
          id: string;
          title: string;
          slug: string;
          category: string;
          price: number;
          status: string;
          payload_json: string;
        }>(
          `SELECT id, title, slug, category, price, status, payload_json
           FROM products WHERE id = $1 OR slug = $2 LIMIT 1`,
          [pageContext.entityId || '', pageContext.entitySlug || '']
        ).catch(() => []);
        if (prodRows[0]) {
          let pJson: Record<string, unknown> = {};
          try {
            pJson = JSON.parse(prodRows[0].payload_json || '{}') as Record<string, unknown>;
          } catch {
            pJson = {};
          }
          liveEntitySnapshot = `\nاطلاعات زنده محصول روی صفحه سوپر ادمین:\n${JSON.stringify({
            id: prodRows[0].id,
            title: prodRows[0].title,
            slug: prodRows[0].slug,
            category: prodRows[0].category,
            price: prodRows[0].price,
            status: prodRows[0].status,
            seoTitle: pJson.seoTitle || '',
            seoDescription: pJson.seoDescription || '',
            shortDescription: pJson.shortDescription || '',
            imageUrl: pJson.imageUrl || '',
          })}`;
        }
      } else if (pageContext?.entityType === 'article' && (pageContext.entityId || pageContext.entitySlug)) {
        const artRows = await dbQuery<{
          id: string;
          title: string;
          slug: string;
          category: string;
          status: string;
          payload_json: string;
        }>(
          `SELECT id, title, slug, category, status, payload_json
           FROM articles WHERE id = $1 OR slug = $2 LIMIT 1`,
          [pageContext.entityId || '', pageContext.entitySlug || '']
        ).catch(() => []);
        if (artRows[0]) {
          let aJson: Record<string, unknown> = {};
          try {
            aJson = JSON.parse(artRows[0].payload_json || '{}') as Record<string, unknown>;
          } catch {
            aJson = {};
          }
          liveEntitySnapshot = `\nاطلاعات زنده مقاله روی صفحه سوپر ادمین:\n${JSON.stringify({
            id: artRows[0].id,
            title: artRows[0].title,
            slug: artRows[0].slug,
            category: artRows[0].category,
            status: artRows[0].status,
            seoTitle: aJson.seoTitle || '',
            seoDescription: aJson.seoDescription || '',
            summary: aJson.summary || '',
            featuredImageUrl: aJson.featuredImageUrl || '',
          })}`;
        }
      } else if (pageContext?.entityType === 'order' && pageContext.entityId) {
        const ordRows = await dbQuery<Record<string, unknown>>(
          `SELECT id, buyer_phone, buyer_name, total_amount, payment_method, status, created_at_label
           FROM orders WHERE id = $1 LIMIT 1`,
          [pageContext.entityId]
        ).catch(() => []);
        if (ordRows[0]) {
          liveEntitySnapshot = `\nاطلاعات زنده سفارش روی صفحه سوپر ادمین:\n${JSON.stringify(ordRows[0])}`;
        }
      }

      const attachedMarkdownContext = attachedFileContent
        ? `\n\n## فایل مارک‌داون/متنی پیوست‌شده توسط سوپر ادمین (${attachedFileName || 'skill.md'}):\nدر صورت درخواست تبدیل به محصول یا مقاله، محتوای زیر را دقیقاً در پارامتر rawMarkdownOrNotes به ابزار skill_to_product ارسال کن:\n\`\`\`markdown\n${attachedFileContent.slice(0, 14000)}\n\`\`\``
        : '';

      const nowIso = new Date().toISOString();
      const nowFa = formatPersianDateTime();
      const senderPhone = req.authUser?.phone || 'super_admin';
      const senderDisplay = 'سوپر ادمین';

      // Read compact Command Center history (last 10 rows; sliding 6-msg window + 1-line digest enforced in engine)
      const priorRows = await dbQuery<{ role: string; message_text: string }>(
        `SELECT role, message_text FROM mod_ai_agent_conversations
         WHERE channel = $1 AND role IN ('user', 'assistant')
         ORDER BY created_at DESC LIMIT 10`,
        [channel]
      );
      const history = priorRows
        .reverse()
        .map((r) => ({
          role: (r.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: String(r.message_text || '').slice(0, 420),
        }));

      await dbExec(
        `INSERT INTO mod_ai_agent_conversations
         (id, channel, sender_phone, role, message_text, tool_calls_json, created_at_fa, created_at)
         VALUES ($1, $2, $3, 'user', $4, '[]', $5, $6)`,
        [`cmd_u_${Date.now()}`, channel, senderPhone, conversationDisplayText, nowFa, nowIso]
      );

      const [prodStats, chatStats] = await Promise.all([
        dbQuery<{ cnt: number | string }>('SELECT COUNT(*) AS cnt FROM products'),
        dbQuery<{ cnt: number | string }>(
          'SELECT COUNT(*) AS cnt FROM mod_live_chat_sessions WHERE unread_admin_count > 0'
        ),
      ]);

      let replyText = '';
      let providerUsed = 'agent_core';
      let modelUsed = '';
      const executedTools: { tool: string; summary: string; ok?: boolean }[] = [];

      if (/صف تایید|پیشنهاد اجرایی|پیش‌نویس تایید/i.test(effectiveCommandText)) {
        const apprId = await queueAgentApproval({
          titleFa: `پیشنهاد اجرایی ایجنت: ${effectiveCommandText.slice(0, 48)}`,
          actionType: 'agent_proposal',
          summaryFa: `ایجنت بر اساس فرمان «${effectiveCommandText}» یک اقدام پیشنهادی آماده تایید ۱-کلیکی ایجاد کرد.`,
          payload: { command: effectiveCommandText, channel, pageContext },
        });
        executedTools.push({
          tool: 'queue_approval_item',
          ok: true,
          summary: `ثبت در صف تایید ۱-کلیکی (${apprId})`,
        });
      }

      try {
        const turn = await runMultiStepAgentTurn({
          ctx: {
            actorRole: 'super_admin',
            channel: 'command_center',
            userId: senderPhone,
            userDisplayName: senderDisplay,
            pageContext,
          },
          userMessage: effectiveCommandText,
          history,
          extraContext: `آمار لحظه‌ای سریع: ${prodStats[0]?.cnt || 0} محصول در دیتابیس · ${chatStats[0]?.cnt || 0} نشست چت دارای پیام خوانده‌نشده.${liveEntitySnapshot}${attachedMarkdownContext}`,
          maxSteps: 4,
        });
        replyText = turn.replyText;
        providerUsed = turn.providerUsed;
        modelUsed = turn.modelUsed;
        for (const t of turn.executedTools) {
          executedTools.push({ tool: t.tool, summary: t.summary, ok: t.ok });
        }
        if (!replyText && turn.error) {
          replyText = `${turn.error}\nآمار زنده فعلی: ${prodStats[0]?.cnt || 0} محصول · ${chatStats[0]?.cnt || 0} چت خوانده‌نشده.`;
        }
      } catch (err) {
        const errDetail = err instanceof Error ? err.message : String(err);
        await writeSystemLog({
          level: 'error',
          category: 'system',
          title: 'خطای اجرای فرمان چندمرحله‌ای در مرکز فرماندهی ایجنت',
          detail: errDetail,
          sqlOrEndpoint: 'POST /api/v1/modules/ai-hub/agent/command',
        }).catch(() => {});
        replyText = `فرمان شما دریافت شد (محصولات فعال: ${prodStats[0]?.cnt || 0} · پیام‌های خوانده‌نشده چت: ${chatStats[0]?.cnt || 0}). ${
          executedTools.length > 0
            ? 'اقدام پیشنهادی با موفقیت در «صف تایید ۱-کلیکی» ثبت شد.'
            : `عدم اتصال به مدل هسته ایجنت: ${errDetail}`
        }`;
      }

      const replyId = `cmd_a_${Date.now()}`;
      await dbExec(
        `INSERT INTO mod_ai_agent_conversations
         (id, channel, sender_phone, role, message_text, tool_calls_json, created_at_fa, created_at)
         VALUES ($1, $2, 'agent_core', 'assistant', $3, $4, $5, $6)`,
        [
          replyId,
          channel,
          replyText,
          JSON.stringify(executedTools),
          formatPersianDateTime(),
          new Date().toISOString(),
        ]
      );

      res.json({ ok: true, replyId, replyText, executedTools, providerUsed, modelUsed });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Command error' });
    }
  });

  router.post('/api/v1/modules/ai-hub/agent/skills', requireStrictSuperAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const b = req.body || {};
      const titleFa = String(b.titleFa || '').trim();
      const skillMarkdown = String(b.skillMarkdown || '').trim();
      if (!titleFa || !skillMarkdown) {
        res.status(400).json({ ok: false, error: 'عنوان مهارت و محتوای SKILL.md الزامی است.' });
        return;
      }
      const id = String(b.id || `skill_${Date.now()}`);
      const slug = String(b.slug || id).toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      await dbExec(
        `INSERT INTO mod_ai_agent_skills
         (id, slug, title_fa, category, skill_markdown, source_type, usage_count, enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'learned', 0, 1, $6)
         ON CONFLICT(id) DO UPDATE SET
           title_fa = excluded.title_fa,
           category = excluded.category,
           skill_markdown = excluded.skill_markdown,
           updated_at = excluded.updated_at`,
        [id, slug, titleFa, String(b.category || 'operations'), skillMarkdown, new Date().toISOString()]
      );
      res.json({ ok: true, id, slug });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Save skill error' });
    }
  });

  router.delete('/api/v1/modules/ai-hub/agent/skills/:id', requireStrictSuperAdmin, async (req, res) => {
    try {
      await dbExec('DELETE FROM mod_ai_agent_skills WHERE id = $1', [String(req.params.id)]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Delete skill error' });
    }
  });

  router.post('/api/v1/modules/ai-hub/agent/tasks/:id/run', requireStrictSuperAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const taskId = String(req.params.id);
      const rows = await dbQuery<{ id: string; title_fa: string; task_type: string }>(
        'SELECT id, title_fa, task_type FROM mod_ai_agent_tasks WHERE id = $1 LIMIT 1',
        [taskId]
      );
      const task = rows[0];
      if (!task) {
        res.status(404).json({ ok: false, error: 'تسک یافت نشد.' });
        return;
      }
      const apprId = await queueAgentApproval({
        titleFa: `نتیجه اجرای تسک: ${task.title_fa}`,
        actionType: task.task_type,
        summaryFa: `تسک زمان‌بندی‌شده «${task.title_fa}» با موفقیت اجرا و گزارش آن در صف تایید ثبت شد.`,
        payload: { taskId, ranAt: new Date().toISOString() },
      });
      const nowFa = formatPersianDateTime();
      await dbExec(
        'UPDATE mod_ai_agent_tasks SET last_run_at = $1, last_result_summary = $2 WHERE id = $3',
        [nowFa, `اجرا شد · شناسه صف تایید: ${apprId}`, taskId]
      );
      res.json({ ok: true, approvalId: apprId, lastRunAt: nowFa });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Task run error' });
    }
  });

  router.post(
    '/api/v1/modules/ai-hub/agent/approvals/:id/decide',
    requireStrictSuperAdmin,
    async (req, res) => {
      try {
        await ensureAiHubSchema();
        const approvalId = String(req.params.id);
        const decision = req.body?.decision === 'approved' ? 'approved' : 'rejected';

        const rows = await dbQuery<{
          id: string;
          action_type: string;
          payload_json: string;
          status: string;
        }>('SELECT id, action_type, payload_json, status FROM mod_ai_approval_queue WHERE id = $1 LIMIT 1', [
          approvalId,
        ]);
        const row = rows[0];

        await dbExec(
          'UPDATE mod_ai_approval_queue SET status = $1, reviewed_by = $2 WHERE id = $3',
          [decision, req.authUser?.phone || 'super_admin', approvalId]
        );

        let executionSummary = '';
        if (decision === 'approved' && row && row.action_type === 'social_publish' && row.status === 'pending') {
          let payloadObj: Record<string, unknown> = {};
          try {
            payloadObj = JSON.parse(row.payload_json || '{}') as Record<string, unknown>;
          } catch {
            payloadObj = {};
          }
          const execRes = await executeQueuedSocialApproval(payloadObj);
          executionSummary = execRes.summaryFa;
        }

        res.json({ ok: true, decision, executionSummary: executionSummary || undefined });
      } catch (err) {
        res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Approval error' });
      }
    }
  );

  router.post(
    '/api/v1/modules/ai-hub/agent/bot-bridge/test',
    requireStrictSuperAdmin,
    async (_req, res) => {
      try {
        const result = await dispatchAgentBotBridgeAlert({
          title: 'تست پل ربات ایجنت ۲۴/۷',
          message: 'اتصال پل ارتباطی ایجنت هوشمند به کانال‌های بله، ایتا و تلگرام تایید شد.',
        });
        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Bot bridge error' });
      }
    }
  );

  // Super Admin ONLY: Send a live structured test alert from 24/7 Agent to Super Admin's Bale chat_id
  router.post(
    '/api/v1/modules/ai-hub/agent/bale-alerts/test',
    requireStrictSuperAdmin,
    async (_req, res) => {
      try {
        await ensureAiHubSchema();
        const result = await sendSuperAdminBaleAlert({
          category: 'test',
          force: true,
          title: 'تایید اتصال پل هشدار هوشمند ایجنت ۲۴/۷ به بله',
          lines: [
            'هشدارهای صف تایید، درخواست کاربران، سفارش‌ها/خریدهای ناموفق، خطاهای بحرانی و ارجاع سوالات بی‌پاسخ آماده ارسال هستند.',
            'نسخه سامانه: DPATech Final Base CMS v2.9.3 (Jarvis Orchestrator + Token Diet + Heartbeat)',
          ],
        });
        res.status(result.ok ? 200 : 400).json(result);
      } catch (err) {
        res.status(500).json({
          ok: false,
          sent: false,
          error: err instanceof Error ? err.message : 'خطا در ارسال تست هشدار بله',
        });
      }
    }
  );

  // Phase 14.3.1 — Super Admin ONLY: Multi-Channel Social Publisher config & recent packages
  router.get(
    '/api/v1/modules/ai-hub/agent/social-config',
    requireStrictSuperAdmin,
    async (_req, res) => {
      try {
        await ensureAiHubSchema();
        const [config, hubSettings, packages] = await Promise.all([
          getMaskedSocialPublisherConfig(),
          getAiHubSettings(),
          dbQuery<Record<string, unknown>>(
            'SELECT * FROM mod_ai_social_packages ORDER BY created_at DESC LIMIT 12'
          ).catch(() => []),
        ]);
        res.json({
          ok: true,
          allowSocialPublisher: Boolean(hubSettings.jarvisSettings?.allowSocialPublisher),
          config,
          packages,
        });
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: err instanceof Error ? err.message : 'خطا در خواندن تنظیمات انتشار شبکه اجتماعی',
        });
      }
    }
  );

  router.post(
    '/api/v1/modules/ai-hub/agent/social-config',
    requireStrictSuperAdmin,
    async (req, res) => {
      try {
        await ensureAiHubSchema();
        const b = (req.body || {}) as {
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
        };

        // SSRF validation on optional Telegram reverse proxy URL before persisting
        if (typeof b.telegramProxyUrl === 'string' && b.telegramProxyUrl.trim()) {
          try {
            await assertSafePublicUrl(b.telegramProxyUrl.trim());
          } catch (proxyErr) {
            res.status(400).json({
              ok: false,
              error: `آدرس پروکسی تلگرام نامعتبر است: ${
                proxyErr instanceof Error ? proxyErr.message : 'URL نامعتبر'
              }`,
            });
            return;
          }
        }

        const updated = await saveSocialPublisherConfig({
          baleChannelEnabled:
            typeof b.baleChannelEnabled === 'boolean' ? b.baleChannelEnabled : undefined,
          baleChannelId: typeof b.baleChannelId === 'string' ? b.baleChannelId : undefined,
          telegramChannelEnabled:
            typeof b.telegramChannelEnabled === 'boolean' ? b.telegramChannelEnabled : undefined,
          telegramBotToken: typeof b.telegramBotToken === 'string' ? b.telegramBotToken : undefined,
          telegramChannelId:
            typeof b.telegramChannelId === 'string' ? b.telegramChannelId : undefined,
          telegramProxyUrl:
            typeof b.telegramProxyUrl === 'string' ? b.telegramProxyUrl : undefined,
          instagramEnabled:
            typeof b.instagramEnabled === 'boolean' ? b.instagramEnabled : undefined,
          instagramMode:
            b.instagramMode === 'meta_graph_api' || b.instagramMode === 'package_only'
              ? b.instagramMode
              : undefined,
          instagramAccountId:
            typeof b.instagramAccountId === 'string' ? b.instagramAccountId : undefined,
          instagramAccessToken:
            typeof b.instagramAccessToken === 'string' ? b.instagramAccessToken : undefined,
          requireApprovalBeforePublish:
            typeof b.requireApprovalBeforePublish === 'boolean'
              ? b.requireApprovalBeforePublish
              : undefined,
        });

        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: 'بروزرسانی تنظیمات انتشار هوشمند شبکه‌های اجتماعی (بله/تلگرام/اینستاگرام)',
          detail: `بله: ${updated.baleChannelEnabled} · تلگرام: ${updated.telegramChannelEnabled} · اینستاگرام: ${updated.instagramEnabled} (${updated.instagramMode}) · نیاز به تایید: ${updated.requireApprovalBeforePublish}`,
          sqlOrEndpoint: 'POST /api/v1/modules/ai-hub/agent/social-config',
        });

        res.json({ ok: true, config: updated, encryptedWith: 'AES-256-GCM' });
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات انتشار شبکه اجتماعی',
        });
      }
    }
  );

  router.post(
    '/api/v1/modules/ai-hub/agent/social-config/test',
    requireStrictSuperAdmin,
    async (req, res) => {
      try {
        await ensureAiHubSchema();
        const channel = req.body?.channel === 'telegram' ? 'telegram' : 'bale';
        const result = await testSocialChannelConnection(channel);
        res.status(result.ok ? 200 : 400).json(result);
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: err instanceof Error ? err.message : 'خطا در تست کانال شبکه اجتماعی',
        });
      }
    }
  );

  // Phase 14.3.2 — Super Admin ONLY: 1-Click Bale Bot Pairing (/start pair_<code>)
  router.post(
    '/api/v1/modules/ai-hub/agent/bale-pair/start',
    requireStrictSuperAdmin,
    async (req, res) => {
      try {
        const result = await startBalePairingSession(req.authUser?.phone || 'super_admin');
        res.status(result.ok ? 200 : 400).json(result);
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: err instanceof Error ? err.message : 'خطا در شروع اتصال یک‌کلیکی بله',
        });
      }
    }
  );

  router.post(
    '/api/v1/modules/ai-hub/agent/bale-pair/verify',
    requireStrictSuperAdmin,
    async (req, res) => {
      try {
        const code = typeof req.body?.code === 'string' ? req.body.code.trim() : undefined;
        const result = await verifyBalePairingSession(code);
        res.status(result.ok ? 200 : 400).json(result);
      } catch (err) {
        res.status(500).json({
          ok: false,
          paired: false,
          error: err instanceof Error ? err.message : 'خطا در بررسی اتصال یک‌کلیکی بله',
        });
      }
    }
  );

  // Phase 14.3.2 — Super Admin ONLY: Test Daily Morning Briefing to Bale
  router.post(
    '/api/v1/modules/ai-hub/agent/daily-briefing/test',
    requireStrictSuperAdmin,
    async (_req, res) => {
      try {
        const result = await sendDailyMorningBriefing({
          force: true,
          recordAsSentToday: false,
        });
        res.status(result.ok ? 200 : 400).json(result);
      } catch (err) {
        res.status(500).json({
          ok: false,
          sent: false,
          error: err instanceof Error ? err.message : 'خطا در ارسال تست گزارش صبحگاهی',
        });
      }
    }
  );

  // Super Admin ONLY: Voice-to-Text via Slot 4 (voice_audio / GapGPT Whisper STT)
  router.post(
    '/api/v1/modules/ai-hub/agent/transcribe',
    requireStrictSuperAdmin,
    express.raw({
      type: ['audio/*', 'application/octet-stream', 'multipart/form-data'],
      limit: '25mb',
    }),
    async (req, res) => {
      try {
        await ensureAiHubSchema();
        const contentType = String(req.headers['content-type'] || '').toLowerCase();
        let audioBuffer: Buffer | null = null;
        let mimeType = 'audio/webm';
        let filename = 'voice_command.webm';
        let language = 'fa';

        if (contentType.includes('multipart/form-data') && Buffer.isBuffer(req.body)) {
          const parsedForm = await new Response(new Uint8Array(req.body), {
            headers: { 'content-type': String(req.headers['content-type'] || '') },
          }).formData();
          const fileEntry = parsedForm.get('file') || parsedForm.get('audio');
          const langEntry = parsedForm.get('language');
          if (typeof langEntry === 'string' && langEntry.trim()) {
            language = langEntry.trim().slice(0, 12);
          }
          if (fileEntry && typeof fileEntry !== 'string') {
            const arrBuf = await fileEntry.arrayBuffer();
            audioBuffer = Buffer.from(arrBuf);
            mimeType = fileEntry.type || mimeType;
            filename = fileEntry.name || filename;
          }
        } else if (contentType.includes('application/json') && req.body && typeof req.body === 'object') {
          const b = req.body as {
            audioBase64?: string;
            mimeType?: string;
            filename?: string;
            language?: string;
          };
          const rawB64 = String(b.audioBase64 || '').trim();
          if (rawB64) {
            const dataUrlMatch = rawB64.match(/^data:([^;]+);base64,(.+)$/i);
            const pureB64 = dataUrlMatch ? dataUrlMatch[2] : rawB64;
            if (dataUrlMatch?.[1]) mimeType = dataUrlMatch[1];
            audioBuffer = Buffer.from(pureB64, 'base64');
          }
          if (b.mimeType) mimeType = String(b.mimeType);
          if (b.filename) filename = String(b.filename);
          if (b.language) language = String(b.language).trim().slice(0, 12) || 'fa';
        } else if (Buffer.isBuffer(req.body) && req.body.length > 0) {
          audioBuffer = req.body;
          mimeType = contentType.split(';')[0] || 'audio/webm';
        }

        if (!audioBuffer || audioBuffer.length === 0) {
          res.status(400).json({
            ok: false,
            error: 'فایل صوتی ارسال نشده یا خالی است.',
          });
          return;
        }

        const maxBytes = 20 * 1024 * 1024;
        if (audioBuffer.length > maxBytes) {
          res.status(413).json({
            ok: false,
            error: 'حجم فایل صوتی بیش از حد مجاز (۲۰ مگابایت) است.',
          });
          return;
        }

        const result = await transcribeAudioViaVoiceSlot({
          audioBuffer,
          mimeType,
          filename,
          language,
        });

        res.json({
          ok: true,
          ...result,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در تبدیل ویس به متن';
        await writeSystemLog({
          level: 'error',
          category: 'system',
          title: 'خطا در سرویس تبدیل ویس به متن (Slot 4 STT)',
          detail: msg,
          sqlOrEndpoint: 'POST /api/v1/modules/ai-hub/agent/transcribe',
        });
        res.status(400).json({ ok: false, error: msg });
      }
    }
  );

  // Super Admin ONLY: Optional Paid Slot 4 TTS (strictly gated by voiceReplyEnabled && slot4_paid_tts)
  router.post(
    '/api/v1/modules/ai-hub/agent/speak',
    requireStrictSuperAdmin,
    async (req, res) => {
      try {
        await ensureAiHubSchema();
        const settings = await getAiHubSettings();
        const jarvis = settings.jarvisSettings;
        if (!jarvis.voiceReplyEnabled || jarvis.voiceReplyProvider !== 'slot4_paid_tts') {
          res.status(403).json({
            ok: false,
            error:
              'خروجی صوتی پولی اسلات ۴ غیرفعال است. برای جلوگیری از مصرف ناخواسته اعتبار، ابتدا در «تنظیمات دستیار جارویس» خروجی صوتی را روشن کرده و ارائه‌دهنده اسلات ۴ را انتخاب کنید.',
          });
          return;
        }

        const rawText = String(req.body?.text || '').trim();
        const plainText = rawText
          .replace(/```[\s\S]*?```/g, ' ')
          .replace(/[#*_`>[\]()]/g, ' ')
          .replace(/https?:\/\/\S+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 1800);

        if (!plainText) {
          res.status(400).json({ ok: false, error: 'متن قابل پخش برای تبدیل به گفتار ارسال نشده است.' });
          return;
        }

        const requestedModel =
          typeof req.body?.ttsModel === 'string' && req.body.ttsModel.trim()
            ? req.body.ttsModel.trim().slice(0, 80)
            : jarvis.ttsModel || 'gemini-3.8-flash-tts';
        const requestedVoice =
          typeof req.body?.voice === 'string' && req.body.voice.trim()
            ? req.body.voice.trim().slice(0, 40)
            : jarvis.ttsVoice || 'alloy';

        const result = await synthesizeSpeechViaVoiceSlot({
          text: plainText,
          ttsModel: requestedModel,
          voice: requestedVoice,
        });

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-TTS-Model', result.modelUsed);
        res.send(result.audioBuffer);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در تولید صدای پاسخ (Slot 4 TTS)';
        await writeSystemLog({
          level: 'error',
          category: 'system',
          title: 'خطا در سرویس تولید صوت پاسخ (Slot 4 TTS)',
          detail: msg,
          sqlOrEndpoint: 'POST /api/v1/modules/ai-hub/agent/speak',
        }).catch(() => {});
        res.status(400).json({ ok: false, error: msg });
      }
    }
  );

  // Phase 15 (v2.9.2) — Super Admin ONLY: Zero-Token Local Knowledge Base & Self-Learning Cache
  router.get(
    '/api/v1/modules/ai-hub/agent/knowledge-cache',
    requireStrictSuperAdmin,
    async (_req, res) => {
      try {
        await ensureAiHubSchema();
        const [entries, stats, settings] = await Promise.all([
          listKnowledgeCache(),
          getKnowledgeCacheStats(),
          getAiHubSettings(),
        ]);
        res.json({
          ok: true,
          entries,
          stats,
          kbAutoLearnMode: settings.kbAutoLearnMode,
          guestMaxLlmReplies: settings.guestMaxLlmReplies,
        });
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: err instanceof Error ? err.message : 'خطا در دریافت بانک دانش صفرتوکن',
        });
      }
    }
  );

  router.post(
    '/api/v1/modules/ai-hub/agent/knowledge-cache',
    requireStrictSuperAdmin,
    async (req, res) => {
      try {
        await ensureAiHubSchema();
        const b = (req.body || {}) as {
          id?: string;
          questionPattern?: string;
          normalizedKeywords?: string;
          answerText?: string;
          category?: KnowledgeCacheCategory;
          status?: KnowledgeCacheStatus;
        };
        const entry = await upsertKnowledgeCacheEntry({
          id: b.id,
          questionPattern: String(b.questionPattern || ''),
          normalizedKeywords: b.normalizedKeywords,
          answerText: String(b.answerText || ''),
          category: b.category,
          status: b.status,
          source: 'admin',
        });
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `ثبت/ویرایش ورودی بانک دانش صفرتوکن (${entry.id})`,
          detail: `${entry.question_pattern.slice(0, 80)} · وضعیت: ${entry.status}`,
          sqlOrEndpoint: 'POST /api/v1/modules/ai-hub/agent/knowledge-cache',
        });
        res.json({ ok: true, entry });
      } catch (err) {
        res.status(400).json({
          ok: false,
          error: err instanceof Error ? err.message : 'خطا در ذخیره ورودی بانک دانش',
        });
      }
    }
  );

  router.post(
    '/api/v1/modules/ai-hub/agent/knowledge-cache/:id/status',
    requireStrictSuperAdmin,
    async (req, res) => {
      try {
        await ensureAiHubSchema();
        const id = String(req.params.id || '').trim();
        const rawStatus = String(req.body?.status || '').trim();
        const validStatuses: KnowledgeCacheStatus[] = ['active', 'pending_review', 'disabled'];
        if (!id || !validStatuses.includes(rawStatus as KnowledgeCacheStatus)) {
          res.status(400).json({ ok: false, error: 'شناسه یا وضعیت انتخاب‌شده نامعتبر است.' });
          return;
        }
        await updateKnowledgeCacheStatus(id, rawStatus as KnowledgeCacheStatus);
        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `تغییر وضعیت بانک دانش صفرتوکن (${id}) → ${rawStatus}`,
          detail: `توسط ${req.authUser?.phone || 'super_admin'}`,
          sqlOrEndpoint: `POST /api/v1/modules/ai-hub/agent/knowledge-cache/${id}/status`,
        });
        res.json({ ok: true, id, status: rawStatus });
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: err instanceof Error ? err.message : 'خطا در تغییر وضعیت ورودی بانک دانش',
        });
      }
    }
  );

  router.delete(
    '/api/v1/modules/ai-hub/agent/knowledge-cache/:id',
    requireStrictSuperAdmin,
    async (req, res) => {
      try {
        await ensureAiHubSchema();
        const id = String(req.params.id || '').trim();
        if (!id) {
          res.status(400).json({ ok: false, error: 'شناسه ورودی الزامی است.' });
          return;
        }
        await deleteKnowledgeCacheEntry(id);
        await writeSystemLog({
          level: 'warning',
          category: 'system',
          title: `حذف ورودی از بانک دانش صفرتوکن (${id})`,
          detail: `توسط ${req.authUser?.phone || 'super_admin'}`,
          sqlOrEndpoint: `DELETE /api/v1/modules/ai-hub/agent/knowledge-cache/${id}`,
        });
        res.json({ ok: true, id });
      } catch (err) {
        res.status(500).json({
          ok: false,
          error: err instanceof Error ? err.message : 'خطا در حذف ورودی بانک دانش',
        });
      }
    }
  );
}
