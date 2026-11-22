import express from 'express';
import {
  attachOptionalAuth,
  requireAuth,
  requirePermission,
  type AuthenticatedRequest,
} from '../../src/server/core/permissionsEngine.js';
import {
  dbExec,
  dbQuery,
  findUserByPhone,
  formatPersianDateTime,
  getSetting,
  setSetting,
  writeSystemLog,
} from '../../src/server/database/index.js';
import {
  handleLiveChatAgentAutomation,
  isGenericDisplayName,
} from '../mod_ai_hub_agent/agentToolsEngine.js';
import { migrateGuestMemoriesToUser } from '../mod_ai_hub_agent/aiHubSchema.js';

export function createModLiveChatRouter(): express.Router {
  const router = express.Router();

  const ensurePriorityColumn = async () => {
    try {
      await dbExec(
        `ALTER TABLE mod_live_chat_sessions ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'`
      );
    } catch {
      // column already exists
    }
  };

  const ensureUiActionColumn = async () => {
    try {
      await dbExec(
        `ALTER TABLE mod_live_chat_messages ADD COLUMN ui_action TEXT NOT NULL DEFAULT ''`
      );
    } catch {
      // column already exists
    }
  };

  // Public + Admin: Get operator online status & list sessions (or specific visitor session)
  router.get('/api/v1/modules/live-chat/status', async (req, res) => {
    try {
      await ensurePriorityColumn();
      await ensureUiActionColumn();
      const cfg = await getSetting<{ online: boolean; operatorTitle: string; welcomeText: string }>(
        'mod_live_chat_operator_cfg',
        {
          online: true,
          operatorTitle: 'پشتیبانی آنلاین اسکیل ۹۸ (پاسخ‌گویی زیر ۶۰ ثانیه)',
          welcomeText: 'سلام! چطور می‌توانیم در انتخاب اسکیل یا صدور فاکتور رسمی کمکتان کنیم؟',
        }
      );
      const sessionId = String(req.query.sessionId || '').trim();
      let messages: Record<string, unknown>[] = [];
      let sessionPriority = 'normal';
      if (sessionId) {
        messages = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_live_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
          [sessionId]
        );
        const sessRows = await dbQuery<{ priority?: string }>(
          'SELECT priority FROM mod_live_chat_sessions WHERE id = $1 LIMIT 1',
          [sessionId]
        );
        sessionPriority = String(sessRows[0]?.priority || 'normal');
      }
      res.json({ ok: true, operatorConfig: cfg, messages, sessionPriority });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در وضعیت چت آنلاین' });
    }
  });

  // Global Admin Chat Alarm: Lightweight unread & urgent counter for Admin Header polling
  router.get(
    '/api/v1/modules/live-chat/admin/unread-summary',
    requireAuth,
    requirePermission('admin_panel'),
    async (_req: AuthenticatedRequest, res) => {
      try {
        await ensurePriorityColumn();
        const rows = await dbQuery<{
          id: string;
          visitor_name: string;
          priority: string;
          unread_admin_count: number;
          last_message_preview: string;
        }>(
          'SELECT id, visitor_name, priority, unread_admin_count, last_message_preview FROM mod_live_chat_sessions WHERE unread_admin_count > 0 ORDER BY updated_at DESC LIMIT 50'
        );
        const totalUnread = rows.reduce((acc, r) => acc + Number(r.unread_admin_count || 0), 0);
        const urgentUnread = rows
          .filter((r) => String(r.priority) === 'urgent')
          .reduce((acc, r) => acc + Number(r.unread_admin_count || 0), 0);
        const latest = rows[0];
        res.json({
          ok: true,
          totalUnread,
          urgentUnread,
          latestUnreadSessionId: latest?.id || '',
          latestVisitorName: latest?.visitor_name || '',
          latestPreview: latest?.last_message_preview || '',
        });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Unread summary error' });
      }
    }
  );

  // Logged-In User: Link guest live-chat thread to authenticated account, migrate guest memory,
  // unlock Urgent priority, and trigger AI Agent continuation to submit any confirmed pending request
  router.post(
    '/api/v1/modules/live-chat/link-session',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensurePriorityColumn();
        await ensureUiActionColumn();
        const session = req.authSession!;
        const sessionId = String(req.body?.sessionId || '').trim();
        const upgradeToUrgent = Boolean(req.body?.upgradeToUrgent);
        const autoContinueRequest = req.body?.autoContinueRequest !== false;
        if (!sessionId) {
          res.status(400).json({ error: 'شناسه نشست چت الزامی است.' });
          return;
        }
        const userRow = await findUserByPhone(session.phone);
        const displayName = userRow?.full_name || session.user_display || `کاربر ${session.phone.slice(-4)}`;
        const nowIso = new Date().toISOString();
        const nowFa = formatPersianDateTime();

        const priorMessages = await dbQuery<{ sender_role: string; message_text: string }>(
          'SELECT sender_role, message_text FROM mod_live_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
          [sessionId]
        );

        const existing = await dbQuery<{ id: string }>(
          'SELECT id FROM mod_live_chat_sessions WHERE id = $1 LIMIT 1',
          [sessionId]
        );
        if (existing.length === 0) {
          await dbExec(
            `INSERT INTO mod_live_chat_sessions (id, visitor_name, visitor_phone, subject, department, status, priority, unread_admin_count, last_message_preview, created_at_fa, updated_at)
             VALUES ($1,$2,$3,'گفتگوی آنلاین عضو تاییدشده','فروش و پشتیبانی فنی','open',$4,1,'ورود درون‌خطی کاربر با اولویت فوری',$5,$6)`,
            [sessionId, displayName, session.phone, upgradeToUrgent ? 'urgent' : 'normal', nowFa, nowIso]
          );
        } else {
          await dbExec(
            `UPDATE mod_live_chat_sessions
             SET visitor_name = $1, visitor_phone = $2, priority = $3, updated_at = $4
             WHERE id = $5`,
            [displayName, session.phone, upgradeToUrgent ? 'urgent' : 'normal', nowIso, sessionId]
          );
        }

        // Migrate any guest-scoped memory (such as pending_request_draft) to the verified user account
        const migratedCount = await migrateGuestMemoriesToUser({
          visitorSessionId: sessionId,
          userId: session.phone,
        }).catch(() => 0);

        // Clear any pending OPEN_INLINE_OTP flags on older messages now that user is logged in
        await dbExec(
          `UPDATE mod_live_chat_messages SET ui_action = '' WHERE session_id = $1 AND ui_action = 'OPEN_INLINE_OTP'`,
          [sessionId]
        ).catch(() => {});

        let continuationReply = '';
        let continuationTool: string | undefined;

        if (autoContinueRequest && (migratedCount > 0 || priorMessages.length > 0)) {
          const continuation = await handleLiveChatAgentAutomation({
            sessionId,
            messageText:
              'کاربر با موفقیت وارد حساب کاربری شد و شماره موبایل خود را تایید کرد. لطفاً گفتگو را ادامه بده و اگر درخواست تاییدشده یا پیش‌نویسی دارد همین الان ثبت کن.',
            authenticatedPhone: session.phone,
            existingMessages: priorMessages,
            isPostLoginContinuation: true,
          }).catch(() => ({} as { agentReply?: string; toolExecuted?: string }));
          if (continuation.agentReply) {
            continuationReply = continuation.agentReply;
            continuationTool = continuation.toolExecuted;
          }
        }

        const replyMessage =
          continuationReply ||
          (isGenericDisplayName(displayName)
            ? 'ورود شما با موفقیت انجام شد و ترد گفتگوی شما با «اولویت فوری» به حساب کاربری‌تان متصل گردید. برای تکمیل پروفایل و خطاب بهتر، لطفاً نام خود را بفرمایید؟'
            : `خوش آمدید ${displayName} عزیز! حساب کاربری شما به این گفتگو متصل شد و درخواست شما با «اولویت فوری» در صف پاسخ‌گویی قرار گرفت.`);

        await dbExec(
          `INSERT INTO mod_live_chat_messages (id, session_id, sender_role, sender_name, message_text, attachment_url, attachment_name, ui_action, created_at_fa, created_at)
           VALUES ($1,$2,'operator','دستیار هوشمند پشتیبانی',$3,'','','',$4,$5)`,
          [`msg_link_${Date.now()}`, sessionId, replyMessage, nowFa, nowIso]
        );

        const messages = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_live_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
          [sessionId]
        );
        res.json({
          ok: true,
          sessionId,
          priority: upgradeToUrgent ? 'urgent' : 'normal',
          displayName,
          migratedMemories: migratedCount,
          continuedByAgent: Boolean(continuationReply),
          toolExecuted: continuationTool,
          messages,
        });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در اتصال گفتگو به حساب کاربری' });
      }
    }
  );

  // Public + Authenticated Customer: Start or send message (+ strict Urgent priority check + Multi-Step AI Agent hook)
  router.post(
    '/api/v1/modules/live-chat/visitor-message',
    attachOptionalAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensurePriorityColumn();
        await ensureUiActionColumn();
        const b = req.body || {};
        const nowIso = new Date().toISOString();
        const nowFa = formatPersianDateTime();
        const sessionId = String(b.sessionId || `chat_sess_${Date.now()}`).trim();
        const authPhone = req.authSession?.phone || '';
        const authUserRow = authPhone ? await findUserByPhone(authPhone) : null;
        const visitorName = String(
          authUserRow?.full_name || b.visitorName || 'بازدیدکننده سایت'
        ).trim();
        const visitorPhone = String(authPhone || b.visitorPhone || '').trim();
        const messageText = String(b.messageText || '').trim();
        const attachmentUrl = String(b.attachmentUrl || '').trim();
        const attachmentName = String(b.attachmentName || '').trim();

        // Zero-Trust: ONLY logged-in users may set or receive 'urgent' priority!
        const requestedUrgent = b.requestUrgent === true || b.priority === 'urgent';
        const effectivePriority = authPhone && requestedUrgent ? 'urgent' : 'normal';

        if (!messageText && !attachmentUrl) {
          res.status(400).json({ error: 'متن پیام یا فایل پیوست الزامی است.' });
          return;
        }

        const priorMessages = await dbQuery<{ sender_role: string; message_text: string }>(
          'SELECT sender_role, message_text FROM mod_live_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
          [sessionId]
        );

        const existing = await dbQuery<{ id: string; priority?: string }>(
          'SELECT id, priority FROM mod_live_chat_sessions WHERE id = $1',
          [sessionId]
        );
        if (existing.length === 0) {
          await dbExec(
            `INSERT INTO mod_live_chat_sessions (id, visitor_name, visitor_phone, subject, department, status, priority, unread_admin_count, last_message_preview, created_at_fa, updated_at)
             VALUES ($1,$2,$3,$4,$5,'open',$6,1,$7,$8,$9)`,
            [
              sessionId,
              visitorName,
              visitorPhone,
              String(b.subject || 'گفتگوی آنلاین ویترین'),
              String(b.department || 'فروش و پشتیبانی فنی'),
              effectivePriority,
              messageText || `فایل پیوست: ${attachmentName}`,
              nowFa,
              nowIso,
            ]
          );
        } else {
          const nextPriority =
            authPhone && (requestedUrgent || existing[0].priority === 'urgent')
              ? 'urgent'
              : authPhone
              ? existing[0].priority || 'normal'
              : 'normal';
          await dbExec(
            `UPDATE mod_live_chat_sessions
             SET visitor_name = $1, visitor_phone = COALESCE(NULLIF($2,''), visitor_phone),
                 priority = $3,
                 unread_admin_count = unread_admin_count + 1,
                 last_message_preview = $4, status = 'open', updated_at = $5
             WHERE id = $6`,
            [
              visitorName,
              visitorPhone,
              nextPriority,
              messageText || `فایل پیوست: ${attachmentName}`,
              nowIso,
              sessionId,
            ]
          );
        }

        const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await dbExec(
          `INSERT INTO mod_live_chat_messages (id, session_id, sender_role, sender_name, message_text, attachment_url, attachment_name, ui_action, created_at_fa, created_at)
           VALUES ($1,$2,'visitor',$3,$4,$5,$6,'',$7,$8)`,
          [msgId, sessionId, visitorName, messageText, attachmentUrl, attachmentName, nowFa, nowIso]
        );

        // AI Agent Automation Hook (Multi-step tools + inline OTP trigger + profile completion)
        const automation = await handleLiveChatAgentAutomation({
          sessionId,
          messageText,
          authenticatedPhone: authPhone || undefined,
          existingMessages: priorMessages,
        });

        if (automation.agentReply) {
          const botNowIso = new Date(Date.now() + 20).toISOString();
          await dbExec(
            `INSERT INTO mod_live_chat_messages (id, session_id, sender_role, sender_name, message_text, attachment_url, attachment_name, ui_action, created_at_fa, created_at)
             VALUES ($1,$2,'operator','دستیار هوشمند پشتیبانی',$3,'','',$4,$5,$6)`,
            [
              `msg_ai_${Date.now()}`,
              sessionId,
              automation.agentReply,
              automation.uiAction || '',
              formatPersianDateTime(),
              botNowIso,
            ]
          );
        }

        const messages = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_live_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
          [sessionId]
        );
        res.json({
          ok: true,
          sessionId,
          priority: effectivePriority,
          isAuthenticated: Boolean(authPhone),
          updatedDisplayName: automation.updatedDisplayName,
          toolExecuted: automation.toolExecuted,
          executedTools: automation.executedTools || [],
          uiAction: automation.uiAction || null,
          uiActionPayload: automation.uiActionPayload || null,
          messages,
        });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ارسال پیام چت' });
      }
    }
  );

  // Admin Inbox: List all chat sessions sorted by priority (urgent -> high -> normal -> low) + unread + recency
  router.get(
    '/api/v1/modules/live-chat/admin/inbox',
    requireAuth,
    requirePermission('canManageOrders'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensurePriorityColumn();
        const rawSessions = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_live_chat_sessions ORDER BY updated_at DESC LIMIT 150'
        );
        const priorityWeight: Record<string, number> = {
          urgent: 4,
          high: 3,
          normal: 2,
          low: 1,
        };
        const sessions: Record<string, unknown>[] = rawSessions
          .map(
            (s): Record<string, unknown> => ({
              ...s,
              priority: String(s.priority || 'normal'),
            })
          )
          .sort((a, b) => {
            const pDiff =
              (priorityWeight[String(b.priority)] || 2) -
              (priorityWeight[String(a.priority)] || 2);
            if (pDiff !== 0) return pDiff;
            const uDiff = Number(b.unread_admin_count || 0) - Number(a.unread_admin_count || 0);
            if (uDiff !== 0) return uDiff;
            return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
          });

        const requestedSid = String(req.query.sessionId || '').trim();
        const activeSessionId = requestedSid || String(sessions[0]?.id || '');
        let messages: Record<string, unknown>[] = [];
        if (activeSessionId) {
          messages = await dbQuery<Record<string, unknown>>(
            'SELECT * FROM mod_live_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
            [activeSessionId]
          );
          if (requestedSid) {
            await dbExec(
              'UPDATE mod_live_chat_sessions SET unread_admin_count = 0 WHERE id = $1',
              [activeSessionId]
            );
          }
        }
        const cfg = await getSetting<{ online: boolean; operatorTitle: string; welcomeText: string }>(
          'mod_live_chat_operator_cfg',
          {
            online: true,
            operatorTitle: 'پشتیبانی آنلاین اسکیل ۹۸ (پاسخ‌گویی زیر ۶۰ ثانیه)',
            welcomeText: 'سلام! چطور می‌توانیم در انتخاب اسکیل یا صدور فاکتور رسمی کمکتان کنیم؟',
          }
        );
        res.json({ ok: true, sessions, activeSessionId, messages, operatorConfig: cfg });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در دریافت صندوق پیام' });
      }
    }
  );

  // Admin Priority & Status Update for a Chat Thread
  router.post(
    '/api/v1/modules/live-chat/admin/priority',
    requireAuth,
    requirePermission('canManageOrders'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensurePriorityColumn();
        const b = req.body || {};
        const sessionId = String(b.sessionId || '').trim();
        const priority = ['urgent', 'high', 'normal', 'low'].includes(String(b.priority))
          ? String(b.priority)
          : 'normal';
        const status = ['open', 'resolved', 'pending'].includes(String(b.status))
          ? String(b.status)
          : undefined;
        if (!sessionId) {
          res.status(400).json({ error: 'شناسه گفتگو الزامی است.' });
          return;
        }
        if (status) {
          await dbExec(
            'UPDATE mod_live_chat_sessions SET priority = $1, status = $2 WHERE id = $3',
            [priority, status, sessionId]
          );
        } else {
          await dbExec(
            'UPDATE mod_live_chat_sessions SET priority = $1 WHERE id = $2',
            [priority, sessionId]
          );
        }
        res.json({ ok: true, sessionId, priority, status });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در بروزرسانی اولویت' });
      }
    }
  );

  // Admin Operator Reply + Operator Online Status Toggle
  router.post(
    '/api/v1/modules/live-chat/admin/reply',
    requireAuth,
    requirePermission('canManageOrders'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const b = req.body || {};
        const nowIso = new Date().toISOString();
        const nowFa = formatPersianDateTime();

        if (typeof b.toggleOnline === 'boolean') {
          const nextCfg = {
            online: Boolean(b.toggleOnline),
            operatorTitle: String(b.operatorTitle || 'پشتیبانی آنلاین اسکیل ۹۸'),
            welcomeText: String(b.welcomeText || 'سلام! در خدمت شما هستیم.'),
          };
          await setSetting('mod_live_chat_operator_cfg', nextCfg);
          res.json({ ok: true, operatorConfig: nextCfg });
          return;
        }

        const sessionId = String(b.sessionId || '').trim();
        const messageText = String(b.messageText || '').trim();
        const attachmentUrl = String(b.attachmentUrl || '').trim();
        const attachmentName = String(b.attachmentName || '').trim();
        if (!sessionId || (!messageText && !attachmentUrl)) {
          res.status(400).json({ error: 'شناسه گفتگو و متن پاسخ اپراتور الزامی است.' });
          return;
        }

        const msgId = `msg_op_${Date.now()}`;
        await dbExec(
          `INSERT INTO mod_live_chat_messages (id, session_id, sender_role, sender_name, message_text, attachment_url, attachment_name, created_at_fa, created_at)
           VALUES ($1,$2,'operator',$3,$4,$5,$6,$7,$8)`,
          [msgId, sessionId, 'اپراتور پشتیبانی اسکیل ۹۸', messageText, attachmentUrl, attachmentName, nowFa, nowIso]
        );
        await dbExec(
          `UPDATE mod_live_chat_sessions SET unread_admin_count = 0, last_message_preview = $1, updated_at = $2 WHERE id = $3`,
          [`پاسخ اپراتور: ${messageText}`, nowIso, sessionId]
        );

        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `پاسخ اپراتور گفتگوی آنلاین (${sessionId})`,
          detail: messageText.slice(0, 120),
          sqlOrEndpoint: 'POST /api/v1/modules/live-chat/admin/reply',
        });

        const messages = await dbQuery<Record<string, unknown>>(
          'SELECT * FROM mod_live_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
          [sessionId]
        );
        res.json({ ok: true, messages });
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'خطا در ثبت پاسخ اپراتور' });
      }
    }
  );

  // Admin: Create New Support Ticket / Outbound Message Thread
  router.post(
    '/api/v1/modules/live-chat/admin/create-thread',
    requireAuth,
    requirePermission('canManageOrders'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await ensurePriorityColumn();
        const b = req.body || {};
        const visitorName = String(b.visitorName || '').trim();
        const visitorPhone = String(b.visitorPhone || '').trim();
        const subject = String(b.subject || 'پیام جدید پشتیبانی').trim();
        const department = String(b.department || 'پشتیبانی فنی و فروش').trim();
        const priority = ['urgent', 'high', 'normal', 'low'].includes(String(b.priority))
          ? String(b.priority)
          : 'normal';
        const messageText = String(b.messageText || '').trim();

        if (!visitorName || !messageText) {
          res.status(400).json({ error: 'نام گیرنده و متن پیام یا تیکت الزامی است.' });
          return;
        }

        const nowIso = new Date().toISOString();
        const nowFa = formatPersianDateTime();
        const sessionId = `ticket_${Date.now()}`;
        const msgId = `msg_adm_${Date.now()}`;

        await dbExec(
          `INSERT INTO mod_live_chat_sessions
           (id, visitor_name, visitor_phone, subject, department, status, priority, unread_admin_count, last_message_preview, created_at_fa, updated_at)
           VALUES ($1,$2,$3,$4,$5,'open',$6,0,$7,$8,$9)`,
          [
            sessionId,
            visitorName,
            visitorPhone,
            subject,
            department,
            priority,
            messageText.slice(0, 140),
            nowFa,
            nowIso,
          ]
        );

        await dbExec(
          `INSERT INTO mod_live_chat_messages
           (id, session_id, sender_role, sender_name, message_text, attachment_url, attachment_name, created_at_fa, created_at)
           VALUES ($1,$2,'operator',$3,$4,'','',$5,$6)`,
          [msgId, sessionId, 'اپراتور پشتیبانی اسکیل ۹۸', messageText, nowFa, nowIso]
        );

        await writeSystemLog({
          level: 'success',
          category: 'system',
          title: `ایجاد پیام / تیکت جدید توسط مدیر (${subject})`,
          detail: `گیرنده: ${visitorName} (${visitorPhone || '-'}) · اولویت: ${priority}`,
          sqlOrEndpoint: 'POST /api/v1/modules/live-chat/admin/create-thread',
        });

        res.json({ ok: true, sessionId });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در ایجاد پیام / تیکت جدید',
        });
      }
    }
  );

  // Admin: Delete a Chat / Ticket Thread
  router.delete(
    '/api/v1/modules/live-chat/admin/session/:id',
    requireAuth,
    requirePermission('canManageOrders'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const sessionId = String(req.params.id);
        await dbExec('DELETE FROM mod_live_chat_messages WHERE session_id = $1', [sessionId]);
        await dbExec('DELETE FROM mod_live_chat_sessions WHERE id = $1', [sessionId]);
        res.json({ ok: true, deletedSessionId: sessionId });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'خطا در حذف گفتگو',
        });
      }
    }
  );

  return router;
}
