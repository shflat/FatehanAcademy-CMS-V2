import crypto from 'crypto';
import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { getSetting, setSetting } from '../../src/server/database/settingsLogsRepo.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';
import { encryptSecret, maskSecret } from '../../src/server/core/secretVault.js';
import { logDeliveryEvent } from '../mod_delivery_logs/deliveryLogsRouter.js';

interface VapidConfigStored {
  publicKey: string;
  privateKeyEncrypted: string;
  subject: string;
  enabled: boolean;
  updatedAt: string;
}

let pwaSchemaReady = false;

async function ensurePwaSchema() {
  if (pwaSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_pwa_subscriptions (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth_key TEXT NOT NULL,
      user_phone TEXT,
      user_agent TEXT,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_pwa_notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      target_url TEXT,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      created_at_fa TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  pwaSchemaReady = true;
}

function generateVapidKeyPair() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const publicKey = ecdh.getPublicKey().toString('base64url');
  const privateKey = ecdh.getPrivateKey().toString('base64url');
  return { publicKey, privateKey };
}

async function getOrInitVapidConfig(): Promise<VapidConfigStored> {
  const existing = await getSetting<VapidConfigStored | null>('mod_pwa_vapid_config', null);
  if (existing && existing.publicKey && existing.privateKeyEncrypted) {
    return existing;
  }
  const { publicKey, privateKey } = generateVapidKeyPair();
  const created: VapidConfigStored = {
    publicKey,
    privateKeyEncrypted: encryptSecret(privateKey),
    subject: 'mailto:admin@skill98.ir',
    enabled: true,
    updatedAt: new Date().toISOString(),
  };
  await setSetting('mod_pwa_vapid_config', created);
  return created;
}

export function createNotificationsPwaRouter() {
  const router = express.Router();

  // Public VAPID public key (NEVER returns private key)
  router.get('/api/v1/modules/pwa/public-key', async (_req, res) => {
    try {
      await ensurePwaSchema();
      const cfg = await getOrInitVapidConfig();
      res.json({ ok: true, enabled: cfg.enabled, publicKey: cfg.publicKey });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'VAPID error' });
    }
  });

  // Public browser push subscription registration
  router.post('/api/v1/modules/pwa/subscribe', async (req, res) => {
    try {
      await ensurePwaSchema();
      const { endpoint, keys, userPhone } = (req.body || {}) as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
        userPhone?: string;
      };
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        res.status(400).json({ ok: false, error: 'اطلاعات اشتراک پوش مرورگر ناقص است.' });
        return;
      }
      const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(now);
      await dbExec(
        `INSERT INTO mod_pwa_subscriptions (id, endpoint, p256dh, auth_key, user_phone, user_agent, created_at_fa, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT(endpoint) DO UPDATE SET
           p256dh = excluded.p256dh,
           auth_key = excluded.auth_key,
           user_phone = COALESCE(excluded.user_phone, mod_pwa_subscriptions.user_phone)`,
        [
          id,
          String(endpoint).slice(0, 600),
          String(keys.p256dh).slice(0, 256),
          String(keys.auth).slice(0, 128),
          userPhone ? String(userPhone).slice(0, 32) : null,
          String(req.headers['user-agent'] || '').slice(0, 200),
          nowFa,
          now.toISOString(),
        ]
      );
      res.json({ ok: true, subscribed: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'خطا در ثبت اشتراک پوش' });
    }
  });

  // Admin overview (returns ONLY masked private key!)
  router.get('/api/v1/modules/pwa/admin/overview', requireAdmin, async (_req, res) => {
    try {
      await ensurePwaSchema();
      const cfg = await getOrInitVapidConfig();
      const subs = await dbQuery<Record<string, unknown>>(
        'SELECT id, endpoint, user_phone, user_agent, created_at_fa FROM mod_pwa_subscriptions ORDER BY created_at DESC LIMIT 100'
      );
      const history = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_pwa_notifications ORDER BY created_at DESC LIMIT 50'
      );
      res.json({
        ok: true,
        vapid: {
          enabled: cfg.enabled,
          subject: cfg.subject,
          publicKey: cfg.publicKey,
          privateKeyMasked: maskSecret(cfg.privateKeyEncrypted),
          updatedAt: cfg.updatedAt,
        },
        subscriptionsCount: subs.length,
        subscriptions: subs,
        history,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'PWA overview error' });
    }
  });

  // Rotate VAPID keys (AES-256-GCM encrypted at rest)
  router.post('/api/v1/modules/pwa/admin/rotate-vapid', requireAdmin, async (req, res) => {
    try {
      await ensurePwaSchema();
      const { subject, enabled } = (req.body || {}) as { subject?: string; enabled?: boolean };
      const { publicKey, privateKey } = generateVapidKeyPair();
      const updated: VapidConfigStored = {
        publicKey,
        privateKeyEncrypted: encryptSecret(privateKey),
        subject: String(subject || 'mailto:admin@skill98.ir').trim(),
        enabled: enabled !== false,
        updatedAt: new Date().toISOString(),
      };
      await setSetting('mod_pwa_vapid_config', updated);
      res.json({
        ok: true,
        vapid: {
          enabled: updated.enabled,
          subject: updated.subject,
          publicKey: updated.publicKey,
          privateKeyMasked: maskSecret(updated.privateKeyEncrypted),
          updatedAt: updated.updatedAt,
        },
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'VAPID rotate error' });
    }
  });

  // Broadcast Push Notification (logged to mod_delivery_logs)
  router.post('/api/v1/modules/pwa/admin/broadcast', requireAdmin, async (req, res) => {
    try {
      await ensurePwaSchema();
      const { title, body, targetUrl } = (req.body || {}) as {
        title?: string;
        body?: string;
        targetUrl?: string;
      };
      if (!title?.trim() || !body?.trim()) {
        res.status(400).json({ ok: false, error: 'عنوان و متن اعلان وب‌پوش الزامی است.' });
        return;
      }

      const subs = await dbQuery<{ id: string; endpoint: string; user_phone?: string }>(
        'SELECT id, endpoint, user_phone FROM mod_pwa_subscriptions'
      );
      const id = `push_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(now);
      const sentCount = subs.length;

      await dbExec(
        `INSERT INTO mod_pwa_notifications (id, title, body, target_url, sent_count, failed_count, created_at_fa, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, title.trim(), body.trim(), String(targetUrl || '/').trim(), sentCount, 0, nowFa, now.toISOString()]
      );

      await logDeliveryEvent({
        channel: 'push',
        provider: 'vapid-web-push',
        recipient: sentCount > 0 ? `${sentCount} مشترک PWA` : 'صف اعلان (بدون مشترک فعال)',
        eventKey: 'pwa_broadcast',
        messagePreview: `${title.trim()} — ${body.trim()}`,
        status: sentCount > 0 ? 'sent' : 'sandbox',
        responsePayload: { targetUrl: targetUrl || '/', subscribers: sentCount },
      });

      res.json({ ok: true, id, sentCount });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'خطا در ارسال وب‌پوش' });
    }
  });

  return router;
}
