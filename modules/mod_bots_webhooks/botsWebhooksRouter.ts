import crypto from 'crypto';
import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';
import {
  decryptSecret,
  encryptSecret,
  isMaskedPlaceholder,
  maskSecret,
} from '../../src/server/core/secretVault.js';
import { logDeliveryEvent } from '../mod_delivery_logs/deliveryLogsRouter.js';

let botsSchemaReady = false;

async function ensureBotsWebhooksSchema() {
  if (botsSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_bot_channels (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      title_fa TEXT NOT NULL,
      bot_token_enc TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      events_json TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_outbound_webhooks (
      id TEXT PRIMARY KEY,
      title_fa TEXT NOT NULL,
      target_url TEXT NOT NULL,
      secret_enc TEXT NOT NULL,
      events_json TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL
    )
  `);
  botsSchemaReady = true;
}

export function createBotsWebhooksRouter() {
  const router = express.Router();

  router.get('/api/v1/modules/bots-webhooks/overview', requireAdmin, async (_req, res) => {
    try {
      await ensureBotsWebhooksSchema();
      const rawBots = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_bot_channels ORDER BY updated_at DESC'
      );
      const rawHooks = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_outbound_webhooks ORDER BY updated_at DESC'
      );

      // Strictly mask encrypted tokens/secrets before returning to client
      const bots = rawBots.map((b) => ({
        id: b.id,
        platform: b.platform,
        titleFa: b.title_fa,
        botTokenMasked: maskSecret(String(b.bot_token_enc || '')),
        chatId: b.chat_id,
        events: JSON.parse(String(b.events_json || '[]')),
        enabled: Boolean(b.enabled),
      }));

      const webhooks = rawHooks.map((w) => ({
        id: w.id,
        titleFa: w.title_fa,
        targetUrl: w.target_url,
        secretMasked: maskSecret(String(w.secret_enc || '')),
        events: JSON.parse(String(w.events_json || '[]')),
        enabled: Boolean(w.enabled),
      }));

      res.json({ ok: true, bots, webhooks });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Overview error' });
    }
  });

  router.post('/api/v1/modules/bots-webhooks/bot', requireAdmin, async (req, res) => {
    try {
      await ensureBotsWebhooksSchema();
      const { id, platform, titleFa, botToken, chatId, events, enabled } = (req.body || {}) as {
        id?: string;
        platform?: 'bale' | 'eitaa' | 'telegram';
        titleFa?: string;
        botToken?: string;
        chatId?: string;
        events?: string[];
        enabled?: boolean;
      };
      if (!titleFa?.trim() || !chatId?.trim()) {
        res.status(400).json({ ok: false, error: 'عنوان کانال و شناسه چت (Chat ID) الزامی است.' });
        return;
      }

      const itemId = id?.trim() || `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      let encryptedToken = '';
      if (botToken && !isMaskedPlaceholder(botToken)) {
        encryptedToken = encryptSecret(botToken);
      } else if (id) {
        const existing = await dbQuery<{ bot_token_enc: string }>(
          'SELECT bot_token_enc FROM mod_bot_channels WHERE id = $1 LIMIT 1',
          [id]
        );
        encryptedToken = existing[0]?.bot_token_enc || '';
      }
      if (!encryptedToken) {
        res.status(400).json({ ok: false, error: 'توکن ربات الزامی است.' });
        return;
      }

      await dbExec(
        `INSERT INTO mod_bot_channels (id, platform, title_fa, bot_token_enc, chat_id, events_json, enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT(id) DO UPDATE SET
           platform = excluded.platform,
           title_fa = excluded.title_fa,
           bot_token_enc = excluded.bot_token_enc,
           chat_id = excluded.chat_id,
           events_json = excluded.events_json,
           enabled = excluded.enabled,
           updated_at = excluded.updated_at`,
        [
          itemId,
          platform === 'eitaa' || platform === 'telegram' ? platform : 'bale',
          titleFa.trim(),
          encryptedToken,
          chatId.trim(),
          JSON.stringify(Array.isArray(events) && events.length ? events : ['order_paid']),
          enabled === false ? 0 : 1,
          new Date().toISOString(),
        ]
      );
      res.json({ ok: true, id: itemId, botTokenMasked: maskSecret(encryptedToken) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Save bot error' });
    }
  });

  router.post('/api/v1/modules/bots-webhooks/bot/:id/test', requireAdmin, async (req, res) => {
    try {
      await ensureBotsWebhooksSchema();
      const rows = await dbQuery<{
        platform: string;
        title_fa: string;
        bot_token_enc: string;
        chat_id: string;
      }>('SELECT platform, title_fa, bot_token_enc, chat_id FROM mod_bot_channels WHERE id = $1 LIMIT 1', [
        req.params.id,
      ]);
      const bot = rows[0];
      if (!bot) {
        res.status(404).json({ ok: false, error: 'کانال ربات یافت نشد.' });
        return;
      }
      const token = decryptSecret(bot.bot_token_enc);
      const testText = `پیام آزمایشی از سامانه مدیریت محتوا (${bot.title_fa})`;
      let endpoint = '';
      if (bot.platform === 'bale') {
        endpoint = `https://tapi.bale.ai/bot${encodeURIComponent(token)}/sendMessage`;
      } else if (bot.platform === 'telegram') {
        endpoint = `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`;
      } else {
        endpoint = `https://eitaayar.ir/api/${encodeURIComponent(token)}/sendMessage`;
      }

      let okSent = false;
      let httpStatus = 0;
      let errMsg: string | undefined;
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: bot.chat_id, text: testText }),
        });
        httpStatus = resp.status;
        okSent = resp.ok;
        if (!resp.ok) errMsg = `HTTP ${resp.status}`;
      } catch (err) {
        errMsg = err instanceof Error ? err.message : 'خطای ارتباط شبکه';
      }

      await logDeliveryEvent({
        channel: 'bot',
        provider: bot.platform,
        recipient: bot.chat_id,
        eventKey: 'bot_test_ping',
        messagePreview: testText,
        status: okSent ? 'sent' : 'failed',
        httpStatus,
        errorMessage: errMsg,
      });

      res.json({ ok: true, dispatched: okSent, httpStatus, errorMessage: errMsg });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Bot test error' });
    }
  });

  router.post('/api/v1/modules/bots-webhooks/webhook', requireAdmin, async (req, res) => {
    try {
      await ensureBotsWebhooksSchema();
      const { id, titleFa, targetUrl, secret, events, enabled } = (req.body || {}) as {
        id?: string;
        titleFa?: string;
        targetUrl?: string;
        secret?: string;
        events?: string[];
        enabled?: boolean;
      };
      if (!titleFa?.trim() || !targetUrl?.trim() || !/^https?:\/\//i.test(targetUrl.trim())) {
        res.status(400).json({ ok: false, error: 'عنوان و آدرس معتبر HTTP/HTTPS وب‌هوک الزامی است.' });
        return;
      }
      const itemId = id?.trim() || `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const rawSecret =
        secret && !isMaskedPlaceholder(secret)
          ? secret.trim()
          : crypto.randomBytes(20).toString('hex');
      const secretEnc = encryptSecret(rawSecret);

      await dbExec(
        `INSERT INTO mod_outbound_webhooks (id, title_fa, target_url, secret_enc, events_json, enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT(id) DO UPDATE SET
           title_fa = excluded.title_fa,
           target_url = excluded.target_url,
           secret_enc = excluded.secret_enc,
           events_json = excluded.events_json,
           enabled = excluded.enabled,
           updated_at = excluded.updated_at`,
        [
          itemId,
          titleFa.trim(),
          targetUrl.trim(),
          secretEnc,
          JSON.stringify(Array.isArray(events) && events.length ? events : ['order_paid']),
          enabled === false ? 0 : 1,
          new Date().toISOString(),
        ]
      );
      res.json({ ok: true, id: itemId, secretMasked: maskSecret(secretEnc) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Webhook error' });
    }
  });

  router.post('/api/v1/modules/bots-webhooks/webhook/:id/test', requireAdmin, async (req, res) => {
    try {
      await ensureBotsWebhooksSchema();
      const rows = await dbQuery<{ title_fa: string; target_url: string; secret_enc: string }>(
        'SELECT title_fa, target_url, secret_enc FROM mod_outbound_webhooks WHERE id = $1 LIMIT 1',
        [req.params.id]
      );
      const hook = rows[0];
      if (!hook) {
        res.status(404).json({ ok: false, error: 'وب‌هوک یافت نشد.' });
        return;
      }
      const payload = JSON.stringify({
        event: 'webhook.test',
        title: hook.title_fa,
        timestamp: new Date().toISOString(),
      });
      const sig = crypto
        .createHmac('sha256', decryptSecret(hook.secret_enc))
        .update(payload)
        .digest('hex');

      let okSent = false;
      let httpStatus = 0;
      let errMsg: string | undefined;
      try {
        const resp = await fetch(hook.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Skill98-Signature': `sha256=${sig}`,
          },
          body: payload,
        });
        httpStatus = resp.status;
        okSent = resp.ok;
        if (!resp.ok) errMsg = `HTTP ${resp.status}`;
      } catch (err) {
        errMsg = err instanceof Error ? err.message : 'خطای ارتباط با وب‌هوک';
      }

      await logDeliveryEvent({
        channel: 'webhook',
        provider: 'outbound-hmac-webhook',
        recipient: hook.target_url,
        eventKey: 'webhook_test',
        messagePreview: `تست وب‌هوک ${hook.title_fa}`,
        status: okSent ? 'sent' : 'failed',
        httpStatus,
        errorMessage: errMsg,
      });

      res.json({ ok: true, dispatched: okSent, httpStatus, errorMessage: errMsg });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Test error' });
    }
  });

  return router;
}
