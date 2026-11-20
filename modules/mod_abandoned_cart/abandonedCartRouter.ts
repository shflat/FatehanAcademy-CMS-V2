import express from 'express';
import { dbExec, dbQuery } from '../../src/server/database/connection.js';
import { requireAdmin } from '../../src/server/middleware/authMiddleware.js';
import { dispatchEventSms } from '../../src/server/database/smsService.js';
import { logDeliveryEvent } from '../mod_delivery_logs/deliveryLogsRouter.js';

let abandonedSchemaReady = false;

async function ensureAbandonedCartSchema() {
  if (abandonedSchemaReady) return;
  await dbExec(`
    CREATE TABLE IF NOT EXISTS mod_abandoned_carts (
      id TEXT PRIMARY KEY,
      session_key TEXT NOT NULL UNIQUE,
      user_phone TEXT,
      user_name TEXT,
      items_json TEXT NOT NULL,
      total_amount INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open',
      recovery_coupon TEXT,
      reminders_sent INTEGER DEFAULT 0,
      updated_at_fa TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  abandonedSchemaReady = true;
}

export function createAbandonedCartRouter() {
  const router = express.Router();

  // Storefront heartbeat capturing open carts
  router.post('/api/v1/modules/abandoned-cart/heartbeat', async (req, res) => {
    try {
      await ensureAbandonedCartSchema();
      const { sessionKey, userPhone, userName, items, totalAmount } = (req.body || {}) as {
        sessionKey?: string;
        userPhone?: string;
        userName?: string;
        items?: { id: string; title: string; qty: number; price: number }[];
        totalAmount?: number;
      };
      const cleanKey = String(sessionKey || '').trim().slice(0, 80);
      if (!cleanKey) {
        res.status(400).json({ ok: false, error: 'sessionKey الزامی است.' });
        return;
      }
      if (!Array.isArray(items) || items.length === 0) {
        await dbExec(
          `UPDATE mod_abandoned_carts SET status = 'converted', updated_at = $1 WHERE session_key = $2`,
          [new Date().toISOString(), cleanKey]
        );
        res.json({ ok: true, cleared: true });
        return;
      }

      const id = `abc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(now);

      await dbExec(
        `INSERT INTO mod_abandoned_carts
          (id, session_key, user_phone, user_name, items_json, total_amount, status, updated_at_fa, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8)
         ON CONFLICT(session_key) DO UPDATE SET
           user_phone = COALESCE(excluded.user_phone, mod_abandoned_carts.user_phone),
           user_name = COALESCE(excluded.user_name, mod_abandoned_carts.user_name),
           items_json = excluded.items_json,
           total_amount = excluded.total_amount,
           status = 'open',
           updated_at_fa = excluded.updated_at_fa,
           updated_at = excluded.updated_at`,
        [
          id,
          cleanKey,
          userPhone ? String(userPhone).slice(0, 32) : null,
          userName ? String(userName).slice(0, 100) : 'مهمان',
          JSON.stringify(items.slice(0, 20)),
          Math.max(0, Math.round(Number(totalAmount || 0))),
          nowFa,
          now.toISOString(),
        ]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Cart heartbeat error' });
    }
  });

  // Admin list abandoned carts
  router.get('/api/v1/modules/abandoned-cart/list', requireAdmin, async (_req, res) => {
    try {
      await ensureAbandonedCartSchema();
      const rows = await dbQuery<Record<string, unknown>>(
        'SELECT * FROM mod_abandoned_carts ORDER BY updated_at DESC LIMIT 100'
      );
      res.json({ ok: true, carts: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'List error' });
    }
  });

  // Trigger recovery reminder (SMS + Delivery Log)
  router.post('/api/v1/modules/abandoned-cart/:id/recover', requireAdmin, async (req, res) => {
    try {
      await ensureAbandonedCartSchema();
      const { couponCode, customMessage } = (req.body || {}) as {
        couponCode?: string;
        customMessage?: string;
      };
      const rows = await dbQuery<{
        id: string;
        user_phone?: string;
        user_name?: string;
        total_amount: number;
      }>('SELECT id, user_phone, user_name, total_amount FROM mod_abandoned_carts WHERE id = $1 LIMIT 1', [
        req.params.id,
      ]);
      const cart = rows[0];
      if (!cart) {
        res.status(404).json({ ok: false, error: 'سبد خرید رهاشده یافت نشد.' });
        return;
      }

      const code = String(couponCode || 'BACK10').trim();
      const msg =
        customMessage?.trim() ||
        `${cart.user_name || 'کاربر گرامی'}، سبد خرید شما به مبلغ ${Number(cart.total_amount).toLocaleString('fa-IR')} تومان منتظر تکمیل است! کد تخفیف ویژه: ${code}`;

      if (cart.user_phone) {
        await dispatchEventSms({
          phone: cart.user_phone,
          customMessageOverride: msg,
        });
      } else {
        await logDeliveryEvent({
          channel: 'push',
          provider: 'abandoned-cart-recovery',
          recipient: cart.user_name || 'مهمان',
          eventKey: 'abandoned_cart_recovery',
          messagePreview: msg,
          status: 'sandbox',
        });
      }

      await dbExec(
        `UPDATE mod_abandoned_carts
         SET status = 'reminded', recovery_coupon = $1, reminders_sent = reminders_sent + 1, updated_at = $2
         WHERE id = $3`,
        [code, new Date().toISOString(), cart.id]
      );

      res.json({ ok: true, recovered: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Recovery error' });
    }
  });

  return router;
}
