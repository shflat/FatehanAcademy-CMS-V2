import express from 'express';
import { dbExec, dbQuery, formatPersianDateTime } from '../../src/server/database/connection.js';
import { writeSystemLog } from '../../src/server/database/settingsLogsRepo.js';
import {
  ensureAiHubSchema,
  getAiHubSettings,
  requireStrictSuperAdmin,
  saveAiHubSettings,
} from './aiHubSchema.js';
import { generateTextViaSlot } from './aiProviderGateway.js';
import {
  dispatchAgentBotBridgeAlert,
  queueAgentApproval,
} from './agentToolsEngine.js';

/**
 * STRICT SUPER ADMIN ONLY sub-router (HTTP 403 for Regular Site Admins).
 * Handles 24/7 Autonomous Agent overview, mode, Voice Command Center, SKILL.md,
 * scheduled tasks, 1-click approvals, and Bot Bridge testing.
 */
export function registerSuperAdminAgentRoutes(router: express.Router): void {
  router.get('/api/v1/modules/ai-hub/agent/overview', requireStrictSuperAdmin, async (_req, res) => {
    try {
      await ensureAiHubSchema();
      const [settings, skills, tasks, approvals, conversations] = await Promise.all([
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
      ]);
      res.json({
        ok: true,
        settings,
        skills,
        tasks,
        approvals,
        conversations: conversations.reverse(),
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Agent overview error' });
    }
  });

  router.post('/api/v1/modules/ai-hub/agent/mode', requireStrictSuperAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const b = req.body || {};
      const updated = await saveAiHubSettings({
        agentMode: b.agentMode === 'autonomous_24_7' ? 'autonomous_24_7' : 'light',
        liveChatAutoReply: typeof b.liveChatAutoReply === 'boolean' ? b.liveChatAutoReply : undefined,
        autoProfileCompletion:
          typeof b.autoProfileCompletion === 'boolean' ? b.autoProfileCompletion : undefined,
        botBridgeEnabled: typeof b.botBridgeEnabled === 'boolean' ? b.botBridgeEnabled : undefined,
      });
      await writeSystemLog({
        level: 'success',
        category: 'system',
        title: `تغییر حالت ایجنت هوشمند به ${updated.agentMode}`,
        detail: `چت خودکار: ${updated.liveChatAutoReply} · پل ربات: ${updated.botBridgeEnabled}`,
        sqlOrEndpoint: 'POST /api/v1/modules/ai-hub/agent/mode',
      });
      res.json({ ok: true, settings: updated });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Mode update error' });
    }
  });

  router.post('/api/v1/modules/ai-hub/agent/command', requireStrictSuperAdmin, async (req, res) => {
    try {
      await ensureAiHubSchema();
      const commandText = String(req.body?.command || '').trim();
      const channel = String(req.body?.channel || 'command_center').trim();
      if (!commandText) {
        res.status(400).json({ ok: false, error: 'متن دستور یا فرمان صوتی الزامی است.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const nowFa = formatPersianDateTime();
      const senderPhone = req.authUser?.phone || 'super_admin';

      await dbExec(
        `INSERT INTO mod_ai_agent_conversations
         (id, channel, sender_phone, role, message_text, tool_calls_json, created_at_fa, created_at)
         VALUES ($1, $2, $3, 'user', $4, '[]', $5, $6)`,
        [`cmd_u_${Date.now()}`, channel, senderPhone, commandText, nowFa, nowIso]
      );

      const skills = await dbQuery<{ title_fa: string; skill_markdown: string }>(
        'SELECT title_fa, skill_markdown FROM mod_ai_agent_skills WHERE enabled = 1 LIMIT 8'
      );
      const [prodStats, chatStats] = await Promise.all([
        dbQuery<{ cnt: number | string }>('SELECT COUNT(*) AS cnt FROM products'),
        dbQuery<{ cnt: number | string }>(
          'SELECT COUNT(*) AS cnt FROM mod_live_chat_sessions WHERE unread_admin_count > 0'
        ),
      ]);

      const skillContext = skills.map((s) => `[${s.title_fa}]\n${s.skill_markdown}`).join('\n\n');
      let replyText = '';
      const executedTools: { tool: string; summary: string }[] = [];

      if (/صف تایید|پیشنهاد|پیش‌نویس|سئو/i.test(commandText)) {
        const apprId = await queueAgentApproval({
          titleFa: `پیشنهاد اجرایی ایجنت: ${commandText.slice(0, 48)}`,
          actionType: 'agent_proposal',
          summaryFa: `ایجنت بر اساس فرمان «${commandText}» یک اقدام پیشنهادی آماده تایید ۱-کلیکی ایجاد کرد.`,
          payload: { command: commandText, channel },
        });
        executedTools.push({ tool: 'queue_approval_item', summary: `ثبت در صف تایید (${apprId})` });
      }

      try {
        const aiRes = await generateTextViaSlot({
          slot: 'agent_core',
          systemPrompt: `شما ایجنت خودکار ۲۴/۷ مدیریت سایت هستید. آمار زنده: ${prodStats[0]?.cnt || 0} محصول، ${chatStats[0]?.cnt || 0} پیام خوانده‌نشده چت.\nحافظه مهارت‌ها (SKILL.md):\n${skillContext}\nپاسخ را دقیق، عملیاتی و فارسی ارائه دهید.`,
          userPrompt: commandText,
        });
        replyText = aiRes.text;
      } catch {
        replyText = `فرمان شما دریافت شد (محصولات فعال: ${prodStats[0]?.cnt || 0} · پیام‌های خوانده‌نشده چت: ${chatStats[0]?.cnt || 0}). ${
          executedTools.length > 0
            ? 'اقدام پیشنهادی با موفقیت در «صف تایید ۱-کلیکی» ثبت شد.'
            : 'برای پاسخ تحلیلی کامل مدل، کلید API اسلات agent_core را در تب موتورها ذخیره کنید.'
        }`;
      }

      const replyId = `cmd_a_${Date.now()}`;
      await dbExec(
        `INSERT INTO mod_ai_agent_conversations
         (id, channel, sender_phone, role, message_text, tool_calls_json, created_at_fa, created_at)
         VALUES ($1, $2, 'agent_core', 'assistant', $3, $4, $5, $6)`,
        [replyId, channel, replyText, JSON.stringify(executedTools), formatPersianDateTime(), new Date().toISOString()]
      );

      res.json({ ok: true, replyId, replyText, executedTools });
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
        const decision = req.body?.decision === 'approved' ? 'approved' : 'rejected';
        await dbExec(
          'UPDATE mod_ai_approval_queue SET status = $1, reviewed_by = $2 WHERE id = $3',
          [decision, req.authUser?.phone || 'super_admin', String(req.params.id)]
        );
        res.json({ ok: true, decision });
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
}
